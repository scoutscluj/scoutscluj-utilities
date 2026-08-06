jest.mock('@mikro-orm/core', () => {
  const chain: Record<string, jest.Mock> = {};
  for (const method of [
    'array',
    'autoincrement',
    'columnType',
    'default',
    'fieldName',
    'length',
    'nativeEnumName',
    'nullable',
    'onCreate',
    'onUpdate',
    'primary',
    'unique',
  ]) {
    chain[method] = jest.fn(() => chain);
  }
  const p = {
    boolean: jest.fn(() => chain),
    datetime: jest.fn(() => chain),
    enum: jest.fn(() => chain),
    integer: jest.fn(() => chain),
    json: jest.fn(() => chain),
    string: jest.fn(() => chain),
    type: jest.fn(() => chain),
  };
  return {
    EntityManager: class EntityManager {},
    EntityRepository: class EntityRepository {},
    LockMode: { PESSIMISTIC_WRITE: 'pessimistic_write' },
    defineEntity: <T>(entity: T): T => entity,
    p,
  };
});

jest.mock('@mikro-orm/nestjs', () => ({
  InjectRepository: jest.fn(() => () => undefined),
}));

import { ParentalConsentSeedService } from './parental-consent-seed.service';

type Row = Record<string, unknown>;

const memoryRepository = (rows: Row[] = []) => ({
  rows,
  findOne: jest.fn((where: Row) =>
    Promise.resolve(
      rows.find((row) =>
        Object.entries(where).every(([key, value]) => row[key] === value),
      ),
    ),
  ),
  count: jest.fn(() => Promise.resolve(rows.length)),
  create: jest.fn((value: Row) => {
    const row = { ...value, id: value.id ?? rows.length + 1 };
    rows.push(row);
    return row;
  }),
});

describe('ParentalConsentSeedService', () => {
  it('is idempotent and creates exactly one organization, three assets, and one template', async () => {
    const organizations = memoryRepository();
    const assets = memoryRepository();
    const templates = memoryRepository();
    const repositories = {
      ParentalConsentOrganizationSettings: organizations,
      ParentalConsentAsset: assets,
      ParentalConsentTemplateVersion: templates,
    };
    const fork = {
      persist: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
      getRepository: jest.fn(
        (entity: { name: keyof typeof repositories }) =>
          repositories[entity.name],
      ),
    };
    const em = {
      fork: jest.fn(() => fork),
    };
    const service = new ParentalConsentSeedService(em as never);

    const first = await service.seed();
    const second = await service.seed();

    expect(second).toEqual(first);
    expect(organizations.rows).toHaveLength(1);
    expect(assets.rows).toHaveLength(3);
    expect(templates.rows).toHaveLength(1);
    expect(templates.rows[0]).toMatchObject({ version: 1, status: 'active' });
    expect(em.fork).toHaveBeenCalledTimes(2);
  });
});
