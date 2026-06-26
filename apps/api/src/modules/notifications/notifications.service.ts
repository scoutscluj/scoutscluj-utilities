import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import webpush from 'web-push';
import { UserRole } from '../users/entities/user-role.enum';
import type { CurrentUser } from '../users/users.types';
import {
  BroadcastNotificationDto,
  SubscribeNotificationDto,
} from './dto/notification.dto';
import {
  NotificationDeliveryLog,
  NotificationDeliveryStatus,
} from './entities/notification-delivery-log.entity';
import {
  NotificationMessage,
  NotificationMessageKind,
  NotificationMessageStatus,
} from './entities/notification-message.entity';
import { PushSubscription } from './entities/push-subscription.entity';

type PushSendResult = {
  success: boolean;
  status?: number;
  errorCode?: string;
  message?: string;
  shouldRemove?: boolean;
};

const MAX_DEVICE_ID_LENGTH = 128;
const MAX_KEY_LENGTH = 512;
const MAX_ENDPOINT_LENGTH = 2048;
const MAX_TITLE_LENGTH = 100;
const MAX_BODY_LENGTH = 500;
const BROADCAST_RATE_LIMIT_MS = 30_000;

const PUSH_ENDPOINT_HOSTS = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'push.services.mozilla.com',
  'web.push.apple.com',
  'wns2-pn1p.notify.windows.com',
  'notify.windows.com',
];

const IMPLIED_ROLES: Record<UserRole, UserRole[]> = {
  [UserRole.Moderator]: [UserRole.Moderator],
  [UserRole.Admin]: [UserRole.Admin, UserRole.Moderator],
  [UserRole.FinanceManager]: [UserRole.FinanceManager],
  [UserRole.SuperAdmin]: [
    UserRole.SuperAdmin,
    UserRole.Admin,
    UserRole.Moderator,
    UserRole.FinanceManager,
  ],
};

const hashEndpoint = (endpoint: string) =>
  createHash('sha256').update(endpoint).digest('hex');

const cleanString = (value: unknown, maxLength: number) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const cleaned = value.trim();
  if (!cleaned) {
    return undefined;
  }

  return cleaned.slice(0, maxLength);
};

const isTransientStatus = (status?: number) =>
  status === 429 || (status !== undefined && status >= 500 && status < 600);

@Injectable()
export class NotificationsService {
  private configured = false;
  private readonly broadcastAttempts = new Map<number, number>();

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subscriptionsRepository: EntityRepository<PushSubscription>,
    @InjectRepository(NotificationMessage)
    private readonly messagesRepository: EntityRepository<NotificationMessage>,
    @InjectRepository(NotificationDeliveryLog)
    private readonly deliveryLogsRepository: EntityRepository<NotificationDeliveryLog>,
    private readonly config: ConfigService,
    @Inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  getPublicConfig() {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    return {
      configured: Boolean(
        publicKey && this.config.get<string>('VAPID_PRIVATE_KEY'),
      ),
      publicKey: publicKey || undefined,
    };
  }

  async getStatus(user: CurrentUser, deviceId?: string) {
    const activeDeviceCount = await this.subscriptionsRepository.count({
      userId: user.id,
      isActive: true,
    });
    const currentDeviceSubscribed = deviceId
      ? Boolean(
          await this.subscriptionsRepository.findOne({
            userId: user.id,
            deviceId,
            isActive: true,
          }),
        )
      : false;

    return {
      ...this.getPublicConfig(),
      activeDeviceCount,
      currentDeviceSubscribed,
    };
  }

