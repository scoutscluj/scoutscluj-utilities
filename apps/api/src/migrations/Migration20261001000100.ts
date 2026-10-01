import { Migration } from '@mikro-orm/migrations';

export class Migration20261001000100 extends Migration {
  override up(): void {
    this.addSql(
      'alter table "membership_payment_settings" add column "processing_fees" jsonb null;',
    );
    this.addSql(`update membership_periods p set prices = (
      select jsonb_object_agg(key, value || jsonb_build_object(
        'baseBani', (value->>'totalBani')::int,
        'totalBani', ceil(((value->>'totalBani')::numeric + case when s.active_provider='stripe' then 100 else 30 end) * 10000 /
          ((10000 - case when s.active_provider='stripe' then 150 else 119 end) * 500))::int * 500
      )) from jsonb_each(p.prices)
    ) from (select coalesce((select active_provider from membership_payment_settings where id='membership'),'netopia') as active_provider) s where p.active=true;`);
    this
      .addSql(`update membership_obligations o set total_bani=(p.prices->o.plan->>'totalBani')::int
      from membership_periods p where p.id=o.period_id and p.active=true and o.review_state is null
      and not exists (select 1 from membership_allocations a where a.obligation_id=o.id)
      and not exists (select 1 from membership_checkouts c where c.obligation_id=o.id and c.state in ('starting','pending','unknown'))
      and not exists (select 1 from membership_national_items i where i.obligation_id=o.id);`);
    this
      .addSql(`insert into app_audit_entries (action,entity_type,entity_id,metadata,created_at)
      select 'membership.prices.adjusted','membership',id::text,jsonb_build_object('reason','Uniform processor-inclusive pricing rollout','prices',prices),now()
      from membership_periods where active=true;`);
  }

  override down(): void {
    // Preserve published prices and the financial history.
    this.addSql(
      'alter table "membership_payment_settings" drop column "processing_fees";',
    );
  }
}
