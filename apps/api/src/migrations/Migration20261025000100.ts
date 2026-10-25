import { Migration } from '@mikro-orm/migrations';

export class Migration20261025000100 extends Migration {
  override up(): void {
    this.addSql(`create table "adult_documents" (
      "id" uuid primary key,
      "member_id" uuid not null references "scout_members" ("id") on delete restrict,
      "year" integer not null check ("year" between 2000 and 9999),
      "kind" text not null check ("kind" = 'behavioural_integrity'),
      "version" integer not null check ("version" > 0),
      "status" varchar(255) not null default 'pending' check ("status" in ('pending', 'validated', 'rejected')),
      "filename" varchar(255) not null,
      "content_type" varchar(255) not null,
      "size" integer not null check ("size" > 0 and "size" <= 10485760),
      "uploader_id" integer not null references "users" ("id") on delete restrict,
      "uploaded_at" timestamptz(6) not null,
      "reviewer_id" integer null references "users" ("id") on delete restrict,
      "reviewed_at" timestamptz(6) null,
      "rejection_reason" text null,
      constraint "adult_documents_member_id_year_kind_version_unique" unique ("member_id", "year", "kind", "version"),
      constraint "adult_documents_rejection_check" check ("status" <> 'rejected' or ("rejection_reason" is not null and char_length(btrim("rejection_reason")) between 1 and 2000)),
      constraint "adult_documents_review_check" check (("status" = 'pending' and "reviewer_id" is null and "reviewed_at" is null) or
             ("status" <> 'pending' and "reviewer_id" is not null and "reviewed_at" is not null))
    );`);
    this.addSql(
      'create index "adult_documents_year_member_id_index" on "adult_documents" ("year", "member_id");',
    );
    this.addSql(`create table "adult_document_files" (
      "id" uuid primary key references "adult_documents" ("id") on delete cascade,
      "data" bytea not null
    );`);
  }

  override down(): void {
    this.addSql('drop table "adult_document_files";');
    this.addSql('drop table "adult_documents";');
  }
}
