import { Migration } from '@mikro-orm/migrations';
export class Migration20261027000200 extends Migration {
  override up(): void {
    this.addSql(
      'alter table activity_registrations add column refund_due_bani integer check(refund_due_bani >= 0);',
    );
  }
  override down(): void {
    this.addSql(
      `do $$ begin if exists(select 1 from activity_registrations where refund_due_bani is not null) then raise exception 'Preserve planned refund amounts before rollback'; end if; end $$;`,
    );
    this.addSql(
      'alter table activity_registrations drop column refund_due_bani;',
    );
  }
}
