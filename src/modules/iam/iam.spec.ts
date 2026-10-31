import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import {
  ForbiddenError,
  SOURCE_MODULE,
  UnauthorizedError,
  ValidationError,
  type ActorContext,
} from '../../shared';
import {
  DEFAULT_PERMISSIONS,
  DEFAULT_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_CODE,
  PasswordHasherService,
  PermissionGuard,
  ROLE_CODE,
  SESSION_COOKIE_NAME,
  SessionTokenService,
  getAuthorizedAuditModules,
} from './index';

describe('IAM Domain — RBAC Matrix & Audit Scope (DA-007, DA-012, SECURITY.md)', () => {
  it('defines the 3 canonical internal roles and 15 granular permissions', () => {
    expect(DEFAULT_ROLES.map((r) => r.code)).toEqual([
      ROLE_CODE.SYSTEM_ADMIN,
      ROLE_CODE.SOCIAL_OPERATOR,
      ROLE_CODE.EDUCATION_OPERATOR,
    ]);
    expect(DEFAULT_PERMISSIONS).toHaveLength(15);
    expect(DEFAULT_ROLE_PERMISSIONS[ROLE_CODE.SYSTEM_ADMIN]).toHaveLength(15);
    expect(DEFAULT_ROLE_PERMISSIONS[ROLE_CODE.SOCIAL_OPERATOR]).toHaveLength(14);
    expect(DEFAULT_ROLE_PERMISSIONS[ROLE_CODE.EDUCATION_OPERATOR]).toHaveLength(5);
  });

  it('prevents EDUCATION_OPERATOR from holding any assistance:* or iam:user:manage permission (RNF-02, DA-007)', () => {
    const eduPerms = DEFAULT_ROLE_PERMISSIONS[ROLE_CODE.EDUCATION_OPERATOR];
    expect(eduPerms.some((p) => p.startsWith('assistance:'))).toBe(false);
    expect(eduPerms).not.toContain(PERMISSION_CODE.IAM_USER_MANAGE);
    expect(eduPerms).toEqual([
      PERMISSION_CODE.REGISTRY_PERSON_READ,
      PERMISSION_CODE.REGISTRY_PERSON_WRITE,
      PERMISSION_CODE.REGISTRY_DOCUMENT_READ,
      PERMISSION_CODE.REGISTRY_DOCUMENT_WRITE,
      PERMISSION_CODE.AUDIT_EVENT_READ,
    ]);
  });

  it('prevents SOCIAL_OPERATOR from holding iam:user:manage while granting registry, assistance, and audit read', () => {
    const socialPerms = DEFAULT_ROLE_PERMISSIONS[ROLE_CODE.SOCIAL_OPERATOR];
    expect(socialPerms).not.toContain(PERMISSION_CODE.IAM_USER_MANAGE);
    expect(socialPerms).toContain(PERMISSION_CODE.ASSISTANCE_HOUSEHOLD_WRITE);
    expect(socialPerms).toContain(PERMISSION_CODE.REGISTRY_PERSON_WRITE);
    expect(socialPerms).toContain(PERMISSION_CODE.AUDIT_EVENT_READ);
  });

  it('computes authorized audit modules per role (DA-012 §3.4)', () => {
    const adminActor: ActorContext = {
      userId: '018f0000-0000-7000-8000-000000000001',
      roles: [ROLE_CODE.SYSTEM_ADMIN],
      permissions: DEFAULT_ROLE_PERMISSIONS[ROLE_CODE.SYSTEM_ADMIN],
      sourceModule: SOURCE_MODULE.AUDIT,
    };
    const socialActor: ActorContext = {
      userId: '018f0000-0000-7000-8000-000000000002',
      roles: [ROLE_CODE.SOCIAL_OPERATOR],
      permissions: DEFAULT_ROLE_PERMISSIONS[ROLE_CODE.SOCIAL_OPERATOR],
      sourceModule: SOURCE_MODULE.AUDIT,
    };
    const eduActor: ActorContext = {
      userId: '018f0000-0000-7000-8000-000000000003',
      roles: [ROLE_CODE.EDUCATION_OPERATOR],
      permissions: DEFAULT_ROLE_PERMISSIONS[ROLE_CODE.EDUCATION_OPERATOR],
      sourceModule: SOURCE_MODULE.AUDIT,
    };

    expect(getAuthorizedAuditModules(adminActor)).toEqual([
      'iam',
      'audit',
      'registry',
      'assistance',
      'education',
    ]);
    expect(getAuthorizedAuditModules(socialActor)).toEqual(['registry', 'assistance']);
    expect(getAuthorizedAuditModules(eduActor)).toEqual(['registry', 'education']);
  });
});

describe('PasswordHasherService — Argon2id (SECURITY.md, 11-tech-spec.md §1.3)', () => {
  const hasher = new PasswordHasherService();

  it('hashes passwords using Argon2id and verifies matching credentials', async () => {
    const plain = 'SIIBS#StrongPass2026!';
    const hash = await hasher.hashPassword(plain);

    expect(hash.startsWith('$argon2id$v=19$')).toBe(true);
    expect(hash).not.toContain(plain);
    expect(await hasher.verifyPassword(hash, plain)).toBe(true);
    expect(await hasher.verifyPassword(hash, 'WrongPassword123!')).toBe(false);
  });

  it('rejects empty passwords and safely returns false for malformed hashes', async () => {
    await expect(hasher.hashPassword('')).rejects.toThrow(ValidationError);
    expect(await hasher.verifyPassword('not-an-argon2-hash', 'secret')).toBe(false);
    expect(await hasher.verifyPassword('', 'secret')).toBe(false);
  });
});

