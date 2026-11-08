"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bot, Send, Sparkles, User, RotateCcw, LoaderCircle, FlaskConical, Zap, Database, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { classifyCrmQuery, isExplicitDraftRequest, isValidActivityDueDate, matchCrmProspects, prioritizeProspects, resolveActivityProspectId } from "@/features/assistant/lib/prioritization";

type ChatMessage = { role: "user" | "assistant"; content: string };
type AssistantMode = "demo" | "crm" | "openai";
type BusinessSegment = "agency" | "local" | "company" | "startup";
type Prospect = {
  id: string;
  full_name: string;
  company_name: string | null;
  email: string | null;
  website: string | null;
  country: string | null;
  notes: string | null;
  status: string;
  created_at: string;
};
type Opportunity = {
  id: string;
  prospect_id: string;
  title: string;
  description: string | null;
  stage: string;
  estimated_value: number;
  currency: string;
  expected_close_date: string | null;
  created_at: string;
};
type Activity = {
  id: string;
  prospect_id: string | null;
  opportunity_id: string | null;
  activity_type: string;
  title: string;
  description: string | null;
  due_at: string | null;
  priority: string;
  status: string;
  created_at: string;
  completed_at: string | null;
};
type CommercialContext = {
  profile: {
    business_name: string;
    segment: BusinessSegment;
    country: string;
    currency: string;
    description: string;
    products_services: string;
    ideal_customer: string;
    sales_goal: string;
  } | null;
  limits?: {
    complete?: boolean;
    page_size?: number;
    note: string;
  };
  summary: {
    prospects_loaded: number;
    opportunities_loaded: number;
    active_opportunities: number;
    won_opportunities: number;
    unknown_stage_opportunities?: number;
    activities_loaded: number;
    pending_activities: number;
    overdue_activities: number;
    invalid_date_activities?: number;
  };
  data: {
    prospects: Prospect[];
    opportunities: Opportunity[];
    activities: Activity[];
  };
};

const segmentOptions: { value: BusinessSegment; label: string }[] = [
  { value: "agency", label: "Agencia" },
  { value: "local", label: "Negocio local" },
  { value: "company", label: "Empresa" },
  { value: "startup", label: "Emprendimiento" },
];

const segmentGuidance: Record<BusinessSegment, string> = {
  agency: "Enfoque: captación B2B, decisores, cartera de empresas, propuestas y contratos recurrentes.",
  local: "Enfoque: consultas entrantes, intención de compra, reservas, visitas y ventas de proximidad.",
  company: "Enfoque: cuentas, múltiples interlocutores, pipeline, propuestas, ciclos de venta y seguimiento.",
  startup: "Enfoque: validar oferta, primeros clientes, rapidez de contacto, aprendizaje y conversión inicial.",
};

const suggestions = [
  "Analiza mis prospectos y dime a cuáles debería priorizar.",
  "Ayúdame a redactar un primer mensaje de prospección.",
  "Prepara respuestas para una objeción de precio.",
];

const welcomeMessage = "Hola. Soy tu Agente Comercial de UpScale IA. Puedo ayudarte a priorizar prospectos, preparar mensajes, responder objeciones y definir próximos pasos comerciales. ¿Qué necesitas trabajar hoy?";

function buildDemoAnswer(prompt: string) {
  const normalized = prompt.toLowerCase();
  const disclaimer = "MODO DEMO · Respuesta basada en escenarios ilustrativos. No consulta tus prospectos reales ni consume créditos de OpenAI.\n\n";
  if (normalized.includes("objec") || normalized.includes("precio") || normalized.includes("caro")) {
    return disclaimer + "RESPUESTA A OBJECIÓN DE PRECIO\n\nProspecto: “Me parece caro”.\n\nRespuesta sugerida:\n“Lo entiendo. Para evaluar si tiene sentido avanzar, ¿te parece si revisamos qué resultado necesitas conseguir y cuánto te está costando hoy no resolverlo? Así podemos ver si la propuesta realmente se justifica para tu negocio”.\n\nSiguiente paso: pregunta por su objetivo, presupuesto y plazo. No ofrezcas un descuento antes de entender la objeción.";
  }
  if (normalized.includes("mensaje") || normalized.includes("contact") || normalized.includes("prospe")) {
    return disclaimer + "BORRADOR DE PRIMER CONTACTO\n\nHola, [Nombre]. Estuve revisando [Empresa] y vi una oportunidad para mejorar la captación de clientes mediante una estrategia digital más enfocada en conversión.\n\nEn UpScale IA ayudamos a ordenar el proceso comercial y detectar oportunidades de crecimiento. ¿Te interesaría que te comparta 2 ideas concretas para tu negocio?\n\nPersonalización necesaria: reemplaza los campos entre corchetes y añade una observación real sobre la empresa antes de enviarlo.";
  }
  if (normalized.includes("seguimiento") || normalized.includes("follow") || normalized.includes("no responde")) {
    return disclaimer + "SEGUIMIENTO COMERCIAL\n\n1. Primer seguimiento: 2–3 días después del contacto inicial, aporta una idea útil.\n2. Segundo seguimiento: 4–5 días después, pregunta si es una prioridad actual.\n3. Cierre respetuoso: deja abierta la posibilidad de retomar más adelante.\n\nEjemplo:\n“Hola, [Nombre]. Retomo brevemente mi mensaje anterior. Preparé una idea que podría ayudar a [Empresa] a mejorar [objetivo]. ¿Te viene bien revisarla esta semana?”";
  }
  return disclaimer + "No identifiqué una de las consultas de demostración disponibles, así que no voy a inventar prospectos ni recomendar acciones sobre datos ficticios. En Demo puedo simular: priorización comercial, primer mensaje, seguimiento o respuesta a una objeción. Para consultar tus registros reales, utiliza el modo CRM; para estrategia y preguntas abiertas, utiliza OpenAI.";
}


function getSegmentAction(segment: BusinessSegment, prospect: Pick<Prospect, "status">) {
  const status = prospect.status.toLowerCase();
  if (status === "won") return "Mantener la relación: evaluar recompra, recomendación o venta complementaria.";
  if (status === "lost") return "Revisar el motivo de pérdida antes de intentar reactivar el contacto.";
  if (status === "proposal") return segment === "local"
    ? "Contactar para resolver dudas y facilitar la decisión de compra o reserva."
    : "Dar seguimiento a la propuesta, confirmar decisores y acordar fecha de decisión.";
  if (status === "qualified") return segment === "startup"
    ? "Validar urgencia y disposición de pago; proponer un siguiente paso pequeño."
    : "Agendar una conversación de diagnóstico y confirmar necesidad, presupuesto y plazo.";
  if (status === "contacted") return "Enviar seguimiento con valor concreto y una pregunta fácil de responder.";
  if (segment === "local") return "Invitar a consultar disponibilidad, visitar el local o solicitar una cotización.";
  if (segment === "agency") return "Investigar su oferta y detectar una oportunidad B2B concreta antes del primer contacto.";
  if (segment === "company") return "Identificar el área y al decisor adecuado antes de iniciar la prospección.";
  return "Validar el problema principal y comprobar si la oferta resuelve una necesidad prioritaria.";
}

