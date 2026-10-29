import { EntityManager } from '@mikro-orm/postgresql';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { canonicalJson } from '@scouts-cluj/parental-consent-schema';
import type { CurrentUser } from '../users/users.types';
import { AuditEntry } from '../audit/entities/audit-entry.entity';
import { record, uuid } from '../membership/membership.rules';
import {
  ActivityRegistrationDraft as Draft,
  ActivityRegistrationSettings as Settings,
} from './registration.entity';
import { RegistrationService } from './registration.service';
import { parseRegistrationDraft } from './registration-draft.rules';

@Injectable()
export class RegistrationDraftsService {
  constructor(
    private readonly em: EntityManager,
    private readonly registrations: RegistrationService,
  ) {}
  async list(activityId: number, user: CurrentUser) {
    await this.registrations.publicPage(activityId, user);
    return this.em.find(
      Draft,
      { activityId, ownerId: user.id },
      { orderBy: { updatedAt: 'desc' } },
    );
  }
  async save(activityId: number, user: CurrentUser, input: unknown) {
    const page = await this.registrations.publicPage(activityId, user);
    const body = record(input);
    const settings = await this.em.findOne(Settings, { activityId });
    const data = parseRegistrationDraft(
      body.data,
      new Set([
        ...page.fields
          .filter((field) => field.type !== 'signature')
          .map((field) => field.code),
        ...(settings?.data.questions ?? []).map(
          (question) => `custom_${question.code}`,
        ),
      ]),
    );
    if (!page.canManage) {
      data.exception = false;
      data.exceptionNote = '';
    }
    return this.em.transactional(async (tx) => {
      await tx.execute('select pg_advisory_xact_lock(hashtextextended(?, 0))', [
        `registration-drafts:${user.id}:${activityId}`,
      ]);
      const id = body.id ? uuid(body.id) : randomUUID();
      const current = await tx.findOne(Draft, { id });
      if (
        current &&
        (current.ownerId !== user.id || current.activityId !== activityId)
      )
        throw new NotFoundException();
      if (
        current?.revision === 1 &&
        body.revision === 0 &&
        canonicalJson(current.data) === canonicalJson(data)
      )
        return current;
      if ((current?.revision ?? 0) !== body.revision)
        throw new ConflictException(
          'Înscrierea în curs a fost modificată în altă fereastră. Reîncarcă pagina înainte de salvare.',
        );
      const draft =
        current ??
        tx.create(Draft, {
          id,
          activityId,
          ownerId: user.id,
          data,
          revision: 1,
        });
      if (current) {
        draft.data = data;
        draft.revision++;
      }
      draft.updatedAt = new Date();
      tx.persist(draft);
      tx.persist(
        tx.create(AuditEntry, {
          actorId: user.id,
          activityId,
          action: 'registration.draft_saved',
          entityType: 'ActivityRegistrationDraft',
          entityId: id,
          metadata: { revision: draft.revision },
        }),
      );
      await tx.flush();
      return draft;
    });
  }
  async discard(activityId: number, id: string, user: CurrentUser) {
    return this.em.transactional(async (tx) => {
      const key = uuid(id);
      const removed = await tx.nativeDelete(Draft, {
        id: key,
        activityId,
        ownerId: user.id,
      });
      if (!removed) throw new NotFoundException();
      tx.persist(
        tx.create(AuditEntry, {
          actorId: user.id,
          activityId,
          action: 'registration.draft_discarded',
          entityType: 'ActivityRegistrationDraft',
          entityId: key,
          metadata: {},
        }),
      );
      await tx.flush();
      return { success: true };
    });
  }
}
