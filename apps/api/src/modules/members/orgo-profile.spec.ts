import {
  activeRoles,
  branchFor,
  cleanProfile,
  reconcile,
} from './orgo-profile';
describe('Orgo profile contract and reconciliation', () => {
  it('imports branch from canonical type IDs without guessing age', () => {
    expect(branchFor({ type: { id: 39 }, age: 18 })).toBe('temerari');
    expect(
      branchFor({ type: { id: 999, name: 'Temerar' }, age: 12 }),
    ).toBeNull();
  });
  it('excludes expired roles while retaining roles with a future end date', () => {
    const raw = {
      userRoles: [
        { role: { id: 8 }, dateEnded: '2025-01-01' },
        { role: { id: 7 }, dateEnded: null },
        { role: { id: 18 }, dateEnded: '2027-01-01' },
      ],
    };
    expect(activeRoles(raw, new Date('2026-10-20')).map((r) => r.role)).toEqual(
      [{ id: 7 }, { id: 18 }],
    );
  });
  it('copies profile fields and custom references without security settings', () => {
    expect(
      cleanProfile({
        address: 'A',
        logo: 'picture.jpg',
        permissions: ['ADMIN'],
        pushNotificationTokens: ['secret'],
        mfaEnabled: true,
        customFieldValues: [{ field: '/api/v1/custom_fields/12', value: 'B' }],
      }),
    ).toEqual({
      address: 'A',
      logo: 'picture.jpg',
      customFieldValues: [{ field: 12, value: 'B', media: null }],
    });
  });
  it('merges independent edits and preserves both versions of a conflicting field', () => {
    expect(
      reconcile(
        { address: 'A', bio: 'B', postalCode: 'C' },
        { address: 'local', bio: 'B', postalCode: 'local-code' },
        { address: 'remote', bio: 'new bio', postalCode: 'C' },
      ),
    ).toEqual({
      values: { address: 'local', bio: 'new bio', postalCode: 'local-code' },
      base: { address: 'A', bio: 'new bio', postalCode: 'C' },
      conflicts: { address: { local: 'local', remote: 'remote' } },
    });
  });
  it('accepts equal concurrent edits and treats absent and null values consistently', () => {
    expect(
      reconcile(
        { bio: 'old' },
        { bio: 'same' },
        { bio: 'same', address: null },
      ),
    ).toEqual({
      values: { bio: 'same', address: null },
      base: { bio: 'same', address: null },
      conflicts: {},
    });
  });
});
