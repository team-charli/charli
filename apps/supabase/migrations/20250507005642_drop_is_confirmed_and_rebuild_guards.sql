CREATE EXTENSION IF NOT EXISTS btree_gist;

-- remove old guards that depend on is_confirmed
DROP INDEX IF EXISTS sessions_teacher_slot_gist_idx;
DROP INDEX IF EXISTS sessions_learner_slot_gist_idx;

ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS no_teacher_time_overlap,
  DROP CONSTRAINT IF EXISTS no_learner_time_overlap,
  DROP COLUMN IF EXISTS is_confirmed;

-- ensure range column exists
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS scheduled_slot tstzrange;

-- rebuild teacher guard
CREATE INDEX IF NOT EXISTS sessions_teacher_slot_gist_idx
  ON public.sessions USING gist (teacher_id, scheduled_slot)
  WHERE (scheduled_slot IS NOT NULL);

ALTER TABLE public.sessions
  ADD CONSTRAINT no_teacher_time_overlap
  EXCLUDE USING gist (
    teacher_id WITH =,
    scheduled_slot WITH &&
  )
  WHERE (scheduled_slot IS NOT NULL);

-- rebuild learner guard
CREATE INDEX IF NOT EXISTS sessions_learner_slot_gist_idx
  ON public.sessions USING gist (learner_id, scheduled_slot)
  WHERE (scheduled_slot IS NOT NULL);

ALTER TABLE public.sessions
  ADD CONSTRAINT no_learner_time_overlap
  EXCLUDE USING gist (
    learner_id WITH =,
    scheduled_slot WITH &&
  )
  WHERE (scheduled_slot IS NOT NULL);
