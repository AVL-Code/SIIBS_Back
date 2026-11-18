import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Injectable, OnModuleDestroy, Optional } from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { BOUNDED_CONTEXT_SCHEMAS } from './schemas';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private poolInstance: Pool | null = null;
  private drizzleInstance: NodePgDatabase | null = null;
  private readonly connectionString: string;

  constructor(@Optional() connectionString?: string) {
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
    this.connectionString =
      connectionString ??
      process.env['DATABASE_URL'] ??
      'postgresql://siibs:siibs_dev_password@localhost:5432/siibs_dev';
  }

  private getPool(): Pool {
    if (!this.poolInstance) {
      this.poolInstance = new Pool({
        connectionString: this.connectionString,
      });
    }
    return this.poolInstance;
  }

  get db(): NodePgDatabase {
    if (!this.drizzleInstance) {
      this.drizzleInstance = drizzle(this.getPool());
    }
    return this.drizzleInstance;
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>> {
    return this.getPool().query<T>(text, values);
  }

  /**
   * Executes a domain mutation and its corresponding AuditEvent insertion inside
   * a single atomic PostgreSQL transaction (DA-008, 11-tech-spec.md §3.2).
   */
  async withTransaction<T>(
    callback: (client: PoolClient, txDb: NodePgDatabase) => Promise<T>,
  ): Promise<T> {
    const client = await this.getPool().connect();
    try {
      await client.query('BEGIN');
      const txDb = drizzle(client);
      const result = await callback(client, txDb);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listBoundedContextSchemas(): Promise<string[]> {
    const result = await this.query<{ schema_name: string }>(
      `SELECT schema_name
       FROM information_schema.schemata
       WHERE schema_name = ANY($1::text[])
       ORDER BY schema_name ASC`,
      [[...BOUNDED_CONTEXT_SCHEMAS]],
    );
    return result.rows.map((row) => row.schema_name);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.poolInstance) {
      await this.poolInstance.end();
      this.poolInstance = null;
      this.drizzleInstance = null;
    }
  }
}
