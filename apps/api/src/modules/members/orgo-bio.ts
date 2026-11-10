const heading = 'Date de membru Scouts Cluj';
const grades = [
  'pregătitoare',
  'a I-a',
  'a II-a',
  'a III-a',
  'a IV-a',
  'a V-a',
  'a VI-a',
  'a VII-a',
  'a VIII-a',
  'a IX-a',
  'a X-a',
  'a XI-a',
  'a XII-a',
];

/** Replace only the application's labelled section, retaining the member's bio. */
export function memberBio(
  bio: unknown,
  grade: number | null | undefined,
  structureId: string | null | undefined,
  includeGrade: boolean,
) {
  const text = typeof bio === 'string' ? bio : '';
  const lines = [heading];
  if (includeGrade && grade != null && grades[grade])
    lines.push(`Clasa: ${grades[grade]}`);
  const structures: Record<string, string> = {
    cluj: 'Cluj',
    floresti: 'Florești',
  };
  const structure = structures[structureId ?? 'cluj'];
  if (structure) lines.push(`Structura: ${structure}`);
  const section = lines.length > 1 ? lines.join('\n') : '';
  const pattern =
    /^Date de membru Scouts Cluj\r?\n(?:(?:Clasa|Structura):[^\r\n]*(?:\r?\n|$))+/gm;
  let replaced = false;
  const updated = text.replace(pattern, () => {
    if (replaced) return '';
    replaced = true;
    return section + '\n';
  });
  return replaced
    ? updated.trimEnd()
    : [text.trimEnd(), section].filter(Boolean).join('\n\n');
}
