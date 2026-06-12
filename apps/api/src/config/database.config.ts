import type { Options } from '@mikro-orm/core';
import { Migrator } from '@mikro-orm/migrations';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';

export const DEFAULT_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/scoutscluj_utilities';

export const getDatabaseUrl = () =>
  process.env.DATABASE_URL || DEFAULT_DATABASE_URL;

export const createMikroOrmOptions = (): Partial<
  Options<PostgreSqlDriver>
> => ({
  driver: PostgreSqlDriver,
  clientUrl: getDatabaseUrl(),
  extensions: [Migrator],
  entities: ['./dist/**/*.entity.js'],
  entitiesTs: ['./src/**/*.entity.ts'],
  migrations: {
    path: './dist/migrations',
    pathTs: './src/migrations',
  },
  discovery: {
    warnWhenNoEntities: false,
  },
});
