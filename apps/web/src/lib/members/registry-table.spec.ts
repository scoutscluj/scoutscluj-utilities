import { describe, expect, it } from 'vitest';
import {
	feeState,
	filterMembers,
	memberCsv,
	votingState,
	type MemberFilters
} from './registry-table';
import type { Member, Registry } from './types';

const base: Member = {
	id: 'a',
	name: 'Ștefan',
	orgoId: null,
	grade: 10,
	unitId: 'exploratori',
	groupId: 'g1',
	status: 'active',
	adultKind: null,
	category: 'exploratori',
	age: 16,
	structureId: 'cluj',
	access: { read: true, edit: false, transfer: false, identity: false, fees: true },
	feeSummary: {
		period: '2026–2027',
		totalBani: 30000,
		paidBani: 30000,
		remainingBani: 0,
		collectible: true
	}
};
const members: Member[] = [
	base,
	{
		...base,
		id: 'b',
		name: 'Ana',
		structureId: 'floresti',
		category: 'temerari',
		groupId: 'g2',
		age: 15,
		feeSummary: { ...base.feeSummary!, paidBani: 10000, remainingBani: 20000 }
	},
	{ ...base, id: 'c', name: 'Ion', status: 'inactive', age: 19, groupId: null, feeSummary: null },
	{ ...base, id: 'd', name: 'Fără acces', age: null, access: { ...base.access!, fees: false } }
];
const filters: MemberFilters = {
	search: '',
	structures: [],
	categories: [],
	units: [],
	statuses: [],
	fees: [],
	voting: []
};
const registry = { structures: [{ id: 'cluj', name: 'Cluj' }], units: [] } as unknown as Registry;
const columns = { unit: true, grade: true, age: true, status: true, fees: true };

describe('member registry filters', () => {
	it('combines alternatives within filters and intersections across filters and search', () => {
		expect(
			filterMembers(members, {
				...filters,
				structures: ['cluj', 'floresti'],
				categories: ['exploratori', 'temerari'],
				statuses: ['active'],
				units: ['g1', 'g2']
			}).map((m) => m.id)
		).toEqual(['a', 'b', 'd']);
		expect(
			filterMembers(members, {
				...filters,
				structures: ['cluj', 'floresti'],
				categories: ['exploratori', 'temerari'],
				search: 'stefan'
			}).map((m) => m.id)
		).toEqual(['a']);
		expect(filterMembers(members, filters)).toHaveLength(4);
	});
	it('includes age 16 and separates unknown ages from underage members', () => {
		expect(members.map(votingState)).toEqual(['eligible', 'ineligible', 'eligible', 'unknown']);
		expect(
			filterMembers(members, { ...filters, voting: ['eligible'], fees: ['active'] }).map(
				(m) => m.id
			)
		).toEqual(['a']);
		expect(filterMembers(members, { ...filters, voting: ['eligible', 'unknown'] })).toHaveLength(3);
	});
	it('keeps financial permissions distinct from payment status', () => {
		expect(members.map(feeState)).toEqual(['active', 'inactive', 'inactive', 'unknown']);
		expect(
			feeState({
				...base,
				feeSummary: { ...base.feeSummary!, collectible: false, paidBani: 10000, remainingBani: 0 }
			})
		).toBe('inactive');
		expect(feeState({ ...base, feeSummary: { ...base.feeSummary!, collectible: false } })).toBe(
			'active'
		);
		expect(filterMembers(members, { ...filters, fees: ['inactive'] }).map((m) => m.id)).toEqual([
			'b',
			'c'
		]);
	});
	it('matches category review and adult responsibilities', () => {
		const adult = {
			...base,
			categoryReview: true,
			responsibilityUnitIds: ['adult-unit'],
			responsibilityGroupIds: ['adult-group']
		};
		expect(
			filterMembers([adult], { ...filters, categories: ['review'], units: ['adult-unit', 'other'] })
		).toEqual([adult]);
		expect(filterMembers([adult], { ...filters, units: ['adult-group'] })).toEqual([adult]);
	});
});

describe('member registry CSV', () => {
	it('preserves Unicode and escapes quotes, commas, newlines and spreadsheet formulas', () => {
		const csv = memberCsv(
			[
				{ ...base, name: 'Ștefan, "Cercetaș"\nCluj' },
				{ ...base, name: '=SUM(1,2)' }
			],
			registry,
			columns
		);
		expect(csv.startsWith('\uFEFF')).toBe(true);
		expect(csv).toContain('"Ștefan, ""Cercetaș""\nCluj"');
		expect(csv).toContain('"\'=SUM(1,2)"');
		expect(csv).toContain('"16"');
	});
	it('respects visible columns and redacts fee information even if present on an unauthorized row', () => {
		const csv = memberCsv([members[3]], registry, { ...columns, grade: false, age: false });
		expect(csv).not.toContain('Vârsta');
		expect(csv).not.toContain('Clasa');
		expect(csv).not.toContain('2026–2027');
		expect(csv).not.toContain('Achitată');
	});
	it('exports every supplied filtered result in order, including beyond the page size', () => {
		const rows = Array.from({ length: 30 }, (_, i) => ({ ...base, name: `Membru ${i}` }));
		const csv = memberCsv(rows, registry, columns);
		expect(csv.split('\r\n')).toHaveLength(32);
		expect(csv.indexOf('Membru 0')).toBeLessThan(csv.indexOf('Membru 29'));
	});
});
