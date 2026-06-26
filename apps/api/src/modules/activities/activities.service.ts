import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FinancialDocumentStatus } from '../finance/entities/financial-document-status.enum';
import { FinancialDocument } from '../finance/entities/financial-document.entity';
import { UserRole } from '../users/entities/user-role.enum';
import { User } from '../users/entities/user.entity';
import type { CurrentUser } from '../users/users.types';
import {
  ActivityDto,
  ActivityFinanceSummaryDto,
  CreateActivityDto,
} from './dto/activity.dto';
import { ActivityStatus } from './entities/activity-status.enum';
import { ActivityType } from './entities/activity-type.enum';
import { Activity } from './entities/activity.entity';

const TERMINAL_STATUSES = new Set<string>([
  FinancialDocumentStatus.Sent,
  FinancialDocumentStatus.Rejected,
  FinancialDocumentStatus.Archived,
]);

const cleanOptionalText = (value?: string) => {
  const cleaned = value?.trim();
  return cleaned || undefined;
};

const cleanRequiredText = (value: string | undefined, fieldName: string) => {
  const cleaned = cleanOptionalText(value);
  if (!cleaned) {
    throw new BadRequestException(`${fieldName} este obligatoriu.`);
  }

  return cleaned.slice(0, 255);
};

const parseOptionalDate = (value?: string) => {
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

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly activitiesRepository: EntityRepository<Activity>,
    @InjectRepository(FinancialDocument)
    private readonly documentsRepository: EntityRepository<FinancialDocument>,
    @InjectRepository(User)
    private readonly usersRepository: EntityRepository<User>,
    @Inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async createActivity(
    user: CurrentUser,
    input: CreateActivityDto,
  ): Promise<ActivityDto> {
    if (!Object.values(ActivityType).includes(input.type)) {
      throw new BadRequestException('Tipul activității nu este valid.');
    }

    const startDate = parseOptionalDate(input.startDate);
    const endDate = parseOptionalDate(input.endDate);
    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException(
        'Data de final nu poate fi înaintea datei de început.',
      );
    }

    const activity = this.activitiesRepository.create({
      coordinatorId: user.id,
      title: cleanRequiredText(input.title, 'Titlul activității'),
      type: input.type,
      status: ActivityStatus.Planned,
      startDate,
      endDate,
      location: cleanOptionalText(input.location)?.slice(0, 255),
      description: cleanOptionalText(input.description),
    });

    this.em.persist(activity);
    await this.em.flush();

    const [serialized] = await this.serializeActivities([activity]);
    return serialized;
  }

  async listActivities(user: CurrentUser): Promise<ActivityDto[]> {
    const activities = await this.activitiesRepository.findAll({
      orderBy: { startDate: 'asc', createdAt: 'desc' },
    });

    return this.serializeActivities(activities, user);
  }

  async getActivity(
    user: CurrentUser,
    activityId: number,
  ): Promise<ActivityDto> {
    const activity = await this.activitiesRepository.findOne({
      id: activityId,
    });
    if (!activity) {
      throw new NotFoundException('Activitatea nu există.');
    }

    const [serialized] = await this.serializeActivities([activity], user);
    return serialized;
  }

  private async serializeActivities(
    activities: Activity[],
    user?: CurrentUser,
  ): Promise<ActivityDto[]> {
    const coordinatorNames = await this.getUserNames(
      activities.map((activity) => activity.coordinatorId),
    );
    const financeSummaries = await this.getFinanceSummariesForActivities(
      activities,
      user,
    );

    return activities.map((activity) => ({
      id: activity.id,
      title: activity.title,
      type: activity.type,
      status: activity.status,
      coordinatorId: activity.coordinatorId,
      coordinatorName:
        coordinatorNames.get(activity.coordinatorId) ??
        `Utilizator #${activity.coordinatorId}`,
      startDate: activity.startDate?.toISOString(),
      endDate: activity.endDate?.toISOString(),
      location: activity.location ?? undefined,
      description: activity.description ?? undefined,
      orgoEventId: activity.orgoEventId ?? undefined,
      orgoEventIri: activity.orgoEventIri ?? undefined,
      financeSummary:
        financeSummaries.get(activity.id) ?? this.emptyFinanceSummary(),
      createdAt: activity.createdAt.toISOString(),
      updatedAt: activity.updatedAt.toISOString(),
    }));
  }

  private async getFinanceSummariesForActivities(
    activities: Activity[],
    user?: CurrentUser,
  ) {
    const summaries = new Map<number, ActivityFinanceSummaryDto>();
    const activityIds = activities.map((activity) => activity.id);
    if (!activityIds.length) {
      return summaries;
    }

    const documents = await this.documentsRepository.find({
      activityId: { $in: activityIds },
    });
    const coordinatedActivityIds = new Set(
      user
        ? activities
            .filter((activity) => activity.coordinatorId === user.id)
            .map((activity) => activity.id)
        : [],
    );
    const visibleDocuments =
      !user || this.canManageFinance(user)
        ? documents
        : documents.filter(
            (document) =>
              document.uploaderId === user.id ||
              Boolean(
                document.activityId &&
                coordinatedActivityIds.has(document.activityId),
              ),
          );

    for (const document of visibleDocuments) {
      if (!document.activityId) {
        continue;
      }

      const summary =
        summaries.get(document.activityId) ?? this.emptyFinanceSummary();
      summary.totalDocuments += 1;
      if (!TERMINAL_STATUSES.has(String(document.status))) {
        summary.openDocuments += 1;
      }
      const status = String(document.status);
      if (status === 'sent') {
        summary.sentDocuments += 1;
      }
      if (status === 'needs_clarification') {
        summary.needsClarification += 1;
      }
      summaries.set(document.activityId, summary);
    }

    return summaries;
  }

  private emptyFinanceSummary(): ActivityFinanceSummaryDto {
    return {
      totalDocuments: 0,
      openDocuments: 0,
      sentDocuments: 0,
      needsClarification: 0,
    };
  }

  private canManageFinance(user: CurrentUser) {
    return (
      user.roles.includes(UserRole.FinanceManager) ||
      user.roles.includes(UserRole.SuperAdmin)
    );
  }

  private async getUserNames(userIds: number[]) {
    const uniqueIds = Array.from(new Set(userIds));
    if (!uniqueIds.length) {
      return new Map<number, string>();
    }

    const users = await this.usersRepository.find({ id: { $in: uniqueIds } });
    return new Map(users.map((user) => [user.id, user.displayName]));
  }
}
