-- UpScale IA · Centro de conocimiento
-- Ejecutar en Supabase SQL Editor. No requiere proveedor de IA ni consume tokens.

create table if not exists public.agent_knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('product', 'faq', 'policy', 'business', 'instruction')),
  title text not null check (char_length(trim(title)) between 2 and 140),
  content text not null check (char_length(trim(content)) between 2 and 10000),
  status text not null default 'draft' check (status in ('draft', 'published', 'disabled')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_knowledge_entries_user_status_idx
  on public.agent_knowledge_entries (user_id, status, category, sort_order);

create or replace function public.set_agent_knowledge_entries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_agent_knowledge_entries_updated_at
  on public.agent_knowledge_entries;

create trigger set_agent_knowledge_entries_updated_at
before update on public.agent_knowledge_entries
for each row execute function public.set_agent_knowledge_entries_updated_at();

alter table public.agent_knowledge_entries enable row level security;

drop policy if exists "Users can read their own agent knowledge" on public.agent_knowledge_entries;
create policy "Users can read their own agent knowledge"
  on public.agent_knowledge_entries for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can create their own agent knowledge" on public.agent_knowledge_entries;
create policy "Users can create their own agent knowledge"
  on public.agent_knowledge_entries for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update their own agent knowledge" on public.agent_knowledge_entries;
create policy "Users can update their own agent knowledge"
  on public.agent_knowledge_entries for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own agent knowledge" on public.agent_knowledge_entries;
create policy "Users can delete their own agent knowledge"
  on public.agent_knowledge_entries for delete
  to authenticated using (auth.uid() = user_id);

grant select, insert, update, delete on public.agent_knowledge_entries to authenticated;
