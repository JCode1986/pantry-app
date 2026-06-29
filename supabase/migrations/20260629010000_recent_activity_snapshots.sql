create extension if not exists pgcrypto;

do $$
declare
  relation_kind "char";
begin
  select c.relkind
  into relation_kind
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'recent_activity';

  if relation_kind = 'v' then
    drop view public.recent_activity;
  elsif relation_kind = 'm' then
    drop materialized view public.recent_activity;
  end if;
end;
$$;

create table if not exists public.recent_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  item_id uuid,
  item_name text,
  location_name text,
  storage_area_name text,
  category_name text,
  item_or_entity_name text,
  name_at_event text,
  quantity integer,
  expiration_date date,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.recent_activity
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists action text,
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists item_id uuid,
  add column if not exists item_name text,
  add column if not exists location_name text,
  add column if not exists storage_area_name text,
  add column if not exists category_name text,
  add column if not exists item_or_entity_name text,
  add column if not exists name_at_event text,
  add column if not exists quantity integer,
  add column if not exists expiration_date date,
  add column if not exists changes jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now();

create index if not exists recent_activity_user_created_at_idx
  on public.recent_activity (user_id, created_at desc);

alter table public.recent_activity enable row level security;

drop policy if exists "Users can read their own recent activity" on public.recent_activity;
drop policy if exists "Users can insert their own recent activity" on public.recent_activity;

create policy "Users can read their own recent activity"
  on public.recent_activity
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own recent activity"
  on public.recent_activity
  for insert
  with check (auth.uid() = user_id);

create or replace function public.stocksense_activity_suppressed()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('stocksense.suppress_child_activity', true), '') = 'on';
$$;

