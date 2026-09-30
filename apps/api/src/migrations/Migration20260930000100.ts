import { Migration } from '@mikro-orm/migrations';

export class Migration20260930000100 extends Migration {
  override up(): void {
    this.addSql(
      `alter table membership_payment_settings add column active_environment varchar(255);`,
    );
    this.addSql(`drop index if exists membership_one_active_provider_config;`);
    this.addSql(
      `update membership_payment_provider_configs set active = false;`,
    );
    this.addSql(
      `with ranked as (
        select id, row_number() over (
          partition by provider, environment
          order by updated_at desc, id desc
        ) as position
        from membership_payment_provider_configs
      )
      update membership_payment_provider_configs as configuration
      set active = true
      from ranked
      where configuration.id = ranked.id and ranked.position = 1;`,
    );
    this.addSql(
      `update membership_payment_settings as settings
      set active_environment = coalesce(
        (
          select configuration.environment
          from membership_payment_provider_configs as configuration
          where configuration.provider = settings.active_provider
          order by configuration.updated_at desc, configuration.id desc
          limit 1
        ),
        case when settings.active_provider = 'stripe' then 'test' else 'sandbox' end
      );`,
    );
    this.addSql(
      `alter table membership_payment_settings alter column active_environment set not null;`,
    );
    this.addSql(
      `alter table membership_payment_settings alter column active_environment set default 'sandbox';`,
    );
    this.addSql(
      `create unique index membership_one_active_provider_environment_config on membership_payment_provider_configs (provider, environment) where active = true;`,
    );
  }

  override down(): void {
    this.addSql(
      `drop index if exists membership_one_active_provider_environment_config;`,
    );
    this.addSql(
      `with ranked as (
        select id, row_number() over (
          partition by provider
          order by updated_at desc, id desc
        ) as position
        from membership_payment_provider_configs
        where active = true
      )
      update membership_payment_provider_configs as configuration
      set active = false
      from ranked
      where configuration.id = ranked.id and ranked.position > 1;`,
    );
    this.addSql(
      `create unique index membership_one_active_provider_config on membership_payment_provider_configs (provider) where active = true;`,
    );
    this.addSql(
      `alter table membership_payment_settings drop column active_environment;`,
    );
  }
}
