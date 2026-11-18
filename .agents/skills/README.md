# Backend Development Skills (`backend/.agents/skills/`)

Place backend-specific development skills here (e.g., NestJS modular patterns, PostgreSQL multi-schema migrations, Prisma/Drizzle ORM, `AES-256-GCM` & `HMAC-SHA256` blind indexing, RBAC guards, atomic audit transactions). Each skill must live in `<skill-name>/SKILL.md` with YAML frontmatter (`name`, `description`).

## How Agents Discover These Skills
- Discovered natively when operating inside `backend/` and globally mapped at the root via [`SIIBS/.agents/skills.json`](../../.agents/skills.json).
- Mandatory inspection target for the **Backend NestJS Agent** (and **QA & Security Agent** when writing backend integration tests).
