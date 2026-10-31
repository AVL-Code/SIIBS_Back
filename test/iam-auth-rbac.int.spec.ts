import 'reflect-metadata';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseService, DbModule, seedIamDefaults } from '../src/db';
import {
  AuthController,
  AuthService,
  IamModule,
  PERMISSION_CODE,
  PermissionGuard,
  ROLE_CODE,
  SESSION_COOKIE_NAME,
} from '../src/modules/iam';
import { ForbiddenError, UnauthorizedError } from '../src/shared';

describe('IAM Module PostgreSQL & NestJS Integration (RF-14, RNF-01, RNF-02, DA-012, task-06)', () => {
  const databaseUrl =
    process.env['TEST_DATABASE_URL'] ??
    process.env['DATABASE_URL'] ??
    'postgresql://siibs_test:siibs_test_password@localhost:5433/siibs_test';

  const adminEmail = 'admin.integration@siibs.local';
  const adminPassword = 'Admin#Integration2026!';

  let moduleRef: TestingModule;
  let dbService: DatabaseService;
  let authService: AuthService;
  let authController: AuthController;

  beforeAll(async () => {
    process.env['DATABASE_URL'] = databaseUrl;
    process.env['SESSION_SECRET'] = 'integration-test-session-secret-32-chars-minimum';

    await seedIamDefaults(databaseUrl, {
      adminEmail,
      adminFullName: 'Integration System Admin',
      adminPassword,
    });

    moduleRef = await Test.createTestingModule({
      imports: [DbModule, IamModule],
    }).compile();

    dbService = moduleRef.get(DatabaseService);
    authService = moduleRef.get(AuthService);
    authController = moduleRef.get(AuthController);
  });

  afterAll(async () => {
    if (dbService) {
      await dbService.query('DELETE FROM iam.users WHERE email LIKE $1', [
        '%.integration@siibs.local',
      ]);
    }
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('creates all 5 IAM tables in schema iam and seeds default roles, permissions, and SYSTEM_ADMIN', async () => {
    const tablesRes = await dbService.query<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'iam'
       ORDER BY table_name ASC`,
    );
    expect(tablesRes.rows.map((r) => r.table_name)).toEqual([
      'permissions',
      'role_permissions',
      'roles',
      'user_roles',
      'users',
    ]);

    const secondSeed = await seedIamDefaults(databaseUrl, {
      adminEmail,
      adminFullName: 'Integration System Admin',
      adminPassword,
    });
    expect(secondSeed.rolesCount).toBe(3);
    expect(secondSeed.permissionsCount).toBe(15);
    expect(secondSeed.adminEmail).toBe(adminEmail);
  });

  it('authenticates valid credentials via /api/v1/auth/login, resolves /api/v1/auth/me, and clears session on /api/v1/auth/logout', async () => {
    const headersMap = new Map<string, string>();
    const mockRes = {
      setHeader: (name: string, value: string) => {
        headersMap.set(name, value);
      },
    } as unknown as Response;

    const loginResponse = await authController.login(
      { email: adminEmail.toUpperCase(), password: adminPassword },
      mockRes,
    );

    expect(loginResponse.user.email).toBe(adminEmail);
    expect(loginResponse.user.isActive).toBe(true);
    expect(loginResponse.user.roles).toEqual([ROLE_CODE.SYSTEM_ADMIN]);
    expect(loginResponse.user.permissions).toHaveLength(15);
    expect('passwordHash' in loginResponse.user).toBe(false);

    const setCookieHeader = headersMap.get('Set-Cookie') ?? '';
    expect(setCookieHeader).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(setCookieHeader).toContain('HttpOnly');
    expect(setCookieHeader).toContain('SameSite=Lax');

    const cookiePair = setCookieHeader.split(';')[0];
    const meResponse = await authController.me({
      headers: { cookie: cookiePair },
    } as never);

    expect(meResponse.user.id).toBe(loginResponse.user.id);
    expect(meResponse.user.email).toBe(adminEmail);

    const logoutHeaders = new Map<string, string>();
    const logoutRes = authController.logout({
      setHeader: (name: string, value: string) => {
        logoutHeaders.set(name, value);
      },
    } as unknown as Response);

    expect(logoutRes.authenticated).toBe(false);
    expect(logoutHeaders.get('Set-Cookie')).toContain('Max-Age=0');
  });

  it('rejects wrong password or unknown email with UnauthorizedError (401)', async () => {
    await expect(
      authService.login({ email: adminEmail, password: 'WrongPassword!' }),
    ).rejects.toThrow(UnauthorizedError);

    await expect(
      authService.login({ email: 'nonexistent.integration@siibs.local', password: adminPassword }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('enforces PermissionGuard on user management and rejects inactive user login and active sessions', async () => {
    const adminLogin = await authService.login({
      email: adminEmail,
      password: adminPassword,
    });

    const socialEmail = 'social.integration@siibs.local';
    const socialPassword = 'Social#Operator2026!';

    const createdSocial = await authService.createUser(adminLogin.actor, {
      email: socialEmail,
      fullName: 'Maria Assistente Social',
      password: socialPassword,
      roles: [ROLE_CODE.SOCIAL_OPERATOR],
    });

    expect(createdSocial.email).toBe(socialEmail);
    expect(createdSocial.roles).toEqual([ROLE_CODE.SOCIAL_OPERATOR]);
    expect(createdSocial.permissions).toContain(PERMISSION_CODE.ASSISTANCE_HOUSEHOLD_WRITE);
    expect(createdSocial.permissions).not.toContain(PERMISSION_CODE.IAM_USER_MANAGE);

    const socialLogin = await authService.login({
      email: socialEmail,
      password: socialPassword,
    });

    // SOCIAL_OPERATOR cannot create users (missing iam:user:manage -> ForbiddenError)
    await expect(
      authService.createUser(socialLogin.actor, {
        email: 'unauthorized.integration@siibs.local',
        fullName: 'Unauthorized User',
        password: 'ValidPassword123!',
        roles: [ROLE_CODE.EDUCATION_OPERATOR],
      }),
    ).rejects.toThrow(ForbiddenError);

    // Direct PermissionGuard check for service calls without permission
    expect(() =>
      PermissionGuard.assertCan(socialLogin.actor, PERMISSION_CODE.IAM_USER_MANAGE),
    ).toThrow(ForbiddenError);

    // Deactivate SOCIAL_OPERATOR account
    const deactivated = await authService.setUserActiveStatus(
      adminLogin.actor,
      createdSocial.id,
      false,
    );
    expect(deactivated.isActive).toBe(false);

    // 1. Deactivated user cannot log in
    await expect(
      authService.login({
        email: socialEmail,
        password: socialPassword,
      }),
    ).rejects.toThrow(UnauthorizedError);

    // 2. Previously issued session token for deactivated user is immediately rejected
    await expect(authService.resolveSessionFromToken(socialLogin.sessionToken)).rejects.toThrow(
      UnauthorizedError,
    );
  });
});
