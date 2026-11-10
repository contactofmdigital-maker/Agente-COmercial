import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { orchestrateConversation, type ConversationMessage, type AgentRuntimeConfig, type KnowledgeSource } from "@/features/agent/lib/orchestration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  message: z.string().trim().min(1).max(2000),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(2000),
  })).max(12).default([]),
});

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" },
  });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    if (!supabase) return json({ error: "La conexión con Supabase no está configurada." }, 503);
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) return json({ error: "Tu sesión no es válida. Inicia sesión nuevamente." }, 401);

    const limit = checkRateLimit("agent-orchestrator:" + auth.user.id, 20, 60_000);
    if (!limit.allowed) return json({ error: "Demasiados mensajes de prueba. Espera un momento." }, 429);

    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 32 * 1024) return json({ error: "La solicitud supera el tamaño permitido." }, 413);
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return json({ error: "El cuerpo no contiene JSON válido." }, 400); }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return json({ error: "El mensaje no tiene un formato válido." }, 400);

    const { data: config, error: configError } = await supabase
      .from("agent_configurations").select("*").eq("user_id", auth.user.id).maybeSingle();
    if (configError) {
      console.error("Agent orchestration config query:", configError.message);
      return json({ error: "No se pudo cargar la configuración del agente." }, 500);
    }
    if (!config) return json({ error: "Primero guarda la configuración del agente." }, 409);

    const ids = Array.isArray(config.knowledge_entry_ids) ? config.knowledge_entry_ids : [];
    let knowledge: KnowledgeSource[] = [];
    if (ids.length) {
      const { data, error: knowledgeError } = await supabase
        .from("agent_knowledge_entries").select("id,title,content,category")
        .eq("user_id", auth.user.id).eq("status", "published").in("id", ids);
      if (knowledgeError) {
        console.error("Agent orchestration knowledge query:", knowledgeError.message);
        return json({ error: "No se pudo cargar el conocimiento publicado del agente." }, 500);
      }
      knowledge = (data ?? []) as KnowledgeSource[];
    }

    const result = orchestrateConversation({
      message: parsed.data.message,
      messages: parsed.data.messages as ConversationMessage[],
      config: config as AgentRuntimeConfig,
      knowledge,
    });
    return json({ ...result, agent_name: config.agent_name, mode: "simulation", external_actions_executed: false });
  } catch (error) {
    console.error("Agent orchestration error:", error instanceof Error ? error.message : "unknown");
    return json({ error: "Ocurrió un problema al procesar la simulación." }, 500);
  }
}
