# UpScale IA — Auditoría de plataforma y plan de estabilización

## Punto de control

- Rama de trabajo auditada: `feat/commercial-conversation-engine`
- Commit base: `a8a368c267ec6919409896a4220cb2c116bf6a9e`
- Respaldo Git creado: `backup/pre-audit-2026-11-10`
- Rama de estabilización: `feat/platform-stabilization`
- Fecha: 2026-11-10

Este documento distingue entre código revisado, cambios realizados y verificaciones pendientes. La creación de ramas protege el código versionado, pero no respalda automáticamente los datos de Supabase ni los secretos locales.

## Hallazgos confirmados

### Fase 4 — motor y captura

1. La extracción de presupuesto no contemplaba correctamente frases como «mi presupuesto es de 150 USD».
2. La extracción de empresa no contemplaba «mi empresa se llama ...».
3. La selección de conocimiento tenía un comportamiento peligroso: cuando no había IDs seleccionados, el endpoint consultaba todos los contenidos publicados. La selección vacía debe significar que no hay fuentes autorizadas.
4. El motor determinista, el simulador y el endpoint de IA son rutas distintas. Las pruebas del simulador deben permanecer sin llamadas a proveedores de IA.
5. El flujo de calificación debe priorizar una oportunidad comercial antes de responder con contenido general, salvo solicitud explícita de una persona o reclamación.

### Configurador

El componente actual expone demasiadas decisiones internas en un único formulario: personalidad, estrategia, preguntas, fuentes, restricciones, derivación y preparación de canales. Se recomienda convertirlo en una configuración básica guiada y dejar las opciones técnicas en un apartado avanzado. No se deben eliminar columnas existentes sin migración y plan de compatibilidad.

### Documentación y esquema

La documentación inicial describe un modelo de organizaciones y membresías, mientras que las migraciones posteriores y el código actual consultan registros por `user_id`. Debe existir una única descripción del esquema realmente desplegado. No ejecutar la migración inicial de nuevo en una base existente sin revisar colisiones.

## Cambios aplicados en esta rama

- `src/features/agent/lib/orchestration.ts`: ampliación de extracción de presupuesto y nombre de empresa.
- `src/app/api/agent/orchestrate/route.ts`: una lista vacía de conocimiento seleccionado ahora produce cero fuentes, en lugar de habilitar todos los contenidos publicados.

## Arquitectura objetivo

1. Configuración básica: datos del negocio, servicios, tono, horarios y contacto.
2. Centro de conocimiento: información aprobada, con borrador/publicado/desactivado.
3. Motor de conversación: clasificación, respuestas fundamentadas, calificación progresiva y derivación.
4. Captura de oportunidades: un registro CRM por conversación, actualización idempotente y conservación de campos.
5. Canales: adaptadores separados para WhatsApp y futuros canales; ningún canal se considera conectado hasta completar autorización y prueba real.
6. Observabilidad: historial de decisiones, errores y estado de persistencia, sin exponer secretos ni datos privados innecesarios.

## Plan de validación antes de cerrar Fase 4

- Cotización detectada desde el primer mensaje.
- Nombre, empresa, correo/teléfono, servicio, objetivo, presupuesto y plazo extraídos desde mensajes separados y combinados.
- Variaciones de presupuesto: «presupuesto es de 150 USD», «tengo 150 dólares», «$150 USD».
- Preguntas solo por datos faltantes.
- Solicitud explícita de persona deriva; una simple cotización no deriva.
- Fuentes vacías no responden con contenido no seleccionado.
- Fuentes seleccionadas responden solo con contenido publicado y permitido.
- Una conversación crea como máximo un prospecto y las respuestas posteriores actualizan ese registro.
- Datos de otro usuario nunca se leen ni se modifican.
- Playground no invoca IA, WhatsApp ni acciones externas.
- Build, lint y typecheck ejecutados en el entorno del proyecto y resultados registrados.

## Respaldo y recuperación

### Código

- Mantener la rama `backup/pre-audit-2026-11-10` intacta.
- Antes de cada hito, crear una nueva rama de respaldo o tag anotado.
- Crear ZIP local desde Git con el script `scripts/backup-project.ps1`.
- No incluir `.env.local`, claves API, tokens, `node_modules` ni `.next`.

### Supabase

El respaldo de Git no incluye filas de la base de datos, usuarios, secretos ni configuración del proyecto Supabase. Antes de cambios de esquema o producción:
- generar un respaldo de base de datos desde Supabase (o dump mediante CLI autorizado);
- conservar las migraciones SQL versionadas;
- probar restauración en un proyecto separado cuando sea posible;
- no guardar service-role keys ni credenciales dentro del repositorio.

## Límites de esta auditoría

Los archivos fueron revisados mediante GitHub. No se ejecutó el proyecto local, no se ejecutó `npm run build`, `npm run lint` ni `npm run typecheck`, y no se inspeccionaron datos reales de Supabase. Por tanto, los cambios de esta rama aún requieren validación local antes de considerarse terminados.


## Estabilización adicional — configuración y control de IA

- El configurador se reorganizó en tres pasos principales: identidad, objetivo e información autorizada. Personalidad, reglas, derivación y preparación de WhatsApp quedan en secciones opcionales avanzadas.
- El perfil de negocio es la fuente principal para público objetivo, oferta y metas comerciales. El campo histórico `target_customer` se conserva por compatibilidad, pero se identifica como referencia heredada; no se debe eliminar de la base sin migración.
- El endpoint de IA CRM requiere ahora `OPENAI_ASSISTANT_ENABLED=true` además de una clave válida. La plantilla mantiene el indicador en `false`; el simulador determinista no necesita ni utiliza ese endpoint.
- Se añadió una prueba específica del motor comercial para el flujo de tres mensajes, selección vacía de conocimiento y derivación humana explícita.

## Bloqueo de esquema y seguridad que requiere validación Supabase

La migración histórica `supabase/migrations/0001_sales_workspace.sql` define prospectos/actividades por `organization_id` y membresías. En cambio, las migraciones posteriores y el código de la aplicación consultan `user_id`. No se debe ejecutar esa migración histórica ni alterar políticas en una base existente hasta comparar el esquema desplegado y las políticas RLS reales. La compatibilidad no puede confirmarse desde GitHub.

Antes de habilitar multi-cliente o producción se debe:
1. Obtener el esquema real de Supabase (tablas, columnas, índices, triggers y políticas RLS).
2. Confirmar que `sales_prospects(user_id, conversation_id)` existe y es único para la operación `upsert`.
3. Confirmar que todas las tablas CRM filtran por usuario/tenant de forma coherente.
4. Probar con dos cuentas distintas que ninguna puede leer, actualizar ni borrar datos de la otra.
5. Preparar respaldo y restauración de base de datos antes de cualquier migración correctiva.

No se han ejecutado pruebas locales ni consultas sobre el proyecto Supabase conectado. Los nuevos casos de prueba quedan preparados para ejecutarse en el entorno local.
