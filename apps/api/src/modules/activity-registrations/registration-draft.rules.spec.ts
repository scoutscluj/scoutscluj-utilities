import { parseRegistrationDraft } from './registration-draft.rules';
describe('partial registration drafts', () => {
  const fields = new Set([
    'participant_name',
    'birth_date',
    'medical_notes',
    'photo_uses',
  ]);
  it('accepts incomplete form values without creating a registration contract', () => {
    expect(
      parseRegistrationDraft(
        {
          email: 'unfinished@',
          answers: {
            participant_name: '',
            birth_date: '2015-',
            medical_notes: 'Relevant information',
          },
        },
        fields,
      ),
    ).toMatchObject({
      email: 'unfinished@',
      answers: { birth_date: '2015-', medical_notes: 'Relevant information' },
    });
  });
  it('discards unknown answer keys and rejects nested or oversized data', () => {
    expect(
      parseRegistrationDraft({ answers: { unknown: 'not a question' } }, fields)
        .answers,
    ).toEqual({});
    expect(() =>
      parseRegistrationDraft(
        { answers: { participant_name: { unsafe: true } } },
        fields,
      ),
    ).toThrow();
    expect(() =>
      parseRegistrationDraft(
        { answers: { medical_notes: 'x'.repeat(12001) } },
        fields,
      ),
    ).toThrow();
    expect(() =>
      parseRegistrationDraft(
        { answers: { photo_uses: Array(51).fill('archive') } },
        fields,
      ),
    ).toThrow();
  });
});
