import {
  permissions,
  progression,
  targetYear,
  memberAge,
  type ScopeAssignment,
} from './member.types';

describe('roster age', () => {
  it('includes the sixteenth birthday using the Bucharest calendar', () => {
    expect(memberAge('2010-10-30', new Date('2026-10-29T22:30:00Z'))).toBe(16);
    expect(memberAge('2010-10-30', new Date('2026-10-29T20:30:00Z'))).toBe(15);
    expect(memberAge('2010-10-31', new Date('2026-10-30T12:00:00Z'))).toBe(15);
  });
  it('leaves missing, invalid and future birth dates unknown', () => {
    for (const birthDate of [
      null,
      undefined,
      '',
      'not-a-date',
      '2010-02-30',
      '2030-01-01',
    ])
      expect(memberAge(birthDate, new Date('2026-10-30T12:00:00Z'))).toBeNull();
  });
});

const assignment = (
  role: ScopeAssignment['role'],
  groupId: string | null = 'group-a',
): ScopeAssignment => ({
  memberId: 'adult',
  unitId: 'temerari',
  groupId,
  role,
  canEdit: false,
  canSeeFees: false,
  canSeeSensitive: false,
});
describe('member scope policies', () => {
  const child = { id: 'child', unitId: 'temerari', groupId: 'group-b' };
  it('denies private details outside the designated leader subunit', () => {
    expect(
      permissions(false, false, [assignment('leader')], child),
    ).toMatchObject({
      read: false,
      sensitive: false,
      notes: false,
      fees: false,
      edit: false,
      identity: false,
    });
  });
  it('allows own cohort editing without identity editing', () => {
    expect(
      permissions(false, false, [assignment('leader')], {
        ...child,
        groupId: 'group-a',
      }),
    ).toMatchObject({ edit: true, identity: false, transfer: false });
  });
  it('limits helper defaults and explicit grants to the assigned group', () => {
    const helper = assignment('helper');
    expect(
      permissions(false, false, [helper], { ...child, groupId: 'group-a' }),
    ).toMatchObject({
      read: true,
      edit: false,
      sensitive: false,
      notes: false,
      fees: false,
    });
    expect(
      permissions(
        false,
        false,
        [{ ...helper, canSeeSensitive: true, canSeeFees: true, canEdit: true }],
        child,
      ),
    ).toMatchObject({
      read: false,
      edit: false,
      sensitive: false,
      fees: false,
    });
  });
  it('gives a chief the whole unit, but no other unit', () => {
    expect(
      permissions(false, false, [assignment('chief', null)], child),
    ).toMatchObject({ read: true, edit: true, identity: true, transfer: true });
    expect(
      permissions(false, false, [assignment('chief', null)], {
        ...child,
        unitId: 'exploratori',
      }),
    ).toMatchObject({ read: false, edit: false, sensitive: false });
  });
  it('does not confuse senior beneficiary status with leader authority', () => {
    expect(
      permissions(false, false, [assignment('beneficiary')], child),
    ).toMatchObject({ read: false, edit: false, fees: false });
  });
  it('allows self health access without internal notes or assignment edits', () => {
    expect(permissions(false, true, [], child)).toMatchObject({
      read: true,
      sensitive: true,
      notes: false,
      edit: false,
      identity: false,
    });
  });
  it('allows leadership in the common collective without granting other subunits', () => {
    expect(
      permissions(false, false, [assignment('leader', null)], {
        ...child,
        groupId: null,
      }).edit,
    ).toBe(true);
    expect(
      permissions(false, false, [assignment('leader', null)], child).read,
    ).toBe(false);
    expect(
      permissions(false, false, [assignment('helper', null)], {
        ...child,
        groupId: null,
      }),
    ).toMatchObject({ read: true, edit: false, sensitive: false });
  });
});
describe('September progression', () => {
  it('uses Bucharest midnight at the September boundary', () => {
    expect(targetYear(new Date('2026-08-31T20:59:59Z'))).toBe(2025);
    expect(targetYear(new Date('2026-08-31T21:00:00Z'))).toBe(2026);
  });
  it.each([
    [4, 'lupisori', 'temerari', 5],
    [8, 'temerari', 'exploratori', 9],
    [12, 'exploratori', 'seniori', null],
  ] as const)(
    'moves grade %s into the next branch',
    (grade, branch, nextBranch, nextGrade) => {
      expect(progression(grade, branch, null, 2027)).toEqual({
        grade: nextGrade,
        branch: nextBranch,
      });
    },
  );
  it('advances a continuing cohort without changing branch', () => {
    expect(progression(5, 'temerari', null, 2027)).toEqual({
      grade: 6,
      branch: 'temerari',
    });
  });
  it('checks the senior birthday against September 1 inclusively', () => {
    expect(progression(null, 'seniori', '2003-09-01', 2027)).toEqual({
      grade: null,
      branch: null,
    });
    expect(progression(null, 'seniori', '2003-09-02', 2027)).toEqual({
      grade: null,
      branch: 'seniori',
    });
  });
  it('requires review rather than inferring missing or contradictory grades', () => {
    expect(progression(null, 'temerari', '2014-05-01', 2027)).toHaveProperty(
      'review',
    );
    expect(progression(3, 'temerari', null, 2027)).toHaveProperty('review');
    expect(progression(null, 'seniori', null, 2027)).toHaveProperty('review');
  });
});
