import 'reflect-metadata';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { MikroORM, type EntityManager } from '@mikro-orm/postgresql';
import { ConfigService } from '@nestjs/config';
import { createMikroOrmOptions } from '../src/config/database.config';
import { Activity } from '../src/modules/activities/entities/activity.entity';
import { ActivityType } from '../src/modules/activities/entities/activity-type.enum';
import { User } from '../src/modules/users/entities/user.entity';
import { UserRole } from '../src/modules/users/entities/user-role.enum';
import { ScoutMember } from '../src/modules/members/entities/member.entity';
import { emptyProfile } from '../src/modules/members/member.types';
import type { MembersService } from '../src/modules/members/members.service';
import type { CurrentUser } from '../src/modules/users/users.types';
import { AdultDocument } from '../src/modules/adult-documents/entities/adult-document.entity';
import { scoutingYear } from '../src/modules/adult-documents/adult-documents.rules';
import { RegistrationService } from '../src/modules/activity-registrations/registration.service';
import { RegistrationPaymentsService } from '../src/modules/activity-registrations/registration-payments.service';
import {
  ActivityRegistration,
  ActivityRegistrationEntry,
  ActivityRegistrationSettings,
  ActivityRegistrationCheckout,
  ActivityRegistrationDocument,
} from '../src/modules/activity-registrations/registration.entity';
import { defaultSettings } from '../src/modules/activity-registrations/registration.rules';
import { ParentalConsentPublication } from '../src/modules/parental-consent/entities/parental-consent-publication.entity';
import { ParentalConsentTemplateVersion } from '../src/modules/parental-consent/entities/parental-consent-template-version.entity';
import {
  ParentalConsentPublicationStatus,
  ParentalConsentTemplateStatus,
} from '../src/modules/parental-consent/entities/parental-consent.enums';
import type { ParentalConsentService } from '../src/modules/parental-consent/parental-consent.service';
import {
  MembershipPaymentSettings,
  MembershipPaymentProviderConfig,
  MembershipObligation,
} from '../src/modules/membership/entities/membership.entity';
import { StripeService } from '../src/modules/membership/stripe.service';
import type { NetopiaService } from '../src/modules/membership/netopia.service';
import type { PaymentConfigurationService } from '../src/modules/membership/payment-configuration.service';
import { PaymentCallbacksService } from '../src/modules/membership/payment-callbacks.service';
import {
  createRepresentativeOrganizerDraft,
  defaultLayoutSettings,
  participationTemplate,
  emptyFixedConsent,
} from '@scouts-cluj/parental-consent-schema';

// Opt-in only; refuse any real or ambiguous database target.
const target = new URL(
  process.env.ACTIVITY_REGISTRATION_TEST_DATABASE_URL ??
    'postgresql://postgres@127.0.0.1:55437/activity_registration_test',
);
assert.equal(target.hostname, '127.0.0.1');
assert.equal(target.port, process.env.CI === 'true' ? '5432' : '55437');
assert.equal(target.pathname, '/activity_registration_test');
const config = new ConfigService({ WEB_ORIGIN: 'https://example.test' });
const members = {
  access: (_em: EntityManager, actor: CurrentUser) =>
    Promise.resolve({
      detail: actor.id !== 99999,
      sensitive: actor.roles.includes(UserRole.SuperAdmin),
    }),
} as unknown as MembersService;
const consent = {
  renderRegistration: () =>
    Promise.resolve(Buffer.from('%PDF-1.7\nimmutable registration test')),
} as unknown as ParentalConsentService;
const make = (em: EntityManager) =>
  new RegistrationService(em, members, consent, config);

