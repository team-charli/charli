-- supabase/migrations/20250507181056_teacher_scorecards.sql

create table teacher_scorecards (
  session_id     bigint primary key references sessions(session_id) on delete cascade,
  teacher_id     bigint not null    references user_data(id)        on delete cascade,
  opportunities  integer  not null,
  correct_bells  integer  not null,
  extra_bells    integer  not null,
  accuracy_ratio integer  not null,      -- 0-100
  created_at     timestamptz default now()
);

create table teacher_missed_lines (
  id         bigserial primary key,
  session_id bigint not null references sessions(session_id) on delete cascade,
  text       text    not null,
  start_time numeric not null           -- seconds offset
);
