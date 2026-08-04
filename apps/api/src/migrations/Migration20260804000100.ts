import { Migration } from '@mikro-orm/migrations';

export class Migration20260804000100 extends Migration {
  override up(): void {
    this.addSql(
      'alter type "activity_department" add value if not exists \'parental_consent\';',
    );
    this.addSql(
      "create type \"parental_consent_template_status\" as enum ('draft', 'active', 'archived');",
    );
    this.addSql(
      "create type \"parental_consent_publication_status\" as enum ('active', 'archived');",
    );
    this.addSql(
      "create type \"parental_consent_branch\" as enum ('lupisori', 'temerari', 'exploratori');",
    );

    this.addSql(`create table "parental_consent_organization_settings" (
      "id" int not null,
      "name" varchar(255) not null,
      "legal_name" varchar(255) null,
      "address" text not null,
      "email" varchar(255) not null,
      "phone" varchar(255) not null,
      "website" varchar(255) null,
      "revision" int not null default 1,
      "updated_by_id" int null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      constraint "parental_consent_organization_settings_pkey" primary key ("id"),
      constraint "parental_consent_organization_singleton_check" check ("id" = 1),
      constraint "parental_consent_organization_updated_by_fk" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null
    );`);

    this.addSql(`create table "parental_consent_assets" (
      "id" serial primary key,
      "name" varchar(255) not null,
      "alt_text" varchar(255) not null,
      "content_type" varchar(255) not null,
      "file_size" int not null,
      "width" int not null,
      "height" int not null,
      "checksum_sha256" varchar(64) not null,
      "file_data" bytea not null,
      "created_by_id" int null,
      "created_at" timestamptz not null default now(),
      constraint "parental_consent_assets_created_by_fk" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null,
      constraint "parental_consent_assets_content_type_check" check ("content_type" in ('image/png', 'image/jpeg')),
      constraint "parental_consent_assets_file_size_check" check ("file_size" > 0 and "file_size" <= 5242880),
      constraint "parental_consent_assets_dimensions_check" check ("width" > 0 and "height" > 0 and "width" <= 8000 and "height" <= 8000)
    );`);
    this.addSql(
      'create index "parental_consent_assets_checksum_index" on "parental_consent_assets" ("checksum_sha256");',
    );

    this.addSql(`create table "parental_consent_template_versions" (
      "id" serial primary key,
      "version" int not null unique,
      "name" varchar(255) not null,
      "status" "parental_consent_template_status" not null default 'draft',
      "schema_version" int not null,
      "document" jsonb not null,
      "layout" jsonb not null,
      "based_on_version_id" int null,
      "created_by_id" int null,
      "activated_by_id" int null,
      "activated_at" timestamptz null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      constraint "parental_consent_template_based_on_fk" foreign key ("based_on_version_id") references "parental_consent_template_versions" ("id") on update cascade on delete set null,
      constraint "parental_consent_template_created_by_fk" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null,
      constraint "parental_consent_template_activated_by_fk" foreign key ("activated_by_id") references "users" ("id") on update cascade on delete set null
    );`);
    this.addSql(
      'create index "parental_consent_template_status_index" on "parental_consent_template_versions" ("status");',
    );
    this.addSql(
      'create unique index "parental_consent_one_active_template" on "parental_consent_template_versions" ((1)) where "status" = \'active\';',
    );

    this.addSql(`create table "parental_consent_activity_drafts" (
      "id" serial primary key,
      "activity_id" int not null unique,
      "schema_version" int not null,
      "revision" int not null default 1,
      "data" jsonb not null,
      "created_by_id" int not null,
      "updated_by_id" int not null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      constraint "parental_consent_draft_activity_fk" foreign key ("activity_id") references "activities" ("id") on update cascade on delete cascade,
      constraint "parental_consent_draft_created_by_fk" foreign key ("created_by_id") references "users" ("id") on update cascade on delete restrict,
      constraint "parental_consent_draft_updated_by_fk" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete restrict,
      constraint "parental_consent_draft_revision_check" check ("revision" > 0)
    );`);

    this.addSql(`create table "parental_consent_publications" (
      "id" serial primary key,
      "reference" varchar(16) not null unique,
      "activity_id" int not null,
      "status" "parental_consent_publication_status" not null default 'active',
      "template_version_id" int not null,
      "draft_revision" int not null,
      "draft_snapshot" jsonb not null,
      "organization_snapshot" jsonb not null,
      "template_snapshot" jsonb not null,
      "published_by_id" int not null,
      "created_at" timestamptz not null default now(),
      "archived_at" timestamptz null,
      constraint "parental_consent_publication_activity_fk" foreign key ("activity_id") references "activities" ("id") on update cascade on delete cascade,
      constraint "parental_consent_publication_template_fk" foreign key ("template_version_id") references "parental_consent_template_versions" ("id") on update cascade on delete restrict,
      constraint "parental_consent_publication_user_fk" foreign key ("published_by_id") references "users" ("id") on update cascade on delete restrict
    );`);
    this.addSql(
      'create index "parental_consent_publications_activity_status_index" on "parental_consent_publications" ("activity_id", "status");',
    );
    this.addSql(
      'create unique index "parental_consent_one_active_publication" on "parental_consent_publications" ("activity_id") where "status" = \'active\';',
    );

    this.addSql(`create table "parental_consent_documents" (
      "id" serial primary key,
      "publication_id" int not null,
      "branch" "parental_consent_branch" not null,
      "filename" varchar(255) not null,
      "content_type" varchar(255) not null default 'application/pdf',
      "file_size" int not null,
      "checksum_sha256" varchar(64) not null,
      "file_data" bytea not null,
      "created_at" timestamptz not null default now(),
      constraint "parental_consent_document_publication_fk" foreign key ("publication_id") references "parental_consent_publications" ("id") on update cascade on delete cascade,
      constraint "parental_consent_document_publication_branch_unique" unique ("publication_id", "branch"),
      constraint "parental_consent_document_content_type_check" check ("content_type" = 'application/pdf'),
      constraint "parental_consent_document_file_size_check" check ("file_size" > 0)
    );`);
    this.addSql(
      'create index "parental_consent_documents_checksum_index" on "parental_consent_documents" ("checksum_sha256");',
    );
  }

  override down(): void {
    this.addSql('drop table if exists "parental_consent_documents" cascade;');
    this.addSql(
      'drop table if exists "parental_consent_publications" cascade;',
    );
    this.addSql(
      'drop table if exists "parental_consent_activity_drafts" cascade;',
    );
    this.addSql(
      'drop table if exists "parental_consent_template_versions" cascade;',
    );
    this.addSql('drop table if exists "parental_consent_assets" cascade;');
    this.addSql(
      'drop table if exists "parental_consent_organization_settings" cascade;',
    );
    this.addSql('drop type if exists "parental_consent_branch";');
    this.addSql('drop type if exists "parental_consent_publication_status";');
    this.addSql('drop type if exists "parental_consent_template_status";');
  }
}
