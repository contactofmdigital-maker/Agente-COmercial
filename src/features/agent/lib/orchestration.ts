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
  company_name: string | null; website: string | null; country: string | null;
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
  const t = normalize(message);
  if (/\b(hablar con (una )?persona|asesor|vendedor|humano|agente real|representante)\b/.test(t)) return "human_request";
  if (/\b(reclamo|reclamacion|denuncia|molesto|estafa|devolucion urgente|problema grave)\b/.test(t)) return "complaint";
  if (/\b(precio|precios|cuanto cuesta|cuanto vale|valor|cotizacion|presupuesto|cotizar|cuanto sale|que precio)\b/.test(t)) return "pricing";
  if (/\b(horario|horarios|atencion|atienden|abren|abierto|abierta|cierran|fin de semana|fines de semana|sabado|domingo|direccion|ubicacion|donde estan|despacho|envio|cobertura|comuna|ciudad|oficina|oficinas|sucursal|sucursales|sede|sedes|presencia)\b/.test(t)) return "business_info";
  if (/\b(disponible|stock|disponibilidad|plazo|entrega|visitar|visita|agendar|agenda)\b/.test(t)) return "availability";
  if (/\b(comprar|contratar|reservar|quiero adquirir|como pago|pagar|pedido|me interesa)\b/.test(t)) return "purchase";
  if (/\b(producto|productos|servicio|servicios|catalogo|ofrecen|trabajan|landing|pagina web|marketing|muebles|mueble|mesita|silla|vanity|casa|casas|propiedad|propiedades|inmueble|terreno|departamento|caracteristicas|incluye|medidas)\b/.test(t)) return "product";
  if (/^(hola( buenas)?( tardes| dias| noches)?|buenas (tardes|noches)|buenos dias|hey|hello)[!. ]*$/.test(t)) return "greeting";
  return "general";
}
function detectIntents(message: string) {
  const t = normalize(message);
  const rules: Array<[string, RegExp]> = [
    ["human_request", /\b(hablar con (una )?persona|asesor|vendedor|humano|agente real|representante)\b/],
    ["complaint", /\b(reclamo|reclamacion|denuncia|molesto|estafa|devolucion urgente|problema grave)\b/],
    ["pricing", /\b(precio|precios|cuanto cuesta|cuanto vale|valor|cotizacion|presupuesto|cotizar|cuanto sale|que precio)\b/],
    ["business_info", /\b(horario|horarios|atencion|atienden|abren|abierto|abierta|cierran|fin de semana|fines de semana|sabado|domingo|direccion|ubicacion|donde estan|despacho|envio|cobertura|comuna|ciudad|oficina|oficinas|sucursal|sucursales|sede|sedes|presencia)\b/],
    ["availability", /\b(disponible|stock|disponibilidad|plazo|entrega|visitar|visita|agendar|agenda)\b/],
    ["purchase", /\b(comprar|contratar|reservar|quiero adquirir|como pago|pagar|pedido|me interesa)\b/],
    ["product", /\b(producto|productos|servicio|servicios|catalogo|ofrecen|trabajan|landing|pagina web|marketing|muebles|mueble|mesita|silla|vanity|casa|casas|propiedad|propiedades|inmueble|terreno|departamento|caracteristicas|incluye|medidas)\b/],
  ];
  return rules.filter(([, re]) => re.test(t)).map(([name]) => name);
}

