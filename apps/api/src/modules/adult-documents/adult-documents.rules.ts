import { BadRequestException } from '@nestjs/common';
import { membershipPeriodFor } from '../membership/membership.rules';

export const DOCUMENT_KINDS = [
  'behavioural_integrity',
  'criminal_record',
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];
export type DocumentStatus = 'pending' | 'validated' | 'rejected';
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export function scoutingYear(now = new Date()) {
  return Number(membershipPeriodFor(now).startsOn.slice(0, 4));
}

export function adultOn(
  birthDate: string | null | undefined,
  now = new Date(),
) {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const parsed = new Date(birthDate);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== birthDate
  )
    return null;
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Bucharest',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const birthday = `${Number(birthDate.slice(0, 4)) + 18}${birthDate.slice(4)}`;
  return birthday <= today;
}

export function parseYear(value: unknown) {
  if (value === undefined || value === '') return scoutingYear();
  if (
    (typeof value !== 'string' && typeof value !== 'number') ||
    !/^[0-9]{4}$/.test(String(value))
  )
    throw new BadRequestException('An cercetășesc invalid.');
  const year = Number(value);
  if (year < 2000 || year > scoutingYear())
    throw new BadRequestException(
      'Selectează un an cercetășesc între 2000 și anul curent.',
    );
  return year;
}

export function parseKind(value: unknown): DocumentKind {
  if (value !== 'behavioural_integrity' && value !== 'criminal_record')
    throw new BadRequestException('Tip de document invalid.');
  return value;
}

export function documentInput(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new BadRequestException('Date invalide.');
  return input as Record<string, unknown>;
}

export function decodeDocument(input: Record<string, unknown>) {
  const encoded = input.contentBase64;
  if (
    typeof encoded !== 'string' ||
    !encoded.length ||
    encoded.length > 4 * Math.ceil(MAX_DOCUMENT_BYTES / 3) ||
    encoded.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)
  )
    throw new BadRequestException('Fișier invalid sau mai mare de 10 MB.');
  const data = Buffer.from(encoded, 'base64');
  if (
    !data.length ||
    data.length > MAX_DOCUMENT_BYTES ||
    data.toString('base64') !== encoded
  )
    throw new BadRequestException('Fișier invalid sau mai mare de 10 MB.');
  const type = data.subarray(0, 5).equals(Buffer.from('%PDF-'))
    ? 'application/pdf'
    : data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? 'image/png'
      : data[0] === 255 && data[1] === 216 && data[2] === 255
        ? 'image/jpeg'
        : null;
  if (!type || input.contentType !== type)
    throw new BadRequestException(
      'Încarcă un fișier PDF, JPG sau PNG cu tipul corect.',
    );
  if (
    typeof input.filename !== 'string' ||
    !input.filename.trim() ||
    input.filename.length > 255
  )
    throw new BadRequestException('Numele fișierului este invalid.');
  const filename = input.filename
    .split(/[/\\]/)
    .pop()!
    .split('')
    .filter(
      (character) =>
        character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127,
    )
    .join('')
    .trim();
  if (!filename)
    throw new BadRequestException('Numele fișierului este invalid.');
  try {
    encodeURIComponent(filename);
  } catch {
    throw new BadRequestException('Numele fișierului este invalid.');
  }
  return { data, contentType: type, filename };
}

export function summarizeDocuments(
  documents: { kind: DocumentKind; status: DocumentStatus; version: number }[],
) {
  return DOCUMENT_KINDS.map(
    (kind) =>
      documents
        .filter((d) => d.kind === kind)
        .sort((a, b) => b.version - a.version)[0]?.status ?? 'missing',
  );
}
