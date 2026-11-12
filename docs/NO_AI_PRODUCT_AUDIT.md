# UpScale sin IA — auditoría de producto y arquitectura

Fecha: 2026-11-12  
Rama de trabajo: `feat/no-ai-core`  
Punto de partida: `d77c58fcffed9d5112c9e49fe6776d96e2286ef1`  
Respaldo íntegro del proyecto con IA: `backup/ia-full-2026-11-12`

## 1. Decisión de producto

El producto principal es un **motor de atención automática configurable y determinista**. Su trabajo es responder preguntas frecuentes del negocio con información autorizada, reconocer la intención del usuario, mantener el contexto y ejecutar flujos sencillos.

El CRM es un módulo opcional. El chatbot se configura y administra únicamente desde **Configuración del agente**. El CRM no tendrá un chat propio ni dependerá del agente para que el cliente pueda usarlo.

La versión sin IA no debe llamar a modelos, APIs de IA ni consumir tokens. La integración de WhatsApp API será un adaptador de canal y tampoco necesita IA.

## 2. Qué reutilizar

### Núcleo de atención
- `src/features/agent/lib/orchestration.ts`: normalización, clasificación inicial de intenciones, búsqueda/ranking de conocimiento, captura de datos y rutas de respuesta. Es la base reutilizable, pero necesita refactor y ampliar cobertura; no debe considerarse terminada.
- `src/app/api/agent/orchestrate/route.ts`: autenticación, rate limit, validación Zod, carga de configuración y conocimiento por usuario, y persistencia idempotente del prospecto. Debe convertirse en el endpoint del motor de producción, separando simulación de acciones reales.
- `src/features/agent/components/agent-configurator.tsx`: conservar como único lugar para configurar identidad, saludo, tono, conocimiento, reglas, derivación y comportamiento.
- `src/features/agent/components/agent-playground.tsx`: conservar como simulador/prueba interna del agente; no debe ser un segundo chat operativo del CRM.
- `src/features/knowledge/components/knowledge-hub.tsx` y tabla `agent_knowledge_entries`: conservar como base de respuestas aprobadas por negocio.

### Datos y persistencia
- Supabase Auth, RLS y el patrón de filtrar por usuario autenticado.
- `sales_prospects` como repositorio de contactos/oportunidades si el cliente activa el módulo CRM.
- `record-classification.ts` y `duplicate-detection.ts` para separar datos demo y evitar duplicados.
- Pruebas actuales `test-agent-orchestration.mjs` y `test-prioritization.mjs` como punto de partida para regresión.

### Interfaz
- Diseño general, login, perfil de negocio y centro de conocimiento.
- Panel de prospectos y oportunidades, pero como módulo opcional y sin chat incrustado.

## 3. Qué retirar o desactivar de la experiencia sin IA

No borrar código ni migraciones en esta primera pasada. Ocultar/desacoplar primero y retirar solo después de confirmar dependencias.

- Quitar del menú principal la sección **Asistente comercial** que usa IA (`AssistantChat`) y su etiqueta IA. El endpoint `/api/assistant/chat` debe quedar aislado como parte del respaldo IA; no invocarlo desde el producto sin IA.
- Eliminar cualquier chat dentro del CRM. El único chat de configuración/prueba del agente vive en Configuración del agente.
- No mostrar CRM como requisito para activar atención. Si el plan no incluye CRM, el agente debe responder igual.
- Quitar del configurador los campos que simulan una conexión de WhatsApp (número preferido, checkbox de canal) o convertirlos en estado de integración real y verificable. Guardar un número no equivale a conectar WhatsApp.
- No presentar funciones de IA, “inteligencia” generativa ni capacidades no disponibles en el copy público. Evaluar retirar “IA” del nombre comercial en la versión sin IA.

## 4. Qué agregar al motor principal

