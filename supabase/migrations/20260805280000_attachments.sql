-- Phase 10.1 — Attachments
-- Task-scoped file uploads. Workspace-partitioned storage path
-- + RLS gated by workspace_members membership. Doc/comment scope
-- reserved via nullable columns for later phases.

create table if not exists public.attachments (
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

create index if not exists idx_attachments_task on public.attachments(task_id) where task_id is not null;
create index if not exists idx_attachments_doc  on public.attachments(doc_id)  where doc_id  is not null;
create index if not exists idx_attachments_workspace on public.attachments(workspace_id);

alter table public.attachments enable row level security;

drop policy if exists "attachments read"     on public.attachments;
drop policy if exists "attachments insert"   on public.attachments;
drop policy if exists "attachments delete"   on public.attachments;

create policy "attachments read"
  on public.attachments for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and is_active = true
    )
  );

create policy "attachments insert"
  on public.attachments for insert
  with check (
    uploaded_by = auth.uid()
    and workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and is_active = true
    )
  );

create policy "attachments delete"
  on public.attachments for delete
  using (
    uploaded_by = auth.uid()
    or workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and is_active = true
        and role in ('owner','admin')
    )
  );

-- Private storage bucket (25 MiB per-file limit).
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 26214400)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "attachments-obj read"   on storage.objects;
drop policy if exists "attachments-obj upload" on storage.objects;
drop policy if exists "attachments-obj delete" on storage.objects;

create policy "attachments-obj read"
  on storage.objects for select
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] in (
      select workspace_id::text from public.workspace_members
      where user_id = auth.uid() and is_active = true
    )
  );

create policy "attachments-obj upload"
  on storage.objects for insert
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] in (
      select workspace_id::text from public.workspace_members
      where user_id = auth.uid() and is_active = true
    )
  );

create policy "attachments-obj delete"
  on storage.objects for delete
  using (
    bucket_id = 'attachments'
    and owner = auth.uid()
  );

do $$ begin
  alter publication supabase_realtime add table public.attachments;
exception when duplicate_object then null;
end $$;
