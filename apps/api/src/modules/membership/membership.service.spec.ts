jest.mock('../auth/guards/auth.guard', () => ({
  AuthGuard: class {
    canActivate() {
      throw new Error('User login must not be required for IPN');
    }
  },
}));
jest.mock('@mikro-orm/postgresql', () => ({ EntityManager: class {} }));
jest.mock('./orgo-roster.service', () => ({ OrgoRosterService: class {} }));
jest.mock('../audit/entities/audit-entry.entity', () => ({
  AuditEntry: 'audit',
}));
jest.mock('./entities/membership.entity', () => ({
  MembershipPeriod: 'period',
  MembershipObligation: 'obligation',
  MembershipCheckout: 'checkout',
  MembershipReceipt: 'receipt',
  MembershipAllocation: 'allocation',
  MembershipNationalBatch: 'batch',
  MembershipNationalItem: 'item',
  MembershipProviderEvent: 'event',
  MembershipPayout: 'payout',
  MembershipPaymentSettings: 'settings',
  MembershipPaymentProviderConfig: 'provider-config',
  MembershipRosterSync: 'roster-sync',
}));

import type { EntityManager } from '@mikro-orm/postgresql';
import { createHash, generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { Logger, UnauthorizedException } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { raw } from 'express';
import request from 'supertest';
import type { Server } from 'node:http';
import { MembershipController } from './membership.controller';
import type { NetopiaConfiguration } from './payment-provider';
import { MembershipService } from './membership.service';
import { PaymentNotSubmittedException } from './payment-provider';
import { NetopiaService } from './netopia.service';
import type { StripeService } from './stripe.service';
import { UserRole } from '../users/entities/user-role.enum';
import type { CurrentUser } from '../users/users.types';

describe('NETOPIA signed IPN processing and HTTP response', () => {
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publicKey = keys.publicKey
    .export({ type: 'spki', format: 'pem' })
    .toString();
  const verifier = new NetopiaService(
    new ConfigService({ NETOPIA_IPN_PUBLIC_KEY: publicKey }),
  );
  const jwt = (
    body: Buffer,
    overrides: Record<string, unknown> = {},
    key = keys.privateKey,
  ) => {
    const header = Buffer.from(JSON.stringify({ alg: 'RS512' })).toString(
      'base64url',
    );
    const claims = Buffer.from(
      JSON.stringify({
        iss: 'NETOPIA Payments',
        aud: 'pos',
        sub: createHash('sha512').update(body).digest('base64'),
        exp: Date.now() / 1000 + 60,
        ...overrides,
      }),
    ).toString('base64url');
    return `${header}.${claims}.${sign('RSA-SHA512', Buffer.from(`${header}.${claims}`), key).toString('base64url')}`;
  };
  const payment = async () => {
    const f = await setup();
    await f.service.checkout({
      periodId: f.period.id,
      identifier: 'AT36805',
      acceptTerms: true,
      attemptToken: 'i'.repeat(43),
    });
    jest
      .spyOn(f.netopia, 'verify')
      .mockImplementation((body, token, configuration) =>
        verifier.verify(body, token, configuration),
      );
    const checkout = f.rows.find((row) => row.table === 'checkout')!;
    const body = (
      overrides: Record<string, unknown> = {},
      orderID = checkout.id,
    ) =>
      Buffer.from(
        JSON.stringify({
          order: { orderID },
          payment: {
            ntpID: 'ntp-test',
            amount: Number(checkout.amountBani) / 100,
            currency: 'RON',
            status: 3,
            ...overrides,
          },
        }),
      );
    return { ...f, checkout, body };
  };

  it('creates one receipt/allocation for repeated cryptographically verified callbacks', async () => {
    const f = await payment();
    const body = f.body();
    await expect(f.service.notifyNetopia(body, jwt(body))).resolves.toEqual({
      errorCode: 0,
    });
    await expect(f.service.notifyNetopia(body, jwt(body))).resolves.toEqual({
      errorCode: 0,
    });
    // A different signed status/body must also avoid a second receipt.
    const confirmed = f.body({ status: 5 });
    await f.service.notifyNetopia(confirmed, jwt(confirmed));
    expect(f.checkout.state).toBe('succeeded');
    expect(f.rows.filter((r) => r.table === 'receipt')).toHaveLength(1);
    expect(f.rows.filter((r) => r.table === 'allocation')).toHaveLength(1);
  });

  it.each([
    { amount: 1 },
    { amount: 300.001 },
    { currency: 'EUR' },
    { ntpID: 'wrong-id' },
    { ntpID: '' },
    { status: 0 },
  ])(
    'rejects signed transaction mismatches %j without creating payment records',
    async (overrides) => {
      const f = await payment();
      const body = f.body(overrides);
      await expect(f.service.notifyNetopia(body, jwt(body))).rejects.toThrow();
      expect(f.checkout.state).not.toBe('succeeded');
      expect(
        f.rows.filter((r) =>
          ['receipt', 'allocation', 'event'].includes(r.table),
        ),
      ).toHaveLength(0);
    },
  );

  it('rejects a valid signed notification for an unknown checkout', async () => {
    const f = await payment();
    const body = f.body({}, randomUUID());
    await expect(f.service.notifyNetopia(body, jwt(body))).rejects.toThrow(
      'Plata notificată nu există',
    );
    expect(f.rows.filter((r) => r.table === 'receipt')).toHaveLength(0);
  });

  it('returns HTTP 200 without login, preserves raw bytes, and refuses invalid JWTs', async () => {
    const f = await payment();
    const module = await Test.createTestingModule({
      controllers: [MembershipController],
      providers: [{ provide: MembershipService, useValue: f.service }],
    }).compile();
    const app: INestApplication<Server> = module.createNestApplication({
      bodyParser: false,
      logger: false,
    });
    app.use(
      '/api/membership/netopia/notify',
      raw({ type: 'application/json', limit: '64kb' }),
    );
    app.setGlobalPrefix('api');
    await app.init();
    const body = f.body();
    const endpoint = '/api/membership/netopia/notify';
    try {
      await request(app.getHttpServer())
        .post(endpoint)
        .set('Content-Type', 'application/json')
        .send(body.toString())
        .expect(400);
      await request(app.getHttpServer())
        .post(endpoint)
        .set('Content-Type', 'application/json')
        .set('verification-token', jwt(body, { exp: 1 }))
        .send(body.toString())
        .expect(401);
      const wrongKey = generateKeyPairSync('rsa', {
        modulusLength: 2048,
      }).privateKey;
      await request(app.getHttpServer())
        .post(endpoint)
        .set('Content-Type', 'application/json')
        .set('verification-token', jwt(body, {}, wrongKey))
        .send(body.toString())
        .expect(401);
      await request(app.getHttpServer())
        .post(endpoint)
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${jwt(body)}`)
        .send(body.toString())
        .expect(400);
      expect(f.rows.filter((r) => r.table === 'receipt')).toHaveLength(0);
      await request(app.getHttpServer())
        .post(endpoint)
        .set('Content-Type', 'application/json')
        .set('verification-token', `Bearer ${jwt(body)}`)
        .send(body.toString())
        .expect(200, { errorCode: 0 });
      await request(app.getHttpServer())
        .post(endpoint)
        .set('Content-Type', 'application/json')
        .set('verification-token', jwt(body))
        .send(body.toString())
        .expect(200, { errorCode: 0 });
      expect(f.rows.filter((r) => r.table === 'receipt')).toHaveLength(1);
    } finally {
      await app.close();
    }
  });

  it('logs verification failures without tokens or credentials', async () => {
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const f = await payment();
    const body = f.body();
    const expired = jwt(body, { exp: 1 });
    try {
      await expect(
        f.service.notifyNetopia(body, expired),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      const logs = JSON.stringify(warn.mock.calls);
      expect(logs).toContain('expired_or_not_yet_valid');
      expect(logs).toContain(f.checkout.id);
      expect(logs).not.toContain(expired);
      expect(logs).not.toContain('api-key');
    } finally {
      warn.mockRestore();
    }
  });
});

type Row = Record<string, unknown> & { id: string; table: string };

// This fixture exercises service rules, NOT PostgreSQL isolation/constraints.
// The separate PostgreSQL integration runner covers real transaction behavior.
function fixture() {
  const rows: Row[] = [];
  const matches = (row: Row, where: Record<string, unknown>) =>
    Object.entries(where).every(([key, value]) =>
      value && typeof value === 'object' && '$in' in value
        ? (value.$in as unknown[]).includes(row[key])
        : row[key] === value,
    );
  const em = {
    transactional: jest.fn(
      <T>(fn: (tx: EntityManager) => Promise<T>): Promise<T> =>
        fn(em as unknown as EntityManager),
    ),
    execute: jest.fn(() => Promise.resolve([])),
    flush: jest.fn(() => Promise.resolve(undefined)),
    create: (table: string, data: Record<string, unknown>): Row => ({
      id: randomUUID(),
      createdAt: new Date(),
      active: false,
      reversed: false,
      reviewRequired: false,
      refundedBani: 0,
      payoutId: null,
      ...data,
      table,
    }),
    persist: (row: Row) => {
      if (!rows.includes(row)) rows.push(row);
    },
    find: (table: string, where: Record<string, unknown>) =>
      Promise.resolve(
        rows.filter((row) => row.table === table && matches(row, where)),
      ),
    findOne: (table: string, where: Record<string, unknown>) =>
      Promise.resolve(
        rows.find((row) => row.table === table && matches(row, where)) ?? null,
      ),
    findOneOrFail: (table: string, where: Record<string, unknown>) => {
      const row = rows.find((r) => r.table === table && matches(r, where));
      if (!row) return Promise.reject(new Error('Missing row'));
      return Promise.resolve(row);
    },
  };
  const netopia = {
    verify: (
      raw: Buffer,
      _token: string,
      _configuration: NetopiaConfiguration,
    ) => {
      void _token;
      void _configuration;
      return JSON.parse(raw.toString()) as Record<string, unknown>;
    },
    start: jest.fn(() =>
      Promise.resolve({
        providerId: 'ntp-test',
        paymentUrl: 'https://secure.sandbox.netopia-payments.com/pay/test',
      }),
    ),
  };
  const stripe = {
    verify: jest.fn(),
    expireUnpaid: jest.fn(() => Promise.resolve()),
    start: jest.fn(() =>
      Promise.resolve({
        providerId: 'cs_test_123',
        paymentUrl: 'https://checkout.stripe.com/c/pay/test',
      }),
    ),
  };
  rows.push(
    {
      id: '11111111-1111-4111-8111-111111111111',
      table: 'provider-config',
      provider: 'netopia',
      active: true,
      environment: 'sandbox',
      encryptedConfiguration: 'netopia',
      secretHint: 'opia',
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      table: 'provider-config',
      provider: 'stripe',
      active: true,
      environment: 'test',
      encryptedConfiguration: 'stripe',
      secretHint: 'test',
    },
  );
  const runtimeConfiguration = (
    provider: 'netopia' | 'stripe',
    environment: 'sandbox' | 'test' | 'live' = provider === 'stripe'
      ? 'test'
      : 'sandbox',
  ) =>
    provider === 'stripe'
      ? {
          provider,
          environment: environment as 'test' | 'live',
          secretKey:
            environment === 'live' ? 'sk_live_secret' : 'sk_test_secret',
          webhookSecret: 'whsec_test',
        }
      : {
          provider,
          environment: environment as 'sandbox' | 'live',
          apiKey: 'api-key',
          posSignature: 'pos',
          publicKey: 'certificate',
        };
  const configurations = {
    vaultReady: () => true,
    summaries: () =>
      Promise.resolve(
        [
          ['netopia', 'sandbox'],
          ['netopia', 'live'],
          ['stripe', 'test'],
          ['stripe', 'live'],
        ].map(([provider, environment]) => {
          const row = rows.find(
            (item) =>
              item.table === 'provider-config' &&
              item.provider === provider &&
              item.environment === environment &&
              item.active,
          );
          return {
            id: provider,
            targetId: `${provider}:${environment}`,
            label: provider === 'stripe' ? 'Stripe' : 'NETOPIA Payments',
            ready: Boolean(row),
            environment,
            secretHint: row?.secretHint ?? null,
            updatedAt: null,
          };
        }),
      ),
    activeRevision: (
      provider: 'netopia' | 'stripe',
      environment: 'sandbox' | 'test' | 'live',
    ) => {
      const row = rows.find(
        (item) =>
          item.table === 'provider-config' &&
          item.provider === provider &&
          item.environment === environment &&
          item.active,
      );
      return Promise.resolve(
        row
          ? {
              id: row.id,
              configuration: runtimeConfiguration(provider, environment),
            }
          : null,
      );
    },
    getRevision: (provider: 'netopia' | 'stripe', id: string) =>
      Promise.resolve(
        rows.some(
          (row) =>
            row.table === 'provider-config' &&
            row.id === id &&
            row.provider === provider,
        )
          ? runtimeConfiguration(
              provider,
              rows.find((row) => row.id === id)?.environment as
                | 'sandbox'
                | 'test'
                | 'live',
            )
          : null,
      ),
    parse: (
      provider: 'netopia' | 'stripe',
      input: { environment?: 'sandbox' | 'test' | 'live' },
    ) => runtimeConfiguration(provider, input.environment),
    encrypt: (configuration: {
      provider: 'netopia' | 'stripe';
      environment: string;
    }) =>
      Promise.resolve({
        ciphertext: `encrypted-${configuration.provider}-${configuration.environment}`,
        secretHint: 'test',
      }),
  };
  const rosterMembers = jest.fn<
    Promise<
      Array<{
        orgoUserId: number;
        cardId: string;
        memberName: string;
        plan: 'normal' | 'fam2';
        eligible: boolean;
      }>
    >,
    []
  >(() =>
    Promise.resolve([
      {
        orgoUserId: 36805,
        cardId: 'AT36805',
        memberName: 'Test Member',
        plan: 'normal' as const,
        eligible: true,
      },
    ]),
  );
  const service = new MembershipService(
    em as unknown as EntityManager,
    netopia as unknown as NetopiaService,
    stripe as unknown as StripeService,
    configurations as never,
    { members: rosterMembers, nationalReady: () => false } as never,
  );
  const staff: CurrentUser = {
    id: 1,
    displayName: 'Finance',
    roles: [UserRole.FinanceManager],
  };
  return {
    rows,
    em,
    netopia,
    stripe,
    configurations,
    rosterMembers,
    service,
    staff,
  };
}

async function setup() {
  const f = fixture();
  await f.service.configureProcessingFee(f.staff, {
    provider: 'netopia',
    percentageBasisPoints: 0,
    fixedBani: 0,
  });
  await f.service.configureProcessingFee(f.staff, {
    provider: 'stripe',
    percentageBasisPoints: 0,
    fixedBani: 0,
  });
  const period = await f.service.createPeriod(f.staff, {
    name: 'ORGO test period',
    startsOn: '2026-09-01',
    endsOn: '2027-08-31',
  });
  await f.service.activatePeriod(f.staff, period.id);
  const obligation = await f.service.createObligation(f.staff, {
    periodId: period.id,
    orgoUserId: '36805',
    cardId: 'at36805',
    memberName: 'Test Member',
    plan: 'normal',
    verificationNote: 'Test ORGO evidence',
  });
  return { ...f, period, obligation };
}

describe('membership service rules', () => {
  it.each(['bank', 'cash'])(
    'records a partial %s payment and allocates it to the selected member',
    async (method) => {
      const f = await setup();
      const body = {
        periodId: f.period.id,
        obligationId: f.obligation.id,
        method,
        amountBani: 10000,
        receivedOn: '2026-10-05',
        reference: 'DOC-42',
        note: 'Document verificat pentru membru',
      };
      const receipt = await f.service.bankReceipt(f.staff, body);
      expect(receipt).toMatchObject({
        method,
        amountBani: 10000,
        actorId: f.staff.id,
      });
      expect(f.rows.filter((r) => r.table === 'allocation')).toEqual([
        expect.objectContaining({
          receiptId: receipt.id,
          obligationId: f.obligation.id,
          amountBani: 10000,
          actorId: f.staff.id,
        }),
      ]);
      expect(f.rows.filter((r) => r.table === 'audit')).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ action: `membership.${method}.received` }),
          expect.objectContaining({ action: 'membership.receipt.allocated' }),
        ]),
      );
      await expect(f.service.bankReceipt(f.staff, body)).rejects.toThrow(
        'deja înregistrată',
      );
      await expect(
        f.service.bankReceipt(f.staff, {
          ...body,
          reference: 'DOC-43',
          amountBani: 20001,
        }),
      ).rejects.toThrow('restul de plată');
      expect(f.rows.filter((r) => r.table === 'receipt')).toHaveLength(1);
      expect(f.rows.filter((r) => r.table === 'allocation')).toHaveLength(1);
    },
  );

  it('rejects mismatched periods, unknown methods, invalid amounts and unauthorized manual payments before writing', async () => {
    const f = await setup();
    const other = await f.service.createPeriod(f.staff, {
      name: 'Altă perioadă',
      startsOn: '2027-09-01',
      endsOn: '2028-08-31',
    });
    const body = {
      periodId: f.period.id,
      obligationId: f.obligation.id,
      method: 'cash',
      amountBani: 10000,
      receivedOn: '2026-10-05',
      reference: 'CH-1',
      note: 'Chitanță verificată',
    };
    await expect(
      f.service.bankReceipt(f.staff, { ...body, periodId: other.id }),
    ).rejects.toThrow('Perioade diferite');
    await expect(
      f.service.bankReceipt(f.staff, { ...body, method: 'card' }),
    ).rejects.toThrow('transfer bancar sau numerar');
    await expect(
      f.service.bankReceipt(f.staff, { ...body, amountBani: 0 }),
    ).rejects.toThrow();
    await expect(
      f.service.bankReceipt({ ...f.staff, roles: [] }, body),
    ).rejects.toThrow();
    expect(
      f.rows.filter((r) => ['receipt', 'allocation'].includes(r.table)),
    ).toHaveLength(0);
  });

  it('records unallocated cash receipts for later allocation and keeps historical bank requests compatible', async () => {
    const f = await setup();
    const body = {
      periodId: f.period.id,
      amountBani: 10000,
      receivedOn: '2026-10-05',
      reference: 'DOC-1',
      note: 'Încasare verificată',
    };
    expect(await f.service.bankReceipt(f.staff, body)).toMatchObject({
      method: 'bank',
    });
    expect(
      await f.service.bankReceipt(f.staff, { ...body, method: 'cash' }),
    ).toMatchObject({ method: 'cash' });
    expect(f.rows.filter((r) => r.table === 'receipt')).toHaveLength(2);
    expect(f.rows.filter((r) => r.table === 'allocation')).toHaveLength(0);
  });

  it.each(['36805', 'AT36805'])(
    'sends the verified beneficiary Orgo ID to NETOPIA when paying with %s',
    async (identifier) => {
      const f = await setup();
      await f.service.checkout({
        periodId: f.period.id,
        identifier,
        acceptTerms: true,
        attemptToken: 'r'.repeat(43),
        amountBani: 30000,
      });
      expect(f.netopia.start).toHaveBeenCalledWith(
        expect.objectContaining({ beneficiaryOrgoId: 36805 }),
        expect.objectContaining({ provider: 'netopia' }),
      );
    },
  );

  it('expires an abandoned unpaid Stripe link before repricing and creating another checkout', async () => {
    const f = await setup();
    await f.service.selectPaymentProvider(f.staff, {
      provider: 'stripe',
      environment: 'test',
    });
    const body = {
      periodId: f.period.id,
      identifier: 'AT36805',
      acceptTerms: true,
      attemptToken: 'r'.repeat(43),
      amountBani: 30000,
    };
    await f.service.checkout(body);
    await f.service.configureProcessingFee(f.staff, {
      provider: 'stripe',
      percentageBasisPoints: 150,
      fixedBani: 100,
    });
    expect(f.obligation.totalBani).toBe(30000);
    await f.service.restart(body.attemptToken);
    expect(f.stripe.expireUnpaid).toHaveBeenCalledWith(
      'cs_test_123',
      expect.any(String),
      30000,
      expect.objectContaining({ environment: 'test' }),
    );
    expect(f.obligation.totalBani).toBe(31000);
    expect(await f.service.status(body.attemptToken)).toMatchObject({
      state: 'failed',
      paymentUrl: null,
    });
    await f.service.checkout({
      ...body,
      attemptToken: 's'.repeat(43),
      amountBani: 31000,
    });
    expect(f.stripe.start).toHaveBeenCalledTimes(2);
    expect(f.stripe.start).toHaveBeenLastCalledWith(
      expect.objectContaining({ amountBani: 31000 }),
      expect.anything(),
    );
  });

  it('keeps a submitted or unconfirmed Stripe payment protected when expiration cannot be confirmed', async () => {
    const f = await setup();
    await f.service.selectPaymentProvider(f.staff, {
      provider: 'stripe',
      environment: 'test',
    });
    const body = {
      periodId: f.period.id,
      identifier: 'AT36805',
      acceptTerms: true,
      attemptToken: 'r'.repeat(43),
      amountBani: 30000,
    };
    await f.service.checkout(body);
    f.stripe.expireUnpaid.mockRejectedValueOnce(new Error('already submitted'));
    await expect(f.service.restart(body.attemptToken)).rejects.toThrow(
      'already submitted',
    );
    expect(await f.service.status(body.attemptToken)).toMatchObject({
      state: 'pending',
    });
    expect(f.stripe.start).toHaveBeenCalledTimes(1);
    const checkout = f.rows.find((row) => row.table === 'checkout')!;
    checkout.state = 'unknown';
    await expect(f.service.restart(body.attemptToken)).rejects.toThrow(
      'verificată',
    );
    expect(f.stripe.expireUnpaid).toHaveBeenCalledTimes(1);
  });

  it('does not overwrite a success callback racing the restart request', async () => {
    const f = await setup();
    await f.service.selectPaymentProvider(f.staff, {
      provider: 'stripe',
      environment: 'test',
    });
    const body = {
      periodId: f.period.id,
      identifier: 'AT36805',
      acceptTerms: true,
      attemptToken: 'r'.repeat(43),
      amountBani: 30000,
    };
    await f.service.checkout(body);
    const checkout = f.rows.find((row) => row.table === 'checkout')!;
    f.stripe.expireUnpaid.mockImplementationOnce(() => {
      checkout.state = 'succeeded';
      return Promise.resolve();
    });
    await expect(f.service.restart(body.attemptToken)).rejects.toThrow(
      'confirmată între timp',
    );
    expect(await f.service.status(body.attemptToken)).toMatchObject({
      state: 'succeeded',
    });
    expect(f.stripe.start).toHaveBeenCalledTimes(1);
  });

  it('reopens an existing payment when the browser has lost its original attempt token', async () => {
    const f = await setup();
    await f.service.selectPaymentProvider(f.staff, {
      provider: 'stripe',
      environment: 'test',
    });
    const user = { ...f.staff, orgoConnection: { orgoUserId: 36805 } };
    const body = {
      periodId: f.period.id,
      obligationId: f.obligation.id,
      identifier: 'AT36805',
      acceptTerms: true,
      attemptToken: 'r'.repeat(43),
      amountBani: 30000,
    };
    const first = await f.service.checkout(body, user);
    // Knowing a public member ID is insufficient to take over another payer's attempt.
    await expect(
      f.service.checkout({ ...body, attemptToken: 's'.repeat(43) }),
    ).rejects.toThrow('Există o plată în curs');
    expect(
      await f.service.checkout({ ...body, attemptToken: 's'.repeat(43) }, user),
    ).toEqual(first);
    expect(f.stripe.start).toHaveBeenCalledTimes(1);
    expect(await f.service.status('s'.repeat(43))).toMatchObject({
      state: 'pending',
      paymentUrl: first.paymentUrl,
    });
    await f.service.restart('s'.repeat(43));
    expect(await f.service.status('s'.repeat(43))).toMatchObject({
      state: 'failed',
    });
  });

  it('updates a cancelled test allocation to the current Stripe tariff and repairs already reversed allocations on reload', async () => {
    const f = await setup();
    const receipt = await f.service.bankReceipt(f.staff, {
      periodId: f.period.id,
      amountBani: 30000,
      reference: 'test-payment',
      receivedOn: '2026-10-01',
      note: 'Test',
    });
    const allocation = await f.service.allocate(f.staff, {
      receiptId: receipt.id,
      obligationId: f.obligation.id,
      amountBani: 30000,
      note: 'Test',
    });
    await f.service.configureProcessingFee(f.staff, {
      provider: 'stripe',
      percentageBasisPoints: 150,
      fixedBani: 100,
    });
    await f.service.selectPaymentProvider(f.staff, {
      provider: 'stripe',
      environment: 'test',
    });
    expect(f.obligation.totalBani).toBe(30000);
    await f.service.reverse(f.staff, allocation.id, { note: 'Cancel test' });
    expect(f.obligation.totalBani).toBe(31000);
    f.obligation.totalBani = 30000;
    expect(
      await f.service.guestLookup({ identifier: 'AT36805' }),
    ).toMatchObject({ amountBani: 31000, paid: false });
    expect(f.rows.find((row) => row.id === allocation.id)).toMatchObject({
      reversed: true,
      amountBani: 30000,
    });
    expect(receipt.amountBani).toBe(30000);
  });
  it('does not reuse a 300 RON session when the submitted total is 310 RON', async () => {
    const f = await setup();
    await f.service.selectPaymentProvider(f.staff, {
      provider: 'stripe',
      environment: 'test',
    });
    const body = {
      periodId: f.period.id,
      identifier: 'AT36805',
      acceptTerms: true,
      attemptToken: 'w'.repeat(43),
      amountBani: 30000,
    };
    await f.service.checkout(body);
    f.obligation.totalBani = 31000;
    await expect(
      f.service.checkout({ ...body, amountBani: 31000 }),
    ).rejects.toThrow('Suma încercării existente');
    expect(f.stripe.start).toHaveBeenCalledTimes(1);
  });

  it('sends the published Stripe total and beneficiary/period details for a fresh checkout', async () => {
    const f = await setup();
    await f.service.configureProcessingFee(f.staff, {
      provider: 'stripe',
      percentageBasisPoints: 150,
      fixedBani: 100,
    });
    await f.service.selectPaymentProvider(f.staff, {
      provider: 'stripe',
      environment: 'test',
    });
    const lookup = await f.service.guestLookup({ identifier: 'AT36805' });
    await f.service.checkout({
      periodId: f.period.id,
      identifier: 'AT36805',
      acceptTerms: true,
      attemptToken: 'v'.repeat(43),
      amountBani: lookup.amountBani,
    });
    expect(lookup.amountBani).toBe(31000);
    expect(f.stripe.start).toHaveBeenCalledWith(
      expect.objectContaining({
        amountBani: 31000,
        beneficiaryName: 'Test M.',
        periodName: 'ORGO test period',
      }),
      expect.objectContaining({ provider: 'stripe' }),
    );
  });
  it('publishes one adjusted price for bank and card, with provider-specific fees and stable base', async () => {
    const f = await setup();
    await f.service.configureProcessingFee(f.staff, {
      provider: 'netopia',
      percentageBasisPoints: 119,
      fixedBani: 30,
    });
    expect(f.obligation.totalBani).toBe(30500);
    expect(f.period.prices.normal).toMatchObject({
      baseBani: 30000,
      totalBani: 30500,
      nationalBani: 15000,
    });
    await expect(
      f.service.guestLookup({ identifier: 'AT36805' }),
    ).resolves.toMatchObject({ amountBani: 30500 });
    await f.service.configureProcessingFee(f.staff, {
      provider: 'stripe',
      percentageBasisPoints: 150,
      fixedBani: 100,
    });
    await f.service.selectPaymentProvider(f.staff, {
      provider: 'stripe',
      environment: 'test',
    });
    expect(f.obligation.totalBani).toBe(31000);
    const body = {
      periodId: f.period.id,
      identifier: 'AT36805',
      acceptTerms: true,
      attemptToken: 'q'.repeat(43),
      amountBani: 30500,
    };
    await expect(f.service.checkout(body)).rejects.toThrow(
      'Suma de plată s-a schimbat',
    );
    expect(f.stripe.start).not.toHaveBeenCalled();
    await f.service.checkout({ ...body, amountBani: 31000 });
    await f.service.configureProcessingFee(f.staff, {
      provider: 'stripe',
      percentageBasisPoints: 900,
      fixedBani: 100,
    });
    expect(f.obligation.totalBani).toBe(31000);
    await expect(f.service.status(body.attemptToken)).resolves.toMatchObject({
      amountBani: 31000,
    });
  });

  it('preserves a partially paid published total when fees change', async () => {
    const f = await setup();
    const receipt = await f.service.bankReceipt(f.staff, {
      periodId: f.period.id,
      amountBani: 15000,
      reference: 'partial',
      receivedOn: '2026-10-01',
      note: 'Partial payment',
    });
    await f.service.allocate(f.staff, {
      receiptId: receipt.id,
      obligationId: f.obligation.id,
      amountBani: 15000,
      note: 'Partial allocation',
    });
    await f.service.configureProcessingFee(f.staff, {
      provider: 'netopia',
      percentageBasisPoints: 500,
      fixedBani: 100,
    });
    expect(f.obligation.totalBani).toBe(30000);
    await expect(
      f.service.guestLookup({ identifier: 'AT36805' }),
    ).resolves.toMatchObject({ amountBani: 15000 });
    await f.service.synchronizeRoster(f.staff, 'initialization');
    expect(f.obligation.totalBani).toBe(30000);
    expect(f.obligation.reviewState).toBeNull();
  });

  it('uses the requesting financial actor for retry and requires evidence before uncertain resubmission', async () => {
    const f = await setup();
    const item = f.em.create('item', {
      orgoState: 'unknown',
      obligationId: f.obligation.id,
    });
    f.em.persist(item);
    await expect(
      f.service.retryOrgo(
        { id: 9, displayName: 'Member', roles: [] },
        item.id,
        {},
      ),
    ).rejects.toThrow();
    await f.service.retryOrgo(f.staff, item.id, {});
    expect(item.orgoState).toBe('pending_approval');
    expect(item.orgoActorId).toBe(f.staff.id);
    item.orgoState = 'unknown';
    await expect(
      f.service.retryOrgo(f.staff, item.id, { verifiedNotRecorded: true }),
    ).rejects.toThrow();
    item.orgoState = 'unknown';
    await f.service.retryOrgo({ ...f.staff, id: 2 }, item.id, {
      verifiedNotRecorded: true,
      evidence: 'Checked exact ORGO period: no record exists.',
    });
    expect(item.orgoState).toBe('queued');
    expect(item.orgoActorId).toBe(2);
    item.orgoState = 'correction_required';
    await expect(f.service.retryOrgo(f.staff, item.id, {})).rejects.toThrow(
      'corecția',
    );
  });

  it('rejects unauthorized or malformed processing fees', async () => {
    const f = fixture();
    await expect(
      f.service.configureProcessingFee(
        { id: 2, displayName: 'Member', roles: [] },
        {},
      ),
    ).rejects.toThrow();
    for (const body of [
      { provider: 'invalid', percentageBasisPoints: 100, fixedBani: 0 },
      { provider: 'netopia', percentageBasisPoints: 10000, fixedBani: 0 },
      { provider: 'netopia', percentageBasisPoints: '119', fixedBani: 30 },
    ])
      await expect(
        f.service.configureProcessingFee(f.staff, body),
      ).rejects.toThrow();
  });

  it('preserves checkouts created before a fee configuration change', async () => {
    const f = await setup();
    await f.service.checkout({
      periodId: f.period.id,
      identifier: 'AT36805',
      acceptTerms: true,
      attemptToken: 'l'.repeat(43),
    });
    const checkout = f.rows.find((r) => r.table === 'checkout')!;
    await f.service.configureProcessingFee(f.staff, {
      provider: 'netopia',
      percentageBasisPoints: 119,
      fixedBani: 30,
    });
    checkout.amountBani = 30000;
    const raw = Buffer.from(
      JSON.stringify({
        order: { orderID: checkout.id },
        payment: { ntpID: 'ntp-test', amount: 300, currency: 'RON', status: 3 },
      }),
    );
    await f.service.notifyNetopia(raw, 'verified');
    expect(f.rows.find((r) => r.table === 'receipt')).toMatchObject({
      amountBani: 30000,
      reviewRequired: false,
    });
  });

  it('rejects administrative work from an ordinary member', async () => {
    const f = fixture(),
      user: CurrentUser = { id: 2, displayName: 'Member', roles: [] };
    await expect(f.service.dashboard(user)).rejects.toThrow();
    await expect(f.service.bankReceipt(user, {})).rejects.toThrow();
    await expect(f.service.nationalBatch(user, {})).rejects.toThrow();
    expect(
      f.rows.filter((row) => row.table !== 'provider-config'),
    ).toHaveLength(0);
  });

  it('creates and activates the new annual period automatically on 1 September', async () => {
    const f = fixture();
    const previous = await f.service.createPeriod(f.staff, {
      name: 'Cotizație 2025–2026',
      startsOn: '2025-09-01',
      endsOn: '2026-08-31',
      totals: { normal: 32000 },
    });
    await f.service.activatePeriod(f.staff, previous.id);

    const catalog = await f.service.catalog(
      new Date('2026-09-01T00:00:00+03:00'),
    );

    expect(catalog.period).toMatchObject({
      name: 'Cotizație 2026–2027',
      startsOn: '2026-09-01',
      endsOn: '2027-08-31',
      active: true,
    });
    expect(catalog.period.prices.normal.totalBani).toBe(32500);
    expect(previous.active).toBe(false);

    await f.service.catalog(new Date('2026-09-01T12:00:00+03:00'));
    expect(f.rows.filter((row) => row.table === 'period')).toHaveLength(2);
  });

  it('initializes the current roster and adds only new ORGO members on later syncs', async () => {
    const f = fixture();
    const first = await f.service.synchronizeRoster(f.staff, 'initialization');
    expect(first).toMatchObject({ added: 1, review: 0 });
    expect(f.rows.filter((row) => row.table === 'obligation')).toHaveLength(1);

    f.rosterMembers.mockResolvedValueOnce([
      {
        orgoUserId: 36805,
        cardId: 'AT36805',
        memberName: 'Test Member',
        plan: 'normal',
        eligible: true,
      },
      {
        orgoUserId: 40000,
        cardId: 'AT40000',
        memberName: 'New Member',
        plan: 'fam2',
        eligible: true,
      },
    ]);
    const second = await f.service.synchronizeRoster(f.staff, 'manual');
    expect(second).toMatchObject({ added: 1, unchanged: 1 });
    expect(f.rows.filter((row) => row.table === 'obligation')).toHaveLength(2);
  });

  it('requires initialization before manual synchronization and prevents reinitialization', async () => {
    const f = fixture();
    await expect(
      f.service.synchronizeRoster(f.staff, 'manual'),
    ).rejects.toThrow('confirmă inițializarea');
    await f.service.synchronizeRoster(f.staff, 'initialization');
    await expect(
      f.service.synchronizeRoster(f.staff, 'initialization'),
    ).rejects.toThrow('deja inițializată');
  });

  it('preserves paid obligations for review when ORGO changes their plan', async () => {
    const f = fixture();
    await f.service.synchronizeRoster(f.staff, 'initialization');
    const obligation = f.rows.find((row) => row.table === 'obligation')!;
    const period = f.rows.find((row) => row.table === 'period')!;
    const receipt = await f.service.bankReceipt(f.staff, {
      periodId: period.id,
      amountBani: 10000,
      reference: 'paid-before-plan-change',
      receivedOn: '2026-09-30',
      note: 'Partial bank payment',
    });
    await f.service.allocate(f.staff, {
      receiptId: receipt.id,
      obligationId: obligation.id,
      amountBani: 10000,
      note: 'Partial allocation',
    });
    f.rosterMembers.mockResolvedValueOnce([
      {
        orgoUserId: 36805,
        cardId: 'AT36805',
        memberName: 'Test Member',
        plan: 'fam2',
        eligible: true,
      },
    ]);

    await expect(
      f.service.synchronizeRoster(f.staff, 'manual'),
    ).resolves.toMatchObject({
      review: 1,
      updated: 0,
    });
    expect(obligation).toMatchObject({
      plan: 'normal',
      reviewState: 'plan_changed_after_payment',
    });
  });

  it('never deletes an existing obligation when a member disappears from ORGO', async () => {
    const f = fixture();
    await f.service.synchronizeRoster(f.staff, 'initialization');
    const obligation = f.rows.find((row) => row.table === 'obligation')!;
    f.rosterMembers.mockResolvedValueOnce([
      {
        orgoUserId: 40000,
        cardId: 'AT40000',
        memberName: 'Still Active',
        plan: 'normal',
        eligible: true,
      },
    ]);

    await expect(
      f.service.synchronizeRoster(f.staff, 'manual'),
    ).resolves.toMatchObject({
      review: 1,
    });
    expect(f.rows.filter((row) => row.table === 'obligation')).toHaveLength(2);
    expect(obligation).toMatchObject({ reviewState: 'missing_from_orgo' });
    await expect(
      f.service.guestLookup({ identifier: 'AT36805' }),
    ).rejects.toThrow('necesită verificare');
  });

  it('rejects a suddenly empty ORGO roster without changing obligations', async () => {
    const f = fixture();
    await f.service.synchronizeRoster(f.staff, 'initialization');
    const obligation = f.rows.find((row) => row.table === 'obligation')!;
    f.rosterMembers.mockResolvedValueOnce([]);

    await expect(
      f.service.synchronizeRoster(f.staff, 'manual'),
    ).rejects.toThrow('registru gol');
    expect(obligation.reviewState).toBeNull();
    expect(
      f.rows.find(
        (row) => row.table === 'roster-sync' && row.mode === 'manual',
      ),
    ).toMatchObject({ status: 'failed' });
  });

  it('holds a changed obligation and any open checkout for financial review', async () => {
    const f = fixture();
    await f.service.synchronizeRoster(f.staff, 'initialization');
    const period = f.rows.find((row) => row.table === 'period')!;
    await f.service.checkout({
      periodId: period.id,
      identifier: 'AT36805',
      acceptTerms: true,
      attemptToken: 'p'.repeat(43),
    });
    f.rosterMembers.mockResolvedValueOnce([
      {
        orgoUserId: 36805,
        cardId: 'AT36805',
        memberName: 'Test Member',
        plan: 'fam2',
        eligible: true,
      },
    ]);

    await f.service.synchronizeRoster(f.staff, 'manual');

    expect(f.rows.find((row) => row.table === 'obligation')).toMatchObject({
      plan: 'normal',
      reviewState: 'plan_changed_after_payment',
    });
    expect(f.rows.find((row) => row.table === 'checkout')).toMatchObject({
      reviewRequired: true,
    });
  });

  it('allocates one receipt across members without spending it twice', async () => {
    const f = await setup();
    const second = await f.service.createObligation(f.staff, {
      periodId: f.period.id,
      orgoUserId: '36806',
      memberName: 'Second',
      plan: 'fam2',
      verificationNote: 'Verified',
    });
    const receipt = await f.service.bankReceipt(f.staff, {
      periodId: f.period.id,
      amountBani: 45000,
      reference: 'bank-1',
      receivedOn: '2026-09-21',
      note: 'Family payment',
    });
    await f.service.allocate(f.staff, {
      receiptId: receipt.id,
      obligationId: f.obligation.id,
      amountBani: 30000,
      note: 'First member',
    });
    await f.service.allocate(f.staff, {
      receiptId: receipt.id,
      obligationId: second.id,
      amountBani: 15000,
      note: 'Second member',
    });
    await expect(
      f.service.allocate(f.staff, {
        receiptId: receipt.id,
        obligationId: second.id,
        amountBani: 1,
        note: 'Overdraw',
      }),
    ).rejects.toThrow('Alocarea depășește');
    const batch = await f.service.nationalBatch(f.staff, {
      obligationIds: [f.obligation.id, second.id],
      transferredOn: '2026-09-22',
      reference: 'national-1',
      note: 'Transferred',
    });
    expect(batch.totalBani).toBe(22500);
    expect(
      f.rows
        .filter((r) => r.table === 'item')
        .every((r) => r.orgoState === 'queued'),
    ).toBe(true);
    await expect(
      f.service.nationalBatch(f.staff, {
        obligationIds: [second.id],
        transferredOn: '2026-09-22',
        reference: 'national-2',
        note: 'Duplicate',
      }),
    ).rejects.toThrow('deja într-un transfer');
  });

  it('validates a local member before guest payment and deduplicates success callbacks', async () => {
    const f = await setup();
    await expect(
      f.service.guestLookup({ identifier: 'at36805' }),
    ).resolves.toEqual({
      identifier: 'AT36805',
      displayName: 'Test M.',
      affiliation: 'Centrul Local Cluj',
      amountBani: 30000,
      paid: false,
    });
    await expect(
      f.service.guestLookup({ identifier: 'AT99999' }),
    ).rejects.toThrow('ID-ul nu corespunde');
    const body = {
      periodId: f.period.id,
      identifier: 'at36805',
      acceptTerms: true,
      attemptToken: 'a'.repeat(43),
    };
    await f.service.checkout(body);
    await f.service.checkout(body);
    expect(f.netopia.start).toHaveBeenCalledTimes(1);
    const checkout = f.rows.find((r) => r.table === 'checkout')!;
    expect(checkout.identifier).toBe('AT36805');
    const callback = Buffer.from(
      JSON.stringify({
        order: { orderID: checkout.id },
        payment: {
          ntpID: 'ntp-test',
          amount: Number(checkout.amountBani) / 100,
          currency: 'RON',
          status: 3,
        },
      }),
    );
    await f.service.notifyNetopia(callback, 'verified');
    await f.service.notifyNetopia(callback, 'verified');
    expect(f.rows.filter((r) => r.table === 'receipt')).toHaveLength(1);
    expect(f.rows.filter((r) => r.table === 'allocation')).toHaveLength(1);
    const receipt = f.rows.find((r) => r.table === 'receipt')!;
    expect(receipt.reviewRequired).toBe(false);
    expect(receipt).toMatchObject({
      amountBani: 30000,
    });
    expect(f.rows.find((r) => r.table === 'allocation')).toMatchObject({
      amountBani: 30000,
    });
  });

  it('requires explicit acceptance of the current legal policies', async () => {
    const f = await setup();
    await expect(f.service.checkout({ periodId: f.period.id })).rejects.toThrow(
      'Acceptă termenii',
    );
    expect(f.netopia.start).not.toHaveBeenCalled();
  });

  it('uses the administrator-selected provider only for new checkouts', async () => {
    const f = await setup();
    await f.service.selectPaymentProvider(f.staff, {
      provider: 'stripe',
      environment: 'test',
    });
    await f.service.checkout({
      periodId: f.period.id,
      identifier: 'AT36805',
      plan: 'normal',
      acceptUnverified: true,
      acceptTerms: true,
      attemptToken: 's'.repeat(43),
    });
    expect(f.stripe.start).toHaveBeenCalledTimes(1);
    expect(f.netopia.start).not.toHaveBeenCalled();
    expect(f.rows.find((row) => row.table === 'checkout')?.provider).toBe(
      'stripe',
    );
    await expect(f.service.catalog()).resolves.toMatchObject({
      activeProvider: 'stripe',
      environment: 'test',
      cardEnabled: true,
    });
  });

  it('keeps prior encrypted revisions for callbacks after credential rotation', async () => {
    const f = await setup();
    await f.service.checkout({
      periodId: f.period.id,
      identifier: 'AT36805',
      plan: 'normal',
      acceptUnverified: true,
      acceptTerms: true,
      attemptToken: 'r'.repeat(43),
    });
    const checkout = f.rows.find((row) => row.table === 'checkout')!;
    const originalConfigId = checkout.providerConfigId;
    await f.service.configurePaymentProvider(f.staff, {
      provider: 'netopia',
      environment: 'sandbox',
      apiKey: 'ultra-secret-new-key',
      posSignature: 'new-pos',
      publicKey: 'new-certificate',
    });
    const original = f.rows.find((row) => row.id === originalConfigId);
    expect(original?.active).toBe(false);
    const callback = Buffer.from(
      JSON.stringify({
        order: { orderID: checkout.id },
        payment: {
          ntpID: 'ntp-test',
          amount: Number(checkout.amountBani) / 100,
          currency: 'RON',
          status: 3,
        },
      }),
    );
    await expect(
      f.service.notifyNetopia(callback, 'verified'),
    ).resolves.toEqual({ errorCode: 0 });
    expect(JSON.stringify(f.rows)).not.toContain('ultra-secret-new-key');
  });

  it('keeps provider configurations active independently by environment', async () => {
    const f = fixture();
    const sandbox = f.rows.find(
      (row) =>
        row.table === 'provider-config' &&
        row.provider === 'netopia' &&
        row.environment === 'sandbox',
    )!;
    await f.service.configurePaymentProvider(f.staff, {
      provider: 'netopia',
      environment: 'live',
      apiKey: 'live-key',
      posSignature: 'live-pos',
      publicKey: 'live-certificate',
    });
    expect(sandbox.active).toBe(true);
    expect(
      f.rows.find(
        (row) =>
          row.table === 'provider-config' &&
          row.provider === 'netopia' &&
          row.environment === 'live' &&
          row.active,
      ),
    ).toBeDefined();
  });

  it('deduplicates signed Stripe success events and keeps provider attribution', async () => {
    const f = await setup();
    await f.service.selectPaymentProvider(f.staff, {
      provider: 'stripe',
      environment: 'test',
    });
    await f.service.checkout({
      periodId: f.period.id,
      identifier: 'AT36805',
      plan: 'normal',
      acceptUnverified: true,
      acceptTerms: true,
      attemptToken: 't'.repeat(43),
    });
    const checkout = f.rows.find((row) => row.table === 'checkout')!;
    f.stripe.verify.mockReturnValue({
      checkoutId: checkout.id,
      providerId: 'cs_test_123',
      providerStatus: 'checkout.session.completed:paid',
      amountBani: checkout.amountBani,
      currency: 'RON',
      outcome: 'succeeded',
    });
    const raw = Buffer.from(
      JSON.stringify({
        id: 'evt_123',
        data: {
          object: {
            client_reference_id: checkout.id,
            metadata: { checkout_id: checkout.id },
          },
        },
      }),
    );
    await f.service.notifyStripe(raw, 'signed');
    await f.service.notifyStripe(raw, 'signed');
    expect(f.rows.filter((row) => row.table === 'receipt')).toHaveLength(1);
    expect(f.rows.find((row) => row.table === 'event')).toMatchObject({
      provider: 'stripe',
      providerStatus: 'checkout.session.completed:paid',
    });
  });

  it('allows retry after a proven pre-submission failure without recording a receipt', async () => {
    const f = await setup();
    f.netopia.start.mockRejectedValueOnce(
      new PaymentNotSubmittedException('Missing return origin'),
    );
    const body = {
      periodId: f.period.id,
      identifier: '36805',
      acceptTerms: true,
      attemptToken: 'd'.repeat(43),
    };
    await expect(f.service.checkout(body)).rejects.toThrow(
      'Missing return origin',
    );
    expect(f.rows.find((r) => r.table === 'checkout')?.state).toBe('failed');
    expect(f.rows.filter((r) => r.table === 'receipt')).toHaveLength(0);
    await expect(
      f.service.checkout({ ...body, attemptToken: 'e'.repeat(43) }),
    ).resolves.toMatchObject({ state: 'pending' });
  });

  it('rejects wrong-amount notifications and holds unknown checkout outcomes', async () => {
    const f = await setup();
    f.netopia.start.mockRejectedValueOnce(new Error('Lost response'));
    const body = {
      periodId: f.period.id,
      identifier: '36805',
      plan: 'normal',
      acceptUnverified: true,
      acceptTerms: true,
      attemptToken: 'b'.repeat(43),
    };
    await expect(f.service.checkout(body)).rejects.toThrow(
      'Inițiere neconfirmată',
    );
    await expect(f.service.checkout(body)).resolves.toMatchObject({
      state: 'unknown',
    });
    expect(f.netopia.start).toHaveBeenCalledTimes(1);
    const checkout = f.rows.find((r) => r.table === 'checkout')!;
    await expect(
      f.service.notifyNetopia(
        Buffer.from(
          JSON.stringify({
            order: { orderID: checkout.id },
            payment: {
              ntpID: 'ntp-test',
              amount: 1,
              currency: 'RON',
              status: 3,
            },
          }),
        ),
        'verified',
      ),
    ).rejects.toThrow('nu corespunde');
    expect(f.rows.filter((r) => r.table === 'receipt')).toHaveLength(0);
  });

  it('reconciles refunds before recording the processor payout', async () => {
    const f = await setup();
    const checkout = f.em.create('checkout', {
      periodId: f.period.id,
      tokenHash: 'refund-test',
      identifier: 'AT36805',
      identifierKind: 'card_id',
      plan: 'normal',
      amountBani: 30000,
      provider: 'netopia',
      environment: 'sandbox',
      state: 'succeeded',
      reviewRequired: true,
    });
    f.em.persist(checkout);
    const receipt = f.em.create('receipt', {
      periodId: f.period.id,
      checkoutId: checkout.id,
      amountBani: 30000,
      refundedBani: 0,
      payoutId: null,
      method: 'card',
      receivedOn: '2026-09-21',
      note: 'NETOPIA',
      reference: 'ntp-refund',
      reviewRequired: true,
    });
    f.em.persist(receipt);

    await f.service.reconcileReceipt(f.staff, receipt.id, {
      refundedBani: 5000,
      note: 'Refund verified in NETOPIA',
    });
    expect(receipt).toMatchObject({
      refundedBani: 5000,
      reviewRequired: false,
    });
    await expect(
      f.service.recordPayout(f.staff, {
        receiptIds: [receipt.id],
        reference: 'payout-1',
        receivedOn: '2026-09-24',
        chargesBani: 400,
        netBani: 24600,
        note: 'Settlement statement',
      }),
    ).resolves.toMatchObject({
      grossBani: 30000,
      refundedBani: 5000,
      chargesBani: 400,
      netBani: 24600,
    });
    expect(receipt.payoutId).toBeTruthy();
  });

  it('requires evidence before staff closes an unknown checkout', async () => {
    const f = await setup();
    const checkout = f.em.create('checkout', {
      periodId: f.period.id,
      tokenHash: 'unknown-test',
      createdAt: new Date(Date.now() - 300000),
      identifier: '36805',
      identifierKind: 'orgo_id',
      plan: 'normal',
      amountBani: 30000,
      provider: 'netopia',
      environment: 'sandbox',
      state: 'unknown',
    });
    f.em.persist(checkout);
    await expect(
      f.service.closeAttempt(f.staff, checkout.id, {
        evidence: 'Verified in NETOPIA dashboard: no matching transaction',
      }),
    ).resolves.toEqual({ success: true });
    expect(checkout.state).toBe('failed');
  });

  it('staff expires abandoned Stripe sessions, audits the actor and restores the current unpaid tariff', async () => {
    const f = await setup();
    await f.service.selectPaymentProvider(f.staff, {
      provider: 'stripe',
      environment: 'test',
    });
    const body = {
      periodId: f.period.id,
      identifier: 'AT36805',
      acceptTerms: true,
      attemptToken: 'a'.repeat(43),
      amountBani: 30000,
    };
    await f.service.checkout(body);
    const checkout = f.rows.find((row) => row.table === 'checkout')!;
    checkout.createdAt = new Date(Date.now() - 300000);
    await f.service.configureProcessingFee(f.staff, {
      provider: 'stripe',
      percentageBasisPoints: 150,
      fixedBani: 100,
    });
    await f.service.closeAttempt(f.staff, checkout.id, {
      evidence: 'Member abandoned the link',
    });
    expect(f.stripe.expireUnpaid).toHaveBeenCalledWith(
      'cs_test_123',
      checkout.id,
      30000,
      expect.objectContaining({ environment: 'test' }),
    );
    expect(checkout).toMatchObject({ state: 'failed', paymentUrl: null });
    expect(f.obligation.totalBani).toBe(31000);
    const audit = f.rows.find(
      (row) =>
        row.table === 'audit' &&
        row.action === 'membership.checkout.manually_closed',
    );
    expect(audit?.actorId).toBe(f.staff.id);
    expect(audit?.metadata).toMatchObject({ stripeExpirationVerified: true });
  });

  it('staff cancellation refuses non-staff, recent submissions, confirmed receipts and expiration failures', async () => {
    const f = await setup();
    await f.service.selectPaymentProvider(f.staff, {
      provider: 'stripe',
      environment: 'test',
    });
    await f.service.checkout({
      periodId: f.period.id,
      identifier: 'AT36805',
      acceptTerms: true,
      attemptToken: 'a'.repeat(43),
      amountBani: 30000,
    });
    const checkout = f.rows.find((row) => row.table === 'checkout')!;
    const evidence = { evidence: 'Cancel abandoned payment' };
    await expect(
      f.service.closeAttempt({ ...f.staff, roles: [] }, checkout.id, evidence),
    ).rejects.toThrow();
    await expect(
      f.service.closeAttempt(f.staff, checkout.id, evidence),
    ).rejects.toThrow('Inițiere recentă');
    expect(f.stripe.expireUnpaid).not.toHaveBeenCalled();
    checkout.createdAt = new Date(Date.now() - 300000);
    f.stripe.expireUnpaid.mockRejectedValueOnce(
      new Error('Stripe payment already submitted'),
    );
    await expect(
      f.service.closeAttempt(f.staff, checkout.id, evidence),
    ).rejects.toThrow('already submitted');
    expect(checkout.state).toBe('pending');
    f.em.persist(f.em.create('receipt', { checkoutId: checkout.id }));
    await expect(
      f.service.closeAttempt(f.staff, checkout.id, evidence),
    ).rejects.toThrow('Încasare deja confirmată');
    expect(f.stripe.expireUnpaid).toHaveBeenCalledTimes(1);
  });

  it('staff cancellation preserves a success that arrives during Stripe expiration', async () => {
    const f = await setup();
    await f.service.selectPaymentProvider(f.staff, {
      provider: 'stripe',
      environment: 'test',
    });
    await f.service.checkout({
      periodId: f.period.id,
      identifier: 'AT36805',
      acceptTerms: true,
      attemptToken: 'a'.repeat(43),
      amountBani: 30000,
    });
    const checkout = f.rows.find((row) => row.table === 'checkout')!;
    checkout.createdAt = new Date(Date.now() - 300000);
    f.stripe.expireUnpaid.mockImplementationOnce(() => {
      checkout.state = 'succeeded';
      return Promise.resolve();
    });
    await expect(
      f.service.closeAttempt(f.staff, checkout.id, {
        evidence: 'Cancel abandoned link',
      }),
    ).rejects.toThrow('nu este în așteptare');
    expect(checkout.state).toBe('succeeded');
  });
});
