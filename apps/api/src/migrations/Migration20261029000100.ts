import { Migration } from '@mikro-orm/migrations';
export class Migration20261029000100 extends Migration {
  override up(): void {
    this.addSql(`create table activity_registration_drafts (
      id uuid primary key,
      activity_id integer not null references activities(id) on delete cascade,
      owner_id integer not null references users(id) on delete cascade,
      data jsonb not null, revision integer not null default 1,
      created_at timestamptz not null, updated_at timestamptz not null);`);
    this.addSql(
      'create index activity_registration_drafts_owner_activity on activity_registration_drafts(owner_id, activity_id);',
    );
  }
  override down(): void {
    this.addSql('drop table activity_registration_drafts;');
  }
}