create or replace function public.stocksense_item_path(p_category_id uuid)
returns table (
  category_id uuid,
  category_name text,
  storage_area_id uuid,
  storage_area_name text,
  location_id uuid,
  location_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sc.id,
    sc.name,
    sa.id,
    sa.name,
    l.id,
    l.name
  from public.storage_categories sc
  left join public.storage_areas sa on sa.id = sc.storage_area_id
  left join public.locations l on l.id = sa.location_id
  where sc.id = p_category_id
  limit 1;
$$;

create or replace function public.stocksense_log_location_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  activity_action text;
  activity_name text;
  activity_entity_id uuid;
  activity_changes jsonb := '{}'::jsonb;
begin
  if TG_OP = 'INSERT' then
    activity_action := 'added';
    activity_name := NEW.name;
    activity_entity_id := NEW.id;
    activity_changes := jsonb_build_object('snapshot', jsonb_build_object('name', NEW.name));
  elsif TG_OP = 'UPDATE' then
    if OLD.name is not distinct from NEW.name then
      return NEW;
    end if;

    activity_action := 'updated';
    activity_name := NEW.name;
    activity_entity_id := NEW.id;
    activity_changes := jsonb_build_object(
      'name',
      jsonb_build_object('from', OLD.name, 'to', NEW.name)
    );
  else
    activity_action := 'deleted';
    activity_name := OLD.name;
    activity_entity_id := OLD.id;
    activity_changes := jsonb_build_object('snapshot', jsonb_build_object('name', OLD.name));
    perform set_config('stocksense.suppress_child_activity', 'on', true);
  end if;

  insert into public.recent_activity (
    user_id,
    action,
    entity_type,
    entity_id,
    location_name,
    item_or_entity_name,
    name_at_event,
    changes
  )
  values (
    auth.uid(),
    activity_action,
    'location',
    activity_entity_id,
    activity_name,
    activity_name,
    activity_name,
    activity_changes
  );

  if TG_OP = 'DELETE' then
    return OLD;
  end if;

  return NEW;
end;
$$;

create or replace function public.stocksense_log_storage_area_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  location_name_value text;
  location_id_value uuid;
  activity_action text;
  activity_name text;
  activity_entity_id uuid;
  activity_changes jsonb := '{}'::jsonb;
begin
  if TG_OP = 'DELETE' and public.stocksense_activity_suppressed() then
    return OLD;
  end if;

  if TG_OP = 'DELETE' then
    location_id_value := OLD.location_id;
  else
    location_id_value := NEW.location_id;
  end if;

  select l.name
  into location_name_value
  from public.locations l
  where l.id = location_id_value;

  if TG_OP = 'INSERT' then
    activity_action := 'added';
    activity_name := NEW.name;
    activity_entity_id := NEW.id;
    activity_changes := jsonb_build_object(
      'snapshot',
      jsonb_build_object('name', NEW.name, 'location', location_name_value)
    );
  elsif TG_OP = 'UPDATE' then
    if OLD.name is not distinct from NEW.name then
      return NEW;
    end if;

    activity_action := 'updated';
    activity_name := NEW.name;
    activity_entity_id := NEW.id;
    activity_changes := jsonb_build_object(
      'name',
      jsonb_build_object('from', OLD.name, 'to', NEW.name)
    );
  else
    activity_action := 'deleted';
    activity_name := OLD.name;
    activity_entity_id := OLD.id;
    activity_changes := jsonb_build_object(
      'snapshot',
      jsonb_build_object('name', OLD.name, 'location', location_name_value)
    );
    perform set_config('stocksense.suppress_child_activity', 'on', true);
  end if;

  insert into public.recent_activity (
    user_id,
    action,
    entity_type,
    entity_id,
    location_name,
    storage_area_name,
    item_or_entity_name,
    name_at_event,
    changes
  )
  values (
    auth.uid(),
    activity_action,
    'storage_area',
    activity_entity_id,
    location_name_value,
    activity_name,
    activity_name,
    activity_name,
    activity_changes
  );

  if TG_OP = 'DELETE' then
    return OLD;
  end if;

  return NEW;
end;
$$;

create or replace function public.stocksense_log_category_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  path record;
  activity_action text;
  activity_name text;
  activity_entity_id uuid;
  activity_changes jsonb := '{}'::jsonb;
begin
  if TG_OP = 'DELETE' and public.stocksense_activity_suppressed() then
    return OLD;
  end if;

  if TG_OP = 'INSERT' then
    select
      NEW.id as category_id,
      NEW.name as category_name,
      sa.id as storage_area_id,
      sa.name as storage_area_name,
      l.id as location_id,
      l.name as location_name
    into path
    from public.storage_areas sa
    left join public.locations l on l.id = sa.location_id
    where sa.id = NEW.storage_area_id
    limit 1;

    activity_action := 'added';
    activity_name := NEW.name;
    activity_entity_id := NEW.id;
    activity_changes := jsonb_build_object(
      'snapshot',
      jsonb_build_object(
        'name', NEW.name,
        'area', path.storage_area_name,
        'location', path.location_name
      )
    );
  elsif TG_OP = 'UPDATE' then
    select *
    into path
    from public.stocksense_item_path(NEW.id);

    if OLD.name is not distinct from NEW.name then
      return NEW;
    end if;

    activity_action := 'updated';
    activity_name := NEW.name;
    activity_entity_id := NEW.id;
    activity_changes := jsonb_build_object(
      'name',
      jsonb_build_object('from', OLD.name, 'to', NEW.name)
    );
  else
    select *
    into path
    from public.stocksense_item_path(OLD.id);

    activity_action := 'deleted';
    activity_name := OLD.name;
    activity_entity_id := OLD.id;
    activity_changes := jsonb_build_object(
      'snapshot',
      jsonb_build_object(
        'name', OLD.name,
        'area', path.storage_area_name,
        'location', path.location_name
      )
    );
    perform set_config('stocksense.suppress_child_activity', 'on', true);
  end if;

  insert into public.recent_activity (
    user_id,
    action,
    entity_type,
    entity_id,
    location_name,
    storage_area_name,
    category_name,
    item_or_entity_name,
    name_at_event,
    changes
  )
  values (
    auth.uid(),
    activity_action,
    'category',
    activity_entity_id,
    path.location_name,
    path.storage_area_name,
    activity_name,
    activity_name,
    activity_name,
    activity_changes
  );

  if TG_OP = 'DELETE' then
    return OLD;
  end if;

  return NEW;
end;
$$;

create or replace function public.stocksense_log_item_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_path record;
  new_path record;
  activity_action text;
  activity_changes jsonb := '{}'::jsonb;
  current_location_name text;
  current_storage_area_name text;
  current_category_name text;
  activity_entity_id uuid;
  activity_name text;
  activity_quantity integer;
  activity_expiration_date date;
begin
  if TG_OP = 'DELETE' and public.stocksense_activity_suppressed() then
    return OLD;
  end if;

  if TG_OP in ('UPDATE', 'DELETE') then
    select *
    into old_path
    from public.stocksense_item_path(OLD.category_id);
  end if;

  if TG_OP in ('INSERT', 'UPDATE') then
    select *
    into new_path
    from public.stocksense_item_path(NEW.category_id);
  end if;

  if TG_OP = 'INSERT' then
    activity_action := 'added';
    current_location_name := new_path.location_name;
    current_storage_area_name := new_path.storage_area_name;
    current_category_name := new_path.category_name;
    activity_entity_id := NEW.id;
    activity_name := NEW.name;
    activity_quantity := NEW.quantity;
    activity_expiration_date := NEW.expiration_date;
    activity_changes := jsonb_build_object(
      'snapshot',
      jsonb_build_object(
        'name', NEW.name,
        'quantity', NEW.quantity,
        'expiration_date', NEW.expiration_date,
        'category', new_path.category_name,
        'area', new_path.storage_area_name,
        'location', new_path.location_name
      )
    );
  elsif TG_OP = 'UPDATE' then
    current_location_name := new_path.location_name;
    current_storage_area_name := new_path.storage_area_name;
    current_category_name := new_path.category_name;
    activity_entity_id := NEW.id;
    activity_name := NEW.name;
    activity_quantity := NEW.quantity;
    activity_expiration_date := NEW.expiration_date;

    if OLD.category_id is distinct from NEW.category_id then
      activity_action := 'moved';
      activity_changes := jsonb_build_object(
        'from',
        jsonb_build_object(
          'category', old_path.category_name,
          'area', old_path.storage_area_name,
          'location', old_path.location_name
        ),
        'to',
        jsonb_build_object(
          'category', new_path.category_name,
          'area', new_path.storage_area_name,
          'location', new_path.location_name
        )
      );
    else
      activity_action := 'updated';

      if OLD.name is distinct from NEW.name then
        activity_changes := activity_changes || jsonb_build_object(
          'name',
          jsonb_build_object('from', OLD.name, 'to', NEW.name)
        );
      end if;

      if OLD.quantity is distinct from NEW.quantity then
        activity_changes := activity_changes || jsonb_build_object(
          'quantity',
          jsonb_build_object('from', OLD.quantity, 'to', NEW.quantity)
        );
      end if;

      if OLD.expiration_date is distinct from NEW.expiration_date then
        activity_changes := activity_changes || jsonb_build_object(
          'expiration_date',
          jsonb_build_object('from', OLD.expiration_date, 'to', NEW.expiration_date)
        );
      end if;

      if activity_changes = '{}'::jsonb then
        return NEW;
      end if;
    end if;
  else
    activity_action := 'deleted';
    current_location_name := old_path.location_name;
    current_storage_area_name := old_path.storage_area_name;
    current_category_name := old_path.category_name;
    activity_entity_id := OLD.id;
    activity_name := OLD.name;
    activity_quantity := OLD.quantity;
    activity_expiration_date := OLD.expiration_date;
    activity_changes := jsonb_build_object(
      'snapshot',
      jsonb_build_object(
        'name', OLD.name,
        'quantity', OLD.quantity,
        'expiration_date', OLD.expiration_date,
        'category', old_path.category_name,
        'area', old_path.storage_area_name,
        'location', old_path.location_name
      )
    );
  end if;

  insert into public.recent_activity (
    user_id,
    action,
    entity_type,
    entity_id,
    item_id,
    item_name,
    location_name,
    storage_area_name,
    category_name,
    item_or_entity_name,
    name_at_event,
    quantity,
    expiration_date,
    changes
  )
  values (
    auth.uid(),
    activity_action,
    'item',
    activity_entity_id,
    activity_entity_id,
    activity_name,
    current_location_name,
    current_storage_area_name,
    current_category_name,
    activity_name,
    activity_name,
    activity_quantity,
    activity_expiration_date,
    activity_changes
  );

  if TG_OP = 'DELETE' then
    return OLD;
  end if;

  return NEW;
end;
$$;

drop trigger if exists stocksense_recent_activity_locations on public.locations;
drop trigger if exists stocksense_recent_activity_storage_areas on public.storage_areas;
drop trigger if exists stocksense_recent_activity_categories on public.storage_categories;
drop trigger if exists stocksense_recent_activity_items on public.items;

create trigger stocksense_recent_activity_locations
  before insert or update or delete on public.locations
  for each row
  execute function public.stocksense_log_location_activity();

create trigger stocksense_recent_activity_storage_areas
  before insert or update or delete on public.storage_areas
  for each row
  execute function public.stocksense_log_storage_area_activity();

create trigger stocksense_recent_activity_categories
  before insert or update or delete on public.storage_categories
  for each row
  execute function public.stocksense_log_category_activity();

create trigger stocksense_recent_activity_items
  before insert or update or delete on public.items
  for each row
  execute function public.stocksense_log_item_activity();
