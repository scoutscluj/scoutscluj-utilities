// Run after pnpm --filter api build. Uses the real service without a database.
require('reflect-metadata');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  RegistrationService,
} = require('../dist/modules/activity-registrations/registration.service');
const {
  Activity,
} = require('../dist/modules/activities/entities/activity.entity');
const { UserRole } = require('../dist/modules/users/entities/user-role.enum');
const {
  AuditEntry,
} = require('../dist/modules/audit/entities/audit-entry.entity');
const {
  ActivityRegistration: Registration,
  ActivityRegistrationEntry: Entry,
  ActivityRegistrationCheckout: Checkout,
  ActivityRegistrationDocument: Document,
  ActivityRegistrationMail: Mail,
} = require('../dist/modules/activity-registrations/registration.entity');

const id = '11111111-1111-4111-8111-111111111111';
function setup({
  entries = 0,
  checkouts = 0,
  roles = [],
  actorId = 7,
  revision = 2,
} = {}) {
  const deleted = [];
  const audits = [];
  const activity = { id: 10, coordinatorId: 7 };
  const row = {
    id,
    activityId: 10,
    revision: 2,
    state: 'withdrawn',
    totalBani: 35000,
  };
  let locked = false;
  const tx = {
    execute: async () => {
      locked = true;
    },
    findOne: async (entity) => (entity === Activity ? activity : null),
    findOneOrFail: async (entity, query) => {
      assert.equal(entity, Registration);
      assert.deepEqual(query, { id, activityId: 10 });
      assert.equal(locked, true);
      return row;
    },
    count: async (entity) =>
      entity === Entry ? entries : entity === Checkout ? checkouts : 0,
    nativeDelete: async (entity, query) => {
      deleted.push({ entity, query });
      return 1;
    },
    create: (entity, data) => {
      assert.equal(entity, AuditEntry);
      return data;
    },
    persist: (data) => audits.push(data),
  };
  const em = { transactional: (work) => work(tx) };
  const service = new RegistrationService(em, {}, {}, {});
  const remove = () =>
    service.update(
      10,
      id,
      { action: 'delete', revision },
      { id: actorId, roles },
    );
  return { remove, deleted, audits, row };
}

test('deletes an unpaid withdrawn registration with its documents and mail, keeping an audit', async () => {
  const f = setup();
  assert.deepEqual(await f.remove(), { success: true });
  assert.deepEqual(f.deleted, [
    { entity: Mail, query: { registrationId: id } },
    { entity: Document, query: { registrationId: id } },
    { entity: Registration, query: { id, activityId: 10 } },
  ]);
  assert.equal(f.audits[0].action, 'registration.deleted');
  assert.equal(f.audits[0].entityId, id);
  assert.equal(f.audits[0].actorId, 7);
});
test('only activity managers and administrators can delete', async () => {
  for (const roles of [[], [UserRole.FinanceManager]]) {
    const f = setup({ actorId: 9, roles });
    await assert.rejects(f.remove(), (error) => error.getStatus() === 403);
    assert.equal(f.deleted.length, 0);
  }
  await setup({ actorId: 9, roles: [UserRole.Admin] }).remove();
});
test('a stale revision cannot delete a changed registration', async () => {
  const f = setup({ revision: 1 });
  await assert.rejects(f.remove(), /Înscriere modificată/);
  assert.equal(f.deleted.length, 0);
});
test('any ledger history or checkout prevents deletion, even with zero net balance', async () => {
  for (const history of [{ entries: 2 }, { checkouts: 1 }]) {
    const f = setup(history);
    await assert.rejects(f.remove(), /Folosește retragerea/);
    assert.equal(f.deleted.length, 0);
    assert.equal(f.audits.length, 0);
  }
});
