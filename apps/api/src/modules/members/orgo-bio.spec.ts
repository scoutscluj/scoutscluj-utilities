import { memberBio } from './orgo-bio';

describe('member biography details', () => {
  it('removes a cleared grade and keeps prose before and after its section', () => {
    const bio =
      'Introducere.\r\n\r\nDate de membru Scouts Cluj\r\nClasa: a VIII-a\r\nStructura: Florești\r\n\r\nÎncheiere.';
    expect(memberBio(bio, null, 'cluj', true)).toBe(
      'Introducere.\r\n\r\nDate de membru Scouts Cluj\nStructura: Cluj\n\r\nÎncheiere.',
    );
  });
  it('formats the preparatory grade and removes grade when a dedicated field exists', () => {
    const bio = memberBio(null, 0, 'cluj', true);
    expect(bio).toContain('Clasa: pregătitoare');
    expect(memberBio(bio, 0, 'cluj', false)).toBe(
      'Date de membru Scouts Cluj\nStructura: Cluj',
    );
  });
});
