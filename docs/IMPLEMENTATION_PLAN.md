# Plan de implementación — UpScale IA

## Principios del producto

- El cliente configura el negocio y el comportamiento comercial desde una experiencia simple.
- UpScale se encarga de la implementación técnica, integraciones, pruebas y puesta en marcha.
- El motor no inventa datos, no afirma acciones externas no ejecutadas y no mezcla datos entre usuarios.
- El simulador determinista funciona sin proveedor de IA ni consumo de tokens.
- CRM existente como fuente única de prospectos; no crear un CRM paralelo.

## Estado y etapas

### Fase 1 — Base de plataforma
- Next.js App Router, autenticación Supabase y workspace.
- CRM de prospectos, oportunidades y actividades.
- Perfil comercial por usuario.
- RLS y aislamiento por usuario sujetos a validación con cuentas separadas.

### Fase 2 — Centro de conocimiento
- Contenidos de negocio, productos/servicios, FAQ y políticas.
- Estados borrador, publicado y desactivado.
- El agente solo debe usar fuentes publicadas y seleccionadas.

### Fase 3 — Configuración y motor determinista
- Configuración de identidad, tono, límites y derivación.
- Simulación sin llamadas de IA.
- Clasificación de intención y respuestas fundamentadas.
- Pendiente: simplificar el configurador y evitar duplicación con Perfil de negocio.

### Fase 4 — Captura progresiva de oportunidades
- Detección de interés comercial.
- Extracción de datos desde varios mensajes.
- Preguntar solo por datos faltantes.
- Guardar/actualizar un único prospecto por conversación.
- Conservar datos existentes y respetar el aislamiento por usuario.
- Estado: implementación en estabilización; no cerrar hasta completar matriz de pruebas, build, lint, typecheck y comprobación CRM.

### Fase 5 — Calidad conversacional y observabilidad
- Pruebas unitarias del clasificador y extracción.
- Pruebas de conversaciones completas y regresión.
- Registro estructurado de decisiones, fuentes, campos detectados y errores.
- Herramientas para revisar por qué se tomó una decisión, sin exponer información sensible.

### Fase 6 — IA asistida
- Solo después de aprobar Fase 4 y 5.
- Proveedor y modelo configurables desde servidor.
- Límites de uso, control de costos, timeout, manejo de errores y política de retención.
- La IA redacta/razona; permisos, persistencia y acciones se mantienen bajo reglas verificables.
- Activación explícita y pruebas con presupuesto controlado.

### Fase 7 — Canales e integraciones
- Adaptadores desacoplados por canal.
- WhatsApp Business con autorización, webhooks, verificación, idempotencia y estado de entrega.
- No mostrar un canal como conectado hasta validar envío y recepción reales.
- Reintentos seguros y trazabilidad de eventos.

### Fase 8 — Producción y operación multi-cliente
- Modelo de organización/tenant definido antes de vender acceso multiusuario.
- Roles, permisos y administración de clientes.
- Auditoría de seguridad, backup/restore, monitoreo, alertas y política de privacidad.
- Despliegue controlado, migraciones reversibles y plan de rollback.

## Criterios de salida de cada fase

Una fase no se considera terminada solo porque el código exista. Requiere:
1. Revisión del cambio.
2. Build y typecheck exitosos.
3. Lint sin errores relevantes.
4. Pruebas funcionales de los casos esperados y de regresión.
5. Validación de persistencia y permisos cuando corresponda.
6. Documentación actualizada y respaldo del hito.
