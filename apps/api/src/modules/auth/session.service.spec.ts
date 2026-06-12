import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionService } from './session.service';

describe('SessionService', () => {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'AUTH_SESSION_SECRET') {
        return 'test-session-secret-with-enough-entropy';
      }

      return undefined;
    }),
  } as unknown as ConfigService;

  it('creates and verifies signed session tokens', () => {
    const service = new SessionService(config);
    const token = service.createSessionToken(42);

    expect(service.verifySessionToken(token).sub).toBe(42);
  });

  it('rejects tampered session tokens', () => {
    const service = new SessionService(config);
    const token = service.createSessionToken(42);

    expect(() => service.verifySessionToken(`${token}x`)).toThrow(
      UnauthorizedException,
    );
  });
});
