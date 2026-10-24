import { Module } from '@nestjs/common';
import { DbModule } from './db';
import { AssistanceModule } from './modules/assistance';
import { AuditModule } from './modules/audit';
import { EducationModule } from './modules/education';
import { IamModule } from './modules/iam';
import { RegistryModule } from './modules/registry';

@Module({
  imports: [DbModule, IamModule, AuditModule, RegistryModule, AssistanceModule, EducationModule],
})
export class AppModule {}
