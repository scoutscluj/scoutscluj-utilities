import { Migration } from '@mikro-orm/migrations';

export class Migration20260624000100 extends Migration {
  override up(): void {
    this.addSql(
      'alter type "user_role" add value if not exists \'finance_manager\';',
    );

    this.addSql(
      "create type \"financial_document_status\" as enum ('uploaded', 'in_review', 'ready_to_send', 'sent', 'needs_clarification', 'rejected', 'archived');",
    );
    this.addSql(
      "create type \"keez_handoff_mode\" as enum ('review_first', 'direct_to_keez');",
    );

    this.addSql(
      'create table "financial_documents" ("id" serial primary key, "uploader_id" int not null, "status" "financial_document_status" not null default \'uploaded\', "original_filename" varchar(255) not null, "content_type" varchar(255) not null, "file_size" int not null, "checksum_sha256" varchar(255) not null, "file_data" bytea not null, "activity_name" varchar(255) null, "notes" text null, "reviewer_notes" text null, "keez_external_id" varchar(255) null, "keez_submitted_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null);',
    );
    this.addSql(
      'create index "financial_documents_uploader_id_index" on "financial_documents" ("uploader_id");',
    );
    this.addSql(
      'create index "financial_documents_status_index" on "financial_documents" ("status");',
    );
    this.addSql(
      'alter table "financial_documents" add constraint "financial_documents_uploader_id_foreign" foreign key ("uploader_id") references "users" ("id") on update cascade on delete restrict;',
    );

    this.addSql(
      'create table "financial_document_audits" ("id" serial primary key, "document_id" int not null, "actor_id" int not null, "from_status" "financial_document_status" null, "to_status" "financial_document_status" not null, "comment" text null, "created_at" timestamptz not null);',
    );
    this.addSql(
      'create index "financial_document_audits_document_id_index" on "financial_document_audits" ("document_id");',
    );
    this.addSql(
      'alter table "financial_document_audits" add constraint "financial_document_audits_document_id_foreign" foreign key ("document_id") references "financial_documents" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "financial_document_audits" add constraint "financial_document_audits_actor_id_foreign" foreign key ("actor_id") references "users" ("id") on update cascade on delete restrict;',
    );

    this.addSql(
      'create table "finance_settings" ("id" int primary key, "keez_handoff_mode" "keez_handoff_mode" not null default \'review_first\', "updated_by_id" int null, "updated_at" timestamptz not null);',
    );
    this.addSql(
      'alter table "finance_settings" add constraint "finance_settings_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;',
    );
    this.addSql(
      'insert into "finance_settings" ("id", "keez_handoff_mode", "updated_at") values (1, \'review_first\', now());',
    );
  }

  override down(): void {
    this.addSql('drop table if exists "finance_settings" cascade;');
    this.addSql('drop table if exists "financial_document_audits" cascade;');
    this.addSql('drop table if exists "financial_documents" cascade;');
    this.addSql('drop type if exists "keez_handoff_mode";');
    this.addSql('drop type if exists "financial_document_status";');

    this.addSql('alter table "users" alter column "roles" drop default;');
    this.addSql(
      'alter table "users" alter column "roles" type text[] using "roles"::text[];',
    );
    this.addSql(
      'update "users" set "roles" = array_remove("roles", \'finance_manager\');',
    );
    this.addSql('drop type if exists "user_role";');
    this.addSql(
      "create type \"user_role\" as enum ('moderator', 'admin', 'super_admin');",
    );
    this.addSql(
      'alter table "users" alter column "roles" type "user_role"[] using "roles"::text[]::"user_role"[];',
    );
    this.addSql('alter table "users" alter column "roles" set default \'{}\';');
  }
}
