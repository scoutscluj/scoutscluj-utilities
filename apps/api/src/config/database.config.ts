import type { Options } from '@mikro-orm/core';
import { Migrator } from '@mikro-orm/migrations';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { join } from 'node:path';

export const DEFAULT_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/scoutscluj_utilities';

export const getDatabaseUrl = () =>
  process.env.DATABASE_URL || DEFAULT_DATABASE_URL;

const isDatabaseSslEnabled = () =>
  process.env.DATABASE_SSL === 'true' ||
  getDatabaseUrl().includes('sslmode=require');

const getDatabaseDriverOptions = () => {
  if (!isDatabaseSslEnabled()) {
    return {};
  }

  return {
    ssl: {
      rejectUnauthorized:
        process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
    },
  };
};

export const createMikroOrmOptions = (): Partial<
  Options<PostgreSqlDriver>
> => ({
  driver: PostgreSqlDriver,
  clientUrl: getDatabaseUrl(),
  driverOptions: getDatabaseDriverOptions(),
  extensions: [Migrator],
  entities: [join(__dirname, '..', '**', '*.entity.js')],
  entitiesTs: [join(__dirname, '..', '**', '*.entity.ts')],
  migrations: {
    path: join(__dirname, '..', 'migrations'),
    pathTs: join(__dirname, '..', 'migrations'),
  },
  discovery: {
    warnWhenNoEntities: false,
  },
});
