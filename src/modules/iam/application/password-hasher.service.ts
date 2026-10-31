import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { ValidationError } from '../../../shared';

@Injectable()
export class PasswordHasherService {
  /**
   * Hashes a plain-text password using Argon2id (OWASP recommended parameters, SECURITY.md, 11-tech-spec.md §1.3).
   * Plain-text passwords and hashes are never logged.
   */
  async hashPassword(plainPassword: string): Promise<string> {
    if (!plainPassword || plainPassword.length === 0) {
      throw new ValidationError('Password cannot be empty');
    }

    return argon2.hash(plainPassword, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  /**
   * Verifies a plain-text password against an Argon2id PHC string hash.
   */
  async verifyPassword(passwordHash: string, plainPassword: string): Promise<boolean> {
    if (!passwordHash || !plainPassword || !passwordHash.startsWith('$argon2id$')) {
      return false;
    }

    try {
      return await argon2.verify(passwordHash, plainPassword);
    } catch {
      return false;
    }
  }
}
