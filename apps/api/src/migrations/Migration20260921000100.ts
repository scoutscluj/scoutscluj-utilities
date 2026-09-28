import { Migration } from '@mikro-orm/migrations';

export class Migration20260921000100 extends Migration {
  override up(): void {
    this.addSql(
      'alter table orgo_connections add column api_token_encrypted text null;',
    );
    this.addSql(
      "update orgo_connections set profile = profile - 'access_token' - 'accessToken' - 'refresh_token' - 'refreshToken';",
    );
    this.addSql(
      `create table membership_periods (id uuid primary key, name varchar(255) not null, starts_on varchar(255) not null, ends_on varchar(255) not null, prices jsonb not null, active boolean not null default false, created_at timestamptz not null);`,
    );
    this.addSql(
      `create unique index membership_one_active_period on membership_periods (active) where active = true;`,
    );
    this.addSql(
      `create table membership_payment_settings (id varchar(255) primary key, active_provider varchar(255) not null default 'netopia', updated_by integer, updated_at timestamptz not null);`,
    );
    this.addSql(
      `insert into membership_payment_settings (id, active_provider, updated_at) values ('membership', 'netopia', now());`,
    );
    this.addSql(
      `create table membership_obligations (id uuid primary key, period_id uuid not null references membership_periods(id), orgo_user_id integer not null, card_id varchar(255), member_name varchar(255) not null, plan varchar(255) not null, total_bani integer not null check(total_bani > 0), national_bani integer not null check(national_bani > 0 and national_bani <= total_bani), verification_note text not null, created_at timestamptz not null, unique(period_id, orgo_user_id), unique(period_id, card_id));`,
    );
    this.addSql(
      `create table membership_checkouts (id uuid primary key, token_hash varchar(255) not null unique, period_id uuid not null references membership_periods(id), obligation_id uuid references membership_obligations(id), identifier varchar(255) not null, identifier_kind varchar(255) not null, plan varchar(255) not null, amount_bani integer not null check(amount_bani > 0), provider varchar(255) not null, environment varchar(255) not null, state varchar(255) not null, payment_url text, provider_id varchar(255) unique, review_required boolean not null default false, terms_version varchar(255) not null, terms_accepted_at timestamptz not null, created_at timestamptz not null);`,
    );
    this.addSql(
      `create table membership_payouts (id uuid primary key, reference varchar(255) not null unique, received_on varchar(255) not null, gross_bani integer not null check(gross_bani > 0), refunded_bani integer not null check(refunded_bani >= 0), charges_bani integer not null check(charges_bani >= 0), net_bani integer not null check(net_bani > 0), note text not null, actor_id integer not null, created_at timestamptz not null);`,
    );
    this.addSql(
      `create table membership_receipts (id uuid primary key, period_id uuid not null references membership_periods(id), checkout_id uuid unique references membership_checkouts(id), amount_bani integer not null check(amount_bani > 0), refunded_bani integer not null default 0 check(refunded_bani >= 0 and refunded_bani <= amount_bani), payout_id uuid references membership_payouts(id), method varchar(255) not null, received_on varchar(255) not null, note text not null, reference varchar(255) not null, actor_id integer, review_required boolean not null default false, created_at timestamptz not null);`,
    );
    this.addSql(
      `create unique index membership_bank_reference on membership_receipts(reference) where method = 'bank';`,
    );
    this.addSql(
      `create table membership_allocations (id uuid primary key, receipt_id uuid not null references membership_receipts(id), obligation_id uuid not null references membership_obligations(id), amount_bani integer not null check(amount_bani > 0), actor_id integer, reversed boolean not null default false, note text not null, created_at timestamptz not null);`,
    );
    this.addSql(
      `create index membership_allocations_obligation on membership_allocations(obligation_id); create index membership_allocations_receipt on membership_allocations(receipt_id);`,
    );
    this.addSql(
      `create table membership_national_batches (id uuid primary key, transferred_on varchar(255) not null, reference varchar(255) not null, note text not null, total_bani integer not null check(total_bani > 0), actor_id integer not null, created_at timestamptz not null);`,
    );
    this.addSql(
      `create table membership_national_items (id uuid primary key, batch_id uuid not null references membership_national_batches(id), obligation_id uuid not null unique references membership_obligations(id), amount_bani integer not null check(amount_bani > 0), orgo_state varchar(255) not null default 'awaiting_access', evidence text);`,
    );
    this.addSql(
      `create table membership_provider_events (id uuid primary key, hash varchar(255) not null unique, checkout_id uuid not null references membership_checkouts(id), provider varchar(255) not null, provider_status varchar(255) not null, amount_bani integer not null, created_at timestamptz not null);`,
    );
  }

  override down(): void {
    // Financial history must be explicitly exported/reconciled before rollback.
    throw new Error(
      'Cotizație ledger rollback requires a reviewed data-retention plan.',
    );
  }
}
