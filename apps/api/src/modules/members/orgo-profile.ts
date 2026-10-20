import type { Branch } from './member.types';
export const object = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
export const profileFields: Record<string, string> = {
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
