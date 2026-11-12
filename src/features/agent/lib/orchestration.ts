export type ConversationMessage = { role: "user" | "assistant"; content: string };
export type KnowledgeSource = { id: string; title: string; content: string; category: string };
export type AgentRuntimeConfig = {
  agent_name: string; objective: string; tone: string; personality: string; greeting: string;
  language: string; response_style: string; target_customer: string; qualification_questions: string;
  restrictions: string; knowledge_entry_ids: string[]; human_handoff_enabled: boolean;
  handoff_triggers: string; handoff_message: string;
};
export type LeadCapture = {
  name: string | null; email: string | null; phone: string | null; need: string | null;
  company_name: string | null; company_description: string | null; website: string | null; country: string | null;
  service_interest: string | null; project_objective: string | null; budget: string | null; timeline: string | null;
};
export type OrchestrationResult = {
  answer: string;
  intent: string;
  route: "answer_from_knowledge" | "qualify" | "handoff" | "greeting" | "clarify";
  confidence: "grounded" | "limited" | "none";
  sources: Array<{ id: string; title: string; category: string }>;
  handoff_required: boolean;
  lead_capture: LeadCapture;
  actions: string[];
};

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9@.+\s]/g, " ").replace(/\s+/g, " ").trim();
const STOP = new Set(["para","como","desde","donde","cuando","cuales","cual","sus","son","quiero","necesito","tienen","tiene","pueden","puede","ustedes","hola","buenas","gracias","por","favor","una","uno","con","del","las","los","que","esto","esta","este","hay","ser","mas","muy","mi","me","el","la","de","en","y","o","a"]);
const stem = (word: string) => word.length > 5 && word.endsWith("es") ? word.slice(0, -2) : word.length > 4 && word.endsWith("s") ? word.slice(0, -1) : word;
const tokens = (value: string) => normalize(value).split(" ").filter((word) => word.length > 2 && !STOP.has(word)).map(stem);

function classifyIntent(message: string) {
  const text = normalize(message);
  if (/\b(hablar con (una )?persona|asesor|vendedor|humano|agente real|representante|alguien del equipo)\b/.test(text)) return "human_request";
  if (/\b(reclamo|reclamacion|denuncia|molesto|estafa|devolucion urgente|problema grave)\b/.test(text)) return "complaint";
  if (/\b(agendar|agenda|reservar|reserva|hora disponible|tomar una hora|pedir una hora|cita)\b/.test(text)) return "booking";
  if (/\b(precio|precios|cuanto cuesta|cuanto vale|valor|cotizacion|presupuesto|cotizar|tarifa|cuanto sale)\b/.test(text)) return "pricing";
  if (/\b(horario|horarios|atencion|atienden|abren|abierto|abierta|cierran|fin de semana|fines de semana|sabado|domingo|direccion|ubicacion|donde estan|como llegar|despacho|envio|cobertura|medios de pago|formas de pago|transferencia)\b/.test(text)) return "business_info";
  if (/\b(comprar|contratar|quiero adquirir|como pago|pagar|pedido|quiero uno|me interesa)\b/.test(text)) return "purchase";
  if (/\b(producto|productos|servicio|servicios|catalogo|ofrecen|a que se dedican|que hacen|trabajan|landing|pagina web|marketing|menu|carta)\b/.test(text)) return "product";
  if (/\b(disponible|stock|disponibilidad|plazo|entrega)\b/.test(text)) return "availability";
  if (/^(hola( buenas)?( tardes| dias| noches)?|buenas (tardes|noches)|buenos dias|hey|hello)[!. ]*$/.test(text)) return "greeting";
  return "general";
}

