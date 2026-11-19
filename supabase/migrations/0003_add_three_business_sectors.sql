-- UpScale IA: extend the business knowledge catalog from three to six sectors.
-- Safe to apply after 0002_business_knowledge_by_sector.sql.

alter table public.sales_business_profiles
  drop constraint if exists sales_business_profiles_business_sector_check;
alter table public.sales_business_profiles
  add constraint sales_business_profiles_business_sector_check
  check (business_sector in ('digital_services', 'furniture', 'real_estate', 'fast_food', 'barber_beauty', 'professional_services'));

alter table public.sales_business_knowledge_templates
  drop constraint if exists sales_business_knowledge_templates_business_sector_check;
alter table public.sales_business_knowledge_templates
  add constraint sales_business_knowledge_templates_business_sector_check
  check (business_sector in ('digital_services', 'furniture', 'real_estate', 'fast_food', 'barber_beauty', 'professional_services'));

alter table public.sales_business_knowledge
  drop constraint if exists sales_business_knowledge_business_sector_check;
alter table public.sales_business_knowledge
  add constraint sales_business_knowledge_business_sector_check
  check (business_sector in ('digital_services', 'furniture', 'real_estate', 'fast_food', 'barber_beauty', 'professional_services'));

insert into public.sales_business_knowledge_templates
  (business_sector, question_order, question, answer)
