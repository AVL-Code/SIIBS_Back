import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseFilters,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from '../application';
import type { AuthenticatedUser } from '../domain';
import { DomainExceptionFilter } from './domain-exception.filter';

@Controller('auth')
@UseFilters(DomainExceptionFilter)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: AuthenticatedUser }> {
    const result = await this.authService.login(body);
    response.setHeader('Set-Cookie', result.setCookieHeader);
    return { user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) response: Response): { authenticated: false } {
    response.setHeader('Set-Cookie', this.authService.buildLogoutCookieHeader());
    return { authenticated: false };
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async me(@Req() request: Request): Promise<{ user: AuthenticatedUser }> {
    const cookieHeader = request.headers.cookie;
    const { user } = await this.authService.resolveSessionFromCookieHeader(cookieHeader);
    return { user };
  }
}
