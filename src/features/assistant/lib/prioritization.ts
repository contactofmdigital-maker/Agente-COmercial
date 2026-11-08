export type PrioritizationProspect = {
  id: string;
  full_name: string;
  company_name: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  status: string;
};

export type PrioritizationOpportunity = {
  id: string;
  prospect_id: string;
  stage: string;
};

export type PrioritizationActivity = {
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

export type PrioritizationProfile = {
  description: string;
  products_services: string;
  ideal_customer: string;
};

export type PotentialEvaluation = {
  score: number | null;
  coverage: number;
  classification: "insufficient" | "provisional" | "sufficient" | "excluded";
  evaluable: boolean;
  reasons: string[];
  missingEvidence: string[];
  criteria: Array<{ name: string; weight: number; points: number | null; reason: string }>;
};

export type UrgencyEvaluation = {
  level: "high" | "medium" | "low" | "not_evaluable";
  reasons: string[];
  nextAction: string;
};

export type ProspectPrioritization = {
  prospect: PrioritizationProspect;
  potential: PotentialEvaluation;
  urgency: UrgencyEvaluation;
  nextAction: string;
};


export function isValidActivityDueDate(dueAt: string | null, createdAt: string) {
  // Una actividad sin fecha puede ser válida; significa que aún no fue programada.
  if (!dueAt) return true;
  return validDate(dueAt, createdAt) !== null;
}

export type CrmQueryIntent =
  | "explain_prospect" | "explain_all" | "missing_information"
  | "prospect_detail" | "potential_urgency_comparison" | "prospect_urgency"
  | "activities" | "opportunities" | "prospects" | "commercial_recommendation" | "summary" | "general";

export function classifyCrmQuery(prompt: string): CrmQueryIntent {
  const value = normalize(prompt);
  // Una petición de decisión de contacto tiene prioridad sobre "por qué" o "prioridad":
  // la explicación debe acompañar la recomendación, no convertirla en una consulta individual.
  const asksWhoToContact = /\b(a quien|a que prospecto|quien deberia|quien debo|a que cliente)\b.*\b(contactar|llamar|escribir|contacto)\b/.test(value) ||
    /\b(contactar|llamar)\b.*\b(hoy|primero)\b/.test(value);
  if (asksWhoToContact) return "prospect_urgency";
  const asksForExplicitActivities = /actividades?|seguimientos? vencid|seguimientos? con fechas|tareas?|llamadas?|reuniones?|correos?/.test(value);
  const asksForCommercialRecommendation =
    /(que prospecto representa|que prospecto.*mejor oportunidad|mejor oportunidad comercial|mejor prospecto|mejor cliente potencial|a que prospecto.*(conviene|deberia)|que cliente.*(conviene|deberia))/.test(value);
  if (asksForCommercialRecommendation) return "commercial_recommendation";
  const asksToExplain = /\b(por que|porque|explica|explicame|desglosa)\b/.test(value);
  const asksForScore = /(potencial|puntuacion|puntaje|score|calificacion|prioridad)/.test(value);
  if (asksToExplain && asksForScore) {
    return /\b(cada|todos|todas|todos los|todas las)\b/.test(value) ? "explain_all" : "explain_prospect";
  }
  if (/(que|cual|como).*(informacion|dato|campo).*(falta|completar)|informacion.*falta|datos.*faltan|completar.*prioriz/.test(value)) return "missing_information";
  if (/(diferencia|comparar|compara|comparacion|contrasta)/.test(value) && /(potencial|urgencia|atencion inmediata)/.test(value)) return "potential_urgency_comparison";
  if (/\b(estado comercial|situacion comercial|estado|situacion|historial)\b/.test(value) &&
      /\b(prospecto|cliente|contacto)\b/.test(value) &&
      /(oportunidad|pipeline|negociaci|venta|propuesta)/.test(value)) return "prospect_detail";
  if (/(mayor potencial|mas potencial|potencial comercial|potencial de los prospectos|potencial de cada prospecto)/.test(value)) return "prospects";
  const asksForOpportunity = /oportunidad|pipeline|negociaci|estancad|cierre|propuesta|proceso de venta|ventas? activas|venta en curso/.test(value);
  if (asksForExplicitActivities) return "activities";
  // Las consultas explícitas de oportunidades tienen prioridad sobre palabras
  // temporales como "hoy" o verbos como "contactar".
  if (asksForOpportunity) return "opportunities";
  if (/(contactar primero|contactar hoy|a quien|quien deberia|quien debo|llamar primero|llamar hoy|orden.*urgencia|segun.*urgencia|urgencia de gestion|atencion inmediata|necesitan atencion|prioridad.*hoy)/.test(value) &&
      /(prospect|cliente|contact|lead|comercial|a quien|quien|llamar)/.test(value)) return "prospect_urgency";
  if (/actividad|seguimiento|vencid|atrasad|tarea|llamad|reunion|correo/.test(value)) return "activities";
  if (/prospect|cliente|contact|prioriz|captar|lead|conseguir|potencial/.test(value)) return "prospects";
  if (/analiza mi negocio|resumen|situacion|estado comercial|que deberia priorizar/.test(value)) return "summary";
  return "general";
}

/** Detects an explicit request to compose a message, email, or response.
 * A bare mention of a pending follow-up is a CRM activity query, not a drafting request.
 */
export function isExplicitDraftRequest(prompt: string): boolean {
  const value = normalize(prompt);
  const hasDraftVerb = /\b(redacta|redactar|escribe|escribir|crea|crear|genera|generar|prepara|preparar)\b/.test(value);
  const hasDraftArtifact = /\b(mensaje|correo|email|whatsapp|borrador|texto|respuesta)\b/.test(value);
  return hasDraftVerb && hasDraftArtifact;
}

const WEIGHTS = {
  intent: 30,
  opportunity: 25,
  icp: 15,
  interaction: 15,
  recency: 10,
  information: 5,
} as const;

const ACTIVE_STAGES: Record<string, number> = {
  qualification: 5,
  diagnosis: 10,
  proposal: 18,
  negotiation: 25,
};

const normalize = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9@.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();


const identityStopWords = new Set(["de", "del", "la", "las", "el", "los", "y", "en", "para", "por", "con"]);

function identityTokens(value: string) {
  return normalize(value).split(" ").filter((token) => token.length >= 2 && !identityStopWords.has(token));
}

function matchesIdentity(query: string, candidate: string | null | undefined) {
  const normalizedCandidate = normalize(candidate);
  if (!normalizedCandidate) return false;
  const normalizedQuery = normalize(query);
  if (normalizedQuery.includes(normalizedCandidate)) return true;
  const queryTokens = new Set(identityTokens(normalizedQuery));
  const candidateTokens = identityTokens(normalizedCandidate);
  return candidateTokens.length > 0 && candidateTokens.every((token) => queryTokens.has(token));
}

/**
 * Resolve a CRM mention to a prospect using its name, company, linked opportunity,
 * or linked activity. Ambiguous matches are preserved for explicit disambiguation.
 */
/**
 * Canonical association rule shared by scoring and CRM answer rendering.
 * An opportunity link is authoritative, but a conflicting direct prospect link
 * is treated as inconsistent and must never be silently assigned.
 */
export function resolveActivityProspectId(
  activity: Pick<PrioritizationActivity, "prospect_id" | "opportunity_id">,
  opportunities: PrioritizationOpportunity[],
): string | null {
  const linkedOpportunity = activity.opportunity_id
    ? opportunities.find((item) => item.id === activity.opportunity_id)
    : undefined;

  if (linkedOpportunity) {
    if (activity.prospect_id && activity.prospect_id !== linkedOpportunity.prospect_id) {
      return null;
    }
    return linkedOpportunity.prospect_id;
  }

  return activity.prospect_id;
}

function isActivityRelatedToProspect(
  activity: PrioritizationActivity,
  prospectId: string,
  opportunities: PrioritizationOpportunity[],
) {
  return resolveActivityProspectId(activity, opportunities) === prospectId;
}

export function matchCrmProspects<T extends { id: string; full_name: string; company_name: string | null }>(
  query: string,
  prospects: T[],
  opportunities: Array<{ id: string; prospect_id: string; title: string; description?: string | null }>,
  activities: Array<{ prospect_id: string | null; opportunity_id: string | null; title: string; description?: string | null }> = [],
): T[] {
  const directMatches = prospects.filter((prospect) =>
    matchesIdentity(query, prospect.full_name) || matchesIdentity(query, prospect.company_name)
  );
  if (directMatches.length) return directMatches;
  const matchingIds = new Set<string>();
  for (const prospect of prospects) {
    const linkedOpportunities = opportunities.filter((item) => item.prospect_id === prospect.id);
    if (linkedOpportunities.some((item) => matchesIdentity(query, item.title) || matchesIdentity(query, item.description))) {
      matchingIds.add(prospect.id);
      continue;
    }
    const linkedOpportunityIds = new Set(linkedOpportunities.map((item) => item.id));
    if (activities.some((item) =>
      (item.prospect_id === prospect.id || (item.opportunity_id !== null && linkedOpportunityIds.has(item.opportunity_id))) &&
      (matchesIdentity(query, item.title) || matchesIdentity(query, item.description))
    )) matchingIds.add(prospect.id);
  }
  return prospects.filter((prospect) => matchingIds.has(prospect.id));
}

const validDate = (value: string | null | undefined, createdAt?: string) => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp) || timestamp < Date.UTC(2000, 0, 1)) return null;
  if (createdAt) {
    const created = new Date(createdAt).getTime();
    if (Number.isFinite(created) && timestamp < created - 30 * 86400000) return null;
  }
  return timestamp;
};

