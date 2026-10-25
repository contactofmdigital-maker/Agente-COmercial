# UpScale IA — Agente Comercial VIP Premium (Fase 1)

Proyecto **nuevo e independiente**. No modifica el código del UpScale IA principal. Se conecta al proyecto Supabase existente solo cuando tú configures las variables y apliques conscientemente la migración incluida.

## Incluido en este starter

- Next.js App Router + React + TypeScript.
- Tailwind CSS 4, interfaz responsive estilo dashboard premium.
- Supabase SSR client helpers y pantalla de inicio.
- CRM: alta y consulta de prospectos persistidos.
- Importación CSV con previsualización, validación básica y control de duplicados por email dentro del archivo.
- Base SQL inicial aislada con `sales_prospects` y `sales_activities`, con `organization_id`, RLS y políticas de acceso.
- `.env.example`; no incluye credenciales reales.
- Las acciones comerciales son manuales: no se envían emails ni mensajes automáticamente.

## Requisitos

Node.js LTS compatible con la versión de Next.js instalada, npm y acceso al proyecto Supabase. Verifica las versiones instaladas con `node -v` y `npm -v`.

## Arranque local

1. Descomprime el ZIP.
2. Abre una terminal dentro de `upscale-agente-comercial-vip`.
3. Ejecuta `npm install`.
4. Copia `.env.example` a `.env.local`.
5. Completa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` desde el panel de Supabase.
6. Revisa `supabase/migrations/0001_sales_workspace.sql` antes de ejecutarlo. **No lo apliques sin confirmar que los nombres de tablas y políticas no colisionan con el proyecto existente.**
7. Aplica la migración revisada en el SQL Editor de Supabase o con Supabase CLI.
8. Ejecuta `npm run dev` y abre `http://localhost:3000`.

## Importante sobre el esquema existente

Este starter usa tablas nuevas con prefijo `sales_` para reducir colisiones. La política RLS asume que existe `public.organizations(id uuid)` y que `public.organization_members(organization_id uuid, user_id uuid, role text)` representa la pertenencia del usuario a la organización. **Verifica los nombres y tipos reales antes de ejecutar la migración.** Si tu esquema difiere, adapta la migración a tu esquema real primero. No usa service-role en el navegador.

La aplicación requiere un usuario autenticado y una organización seleccionada para operar sobre datos reales. La base del starter incluye el helper para Supabase, pero el selector de organización y el flujo de autenticación completo quedan marcados como siguiente paso, porque deben integrarse con las tablas reales de identidad y membresía existentes, no inventarse.

## Próxima entrega recomendada

1. Ajustar migración según el esquema real del Supabase existente.
2. Completar login/logout, resolución segura de organización y autorización de servidor.
3. Robustecer CSV (mapeo de columnas, importación transaccional e informe de errores).
4. Conectar IA real para redactar mensajes, con aprobación manual y límites de uso.
5. Añadir pruebas automatizadas, logs y telemetría.

## Criterio de honestidad funcional

No se incluyen botones que simulen integraciones conectadas. Si Supabase no está configurado o la migración no se aplicó, la interfaz muestra el error y no inventa datos guardados.
