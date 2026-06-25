import { isAbsolute } from 'node:path';

jest.mock('@mikro-orm/migrations', () => ({
  Migrator: class Migrator {},
}));

jest.mock('@mikro-orm/postgresql', () => ({
  PostgreSqlDriver: class PostgreSqlDriver {},
}));

const { createMikroOrmOptions } =
  jest.requireActual<typeof import('./database.config')>('./database.config');

const areAbsoluteStringPaths = (paths: unknown[] | undefined) =>
  paths?.every((path) => typeof path === 'string' && isAbsolute(path)) ?? false;

describe('createMikroOrmOptions', () => {
  it('uses absolute entity and migration paths', () => {
    const options = createMikroOrmOptions();

    expect(options.entities).toEqual(
      expect.arrayContaining([expect.stringMatching(/\.entity\.js$/)]),
    );
    expect(areAbsoluteStringPaths(options.entities)).toBe(true);
    expect(areAbsoluteStringPaths(options.entitiesTs)).toBe(true);
    expect(isAbsolute(options.migrations?.path ?? '')).toBe(true);
    expect(isAbsolute(options.migrations?.pathTs ?? '')).toBe(true);
  });
});
