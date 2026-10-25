import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, expect, it } from 'vitest';
import ProfileInformation from './ProfileInformation.svelte';

afterEach(cleanup);

it.each([
	{ due: false, orgoDate: '2020-01-01', expected: 'Achitată' },
	{ due: true, orgoDate: '2099-01-01', expected: 'De achitat' },
	{ due: null, orgoDate: '2099-01-01', expected: 'Indisponibilă' }
])(
	'shows local fee state $expected independently of the Orgo validity date',
	({ due, orgoDate, expected }) => {
		render(ProfileInformation, {
			user: {
				id: 1,
				displayName: 'Membru de test',
				roles: [],
				orgoConnection: { profile: { feeValidUntilDate: orgoDate } }
			},
			feePaymentDue: due
		});
		expect(screen.getByText(expected, { exact: true })).toBeInTheDocument();
		expect(screen.queryByText('Cotizație valabilă până la')).not.toBeInTheDocument();
		expect(screen.queryByText('Expirată', { exact: true })).not.toBeInTheDocument();
	}
);
