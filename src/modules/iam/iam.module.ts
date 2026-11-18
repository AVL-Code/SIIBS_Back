import { Module } from '@nestjs/common';
import { AuthService, PasswordHasherService, PermissionGuard } from './application';
import { SessionTokenService, UserRepository } from './infrastructure';
import { AuthController } from './presentation';

@Module({
  controllers: [AuthController],
  providers: [
    UserRepository,
    PasswordHasherService,
    SessionTokenService,
    AuthService,
    PermissionGuard,
  ],
  exports: [AuthService, PermissionGuard, PasswordHasherService, SessionTokenService],
})
export class IamModule {}
