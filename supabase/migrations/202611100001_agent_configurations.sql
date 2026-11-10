-- UpScale IA · Configuración del agente comercial
-- Persistencia por usuario; no conecta proveedores de IA ni canales externos.

create table if not exists public.agent_configurations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  agent_name text not null default 'Asistente comercial' check (char_length(trim(agent_name)) between 2 and 80),
  enabled boolean not null default false,
  objective text not null default 'Atender consultas y convertir oportunidades comerciales',
  tone text not null default 'professional' check (tone in ('professional','friendly','consultative','premium','direct')),
  personality text not null default '',
  greeting text not null default '',
  language text not null default 'es',
  response_style text not null default 'clear',
  target_customer text not null default '',
  qualification_questions text not null default '',
  restrictions text not null default '',
  knowledge_entry_ids uuid[] not null default '{}',
  human_handoff_enabled boolean not null default true,
  handoff_triggers text not null default 'Cuando solicite hablar con una persona, exista una reclamación o la consulta requiera confirmación humana.',
  handoff_contact text not null default '',
  handoff_message text not null default 'Te pondré en contacto con una persona del equipo para ayudarte mejor.',
  whatsapp_enabled boolean not null default false,
  whatsapp_number text not null default '',
  channel_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_configurations_user_idx on public.agent_configurations(user_id);

create or replace function public.set_agent_configurations_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_agent_configurations_updated_at on public.agent_configurations;
create trigger set_agent_configurations_updated_at
before update on public.agent_configurations
for each row execute function public.set_agent_configurations_updated_at();

alter table public.agent_configurations enable row level security;

drop policy if exists "Users can read their own agent configuration" on public.agent_configurations;
create policy "Users can read their own agent configuration"
  on public.agent_configurations for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can create their own agent configuration" on public.agent_configurations;
create policy "Users can create their own agent configuration"
  on public.agent_configurations for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update their own agent configuration" on public.agent_configurations;
create policy "Users can update their own agent configuration"
  on public.agent_configurations for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on public.agent_configurations to authenticated;
