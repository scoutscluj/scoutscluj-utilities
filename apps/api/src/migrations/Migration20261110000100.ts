import { Migration } from '@mikro-orm/migrations';

export class Migration20261110000100 extends Migration {
  override up(): void {
    this.addSql(`create table member_family_links (
      member_id uuid primary key references scout_members(id) on delete cascade,
      family_id uuid not null, ordinal integer not null check(ordinal > 0),
      source_application_id uuid null unique references member_applications(id) on delete set null,
      plan varchar(255) null check(plan in ('fam1','fam2','fam3')),
      price_reference varchar(255) null, price_confirmed_at timestamptz null,
      actor_id integer null references users(id), created_at timestamptz not null,
      unique(family_id, ordinal)
    );`);
    this.addSql(
      'create index member_guardians_email_active on member_guardians(lower(trim(email))) where ended_at is null;',
    );
  }
  override down(): void {
    this.addSql('drop index member_guardians_email_active;');
    this.addSql('drop table member_family_links;');
  }
}
