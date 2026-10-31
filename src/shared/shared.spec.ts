import { describe, expect, it } from 'vitest';
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  extractUuidV7Timestamp,
  generateUuidV7,
  isUuidV7,
  validateEnv,
} from './index';

describe('Zod Environment Validation (11-tech-spec.md §7, task-04)', () => {
  const validEnv = {
    NODE_ENV: 'development',
    PORT: '3000',
    DATABASE_URL: 'postgresql://siibs:siibs_dev_password@localhost:5432/siibs_dev',
    SESSION_SECRET: 'super-secret-session-key-with-at-least-32-chars',
    STORAGE_DIR: './storage/documents',
    BACKUP_TARGET_DIR: './storage/backups',
  };

  it('parses and returns typed config when all required variables are valid', () => {
    const config = validateEnv(validEnv);
    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(3000);
    expect(config.DATABASE_URL).toBe(validEnv.DATABASE_URL);
    expect(config.SESSION_SECRET).toBe(validEnv.SESSION_SECRET);
    expect(config.STORAGE_DIR).toBe('./storage/documents');
    expect(config.BACKUP_TARGET_DIR).toBe('./storage/backups');
  });

  it.each(['DATABASE_URL', 'SESSION_SECRET', 'STORAGE_DIR', 'BACKUP_TARGET_DIR'] as const)(
    'fails validation when required variable %s is missing',
    (missingKey) => {
      const incompleteEnv: Record<string, string | undefined> = { ...validEnv };
      delete incompleteEnv[missingKey];

      expect(() => validateEnv(incompleteEnv)).toThrow(ValidationError);
    },
  );

  it('fails validation when DATABASE_URL is not a valid postgres connection string', () => {
    expect(() =>
      validateEnv({
        ...validEnv,
        DATABASE_URL: 'mysql://localhost:3306/invalid',
      }),
    ).toThrow(ValidationError);
  });

  it('fails validation when SESSION_SECRET is shorter than 32 characters', () => {
    expect(() =>
      validateEnv({
        ...validEnv,
        SESSION_SECRET: 'too-short-secret',
      }),
    ).toThrow(ValidationError);
  });
});

describe('UUIDv7 Generator (DA-011, 11-tech-spec.md §1.3, §4.2)', () => {
  it('generates valid RFC 9562 UUIDv7 strings', () => {
    const id = generateUuidV7();
    expect(isUuidV7(id)).toBe(true);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('maintains strict lexical and temporal ordering across sequential calls and timestamps', () => {
    const count = 500;
    const generated: string[] = [];

    for (let i = 0; i < count; i++) {
      generated.push(generateUuidV7());
    }

    const sorted = [...generated].sort();
    expect(generated).toEqual(sorted);
    expect(new Set(generated).size).toBe(count);

    const earlier = generateUuidV7(1_700_000_000_000);
    const later = generateUuidV7(1_700_000_001_000);
    expect(earlier < later).toBe(true);
    expect(extractUuidV7Timestamp(earlier)).toBe(1_700_000_000_000);
    expect(extractUuidV7Timestamp(later)).toBe(1_700_000_001_000);
  });
});

describe('Standardized Domain Errors (11-tech-spec.md §4.3)', () => {
  it('provides typed domain errors with standardized codes and HTTP status mappings', () => {
    const errors = [
      new NotFoundError('Person not found'),
      new ForbiddenError('Missing permission'),
      new UnauthorizedError('Invalid session'),
      new ValidationError('Invalid input', { field: 'cpf' }),
      new ConflictError('Duplicate household head'),
    ] as const;

    expect(errors[0]).toBeInstanceOf(DomainError);
    expect(errors[0].code).toBe('NOT_FOUND');
    expect(errors[0].statusCode).toBe(404);

    expect(errors[1].code).toBe('FORBIDDEN');
    expect(errors[1].statusCode).toBe(403);

    expect(errors[2].code).toBe('UNAUTHORIZED');
    expect(errors[2].statusCode).toBe(401);

    expect(errors[3].code).toBe('VALIDATION_ERROR');
    expect(errors[3].statusCode).toBe(400);
    expect(errors[3].details).toEqual({ field: 'cpf' });

    expect(errors[4].code).toBe('CONFLICT');
    expect(errors[4].statusCode).toBe(409);
  });
});
