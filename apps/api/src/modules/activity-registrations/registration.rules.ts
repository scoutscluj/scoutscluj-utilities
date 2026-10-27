import { BadRequestException } from '@nestjs/common';
import {
  cardPaymentAmount,
  record,
  text,
  type ProcessingFee,
} from '../membership/membership.rules';

export type Answer = string | number | boolean | string[];
export type Question = {
  code: string;
  label: string;
  type: 'text' | 'choice' | 'multiple' | 'number' | 'date';
  required: boolean;
  options: string[];
  branches: string[];
  inPdf: boolean;
};
export type RegistrationSettings = {
  published: boolean;
  opensAt: string;
  closesAt: string;
  approvalRequired: boolean;
  paymentConfirmsPlace: boolean;
  paymentDue: string;
  beneficiaryCapacity: number | null;
  staffCapacity: number | null;
  totalCapacity: number | null;
  branchCapacities: Record<string, number>;
  structureIds: string[];
  unitIds: string[];
  groupIds: string[];
  feeBani: number;
  branchFees: Record<string, number>;
  familyFees: number[];
  installments: { amountBani: number; due: string }[];
  questions: Question[];
  medicalUserIds: number[];
  administrativeUserIds: number[];
  terms: string;
};
export const defaultSettings = (): RegistrationSettings => ({
  published: false,
  opensAt: '',
  closesAt: '',
  approvalRequired: false,
  paymentConfirmsPlace: false,
  paymentDue: '',
  beneficiaryCapacity: null,
  staffCapacity: null,
  totalCapacity: null,
  branchCapacities: {},
  structureIds: [],
  unitIds: [],
  groupIds: [],
  feeBani: 0,
  branchFees: {},
  familyFees: [],
  installments: [],
  questions: [],
  medicalUserIds: [],
  administrativeUserIds: [],
  terms: '',
});
export function amount(value: unknown, zero = true): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < (zero ? 0 : 1) ||
    Number(value) > 100000000
  )
    throw new BadRequestException(
      'Suma este invalidă. Folosește bani întregi.',
    );
  return Number(value);
}
const strings = (value: unknown): string[] => {
  if (!Array.isArray(value) || value.length > 500)
    throw new BadRequestException('Lista este invalidă.');
  return [...new Set(value.map((v) => text(v, 100)))];
};
const date = (value: unknown) => {
  if (value === '' || value === undefined) return '';
  const result = text(value, 40);
  if (
    !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(result) ||
    !Number.isFinite(Date.parse(result)) ||
    (!result.includes('T') &&
      new Date(result).toISOString().slice(0, 10) !== result) ||
    (result.includes('T') && !/(Z|[+-]\d{2}:\d{2})$/.test(result))
  )
    throw new BadRequestException('Data este invalidă.');
  return result;
};
export function parseSettings(input: unknown): RegistrationSettings {
  const b = record(input);
  const s = defaultSettings();
  for (const k of [
    'published',
    'approvalRequired',
    'paymentConfirmsPlace',
  ] as const) {
    if (typeof b[k] !== 'boolean')
      throw new BadRequestException('Opțiune invalidă.');
    s[k] = b[k];
  }
  for (const k of ['opensAt', 'closesAt', 'paymentDue'] as const)
    s[k] = date(b[k]);
  if (
    s.opensAt &&
    s.closesAt &&
    Date.parse(s.opensAt) >= Date.parse(s.closesAt)
  )
    throw new BadRequestException(
      'Închiderea trebuie să urmeze deschiderii înscrierilor.',
    );
  for (const k of [
    'beneficiaryCapacity',
    'staffCapacity',
    'totalCapacity',
  ] as const) {
    s[k] = b[k] == null ? null : amount(b[k]);
  }
  for (const k of ['structureIds', 'unitIds', 'groupIds'] as const)
    s[k] = strings(b[k] ?? []);
  for (const k of ['branchCapacities', 'branchFees'] as const) {
    s[k] = Object.fromEntries(
      Object.entries(record(b[k] ?? {})).map(([key, v]) => {
        if (!['lupisori', 'temerari', 'exploratori', 'seniori'].includes(key))
          throw new BadRequestException('Ramură invalidă.');
        return [key, amount(v)];
      }),
    );
  }
  s.feeBani = amount(b.feeBani);
  if (!Array.isArray(b.familyFees) || b.familyFees.length > 10)
    throw new BadRequestException('Tarife de familie invalide.');
  s.familyFees = b.familyFees.map((v) => amount(v));
  if (!Array.isArray(b.installments) || b.installments.length > 20)
    throw new BadRequestException('Tranșe invalide.');
  s.installments = b.installments.map((v) => {
    const x = record(v);
    return { amountBani: amount(x.amountBani, false), due: date(x.due) };
  });
  if (
    s.installments.some((x) => !x.due) ||
    s.installments.some((x, i) => i > 0 && x.due < s.installments[i - 1].due)
  )
    throw new BadRequestException(
      'Completează scadențele tranșelor în ordine.',
    );
  if (s.installments.reduce((sum, x) => sum + x.amountBani, 0) > s.feeBani)
    throw new BadRequestException('Tranșele depășesc taxa implicită.');
  for (const k of ['medicalUserIds', 'administrativeUserIds'] as const) {
    if (!Array.isArray(b[k]) || b[k].length > 100)
      throw new BadRequestException('Responsabili invalizi.');
    s[k] = [...new Set(b[k].map((v) => amount(v, false)))];
  }
  s.terms = b.terms ? text(b.terms, 10000) : '';
  if (!Array.isArray(b.questions) || b.questions.length > 40)
    throw new BadRequestException('Întrebări invalide.');
  s.questions = b.questions.map((value) => {
    const q = record(value);
    const code = text(q.code, 60);
    if (
      !/^[a-z][a-z0-9_]*$/.test(code) ||
      !['text', 'choice', 'multiple', 'number', 'date'].includes(String(q.type))
    )
      throw new BadRequestException('Întrebare invalidă.');
    return {
      code,
      label: text(q.label, 500),
      type: q.type as Question['type'],
      required: q.required === true,
      options: strings(q.options ?? []),
      branches: strings(q.branches ?? []),
      inPdf: q.inPdf === true,
    };
  });
  if (
    new Set(s.questions.map((q) => q.code)).size !== s.questions.length ||
    s.questions.some(
      (q) => ['choice', 'multiple'].includes(q.type) && !q.options.length,
    )
  )
    throw new BadRequestException('Coduri duplicate sau opțiuni lipsă.');
  return s;
}
export function validateAnswers(
  questions: Question[],
  input: unknown,
  branch: string,
): Record<string, Answer> {
  const b = record(input);
  const answers: Record<string, Answer> = {};
  for (const q of questions.filter(
    (q) => !q.branches.length || q.branches.includes(branch),
  )) {
    const v = b[q.code];
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) {
      if (q.required) throw new BadRequestException(`Completează: ${q.label}.`);
      continue;
    }
    if (q.type === 'number') {
      if (typeof v !== 'number' || !Number.isFinite(v))
        throw new BadRequestException(`Număr invalid: ${q.label}.`);
      answers[q.code] = v;
    } else if (q.type === 'multiple') {
      const selected = strings(v);
      if (selected.some((x) => !q.options.includes(x)))
        throw new BadRequestException('Opțiune invalidă.');
      answers[q.code] = selected;
    } else {
      const answer = q.type === 'date' ? date(v) : text(v, 6000);
      if (q.type === 'choice' && !q.options.includes(answer))
        throw new BadRequestException('Opțiune invalidă.');
      answers[q.code] = answer;
    }
  }
  return answers;
}
export function priceAdvice(netBani: number, fee: ProcessingFee) {
  amount(netBani);
  const recommendedBani = cardPaymentAmount(
    netBani,
    fee.percentageBasisPoints,
    fee.fixedBani,
  );
  const estimatedFeeBani = recommendedBani
    ? Math.ceil((recommendedBani * fee.percentageBasisPoints) / 10000) +
      fee.fixedBani
    : 0;
  return {
    recommendedBani,
    estimatedFeeBani,
    estimatedNetBani: recommendedBani - estimatedFeeBani,
    fee,
  };
}
export function installmentBalance(
  total: number,
  covered: number,
  installments: RegistrationSettings['installments'],
) {
  let target = 0;
  for (const item of installments) {
    target = Math.min(total, target + item.amountBani);
    if (target > covered)
      return { amountBani: target - covered, due: item.due };
  }
  return { amountBani: Math.max(0, total - covered), due: '' };
}
export function hasCapacity(
  settings: RegistrationSettings,
  rows: { role: string; branch: string; state: string }[],
  role: string,
  branch: string,
) {
  const occupying = rows.filter((r) =>
    ['accepted', 'reserved'].includes(r.state),
  );
  const limit =
    role === 'staff' ? settings.staffCapacity : settings.beneficiaryCapacity;
  return (
    (settings.totalCapacity == null ||
      occupying.length < settings.totalCapacity) &&
    (limit == null ||
      occupying.filter((r) => r.role === role).length < limit) &&
    (role === 'staff' ||
      settings.branchCapacities[branch] == null ||
      occupying.filter((r) => r.role !== 'staff' && r.branch === branch)
        .length < settings.branchCapacities[branch])
  );
}
