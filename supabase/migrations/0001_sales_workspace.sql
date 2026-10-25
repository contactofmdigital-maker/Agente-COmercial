-- UpScale IA Agent Commercial VIP Premium - Fase 1
-- IMPORTANT: Review assumptions and existing schema before applying.
-- Assumes public.organizations(id uuid) and public.organization_members
-- (organization_id uuid, user_id uuid, role text) exist.
-- Does not modify existing tables; creates new sales_* tables only.

create table if not exists public.sales_prospects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  full_name text not null,
  company_name text,
  email text,
  website text,
  country text,
  notes text,
  status text not null default 'new'
    check (status in ('new','contacted','qualified','proposal','won','lost')),
  source text not null default 'manual'
    check (source in ('manual','csv','other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_prospects_org_created_idx
  on public.sales_prospects (organization_id, created_at desc);
create index if not exists sales_prospects_org_email_idx
  on public.sales_prospects (organization_id, lower(email))
  where email is not null;

create table if not exists public.sales_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  prospect_id uuid not null references public.sales_prospects(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  activity_type text not null check (activity_type in ('note','call','email_draft','meeting','task','status_change')),
  title text not null,
  body text,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists sales_activities_org_due_idx
  on public.sales_activities (organization_id, due_at)
  where completed_at is null;

alter table public.sales_prospects enable row level security;
alter table public.sales_activities enable row level security;

-- Membership checks must match the actual existing membership schema.
drop policy if exists "sales_prospects_select_member" on public.sales_prospects;
create policy "sales_prospects_select_member" on public.sales_prospects
for select to authenticated
using (exists (
  select 1 from public.organization_members m
  where m.organization_id = sales_prospects.organization_id
    and m.user_id = (select auth.uid())
));

drop policy if exists "sales_prospects_insert_member" on public.sales_prospects;
create policy "sales_prospects_insert_member" on public.sales_prospects
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.organization_members m
    where m.organization_id = sales_prospects.organization_id
      and m.user_id = (select auth.uid())
  )
);

drop policy if exists "sales_prospects_update_member" on public.sales_prospects;
create policy "sales_prospects_update_member" on public.sales_prospects
for update to authenticated
using (exists (
  select 1 from public.organization_members m
  where m.organization_id = sales_prospects.organization_id
    and m.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.organization_members m
  where m.organization_id = sales_prospects.organization_id
    and m.user_id = (select auth.uid())
));

drop policy if exists "sales_prospects_delete_member" on public.sales_prospects;
create policy "sales_prospects_delete_member" on public.sales_prospects
for delete to authenticated
using (exists (
  select 1 from public.organization_members m
  where m.organization_id = sales_prospects.organization_id
    and m.user_id = (select auth.uid())
));

drop policy if exists "sales_activities_select_member" on public.sales_activities;
create policy "sales_activities_select_member" on public.sales_activities
for select to authenticated
using (exists (
  select 1 from public.organization_members m
  where m.organization_id = sales_activities.organization_id
    and m.user_id = (select auth.uid())
));

drop policy if exists "sales_activities_insert_member" on public.sales_activities;
create policy "sales_activities_insert_member" on public.sales_activities
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.organization_members m
    where m.organization_id = sales_activities.organization_id
      and m.user_id = (select auth.uid())
  )
);

-- No service-role key is used in browser code.
-- Before enabling production use, add explicit update/delete policies for activities if required.
