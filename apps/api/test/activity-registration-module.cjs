// Run after the API build: Nest needs TypeScript's emitted decorator metadata.
require('reflect-metadata');
const assert = require('node:assert/strict');
const { Test } = require('@nestjs/testing');
const { ConfigModule } = require('@nestjs/config');
const { MikroOrmModule } = require('@mikro-orm/nestjs');
const { createMikroOrmOptions } = require('../dist/config/database.config');
const {
  RegistrationModule,
} = require('../dist/modules/activity-registrations/registration.module');
const {
  RegistrationService,
} = require('../dist/modules/activity-registrations/registration.service');
async function main() {
  const target = new URL(
    process.env.ACTIVITY_REGISTRATION_TEST_DATABASE_URL ??
      'postgresql://postgres@127.0.0.1:55437/activity_registration_test',
  );
  assert.equal(target.hostname, '127.0.0.1');
  assert.equal(target.port, process.env.CI === 'true' ? '5432' : '55437');
  assert.equal(target.pathname, '/activity_registration_test');
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
      MikroOrmModule.forRoot({
        ...createMikroOrmOptions(),
        clientUrl: target.href,
      }),
      RegistrationModule,
    ],
  }).compile();
  try {
    assert(module.get(RegistrationService));
    console.log('PASS compiled NestJS registration module dependency wiring');
  } finally {
    await module.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
