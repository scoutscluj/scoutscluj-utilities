import { Migration } from '@mikro-orm/migrations';

export class Migration20260701000100 extends Migration {
  override up(): void {
    this.addSql(
      "create type \"activity_department\" as enum ('finance', 'kitchen', 'program', 'logistics');",
    );
    this.addSql(
      'alter table "activities" add column "departments" "activity_department"[] not null default \'{finance,kitchen}\';',
    );
  }

  override down(): void {
    this.addSql(
      'alter table "activities" drop column if exists "departments";',
    );
    this.addSql('drop type if exists "activity_department";');
  }
}
