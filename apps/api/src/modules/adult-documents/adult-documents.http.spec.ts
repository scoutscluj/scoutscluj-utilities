jest.mock('@mikro-orm/postgresql', () => ({ EntityManager: class {} }));
jest.mock('./entities/adult-document.entity', () => ({
  AdultDocument: 'documents',
  AdultDocumentFile: 'files',
}));
jest.mock('../members/entities/member.entity', () => ({
  ScoutMember: 'members',
}));
jest.mock('../users/entities/user.entity', () => ({ User: 'users' }));
jest.mock('../users/entities/orgo-connection.entity', () => ({
  OrgoConnection: 'connections',
}));
jest.mock('../audit/entities/audit-entry.entity', () => ({
  AuditEntry: 'audits',
}));
jest.mock('../auth/auth.service', () => ({ AuthService: class {} }));

import { Test } from '@nestjs/testing';
import { UnauthorizedException, type INestApplication } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import type { Server } from 'node:http';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdultDocumentsController } from './adult-documents.controller';
import { AdultDocumentsService } from './adult-documents.service';
import { scoutingYear } from './adult-documents.rules';

type Row = Record<string, unknown>;
const payload = (response: { body: unknown }) =>
  response.body as {
    id: string;
    eligible: boolean | null;
    dossier: { memberId: string };
    documents: Row[];
    complete: boolean;
    rows: unknown[];
    unknownBirthDates: number;
  };
