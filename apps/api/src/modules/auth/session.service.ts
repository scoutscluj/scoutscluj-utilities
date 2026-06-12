import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import {
  ORGO_SUCCESS_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from './session.constants';

type SessionPayload = {
  sub: number;
  exp: number;
};

const encode = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

const decode = <T>(value: string) =>
  JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;

@Injectable()
export class SessionService {
  constructor(private readonly configService: ConfigService) {}

  createSessionToken(userId: number) {
    const payload: SessionPayload = {
      sub: userId,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    };
    const body = encode(payload);
    const signature = this.sign(body);

    return `${body}.${signature}`;
  }

  verifySessionToken(token: string) {
    const [body, signature] = token.split('.');

    if (!body || !signature) {
      throw new UnauthorizedException('Invalid session token.');
    }

    const expectedSignature = this.sign(body);
    const expected = Buffer.from(expectedSignature);
    const actual = Buffer.from(signature);

    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      throw new UnauthorizedException('Invalid session token.');
    }

    const payload = decode<SessionPayload>(body);

    if (!payload.sub || payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Expired session token.');
    }

    return payload;
  }

  setSessionCookie(response: Response, token: string) {
    response.cookie(SESSION_COOKIE_NAME, token, this.cookieOptions(true));
  }

  setOrgoSuccessCookie(response: Response, token: string) {
    response.cookie(ORGO_SUCCESS_COOKIE_NAME, token, this.cookieOptions(true));
  }

  clearSessionCookies(response: Response) {
    response.clearCookie(SESSION_COOKIE_NAME, this.cookieOptions(false));
    response.clearCookie(ORGO_SUCCESS_COOKIE_NAME, this.cookieOptions(false));
  }

  getCookieOptions() {
    return this.cookieOptions(true);
  }

  private sign(body: string) {
    return createHmac('sha256', this.getSecret())
      .update(body)
      .digest('base64url');
  }

  private getSecret() {
    const secret = this.configService.get<string>('AUTH_SESSION_SECRET');

    if (secret) {
      return secret;
    }

    if (this.configService.get<string>('NODE_ENV') === 'production') {
      throw new Error('AUTH_SESSION_SECRET is required in production.');
    }

    return 'development-auth-session-secret-change-me';
  }

  private cookieOptions(includeMaxAge: boolean) {
    return {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax' as const,
      path: '/',
      ...(includeMaxAge ? { maxAge: SESSION_TTL_SECONDS * 1000 } : {}),
    };
  }
}