function rankKnowledge(message: string, knowledge: KnowledgeSource[]) {
  const query = new Set(tokens(message));
  const normalizedMessage = normalize(message);
  const aliases: Array<[RegExp, string[]]> = [
    [/\b(fin de semana|fines de semana|sabado|domingo)\b/, ["horario", "atencion", "sabado", "domingo"]],
    [/\b(servicios?|a que se dedican|que hacen|ofrecen)\b/, ["servicio", "producto"]],
    [/\b(precio|precios|cuanto cuesta|cuanto vale|valor|tarifa|cuanto sale)\b/, ["precio", "tarifa", "valor", "costo"]],
    [/\b(ubicacion|direccion|donde estan|como llegar)\b/, ["ubicacion", "direccion"]],
    [/\b(pago|pagos|transferencia|tarjeta)\b/, ["pago", "pagos", "transferencia"]],
    [/\b(despacho|envio|entrega)\b/, ["despacho", "envio", "entrega"]],
    [/\b(garantia|devolucion|cambio|reembolso)\b/, ["garantia", "devolucion", "cambio"]],
  ];
  for (const [pattern, additions] of aliases) if (pattern.test(normalizedMessage)) additions.forEach((item) => query.add(item));
  if (!query.size) return [];
  const ranked = knowledge.map((item) => {
    const titleTokens = new Set(tokens(item.title));
    const contentTokens = new Set(tokens(item.content));
    const titleHits = [...query].filter((token) => titleTokens.has(token)).length;
    const contentHits = [...query].filter((token) => contentTokens.has(token)).length;
    const hits = titleHits + contentHits;
    const coverage = (titleHits * 2 + contentHits) / Math.max(1, query.size * 2);
    const category = normalize(item.category);
    const categoryMatch =
      (category === "faq" && /horario|atencion|politica|pregunta|pago|ubicacion/.test(normalizedMessage)) ||
      (category === "product" && /producto|servicio|landing|pagina|marketing/.test(normalizedMessage)) ||
      (category === "business" && /horario|atencion|ubicacion|direccion|despacho|pago/.test(normalizedMessage)) ? 0.08 : 0;
    return { item, score: coverage + categoryMatch, hits };
  }).filter((entry) => entry.hits >= 1 && entry.score >= 0.22)
    .sort((a, b) => b.score - a.score);
  if (!ranked.length) return [];
  const best = ranked[0];
  const runnerUp = ranked[1];
  if (runnerUp && best.score - runnerUp.score < 0.06 && best.item.category !== runnerUp.item.category) return [];
  return [best];
}

