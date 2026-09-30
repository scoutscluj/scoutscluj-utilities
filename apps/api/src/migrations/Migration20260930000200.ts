import { Migration } from '@mikro-orm/migrations';

export class Migration20260930000200 extends Migration {
  override up(): void {
    this.addSql(
      `alter table membership_obligations add column orgo_last_synced_at timestamptz null, add column review_state varchar(255) null, add column review_reason text null;`,
    );
    this.addSql(
      `create table membership_roster_syncs (id uuid primary key, period_id uuid not null references membership_periods(id), actor_id integer not null, mode varchar(255) not null, status varchar(255) not null, summary jsonb not null default '{}', error text null, created_at timestamptz not null, completed_at timestamptz null);`,
    );
    this.addSql(
      `create index membership_roster_sync_period_created on membership_roster_syncs (period_id, created_at desc);`,
    );
  }

  override down(): void {
    this.addSql(`drop table if exists membership_roster_syncs;`);
    this.addSql(
      `alter table membership_obligations drop column if exists orgo_last_synced_at, drop column if exists review_state, drop column if exists review_reason;`,
    );
  }
}
