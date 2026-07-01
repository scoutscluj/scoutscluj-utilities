import { Migration } from '@mikro-orm/migrations';

export class Migration20260701000200 extends Migration {
  override up(): void {
    this.addSql(
      'alter table "kitchen_recipes" add column "condiments" jsonb not null default \'[]\';',
    );
    this.addSql(`
      update "kitchen_recipes"
      set
        "condiments" = coalesce(
          (
            select jsonb_agg(trim(value))
            from regexp_split_to_table("description", ',') as value
            where trim(value) <> ''
          ),
          '[]'::jsonb
        ),
        "description" = null
      where "description" is not null and trim("description") <> '';
    `);

    this.addSql(
      'alter table "kitchen_meal_recipes" add column "recipe_name_snapshot" varchar(255) null;',
    );
    this.addSql(
      'alter table "kitchen_meal_recipes" add column "recipe_servings_snapshot" numeric(12,4) null;',
    );
    this.addSql(
      'alter table "kitchen_meal_recipes" add column "ingredients_snapshot" jsonb not null default \'[]\';',
    );
    this.addSql(
      'alter table "kitchen_meal_recipes" add column "condiments_snapshot" jsonb not null default \'[]\';',
    );
    this.addSql(
      'alter table "kitchen_meal_recipes" add column "recipe_snapshot_hash" varchar(255) null;',
    );
    this.addSql(
      'alter table "kitchen_meal_recipes" add column "source_recipe_updated_at" timestamptz null;',
    );
    this.addSql(
      'alter table "kitchen_meal_recipes" add column "snapshot_created_at" timestamptz null;',
    );
    this.addSql(`
      update "kitchen_meal_recipes" as kmr
      set
        "recipe_name_snapshot" = r."name",
        "recipe_servings_snapshot" = r."servings",
        "ingredients_snapshot" = coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'ingredientId', i."id",
                'ingredientName', i."name",
                'category', i."category",
                'quantity', ri."quantity",
                'unit', ri."unit",
                'defaultUnit', i."default_unit",
                'unitFamily', i."unit_family",
                'estimatedUnitPrice', i."default_price_per_unit"
              )
              order by ri."id"
            )
            from "kitchen_recipe_ingredients" as ri
            join "kitchen_ingredients" as i on i."id" = ri."ingredient_id"
            where ri."recipe_id" = r."id"
          ),
          '[]'::jsonb
        ),
        "condiments_snapshot" = r."condiments",
        "source_recipe_updated_at" = r."updated_at",
        "snapshot_created_at" = now()
      from "kitchen_recipes" as r
      where kmr."recipe_id" = r."id";
    `);

    this.addSql(
      'alter table "kitchen_procurement_events" add column "owner_name" varchar(255) null;',
    );
    this.addSql(
      'alter type "kitchen_procurement_method" add value if not exists \'local_center\';',
    );
    this.addSql(
      'alter type "kitchen_procurement_method" add value if not exists \'person\';',
    );
    this.addSql(
      'alter type "kitchen_procurement_method" add value if not exists \'shopping_run\';',
    );
    this.addSql(
      'alter type "kitchen_procurement_method" add value if not exists \'supplier_order\';',
    );
  }

  override down(): void {
    this.addSql(
      'alter table "kitchen_procurement_events" drop column if exists "owner_name";',
    );
    this.addSql(
      'alter table "kitchen_meal_recipes" drop column if exists "snapshot_created_at";',
    );
    this.addSql(
      'alter table "kitchen_meal_recipes" drop column if exists "source_recipe_updated_at";',
    );
    this.addSql(
      'alter table "kitchen_meal_recipes" drop column if exists "recipe_snapshot_hash";',
    );
    this.addSql(
      'alter table "kitchen_meal_recipes" drop column if exists "condiments_snapshot";',
    );
    this.addSql(
      'alter table "kitchen_meal_recipes" drop column if exists "ingredients_snapshot";',
    );
    this.addSql(
      'alter table "kitchen_meal_recipes" drop column if exists "recipe_servings_snapshot";',
    );
    this.addSql(
      'alter table "kitchen_meal_recipes" drop column if exists "recipe_name_snapshot";',
    );
    this.addSql(
      'alter table "kitchen_recipes" drop column if exists "condiments";',
    );
  }
}
