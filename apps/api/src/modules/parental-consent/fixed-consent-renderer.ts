import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { ServiceUnavailableException } from '@nestjs/common';
import {
  branchLabels,
  type FixedConsentDetails,
  type FormField,
} from '@scouts-cluj/parental-consent-schema';
const execute = promisify(execFile);
export type FixedConsentInput = {
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  branch: string;
  details: FixedConsentDetails;
  answers: Record<string, string | number | boolean | string[]>;
  extraFields?: FormField[];
};
export function fixedConsentValues(input: FixedConsentInput) {
  const a = input.answers;
  const values: Record<string, string> = {};
  const date = (v: string) =>
    /^\d{4}-\d{2}-\d{2}/.test(v)
      ? v.slice(0, 10).split('-').reverse().join('.')
      : v;
  for (const [key, value] of Object.entries(input.details))
    values[`activity.${key}`] = value;
  Object.assign(values, {
    'activity.organization':
      'Asociația Organizația Națională „Cercetașii României” - Filiala Cluj',
    'activity.title': input.title,
    'activity.shortTitle': input.title,
    'activity.location': input.location,
    'activity.period': `${date(input.startDate)} – ${date(input.endDate || input.startDate)}`,
  });
  for (const [key, value] of Object.entries(a))
    values[`answer.${key}`] = Array.isArray(value)
      ? value.join(', ')
      : String(value);
  values['answer.branch'] =
    branchLabels[input.branch as keyof typeof branchLabels] ?? input.branch;
  values['answer.birth_date'] = date(String(a.birth_date ?? ''));
  values['answer.guardian_relation_label'] =
    (
      {
        mother: 'Mamă',
        father: 'Tată',
        guardian: 'Tutore',
        other: 'Alt reprezentant legal',
      } as Record<string, string>
    )[String(a.guardian_relation)] ?? '';
  values['answer.medical_details'] = [
    a.medical_notes,
    a.dietary && `Regim alimentar: ${String(a.dietary)}`,
    a.support_needs && `Nevoi de sprijin: ${String(a.support_needs)}`,
  ]
    .filter(Boolean)
    .join('\n');
  values['answer.signature_blank'] = '';
  values['answer.signature_date'] = '';
  values.appendix = (input.extraFields ?? [])
    .filter((field) => a[field.code] !== undefined && a[field.code] !== '')
    .map(
      (field) =>
        `${field.label}\n${Array.isArray(a[field.code]) ? (a[field.code] as string[]).join(', ') : String(a[field.code])}`,
    )
    .join('\n\n');
  const choices = {
    transport: a.transport,
    treatment: a.treatment,
    medication_mode: a.medication_mode,
    medical_relevant: a.medical_relevant ?? '',
    has_medication: a.medication && a.medication_mode !== 'none' ? 'yes' : 'no',
  };
  for (const [key, selected] of Object.entries(choices))
    for (const option of [
      'branch',
      'personal',
      'approved',
      'call_first',
      'no',
      'yes',
      'self',
      'supervised',
      'medical',
    ])
      values[`choice.${key}.${option}`] = selected === option ? '●' : '○';
  values['check.acknowledgement'] = a.acknowledgement === true ? '☑' : '☐';
  const photos = Array.isArray(a.photo_uses) ? a.photo_uses : [];
  for (const code of [
    'archive',
    'social',
    'closed_groups',
    'print',
    'website',
    'partners',
  ])
    values[`photo.${code}`] = photos.includes(code) ? '☑' : '☐';
  values['check.photo_none'] = photos.length ? '☐' : '☑';
  for (const code of [
    'allergies',
    'support',
    'anaphylaxis',
    'diet',
    'conditions',
    'other',
    'effort',
  ])
    values[`medical.${code}`] =
      Array.isArray(a.medical_categories) && a.medical_categories.includes(code)
        ? '☑'
        : '☐';
  input.details.equipment
    .split('\n')
    .filter((v) => v.trim())
    .forEach((line, index) => {
      values[`equipment.${index}`] =
        `☐ ${line.trim().replace(/^[☐☑•]\s*/, '')}`;
    });
  return values;
}
export async function renderFixedConsent(
  input: FixedConsentInput,
): Promise<Buffer> {
  const directory = await mkdtemp(join(tmpdir(), 'scouts-consent-'));
  try {
    const values = join(directory, 'values.json');
    const document = join(directory, 'acord.docx');
    await writeFile(values, JSON.stringify(fixedConsentValues(input)), {
      mode: 0o600,
    });
    await execute(
      process.env.PARENTAL_CONSENT_PYTHON || 'python3',
      [join(__dirname, 'fixed-template', 'fill.py'), values, document],
      { timeout: 20000, maxBuffer: 4096 },
    );
    await execute(
      process.env.LIBREOFFICE_PATH || 'libreoffice',
      [
        `-env:UserInstallation=${pathToFileURL(join(directory, 'profile')).href}`,
        '--headless',
        '--convert-to',
        'pdf:writer_pdf_Export',
        '--outdir',
        directory,
        document,
      ],
      { timeout: 90000, maxBuffer: 4096 },
    );
    await execute(
      process.env.PARENTAL_CONSENT_PYTHON || 'python3',
      [
        join(__dirname, 'fixed-template', 'fill.py'),
        '--signature',
        join(directory, 'acord.pdf'),
      ],
      { timeout: 20000, maxBuffer: 4096 },
    );
    const bytes = await readFile(join(directory, 'acord.pdf'));
    if (!bytes.subarray(0, 5).equals(Buffer.from('%PDF-')))
      throw new Error('Invalid output');
    return bytes;
  } catch {
    // Child output may contain private answers. Never expose stdout or stderr.
    throw new ServiceUnavailableException(
      'Acordul nu a putut fi pregătit momentan. Înscrierea este salvată; reîncearcă descărcarea.',
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
