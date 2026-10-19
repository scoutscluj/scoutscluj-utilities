export const branches = [
  'lupisori',
  'temerari',
  'exploratori',
  'seniori',
] as const;
export type Branch = (typeof branches)[number];
export const adultRoles = [
  'helper',
  'leader',
  'chief',
  'scouter',
  'council',
] as const;
export type AssignmentRole = 'beneficiary' | (typeof adultRoles)[number];
export type Profile = {
  email: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  emergencyName: string;
  emergencyPhone: string;
  medical: string;
  allergies: string;
  medication: string;
  dietary: string;
};
export const emptyProfile = (): Profile => ({
  email: '',
  phone: '',
  parentName: '',
  parentPhone: '',
  parentEmail: '',
  emergencyName: '',
  emergencyPhone: '',
  medical: '',
  allergies: '',
  medication: '',
  dietary: '',
});
export type ScopeAssignment = {
  memberId: string;
  unitId: string | null | undefined;
  groupId: string | null | undefined;
  role: AssignmentRole;
  canEdit: boolean;
  canSeeFees: boolean;
  canSeeSensitive: boolean;
};
export type ScopeTarget = {
  id: string;
  unitId: string | null | undefined;
  groupId: string | null | undefined;
};
export function permissions(
  admin: boolean,
  own: boolean,
  assignments: ScopeAssignment[],
  target: ScopeTarget,
) {
  const unit = assignments.filter(
    (a) => a.unitId && a.unitId === target.unitId,
  );
  const chief = unit.some((a) => a.role === 'chief');
  const leaders = unit.filter((a) => a.role === 'leader' || a.role === 'chief');
  const direct = unit.filter(
    (a) => a.groupId === target.groupId || a.role === 'chief',
  );
  const read =
    admin ||
    own ||
    leaders.length > 0 ||
    direct.some((a) => a.role === 'helper');
  return {
    read,
    edit:
      admin ||
      chief ||
      direct.some(
        (a) => a.role === 'leader' || (a.role === 'helper' && a.canEdit),
      ),
    identity: admin || chief,
    transfer: admin || chief,
    sensitive:
      admin ||
      own ||
      leaders.length > 0 ||
      direct.some((a) => a.canSeeSensitive),
    fees: admin || leaders.length > 0 || direct.some((a) => a.canSeeFees),
    notes: admin || leaders.length > 0 || direct.some((a) => a.canSeeSensitive),
  };
}
export function localDate(now: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Bucharest',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
export function targetYear(now: Date) {
  const date = localDate(now);
  return Number(date.slice(0, 4)) - (date.slice(5, 10) < '09-01' ? 1 : 0);
}
export function progression(
  grade: number | null | undefined,
  branch: Branch,
  birthDate: string | null | undefined,
  year: number,
): { review: string } | { branch: Branch | null; grade: number | null } {
  if (branch === 'seniori') {
    if (!birthDate) return { review: 'Data nașterii lipsește.' };
    const cutoff = `${year - 24}-09-01`;
    return birthDate <= cutoff
      ? { branch: null, grade: null }
      : { branch, grade: null };
  }
  if (!grade || grade < 1 || grade > 12)
    return { review: 'Clasa școlară lipsește sau este invalidă.' };
  const expected =
    grade <= 4 ? 'lupisori' : grade <= 8 ? 'temerari' : 'exploratori';
  if (branch !== expected)
    return {
      review: 'Clasa nu corespunde ramurii; verifică excepția individuală.',
    };
  const next = grade + 1;
  return {
    grade: next <= 12 ? next : null,
    branch:
      next <= 4
        ? 'lupisori'
        : next <= 8
          ? 'temerari'
          : next <= 12
            ? 'exploratori'
            : 'seniori',
  };
}