function expandQueryTokens(message: string) {
  const base = tokens(message);
  const normalized = normalize(message);
  const aliases: Array<[RegExp, string[]]> = [
    [/\b(que es|para que sirve|significa)\b/, ["definicion", "utilidad", "explicacion"]],
    [/\b(servicios|ofrecen|hacen|trabajan)\b/, ["servicio", "producto", "catalogo"]],
    [/\b(muebles|mueble|mesitas|mesita|sillas|silla|vanitys|vanity)\b/, ["mueble", "infantil", "producto", "catalogo"]],
    [/\b(ninos|ninas|infantil|infantiles)\b/, ["infantil", "nino", "nina"]],
    [/\b(casas|casa|propiedades|propiedad|terreno|departamento)\b/, ["inmueble", "venta", "arriendo"]],
    [/\b(precio|precios|cuanto cuesta|cuanto vale|valor)\b/, ["precio", "valor", "tarifa", "costo"]],
    [/\b(envio|despacho|entrega)\b/, ["envio", "despacho", "entrega"]],
    [/\b(horario|horarios|atienden|abren|cierran)\b/, ["horario", "atencion"]],
    [/\b(fin de semana|fines de semana|sabado|domingo)\b/, ["horario", "atencion", "sabado", "domingo"]],
    [/\b(visitar|visita|visitas|agendar|agenda)\b/, ["visita", "disponibilidad", "agenda"]],
    [/\b(direccion|ubicacion|donde estan|comuna|ciudad)\b/, ["direccion", "ubicacion", "localizacion", "lugar"]],
    [/\b(visitar|visita|visitas|agendar|agenda)\b/, ["visita", "disponibilidad", "agenda"]],
  ];
  for (const [pattern, words] of aliases) if (pattern.test(normalized)) base.push(...words);
  return [...new Set(base)];
}

function rankKnowledge(message: string, knowledge: KnowledgeSource[]) {
  const queryTokens = expandQueryTokens(message);
  if (!queryTokens.length) return [];
  const query = new Set(queryTokens);
  const intent = classifyIntent(message);
  const intentAnchors: Record<string, string[]> = {
    pricing: ["precio", "precios", "cuanto", "cuesta", "vale", "valor", "cotizacion", "presupuesto", "tarifa", "costo"],
    business_info: ["horario", "atencion", "direccion", "ubicacion", "oficina", "oficinas", "sucursal", "sede", "comuna", "ciudad", "cobertura", "envio", "despacho"],
    availability: ["disponible", "stock", "disponibilidad", "plazo", "entrega", "visita", "agenda"],
    purchase: ["comprar", "contratar", "pagar", "pago", "cuotas", "pedido", "reservar"],
    product: ["producto", "productos", "servicio", "servicios", "catalogo", "ofrecen", "landing", "pagina", "web", "mueble", "propiedad"],
  };
  const anchors = intentAnchors[intent] || [];
  const domainGroups = [
    ["landing", "landing page", "pagina web", "web corporativa", "sitio web", "seo", "publicidad", "campana"],
    ["mueble", "muebles", "mesita", "silla", "vanity", "tablones", "catalogo"],
    ["propiedad", "propiedades", "inmueble", "inmobiliaria", "arriendo", "arrendar", "venta", "vender", "corredor"],
    ["aplicacion", "aplicaciones", "app", "apps", "movil", "moviles"],
  ];
  const requestedDomain = domainGroups.find((group) => group.some((term) => normalize(message).includes(term)));
  const ranked = knowledge.map((item) => {
    const titleTokens = new Set(tokens(item.title));
    const contentTokens = new Set(tokens(item.content));
    const titleHits = [...query].filter((token) => titleTokens.has(token)).length;
    const contentHits = [...query].filter((token) => contentTokens.has(token)).length;
    const overlap = titleHits + contentHits;
    const anchorHits = anchors.filter((token) => query.has(stem(token)) && (titleTokens.has(stem(token)) || contentTokens.has(stem(token)))).length;
    const domainHits = requestedDomain ? requestedDomain.filter((term) => {
      const normalizedTerm = normalize(term);
      return normalize(item.title + " " + item.content).includes(normalizedTerm);
    }).length : 0;
    const titleCoverage = titleHits / Math.max(1, query.size);
    const contentCoverage = contentHits / Math.max(1, query.size);
    const category = normalize(item.category);
    const categoryFit =
      (intent === "product" && category === "product" ? 0.12 : 0) +
      (intent === "pricing" && ["product", "policy", "faq"].includes(category) ? 0.14 : 0) +
      (intent === "business_info" && category === "business" ? 0.14 : 0) +
      (intent === "availability" && ["product", "business"].includes(category) ? 0.10 : 0) +
      (category === "faq" ? 0.04 : 0);
    const score = titleCoverage * 0.68 + contentCoverage * 0.32 + categoryFit + (titleHits > 0 ? 0.08 : 0);
    return { item, score, overlap, titleHits, contentHits, anchorHits, domainHits };
  }).filter((entry) => {
    // Exige una coincidencia específica: evita recuperar respuestas solo por palabras genéricas.
    if (entry.overlap === 0 || entry.score < 0.30) return false;
    if (anchors.length && entry.anchorHits === 0) return false;
    if (requestedDomain && entry.domainHits === 0) return false;
    return entry.titleHits > 0 || entry.contentHits >= 2 || entry.anchorHits >= 2;
  }).sort((a, b) => b.score - a.score || b.domainHits - a.domainHits || b.titleHits - a.titleHits || b.anchorHits - a.anchorHits || b.contentHits - a.contentHits);
  return ranked.length ? [ranked[0]] : [];
}
function splitCustomerQuestions(message: string) {
  return message
    .split(/\?+/)
    .flatMap((part) => part.split(/,\s*(?=(?:d[oó]nde|cu[aá]l|cu[aá]nto|qu[eé]|puedo|se puede|hay|tienen|c[oó]mo|se adapta|permite|incluye|tarda|tardan)\b)/i))
    .flatMap((part) => part.split(/\s+y\s+(?=(?:se puede|puedo|podemos|tienen|hay|cual|cuanto|donde|que precio|que valor|disponibilidad|stock|horario|atienden|abren|visitar|agendar|que necesitan|que incluye|permite|se adapta|tardan|tarda)\b)/i))
    .map((part) => part.trim()).filter(Boolean);
}

