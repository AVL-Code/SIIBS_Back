export {
  AuthService,
  PasswordHasherService,
  PermissionGuard,
  REQUIRED_PERMISSION_METADATA_KEY,
  RequirePermission,
  type LoginResult,
} from './application';
export {
  DEFAULT_PERMISSIONS,
  DEFAULT_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_CODE,
  ROLE_CODE,
  getAuthorizedAuditModules,
  type AuthenticatedUser,
  type PermissionCode,
  type PermissionDefinition,
  type RoleCode,
  type RoleDefinition,
} from './domain';
export { IamModule } from './iam.module';
export {
  DEFAULT_SESSION_TTL_SECONDS,
  SESSION_COOKIE_NAME,
  SessionTokenService,
  type SessionTokenPayload,
} from './infrastructure';
export { AuthController, DomainExceptionFilter } from './presentation';
export {
  createUserInputSchema,
  loginInputSchema,
  type CreateUserInput,
  type LoginInput,
} from './schemas';
