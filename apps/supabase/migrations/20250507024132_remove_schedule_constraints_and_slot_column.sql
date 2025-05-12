-- Remove triggers and indexes related to scheduling (if not already gone)
drop index if exists sessions_teacher_slot_gist_idx;
drop index if exists sessions_learner_slot_gist_idx;

-- Drop exclusion constraints if present
alter table public.sessions
  drop constraint if exists no_teacher_time_overlap,
  drop constraint if exists no_learner_time_overlap;

-- Drop the scheduled_slot column
alter table public.sessions
  drop column if exists scheduled_slot;
