import { createApplicationLogger } from './logging.config';

describe('application logging', () => {
  afterEach(() => jest.restoreAllMocks());

  it('writes structured service messages as one parseable JSON line in production', () => {
    const write = jest.spyOn(process.stdout, 'write').mockReturnValue(true);
    const message = {
      event: 'netopia.ipn',
      orderId: 'order-id',
      reason: 'first line\nsecond line',
      details: { jwtValid: false },
    };

    createApplicationLogger('production').log(message, 'NetopiaService');

    expect(write).toHaveBeenCalledTimes(1);
    const output = write.mock.calls[0][0] as string;
    expect(output.endsWith('\n')).toBe(true);
    expect(output.slice(0, -1)).not.toContain('\n');
    expect(output).not.toContain('\u001b');
    expect(JSON.parse(output) as unknown).toMatchObject({
      level: 'log',
      message,
      context: 'NetopiaService',
    });
  });

  it('keeps startup errors and their stack traces in a single stderr event', () => {
    const write = jest.spyOn(process.stderr, 'write').mockReturnValue(true);
    const stack = 'Error: listen failed\n    at bootstrap (/app/main.js:1:1)';

    createApplicationLogger('production').error(
      'Failed to start the application',
      stack,
      'Bootstrap',
    );

    expect(write).toHaveBeenCalledTimes(1);
    const output = write.mock.calls[0][0] as string;
    expect(output.slice(0, -1)).not.toContain('\n');
    expect(JSON.parse(output) as unknown).toMatchObject({
      level: 'error',
      message: 'Failed to start the application',
      stack,
      context: 'Bootstrap',
    });
  });

  it.each(['development', 'test'])(
    'keeps readable text output in %s',
    (env) => {
      const write = jest.spyOn(process.stdout, 'write').mockReturnValue(true);

      createApplicationLogger(env).log('Application ready', 'Bootstrap');

      const output = write.mock.calls[0][0] as string;
      expect(output).toContain('[Bootstrap]');
      expect(output).toContain('Application ready');
      expect(() => JSON.parse(output) as unknown).toThrow();
    },
  );
});