  async subscribe(user: CurrentUser, dto: SubscribeNotificationDto) {
    const payload = this.validateSubscriptionDto(dto);
    const endpointHash = hashEndpoint(payload.endpoint);
    const now = new Date();
    const expirationTime =
      typeof dto.subscription.expirationTime === 'number'
        ? new Date(dto.subscription.expirationTime)
        : null;
    let subscription = await this.subscriptionsRepository.findOne({
      endpointHash,
    });

    if (!subscription) {
      subscription = this.subscriptionsRepository.create({
        userId: user.id,
        deviceId: payload.deviceId,
        endpoint: payload.endpoint,
        endpointHash,
        p256dh: payload.p256dh,
        authSecret: payload.authSecret,
        expirationTime,
        platform: cleanString(dto.platform, 128),
        browserName: cleanString(dto.deviceInfo?.browserName, 80),
        browserVersion: cleanString(dto.deviceInfo?.browserVersion, 80),
        osName: cleanString(dto.deviceInfo?.osName, 80),
        isMobile: Boolean(dto.deviceInfo?.isMobile),
        userAgent: cleanString(dto.userAgent, 1024),
        isActive: true,
        lastSeenAt: now,
        subscribedAt: now,
      });
      this.em.persist(subscription);
    } else {
      subscription.userId = user.id;
      subscription.deviceId = payload.deviceId;
      subscription.endpoint = payload.endpoint;
      subscription.p256dh = payload.p256dh;
      subscription.authSecret = payload.authSecret;
      subscription.expirationTime = expirationTime;
      subscription.platform = cleanString(dto.platform, 128);
      subscription.browserName = cleanString(dto.deviceInfo?.browserName, 80);
      subscription.browserVersion = cleanString(
        dto.deviceInfo?.browserVersion,
        80,
      );
      subscription.osName = cleanString(dto.deviceInfo?.osName, 80);
      subscription.isMobile = Boolean(dto.deviceInfo?.isMobile);
      subscription.userAgent = cleanString(dto.userAgent, 1024);
      subscription.isActive = true;
      subscription.lastSeenAt = now;
      subscription.unsubscribedAt = null;
      subscription.expiredAt = null;
      subscription.lastErrorCode = null;
      subscription.lastErrorMessage = null;
      subscription.lastFailedAt = null;
    }

    await this.em.flush();
    const status = await this.getStatus(user, payload.deviceId);
    return {
      success: true,
      message: 'Abonare notificări reușită.',
      activeDeviceCount: status.activeDeviceCount,
      currentDeviceSubscribed: status.currentDeviceSubscribed,
    };
  }

  async unsubscribeDevice(user: CurrentUser, deviceId: string) {
    const cleanDeviceId = this.validateDeviceId(deviceId);
    const subscriptions = await this.subscriptionsRepository.find({
      userId: user.id,
      deviceId: cleanDeviceId,
      isActive: true,
    });
    const now = new Date();

    for (const subscription of subscriptions) {
      subscription.isActive = false;
      subscription.unsubscribedAt = now;
    }

    await this.em.flush();
    const status = await this.getStatus(user, cleanDeviceId);
    return {
      success: true,
      message: 'Dezabonare notificări reușită pentru acest dispozitiv.',
      activeDeviceCount: status.activeDeviceCount,
      currentDeviceSubscribed: status.currentDeviceSubscribed,
    };
  }

  async unsubscribeAll(user: CurrentUser) {
    const subscriptions = await this.subscriptionsRepository.find({
      userId: user.id,
      isActive: true,
    });
    const now = new Date();

    for (const subscription of subscriptions) {
      subscription.isActive = false;
      subscription.unsubscribedAt = now;
    }

    await this.em.flush();
    return {
      success: true,
      message: 'Dezabonare notificări reușită pentru toate dispozitivele.',
      activeDeviceCount: 0,
      currentDeviceSubscribed: false,
    };
  }

  async getBroadcastSummary() {
    const activeSubscriptions = await this.subscriptionsRepository.find({
      isActive: true,
    });
    return {
      users: new Set(
        activeSubscriptions.map((subscription) => subscription.userId),
      ).size,
      devices: activeSubscriptions.length,
    };
  }

  async sendTest(user: CurrentUser) {
    const subscriptions = await this.subscriptionsRepository.find({
      userId: user.id,
      isActive: true,
    });
    const message = await this.createMessage({
      kind: NotificationMessageKind.Test,
      title: 'Test notificare ScoutsCluj',
      body: 'Aceasta este o notificare de test.',
      routePath: '/profile',
      sentByUserId: user.id,
      targeting: { userId: user.id, type: 'test' },
    });

    return this.deliverToSubscriptions(message, subscriptions);
  }

