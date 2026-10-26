import {
  Injectable,
  Logger,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { MemberOrgoService } from './orgo.service';

@Injectable()
export class MembersWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private lastMaintenance = 0;
  private readonly logger = new Logger(MembersWorker.name);
  constructor(
    private readonly members: MembersService,
    private readonly orgo: MemberOrgoService,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => void this.run(), 5000);
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
      await this.orgo.run();
      if (Date.now() - this.lastMaintenance > 60000) {
        this.lastMaintenance = Date.now();
        await this.members.annual();
        void this.orgo
          .daily()
          .catch(() => this.logger.warn('Actualizarea Orgo va fi reluată.'));
      }
    } catch {
      this.logger.warn('Procesarea registrului de membri va fi reluată.');
    } finally {
      this.running = false;
    }
  }
}
