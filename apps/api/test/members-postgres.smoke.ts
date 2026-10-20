import { MembershipService } from '../src/modules/membership/membership.service';
import {
  MembershipPeriod,
  MembershipObligation,
  MembershipReceipt,
  MembershipAllocation,
} from '../src/modules/membership/entities/membership.entity';
import { AdmissionAllocation } from '../src/modules/membership/entities/admission-allocation.entity';
import {
  admissionEvidence,
  receiptAllocated,
} from '../src/modules/membership/admission-ledger';
import { BASELINE_PLANS } from '../src/modules/membership/membership.rules';
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
    const selection = {
      members: [{ id: member.id, revision: saved.revision }],
      changes: { kind: 'grade', grade: 7 },
    };
    const preview = await service().bulk(actor, selection);
    await reader.refresh(saved);
    assert.equal(saved.revision, selection.members[0].revision);
    assert.equal(await reader.count(MemberSync, { memberId: member.id }), 1);
    await service().bulk(actor, {
      ...selection,
      confirm: true,
      version: preview.version,
    });
    await reader.refresh(saved);
    assert.equal(saved.revision, selection.members[0].revision + 1);
    await assert.rejects(
      service().bulk(actor, {
        ...selection,
        confirm: true,
        version: preview.version,
      }),
      /Selecția s-a schimbat/,
    );
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
    const floresti = await service().createUnit(actor, {
      name: 'Temerari Florești',
      branch: 'temerari',
      structureId: 'floresti',
    });
    await service().transfer(actor, member.id, {
      unitId: floresti.id,
      structureId: 'floresti',
    });
    reader.clear();
    assert.equal(
      (await reader.findOneOrFail(ScoutMember, member.id)).structureId,
      'floresti',
    );
    const localAccount = reader.create(User, {
      displayName: 'Responsabil Florești',
      roles: [],
    });
    await reader.flush();
    const localMember = await service().createMember(actor, {
      name: 'Adult Florești test',
      kind: 'adult',
      birthDate: '1990-01-01',
      structureId: 'floresti',
    });
    const local = await reader.findOneOrFail(ScoutMember, localMember.id);
    local.accountId = localAccount.id;
    await reader.flush();
    await service().assignment(actor, local.id, {
      role: 'structure_admin',
      structureId: 'floresti',
    });
    const localActor = {
      id: localAccount.id,
      displayName: localAccount.displayName,
      roles: [],
    };
    const dashboard = await service().dashboard(localActor);
    assert.equal(dashboard.admin, false);
    assert.ok(dashboard.units.every((u) => u.structureId === 'floresti'));
    await assert.rejects(
      service().createUnit(localActor, {
        name: 'Forbidden',
        branch: 'lupisori',
        structureId: 'cluj',
      }),
    );
    const period = reader.create(MembershipPeriod, {
      name: 'Adeziuni test',
      startsOn: '2026-09-01',
      endsOn: '2027-08-31',
      prices: BASELINE_PLANS,
    });
    await reader.flush();
    const obligation = reader.create(MembershipObligation, {
      periodId: period.id,
      orgoUserId: 77777,
      memberName: 'Membru Florești',
      plan: 'normal',
      totalBani: 30000,
      nationalBani: 15000,
      verificationNote: 'Identitate verificată',
    });
    await reader.flush();
    const finance = () =>
      new MembershipService(
        orm.em.fork(),
        undefined as never,
        undefined as never,
        undefined as never,
        undefined as never,
      );
    const receipt = await finance().bankReceipt(actor, {
      periodId: period.id,
      amountBani: 20500,
      reference: 'PG-MIXED',
      receivedOn: '2026-10-20',
      note: 'Extras',
      allocations: [
        {
          purpose: 'admission',
          orgoUserId: 77777,
          amountBani: 10500,
          note: 'Adeziune',
        },
        {
          purpose: 'membership',
          obligationId: obligation.id,
          amountBani: 10000,
          note: 'Cotizație',
        },
      ],
    });
    assert.equal(await receiptAllocated(orm.em.fork(), receipt.id), 20500);
    assert.equal((await admissionEvidence(orm.em.fork(), 77777)).paid, true);
    assert.equal(
      await reader.count(MembershipAllocation, { receiptId: receipt.id }),
      1,
    );
    await assert.rejects(
      finance().reconcileReceipt(actor, receipt.id, {
        refundedBani: 1,
        note: 'Restituire',
      }),
    );
    const admission = await reader.findOneOrFail(AdmissionAllocation, {
      receiptId: receipt.id,
    });
    await finance().reverseAdmission(actor, admission.id, {
      note: 'Corecție verificată',
    });
    await finance().reconcileReceipt(actor, receipt.id, {
      refundedBani: 10500,
      note: 'Restituire',
    });
    assert.equal((await admissionEvidence(orm.em.fork(), 77777)).paid, false);
    // Independent connections race for the same receipt, sharing one database lock.
    const race = await finance().bankReceipt(actor, {
      periodId: period.id,
      amountBani: 10500,
      reference: 'PG-RACE',
      receivedOn: '2026-10-20',
      note: 'Extras',
    });
    const attempts = await Promise.allSettled(
      [1, 2].map(() =>
        finance().allocateAdmission(actor, {
          receiptId: race.id,
          orgoUserId: 77777,
          amountBani: 10500,
          note: 'Adeziune',
        }),
      ),
    );
    assert.equal(attempts.filter((a) => a.status === 'fulfilled').length, 1);
    assert.equal(await receiptAllocated(orm.em.fork(), race.id), 10500);
    // A later invalid allocation rolls back the receipt and earlier allocations together.
    await assert.rejects(
      finance().bankReceipt(actor, {
        periodId: period.id,
        amountBani: 500,
        reference: 'PG-ROLLBACK',
        receivedOn: '2026-10-20',
        note: 'Extras',
        allocations: [
          {
            purpose: 'membership',
            obligationId: obligation.id,
            amountBani: 100,
            note: 'Cotizație',
          },
          {
            purpose: 'admission',
            orgoUserId: 999999,
            amountBani: 400,
            note: 'Identitate inexistentă',
          },
        ],
      }),
    );
    assert.equal(
      await reader.count(MembershipReceipt, { reference: 'PG-ROLLBACK' }),
      0,
    );
    console.log(
      'PostgreSQL migrations, scoped structures, admission allocation concurrency and transaction rollback checks passed.',
    );
  } finally {
    await orm.close(true);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
