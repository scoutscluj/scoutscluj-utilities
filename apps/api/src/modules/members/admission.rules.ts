import { decodeMemberPhoto } from './member-photo';
import { BadRequestException } from '@nestjs/common';
import { bodyObject, dateValue, stringValue } from './member-input';
import { localDate } from './member.types';

export type AdmissionData = {
  registrationFor?: 'self' | 'other';
  gender?: 'M' | 'F';
  photo?: string;
  submitterName?: string;
  submitterEmail?: string;
  structureId?: 'cluj' | 'floresti';
  firstName: string;
  lastName: string;
  birthDate: string;
  schooling: 'grade' | 'not-in-school';
  grade: number | null;
  email: string;
  phone: string;
  forChild: boolean;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  guardianRelation: string;
};
const email = (v: unknown, required: boolean) => {
  const value = typeof v === 'string' ? stringValue(v, 254).toLowerCase() : '';
  if ((required || value) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    throw new BadRequestException('Completează o adresă de email validă.');
  return value;
};
export function admissionData(
  input: unknown,
  today = localDate(new Date()),
): AdmissionData {
  const b = bodyObject(input);
  if (
    b.structureId != null &&
    (typeof b.structureId !== 'string' ||
      !['cluj', 'floresti'].includes(b.structureId))
  )
    throw new BadRequestException('Alege structura Cluj sau Florești.');
  if (!['self', 'other'].includes(String(b.registrationFor)))
    throw new BadRequestException('Alege pentru cine completezi înscrierea.');
  if (!['M', 'F'].includes(String(b.gender)))
    throw new BadRequestException('Alege genul persoanei înscrise.');
  const photo = typeof b.photo === 'string' ? b.photo : '';
  if (photo) decodeMemberPhoto(photo);
  const firstName = stringValue(b.firstName, 120),
    lastName = stringValue(b.lastName, 120);
  if (!firstName || !lastName)
    throw new BadRequestException('Numele și prenumele sunt obligatorii.');
  const birthDate = dateValue(b.birthDate);
  if (
    birthDate > today ||
    birthDate < `${Number(today.slice(0, 4)) - 120}${today.slice(4)}`
  )
    throw new BadRequestException('Data nașterii nu este validă.');
  if (!['grade', 'not-in-school'].includes(String(b.schooling)))
    throw new BadRequestException('Alege clasa sau „Nu sunt elev”.');
  const grade =
    b.schooling === 'grade' && b.grade !== '' && b.grade != null
      ? Number(b.grade)
      : null;
  if (
    b.schooling === 'grade' &&
    (grade === null || !Number.isInteger(grade) || grade < 0 || grade > 12)
  )
    throw new BadRequestException('Alege clasa: pregătitoare sau I–XII.');
  const forChild = b.registrationFor === 'other';
  const minor =
    birthDate > `${Number(today.slice(0, 4)) - 18}${today.slice(4)}`;
  const guardianName =
    typeof b.guardianName === 'string' ? stringValue(b.guardianName) : '';
  const guardianPhone =
    typeof b.guardianPhone === 'string' ? stringValue(b.guardianPhone, 40) : '';
  const guardianRelation =
    typeof b.guardianRelation === 'string'
      ? stringValue(b.guardianRelation, 80)
      : '';
  if (minor && (!guardianName || !guardianPhone || !guardianRelation))
    throw new BadRequestException(
      'Completează numele, relația și telefonul părintelui/tutorelui.',
    );
  if (b.consent !== true)
    throw new BadRequestException(
      'Confirmă acordul pentru prelucrarea cererii.',
    );
  const memberEmail = email(b.email, true);
  const guardianEmail = minor ? email(b.guardianEmail, true) : '';
  const submitterName =
    !minor && forChild && typeof b.submitterName === 'string'
      ? stringValue(b.submitterName, 120)
      : '';
  const submitterEmail =
    !minor && forChild ? email(b.submitterEmail, true) : '';
  if (!minor && forChild && !submitterName)
    throw new BadRequestException(
      'Completează numele persoanei care trimite cererea.',
    );

  return {
    registrationFor: b.registrationFor as 'self' | 'other',
    gender: b.gender as 'M' | 'F',
    ...(photo ? { photo } : {}),
    submitterName,
    submitterEmail,
    ...(b.structureId
      ? { structureId: b.structureId as 'cluj' | 'floresti' }
      : {}),
    firstName,
    lastName,
    birthDate,
    schooling: b.schooling as AdmissionData['schooling'],
    grade,
    email: memberEmail,
    phone: typeof b.phone === 'string' ? stringValue(b.phone, 40) : '',
    forChild,
    guardianName: minor ? guardianName : '',
    guardianPhone: minor ? guardianPhone : '',
    guardianRelation: minor ? guardianRelation : '',
    guardianEmail,
  };
}