const commercialActivities = (activities: PrioritizationActivity[]) =>
  activities.filter((item) =>
    ["call", "meeting", "email", "follow_up"].includes(normalize(item.activity_type)) &&
    normalize(item.status) === "completed" &&
    validDate(item.completed_at, item.created_at) !== null
  );

function evaluateIntent(prospect: PrioritizationProspect, hasActiveOpportunity: boolean) {
  const notes = normalize(prospect.notes);
  const status = normalize(prospect.status);
  if (!notes && !["qualified", "proposal"].includes(status)) return null;

  const rejection = /\b(no interesado|no le interesa|rechaz\w*|descart\w*|no desea|no necesita)\b/.test(notes);
  if (rejection) return { points: 0, reason: "Existe un rechazo o una incompatibilidad explícita en las notas." };
  if (/\b(cotiz|presupuesto|contrat|comprar|orden de compra|solicita propuesta|solicito propuesta)\w*/.test(notes)) {
    return { points: 30, reason: "Las notas registran una solicitud comercial concreta." };
  }
  if (/\b(necesita|necesidad|requiere|busca|quiere|interesad|interes)\w*/.test(notes)) {
    return { points: 22, reason: "Las notas describen una necesidad o interés comercial." };
  }
  if (!hasActiveOpportunity && status === "proposal") return { points: 22, reason: "El prospecto figura en estado de propuesta y no hay oportunidad activa vinculada." };
  if (!hasActiveOpportunity && status === "qualified") return { points: 18, reason: "El prospecto figura como calificado y no hay oportunidad activa vinculada." };
  if (notes) return { points: 10, reason: "Hay notas comerciales, pero no describen intención concreta." };
  return null;
}

