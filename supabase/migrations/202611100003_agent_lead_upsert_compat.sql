-- UpScale IA · Fase 04 · compatibilidad de upsert desde PostgREST
-- La unicidad no parcial permite usar onConflict: user_id,conversation_id.
-- PostgreSQL permite múltiples valores NULL en un índice UNIQUE normal,
-- por lo que los prospectos manuales existentes no colisionan.

drop index if exists public.sales_prospects_user_conversation_uidx;

create unique index sales_prospects_user_conversation_uidx
  on public.sales_prospects(user_id, conversation_id);
