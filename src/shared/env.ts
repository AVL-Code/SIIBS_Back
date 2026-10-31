import { z } from 'zod';
import { ValidationError } from './errors/domain-errors';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (val) => val.startsWith('postgres://') || val.startsWith('postgresql://'),
      'DATABASE_URL must be a valid PostgreSQL connection string (postgres:// or postgresql://)',
    ),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters long'),
  STORAGE_DIR: z.string().min(1, 'STORAGE_DIR is required'),
  BACKUP_TARGET_DIR: z.string().min(1, 'BACKUP_TARGET_DIR is required'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(rawEnv: Record<string, string | undefined> = process.env): EnvConfig {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    const missingOrInvalid = Object.keys(fieldErrors).join(', ');
    throw new ValidationError(
      `Invalid environment configuration: ${missingOrInvalid}`,
      fieldErrors,
    );
  }
  return result.data;
}
