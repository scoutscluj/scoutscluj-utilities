import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { UsersService } from '../users/users.service';
import { OrgoClientService } from './orgo-client.service';
import { SESSION_COOKIE_NAME } from './session.constants';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly orgoClientService: OrgoClientService,
    private readonly sessionService: SessionService,
    private readonly usersService: UsersService,
  ) {}

  requestOrgoLogin() {
    return this.orgoClientService.requestLogin();
  }

  async signInWithOrgo(successToken: string, response?: Response) {
    const orgoProfile =
      await this.orgoClientService.verifySuccessToken(successToken);
    const { user, wasCreated } =
      await this.usersService.resolveOrCreateFromOrgoProfile(orgoProfile);
    const sessionToken = this.sessionService.createSessionToken(user.id);

    if (response) {
      this.sessionService.setSessionCookie(response, sessionToken);
    }

    return {
      session_token: sessionToken,
      user: this.usersService.serialize(user),
      orgo_profile: orgoProfile,
      was_created: wasCreated,
    };
  }

  async getCurrentUserFromToken(token: string) {
    const payload = this.sessionService.verifySessionToken(token);
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User no longer exists.');
    }

    return this.usersService.serialize(user);
  }

  async logout(successToken: string | undefined, response?: Response) {
    if (successToken) {
      await this.orgoClientService.logout(successToken);
    }

    if (response) {
      this.sessionService.clearSessionCookies(response);
    }

    return { success: true };
  }

  extractSessionToken(headers: {
    authorization?: string | string[];
    cookie?: string | string[];
  }) {
    const authorization = Array.isArray(headers.authorization)
      ? headers.authorization[0]
      : headers.authorization;

    if (authorization?.startsWith('Bearer ')) {
      return authorization.slice('Bearer '.length).trim();
    }

    const cookieHeader = Array.isArray(headers.cookie)
      ? headers.cookie.join('; ')
      : headers.cookie;
    const cookies = this.parseCookies(cookieHeader);

    return cookies[SESSION_COOKIE_NAME];
  }

  private parseCookies(cookieHeader?: string) {
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
  }
}
