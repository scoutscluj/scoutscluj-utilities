export type AdmissionUnit = { id: string; name: string; structureId: string };
export type Application = {
	id: string;
	unitId: string | null;
	state: string;
	revision: number;
	reason: string;
	createdAt: string;
	memberId: string | null;
	data: {
		firstName: string;
		lastName: string;
		birthDate: string;
		schooling: string;
		grade: number | null;
		email: string;
		phone: string;
		forChild: boolean;
		guardianName: string;
		guardianEmail: string;
		guardianPhone: string;
		guardianRelation: string;
	};
	sync: { id: string; state: string; message: string } | null;
};
export type AdmissionList = { admin: boolean; units: AdmissionUnit[]; applications: Application[] };
