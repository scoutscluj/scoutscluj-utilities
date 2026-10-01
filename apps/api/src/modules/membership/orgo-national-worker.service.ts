import { RequestContext } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  Injectable,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import {
  MembershipNationalItem as Item,
  MembershipObligation as Obligation,
  MembershipPeriod as Period,
  MembershipAllocation as Allocation,
  MembershipReceipt as Receipt,
} from './entities/membership.entity';
import { OrgoNationalService } from './orgo-national.service';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user-role.enum';
import { AuditEntry } from '../audit/entities/audit-entry.entity';

@Injectable()
export class OrgoNationalWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  constructor(
    private readonly em: EntityManager,
    private readonly orgo: OrgoNationalService,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => void this.run(), 60000);
    this.timer.unref();
    void this.run();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async run() {
    if (this.running) return;
    this.running = true;
    try {
      const em = this.em.fork();
      const items = await em.find(Item, {
        orgoState: { $in: ['queued', 'syncing', 'pending_approval'] },
      });
      for (const row of items) {
        const job = await em.transactional(async (tx) => {
          await tx.execute('select pg_advisory_xact_lock(9212026)');
          const item = await tx.findOneOrFail(
            Item,
            { id: row.id },
            { refresh: true },
          );
          const previous = item.orgoState;
          if (!['queued', 'syncing', 'pending_approval'].includes(previous))
            return null;
          if (
            previous === 'syncing' &&
            item.orgoLastAttemptAt &&
            Date.now() - item.orgoLastAttemptAt.getTime() < 120000
          )
            return null;
          const obligation = await tx.findOneOrFail(Obligation, {
            id: item.obligationId,
          });
          const period = await tx.findOneOrFail(Period, {
            id: obligation.periodId,
          });
          const allocations = await tx.find(Allocation, {
            obligationId: obligation.id,
            reversed: false,
          });
          let valid =
            !obligation.reviewState &&
            allocations.reduce((sum, a) => sum + a.amountBani, 0) >=
              obligation.totalBani;
          for (const allocation of allocations) {
            const receipt = await tx.findOneOrFail(Receipt, {
              id: allocation.receiptId,
            });
            if (receipt.reviewRequired) valid = false;
          }
          if (!valid) {
            item.orgoState = 'correction_required';
            item.orgoError =
              'Rezolvă corecția financiară înainte de sincronizare.';
            return null;
          }
          const actor = item.orgoActorId
            ? await tx.findOne(User, { id: item.orgoActorId })
            : null;
          if (
            !actor?.roles.some((role) =>
              [
                UserRole.Admin,
                UserRole.FinanceManager,
                UserRole.SuperAdmin,
              ].includes(role),
            )
          ) {
            item.orgoState = 'failed';
            item.orgoError =
              'Responsabilul transferului nu mai are acces financiar. Un responsabil autorizat trebuie să reia sincronizarea.';
            return null;
          }
          item.orgoState = 'syncing';
          item.orgoLastAttemptAt = new Date();
          return {
            id: item.id,
            actorId: actor.id,
            claimedAt: item.orgoLastAttemptAt.getTime(),
            allowCreate: previous === 'queued',
            target: {
              orgoUserId: obligation.orgoUserId,
              startsOn: period.startsOn,
              endsOn: period.endsOn,
              amountBani: item.amountBani,
            },
          };
        });
        if (!job) continue;
        const result = await RequestContext.create(em, () =>
          this.orgo.synchronize(job.actorId, job.target, job.allowCreate),
        );
        await em.transactional(async (tx) => {
          await tx.execute('select pg_advisory_xact_lock(9212026)');
          const item = await tx.findOneOrFail(
            Item,
            { id: job.id },
            { refresh: true },
          );
          if (
            item.orgoState !== 'syncing' ||
            item.orgoLastAttemptAt?.getTime() !== job.claimedAt
          )
            return;
          item.orgoState = result.state;
          item.orgoError = result.state === 'synced' ? null : result.message;
          if (result.state === 'synced') item.evidence = result.message;
          tx.persist(
            tx.create(AuditEntry, {
              actorId: job.actorId,
              action: `membership.orgo.${result.state}`,
              entityType: 'membership',
              entityId: item.id,
              metadata: { message: result.message },
            }),
          );
        });
      }
    } catch {
      /* Keep persisted jobs for the next poll; an uncertain write is read back only. */
    } finally {
      this.running = false;
    }
  }
}
