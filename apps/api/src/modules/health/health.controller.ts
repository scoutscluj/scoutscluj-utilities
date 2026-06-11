import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

type HealthResponse = {
  status: 'ok';
  service: string;
  timestamp: string;
};

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        service: 'api',
        timestamp: '2026-06-11T00:00:00.000Z',
      },
    },
  })
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    };
  }
}