1. **Catálogo de intenciones** versionado y testeable: saludo, servicios/productos, precios, horarios, ubicación, medios de pago, despacho, disponibilidad, políticas/garantías, agendamiento, estado de reserva, solicitud humana, reclamo y fallback.
2. **Variantes lingüísticas**: sinónimos, errores comunes, singular/plural, expresiones chilenas/neutras y frases completas. No depender solo de coincidencia de palabras.
3. **Gestor de estado conversacional**: saber qué dato está solicitando el agente, asociar la respuesta al campo correcto y no volver a preguntar datos ya capturados.
4. **Resolución de ambigüedad**: umbrales de confianza, preguntas de aclaración y fallback honesto. No seleccionar una respuesta solo por un token compartido.
5. **Respuestas estructuradas**: respuesta, intención, fuente, confianza y acción sugerida; las acciones sensibles se validan en servidor.
6. **Pruebas de conversaciones completas** por rubro y regresión, no solo pruebas aisladas de regex.
7. **Observabilidad segura**: intención detectada, fuente usada, transición de estado y razón del fallback, evitando registrar datos sensibles innecesarios.

## 5. CRM opcional y clasificación automática

El motor puede clasificar sin IA mediante reglas explícitas y evidencia capturada. No se necesita un modelo para guardar automáticamente un prospecto.

Flujo recomendado:
- Cada conversación recibe un identificador estable.
- Si el usuario expresa interés comercial y entrega un dato de contacto, se crea o actualiza un único registro vinculado a esa conversación.
- Se guardan campos conocidos: nombre, teléfono, correo, servicio, necesidad, empresa, presupuesto, plazo, origen y consentimiento/estado de contacto cuando corresponda.
- El clasificador asigna una etapa basada en reglas transparentes: nuevo, interesado, pendiente de datos, calificado, requiere atención humana, convertido o descartado.
- La puntuación de prioridad debe usar señales observables y mostrar por qué se asignó; nunca inventar presupuesto o intención.
- Si faltan datos, el agente pregunta solo por el siguiente campo útil. El CRM no necesita estar habilitado para responder; la captura se puede desactivar por plan o preferencia.
- Evitar crear un prospecto por cada consulta informativa. Crear registro cuando exista señal comercial suficiente, idealmente con contacto o solicitud explícita de seguimiento.
- Upsert idempotente por `user_id + conversation_id`; conservar datos previos y evitar duplicados por correo/teléfono con reglas revisables.

## 6. Agenda y ejemplo de barbería

La agenda debe ser un módulo funcional separado del CRM y sin IA.

Para una barbería:
- Configura servicios (corte, barba, corte + barba), duración, precio opcional, profesionales, horario laboral, pausas, días libres y anticipación mínima.
- El cliente pregunta por horas o solicita reservar.
- El motor ofrece solo espacios calculados como libres.
- Al reservar, el servidor vuelve a comprobar disponibilidad y bloquea el intervalo en una transacción/constraint que evite doble reserva.
- Se registra la reserva con servicio, profesional, fecha/hora, duración, nombre y contacto mínimo.
- El panel de agenda muestra calendario/lista de horas ocupadas y libres según permisos. El cliente final no debe ver datos personales de otras reservas; solo disponibilidad.
- Permitir cancelar/reprogramar con validación de identidad o enlace seguro.
- Recordatorios pueden ejecutarse por email o WhatsApp en fase posterior; el canal no requiere IA.

**Importante:** mostrar únicamente horas ocupadas en el panel del negocio puede ser una vista simple, pero el sistema necesita guardar también la duración y el recurso/profesional para calcular disponibilidad correctamente.

## 7. Arquitectura objetivo

- Canal (widget web ahora; WhatsApp API después) → adaptador de entrada.
- Motor determinista → clasificador + estado conversacional + recuperador de conocimiento.
- Respuesta → salida del canal.
- Acciones opcionales → agenda / captura de prospecto / derivación.
- Persistencia → configuración, conocimiento, conversaciones, reservas y CRM opcional.
- La lógica del motor no debe depender de componentes visuales ni del CRM.

## 8. Hallazgos y riesgos confirmados al revisar el código