values
  ('fast_food', 1, '¿Qué productos y platos ofrecen?', 'El agente debe describir únicamente los productos del menú vigente, incluyendo opciones, tamaños y acompañamientos confirmados.'),
  ('fast_food', 2, '¿Dónde puedo revisar el menú?', 'Se comparte el menú o carta oficial vigente. Si existe una versión digital, se facilita el enlace configurado por el negocio.'),
  ('fast_food', 3, '¿Cuáles son los precios?', 'Los precios se consultan en el menú vigente y se indican con sus tamaños o variantes. Nunca se inventan valores ni promociones.'),
  ('fast_food', 4, '¿Tienen promociones o combos?', 'Solo se informan promociones activas y autorizadas, detallando productos incluidos, vigencia y condiciones.'),
  ('fast_food', 5, '¿Tienen opciones vegetarianas, veganas o especiales?', 'Se revisan los ingredientes y la información confirmada por cocina. No se garantiza que un plato sea apto para alergias o restricciones sin validación.'),
  ('fast_food', 6, '¿Qué alérgenos contienen los productos?', 'El agente no debe adivinar ingredientes ni asegurar ausencia de trazas. Debe consultar la ficha de ingredientes o derivar la pregunta al equipo.'),
  ('fast_food', 7, '¿Puedo personalizar mi pedido?', 'Las modificaciones dependen del producto y la operación del local. Se confirma qué ingredientes, agregados o sustituciones están permitidos.'),
  ('fast_food', 8, '¿Realizan delivery a mi domicilio?', 'La cobertura se verifica según dirección o comuna y canal de despacho. No se confirma disponibilidad fuera de la zona atendida.'),
  ('fast_food', 9, '¿Cuánto cuesta el despacho?', 'El costo se consulta según ubicación, plataforma y condiciones vigentes. Si no está disponible, se confirma antes de cerrar el pedido.'),
  ('fast_food', 10, '¿Cuánto demora mi pedido?', 'El tiempo depende de demanda, preparación y distancia. Se informa solo el tiempo estimado confirmado por el sistema o el local.'),
  ('fast_food', 11, '¿Puedo retirar mi pedido en el local?', 'Se confirma si el local ofrece retiro, la sucursal disponible y el horario para entregar el pedido.'),
  ('fast_food', 12, '¿Qué medios de pago aceptan?', 'Se informan únicamente los medios de pago habilitados por el comercio o la plataforma de pedidos.'),
  ('fast_food', 13, '¿Cuál es el horario de atención?', 'Se comparte el horario vigente de la sucursal correspondiente y se advierten cambios o cierres especiales confirmados.'),
  ('fast_food', 14, '¿Cómo puedo reservar una mesa o hacer un pedido grupal?', 'Se recopilan fecha, hora, cantidad de personas o productos, sucursal y contacto. La reserva o pedido queda sujeto a confirmación del local.'),
  ('fast_food', 15, '¿Cómo puedo reclamar o consultar por un pedido?', 'Se solicita número de pedido, canal de compra, fecha y detalle del inconveniente, y se deriva al responsable para revisión.'),
  ('barber_beauty', 1, '¿Qué servicios realizan?', 'El agente debe informar los servicios incluidos en el catálogo del local, como cortes, barbería, coloración, peinados o tratamientos, según disponibilidad real.'),
  ('barber_beauty', 2, '¿Cuánto cuesta cada servicio?', 'Los valores se consultan en la lista de precios vigente y pueden depender del largo, técnica, profesional o complejidad. No se inventan precios.'),
  ('barber_beauty', 3, '¿Cuánto dura cada servicio?', 'La duración se informa según la agenda y el servicio solicitado. Si no existe un tiempo definido, se confirma con el profesional.'),
  ('barber_beauty', 4, '¿Necesito reservar una hora?', 'Se explica si el local atiende con reserva, por orden de llegada o con ambas modalidades, según su política actual.'),
  ('barber_beauty', 5, '¿Qué horarios y días tienen disponibles?', 'La disponibilidad se consulta en la agenda vigente. El horario general del local no garantiza que exista una hora libre.'),
  ('barber_beauty', 6, '¿Puedo elegir a un barbero o estilista?', 'Se confirma qué profesionales están disponibles y si el cliente puede seleccionar a una persona al reservar.'),
  ('barber_beauty', 7, '¿Qué incluye el servicio?', 'Se detallan solo las etapas y productos incluidos en la ficha del servicio. Extras o adicionales se informan por separado.'),
  ('barber_beauty', 8, '¿Realizan coloración, tintes o decoloración?', 'Se confirma según los servicios ofrecidos y se recopila historial químico, largo y objetivo para que el profesional evalúe el procedimiento.'),
  ('barber_beauty', 9, '¿Debo enviar una foto de referencia?', 'Se puede solicitar una imagen de referencia para comprender el resultado esperado, aclarando que el profesional debe evaluar su viabilidad.'),
  ('barber_beauty', 10, '¿Ofrecen diagnóstico o asesoría antes del servicio?', 'Se confirma si existe evaluación previa y si tiene costo. Las recomendaciones técnicas finales corresponden al profesional.'),
  ('barber_beauty', 11, '¿Qué cuidados debo tener después del servicio?', 'Se entregan indicaciones generales aprobadas por el profesional y específicas del tratamiento realizado, sin sustituir evaluación especializada.'),
  ('barber_beauty', 12, '¿Qué pasa si necesito cancelar o cambiar mi hora?', 'Se informa la política vigente de cancelaciones, reprogramaciones, anticipos y tiempos mínimos de aviso.'),
  ('barber_beauty', 13, '¿Atienden a niños o grupos?', 'Se confirma qué edades atienden, servicios disponibles y condiciones para reservas grupales.'),
  ('barber_beauty', 14, '¿Qué medios de pago aceptan?', 'Se indican exclusivamente los medios de pago habilitados por el establecimiento.'),
  ('barber_beauty', 15, '¿Cómo puedo agendar mi atención?', 'Se recopilan nombre, servicio, profesional preferido si aplica, fecha y rango horario; la hora queda confirmada solo cuando la agenda la acepta.'),
  ('professional_services', 1, '¿Qué servicios profesionales ofrecen?', 'El agente debe describir las áreas y prestaciones efectivamente ofrecidas, según el catálogo y las credenciales informadas por el profesional.'),
  ('professional_services', 2, '¿A qué tipo de clientes atienden?', 'Se explican los perfiles de clientes, sectores o casos que el profesional ha definido como adecuados para su servicio.'),
  ('professional_services', 3, '¿Cómo funciona la primera consulta?', 'Se informa si existe reunión inicial, evaluación, diagnóstico, duración y costo, únicamente según las condiciones configuradas.'),
  ('professional_services', 4, '¿Cuánto cuestan sus servicios?', 'Los honorarios dependen del alcance, complejidad y modalidad. Se comparte una tarifa vigente o se recopilan antecedentes para cotizar.'),
  ('professional_services', 5, '¿Cómo solicito una cotización?', 'Se recopilan necesidad, objetivo, contexto, alcance esperado, plazo y datos de contacto para que el profesional prepare una propuesta.'),
  ('professional_services', 6, '¿Qué incluye el servicio contratado?', 'Se detallan entregables, sesiones, revisiones, documentación y límites del servicio según la propuesta aceptada.'),
  ('professional_services', 7, '¿Qué información o documentos debo preparar?', 'Los antecedentes requeridos dependen de la especialidad y se solicitan solo cuando sean necesarios para evaluar el caso.'),
  ('professional_services', 8, '¿Atienden de forma presencial o en línea?', 'Se indican las modalidades disponibles, ubicación o plataforma de reunión, según la agenda y cobertura del profesional.'),
  ('professional_services', 9, '¿En qué zonas o países trabajan?', 'Se comunica el alcance geográfico confirmado y cualquier restricción regulatoria o de prestación aplicable.'),
  ('professional_services', 10, '¿Cuánto demora el proceso?', 'Los plazos dependen del alcance, disponibilidad y entrega de antecedentes. Se informa un plazo solo después de validarlo con el responsable.'),
  ('professional_services', 11, '¿Quién será el profesional a cargo?', 'Se identifica al profesional responsable y su función cuando esa asignación esté confirmada.'),
  ('professional_services', 12, '¿Cómo protegen la confidencialidad de mi información?', 'Se explica la política de privacidad y manejo de antecedentes vigente. No se prometen certificaciones o garantías que no estén acreditadas.'),
  ('professional_services', 13, '¿Puedo contratar un servicio puntual o un plan continuo?', 'Se describen las modalidades realmente disponibles, como asesoría puntual, proyecto o acompañamiento recurrente.'),
  ('professional_services', 14, '¿Cómo se realizan los pagos y la facturación?', 'Se informan medios, hitos de pago, anticipos y documentos tributarios según las condiciones administrativas del negocio.'),
  ('professional_services', 15, '¿Cómo puedo agendar o comenzar a trabajar?', 'Se recopilan datos de contacto, servicio requerido y disponibilidad. El inicio queda sujeto a evaluación, aceptación de propuesta y confirmación.')
on conflict (business_sector, question_order) do update
set question = excluded.question, answer = excluded.answer;

create or replace function public.provision_sales_business_knowledge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_sector text;
begin
  selected_sector := new.raw_user_meta_data ->> 'business_sector';

  if selected_sector is null or selected_sector not in (
    'digital_services', 'furniture', 'real_estate',
    'fast_food', 'barber_beauty', 'professional_services'
  ) then
    raise exception 'Debes seleccionar un rubro válido para crear tu cuenta.';
  end if;

  insert into public.sales_business_profiles (user_id, business_sector)
  values (new.id, selected_sector)
  on conflict (user_id) do nothing;

  insert into public.sales_business_knowledge
    (user_id, business_sector, question_order, question, answer)
  select new.id, t.business_sector, t.question_order, t.question, t.answer
  from public.sales_business_knowledge_templates t
  where t.business_sector = selected_sector
  on conflict (user_id, question_order) do nothing;

  return new;
end;
$$;

-- Existing accounts are not silently reassigned. Their selected sector remains fixed.
