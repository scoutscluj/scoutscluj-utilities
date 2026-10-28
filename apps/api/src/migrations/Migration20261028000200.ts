import { Migration } from '@mikro-orm/migrations';
export class Migration20261028000200 extends Migration {
  override up(): void {
    this.addSql(
      'alter table activity_registrations add column unit_id uuid null;',
    );
    this.addSql(
      'update activity_registrations r set unit_id=m.unit_id from scout_members m where m.id=r.member_id;',
    );
    this.addSql(
      'alter table activity_registration_entries add column installment_key varchar(100) null;',
    );
  }
  override down(): void {
    this.addSql(
      'alter table activity_registration_entries drop column installment_key;',
    );
    this.addSql('alter table activity_registrations drop column unit_id;');
  }
}