function evaluateIcpFit(
  prospect: PrioritizationProspect,
  profile: PrioritizationProfile | null,
) {
  const ideal = normalize(profile?.ideal_customer);
  const offer = normalize([profile?.description, profile?.products_services].filter(Boolean).join(" "));
  const prospectText = normalize([
    prospect.company_name,
    prospect.notes,
  ].filter(Boolean).join(" "));
  if (!ideal || !prospectText) return null;

  const stopWords = new Set(["para", "como", "con", "por", "una", "uno", "que", "los", "las", "del", "de", "the", "and"]);
  const tokens = (value: string) => [...new Set(value.split(" ").filter((word) => word.length >= 4 && !stopWords.has(word)))];
  const idealTokens = tokens(ideal);
  const offerTokens = tokens(offer);
  const prospectTokens = new Set(tokens(prospectText));
  const relevant = [...new Set([...idealTokens, ...offerTokens])];
  if (!relevant.length) return null;
  const matches = relevant.filter((word) => prospectTokens.has(word)).length;
  const ratio = matches / relevant.length;
  if (ratio >= 0.25) return { points: 15, reason: "Hay coincidencias textuales claras con el perfil y la oferta configurados." };
  if (matches > 0) return { points: 8, reason: "Hay coincidencias parciales con el perfil comercial configurado." };
  return null;
}