describe('SessionTokenService — Signed/Encrypted HttpOnly Cookie Sessions (11-tech-spec.md §1.3)', () => {
  const secret = 'test-session-secret-with-at-least-32-characters-length';
  const service = new SessionTokenService(secret);

  it('issues, decrypts, and validates AES-256-GCM session tokens', () => {
    const userId = '018f0000-0000-7000-8000-000000000010';
    const nowMs = 1_700_000_000_000;
    const token = service.issueToken(userId, 3600, nowMs);

    expect(token).not.toContain(userId);
    const payload = service.verifyToken(token, nowMs + 1000);
    expect(payload.sub).toBe(userId);
    expect(payload.exp - payload.iat).toBe(3600);
  });

  it('rejects expired, missing, or tampered session tokens with UnauthorizedError', () => {
    const userId = '018f0000-0000-7000-8000-000000000010';
    const nowMs = 1_700_000_000_000;
    const token = service.issueToken(userId, 60, nowMs);

    expect(() => service.verifyToken(undefined)).toThrow(UnauthorizedError);
    expect(() => service.verifyToken('invalid.token')).toThrow(UnauthorizedError);
    expect(() => service.verifyToken(token, nowMs + 61_000)).toThrow(UnauthorizedError);

    const tampered = `${token.slice(0, -4)}AAAA`;
    expect(() => service.verifyToken(tampered, nowMs + 1000)).toThrow(UnauthorizedError);
  });

  it('serializes and parses HttpOnly, SameSite=Lax session cookies', () => {
    const token = service.issueToken('018f0000-0000-7000-8000-000000000010');
    const setCookie = service.serializeSessionCookie(token, 28800);

    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/');
    expect(setCookie).toContain('Max-Age=28800');

    const extracted = service.extractTokenFromCookieHeader(`other=1; ${setCookie.split(';')[0]}`);
    expect(extracted).toBe(token);

    const clearCookie = service.serializeClearSessionCookie();
    expect(clearCookie).toContain('Max-Age=0');
    expect(clearCookie).toContain('HttpOnly');
    expect(clearCookie).toContain('SameSite=Lax');
  });
});

describe('PermissionGuard — Backend Authorization Enforcement (RNF-01, RNF-02, DA-012)', () => {
  const socialActor: ActorContext = {
    userId: '018f0000-0000-7000-8000-000000000002',
    roles: [ROLE_CODE.SOCIAL_OPERATOR],
    permissions: DEFAULT_ROLE_PERMISSIONS[ROLE_CODE.SOCIAL_OPERATOR],
    sourceModule: SOURCE_MODULE.ASSISTANCE,
  };

  const eduActor: ActorContext = {
    userId: '018f0000-0000-7000-8000-000000000003',
    roles: [ROLE_CODE.EDUCATION_OPERATOR],
    permissions: DEFAULT_ROLE_PERMISSIONS[ROLE_CODE.EDUCATION_OPERATOR],
    sourceModule: SOURCE_MODULE.REGISTRY,
  };

  it('allows operations when ActorContext holds the required permission', () => {
    expect(() =>
      PermissionGuard.assertCan(socialActor, PERMISSION_CODE.ASSISTANCE_HOUSEHOLD_WRITE),
    ).not.toThrow();
    expect(PermissionGuard.can(socialActor, PERMISSION_CODE.ASSISTANCE_HOUSEHOLD_WRITE)).toBe(true);
  });

  it('throws UnauthorizedError when ActorContext is missing or unauthenticated', () => {
    expect(() => PermissionGuard.assertCan(null, PERMISSION_CODE.REGISTRY_PERSON_READ)).toThrow(
      UnauthorizedError,
    );
    expect(() =>
      PermissionGuard.assertCan(undefined, PERMISSION_CODE.REGISTRY_PERSON_READ),
    ).toThrow(UnauthorizedError);
    expect(PermissionGuard.can(null, PERMISSION_CODE.REGISTRY_PERSON_READ)).toBe(false);
  });

  it('throws ForbiddenError when ActorContext lacks the required permission', () => {
    expect(() =>
      PermissionGuard.assertCan(eduActor, PERMISSION_CODE.ASSISTANCE_HOUSEHOLD_READ),
    ).toThrow(ForbiddenError);
    expect(() => PermissionGuard.assertCan(socialActor, PERMISSION_CODE.IAM_USER_MANAGE)).toThrow(
      ForbiddenError,
    );
  });

  it('enforces @RequirePermission metadata in NestJS ExecutionContext', () => {
    const reflector = {
      getAllAndOverride: () => PERMISSION_CODE.IAM_USER_MANAGE,
    } as unknown as Reflector;
    const guard = new PermissionGuard(reflector);

    const forbiddenContext = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ actor: socialActor }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(forbiddenContext)).toThrow(ForbiddenError);
  });
});
