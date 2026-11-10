import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { orchestrateConversation, type ConversationMessage, type AgentRuntimeConfig, type KnowledgeSource } from "@/features/agent/lib/orchestration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  message: z.string().trim().min(1).max(2000),
  conversation_id: z.string().uuid(),
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
    if (!parsed.success) return json({ error: "El mensaje no tiene un formato válido o falta el identificador de conversación." }, 400);

    const { data: config, error: configError } = await supabase
      .from("agent_configurations").select("*").eq("user_id", auth.user.id).maybeSingle();
    if (configError) {
      console.error("Agent orchestration config query:", configError.message);
      return json({ error: "No se pudo cargar la configuración del agente." }, 500);
    }
    if (!config) return json({ error: "Primero guarda la configuración del agente." }, 409);

    const ids = Array.isArray(config.knowledge_entry_ids) ? config.knowledge_entry_ids : [];
    let knowledgeQuery = supabase
      .from("agent_knowledge_entries").select("id,title,content,category")
      .eq("user_id", auth.user.id).eq("status", "published");
    if (ids.length) knowledgeQuery = knowledgeQuery.in("id", ids);
    const { data: knowledgeData, error: knowledgeError } = await knowledgeQuery;
    if (knowledgeError) {
      console.error("Agent orchestration knowledge query:", knowledgeError.message);
      return json({ error: "No se pudo cargar el conocimiento publicado del agente." }, 500);
    }

    const result = orchestrateConversation({
      message: parsed.data.message,
      messages: parsed.data.messages as ConversationMessage[],
      config: config as AgentRuntimeConfig,
      knowledge: (knowledgeData ?? []) as KnowledgeSource[],
    });

    const allUserText = [...parsed.data.messages.filter((item) => item.role === "user").map((item) => item.content), parsed.data.message].join(" ");
    const hasContact = Boolean(result.lead_capture.email || result.lead_capture.phone);
    const commercialSignal = ["purchase", "pricing"].includes(result.intent)
      || /\b(cotizar|cotizacion|contratar|quiero contratar|me interesa contratar|quiero comprar|necesito una landing|necesito una pagina web|necesito una página web)\b/i.test(allUserText);
    const shouldSaveLead = hasContact && commercialSignal;

    let leadSaved = false;
    let leadId: string | null = null;
    if (shouldSaveLead) {
      const capture = result.lead_capture;
      const { data: savedLead, error: saveError } = await supabase
        .from("sales_prospects")
        .upsert({
          user_id: auth.user.id,
          conversation_id: parsed.data.conversation_id,
          full_name: capture.name || "Prospecto sin nombre",
          company_name: capture.company_name,
          email: capture.email,
          phone: capture.phone,
          website: capture.website,
          country: capture.country,
          service_interest: capture.service_interest,
          project_objective: capture.project_objective,
          budget: capture.budget,
          timeline: capture.timeline,
          notes: capture.need,
          source: "playground",
          status: "new",
        }, { onConflict: "user_id,conversation_id" })
        .select("id")
        .single();

      if (saveError) {
        console.error("Agent lead capture save:", saveError.message);
        return json({ error: "El agente respondió, pero no se pudo guardar el prospecto en el CRM." }, 500);
      }
      leadSaved = true;
      leadId = savedLead.id;
    }

    return json({
      ...result,
      agent_name: config.agent_name,
      mode: "simulation",
      external_actions_executed: false,
      lead_saved: leadSaved,
      lead_id: leadId,
    });
  } catch (error) {
    console.error("Agent orchestration error:", error instanceof Error ? error.message : "unknown");
    return json({ error: "Ocurrió un problema al procesar la simulación." }, 500);
  }
}
