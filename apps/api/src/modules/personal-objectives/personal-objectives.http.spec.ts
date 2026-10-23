jest.mock('@mikro-orm/postgresql', () => ({ EntityManager: class {} }));
jest.mock('./entities/personal-objective.entity', () => ({
  PersonalObjective: 'objective',
}));
jest.mock('../auth/auth.service', () => ({ AuthService: class {} }));

import { Test } from '@nestjs/testing';
import { UnauthorizedException, type INestApplication } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import type { Server } from 'node:http';
import request from 'supertest';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PersonalObjectivesController } from './personal-objectives.controller';
import { PersonalObjectivesService } from './personal-objectives.service';

type Row = {
  id: number;
  userId: number;
  title: string;
  description: string;
  deadline: string;
  createdAt: Date;
};

describe('personal objectives HTTP ownership and validation', () => {
  let app: INestApplication;
  let rows: Row[];
  let flush: jest.Mock;
  const input = {
    title: '  O drumeție  ',
    description: '  Pregătesc traseul.  ',
    deadline: '2026-11-15',
  };

  beforeEach(async () => {
    rows = [];
    flush = jest.fn(() => Promise.resolve());
    const em = {
      create: (_entity: unknown, data: Omit<Row, 'id' | 'createdAt'>) => {
        const row = { id: rows.length + 1, createdAt: new Date(), ...data };
        rows.push(row);
        return row;
      },
      flush,
      find: (
        _entity: unknown,
        filter: { userId: number },
        options: { orderBy: Record<string, 'asc' | 'desc'> },
      ) =>
        Promise.resolve(
          rows
            .filter((row) => row.userId === filter.userId)
            .sort((a, b) => {
              for (const [key, direction] of Object.entries(options.orderBy)) {
                const left = a[key as keyof Row],
                  right = b[key as keyof Row];
                if (left < right) return direction === 'asc' ? -1 : 1;
                if (left > right) return direction === 'asc' ? 1 : -1;
              }
              return 0;
            }),
        ),
    };
    const module = await Test.createTestingModule({
      controllers: [PersonalObjectivesController],
      providers: [
        {
          provide: PersonalObjectivesService,
          useValue: new PersonalObjectivesService(
            em as unknown as EntityManager,
          ),
        },
        AuthGuard,
        {
          provide: AuthService,
          useValue: {
            extractSessionToken: (headers: { authorization?: string }) =>
              headers.authorization?.replace('Bearer ', ''),
            getCurrentUserFromToken: (token: string) => {
              if (!['user-1', 'user-2'].includes(token))
                throw new UnauthorizedException();
              return Promise.resolve({
                id: token === 'user-1' ? 1 : 2,
                roles: [],
              });
            },
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });
  const http = () => request(app.getHttpServer() as Server);

  it('requires authentication for reads and writes', async () => {
    await http().get('/api/personal-objectives').expect(401);
    await http().post('/api/personal-objectives').send(input).expect(401);
    await http()
      .get('/api/personal-objectives')
      .auth('invalid', { type: 'bearer' })
      .expect(401);
    expect(rows).toHaveLength(0);
  });

  it('saves trimmed values for ordinary users and derives ownership from their session', async () => {
    const saved = await http()
      .post('/api/personal-objectives')
      .auth('user-1', { type: 'bearer' })
      .send({ ...input, userId: 2 })
      .expect(201);
    expect(saved.body).toEqual({
      id: 1,
      title: 'O drumeție',
      description: 'Pregătesc traseul.',
      deadline: input.deadline,
      createdAt: expect.any(String) as string,
    });
    expect(rows[0].userId).toBe(1);
    expect(flush).toHaveBeenCalledTimes(1);
    const other = await http()
      .get('/api/personal-objectives?userId=1')
      .auth('user-2', { type: 'bearer' })
      .expect(200);
    expect(other.body).toEqual([]);
    const own = await http()
      .get('/api/personal-objectives')
      .auth('user-1', { type: 'bearer' })
      .expect(200);
    expect(own.body).toEqual([saved.body]);
  });

  it('orders by deadline, then newest creation and identifier', async () => {
    rows.push(
      {
        ...input,
        id: 1,
        userId: 1,
        deadline: '2026-12-01',
        createdAt: new Date('2026-10-01'),
      },
      {
        ...input,
        id: 2,
        userId: 1,
        deadline: '2026-11-01',
        createdAt: new Date('2026-10-01'),
      },
      {
        ...input,
        id: 3,
        userId: 1,
        deadline: '2026-11-01',
        createdAt: new Date('2026-10-02'),
      },
      {
        ...input,
        id: 4,
        userId: 2,
        deadline: '2026-01-01',
        createdAt: new Date(),
      },
      {
        ...input,
        id: 5,
        userId: 1,
        deadline: '2026-11-01',
        createdAt: new Date('2026-10-02'),
      },
    );
    const response = await http()
      .get('/api/personal-objectives')
      .auth('user-1', { type: 'bearer' });
    expect((response.body as Row[]).map((row) => row.id)).toEqual([5, 3, 2, 1]);
  });

  it.each([
    { title: ' ' },
    { title: 'x'.repeat(201) },
    { title: 1 },
    { description: '\n\t' },
    { description: 'x'.repeat(5001) },
    { description: null },
    { deadline: '' },
    { deadline: '2026-02-29' },
    { deadline: '2026-04-31' },
    { deadline: '2026-11-15T00:00:00Z' },
    { deadline: '0000-01-01' },
    { deadline: null },
  ])('rejects invalid input: %p', async (invalid) => {
    await http()
      .post('/api/personal-objectives')
      .auth('user-1', { type: 'bearer' })
      .send({ ...input, ...invalid })
      .expect(400);
    expect(rows).toHaveLength(0);
    expect(flush).not.toHaveBeenCalled();
  });

  it('accepts a leap day and a past calendar date', async () => {
    for (const deadline of ['2024-02-29', '2000-01-01']) {
      const response = await http()
        .post('/api/personal-objectives')
        .auth('user-1', { type: 'bearer' })
        .send({ ...input, deadline })
        .expect(201);
      expect((response.body as Row).deadline).toBe(deadline);
    }
  });
});
