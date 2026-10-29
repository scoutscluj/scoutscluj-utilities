import { BadRequestException } from '@nestjs/common';
import { record } from '../membership/membership.rules';
import type { Answer } from './registration.rules';

export type RegistrationDraftData = {
  identifier: string;
  role: 'beneficiary' | 'staff';
  email: string;
  branch: string;
  major: boolean;
  exception: boolean;
  exceptionNote: string;
  answers: Record<string, Answer>;
};

export function parseRegistrationDraft(
  value: unknown,
  allowedFields: Set<string>,
): RegistrationDraftData {
  const data = record(value);
  if (Buffer.byteLength(JSON.stringify(data), 'utf8') > 100000)
    throw new BadRequestException(
      'Înscrierea în curs conține prea multe informații.',
    );
  const text = (value: unknown, max: number) => {
    if (value === undefined) return '';
    if (typeof value !== 'string' || value.length > max)
      throw new BadRequestException(
        'Un câmp din înscrierea în curs este prea lung sau invalid.',
      );
    return value;
  };
  const answers = Object.fromEntries(
    Object.entries(record(data.answers ?? {}))
      .filter(([key]) => allowedFields.has(key))
      .map(([key, value]) => {
        if (
          !(
            typeof value === 'boolean' ||
            (typeof value === 'number' && Number.isFinite(value)) ||
            (typeof value === 'string' && value.length <= 12000) ||
            (Array.isArray(value) &&
              value.length <= 50 &&
              value.every(
                (item) => typeof item === 'string' && item.length <= 12000,
              ))
          )
        )
          throw new BadRequestException(
            'Răspuns invalid în înscrierea în curs.',
          );
        return [key, value as Answer];
      }),
  );
  return {
    identifier: text(data.identifier, 32),
    role: data.role === 'staff' ? 'staff' : 'beneficiary',
    email: text(data.email, 255),
    branch: text(data.branch, 50),
    major: data.major === true,
    exception: data.exception === true,
    exceptionNote: text(data.exceptionNote, 2000),
    answers,
  };
}
