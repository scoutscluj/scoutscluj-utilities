import { EntityManager } from '@mikro-orm/postgresql';
import { BadRequestException, Injectable } from '@nestjs/common';
import type { CurrentUser } from '../users/users.types';
import type {
  CreatePersonalObjectiveDto,
  PersonalObjectiveDto,
} from './dto/personal-objective.dto';
import { PersonalObjective } from './entities/personal-objective.entity';

const requiredText = (value: unknown, label: string, max: number) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new BadRequestException(
      `${label} este obligatoriu și poate avea cel mult ${max} de caractere.`,
    );
  }
  return value.trim();
};

const validDeadline = (value: unknown): string => {
  if (typeof value !== 'string' || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException(
      'Termenul limită trebuie să fie o dată validă.',
    );
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException(
      'Termenul limită trebuie să fie o dată validă.',
    );
  }
  return value;
};

const serialize = (objective: PersonalObjective): PersonalObjectiveDto => ({
  id: objective.id,
  title: objective.title,
  description: objective.description,
  deadline: objective.deadline,
  createdAt: objective.createdAt.toISOString(),
});

@Injectable()
export class PersonalObjectivesService {
  constructor(private readonly em: EntityManager) {}

  async list(user: CurrentUser): Promise<PersonalObjectiveDto[]> {
    const objectives = await this.em.find(
      PersonalObjective,
      { userId: user.id },
      {
        orderBy: { deadline: 'asc', createdAt: 'desc', id: 'desc' },
      },
    );
    return objectives.map(serialize);
  }

  async create(
    user: CurrentUser,
    input: CreatePersonalObjectiveDto,
  ): Promise<PersonalObjectiveDto> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new BadRequestException('Datele obiectivului nu sunt valide.');
    }
    const objective = this.em.create(PersonalObjective, {
      userId: user.id,
      title: requiredText(input.title, 'Titlul', 200),
      description: requiredText(input.description, 'Descrierea', 5000),
      deadline: validDeadline(input.deadline),
    });
    await this.em.flush();
    return serialize(objective);
  }
}