function evaluateOpportunity(
  prospect: PrioritizationProspect,
  opportunities: PrioritizationOpportunity[],
) {
  const linked = opportunities
    .filter((item) =>
      item.prospect_id === prospect.id &&
      Object.prototype.hasOwnProperty.call(ACTIVE_STAGES, normalize(item.stage))
    )
    .map((item) => ACTIVE_STAGES[normalize(item.stage) as keyof typeof ACTIVE_STAGES]);
  if (!linked.length) return null;
  const points = Math.max(...linked);
  return { points, reason: "Etapa de la mejor oportunidad activa vinculada." };
}

function evaluateInteraction(activities: PrioritizationActivity[]) {
  const completed = commercialActivities(activities);
  if (!completed.length) return null;
  const points = completed.length >= 3 ? 15 : completed.length === 2 ? 12 : 8;
  return { points, reason: completed.length + " interacción(es) comercial(es) completada(s) y registrada(s)." };
}

function evaluateRecency(activities: PrioritizationActivity[], now: number) {
  const completed = commercialActivities(activities);
  if (!completed.length) return null;
  const timestamps = completed
    .map((item) => validDate(item.completed_at, item.created_at))
    .filter((value): value is number => value !== null);
  if (!timestamps.length) return null;
  const days = Math.max(0, Math.floor((now - Math.max(...timestamps)) / 86400000));
  if (days <= 7) return { points: 10, reason: "Última interacción completada hace " + days + " día(s)." };
  if (days <= 14) return { points: 7, reason: "Última interacción completada hace " + days + " días." };
  if (days <= 30) return { points: 4, reason: "Última interacción completada hace " + days + " días." };
  return { points: 1, reason: "La última interacción completada fue hace más de 30 días." };
}

