import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { validateEnv } from './shared';

function loadDefaultEnvFiles(): void {
  if (typeof process.loadEnvFile !== 'function') {
    return;
  }
  for (const candidate of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../.env')]) {
    if (existsSync(candidate)) {
      process.loadEnvFile(candidate);
    }
  }
}

export async function bootstrap(): Promise<void> {
  loadDefaultEnvFiles();
  const env = validateEnv();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  await app.listen(env.PORT);
}

if (require.main === module) {
  void bootstrap();
}
