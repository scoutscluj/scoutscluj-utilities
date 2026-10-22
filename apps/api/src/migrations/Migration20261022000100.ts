import { Migration } from '@mikro-orm/migrations';

/** Additive conversion: original rows are retained for reconciliation and recovery. */
export class Migration20261022000100 extends Migration {
  override up(): void {
    this.addSql(
      `select pg_advisory_xact_lock(9212026); select pg_advisory_xact_lock(19102026);`,
    );
    this.addSql(`create table member_organization_migration (
      source_table text not null, source_id text not null, original jsonb not null,
      created_at timestamptz not null default now(), primary key(source_table,source_id));
      insert into member_organization_migration(source_table,source_id,original)
      select 'scout_members', id::text, to_jsonb(m) from scout_members m
      union all select 'scout_units', id::text, to_jsonb(u) from scout_units u
      union all select 'scout_assignments', id::text, to_jsonb(a) from scout_assignments a;`);
    this.addSql(`alter table scout_units drop constraint valid_branch;
      alter table scout_units add column fixed boolean not null default false;
      alter table scout_members add column category varchar(255) null,
        add column category_review boolean not null default false;
      alter table users add column central_member_admin boolean not null default false;
      alter table scout_assignments add column parent_assignment_id uuid null references scout_assignments(id),
        add column expires_at timestamptz null;`);
    // Initialize once; subsequent sync/name edits never recalculate persisted affiliation.
    for (const table of ['scout_members', 'scout_units'])
      this.addSql(`update ${table} set structure_id = case
        when lower(translate(name,'șşțţăâîȘŞȚŢĂÂÎ','ssttaaiSSTTAAI')) like '%floresti%'
          then 'floresti' else 'cluj' end where not structure_confirmed;`);
    this
      .addSql(`insert into scout_units(id,name,branch,structure_id,structure_confirmed,fixed,archived,created_at)
      select md5('scouts-fixed-unit:'||s.id||':'||c.key)::uuid,c.label,c.key,s.id,true,true,false,now()
      from local_structures s cross join (values
        ('lupisori','Lupișori'),('temerari','Temerari'),('exploratori','Exploratori'),('seniori','Seniori'),
        ('lideri','Lideri'),('voluntari','Voluntari adulți'),('scouteri','Scouteri')) c(key,label);
      create unique index scout_fixed_category on scout_units(structure_id,branch) where fixed;
      alter table scout_units add constraint valid_fixed_category check
        (not fixed or (parent_id is null and branch in ('lupisori','temerari','exploratori','seniori','lideri','voluntari','scouteri')));`);
    this.addSql(`create table scout_subunits (
      id uuid primary key, name varchar(255) not null, branch varchar(255) not null,
      structure_id varchar(255) not null references local_structures(id), structure_confirmed boolean not null default true,
      parent_id uuid not null references scout_units(id), graduation_year integer null,
      orgo_id integer null unique, archived boolean not null default false, created_at timestamptz not null);
      insert into scout_subunits
      select g.id,g.name,f.branch,f.structure_id,g.structure_confirmed,f.id,g.graduation_year,g.orgo_id,g.archived,g.created_at
      from scout_units g join scout_units p on p.id=g.parent_id
      join scout_units f on f.fixed and f.structure_id=p.structure_id and f.branch=p.branch;
      create table scout_unit_sources(id integer primary key, unit_id uuid not null references scout_units(id),
        group_id uuid null references scout_subunits(id));
      insert into scout_unit_sources select old.orgo_id,f.id,g.id
      from scout_units old left join scout_units p on p.id=old.parent_id
      join scout_units f on f.fixed and f.structure_id=coalesce(p.structure_id,old.structure_id) and f.branch=old.branch
      left join scout_subunits g on g.id=old.id where old.orgo_id is not null;`);
    this
      .addSql(`with category_ids(id,category) as (values ('38','lupisori'),('39','temerari'),('40','exploratori'),('41','seniori'),('42','lideri'),('43','voluntari'),('44','scouteri')),
      category_names(name,category) as (values ('lupisor','lupisori'),('lupisori','lupisori'),('temerar','temerari'),('temerari','temerari'),('explorator','exploratori'),('exploratori','exploratori'),('senior','seniori'),('seniori','seniori'),('lider','lideri'),('lideri','lideri'),('voluntar adult','voluntari'),('voluntari adulti','voluntari'),('scouter','scouteri'),('scouteri','scouteri')),
      classified as (select m.id,case when ci.category is not null and cn.category is not null and ci.category<>cn.category then null
        else coalesce(ci.category,cn.category,case when m.orgo_id is null then m.branch end) end as category
        from scout_members m left join category_ids ci on ci.id=m.orgo_profile->'type'->>'id'
        left join category_names cn on cn.name=lower(trim(translate(m.orgo_profile->'type'->>'name','șşțţăâîȘŞȚŢĂÂÎ','ssttaaiSSTTAAI'))))
      update scout_members m set category=c.category from classified c where c.id=m.id;
      update scout_members set category_review = category is null or
        (branch is not null and category is not null and branch <> category);
      update scout_members set category=null where category_review;
      update scout_members m set unit_id=f.id from scout_units f
        where f.fixed and f.structure_id=m.structure_id and f.branch=m.category;
      update scout_members set unit_id=null,group_id=null where category is null;
      update scout_members m set group_id=null where group_id is not null and not exists
        (select 1 from scout_subunits g where g.id=m.group_id and g.parent_id=m.unit_id);`);
    this
      .addSql(`alter table scout_members drop constraint scout_members_group_id_fkey;
      alter table scout_members add constraint scout_members_group_id_fkey foreign key(group_id) references scout_subunits(id);
      alter table scout_assignments drop constraint scout_assignments_group_id_fkey;
      update scout_assignments set group_id=null where group_id is not null and not exists
        (select 1 from scout_subunits g where g.id=scout_assignments.group_id);
      alter table scout_assignments add constraint scout_assignments_group_id_fkey foreign key(group_id) references scout_subunits(id);
      drop index scout_one_chief;
      update scout_assignments a set unit_id=f.id from scout_units old,scout_units f
        where a.unit_id=old.id and not old.fixed and f.fixed and f.structure_id=old.structure_id and f.branch=old.branch;
      update scout_assignments a set ended_at=now() where ended_at is null and role='chief' and unit_id in
        (select unit_id from scout_assignments where role='chief' and ended_at is null group by unit_id having count(*)>1);
      create unique index scout_one_chief on scout_assignments(unit_id) where role='chief' and ended_at is null;
      update scout_assignments a set unit_id=m.unit_id,group_id=m.group_id from scout_members m
        where a.member_id=m.id and a.role='beneficiary' and a.ended_at is null;
      update scout_members m set account_id=c.user_id from orgo_connections c
        where m.orgo_id=c.orgo_user_id and m.account_id is null and not exists
        (select 1 from scout_members other where other.account_id=c.user_id);
      update users u set central_member_admin=true from scout_members m
        where m.account_id=u.id and m.structure_id='cluj' and m.status='active' and not u.member_access_disabled
        and ('admin'=any(u.roles::text[]) or 'super_admin'=any(u.roles::text[]));`);
    this.addSql(
      `alter table scout_members add constraint valid_member_category check(category is null or category in ('lupisori','temerari','exploratori','seniori','lideri','voluntari','scouteri'));`,
    );
    this
      .addSql(`create function protect_fixed_scout_units() returns trigger language plpgsql as $$
      begin
        if TG_OP='DELETE' then
          if OLD.fixed then raise exception 'Fixed units cannot be deleted'; end if;
          return OLD;
        end if;
        if OLD.fixed and NEW is distinct from OLD then raise exception 'Fixed units cannot be changed'; end if;
        if not OLD.fixed and NEW.fixed then raise exception 'Cannot extend the fixed catalog'; end if;
        return NEW;
      end $$;
      create trigger protect_fixed_scout_units before update or delete on scout_units
      for each row execute function protect_fixed_scout_units();`);
    this
      .addSql(`create function validate_scout_organization() returns trigger language plpgsql as $$
      begin
        if NEW.unit_id is not null and not exists (select 1 from scout_units u where u.id=NEW.unit_id
          and u.fixed and u.structure_id=NEW.structure_id and u.branch=NEW.category) then
          raise exception 'Member unit must match primary structure and category';
        end if;
        if NEW.group_id is not null and not exists (select 1 from scout_subunits g
          where g.id=NEW.group_id and g.parent_id=NEW.unit_id and not g.archived) then
          raise exception 'Subunit must belong to primary unit';
        end if;
        return NEW;
      end $$;
      create trigger validate_scout_organization before insert or update of unit_id,group_id,category,structure_id
      on scout_members for each row execute function validate_scout_organization();`);
  }
  override down(): void {
    throw new Error(
      'Use the retained member_organization_migration snapshots with the documented recovery procedure; automatic downgrade would discard new assignments.',
    );
  }
}
