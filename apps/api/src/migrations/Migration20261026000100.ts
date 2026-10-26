import { Migration } from '@mikro-orm/migrations';

export class Migration20261026000100 extends Migration {
  override up(): void {
    // Widen the legacy constraint before converting populated historical rows.
    this.addSql('alter table "scout_members" drop constraint "member_status";');
    this.addSql(`alter table "scout_members" add constraint "member_status"
      check (status in ('active', 'withdrawn', 'review', 'inactive', 'suspended'));`);
    this.addSql(`alter table "member_sync_operations"
      add column "attempts" integer not null default 0,
      add column "next_attempt_at" timestamptz null;`);
    this.addSql(`alter table "member_settings"
      add column "refresh_token" uuid null,
      add column "refresh_claimed_at" timestamptz null,
      add column "refresh_state" varchar(255) not null default 'idle',
      add column "refresh_message" text null;`);
    // Local organizational changes have no remote counterpart.
    this.addSql(`update "member_sync_operations" set state = 'local-only',
      message = 'Organizarea este administrată în Resurse.'
      where kind in ('assignment', 'roles', 'progression') and state <> 'synced';`);
    this.addSql(`update "scout_members" set status = case
      when remote->>'status' = 'INACTIVE' then 'inactive'
      when remote->>'status' = 'SUSPENDED' then 'suspended'
      else status end
      where status = 'review';`);
    this.addSql(`update "member_sync_operations" set state = 'pending'
      where state in ('conflict', 'review') and kind in ('profile', 'orgo-profile', 'photo', 'status');`);
    this.addSql(
      'create index "member_sync_retry_index" on "member_sync_operations" ("state", "next_attempt_at", "created_at");',
    );
  }
  override down(): void {
    this.addSql(
      `update "scout_members" set status = 'review' where status in ('inactive', 'suspended');`,
    );
    this.addSql('alter table "scout_members" drop constraint "member_status";');
    this.addSql(
      `alter table "scout_members" add constraint "member_status" check (status in ('active', 'withdrawn', 'review'));`,
    );
    this.addSql('drop index "member_sync_retry_index";');
    this.addSql(
      'alter table "member_sync_operations" drop column "attempts", drop column "next_attempt_at";',
    );
    this.addSql(
      'alter table "member_settings" drop column "refresh_token", drop column "refresh_claimed_at", drop column "refresh_state", drop column "refresh_message";',
    );
  }
}
