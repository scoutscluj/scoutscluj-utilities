// Run with PGLITE_RUNTIME_PATH pointing to a temporary @electric-sql/pglite installation.
// Uses the actual migration SQL against embedded PostgreSQL; never connects to a server.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { PGlite } = require(
  process.env.PGLITE_RUNTIME_PATH || '@electric-sql/pglite',
);
const ts = require('typescript');
const db = new PGlite();
const statements = [];
const exports = {};
runInNewContext(
  ts.transpileModule(
    readFileSync(
      new URL('../src/migrations/Migration20261022000100.ts', import.meta.url),
      'utf8',
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText,
  {
    exports,
    require: () => ({
      Migration: class {
        addSql(sql) {
          statements.push(sql);
        }
      },
    }),
  },
);
new exports.Migration20261022000100().up();
await db.exec(`
  create table local_structures(id varchar primary key,name varchar,forming boolean default false);
  insert into local_structures values ('cluj','Cluj',false),('floresti','Florești',true);
  create table users(id integer primary key,roles text[],member_access_disabled boolean default false);
  insert into users(id,roles) values(1,array['admin']),(2,array['admin']);
  create table orgo_connections(user_id integer,orgo_user_id integer);
  insert into orgo_connections values(1,101),(2,102);
  create table scout_units(id uuid primary key,name varchar not null,branch varchar not null,
    parent_id uuid references scout_units(id),orgo_id integer unique,graduation_year integer,
    archived boolean default false,created_at timestamptz default now(),structure_id varchar default 'cluj',
    structure_confirmed boolean default false, constraint valid_branch check(branch in ('lupisori','temerari','exploratori','seniori')));
  insert into scout_units(id,name,branch,orgo_id) values('00000000-0000-0000-0000-000000000001','Temerari','temerari',10);
  insert into scout_units(id,name,branch,parent_id) values('00000000-0000-0000-0000-000000000002','Grupa 5','temerari','00000000-0000-0000-0000-000000000001');
  create table scout_members(id uuid primary key,name varchar,orgo_id integer,account_id integer,
    unit_id uuid references scout_units(id),group_id uuid references scout_units(id),branch varchar,
    structure_id varchar default 'cluj',structure_confirmed boolean default false,status varchar default 'active',orgo_profile jsonb default '{}');
  insert into scout_members(id,name,orgo_id,orgo_profile) values
    ('10000000-0000-0000-0000-000000000001','Lider Cluj',101,'{"type":{"id":42,"name":"Lider"}}'),
    ('10000000-0000-0000-0000-000000000002','Lider FLOREȘTI',102,'{"type":{"id":42,"name":"Lider"}}'),
    ('10000000-0000-0000-0000-000000000003','Copil Floreşti',103,'{"type":{"id":39,"name":"Temerar"}}'),
    ('10000000-0000-0000-0000-000000000004','Categorie lipsă',104,'{}'),
    ('10000000-0000-0000-0000-000000000005','Categorie contradictorie',105,'{"type":{"id":38,"name":"Senior"}}');
  update scout_members set unit_id='00000000-0000-0000-0000-000000000001',group_id='00000000-0000-0000-0000-000000000002',branch='temerari' where orgo_id=103;
  create table scout_assignments(id uuid primary key,member_id uuid references scout_members(id),unit_id uuid references scout_units(id),
    group_id uuid references scout_units(id),role varchar,ended_at timestamptz);
  create unique index scout_one_chief on scout_assignments(unit_id) where role='chief' and ended_at is null;
  create table financial_evidence(member_id uuid,amount integer);
  insert into financial_evidence values('10000000-0000-0000-0000-000000000003',12345);
`);
try {
  await db.exec('begin');
  for (const sql of statements) await db.exec(sql);
  await db.exec('rollback');
  assert.equal(
    (await db.query('select count(*)::int n from scout_members')).rows[0].n,
    5,
  );
  await db.exec('begin');
  for (const sql of statements) await db.exec(sql);
  await db.exec('commit');
  assert.equal(
    (await db.query('select count(*)::int n from scout_units where fixed'))
      .rows[0].n,
    14,
  );
  assert.equal(
    (await db.query('select count(*)::int n from scout_subunits')).rows[0].n,
    1,
  );
  assert.equal(
    (
      await db.query(
        'select category_review from scout_members where orgo_id=105',
      )
    ).rows[0].category_review,
    true,
  );
  const child = (
    await db.query('select * from scout_members where orgo_id=103')
  ).rows[0];
  assert.equal(child.structure_id, 'floresti');
  assert.equal(child.category, 'temerari');
  assert.equal(child.group_id, null);
  assert.equal(
    (
      await db.query(
        'select category_review from scout_members where orgo_id=104',
      )
    ).rows[0].category_review,
    true,
  );
  assert.equal(
    (await db.query('select central_member_admin from users where id=1'))
      .rows[0].central_member_admin,
    true,
  );
  assert.equal(
    (await db.query('select central_member_admin from users where id=2'))
      .rows[0].central_member_admin,
    false,
  );
  assert.equal(
    (await db.query('select amount from financial_evidence')).rows[0].amount,
    12345,
  );
  await assert.rejects(
    db.exec("update scout_units set name='Changed' where fixed"),
    /cannot be changed/,
  );
  await assert.rejects(
    db.exec('delete from scout_units where fixed'),
    /cannot be deleted/,
  );
  await assert.rejects(
    db.exec("update scout_members set structure_id='cluj' where orgo_id=103"),
    /must match/,
  );
  await db.exec("update scout_members set name='Renamed' where orgo_id=103");
  assert.equal(
    (await db.query('select structure_id from scout_members where orgo_id=103'))
      .rows[0].structure_id,
    'floresti',
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from member_organization_migration where source_table='scout_members'",
      )
    ).rows[0].n,
    5,
  );
  console.log(
    'Migration passed: fixed catalog, affiliation, category, scope, source preservation, privacy, immutable units and financial references.',
  );
} finally {
  await db.close();
}
