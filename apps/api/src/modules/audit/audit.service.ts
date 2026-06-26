import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Activity } from '../activities/entities/activity.entity';
import { User } from '../users/entities/user.entity';
import type { CurrentUser } from '../users/users.types';
import {
  canViewActivityAudit,
  canViewGlobalAudit,
  sanitizeAuditMetadata,
} from './audit-helpers';
import { AuditEntryDto, CreateAuditEntryInput } from './dto/audit.dto';
import { AuditEntry } from './entities/audit-entry.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditEntry)
    private readonly auditRepository: EntityRepository<AuditEntry>,
    @InjectRepository(Activity)
    private readonly activitiesRepository: EntityRepository<Activity>,
    @InjectRepository(User)
    private readonly usersRepository: EntityRepository<User>,
    @Inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async record(input: CreateAuditEntryInput) {
    const entry = this.auditRepository.create({
      actorId: input.actorId,
      action: input.action.slice(0, 255),
      entityType: input.entityType.slice(0, 100),
      entityId: String(input.entityId).slice(0, 100),
      activityId: input.activityId,
      metadata: (sanitizeAuditMetadata(input.metadata ?? {}) ??
        {}) as Record<string, unknown>,
    });

    this.em.persist(entry);
    await this.em.flush();
    return entry;
  }

  async listGlobal(user: CurrentUser): Promise<AuditEntryDto[]> {
    if (!this.canViewGlobalAudit(user)) {
      throw new ForbiddenException('Nu ai acces la jurnalul global de audit.');
    }

    const entries = await this.auditRepository.findAll({
      orderBy: { createdAt: 'desc' },
      limit: 250,
    });

    return this.serialize(entries);
  }

  async listForActivity(
    user: CurrentUser,
    activityId: number,
  ): Promise<AuditEntryDto[]> {
    const activity = await this.activitiesRepository.findOne({
      id: activityId,
    });
    if (!activity) {
      throw new NotFoundException('Activitatea nu există.');
    }

    if (!this.canViewActivityAudit(user, activity)) {
      throw new ForbiddenException(
        'Nu ai acces la jurnalul de audit al acestei activități.',
      );
    }

    const entries = await this.auditRepository.find(
      { activityId },
      {
        orderBy: { createdAt: 'desc' },
        limit: 250,
      },
    );

    return this.serialize(entries);
  }

  canViewGlobalAudit(user: CurrentUser) {
    return canViewGlobalAudit(user);
  }

  canViewActivityAudit(user: CurrentUser, activity: Activity) {
    return canViewActivityAudit(user, activity);
  }

  private async serialize(entries: AuditEntry[]): Promise<AuditEntryDto[]> {
    const actorNames = await this.getUserNames(
      entries
        .map((entry) => entry.actorId)
        .filter((actorId): actorId is number => Boolean(actorId)),
    );

    return entries.map((entry) => ({
      id: entry.id,
      actorId: entry.actorId ?? undefined,
      actorName: entry.actorId
        ? (actorNames.get(entry.actorId) ?? `Utilizator #${entry.actorId}`)
        : undefined,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      activityId: entry.activityId ?? undefined,
      metadata: entry.metadata as Record<string, unknown>,
      createdAt: entry.createdAt.toISOString(),
    }));
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
