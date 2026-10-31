import { pgSchema } from 'drizzle-orm/pg-core';

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
