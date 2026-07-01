import { BadRequestException } from '@nestjs/common';
import { ActivityDepartment } from './entities/activity-department.enum';

const DEFAULT_ACTIVITY_DEPARTMENTS = [
  ActivityDepartment.Finance,
  ActivityDepartment.Kitchen,
];

export const cleanOptionalText = (value?: string) => {
  const cleaned = value?.trim();
  return cleaned || undefined;
};

export const cleanRequiredText = (
  value: string | undefined,
  fieldName: string,
) => {
  const cleaned = cleanOptionalText(value);
  if (!cleaned) {
    throw new BadRequestException(`${fieldName} este obligatoriu.`);
  }

  return cleaned.slice(0, 255);
};

export const parseOptionalDate = (value?: string) => {
  const cleaned = cleanOptionalText(value);
  if (!cleaned) {
    return undefined;
  }

  const date = new Date(cleaned);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Data activității nu este validă.');
  }

  return date;
};

export const normalizeDepartments = (departments?: ActivityDepartment[]) => {
  if (departments !== undefined && !Array.isArray(departments)) {
    throw new BadRequestException('Departamentele activității nu sunt valide.');
  }

  const values = departments ?? DEFAULT_ACTIVITY_DEPARTMENTS;
  const validDepartments = new Set<string>(Object.values(ActivityDepartment));
  const normalized = Array.from(new Set(values));

  if (
    normalized.some((department) => !validDepartments.has(String(department)))
  ) {
    throw new BadRequestException('Departamentul activității nu este valid.');
  }

  return normalized;
};
