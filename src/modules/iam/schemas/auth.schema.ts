import { z } from 'zod';
import { ValidationError } from '../../../shared';
import { ROLE_CODE, type RoleCode } from '../domain';

const roleCodeValues = [
  ROLE_CODE.SYSTEM_ADMIN,
  ROLE_CODE.SOCIAL_OPERATOR,
  ROLE_CODE.EDUCATION_OPERATOR,
] as const satisfies readonly [RoleCode, ...RoleCode[]];

export const loginInputSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .transform((val) => val.toLowerCase()),
  password: z.string().min(1, 'Password is required').max(256, 'Password is too long'),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const createUserInputSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .transform((val) => val.toLowerCase()),
  fullName: z.string().trim().min(2, 'Full name is required').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(256, 'Password is too long'),
  roles: z.array(z.enum(roleCodeValues)).min(1, 'At least one role is required'),
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export function parseWithSchema<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    throw new ValidationError('Invalid request payload', fieldErrors);
  }
  return parsed.data;
}
