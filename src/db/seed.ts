import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import {
  DEFAULT_PERMISSIONS,
  DEFAULT_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  PasswordHasherService,
  ROLE_CODE,
  type RoleCode,
} from '../modules/iam';
import { generateUuidV7 } from '../shared';
import { runMigrations } from './migrate';

export interface SeedIamOptions {
  readonly adminEmail?: string;
  readonly adminFullName?: string;
  readonly adminPassword?: string;
}

export interface SeedIamSummary {
  readonly rolesCount: number;
  readonly permissionsCount: number;
  readonly adminUserId: string;
  readonly adminEmail: string;
}

export async function seedIamDefaults(
  connectionString?: string,
  options: SeedIamOptions = {},
): Promise<SeedIamSummary> {
  if (
    !connectionString &&
    !process.env['DATABASE_URL'] &&
    typeof process.loadEnvFile === 'function'
  ) {
    for (const candidate of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../.env')]) {
      if (existsSync(candidate)) {
        process.loadEnvFile(candidate);
      }
    }
  }
  const databaseUrl =
    connectionString ??
    process.env['DATABASE_URL'] ??
    'postgresql://siibs:siibs_dev_password@localhost:5432/siibs_dev';

  await runMigrations(databaseUrl);

  const adminEmail = (options.adminEmail ?? process.env['SEED_ADMIN_EMAIL'] ?? 'admin@siibs.local')
    .trim()
    .toLowerCase();
  const adminFullName = (
    options.adminFullName ??
    process.env['SEED_ADMIN_NAME'] ??
    'Administrador do Sistema'
  ).trim();
  const adminPassword =
    options.adminPassword ?? process.env['SEED_ADMIN_PASSWORD'] ?? 'Siibs@Admin2026!';

  const hasher = new PasswordHasherService();
  const adminPasswordHash = await hasher.hashPassword(adminPassword);

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const roleIdByCode = new Map<RoleCode, string>();
      for (const role of DEFAULT_ROLES) {
        const res = await client.query<{ id: string }>(
          `INSERT INTO iam.roles (id, code, name, description)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (code) DO UPDATE
             SET name = EXCLUDED.name,
                 description = EXCLUDED.description,
                 updated_at = NOW()
           RETURNING id`,
          [generateUuidV7(), role.code, role.name, role.description],
        );
        const row = res.rows[0];
        if (row) {
          roleIdByCode.set(role.code, row.id);
        }
      }

      const permissionIdByCode = new Map<string, string>();
      for (const perm of DEFAULT_PERMISSIONS) {
        const res = await client.query<{ id: string }>(
          `INSERT INTO iam.permissions (id, code, module, description)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (code) DO UPDATE
             SET module = EXCLUDED.module,
                 description = EXCLUDED.description,
                 updated_at = NOW()
           RETURNING id`,
          [generateUuidV7(), perm.code, perm.module, perm.description],
        );
        const row = res.rows[0];
        if (row) {
          permissionIdByCode.set(perm.code, row.id);
        }
      }

      for (const role of DEFAULT_ROLES) {
        const roleId = roleIdByCode.get(role.code);
        if (!roleId) {
          continue;
        }
        const assignedPerms = DEFAULT_ROLE_PERMISSIONS[role.code];
        for (const permCode of assignedPerms) {
          const permId = permissionIdByCode.get(permCode);
          if (!permId) {
            continue;
          }
          await client.query(
            `INSERT INTO iam.role_permissions (role_id, permission_id)
             VALUES ($1, $2)
             ON CONFLICT (role_id, permission_id) DO NOTHING`,
            [roleId, permId],
          );
        }
      }

      const userRes = await client.query<{ id: string }>(
        `INSERT INTO iam.users (id, email, full_name, password_hash, is_active, deactivated_at)
         VALUES ($1, $2, $3, $4, TRUE, NULL)
         ON CONFLICT (email) DO UPDATE
           SET full_name = EXCLUDED.full_name,
               password_hash = EXCLUDED.password_hash,
               is_active = TRUE,
               deactivated_at = NULL,
               updated_at = NOW()
         RETURNING id`,
        [generateUuidV7(), adminEmail, adminFullName, adminPasswordHash],
      );

      const adminUserId = userRes.rows[0]?.id;
      const systemAdminRoleId = roleIdByCode.get(ROLE_CODE.SYSTEM_ADMIN);
      if (!adminUserId || !systemAdminRoleId) {
        throw new Error('Failed to seed initial SYSTEM_ADMIN user');
      }

      await client.query(
        `INSERT INTO iam.user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [adminUserId, systemAdminRoleId],
      );

      await client.query('COMMIT');

      return {
        rolesCount: roleIdByCode.size,
        permissionsCount: permissionIdByCode.size,
        adminUserId,
        adminEmail,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  seedIamDefaults()
    .then((summary) => {
      console.log(
        `IAM seed completed: ${summary.rolesCount} roles, ${summary.permissionsCount} permissions, admin '${summary.adminEmail}' ready.`,
      );
    })
    .catch((err: unknown) => {
      console.error('Failed to seed IAM defaults:', err);
      process.exit(1);
    });
}
