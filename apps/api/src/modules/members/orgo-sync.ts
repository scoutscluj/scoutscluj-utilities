const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const equalValue = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// Custom fields reconcile independently, rather than as one replaceable array.
export function flattenFields(profile: Record<string, unknown>) {
  const values = { ...profile };
  if (
    typeof values.dateBirth === 'string' &&
    /^\d{4}-\d{2}-\d{2}/.test(values.dateBirth)
  )
    values.dateBirth = values.dateBirth.slice(0, 10);
  delete values.customFieldValues;
  for (const field of (Array.isArray(profile.customFieldValues)
    ? profile.customFieldValues
    : []
  ).map(object))
    values[`custom:${Number(field.field)}`] = field.value ?? null;
  return values;
}

export function restoreFields(
  values: Record<string, unknown>,
  remote: Record<string, unknown>,
) {
  const result = { ...values };
  const fields = (
    Array.isArray(remote.customFieldValues) ? remote.customFieldValues : []
  ).map((f) => ({ ...object(f) }));
  for (const [key, value] of Object.entries(values)) {
    if (!key.startsWith('custom:')) continue;
    const id = Number(key.slice(7));
    const field = fields.find((f) => Number(f.field) === id);
    if (field) field.value = value;
    else fields.push({ field: id, value, media: null });
    delete result[key];
  }
  if (fields.length || 'customFieldValues' in remote)
    result.customFieldValues = fields;
  return result;
}

export function localStatus(
  raw: unknown,
  active = 'ACTIVE',
  withdrawn?: string,
) {
  if (raw === active) return 'active';
  if (withdrawn && raw === withdrawn) return 'withdrawn';
  if (raw === 'SUSPENDED') return 'suspended';
  if (raw === 'INACTIVE') return 'inactive';
  return 'review';
}

export class OrgoRequestError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfterMs = 0,
  ) {
    super(`Orgo request failed (${status})`);
  }
  get temporary() {
    return this.status === 429 || this.status >= 500;
  }
}

export function retryDelay(attempts: number, retryAfterMs = 0) {
  return Math.max(
    retryAfterMs,
    Math.min(3600000, 5000 * 2 ** Math.min(attempts, 9)) *
      (1 + Math.random() * 0.2),
  );
}

export function feePriceReference(value: unknown): string | null {
  const field = object(value);
  const candidate =
    typeof value === 'string'
      ? value
      : typeof field['@id'] === 'string'
        ? field['@id']
        : Number.isInteger(field.id)
          ? `/api/v1/product_prices/${field.id as number}`
          : null;
  return typeof candidate === 'string' &&
    /^\/api\/v1\/product_prices\/\d+$/.test(candidate)
    ? candidate
    : null;
}
