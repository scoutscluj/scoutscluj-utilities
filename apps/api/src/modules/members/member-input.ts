import { BadRequestException } from '@nestjs/common';
export function bodyObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new BadRequestException('Date invalide.');
  return input as Record<string, unknown>;
}
export function stringValue(value: unknown, max = 255) {
  if (typeof value !== 'string' || value.length > max)
    throw new BadRequestException('Text invalid sau prea lung.');
  return value.trim();
}
export function dateValue(value: unknown) {
  const date = stringValue(value);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    throw new BadRequestException('Dată invalidă.');
  return date;
}
