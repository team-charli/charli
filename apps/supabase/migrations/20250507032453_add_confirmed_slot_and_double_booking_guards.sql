-- Ensure btree_gist is available for exclusion constraints
create extension if not exists btree_gist;

-- Add the confirmed_slot column, which defines the reserved time range for a session
-- Based on confirmed_time_date + requested_session_duration + 10 minute padding
alter table public.sessions
add column confirmed_slot tstzrange;

-- Backfill confirmed_slot for existing rows (non-null confirmed_time_date and duration)
update public.sessions
set confirmed_slot = tstzrange(
  confirmed_time_date,
  confirmed_time_date + (requested_session_duration + 10) * interval '1 minute'
)
where confirmed_time_date is not null
  and requested_session_duration is not null;

-- Create a trigger function to auto-update confirmed_slot on insert/update
create or replace function update_confirmed_slot() returns trigger as $$
begin
  if new.confirmed_time_date is not null and new.requested_session_duration is not null then
    new.confirmed_slot := tstzrange(
      new.confirmed_time_date,
      new.confirmed_time_date + (new.requested_session_duration + 10) * interval '1 minute'
    );
  else
    new.confirmed_slot := null;
  end if;
  return new;
end;
$$ language plpgsql;

-- Create trigger to sync confirmed_slot before insert or update
create trigger sync_confirmed_slot
before insert or update on public.sessions
for each row execute function update_confirmed_slot();

-- Drop any old constraints/indexes if they exist (idempotent safety)
drop index if exists sessions_teacher_slot_gist_idx;
drop index if exists sessions_learner_slot_gist_idx;
alter table public.sessions drop constraint if exists no_teacher_overlap;
alter table public.sessions drop constraint if exists no_learner_overlap;

-- Recreate exclusion constraints using confirmed_slot
create index sessions_teacher_slot_gist_idx
  on public.sessions using gist (teacher_id, confirmed_slot)
  where (confirmed_slot is not null);

create index sessions_learner_slot_gist_idx
  on public.sessions using gist (learner_id, confirmed_slot)
  where (confirmed_slot is not null);

alter table public.sessions
  add constraint no_teacher_overlap
  exclude using gist (
    teacher_id with =,
    confirmed_slot with &&
  )
  where (confirmed_slot is not null);

alter table public.sessions
  add constraint no_learner_overlap
  exclude using gist (
    learner_id with =,
    confirmed_slot with &&
  )
  where (confirmed_slot is not null);
