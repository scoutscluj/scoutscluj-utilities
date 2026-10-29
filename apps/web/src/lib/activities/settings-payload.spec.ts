import { describe, expect, it } from 'vitest';
import { registrationSettingsPayload } from './settings-payload';
import type { RegistrationSettings } from './registration';

describe('registration settings wire dates', () => {
	it('preserves instants and calendar-only payment dates without mutating editor values', () => {
		const settings = {
			opensAt: '2027-06-01T11:00:00+03:00',
			closesAt: '2027-08-10T18:30:00+03:00',
			paymentDue: '2027-08-20',
			installments: [{ amountBani: 10000, due: '2027-08-20' }]
		} as RegistrationSettings;
		const result = registrationSettingsPayload(settings);
		expect(result.opensAt).toBe('2027-06-01T08:00:00.000Z');
		expect(result.closesAt).toBe('2027-08-10T15:30:00.000Z');
		expect(result.paymentDue).toBe('2027-08-20');
		expect(result.installments).toEqual(settings.installments);
		expect(settings.opensAt).toBe('2027-06-01T11:00:00+03:00');
	});
	it('keeps empty dates and lets malformed input reach normal API validation', () => {
		const settings = { opensAt: '', closesAt: 'not-a-date' } as RegistrationSettings;
		expect(registrationSettingsPayload(settings)).toEqual(settings);
	});
});
