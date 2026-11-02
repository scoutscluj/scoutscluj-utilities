import { BadRequestException } from '@nestjs/common';
import { bodyObject, dateValue, stringValue } from './member-input';
import { localDate } from './member.types';

export type AdmissionData = {
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
  const forChild = b.forChild === true;
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
  if (
    (minor || forChild) &&
    (!guardianName || !guardianPhone || !guardianRelation)
  )
    throw new BadRequestException(
      'Completează numele, relația și telefonul părintelui/tutorelui.',
    );
  if (b.consent !== true)
    throw new BadRequestException(
      'Confirmă acordul pentru prelucrarea cererii.',
    );
  const memberEmail = email(b.email, !minor && !forChild);
  const guardianEmail = email(b.guardianEmail, minor || forChild);
  if ((minor || forChild) && memberEmail && memberEmail === guardianEmail)
    throw new BadRequestException(
      'Emailul copilului trebuie să fie distinct de emailul părintelui; îl poți lăsa necompletat.',
    );
  return {
    firstName,
    lastName,
    birthDate,
    schooling: b.schooling as AdmissionData['schooling'],
    grade,
    email: memberEmail,
    phone: typeof b.phone === 'string' ? stringValue(b.phone, 40) : '',
    forChild,
    guardianName,
    guardianPhone,
    guardianRelation,
    guardianEmail,
  };
}
