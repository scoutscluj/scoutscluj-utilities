import { admissionData } from './admission.rules';
const adult = {
  registrationFor: 'self',
  gender: 'F',
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
  email: 'child@example.test',
  registrationFor: 'other',
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
  it('accepts an unused parent email as account email and keeps guardian contact separate', () => {
    const data = admissionData(
      { ...child, email: child.guardianEmail },
      '2026-11-02',
    );
    expect(data.email).toBe(child.guardianEmail);
    expect(data.guardianEmail).toBe(child.guardianEmail);
    expect(
      admissionData({ ...child, firstName: 'Sibling' }, '2026-11-02')
        .guardianEmail,
    ).toBe(child.guardianEmail);
  });
  it('requires the selected mode, gender and account email for all new requests', () => {
    for (const field of ['registrationFor', 'gender', 'email']) {
      for (const input of [adult, child])
        expect(() =>
          admissionData({ ...input, [field]: '' }, '2026-11-02'),
        ).toThrow();
    }
  });
  it('collects the adult submitter without granting guardian status', () => {
    expect(() =>
      admissionData({ ...adult, registrationFor: 'other' }, '2026-11-02'),
    ).toThrow();
    expect(
      admissionData(
        {
          ...adult,
          registrationFor: 'other',
          submitterName: 'Friend',
          submitterEmail: 'friend@example.test',
          guardianName: 'ignored',
        },
        '2026-11-02',
      ),
    ).toMatchObject({
      submitterName: 'Friend',
      submitterEmail: 'friend@example.test',
      guardianName: '',
      guardianEmail: '',
    });
  });
  it('validates photograph type, bytes and size independently of the client', () => {
    expect(admissionData(adult, '2026-11-02')).not.toHaveProperty('photo');
    for (const photo of [
      'data:image/svg+xml;base64,PHN2Zz4=',
      'data:image/png;base64,ZmFrZQ==',
      'data:image/jpeg;base64,' + Buffer.alloc(2097153, 255).toString('base64'),
    ])
      expect(() => admissionData({ ...adult, photo }, '2026-11-02')).toThrow();
    const photo =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8V8AAAAASUVORK5CYII=';
    expect(admissionData({ ...adult, photo }, '2026-11-02').photo).toBe(photo);
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
        email: 'child@example.test',
        roles: ['super_admin'],
        status: 'ACTIVE',
        localCenter: 999,
      },
      '2026-11-02',
    );
    expect(data.email).toBe('child@example.test');
    expect(data.guardianEmail).toBe('parent@example.test');
    expect(data).not.toHaveProperty('roles');
    expect(data).not.toHaveProperty('status');
    expect(data).not.toHaveProperty('localCenter');
  });
  it('requires guardian contacts for self-submitted minors too', () => {
    expect(() =>
      admissionData(
        {
          ...child,
          registrationFor: 'self',
          forChild: false,
          guardianEmail: '',
        },
        '2026-11-02',
      ),
    ).toThrow('email');
  });
});
