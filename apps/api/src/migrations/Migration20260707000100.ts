import { Migration } from '@mikro-orm/migrations';

export class Migration20260707000100 extends Migration {
  override up(): void {
    this.addSql(
      'alter type "financial_document_status" add value if not exists \'send_failed\';',
    );

    this.addSql(
      'create table "financial_document_handoff_attempts" ("id" serial primary key, "document_id" int not null, "actor_id" int null, "channel" varchar(255) not null default \'email\', "provider" varchar(255) not null default \'gmail\', "status" varchar(255) not null, "sender_email" varchar(255) not null, "recipient_email" varchar(255) not null, "subject" varchar(255) not null, "attachment_filename" varchar(255) not null, "provider_message_id" varchar(255) null, "error_message" text null, "created_at" timestamptz not null);',
    );
    this.addSql(
      'create index "financial_document_handoff_attempts_document_id_index" on "financial_document_handoff_attempts" ("document_id");',
    );
    this.addSql(
      'create index "financial_document_handoff_attempts_actor_id_index" on "financial_document_handoff_attempts" ("actor_id");',
    );
    this.addSql(
      'create index "financial_document_handoff_attempts_status_index" on "financial_document_handoff_attempts" ("status");',
    );
    this.addSql(
      'alter table "financial_document_handoff_attempts" add constraint "financial_document_handoff_attempts_document_id_foreign" foreign key ("document_id") references "financial_documents" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "financial_document_handoff_attempts" add constraint "financial_document_handoff_attempts_actor_id_foreign" foreign key ("actor_id") references "users" ("id") on update cascade on delete set null;',
    );
  }

  override down(): void {
    this.addSql(
      'drop table if exists "financial_document_handoff_attempts" cascade;',
    );
  }
}
