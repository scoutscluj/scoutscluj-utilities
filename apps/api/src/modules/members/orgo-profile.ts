import type { Branch, Profile } from './member.types';
export const object = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
export const profileFields: Record<string, string> = {
  fullName: 'Nume complet Orgo',
  email: 'Email Orgo',
  phoneNumber: 'Telefon Orgo',
  dateBirth: 'Data nașterii Orgo',
  firstName: 'Prenume',
  lastName: 'Nume de familie',
  middleName: 'Alte prenume',
  gender: 'Gen',
  address: 'Adresă',
  postalCode: 'Cod poștal',
  townCurrent: 'Localitate curentă',
  townFrom: 'Localitate de origine',
  phoneCountry: 'Prefix telefonic',
  dateJoined: 'Data înscrierii',
  dateJoinedFullMember: 'Membru din',
  bio: 'Despre membru',
  professionHeadline: 'Ocupație',
  professionOrganisation: 'Organizație / angajator',
  professionOrganisationWebsite: 'Site organizație',
  professionOrganisationRole: 'Rol în organizație',
  professionIndustry: 'Domeniu profesional',
  professionJob: 'Profesie',
  professionExpertise: 'Competențe',
  professionExpertiseOther: 'Alte competențe',
  professionSector: 'Sector profesional',
  educationStatus: 'Studii',
  educationPhd: 'Doctorat',
  educationMaster: 'Master',
  educationUniversity: 'Universitate',
  profileWebsite: 'Site personal',
  profileFacebook: 'Facebook',
  profileTwitter: 'Twitter',
  profileBsky: 'Bluesky',
  profileSignal: 'Signal',
  profileLinkedin: 'LinkedIn',
  profileInstagram: 'Instagram',
  profileTelegram: 'Telegram',
  profileTiktok: 'TikTok',
  companyIdentifier: 'Identificator companie',
  companyName: 'Companie',
  companyAddress: 'Adresă companie',
  companyRegNo: 'Registrul comerțului',
  language: 'Limbă',
  timezone: 'Fus orar',
  availability: 'Disponibilitate',
  familyNth: 'Poziție în familie',
  cardId: 'Număr card',
  dateCreated: 'Cont creat',
  parentConsentDate: 'Data acordului parental',
  parentConsentMethod: 'Metoda acordului parental',
  logo: 'Fotografie',
  type: 'Tip membru Orgo',
  customFieldValues: 'Informații suplimentare',
};
export const readonlyFields = new Set([
  'fullName',
  'logo',
  'type',
  'cardId',
  'dateCreated',
  'parentConsentDate',
  'parentConsentMethod',
  'townCurrent',
  'townFrom',
  'customFieldValues',
]);
export function cleanProfile(raw: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(profileFields)) {
    const v = raw[key];
    if (v === undefined) continue;
    if (
      v === null ||
      typeof v === 'string' ||
      typeof v === 'boolean' ||
      typeof v === 'number'
    )
      result[key] = v;
    else if (key === 'type' || key === 'townCurrent' || key === 'townFrom')
      result[key] = { id: object(v).id, name: object(v).name };
    else if (key === 'customFieldValues' && Array.isArray(v))
      result[key] = v.map((x) => {
        const r = object(x),
          f = object(r.field);
        return {
          field:
            typeof r.field === 'number'
              ? r.field
              : typeof r.field === 'string'
                ? Number(r.field.split('/').pop())
                : f.id,
          value: r.value ?? null,
          media: r.media ?? null,
        };
      });
    else if (JSON.stringify(v).length < 16000) result[key] = v;
  }
  return result;
}
export function branchFor(raw: Record<string, unknown>): Branch | null {
  const map: Record<number, Branch> = {
    38: 'lupisori',
    39: 'temerari',
    40: 'exploratori',
    41: 'seniori',
  };
  return map[Number(object(raw.type).id)] ?? null;
}
export function activeRoles(raw: Record<string, unknown>, now = new Date()) {
  return (Array.isArray(raw.userRoles) ? raw.userRoles : [])
    .map(object)
    .filter(
      (r) =>
        !r.dateEnded ||
        (typeof r.dateEnded === 'string' &&
          Date.parse(r.dateEnded) > now.getTime()),
    );
}
export function reconcile(
  base: Record<string, unknown>,
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
) {
  const values = { ...local },
    nextBase = { ...base },
    conflicts: Record<string, { local: unknown; remote: unknown }> = {};
  const equal = (a: unknown, b: unknown) =>
    JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  for (const [key, value] of Object.entries(remote)) {
    if (equal(local[key], base[key]) || equal(local[key], value)) {
      values[key] = value;
      nextBase[key] = value;
    } else if (!equal(value, base[key]))
      conflicts[key] = { local: local[key] ?? null, remote: value };
  }
  return { values, base: nextBase, conflicts };
}

export function customProfileKey(
  definition: Record<string, unknown>,
): keyof Profile | undefined {
  const name = (typeof definition.name === 'string' ? definition.name : '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  return (
    {
      alimentatie: 'dietary',
      alergii: 'allergies',
      'alte nevoi': 'needs',
    } as Record<string, keyof Profile>
  )[name];
}
export function projectCustomProfile(
  profile: Profile,
  orgo: Record<string, unknown>,
): Profile {
  const next = { ...profile };
  const fields = Array.isArray(orgo.customFieldValues)
    ? orgo.customFieldValues.map(object)
    : [];
  for (const definition of (Array.isArray(orgo.customDefinitions)
    ? orgo.customDefinitions
    : []
  ).map(object)) {
    if (
      definition.isOnlyAdmin === true ||
      definition.visibility === 'admin' ||
      definition.isEncrypted === true
    )
      continue;
    const key = customProfileKey(definition),
      field = fields.find((f) => Number(f.field) === Number(definition.id));
    if (
      key &&
      field &&
      (field.value === null ||
        ['string', 'number', 'boolean'].includes(typeof field.value))
    ) {
      const raw =
        typeof field.value === 'string'
          ? field.value
          : typeof field.value === 'number' || typeof field.value === 'boolean'
            ? String(field.value)
            : '';
      const options = object(object(definition.options).options);
      next[key] = typeof options[raw] === 'string' ? options[raw] : raw;
    }
  }
  return next;
}
export function customProfilePatch(
  before: Profile,
  after: Profile,
  orgo: Record<string, unknown>,
) {
  const values = (
    Array.isArray(orgo.customFieldValues) ? orgo.customFieldValues : []
  ).map((v) => ({ ...object(v) }));
  let changed = false;
  for (const definition of (Array.isArray(orgo.customDefinitions)
    ? orgo.customDefinitions
    : []
  ).map(object)) {
    if (
      definition.isOnlyAdmin === true ||
      definition.visibility === 'admin' ||
      definition.isEncrypted === true
    )
      continue;
    const key = customProfileKey(definition);
    if (!key || before[key] === after[key]) continue;
    const field = values.find((f) => Number(f.field) === Number(definition.id));
    const options = object(object(definition.options).options);
    const choice = Object.entries(options).find(
      ([, label]) => label === after[key],
    )?.[0];
    const value =
      choice === undefined
        ? after[key]
        : typeof field?.value === 'number'
          ? Number(choice)
          : choice;
    if (field) field.value = value;
    else
      values.push({
        field: Number(definition.id),
        value,
        media: null,
      });
    changed = true;
  }
  return changed
    ? {
        values,
        patch: Object.fromEntries(
          values.map((f) => [String(f.field), f.value]),
        ),
      }
    : null;
}
