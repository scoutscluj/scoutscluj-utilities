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
  private readonly logger = new Logger(MembersWorker.name);
  constructor(
    private readonly members: MembersService,
    private readonly orgo: MemberOrgoService,
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
      await this.members.annual();
      await this.orgo.run();
    } catch {
      this.logger.warn('Procesarea registrului de membri va fi reluată.');
    } finally {
      this.running = false;
    }
  }
}
