import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MikroORM } from '@mikro-orm/postgresql';
import { User } from '../src/modules/users/entities/user.entity';
import { UserRole } from '../src/modules/users/entities/user-role.enum';
import { OrgoConnection } from '../src/modules/users/entities/orgo-connection.entity';
import { ScoutMember } from '../src/modules/members/entities/member.entity';
import { emptyProfile } from '../src/modules/members/member.types';
import { AuditEntry } from '../src/modules/audit/entities/audit-entry.entity';
import {
  AdultDocument,
  AdultDocumentFile,
} from '../src/modules/adult-documents/entities/adult-document.entity';
import { AdultDocumentsService } from '../src/modules/adult-documents/adult-documents.service';
import { scoutingYear } from '../src/modules/adult-documents/adult-documents.rules';
import { Migration20261026000200 } from '../src/migrations/Migration20261026000200';
import { Migration20261025000100 } from '../src/migrations/Migration20261025000100';

async function main() {
  const adminUrl = new URL(
    process.env.ADULT_DOCUMENTS_TEST_ADMIN_URL ??
      'postgresql://postgres@127.0.0.1:55432/postgres',
  );
  assert.ok(
    ['127.0.0.1', 'localhost'].includes(adminUrl.hostname),
    'Only local test databases are allowed.',
  );
  const databaseName = `adult_documents_test_${randomUUID().replaceAll('-', '')}`;
  const entities = [
    User,
    OrgoConnection,
    ScoutMember,
    AuditEntry,
    AdultDocument,
    AdultDocumentFile,
  ];
  const admin = await MikroORM.init({
    clientUrl: adminUrl.toString(),
    entities,
  });
  let orm: MikroORM | undefined;
  let created = false;
  try {
    await admin.em.getConnection().execute(`create database "${databaseName}"`);
    created = true;
    const testUrl = new URL(adminUrl);
    testUrl.pathname = `/${databaseName}`;
    orm = await MikroORM.init({ clientUrl: testUrl.toString(), entities });
    await orm.schema.create();
    const connection = orm.em.getConnection();
    await connection.execute('drop table adult_document_files');
    await connection.execute('drop table adult_documents');
    const migration = new Migration20261025000100(
      orm.em.getDriver(),
      orm.config,
    );
    migration.up();
    for (const sql of migration.getQueries()) await connection.execute(sql);
    const em = orm.em.fork();
    const owner = em.create(User, {
      displayName: 'Adult beneficiar',
      roles: [],
    });
    const reviewer = em.create(User, {
      displayName: 'Administrator central',
      centralMemberAdmin: true,
      roles: [UserRole.Admin],
    });
    em.persist([owner, reviewer]);
    await em.flush();
    const member = em.create(ScoutMember, {
      name: 'Adult beneficiar',
      accountId: owner.id,
      birthDate: '1990-01-01',
      category: 'seniori',
      profile: emptyProfile(),
    });
    const adminMember = em.create(ScoutMember, {
      name: 'Administrator central',
      accountId: reviewer.id,
      birthDate: '1990-01-01',
      category: 'lideri',
      profile: emptyProfile(),
    });
    em.persist([member, adminMember]);
    await em.flush();
    const actor = { id: owner.id, displayName: owner.displayName, roles: [] };
    const central = {
      id: reviewer.id,
      displayName: reviewer.displayName,
      roles: [UserRole.Admin],
    };
    const service = () => new AdultDocumentsService(orm!.em.fork());
    const original = Buffer.from('%PDF-1.7\noriginal signed certificate bytes');
    const input = {
      kind: 'behavioural_integrity',
      year: scoutingYear(),
      filename: 'CIC.pdf',
      contentType: 'application/pdf',
      contentBase64: original.toString('base64'),
    };
    const uploads = await Promise.all(
      Array.from({ length: 3 }, () =>
        service().upload(actor, member.id, input),
      ),
    );
    const extension = new Migration20261026000200(
      orm.em.getDriver(),
      orm.config,
    );
    extension.up();
    for (const sql of extension.getQueries()) await connection.execute(sql);

    const diff = await orm.schema.getUpdateSchemaSQL({ wrap: false });
    if (diff.trim())
      console.log(
        await connection.execute(
          "select conname, pg_get_constraintdef(oid) as definition from pg_constraint where conrelid = 'adult_documents'::regclass and contype = 'c' order by conname",
        ),
      );
    assert.equal(diff.trim(), '', `Migration must match ORM metadata: ${diff}`);

    assert.equal(
      await orm.em.fork().count(AdultDocument, {}),
      3,
      'Existing CIC versions survive the extension.',
    );
    const dossier = await service().getDossier(actor, member.id);
    assert.deepEqual(
      dossier.documents.map((d) => d.version),
      [3, 2, 1],
    );
    assert.equal(dossier.complete, false);
    assert.equal(dossier.canReview, false);
    const latest = dossier.documents[0];
    await assert.rejects(
      service().review(central, dossier.documents[1].id, {
        status: 'validated',
      }),
      /înlocuit/,
    );
    const reviews = await Promise.allSettled([
      service().review(central, latest.id, { status: 'validated' }),
      service().review(central, latest.id, {
        status: 'rejected',
        reason: 'Copie ilizibilă.',
      }),
    ]);
    assert.equal(reviews.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(reviews.filter((r) => r.status === 'rejected').length, 1);
    const fresh = await service().upload(central, member.id, input);
    await service().review(central, fresh.id, { status: 'validated' });
    assert.equal((await service().getDossier(actor, member.id)).complete, true);
    assert.deepEqual(
      (await service().download(central, uploads[0].id)).data,
      original,
    );
    await service().upload(actor, member.id, {
      ...input,
      year: input.year - 1,
    });
    assert.equal(
      (await service().getDossier(actor, member.id, String(input.year - 1)))
        .documents.length,
      1,
    );
    assert.equal(
      (await service().getDossier(actor, member.id)).documents.length,
      4,
    );

    const optional = await service().upload(actor, member.id, {
      ...input,
      kind: 'criminal_record',
      filename: 'cazier.pdf',
    });
    assert.equal(
      (await service().getDossier(actor, member.id)).documents.find(
        (d) => d.id === optional.id,
      )?.version,
      1,
    );
    assert.equal((await service().getDossier(actor, member.id)).complete, true);
    await service().review(central, optional.id, {
      status: 'rejected',
      reason: 'Copie ilizibilă.',
    });
    assert.equal((await service().getDossier(actor, member.id)).complete, true);
    assert.deepEqual(
      (await service().download(actor, optional.id)).data,
      original,
    );
    const freshEm = orm.em.fork();
    const count = await freshEm.count(AdultDocument, {});
    const fileCount = await freshEm.count(AdultDocumentFile, {});
    await connection.execute(
      "alter table app_audit_entries add constraint test_audit_failure check (action not like 'adult_document.%') not valid",
    );
    await assert.rejects(service().upload(actor, member.id, input));
    assert.equal(
      await freshEm.count(AdultDocument, {}),
      count,
      'Upload metadata must roll back on audit failure.',
    );
    assert.equal(
      await freshEm.count(AdultDocumentFile, {}),
      fileCount,
      'File bytes must roll back on audit failure.',
    );
    await connection.execute(
      'alter table app_audit_entries drop constraint test_audit_failure',
    );
    const audit = await freshEm.find(AuditEntry, {});
    assert.ok(audit.some((a) => a.action === 'adult_document.downloaded'));
    assert.ok(!JSON.stringify(audit).includes(input.contentBase64));
    assert.ok(!JSON.stringify(audit).includes('Copie ilizibilă.'));

    if (process.argv.includes('--update-snapshot')) {
      const snapshotPath = resolve(
        'src/migrations/.snapshot-scoutscluj_utilities.json',
      );
      const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8')) as {
        tables: { name: string }[];
      };
      const target = JSON.parse(
        JSON.stringify(orm.schema.getTargetSchema()),
      ) as { tables: { name: string }[] };
      const names = new Set(['adult_documents', 'adult_document_files']);
      snapshot.tables = [
        ...snapshot.tables.filter((t) => !names.has(t.name)),
        ...target.tables.filter((t) => names.has(t.name)),
      ].sort((a, b) => a.name.localeCompare(b.name));
      await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
    }

    const down = new Migration20261025000100(orm.em.getDriver(), orm.config);
    down.down();
    for (const sql of down.getQueries()) await connection.execute(sql);
    const tables = await connection.execute<{ name: string | null }[]>(
      "select to_regclass('adult_documents') as name",
    );
    assert.equal(tables[0].name, null);
    console.log(
      'Adult documents Postgres smoke passed: migration up/down, metadata match, concurrent uploads/reviews, annual history, original bytes, and atomic audit rollback.',
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
