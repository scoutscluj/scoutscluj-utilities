import { Migration } from '@mikro-orm/migrations';

export class Migration20261020000100 extends Migration {
  override up(): void {
    this.addSql(
      'alter table membership_checkouts add column admission_expected_bani integer null;',
    );
    this.addSql(
      `create table local_structures (id varchar(255) primary key, name varchar(255) not null, forming boolean not null default false);`,
    );
    this.addSql(
      `insert into local_structures (id,name,forming) values ('cluj','Cluj',false),('floresti','Florești',true);`,
    );
    for (const table of ['scout_members', 'scout_units']) {
      this.addSql(
        `alter table ${table} add column structure_id varchar(255) not null default 'cluj' references local_structures(id), add column structure_confirmed boolean not null default false;`,
      );
      this.addSql(`create index ${table}_structure on ${table}(structure_id);`);
    }
    this.addSql(
      `alter table scout_assignments add column structure_id varchar(255) null references local_structures(id);`,
    );
    this.addSql(
      `create unique index scout_structure_admin_unique on scout_assignments(member_id,structure_id) where role='structure_admin' and ended_at is null;`,
    );
    this.addSql(
      `alter table scout_assignments add constraint scout_structure_admin_scope check (role <> 'structure_admin' or (structure_id is not null and unit_id is null and group_id is null));`,
    );
    this.addSql(`create table membership_admission_allocations (
      id uuid primary key, receipt_id uuid not null references membership_receipts(id),
      orgo_user_id integer not null, amount_bani integer not null check(amount_bani>0),
      expected_bani integer not null check(expected_bani>0), reversed boolean not null default false,
      actor_id integer not null references users(id), note text not null, created_at timestamptz not null
    );`);
    this.addSql(
      `create index admission_allocation_member on membership_admission_allocations(orgo_user_id,reversed);`,
    );
    this.addSql(
      `create index admission_allocation_receipt on membership_admission_allocations(receipt_id);`,
    );
  }
  override down(): void {
    this.addSql(
      'alter table membership_checkouts drop column admission_expected_bani;',
    );
    this.addSql(`drop table membership_admission_allocations;`);
    this.addSql(
      `drop index scout_structure_admin_unique; alter table scout_assignments drop constraint scout_structure_admin_scope, drop column structure_id;`,
    );
    for (const table of ['scout_members', 'scout_units'])
      this.addSql(
        `alter table ${table} drop column structure_id, drop column structure_confirmed;`,
      );
    this.addSql(`drop table local_structures;`);
  }
}
