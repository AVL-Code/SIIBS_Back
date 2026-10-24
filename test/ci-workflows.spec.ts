import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const BACKEND_ROOT = path.resolve(__dirname, '..');

describe('Backend CI/CD & Project Board Workflows (RNF-04, RNF-07, RNF-09, 11-tech-spec.md)', () => {
  it('defines .github/workflows/ci.yml with SDD governance, lint, typecheck, postgres:16-alpine tests, and build', () => {
    const ciPath = path.join(BACKEND_ROOT, '.github', 'workflows', 'ci.yml');
    expect(fs.existsSync(ciPath)).toBe(true);

    const content = fs.readFileSync(ciPath, 'utf-8');
    expect(content).toContain('pull_request:');
    expect(content).toContain('push:');
    expect(content).toContain('- dev');
    expect(content).toContain('- hml');
    expect(content).toContain('- main');
    expect(content).toContain('postgres:16-alpine');
    expect(content).toContain('npm run lint');
    expect(content).toContain('npm run typecheck');
    expect(content).toContain('npm test');
    expect(content).toContain('npm run build');
    expect(content).toContain('db:migrate');
    expect(content).toContain('validate-sdd');
  });

  it('defines .github/workflows/project-board-sync.yml automating GitHub Project #2 status transitions', () => {
    const syncPath = path.join(BACKEND_ROOT, '.github', 'workflows', 'project-board-sync.yml');
    expect(fs.existsSync(syncPath)).toBe(true);

    const content = fs.readFileSync(syncPath, 'utf-8');
    expect(content).toContain('create:');
    expect(content).toContain('push:');
    expect(content).toContain('pull_request:');
    expect(content).toContain('PVT_kwDODyBs284BojxS');
    expect(content).toContain('PVTSSF_lADODyBs284BojxSzhnDUCA');
    expect(content).toContain('47fc9ee4'); // In Progress
    expect(content).toContain('98236657'); // Done
  });

  it('defines root .github/workflows/ci.yml and project-board-sync.yml in parent SIIBS repository', () => {
    const rootDir = path.resolve(BACKEND_ROOT, '..');
    const rootCiPath = path.join(rootDir, '.github', 'workflows', 'ci.yml');
    const rootSyncPath = path.join(rootDir, '.github', 'workflows', 'project-board-sync.yml');
    if (fs.existsSync(path.join(rootDir, '.gitmodules'))) {
      expect(fs.existsSync(rootCiPath)).toBe(true);
      expect(fs.existsSync(rootSyncPath)).toBe(true);
    }
  });
});