- El clasificador actual usa regex y palabras clave; su cobertura de intenciones es limitada.
- `rankKnowledge` puntúa coincidencia de tokens y títulos. Puede fallar con paráfrasis y consultas con varias intenciones; requiere pruebas de falsos positivos y negativos.
- El estado conversacional se reconstruye principalmente desde los últimos mensajes enviados por el cliente. No hay una máquina de estados persistida y explícita.
- La captura de prospectos en `/api/agent/orchestrate` ocurre solo si hay contacto y señal comercial. Es un buen inicio, pero el endpoint se describe como simulación y devuelve `external_actions_executed: false`; aún no es un canal de producción.
- La ruta `/api/assistant/chat` es una integración de IA separada y está protegida por `OPENAI_ASSISTANT_ENABLED=true`. Debe permanecer fuera del build de producto sin IA, sin borrarla del respaldo.
- La navegación principal aún incluye “Asistente comercial” con etiqueta IA, y renderiza `AssistantChat`; esto no corresponde a la experiencia objetivo.
- El configurador todavía guarda campos de WhatsApp que solo registran preferencia, no conexión real.
- La ruta de orquestación comenta que una selección vacía de conocimiento usa todas las entradas publicadas. Debe definirse explícitamente el comportamiento: recomiendo que el cliente seleccione fuentes o que exista una opción clara “usar todo el conocimiento publicado”; nunca debe ser una consecuencia silenciosa.
- La migración inicial CRM y migraciones posteriores presentan diferencias históricas de modelo `organization_id` vs `user_id`. No modificar ni ejecutar migraciones sobre Supabase productivo sin inspeccionar esquema/RLS real y preparar backup.

## 9. Orden de trabajo recomendado

1. Estabilizar el motor y su máquina de estados conversacional.
2. Convertir el centro de conocimiento en un configurador simple de FAQ, servicios, políticas, horarios y precios.
3. Separar las acciones opcionales: captura CRM, agenda y derivación.
4. Construir el widget web de atención como canal real del motor.
5. Quitar el chat IA del menú de la experiencia sin IA y dejar el CRM opcional.
6. Implementar agenda genérica y luego una plantilla de barbería.
7. Integrar WhatsApp API como canal, sin IA.
8. Validar aislamiento por usuario/tenant, RLS, pruebas, build, lint y typecheck.

## 10. Alcance de esta auditoría

La revisión se realizó sobre el código versionado de GitHub en la rama indicada. No se ejecutó build/tests en un entorno local en esta sesión ni se inspeccionó la base de datos conectada de Supabase. Por ello, los hallazgos de código se distinguen de las validaciones de ejecución pendientes. No se borró código ni se modificó el esquema de Supabase.


## 11. Cambios aplicados en la rama sin IA (2026-11-12)

- El clasificador determinista amplía expresiones para servicios, ubicación, pagos, despachos, reservas y solicitudes de asesor.
- La recuperación de conocimiento agrega alias por intención, pondera el título, evita concatenar respuestas múltiples y devuelve fallback cuando hay empate ambiguo entre categorías.
- La continuidad de calificación distingue una respuesta a la pregunta anterior de una nueva pregunta informativa. Una FAQ durante una calificación puede resolverse desde conocimiento autorizado sin reiniciar el flujo.
- La captura contextual conserva nombre de empresa y descripción separadamente. La descripción también se agrega a las notas del prospecto cuando se guarda.
- La intención de agendamiento se reconoce como `booking`, pero no confirma citas: hasta implementar el módulo de agenda debe pedir confirmación humana o informar que no puede reservar.
- El endpoint ahora aplica política explícita: cero fuentes seleccionadas equivale a cero fuentes cargadas. El cliente puede seleccionar todas o quitar la selección desde el configurador.
- Los valores recomendados del agente priorizan responder primero, no presionar para vender y no calificar consultas meramente informativas.
- Se ampliaron las pruebas para paráfrasis de servicios, coincidencias débiles, intención de agenda y conservación de la descripción empresarial.

**Validación pendiente:** estos cambios están guardados en GitHub, pero todavía requieren ejecución local de `npm run test:agent`, `npm run test:prioritization`, `npm run typecheck`, `npm run lint` y `npm run build`. No se afirma que hayan pasado hasta recibir esos resultados.
