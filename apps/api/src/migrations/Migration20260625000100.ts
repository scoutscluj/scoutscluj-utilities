import { Migration } from '@mikro-orm/migrations';

export class Migration20260625000100 extends Migration {
  override up(): void {
    this.addSql(
      "create type \"activity_type\" as enum ('camp', 'hike', 'festival', 'training', 'meeting', 'other');",
    );
    this.addSql(
      "create type \"activity_status\" as enum ('planned', 'active', 'completed', 'cancelled');",
    );

    this.addSql(
      'create table "activities" ("id" serial primary key, "coordinator_id" int not null, "title" varchar(255) not null, "type" "activity_type" not null default \'other\', "status" "activity_status" not null default \'planned\', "start_date" timestamptz null, "end_date" timestamptz null, "location" varchar(255) null, "description" text null, "orgo_event_id" varchar(255) null, "orgo_event_iri" varchar(255) null, "created_at" timestamptz not null, "updated_at" timestamptz not null);',
    );
    this.addSql(
      'create index "activities_coordinator_id_index" on "activities" ("coordinator_id");',
    );
    this.addSql(
      'create index "activities_status_index" on "activities" ("status");',
    );
    this.addSql(
      'create index "activities_start_date_index" on "activities" ("start_date");',
    );
    this.addSql(
      'create index "activities_orgo_event_id_index" on "activities" ("orgo_event_id");',
    );
    this.addSql(
      'alter table "activities" add constraint "activities_coordinator_id_foreign" foreign key ("coordinator_id") references "users" ("id") on update cascade on delete restrict;',
    );

    this.addSql(
      'alter table "financial_documents" add column "activity_id" int null;',
    );
    this.addSql(
      'create index "financial_documents_activity_id_index" on "financial_documents" ("activity_id");',
    );
    this.addSql(
      'alter table "financial_documents" add constraint "financial_documents_activity_id_foreign" foreign key ("activity_id") references "activities" ("id") on update cascade on delete set null;',
    );
  }

  override down(): void {
    this.addSql(
      'alter table "financial_documents" drop constraint if exists "financial_documents_activity_id_foreign";',
    );
    this.addSql(
      'drop index if exists "financial_documents_activity_id_index";',
    );
    this.addSql(
      'alter table "financial_documents" drop column if exists "activity_id";',
    );
    this.addSql('drop table if exists "activities" cascade;');
    this.addSql('drop type if exists "activity_status";');
    this.addSql('drop type if exists "activity_type";');
  }
}
