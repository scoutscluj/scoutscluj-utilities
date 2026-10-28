import { Migration } from '@mikro-orm/migrations';
export class Migration20261028000100 extends Migration {
  override up(): void {
    this.addSql(
      "alter table activities add column created_by_id integer references users(id) on delete restrict, add column administrator_ids jsonb not null default '[]'::jsonb;",
    );
    this.addSql('update activities set created_by_id = coordinator_id;');
  }
  override down(): void {
    this.addSql(
      'alter table activities drop column administrator_ids, drop column created_by_id;',
    );
  }
}
