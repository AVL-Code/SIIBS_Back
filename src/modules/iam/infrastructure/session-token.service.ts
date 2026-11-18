import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { Injectable, Optional } from '@nestjs/common';
import { UnauthorizedError } from '../../../shared';

export const SESSION_COOKIE_NAME = 'siibs_session';
export const DEFAULT_SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours

export interface SessionTokenPayload {
  readonly sub: string;
  readonly iat: number;
  readonly exp: number;
}

@Injectable()
export class SessionTokenService {
  private readonly secretKey: Buffer;
  private readonly isProduction: boolean;

  constructor(@Optional() sessionSecret?: string) {
    const rawSecret =
      sessionSecret ??
      process.env['SESSION_SECRET'] ??
      'siibs-local-dev-session-secret-minimum-32-chars';
    this.secretKey = createHash('sha256').update(rawSecret, 'utf8').digest();
    this.isProduction = process.env['NODE_ENV'] === 'production';
  }

  /**
   * Issues an encrypted & authenticated (AES-256-GCM) session token (11-tech-spec.md §1.3, SECURITY.md).
   */
  issueToken(
    userId: string,
    ttlSeconds: number = DEFAULT_SESSION_TTL_SECONDS,
    nowMs: number = Date.now(),
  ): string {
    const iat = Math.floor(nowMs / 1000);
    const payload: SessionTokenPayload = {
      sub: userId,
      iat,
      exp: iat + ttlSeconds,
    };

    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.secretKey, iv);
    const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString('base64url')}.${encrypted.toString('base64url')}.${authTag.toString('base64url')}`;
  }

  /**
   * Decrypts and verifies an AES-256-GCM session token, rejecting tampered or expired tokens.
   */
  verifyToken(token: string | undefined, nowMs: number = Date.now()): SessionTokenPayload {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedError('Missing session token');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedError('Invalid session token format');
    }

    const [ivPart, ciphertextPart, tagPart] = parts;
    if (!ivPart || !ciphertextPart || !tagPart) {
      throw new UnauthorizedError('Invalid session token segments');
    }

    let payload: SessionTokenPayload;
    try {
      const iv = Buffer.from(ivPart, 'base64url');
      const ciphertext = Buffer.from(ciphertextPart, 'base64url');
      const authTag = Buffer.from(tagPart, 'base64url');

      if (iv.length !== 12 || authTag.length !== 16) {
        throw new Error('Invalid IV or authTag length');
      }

      const decipher = createDecipheriv('aes-256-gcm', this.secretKey, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      payload = JSON.parse(decrypted.toString('utf8')) as SessionTokenPayload;
    } catch {
      throw new UnauthorizedError('Invalid or tampered session token');
    }

    const nowSec = Math.floor(nowMs / 1000);
    if (
      typeof payload.sub !== 'string' ||
      payload.sub.length === 0 ||
      typeof payload.exp !== 'number' ||
      payload.exp <= nowSec
    ) {
      throw new UnauthorizedError('Session has expired');
    }

    return payload;
  }

  serializeSessionCookie(
    token: string,
    maxAgeSeconds: number = DEFAULT_SESSION_TTL_SECONDS,
  ): string {
    const attributes = [
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
    ];
    if (this.isProduction) {
      attributes.push('Secure');
    }
    return attributes.join('; ');
  }

  serializeClearSessionCookie(): string {
    const attributes = [
      `${SESSION_COOKIE_NAME}=`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=0',
    ];
    if (this.isProduction) {
      attributes.push('Secure');
    }
    return attributes.join('; ');
  }

  extractTokenFromCookieHeader(cookieHeader: string | undefined): string | undefined {
    if (!cookieHeader) {
      return undefined;
    }
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const eqIndex = pair.indexOf('=');
      if (eqIndex === -1) {
        continue;
      }
      const name = pair.slice(0, eqIndex).trim();
      if (name === SESSION_COOKIE_NAME) {
        const rawValue = pair.slice(eqIndex + 1).trim();
        return rawValue.length > 0 ? decodeURIComponent(rawValue) : undefined;
      }
    }
    return undefined;
  }
}