function extractLeadCapture(messages: ConversationMessage[]): LeadCapture {
  const userMessages = messages.filter((message) => message.role === "user").map((message) => message.content);
  const text = userMessages.join("\n");
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() ?? null;
  const explicitName = text.match(/\b(?:me llamo|mi nombre es|soy)\s+([A-ZÁÉÍÓÚÑ][\p{L}'-]+(?:\s+[A-ZÁÉÍÓÚÑ][\p{L}'-]+){0,2})/iu)?.[1] ?? null;
  const lastAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant")?.content ?? "";
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content.trim() ?? "";
  // Recupera una respuesta breve de nombre aunque después el agente ya haya preguntado
  // por correo/teléfono. Así el dato no se pierde en los turnos siguientes.
  const namePrompt = /\b(nombre|con quien tengo el gusto|como te llamas)\b/i;
  const cleanNameReply = (value: string) => value.replace(/[.!?,;:]+$/g, "").trim().replace(/\s+/g, " ");
  let conversationalName: string | null = null;
  for (let index = 0; index < messages.length - 1; index += 1) {
    const current = messages[index];
    const next = messages[index + 1];
    if (current.role !== "assistant" || !namePrompt.test(current.content) || next.role !== "user") continue;
    const candidate = cleanNameReply(next.content);
    if (/^[\p{L}][\p{L}'-]*(?:\s+[\p{L}][\p{L}'-]*){1,2}$/u.test(candidate)
      && !/^(si|no|hola|buenas|gracias|quiero|necesito|empresa|cliente)$/i.test(candidate)) {
      conversationalName = candidate;
    }
  }
  const directNameCandidate = cleanNameReply(latestUserMessage);
  const directName = namePrompt.test(lastAssistantMessage)
    && /^[\p{L}][\p{L}'-]*(?:\s+[\p{L}][\p{L}'-]*){1,2}$/u.test(directNameCandidate)
    && !/^(si|no|hola|buenas|gracias|quiero|necesito|empresa|cliente)$/i.test(directNameCandidate)
    ? directNameCandidate
    : null;
  const name = explicitName || conversationalName || directName;
  let conversationalCompany: string | null = null;
  let conversationalCompanyDescription: string | null = null;
  let conversationalObjective: string | null = null;
  for (let index = 0; index < messages.length - 1; index += 1) {
    const current = messages[index];
    const next = messages[index + 1];
    if (current.role !== "assistant" || next.role !== "user") continue;
    const prompt = normalize(current.content);
    const reply = cleanNameReply(next.content);
    if (/empresa y a que se dedica|nombre de tu empresa|como se llama tu empresa|empresa/.test(prompt)) {
      const companyMatch = reply.match(/^(.+?)(?=\s+(?:servicios?\b|dedicad[oa]\b|nos dedicamos\b|somos\b|empresa\b|se dedica\b))/i);
      const candidate = (companyMatch?.[1] || reply).replace(/^(?:mi empresa es|la empresa es|se llama)\s+/i, "").replace(/[,:;.-]+$/g, "").trim();
      conversationalCompany = candidate.slice(0, 60);
      const description = companyMatch ? reply.slice(companyMatch[0].length).replace(/^\s+/, "").trim() : "";
      conversationalCompanyDescription = description ? description.slice(0, 240) : null;
    }
    if (/que objetivo buscas|que objetivo quieres|para que necesitas|objetivo de la landing|que necesitas conseguir/.test(prompt)) {
      conversationalObjective = reply.slice(0, 180);
    }
  }
  const explicitCompany = text.match(/\b(?:mi empresa es|mi empresa se llama|la empresa se llama|trabajo en|empresa:)\s*([\p{L}0-9&.' -]{2,60})/iu)?.[1]?.trim()?.replace(/\s+(?:y mi|y el|y la|mi objetivo|necesito|quiero|con un|con una).*/i, "") ?? null;
  const company = explicitCompany || conversationalCompany;
  const website = text.match(/\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.(?:cl|com|net|org|io|es|mx|pe)(?:\/[\w./-]*)?/i)?.[0] ?? null;
  const country = text.match(/\b(chile|mexico|méxico|espana|españa|peru|perú|argentina|colombia|estados unidos|usa)\b/i)?.[0] ?? null;
  const service = text.match(/\b(landing page(?:s)?|pagina web|página web|sitio web|seo|google ads|meta ads|publicidad digital|marketing digital|automatizacion|automatización|chatbot|agente ia|agente comercial)\b/i)?.[0] ?? null;
  const objective = conversationalObjective || text.match(/\b(?:objetivo es|necesito para|busco|quiero lograr|mi objetivo)\s+([^.!?\n]{5,180})/i)?.[1]?.trim() ?? null;
  const budget = text.match(/\b(?:presupuesto|budget|inversion|inversión)\s*(?:(?:estimado|aproximado)\s*)?(?:(?:es\s+)?de\s*|es\s*|:\s*)?(?:\$\s*)?([\d.,]+\s*(?:clp|pesos|usd|dolares|dólares|eur|euros|mxn|soles)?)\b/i)?.[1]?.trim() ?? null;
  const timeline = text.match(/\b(urgente|lo antes posible|esta semana|este mes|proximo mes|próximo mes|en \d+\s*(?:dias|días|semanas|meses)|para (?:hoy|mañana|manana|diciembre|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre))\b/i)?.[0] ?? null;
  const need = userMessages.find((item) => /\b(cotizar|cotizacion|contratar|landing page|pagina web|sitio web|servicio)\b/i.test(normalize(item))) ?? userMessages.at(-1) ?? null;
  return { name, email, phone, need, company_name: company, company_description: conversationalCompanyDescription, website, country, service_interest: service, project_objective: objective, budget, timeline };
}

function nextQualificationQuestion(capture: LeadCapture) {
  if (!capture.name) return "Para comenzar, ¿con quién tengo el gusto de hablar? ¿Cuál es tu nombre?";
  if (!capture.email && !capture.phone) return "Gracias, " + capture.name.split(" ")[0] + ". ¿Me compartes un correo o teléfono de contacto para continuar con tu cotización?";
  if (!capture.company_name) return "¿Cómo se llama tu empresa y a qué se dedica?";
  if (!capture.project_objective) return "¿Qué objetivo buscas conseguir con la landing page: captar clientes, recibir consultas, vender o presentar tus servicios?";
  if (!capture.budget) return "¿Tienes un presupuesto estimado para este proyecto?";
  if (!capture.timeline) return "¿En qué plazo te gustaría tener lista la landing page?";
  return "Ya tengo los datos principales. ¿Hay alguna funcionalidad o requisito especial que debamos considerar?";
}

function looksLikeInternalInstructions(value: string) {
  return /\b(eres|tu funcion|tu función|tu objetivo|debes|instrucciones|utiliza exclusivamente|no inventes|cuando un cliente|responde de manera|fuentes autorizadas)\b/i.test(value)
    || value.split("\n").filter((line) => line.trim()).length > 2;
}

function safeQualificationQuestion(config: AgentRuntimeConfig) {
  const configured = (config.qualification_questions || "").split("\n")
    .map((line) => line.trim())
    .find((line) => line.length >= 8 && line.length <= 240 && line.includes("?") && !looksLikeInternalInstructions(line));
  return configured || "¿Qué servicio necesitas y cuál es el objetivo de tu proyecto?";
}

function safeHandoffMessage(config: AgentRuntimeConfig) {
  const message = (config.handoff_message || "").trim();
  if (!message || message.length > 400 || looksLikeInternalInstructions(message)) {
    return "Entiendo. Tu solicitud requiere atención de una persona del equipo. En esta simulación no se realiza una derivación automática.";
  }
  return message;
}

function safeGreeting(config: AgentRuntimeConfig) {
  const greeting = (config.greeting || "").trim();
  if (!greeting || greeting.length > 240 || /eres |tu funcion|tu función|tu objetivo|debes |instrucciones|agente comercial virtual/i.test(greeting)) {
    return "¡Hola! Soy " + (config.agent_name || "tu asistente") + ", el asistente virtual del negocio. ¿En qué puedo ayudarte?";
  }
  return greeting;
}

export function orchestrateConversation(input: {
  message: string; messages: ConversationMessage[]; config: AgentRuntimeConfig; knowledge: KnowledgeSource[];
}): OrchestrationResult {
  const { message, messages, config, knowledge } = input;
  const intent = classifyIntent(message);
  const lead_capture = extractLeadCapture([...messages, { role: "user", content: message }]);
  const wantsHuman = intent === "human_request" || intent === "complaint";
  const sourcesFor = (matches: ReturnType<typeof rankKnowledge>) => matches.map(({ item }) => ({ id: item.id, title: item.title, category: item.category }));

  if (intent === "greeting") {
    return { answer: safeGreeting(config), intent, route: "greeting", confidence: "grounded", sources: [], handoff_required: false, lead_capture, actions: ["start_conversation"] };
  }
  if (wantsHuman && config.human_handoff_enabled) {
    return { answer: safeHandoffMessage(config), intent, route: "handoff", confidence: "limited", sources: [], handoff_required: true, lead_capture, actions: ["human_handoff"] };
  }
  if (wantsHuman) {
    return { answer: "Entiendo que necesitas atención de una persona. La derivación humana está desactivada; no voy a afirmar que se haya contactado al equipo.", intent, route: "clarify", confidence: "none", sources: [], handoff_required: false, lead_capture, actions: ["notify_human_handoff_unavailable"] };
  }

  const currentMessageHasCommercialIntent = ["pricing", "purchase"].includes(intent)
    || /\b(cotizar|cotizacion|contratar|quiero contratar|me interesa contratar|quiero comprar|necesito una landing|necesito una pagina web|necesito una página web)\b/i.test(normalize(message));
  const previousCommercialIntent = messages.some((item) => item.role === "user"
    && /\b(cotizar|cotizacion|contratar|quiero contratar|me interesa contratar|quiero comprar|necesito una landing|necesito una pagina web)\b/i.test(normalize(item.content)));
  const lastAssistantPrompt = [...messages].reverse().find((item) => item.role === "assistant")?.content ?? "";
  const awaitingQualificationReply = /empresa y a que se dedica|nombre de tu empresa|como se llama tu empresa|que objetivo buscas|que objetivo quieres|para que necesitas|objetivo de la landing|presupuesto estimado|que presupuesto|en que plazo|cuando necesitas/i.test(normalize(lastAssistantPrompt));
  const looksLikeQuestion = /^\s*[¿?]/.test(message.trim()) || /\?$/.test(message.trim());
  const isQualificationReply = previousCommercialIntent && (intent === "general" || (awaitingQualificationReply && !looksLikeQuestion));
  if (currentMessageHasCommercialIntent || isQualificationReply) {
    return {
      answer: "Perfecto, puedo ayudarte a preparar la cotización de " + (lead_capture.service_interest || "tu proyecto") + ". " + nextQualificationQuestion(lead_capture),
      intent: intent === "general" || intent === "product" ? "pricing" : intent,
      route: "qualify", confidence: "limited", sources: [], handoff_required: false,
      lead_capture, actions: ["capture_purchase_interest", "qualify_lead"],
    };
  }

  const matches = rankKnowledge(message, knowledge);
  const sources = sourcesFor(matches);
  if (matches.length) {
    const answer = matches.length === 1
      ? matches[0].item.content
      : matches.map(({ item }) => item.title + ": " + item.content).join("\n\n");
    const ask = intent === "purchase" ? "\n\n¿Quieres que te ayude a avanzar con el siguiente paso?" : "";
    return { answer: answer + ask, intent, route: "answer_from_knowledge", confidence: "grounded", sources, handoff_required: false, lead_capture, actions: intent === "purchase" ? ["capture_purchase_interest"] : ["answer_from_published_knowledge"] };
  }

  const requiresGrounding = ["pricing", "business_info", "availability", "product", "purchase", "booking"].includes(intent);
  if (requiresGrounding) {
    const fallback = config.human_handoff_enabled
      ? "No tengo información publicada suficiente para confirmar ese dato. Esta consulta requiere confirmación del equipo; en esta simulación no se realiza una derivación automática."
      : "No tengo información publicada suficiente para confirmar ese dato. Prefiero no inventar información. ¿Hay algo más en lo que pueda orientarte?";
    return { answer: fallback, intent, route: config.human_handoff_enabled ? "handoff" : "clarify", confidence: "none", sources: [], handoff_required: config.human_handoff_enabled, lead_capture, actions: config.human_handoff_enabled ? ["human_handoff"] : ["request_more_information"] };
  }

  return { answer: "Claro, puedo orientarte. " + safeQualificationQuestion(config), intent, route: "qualify", confidence: "limited", sources: [], handoff_required: false, lead_capture, actions: ["qualify_lead"] };
}
