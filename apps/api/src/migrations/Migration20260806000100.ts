import { Migration } from '@mikro-orm/migrations';

export class Migration20260806000100 extends Migration {
  override up(): void {
    this.addSql(
      'alter table "inventory_item_images" add column "thumbnail_content_type" varchar(255) null, add column "thumbnail_file_size" int null, add column "thumbnail_checksum_sha256" varchar(255) null, add column "thumbnail_data" bytea null;',
    );
  }

  override down(): void {
    this.addSql(
      'alter table "inventory_item_images" drop column "thumbnail_content_type", drop column "thumbnail_file_size", drop column "thumbnail_checksum_sha256", drop column "thumbnail_data";',
    );
  }
}
