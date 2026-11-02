import { Migration } from '@mikro-orm/migrations';

export class Migration20261102000100 extends Migration {
  override up(): void {
    // Do not activate historical commands merely by enabling server write access at rollout.
    this.addSql(`update member_sync_operations set state='review-required',
      message='Operație istorică: verifică datele Orgo înainte de reluare.', next_attempt_at=null
      where state in ('pending','running','permission-required','uncertain');`);
    this.addSql(
      'alter table member_sync_operations add column if not exists claim_token uuid null;',
    );
    this.addSql(
      'alter table member_settings add column if not exists refresh_retry_at timestamptz null;',
    );
    this.addSql(
      'alter table scout_members drop constraint if exists member_grade;',
    );
    this.addSql(
      'alter table scout_members add constraint member_grade check (grade is null or grade between 0 and 12);',
    );
    this.addSql(`create table member_applications (
      id uuid primary key, request_key uuid not null unique,
      unit_id uuid null references scout_units(id), member_id uuid null references scout_members(id),
      data jsonb not null, state varchar(255) not null default 'pending', revision integer not null default 1,
      reason text not null default '', approved_by integer null references users(id), created_by integer null references users(id),
      existing_orgo_id integer null, attempted_at timestamptz null, created_at timestamptz not null,
      reviewed_at timestamptz null, consent_version varchar(255) not null default '2026-11-02',
      constraint application_state check(state in ('pending','approved','rejected','needs-information'))
    );`);
    this.addSql(
      'create index member_applications_unit_state on member_applications(unit_id,state);',
    );
    this.addSql(`create table member_guardians (
      id uuid primary key, member_id uuid not null references scout_members(id), name varchar(255) not null,
      email varchar(255) not null, phone varchar(255) not null, relation varchar(255) not null,
      verified_account_id integer null references users(id), verified_by integer null references users(id),
      source_application_id uuid null references member_applications(id), ended_at timestamptz null
    );`);
    this.addSql(
      'create index member_guardians_member on member_guardians(member_id);',
    );
    this.addSql(`create table orgo_object_jobs (
      id uuid primary key default gen_random_uuid(), subject varchar(255) not null, subject_id varchar(255) not null,
      state varchar(255) not null default 'pending', payload jsonb not null default '{}'::jsonb, changed_fields jsonb not null default '[]'::jsonb, message text not null default 'În așteptarea sincronizării.',
      created_at timestamptz not null default now(), claimed_at timestamptz null, claim_token uuid null,
      attempts integer not null default 0, next_attempt_at timestamptz null
    );`);
    this.addSql(
      'create index orgo_object_jobs_pending on orgo_object_jobs(state,next_attempt_at);',
    );
    this.addSql(`create table orgo_object_links (
      id varchar(255) primary key, remote_id varchar(255) null, creation_started boolean not null default false,
      baseline jsonb not null default '{}'::jsonb
    );`);
    this
      .addSql(`create function queue_orgo_object_change() returns trigger language plpgsql as $$
      declare subject_name text := TG_ARGV[0]; target_id text; current_payload jsonb; previous_payload jsonb; changed jsonb := '[]'::jsonb;
      begin
        if TG_OP='DELETE' then
          insert into orgo_object_jobs(subject,subject_id,changed_fields,payload)
          values(subject_name,OLD.id::text,'["state"]'::jsonb,
            jsonb_build_object('deleted',true,'activityId',to_jsonb(OLD)->'activity_id','memberId',to_jsonb(OLD)->'member_id'));
          return OLD;
        end if;
        current_payload := to_jsonb(NEW);
        target_id := case when TG_TABLE_NAME='activity_registration_settings' then current_payload->>'activity_id' else current_payload->>'id' end;
        if TG_TABLE_NAME='activity_registration_settings' then
          if TG_OP='UPDATE' and (to_jsonb(OLD)->'data'->'published') is not distinct from (current_payload->'data'->'published') then return NEW; end if;
        else
          current_payload := to_jsonb(NEW);
          if TG_OP='UPDATE' then
            previous_payload := to_jsonb(OLD);
            if TG_TABLE_NAME='activities' and
              (current_payload - array['orgo_event_id','orgo_event_iri','updated_at','administrator_ids','coordinator_id','departments']) =
              (previous_payload - array['orgo_event_id','orgo_event_iri','updated_at','administrator_ids','coordinator_id','departments']) then return NEW; end if;
            if TG_TABLE_NAME='activity_registrations' and
              (current_payload->'state') is not distinct from (previous_payload->'state') then return NEW; end if;
            if TG_TABLE_NAME in ('scout_units','scout_subunits') and
              (current_payload - array['orgo_id','created_at']) = (previous_payload - array['orgo_id','created_at']) then return NEW; end if;
          end if;
        end if;
        if TG_TABLE_NAME='activity_registration_settings' then changed := '["published"]'::jsonb;
        elsif TG_OP='INSERT' then changed := '["create"]'::jsonb;
        else
          select coalesce(jsonb_agg(key),'[]'::jsonb) into changed from jsonb_each(current_payload)
          where current_payload->key is distinct from previous_payload->key;
        end if;
        insert into orgo_object_jobs(subject,subject_id,changed_fields) values(subject_name,target_id,changed);
        return NEW;
      end $$;`);
    this.addSql(
      "create trigger activities_orgo_outbox after insert or update on activities for each row execute function queue_orgo_object_change('activity');",
    );
    this.addSql(
      "create trigger activity_publication_orgo_outbox after insert or update on activity_registration_settings for each row execute function queue_orgo_object_change('activity');",
    );
    this.addSql(
      "create trigger registrations_orgo_outbox after insert or update or delete on activity_registrations for each row execute function queue_orgo_object_change('registration');",
    );
    this.addSql(
      "create trigger units_orgo_outbox after insert or update on scout_units for each row execute function queue_orgo_object_change('unit');",
    );
    this.addSql(
      "create trigger subunits_orgo_outbox after insert or update on scout_subunits for each row execute function queue_orgo_object_change('subunit');",
    );
    // Preserve old parent contacts as unverified contacts; shared emails grant no authority.
    this
      .addSql(`insert into member_guardians(id,member_id,name,email,phone,relation)
      select gen_random_uuid(), id, coalesce(profile->>'parentName',''), coalesce(profile->>'parentEmail',''),
        coalesce(profile->>'parentPhone',''), 'Părinte/tutore'
      from scout_members where coalesce(profile->>'parentName','') <> ''
         or coalesce(profile->>'parentPhone','') <> '' or coalesce(profile->>'parentEmail','') <> '';`);
  }
}
