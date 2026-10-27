import { Migration } from '@mikro-orm/migrations';

export class Migration20261027000100 extends Migration {
  override up(): void {
    this.addSql(`create table activity_registration_settings (
      activity_id integer primary key references activities(id) on delete restrict,
      revision integer not null default 1, data jsonb not null, updated_at timestamptz not null);`);
    this.addSql(`create table activity_registrations (
      id uuid primary key, activity_id integer not null references activities(id) on delete restrict,
      member_id uuid not null references scout_members(id) on delete restrict, orgo_id integer not null,
      member_name varchar(255) not null, branch varchar(255) not null, role varchar(255) not null check (role in ('staff','beneficiary')),
      minor boolean not null, state varchar(255) not null check (state in ('pending','waitlisted','reserved','accepted','withdrawn','rejected')),
      owner_id integer references users(id) on delete restrict, token_hash varchar(255) not null unique,
      email varchar(255) not null, answers jsonb not null, answer_revision integer not null default 1, questions jsonb not null, total_bani integer not null check(total_bani >= 0),
      family_key uuid, family_plan varchar(255), installments jsonb not null, payment_due varchar(255) not null,
      consent_state varchar(255) not null, consent_publication_id integer references parental_consent_publications(id) on delete restrict,
      exception_note text, created_at timestamptz not null, updated_at timestamptz not null, revision integer not null default 1,
      unique(activity_id, member_id));`);
    this.addSql(
      'create index activity_registrations_activity_state on activity_registrations(activity_id,state);',
    );
    this.addSql(
      'create index activity_registrations_owner on activity_registrations(owner_id);',
    );
    this.addSql(`create table activity_registration_checkouts (
      id uuid primary key, registration_id uuid not null references activity_registrations(id) on delete restrict,
      amount_bani integer not null check(amount_bani > 0), provider varchar(255) not null,
      environment varchar(255) not null, provider_config_id uuid not null references membership_payment_provider_configs(id) on delete restrict,
      provider_id varchar(255), payment_url text, state varchar(255) not null, review_required boolean not null default false,
      created_at timestamptz not null, updated_at timestamptz not null);`);
    this.addSql(
      `create unique index activity_registration_pending_checkout on activity_registration_checkouts(registration_id) where state in ('created','pending','unknown');`,
    );
    this.addSql(`create table activity_registration_entries (
      id uuid primary key, registration_id uuid not null references activity_registrations(id) on delete restrict,
      method varchar(255) not null check(method in ('bank','cash','support','refund','card')), amount_bani integer not null check(amount_bani <> 0),
      note text not null, received_on varchar(255) not null, actor_id integer references users(id) on delete restrict,
      checkout_id uuid unique references activity_registration_checkouts(id) on delete restrict,
      reversed_entry_id uuid unique references activity_registration_entries(id) on delete restrict, created_at timestamptz not null);`);
    this.addSql(
      'create index activity_registration_entries_registration on activity_registration_entries(registration_id);',
    );
    this.addSql(`create table activity_registration_documents (
      id uuid primary key, registration_id uuid not null references activity_registrations(id) on delete restrict,
      publication_id integer not null references parental_consent_publications(id) on delete restrict,
      kind varchar(255) not null check(kind in ('generated','signed')), filename varchar(255) not null,
      checksum varchar(255) not null, answer_revision integer not null, source_document_id uuid references activity_registration_documents(id) on delete restrict,
      data bytea not null, created_at timestamptz not null);`);
    this.addSql(
      `create unique index activity_registration_generated on activity_registration_documents(registration_id,publication_id,answer_revision) where kind='generated';`,
    );
    this.addSql(`create table activity_registration_mail (
      id uuid primary key, registration_id uuid not null references activity_registrations(id) on delete restrict,
      recipient varchar(255) not null, subject varchar(255) not null, body text not null, state varchar(255) not null default 'pending',
      attempts integer not null default 0, next_attempt_at timestamptz not null, created_at timestamptz not null);`);
  }
  override down(): void {
    // This rollback refuses to discard registrations, signed agreements or money.
    this.addSql(
      `do $$ begin if exists(select 1 from activity_registrations) then raise exception 'Export and preserve activity registrations before rollback'; end if; end $$;`,
    );
    this.addSql(
      'drop table activity_registration_mail, activity_registration_documents, activity_registration_entries, activity_registration_checkouts, activity_registrations, activity_registration_settings;',
    );
  }
}
