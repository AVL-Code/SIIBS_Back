import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const BACKEND_ROOT = path.resolve(__dirname, '..');

describe('Repository Security & Governance Policy (RNF-01, RNF-07, SECURITY.md)', () => {
  it('defines .github/CODEOWNERS covering all backend bounded context modules', () => {
    const codeownersPath = path.join(BACKEND_ROOT, '.github', 'CODEOWNERS');
    expect(fs.existsSync(codeownersPath)).toBe(true);

    const content = fs.readFileSync(codeownersPath, 'utf-8');
    expect(content).toContain('/src/modules/iam/');
    expect(content).toContain('/src/modules/audit/');
    expect(content).toContain('/src/modules/registry/');
    expect(content).toContain('/src/modules/assistance/');
    expect(content).toContain('/src/modules/education/');
    expect(content).toContain('/src/db/');
  });

  it('configures .github/dependabot.yml for npm and github-actions', () => {
    const dependabotPath = path.join(BACKEND_ROOT, '.github', 'dependabot.yml');
    expect(fs.existsSync(dependabotPath)).toBe(true);

    const content = fs.readFileSync(dependabotPath, 'utf-8');
    expect(content).toContain('package-ecosystem: "npm"');
    expect(content).toContain('package-ecosystem: "github-actions"');
    expect(content).toContain('target-branch: "dev"');
  });

  it('prevents committing .env, local databases, backups, and storage/documents in .gitignore', () => {
    const gitignorePath = path.join(BACKEND_ROOT, '.gitignore');
    const content = fs.readFileSync(gitignorePath, 'utf-8');

    expect(content).toContain('.env');
    expect(content).toContain('!.env.example');
    expect(content).toContain('storage/');
    expect(content).toContain('storage/documents/');
    expect(content).toContain('backups/');
    expect(content).toContain('*.dump');
    expect(content).toContain('*.sql.gz');
    expect(content).toContain('*.sqlite');
    expect(content).toContain('pgdata/');
  });
});
