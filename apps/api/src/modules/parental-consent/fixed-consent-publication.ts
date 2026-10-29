import type { EntityManager } from '@mikro-orm/postgresql';
import { randomBytes } from 'node:crypto';
import {
  branchCodes,
  canonicalJson,
  createEmptyOrganizerDraft,
  defaultLayoutSettings,
  type FixedConsentDetails,
} from '@scouts-cluj/parental-consent-schema';
import type { Activity } from '../activities/entities/activity.entity';
import { ParentalConsentPublication as Publication } from './entities/parental-consent-publication.entity';
import { ParentalConsentTemplateVersion as Template } from './entities/parental-consent-template-version.entity';
import {
  ParentalConsentPublicationStatus,
  ParentalConsentTemplateStatus,
} from './entities/parental-consent.enums';

export async function publishFixedConsent(
  tx: EntityManager,
  activity: Activity,
  details: FixedConsentDetails,
  actorId: number,
  revision: number,
  unitActivities?: Record<string, string>,
  eligibleBranches?: string[],
) {
  const draft = createEmptyOrganizerDraft();
  const date = (value: Date | string | undefined | null) =>
    value instanceof Date ? value.toISOString().slice(0, 10) : (value ?? '');
  draft.general = {
    title: activity.title,
    location: activity.location ?? '',
    address: '',
    startDate: date(activity.startDate),
    endDate: date(activity.endDate ?? activity.startDate),
    emergencyContactName: details.coordinators,
    emergencyContactPhone: '',
  };
  draft.fixedDetails = structuredClone(details);
  if (unitActivities !== undefined)
    draft.unitActivities = structuredClone(unitActivities);
  for (const branch of branchCodes)
    draft.branches[branch] = {
      enabled: !eligibleBranches || eligibleBranches.includes(branch),
      startDate: draft.general.startDate,
      endDate: draft.general.endDate,
      activities: [
        details.commonActivities,
        details.specificActivities,
        details.activityNotes,
      ].flatMap((value) =>
        value
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      ),
      equipment: details.equipment.split('\n').filter(Boolean),
      outboundTransport: details.outboundTransport,
      returnTransport: details.returnTransport,
      pickupDetails: details.communication,
    };
  draft.firstAid = {
    responsiblePeople: details.firstAidPeople.split('\n'),
    facility: details.medicalFacilities,
    details: '',
  };
  const current = await tx.findOne(Publication, {
    activityId: activity.id,
    status: ParentalConsentPublicationStatus.Active,
  });
  if (
    current?.templateSnapshot.document.fixedFormat === 'participation-2026' &&
    canonicalJson(current.draftSnapshot) === canonicalJson(draft)
  )
    return;
  await tx.execute('select pg_advisory_xact_lock(28102026)');
  const name = 'Format fix de participare 2026';
  let template = await tx.findOne(Template, { name });
  if (!template) {
    const latest = await tx.findOne(
      Template,
      { id: { $gt: 0 } },
      { orderBy: { version: 'desc' } },
    );
    template = tx.create(Template, {
      version: (latest?.version ?? 0) + 1,
      name,
      status: ParentalConsentTemplateStatus.Draft,
      schemaVersion: 1,
      document: { type: 'doc', fixedFormat: 'participation-2026', content: [] },
      layout: structuredClone(defaultLayoutSettings),
      createdById: actorId,
    });
    tx.persist(template);
  }
  if (current) {
    current.status = ParentalConsentPublicationStatus.Archived;
    current.archivedAt = new Date();
  }
  await tx.flush();
  const publication = tx.create(Publication, {
    reference: randomBytes(8).toString('hex'),
    activityId: activity.id,
    status: ParentalConsentPublicationStatus.Active,
    templateVersionId: template.id,
    draftRevision: revision,
    draftSnapshot: draft,
    organizationSnapshot: {
      name: 'Scouts Cluj',
      legalName:
        'Asociația Organizația Națională „Cercetașii României” - Filiala Cluj',
      address: '',
      email: 'contact@scout.ro',
      phone: '',
    },
    templateSnapshot: {
      id: template.id,
      version: template.version,
      name,
      schemaVersion: 1,
      document: structuredClone(template.document),
      layout: structuredClone(template.layout),
    },
    publishedById: actorId,
  });
  tx.persist(publication);
}
