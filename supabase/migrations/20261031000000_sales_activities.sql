-- UpScale IA: actividades y seguimiento comercial
create table if not exists public.sales_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid references public.sales_prospects(id) on delete set null,
  opportunity_id uuid references public.sales_opportunities(id) on delete set null,
  activity_type text not null default 'task'
    check (activity_type in ('task', 'call', 'meeting', 'email', 'follow_up')),
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text,
  due_at timestamptz,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_activities_link_check check (
    prospect_id is not null or opportunity_id is not null
  )
);

create index if not exists sales_activities_user_due_idx
  on public.sales_activities (user_id, due_at);
create index if not exists sales_activities_user_status_idx
  on public.sales_activities (user_id, status);
create index if not exists sales_activities_prospect_idx
  on public.sales_activities (prospect_id);
create index if not exists sales_activities_opportunity_idx
  on public.sales_activities (opportunity_id);

create or replace function public.set_sales_activities_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at = now();
  elsif new.status <> 'completed' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists set_sales_activities_updated_at on public.sales_activities;
create trigger set_sales_activities_updated_at
before update on public.sales_activities
for each row execute function public.set_sales_activities_updated_at();

alter table public.sales_activities enable row level security;

drop policy if exists "Users can view their sales activities" on public.sales_activities;
create policy "Users can view their sales activities"
on public.sales_activities for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create their sales activities" on public.sales_activities;
create policy "Users can create their sales activities"
on public.sales_activities for insert to authenticated
with check (
  auth.uid() = user_id
  and (
    prospect_id is null
    or exists (
      select 1 from public.sales_prospects p
      where p.id = prospect_id and p.user_id = auth.uid()
    )
  )
  and (
    opportunity_id is null
    or exists (
      select 1 from public.sales_opportunities o
      where o.id = opportunity_id and o.user_id = auth.uid()
    )
  )
);

drop policy if exists "Users can update their sales activities" on public.sales_activities;
create policy "Users can update their sales activities"
on public.sales_activities for update to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    prospect_id is null
    or exists (
      select 1 from public.sales_prospects p
      where p.id = prospect_id and p.user_id = auth.uid()
    )
  )
  and (
    opportunity_id is null
    or exists (
      select 1 from public.sales_opportunities o
      where o.id = opportunity_id and o.user_id = auth.uid()
    )
  )
);

drop policy if exists "Users can delete their sales activities" on public.sales_activities;
create policy "Users can delete their sales activities"
on public.sales_activities for delete to authenticated
using (auth.uid() = user_id);

grant select, insert, update, delete on public.sales_activities to authenticated;