function evaluateInformation(prospect: PrioritizationProspect) {
  const hasName = Boolean(normalize(prospect.full_name));
  const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(prospect.email ?? "");
  const hasWebsite = Boolean(prospect.website && /^https?:\/\//i.test(prospect.website));
  if (!hasName && !hasEmail && !hasWebsite) return null;
  const points = (hasName ? 2 : 0) + (hasEmail || hasWebsite ? 3 : 0);
  return { points, reason: "Calidad de identificación y medios de contacto disponibles." };
}

export function calculatePotential(
  prospect: PrioritizationProspect,
  opportunities: PrioritizationOpportunity[],
  activities: PrioritizationActivity[],
  profile: PrioritizationProfile | null,
  now = Date.now(),
): PotentialEvaluation {
  const status = normalize(prospect.status);
  if (["won", "lost"].includes(status)) {
    return {
      score: null, coverage: 0, classification: "excluded", evaluable: false,
      reasons: ["El prospecto está cerrado y no participa en la captación activa."],
      missingEvidence: [], criteria: [],
    };
  }

  const relatedActivities = activities.filter((item) => isActivityRelatedToProspect(item, prospect.id, opportunities));

  const hasActiveOpportunity = opportunities.some((item) =>
    item.prospect_id === prospect.id && Object.prototype.hasOwnProperty.call(ACTIVE_STAGES, normalize(item.stage))
  );
  const evaluated = [
    { name: "Intención y necesidad", weight: WEIGHTS.intent, result: evaluateIntent(prospect, hasActiveOpportunity) },
    { name: "Avance de oportunidad", weight: WEIGHTS.opportunity, result: evaluateOpportunity(prospect, opportunities) },
    { name: "Ajuste al cliente ideal", weight: WEIGHTS.icp, result: evaluateIcpFit(prospect, profile) },
    { name: "Interacción comercial", weight: WEIGHTS.interaction, result: evaluateInteraction(relatedActivities) },
    { name: "Recencia comercial", weight: WEIGHTS.recency, result: evaluateRecency(relatedActivities, now) },
    { name: "Calidad de información", weight: WEIGHTS.information, result: evaluateInformation(prospect) },
  ];

  const evaluable = evaluated.filter((item) => item.result !== null);
  const possibleWeight = evaluable.reduce((sum, item) => sum + item.weight, 0);
  const earned = evaluable.reduce((sum, item) => sum + (item.result?.points ?? 0), 0);
  const coverage = Math.round(possibleWeight);
  // El score representa el rendimiento sobre los criterios que sí tienen evidencia.
  // coverage indica cuánto del modelo total (100 puntos de peso) pudo evaluarse.
  // Por eso un score alto con cobertura baja NO debe interpretarse como potencial confirmado.
  const score = possibleWeight > 0 ? Math.round((earned / possibleWeight) * 100) : null;
  const classification =
    coverage < 40 ? "insufficient" : coverage < 70 ? "provisional" : "sufficient";

  return {
    score,
    coverage,
    classification,
    evaluable: score !== null,
    reasons: evaluable.map((item) => item.result?.reason ?? ""),
    missingEvidence: evaluated.filter((item) => item.result === null).map((item) => item.name),
    criteria: evaluated.map((item) => ({
      name: item.name,
      weight: item.weight,
      points: item.result?.points ?? null,
      reason: item.result?.reason ?? "Sin evidencia suficiente para evaluar.",
    })),
  };
}

export function calculateUrgency(
  prospect: PrioritizationProspect,
  opportunities: PrioritizationOpportunity[],
  activities: PrioritizationActivity[],
  now = Date.now(),
): UrgencyEvaluation {
  const related = activities.filter((item) => isActivityRelatedToProspect(item, prospect.id, opportunities));
  const pending = related.filter((item) =>
    ["pending", "in_progress"].includes(normalize(item.status))
  );
  if (!pending.length) {
    return { level: "low", reasons: ["No hay actividades pendientes asociadas."], nextAction: "Mantener seguimiento según el ciclo comercial." };
  }

  const invalid = pending.filter((item) =>
    item.due_at !== null && validDate(item.due_at, item.created_at) === null
  );
  const validPending = pending.filter((item) =>
    item.due_at === null || validDate(item.due_at, item.created_at) !== null
  );
  const overdue = validPending.filter((item) => {
    const due = validDate(item.due_at, item.created_at);
    return due !== null && due < now;
  });
  if (overdue.length) {
    return {
      level: "high",
      reasons: [
        ...overdue.map((item) => "Actividad vencida: " + item.title),
        ...invalid.map((item) => "Fecha inválida que requiere revisión: " + item.title),
      ],
      nextAction: "Atender primero la actividad vencida y corregir las fechas que requieren revisión.",
    };
  }

  const highPrioritySoon = validPending.filter((item) => {
    const due = validDate(item.due_at, item.created_at);
    return normalize(item.priority) === "high" && due !== null && due >= now && due - now <= 48 * 3600000;
  });
  if (highPrioritySoon.length) {
    return {
      level: "high",
      reasons: [
        ...highPrioritySoon.map((item) => "Compromiso de prioridad alta próximo: " + item.title),
        ...invalid.map((item) => "Fecha inválida que requiere revisión: " + item.title),
      ],
      nextAction: "Preparar el compromiso próximo y corregir las fechas que requieren revisión.",
    };
  }

  if (validPending.length) {
    return {
      level: "medium",
      reasons: [
        ...validPending.map((item) => item.due_at ? "Actividad programada: " + item.title : "Acción pendiente sin fecha: " + item.title),
        ...invalid.map((item) => "Fecha inválida que requiere revisión: " + item.title),
      ],
      nextAction: "Revisar las actividades pendientes y corregir cualquier fecha inválida.",
    };
  }

  if (invalid.length) {
    return {
      level: "not_evaluable",
      reasons: invalid.map((item) => "Fecha inválida que requiere revisión: " + item.title),
      nextAction: "Corregir la fecha de la actividad antes de clasificar su urgencia.",
    };
  }

  return { level: "low", reasons: ["No hay compromisos válidos que requieran atención inmediata."], nextAction: "Mantener seguimiento según el ciclo comercial." };
}

export function prioritizeProspects(
  prospects: PrioritizationProspect[],
  opportunities: PrioritizationOpportunity[],
  activities: PrioritizationActivity[],
  profile: PrioritizationProfile | null,
  now = Date.now(),
): ProspectPrioritization[] {
  return prospects
    .filter((prospect) => !["won", "lost"].includes(normalize(prospect.status)))
    .map((prospect) => {
      const potential = calculatePotential(prospect, opportunities, activities, profile, now);
      const urgency = calculateUrgency(prospect, opportunities, activities, now);
      const nextAction = urgency.level === "high" || urgency.level === "not_evaluable"
        ? urgency.nextAction
        : potential.classification === "insufficient"
          ? "Completar información comercial antes de asignar prioridad."
          : normalize(prospect.status) === "proposal"
            ? "Dar seguimiento a la propuesta y acordar el siguiente paso."
            : "Validar necesidad, plazo y próximo paso con el prospecto.";
      return { prospect, potential, urgency, nextAction };
    })
    .sort((a, b) => {
      const classOrder = { sufficient: 0, provisional: 1, insufficient: 2, excluded: 3 };
      const classDifference = classOrder[a.potential.classification] - classOrder[b.potential.classification];
      if (classDifference) return classDifference;
      if (a.potential.score !== null && b.potential.score !== null && a.potential.score !== b.potential.score) {
        return b.potential.score - a.potential.score;
      }
      if (a.potential.coverage !== b.potential.coverage) return b.potential.coverage - a.potential.coverage;
      // El potencial no debe subir o bajar por la urgencia operativa.
      // Desempate estable y neutral para que el ranking sea reproducible.
      return normalize(a.prospect.full_name).localeCompare(normalize(b.prospect.full_name));
    });
}


/**
 * Ordena prospectos por necesidad operativa de contacto, sin confundir urgencia
 * con potencial comercial. Útil para responder "¿a quién debo contactar primero?".
 */
export function prioritizeProspectsByUrgency(
  prospects: PrioritizationProspect[],
  opportunities: PrioritizationOpportunity[],
  activities: PrioritizationActivity[],
  profile: PrioritizationProfile | null,
  now = Date.now(),
): ProspectPrioritization[] {
  const urgencyOrder = { high: 0, medium: 1, not_evaluable: 2, low: 3 };
  return prioritizeProspects(prospects, opportunities, activities, profile, now)
    .sort((a, b) => {
      const urgencyDifference = urgencyOrder[a.urgency.level] - urgencyOrder[b.urgency.level];
      if (urgencyDifference) return urgencyDifference;
      const classOrder = { sufficient: 0, provisional: 1, insufficient: 2, excluded: 3 };
      const classDifference = classOrder[a.potential.classification] - classOrder[b.potential.classification];
      if (classDifference) return classDifference;
      if (a.potential.score !== null && b.potential.score !== null && a.potential.score !== b.potential.score) {
        return b.potential.score - a.potential.score;
      }
      if (a.potential.coverage !== b.potential.coverage) {
        return b.potential.coverage - a.potential.coverage;
      }
      return normalize(a.prospect.full_name).localeCompare(normalize(b.prospect.full_name));
    });
}