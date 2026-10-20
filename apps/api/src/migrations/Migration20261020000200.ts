import { Migration } from '@mikro-orm/migrations';
export class Migration20261020000200 extends Migration {
  override up(): void {
    this.addSql(
      'alter table scout_assignments add column orgo_role_id integer null;',
    );
    this
      .addSql(`alter table scout_members add column branch varchar(255) null, add column promise_source varchar(255) null,
      add column orgo_profile jsonb not null default '{}', add column orgo_base jsonb not null default '{}', add column orgo_conflicts jsonb not null default '{}';`);
    this.addSql(
      `alter table member_settings add column last_orgo_refresh timestamptz null;`,
    );
    this.addSql(
      `alter table membership_obligations add column national_direct_bani integer not null default 0 check (national_direct_bani>=0), add column national_direct_evidence text null;`,
    );
  }
  override down(): void {
    this.addSql('alter table scout_assignments drop column orgo_role_id;');
    this.addSql(
      `alter table scout_members drop column branch, drop column promise_source, drop column orgo_profile, drop column orgo_base, drop column orgo_conflicts;`,
    );
    this.addSql(`alter table member_settings drop column last_orgo_refresh;`);
    this.addSql(
      `alter table membership_obligations drop column national_direct_bani, drop column national_direct_evidence;`,
    );
  }
}
