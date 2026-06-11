import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getAppInfo(): { name: string; version: string } {
    return {
      name: 'scoutscluj-utilities-api',
      version: '0.1.0',
    };
  }
}
