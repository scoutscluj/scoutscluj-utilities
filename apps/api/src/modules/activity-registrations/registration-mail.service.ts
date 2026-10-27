import { EntityManager } from '@mikro-orm/postgresql';
import { ConfigService } from '@nestjs/config';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ActivityRegistrationMail as Mail } from './registration.entity';

@Injectable()
export class RegistrationMailService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  constructor(
    private readonly em: EntityManager,
    private readonly config: ConfigService,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      void this.deliver().catch(() => undefined);
    }, 30000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async deliver() {
    const endpoint = this.config.get<string>('ACTIVITY_MAIL_ENDPOINT');
    const secret = this.config.get<string>('ACTIVITY_MAIL_TOKEN');
    const origin = this.config.get<string>('WEB_ORIGIN');
    if (!endpoint || !secret || !origin || this.running) return;
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || url.username || url.password) return;
    this.running = true;
    try {
      const em = this.em.fork();
      const claimed = await em.transactional(async (tx) => {
        await tx.execute('select pg_advisory_xact_lock(27102027)');
        const row = await tx.findOne(
          Mail,
          {
            state: { $in: ['pending', 'sending'] },
            nextAttemptAt: { $lte: new Date() },
          },
          { orderBy: { createdAt: 'asc' } },
        );
        if (!row) return null;
        row.state = 'sending';
        row.attempts++;
        row.nextAttemptAt = new Date(Date.now() + 300000);
        return {
          id: row.id,
          recipient: row.recipient,
          subject: row.subject,
          body: row.body,
          attempts: row.attempts,
        };
      });
      if (!claimed) return;
      try {
        const response = await fetch(url, {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(20000),
          headers: {
            Authorization: `Bearer ${secret}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': claimed.id,
          },
          body: JSON.stringify({
            to: claimed.recipient,
            subject: claimed.subject,
            text: claimed.body.replace(
              /\n(\/activitati\/[^\n]+)\n/,
              (_, path: string) => `\n${new URL(path, origin).href}\n`,
            ),
          }),
        });
        if (!response.ok) throw new Error('Delivery failed');
        await em.nativeUpdate(
          Mail,
          { id: claimed.id },
          { state: 'sent', body: '' },
        );
      } catch {
        await em.nativeUpdate(
          Mail,
          { id: claimed.id },
          {
            state: 'pending',
            nextAttemptAt: new Date(
              Date.now() +
                Math.min(3600000, 30000 * 2 ** Math.min(7, claimed.attempts)),
            ),
          },
        );
      }
    } finally {
      this.running = false;
    }
  }
}
