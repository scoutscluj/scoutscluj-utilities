import type { EntityManager } from '@mikro-orm/postgresql';
import { ScoutMember } from './entities/member.entity';

export async function collectionAllowed(
  em: EntityManager,
  orgoId: number,
  startsOn: string,
) {
  const member = await em.findOne(ScoutMember, { orgoId });
  return (
    !member ||
    (member.status === 'active' &&
      (!member.feeResumePeriod || startsOn >= member.feeResumePeriod))
  );
}
