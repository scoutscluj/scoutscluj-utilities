import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser as CurrentUserDecorator } from './decorators/current-user.decorator';
import { CurrentUserDto } from './dto/current-user.dto';
import { LogoutDto } from './dto/logout.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { OrgoRequestTokenResponseDto } from './dto/orgo-request-token-response.dto';
import { OrgoSignInResponseDto } from './dto/orgo-sign-in-response.dto';
import { OrgoSuccessTokenDto } from './dto/orgo-success-token.dto';
import { AuthGuard } from './guards/auth.guard';
import type { AuthenticatedUser } from './auth.types';
import {
  ORGO_REDIRECT_COOKIE_NAME,
  ORGO_WEB_ORIGIN_COOKIE_NAME,
} from './session.constants';

const ORGO_FLOW_TTL_MS = 10 * 60 * 1000;

const getSafePath = (value?: string) => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }

  if (value.startsWith('/login') || value.startsWith('/auth/')) {
    return '/';
  }

  return value;
};

const getAllowedOrigins = (configService: ConfigService) => {
  const configured =
    configService
      .get<string>('WEB_ORIGINS')
      ?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];
  const singleOrigin = configService.get<string>('WEB_ORIGIN');

  return Array.from(
    new Set([
      ...(singleOrigin ? [singleOrigin] : []),
      ...configured,
      'http://localhost:5173',
      'http://localhost:5174',
    ]),
  );
};

const getWebOrigin = (configService: ConfigService, origin?: string) => {
  const allowedOrigins = getAllowedOrigins(configService);

  if (origin && allowedOrigins.includes(origin)) {
    return origin;
  }

  return (
    configService.get<string>('WEB_ORIGIN') ??
    allowedOrigins[0] ??
    'http://localhost:5173'
  );
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('orgo/request-token')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: OrgoRequestTokenResponseDto })
  async requestOrgoToken(): Promise<OrgoRequestTokenResponseDto> {
    const response = await this.authService.requestOrgoLogin();

    return {
      request_token: response.requestToken,
      redirect_url: response.redirectUrl,
    };
  }

  @Get('orgo/start')
  async startOrgoLogin(
    @Query('redirectTo') redirectTo: string | undefined,
    @Query('webOrigin') webOrigin: string | undefined,
    @Res() response: Response,
  ) {
    const login = await this.authService.requestOrgoLogin();
    const origin = getWebOrigin(this.configService, webOrigin);
    const cookieOptions = {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: ORGO_FLOW_TTL_MS,
    };

    response.cookie(
      ORGO_REDIRECT_COOKIE_NAME,
      getSafePath(redirectTo),
      cookieOptions,
    );
    response.cookie(ORGO_WEB_ORIGIN_COOKIE_NAME, origin, cookieOptions);

    return response.redirect(303, login.redirectUrl);
  }

  @Post('orgo/signin')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: OrgoSignInResponseDto })
  signInWithOrgo(
    @Body() body: OrgoSuccessTokenDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.signInWithOrgo(body.successToken, response);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  @ApiOkResponse({ type: CurrentUserDto })
  getCurrentUser(@CurrentUserDecorator() user: AuthenticatedUser) {
    return user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LogoutResponseDto })
  logout(
    @Body() body: LogoutDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.logout(body.successToken, response);
  }
}
