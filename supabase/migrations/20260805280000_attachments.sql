-- Phase 10.1 — Task attachments
-- The `attachments` table already exists (bugs, since 20260302004416), and
-- the private `attachments` storage bucket + workspace-scoped storage.objects
-- policies were added in 20260728132000. This migration only adds the
-- task-scoped `task_attachments` table + RLS and raises the bucket size cap.

create table if not exists public.task_attachments (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id      uuid references public.tasks(id) on delete cascade,
  doc_id       uuid references public.docs(id)  on delete cascade,
  storage_path text not null,
  filename     text not null,
  mime_type    text,
  size_bytes   bigint,
  uploaded_by  uuid references auth.users(id) on delete set null,
  created_at   timestamptz default now()
);

create index if not exists idx_task_attachments_task on public.task_attachments(task_id) where task_id is not null;
create index if not exists idx_task_attachments_doc  on public.task_attachments(doc_id)  where doc_id  is not null;
create index if not exists idx_task_attachments_workspace on public.task_attachments(workspace_id);

alter table public.task_attachments enable row level security;

drop policy if exists "task_attachments read"   on public.task_attachments;
drop policy if exists "task_attachments insert" on public.task_attachments;
drop policy if exists "task_attachments delete" on public.task_attachments;

create policy "task_attachments read"
  on public.task_attachments for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and is_active = true
    )
  );

create policy "task_attachments insert"
  on public.task_attachments for insert
  with check (
    uploaded_by = auth.uid()
    and workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and is_active = true
    )
  );

create policy "task_attachments delete"
  on public.task_attachments for delete
  using (
    uploaded_by = auth.uid()
    or workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and is_active = true
        and role in ('owner','admin')
    )
  );

-- Raise per-file limit on the shared attachments bucket to 25 MiB
-- (bucket + storage.objects policies come from earlier migrations).
update storage.buckets set file_size_limit = 26214400 where id = 'attachments';

do $$ begin
  alter publication supabase_realtime add table public.task_attachments;
exception when duplicate_object then null;
end $$;
