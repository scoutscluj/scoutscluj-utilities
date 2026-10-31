import { Injectable } from '@nestjs/common';

export type StructuredExceptionEvent = {
  timestamp: string;
  level: 'error';
  event_type: 'application_error';
  service: 'api';
  environment: string;
  context: 'ExceptionsHandler';
  message: string;
  error_name: string;
  error_code?: string;
  stack?: string;
  method: string;
  route: string;
  status_code: number;
};

@Injectable()
export class StructuredExceptionLogger {
  write(event: StructuredExceptionEvent): void {
    process.stderr.write(`${JSON.stringify(event)}\n`);
  }
}
