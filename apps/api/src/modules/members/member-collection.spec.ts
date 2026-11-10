jest.mock('./entities/member.entity', () => ({
  ScoutMember: 'member',
  MemberFamilyLink: 'family-link',
}));
import type { EntityManager } from '@mikro-orm/postgresql';
import { collectionAllowed } from './member-collection';
describe('withdrawal-aware fee collection', () => {
  const em = (member: unknown) =>
    ({ findOne: () => Promise.resolve(member) }) as unknown as EntityManager;
  it('blocks collection until the new family price has been read back from Orgo', async () => {
    const link = {
      sourceApplicationId: 'request',
      plan: 'fam2',
      priceConfirmedAt: null as Date | null,
    };
    const db = {
      findOne: jest.fn((entity) =>
        Promise.resolve(
          entity === 'member' ? { id: 'child', status: 'active' } : link,
        ),
      ),
    } as unknown as EntityManager;
    expect(await collectionAllowed(db, 42, '2026-09-01')).toBe(false);
    link.priceConfirmedAt = new Date();
    expect(await collectionAllowed(db, 42, '2026-09-01')).toBe(true);
  });
  it('does not alter legacy members outside the operational register', async () => {
    expect(await collectionAllowed(em(null), 42, '2026-09-01')).toBe(true);
  });
  it('excludes all periods while withdrawn', async () => {
    expect(
      await collectionAllowed(em({ status: 'withdrawn' }), 42, '2026-09-01'),
    ).toBe(false);
  });
  it('collects only the return year and subsequent years, never old arrears', async () => {
    const db = em({ status: 'active', feeResumePeriod: '2026-09-01' });
    expect(await collectionAllowed(db, 42, '2025-09-01')).toBe(false);
    expect(await collectionAllowed(db, 42, '2026-09-01')).toBe(true);
    expect(await collectionAllowed(db, 42, '2027-09-01')).toBe(true);
  });
  it('does not allow payment for an unreviewed imported status', async () => {
    expect(
      await collectionAllowed(em({ status: 'review' }), 42, '2026-09-01'),
    ).toBe(false);
  });
});
