import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Request } from 'express';
import {
  StructuredExceptionLogger,
  type StructuredExceptionEvent,
} from './structured-exception.logger';

type HttpError = { statusCode: number; message: string };

const isHttpError = (exception: unknown): exception is HttpError => {
  if (typeof exception !== 'object' || exception === null) return false;

  const candidate = exception as Partial<HttpError>;
  return (
    typeof candidate.statusCode === 'number' &&
    typeof candidate.message === 'string'
  );
};

const resolveStatusCode = (exception: unknown): number => {
  if (exception instanceof HttpException) return exception.getStatus();
  if (isHttpError(exception)) return exception.statusCode;
  return HttpStatus.INTERNAL_SERVER_ERROR;
};

const resolveResponseBody = (exception: unknown, statusCode: number) => {
  if (exception instanceof HttpException) {
    const response = exception.getResponse();
    return typeof response === 'object' && response !== null
      ? response
      : { statusCode, message: response };
  }

  return {
    statusCode,
    message: isHttpError(exception)
      ? exception.message
      : 'Internal server error',
  };
};

const resolveRoute = (request: Request): string => {
  const route = request.route as { path?: unknown } | undefined;
  if (typeof route?.path !== 'string') return 'UNMATCHED';

  const combined = `${request.baseUrl ?? ''}${route.path}`.replace(/\/+/g, '/');
  return combined.length > 1 && combined.endsWith('/')
    ? combined.slice(0, -1)
    : combined || '/';
};

const toEvent = (
  exception: unknown,
  request: Request,
  statusCode: number,
): StructuredExceptionEvent => {
  const error = exception instanceof Error ? exception : undefined;
  const code = error && 'code' in error ? error.code : undefined;

  return {
    timestamp: new Date().toISOString(),
    level: 'error',
    event_type: 'application_error',
    service: 'api',
    environment: process.env.NODE_ENV ?? 'unknown',
    context: 'ExceptionsHandler',
    message:
      error?.message ??
      (isHttpError(exception) ? exception.message : 'Unknown exception'),
    error_name: error?.name ?? 'UnknownError',
    ...(typeof code === 'string' || typeof code === 'number'
      ? { error_code: String(code) }
      : {}),
    ...(error?.stack === undefined ? {} : { stack: error.stack }),
    method: request.method.toUpperCase(),
    // Matched route templates omit query strings and private path parameters.
    route: resolveRoute(request),
    status_code: statusCode,
  };
};

@Catch()
@Injectable()
export class StructuredExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly logger: StructuredExceptionLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<unknown>();
    const statusCode = resolveStatusCode(exception);
    const adapter = this.httpAdapterHost.httpAdapter;

    if (statusCode >= 500) {
      this.logger.write(toEvent(exception, request, statusCode));
    }

    if (adapter.isHeadersSent(response)) {
      adapter.end(response);
      return;
    }

    adapter.reply(
      response,
      resolveResponseBody(exception, statusCode),
      statusCode,
    );
  }
}
