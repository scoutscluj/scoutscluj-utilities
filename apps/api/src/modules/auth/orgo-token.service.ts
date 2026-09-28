import { EntityManager } from '@mikro-orm/core';
import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
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
    if (!encoded || !/^[0-9a-f]{64}$/i.test(encoded))
      throw new ServiceUnavailableException(
        'Stocarea securizată a tokenurilor ORGO nu este configurată.',
      );
    return Buffer.from(encoded, 'hex');
  }

  async capture(userId: number, raw: unknown) {
    const value = raw as Record<string, unknown>;
    const token = value.access_token ?? value.accessToken;
    // Login remains available if legacy ORGO does not issue API credentials.
    if (
      typeof token !== 'string' ||
      !token ||
      !this.config.get<string>('ORGO_TOKEN_ENCRYPTION_KEY')
    )
      return;
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

  // Server-only adapter seam. A member token is never reused for another
  // beneficiary, roster discovery, or administrative national write-back.
  async memberSelf(userId: number): Promise<Record<string, unknown>> {
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
    const token = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
    const base = this.config.getOrThrow<string>('ORGO_OAUTH_BASE_URL');
    const url = new URL('/api/v1/users/me', base);
    if (url.protocol !== 'https:')
      throw new ServiceUnavailableException('ORGO necesită HTTPS.');
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
    if (response.status === 401) {
      connection.apiTokenEncrypted = null;
      await this.em.flush();
      throw new UnauthorizedException(
        'Token ORGO expirat sau revocat. Autentifică-te din nou.',
      );
    }
    if (!response.ok)
      throw new ServiceUnavailableException(
        'Accesul la API ORGO nu este disponibil.',
      );
    return (await response.json()) as Record<string, unknown>;
  }
}
