-- 0001_init_bounded_context_schemas.sql
-- Initializes the 5 bounded context schemas in PostgreSQL 16+ (11-tech-spec.md §1.2, §4.2, DA-002)

CREATE SCHEMA IF NOT EXISTS iam;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS registry;
CREATE SCHEMA IF NOT EXISTS assistance;
CREATE SCHEMA IF NOT EXISTS education;

