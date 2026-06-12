import 'reflect-metadata';
import { MikroORM } from '@mikro-orm/postgresql';
import { createMikroOrmOptions } from './config/database.config';

const migrate = async () => {
  const orm = await MikroORM.init(createMikroOrmOptions());

  try {
    await orm.migrator.up();
  } finally {
    await orm.close(true);
  }
};

migrate().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
