import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  BOUNDED_CONTEXT_SCHEMAS,
  DatabaseService,
  assistanceSchema,
  auditSchema,
  educationSchema,
  iamSchema,
  registrySchema,
  runMigrations,
} from '../src/db';

const backendRoot = resolve(__dirname, '..');
const repoRoot = resolve(backendRoot, '..');

describe('PostgreSQL 16 Multi-Schema & Local Environment Setup (11-tech-spec.md §1.2, §4.2, task-04)', () => {
  it('defines Drizzle pgSchema objects for all 5 bounded contexts', () => {
    expect(BOUNDED_CONTEXT_SCHEMAS).toEqual([
      'iam',
      'audit',
      'registry',
      'assistance',
      'education',
    ]);
    expect(iamSchema.schemaName).toBe('iam');
    expect(auditSchema.schemaName).toBe('audit');
    expect(registrySchema.schemaName).toBe('registry');
    expect(assistanceSchema.schemaName).toBe('assistance');
    expect(educationSchema.schemaName).toBe('education');
  });

  it('provides .env.example with required environment variables', () => {
    const backendEnvExamplePath = resolve(backendRoot, '.env.example');
    expect(existsSync(backendEnvExamplePath)).toBe(true);
    const content = readFileSync(backendEnvExamplePath, 'utf8');

    expect(content).toContain('DATABASE_URL=');
    expect(content).toContain('SESSION_SECRET=');
    expect(content).toContain('STORAGE_DIR=');
    expect(content).toContain('BACKUP_TARGET_DIR=');
  });

  it('provides root docker-compose.yml when running inside workspace orchestration', () => {
    const composePath = resolve(repoRoot, 'docker-compose.yml');
    if (existsSync(composePath)) {
      const compose = readFileSync(composePath, 'utf8');
      expect(compose).toContain('postgres:16-alpine');
      expect(compose).toContain('postgres-test:');
    }
  });

  describe('PostgreSQL Database Integration & Schema Migration', () => {
    const databaseUrl =
      process.env['TEST_DATABASE_URL'] ??
      process.env['DATABASE_URL'] ??
      'postgresql://siibs_test:siibs_test_password@localhost:5433/siibs_test';

    let dbService: DatabaseService;

    beforeAll(async () => {
      await runMigrations(databaseUrl);
      dbService = new DatabaseService(databaseUrl);
    });

    afterAll(async () => {
      if (dbService) {
        await dbService.onModuleDestroy();
      }
    });

    it('applies initial migration creating iam, audit, registry, assistance, and education schemas idempotently', async () => {
      const existingSchemas = await dbService.listBoundedContextSchemas();
      expect(existingSchemas).toEqual(['assistance', 'audit', 'education', 'iam', 'registry']);

      const secondRunApplied = await runMigrations(databaseUrl);
      expect(secondRunApplied).toEqual([]);
    });

    it('supports atomic PostgreSQL transactions with automatic rollback on failure (DA-008)', async () => {
      await dbService.query(
        'CREATE TABLE IF NOT EXISTS audit._tx_smoke_test (id UUID PRIMARY KEY)',
      );
      await dbService.query('TRUNCATE TABLE audit._tx_smoke_test');

      const testId = '018f0000-0000-7000-8000-000000000001';

      await expect(
        dbService.withTransaction(async (client) => {
          await client.query('INSERT INTO audit._tx_smoke_test (id) VALUES ($1)', [testId]);
          throw new Error('Simulated audit failure triggering rollback');
        }),
      ).rejects.toThrow('Simulated audit failure triggering rollback');

      const afterRollback = await dbService.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM audit._tx_smoke_test',
      );
      expect(afterRollback.rows[0]?.count).toBe('0');

      await dbService.query('DROP TABLE IF EXISTS audit._tx_smoke_test');
    });
  });
});
