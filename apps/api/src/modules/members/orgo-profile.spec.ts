import { emptyProfile } from './member.types';
import { projectCustomProfile, customProfilePatch } from './orgo-profile';
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
  it('merges independent edits and accepts Orgo for a conflicting field', () => {
    expect(
      reconcile(
        { address: 'A', bio: 'B', postalCode: 'C' },
        { address: 'local', bio: 'B', postalCode: 'local-code' },
        { address: 'remote', bio: 'new bio', postalCode: 'C' },
      ),
    ).toEqual({
      values: { address: 'remote', bio: 'new bio', postalCode: 'local-code' },
      base: { address: 'remote', bio: 'new bio', postalCode: 'C' },
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

describe('verified reusable medical custom fields', () => {
  const orgo = {
    customDefinitions: [
      {
        id: 1,
        name: 'Alimentatie',
        options: { options: { 1: 'Omnivor', 2: 'Vegan' } },
        visibility: 'public',
      },
      { id: 2, name: 'Alergii', visibility: 'public' },
      { id: 3, name: 'Alte nevoi', visibility: 'public' },
    ],
    customFieldValues: [
      { field: 1, value: 1, media: null },
      { field: 2, value: 'Alergie test', media: null },
      { field: 3, value: 'Nevoi test', media: null },
    ],
  };
  it('projects readable dietary labels and reusable medical data', () => {
    expect(projectCustomProfile(emptyProfile(), orgo)).toMatchObject({
      dietary: 'Omnivor',
      allergies: 'Alergie test',
      needs: 'Nevoi test',
    });
  });
  it('maps a corrected dietary label back to the original Orgo option key', () => {
    const before = projectCustomProfile(emptyProfile(), orgo);
    const result = customProfilePatch(
      before,
      { ...before, dietary: 'Vegan', allergies: 'Corectat' },
      orgo,
    );
    expect(result?.patch).toEqual({
      '1': 2,
      '2': 'Corectat',
      '3': 'Nevoi test',
    });
    expect(orgo.customFieldValues[0].value).toBe(1);
  });
  it('does not expose an admin-only or encrypted custom value through the reusable profile', () => {
    expect(
      projectCustomProfile(emptyProfile(), {
        ...orgo,
        customDefinitions: orgo.customDefinitions.map((d) => ({
          ...d,
          isOnlyAdmin: true,
        })),
      }),
    ).toEqual(emptyProfile());
  });
});

it('merges custom fields independently and accepts remote changes only for competing fields', () => {
  const fields = (a: string, b: string) => ({
    customFieldValues: [
      { field: 1, value: a },
      { field: 2, value: b },
    ],
  });
  const result = reconcile(
    fields('old-a', 'old-b'),
    fields('local-a', 'old-b'),
    fields('old-a', 'remote-b'),
  );
  expect(result.values.customFieldValues).toEqual([
    { field: 1, value: 'local-a' },
    { field: 2, value: 'remote-b' },
  ]);
  expect(result.conflicts).toEqual({});
  const conflict = reconcile(
    fields('old-a', 'old-b'),
    fields('local-a', 'old-b'),
    fields('remote-a', 'remote-b'),
  );
  expect(conflict.values.customFieldValues).toEqual([
    { field: 1, value: 'remote-a' },
    { field: 2, value: 'remote-b' },
  ]);
  expect(Object.keys(conflict.conflicts)).toEqual(['custom:1']);
});
