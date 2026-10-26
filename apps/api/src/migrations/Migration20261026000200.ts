import { Migration } from '@mikro-orm/migrations';

export class Migration20261026000200 extends Migration {
  override up(): void {
    this.addSql(
      'alter table "adult_documents" drop constraint "adult_documents_kind_check";',
    );
    this.addSql(
      `alter table "adult_documents" add constraint "adult_documents_kind_check" check ("kind" in ('behavioural_integrity', 'criminal_record'));`,
    );
  }

  override down(): void {
    // Refuse rollback if criminal records exist rather than deleting private files.
    this.addSql(
      'alter table "adult_documents" drop constraint "adult_documents_kind_check";',
    );
    this.addSql(
      `alter table "adult_documents" add constraint "adult_documents_kind_check" check ("kind" = 'behavioural_integrity');`,
    );
  }
}
