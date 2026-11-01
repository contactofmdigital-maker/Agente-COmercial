"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bot, Send, Sparkles, User, RotateCcw, LoaderCircle, FlaskConical, Zap, Database, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { classifyCrmQuery, isValidActivityDueDate, prioritizeProspects } from "@/features/assistant/lib/prioritization";

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
  summary: {
    prospects_loaded: number;
    opportunities_loaded: number;
    active_opportunities: number;
    won_opportunities: number;
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
  return disclaimer + "ANÁLISIS COMERCIAL DE EJEMPLO\n\n1. Empresa Norte — prioridad alta: solicitó información y tiene una necesidad definida. Acción: contactar hoy y agendar diagnóstico.\n2. Estudio Central — prioridad media: mostró interés, pero no confirmó presupuesto ni plazo. Acción: enviar una pregunta de calificación.\n3. Comercio Sur — prioridad baja: contacto inicial sin respuesta. Acción: realizar un seguimiento breve y luego pausar.\n\nCriterios: intención, necesidad, interacción reciente y claridad del próximo paso. Estos datos son ficticios.";
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

function buildCrmAnswer(prompt: string, context: CommercialContext, segment: BusinessSegment) {
  const { prospects, opportunities, activities } = context.data;
  const profile = context.profile;
  const label = segmentOptions.find((item) => item.value === segment)?.label ?? "Negocio";
  const businessName = profile?.business_name ? " · " + profile.business_name : "";
  const header =
    "MODO CRM · CONTEXTO COMERCIAL UNIFICADO · Sin consumo de OpenAI.\n" +
    "Perfil: " + label + businessName + ". " + segmentGuidance[segment] + "\n" +
    (profile?.sales_goal ? "Objetivo comercial: " + profile.sales_goal + "\n" : "") +
    "\nRESUMEN DE TU NEGOCIO\n" +
    "Prospectos: " + context.summary.prospects_loaded +
    " · Oportunidades: " + context.summary.opportunities_loaded +
    " · Activas: " + context.summary.active_opportunities +
    " · Ganadas: " + context.summary.won_opportunities +
    " · Actividades pendientes: " + context.summary.pending_activities +
    " · Actividades vencidas válidas: " + context.summary.overdue_activities +
    " · Fechas por revisar: " + (context.summary.invalid_date_activities ?? 0) + "\n\n";

  if (!prospects.length && !opportunities.length && !activities.length) {
    return header + "Todavía no hay registros comerciales en tu espacio. Registra prospectos, oportunidades o actividades para comenzar.";
  }

  const normalized = prompt.toLowerCase();
  const intent = classifyCrmQuery(prompt);
  const broadAnalysis = intent === "summary" || intent === "general";
  const showActivities = intent === "activities" || broadAnalysis;
  const showOpportunities = intent === "opportunities" || broadAnalysis;
  const showProspects = intent === "prospects" || broadAnalysis;
  const now = Date.now();

  const pending = activities.filter((item) => ["pending", "in_progress"].includes(item.status));
  const invalidDateActivities = pending.filter((item) =>
    item.due_at !== null && !isValidActivityDueDate(item.due_at, item.created_at)
  );
  const invalidDateIds = new Set(invalidDateActivities.map((item) => item.id));
  const overdue = pending.filter((item) =>
    item.due_at !== null &&
    !invalidDateIds.has(item.id) &&
    new Date(item.due_at).getTime() < now
  );
  const activeOpps = opportunities.filter((item) => !["won", "lost"].includes(item.stage));
  const prioritized = prioritizeProspects(
    prospects,
    opportunities,
    activities,
    profile ? {
      description: profile.description,
      products_services: profile.products_services,
      ideal_customer: profile.ideal_customer,
    } : null,
    now,
  );
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
  const prospectById = new Map(prospects.map((item) => [item.id, item]));
  const safeCompanyName = (value: string | null) => {
    if (!value) return "";
    const compact = value.trim();
    const looksLikeRut = /^(?:\\d{1,2}\\.\\d{3}\\.\\d{3}|\\d{7,8})-[0-9kK]$/.test(compact);
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
  const dateLabel = (value: string | null) =>
    value ? new Date(value).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" }) : "Sin fecha";

  if (intent === "explain_prospect") {
    const selected = prioritized.find(({ prospect }) => {
      const name = prospect.full_name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const company = (prospect.company_name ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return (name.length >= 5 && query.includes(name)) || (company.length >= 5 && query.includes(company));
    });
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
      "Urgencia de gestión: " + selected.urgency.level.toUpperCase() + ". " + selected.urgency.reasons.join("; ") + "\n" +
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
      ? "VENCIDOS:\n" + overdue.slice(0, 10).map((item, index) => {
          const prospect = item.prospect_id ? prospectById.get(item.prospect_id) : null;
          return (index + 1) + ". " + item.title +
            (prospect ? " · " + prospect.full_name : "") +
            " · " + (activityLabels[item.activity_type] ?? item.activity_type) +
            " · Vencía: " + dateLabel(item.due_at) +
            " · Prioridad: " + item.priority;
        }).join("\n")
      : "No hay actividades vencidas con fechas válidas.";
    response += "\n";
    const upcoming = pending.filter((item) => item.due_at && !invalidDateIds.has(item.id) && new Date(item.due_at).getTime() >= now);
    response += upcoming.length
      ? "PRÓXIMAS:\n" + upcoming.slice(0, 10).map((item) => {
          const prospect = item.prospect_id ? prospectById.get(item.prospect_id) : null;
          return "- " + item.title + (prospect ? " · " + prospect.full_name : "") + " · " + dateLabel(item.due_at);
        }).join("\n")
      : "No hay actividades futuras pendientes con fecha válida.";
    response += "\n";
    if (invalidDateActivities.length) {
      response += "DATOS POR REVISAR:\n" + invalidDateActivities.map((item) =>
        "- " + item.title + ": la fecha registrada (" + dateLabel(item.due_at) + ") es anterior a su creación o no es válida. Revisa esta actividad en el módulo Actividades."
      ).join("\n");
    }
    response += "\n\n";
  }

  if (showOpportunities) {
    response += "OPORTUNIDADES ACTIVAS\n";
    response += activeOpps.length
      ? activeOpps.slice(0, 10).map((item, index) => {
          const prospect = prospectById.get(item.prospect_id);
          const ageDays = Math.max(0, Math.floor((now - new Date(item.created_at).getTime()) / 86400000));
          const relatedActivities = activities.filter((activity) => activity.opportunity_id === item.id && ["pending", "in_progress"].includes(activity.status));
          return (index + 1) + ". " + item.title +
            (prospect ? " · " + prospect.full_name : "") +
            " · Etapa: " + (stageLabels[item.stage] ?? item.stage) +
            " · Valor: " + Number(item.estimated_value || 0).toLocaleString("es-CL") + " " + item.currency +
            " · Creada hace " + ageDays + " días" +
            " · Seguimientos pendientes asociados: " + relatedActivities.length +
            (item.expected_close_date ? " · Cierre estimado: " + item.expected_close_date : "");
        }).join("\n")
      : "No hay oportunidades activas registradas.";
    response += "\n";
    const noNextStep = activeOpps.filter((item) =>
      !activities.some((activity) => activity.opportunity_id === item.id && ["pending", "in_progress"].includes(activity.status))
    );
    if (noNextStep.length) {
      response += "REQUIEREN DEFINIR PRÓXIMO PASO:\n" +
        noNextStep.map((item) => "- " + item.title + ": no tiene una actividad pendiente asociada.").join("\n") + "\n";
    }
    if (/estancad|sin mov|parad/i.test(normalized)) {
      response += "LÍMITE DEL ANÁLISIS: no existe historial de cambios de etapa, por lo que no puedo confirmar inactividad o estancamiento. La antigüedad por sí sola no lo demuestra.\n";
    }
    response += "\n";
  }

  if (showProspects) {
    response += "PROSPECTOS PRIORIZADOS\n";
    response += prioritized.length
      ? prioritized.slice(0, 10).map((item, index) => {
          const p = item.prospect;
          const company = safeCompanyName(p.company_name);
          const related = opportunities.filter((opportunity) => opportunity.prospect_id === p.id && !["won", "lost"].includes(opportunity.stage));
          const nextActivity = pending.find((activity) =>
            (activity.prospect_id === p.id || (activity.opportunity_id && related.some((opportunity) => opportunity.id === activity.opportunity_id))) &&
            !invalidDateIds.has(activity.id)
          );
          const potentialLabel = item.potential.classification === "insufficient" || item.potential.score === null
            ? "Sin clasificación · evidencia insuficiente · cobertura " + item.potential.coverage + "%"
            : item.potential.score + "/100 · cobertura " + item.potential.coverage + "% · " +
              (item.potential.classification === "sufficient" ? "suficiente" : "provisional");
          const urgencyLabel = item.urgency.level === "high" ? "ALTA" :
            item.urgency.level === "medium" ? "MEDIA" :
            item.urgency.level === "low" ? "BAJA" : "NO EVALUABLE";
          const action = item.urgency.level === "high" ? item.nextAction : getSegmentAction(segment, p);
          return (index + 1) + ". " + p.full_name +
            (company ? " · " + company : "") +
            " · " + (statusLabels[p.status] ?? p.status) +
            "\n   Potencial comercial: " + potentialLabel +
            "\n   Urgencia de gestión: " + urgencyLabel +
            (related.length ? " · Oportunidades activas: " + related.length : "") +
            (nextActivity ? "\n   Actividad relacionada: " + nextActivity.title : "") +
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

export function AssistantChat() {
  const [mode, setMode] = useState<AssistantMode>("demo");
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
