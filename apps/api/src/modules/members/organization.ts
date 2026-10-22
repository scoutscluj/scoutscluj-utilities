import { branches, type Branch } from './member.types';

export const categoryLabels = {
  lupisori: 'Lupișori',
  temerari: 'Temerari',
  exploratori: 'Exploratori',
  seniori: 'Seniori',
  lideri: 'Lideri',
  voluntari: 'Voluntari adulți',
  scouteri: 'Scouteri',
} as const;
export type Category = keyof typeof categoryLabels;
export const categories = Object.keys(categoryLabels) as Category[];
export const isYouth = (category: string): category is Branch =>
  branches.includes(category as Branch);
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

/** Only explicit Orgo categories are used; responsibilities and age are not evidence. */
export function importedCategory(
  profile: Record<string, unknown> = {},
): Category | null {
  const type =
    profile.type && typeof profile.type === 'object'
      ? (profile.type as { id?: unknown; name?: unknown })
      : {};
  const byId: Record<number, Category> = {
    38: 'lupisori',
    39: 'temerari',
    40: 'exploratori',
    41: 'seniori',
    42: 'lideri',
    43: 'voluntari',
    44: 'scouteri',
  };
  const byName: Record<string, Category> = {
    lupisor: 'lupisori',
    lupisori: 'lupisori',
    temerar: 'temerari',
    temerari: 'temerari',
    explorator: 'exploratori',
    exploratori: 'exploratori',
    senior: 'seniori',
    seniori: 'seniori',
    lider: 'lideri',
    lideri: 'lideri',
    'voluntar adult': 'voluntari',
    'voluntari adulti': 'voluntari',
    scouter: 'scouteri',
    scouteri: 'scouteri',
  };
  const id = byId[Number(type.id)];
  const name =
    typeof type.name === 'string' ? byName[normalize(type.name)] : undefined;
  return id && name && id !== name ? null : (id ?? name ?? null);
}

export function activeMandates<
  T extends {
    id: string;
    parentAssignmentId?: string | null;
    endedAt?: Date | null;
    expiresAt?: Date | null;
  },
>(rows: T[], now = new Date()): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const active = (row: T, seen: Set<string>): boolean => {
    if (
      row.endedAt ||
      (row.expiresAt && row.expiresAt <= now) ||
      seen.has(row.id)
    )
      return false;
    if (!row.parentAssignmentId) return true;
    const parent = byId.get(row.parentAssignmentId);
    return !!parent && active(parent, new Set([...seen, row.id]));
  };
  return rows.filter((row) => active(row, new Set()));
}
