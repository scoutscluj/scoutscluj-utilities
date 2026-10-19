import 'reflect-metadata';
import assert from 'node:assert/strict';
import { MikroORM } from '@mikro-orm/postgresql';
import { createMikroOrmOptions } from '../src/config/database.config';
import { User } from '../src/modules/users/entities/user.entity';
import { UserRole } from '../src/modules/users/entities/user-role.enum';
import { MembersService } from '../src/modules/members/members.service';
import {
  ScoutMember,
  ScoutAssignment,
  MemberSync,
} from '../src/modules/members/entities/member.entity';

async function main() {
  // This script only runs against a disposable database, never a production URL.
  const url = new URL(process.env.DATABASE_URL ?? '');
  assert.equal(url.pathname, '/scoutscluj_test');
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
  const orm = await MikroORM.init({
    ...createMikroOrmOptions(),
    preferTs: true,
  });
  try {
    await orm.migrator.up();
    assert.equal((await orm.migrator.up()).length, 0);
    const em = orm.em.fork();
    const account = em.create(User, {
      displayName: 'Test administrator',
      roles: [UserRole.Admin],
    });
    await em.flush();
    const actor = {
      id: account.id,
      displayName: account.displayName,
      roles: account.roles,
    };
    const service = () => new MembersService(orm.em.fork());
    const unit = await service().createUnit(actor, {
      name: 'Temerari test',
      branch: 'temerari',
    });
    const group = await service().createUnit(actor, {
      name: 'Grupa test',
      parentId: unit.id,
    });
    const otherGroup = await service().createUnit(actor, {
      name: 'Grupa destinație test',
      parentId: unit.id,
    });
    const member = await service().createMember(actor, {
      kind: 'beneficiary',
      name: 'Membru test PostgreSQL',
      birthDate: '2013-01-01',
      grade: 7,
      unitId: unit.id,
      groupId: group.id,
    });
    const reader = orm.em.fork();
    const saved = await reader.findOneOrFail(ScoutMember, member.id);
    assert.equal(saved.groupId, group.id);
    assert.equal(await reader.count(MemberSync, { memberId: member.id }), 1);
    await service().updateMember(actor, member.id, {
      revision: saved.revision,
      profile: { medical: 'Date medicale de test' },
    });
    await assert.rejects(
      service().updateMember(actor, member.id, {
        revision: saved.revision,
        profile: { medical: 'Versiune veche' },
      }),
      /Fișa s-a schimbat/,
    );
    await service().transfer(actor, member.id, {
      unitId: unit.id,
      groupId: otherGroup.id,
    });
    await service().lifecycle(actor, member.id, { action: 'withdraw' });
    assert.equal(
      await reader.count(ScoutAssignment, {
        memberId: member.id,
        endedAt: null,
      }),
      0,
    );
    await service().lifecycle(actor, member.id, {
      action: 'reactivate',
      unitId: unit.id,
      groupId: group.id,
    });
    reader.clear();
    const returned = await reader.findOneOrFail(ScoutMember, member.id);
    assert.equal(returned.status, 'active');
    assert.equal(returned.profile.medical, 'Date medicale de test');
    assert.equal(
      await reader.count(ScoutAssignment, {
        memberId: member.id,
        role: 'beneficiary',
        endedAt: null,
      }),
      1,
    );
    console.log('PostgreSQL migrations and member lifecycle checks passed.');
  } finally {
    await orm.close(true);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
