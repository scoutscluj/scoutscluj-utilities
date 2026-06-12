import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import {
  ORGO_REDIRECT_COOKIE_NAME,
  ORGO_WEB_ORIGIN_COOKIE_NAME,
} from './session.constants';

const parseCookies = (cookieHeader?: string) => {
  if (!cookieHeader) {
    return {} as Record<string, string>;
  }

  return cookieHeader
    .split(';')
    .reduce<Record<string, string>>((cookies, cookie) => {
      const [name, ...valueParts] = cookie.trim().split('=');
      if (!name) {
        return cookies;
      }

      cookies[name] = decodeURIComponent(valueParts.join('='));
      return cookies;
    }, {});
};

const getSafePath = (value?: string) => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }

  if (value.startsWith('/login') || value.startsWith('/auth/')) {
    return '/';
  }

  return value;
};

@Controller('orgo')
export class OrgoCallbackController {
  constructor(private readonly configService: ConfigService) {}

  @Get('callback')
  callback(
    @Query('successToken') successToken: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    if (!successToken) {
      return response.redirect(
        303,
        `${this.getWebOrigin(request)}/login?orgo=missing-token`,
      );
    }

    const cookies = parseCookies(request.headers.cookie);
    const redirectPath = getSafePath(cookies[ORGO_REDIRECT_COOKIE_NAME]);
    const callbackUrl = new URL(
      '/auth/orgo/callback',
      this.getWebOrigin(request),
    );
    callbackUrl.searchParams.set('successToken', successToken);
    callbackUrl.searchParams.set('redirectTo', redirectPath);

    response.clearCookie(ORGO_REDIRECT_COOKIE_NAME, { path: '/' });
    response.clearCookie(ORGO_WEB_ORIGIN_COOKIE_NAME, { path: '/' });

    return response.redirect(303, callbackUrl.toString());
  }

  private getWebOrigin(request: Request) {
    const cookies = parseCookies(request.headers.cookie);
    const cookieOrigin = cookies[ORGO_WEB_ORIGIN_COOKIE_NAME];
    const allowedOrigins = this.getAllowedOrigins();

    if (cookieOrigin && allowedOrigins.includes(cookieOrigin)) {
      return cookieOrigin;
    }

    return (
      this.configService.get<string>('WEB_ORIGIN') ??
      allowedOrigins[0] ??
      'http://localhost:5173'
    );
  }

  private getAllowedOrigins() {
    const configured =
      this.configService
        .get<string>('WEB_ORIGINS')
        ?.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean) ?? [];
    const singleOrigin = this.configService.get<string>('WEB_ORIGIN');

    return Array.from(
      new Set([
        ...(singleOrigin ? [singleOrigin] : []),
        ...configured,
        'http://localhost:5173',
        'http://localhost:5174',
      ]),
    );
  }
}