  async broadcast(user: CurrentUser, dto: BroadcastNotificationDto) {
    if (!this.hasRole(user, UserRole.SuperAdmin)) {
      throw new BadRequestException(
        'Doar super adminii pot trimite broadcast.',
      );
    }
    this.assertBroadcastRateLimit(user.id);

    const title = cleanString(dto.title, MAX_TITLE_LENGTH);
    const body = cleanString(dto.body, MAX_BODY_LENGTH);
    const routePath = this.validateRoutePath(dto.routePath);

    if (!title || !body) {
      throw new BadRequestException(
        'Titlul și corpul notificării sunt necesare.',
      );
    }

    const subscriptions = await this.subscriptionsRepository.find({
      isActive: true,
    });
    const message = await this.createMessage({
      kind: NotificationMessageKind.AdminBroadcast,
      title,
      body,
      routePath,
      sentByUserId: user.id,
      targeting: { type: 'broadcast', devices: subscriptions.length },
    });

    return this.deliverToSubscriptions(message, subscriptions);
  }

  private async createMessage(input: {
    kind: NotificationMessageKind;
    title: string;
    body: string;
    routePath?: string;
    sentByUserId: number;
    targeting: Record<string, unknown>;
  }) {
    const message = this.messagesRepository.create({
      kind: input.kind,
      title: input.title,
      body: input.body,
      routePath: input.routePath,
      data: {},
      sentByUserId: input.sentByUserId,
      targeting: input.targeting,
      status: NotificationMessageStatus.Sending,
      sentAt: new Date(),
    });
    this.em.persist(message);
    await this.em.flush();
    return message;
  }

  private async deliverToSubscriptions(
    message: NotificationMessage,
    subscriptions: PushSubscription[],
  ) {
    this.configureWebPush();

    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    for (const subscription of subscriptions) {
      if (!subscription.isActive) {
        skippedCount++;
        this.createDeliveryLog(message, subscription, {
          status: NotificationDeliveryStatus.Skipped,
          attempt: 1,
        });
        continue;
      }

      const result = await this.sendWithRetry(subscription, message);
      if (result.success) {
        successCount++;
        this.createDeliveryLog(message, subscription, {
          status: NotificationDeliveryStatus.Success,
          attempt: 1,
          deliveredAt: new Date(),
        });
        continue;
      }

      failureCount++;
      const now = new Date();
      subscription.lastErrorCode = result.errorCode ?? String(result.status);
      subscription.lastErrorMessage = result.message?.slice(0, 1000);
      subscription.lastFailedAt = now;

      if (result.shouldRemove) {
        subscription.isActive = false;
        subscription.expiredAt = now;
      }

      this.createDeliveryLog(message, subscription, {
        status: result.shouldRemove
          ? NotificationDeliveryStatus.Expired
          : NotificationDeliveryStatus.Failed,
        attempt: 1,
        httpStatus: result.status,
        errorCode: result.errorCode,
        errorMessage: result.message,
        failedAt: now,
      });
    }

    message.status =
      failureCount === 0
        ? NotificationMessageStatus.Sent
        : successCount > 0
          ? NotificationMessageStatus.PartialFailure
          : NotificationMessageStatus.Failed;

    await this.em.flush();

    return {
      success: failureCount === 0,
      message:
        subscriptions.length === 0
          ? 'Nu există dispozitive abonate.'
          : 'Notificări procesate.',
      totalDevices: subscriptions.length,
      successCount,
      failureCount,
      skippedCount,
    };
  }

  private async sendWithRetry(
    subscription: PushSubscription,
    message: NotificationMessage,
  ): Promise<PushSendResult> {
    const first = await this.sendPush(subscription, message);
    if (first.success || !isTransientStatus(first.status)) {
      return first;
    }

    this.createDeliveryLog(message, subscription, {
      status: NotificationDeliveryStatus.RetryScheduled,
      attempt: 1,
      httpStatus: first.status,
      errorCode: first.errorCode,
      errorMessage: first.message,
      failedAt: new Date(),
    });
    await new Promise((resolve) => setTimeout(resolve, 250));
    return this.sendPush(subscription, message);
  }

