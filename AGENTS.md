# SIIBS Backend — NestJS Agent Rules (`backend/AGENTS.md`)

> **Scope:** Applies to all work inside `backend/` (`AVL-Code/SIIBS_Back` — NestJS Modular Monolith on Node.js 22 LTS + TypeScript 5+ strict + PostgreSQL 16+).
> **Full Playbook:** Always read [`../docs/agents/backend.md`](../docs/agents/backend.md) and [`../docs/sdd/11-tech-spec.md`](../docs/sdd/11-tech-spec.md).

---

## 1. Mandatory Backend Skill Activation (`backend/.agents/skills/` & `../.agents/skills/`)
Before planning or writing any backend code:
1. List and check all skills inside `backend/.agents/skills/` (focused on backend development) and general skills in `../.agents/skills/`.
2. If any skill matches the current task (e.g., NestJS modules, ORM/migrations, cryptography, testing, security), read its `SKILL.md` and follow its instructions strictly.

---

## 2. Backend Non-Negotiable Architecture Rules
1. **100% English Code & Identifiers:** All folders, files (`kebab-case`), classes (`PascalCase`), methods/variables (`camelCase`), PostgreSQL schemas (`iam`, `audit`, `registry`, `assistance`, `education`), tables (`snake_case` plural), columns (`snake_case` singular), errors, tests, branches, and commits MUST be in English.
2. **Strict Module Boundaries (`11-tech-spec.md` §3.2):**
   - **No Deep Imports:** Never import from another module's `domain/`, `application/`, `infrastructure/`, or `presentation/` folders. Import exclusively from `src/modules/<module>/index.ts`.
   - **Write Isolation per Schema:** Only `RegistryModule` (`PersonService`, `PersonDocumentService`) can write to `registry.*` tables. Only `AssistanceModule` can write to `assistance.*` tables.
3. **Mandatory Backend RBAC (`RNF-01`):** Every service method and controller endpoint must enforce `PermissionGuard` / `PermissionGuard.assertCan(actor, permission)` before reading or mutating data.
4. **Atomic Business + Audit Transactions (`DA-008`):** Every write operation (create, update, status change, photo upload/delete, document upload) must execute inside `withAuditedTransaction`, committing the business mutation and `audit.events` record in the exact same PostgreSQL transaction. Never log plaintext secrets, keys, or raw unmasked sensitive notes in audit diffs.
5. **Layered Encryption & Blind Indexing (`DA-012`):**
   - Encrypt sensitive columns (`cpf_encrypted`, `number_encrypted` in `person_documents`, `notes_encrypted` in `assistance.attendances`) and files in `./storage/documents/` and `./storage/photos/` using `AES-256-GCM` (`DATA_ENCRYPTION_KEY`).
   - Compute deterministic `HMAC-SHA256` blind indexes (`cpf_blind_index`, `number_blind_index`) using `BLIND_INDEX_KEY` for exact search and uniqueness checks.
6. **Person Identification Photo (`DA-014`):** Stored encrypted in `./storage/photos/` (compressed `WebP`/`JPEG` ≤ 500 KB), outside public paths, streamed only via authenticated/authorized route `GET /api/v1/persons/:personId/photo`.
7. **No Physical Deletes:** Never execute hard `DELETE` on domain records (`persons`, `households`, `household_members`, `attendances`). Use lifecycle columns (`status`, `started_at`, `ended_at`, `deactivated_at`). `audit.events` is strictly append-only (`INSERT` and `SELECT` only).

---

## 3. Contract-First Handshake & Doubt Escalation
- **Never code endpoints in isolation:** Complete the **Contract-First Handshake** with the **Frontend React Agent** (routes, Zod request/response DTOs, error codes, permission flags) before implementing controllers.
- **Never guess business rules:** If any domain rule, validation, or edge case is unclear, ask the **Orchestrator Agent** immediately.
