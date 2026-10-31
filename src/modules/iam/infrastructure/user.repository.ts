import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../../../db';
import { ConflictError, NotFoundError, generateUuidV7 } from '../../../shared';
import type { AuthenticatedUser, PermissionCode, RoleCode } from '../domain';

export interface StoredUserRecord {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly passwordHash: string;
  readonly isActive: boolean;
  readonly roles: readonly RoleCode[];
  readonly permissions: readonly PermissionCode[];
}

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  is_active: boolean;
}

@Injectable()
export class UserRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findByEmailWithCredentials(email: string): Promise<StoredUserRecord | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const userResult = await this.databaseService.query<UserRow>(
      `SELECT id, email, full_name, password_hash, is_active
       FROM iam.users
       WHERE email = $1
       LIMIT 1`,
      [normalizedEmail],
    );

    const row = userResult.rows[0];
    if (!row) {
      return null;
    }

    const access = await this.loadRolesAndPermissions(row.id);
    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      passwordHash: row.password_hash,
      isActive: row.is_active,
      roles: access.roles,
      permissions: access.permissions,
    };
  }

  async findByIdWithAccessProfile(userId: string): Promise<AuthenticatedUser | null> {
    const userResult = await this.databaseService.query<Omit<UserRow, 'password_hash'>>(
      `SELECT id, email, full_name, is_active
       FROM iam.users
       WHERE id = $1
       LIMIT 1`,
      [userId],
    );

    const row = userResult.rows[0];
    if (!row) {
      return null;
    }

    const access = await this.loadRolesAndPermissions(row.id);
    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      isActive: row.is_active,
      roles: access.roles,
      permissions: access.permissions,
    };
  }

  async createUserWithRoles(params: {
    email: string;
    fullName: string;
    passwordHash: string;
    roles: readonly RoleCode[];
    isActive?: boolean;
  }): Promise<AuthenticatedUser> {
    const normalizedEmail = params.email.trim().toLowerCase();
    const isActive = params.isActive ?? true;
    const userId = generateUuidV7();

    await this.databaseService.withTransaction(async (client: PoolClient) => {
      const existing = await client.query<{ id: string }>(
        'SELECT id FROM iam.users WHERE email = $1 LIMIT 1',
        [normalizedEmail],
      );
      if (existing.rows.length > 0) {
        throw new ConflictError(`User with email '${normalizedEmail}' already exists`);
      }

      await client.query(
        `INSERT INTO iam.users (id, email, full_name, password_hash, is_active, deactivated_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          normalizedEmail,
          params.fullName.trim(),
          params.passwordHash,
          isActive,
          isActive ? null : new Date().toISOString(),
        ],
      );

      for (const roleCode of new Set(params.roles)) {
        const roleRes = await client.query<{ id: string }>(
          'SELECT id FROM iam.roles WHERE code = $1 LIMIT 1',
          [roleCode],
        );
        const roleRow = roleRes.rows[0];
        if (!roleRow) {
          throw new NotFoundError(`RBAC role '${roleCode}' is not registered in iam.roles`);
        }

        await client.query(
          `INSERT INTO iam.user_roles (user_id, role_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id, role_id) DO NOTHING`,
          [userId, roleRow.id],
        );
      }
    });

    const created = await this.findByIdWithAccessProfile(userId);
    if (!created) {
      throw new NotFoundError('Failed to load created user');
    }
    return created;
  }

  async setUserActiveStatus(userId: string, isActive: boolean): Promise<AuthenticatedUser> {
    await this.databaseService.withTransaction(async (client: PoolClient) => {
      const result = await client.query<{ id: string }>(
        `UPDATE iam.users
         SET is_active = $2,
             deactivated_at = CASE WHEN $2 = FALSE THEN NOW() ELSE NULL END,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id`,
        [userId, isActive],
      );

      if (result.rows.length === 0) {
        throw new NotFoundError(`User '${userId}' not found`);
      }
    });

    const updated = await this.findByIdWithAccessProfile(userId);
    if (!updated) {
      throw new NotFoundError(`User '${userId}' not found`);
    }
    return updated;
  }

  private async loadRolesAndPermissions(userId: string): Promise<{
    roles: readonly RoleCode[];
    permissions: readonly PermissionCode[];
  }> {
    const rolesResult = await this.databaseService.query<{ code: RoleCode }>(
      `SELECT r.code
       FROM iam.user_roles ur
       INNER JOIN iam.roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1
       ORDER BY r.code ASC`,
      [userId],
    );

    const permissionsResult = await this.databaseService.query<{ code: PermissionCode }>(
      `SELECT DISTINCT p.code
       FROM iam.user_roles ur
       INNER JOIN iam.role_permissions rp ON rp.role_id = ur.role_id
       INNER JOIN iam.permissions p ON p.id = rp.permission_id
       WHERE ur.user_id = $1
       ORDER BY p.code ASC`,
      [userId],
    );

    return {
      roles: rolesResult.rows.map((r) => r.code),
      permissions: permissionsResult.rows.map((p) => p.code),
    };
  }
}
