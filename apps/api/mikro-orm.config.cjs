const { PostgreSqlDriver } = require('@mikro-orm/postgresql');
const { config: loadEnv } = require('dotenv');
const { join } = require('node:path');

loadEnv({ path: '../../.env.local' });
loadEnv({ path: '../../.env' });
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const DEFAULT_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/scoutscluj_utilities';

const getDatabaseUrl = () => process.env.DATABASE_URL || DEFAULT_DATABASE_URL;

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

module.exports = {
  driver: PostgreSqlDriver,
  clientUrl: getDatabaseUrl(),
  driverOptions: getDatabaseDriverOptions(),
  entities: [join(__dirname, 'dist', '**', '*.entity.js')],
  entitiesTs: [join(__dirname, 'src', '**', '*.entity.ts')],
  migrations: {
    path: join(__dirname, 'dist', 'migrations'),
    pathTs: join(__dirname, 'src', 'migrations'),
  },
  discovery: {
    warnWhenNoEntities: false,
  },
};
