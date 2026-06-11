const { PostgreSqlDriver } = require('@mikro-orm/postgresql');
const { config: loadEnv } = require('dotenv');

loadEnv({ path: '../../.env.local' });
loadEnv({ path: '../../.env' });
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const DEFAULT_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/scoutscluj_utilities';

module.exports = {
  driver: PostgreSqlDriver,
  clientUrl: process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
  entities: ['./dist/**/*.entity.js'],
  entitiesTs: ['./src/**/*.entity.ts'],
  migrations: {
    path: './dist/migrations',
    pathTs: './src/migrations',
  },
  discovery: {
    warnWhenNoEntities: false,
  },
};