describe('private adult document HTTP workflow', () => {
  let app: INestApplication;
  let tables: Record<string, Row[]>;
  const ownerId = '11111111-1111-4111-8111-111111111111';
  const otherId = '22222222-2222-4222-8222-222222222222';
  const memberPath = `/api/adult-documents/members/${ownerId}`;
  const input = {
    year: scoutingYear(),
    kind: 'behavioural_integrity',
    filename: 'certificat.pdf',
    contentType: 'application/pdf',
    contentBase64: Buffer.from('%PDF-1.7\noriginal signed bytes').toString(
      'base64',
    ),
  };

  beforeEach(async () => {
    tables = {
      users: Array.from({ length: 10 }, (_, index) => ({
        id: index + 1,
        displayName: `Membru ${index + 1}`,
        roles: [3, 5, 6, 7].includes(index + 1) ? ['super_admin'] : [],
        centralMemberAdmin: [3, 6, 7].includes(index + 1),
        memberAccessDisabled: index + 1 === 6,
      })),
      members: Array.from({ length: 10 }, (_, index) => ({
        id: index === 0 ? ownerId : index === 1 ? otherId : randomUUID(),
        name: `Membru ${index + 1}`,
        accountId: index + 1,
        orgoId: 100 + index,
        birthDate:
          index === 7 ? '2015-01-01' : index === 8 ? null : '1990-01-01',
        status: 'active',
        structureId: index === 6 ? 'floresti' : 'cluj',
        category: index === 0 ? 'seniori' : 'scouteri',
      })),
      connections: [{ user: 10, orgoUserId: 999999 }],
      documents: [],
      files: [],
      audits: [],
    };
    const matches = (row: Row, filter: Row) =>
      Object.entries(filter).every(([key, value]) =>
        value && typeof value === 'object' && '$in' in value
          ? (value.$in as unknown[]).includes(row[key])
          : row[key] === value,
      );
    const find = (
      entity: string,
      filter: Row,
      options?: { orderBy?: Record<string, string> },
    ) => {
      const rows = tables[entity].filter((row) => matches(row, filter));
      if (options?.orderBy)
        rows.sort((a, b) => {
          for (const [key, direction] of Object.entries(options.orderBy!)) {
            const left = String(a[key]),
              right = String(b[key]);
            const comparison =
              typeof a[key] === 'number'
                ? Number(a[key]) - Number(b[key])
                : left.localeCompare(right);
            if (comparison)
              return direction === 'desc' ? -comparison : comparison;
          }
          return 0;
        });
      return rows;
    };
    const entities = new WeakMap<Row, string>();
    const em = {
      transactional: async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(em),
      find: (
        entity: string,
        filter: Row,
        options?: { orderBy?: Record<string, string> },
      ) => Promise.resolve(find(entity, filter, options)),
      findOne: (
        entity: string,
        filter: Row,
        options?: { orderBy?: Record<string, string> },
      ) => Promise.resolve(find(entity, filter, options)[0] ?? null),
      findOneOrFail: (entity: string, filter: Row) =>
        Promise.resolve(find(entity, filter)[0]),
      create: (entity: string, row: Row) => {
        const result = {
          id: randomUUID(),
          uploadedAt: new Date(),
          reviewerId: null,
          reviewedAt: null,
          rejectionReason: null,
          ...row,
        };
        entities.set(result, entity);
        return result;
      },
      persist: (row: Row) => {
        tables[entities.get(row)!].push(row);
      },
      flush: () => Promise.resolve(),
      execute: (sql: string) =>
        Promise.resolve(
          sql.includes('distinct')
            ? tables.documents.map((d) => ({ year: d.year }))
            : [],
        ),
    };
    const module = await Test.createTestingModule({
      controllers: [AdultDocumentsController],
      providers: [
        {
          provide: AdultDocumentsService,
          useValue: new AdultDocumentsService(em as unknown as EntityManager),
        },
        AuthGuard,
        {
          provide: AuthService,
          useValue: {
            extractSessionToken: (headers: { authorization?: string }) =>
              headers.authorization?.replace('Bearer ', ''),
            getCurrentUserFromToken: (token: string) => {
              const id = Number(token);
              if (!tables.users.some((u) => u.id === id))
                throw new UnauthorizedException();
              return Promise.resolve({
                id,
                roles: [],
                displayName: `Membru ${id}`,
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
  const upload = (actor = 1, changes: Row = {}) =>
    http()
      .post(memberPath)
      .auth(String(actor), { type: 'bearer' })
      .send({ ...input, ...changes });

  it('requires authentication and rejects other adults, Council-only, role-only and disabled administrators', async () => {
    await http().get('/api/adult-documents/mine').expect(401);
    await http().post(memberPath).send(input).expect(401);
    const created = await upload().expect(201);
    for (const actor of [2, 4, 5, 6, 7]) {
      await http()
        .get(memberPath)
        .auth(String(actor), { type: 'bearer' })
        .expect(403);
      await http()
        .get(`/api/adult-documents/versions/${payload(created).id}/download`)
        .auth(String(actor), { type: 'bearer' })
        .expect(403);
      await http()
        .post(`/api/adult-documents/versions/${payload(created).id}/review`)
        .auth(String(actor), { type: 'bearer' })
        .send({ status: 'validated' })
        .expect(403);
      await upload(actor).expect(403);
      await http()
        .get('/api/adult-documents')
        .auth(String(actor), { type: 'bearer' })
        .expect(403);
    }
    expect(tables.files).toHaveLength(1);
  });

  it('includes adult beneficiaries, rejects minors and reports missing birth dates or canonical identity', async () => {
    const own = await http()
      .get('/api/adult-documents/mine')
      .auth('1', { type: 'bearer' })
      .expect(200);
    expect(payload(own).eligible).toBe(true);
    expect(payload(own).dossier.memberId).toBe(ownerId);
    for (const [actor, eligible, reason] of [
      [8, false, 'under_age'],
      [9, null, 'birth_date_missing'],
      [10, null, 'member_not_found'],
    ]) {
      const result = await http()
        .get('/api/adult-documents/mine')
        .auth(String(actor), { type: 'bearer' })
        .expect(200);
      expect(result.body).toEqual({ eligible, reason, dossier: null });
    }
    for (const index of [7, 8])
      await http()
        .post(
          `/api/adult-documents/members/${String(tables.members[index].id)}`,
        )
        .auth('3', { type: 'bearer' })
        .send(input)
        .expect(400);
  });

  it('preserves signed bytes, private caching, CIC validation, rejection reasons and old versions', async () => {
    const first = await upload().expect(201);
    const review = (id: string, body: Row) =>
      http()
        .post(`/api/adult-documents/versions/${id}/review`)
        .auth('3', { type: 'bearer' })
        .send(body);
    await review(payload(first).id, { status: 'rejected', reason: ' ' }).expect(
      400,
    );
    await review(payload(first).id, {
      status: 'rejected',
      reason: 'Documentul nu este lizibil.',
    }).expect(201);
    const rejected = await http()
      .get(memberPath)
      .auth('1', { type: 'bearer' })
      .expect(200);
    expect(
      payload(rejected).documents.find((d) => d.id === payload(first).id)
        ?.rejectionReason,
    ).toBe('Documentul nu este lizibil.');
    const replacement = await upload().expect(201);
    const dossier = await http()
      .get(memberPath)
      .auth('1', { type: 'bearer' })
      .expect(200);
    expect(payload(dossier).complete).toBe(false);
    expect(payload(dossier).documents).toHaveLength(2);
    expect(
      payload(dossier).documents.find((d) => d.id === payload(replacement).id),
    ).toMatchObject({ version: 2, status: 'pending', rejectionReason: null });
    await review(payload(first).id, { status: 'validated' }).expect(409);
    await review(payload(replacement).id, { status: 'validated' }).expect(201);
    await review(payload(replacement).id, {
      status: 'rejected',
      reason: 'stale',
    }).expect(409);
    const complete = await http()
      .get(memberPath)
      .auth('3', { type: 'bearer' })
      .expect(200);
    expect(payload(complete).complete).toBe(true);
    const download = await http()
      .get(`/api/adult-documents/versions/${payload(first).id}/download`)
      .auth('3', { type: 'bearer' })
      .expect(200);
    expect(download.headers['cache-control']).toBe('private, no-store');
    expect(download.headers['content-disposition']).toContain('attachment;');
    expect(download.headers['x-content-type-options']).toBe('nosniff');
    expect(Buffer.from(download.body).toString()).toBe(
      Buffer.from(input.contentBase64, 'base64').toString(),
    );
    expect(complete.headers['cache-control']).toBe('private, no-store');
    expect(JSON.stringify(complete.body)).not.toContain(input.contentBase64);
    expect(
      tables.audits.some(
        (r) => r.action === 'adult_document.downloaded' && r.actorId === 3,
      ),
    ).toBe(true);
    expect(JSON.stringify(tables.audits)).not.toContain(
      'Documentul nu este lizibil.',
    );
    expect(JSON.stringify(tables.audits)).not.toContain(input.contentBase64);
    expect(JSON.stringify(tables.audits)).not.toContain('certificat.pdf');
  });

  it('keeps criminal records optional with separate versions and private review/download', async () => {
    const cic = await upload().expect(201);
    const optional = await upload(1, {
      kind: 'criminal_record',
      filename: 'cazier.pdf',
    }).expect(201);
    expect(
      tables.documents.find((d) => d.id === payload(optional).id),
    ).toMatchObject({ kind: 'criminal_record', version: 1 });
    await http()
      .post(`/api/adult-documents/versions/${payload(cic).id}/review`)
      .auth('3', { type: 'bearer' })
      .send({ status: 'validated' })
      .expect(201);
    const dossier = await http()
      .get(memberPath)
      .auth('1', { type: 'bearer' })
      .expect(200);
    expect(payload(dossier).complete).toBe(true);
    await http()
      .post(`/api/adult-documents/versions/${payload(optional).id}/review`)
      .auth('3', { type: 'bearer' })
      .send({ status: 'rejected', reason: 'Ilizibil' })
      .expect(201);
    const replacement = await upload(1, { kind: 'criminal_record' }).expect(
      201,
    );
    expect(
      tables.documents.find((d) => d.id === payload(replacement).id),
    ).toMatchObject({ kind: 'criminal_record', version: 2 });
    expect(
      payload(
        await http().get(memberPath).auth('1', { type: 'bearer' }).expect(200),
      ).complete,
    ).toBe(true);
    const download = `/api/adult-documents/versions/${payload(optional).id}/download`;
    await http().get(download).auth('2', { type: 'bearer' }).expect(403);
    const original = await http()
      .get(download)
      .auth('1', { type: 'bearer' })
      .expect(200);
    expect(Buffer.from(original.body)).toEqual(
      Buffer.from(input.contentBase64, 'base64'),
    );
  });

  it('retains historical years, filters the current version only and rechecks revoked admin rights', async () => {
    await upload(3, { year: scoutingYear() - 1 }).expect(201);
    const pending = await upload().expect(201);
    await http()
      .post(`/api/adult-documents/versions/${payload(pending).id}/review`)
      .auth('3', { type: 'bearer' })
      .send({ status: 'rejected', reason: 'Ilizibil' })
      .expect(201);
    await upload().expect(201);
    const rejected = await http()
      .get('/api/adult-documents?status=rejected')
      .auth('3', { type: 'bearer' })
      .expect(200);
    expect(payload(rejected).rows).toHaveLength(0);
    const pendingList = await http()
      .get('/api/adult-documents?status=pending&search=Membru%201')
      .auth('3', { type: 'bearer' })
      .expect(200);
    expect(payload(pendingList).rows).toHaveLength(1);
    expect(payload(pendingList).unknownBirthDates).toBe(1);
    const old = await http()
      .get(`${memberPath}?year=${scoutingYear() - 1}`)
      .auth('1', { type: 'bearer' })
      .expect(200);
    expect(payload(old).documents).toHaveLength(1);
    tables.users[2].centralMemberAdmin = false;
    await http().get(memberPath).auth('3', { type: 'bearer' }).expect(403);
  });
});
