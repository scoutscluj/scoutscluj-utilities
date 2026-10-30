import { matchesSearch } from '$lib/components/ui/table-search';
import {
	branchLabels,
	hasSchoolGrade,
	memberPlacement,
	roleLabels,
	type Member,
	type Registry
} from './types';

export const statusLabels: Record<string, string> = {
	active: 'Activ',
	withdrawn: 'Retras din activitate',
	suspended: 'Suspendat',
	inactive: 'Inactiv',
	review: 'De verificat'
};
export type MemberFilters = {
	search: string;
	structures: string[];
	categories: string[];
	units: string[];
	statuses: string[];
	fees: string[];
	voting: string[];
};
export function feeState(member: Member) {
	if (!member.access?.fees) return 'unknown';
	const fee = member.feeSummary;
	if (!fee) return 'missing';
	if (fee.paidBani >= fee.totalBani) return 'paid';
	return fee.paidBani > 0 ? 'partial' : 'unpaid';
}
export function votingState(member: Member) {
	return member.age == null ? 'unknown' : member.age >= 16 ? 'eligible' : 'ineligible';
}
export function filterMembers(members: Member[], filters: MemberFilters) {
	const includes = (selected: string[], value: string) =>
		!selected.length || selected.includes(value);
	return members.filter(
		(member) =>
			includes(filters.structures, member.structureId ?? 'cluj') &&
			matchesSearch(member.name, filters.search) &&
			(!filters.categories.length ||
				filters.categories.some((category) =>
					category === 'review' ? member.categoryReview : member.category === category
				)) &&
			(!filters.units.length ||
				filters.units.some((unit) =>
					unit === 'unassigned'
						? !member.groupId
						: member.unitId === unit ||
							member.groupId === unit ||
							member.responsibilityUnitIds?.includes(unit) ||
							member.responsibilityGroupIds?.includes(unit)
				)) &&
			includes(filters.statuses, member.status) &&
			includes(filters.fees, feeState(member)) &&
			includes(filters.voting, votingState(member))
	);
}
export function feeLabel(member: Member) {
	if (!member.access?.fees) return '—';
	const fee = member.feeSummary;
	if (!fee) return 'Fără cotizație curentă';
	return !fee.collectible
		? 'În afara urmăririi la plată'
		: fee.remainingBani === 0
			? 'Achitată'
			: fee.paidBani > 0
				? 'Parțial achitată'
				: 'Neachitată';
}
function csvCell(value: string | number) {
	const text = String(value);
	const safe = /^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
	return `"${safe.replaceAll('"', '""')}"`;
}
export function memberCsv(
	members: Member[],
	registry: Registry,
	columns: {
		unit: boolean;
		grade: boolean;
		age: boolean;
		status: boolean;
		fees: boolean;
	}
) {
	const headers = [
		'Membru',
		'Structură',
		'Categorie',
		'Responsabilități',
		...(columns.unit ? ['Unitate / grupă'] : []),
		...(columns.grade ? ['Clasa'] : []),
		...(columns.age ? ['Vârsta'] : []),
		...(columns.status ? ['Status'] : []),
		...(columns.fees ? ['Cotizație curentă', 'Perioadă cotizație', 'Rămas (RON)'] : [])
	];
	const rows = members.map((member) => [
		member.name,
		registry.structures?.find((structure) => structure.id === (member.structureId ?? 'cluj'))
			?.name ?? '',
		branchLabels[member.category ?? member.branch ?? ''] ??
			(member.categoryReview ? 'De verificat' : (member.orgoType ?? '')),
		(member.roles ?? [])
			.filter((role) => role !== 'beneficiary')
			.map((role) => roleLabels[role] ?? role)
			.join(', '),
		...(columns.unit ? [memberPlacement(registry.units, member)] : []),
		...(columns.grade ? [hasSchoolGrade(member) ? (member.grade ?? '') : ''] : []),
		...(columns.age ? [member.age ?? ''] : []),
		...(columns.status ? [statusLabels[member.status] ?? 'De verificat'] : []),
		...(columns.fees
			? [
					feeLabel(member),
					member.access?.fees ? (member.feeSummary?.period ?? '') : '',
					member.access?.fees &&
					member.feeSummary?.collectible &&
					member.feeSummary.remainingBani > 0
						? (member.feeSummary.remainingBani / 100).toFixed(2)
						: ''
				]
			: [])
	]);
	return (
		'\uFEFF' + [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
	);
}
