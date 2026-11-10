import { admissionData } from './admission.rules';
const adult = {
  firstName: 'Ana',
  lastName: 'Test',
  birthDate: '1990-01-01',
  schooling: 'not-in-school',
  email: 'ana@example.test',
  consent: true,
};
const child = {
  ...adult,
  birthDate: '2016-06-15',
  schooling: 'grade',
  grade: 0,
  email: '',
  forChild: true,
  guardianName: 'Părinte Test',
  guardianEmail: 'parent@example.test',
  guardianPhone: '0700000000',
  guardianRelation: 'Părinte',
};
describe('local center registration validation', () => {
  it('accepts only the two supported structures', () => {
    expect(
      admissionData({ ...child, structureId: 'floresti' }).structureId,
    ).toBe('floresti');
    expect(() => admissionData({ ...child, structureId: 'other' })).toThrow(
      'structura',
    );
  });
  it('requires birth date, explicit schooling and consent on the server', () => {
    for (const field of ['birthDate', 'schooling', 'consent'])
      expect(() =>
        admissionData({ ...adult, [field]: undefined }, '2026-11-02'),
      ).toThrow();
  });
  it('keeps sibling guardian contacts reusable without making the parent the child identity', () => {
    expect(() =>
      admissionData({ ...child, email: child.guardianEmail }, '2026-11-02'),
    ).toThrow('distinct');
    const sibling = admissionData(
      { ...child, firstName: 'Sibling' },
      '2026-11-02',
    );
    expect(sibling.guardianEmail).toBe(child.guardianEmail);
    expect(sibling.email).toBe('');
  });
  it('accepts preparatory grade without treating zero as missing', () => {
    expect(admissionData(child, '2026-11-02').grade).toBe(0);
    expect(() => admissionData({ ...child, grade: '' }, '2026-11-02')).toThrow(
      'Alege clasa',
    );
  });
  it('accepts non-school adults without inventing a grade', () => {
    expect(admissionData(adult, '2026-11-02')).toMatchObject({
      grade: null,
      schooling: 'not-in-school',
    });
  });
  it('rejects invalid, impossible and future dates and invalid grades', () => {
    for (const birthDate of ['2025-02-29', '2030-01-01', 'not-a-date'])
      expect(() =>
        admissionData({ ...adult, birthDate }, '2026-11-02'),
      ).toThrow();
    for (const grade of [-1, 13, 1.5])
      expect(() => admissionData({ ...child, grade }, '2026-11-02')).toThrow();
  });
  it('requires separate guardian data for minors, preserving the child identity', () => {
    expect(() =>
      admissionData({ ...child, guardianName: '' }, '2026-11-02'),
    ).toThrow('părintelui');
    const data = admissionData(
      {
        ...child,
        email: undefined,
        roles: ['super_admin'],
        status: 'ACTIVE',
        localCenter: 999,
      },
      '2026-11-02',
    );
    expect(data.email).toBe('');
    expect(data.guardianEmail).toBe('parent@example.test');
    expect(data).not.toHaveProperty('roles');
    expect(data).not.toHaveProperty('status');
    expect(data).not.toHaveProperty('localCenter');
  });
  it('requires guardian contacts for self-submitted minors too', () => {
    expect(() =>
      admissionData(
        { ...child, forChild: false, guardianEmail: '' },
        '2026-11-02',
      ),
    ).toThrow('email');
  });
});
