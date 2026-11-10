import {
  type ArgumentsHost,
  ConflictException,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Request } from 'express';
import { StructuredExceptionFilter } from './structured-exception.filter';
import { StructuredExceptionLogger } from './structured-exception.logger';

const createHarness = () => {
  const response = {};
  const request = {
    method: 'post',
    baseUrl: '',
    route: { path: '/api/activity-registrations/:id/personal/:token' },
    originalUrl:
      '/api/activity-registrations/123/personal/private-token?code=secret',
    headers: {
      authorization: 'Bearer private-token',
      cookie: 'session=secret',
    },
    body: { password: 'secret' },
  } as unknown as Request;
  const adapter = {
    isHeadersSent: jest.fn().mockReturnValue(false),
    reply: jest.fn(),
    end: jest.fn(),
  };
  const logger = new StructuredExceptionLogger();
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as ArgumentsHost;
  const filter = new StructuredExceptionFilter(
    { httpAdapter: adapter } as unknown as HttpAdapterHost,
    logger,
  );

  return { adapter, filter, host, logger, request, response };
};

describe('structured exception logging', () => {
  afterEach(() => jest.restoreAllMocks());

  it('writes one JSON event with the full stack and safe route, preserving the generic 500 response', () => {
    const { adapter, filter, host, response } = createHarness();
    const write = jest.spyOn(process.stderr, 'write').mockReturnValue(true);
    const error = Object.assign(new Error('database update failed'), {
      code: '23503',
    });
    error.stack =
      'Error: database update failed\n    at MembershipService.update';

    filter.catch(error, host);

    expect(write).toHaveBeenCalledTimes(1);
    const output = write.mock.calls[0][0] as string;
    expect(output.endsWith('\n')).toBe(true);
    expect(output.slice(0, -1)).not.toContain('\n');
    expect(JSON.parse(output) as unknown).toMatchObject({
      level: 'error',
      event_type: 'application_error',
      service: 'api',
      context: 'ExceptionsHandler',
      message: error.message,
      error_name: 'Error',
      error_code: '23503',
      stack: error.stack,
      method: 'POST',
      route: '/api/activity-registrations/:id/personal/:token',
      status_code: 500,
    });
    expect(output).not.toContain('private-token');
    expect(output).not.toContain('secret');
    expect(adapter.reply).toHaveBeenCalledWith(
      response,
      { statusCode: 500, message: 'Internal server error' },
      500,
    );
  });

  it('preserves expected HTTP errors without emitting application error events', () => {
    const { adapter, filter, host, logger, response } = createHarness();
    const write = jest.spyOn(logger, 'write');

    filter.catch(new ConflictException('Already registered.'), host);

    expect(write).not.toHaveBeenCalled();
    expect(adapter.reply).toHaveBeenCalledWith(
      response,
      { statusCode: 409, message: 'Already registered.', error: 'Conflict' },
      409,
    );
  });

  it('logs HTTP 5xx errors once and preserves their response bodies', () => {
    const { adapter, filter, host, logger, response } = createHarness();
    const write = jest.spyOn(logger, 'write').mockImplementation(() => {});
    const error = new ServiceUnavailableException('Provider unavailable.');

    filter.catch(error, host);

    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(
      expect.objectContaining({ status_code: 503, message: error.message }),
    );
    expect(adapter.reply).toHaveBeenCalledWith(
      response,
      error.getResponse(),
      503,
    );
  });

  it('preserves HTTP exceptions with string responses', () => {
    const { adapter, filter, host, response } = createHarness();

    filter.catch(new HttpException('Invalid request', 400), host);

    expect(adapter.reply).toHaveBeenCalledWith(
      response,
      { statusCode: 400, message: 'Invalid request' },
      400,
    );
  });

  it('preserves http-errors style errors from the body parser', () => {
    const { adapter, filter, host, logger, response } = createHarness();
    const write = jest.spyOn(logger, 'write');

    filter.catch(
      { statusCode: 413, message: 'request entity too large' },
      host,
    );

    expect(write).not.toHaveBeenCalled();
    expect(adapter.reply).toHaveBeenCalledWith(
      response,
      { statusCode: 413, message: 'request entity too large' },
      413,
    );
  });

  it('uses UNMATCHED when no route matched instead of logging the request URL', () => {
    const { filter, host, logger, request } = createHarness();
    const write = jest.spyOn(logger, 'write').mockImplementation(() => {});
    delete request.route;

    filter.catch(new Error('request failed'), host);

    expect(write).toHaveBeenCalledWith(
      expect.objectContaining({ route: 'UNMATCHED' }),
    );
  });

  it('handles thrown values that are not Error objects', () => {
    const { adapter, filter, host, logger, response } = createHarness();
    const write = jest.spyOn(logger, 'write').mockImplementation(() => {});

    filter.catch(null, host);

    expect(write).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Unknown exception',
        error_name: 'UnknownError',
        status_code: 500,
      }),
    );
    expect(adapter.reply).toHaveBeenCalledWith(
      response,
      { statusCode: 500, message: 'Internal server error' },
      500,
    );
  });

  it('ends responses whose headers were already sent without replying twice', () => {
    const { adapter, filter, host, logger, response } = createHarness();
    const write = jest.spyOn(logger, 'write').mockImplementation(() => {});
    adapter.isHeadersSent.mockReturnValue(true);

    filter.catch(new Error('stream failed'), host);

    expect(write).toHaveBeenCalledTimes(1);
    expect(adapter.end).toHaveBeenCalledWith(response);
    expect(adapter.reply).not.toHaveBeenCalled();
  });
});
