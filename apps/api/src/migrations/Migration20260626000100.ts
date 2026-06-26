import { Migration } from '@mikro-orm/migrations';

export class Migration20260626000100 extends Migration {
  override up(): void {
    this.addSql(
      "create type \"kitchen_unit_family\" as enum ('mass', 'volume', 'count');",
    );
    this.addSql(
      "create type \"kitchen_day_status\" as enum ('current', 'outside_activity_dates');",
    );
    this.addSql(
      "create type \"kitchen_meal_slot\" as enum ('breakfast', 'snack_1', 'lunch', 'snack_2', 'dinner');",
    );
    this.addSql(
      "create type \"kitchen_attendance_mode\" as enum ('plan_default', 'custom');",
    );
    this.addSql(
      "create type \"kitchen_recipe_scaling_mode\" as enum ('proportional', 'whole_batch');",
    );
    this.addSql(
      "create type \"kitchen_procurement_method\" as enum ('delivery', 'self_purchase');",
    );
    this.addSql(
      "create type \"kitchen_procurement_status\" as enum ('planned', 'in_progress', 'completed');",
    );

    this.addSql(
      'create table "app_audit_entries" ("id" serial primary key, "actor_id" int null, "action" varchar(255) not null, "entity_type" varchar(255) not null, "entity_id" varchar(255) not null, "activity_id" int null, "metadata" jsonb not null default \'{}\', "created_at" timestamptz not null);',
    );
    this.addSql(
      'create index "app_audit_entries_actor_id_index" on "app_audit_entries" ("actor_id");',
    );
    this.addSql(
      'create index "app_audit_entries_activity_id_index" on "app_audit_entries" ("activity_id");',
    );
    this.addSql(
      'create index "app_audit_entries_entity_type_index" on "app_audit_entries" ("entity_type");',
    );
    this.addSql(
      'create index "app_audit_entries_created_at_index" on "app_audit_entries" ("created_at");',
    );
    this.addSql(
      'alter table "app_audit_entries" add constraint "app_audit_entries_actor_id_foreign" foreign key ("actor_id") references "users" ("id") on update cascade on delete set null;',
    );
    this.addSql(
      'alter table "app_audit_entries" add constraint "app_audit_entries_activity_id_foreign" foreign key ("activity_id") references "activities" ("id") on update cascade on delete set null;',
    );

    this.addSql(
      'create table "kitchen_ingredients" ("id" serial primary key, "legacy_source_id" varchar(255) null, "name" varchar(255) not null, "category" varchar(255) not null, "unit_family" "kitchen_unit_family" not null, "default_unit" varchar(255) not null, "default_price_per_unit" numeric(12,4) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);',
    );
    this.addSql(
      'create index "kitchen_ingredients_legacy_source_id_index" on "kitchen_ingredients" ("legacy_source_id");',
    );
    this.addSql(
      'create index "kitchen_ingredients_category_index" on "kitchen_ingredients" ("category");',
    );
    this.addSql(
      'create unique index "kitchen_ingredients_legacy_source_id_unique" on "kitchen_ingredients" ("legacy_source_id") where "legacy_source_id" is not null;',
    );

    this.addSql(
      'create table "kitchen_recipes" ("id" serial primary key, "legacy_source_id" varchar(255) null, "name" varchar(255) not null, "description" text null, "servings" numeric(12,4) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);',
    );
    this.addSql(
      'create index "kitchen_recipes_legacy_source_id_index" on "kitchen_recipes" ("legacy_source_id");',
    );
    this.addSql(
      'create unique index "kitchen_recipes_legacy_source_id_unique" on "kitchen_recipes" ("legacy_source_id") where "legacy_source_id" is not null;',
    );

    this.addSql(
      'create table "kitchen_recipe_ingredients" ("id" serial primary key, "legacy_source_id" varchar(255) null, "recipe_id" int not null, "ingredient_id" int not null, "quantity" numeric(12,4) not null, "unit" varchar(255) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);',
    );
    this.addSql(
      'create index "kitchen_recipe_ingredients_legacy_source_id_index" on "kitchen_recipe_ingredients" ("legacy_source_id");',
    );
    this.addSql(
      'create index "kitchen_recipe_ingredients_recipe_id_index" on "kitchen_recipe_ingredients" ("recipe_id");',
    );
    this.addSql(
      'create index "kitchen_recipe_ingredients_ingredient_id_index" on "kitchen_recipe_ingredients" ("ingredient_id");',
    );
    this.addSql(
      'create unique index "kitchen_recipe_ingredients_legacy_source_id_unique" on "kitchen_recipe_ingredients" ("legacy_source_id") where "legacy_source_id" is not null;',
    );
    this.addSql(
      'alter table "kitchen_recipe_ingredients" add constraint "kitchen_recipe_ingredients_recipe_id_foreign" foreign key ("recipe_id") references "kitchen_recipes" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "kitchen_recipe_ingredients" add constraint "kitchen_recipe_ingredients_ingredient_id_foreign" foreign key ("ingredient_id") references "kitchen_ingredients" ("id") on update cascade on delete restrict;',
    );

    this.addSql(
      'create table "kitchen_plans" ("id" serial primary key, "activity_id" int not null, "default_participant_count" int not null default 0, "created_at" timestamptz not null, "updated_at" timestamptz not null);',
    );
    this.addSql(
      'create unique index "kitchen_plans_activity_id_unique" on "kitchen_plans" ("activity_id");',
    );
    this.addSql(
      'alter table "kitchen_plans" add constraint "kitchen_plans_activity_id_foreign" foreign key ("activity_id") references "activities" ("id") on update cascade on delete cascade;',
    );

    this.addSql(
      'create table "kitchen_days" ("id" serial primary key, "kitchen_plan_id" int not null, "date" timestamptz not null, "date_status" "kitchen_day_status" not null default \'current\', "created_at" timestamptz not null, "updated_at" timestamptz not null);',
    );
    this.addSql(
      'create index "kitchen_days_kitchen_plan_id_index" on "kitchen_days" ("kitchen_plan_id");',
    );
    this.addSql(
      'create index "kitchen_days_date_index" on "kitchen_days" ("date");',
    );
    this.addSql(
      'create unique index "kitchen_days_plan_date_unique" on "kitchen_days" ("kitchen_plan_id", "date");',
    );
    this.addSql(
      'alter table "kitchen_days" add constraint "kitchen_days_kitchen_plan_id_foreign" foreign key ("kitchen_plan_id") references "kitchen_plans" ("id") on update cascade on delete cascade;',
    );

    this.addSql(
      'create table "kitchen_meals" ("id" serial primary key, "kitchen_day_id" int not null, "slot" "kitchen_meal_slot" not null, "context" varchar(255) null, "name" varchar(255) null, "sort_order" int not null default 0, "attendance_mode" "kitchen_attendance_mode" not null default \'plan_default\', "created_at" timestamptz not null, "updated_at" timestamptz not null);',
    );
    this.addSql(
      'create index "kitchen_meals_kitchen_day_id_index" on "kitchen_meals" ("kitchen_day_id");',
    );
    this.addSql(
      'create index "kitchen_meals_slot_index" on "kitchen_meals" ("slot");',
    );
    this.addSql(
      'alter table "kitchen_meals" add constraint "kitchen_meals_kitchen_day_id_foreign" foreign key ("kitchen_day_id") references "kitchen_days" ("id") on update cascade on delete cascade;',
    );

    this.addSql(
      'create table "kitchen_meal_recipes" ("id" serial primary key, "meal_id" int not null, "recipe_id" int not null, "serving_override" numeric(12,4) null, "scaling_mode" "kitchen_recipe_scaling_mode" not null default \'proportional\', "created_at" timestamptz not null, "updated_at" timestamptz not null);',
    );
    this.addSql(
      'create index "kitchen_meal_recipes_meal_id_index" on "kitchen_meal_recipes" ("meal_id");',
    );
    this.addSql(
      'create index "kitchen_meal_recipes_recipe_id_index" on "kitchen_meal_recipes" ("recipe_id");',
    );
    this.addSql(
      'alter table "kitchen_meal_recipes" add constraint "kitchen_meal_recipes_meal_id_foreign" foreign key ("meal_id") references "kitchen_meals" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "kitchen_meal_recipes" add constraint "kitchen_meal_recipes_recipe_id_foreign" foreign key ("recipe_id") references "kitchen_recipes" ("id") on update cascade on delete restrict;',
    );

    this.addSql(
      'create table "kitchen_meal_attendance" ("id" serial primary key, "meal_id" int not null, "subgroup_name" varchar(255) not null, "attendance" int not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);',
    );
    this.addSql(
      'create index "kitchen_meal_attendance_meal_id_index" on "kitchen_meal_attendance" ("meal_id");',
    );
    this.addSql(
      'alter table "kitchen_meal_attendance" add constraint "kitchen_meal_attendance_meal_id_foreign" foreign key ("meal_id") references "kitchen_meals" ("id") on update cascade on delete cascade;',
    );

    this.addSql(
      'create table "kitchen_quantity_adjustments" ("id" serial primary key, "meal_id" int not null, "ingredient_id" int not null, "quantity_delta" numeric(12,4) not null, "unit" varchar(255) not null, "notes" text null, "created_at" timestamptz not null, "updated_at" timestamptz not null);',
    );
    this.addSql(
      'create index "kitchen_quantity_adjustments_meal_id_index" on "kitchen_quantity_adjustments" ("meal_id");',
    );
    this.addSql(
      'create index "kitchen_quantity_adjustments_ingredient_id_index" on "kitchen_quantity_adjustments" ("ingredient_id");',
    );
    this.addSql(
      'alter table "kitchen_quantity_adjustments" add constraint "kitchen_quantity_adjustments_meal_id_foreign" foreign key ("meal_id") references "kitchen_meals" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "kitchen_quantity_adjustments" add constraint "kitchen_quantity_adjustments_ingredient_id_foreign" foreign key ("ingredient_id") references "kitchen_ingredients" ("id") on update cascade on delete restrict;',
    );

    this.addSql(
      'create table "kitchen_plan_ingredient_estimates" ("id" serial primary key, "kitchen_plan_id" int not null, "ingredient_id" int not null, "estimated_unit_price" numeric(12,4) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);',
    );
    this.addSql(
      'create index "kitchen_plan_ingredient_estimates_kitchen_plan_id_index" on "kitchen_plan_ingredient_estimates" ("kitchen_plan_id");',
    );
    this.addSql(
      'create index "kitchen_plan_ingredient_estimates_ingredient_id_index" on "kitchen_plan_ingredient_estimates" ("ingredient_id");',
    );
    this.addSql(
      'create unique index "kitchen_plan_ingredient_estimates_unique" on "kitchen_plan_ingredient_estimates" ("kitchen_plan_id", "ingredient_id");',
    );
    this.addSql(
      'alter table "kitchen_plan_ingredient_estimates" add constraint "kitchen_plan_ingredient_estimates_kitchen_plan_id_foreign" foreign key ("kitchen_plan_id") references "kitchen_plans" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "kitchen_plan_ingredient_estimates" add constraint "kitchen_plan_ingredient_estimates_ingredient_id_foreign" foreign key ("ingredient_id") references "kitchen_ingredients" ("id") on update cascade on delete cascade;',
    );

    this.addSql(
      'create table "kitchen_procurement_events" ("id" serial primary key, "kitchen_plan_id" int not null, "name" varchar(255) not null, "supplier" varchar(255) null, "date" timestamptz null, "method" "kitchen_procurement_method" not null default \'self_purchase\', "status" "kitchen_procurement_status" not null default \'planned\', "notes" text null, "created_at" timestamptz not null, "updated_at" timestamptz not null);',
    );
    this.addSql(
      'create index "kitchen_procurement_events_kitchen_plan_id_index" on "kitchen_procurement_events" ("kitchen_plan_id");',
    );
    this.addSql(
      'create index "kitchen_procurement_events_supplier_index" on "kitchen_procurement_events" ("supplier");',
    );
    this.addSql(
      'create index "kitchen_procurement_events_status_index" on "kitchen_procurement_events" ("status");',
    );
    this.addSql(
      'create index "kitchen_procurement_events_date_index" on "kitchen_procurement_events" ("date");',
    );
    this.addSql(
      'alter table "kitchen_procurement_events" add constraint "kitchen_procurement_events_kitchen_plan_id_foreign" foreign key ("kitchen_plan_id") references "kitchen_plans" ("id") on update cascade on delete cascade;',
    );

    this.addSql(
      'create table "kitchen_procurement_items" ("id" serial primary key, "procurement_event_id" int not null, "ingredient_id" int not null, "quantity" numeric(12,4) not null, "unit" varchar(255) not null, "estimated_unit_price" numeric(12,4) null, "estimated_total_cost" numeric(12,4) null, "real_unit_price" numeric(12,4) null, "real_total_cost" numeric(12,4) null, "notes" text null, "created_at" timestamptz not null, "updated_at" timestamptz not null);',
    );
    this.addSql(
      'create index "kitchen_procurement_items_procurement_event_id_index" on "kitchen_procurement_items" ("procurement_event_id");',
    );
    this.addSql(
      'create index "kitchen_procurement_items_ingredient_id_index" on "kitchen_procurement_items" ("ingredient_id");',
    );
    this.addSql(
      'alter table "kitchen_procurement_items" add constraint "kitchen_procurement_items_procurement_event_id_foreign" foreign key ("procurement_event_id") references "kitchen_procurement_events" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "kitchen_procurement_items" add constraint "kitchen_procurement_items_ingredient_id_foreign" foreign key ("ingredient_id") references "kitchen_ingredients" ("id") on update cascade on delete restrict;',
    );

    this.addSql(
      'create table "kitchen_procurement_documents" ("id" serial primary key, "procurement_event_id" int not null, "financial_document_id" int not null, "created_at" timestamptz not null);',
    );
    this.addSql(
      'create index "kitchen_procurement_documents_procurement_event_id_index" on "kitchen_procurement_documents" ("procurement_event_id");',
    );
    this.addSql(
      'create index "kitchen_procurement_documents_financial_document_id_index" on "kitchen_procurement_documents" ("financial_document_id");',
    );
    this.addSql(
      'create unique index "kitchen_procurement_documents_unique" on "kitchen_procurement_documents" ("procurement_event_id", "financial_document_id");',
    );
    this.addSql(
      'alter table "kitchen_procurement_documents" add constraint "kitchen_procurement_documents_procurement_event_id_foreign" foreign key ("procurement_event_id") references "kitchen_procurement_events" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "kitchen_procurement_documents" add constraint "kitchen_procurement_documents_financial_document_id_foreign" foreign key ("financial_document_id") references "financial_documents" ("id") on update cascade on delete cascade;',
    );
  }