function extractLeadCapture(messages: ConversationMessage[]): LeadCapture {
  const userMessages = messages.filter((message) => message.role === "user").map((message) => message.content);
  const text = userMessages.join("\n");
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() ?? null;
  const explicitName = text.match(/\b(?:me llamo|mi nombre es|soy)\s+([A-ZÁÉÍÓÚÑ][\p{L}'-]+(?:\s+[\p{L}][\p{L}'-]*){0,2})/iu)?.[1] ?? null;
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
    if (/^[\p{L}][\p{L}'-]*(?:\s+[\p{L}][\p{L}'-]*){0,2}$/u.test(candidate)
      && !/^(si|no|ok|okay|hola|buenas|gracias|quiero|necesito|empresa|cliente|ninguno|ninguna)$/i.test(candidate)) {
      conversationalName = candidate;
    }
  }
  const directNameCandidate = cleanNameReply(latestUserMessage);
  const directName = namePrompt.test(lastAssistantMessage)
    && /^[\p{L}][\p{L}'-]*(?:\s+[\p{L}][\p{L}'-]*){0,2}$/u.test(directNameCandidate)
    && !/^(si|no|ok|okay|hola|buenas|gracias|quiero|necesito|empresa|cliente|ninguno|ninguna)$/i.test(directNameCandidate)
    ? directNameCandidate
    : null;
  const name = explicitName || conversationalName || directName;
  let conversationalCompany: string | null = null;
  let conversationalObjective: string | null = null;
  for (let index = 0; index < messages.length - 1; index += 1) {
    const current = messages[index];
    const next = messages[index + 1];
    if (current.role !== "assistant" || next.role !== "user") continue;
    const prompt = normalize(current.content);
    const reply = cleanNameReply(next.content);
    if (/empresa y a que se dedica|nombre de tu empresa|como se llama tu empresa/.test(prompt)) {
      const companyMatch = reply.match(/^(.+?)(?:\s+(?:servicios?|dedicad[oa]|empresa|nos dedicamos)\b.*)?$/i);
      conversationalCompany = (companyMatch?.[1] || reply).trim().slice(0, 60);
    }
    if (/que objetivo buscas|que objetivo quieres|para que necesitas|objetivo de la landing|que necesitas resolver o conseguir/.test(prompt)) {
      conversationalObjective = reply.slice(0, 180);
    }
  }
  const explicitCompany = text.match(/\b(?:mi empresa es|mi empresa se llama|la empresa se llama|trabajo en|empresa:)\s*([\p{L}0-9&.' -]{2,60})/iu)?.[1]?.trim()?.replace(/\s+(?:y mi|y el|y la|mi objetivo|necesito|quiero|con un|con una).*/i, "") ?? null;
  const company = explicitCompany || conversationalCompany;
  const website = text.match(/\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.(?:cl|com|net|org|io|es|mx|pe)(?:\/[\w./-]*)?/i)?.[0] ?? null;
  const country = text.match(/\b(chile|mexico|méxico|espana|españa|peru|perú|argentina|colombia|estados unidos|usa)\b/i)?.[0] ?? null;
  const service = text.match(/\b(landing page(?:s)?|pagina web|página web|sitio web|seo|google ads|meta ads|publicidad digital|marketing digital|automatizacion|automatización|chatbot|agente ia|agente comercial|muebles?|mesitas?|sillas?|vanitys?|casas?|propiedades?|terrenos?|departamentos?)\b/i)?.[0] ?? null;
  const objective = conversationalObjective || (text.match(/\b(?:objetivo es|necesito para|busco|quiero lograr|mi objetivo)\s+([^.!?\n]{5,180})/i)?.[1]?.trim() ?? null);
  const budget = text.match(/\b(?:presupuesto|budget|inversion|inversión)\s*(?:(?:estimado|aproximado)\s*)?(?:(?:es\s+)?de\s*|es\s*|:\s*)?(?:\$\s*)?([\d.,]+\s*(?:clp|pesos|usd|dolares|dólares|eur|euros|mxn|soles)?)\b/i)?.[1]?.trim() ?? null;
  const timeline = text.match(/\b(urgente|lo antes posible|esta semana|este mes|proximo mes|próximo mes|en \d+\s*(?:dias|días|semanas|meses)|para (?:hoy|mañana|manana|diciembre|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre))\b/i)?.[0] ?? null;
  const need = userMessages.find((item) => /\b(cotizar|cotizacion|contratar|landing page|pagina web|sitio web|servicio)\b/i.test(normalize(item))) ?? userMessages.at(-1) ?? null;
  return { name, email, phone, need, company_name: company, website, country, service_interest: service, project_objective: objective, budget, timeline };
}

function nextQualificationQuestion(capture: LeadCapture) {
  if (!capture.name) return "Para comenzar, ¿con quién tengo el gusto de hablar? ¿Cuál es tu nombre?";
  if (!capture.email && !capture.phone) return "Gracias, " + capture.name.split(" ")[0] + ". ¿Me compartes un correo o teléfono de contacto para continuar?";
  if (!capture.company_name) return "¿Cómo se llama tu empresa y qué productos o servicios ofrece?";
  if (!capture.project_objective) return "¿Qué necesitas resolver o conseguir con este producto o servicio?";
  if (!capture.timeline) return "¿Para cuándo lo necesitas?";
  return "Gracias. ¿Hay algún detalle adicional que debamos tener en cuenta para ayudarte?";
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
    return "¡Hola! Soy " + (config.agent_name || "tu asistente") + ", el asistente comercial de UpScale IA. ¿En qué puedo ayudarte?";
  }
  return greeting;
}

export function orchestrateConversation(input: {
  message: string; messages: ConversationMessage[]; config: AgentRuntimeConfig; knowledge: KnowledgeSource[];
}): OrchestrationResult {
  const { message, messages, config, knowledge } = input;
  const intent = classifyIntent(message);
  const detectedIntents = detectIntents(message);
  const lead_capture = extractLeadCapture([...messages, { role: "user", content: message }]);
  const wantsHuman = detectedIntents.includes("human_request") || detectedIntents.includes("complaint");

  if (intent === "greeting" && detectedIntents.length === 0) {
    return { answer: safeGreeting(config), intent, route: "greeting", confidence: "grounded", sources: [], handoff_required: false, lead_capture, actions: ["start_conversation"] };
  }
  if (wantsHuman && config.human_handoff_enabled) {
    return { answer: safeHandoffMessage(config), intent: detectedIntents.includes("complaint") ? "complaint" : "human_request", route: "handoff", confidence: "limited", sources: [], handoff_required: true, lead_capture, actions: ["human_handoff"] };
  }
  if (wantsHuman) {
    return { answer: "Entiendo que necesitas atención de una persona. La derivación humana está desactivada; no voy a afirmar que se haya contactado al equipo.", intent, route: "clarify", confidence: "none", sources: [], handoff_required: false, lead_capture, actions: ["notify_human_handoff_unavailable"] };
  }

  const normalizedMessage = normalize(message);
  const currentCommercial = detectedIntents.includes("pricing") || detectedIntents.includes("purchase")
    || /\b(cotizar|cotizacion|contratar|quiero comprar|me interesa contratar)\b/.test(normalizedMessage);
  const previousCommercial = messages.some((item) => item.role === "user" && (
    ["pricing", "purchase"].includes(classifyIntent(item.content))
    || /\b(cotizar|cotizacion|contratar|quiero comprar|me interesa contratar)\b/.test(normalize(item.content))
  ));
  const lastAssistant = [...messages].reverse().find((item) => item.role === "assistant")?.content ?? "";
  const awaiting = /nombre|correo o telefono|empresa y a que se dedica|nombre de tu empresa|como se llama tu empresa|que objetivo buscas|que objetivo quieres|que necesitas resolver o conseguir|presupuesto estimado|que presupuesto|en que plazo|cuando necesitas/i.test(normalize(lastAssistant));
  const qualificationReply = previousCommercial && awaiting && !message.includes("?");

  // Respuesta corta a una pregunta pendiente: captura el dato antes de continuar.
  if (qualificationReply && !currentCommercial) {
    return { answer: "Gracias por la información. " + nextQualificationQuestion(lead_capture), intent: "purchase", route: "qualify", confidence: "limited", sources: [], handoff_required: false, lead_capture, actions: ["capture_purchase_interest", "qualify_lead"] };
  }

  // Cada pregunta se consulta por separado: una respuesta encontrada no tapa las demás.
  const questions = splitCustomerQuestions(message);
  const answered: string[] = [];
  const unanswered: string[] = [];
  const sourceMap = new Map<string, { id: string; title: string; category: string }>();
  for (const question of questions) {
    const matches = rankKnowledge(question, knowledge);
    if (matches.length) {
      const item = matches[0].item;
      if (!answered.includes(item.content)) answered.push(item.content);
      sourceMap.set(item.id, { id: item.id, title: item.title, category: item.category });
    } else unanswered.push(question);
  }

  if (answered.length) {
    let answer = answered.join("\n\n");
    if (unanswered.length) {
      answer += "\n\nNo tengo información publicada suficiente para confirmar: " + unanswered.join("; ") + ". Prefiero no inventar ese dato.";
      if (currentCommercial || previousCommercial) answer += " " + nextQualificationQuestion(lead_capture);
    } else if (currentCommercial) answer += "\n\n¿Quieres que te ayude a avanzar con tu consulta?";
    return {
      answer, intent: detectedIntents.length > 1 ? detectedIntents.join("+") : intent,
      route: "answer_from_knowledge", confidence: unanswered.length ? "limited" : "grounded",
      sources: [...sourceMap.values()], handoff_required: false, lead_capture,
      actions: unanswered.length ? ["answer_from_published_knowledge", "request_confirmation", ...(currentCommercial ? ["qualify_lead"] : [])] : ["answer_from_published_knowledge", ...(currentCommercial ? ["capture_purchase_interest"] : [])],
    };
  }

  // Una pregunta comercial sin fuente pertinente no debe convertirse en captura de datos.
  // Primero se reconoce la falta de información; la cualificación ocurre cuando el cliente
  // confirma que desea avanzar, no como sustituto de una respuesta desconocida.
  const requiresGrounding = ["pricing", "business_info", "availability", "product", "purchase"].includes(intent) || detectedIntents.length > 0;
  if (requiresGrounding) {
    const fallback = config.human_handoff_enabled
      ? "No tengo información publicada suficiente para confirmar ese dato. Esta consulta requiere confirmación del equipo; en esta simulación no se realiza una derivación automática."
      : "No tengo información publicada suficiente para confirmar ese dato. Prefiero no inventar información. ¿Hay algo más en lo que pueda orientarte?";
    return { answer: fallback, intent: detectedIntents.length > 1 ? detectedIntents.join("+") : intent, route: config.human_handoff_enabled ? "handoff" : "clarify", confidence: "none", sources: [], handoff_required: config.human_handoff_enabled, lead_capture, actions: config.human_handoff_enabled ? ["human_handoff"] : ["request_more_information"] };
  }

  return { answer: "Claro, puedo orientarte. " + safeQualificationQuestion(config), intent, route: "qualify", confidence: "limited", sources: [], handoff_required: false, lead_capture, actions: ["qualify_lead"] };
}
