import 'reflect-metadata';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { createMikroOrmOptions } from './config/database.config';
import { KitchenIngredient } from './modules/kitchen/entities/kitchen-ingredient.entity';
import { KitchenRecipe } from './modules/kitchen/entities/kitchen-recipe.entity';
import { KitchenRecipeIngredient } from './modules/kitchen/entities/kitchen-recipe-ingredient.entity';
import { KitchenSeedService } from './modules/kitchen/kitchen-seed.service';

// A maintenance command must not start application workers or remote sync jobs.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env.local', '../../.env', '.env.local', '.env'],
    }),
    MikroOrmModule.forRoot(createMikroOrmOptions()),
    MikroOrmModule.forFeature([
      KitchenIngredient,
      KitchenRecipe,
      KitchenRecipeIngredient,
    ]),
  ],
  providers: [KitchenSeedService],
})
class CatalogSeedModule {}

const seed = async () => {
  const app = await NestFactory.createApplicationContext(CatalogSeedModule, {
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
