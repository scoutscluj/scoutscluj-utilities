import { Migration } from '@mikro-orm/migrations';

export class Migration20261023000100 extends Migration {
  override up(): void {
    this.addSql(`create table "personal_objectives" (
      "id" serial primary key,
      "user_id" integer not null references "users" ("id") on delete cascade,
      "title" varchar(200) not null check (char_length(btrim("title")) > 0),
      "description" text not null check (char_length(btrim("description")) between 1 and 5000),
      "deadline" date not null,
      "created_at" timestamptz not null
    );`);
    this.addSql(
      'create index "personal_objectives_user_id_deadline_index" on "personal_objectives" ("user_id", "deadline");',
    );
  }

  override down(): void {
    this.addSql('drop table "personal_objectives";');
  }
}
