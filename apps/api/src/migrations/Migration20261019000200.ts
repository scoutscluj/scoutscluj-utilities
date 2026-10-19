import { Migration } from '@mikro-orm/migrations';

export class Migration20261019000200 extends Migration {
  override up(): void {
    this.addSql(
      `alter table users add column council_admin boolean not null default false, add column member_access_disabled boolean not null default false;`,
    );
    this.addSql(`create table scout_units (
      id uuid primary key, name varchar(255) not null, branch varchar(255) not null,
      parent_id uuid null references scout_units(id), orgo_id integer null unique, graduation_year integer null,
      archived boolean not null default false, created_at timestamptz not null,
      constraint valid_branch check (branch in ('lupisori','temerari','exploratori','seniori'))
    );`);
    this.addSql(`create table scout_members (
      id uuid primary key, orgo_id integer null unique, account_id integer null unique references users(id),
      name varchar(255) not null, birth_date varchar(255) null, grade integer null,
      unit_id uuid null references scout_units(id), group_id uuid null references scout_units(id),
      status varchar(255) not null default 'active', adult_kind varchar(255) null, promise_date varchar(255) null,
      profile jsonb not null, revision integer not null default 1, remote jsonb not null default '{}',
      last_progression_year integer null, skip_progression_year integer null, fee_resume_period varchar(255) null,
      created_at timestamptz not null, updated_at timestamptz not null,
      constraint member_status check (status in ('active','withdrawn','review')),
      constraint member_grade check (grade is null or grade between 1 and 12)
    );`);
    this.addSql(`create table scout_assignments (
      id uuid primary key, member_id uuid not null references scout_members(id),
      unit_id uuid null references scout_units(id), group_id uuid null references scout_units(id),
      role varchar(255) not null, can_edit boolean not null default false,
      can_see_fees boolean not null default false, can_see_sensitive boolean not null default false,
      started_at timestamptz not null, ended_at timestamptz null, actor_id integer not null
    );`);
    this.addSql(
      `create unique index scout_one_chief on scout_assignments(unit_id) where role = 'chief' and ended_at is null;`,
    );
    this.addSql(
      `create unique index scout_one_beneficiary on scout_assignments(member_id) where role = 'beneficiary' and ended_at is null;`,
    );
    this.addSql(
      `create index scout_assignment_member on scout_assignments(member_id, ended_at);`,
    );
    this.addSql(
      `create index scout_member_unit on scout_members(unit_id, group_id);`,
    );
    this.addSql(
      `create table scout_notes (id uuid primary key, member_id uuid not null references scout_members(id), author_id integer not null references users(id), body text not null, created_at timestamptz not null);`,
    );
    this.addSql(`create table member_sync_operations (
      id uuid primary key, member_id uuid not null references scout_members(id), revision integer not null,
      actor_id integer null, kind varchar(255) not null, state varchar(255) not null default 'pending',
      message text not null, payload jsonb not null, baseline jsonb not null,
      created_at timestamptz not null, completed_at timestamptz null, claimed_at timestamptz null
    );`);
    this.addSql(
      `create index member_sync_pending on member_sync_operations(state, created_at);`,
    );
    this.addSql(
      `create table member_transitions (id uuid primary key, member_id uuid not null references scout_members(id), year integer not null, state varchar(255) not null, message text not null, created_at timestamptz not null, unique(member_id, year));`,
    );
    this.addSql(
      `create table member_settings (id varchar(255) primary key, progression_enabled boolean not null default false);`,
    );
    this.addSql(
      `create table member_notices (id uuid primary key, unit_id uuid not null references scout_units(id), member_id uuid not null references scout_members(id), created_at timestamptz not null);`,
    );
  }
  override down(): void {
    this.addSql(
      'drop table member_notices, member_settings, member_transitions, member_sync_operations, scout_notes, scout_assignments, scout_members, scout_units;',
    );
    this.addSql(
      'alter table users drop column council_admin, drop column member_access_disabled;',
    );
  }
}
