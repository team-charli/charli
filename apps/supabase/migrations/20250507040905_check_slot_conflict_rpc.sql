create or replace function check_slot_conflict(
  t_id bigint,
  l_id bigint,
  proposed_slot tstzrange
)
returns boolean
language sql
as $$
  select exists (
    select 1 from sessions
    where confirmed_slot && proposed_slot
      and (
        teacher_id = t_id
        or learner_id = l_id
      )
  )
$$;
