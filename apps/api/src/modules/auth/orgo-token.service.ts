import { EntityManager } from '@mikro-orm/core';
import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from 'node:crypto';
import { OrgoConnection } from '../users/entities/orgo-connection.entity';
import type { OrgoProfile } from '../users/users.types';

// ORGO can add credentials to its SSO response. Never persist/return that raw
// response as a public profile; only these existing profile fields may escape.
export function safeOrgoProfile(raw: OrgoProfile): OrgoProfile {
  const keys: Array<keyof OrgoProfile> = [
    'id',
    'cardId',
    'email',
    'firstName',
    'lastName',
    'feeValidUntilDate',
    'town',
    'localCenter',
    'age',
    'dateOfBirth',
    'dateJoined',
    'dateJoinedFullMember',
    'status',
    'isFulMember',
    'profileImage',
  ];
  return Object.fromEntries(
    keys.filter((key) => raw[key] !== undefined).map((key) => [key, raw[key]]),
  );
}

@Injectable()
export class OrgoTokenService {
  constructor(
    @Inject(EntityManager) private readonly em: EntityManager,
    private readonly config: ConfigService,
  ) {}

  private key() {
    const encoded = this.config.get<string>('ORGO_TOKEN_ENCRYPTION_KEY');
    if (encoded) {
      if (!/^[0-9a-f]{64}$/i.test(encoded))
        throw new ServiceUnavailableException(
          'Cheia tokenurilor ORGO este invalidă.',
        );
      return Buffer.from(encoded, 'hex');
    }
    const sessionSecret = this.config.get<string>('AUTH_SESSION_SECRET');
    if (!sessionSecret || sessionSecret.length < 32)
      throw new ServiceUnavailableException(
        'Stocarea securizată a tokenurilor ORGO nu este configurată.',
      );
    return Buffer.from(
      hkdfSync(
        'sha256',
        sessionSecret,
        'scoutscluj-utilities',
        'orgo-oauth-encryption-v1',
        32,
      ),
    );
  }

  private async accessToken(userId: number) {
    const connection = await this.em.findOne(OrgoConnection, { user: userId });
    if (!connection?.apiTokenEncrypted)
      throw new UnauthorizedException(
        'Autentifică-te din nou pentru accesul API ORGO.',
      );
    const [iv, tag, encrypted] = connection.apiTokenEncrypted
      .split('.')
      .map((part) => Buffer.from(part, 'base64url'));
    const decipher = createDecipheriv('aes-256-gcm', this.key(), iv);
    decipher.setAAD(Buffer.from(`orgo-member:${userId}`));
    decipher.setAuthTag(tag);
    return {
      connection,
      token: Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]).toString('utf8'),
    };
  }

  async apiJson(userId: number, path: string) {
    const serverToken = this.config.get<string>('ORGO_API_TOKEN')?.trim();
    const delegated = serverToken ? null : await this.accessToken(userId);
    const base = this.config.getOrThrow<string>('ORGO_OAUTH_BASE_URL');
    const url = new URL(path, base);
    if (url.origin !== new URL(base).origin || url.protocol !== 'https:')
      throw new ServiceUnavailableException('Adresă API ORGO invalidă.');
    const response = await fetch(url, {
      headers: {
        ...(serverToken
          ? { 'Api-Token': serverToken }
          : { Authorization: `Bearer ${delegated!.token}` }),
        Accept: 'application/ld+json, application/json',
      },
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    if (response.status === 401) {
      if (delegated) {
        delegated.connection.apiTokenEncrypted = null;
        await this.em.flush();
      }
      throw new UnauthorizedException(
        serverToken
          ? 'Tokenul API ORGO este expirat sau revocat.'
          : 'Token ORGO expirat sau revocat. Autentifică-te din nou.',
      );
    }
    if (response.status === 403)
      throw new UnauthorizedException(
        'Tokenul ORGO nu are permisiunea de a citi membrii centrului local.',
      );
    if (!response.ok)
      throw new ServiceUnavailableException(
        'Accesul la API ORGO nu este disponibil.',
      );
    return (await response.json()) as Record<string, unknown>;
  }

  async administrativeReady(userId: number) {
    try {
      this.key();
    } catch {
      return false;
    }
    const connection = await this.em.findOne(OrgoConnection, { user: userId });
    return Boolean(connection?.apiTokenEncrypted);
  }

  async administrativeJson(
    userId: number,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    const delegated = await this.accessToken(userId);
    const base = new URL(this.config.getOrThrow<string>('ORGO_OAUTH_BASE_URL'));
    const url = new URL(path, base);
    if (
      url.origin !== base.origin ||
      url.protocol !== 'https:' ||
      !url.pathname.startsWith('/api/v1/')
    )
      throw new ServiceUnavailableException('Adresă API ORGO invalidă.');
    const response = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${delegated.token}`,
        Accept: 'application/ld+json, application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    if (response.status === 401) {
      delegated.connection.apiTokenEncrypted = null;
      await this.em.flush();
    }
    if (!response.ok) {
      if ([400, 401, 403, 404, 422].includes(response.status))
        throw new OrgoRequestRejectedException(
          'ORGO a refuzat operațiunea. Autentifică-te din nou dacă tokenul a expirat. Verifică permisiunile financiare, activarea „Marchează ca plătit” și perioada cotizației.',
        );
      throw new ServiceUnavailableException('ORGO nu a confirmat operațiunea.');
    }
    return response.json() as Promise<unknown>;
  }

  async capture(userId: number, raw: unknown) {
    const value = raw as Record<string, unknown>;
    const token = value.access_token ?? value.accessToken;
    // Login remains available if legacy ORGO does not issue API credentials.
    if (typeof token !== 'string' || !token) return;
    try {
      this.key();
    } catch {
      return;
    }
    const connection = await this.em.findOne(OrgoConnection, { user: userId });
    if (!connection) throw new UnauthorizedException();
    const iv = randomBytes(12),
      cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    cipher.setAAD(Buffer.from(`orgo-member:${userId}`));
    const encrypted = Buffer.concat([
      cipher.update(token, 'utf8'),
      cipher.final(),
    ]);
    connection.apiTokenEncrypted = [iv, cipher.getAuthTag(), encrypted]
      .map((part) => part.toString('base64url'))
      .join('.');
    await this.em.flush();
  }

  // Financial write callers check staff roles and select the actor
  // whose encrypted OAuth token is used for the operation.
  async memberSelf(userId: number): Promise<Record<string, unknown>> {
    return this.apiJson(userId, '/api/v1/users/me');
  }
}

export class OrgoRequestRejectedException extends ServiceUnavailableException {}
