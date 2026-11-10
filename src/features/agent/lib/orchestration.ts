export type ConversationMessage = { role: "user" | "assistant"; content: string };
export type KnowledgeSource = { id: string; title: string; content: string; category: string };
export type AgentRuntimeConfig = {
  agent_name: string; objective: string; tone: string; personality: string; greeting: string;
  language: string; response_style: string; target_customer: string; qualification_questions: string;
  restrictions: string; knowledge_entry_ids: string[]; human_handoff_enabled: boolean;
  handoff_triggers: string; handoff_message: string;
};
export type OrchestrationResult = {
  answer: string;
  intent: string;
  route: "answer_from_knowledge" | "qualify" | "handoff" | "greeting" | "clarify";
  confidence: "grounded" | "limited" | "none";
  sources: Array<{ id: string; title: string; category: string }>;
  handoff_required: boolean;
  lead_capture: { name: string | null; email: string | null; phone: string | null; need: string | null };
  actions: string[];
};

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9@.+\s]/g, " ").replace(/\s+/g, " ").trim();
const STOP = new Set(["para","como","desde","donde","cuando","quiero","necesito","tienen","tiene","pueden","puede","ustedes","hola","buenas","gracias","por","favor","una","uno","con","del","las","los","que","esto","esta","este","hay","ser","son","mas","muy","mi","me","el","la","de","en","y","o","a"]);
const tokens = (value: string) => normalize(value).split(" ").filter((word) => word.length > 2 && !STOP.has(word));

function classifyIntent(message: string) {
  const text = normalize(message);
  if (/\b(hablar con (una )?persona|asesor|vendedor|humano|agente real|representante)\b/.test(text)) return "human_request";
  if (/\b(reclamo|reclamacion|denuncia|molesto|estafa|devolucion urgente|problema grave)\b/.test(text)) return "complaint";
  if (/\b(precio|precios|cuanto cuesta|cuanto vale|valor|cotizacion|presupuesto)\b/.test(text)) return "pricing";
  if (/\b(horario|abren|cierran|direccion|ubicacion|donde estan|despacho|envio|cobertura)\b/.test(text)) return "business_info";
  if (/\b(comprar|contratar|reservar|quiero adquirir|como pago|pagar|pedido)\b/.test(text)) return "purchase";
  if (/\b(producto|servicio|catalogo|ofrecen|trabajan|landing|pagina web|marketing)\b/.test(text)) return "product";
  if (/\b(disponible|stock|disponibilidad|plazo|entrega)\b/.test(text)) return "availability";
  if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|hello)[!. ]*$/.test(text)) return "greeting";
  return "general";
}

function rankKnowledge(message: string, knowledge: KnowledgeSource[]) {
  const query = new Set(tokens(message));
  if (!query.size) return [];
  return knowledge.map((item) => {
    const contentTokens = new Set(tokens(item.title + " " + item.content));
    const overlap = [...query].filter((token) => contentTokens.has(token));
    const score = overlap.length / Math.max(1, Math.min(query.size, 7));
    return { item, score, overlap: overlap.length };
  }).filter((item) => item.overlap > 0 && item.score >= 0.18)
    .sort((a, b) => b.score - a.score).slice(0, 3);
}

function extractLeadCapture(messages: ConversationMessage[]) {
  const text = messages.filter((message) => message.role === "user").map((message) => message.content).join("\n");
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() ?? null;
  const name = text.match(/\b(?:me llamo|mi nombre es|soy)\s+([A-ZÁÉÍÓÚÑ][\p{L}'-]+(?:\s+[A-ZÁÉÍÓÚÑ][\p{L}'-]+){0,2})/iu)?.[1] ?? null;
  const need = messages.filter((message) => message.role === "user").map((message) => message.content).at(-1) ?? null;
  return { name, email, phone, need };
}

function nextQualificationQuestion(config: AgentRuntimeConfig, messages: ConversationMessage[]) {
  const questions = config.qualification_questions.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const asked = messages.filter((message) => message.role === "assistant").length;
  return questions.length ? questions[Math.min(asked, questions.length - 1)] : "¿Qué necesitas resolver y para cuándo lo necesitas?";
}

export function orchestrateConversation(input: {
  message: string; messages: ConversationMessage[]; config: AgentRuntimeConfig; knowledge: KnowledgeSource[];
}): OrchestrationResult {
  const { message, messages, config, knowledge } = input;
  const intent = classifyIntent(message);
  const matches = rankKnowledge(message, knowledge);
  const lead_capture = extractLeadCapture([...messages, { role: "user", content: message }]);
  const sources = matches.map(({ item }) => ({ id: item.id, title: item.title, category: item.category }));
  const wantsHuman = intent === "human_request" || intent === "complaint";
  const unsupportedFact = ["pricing", "business_info", "availability", "product", "purchase"].includes(intent) && matches.length === 0;

  if (wantsHuman && config.human_handoff_enabled) {
    return { answer: config.handoff_message || "Voy a derivar tu consulta a una persona del equipo.", intent, route: "handoff", confidence: "limited", sources, handoff_required: true, lead_capture, actions: ["human_handoff"] };
  }
  if (matches.length) {
    const answer = matches.length === 1
      ? matches[0].item.content
      : matches.map(({ item }) => item.title + ": " + item.content).join("\n\n");
    const ask = intent === "purchase" ? "\n\n¿Quieres que te ayude a avanzar con el siguiente paso?" : "";
    return { answer: answer + ask, intent, route: "answer_from_knowledge", confidence: "grounded", sources, handoff_required: false, lead_capture, actions: intent === "purchase" ? ["capture_purchase_interest"] : ["answer_from_published_knowledge"] };
  }
  if (wantsHuman) {
    return { answer: "Entiendo que necesitas atención de una persona. La derivación humana está desactivada en la configuración actual; no voy a afirmar que se haya contactado al equipo.", intent, route: "clarify", confidence: "none", sources, handoff_required: false, lead_capture, actions: ["notify_human_handoff_unavailable"] };
  }
  if (intent === "greeting") {
    return { answer: config.greeting || "¡Hola! ¿En qué puedo ayudarte?", intent, route: "greeting", confidence: "grounded", sources: [], handoff_required: false, lead_capture, actions: ["start_conversation"] };
  }
  if (unsupportedFact) {
    const fallback = config.human_handoff_enabled
      ? config.handoff_message || "No tengo información publicada suficiente para confirmarlo. Te derivaré con una persona del equipo."
      : "No tengo información publicada suficiente para confirmarlo. Prefiero no inventar datos. ¿Quieres contarme un poco más para orientarte?";
    return { answer: fallback, intent, route: config.human_handoff_enabled ? "handoff" : "clarify", confidence: "none", sources: [], handoff_required: config.human_handoff_enabled, lead_capture, actions: config.human_handoff_enabled ? ["human_handoff"] : ["request_more_information"] };
  }
  return { answer: "Claro, puedo orientarte. " + nextQualificationQuestion(config, messages), intent, route: "qualify", confidence: "limited", sources: [], handoff_required: false, lead_capture, actions: ["qualify_lead"] };
}
