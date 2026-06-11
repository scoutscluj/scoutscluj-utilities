import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns a healthy API status', () => {
    const response = new HealthController().getHealth();

    expect(response.status).toBe('ok');
    expect(response.service).toBe('api');
    expect(new Date(response.timestamp).toString()).not.toBe('Invalid Date');
  });
});