  override down(): void {
    this.addSql('drop table if exists "kitchen_procurement_documents" cascade;');
    this.addSql('drop table if exists "kitchen_procurement_items" cascade;');
    this.addSql('drop table if exists "kitchen_procurement_events" cascade;');
    this.addSql(
      'drop table if exists "kitchen_plan_ingredient_estimates" cascade;',
    );
    this.addSql('drop table if exists "kitchen_quantity_adjustments" cascade;');
    this.addSql('drop table if exists "kitchen_meal_attendance" cascade;');
    this.addSql('drop table if exists "kitchen_meal_recipes" cascade;');
    this.addSql('drop table if exists "kitchen_meals" cascade;');
    this.addSql('drop table if exists "kitchen_days" cascade;');
    this.addSql('drop table if exists "kitchen_plans" cascade;');
    this.addSql('drop table if exists "kitchen_recipe_ingredients" cascade;');
    this.addSql('drop table if exists "kitchen_recipes" cascade;');
    this.addSql('drop table if exists "kitchen_ingredients" cascade;');
    this.addSql('drop table if exists "app_audit_entries" cascade;');
    this.addSql('drop type if exists "kitchen_procurement_status";');
    this.addSql('drop type if exists "kitchen_procurement_method";');
    this.addSql('drop type if exists "kitchen_recipe_scaling_mode";');
    this.addSql('drop type if exists "kitchen_attendance_mode";');
    this.addSql('drop type if exists "kitchen_meal_slot";');
    this.addSql('drop type if exists "kitchen_day_status";');
    this.addSql('drop type if exists "kitchen_unit_family";');
  }
}
