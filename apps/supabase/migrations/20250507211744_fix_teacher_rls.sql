-- 20250507224000_fix_teacher_rls.sql
-------------------------------------------------------------
-- Ensure RLS is on (idempotent)
alter table teacher_scorecards   enable row level security;
alter table teacher_missed_lines enable row level security;

-------------------------------------------------------------
-- 1) Teacher sees only own scorecards
drop policy if exists teacher_can_view_own_scorecards
  on teacher_scorecards;

create policy teacher_can_view_own_scorecards
  on teacher_scorecards
  for select
  using (
    teacher_id = (
      select id
      from   user_data
      where  auth_provider_id = auth.uid()::text
      limit  1
    )
  );

-------------------------------------------------------------
-- 2) Teacher sees only missed lines for those sessions
drop policy if exists teacher_can_view_missed_lines
  on teacher_missed_lines;

create policy teacher_can_view_missed_lines
  on teacher_missed_lines
  for select
  using (
    session_id in (
      select session_id
      from   teacher_scorecards
      where  teacher_id = (
        select id
        from   user_data
        where  auth_provider_id = auth.uid()::text
        limit 1
      )
    )
  );
