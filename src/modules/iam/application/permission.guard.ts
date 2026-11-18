import { type CanActivate, type ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ForbiddenError, UnauthorizedError, type ActorContext } from '../../../shared';
import type { PermissionCode } from '../domain';

export const REQUIRED_PERMISSION_METADATA_KEY = 'siibs:required_permission';

export const RequirePermission = (permission: PermissionCode) =>
  SetMetadata(REQUIRED_PERMISSION_METADATA_KEY, permission);

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector?: Reflector) {}

  /**
   * Backend authorization enforcement utility (RNF-01, RNF-02, DA-012, 11-tech-spec.md §3.2).
   * Throws UnauthorizedError when no valid ActorContext is provided, and ForbiddenError when
   * the actor lacks the required granular permission.
   */
  static assertCan(
    actor: ActorContext | null | undefined,
    requiredPermission: PermissionCode | string,
  ): asserts actor is ActorContext {
    if (!actor || !actor.userId || actor.userId.trim().length === 0) {
      throw new UnauthorizedError('Authentication is required to perform this operation');
    }

    if (!actor.permissions.includes(requiredPermission)) {
      throw new ForbiddenError(`Missing required permission: ${requiredPermission}`);
    }
  }

  static can(
    actor: ActorContext | null | undefined,
    requiredPermission: PermissionCode | string,
  ): boolean {
    if (!actor || !actor.userId) {
      return false;
    }
    return actor.permissions.includes(requiredPermission);
  }

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector?.getAllAndOverride<PermissionCode | undefined>(
      REQUIRED_PERMISSION_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ actor?: ActorContext }>();
    PermissionGuard.assertCan(request.actor, requiredPermission);
    return true;
  }
}
