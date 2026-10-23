import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MikroORM } from '@mikro-orm/postgresql';
import { User } from '../src/modules/users/entities/user.entity';
import { OrgoConnection } from '../src/modules/users/entities/orgo-connection.entity';
import { PersonalObjective } from '../src/modules/personal-objectives/entities/personal-objective.entity';
import { PersonalObjectivesService } from '../src/modules/personal-objectives/personal-objectives.service';
import { Migration20261023000100 } from '../src/migrations/Migration20261023000100';

async function main() {
  // Only creates and drops its own uniquely named database on local Postgres.
  const adminUrl = new URL(
    process.env.OBJECTIVES_TEST_ADMIN_URL ??
      'postgresql://postgres:postgres@127.0.0.1:5432/postgres',
  );
  assert.ok(['localhost', '127.0.0.1'].includes(adminUrl.hostname));
  const databaseName = `objectives_test_${randomUUID().replaceAll('-', '')}`;
  const admin = await MikroORM.init({
    clientUrl: adminUrl.toString(),
    entities: [User, OrgoConnection, PersonalObjective],
  });
  let orm: MikroORM | undefined;
  let created = false;
  try {
    await admin.em.getConnection().execute(`create database "${databaseName}"`);
    created = true;
    const testUrl = new URL(adminUrl);
    testUrl.pathname = `/${databaseName}`;
    orm = await MikroORM.init({
      clientUrl: testUrl.toString(),
      entities: [User, OrgoConnection, PersonalObjective],
    });
    await orm.schema.create();
    const connection = orm.em.getConnection();
    // Apply the actual migration against the generated account tables.
    await connection.execute('drop table personal_objectives');
    const up = new Migration20261023000100(orm.em.getDriver(), orm.config);
    up.up();
    for (const sql of up.getQueries()) {
      assert.equal(typeof sql, 'string');
      await connection.execute(sql);
    }

    const em = orm.em.fork();
    const alice = em.create(User, { displayName: 'Alice', roles: [] });
    const bob = em.create(User, { displayName: 'Bob', roles: [] });
    await em.flush();
    const actor = { id: alice.id, displayName: alice.displayName, roles: [] };
    const other = { id: bob.id, displayName: bob.displayName, roles: [] };
    const service = () => new PersonalObjectivesService(orm!.em.fork());
    const input = {
      title: '  Obiectiv personal  ',
      description: '  Pregătesc o activitate.  ',
      deadline: '2026-11-15',
      userId: bob.id,
    };
    const first = await service().create(actor, input);
    const second = await service().create(actor, {
      ...input,
      title: 'Termen mai apropiat',
      deadline: '2024-02-29',
    });
    assert.equal(first.title, 'Obiectiv personal');
    assert.equal(first.description, 'Pregătesc o activitate.');
    assert.equal(first.deadline, '2026-11-15');
    assert.deepEqual(
      (await service().list(actor)).map((row) => row.id),
      [second.id, first.id],
    );
    assert.deepEqual(await service().list(other), []);
    const savedOther = await service().create(other, {
      ...input,
      title: 'Doar pentru Bob',
    });
    assert.equal((await service().list(other))[0].id, savedOther.id);

    // A fresh entity manager observes the same date-only values and saved records.
    const fresh = orm.em.fork();
    const record = await fresh.findOneOrFail(PersonalObjective, first.id);
    assert.equal(record.userId, alice.id);
    assert.equal(record.deadline, '2026-11-15');
    const columns = await connection.execute<{ data_type: string }[]>(
      "select data_type from information_schema.columns where table_name = 'personal_objectives' and column_name = 'deadline'",
    );
    assert.equal(columns[0].data_type, 'date');
    await assert.rejects(
      service().create(actor, { ...input, deadline: '2026-02-29' }),
    );
    await assert.rejects(service().create({ ...actor, id: 2147483647 }, input));
    await fresh.nativeDelete(User, alice.id);
    assert.equal(await fresh.count(PersonalObjective, { userId: alice.id }), 0);
    assert.equal(await fresh.count(PersonalObjective, { userId: bob.id }), 1);

    const down = new Migration20261023000100(orm.em.getDriver(), orm.config);
    down.down();
    for (const sql of down.getQueries()) await connection.execute(sql);
    const tables = await connection.execute<{ name: string | null }[]>(
      "select to_regclass('personal_objectives') as name",
    );
    assert.equal(tables[0].name, null);
    console.log(
      'Objectives Postgres smoke passed: migration up/down, persistence, date-only values, ownership, foreign key and cascade.',
    );
  } finally {
    await orm?.close(true);
    if (created)
      await admin.em.getConnection().execute(`drop database "${databaseName}"`);
    await admin.close(true);
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
