import { Migration } from '@mikro-orm/migrations';
export class Migration20261001000200 extends Migration {
  override up(): void {
    this.addSql(
      'alter table "membership_national_items" add column "orgo_actor_id" integer null;',
    );
    this.addSql(
      'alter table membership_national_items add column orgo_error text null, add column orgo_last_attempt_at timestamptz null;',
    );
  }
  override down(): void {
    this.addSql(
      'alter table "membership_national_items" drop column "orgo_actor_id";',
    );
    this.addSql(
      'alter table membership_national_items drop column orgo_error, drop column orgo_last_attempt_at;',
    );
  }
}
