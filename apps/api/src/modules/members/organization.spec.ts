import { activeMandates, categories, importedCategory } from './organization';
import { proposedStructure } from './member.types';

describe('member organization', () => {
  it('has seven primary categories independent from responsibility roles', () => {
    expect(categories).toHaveLength(7);
    expect(categories).not.toContain('chief');
    expect(
      importedCategory({
        type: { id: 41, name: 'Senior' },
        userRoles: [{ role: 'helper' }],
      }),
    ).toBe('seniori');
  });
  it.each(['Florești', 'FLOREŞTI', 'Floresti'])(
    'normalizes the explicit structure marker %s',
    (marker) => {
      expect(proposedStructure(`Membru ${marker}`)).toBe('floresti');
    },
  );
  it('uses explicit adult categories and requires review for contradictory or missing evidence', () => {
    expect(importedCategory({ type: { id: 42, name: 'Lider' } })).toBe(
      'lideri',
    );
    expect(importedCategory({ type: { name: 'Voluntari adulți' } })).toBe(
      'voluntari',
    );
    expect(importedCategory({ type: { id: 44, name: 'Scouter' } })).toBe(
      'scouteri',
    );
    expect(importedCategory({ type: { id: 38, name: 'Senior' } })).toBeNull();
    expect(
      importedCategory({ userRoles: ['leader'], birthDate: '1980-01-01' }),
    ).toBeNull();
  });
  it('revokes descendants of ended, expired, missing and circular delegating mandates', () => {
    const endedAt = new Date('2026-01-01');
    const rows = [
      { id: 'structure', endedAt },
      { id: 'chief', parentAssignmentId: 'structure' },
      { id: 'leader', parentAssignmentId: 'chief' },
      { id: 'expired', expiresAt: endedAt },
      { id: 'helper', parentAssignmentId: 'expired' },
      { id: 'missing', parentAssignmentId: 'unknown' },
      { id: 'cycle-a', parentAssignmentId: 'cycle-b' },
      { id: 'cycle-b', parentAssignmentId: 'cycle-a' },
      { id: 'valid' },
    ];
    expect(
      activeMandates(rows, new Date('2026-10-22')).map((row) => row.id),
    ).toEqual(['valid']);
  });
});
