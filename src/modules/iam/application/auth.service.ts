import { Injectable } from '@nestjs/common';
import {
  SOURCE_MODULE,
  UnauthorizedError,
  type ActorContext,
  type SourceModule,
} from '../../../shared';
import { PERMISSION_CODE, type AuthenticatedUser } from '../domain';
import { SessionTokenService, UserRepository } from '../infrastructure';
import { createUserInputSchema, loginInputSchema, parseWithSchema } from '../schemas';
import { PasswordHasherService } from './password-hasher.service';
import { PermissionGuard } from './permission.guard';

export interface LoginResult {
  readonly user: AuthenticatedUser;
  readonly actor: ActorContext;
  readonly sessionToken: string;
  readonly setCookieHeader: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasherService,
    private readonly sessionTokenService: SessionTokenService,
  ) {}

  async login(
    input: unknown,
    sourceModule: SourceModule = SOURCE_MODULE.IAM,
  ): Promise<LoginResult> {
    const credentials = parseWithSchema(loginInputSchema, input);
    const storedUser = await this.userRepository.findByEmailWithCredentials(credentials.email);

    if (!storedUser) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await this.passwordHasher.verifyPassword(
      storedUser.passwordHash,
      credentials.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!storedUser.isActive) {
      throw new UnauthorizedError('User account is inactive');
    }

    const user: AuthenticatedUser = {
      id: storedUser.id,
      email: storedUser.email,
      fullName: storedUser.fullName,
      isActive: storedUser.isActive,
      roles: storedUser.roles,
      permissions: storedUser.permissions,
    };

    const actor = this.buildActorContext(user, sourceModule);
    const sessionToken = this.sessionTokenService.issueToken(user.id);
    const setCookieHeader = this.sessionTokenService.serializeSessionCookie(sessionToken);

    return {
      user,
      actor,
      sessionToken,
      setCookieHeader,
    };
  }

  buildLogoutCookieHeader(): string {
    return this.sessionTokenService.serializeClearSessionCookie();
  }

  async resolveSessionFromCookieHeader(
    cookieHeader: string | undefined,
    sourceModule: SourceModule = SOURCE_MODULE.IAM,
  ): Promise<{ user: AuthenticatedUser; actor: ActorContext }> {
    const token = this.sessionTokenService.extractTokenFromCookieHeader(cookieHeader);
    return this.resolveSessionFromToken(token, sourceModule);
  }

  async resolveSessionFromToken(
    token: string | undefined,
    sourceModule: SourceModule = SOURCE_MODULE.IAM,
  ): Promise<{ user: AuthenticatedUser; actor: ActorContext }> {
    const payload = this.sessionTokenService.verifyToken(token);
    const user = await this.userRepository.findByIdWithAccessProfile(payload.sub);

    if (!user) {
      throw new UnauthorizedError('Authenticated user no longer exists');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('User account is inactive');
    }

    return {
      user,
      actor: this.buildActorContext(user, sourceModule),
    };
  }

  async createUser(
    actor: ActorContext | null | undefined,
    input: unknown,
  ): Promise<AuthenticatedUser> {
    PermissionGuard.assertCan(actor, PERMISSION_CODE.IAM_USER_MANAGE);
    const parsed = parseWithSchema(createUserInputSchema, input);
    const passwordHash = await this.passwordHasher.hashPassword(parsed.password);

    return this.userRepository.createUserWithRoles({
      email: parsed.email,
      fullName: parsed.fullName,
      passwordHash,
      roles: parsed.roles,
      isActive: true,
    });
  }

  async setUserActiveStatus(
    actor: ActorContext | null | undefined,
    targetUserId: string,
    isActive: boolean,
  ): Promise<AuthenticatedUser> {
    PermissionGuard.assertCan(actor, PERMISSION_CODE.IAM_USER_MANAGE);
    return this.userRepository.setUserActiveStatus(targetUserId, isActive);
  }

  buildActorContext(
    user: AuthenticatedUser,
    sourceModule: SourceModule = SOURCE_MODULE.IAM,
  ): ActorContext {
    return {
      userId: user.id,
      roles: user.roles,
      permissions: user.permissions,
      sourceModule,
    };
  }
}
