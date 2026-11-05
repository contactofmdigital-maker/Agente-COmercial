-- UpScale IA: perfil comercial por usuario
-- Ejecutar una sola vez en Supabase SQL Editor. Es idempotente.
create table if not exists public.business_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null default '',
  segment text not null default 'agency'
    check (segment in ('agency', 'local', 'company', 'startup')),
  country text not null default 'Chile',
  currency text not null default 'CLP',
  description text not null default '',
  products_services text not null default '',
  ideal_customer text not null default '',
  sales_goal text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_business_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists business_profiles_updated_at on public.business_profiles;
create trigger business_profiles_updated_at
before update on public.business_profiles
for each row execute function public.set_business_profiles_updated_at();

alter table public.business_profiles enable row level security;

drop policy if exists "Users can view their own business profile" on public.business_profiles;
create policy "Users can view their own business profile"
on public.business_profiles for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create their own business profile" on public.business_profiles;
create policy "Users can create their own business profile"
on public.business_profiles for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own business profile" on public.business_profiles;
create policy "Users can update their own business profile"
on public.business_profiles for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update on public.business_profiles to authenticated;
