-- ============================================================
-- Tasks
-- ============================================================
create table tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text not null default '',
  priority     text not null check (priority in ('high', 'medium', 'low')),
  repository   text not null,
  status       text not null default 'pending' check (status in ('pending', 'complete')),
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

alter table tasks enable row level security;

create policy "Allow all operations for authenticated users"
  on tasks
  for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- Task logs (written by the Claude AI server)
-- ============================================================
create table task_logs (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks (id) on delete cascade,
  message    text not null,
  created_at timestamptz not null default now()
);

alter table task_logs enable row level security;

create policy "Allow read for authenticated users"
  on task_logs
  for select
  to authenticated
  using (true);

create policy "Allow insert for service role"
  on task_logs
  for insert
  to service_role
  with check (true);

-- ============================================================
-- Indexes
-- ============================================================
create index tasks_status_priority_idx on tasks (status, priority);
create index task_logs_task_id_idx on task_logs (task_id);
