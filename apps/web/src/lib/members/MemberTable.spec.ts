import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, expect, it, vi } from 'vitest';
import MemberTable from './MemberTable.svelte';
import type { Member, Registry } from './types';

vi.mock('$app/forms', () => ({ enhance: () => ({ destroy() {} }) }));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), invalidateAll: vi.fn() }));
vi.mock('@lucide/svelte', async () => ({
	X: (await import('@lucide/svelte/icons/x')).default,
	Ellipsis: (await import('@lucide/svelte/icons/ellipsis')).default
}));

afterEach(cleanup);

const member: Member = {
	id: 'member',
	name: 'Membru test',
	orgoId: null,
	grade: null,
	unitId: null,
	groupId: null,
	status: 'active',
	adultKind: null,
	access: { fees: true, edit: false, transfer: false, identity: false, read: true },
	feeSummary: {
		period: '2026–2027',
		totalBani: 30000,
		paidBani: 10000,
		remainingBani: 20000,
		collectible: true
	}
};
const registry: Registry = {
	notices: [],
	admin: false,
	canManage: false,
	chiefUnitIds: [],
	units: [],
	members: [member],
	ownMemberId: null,
	progressionEnabled: false,
	sync: [],
	transitions: []
};

it.each([
	[0, 30000, true, 'Neachitată'],
	[10000, 20000, true, 'Parțial achitată'],
	[30000, 0, true, 'Achitată'],
	[0, 0, false, 'În afara urmăririi la plată']
] as const)(
	'shows current payment state %s/%s/%s',
	(paidBani, remainingBani, collectible, label) => {
		render(MemberTable, {
			registry,
			members: [
				{
					...member,
					feeSummary: {
						period: '2026–2027',
						totalBani: 30000,
						paidBani,
						remainingBani,
						collectible
					}
				}
			]
		});
		expect(screen.getByRole('columnheader', { name: 'Cotizație curentă' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Cotizații pentru Membru test' })).toHaveTextContent(
			label
		);
	}
);

it('distinguishes absent fees and hides amounts on unauthorized rows', () => {
	render(MemberTable, {
		registry,
		members: [
			{ ...member, feeSummary: null },
			{ ...member, id: 'private', name: 'Alt membru', access: { ...member.access!, fees: false } }
		]
	});
	expect(screen.getByText('Fără cotizație curentă')).toBeInTheDocument();
	expect(screen.getByLabelText('Fără acces la cotizație')).toBeInTheDocument();
	expect(screen.queryByText(/Rămas/)).not.toBeInTheDocument();
});

it('hides the fee column without grants', () => {
	render(MemberTable, {
		registry,
		members: [{ ...member, access: { ...member.access!, fees: false } }]
	});
	expect(screen.queryByRole('columnheader', { name: 'Cotizație curentă' })).not.toBeInTheDocument();
});
