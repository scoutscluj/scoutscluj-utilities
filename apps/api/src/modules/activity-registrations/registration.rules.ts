import { BadRequestException } from '@nestjs/common';
import {
  emptyFixedConsent,
  fixedConsentLabels,
  fixedConsentOptionalFields,
  type FixedConsentDetails,
} from '@scouts-cluj/parental-consent-schema';
import {
  cardPaymentAmount,
  record,
  text,
  type ProcessingFee,
} from '../membership/membership.rules';

export type Answer = string | number | boolean | string[];
export function activityEnded(
  activity: {
    status?: string;
    endDate?: Date | string | null;
    startDate?: Date | string | null;
  },
  now = new Date(),
) {
  if (activity.status === 'completed' || activity.status === 'cancelled')
    return true;
  const end = activity.endDate ?? activity.startDate;
  if (!end) return false;
  const day =
    end instanceof Date ? end.toISOString().slice(0, 10) : end.slice(0, 10);
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Bucharest',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return day < today;
}
export function activityIsPublic(
  activity: Parameters<typeof activityEnded>[0],
  settings: { published: boolean },
  now = new Date(),
) {
  return settings.published && !activityEnded(activity, now);
}
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
  coverImageUrl?: string;
  consent?: FixedConsentDetails | null;
  unitActivities?: Record<string, string>;
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
  installments: {
    amountBani: number;
    due: string;
    key?: string;
    method?: 'platform' | 'cash';
  }[];
  questions: Question[];
  medicalUserIds: number[];
  administrativeUserIds: number[];
  terms: string;
};
export const defaultSettings = (): RegistrationSettings => ({
  coverImageUrl: '',
  consent: null,
  unitActivities: {},
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
  s.coverImageUrl = b.coverImageUrl ? text(b.coverImageUrl, 2000) : '';
  if (s.coverImageUrl) {
    let url: URL;
    try {
      url = new URL(s.coverImageUrl);
    } catch {
      throw new BadRequestException('Adresa imaginii nu este validă.');
    }
    if (url.protocol !== 'https:' || url.username || url.password)
      throw new BadRequestException(
        'Folosește o imagine accesibilă prin HTTPS.',
      );
  }
  if (b.consent) {
    const source = record(b.consent);
    const details = emptyFixedConsent();
    for (const key of Object.keys(details) as (keyof FixedConsentDetails)[])
      details[key] = source[key] ? text(source[key], 12000) : '';
    if (b.published === true) {
      const missing = (
        Object.keys(details) as (keyof FixedConsentDetails)[]
      ).filter(
        (key) =>
          !details[key].trim() && !fixedConsentOptionalFields.includes(key),
      );
      if (missing.length)
        throw new BadRequestException({
          message:
            'Completează informațiile obligatorii ale acordului de participare.',
          issues: missing.map((key) => ({
            field: `consent.${key}`,
            label: fixedConsentLabels[key],
            message: 'Acest câmp este obligatoriu pentru publicare.',
          })),
        });
    }
    if (details.equipment.split('\n').filter((v) => v.trim()).length > 20)
      throw new BadRequestException(
        'Formatul fix permite cel mult 20 de elemente de echipament.',
      );
    s.consent = details;
  }
  if (b.unitActivities !== undefined) {
    const entries = Object.entries(record(b.unitActivities));
    if (entries.length > 100)
      throw new BadRequestException('Prea multe unități în acord.');
    s.unitActivities = Object.fromEntries(
      entries.map(([key, value]) => [
        text(key, 100),
        value ? text(value, 12000) : '',
      ]),
    );
  } else s.unitActivities = undefined;
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
  s.installments = b.installments.map((v, installmentIndex) => {
    const x = record(v);
    if (
      x.method !== undefined &&
      x.method !== 'platform' &&
      x.method !== 'cash'
    )
      throw new BadRequestException('Alege modalitatea de plată a tranșei.');
    const key = x.key ? text(x.key, 100) : `installment-${installmentIndex}`;
    if (!/^[a-zA-Z0-9_-]+$/.test(key))
      throw new BadRequestException('Identificator de tranșă invalid.');
    return {
      amountBani: amount(x.amountBani, false),
      due: date(x.due),
      key,
      method: x.method === 'cash' ? 'cash' : 'platform',
    };
  });
  if (new Set(s.installments.map((x) => x.key)).size !== s.installments.length)
    throw new BadRequestException(
      'Identificatorii tranșelor trebuie să fie distincți.',
    );
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

/** Cash tranches remain due, but are never offered to the card processor.
 * Explicit handoff receipts keep their allocation; other receipts/support cover
 * the platform portion first. Discounted fees clip the original schedule. */
export function paymentBreakdown(
  total: number,
  covered: number,
  installments: RegistrationSettings['installments'],
  entries: { amountBani: number; installmentKey?: string | null }[] = [],
) {
  let scheduled = 0;
  const plan = installments.map((item, index) => {
    const amountBani = Math.max(
      0,
      Math.min(item.amountBani, total - scheduled),
    );
    scheduled += amountBani;
    return { ...item, key: item.key ?? `installment-${index}`, amountBani };
  });
  const cash = plan.filter((item) => item.method === 'cash');
  const cashTotal = cash.reduce((sum, item) => sum + item.amountBani, 0);
  const platformTotal = total - cashTotal;
  let credit = Math.max(0, covered);
  const cashInstallments = cash.map((item) => {
    const explicit = Math.min(
      credit,
      item.amountBani,
      Math.max(
        0,
        entries
          .filter((e) => e.installmentKey === item.key)
          .reduce((sum, e) => sum + e.amountBani, 0),
      ),
    );
    credit -= explicit;
    return { ...item, remainingBani: item.amountBani - explicit };
  });
  const platformCovered = Math.min(platformTotal, credit);
  credit -= platformCovered;
  for (const item of cashInstallments) {
    const used = Math.min(item.remainingBani, credit);
    item.remainingBani -= used;
    credit -= used;
  }
  const cashRemainingBani = cashInstallments.reduce(
    (sum, item) => sum + item.remainingBani,
    0,
  );
  return {
    cashInstallments,
    cashRemainingBani,
    cardRemainingBani: Math.max(
      0,
      total - Math.max(0, covered) - cashRemainingBani,
    ),
    installment: installmentBalance(
      platformTotal,
      platformCovered,
      plan.filter((item) => item.method !== 'cash'),
    ),
  };
}