  private async sendPush(
    subscription: PushSubscription,
    message: NotificationMessage,
  ): Promise<PushSendResult> {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.authSecret,
          },
        },
        JSON.stringify({
          notification: {
            title: message.title,
            body: message.body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: `${message.kind}:${message.id}`,
            data: {
              url: message.routePath ?? '/',
              kind: message.kind,
            },
            actions: [{ action: 'view_details', title: 'Vezi detalii' }],
          },
        }),
        {
          TTL: message.kind === NotificationMessageKind.Test ? 300 : 86400,
          urgency: 'normal',
          topic:
            message.kind === NotificationMessageKind.Test
              ? 'test'
              : `broadcast-${message.id}`,
        },
      );
      return { success: true };
    } catch (error) {
      const pushError = error as {
        statusCode?: number;
        body?: string;
        message?: string;
      };
      const status = pushError.statusCode;
      return {
        success: false,
        status,
        errorCode: status ? String(status) : 'WEB_PUSH_ERROR',
        message: pushError.message ?? 'Web Push delivery failed.',
        shouldRemove: status === 410 || status === 401 || status === 403,
      };
    }
  }

  private createDeliveryLog(
    message: NotificationMessage,
    subscription: PushSubscription,
    input: {
      status: NotificationDeliveryStatus;
      attempt: number;
      httpStatus?: number;
      errorCode?: string;
      errorMessage?: string;
      deliveredAt?: Date;
      failedAt?: Date;
    },
  ) {
    this.em.persist(
      this.deliveryLogsRepository.create({
        messageId: message.id,
        subscriptionId: subscription.id,
        userId: subscription.userId,
        deviceId: subscription.deviceId,
        status: input.status,
        httpStatus: input.httpStatus,
        errorCode: input.errorCode,
        errorMessage: input.errorMessage?.slice(0, 1000),
        attempt: input.attempt,
        deliveredAt: input.deliveredAt,
        failedAt: input.failedAt,
      }),
    );
  }

  private configureWebPush() {
    if (this.configured) {
      return;
    }

    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject =
      this.config.get<string>('VAPID_SUBJECT') ?? 'mailto:admin@scoutscluj.ro';

    if (!publicKey || !privateKey) {
      throw new ServiceUnavailableException('VAPID keys are not configured.');
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.configured = true;
  }

  private validateSubscriptionDto(dto: SubscribeNotificationDto) {
    const deviceId = this.validateDeviceId(dto.deviceId);
    const endpoint = cleanString(
      dto.subscription?.endpoint,
      MAX_ENDPOINT_LENGTH,
    );
    const p256dh = cleanString(dto.subscription?.keys?.p256dh, MAX_KEY_LENGTH);
    const authSecret = cleanString(
      dto.subscription?.keys?.auth,
      MAX_KEY_LENGTH,
    );

    if (!endpoint || !p256dh || !authSecret) {
      throw new BadRequestException('Abonarea Web Push nu este validă.');
    }

    const endpointUrl = this.validateEndpoint(endpoint);
    const hostAllowed = PUSH_ENDPOINT_HOSTS.some(
      (host) =>
        endpointUrl.hostname === host ||
        endpointUrl.hostname.endsWith(`.${host}`),
    );
    if (!hostAllowed) {
      throw new BadRequestException(
        'Serviciul push al browserului nu este acceptat.',
      );
    }

    return { deviceId, endpoint, p256dh, authSecret };
  }

  private validateDeviceId(deviceId: unknown) {
    const cleanDeviceId = cleanString(deviceId, MAX_DEVICE_ID_LENGTH);
    if (!cleanDeviceId) {
      throw new BadRequestException('deviceId este necesar.');
    }

    return cleanDeviceId;
  }

  private validateEndpoint(endpoint: string) {
    try {
      const url = new URL(endpoint);
      if (url.protocol !== 'https:') {
        throw new Error('Expected HTTPS endpoint.');
      }
      return url;
    } catch {
      throw new BadRequestException('Endpointul Web Push nu este valid.');
    }
  }

  private validateRoutePath(routePath?: string) {
    const path = cleanString(routePath, 255);
    if (!path) {
      return undefined;
    }

    if (
      !path.startsWith('/') ||
      path.startsWith('//') ||
      path.includes('://')
    ) {
      throw new BadRequestException('Ruta notificării nu este validă.');
    }

    return path;
  }

  private hasRole(user: CurrentUser, role: UserRole) {
    return user.roles.some((userRole) =>
      IMPLIED_ROLES[userRole]?.includes(role),
    );
  }

  private assertBroadcastRateLimit(userId: number) {
    const now = Date.now();
    const lastAttempt = this.broadcastAttempts.get(userId);

    if (lastAttempt && now - lastAttempt < BROADCAST_RATE_LIMIT_MS) {
      throw new HttpException(
        'Așteaptă înainte să trimiți un alt broadcast.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.broadcastAttempts.set(userId, now);
  }
}
