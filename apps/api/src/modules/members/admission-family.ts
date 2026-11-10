import { createHash, randomUUID } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import { membershipPeriodFor } from '../membership/membership.rules';
import { MemberFamilyLink } from './entities/member.entity';

export type FamilyMember = {
  id: string;
  name: string;
  unitId: string | null;
  status: string;
  revision: number;
  createdAt: string;
  feeResumePeriod: string | null;
  familyId: string | null;
  ordinal: number | null;
  reserved: boolean;
  feePaying?: boolean;
};
type Scope = { admin: boolean; unitIds: string[] };
type Application = {
  id: string;
  revision: number;
  memberId?: string | null;
  data: { guardianEmail?: string };
};

export function familyDecision(
  application: Application,
  members: FamilyMember[],
  scope: Scope,
  selected?: string,
  now = new Date(),
) {
  const email = application.data.guardianEmail?.trim().toLowerCase() ?? '';
  const period = membershipPeriodFor(now).startsOn;
  const all = members.filter((m) => m.id !== application.memberId);
  const groups = [
    ...new Set(all.map((m) => m.familyId).filter(Boolean)),
  ] as string[];
  const ambiguous = groups.length > 1;
  const familyId = ambiguous
    ? scope.admin && groups.includes(selected ?? '')
      ? selected!
      : null
    : (groups[0] ?? null);
  const candidates = ambiguous
    ? all.filter((m) => m.familyId === familyId || !m.familyId)
    : all;
  const eligible = candidates.filter(
    (m) =>
      ((m.status === 'active' && m.feePaying !== false) || m.reserved) &&
      (!m.feeResumePeriod || m.feeResumePeriod <= period),
  );
  const position = eligible.length + 1;
  const plan = email
    ? (`fam${Math.min(position, 3)}` as 'fam1' | 'fam2' | 'fam3')
    : null;
  const version = createHash('sha256')
    .update(
      JSON.stringify([
        application.id,
        application.revision,
        email,
        period,
        [...all].sort((a, b) => a.id.localeCompare(b.id)),
      ]),
    )
    .digest('hex');
  const visible = (m: FamilyMember) =>
    scope.admin || (!!m.unitId && scope.unitIds.includes(m.unitId));
  return {
    version,
    familyId,
    candidates,
    eligible,
    plan,
    ordinal: Math.max(0, ...candidates.map((m) => m.ordinal ?? 0)) + 1,
    preview: {
      version,
      plan: ambiguous ? null : plan,
      position: ambiguous ? null : position,
      ambiguous,
      requiresSelection: ambiguous,
      canSelect: scope.admin,
      count: ambiguous ? null : eligible.length,
      members: candidates.map((m) => ({
        name: visible(m) ? m.name : 'Membru din altă unitate',
        active: m.status === 'active',
        reserved: m.reserved,
      })),
      choices:
        scope.admin && ambiguous
          ? groups.map((id) => ({
              id,
              names: all.filter((m) => m.familyId === id).map((m) => m.name),
              position:
                all.filter(
                  (m) =>
                    m.familyId === id &&
                    ((m.status === 'active' && m.feePaying !== false) ||
                      m.reserved) &&
                    (!m.feeResumePeriod || m.feeResumePeriod <= period),
                ).length +
                all.filter(
                  (m) =>
                    !m.familyId &&
                    ((m.status === 'active' && m.feePaying !== false) ||
                      m.reserved) &&
                    (!m.feeResumePeriod || m.feeResumePeriod <= period),
                ).length +
                1,
            }))
          : [],
    },
  };
}

export async function admissionFamily(
  tx: EntityManager,
  application: Application,
  scope: Scope,
  selected?: string,
) {
  const email = application.data.guardianEmail?.trim().toLowerCase();
  const members = email
    ? await tx.execute<FamilyMember[]>(
        `
    with matched as (
      select m.id, l.family_id from scout_members m
      left join member_family_links l on l.member_id = m.id
      where lower(trim(m.profile->>'email')) = ? or lower(trim(m.orgo_profile->>'email')) = ?
        or lower(trim(m.profile->>'parentEmail')) = ?
        or exists(select 1 from member_guardians g where g.member_id=m.id and g.ended_at is null and lower(trim(g.email)) = ?)
    )
    select m.id, m.name, m.unit_id as "unitId", m.status, m.revision,
      m.created_at as "createdAt", m.fee_resume_period as "feeResumePeriod",
      l.family_id as "familyId", l.ordinal,
      (nullif(m.orgo_profile->>'feeTenantProductPrice','') is not null
       or exists(select 1 from membership_obligations o join membership_periods p on p.id=o.period_id
         where o.orgo_user_id=m.orgo_id and o.total_bani > 0 and p.starts_on = ?)) as "feePaying",
      exists(select 1 from member_applications a where a.id=l.source_application_id and a.state='approved' and m.status='review') as reserved
    from scout_members m left join member_family_links l on l.member_id=m.id
    where m.id in (select id from matched) or l.family_id in (select family_id from matched where family_id is not null)
    order by m.created_at, m.id`,
        [email, email, email, email, membershipPeriodFor(new Date()).startsOn],
      )
    : [];
  return familyDecision(application, members, scope, selected);
}

export function allocateAdmissionFamily(
  tx: EntityManager,
  decision: Awaited<ReturnType<typeof admissionFamily>>,
  memberId: string,
  applicationId: string,
  actorId: number,
) {
  if (!decision.plan) return;
  if (decision.preview.ambiguous && !decision.familyId)
    throw new ConflictException(
      'Emailul indică mai multe familii. Un administrator trebuie să aleagă familia la verificarea cererii.',
    );
  const familyId = decision.familyId ?? randomUUID();
  let ordinal = Math.max(0, ...decision.candidates.map((m) => m.ordinal ?? 0));
  for (const m of decision.candidates) {
    if (!m.familyId)
      tx.create(MemberFamilyLink, {
        memberId: m.id,
        familyId,
        ordinal: ++ordinal,
        actorId,
      });
  }
  tx.create(MemberFamilyLink, {
    memberId,
    familyId,
    ordinal: ++ordinal,
    sourceApplicationId: applicationId,
    plan: decision.plan,
    actorId,
  });
}
