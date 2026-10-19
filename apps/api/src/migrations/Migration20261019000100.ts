import { Migration } from '@mikro-orm/migrations';

export class Migration20261019000100 extends Migration {
  override up(): void {
    this.addSql(
      'alter table membership_obligations add column orgo_created_at timestamptz null;',
    );
    this.addSql(
      "alter table membership_checkouts add column purpose varchar(255) not null default 'membership';",
    );
  }

  override down(): void {
    this.addSql(
      'alter table membership_obligations drop column orgo_created_at;',
    );
    this.addSql('alter table membership_checkouts drop column purpose;');
  }
}
