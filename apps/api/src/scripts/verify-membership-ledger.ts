import 'reflect-metadata';
import assert from 'node:assert/strict';
import {
  createHash,
  generateKeyPairSync,
  randomBytes,
  sign,
} from 'node:crypto';
import { MikroORM } from '@mikro-orm/postgresql';
import { ConfigService } from '@nestjs/config';
import {
  MEMBERSHIP_ENTITIES,
  MembershipAllocation,
  MembershipReceipt,
  MembershipCheckout,
  MembershipPaymentProviderConfig,
} from '../modules/membership/entities/membership.entity';
import { MembershipService } from '../modules/membership/membership.service';
import { NetopiaService } from '../modules/membership/netopia.service';
import { StripeService } from '../modules/membership/stripe.service';
import { AuditEntry } from '../modules/audit/entities/audit-entry.entity';
import { Migration20260921000100 } from '../migrations/Migration20260921000100';
import { Migration20260928000100 } from '../migrations/Migration20260928000100';
import { Migration20260930000100 } from '../migrations/Migration20260930000100';
import { Migration20261001000100 } from '../migrations/Migration20261001000100';
import { Migration20261001000200 } from '../migrations/Migration20261001000200';
import { Migration20260930000200 } from '../migrations/Migration20260930000200';
import type { PaymentConfigurationService } from '../modules/membership/payment-configuration.service';
import { UserRole } from '../modules/users/entities/user-role.enum';

