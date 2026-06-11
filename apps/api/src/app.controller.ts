import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOkResponse({
    schema: {
      example: {
        name: 'scoutscluj-utilities-api',
        version: '0.1.0',
      },
    },
  })
  getAppInfo(): { name: string; version: string } {
    return this.appService.getAppInfo();
  }
}
