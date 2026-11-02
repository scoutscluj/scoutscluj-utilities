// Embedded PostgreSQL only. PGLITE_RUNTIME_PATH may point to an external test runtime.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { PGlite } = require(
  process.env.PGLITE_RUNTIME_PATH || '@electric-sql/pglite',
);
const ts = require('typescript'),
  statements = [],
  exports = {};
runInNewContext(
  ts.transpileModule(
    readFileSync(
      new URL('../src/migrations/Migration20261102000100.ts', import.meta.url),
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
new exports.Migration20261102000100().up();
const db = new PGlite();
try {
  await db.exec(`
    create table users(id integer primary key);
    create table member_sync_operations(id uuid primary key,state text,message text,next_attempt_at timestamptz);
    insert into member_sync_operations values('33333333-3333-4333-8333-333333333333','permission-required','Old command',null);
    create table member_settings(id varchar primary key);
    create table scout_units(id uuid primary key,name text,branch text,parent_id uuid,orgo_id integer,archived boolean default false);
    create table scout_subunits(id uuid primary key,name text,parent_id uuid,orgo_id integer,archived boolean default false);
    create table scout_members(id uuid primary key,profile jsonb,grade integer,constraint member_grade check(grade is null or grade between 1 and 12));
    create table activities(id integer primary key,title text,orgo_event_id text,orgo_event_iri text,updated_at timestamptz);
    create table activity_registration_settings(activity_id integer primary key,data jsonb);
    create table activity_registrations(id uuid primary key,state text,answers jsonb,updated_at timestamptz);
    insert into scout_members values('11111111-1111-4111-8111-111111111111','{"parentName":"Părinte de test","parentEmail":"parent@example.test"}',1);
  `);
  for (const sql of statements) await db.exec(sql);
  assert.equal(
    (await db.query('select state from member_sync_operations')).rows[0].state,
    'review-required',
  );
  const migrated = (await db.query('select * from member_guardians')).rows;
  assert.equal(migrated.length, 1);
  assert.equal(migrated[0].verified_account_id, null);
  await db.exec('update scout_members set grade=0;');
  await assert.rejects(db.exec('update scout_members set grade=13;'));
  await db.exec(
    "insert into activities(id,title) values(1,'Activitate de test');",
  );
  assert.equal(
    (await db.query('select * from orgo_object_jobs')).rows.length,
    1,
  );
  await db.exec(
    "update activities set orgo_event_id='remote-id',orgo_event_iri='/api/v1/events/remote-id' where id=1;",
  );
  assert.equal(
    (await db.query('select * from orgo_object_jobs')).rows.length,
    1,
    'readback must not enqueue another write',
  );
  await db.exec(
    "begin; update activities set title='Rolled back' where id=1; rollback;",
  );
  assert.equal(
    (await db.query('select * from orgo_object_jobs')).rows.length,
    1,
    'outbox must roll back with mutation',
  );
  await db.exec("update activities set title='Titlu nou' where id=1;");
  const jobs = (
    await db.query(
      'select changed_fields from orgo_object_jobs order by created_at',
    )
  ).rows;
  assert.deepEqual(jobs[1].changed_fields, ['title']);
  await db.exec(`insert into activity_registration_settings values(1,'{"published":false}');
    update activity_registration_settings set data='{"published":false,"capacity":20}' where activity_id=1;`);
  assert.equal(
    (await db.query('select * from orgo_object_jobs')).rows.length,
    3,
  );
  await db.exec(
    "update activity_registration_settings set data='{" +
      '"published":true' +
      "}' where activity_id=1;",
  );
  assert.equal(
    (await db.query('select * from orgo_object_jobs')).rows.length,
    4,
  );
  await db.exec(`insert into activity_registrations values('22222222-2222-4222-8222-222222222222','pending','{}',now());
    update activity_registrations set answers='{"guardian_name":"Test"}' where id='22222222-2222-4222-8222-222222222222';`);
  assert.equal(
    (
      await db.query(
        "select * from orgo_object_jobs where subject='registration'",
      )
    ).rows.length,
    1,
    'private answers are not exported',
  );
  await db.exec("update activity_registrations set state='accepted';");
  assert.equal(
    (
      await db.query(
        "select * from orgo_object_jobs where subject='registration'",
      )
    ).rows.length,
    2,
  );
  await db.exec('delete from activity_registrations;');
  const deletion = (
    await db.query(
      "select payload from orgo_object_jobs where payload->>'deleted'='true'",
    )
  ).rows;
  assert.equal(deletion.length, 1);
  assert.equal(deletion[0].payload.deleted, true);
  assert.equal('answers' in deletion[0].payload, false);
  console.log(
    'PASS PostgreSQL migration, grade 0, unverified guardian migration, atomic outbox, field intent and readback loop prevention',
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.close();
}
