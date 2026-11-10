jest.mock('./entities/member.entity', () => ({
  MemberFamilyLink: 'family-link',
}));
import { familyDecision, type FamilyMember } from './admission-family';

const application = {
  id: 'new',
  revision: 1,
  memberId: null,
  data: { guardianEmail: ' PARENT@example.test ' },
};
const admin = { admin: true, unitIds: [] };
const member = (
  id: string,
  extra: Partial<FamilyMember> = {},
): FamilyMember => ({
  id,
  name: id,
  status: 'active',
  revision: 1,
  unitId: 'unit',
  createdAt: '2020-01-01',
  familyId: null,
  ordinal: null,
  reserved: false,
  feeResumePeriod: null,
  ...extra,
});
const decide = (members: FamilyMember[]) =>
  familyDecision(
    application,
    members,
    admin,
    undefined,
    new Date('2026-11-10'),
  );

describe('private admission family decisions', () => {
  it('counts fee-paying active parents and children, including those already paid, and caps at fam3', () => {
    expect(decide([]).plan).toBe('fam1');
    expect(decide([member('exempt', { feePaying: false })]).plan).toBe('fam1');
    expect(decide([member('parent')]).plan).toBe('fam2');
    expect(decide([member('parent'), member('sibling')]).plan).toBe('fam3');
    expect(
      decide([member('parent'), member('sibling'), member('paid-sibling')])
        .plan,
    ).toBe('fam3');
  });
  it('reserves approved admissions and excludes inactive or future return periods', () => {
    const decision = decide([
      member('pending-child', {
        status: 'review',
        reserved: true,
        familyId: 'family',
        ordinal: 1,
      }),
      member('withdrawn', {
        status: 'withdrawn',
        familyId: 'family',
        ordinal: 8,
      }),
      member('future', { feeResumePeriod: '2027-09-01' }),
    ]);
    expect(decision.plan).toBe('fam2');
    expect(decision.ordinal).toBe(9);
  });
  it('does not double-count the associated identity and does not auto-classify an adult without guardian', () => {
    expect(
      familyDecision(
        { ...application, memberId: 'existing' },
        [member('existing')],
        admin,
      ).plan,
    ).toBe('fam1');
    expect(
      familyDecision({ ...application, data: {} }, [], admin).plan,
    ).toBeNull();
  });
  it('requires admin selection for conflicting families without merging them', () => {
    const rows = [
      member('one', { familyId: 'a', ordinal: 1 }),
      member('two', { familyId: 'b', ordinal: 1 }),
    ];
    const ambiguous = decide(rows);
    expect(ambiguous.preview.ambiguous).toBe(true);
    expect(ambiguous.familyId).toBeNull();
    const selected = familyDecision(application, rows, admin, 'b');
    expect(selected.candidates.map((m) => m.id)).toEqual(['two']);
    expect(selected.plan).toBe('fam2');
    expect(
      familyDecision(
        application,
        rows,
        { admin: false, unitIds: ['unit'] },
        'b',
      ).familyId,
    ).toBeNull();
    expect(
      familyDecision(application, rows, admin, 'forged').familyId,
    ).toBeNull();
  });
  it('redacts names outside leader scope and invalidates approval after composition changes', () => {
    const before = familyDecision(
      application,
      [member('private', { unitId: 'other' })],
      { admin: false, unitIds: ['unit'] },
    );
    expect(before.preview.members).toEqual([
      { name: 'Membru din altă unitate', active: true, reserved: false },
    ]);
    expect(JSON.stringify(before.preview)).not.toContain('private');
    expect(decide([member('private'), member('new-sibling')]).version).not.toBe(
      before.version,
    );
    expect(
      decide([member('private', { status: 'inactive' })]).version,
    ).not.toBe(before.version);
  });
});
