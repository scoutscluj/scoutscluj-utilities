import 'reflect-metadata';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { KitchenSeedService } from './modules/kitchen/kitchen-seed.service';

const seed = async () => {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const orm = app.get(MikroORM);
    const result = await RequestContext.create(orm.em, () =>
      app
        .get(KitchenSeedService)
        .importLegacyCatalog(process.env.KITCHEN_EXPORTS_DIR),
    );
    console.log(
      `Kitchen catalog imported: ${result.ingredients} ingredients, ${result.recipes} recipes, ${result.recipeIngredients} recipe ingredients.`,
    );
  } finally {
    await app.close();
  }
};

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
