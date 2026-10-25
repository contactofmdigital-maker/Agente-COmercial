# Plan de implementación — Fase 1

## Objetivo
Nuevo proyecto independiente para el agente comercial. El proyecto UpScale IA original queda intacto.

## Alcance
- Workspace/dashboard premium.
- CRM de prospectos y vista de lista.
- Alta manual y lectura desde Supabase.
- Importación CSV con vista previa.
- Preparación para el asistente IA, sin fingir conexión.
- Acciones comerciales siempre manuales.

## Bloqueadores que se deben resolver antes de usar datos reales
1. Verificar esquema real de organizaciones y membresías.
2. Añadir un selector de organización autorizado en servidor.
3. Completar autenticación (login, logout, recuperación de sesión).
4. Ajustar inserciones para asignar `organization_id` desde la sesión/organización autorizada, nunca desde un campo libre del cliente.
5. Añadir pruebas RLS y pruebas de importación.
6. Añadir transacción RPC para importación completa y detección de duplicados contra registros existentes.
7. Conectar proveedor de IA en servidor y definir política de retención de conversaciones.

## Criterios de aceptación
- `npm run typecheck` pasa.
- `npm run build` pasa.
- La aplicación no afirma que datos ficticios sean reales.
- Sin configuración de Supabase, el error se explica claramente.
- Solo usuarios autenticados y miembros autorizados acceden a datos de su organización.
- CSV inválido produce informe de filas rechazadas y no se presenta como importación completa.
- Ningún mensaje externo se envía sin acción manual explícita.

## Estado honesto de este starter
Es una base de proyecto entregable, no una aplicación certificada en producción. La integración con el esquema existente, el flujo de autenticación y el contexto de organización deben validarse con el proyecto Supabase real antes de guardar datos.
