import type { EntityManager } from '@mikro-orm/postgresql';
import { ScoutMember, MemberFamilyLink } from './entities/member.entity';

export async function collectionAllowed(
  em: EntityManager,
  orgoId: number,
  startsOn: string,
) {
  const member = await em.findOne(ScoutMember, { orgoId });
  const family = member
    ? await em.findOne(MemberFamilyLink, { memberId: member.id })
    : null;
  if (family?.sourceApplicationId && family.plan && !family.priceConfirmedAt)
    return false;
  return (
    !member ||
    (member.status === 'active' &&
      (!member.feeResumePeriod || startsOn >= member.feeResumePeriod))
  );
}