async function main() {
  const options = createMikroOrmOptions();
  const orm = await MikroORM.init({
    ...options,
    migrations: { ...options.migrations, snapshot: false },
    clientUrl: target.href,
    debug: false,
  });
  try {
    await orm.migrator.up();
    const em = orm.em.fork();
    const user = em.create(User, {
      displayName: 'Synthetic coordinator',
      roles: [UserRole.SuperAdmin],
    });
    em.persist(user);
    await em.flush();
    const medicalUser = em.create(User, {
      displayName: 'Synthetic medical',
      roles: [],
    });
    em.persist(medicalUser);
    await em.flush();
    const actor: CurrentUser = {
      id: user.id,
      displayName: user.displayName,
      roles: [UserRole.SuperAdmin],
    };
    const activity = em.create(Activity, {
      coordinatorId: user.id,
      title: `Integration ${randomUUID()}`,
      type: ActivityType.Camp,
      startDate: new Date('2027-08-24T07:00:00Z'),
      endDate: new Date('2027-08-28T07:00:00Z'),
    });
    em.persist(activity);
    const roster = [1, 2, 3].map((index) =>
      em.create(ScoutMember, {
        orgoId: 88000 + user.id * 10 + index,
        name: `Synthetic member ${index}`,
        birthDate: '2016-04-12',
        structureId: 'cluj',
        structureConfirmed: true,
        branch: 'lupisori',
        category: 'lupisori',
        profile: {
          ...emptyProfile(),
          medical: 'Restricted medical information',
          parentName: 'Synthetic parent',
          parentEmail: 'parent@example.test',
        },
      }),
    );
    em.persist(roster);
    await em.flush();
    const template = em.create(ParentalConsentTemplateVersion, {
      version: 1000 + user.id,
      name: 'Synthetic',
      status: ParentalConsentTemplateStatus.Draft,
      schemaVersion: 1,
      document: participationTemplate,
      layout: defaultLayoutSettings,
    });
    em.persist(template);
    await em.flush();
    const draft = createRepresentativeOrganizerDraft();
    const publication = em.create(ParentalConsentPublication, {
      reference: randomUUID().replaceAll('-', '').slice(0, 16),
      activityId: activity.id,
      status: ParentalConsentPublicationStatus.Active,
      templateVersionId: template.id,
      draftRevision: 1,
      draftSnapshot: draft,
      organizationSnapshot: {
        name: 'Synthetic center',
        address: 'Test',
        email: 'test@example.test',
        phone: '0700000000',
      },
      templateSnapshot: {
        id: template.id,
        version: template.version,
        name: template.name,
        schemaVersion: 1,
        document: participationTemplate,
        layout: defaultLayoutSettings,
      },
      publishedById: user.id,
    });
    em.persist(publication);
    await em.flush();
    const service = make(orm.em.fork());
    await service.saveSettings(actor, activity.id, {
      revision: 0,
      data: {
        ...defaultSettings(),
        published: true,
        feeBani: 50000,
        totalCapacity: 1,
      },
    });
    const answers = {
      participant_name: 'Declared name',
      birth_date: '2016-04-12',
      guardian_name: 'Synthetic parent',
      guardian_relation: 'mother',
      guardian_phone: '0700000000',
      emergency_name: 'Emergency contact',
      emergency_phone: '0700000001',
      transport: 'branch',
      treatment: 'call_first',
      medical_notes: 'Declared medical answer',
      acknowledgement: true,
    };
    const enroll = (index: number) =>
      make(orm.em.fork()).register(activity.id, {
        identifier: String(roster[index].orgoId),
        email: 'parent@example.test',
        answers,
      });
    const results = await Promise.all([enroll(0), enroll(1)]);
    assert.equal(results.filter((r) => r.state === 'accepted').length, 1);
    assert.equal(results.filter((r) => r.state === 'waitlisted').length, 1);
    await assert.rejects(enroll(0), /Există deja o înscriere/);
    console.log(
      'PASS concurrent last-place reservation and duplicate-member protection',
    );
    const first = results.find((r) => r.state === 'accepted')!;
    const waiting = results.find((r) => r.state === 'waitlisted')!;
    const publicResult = await service.publicPage(activity.id);
    assert(!JSON.stringify(publicResult).includes('Restricted medical'));
    const deniedPrefill = await service.prefill(
      { id: 99999, displayName: 'Other', roles: [] },
      { identifier: String(roster[0].orgoId) },
    );
    assert.deepEqual(Object.keys(deniedPrefill.answers), ['participant_name']);
    const contactPrefill = await service.prefill(
      { id: medicalUser.id, displayName: 'Other', roles: [] },
      { identifier: String(roster[0].orgoId) },
    );
    assert(!Object.hasOwn(contactPrefill.answers, 'medical_notes'));
    await assert.rejects(
      service.ownDetail(activity.id, first.id, {
        id: 99999,
        displayName: 'Other',
        roles: [],
      }),
    );
    console.log(
      'PASS public/private profile separation and personal-link authorization',
    );
    const firstRow = await em.findOneOrFail(
      ActivityRegistration,
      { id: first.id },
      { refresh: true },
    );
    await service.update(
      activity.id,
      first.id,
      {
        action: 'receipt',
        revision: firstRow.revision,
        method: 'support',
        amountBani: 10000,
        receivedOn: '2026-10-27',
        note: 'Synthetic center support',
      },
      actor,
    );
    let fresh = await orm.em
      .fork()
      .findOneOrFail(ActivityRegistration, { id: first.id });
    await make(orm.em.fork()).update(
      activity.id,
      first.id,
      {
        action: 'receipt',
        revision: fresh.revision,
        method: 'bank',
        amountBani: 5000,
        receivedOn: '2026-10-27',
        note: 'Synthetic bank transfer',
      },
      actor,
    );
    fresh = await orm.em
      .fork()
      .findOneOrFail(ActivityRegistration, { id: first.id });
    const balance = await make(orm.em.fork()).balance(fresh);
    assert.equal(balance.remainingBani, 35000);
    assert.equal(balance.cashBani, 5000);
    assert.equal(balance.supportBani, 10000);
    console.log(
      'PASS independently recorded center support and manual bank collection',
    );
    const settings = await em.findOneOrFail(
      ActivityRegistrationSettings,
      { activityId: activity.id },
      { refresh: true },
    );
    settings.data = { ...settings.data, medicalUserIds: [medicalUser.id] };
    await em.flush();
    const medicalView = await make(orm.em.fork()).ownDetail(
      activity.id,
      first.id,
      { id: medicalUser.id, displayName: 'Medical', roles: [] },
    );
    assert(!Object.hasOwn(medicalView, 'totalBani'));
    assert(!Object.hasOwn(medicalView, 'entries'));
    assert(Object.hasOwn(medicalView, 'answers'));
    console.log(
      'PASS medical-only access does not expose the financial ledger',
    );
    const generated = await make(orm.em.fork()).generate(
      activity.id,
      first.id,
      first.managementToken,
    );
    const bytes = await make(orm.em.fork()).file(
      activity.id,
      first.id,
      generated.id,
      first.managementToken,
    );
    assert.equal(
      Buffer.from(bytes.data).toString(),
      '%PDF-1.7\nimmutable registration test',
    );
    fresh = await orm.em
      .fork()
      .findOneOrFail(ActivityRegistration, { id: first.id });
    await make(orm.em.fork()).editAnswers(
      activity.id,
      first.id,
      {
        revision: fresh.revision,
        answers: { ...answers, medical_notes: 'Updated declared answer' },
      },
      first.managementToken,
    );
    const newer = await make(orm.em.fork()).generate(
      activity.id,
      first.id,
      first.managementToken,
    );
    assert.notEqual(newer.id, generated.id);
    assert.equal(
      await em.count(ActivityRegistrationDocument, {
        registrationId: first.id,
        kind: 'generated',
      }),
      2,
    );
    await assert.rejects(
      make(orm.em.fork()).upload(
        activity.id,
        first.id,
        {
          filename: 'old.pdf',
          contentType: 'application/pdf',
          contentBase64: Buffer.from('%PDF-1.7\nsigned').toString('base64'),
          sourceDocumentId: generated.id,
        },
        first.managementToken,
      ),
      /Descarcă mai întâi acordul actual/,
    );
    console.log(
      'PASS immutable generated versions and rejection of signatures on outdated answers',
    );
    await em.nativeUpdate(
      MembershipPaymentProviderConfig,
      { active: true },
      { active: false },
    );
    const providerConfig = em.create(MembershipPaymentProviderConfig, {
      provider: 'stripe',
      environment: 'test',
      encryptedConfiguration: 'synthetic-not-a-real-secret',
      secretHint: 'test',
      updatedBy: user.id,
    });
    em.persist(providerConfig);
    let paymentSettings = await em.findOne(MembershipPaymentSettings, {
      id: 'membership',
    });
    if (!paymentSettings)
      paymentSettings = em.create(MembershipPaymentSettings, {
        id: 'membership',
        activeProvider: 'stripe',
        activeEnvironment: 'test',
      });
    paymentSettings.activeProvider = 'stripe';
    paymentSettings.activeEnvironment = 'test';
    em.persist(paymentSettings);
    await em.flush();
    const stripeConfig = {
      provider: 'stripe' as const,
      environment: 'test' as const,
      secretKey: 'sk_test_synthetic',
      webhookSecret: 'whsec_synthetic',
    };
    const configuration = {
      activeRevision: () =>
        Promise.resolve({
          id: providerConfig.id,
          configuration: stripeConfig,
        }),
      getRevision: () => Promise.resolve(stripeConfig),
    } as unknown as PaymentConfigurationService;
    const stripe = new StripeService(config);
    stripe.start = () =>
      Promise.resolve({
        providerId: 'cs_test_synthetic',
        paymentUrl: 'https://checkout.stripe.com/c/pay/synthetic',
      });
    const payments = () =>
      new RegistrationPaymentsService(
        orm.em.fork(),
        make(orm.em.fork()),
        configuration,
        {} as NetopiaService,
        stripe,
        new PaymentCallbacksService(),
      );
    const waitingRow = await em.findOneOrFail(
      ActivityRegistration,
      { id: waiting.id },
      { refresh: true },
    );
    await assert.rejects(
      payments().checkout(activity.id, {
        identifier: String(waitingRow.orgoId),
        acceptTerms: true,
        amountBani: 50000,
        full: true,
      }),
      /loc disponibil/,
    );
    await payments().checkout(activity.id, {
      identifier: String(fresh.orgoId),
      acceptTerms: true,
      amountBani: 35000,
      full: true,
    });
    const attempt = await em.findOneOrFail(ActivityRegistrationCheckout, {
      registrationId: first.id,
    });
    assert.equal(attempt.amountBani, 35000);
    const raw = Buffer.from(
      JSON.stringify({
        livemode: false,
        type: 'checkout.session.completed',
        data: {
          object: {
            object: 'checkout.session',
            id: 'cs_test_synthetic',
            client_reference_id: attempt.id,
            metadata: { checkout_id: attempt.id },
            amount_total: 35000,
            currency: 'ron',
            payment_status: 'paid',
          },
        },
      }),
    );
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = `t=${timestamp},v1=${createHmac('sha256', stripeConfig.webhookSecret).update(`${timestamp}.${raw.toString()}`).digest('hex')}`;
    await assert.rejects(payments().notification('stripe', raw, 'invalid'));
    await Promise.all([
      payments().notification('stripe', raw, signature),
      payments().notification('stripe', raw, signature),
    ]);
    assert.equal(
      await em.count(ActivityRegistrationEntry, { checkoutId: attempt.id }),
      1,
    );
    assert.equal(await em.count(MembershipObligation, {}), 0);
    fresh = await orm.em
      .fork()
      .findOneOrFail(ActivityRegistration, { id: first.id });
    assert.equal((await make(orm.em.fork()).balance(fresh)).remainingBani, 0);
    console.log(
      'PASS verified concurrent Stripe callbacks credit once and do not create membership obligations',
    );
    const settingsForFamily = await orm.em
      .fork()
      .findOneOrFail(ActivityRegistrationSettings, { activityId: activity.id });
    await make(orm.em.fork()).saveSettings(actor, activity.id, {
      revision: settingsForFamily.revision,
      data: {
        ...settingsForFamily.data,
        totalCapacity: 4,
        familyFees: [50000, 40000, 30000],
      },
    });
    const waitingFresh = await orm.em
      .fork()
      .findOneOrFail(ActivityRegistration, { id: waiting.id });
    await make(orm.em.fork()).update(
      activity.id,
      waiting.id,
      { revision: waitingFresh.revision, action: 'accept' },
      actor,
    );
    await make(orm.em.fork()).family(
      activity.id,
      {
        registrationIds: [first.id, waiting.id],
        note: 'Synthetic confirmed siblings',
      },
      actor,
    );
    const discounted = await orm.em
      .fork()
      .findOneOrFail(ActivityRegistration, { id: waiting.id });
    assert.equal(discounted.totalBani, 40000);
    assert.equal(
      (
        await orm.em
          .fork()
          .findOneOrFail(ActivityRegistration, { id: first.id })
      ).totalBani,
      50000,
    );
    await make(orm.em.fork()).update(
      activity.id,
      waiting.id,
      { revision: discounted.revision, action: 'withdraw' },
      actor,
    );
    assert.equal(
      (
        await orm.em
          .fork()
          .findOneOrFail(ActivityRegistration, { id: waiting.id })
      ).totalBani,
      40000,
    );
    await make(orm.em.fork()).family(
      activity.id,
      {
        registrationIds: [first.id],
        note: 'Synthetic explicit review after withdrawal',
      },
      actor,
    );
    assert.equal(
      await em.count(ActivityRegistrationEntry, { checkoutId: attempt.id }),
      1,
    );
    console.log(
      'PASS explicit family pricing and withdrawal preserve existing receipts and prices',
    );
    let refundRow = await orm.em
      .fork()
      .findOneOrFail(ActivityRegistration, { id: first.id });
    await make(orm.em.fork()).update(
      activity.id,
      first.id,
      {
        revision: refundRow.revision,
        action: 'plan_refund',
        amountBani: 5000,
        note: 'Synthetic approved reimbursement',
      },
      actor,
    );
    refundRow = await orm.em
      .fork()
      .findOneOrFail(ActivityRegistration, { id: first.id });
    assert.equal(
      (await make(orm.em.fork()).balance(refundRow)).refundRemainingBani,
      5000,
    );
    await make(orm.em.fork()).update(
      activity.id,
      first.id,
      {
        revision: refundRow.revision,
        action: 'receipt',
        method: 'refund',
        amountBani: 2500,
        note: 'Synthetic completed partial reimbursement',
        receivedOn: '2026-10-27',
      },
      actor,
    );
    refundRow = await orm.em
      .fork()
      .findOneOrFail(ActivityRegistration, { id: first.id });
    assert.equal(
      (await make(orm.em.fork()).balance(refundRow)).refundRemainingBani,
      2500,
    );
    assert.equal(
      await em.count(ActivityRegistrationEntry, { checkoutId: attempt.id }),
      1,
    );
    console.log(
      'PASS planned refunds remain separate from completed reimbursement and card receipts',
    );
    const staff = em.create(ScoutMember, {
      orgoId: 99000 + user.id,
      name: 'Synthetic adult',
      birthDate: '1990-01-01',
      category: 'lideri',
      profile: emptyProfile(),
      structureConfirmed: true,
    });
    em.persist(staff);
    await em.flush();
    const staffInput = { identifier: String(staff.orgoId), role: 'staff' };
    await assert.rejects(
      make(orm.em.fork()).register(activity.id, staffInput),
      /Certificatul/,
    );
    const certificate = em.create(AdultDocument, {
      memberId: staff.id,
      year: scoutingYear(activity.startDate!),
      kind: 'behavioural_integrity',
      version: 1,
      status: 'validated',
      filename: 'synthetic.pdf',
      contentType: 'application/pdf',
      size: 10,
      uploaderId: user.id,
      reviewerId: user.id,
      reviewedAt: new Date(),
    });
    em.persist(certificate);
    await em.flush();
    const confirmed = await make(orm.em.fork()).register(
      activity.id,
      staffInput,
    );
    const staffRow = await em.findOneOrFail(ActivityRegistration, {
      id: confirmed.id,
    });
    assert.equal(staffRow.totalBani, 0);
    assert.equal(staffRow.consentState, 'not_required');
    console.log(
      'PASS adult-staff certificate gate without fee, agreement or additional form',
    );
    const fixedActivity = em.create(Activity, {
      coordinatorId: user.id,
      title: `Fixed ${randomUUID()}`,
      type: ActivityType.Camp,
      startDate: new Date('2027-08-24'),
      endDate: new Date('2027-08-28'),
      location: 'Synthetic location',
    });
    em.persist(fixedActivity);
    await em.flush();
    const fixedSettings = {
      ...defaultSettings(),
      published: true,
      consent: Object.fromEntries(
        Object.keys(emptyFixedConsent()).map((key) => [
          key,
          `Synthetic ${key}`,
        ]),
      ),
    };
    await make(orm.em.fork()).saveSettings(actor, fixedActivity.id, {
      revision: 0,
      data: fixedSettings,
    });
    const fixedRegistration = await make(orm.em.fork()).register(
      fixedActivity.id,
      {
        identifier: String(roster[0].orgoId),
        role: 'beneficiary',
        email: 'parent@example.test',
        answers: { ...answers, medical_relevant: 'no' },
      },
    );
    const fixedRow = await orm.em
      .fork()
      .findOneOrFail(ActivityRegistration, { id: fixedRegistration.id });
    const fixedPublication = await orm.em
      .fork()
      .findOneOrFail(ParentalConsentPublication, {
        id: fixedRow.consentPublicationId!,
      });
    assert.equal(
      fixedPublication.templateSnapshot.document.fixedFormat,
      'participation-2026',
    );
    assert.equal(fixedRow.consentState, 'awaiting');
    await make(orm.em.fork()).saveSettings(actor, fixedActivity.id, {
      revision: 1,
      data: fixedSettings,
    });
    assert.equal(
      await orm.em
        .fork()
        .count(ParentalConsentPublication, { activityId: fixedActivity.id }),
      1,
    );
    await make(orm.em.fork()).saveSettings(actor, fixedActivity.id, {
      revision: 2,
      data: {
        ...fixedSettings,
        consent: {
          ...fixedSettings.consent,
          outboundTransport: 'Changed transport',
        },
      },
    });
    assert.equal(
      await orm.em
        .fork()
        .count(ParentalConsentPublication, { activityId: fixedActivity.id }),
      2,
    );
    assert.equal(
      (
        await orm.em
          .fork()
          .findOneOrFail(ActivityRegistration, { id: fixedRow.id })
      ).consentPublicationId,
      fixedPublication.id,
    );
    assert.equal(
      (
        await orm.em.fork().findOneOrFail(ParentalConsentPublication, {
          id: fixedPublication.id,
        })
      ).draftSnapshot.fixedDetails?.outboundTransport,
      'Synthetic outboundTransport',
    );
    const memberActor = {
      ...actor,
      id: medicalUser.id,
      roles: [],
      orgoConnection: { orgoUserId: roster[0].orgoId! },
    } as CurrentUser;
    assert(
      (await make(orm.em.fork()).eligibleActivities(memberActor)).some(
        (item) => item.id === fixedActivity.id,
      ),
    );
    console.log(
      'PASS fixed agreement without template draft, stable publications and immutable participant snapshot',
    );
  } finally {
    await orm.close(true);
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
