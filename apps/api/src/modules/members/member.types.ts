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
  'structure_admin',
] as const;
export type AssignmentRole = 'beneficiary' | (typeof adultRoles)[number];
export function hasSchoolGrade(member: {
  category?: string | null;
  branch?: string | null;
  adultKind?: string | null;
}) {
  const category = member.category ?? member.branch;
  return category
    ? ['lupisori', 'temerari', 'exploratori'].includes(category)
    : !member.adultKind;
}
export const structureOf = (value: { structureId?: string | null }) =>
  value.structureId ?? 'cluj';
export const proposedStructure = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .includes('floresti')
    ? 'floresti'
    : 'cluj';
export function isImportedInactive(member: {
  orgoId?: number | null;
  status: string;
  remote?: Record<string, unknown>;
}) {
  return (
    !!member.orgoId &&
    member.status !== 'active' &&
    member.remote?.status === 'INACTIVE'
  );
}
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
  needs: string;
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
  needs: '',
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
  const leaders = unit.filter(
    (a) =>
      a.role === 'chief' ||
      (a.role === 'leader' && a.groupId === target.groupId),
  );
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
export function memberAge(
  birthDate: string | null | undefined,
  now = new Date(),
) {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const parsed = new Date(birthDate);
  const today = localDate(now);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== birthDate ||
    birthDate > today
  )
    return null;
  return (
    Number(today.slice(0, 4)) -
    Number(birthDate.slice(0, 4)) -
    Number(today.slice(5) < birthDate.slice(5))
  );
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
