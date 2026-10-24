import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { ForbiddenError, SOURCE_MODULE } from './shared';

describe('AppModule & Bounded Context Architecture (11-tech-spec.md §3.1, §3.2)', () => {
  it('compiles the NestJS modular monolith with all bounded context modules', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const appModule = moduleRef.get(AppModule);
    expect(appModule).toBeDefined();
  });

  it('exposes shared domain error types and source module constants', () => {
    const error = new ForbiddenError('Insufficient permissions');
    expect(error.code).toBe('FORBIDDEN');
    expect(SOURCE_MODULE.ASSISTANCE).toBe('assistance');
    expect(SOURCE_MODULE.REGISTRY).toBe('registry');
  });

  it('rejects deep imports across bounded context modules via ESLint', async () => {
    const eslint = new ESLint({ cwd: process.cwd() });
    const results = await eslint.lintText(
      `import {} from '../registry/domain/index';\nexport const invalidRef = true;\n`,
      { filePath: 'src/modules/assistance/application/index.ts' },
    );

    const messages = results[0]?.messages ?? [];
    expect(messages.some((msg) => msg.ruleId === 'no-restricted-imports')).toBe(true);
  });
});
