import { Migration } from '@mikro-orm/migrations';

export class Migration20260626000200 extends Migration {
  override up(): void {
    this.addSql(
      "create type \"notification_message_kind\" as enum ('admin_broadcast', 'test');",
    );
    this.addSql(
      "create type \"notification_message_status\" as enum ('sending', 'sent', 'partial_failure', 'failed');",
    );
    this.addSql(
      "create type \"notification_delivery_status\" as enum ('success', 'failed', 'skipped', 'expired', 'retry_scheduled');",
    );

    this.addSql(
      'create table "push_subscriptions" ("id" serial primary key, "user_id" int not null, "device_id" varchar(255) not null, "endpoint" text not null, "endpoint_hash" varchar(255) not null, "p256dh" text not null, "auth_secret" text not null, "expiration_time" timestamptz null, "platform" varchar(255) null, "browser_name" varchar(255) null, "browser_version" varchar(255) null, "os_name" varchar(255) null, "is_mobile" boolean not null default false, "user_agent" text null, "is_active" boolean not null default true, "last_seen_at" timestamptz not null, "subscribed_at" timestamptz not null, "unsubscribed_at" timestamptz null, "expired_at" timestamptz null, "last_error_code" varchar(255) null, "last_error_message" text null, "last_failed_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null);',
    );
    this.addSql(
      'create unique index "push_subscriptions_endpoint_hash_unique" on "push_subscriptions" ("endpoint_hash");',
    );
    this.addSql(
      'create index "push_subscriptions_user_id_is_active_index" on "push_subscriptions" ("user_id", "is_active");',
    );
    this.addSql(
      'create index "push_subscriptions_device_id_user_id_index" on "push_subscriptions" ("device_id", "user_id");',
    );
    this.addSql(
      'create index "push_subscriptions_last_seen_at_index" on "push_subscriptions" ("last_seen_at");',
    );
    this.addSql(
      'alter table "push_subscriptions" add constraint "push_subscriptions_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;',
    );

    this.addSql(
      'create table "notification_messages" ("id" serial primary key, "kind" "notification_message_kind" not null, "title" varchar(255) not null, "body" text not null, "route_path" varchar(255) null, "data" jsonb not null default \'{}\', "sent_by_user_id" int null, "targeting" jsonb not null default \'{}\', "status" "notification_message_status" not null default \'sending\', "created_at" timestamptz not null, "sent_at" timestamptz null);',
    );
    this.addSql(
      'create index "notification_messages_kind_index" on "notification_messages" ("kind");',
    );
    this.addSql(
      'create index "notification_messages_status_index" on "notification_messages" ("status");',
    );
    this.addSql(
      'create index "notification_messages_sent_at_index" on "notification_messages" ("sent_at");',
    );
    this.addSql(
      'alter table "notification_messages" add constraint "notification_messages_sent_by_user_id_foreign" foreign key ("sent_by_user_id") references "users" ("id") on update cascade on delete set null;',
    );

    this.addSql(
      'create table "notification_delivery_logs" ("id" serial primary key, "message_id" int null, "subscription_id" int null, "user_id" int not null, "device_id" varchar(255) null, "status" "notification_delivery_status" not null, "http_status" int null, "error_code" varchar(255) null, "error_message" text null, "attempt" int not null default 1, "delivered_at" timestamptz null, "failed_at" timestamptz null, "created_at" timestamptz not null);',
    );
    this.addSql(
      'create index "notification_delivery_logs_message_id_status_index" on "notification_delivery_logs" ("message_id", "status");',
    );
    this.addSql(
      'create index "notification_delivery_logs_user_id_created_at_index" on "notification_delivery_logs" ("user_id", "created_at");',
    );
    this.addSql(
      'create index "notification_delivery_logs_subscription_id_created_at_index" on "notification_delivery_logs" ("subscription_id", "created_at");',
    );
    this.addSql(
      'alter table "notification_delivery_logs" add constraint "notification_delivery_logs_message_id_foreign" foreign key ("message_id") references "notification_messages" ("id") on update cascade on delete set null;',
    );
    this.addSql(
      'alter table "notification_delivery_logs" add constraint "notification_delivery_logs_subscription_id_foreign" foreign key ("subscription_id") references "push_subscriptions" ("id") on update cascade on delete set null;',
    );
    this.addSql(
      'alter table "notification_delivery_logs" add constraint "notification_delivery_logs_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;',
    );
  }

  override down(): void {
    this.addSql('drop table if exists "notification_delivery_logs" cascade;');
    this.addSql('drop table if exists "notification_messages" cascade;');
    this.addSql('drop table if exists "push_subscriptions" cascade;');
    this.addSql('drop type if exists "notification_delivery_status";');
    this.addSql('drop type if exists "notification_message_status";');
    this.addSql('drop type if exists "notification_message_kind";');
  }
}
