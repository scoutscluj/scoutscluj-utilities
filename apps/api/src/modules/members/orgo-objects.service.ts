import {
  Injectable,
  type OnModuleInit,
  BadRequestException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { MemberOrgoService } from './orgo.service';
import {
  OrgoObjectJob,
  OrgoObjectLink,
} from './entities/orgo-object-sync.entity';
import { ScoutUnit, ScoutSubunit, ScoutMember } from './entities/member.entity';
import { Activity } from '../activities/entities/activity.entity';
import {
  ActivityRegistration,
  ActivityRegistrationSettings,
} from '../activity-registrations/registration.entity';
import { object } from './orgo-profile';
import { equalValue, OrgoRequestError, retryDelay } from './orgo-sync';
import { User } from '../users/entities/user.entity';
import { AuditEntry } from '../audit/entities/audit-entry.entity';

/** Shares the member worker; database triggers atomically capture every mutation path. */
@Injectable()
export class OrgoObjectsService implements OnModuleInit {
  constructor(
    private readonly em: EntityManager,
    private readonly orgo: MemberOrgoService,
    private readonly config: ConfigService,
  ) {}
  onModuleInit() {
    this.orgo.registerPump('objects', () => this.run());
  }
  async run() {
    const em = this.em.fork();
    const jobs = await em.find(
      OrgoObjectJob,
      {
        state: { $in: ['pending', 'running', 'permission-required'] },
        $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: new Date() } }],
      },
      { orderBy: { createdAt: 'asc' }, limit: 10 },
    );
    for (const job of jobs) await this.deliver(job.id);
  }
  private async deliver(id: string) {
    const claim = await this.em.fork().transactional(async (tx) => {
      await tx.execute('select pg_advisory_xact_lock(2112026)');
      const row = await tx.findOneOrFail(
        OrgoObjectJob,
        { id },
        { refresh: true },
      );
      if (
        !['pending', 'running', 'permission-required'].includes(row.state) ||
        (row.nextAttemptAt && row.nextAttemptAt > new Date())
      )
        return null;
      if (
        row.state === 'running' &&
        row.claimedAt &&
        Date.now() - row.claimedAt.getTime() < 120000
      )
        return null;
      // One delivery per canonical object, across processes and queued revisions.
      if (
        await tx.count(OrgoObjectJob, {
          subject: row.subject,
          subjectId: row.subjectId,
          id: { $ne: id },
          state: 'running',
          claimedAt: { $gt: new Date(Date.now() - 120000) },
        })
      )
        return null;
      row.state = 'running';
      row.claimedAt = new Date();
      row.claimToken = randomUUID();
      row.attempts++;
      return { ...row };
    });
    if (!claim) return;
    const heartbeat = setInterval(() => {
      void this.em
        .fork()
        .nativeUpdate(
          OrgoObjectJob,
          { id, claimToken: claim.claimToken, state: 'running' },
          { claimedAt: new Date() },
        )
        .catch(() => undefined);
    }, 30000);
    heartbeat.unref();
    let state = 'synced',
      message = 'Datele au fost confirmate în Orgo.',
      nextAttemptAt: Date | null = null;
    try {
      if (this.config.get<string>('ORGO_OBJECT_WRITES_ENABLED') !== 'true')
        throw new BadRequestException(
          'Sincronizarea obiectelor Orgo nu este activată.',
        );
      await this.synchronize(claim);
    } catch (error) {
      if (error instanceof SupersededObject) {
        state = 'superseded';
        message = error.message;
      } else if (error instanceof UncertainObject) {
        state = 'uncertain';
        message = error.message;
      } else if (error instanceof BadRequestException) {
        state = 'permission-required';
        message = error.message;
        nextAttemptAt = new Date(Date.now() + 900000);
      } else if (
        error instanceof OrgoRequestError &&
        [401, 403].includes(error.status)
      ) {
        state = 'permission-required';
        message = 'Tokenul Orgo nu permite această operație.';
        nextAttemptAt = new Date(Date.now() + 900000);
      } else if (error instanceof OrgoRequestError && !error.temporary) {
        state = 'permission-required';
        message =
          'Orgo a respins datele. Verifică maparea și contractul operației.';
        nextAttemptAt = new Date(Date.now() + 900000);
      } else {
        state = 'pending';
        message = 'Orgo nu este disponibil. Operațiunea se va reverifica.';
        nextAttemptAt = new Date(
          Date.now() +
            retryDelay(
              claim.attempts,
              error instanceof OrgoRequestError ? error.retryAfterMs : 0,
            ),
        );
      }
    }
    clearInterval(heartbeat);
    await this.em.fork().transactional(async (tx) => {
      await tx.execute('select pg_advisory_xact_lock(2112026)');
      const row = await tx.findOneOrFail(
        OrgoObjectJob,
        { id },
        { refresh: true },
      );
      if (row.claimToken !== claim.claimToken) return;
      row.state = state;
      row.message = message;
      row.nextAttemptAt = nextAttemptAt;
      tx.create(AuditEntry, {
        actorId: null,
        action: 'orgo.object-sync',
        entityType: claim.subject,
        entityId: claim.subjectId,
        metadata: { state, credentialMode: 'server' },
      });
    });
  }
  private async synchronize(job: OrgoObjectJob) {
    const em = this.em.fork(),
      key = job.subject + ':' + job.subjectId;
    const center = Number(this.config.get<string>('ORGO_LOCAL_CENTER_ID'));
    let link = await em.findOne(OrgoObjectLink, { id: key });
    if (!link) {
      link = em.create(OrgoObjectLink, { id: key });
      await em.flush();
    }
    let body: Record<string, unknown>,
      collection: string,
      existingId: string | null = null;
    if (job.subject === 'activity') {
      const a = await em.findOneOrFail(Activity, { id: Number(job.subjectId) });
      const owner = await em.findOne(User, { id: a.coordinatorId });
      if (!owner || owner.memberAccessDisabled)
        throw new BadRequestException(
          'Organizatorul activității nu mai are un cont activ.',
        );
      const unit = Number(this.config.get<string>('ORGO_EVENT_UNIT_ID'));
      if (!Number.isSafeInteger(unit) || unit <= 0)
        throw new BadRequestException(
          'Configurează unitatea Orgo a activităților centrului.',
        );
      const remoteUnit = await this.orgo.serverRequest('/api/v1/units/' + unit);
      if (Number(object(remoteUnit.localCenter).id) !== center)
        throw new BadRequestException(
          'Unitatea evenimentului nu aparține centrului configurat.',
        );
      const settings = await em.findOne(ActivityRegistrationSettings, {
        activityId: a.id,
      });
      const eventStates = {
        draft: 'draft',
        published: 'published',
        ...object(
          JSON.parse(this.config.get<string>('ORGO_EVENT_STATUS_MAP') || '{}'),
        ),
      };
      const localStatus =
        a.status === 'cancelled'
          ? 'cancelled'
          : a.status === 'completed'
            ? 'completed'
            : settings?.data.published === true
              ? 'published'
              : 'draft';
      const status = object(eventStates)[localStatus];
      if (typeof status !== 'string')
        throw new BadRequestException(
          'La starea activității lipsește o mapare Orgo verificată: ' +
            localStatus,
        );
      body = {
        name: a.title,
        description: a.description ?? '',
        location: a.location ?? '',
        dateTimeBegin: a.startDate?.toISOString() ?? null,
        dateTimeEnd: a.endDate?.toISOString() ?? null,
        timezone: 'Europe/Bucharest',
        unit: '/api/v1/units/' + unit,
        isPublic: settings?.data.published === true && a.status !== 'cancelled',
        status,
      };
      collection = '/api/v1/events';
      existingId = a.orgoEventId ?? null;
    } else if (job.subject === 'registration') {
      const registration = await em.findOne(ActivityRegistration, {
        id: job.subjectId,
      });
      if (!registration && job.payload?.deleted !== true)
        throw new BadRequestException(
          'Înscrierea locală nu mai există și nu are o anulare verificabilă.',
        );
      // An unsent registration deleted locally must never be created remotely.
      if (!registration && !link.remoteId) {
        if (link.creationStarted)
          throw new UncertainObject(
            'Verifică participarea Orgo creată înainte de anulare.',
          );
        return;
      }
      const r = registration ?? {
        activityId: Number(job.payload.activityId),
        memberId: String(job.payload.memberId),
        state: 'cancelled',
      };
      const a = await em.findOneOrFail(Activity, { id: r.activityId });
      if (!a.orgoEventId)
        throw new BadRequestException(
          'Activitatea așteaptă asocierea evenimentului Orgo.',
        );
      const member = await em.findOneOrFail(ScoutMember, { id: r.memberId });
      if (!member.orgoId)
        throw new BadRequestException(
          'Membrul nu are încă un ID Orgo confirmat.',
        );
      const raw = await this.orgo.serverRequest(
        '/api/v1/users/' + member.orgoId,
      );
      if (Number(object(raw.localCenter).id) !== center)
        throw new BadRequestException(
          'Membrul nu aparține centrului configurat.',
        );
      const mapping = object(
        JSON.parse(
          this.config.get<string>('ORGO_ATTENDANCE_STATUS_MAP') || '{}',
        ),
      );
      const status = mapping[r.state];
      if (typeof status !== 'string')
        throw new BadRequestException(
          'Starea înscrierii necesită o mapare Orgo verificată: ' + r.state,
        );
      if (
        !['accepted', 'reserved', 'attended'].includes(r.state) &&
        status === 'success'
      )
        throw new BadRequestException(
          'O înscriere neconfirmată nu poate fi trimisă drept participare confirmată în Orgo.',
        );
      body = {
        event: '/api/v1/events/' + a.orgoEventId,
        user: '/api/v1/users/' + member.orgoId,
        statusRegistration: status,
        isPubliclyVisible: false,
      };
      collection = '/api/v1/event_attends';
    } else {
      const unit =
        job.subject === 'subunit'
          ? await em.findOne(ScoutSubunit, { id: job.subjectId })
          : await em.findOne(ScoutUnit, { id: job.subjectId });
      if (!unit)
        throw new BadRequestException('Structura locală nu mai există.');
      const types = object(
        JSON.parse(this.config.get<string>('ORGO_UNIT_TYPE_MAP') || '{}'),
      );
      const typeId = Number(types[job.subject + ':' + unit.branch]);
      if (!Number.isSafeInteger(typeId) || typeId <= 0)
        throw new BadRequestException(
          'Tipul structurii necesită o mapare Orgo verificată.',
        );
      let parent: string | null = null;
      if (unit.parentId) {
        const p = await em.findOne(ScoutUnit, { id: unit.parentId });
        if (!p?.orgoId)
          throw new BadRequestException(
            'Unitatea părinte nu are încă o asociere Orgo.',
          );
        parent = '/api/v1/units/' + p.orgoId;
      }
      body = {
        name: unit.name,
        unitType: '/api/v1/unit_types/' + typeId,
        parent,
        status: unit.archived
          ? this.config.get<string>('ORGO_UNIT_ARCHIVED_STATUS')
          : 'ACTIVE',
      };
      if (unit.archived && !body.status)
        throw new BadRequestException(
          'Arhivarea structurii necesită statusul Orgo verificat.',
        );
      collection = '/api/v1/units';
      existingId = unit.orgoId ? String(unit.orgoId) : null;
    }
    let remoteId = link.remoteId ?? existingId;
    if (!remoteId) {
      if (link.creationStarted)
        throw new UncertainObject(
          'O creare anterioară poate fi reușită. Asociază ID-ul Orgo verificat înainte de reluare.',
        );
      // Write-ahead correlation marker survives a timeout, crash, or a subsequent local edit.
      await em.nativeUpdate(
        OrgoObjectLink,
        { id: key },
        { creationStarted: true },
      );
      const created = await this.orgo.serverRequest(collection, 'POST', {
        ...body,
        ...(job.subject === 'activity'
          ? {
              status: 'draft',
              hasEventTicketing: false,
              requiresRegistrationForm: false,
            }
          : {}),
      });
      const createdId = created.uuid ?? created.id;
      remoteId =
        typeof createdId === 'string' || typeof createdId === 'number'
          ? String(createdId)
          : '';
      if (!/^[\da-z-]+$/i.test(remoteId))
        throw new UncertainObject('Orgo nu a confirmat identificatorul creat.');
      await em.nativeUpdate(OrgoObjectLink, { id: key }, { remoteId });
    }
    if (!/^[\da-z-]+$/i.test(remoteId))
      throw new BadRequestException('Identificator Orgo invalid.');
    const path = collection + '/' + remoteId;
    const before = await this.orgo.serverRequest(path);
    if (job.subject === 'unit' || job.subject === 'subunit') {
      if (Number(object(before.localCenter).id) !== center)
        throw new BadRequestException(
          'Structura Orgo nu aparține centrului configurat.',
        );
    }
    if (job.subject === 'registration') {
      const reference = (value: unknown) =>
        typeof value === 'string'
          ? value
          : typeof object(value)['@id'] === 'string'
            ? object(value)['@id']
            : '';
      if (
        reference(before.user) !== body.user ||
        reference(before.event) !== body.event
      )
        throw new BadRequestException(
          'Participarea Orgo nu corespunde identității și activității locale.',
        );
    }
    if (
      job.subject === 'activity' &&
      Number(object(object(before.unit).localCenter).id) !== center
    ) {
      const unitIri = object(before.unit)['@id'];
      if (typeof unitIri !== 'string')
        throw new BadRequestException(
          'Aria evenimentului Orgo nu poate fi verificată.',
        );
      const unit = await this.orgo.serverRequest(unitIri);
      if (Number(object(unit.localCenter).id) !== center)
        throw new BadRequestException('Evenimentul Orgo aparține altei arii.');
    }
    const patch: Record<string, unknown> = {};
    let superseded = false;
    const fields: Record<string, string> = {
      name: 'title',
      description: 'description',
      location: 'location',
      dateTimeBegin: 'start_date',
      dateTimeEnd: 'end_date',
      isPublic: 'published',
      statusRegistration: 'state',
      parent: 'parent_id',
      unitType: 'branch',
    };
    for (const [field, value] of Object.entries(body)) {
      // Deliver only the fields changed by this mutation, so unrelated edits do not replay stale values.
      if (
        (link.remoteId || existingId) &&
        !job.changedFields.includes('create') &&
        !job.changedFields.includes(fields[field] ?? field) &&
        !(
          job.subject !== 'activity' &&
          field === 'name' &&
          job.changedFields.includes('name')
        ) &&
        !(
          field === 'status' &&
          (job.changedFields.includes('archived') ||
            job.changedFields.includes('published'))
        )
      )
        continue;
      const actual =
        typeof before[field] === 'object' && before[field]
          ? object(before[field])['@id']
          : before[field];
      if (objectValueEqual(field, actual, value)) continue;
      if (
        field in link.baseline &&
        !objectValueEqual(field, actual, link.baseline[field])
      ) {
        superseded = true;
        continue;
      }
      patch[field] = value;
    }
    if (Object.keys(patch).length) {
      const outgoing = { ...patch };
      if (job.subject === 'activity' && outgoing.status === 'published')
        delete outgoing.status;
      if (Object.keys(outgoing).length)
        await this.orgo.serverRequest(path, 'PATCH', outgoing);
      if (job.subject === 'activity' && patch.status === 'published')
        await this.orgo.serverRequest(
          '/api/v1/events_publish/' + remoteId,
          'PATCH',
          {},
        );
    }
    const verified = await this.orgo.serverRequest(path);
    for (const [field, value] of Object.entries(patch)) {
      const actual =
        typeof verified[field] === 'object' && verified[field]
          ? object(verified[field])['@id']
          : verified[field];
      if (!objectValueEqual(field, actual, value))
        throw new UncertainObject('Orgo nu a confirmat toate câmpurile.');
    }
    link.remoteId = remoteId;
    link.baseline = Object.fromEntries(
      Object.keys(body).map((field) => [
        field,
        typeof verified[field] === 'object' && verified[field]
          ? object(verified[field])['@id']
          : verified[field],
      ]),
    );
    if (job.subject === 'activity') {
      const activity = await em.findOneOrFail(Activity, {
        id: Number(job.subjectId),
      });
      activity.orgoEventId = remoteId;
      activity.orgoEventIri = path;
    } else if (job.subject === 'unit' || job.subject === 'subunit') {
      const unit =
        job.subject === 'unit'
          ? await em.findOneOrFail(ScoutUnit, { id: job.subjectId })
          : await em.findOneOrFail(ScoutSubunit, { id: job.subjectId });
      unit.orgoId = Number(remoteId);
    }
    await em.flush();
    if (superseded)
      throw new SupersededObject(
        'Orgo a modificat aceleași câmpuri; valorile curente Orgo sunt păstrate.',
      );
  }
}
class UncertainObject extends Error {}
class SupersededObject extends Error {}

// API timestamps may express the same instant with offsets or different precision.
function objectValueEqual(field: string, a: unknown, b: unknown) {
  if (
    ['dateTimeBegin', 'dateTimeEnd'].includes(field) &&
    typeof a === 'string' &&
    typeof b === 'string'
  ) {
    const left = Date.parse(a),
      right = Date.parse(b);
    if (Number.isFinite(left) && Number.isFinite(right)) return left === right;
  }
  return equalValue(a, b);
}