function buildCrmAnswerInternal(prompt: string, context: CommercialContext, segment: BusinessSegment) {
  const { prospects, opportunities, activities } = context.data;
  const profile = context.profile;
  const label = segmentOptions.find((item) => item.value === segment)?.label ?? "Negocio";
  const businessName = profile?.business_name ? " · " + profile.business_name : "";
  const header =
    "MODO CRM · CONTEXTO COMERCIAL UNIFICADO · Sin consumo de OpenAI.\n" +
    "Perfil: " + label + businessName + ". " + segmentGuidance[segment] + "\n" +
    (profile?.sales_goal ? "Objetivo comercial: " + profile.sales_goal + "\n" : "") +
    "\nRESUMEN DE TU NEGOCIO\n" +
    "Prospectos cargados: " + context.summary.prospects_loaded +
    " · Oportunidades cargadas: " + context.summary.opportunities_loaded +
    " · Activas: " + context.summary.active_opportunities +
    " · Ganadas: " + context.summary.won_opportunities +
    " · Etapas por revisar: " + (context.summary.unknown_stage_opportunities ?? 0) +
    " · Actividades pendientes: " + context.summary.pending_activities +
    " · Actividades vencidas válidas: " + context.summary.overdue_activities +
    " · Fechas por revisar: " + (context.summary.invalid_date_activities ?? 0) + "\n" +
    (context.limits?.note ? "ALCANCE DEL CONTEXTO: " + context.limits.note + "\n\n" : "ALCANCE DEL CONTEXTO: se consideran todos los registros disponibles para tu usuario.\n\n");

  const normalized = prompt.toLowerCase();
  const intent = classifyCrmQuery(prompt);
  // "general" no significa "muéstrame todo": una intención no reconocida
  // debe pedir precisión en lugar de mezclar módulos del CRM.
  const broadAnalysis = intent === "summary";
  const asksForExplicitActivities = /actividades?|seguimientos? vencid|seguimientos? con fechas|tareas?|llamadas?|reuniones?|correos?/.test(prompt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
  const isProspectRecommendation = intent === "prospect_urgency" || intent === "commercial_recommendation";
  const showActivities = intent === "activities" || (intent === "commercial_recommendation" && asksForExplicitActivities) || broadAnalysis;
  const showOpportunities = intent === "opportunities" || broadAnalysis;
  const showProspects = intent === "prospects" || isProspectRecommendation || broadAnalysis;
  const now = Date.now();

  const isPendingStatus = (status: string) => ["pending", "in_progress"].includes((status ?? "").trim().toLowerCase());
  const pending = activities.filter((item) => isPendingStatus(item.status));
  const invalidDateActivities = pending.filter((item) =>
    item.due_at !== null && !isValidActivityDueDate(item.due_at, item.created_at)
  );
  const invalidDateIds = new Set(invalidDateActivities.map((item) => item.id));
  const overdue = pending.filter((item) =>
    item.due_at !== null &&
    !invalidDateIds.has(item.id) &&
    new Date(item.due_at).getTime() < now
  );
  const normalizeCrmValue = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();
  const activeStages = new Set(["qualification", "diagnosis", "proposal", "negotiation"]);
  const closedStages = new Set(["won", "lost"]);
  const activeOpps = opportunities.filter((item) => activeStages.has(normalizeCrmValue(item.stage)));
  const unknownStageOpps = opportunities.filter((item) => !activeStages.has(normalizeCrmValue(item.stage)) && !closedStages.has(normalizeCrmValue(item.stage)));
  const opportunityById = new Map(opportunities.map((item) => [item.id, item]));
  const prospectById = new Map(prospects.map((item) => [item.id, item]));
  const resolveActivityProspect = (activity: Activity) => {
    const prospectId = resolveActivityProspectId(activity, opportunities);
    return prospectId ? prospectById.get(prospectId) ?? null : null;
  };
  const isActivityRelatedToOpportunity = (activity: Activity, opportunity: Opportunity) =>
    activity.opportunity_id === opportunity.id;
  const activityAssociationLabel = (activity: Activity) => {
    const linkedOpportunity = activity.opportunity_id ? opportunityById.get(activity.opportunity_id) : undefined;
    const direct = activity.prospect_id ? prospectById.get(activity.prospect_id) ?? null : null;
    if (linkedOpportunity && direct && direct.id !== linkedOpportunity.prospect_id) return " · Asociación inconsistente: prospecto y oportunidad no coinciden";
    const related = resolveActivityProspect(activity);
    return related ? " · " + related.full_name : " · Sin prospecto asociado";
  };
  const activityRecommendation = (activity: Activity) => {
    const kind = normalizeCrmValue(activity.activity_type);
    const related = resolveActivityProspect(activity);
    if (!related) return "Identificar y vincular correctamente el prospecto antes de ejecutar el seguimiento.";
    if (kind === "call") return "Realizar la llamada pendiente, registrar el resultado y acordar una próxima acción con fecha.";
    if (kind === "meeting") return "Confirmar la reunión, preparar los antecedentes y registrar acuerdos y próximos pasos.";
    if (kind === "email") return "Revisar el contexto y enviar o responder el correo; registrar la respuesta y la próxima acción.";
    if (kind === "follow_up") return "Retomar el contacto, registrar si respondió y dejar programado el siguiente paso.";
    return "Revisar el compromiso, contactar por el canal disponible y registrar el resultado y la próxima acción.";
  };
  const activityDateState = (activity: Activity) => {
    if (invalidDateIds.has(activity.id)) return "fecha inválida";
    if (!activity.due_at) return "sin fecha";
    const timestamp = new Date(activity.due_at).getTime();
    if (!Number.isFinite(timestamp)) return "fecha inválida";
    return timestamp < now ? "vencida" : "programada";
  };
  const prioritizationProfile = profile ? {
    description: profile.description,
    products_services: profile.products_services,
    ideal_customer: profile.ideal_customer,
  } : null;
  const prioritizedByPotential = prioritizeProspects(prospects, opportunities, activities, prioritizationProfile, now);
  // El ranking reutiliza las mismas colecciones que alimentan el resumen:
  // no vuelve a inferir qué actividades están pendientes o vencidas.
  // Esto evita que una actividad visible como vencida termine evaluada como baja.
  const urgencyOrder = { high: 0, medium: 1, not_evaluable: 2, low: 3 };
  const prioritizedByUrgency = prioritizedByPotential
    .map((item) => {
      const belongsToProspect = (activity: Activity) =>
        resolveActivityProspect(activity)?.id === item.prospect.id;
      const linkedPending = pending.filter(belongsToProspect);
      const linkedOverdue = overdue.filter(belongsToProspect);
      const linkedInvalid = invalidDateActivities.filter(belongsToProspect);
      const validLinkedPending = linkedPending.filter((activity) => !invalidDateIds.has(activity.id));
      const highPrioritySoon = validLinkedPending.filter((activity) => {
        if (!activity.due_at || normalizeCrmValue(activity.priority) !== "high") return false;
        const due = new Date(activity.due_at).getTime();
        return Number.isFinite(due) && due >= now && due - now <= 48 * 3600000;
      });
      const urgency = linkedOverdue.length
        ? {
            level: "high" as const,
            reasons: linkedOverdue.map((activity) => "Actividad vencida: " + activity.title),
            nextAction: "Atender primero la actividad vencida y registrar el resultado del contacto.",
          }
        : highPrioritySoon.length
          ? {
              level: "high" as const,
              reasons: highPrioritySoon.map((activity) => "Compromiso de prioridad alta próximo: " + activity.title),
              nextAction: "Preparar el compromiso próximo y confirmar el siguiente paso.",
            }
          : validLinkedPending.length
            ? {
                level: "medium" as const,
                reasons: validLinkedPending.map((activity) =>
                  activity.due_at ? "Actividad programada: " + activity.title : "Acción pendiente sin fecha: " + activity.title
                ),
                nextAction: "Revisar las actividades pendientes y completar el seguimiento.",
              }
            : linkedInvalid.length
              ? {
                  level: "not_evaluable" as const,
                  reasons: linkedInvalid.map((activity) => "Fecha inválida que requiere revisión: " + activity.title),
                  nextAction: "Corregir la fecha de la actividad antes de clasificar su urgencia.",
                }
              : {
                  level: "low" as const,
                  reasons: ["No hay actividades pendientes asociadas."],
                  nextAction: "Mantener seguimiento según el ciclo comercial.",
                };
      return { ...item, urgency };
    })
    .sort((a, b) => {
      const difference = urgencyOrder[a.urgency.level] - urgencyOrder[b.urgency.level];
      if (difference) return difference;
      const classOrder = { sufficient: 0, provisional: 1, insufficient: 2, excluded: 3 };
      const classDifference = classOrder[a.potential.classification] - classOrder[b.potential.classification];
      if (classDifference) return classDifference;
      if (a.potential.score !== null && b.potential.score !== null && a.potential.score !== b.potential.score) {
        return b.potential.score - a.potential.score;
      }
      if (a.potential.coverage !== b.potential.coverage) return b.potential.coverage - a.potential.coverage;
      return a.prospect.full_name.localeCompare(b.prospect.full_name, "es");
    });
  const prioritized = intent === "prospect_urgency" ? prioritizedByUrgency : prioritizedByPotential;
  const normalizedIdentity = (value: string | null | undefined) =>
    (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
  const identityKey = (prospect: Prospect) => {
    const email = normalizedIdentity(prospect.email);
    return email || normalizedIdentity(prospect.full_name) + "|" + normalizedIdentity(prospect.company_name);
  };
  const duplicateKeys = new Set<string>();
  const seenKeys = new Set<string>();
  for (const prospect of prospects) {
    const key = identityKey(prospect);
    if (key.replace(/\|/g, "").trim() && seenKeys.has(key)) duplicateKeys.add(key);
    seenKeys.add(key);
  }
  const possibleDuplicateCount = duplicateKeys.size;
  const safeCompanyName = (value: string | null) => {
    if (!value) return "";
    const compact = value.trim();
    const looksLikeRut = /^(?:\d{1,2}\.\d{3}\.\d{3}|\d{7,8})-[0-9kK]$/.test(compact);
    return looksLikeRut ? "" : compact;
  };
  const statusLabels: Record<string, string> = {
    new: "Nuevo", contacted: "Contactado", qualified: "Calificado",
    proposal: "Propuesta", negotiation: "Negociación", won: "Ganado", lost: "Perdido",
  };
  const stageLabels: Record<string, string> = {
    qualification: "Calificación", diagnosis: "Diagnóstico", proposal: "Propuesta",
    negotiation: "Negociación", won: "Ganada", lost: "Perdida",
  };
  const activityLabels: Record<string, string> = {
    task: "Tarea", call: "Llamada", meeting: "Reunión",
    email: "Correo", follow_up: "Seguimiento",
  };
  const dateLabel = (value: string | null) => {
    if (!value) return "Sin fecha";
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" }) : "Fecha inválida";
  };

  const asksForDraft = isExplicitDraftRequest(prompt);
  if (asksForDraft) {
    const matches = matchCrmProspects(prompt, prospects, opportunities, activities);
    if (matches.length !== 1) {
      return header + "BORRADOR DE MENSAJE PERSONALIZADO\n" +
        (matches.length > 1
          ? "Encontré más de un prospecto que coincide. Indica el nombre completo o la empresa exacta para evitar redactar para la persona equivocada."
          : "Para personalizar el mensaje necesito que indiques el nombre completo o la empresa tal como aparece en el CRM. No usaré datos de otro registro ni inventaré contexto.") +
        "\n\nNo se ha enviado ningún mensaje ni modificado ningún registro.";
    }
    const prospect = matches[0];
    const linkedOpps = opportunities.filter((item) => item.prospect_id === prospect.id && activeStages.has(normalizeCrmValue(item.stage)));
    const linkedActivities = activities.filter((item) =>
      resolveActivityProspect(item)?.id === prospect.id && isPendingStatus(item.status)
    );
    const notes = prospect.notes?.trim() ?? "";
    const service = profile?.products_services?.trim() ?? "";
    const company = safeCompanyName(prospect.company_name);
    const status = normalizeCrmValue(prospect.status);
    const isFollowUp = /seguimiento|retomar|no responde|anterior|ya le escribi|ya le escribí/.test(normalized);
    const asksForMeeting = /reunion|reunión|agendar|agenda|coordinar|juntarnos|conversar/.test(normalized);
    const firstName = prospect.full_name.trim().split(/\s+/)[0] ?? "";
    const greeting = /^(test|demo|contacto|empresa|usuario|prueba)$/i.test(firstName) ? "Hola," : "Hola " + firstName + ",";
    let body = "";
    if (status === "proposal" || linkedOpps.some((item) => ["proposal", "negotiation"].includes(normalizeCrmValue(item.stage)))) {
      body = greeting + "\n\nQuería retomar la propuesta que estamos revisando" +
        (company ? " para " + company : "") +
        ". ¿Pudiste revisarla? Me gustaría conocer tus dudas y confirmar cuál sería el siguiente paso para avanzar.";
    } else if (isFollowUp || status === "contacted") {
      body = greeting + "\n\nRetomo el contacto para saber si sigue siendo oportuno conversar sobre " +
        (service || "la solución que podemos aportar") +
        ". ¿Es una prioridad que estés evaluando actualmente?";
    } else {
      body = greeting + "\n\nTe contacto porque estamos trabajando en " +
        (service || "soluciones para apoyar procesos comerciales") +
        (company ? " y quería abrir una conversación con " + company : "") +
        ". ¿Te interesaría conversar brevemente para conocer si existe alguna oportunidad de colaboración?";
    }
    if (asksForMeeting && !/reunion|reunión/.test(body)) {
      body += "\n\n¿Te parece que coordinemos una reunión breve esta semana para revisar el tema y acordar los próximos pasos? ¿Qué día y horario te acomoda?";
    }
    const evidence = [
      "Nombre registrado: " + prospect.full_name,
      company ? "Empresa registrada: " + company : "Empresa: no registrada",
      "Estado CRM: " + (statusLabels[status] ?? prospect.status),
      notes ? "Notas registradas: " + notes : "Notas comerciales: no registradas",
      linkedOpps.length ? "Oportunidades activas: " + linkedOpps.map((item) => item.title + " (" + (stageLabels[item.stage] ?? item.stage) + ")").join(", ") : "Oportunidades activas: ninguna registrada",
      linkedActivities.length ? "Actividades pendientes: " + linkedActivities.map((item) => item.title).join(", ") : "Actividades pendientes: ninguna registrada",
    ];
    const missing = [];
    if (!company) missing.push("empresa");
    if (!notes) missing.push("necesidad o contexto específico");
    if (!service) missing.push("producto o servicio ofrecido en el perfil comercial");
    return header + "BORRADOR DE MENSAJE PERSONALIZADO\n" +
      "Prospecto: " + prospect.full_name + (company ? " · " + company : "") + "\n" +
      "Objetivo: " + (asksForMeeting
        ? "reactivar la conversación y conseguir una reunión"
        : status === "proposal" || linkedOpps.some((item) => ["proposal", "negotiation"].includes(normalizeCrmValue(item.stage)))
          ? "obtener respuesta y acordar el siguiente paso de la propuesta"
          : isFollowUp || status === "contacted" ? "retomar la conversación y validar interés actual" : "iniciar conversación y validar interés") +
      "\n\nMENSAJE\n" + body +
      "\n\nDATOS UTILIZADOS DEL CRM\n- " + evidence.join("\n- ") +
      (missing.length ? "\n\nPARA MEJORAR LA PERSONALIZACIÓN FALTA\n- " + missing.join("\n- ") : "") +
      "\n\nEl texto es un borrador editable. No se han enviado mensajes ni modificado registros. Revisa que el contexto siga vigente antes de usarlo.";
  }

  if (intent === "general") {
    return header +
      "Esta consulta parece ser de estrategia comercial general y no requiere consultar registros del CRM. " +
      "Cambia al modo OpenAI para analizar cómo mejorar tus ventas. " +
      "Si quieres una respuesta basada en tus datos, pregunta por prospectos, seguimientos u oportunidades concretas.";
  }

  if (!prospects.length && !opportunities.length && !activities.length) {
    return header + "Todavía no hay registros comerciales en tu espacio. Registra prospectos, oportunidades o actividades para comenzar.";
  }

  if (intent === "potential_urgency_comparison") {
    const potentialTop = prioritizedByPotential.slice(0, 5);
    const attentionTop = prioritizedByUrgency.filter((item) => ["high", "medium", "not_evaluable"].includes(item.urgency.level)).slice(0, 5);
    const formatItem = (item: typeof prioritizedByPotential[number], index: number) => {
      const company = safeCompanyName(item.prospect.company_name);
      const score = item.potential.score === null ? "sin puntuación" : item.potential.score + "/100";
      const confidence = item.potential.classification === "sufficient" ? "suficiente" : item.potential.classification === "provisional" ? "provisional" : "insuficiente";
      return (index + 1) + ". " + item.prospect.full_name + (company ? " · " + company : "") +
        " · Potencial: " + score + " · Cobertura: " + item.potential.coverage + "% · Evidencia: " + confidence +
        " · Urgencia: " + item.urgency.level.toUpperCase() + " · " + item.urgency.reasons.join("; ");
    };
    return header + "COMPARACIÓN DE POTENCIAL COMERCIAL Y ATENCIÓN INMEDIATA\n\n" +
      "MAYOR POTENCIAL COMERCIAL (ordenado por potencial, sin usar vencimientos como criterio de orden):\n" +
      (potentialTop.length ? potentialTop.map(formatItem).join("\n") : "No hay prospectos activos para evaluar.") +
      "\n\nREQUIEREN ATENCIÓN OPERATIVA (ordenados por urgencia):\n" +
      (attentionTop.length ? attentionTop.map(formatItem).join("\n") : "No hay actividades asociadas que indiquen una atención inmediata o próxima.") +
      (pending.some((item) => !resolveActivityProspect(item))
        ? "\n\nACTIVIDADES QUE REQUIEREN CORRECCIÓN DE VÍNCULO:\n" +
          pending.filter((item) => !resolveActivityProspect(item)).map((item, index) =>
            (index + 1) + ". " + item.title + " · " + activityDateState(item) + " · Vence: " + dateLabel(item.due_at) +
            " · " + activityRecommendation(item)
          ).join("\n") +
          "\nEstas actividades aparecen en el resumen general, pero no se atribuyen a un prospecto hasta corregir su vínculo."
        : "") +
      "\n\nDIFERENCIA: el potencial estima el atractivo comercial según la evidencia registrada; la urgencia indica cuándo conviene actuar por vencimientos, compromisos próximos o fechas por revisar. Un prospecto puede tener alto potencial y baja urgencia, o bajo potencial y alta urgencia.\n\nNo se han modificado registros ni enviado mensajes.";
  }

  if (intent === "prospect_detail") {
    const matches = matchCrmProspects(prompt, prospects, opportunities, activities);
    if (matches.length !== 1) {
      return header + "ESTADO COMERCIAL DEL PROSPECTO\n" +
        (matches.length > 1 ? "La consulta coincide con más de un registro. Indica el nombre completo o la empresa exacta para evitar mezclar oportunidades."
          : "No encontré un prospecto con esa identidad en el contexto cargado. Comprueba el nombre o la empresa tal como aparecen en el CRM.") +
        "\n\nNo se muestran datos de otros registros ni datos personales de contacto.";
    }
    const selected = matches[0];
    const result = prioritizedByPotential.find((item) => item.prospect.id === selected.id);
    const linkedOpps = opportunities.filter((item) => item.prospect_id === selected.id);
    const linkedActivities = pending.filter((item) => resolveActivityProspect(item)?.id === selected.id);
    const activityLines = linkedActivities.map((item) =>
      "- " + item.title + " · " + activityDateState(item) + " · Vence: " + dateLabel(item.due_at) + " · " + activityRecommendation(item)
    );
    const statusLabel = statusLabels[normalizeCrmValue(selected.status)] ?? selected.status;
    const opportunityLines = linkedOpps.map((item) =>
      "- " + item.title + " · Etapa: " + (stageLabels[normalizeCrmValue(item.stage)] ?? item.stage) +
      " · Valor: " + Number(item.estimated_value || 0).toLocaleString("es-CL") + " " + item.currency +
      (item.expected_close_date ? " · Cierre estimado: " + item.expected_close_date : "")
    );
    return header + "ESTADO COMERCIAL DEL PROSPECTO\n" +
      selected.full_name + (safeCompanyName(selected.company_name) ? " · " + safeCompanyName(selected.company_name) : "") +
      "\nEstado CRM: " + statusLabel +
      "\nPotencial: " + (!result || result.potential.score === null ? "sin clasificación" : result.potential.score + "/100") +
      " · Cobertura: " + (result?.potential.coverage ?? 0) + "%" + " · Urgencia: " + (result?.urgency.level ?? "no evaluable").toUpperCase() +
      "\n\nOPORTUNIDADES VINCULADAS A ESTE PROSPECTO\n" + (opportunityLines.length ? opportunityLines.join("\n") : "No registra oportunidades vinculadas en el contexto cargado.") +
      "\n\nACTIVIDADES PENDIENTES VINCULADAS\n" + (activityLines.length ? activityLines.join("\n") : "No registra actividades pendientes vinculadas.") +
      (result ? "\n\nSIGUIENTE ACCIÓN RECOMENDADA\n" + (result.urgency.level === "high" || result.urgency.level === "not_evaluable" ? result.urgency.nextAction : result.nextAction) : "") +
      "\n\nLa consulta no incluye RUT, teléfono ni correo. No se han modificado registros ni enviado mensajes.";
  }

  if (intent === "explain_all") {
    const explanations = prioritizedByPotential.map((item, index) => {
      const potential = item.potential;
      const breakdown = potential.criteria.map((criterion) =>
        "  - " + criterion.name + ": " + (criterion.points === null ? "No evaluado" : criterion.points + "/" + criterion.weight + " puntos") + ". " + criterion.reason
      ).join("\n");
      return (index + 1) + ". " + item.prospect.full_name + (item.prospect.company_name ? " · " + item.prospect.company_name : "") +
        "\n  Potencial: " + (potential.score === null ? "sin clasificación" : potential.score + "/100") +
        " · Cobertura: " + potential.coverage + "% · Confiabilidad: " +
        (potential.classification === "sufficient" ? "mayor (cobertura suficiente)" : potential.classification === "provisional" ? "limitada (cobertura parcial)" : "baja (evidencia insuficiente)") +
        "\n  Criterios evaluados:\n" + (breakdown || "  - Sin criterios evaluables.") +
        "\n  Información faltante: " + (potential.missingEvidence.length ? potential.missingEvidence.join(", ") : "ninguna detectada") +
        "\n  Urgencia independiente: " + item.urgency.level.toUpperCase() + " · " + item.urgency.reasons.join("; ");
    });
    return header + "EXPLICACIÓN DEL POTENCIAL DE CADA PROSPECTO ACTIVO\n\n" +
      (explanations.length ? explanations.join("\n\n") : "No hay prospectos activos para explicar.") +
      "\n\nMETODOLOGÍA: la puntuación es heurística y se calcula solo con criterios respaldados por datos. La cobertura indica qué parte del modelo pudo evaluarse; un puntaje con cobertura baja no debe interpretarse como potencial confirmado.\n\nNo se han modificado registros ni enviado mensajes.";
  }

  if (intent === "explain_prospect") {
    const matches = matchCrmProspects(prompt, prospects, opportunities, activities);
    const selected = matches.length === 1
      ? prioritizedByPotential.find(({ prospect }) => prospect.id === matches[0].id)
      : undefined;
    if (!selected) {
      return header + "EXPLICACIÓN DE PUNTUACIÓN\nNo puedo identificar con seguridad a qué prospecto te refieres. Indícame su nombre completo o empresa y te mostraré el desglose de criterios, puntos, evidencia, cobertura y datos faltantes.\n\nNo se han modificado registros ni enviado mensajes.";
    }
    const p = selected.prospect;
    const potential = selected.potential;
    const company = p.company_name ? " · " + p.company_name : "";
    const breakdown = potential.criteria.map((criterion) =>
      "- " + criterion.name + ": " +
      (criterion.points === null ? "No evaluado" : criterion.points + "/" + criterion.weight + " puntos") +
      ". " + criterion.reason
    ).join("\n");
    return header + "EXPLICACIÓN DE PUNTUACIÓN\n" +
      p.full_name + company + "\n" +
      "Potencial: " + (potential.score === null ? "Sin clasificación" : potential.score + "/100") +
      " · Cobertura: " + potential.coverage + "% · Clasificación: " + potential.classification + "\n\n" +
      "DESGLOSE DE CRITERIOS\n" + breakdown + "\n\n" +
      "Urgencia de gestión: " + ({ high: "ALTA", medium: "MEDIA", low: "BAJA", not_evaluable: "NO EVALUABLE" }[selected.urgency.level]) + ". " + selected.urgency.reasons.join("; ") + "\n" +
      (potential.missingEvidence.length ? "Información faltante: " + potential.missingEvidence.join(", ") + "\n" : "No se detectan criterios faltantes.\n") +
      "\nLa puntuación es una evaluación heurística basada en los datos registrados, no una predicción de cierre. No se han modificado registros ni enviado mensajes.";
  }

  if (intent === "missing_information") {
    const incomplete = prioritized.filter((item) => item.potential.missingEvidence.length > 0);
    const details = incomplete.slice(0, 10).map((item) =>
      "- " + item.prospect.full_name +
      (item.prospect.company_name ? " · " + item.prospect.company_name : "") +
      ": completar " + item.potential.missingEvidence.join(", ") +
      (item.potential.classification === "insufficient" ? " (evidencia insuficiente)" : " (clasificación " + item.potential.classification + ")")
    );
    const profileMissing = [];
    if (!profile?.ideal_customer?.trim()) profileMissing.push("cliente ideal");
    if (!profile?.products_services?.trim()) profileMissing.push("productos o servicios");
    if (!profile?.description?.trim()) profileMissing.push("descripción del negocio");
    return header + "INFORMACIÓN QUE FALTA PARA PRIORIZAR MEJOR\n" +
      (details.length ? details.join("\n") : "Los prospectos activos tienen evidencia en todos los criterios evaluables.") +
      (profileMissing.length ? "\n\nCOMPLETAR PERFIL DEL NEGOCIO\n- " + profileMissing.join("\n- ") : "") +
      "\n\nPrioriza registrar necesidad e intención, completar el perfil del cliente ideal y registrar las interacciones comerciales cuando se realicen. No se han modificado registros ni enviado mensajes.";
  }

  let response = header;

  if (showActivities) {
    response += "ACTIVIDADES Y SEGUIMIENTOS\n";
    response += overdue.length
      ? "VENCIDAS:\n" + overdue.map((item, index) =>
          (index + 1) + ". " + item.title + activityAssociationLabel(item) +
          " · " + (activityLabels[normalizeCrmValue(item.activity_type)] ?? item.activity_type) +
          " · Vencía: " + dateLabel(item.due_at) + " · Prioridad: " + item.priority +
          "\n   Siguiente acción: " + activityRecommendation(item)
        ).join("\n")
      : "VENCIDAS: No hay actividades vencidas con fechas válidas.";
    response += "\n";
    response += invalidDateActivities.length
      ? "FECHAS INVÁLIDAS (requieren revisión):\n" + invalidDateActivities.map((item) =>
          "- " + item.title + activityAssociationLabel(item) + " · Fecha registrada: " + dateLabel(item.due_at) +
          " · Revisar y corregir la fecha en el módulo Actividades."
        ).join("\n")
      : "FECHAS INVÁLIDAS: No se detectan fechas inválidas.";
    response += "\n";
    const undatedPending = pending.filter((item) => !item.due_at);
    response += undatedPending.length
      ? "PENDIENTES SIN FECHA:\n" + undatedPending.map((item) =>
          "- " + item.title + activityAssociationLabel(item) + " · Prioridad: " + item.priority +
          " · Definir fecha y responsable antes de dejarla programada."
        ).join("\n")
      : "PENDIENTES SIN FECHA: No hay actividades pendientes sin fecha.";
    response += "\n";
    const upcoming = pending.filter((item) => item.due_at && !invalidDateIds.has(item.id) && new Date(item.due_at).getTime() >= now);
    response += upcoming.length
      ? "PRÓXIMAS:\n" + upcoming.slice(0, 10).map((item) => "- " + item.title + activityAssociationLabel(item) + " · " + dateLabel(item.due_at)).join("\n")
      : "PRÓXIMAS: No hay actividades futuras pendientes con fecha válida.";
    response += "\n\n";
  }

  if (showOpportunities) {
    response += "OPORTUNIDADES ACTIVAS\n";
    response += activeOpps.length
      ? activeOpps.slice(0, 10).map((item, index) => {
          const prospect = prospectById.get(item.prospect_id);
          const ageDays = Math.max(0, Math.floor((now - new Date(item.created_at).getTime()) / 86400000));
          const relatedActivities = pending.filter((activity) => isActivityRelatedToOpportunity(activity, item));
          return (index + 1) + ". " + item.title +
            (prospect ? " · " + prospect.full_name : "") +
            " · Etapa: " + (stageLabels[normalizeCrmValue(item.stage)] ?? item.stage) +
            " · Valor: " + Number(item.estimated_value || 0).toLocaleString("es-CL") + " " + item.currency +
            " · Creada hace " + ageDays + " días" +
            " · Seguimientos pendientes asociados: " + relatedActivities.length +
            (item.expected_close_date ? " · Cierre estimado: " + item.expected_close_date : "");
        }).join("\n")
      : "No hay oportunidades activas registradas.";
    response += "\n";
    const opportunityRecommendations = activeOpps.map((opportunity) => {
      const prospect = prospectById.get(opportunity.prospect_id);
      const linkedPending = pending.filter((activity) =>
        isActivityRelatedToOpportunity(activity, opportunity)
      );
      const linkedOverdue = linkedPending.filter((activity) =>
        activity.due_at !== null &&
        !invalidDateIds.has(activity.id) &&
        new Date(activity.due_at).getTime() < now
      );
      const closeAt = opportunity.expected_close_date
        ? new Date(opportunity.expected_close_date + "T23:59:59").getTime()
        : null;
      const closeDays = closeAt !== null && Number.isFinite(closeAt)
        ? Math.ceil((closeAt - now) / 86400000)
        : null;
      const closeDatePassed = closeDays !== null && closeDays < 0;
      const closeDateSoon = closeDays !== null && closeDays >= 0 && closeDays <= 7;
      const priority = linkedOverdue.length || closeDatePassed || closeDateSoon
        ? "ALTA"
        : linkedPending.length || ["proposal", "negotiation"].includes(normalizeCrmValue(opportunity.stage))
          ? "MEDIA"
          : "BAJA";
      const priorityReason = linkedOverdue.length
        ? "Tiene un seguimiento vencido que requiere atención."
        : closeDatePassed
          ? "La fecha estimada de cierre ya pasó; hay que confirmar el estado real."
          : closeDateSoon
            ? "La fecha estimada de cierre está dentro de los próximos 7 días."
            : linkedPending.length || ["proposal", "negotiation"].includes(normalizeCrmValue(opportunity.stage))
              ? "Está en una etapa avanzada o tiene una actividad pendiente."
              : "No hay señales registradas de urgencia inmediata.";
      const nextAction = linkedOverdue.length
        ? "Atender primero el seguimiento vencido (" + linkedOverdue.map((activity) => activity.title).join(", ") + ") y registrar el resultado."
        : normalizeCrmValue(opportunity.stage) === "negotiation"
          ? "Contactar al decisor, resolver dudas pendientes y acordar una fecha concreta de decisión."
          : normalizeCrmValue(opportunity.stage) === "proposal"
            ? "Confirmar recepción y comprensión de la propuesta; resolver objeciones y acordar el próximo contacto."
            : normalizeCrmValue(opportunity.stage) === "diagnosis"
              ? "Completar el diagnóstico y validar alcance, necesidad, presupuesto y decisores."
              : "Confirmar necesidad, urgencia y criterios para avanzar a diagnóstico.";
      return { opportunity, prospect, linkedPending, linkedOverdue, priority, priorityReason, nextAction, closeDays };
    }).sort((a, b) => {
      const order = { ALTA: 0, MEDIA: 1, BAJA: 2 };
      return order[a.priority as keyof typeof order] - order[b.priority as keyof typeof order];
    });
    response += "RECOMENDACIÓN DE PRIORIDAD Y SIGUIENTE ACCIÓN\n" +
      (opportunityRecommendations.length
        ? opportunityRecommendations.map((item, index) =>
            (index + 1) + ". PRIORIDAD " + item.priority + " · " + item.opportunity.title +
            (item.prospect ? " · " + item.prospect.full_name : "") +
            (item.linkedPending.length ? "\n   Seguimiento pendiente: " + item.linkedPending.map((activity) => activity.title).join(", ") : "\n   Seguimiento pendiente: ninguno registrado") +
            (item.closeDays !== null ? "\n   Días hasta el cierre estimado: " + item.closeDays : "") +
            "\n   Motivo: " + item.priorityReason +
            "\n   Siguiente acción recomendada: " + item.nextAction +
            (item.linkedOverdue.length
              ? "\n   Cómo registrar el resultado: después del contacto, marca la actividad como completada y registra fecha y canal, respuesta, objeciones, compromiso acordado y próxima acción con fecha. Si no responde, registra el intento y programa el siguiente seguimiento."
              : "")
          ).join("\n\n")
        : "No hay oportunidades activas para priorizar.") + "\n";
    const noNextStep = activeOpps.filter((item) =>
      !pending.some((activity) => isActivityRelatedToOpportunity(activity, item))
    );
    if (noNextStep.length) {
      response += "REQUIEREN DEFINIR PRÓXIMO PASO:\n" +
        noNextStep.map((item) => "- " + item.title + ": no tiene una actividad pendiente asociada.").join("\n") + "\n";
    }
    if (unknownStageOpps.length) {
      response += "ETAPAS POR REVISAR:\n" +
        unknownStageOpps.map((item) => "- " + item.title + ": etapa no reconocida (" + item.stage + "). No se incluye como oportunidad activa hasta corregirla.").join("\n") + "\n";
    }
    if (/estancad|sin mov|parad/i.test(normalized)) {
      response += "LÍMITE DEL ANÁLISIS: no existe historial de cambios de etapa, por lo que no puedo confirmar inactividad o estancamiento. La antigüedad por sí sola no lo demuestra.\n";
    }
    response += "\n";
  }

  if (isProspectRecommendation) {
    const unassignedPending = pending.filter((item) => !resolveActivityProspect(item));
    if (unassignedPending.length) {
      response += "\n\nACTIVIDADES PENDIENTES SIN ASOCIACIÓN VÁLIDA\n" +
        unassignedPending.map((item, index) =>
          (index + 1) + ". " + item.title + " · " + activityDateState(item) +
          " · Vence: " + dateLabel(item.due_at) +
          " · " + activityRecommendation(item)
        ).join("\n") +
        "\nEstas actividades cuentan en el resumen general, pero no se atribuyen a un prospecto hasta corregir su vínculo. Revisa el prospecto y la oportunidad asociados en el módulo Actividades.";
    }
  }

  if (showProspects) {
    if (isProspectRecommendation) {
      const firstUrgent = prioritized.find((item) => item.urgency.level === "high" || item.urgency.level === "medium");
      const firstCommercialCandidate = prioritizedByPotential.find((item) =>
        item.potential.score !== null && item.potential.classification !== "insufficient"
      );
      // Una recomendación por urgencia solo puede desplazar al candidato comercial
      // si todavía existe un compromiso pendiente que justifique esa prioridad.
      // Así, las actividades completadas no mantienen una urgencia obsoleta.
      const hasPendingCommitment = pending.length > 0;
      const recommendationUsesUrgency =
        intent === "prospect_urgency" && hasPendingCommitment && Boolean(firstUrgent);
      const recommendation = intent === "commercial_recommendation"
        ? firstCommercialCandidate
        : recommendationUsesUrgency
          ? firstUrgent
          : firstCommercialCandidate;
      response += recommendation
        ? "RECOMENDACIÓN PRINCIPAL PARA HOY\n" +
          (recommendationUsesUrgency
            ? "Contacta primero a "
            : !hasPendingCommitment
              ? "No hay compromisos urgentes registrados. Como siguiente acción comercial, considera contactar a "
              : "El mejor candidato comercial según la evidencia disponible es ") +
          recommendation.prospect.full_name +
          (safeCompanyName(recommendation.prospect.company_name) ? " · " + safeCompanyName(recommendation.prospect.company_name) : "") +
          (recommendationUsesUrgency
            ? ". Motivo: " + recommendation.urgency.reasons.join("; ")
            : ". Motivo: mejor posición disponible en el ranking de potencial, con " +
              recommendation.potential.score + "/100 y cobertura de " + recommendation.potential.coverage +
              "%. Esta es una señal heurística, no una predicción de cierre.") +
          " Siguiente paso: " +
          (recommendation.urgency.level === "high" || recommendation.urgency.level === "medium"
            ? recommendation.urgency.nextAction
            : getSegmentAction(segment, recommendation.prospect)) + "\n\n"
        : "RECOMENDACIÓN PRINCIPAL PARA HOY\nNo hay urgencias ni evidencia comercial suficiente para recomendar un prospecto con confianza. Completa necesidad, intención, perfil de cliente ideal y datos de contacto antes de priorizar.\n\n";
    }
    response += intent === "prospect_urgency"
      ? "PROSPECTOS ORDENADOS POR URGENCIA DE CONTACTO\n"
      : intent === "commercial_recommendation"
        ? "PROSPECTOS EVALUADOS PARA RECOMENDACIÓN COMERCIAL\n"
        : "PROSPECTOS PRIORIZADOS POR POTENCIAL COMERCIAL\n";
    response += prioritized.length
      ? prioritized.slice(0, 10).map((item, index) => {
          const p = item.prospect;
          const company = safeCompanyName(p.company_name);
          const related = opportunities.filter((opportunity) => opportunity.prospect_id === p.id && activeStages.has(normalizeCrmValue(opportunity.stage)));
          const nextActivity = pending.find((activity) => resolveActivityProspect(activity)?.id === p.id && !invalidDateIds.has(activity.id));
          const potentialLabel = (item.potential.score === null ? "Sin puntuación" : item.potential.score + "/100") +
            " · cobertura " + item.potential.coverage + "% · evidencia " +
            (item.potential.classification === "sufficient" ? "suficiente" : item.potential.classification === "provisional" ? "provisional" : "insuficiente");
          const urgencyLabel = item.urgency.level === "high" ? "ALTA" :
            item.urgency.level === "medium" ? "MEDIA" :
            item.urgency.level === "low" ? "BAJA" : "NO EVALUABLE";
          const action = isProspectRecommendation
            ? (item.urgency.level !== "low" ? item.urgency.nextAction : getSegmentAction(segment, p))
            : (item.urgency.level === "high" || item.urgency.level === "not_evaluable" ? item.urgency.nextAction : getSegmentAction(segment, p));
          return (index + 1) + ". " + p.full_name +
            (company ? " · " + company : "") +
            " · " + (statusLabels[normalizeCrmValue(p.status)] ?? p.status) +
            "\n   Potencial comercial: " + potentialLabel +
            "\n   Urgencia de gestión: " + urgencyLabel +
            (related.length ? " · Oportunidades activas: " + related.length : "") +
            (nextActivity ? "\n   Actividad relacionada: " + nextActivity.title + " · " + activityDateState(nextActivity) + " · Vence: " + dateLabel(nextActivity.due_at) : "") +
            "\n   Evidencia: " + (item.potential.reasons.join("; ") || "No hay evidencia comercial suficiente.") +
            (item.potential.missingEvidence.length ? "\n   Falta información: " + item.potential.missingEvidence.join(", ") : "") +
            "\n   Urgencia: " + item.urgency.reasons.join("; ") +
            "\n   Siguiente acción: " + action;
        }).join("\n\n")
      : "No hay prospectos activos para priorizar.";
    if (possibleDuplicateCount > 0) {
      response += "\n\nAVISO DE POSIBLES DUPLICADOS\nSe detectaron " + possibleDuplicateCount +
        " identidad(es) repetida(s). Los registros se mantienen y se evalúan individualmente; no se fusionan ni se eliminan.";
    }
    response += "\n\n";
  }

  if (showProspects) {
    response += "CRITERIOS Y LÍMITES\n";
    response += "La prioridad de prospectos usa reglas locales transparentes; no es una predicción de cierre. No se han modificado registros ni enviado mensajes.";
  } else {
    response += "No se han modificado registros ni enviado mensajes.";
  }
  return response;
}

/** Redacta datos personales aunque hayan sido guardados por error en campos de nombre o empresa. */
export function buildCrmAnswer(prompt: string, context: CommercialContext, segment: BusinessSegment) {
  const response = buildCrmAnswerInternal(prompt, context, segment);
  return response
    .replace(/\b\d{1,2}(?:\.\d{3}){2}-[0-9kK]\b/g, "[RUT oculto]")
    .replace(/\b\d{7,8}-[0-9kK]\b/g, "[RUT oculto]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[correo oculto]")
    .replace(/(?:\+?56[\s-]?)?9(?:[\s-]?\d){8}\b/g, "[teléfono oculto]");
}

export function AssistantChat() {
  const [mode, setMode] = useState<AssistantMode>("crm");
  const [segment, setSegment] = useState<BusinessSegment>("agency");
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: welcomeMessage }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadBusinessSegment() {
      const cached = window.localStorage.getItem("upscale-business-segment");
      if (cached === "agency" || cached === "local" || cached === "company" || cached === "startup") setSegment(cached);
      try {
        const supabase = createClient();
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        const { data } = await supabase
          .from("business_profiles")
          .select("segment")
          .eq("user_id", auth.user.id)
          .maybeSingle();
        if (active && data && (data.segment === "agency" || data.segment === "local" || data.segment === "company" || data.segment === "startup")) {
          setSegment(data.segment);
          window.localStorage.setItem("upscale-business-segment", data.segment);
        }
      } catch {
        // El modo CRM sigue disponible aunque el perfil aún no esté configurado.
      }
    }
    void loadBusinessSegment();
    const handleProfileUpdate = (event: Event) => {
      const custom = event as CustomEvent<{ segment?: BusinessSegment }>;
      const value = custom.detail?.segment;
      if (value === "agency" || value === "local" || value === "company" || value === "startup") setSegment(value);
    };
    window.addEventListener("upscale-business-profile-updated", handleProfileUpdate);
    return () => {
      active = false;
      window.removeEventListener("upscale-business-profile-updated", handleProfileUpdate);
    };
  }, []);

  async function changeSegment(value: BusinessSegment) {
    setSegment(value);
    window.localStorage.setItem("upscale-business-segment", value);
    if (mode === "crm") setMessages([{ role: "assistant", content: "Perfil actualizado. " + segmentGuidance[value] + " La próxima consulta aplicará este enfoque." }]);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { error: saveError } = await supabase
        .from("business_profiles")
        .upsert({ user_id: auth.user.id, segment: value }, { onConflict: "user_id" });
      if (saveError) throw saveError;
      window.dispatchEvent(new CustomEvent("upscale-business-profile-updated", { detail: { segment: value } }));
    } catch {
      // La selección local se mantiene; el panel de configuración muestra errores al guardar el perfil completo.
    }
  }

  async function sendMessage(event?: FormEvent<HTMLFormElement>, text?: string) {
    event?.preventDefault();
    const content = (text ?? input).trim();
    if (!content || busy) return;
    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setBusy(true);
    try {
      if (mode === "demo") {
        await new Promise((resolve) => setTimeout(resolve, 450));
        setMessages((current) => [...current, { role: "assistant", content: buildDemoAnswer(content) }]);
        return;
      }
      if (mode === "crm") {
        const response = await fetch("/api/assistant/context", {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const context = await response.json();
        if (!response.ok) {
          throw new Error(context.error || "No se pudo consultar el contexto comercial.");
        }
        const activeSegment = context.profile?.segment;
        const validSegment =
          activeSegment === "agency" || activeSegment === "local" ||
          activeSegment === "company" || activeSegment === "startup"
            ? activeSegment
            : segment;
        const answer = buildCrmAnswer(content, context as CommercialContext, validSegment);
        setMessages((current) => [...current, { role: "assistant", content: answer }]);
        return;
      }
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(-10) }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "No se pudo obtener una respuesta.");
        return;
      }
      setMessages((current) => [...current, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo procesar la consulta. Inténtalo nuevamente.");
    } finally {
      setBusy(false);
    }
  }

  function changeMode(nextMode: AssistantMode) {
    if (nextMode === mode || busy) return;
    setMode(nextMode);
    setMessages([{
      role: "assistant",
      content: nextMode === "demo"
        ? "Modo Demo activado. Respuestas ilustrativas, sin datos reales ni consumo de OpenAI."
        : nextMode === "crm"
          ? "Modo CRM activado. Consultaré el contexto unificado de tu negocio, prospectos, oportunidades y actividades. Análisis local sin consumo de OpenAI."
          : "Modo OpenAI activado. Las respuestas utilizarán la API y el contexto de tus prospectos del CRM. Este modo puede consumir cuota de tu cuenta.",
    }]);
    setError("");
  }

  return (
    <div className="assistant-chat">
      <div className="assistant-mode-switch" role="group" aria-label="Modo del agente">
        <button type="button" className={mode === "demo" ? "active" : ""} onClick={() => changeMode("demo")} disabled={busy}><FlaskConical size={14} /> Demo <small>Gratis</small></button>
        <button type="button" className={mode === "crm" ? "active" : ""} onClick={() => changeMode("crm")} disabled={busy}><Database size={14} /> CRM <small>Gratis</small></button>
        <button type="button" className={mode === "openai" ? "active" : ""} onClick={() => changeMode("openai")} disabled={busy}><Zap size={14} /> OpenAI</button>
      </div>
      <div className={"assistant-mode-note " + mode}>
        {mode === "demo" ? "Simulación local · Sin llamadas a OpenAI." : mode === "crm" ? "Contexto unificado · Reglas comerciales locales · Sin tokens." : "OpenAI · Contexto del CRM · Puede consumir cuota de API."}
      </div>
      <div className="assistant-segment-picker">
        <label htmlFor="assistant-business-segment"><Building2 size={13} /> Perfil de negocio</label>
        <select id="assistant-business-segment" value={segment} onChange={(event) => changeSegment(event.target.value as BusinessSegment)}>
          {segmentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <p>{segmentGuidance[segment]}</p>
      </div>
      <div className="assistant-chat-toolbar">
        <span><span className="assistant-online-dot" /> {mode === "demo" ? "Demo lista para probar" : mode === "crm" ? "CRM listo para analizar" : "Agente listo para conversar"}</span>
        <button type="button" className="assistant-reset" onClick={() => { setMessages([{ role: "assistant", content: "Conversación reiniciada. ¿Qué objetivo comercial quieres trabajar hoy?" }]); setError(""); }} disabled={busy} aria-label="Reiniciar conversación" title="Reiniciar conversación"><RotateCcw size={14} /> Reiniciar</button>
      </div>
      <div className="assistant-messages" aria-live="polite">
        {messages.map((message, index) => (
          <div className={"assistant-message " + message.role} key={index}>
            <div className="assistant-message-avatar">{message.role === "assistant" ? <Bot size={15} /> : <User size={15} />}</div>
            <div className="assistant-message-content"><span>{message.role === "assistant" ? "UPSCALE IA" : "TÚ"}</span><p>{message.content}</p></div>
          </div>
        ))}
        {busy && <div className="assistant-message assistant"><div className="assistant-message-avatar"><Bot size={15} /></div><div className="assistant-message-content"><span>UPSCALE IA</span><p className="assistant-thinking"><LoaderCircle size={15} /> {mode === "demo" ? "Preparando simulación..." : mode === "crm" ? "Analizando tu contexto comercial..." : "Analizando contexto comercial..."}</p></div></div>}
      </div>
      {messages.length === 1 && <div className="assistant-suggestions">{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => void sendMessage(undefined, suggestion)} disabled={busy}><Sparkles size={13} /> {suggestion}</button>)}</div>}
      {error && <div className="assistant-error" role="alert">{error}</div>}
      <form className="assistant-composer" onSubmit={(event) => void sendMessage(event)}>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Escribe tu consulta comercial..." rows={2} maxLength={4000} disabled={busy} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} />
        <button type="submit" className="button button-primary" disabled={busy || !input.trim()}>{busy ? <LoaderCircle size={16} className="assistant-spin" /> : <Send size={16} />} Enviar</button>
      </form>
      <div className="assistant-foot"><span className="mini-dot" /> Las respuestas son sugerencias. Tú revisas y autorizas cada acción comercial.</div>
    </div>
  );
}