import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, expect, it, vi } from 'vitest';
import FeePaymentForm from './FeePaymentForm.svelte';
import type { Detail } from './types';

vi.mock('$app/forms', () => ({ enhance: () => ({ destroy() {} }) }));
afterEach(cleanup);
const fee: Detail['fees'][number] = {
	period: '2026–2027',
	current: true,
	periodId: 'period',
	obligationId: 'obligation',
	totalBani: 30000,
	nationalBani: 15000,
	nationalDirectBani: 15000,
	paidBani: 15000,
	remainingBani: 15000,
	collectible: true
};

it('limits the default and maximum local receipt to the remaining amount', () => {
	render(FeePaymentForm, { fee, canRecord: true });
	const input = screen.getByLabelText('Suma încasată (lei)');
	expect(input).toHaveValue(150);
	expect(input).toHaveAttribute('max', '150');
	expect(screen.getByLabelText('Referință transfer / chitanță')).toBeRequired();
	expect(screen.getByLabelText('Data încasării')).toBeRequired();
});

it('opens the form immediately when entered from the manual payment action', () => {
	const { container } = render(FeePaymentForm, { fee, canRecord: true, expanded: true });
	expect(container.querySelector('details')).toHaveAttribute('open');
	expect(screen.getByRole('button', { name: 'Confirmă încasarea' })).toBeInTheDocument();
});

it.each([
	{ ...fee, remainingBani: 0 },
	{ ...fee, collectible: false },
	{ ...fee, reviewReason: 'Suprapunere' },
	{ ...fee, current: false }
])('hides manual receipt entry when the obligation cannot be collected', (row) => {
	render(FeePaymentForm, { fee: row, canRecord: true });
	expect(screen.queryByRole('button', { name: 'Confirmă încasarea' })).not.toBeInTheDocument();
});

it('keeps read-only fee access from exposing receipt entry', () => {
	render(FeePaymentForm, { fee, canRecord: false });
	expect(screen.queryByText('Înregistrează o plată manuală')).not.toBeInTheDocument();
});

it('offers an explicit historical national verification', () => {
	render(FeePaymentForm, { fee: { ...fee, current: false } });
	expect(
		screen.getByRole('button', { name: /Verifică naționalul în Orgo pentru 2026/ })
	).toBeInTheDocument();
});
