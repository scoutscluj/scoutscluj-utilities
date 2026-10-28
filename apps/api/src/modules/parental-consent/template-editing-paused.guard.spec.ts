import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
jest.mock('../auth/auth.service', () => ({ AuthService: class {} }));
jest.mock('./parental-consent.service', () => ({
  ParentalConsentService: class {},
}));
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ParentalConsentAdminController } from './parental-consent.controller';
import { ParentalConsentService } from './parental-consent.service';
describe('suspended agreement editor HTTP contract', () => {
  it('returns an explicit paused response instead of attempting draft creation', async () => {
    const createTemplate = jest.fn();
    const module = await Test.createTestingModule({
      controllers: [ParentalConsentAdminController],
      providers: [
        { provide: ParentalConsentService, useValue: { createTemplate } },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    const app = module.createNestApplication();
    await app.init();
    try {
      const response = await request(app.getHttpServer() as Server)
        .post('/parental-consent/admin/templates')
        .send({ name: 'Draft' });
      expect(response.status).toBe(423);
      expect(response.text).toContain('suspendat temporar');
      expect(createTemplate).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});
