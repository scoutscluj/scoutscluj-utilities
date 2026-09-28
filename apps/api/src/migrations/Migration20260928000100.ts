import { Migration } from '@mikro-orm/migrations';

export class Migration20260928000100 extends Migration {
  override up(): void {
    this.addSql(
      `create table membership_payment_provider_configs (id uuid primary key, provider varchar(255) not null, active boolean not null default true, environment varchar(255) not null, encrypted_configuration text not null, secret_hint varchar(255) not null, updated_by integer not null, updated_at timestamptz not null);`,
    );
    this.addSql(
      `create unique index membership_one_active_provider_config on membership_payment_provider_configs (provider) where active = true;`,
    );
    this.addSql(
      `alter table membership_checkouts add column provider_config_id uuid references membership_payment_provider_configs(id);`,
    );
  }

  override down(): void {
    this.addSql(
      `alter table membership_checkouts drop column if exists provider_config_id;`,
    );
    this.addSql(`drop table if exists membership_payment_provider_configs;`);
  }
}
