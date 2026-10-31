import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';

const MIGRATION_FILE_REGEX = /^[0-9]{4}_[a-z0-9_]+\.sql$/;

function resolveMigrationsDir(): string {
  const candidates = [
    resolve(__dirname, 'migrations'),
    resolve(process.cwd(), 'src/db/migrations'),
    resolve(process.cwd(), 'backend/src/db/migrations'),
  ];
  for (const dir of candidates) {
    if (existsSync(dir)) {
      return dir;
    }
  }
  throw new Error('Could not locate SQL migrations directory (src/db/migrations)');
}

export async function runMigrations(connectionString?: string): Promise<string[]> {
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

  const migrationsDir = resolveMigrationsDir();
  const files = readdirSync(migrationsDir)
    .filter((file) => MIGRATION_FILE_REGEX.test(file))
    .sort();

  const pool = new Pool({ connectionString: databaseUrl });
  const appliedNow: string[] = [];

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`
        CREATE TABLE IF NOT EXISTS public._siibs_migrations (
          filename TEXT PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      const existing = await client.query<{ filename: string }>(
        'SELECT filename FROM public._siibs_migrations',
      );
      const appliedSet = new Set(existing.rows.map((row) => row.filename));

      for (const file of files) {
        if (appliedSet.has(file)) {
          continue;
        }
        const sql = readFileSync(resolve(migrationsDir, file), 'utf8');
        await client.query(sql);
        await client.query('INSERT INTO public._siibs_migrations (filename) VALUES ($1)', [file]);
        appliedNow.push(file);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }

  return appliedNow;
}

if (require.main === module) {
  runMigrations()
    .then((applied) => {
      console.log(
        `PostgreSQL migrations verified (${applied.length} newly applied). Bounded context schemas ready.`,
      );
    })
    .catch((err: unknown) => {
      console.error('Failed to run PostgreSQL migrations:', err);
      process.exit(1);
    });
}