async function main() {
  const supplied = process.env.MEMBERSHIP_TEST_DATABASE_URL;
  if (!supplied)
    throw new Error(
      'Set MEMBERSHIP_TEST_DATABASE_URL to a disposable PostgreSQL database.',
    );
  const schema = `codex_membership_test_${randomBytes(8).toString('hex')}`;
  if (!/^codex_membership_test_[0-9a-f]{16}$/.test(schema))
    throw new Error('Unsafe test schema');
  const url = new URL(supplied);
  url.searchParams.set('options', `-c search_path=${schema}`);
  const orm = await MikroORM.init({
    entities: [...MEMBERSHIP_ENTITIES, AuditEntry],
    clientUrl: url.href,
    schema,
    driverOptions: { options: `-c search_path=${schema}` },
  });
  try {
    const searchPath = await orm.em
      .getConnection()
      .execute<Array<{ search_path: string }>>('show search_path');
    assert.equal(
      searchPath[0].search_path,
      schema,
      'Refuse to run outside the isolated test schema',
    );
    await orm.em.getConnection().execute(`create schema "${schema}"`);
    await orm.em
      .getConnection()
      .execute(
        'create table orgo_connections (id integer primary key, profile jsonb not null)',
      );
    await orm.em
      .getConnection()
      .execute(
        'create table app_audit_entries (id serial primary key, actor_id integer, action varchar(255) not null, entity_type varchar(255) not null, entity_id varchar(255) not null, activity_id integer, metadata jsonb not null, created_at timestamptz not null)',
      );
    const migration = new Migration20260921000100(
      orm.em.getDriver(),
      orm.config,
    );
    migration.up();
    for (const sql of migration.getQueries()) {
      if (typeof sql !== 'string') throw new Error('Expected SQL migration');
      await orm.em.getConnection().execute(sql);
    }
    const configurationMigration = new Migration20260928000100(
      orm.em.getDriver(),
      orm.config,
    );
    configurationMigration.up();
    for (const sql of configurationMigration.getQueries()) {
      if (typeof sql !== 'string') throw new Error('Expected SQL migration');
      await orm.em.getConnection().execute(sql);
    }
    await orm.em
      .getConnection()
      .execute(
        `insert into membership_payment_provider_configs (id, provider, active, environment, encrypted_configuration, secret_hint, updated_by, updated_at) values ('11111111-1111-4111-8111-111111111111', 'stripe', false, 'live', 'encrypted-live', 'live', 1, '2026-09-29T10:00:00Z'), ('22222222-2222-4222-8222-222222222222', 'stripe', true, 'test', 'encrypted-test', 'test', 1, '2026-09-29T11:00:00Z')`,
      );
    await orm.em
      .getConnection()
      .execute(
        `update membership_payment_settings set active_provider = 'stripe' where id = 'membership'`,
      );
    const environmentMigration = new Migration20260930000100(
      orm.em.getDriver(),
      orm.config,
    );
    environmentMigration.up();
    for (const sql of environmentMigration.getQueries()) {
      if (typeof sql !== 'string') throw new Error('Expected SQL migration');
      await orm.em.getConnection().execute(sql);
    }
    const migratedTargets = await orm.em
      .getConnection()
      .execute<
        Array<{ environment: string; active: boolean }>
      >(`select environment, active from membership_payment_provider_configs where provider = 'stripe' order by environment`);
    assert.deepEqual(migratedTargets, [
      { environment: 'live', active: true },
      { environment: 'test', active: true },
    ]);
    const migratedSelection = await orm.em
      .getConnection()
      .execute<
        Array<{ active_environment: string }>
      >(`select active_environment from membership_payment_settings where id = 'membership'`);
    assert.equal(migratedSelection[0].active_environment, 'test');
    const rosterMigration = new Migration20260930000200(
      orm.em.getDriver(),
      orm.config,
    );
    rosterMigration.up();
    for (const sql of rosterMigration.getQueries()) {
      if (typeof sql !== 'string') throw new Error('Expected SQL migration');
      await orm.em.getConnection().execute(sql);
    }
    for (const Migration of [
      Migration20261001000100,
      Migration20261001000200,
    ]) {
      const migration = new Migration(orm.em.getDriver(), orm.config);
      migration.up();
      for (const sql of migration.getQueries()) {
        if (typeof sql !== 'string') throw new Error('Expected SQL migration');
        await orm.em.getConnection().execute(sql);
      }
    }
    // This runner verifies legacy fixed-value concurrency scenarios; pricing rollout
    // is checked separately against populated paid/pending/review cases.
    await orm.em
      .getConnection()
      .execute(
        `update membership_payment_settings set processing_fees='{"netopia":{"percentageBasisPoints":0,"fixedBani":0},"stripe":{"percentageBasisPoints":0,"fixedBani":0}}'::jsonb where id='membership'`,
      );
    const netopiaConfiguration = {
      provider: 'netopia' as const,
      environment: 'sandbox' as const,
      apiKey: 'test-key',
      posSignature: 'test-pos',
      publicKey: '',
    };
    const paymentConfigurations = {
      getRevision: () => Promise.resolve(netopiaConfiguration),
    } as unknown as PaymentConfigurationService;
    const makeService = () =>
      new MembershipService(
        orm.em.fork(),
        new NetopiaService(new ConfigService()),
        new StripeService(new ConfigService()),
        paymentConfigurations,
        { members: () => Promise.resolve([]) } as never,
      );
    const service = makeService(),
      user = {
        id: 1,
        displayName: 'Test finance',
        roles: [UserRole.FinanceManager],
      };
    const period = await service.createPeriod(user, {
      name: 'Integration test',
      startsOn: '2026-09-01',
      endsOn: '2027-08-31',
    });
    const first = await service.createObligation(user, {
      periodId: period.id,
      orgoUserId: '1',
      memberName: 'First',
      plan: 'normal',
      verificationNote: 'Test',
    });
    const second = await service.createObligation(user, {
      periodId: period.id,
      orgoUserId: '2',
      memberName: 'Second',
      plan: 'normal',
      verificationNote: 'Test',
    });
    const receipt = await service.bankReceipt(user, {
      periodId: period.id,
      amountBani: 30000,
      receivedOn: '2026-09-21',
      reference: 'integration-bank',
      note: 'Test',
    });
    const results = await Promise.allSettled(
      [first, second].map((o) =>
        makeService().allocate(user, {
          receiptId: receipt.id,
          obligationId: o.id,
          amountBani: 30000,
          note: 'Concurrent allocation',
        }),
      ),
    );
    assert.equal(
      results.filter((r) => r.status === 'fulfilled').length,
      1,
      'Only one concurrent allocation may spend the receipt',
    );
    const allocations = await orm.em
      .fork()
      .find(MembershipAllocation, { receiptId: receipt.id, reversed: false });
    assert.equal(
      allocations.reduce((sum, a) => sum + a.amountBani, 0),
      30000,
    );
    await assert.rejects(
      service.bankReceipt(user, {
        periodId: period.id,
        amountBani: 30000,
        receivedOn: '2026-09-21',
        reference: 'integration-bank',
        note: 'Duplicate',
      }),
    );
    assert.equal(await orm.em.fork().count(MembershipReceipt, {}), 1);
    assert.ok((await orm.em.fork().count(AuditEntry, {})) >= 5);
    const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const callbackConfig = new ConfigService({
      NETOPIA_ENVIRONMENT: 'sandbox',
      NETOPIA_POS_SIGNATURE: 'test-pos',
      NETOPIA_PUBLIC_KEY: keys.publicKey
        .export({ type: 'spki', format: 'pem' })
        .toString(),
    });
    const checkoutEm = orm.em.fork();
    const providerConfig = checkoutEm.create(MembershipPaymentProviderConfig, {
      provider: 'netopia',
      active: true,
      environment: 'sandbox',
      encryptedConfiguration: 'integration-test',
      secretHint: 'test',
      updatedBy: user.id,
    });
    netopiaConfiguration.publicKey = keys.publicKey
      .export({ type: 'spki', format: 'pem' })
      .toString();
    checkoutEm.persist(providerConfig);
    await checkoutEm.flush();
    const checkout = checkoutEm.create(MembershipCheckout, {
      periodId: period.id,
      tokenHash: createHash('sha256').update('test').digest('hex'),
      identifier: 'AT36805',
      identifierKind: 'card_id',
      plan: 'normal',
      amountBani: 30000,
      provider: 'netopia',
      providerConfigId: providerConfig.id,
      environment: 'sandbox',
      state: 'pending',
      termsVersion: '2026-09-28',
      termsAcceptedAt: new Date(),
    });
    checkoutEm.persist(checkout);
    await checkoutEm.flush();
    const callback = Buffer.from(
      JSON.stringify({
        order: { orderID: checkout.id },
        payment: { ntpID: 'test-ntp', status: 3, amount: 300, currency: 'RON' },
      }),
    );
    const jwtHeader = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString(
      'base64url',
    );
    const jwtBody = Buffer.from(
      JSON.stringify({
        iss: 'NETOPIA Payments',
        aud: 'test-pos',
        sub: createHash('sha512').update(callback).digest('base64'),
      }),
    ).toString('base64url');
    const jwt = `${jwtHeader}.${jwtBody}.${sign('RSA-SHA256', Buffer.from(`${jwtHeader}.${jwtBody}`), keys.privateKey).toString('base64url')}`;
    await Promise.all(
      [1, 2].map(() =>
        new MembershipService(
          orm.em.fork(),
          new NetopiaService(callbackConfig),
          new StripeService(callbackConfig),
          paymentConfigurations,
          { members: () => Promise.resolve([]) } as never,
        ).notifyNetopia(callback, jwt),
      ),
    );
    const cardReceipts = await orm.em
      .fork()
      .find(MembershipReceipt, { checkoutId: checkout.id });
    assert.equal(
      cardReceipts.length,
      1,
      'Concurrent callbacks must create one receipt',
    );
    assert.equal(cardReceipts[0].reviewRequired, true);
    assert.equal(
      await orm.em
        .fork()
        .count(MembershipAllocation, { receiptId: cardReceipts[0].id }),
      0,
      'Guest receipt is not automatic member credit',
    );
    console.log(
      'PostgreSQL migration, concurrent allocation, signed callback replay, guest review, duplicate bank receipt and audit checks passed.',
    );
  } finally {
    // Only this randomly generated schema is ever removed; no database drop.
    await orm.em
      .getConnection()
      .execute(`drop schema if exists "${schema}" cascade`);
    await orm.close();
  }
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'Membership integration check failed',
  );
  process.exitCode = 1;
});
