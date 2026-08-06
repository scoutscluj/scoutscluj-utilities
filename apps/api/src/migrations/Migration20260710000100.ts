import { Migration } from '@mikro-orm/migrations';

export class Migration20260710000100 extends Migration {
  override up(): void {
    this.addSql(
      'create table "inventory_items" ("id" serial primary key, "name" varchar(255) not null, "quantity" int not null default 0, "category" varchar(255) null, "subcategory" varchar(255) null, "owner" varchar(255) null, "location_description" varchar(255) null, "condition" varchar(255) null default \'Buna\', "is_consumable" boolean not null default false, "notes" text null, "created_by_user_id" int null, "created_by_display_name" varchar(255) null, "updated_by_user_id" int null, "updated_by_display_name" varchar(255) null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, constraint "inventory_items_quantity_check" check ("quantity" >= 0));',
    );
    this.addSql(
      'create index "inventory_items_name_index" on "inventory_items" ("name");',
    );
    this.addSql(
      'create index "inventory_items_category_index" on "inventory_items" ("category");',
    );
    this.addSql(
      'create index "inventory_items_subcategory_index" on "inventory_items" ("subcategory");',
    );
    this.addSql(
      'create index "inventory_items_owner_index" on "inventory_items" ("owner");',
    );
    this.addSql(
      'create index "inventory_items_location_description_index" on "inventory_items" ("location_description");',
    );
    this.addSql(
      'create index "inventory_items_condition_index" on "inventory_items" ("condition");',
    );
    this.addSql(
      'create index "inventory_items_is_consumable_index" on "inventory_items" ("is_consumable");',
    );
    this.addSql(
      'create index "inventory_items_deleted_at_index" on "inventory_items" ("deleted_at");',
    );
    this.addSql(
      'alter table "inventory_items" add constraint "inventory_items_created_by_user_id_foreign" foreign key ("created_by_user_id") references "users" ("id") on update cascade on delete set null;',
    );
    this.addSql(
      'alter table "inventory_items" add constraint "inventory_items_updated_by_user_id_foreign" foreign key ("updated_by_user_id") references "users" ("id") on update cascade on delete set null;',
    );

    this.addSql(
      'create table "inventory_item_images" ("id" serial primary key, "inventory_item_id" int not null, "original_filename" varchar(255) not null, "content_type" varchar(255) not null, "file_size" int not null, "checksum_sha256" varchar(255) not null, "file_data" bytea not null, "uploaded_by_user_id" int null, "uploaded_by_display_name" varchar(255) null, "created_at" timestamptz not null, "updated_at" timestamptz not null);',
    );
    this.addSql(
      'create index "inventory_item_images_inventory_item_id_index" on "inventory_item_images" ("inventory_item_id");',
    );
    this.addSql(
      'alter table "inventory_item_images" add constraint "inventory_item_images_inventory_item_id_unique" unique ("inventory_item_id");',
    );
    this.addSql(
      'alter table "inventory_item_images" add constraint "inventory_item_images_inventory_item_id_foreign" foreign key ("inventory_item_id") references "inventory_items" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "inventory_item_images" add constraint "inventory_item_images_uploaded_by_user_id_foreign" foreign key ("uploaded_by_user_id") references "users" ("id") on update cascade on delete set null;',
    );
  }

  override down(): void {
    this.addSql('drop table if exists "inventory_item_images" cascade;');
    this.addSql('drop table if exists "inventory_items" cascade;');
  }
}
