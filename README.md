# UpScale IA — Agente Comercial VIP

Plataforma Next.js + Supabase para configurar un agente comercial, administrar conocimiento aprobado, simular conversaciones y gestionar prospectos en un CRM.

## Estado actual

- **Fase 1–3:** base de CRM, perfil comercial, centro de conocimiento, configurador y motor determinista de simulación.
- **Fase 4:** captura progresiva de oportunidades y actualización del CRM por conversación. En estabilización y validación; no declarar lista hasta completar pruebas locales y de Supabase.
- **IA y canales externos:** existen rutas y preparaciones separadas. El playground determinista no debe invocar proveedores de IA ni enviar mensajes. WhatsApp no está conectado por el simple hecho de guardar su configuración.

## Stack

- Next.js App Router, React y TypeScript.
- Supabase Auth, Postgres y RLS.
- Zod para validación de solicitudes.
- Motor determinista para simulación sin consumo de tokens.

## Requisitos

- Node.js compatible con Next.js 16.
- npm.
- Proyecto Supabase configurado.

## Desarrollo local

1. Clona el repositorio y entra a su carpeta.
2. Ejecuta `npm install`.
3. Crea `.env.local` usando como referencia `.env.example`.
4. Configura las variables públicas de Supabase.
5. Verifica que las migraciones aplicadas correspondan al esquema real de tu proyecto.
6. Ejecuta `npm run dev`.

## Variables de entorno

Consulta `.env.example`. No subas `.env.local`, claves privadas, service-role keys ni tokens al repositorio.

## Comandos

- `npm run dev`: desarrollo local.
- `npm run build`: compilación de producción.
- `npm run lint`: análisis ESLint.
- `npm run typecheck`: validación TypeScript.
- `npm run test:prioritization`: pruebas del motor de priorización CRM.

## Seguridad y datos

- Las rutas autenticadas obtienen el usuario desde Supabase Auth.
- Las consultas del usuario deben quedar limitadas por `user_id` y protegidas también por RLS.
- Nunca aceptar `user_id` desde el cliente como fuente de autorización.
- Las acciones externas deben requerir una integración autorizada y una confirmación funcional.
- No registrar secretos ni contenido sensible en logs.
- Los datos demo deben mantenerse separados de los prospectos reales.

## Base de datos

Las migraciones en `supabase/migrations` representan cambios incrementales. No ejecutes de nuevo la migración inicial `0001_sales_workspace.sql` sobre una base existente sin verificar previamente tablas, columnas, políticas y relaciones. Las migraciones más recientes utilizan un esquema por usuario (`user_id)); la documentación de cada migración debe prevalecer sobre supuestos antiguos del starter.

## Respaldos

- Rama de respaldo pre-auditoría: `backup/pre-audit-2026-11-10`.
- Rama de estabilización: `feat/platform-stabilization`.
- Para crear un ZIP de los archivos versionados en el commit actual, ejecuta `./scripts/backup-project.ps1` desde PowerShell.
- El ZIP del repositorio no incluye la base de datos Supabase, archivos locales no versionados ni secretos. Respaldar Supabase por separado antes de cambios de esquema o producción.

## Documentación

- [Auditoría, arquitectura objetivo y recuperación](docs/PLATFORM_AUDIT_AND_RECOVERY.md)
- [Plan de implementación](docs/IMPLEMENTATION_PLAN.md)

## Estado de validación

Los cambios de la rama de estabilización requieren ejecución local de build, lint, typecheck y pruebas conversacionales. No considerar la rama lista para producción hasta registrar esos resultados y validar RLS con usuarios separados.
