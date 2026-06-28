begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.research_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  natural_request text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'error')),
  selected_tool text,
  product text,
  product_details text,
  market text,
  destination text,
  input_json jsonb not null default '{}'::jsonb,
  result_json jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.research_attachments (
  id uuid primary key default gen_random_uuid(),
  research_run_id uuid not null references public.research_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_type text,
  file_size integer not null default 0,
  storage_bucket text not null default 'research-attachments',
  storage_path text not null,
  content_mode text,
  extracted_text text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_events (
  id uuid primary key default gen_random_uuid(),
  research_run_id uuid not null references public.research_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  step text,
  tool_name text,
  status text,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  research_run_id uuid not null references public.research_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  alibaba_url text,
  moq text,
  unit_price text,
  ddp_status text,
  quality_score integer,
  notes text,
  raw_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.negotiation_messages (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id) on delete cascade,
  research_run_id uuid not null references public.research_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message_type text,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'sent', 'replied', 'archived')),
  waiting_for text,
  needs_user_approval boolean not null default true,
  raw_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_active_idx on public.profiles (is_active);
create index if not exists research_runs_user_created_idx on public.research_runs (user_id, created_at desc);
create index if not exists research_runs_status_idx on public.research_runs (status);
create index if not exists research_attachments_run_idx on public.research_attachments (research_run_id);
create index if not exists research_attachments_user_idx on public.research_attachments (user_id);
create index if not exists agent_events_run_created_idx on public.agent_events (research_run_id, created_at);
create index if not exists agent_events_user_idx on public.agent_events (user_id);
create index if not exists suppliers_run_idx on public.suppliers (research_run_id);
create index if not exists suppliers_user_idx on public.suppliers (user_id);
create index if not exists negotiation_messages_run_idx on public.negotiation_messages (research_run_id);
create index if not exists negotiation_messages_supplier_idx on public.negotiation_messages (supplier_id);
create index if not exists negotiation_messages_user_idx on public.negotiation_messages (user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'research-attachments',
  'research-attachments',
  false,
  4194304,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.profiles enable row level security;
alter table public.research_runs enable row level security;
alter table public.research_attachments enable row level security;
alter table public.agent_events enable row level security;
alter table public.suppliers enable row level security;
alter table public.negotiation_messages enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "research_runs_own_select" on public.research_runs;
create policy "research_runs_own_select" on public.research_runs for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "research_runs_own_insert" on public.research_runs;
create policy "research_runs_own_insert" on public.research_runs for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "research_runs_own_update" on public.research_runs;
create policy "research_runs_own_update" on public.research_runs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "research_runs_own_delete" on public.research_runs;
create policy "research_runs_own_delete" on public.research_runs for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "research_attachments_own_select" on public.research_attachments;
create policy "research_attachments_own_select" on public.research_attachments for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "research_attachments_own_insert" on public.research_attachments;
create policy "research_attachments_own_insert" on public.research_attachments for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "research_attachments_own_update" on public.research_attachments;
create policy "research_attachments_own_update" on public.research_attachments for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "research_attachments_own_delete" on public.research_attachments;
create policy "research_attachments_own_delete" on public.research_attachments for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "agent_events_own_select" on public.agent_events;
create policy "agent_events_own_select" on public.agent_events for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "agent_events_own_insert" on public.agent_events;
create policy "agent_events_own_insert" on public.agent_events for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "agent_events_own_update" on public.agent_events;
create policy "agent_events_own_update" on public.agent_events for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "agent_events_own_delete" on public.agent_events;
create policy "agent_events_own_delete" on public.agent_events for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "suppliers_own_select" on public.suppliers;
create policy "suppliers_own_select" on public.suppliers for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "suppliers_own_insert" on public.suppliers;
create policy "suppliers_own_insert" on public.suppliers for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "suppliers_own_update" on public.suppliers;
create policy "suppliers_own_update" on public.suppliers for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "suppliers_own_delete" on public.suppliers;
create policy "suppliers_own_delete" on public.suppliers for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "negotiation_messages_own_select" on public.negotiation_messages;
create policy "negotiation_messages_own_select" on public.negotiation_messages for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "negotiation_messages_own_insert" on public.negotiation_messages;
create policy "negotiation_messages_own_insert" on public.negotiation_messages for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "negotiation_messages_own_update" on public.negotiation_messages;
create policy "negotiation_messages_own_update" on public.negotiation_messages for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "negotiation_messages_own_delete" on public.negotiation_messages;
create policy "negotiation_messages_own_delete" on public.negotiation_messages for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "research_attachments_storage_own_select" on storage.objects;
create policy "research_attachments_storage_own_select" on storage.objects for select to authenticated using (bucket_id = 'research-attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "research_attachments_storage_own_insert" on storage.objects;
create policy "research_attachments_storage_own_insert" on storage.objects for insert to authenticated with check (bucket_id = 'research-attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "research_attachments_storage_own_update" on storage.objects;
create policy "research_attachments_storage_own_update" on storage.objects for update to authenticated using (bucket_id = 'research-attachments' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = 'research-attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "research_attachments_storage_own_delete" on storage.objects;
create policy "research_attachments_storage_own_delete" on storage.objects for delete to authenticated using (bucket_id = 'research-attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.research_runs to authenticated;
grant select, insert, update, delete on public.research_attachments to authenticated;
grant select, insert, update, delete on public.agent_events to authenticated;
grant select, insert, update, delete on public.suppliers to authenticated;
grant select, insert, update, delete on public.negotiation_messages to authenticated;

commit;
