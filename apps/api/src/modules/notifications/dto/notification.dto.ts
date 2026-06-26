import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VapidPublicKeyDto {
  @ApiProperty()
  configured!: boolean;

  @ApiPropertyOptional()
  publicKey?: string;
}

export class BrowserInfoDto {
  @ApiPropertyOptional()
  browserName?: string;

  @ApiPropertyOptional()
  browserVersion?: string;

  @ApiPropertyOptional()
  osName?: string;

  @ApiPropertyOptional()
  isMobile?: boolean;
}

export class PushSubscriptionKeysDto {
  @ApiProperty()
  p256dh!: string;

  @ApiProperty()
  auth!: string;
}

export class PushSubscriptionPayloadDto {
  @ApiProperty()
  endpoint!: string;

  @ApiPropertyOptional({ nullable: true })
  expirationTime?: number | null;

  @ApiProperty({ type: PushSubscriptionKeysDto })
  keys!: PushSubscriptionKeysDto;
}

export class SubscribeNotificationDto {
  @ApiProperty()
  deviceId!: string;

  @ApiProperty({ type: PushSubscriptionPayloadDto })
  subscription!: PushSubscriptionPayloadDto;

  @ApiPropertyOptional()
  platform?: string;

  @ApiPropertyOptional()
  userAgent?: string;

  @ApiPropertyOptional({ type: BrowserInfoDto })
  deviceInfo?: BrowserInfoDto;
}

export class NotificationStatusDto {
  @ApiProperty()
  configured!: boolean;

  @ApiPropertyOptional()
  publicKey?: string;

  @ApiProperty()
  activeDeviceCount!: number;

  @ApiProperty()
  currentDeviceSubscribed!: boolean;
}

export class NotificationActionResultDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional()
  activeDeviceCount?: number;

  @ApiPropertyOptional()
  currentDeviceSubscribed?: boolean;
}

export class BroadcastSummaryDto {
  @ApiProperty()
  users!: number;

  @ApiProperty()
  devices!: number;
}

export class SendTestNotificationDto {
  @ApiPropertyOptional()
  deviceId?: string;
}

export class BroadcastNotificationDto {
  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiPropertyOptional()
  routePath?: string;
}

export class NotificationDeliverySummaryDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  totalDevices!: number;

  @ApiProperty()
  successCount!: number;

  @ApiProperty()
  failureCount!: number;

  @ApiPropertyOptional()
  skippedCount?: number;
}
