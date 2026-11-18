import { boolean, pgSchema, primaryKey, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const BOUNDED_CONTEXT_SCHEMAS = [
  'iam',
  'audit',
  'registry',
  'assistance',
  'education',
] as const;

export type BoundedContextSchema = (typeof BOUNDED_CONTEXT_SCHEMAS)[number];

export const iamSchema = pgSchema('iam');
export const auditSchema = pgSchema('audit');
export const registrySchema = pgSchema('registry');
export const assistanceSchema = pgSchema('assistance');
export const educationSchema = pgSchema('education');

export const iamUsersTable = iamSchema.table('users', {
  id: uuid('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const iamRolesTable = iamSchema.table('roles', {
  id: uuid('id').primaryKey(),
  code: varchar('code', { length: 64 }).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const iamPermissionsTable = iamSchema.table('permissions', {
  id: uuid('id').primaryKey(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  module: varchar('module', { length: 32 }).notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const iamUserRolesTable = iamSchema.table(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => iamUsersTable.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => iamRolesTable.id, { onDelete: 'restrict' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.roleId] })],
);

export const iamRolePermissionsTable = iamSchema.table(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => iamRolesTable.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => iamPermissionsTable.id, { onDelete: 'restrict' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })],
);
