import {
  BadGatewayException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrgoProfile } from '../users/users.types';

type OrgoRequestTokenResponse = {
  requestToken?: string;
};

const ORGO_REQUEST_TOKEN_PATH = '/api/v1/request-token-sso';
const ORGO_VERIFY_TOKEN_PATH = '/api/v1/verify-success-token-sso';
const ORGO_LOGOUT_PATH = '/api/v1/logout-sso';
const ORGO_LOGIN_PATH = '/login';

@Injectable()
export class OrgoClientService {
  constructor(private readonly configService: ConfigService) {}

  async requestLogin() {
    const { baseUrl, clientId, clientSecret } = this.getConfig();
    const url = new URL(ORGO_REQUEST_TOKEN_PATH, baseUrl);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appId: clientId,
        appSecret: clientSecret,
      }),
    });
    const payload = (await response
      .json()
      .catch(() => null)) as OrgoRequestTokenResponse | null;

    if (!response.ok) {
      throw new BadGatewayException('Unable to start Orgo login.');
    }

    const requestToken = payload?.requestToken;
    if (!requestToken) {
      throw new BadGatewayException('Missing Orgo request token.');
    }

    const redirectUrl = new URL(ORGO_LOGIN_PATH, baseUrl);
    redirectUrl.searchParams.set('requestToken', requestToken);

    return {
      requestToken,
      redirectUrl: redirectUrl.toString(),
    };
  }

  async verifySuccessToken(successToken: string) {
    const token = successToken.trim();

    if (!token) {
      throw new UnauthorizedException('Missing Orgo success token.');
    }

    const { baseUrl } = this.getConfig();
    const url = new URL(ORGO_VERIFY_TOKEN_PATH, baseUrl);
    url.searchParams.set('successToken', token);

    const response = await fetch(url.toString());

    if (response.status === 401 || response.status === 403) {
      throw new UnauthorizedException('Invalid Orgo success token.');
    }

    if (!response.ok) {
      throw new BadGatewayException('Unable to verify Orgo success token.');
    }

    const payload = (await response
      .json()
      .catch(() => null)) as OrgoProfile | null;

    if (!payload) {
      throw new BadGatewayException('Invalid Orgo response.');
    }

    return payload;
  }

  async logout(successToken: string) {
    const token = successToken.trim();

    if (!token) {
      return { success: true };
    }

    const { baseUrl } = this.getConfig();
    const url = new URL(ORGO_LOGOUT_PATH, baseUrl);
    url.searchParams.set('successToken', token);

    const response = await fetch(url.toString());

    if (
      response.status === 401 ||
      response.status === 403 ||
      response.status === 404
    ) {
      return { success: true };
    }

    if (!response.ok) {
      throw new BadGatewayException('Unable to logout from Orgo.');
    }

    return { success: true };
  }

  private getConfig() {
    return {
      baseUrl: this.configService.getOrThrow<string>('ORGO_OAUTH_BASE_URL'),
      clientId: this.configService.getOrThrow<string>('ORGO_OAUTH_CLIENT_ID'),
      clientSecret: this.configService.getOrThrow<string>(
        'ORGO_OAUTH_CLIENT_SECRET',
      ),
    };
  }
}
