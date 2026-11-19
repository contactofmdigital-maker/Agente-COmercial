-- Allow existing authenticated accounts to choose their business sector once.
-- New registrations continue using the existing auth.users trigger.

create or replace function public.set_sales_business_sector(selected_sector text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid;
  inserted_count integer;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Debes iniciar sesión para configurar el rubro.';
  end if;

  if selected_sector is null or selected_sector not in (
    'digital_services',
    'furniture',
    'real_estate',
    'fast_food',
    'barber_beauty',
    'professional_services'
  ) then
    raise exception 'Selecciona uno de los seis rubros disponibles.';
  end if;

  if exists (
    select 1
    from public.sales_business_profiles
    where user_id = current_user_id
  ) then
    raise exception 'Esta cuenta ya tiene un rubro configurado.';
  end if;

  insert into public.sales_business_profiles (user_id, business_sector)
  values (current_user_id, selected_sector);

  insert into public.sales_business_knowledge
    (user_id, business_sector, question_order, question, answer)
  select current_user_id, t.business_sector, t.question_order, t.question, t.answer
  from public.sales_business_knowledge_templates t
  where t.business_sector = selected_sector
  order by t.question_order;

  get diagnostics inserted_count = row_count;

  if inserted_count <> 15 then
    raise exception 'La plantilla del rubro no contiene exactamente 15 preguntas.';
  end if;
end;
$$;

revoke all on function public.set_sales_business_sector(text) from public;
grant execute on function public.set_sales_business_sector(text) to authenticated;
