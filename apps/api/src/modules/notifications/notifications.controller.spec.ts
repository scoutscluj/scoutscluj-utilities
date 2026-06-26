jest.mock('../auth/guards/auth.guard', () => ({
  AuthGuard: class AuthGuard {},
}));

jest.mock('../auth/guards/roles.guard', () => ({
  RolesGuard: class RolesGuard {},
}));

jest.mock('./notifications.service', () => ({
  NotificationsService: class NotificationsService {},
}));

import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user-role.enum';
import { NotificationsController } from './notifications.controller';

describe('NotificationsController', () => {
  const getPrototypeMethod = (
    name: 'getBroadcastSummary' | 'broadcast',
  ): object => {
    const descriptor = Object.getOwnPropertyDescriptor(
      NotificationsController.prototype,
      name,
    );
    const value: unknown = descriptor?.value;

    if (typeof value !== 'function') {
      throw new Error(`Missing controller method: ${name}`);
    }

    return value;
  };

  it('guards broadcast endpoints for super-admin access', () => {
    const summaryHandler = getPrototypeMethod('getBroadcastSummary');
    const broadcastHandler = getPrototypeMethod('broadcast');

    expect(Reflect.getMetadata(ROLES_KEY, summaryHandler)).toEqual([
      UserRole.SuperAdmin,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, broadcastHandler)).toEqual([
      UserRole.SuperAdmin,
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, summaryHandler)).toEqual([
      AuthGuard,
      RolesGuard,
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, broadcastHandler)).toEqual([
      AuthGuard,
      RolesGuard,
    ]);
  });

  it('delegates subscription and broadcast operations to the service', async () => {
    const service = {
      getPublicConfig: jest.fn(() => ({ configured: false })),
      getStatus: jest.fn(() => Promise.resolve({ activeDeviceCount: 0 })),
      subscribe: jest.fn(() => Promise.resolve({ success: true })),
      unsubscribeDevice: jest.fn(() => Promise.resolve({ success: true })),
      unsubscribeAll: jest.fn(() => Promise.resolve({ success: true })),
      sendTest: jest.fn(() => Promise.resolve({ totalDevices: 0 })),
      getBroadcastSummary: jest.fn(() =>
        Promise.resolve({ users: 0, devices: 0 }),
      ),
      broadcast: jest.fn(() => Promise.resolve({ totalDevices: 0 })),
    };
    const controller = new NotificationsController(service as never);
    const user = { id: 1, roles: [UserRole.SuperAdmin] } as never;

    expect(controller.getVapidPublicKey()).toEqual({ configured: false });
    await expect(controller.getStatus(user, 'device-1')).resolves.toEqual({
      activeDeviceCount: 0,
    });
    await expect(
      controller.subscribe(user, {
        deviceId: 'device-1',
        subscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/1',
          keys: { p256dh: 'p', auth: 'a' },
        },
      }),
    ).resolves.toEqual({ success: true });
    await expect(
      controller.unsubscribeDevice(user, 'device-1'),
    ).resolves.toEqual({
      success: true,
    });
    await expect(controller.unsubscribeAll(user)).resolves.toEqual({
      success: true,
    });
    await expect(controller.sendTest(user)).resolves.toEqual({
      totalDevices: 0,
    });
    await expect(controller.getBroadcastSummary()).resolves.toEqual({
      users: 0,
      devices: 0,
    });
    await expect(
      controller.broadcast(user, { title: 'Salut', body: 'Mesaj' }),
    ).resolves.toEqual({ totalDevices: 0 });
  });
});
