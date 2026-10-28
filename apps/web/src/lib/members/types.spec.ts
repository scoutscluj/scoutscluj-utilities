import { describe, expect, it } from 'vitest';
import { hasSchoolGrade, memberPlacement, type Member, type Unit } from './types';

const adult: Member = {
	id: 'adult',
	name: 'Adult',
	orgoId: null,
	grade: 9,
	unitId: 'leaders',
	groupId: null,
	status: 'active',
	category: 'lideri',
	adultKind: 'leader',
	structureId: 'cluj',
	responsibilityUnitIds: ['temerari', 'temerari', 'other-structure', 'exploratori']
};
const units: Unit[] = [
	{
		id: 'leaders',
		name: 'Lideri',
		branch: 'lideri',
		structureId: 'cluj',
		parentId: null,
		archived: false,
		grades: []
	},
	{
		id: 'temerari',
		name: 'Temerari',
		branch: 'temerari',
		structureId: 'cluj',
		parentId: null,
		archived: false,
		grades: []
	},
	{
		id: 'exploratori',
		name: 'Exploratori',
		branch: 'exploratori',
		structureId: 'cluj',
		parentId: null,
		archived: false,
		grades: []
	},
	{
		id: 'other-structure',
		name: 'Altă structură',
		branch: 'temerari',
		structureId: 'floresti',
		parentId: null,
		archived: false,
		grades: []
	}
];
describe('member placement and school grades', () => {
	it('lists responsibility units once within the adult current structure', () => {
		expect(memberPlacement(units, adult)).toBe('Temerari, Exploratori');
		expect(memberPlacement(units, { ...adult, responsibilityUnitIds: [] })).toBe('—');
	});
	it.each(['lideri', 'voluntari', 'scouteri', 'seniori'])('has no grade for %s', (category) => {
		expect(hasSchoolGrade({ ...adult, category })).toBe(false);
	});
	it('keeps school grade and primary placement for beneficiaries', () => {
		const child = { ...adult, category: 'temerari', adultKind: null, unitId: 'temerari' };
		expect(hasSchoolGrade(child)).toBe(true);
		expect(memberPlacement(units, child)).toBe('Temerari / Nerepartizat');
	});
});
