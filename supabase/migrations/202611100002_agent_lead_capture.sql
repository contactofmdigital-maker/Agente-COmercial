-- UpScale IA · Fase 04: captura automática de oportunidades
-- Extiende el CRM existente sin crear una tabla paralela.

alter table public.sales_prospects
  add column if not exists conversation_id uuid,
  add column if not exists phone text,
  add column if not exists service_interest text,
  add column if not exists project_objective text,
  add column if not exists budget text,
  add column if not exists timeline text,
  add column if not exists source text not null default 'manual',
  add column if not exists updated_at timestamptz not null default now();

-- Una conversación puede actualizar su prospecto, pero no crear duplicados.
-- Los registros manuales conservan conversation_id NULL y no se ven afectados.
create unique index if not exists sales_prospects_user_conversation_uidx
  on public.sales_prospects(user_id, conversation_id)
  where conversation_id is not null;

create index if not exists sales_prospects_user_created_idx
  on public.sales_prospects(user_id, created_at desc);

create or replace function public.set_sales_prospects_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_sales_prospects_updated_at on public.sales_prospects;
create trigger set_sales_prospects_updated_at
before update on public.sales_prospects
for each row execute function public.set_sales_prospects_updated_at();

-- Se mantienen las políticas RLS existentes: auth.uid() = user_id.
