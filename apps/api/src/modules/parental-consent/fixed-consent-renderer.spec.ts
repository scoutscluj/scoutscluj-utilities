import { emptyFixedConsent } from '@scouts-cluj/parental-consent-schema';
import { fixedConsentValues } from './fixed-consent-renderer';
describe('fixed participation document', () => {
  it('fills personal and activity fields without signing on the parent’s behalf', () => {
    const values = fixedConsentValues({
      title: 'Activitate nouă',
      location: 'Cluj',
      startDate: '2027-03-14',
      endDate: '2027-03-15',
      branch: 'lupisori',
      details: { ...emptyFixedConsent(), equipment: 'Rucsac\nPelerină' },
      answers: {
        participant_name: 'Ștefan',
        birth_date: '2016-05-03',
        guardian_name: 'Părinte',
        guardian_relation: 'mother',
        acknowledgement: true,
        treatment: 'call_first',
        photo_uses: ['closed_groups'],
        medical_notes: 'Nu există',
      },
    });
    expect(values['activity.period']).toBe('14.03.2027 – 15.03.2027');
    expect(values['answer.branch']).toBe('Lupișori');
    expect(values['answer.birth_date']).toBe('03.05.2016');
    expect(values['choice.treatment.call_first']).toBe('●');
    expect(values['choice.treatment.approved']).toBe('○');
    expect(values['photo.closed_groups']).toBe('☑');
    expect(values['photo.social']).toBe('☐');
    expect(values['check.photo_none']).toBe('☐');
    expect(values['answer.signature_blank']).toBe('');
    expect(values['answer.signature_date']).toBe('');
  });
});
