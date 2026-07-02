import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { FinancialDocumentStatus } from '../finance/entities/financial-document-status.enum';
import { FinancialDocument } from '../finance/entities/financial-document.entity';
import { UserRole } from '../users/entities/user-role.enum';
import { User } from '../users/entities/user.entity';
import type { CurrentUser } from '../users/users.types';
import {
  ActivityDto,
  ActivityFinanceSummaryDto,
  CreateActivityDto,
  UpdateActivityDto,
  UpdateActivityDepartmentsDto,
} from './dto/activity.dto';
import { ActivityStatus } from './entities/activity-status.enum';
import { ActivityType } from './entities/activity-type.enum';
import { Activity } from './entities/activity.entity';
import {
  cleanOptionalText,
  cleanRequiredText,
  normalizeDepartments,
  parseOptionalDate,
} from './activity-input';

const TERMINAL_STATUSES = new Set<string>([
  FinancialDocumentStatus.Sent,
  FinancialDocumentStatus.Rejected,
  FinancialDocumentStatus.Archived,
]);

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
    private readonly auditService: AuditService,
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
      departments: normalizeDepartments(input.departments),
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

  async updateActivity(
    user: CurrentUser,
    activityId: number,
    input: UpdateActivityDto,
  ): Promise<ActivityDto> {
    const activity = await this.getManagedActivity(user, activityId);
    const before = this.activityAuditSnapshot(activity);

    if (input.title !== undefined) {
      activity.title = cleanRequiredText(input.title, 'Titlul activității');
    }
    if (input.type !== undefined) {
      if (!Object.values(ActivityType).includes(input.type)) {
        throw new BadRequestException('Tipul activității nu este valid.');
      }
      activity.type = input.type;
    }
    if (input.status !== undefined) {
      if (!Object.values(ActivityStatus).includes(input.status)) {
        throw new BadRequestException('Starea activității nu este validă.');
      }
      activity.status = input.status;
    }
    if (input.startDate !== undefined) {
      activity.startDate = parseOptionalDate(input.startDate) ?? null;
    }
    if (input.endDate !== undefined) {
      activity.endDate = parseOptionalDate(input.endDate) ?? null;
    }
    if (
      activity.startDate &&
      activity.endDate &&
      activity.endDate < activity.startDate
    ) {
      throw new BadRequestException(
        'Data de final nu poate fi înaintea datei de început.',
      );
    }
    if (input.location !== undefined) {
      activity.location =
        cleanOptionalText(input.location)?.slice(0, 255) ?? null;
    }
    if (input.description !== undefined) {
      activity.description = cleanOptionalText(input.description) ?? null;
    }
    if (input.departments !== undefined) {
      activity.departments = normalizeDepartments(input.departments);
    }

    await this.em.flush();
    await this.recordActivityUpdate(user, activity, before);

    const [serialized] = await this.serializeActivities([activity], user);
    return serialized;
  }

  async updateDepartments(
    user: CurrentUser,
    activityId: number,
    input: UpdateActivityDepartmentsDto,
  ): Promise<ActivityDto> {
    const activity = await this.getManagedActivity(user, activityId);
    const before = this.activityAuditSnapshot(activity);

    if (!Array.isArray(input.departments)) {
      throw new BadRequestException(
        'Departamentele activității nu sunt valide.',
      );
    }

    activity.departments = normalizeDepartments(input.departments);
    await this.em.flush();
    await this.recordActivityUpdate(user, activity, before);

    const [serialized] = await this.serializeActivities([activity], user);
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
      departments: activity.departments,
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

  private canManageActivity(user: CurrentUser, activity: Activity) {
    return (
      activity.coordinatorId === user.id ||
      user.roles.includes(UserRole.SuperAdmin)
    );
  }

  private async getManagedActivity(user: CurrentUser, activityId: number) {
    const activity = await this.activitiesRepository.findOne({
      id: activityId,
    });
    if (!activity) {
      throw new NotFoundException('Activitatea nu există.');
    }

    if (!this.canManageActivity(user, activity)) {
      throw new BadRequestException(
        'Nu poți modifica setările acestei activități.',
      );
    }

    return activity;
  }

  private activityAuditSnapshot(activity: Activity) {
    return {
      title: activity.title,
      type: activity.type,
      status: activity.status,
      departments: [...activity.departments].sort(),
      startDate: activity.startDate?.toISOString(),
      endDate: activity.endDate?.toISOString(),
      location: activity.location ?? undefined,
      description: activity.description ?? undefined,
    };
  }

  private async recordActivityUpdate(
    user: CurrentUser,
    activity: Activity,
    before: ReturnType<ActivitiesService['activityAuditSnapshot']>,
  ) {
    const after = this.activityAuditSnapshot(activity);
    const changedFields = Object.keys(after).filter(
      (key) =>
        JSON.stringify(before[key as keyof typeof before]) !==
        JSON.stringify(after[key as keyof typeof after]),
    );

    if (!changedFields.length) {
      return;
    }

    await this.auditService.record({
      actorId: user.id,
      action: 'activity.settings_updated',
      entityType: 'activity',
      entityId: activity.id,
      activityId: activity.id,
      metadata: { changedFields, before, after },
    });
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
