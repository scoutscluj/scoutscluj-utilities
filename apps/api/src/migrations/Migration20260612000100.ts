import { Migration } from '@mikro-orm/migrations';

export class Migration20260612000100 extends Migration {
  override up(): void {
    this.addSql(
      "create type \"user_role\" as enum ('moderator', 'admin', 'super_admin');",
    );
    this.addSql(
      'create table "users" ("id" serial primary key, "email" varchar(255) null, "display_name" varchar(255) not null, "first_name" varchar(255) null, "last_name" varchar(255) null, "avatar_url" varchar(255) null, "roles" "user_role"[] not null default \'{}\', "last_login_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null);',
    );
    this.addSql(
      'alter table "users" add constraint "users_email_unique" unique ("email");',
    );

    this.addSql(
      'create table "orgo_connections" ("id" serial primary key, "user_id" int not null, "orgo_user_id" int null, "card_id" varchar(255) null, "email" varchar(255) null, "profile" jsonb not null, "connected_at" timestamptz not null, "last_login_at" timestamptz not null, "updated_at" timestamptz not null);',
    );
    this.addSql(
      'alter table "orgo_connections" add constraint "orgo_connections_user_id_unique" unique ("user_id");',
    );
    this.addSql(
      'alter table "orgo_connections" add constraint "orgo_connections_orgo_user_id_unique" unique ("orgo_user_id");',
    );
    this.addSql(
      'alter table "orgo_connections" add constraint "orgo_connections_card_id_unique" unique ("card_id");',
    );
    this.addSql(
      'create index "orgo_connections_email_index" on "orgo_connections" ("email");',
    );
    this.addSql(
      'alter table "orgo_connections" add constraint "orgo_connections_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;',
    );
  }

  override down(): void {
    this.addSql('drop table if exists "orgo_connections" cascade;');
    this.addSql('drop table if exists "users" cascade;');
    this.addSql('drop type if exists "user_role";');
  }
}
