export type Structure = { id: string; name: string; forming: boolean };
export type StructurePreview = {
	structures: Structure[];
	units: {
		id: string;
		name: string;
		structureId: string;
		branch?: string;
		convert?: boolean;
		parentId?: string;
	}[];
	members: {
		id: string;
		name: string;
		revision: number;
		unitId: string | null;
		inactive: boolean;
		category?: string | null;
		categoryReview?: boolean;
		structureId: string;
	}[];
};
export type Unit = {
	canCreateMember?: boolean;
	delegateRoles?: string[];
	canManage?: boolean;
	structureId?: string;
	grades: number[];
	id: string;
	name: string;
	branch: string;
	parentId: string | null;
	archived: boolean;
};
export type Member = {
	syncState?: string;
	syncMessage?: string;
	responsibilities?: { id: string; role: string; unitId: string | null; groupId: string | null }[];
	category?: string | null;
	categoryReview?: boolean;
	roles?: string[];
	orgoType?: string | null;
	revision?: number;
	branch?: string | null;
	access?: {
		delegate?: boolean;
		detail?: boolean;
		fees?: boolean;
		edit: boolean;
		transfer: boolean;
		withdraw?: boolean;
		identity: boolean;
		read: boolean;
	};
	structureId?: string;
	responsibilityUnitIds?: string[];
	responsibilityGroupIds?: string[];
	id: string;
	name: string;
	orgoId: number | null;
	grade: number | null;
	unitId: string | null;
	groupId: string | null;
	status: string;
	adultKind: string | null;
};
export type Sync = {
	id: string;
	memberId?: string;
	kind: string;
	state: string;
	message: string;
	createdAt: string;
};
export type Registry = {
	delegableRoles?: string[];
	homeStructureId?: string | null;
	canFinance?: boolean;
	structures?: Structure[];
	manageableStructureIds?: string[];
	notices: { id: string; unitId: string; memberId: string; createdAt: string }[];
	admin: boolean;
	canManage: boolean;
	chiefUnitIds: (string | null)[];
	units: Unit[];
	members: Member[];
	inactiveMembers?: {
		id: string;
		name: string;
		orgoId: number | null;
		structureId?: string;
		revision?: number;
		status?: string;
	}[];
	ownMemberId: string | null;
	progressionEnabled: boolean;
	sync: Sync[];
	transitions: { id: string; memberId: string; year: number; state: string; message: string }[];
};
export type Detail = {
	member: Member & {
		promiseSource?: string | null;
		orgoProfile?: Record<string, unknown>;
		orgoFields?: Record<string, string>;
		orgoReadonly?: string[];
		conflicts?: Record<string, { local: unknown; remote: unknown }>;
		birthDate: string | null;
		promiseDate: string | null;
		profile: Record<string, string>;
		revision: number;
		skipProgressionYear: number | null;
	};
	admission?: { paid: boolean; receivedBani: number } | null;
	access: {
		withdraw?: boolean;
		read: boolean;
		edit: boolean;
		identity: boolean;
		transfer: boolean;
		sensitive: boolean;
		fees: boolean;
		notes: boolean;
		own: boolean;
	};
	notes: { id: string; body: string; authorId: number; createdAt: string }[];
	assignments: {
		id: string;
		unitId: string | null;
		groupId: string | null;
		role: string;
		structureId?: string | null;
		startedAt: string;
		endedAt: string | null;
		canEdit: boolean;
		canSeeFees: boolean;
		canSeeSensitive: boolean;
	}[];
	fees: {
		current?: boolean;
		plan?: string;
		obligationId?: string;
		nationalBani?: number;
		nationalDirectBani?: number;
		localPaidBani?: number;
		period: string;
		totalBani: number;
		paidBani: number;
		remainingBani: number;
		collectible: boolean;
	}[];
	sync: Sync[];
};
export const branchLabels: Record<string, string> = {
	lupisori: 'Lupișori',
	temerari: 'Temerari',
	exploratori: 'Exploratori',
	seniori: 'Seniori',
	lideri: 'Lideri',
	voluntari: 'Voluntari adulți',
	scouteri: 'Scouteri'
};
export const roleLabels: Record<string, string> = {
	beneficiary: 'Beneficiar',
	helper: 'Voluntar adult / ajutor de lider',
	leader: 'Lider',
	chief: 'Șef de unitate',
	scouter: 'Scouter',
	structure_admin: 'Responsabil de structură',
	council: 'Consiliu'
};
export const profileLabels: Record<string, string> = {
	email: 'Email',
	phone: 'Telefon',
	parentName: 'Nume părinte',
	parentPhone: 'Telefon părinte',
	parentEmail: 'Email părinte',
	emergencyName: 'Contact de urgență',
	emergencyPhone: 'Telefon de urgență',
	medical: 'Probleme medicale',
	allergies: 'Alergii',
	medication: 'Medicație',
	dietary: 'Regim alimentar',
	needs: 'Alte nevoi'
};
export const syncLabels: Record<string, string> = {
	'local-only': 'Păstrat local',
	review: 'De verificat',
	pending: 'În așteptare',
	running: 'Se verifică',
	synced: 'Confirmat în Orgo',
	conflict: 'Conflict',
	unsupported: 'Mapare necesară',
	uncertain: 'De verificat',
	'permission-required': 'Acces Orgo necesar',
	superseded: 'Versiune înlocuită'
};
export function unitName(units: Unit[], id: string | null, empty = '—') {
	const unit = units.find((u) => u.id === id);
	if (!unit) return empty;
	return (
		unit.name + (unit.parentId && unit.grades?.length ? ` · clasa ${unit.grades.join(', ')}` : '')
	);
}
