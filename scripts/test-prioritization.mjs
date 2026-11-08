import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(
  new URL("../src/features/assistant/lib/prioritization.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const moduleUrl = "data:text/javascript;base64," + Buffer.from(compiled).toString("base64");
const engine = await import(moduleUrl);

const now = Date.parse("2026-11-01T12:00:00.000Z");
const prospect = (overrides = {}) => ({
  id: "p1", full_name: "Ana Pérez", company_name: "Agencia Norte",
  email: "ana@example.com", website: null, notes: "Solicitó una cotización para SEO",
  status: "contacted", ...overrides,
});
const opportunity = (stage, id = "o1") => ({ id, prospect_id: "p1", stage });
const activity = (overrides = {}) => ({
  id: "a1", prospect_id: "p1", opportunity_id: null, activity_type: "call",
  title: "Llamada comercial", description: null, due_at: null, priority: "normal",
  status: "completed", created_at: "2026-10-30T10:00:00.000Z",
  completed_at: "2026-10-31T10:00:00.000Z", ...overrides,
});
const profile = {
  description: "Servicios de marketing digital",
  products_services: "SEO y posicionamiento web",
  ideal_customer: "Agencias de marketing y empresas",
};

const insufficient = engine.calculatePotential(prospect({ notes: "" }), [], [], null, now);
assert.equal(insufficient.classification, "insufficient", "No debe clasificar con evidencia mínima");

const intent = engine.calculatePotential(prospect(), [], [], null, now);
assert.equal(intent.criteria.find((item) => item.name === "Intención y necesidad").points, 30);

const rejection = engine.calculatePotential(prospect({ notes: "No interesado, rechazó la propuesta" }), [], [], null, now);
assert.equal(rejection.criteria.find((item) => item.name === "Intención y necesidad").points, 0);

const bestOpportunity = engine.calculatePotential(prospect({ notes: "" }), [
  opportunity("qualification", "o1"), opportunity("negotiation", "o2"),
], [], null, now);
assert.equal(bestOpportunity.criteria.find((item) => item.name === "Avance de oportunidad").points, 25);

const noOpportunity = engine.calculatePotential(prospect({ notes: "" }), [], [], null, now);
assert.equal(noOpportunity.criteria.find((item) => item.name === "Avance de oportunidad").points, null);

const lowCoverageProspect = prospect({
  id: "p-low-coverage",
  full_name: "Danae",
  notes: "",
  email: "danae@example.com",
});
const lowCoverage = engine.calculatePotential(lowCoverageProspect, [], [], null, now);
assert.equal(lowCoverage.coverage, 5, "Un único criterio de identificación solo aporta 5% de cobertura.");
assert.equal(lowCoverage.score, 5, "El puntaje público debe reflejar los 5 puntos respaldados, no reescalar a 100.");
assert.equal(lowCoverage.observedScore, 100, "El rendimiento observado se informa por separado del puntaje respaldado.");
assert.deepEqual(lowCoverage.scoreRange, { min: 5, max: 100 });

const evidenceBackedProspect = prospect({
  id: "p-evidence-backed",
  full_name: "Agencia Norte",
  notes: "Solicitó una cotización y presupuesto",
  email: "ventas@agencianorte.cl",
});
const evidenceBacked = engine.calculatePotential(
  evidenceBackedProspect,
  [opportunity("negotiation", "o-evidence-backed")],
  [],
  profile,
  now,
);
assert.equal(evidenceBacked.coverage, 60);
assert.equal(evidenceBacked.score, 60, "El potencial respaldado suma puntos reales sobre el modelo completo.");
const commercialRanking = engine.prioritizeProspects(
  [lowCoverageProspect, evidenceBackedProspect],
  [opportunity("negotiation", "o-evidence-backed")],
  [],
  profile,
  now,
);
assert.equal(commercialRanking[0].prospect.id, "p-evidence-backed");
assert.equal(
  engine.selectCommercialRecommendation(commercialRanking)?.prospect.id,
  "p-evidence-backed",
  "La recomendación debe elegir el candidato con evidencia provisional antes que un 100 observado con 5% de cobertura.",
);
assert.equal(
  engine.selectCommercialRecommendation(engine.prioritizeProspects([lowCoverageProspect], [], [], profile, now)),
  null,
  "No se debe recomendar como primera opción un prospecto con evidencia insuficiente.",
);

const completed = engine.calculatePotential(prospect({ notes: "" }), [], [activity()], null, now);
assert.equal(completed.criteria.find((item) => item.name === "Interacción comercial").points, 8);
assert.equal(completed.criteria.find((item) => item.name === "Recencia comercial").points, 10);

const pendingOnly = engine.calculatePotential(prospect({ notes: "" }), [], [
  activity({ status: "pending", completed_at: null }),
], null, now);
assert.equal(pendingOnly.criteria.find((item) => item.name === "Interacción comercial").points, null);

const overdue = engine.calculateUrgency(prospect(), [], [
  activity({ status: "pending", completed_at: null, due_at: "2026-10-30T10:00:00.000Z" }),
], now);
assert.equal(overdue.level, "high");

const completedOverdue = engine.calculateUrgency(prospect(), [], [
  activity({ status: "completed", due_at: "2026-10-30T10:00:00.000Z" }),
], now);
assert.equal(completedOverdue.level, "low");

const invalidDate = engine.calculateUrgency(prospect(), [], [
  activity({ status: "pending", completed_at: null, due_at: "1995-03-28T10:00:00.000Z" }),
], now);
assert.equal(invalidDate.level, "not_evaluable");

const intentionalDuplicates = engine.prioritizeProspects(
  [prospect({ id: "p1" }), prospect({ id: "p2" })], [], [], profile, now,
);
assert.equal(intentionalDuplicates.length, 2, "No debe fusionar ni ocultar prospectos duplicados");

const closed = engine.prioritizeProspects(
  [prospect({ status: "won" }), prospect({ id: "p2", status: "lost" })], [], [], profile, now,
);
assert.equal(closed.length, 0, "Prospectos ganados o perdidos no entran al ranking activo");

const explainIntent = engine.classifyCrmQuery("¿Por qué este prospecto tiene esa puntuación?");
assert.equal(explainIntent, "explain_prospect", "Debe detectar una solicitud de explicación de puntuación");

const missingIntent = engine.classifyCrmQuery("¿Qué información me falta para priorizar mejor?");
assert.equal(missingIntent, "missing_information", "Debe detectar una solicitud de datos faltantes");

const rankingIntent = engine.classifyCrmQuery("¿Qué prospectos debería priorizar?");
assert.equal(rankingIntent, "prospects", "Debe mantener la consulta de ranking");
assert.equal(
  engine.classifyCrmQuery("Analiza mis oportunidades comerciales y dime cuáles debería priorizar."),
  "opportunities",
  "Debe clasificar el análisis de oportunidades antes que un ranking general de prospectos",
);
assert.equal(
  engine.classifyCrmQuery("¿Qué debería hacer hoy para avanzar con TEST OPORTUNIDAD b y cómo registrar el resultado?"),
  "opportunities",
  "Una pregunta de acción sobre una oportunidad no debe desviarse a actividades por incluir 'hoy'",
);
assert.equal(
  engine.classifyCrmQuery("¿Qué actividades vencidas tengo hoy?"),
  "activities",
  "Una consulta explícita de actividades vencidas debe seguir clasificándose como actividades",
);
assert.equal(
  engine.classifyCrmQuery("¿Qué seguimiento tengo pendiente hoy?"),
  "activities",
  "Una consulta de seguimiento sin referencia a oportunidades debe clasificarse como actividades",
);
assert.equal(engine.isExplicitDraftRequest("Redacta un mensaje de seguimiento para TEST OPORTUNIDAD b."), true);
assert.equal(engine.isExplicitDraftRequest("Prepara un correo para test seguridad b."), true);
assert.equal(engine.isExplicitDraftRequest("¿Qué seguimiento tengo pendiente hoy?"), false);
assert.equal(engine.isExplicitDraftRequest("¿Qué actividades vencidas tengo hoy?"), false);
assert.equal(engine.isExplicitDraftRequest("¿Qué debería hacer hoy para avanzar con TEST OPORTUNIDAD b?"), false);

const prospectForIdentity = {
  id: "p-security", full_name: "Contacto de prueba", company_name: "test seguridad b",
};
const linkedOpportunityForIdentity = {
  id: "o-security", prospect_id: "p-security", title: "TEST OPORTUNIDAD b", description: null,
};
const fuzzyCompanyMatch = engine.matchCrmProspects(
  "Necesito hacer seguimiento de la propuesta comercial de test de seguridad b",
  [prospectForIdentity],
  [linkedOpportunityForIdentity],
);
assert.equal(fuzzyCompanyMatch.length, 1, "Debe reconocer el nombre aunque la consulta incluya palabras intermedias como 'de'");
assert.equal(fuzzyCompanyMatch[0].id, "p-security");
const opportunityNameMatch = engine.matchCrmProspects(
  "Prepara un mensaje para TEST OPORTUNIDAD b",
  [prospectForIdentity],
  [linkedOpportunityForIdentity],
);
assert.equal(opportunityNameMatch.length, 1, "Debe resolver el prospecto a partir del nombre de su oportunidad vinculada");
const ambiguousMatches = engine.matchCrmProspects(
  "Contacta a Test Seguridad",
  [
    prospectForIdentity,
    { id: "p-security-2", full_name: "Otro contacto", company_name: "Test Seguridad" },
  ],
  [linkedOpportunityForIdentity],
);
assert.equal(ambiguousMatches.length, 2, "Debe devolver todas las coincidencias para solicitar desambiguación");

assert.equal(
  engine.isValidActivityDueDate("1995-03-28T22:50:00.000Z", "2026-10-30T10:00:00.000Z"),
  false,
  "Una fecha anterior al año 2000 debe considerarse inválida",
);
assert.equal(
  engine.isValidActivityDueDate("2026-10-31T10:00:00.000Z", "2026-10-30T10:00:00.000Z"),
  true,
  "Una fecha válida posterior a la creación debe aceptarse",
);


const prototypeStage = engine.calculatePotential(prospect({ notes: "" }), [
  opportunity("toString"),
], [], null, now);
assert.equal(
  prototypeStage.criteria.find((item) => item.name === "Avance de oportunidad").points,
  null,
  "Una etapa heredada del prototipo no debe tratarse como oportunidad activa",
);
const unknownStage = engine.calculatePotential(prospect({ notes: "" }), [
  opportunity("awaiting_approval"),
], [], null, now);
assert.equal(
  unknownStage.criteria.find((item) => item.name === "Avance de oportunidad").points,
  null,
  "Una etapa desconocida no debe sumar puntos de avance",
);

console.log("OK: pruebas previas del motor y clasificación CRM.");

const qPotential = "¿Cuáles son mis prospectos con mayor potencial comercial, independientemente de si tienen seguimientos vencidos?";
const qUrgency = "¿Qué prospectos debería contactar primero hoy y por qué? Ordena los resultados según su urgencia.";
const qCompare = "¿Qué diferencia existe entre los prospectos con mayor potencial y los que necesitan atención inmediata?";
const qOverdue = "Muéstrame todas las actividades vencidas, indicando prospecto relacionado, fecha de vencimiento y siguiente acción recomendada.";
const qDateBuckets = "Separa los seguimientos con fechas inválidas, fechas vencidas y actividades pendientes sin fecha. ¿Cuáles requieren revisión?";
const qExplainAll = "Explícame cómo calculaste el potencial de cada prospecto, qué criterios evaluaste, qué información falta y qué tan confiable es la puntuación.";
const qDraft = "Redacta un mensaje de seguimiento profesional para el prospecto asociado a TEST OPORTUNIDAD b. El objetivo es reactivar la conversación y conseguir una reunión.";
const qDetail = "Explícame el estado comercial del prospecto Francisco Javier Marin Sepulveda y sus oportunidades, sin mostrar RUT, teléfono ni datos personales sensibles.";
assert.equal(engine.classifyCrmQuery(qPotential), "prospects");
assert.equal(engine.classifyCrmQuery(qUrgency), "prospect_urgency");
assert.equal(
  engine.classifyCrmQuery("¿A qué prospecto debería contactar hoy y por qué? Analiza las actividades pendientes, vencidas y la prioridad comercial."),
  "prospect_urgency",
  "La petición de decidir a quién contactar debe prevalecer sobre la solicitud de explicación de prioridad.",
);
assert.equal(engine.classifyCrmQuery(qCompare), "potential_urgency_comparison");
assert.equal(engine.classifyCrmQuery(qOverdue), "activities");
assert.equal(engine.classifyCrmQuery(qDateBuckets), "activities");
assert.equal(engine.classifyCrmQuery(qExplainAll), "explain_all");
assert.equal(engine.isExplicitDraftRequest(qDraft), true);
assert.equal(engine.classifyCrmQuery(qDetail), "prospect_detail");
const francisco={id:"p-francisco",full_name:"Francisco Javier Marin Sepulveda",company_name:"FM Digital"};
const testSecurity={id:"p-test",full_name:"test seguridad b",company_name:"Empresa prueba b"};
const testOpportunity={id:"o-test",prospect_id:"p-test",title:"TEST OPORTUNIDAD b",description:null};
assert.deepEqual(engine.matchCrmProspects(qDetail,[testSecurity,francisco],[testOpportunity]).map((item)=>item.id),["p-francisco"]);
const pHighPotential=prospect({id:"p-potential",full_name:"Alto Potencial",notes:"Solicitó cotización y presupuesto"});
const pUrgent=prospect({id:"p-urgent",full_name:"Urgente",notes:"Contacto inicial"});
const urgencyOrder=engine.prioritizeProspectsByUrgency(
 [pHighPotential,pUrgent],
 [{id:"o-urgent",prospect_id:"p-urgent",stage:"qualification"}],
 [activity({prospect_id:null,opportunity_id:"o-urgent",status:"pending",completed_at:null,due_at:"2026-10-31T10:00:00.000Z"})],
 profile,now
);
assert.equal(urgencyOrder[0].prospect.id,"p-urgent");
const noActivityUrgencyOrder = engine.prioritizeProspectsByUrgency(
  [
    prospect({ id: "p-commercial-a", full_name: "A Comercial", notes: "Solicitó cotización y presupuesto" }),
    prospect({ id: "p-commercial-b", full_name: "B Comercial", notes: "Contacto inicial" }),
  ],
  [],
  [],
  profile,
  now,
);
assert.equal(
  noActivityUrgencyOrder[0].prospect.id,
  "p-commercial-a",
  "Cuando la urgencia es igual, el ranking operativo debe desempatar por potencial y evidencia comercial.",
);
assert.equal(
  engine.resolveActivityProspectId(
    { prospect_id: null, opportunity_id: "o-urgent" },
    [{ id: "o-urgent", prospect_id: "p-urgent", stage: "qualification" }],
  ),
  "p-urgent",
  "Una actividad vinculada solo mediante oportunidad debe resolverse al prospecto correcto.",
);
assert.equal(
  engine.resolveActivityProspectId(
    { prospect_id: "p-other", opportunity_id: "o-urgent" },
    [{ id: "o-urgent", prospect_id: "p-urgent", stage: "qualification" }],
  ),
  null,
  "Una asociación directa que contradice la oportunidad debe quedar sin atribución y requerir corrección.",
);

const assistantSource=await readFile(new URL("../src/features/assistant/components/assistant-chat.tsx",import.meta.url),"utf8");
const helperStart=assistantSource.indexOf("const segmentOptions");
const helperEnd=assistantSource.indexOf("export function AssistantChat()");
assert.ok(helperStart>=0&&helperEnd>helperStart);
const helperSource=assistantSource.slice(helperStart,helperEnd);
const helperImports = 'import { classifyCrmQuery, isExplicitDraftRequest, isValidActivityDueDate, matchCrmProspects, prioritizeProspects, prioritizeProspectsByUrgency, resolveActivityProspectId, selectCommercialRecommendation } from "' + moduleUrl + '";\n';
const helperCompiled=ts.transpileModule(helperImports+helperSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const crmAnswer=await import("data:text/javascript;base64,"+Buffer.from(helperCompiled).toString("base64"));
const crmProspects=[
 {id:"p-test",full_name:"test seguridad b",company_name:"Empresa prueba b",email:null,website:null,country:"Chile",notes:"registro de aislamiento",status:"new",created_at:"2026-11-01T12:00:00.000Z"},
 {id:"p-francisco",full_name:"Francisco Javier Marin Sepulveda",company_name:"FM Digital",email:"francisco.private@example.com",website:null,country:"Chile",notes:"contacto comercial inicial",status:"new",created_at:"2026-11-01T12:00:00.000Z",phone:"+56987654321",rut:"12.345.678-9"},
];
const crmOpportunities=[{id:"o-test",prospect_id:"p-test",title:"TEST OPORTUNIDAD b",description:null,stage:"negotiation",estimated_value:15000000,currency:"CLP",expected_close_date:"2026-12-30",created_at:"2026-11-03T12:00:00.000Z"}];
const crmActivities=[
 {id:"a-overdue",prospect_id:null,opportunity_id:"o-test",activity_type:"follow_up",title:"test - b",description:null,due_at:"2026-10-31T12:00:00-03:00",priority:"medium",status:"pending",created_at:"2026-11-03T12:00:00-03:00",completed_at:null},
 {id:"a-invalid",prospect_id:"p-test",opportunity_id:null,activity_type:"task",title:"fecha antigua",description:null,due_at:"1995-03-28T10:00:00.000Z",priority:"low",status:"in_progress",created_at:"2026-11-03T12:00:00.000Z",completed_at:null},
 {id:"a-undated",prospect_id:"p-test",opportunity_id:null,activity_type:"call",title:"llamada sin fecha",description:null,due_at:null,priority:"high",status:"pending",created_at:"2026-11-03T12:00:00.000Z",completed_at:null},
];
const crmContext={
 profile:{business_name:"UpScale IA",segment:"agency",country:"Chile",currency:"CLP",description:"Servicios de marketing digital",products_services:"SEO y marketing digital",ideal_customer:"Agencias de marketing",sales_goal:"Captar agencias"},
 summary:{prospects_loaded:2,opportunities_loaded:1,active_opportunities:1,won_opportunities:0,unknown_stage_opportunities:0,activities_loaded:3,pending_activities:3,overdue_activities:1,invalid_date_activities:1},
 data:{prospects:crmProspects,opportunities:crmOpportunities,activities:crmActivities},
 limits:{complete:true,page_size:500,note:"Se recuperan todos los registros de prospectos, oportunidades y actividades en páginas de 500, con orden estable. Los conteos corresponden al conjunto completo visible para el usuario autenticado y las políticas RLS."},
};
const answerPotential=crmAnswer.buildCrmAnswer(qPotential,crmContext,"agency");
assert.ok(answerPotential.includes("PROSPECTOS PRIORIZADOS POR POTENCIAL COMERCIAL"));
assert.ok(answerPotential.includes("ALCANCE DEL CONTEXTO: Se recuperan todos los registros"));
assert.ok(!answerPotential.includes("ACTIVIDADES Y SEGUIMIENTOS"));
const answerUrgency=crmAnswer.buildCrmAnswer(qUrgency,crmContext,"agency");
assert.ok(answerUrgency.indexOf("test seguridad b")<answerUrgency.indexOf("Francisco Javier"));
assert.ok(answerUrgency.includes("Urgencia de gestión: ALTA"), "El seguimiento vencido vinculado por oportunidad debe elevar la urgencia del prospecto.");
assert.ok(answerUrgency.includes("RECOMENDACIÓN PRINCIPAL PARA HOY\nContacta primero a test seguridad b"), "La respuesta debe nombrar al primer prospecto que requiere contacto hoy.");
const noUrgencyContext = {
  ...crmContext,
  data: {
    ...crmContext.data,
    activities: crmActivities.map((item) => ({ ...item, status: "completed", completed_at: "2026-11-01T10:00:00.000Z" })),
  },
  summary: { ...crmContext.summary, pending_activities: 0, overdue_activities: 0, invalid_date_activities: 0 },
};
const noUrgencyAnswer = crmAnswer.buildCrmAnswer(qUrgency, noUrgencyContext, "agency");
assert.ok(
  noUrgencyAnswer.includes("No hay compromisos urgentes registrados. Como siguiente acción comercial, considera contactar a"),
  "Sin urgencias debe recomendar un candidato comercial con evidencia suficiente, no detenerse en la ausencia de vencimientos.\n\nRespuesta generada:\n" + noUrgencyAnswer,
);
assert.ok(
  !noUrgencyAnswer.includes("Contacta primero a"),
  "Las actividades completadas no deben conservar una recomendación de contacto urgente.",
);
assert.ok(
  noUrgencyAnswer.includes("cobertura de") && noUrgencyAnswer.includes("Siguiente paso:"),
  "La recomendación comercial sin urgencia debe transparentar cobertura y acción siguiente.",
);
const urgentProspectBlock = answerUrgency.slice(
  answerUrgency.indexOf("1. test seguridad b"),
  answerUrgency.indexOf("2. Francisco Javier"),
);
assert.ok(
  urgentProspectBlock.length > 0 && !urgentProspectBlock.includes("Urgencia de gestión: BAJA"),
  "El prospecto con seguimiento vencido no debe mostrar urgencia baja; otros prospectos sí pueden tenerla.",
);
assert.ok(answerUrgency.includes("Vence:"), "Debe mostrar la fecha de vencimiento de la actividad que justifica la prioridad.");
assert.ok(answerUrgency.includes("Actividad relacionada: test - b"), "Debe identificar la actividad asociada a través de su oportunidad.");
const answerCompare=crmAnswer.buildCrmAnswer(qCompare,crmContext,"agency");
assert.ok(answerCompare.includes("MAYOR POTENCIAL COMERCIAL")&&answerCompare.includes("REQUIEREN ATENCIÓN OPERATIVA"));
assert.ok(answerCompare.includes("Potencial respaldado:") && answerCompare.includes("Rango posible:"), "La comparación debe mostrar puntaje real y rango de incertidumbre.");
assert.ok(!answerCompare.includes("Urgencia: LOW"), "La salida CRM debe mantener las etiquetas de urgencia en español.");

const evidenceComparisonContext = {
  ...crmContext,
  data: {
    prospects: [lowCoverageProspect, evidenceBackedProspect],
    opportunities: [{
      id: "o-evidence-backed",
      prospect_id: "p-evidence-backed",
      title: "Propuesta SEO",
      description: null,
      stage: "negotiation",
      estimated_value: 1000000,
      currency: "CLP",
      expected_close_date: null,
      created_at: "2026-11-01T12:00:00.000Z",
    }],
    activities: [],
  },
};
const evidenceComparison = crmAnswer.buildCrmAnswer(
  "Compara mis prospectos con mayor potencial y los que requieren atención inmediata.",
  evidenceComparisonContext,
  "agency",
);
assert.ok(
  evidenceComparison.indexOf("Agencia Norte") < evidenceComparison.indexOf("Danae"),
  "El ranking visible debe mostrar primero los puntos ponderados respaldados y no el 100 observado con 5% de cobertura.",
);
const evidenceRecommendation = crmAnswer.buildCrmAnswer(
  "¿A quién debería contactar hoy y por qué?",
  evidenceComparisonContext,
  "agency",
);
assert.ok(
  evidenceRecommendation.includes("considera contactar a Agencia Norte") &&
  !evidenceRecommendation.includes("considera contactar a Danae"),
  "La recomendación debe coincidir con el candidato que supera el umbral de evidencia.",
);
const extractBackedScores = (answer) => [...answer.matchAll(/Potencial respaldado: (\\d+\\/100)/g)].map((match) => match[1]);
assert.deepEqual(
  extractBackedScores(answerPotential),
  extractBackedScores(answerCompare),
  "El mismo prospecto debe conservar exactamente el mismo puntaje entre ranking y comparación.",
);
assert.ok(
  answerCompare.includes("ordenado por puntos ponderados respaldados sobre 100") &&
  answerCompare.includes("no se reescala una muestra parcial a 100"),
  "La comparación debe ordenar por puntaje visible y advertir cuando la cobertura no respalda una conclusión firme.",
);
assert.match(
  assistantSource,
  /const aScore = a\.potential\.score \?\? -1;[\s\S]*?return bScore - aScore;/,
  "El ranking comparativo debe ordenar realmente por puntaje descendente, no por clasificación de evidencia antes que por potencial.",
);
const answerOverdue=crmAnswer.buildCrmAnswer(qOverdue,crmContext,"agency");
assert.ok(answerOverdue.includes("VENCIDAS:")&&answerOverdue.includes("test seguridad b")&&answerOverdue.includes("Siguiente acción:"));
const answerBuckets=crmAnswer.buildCrmAnswer(qDateBuckets,crmContext,"agency");
assert.ok(answerBuckets.includes("FECHAS INVÁLIDAS")&&answerBuckets.includes("PENDIENTES SIN FECHA")&&answerBuckets.includes("VENCIDAS:"));
const answerExplain=crmAnswer.buildCrmAnswer(qExplainAll,crmContext,"agency");
assert.ok(answerExplain.includes("test seguridad b")&&answerExplain.includes("Francisco Javier Marin Sepulveda")&&answerExplain.includes("Confiabilidad:"));
assert.ok(!answerExplain.includes("Urgencia independiente: LOW"), "La explicación global también debe presentar urgencia en español.");
const answerDraft=crmAnswer.buildCrmAnswer(qDraft,crmContext,"agency");
assert.ok(answerDraft.includes("TEST OPORTUNIDAD b")&&answerDraft.includes("reunión breve"));
const answerDetail=crmAnswer.buildCrmAnswer(qDetail,crmContext,"agency");
assert.ok(answerDetail.includes("Francisco Javier Marin Sepulveda")&&!answerDetail.includes("TEST OPORTUNIDAD b"));
assert.ok(!answerDetail.includes("francisco.private@example.com"));
assert.ok(!answerDetail.includes("+56987654321"));
assert.ok(!answerDetail.includes("12.345.678-9"));

const privacyContext = {
  ...crmContext,
  data: {
    ...crmContext.data,
    prospects: crmProspects.map((item) => item.id === "p-francisco"
      ? { ...item, full_name: "Francisco Javier Marin Sepulveda 22.418.274-0", company_name: "22.418.274-0" }
      : item),
  },
};
const privacyAnswer = crmAnswer.buildCrmAnswer(qCompare, privacyContext, "agency");
assert.ok(!privacyAnswer.includes("22.418.274-0"), "La comparación no debe exponer RUT aunque esté guardado en nombre o empresa.");
assert.ok(!privacyAnswer.includes("francisco.private@example.com"), "La comparación no debe exponer correos.");
assert.ok(!privacyAnswer.includes("+56987654321"), "La comparación no debe exponer teléfonos.");

const orphanContext = {
  ...crmContext,
  data: {
    ...crmContext.data,
    activities: crmActivities.map((item) => item.id === "a-overdue"
      ? { ...item, prospect_id: null, opportunity_id: "missing-opportunity" }
      : item),
  },
};
const orphanAnswer = crmAnswer.buildCrmAnswer(qUrgency, orphanContext, "agency");
assert.ok(orphanAnswer.includes("ACTIVIDADES PENDIENTES SIN ASOCIACIÓN VÁLIDA"), "Los seguimientos contados en el resumen pero no vinculables deben quedar visibles para corregirlos.");
assert.ok(orphanAnswer.includes("no se atribuyen a un prospecto"), "No debe inventar una asociación cuando falta el vínculo.");
const orphanComparison = crmAnswer.buildCrmAnswer(qCompare, orphanContext, "agency");
assert.ok(orphanComparison.includes("ACTIVIDADES QUE REQUIEREN CORRECCIÓN DE VÍNCULO"), "La comparación también debe explicar los vencimientos huérfanos.");

const multiOpportunityContext = {
  ...crmContext,
  data: {
    ...crmContext.data,
    opportunities: [
      ...crmOpportunities,
      { id:"o-test-2", prospect_id:"p-test", title:"TEST OPORTUNIDAD C", description:null, stage:"qualification", estimated_value:5000000, currency:"CLP", expected_close_date:null, created_at:"2026-11-03T12:00:00.000Z" },
    ],
  },
};
const opportunityAnswer = crmAnswer.buildCrmAnswer("Analiza mis oportunidades comerciales.", multiOpportunityContext, "agency");
const secondOpportunityIndex = opportunityAnswer.indexOf("TEST OPORTUNIDAD C");
assert.ok(secondOpportunityIndex >= 0);
const secondOpportunityBlock = opportunityAnswer.slice(secondOpportunityIndex, opportunityAnswer.indexOf("\n", secondOpportunityIndex));
assert.ok(secondOpportunityBlock.includes("Seguimientos pendientes asociados: 0"), "Una actividad de la primera oportunidad no debe contarse en la segunda.");
console.log("OK: validación funcional integral de las 8 consultas CRM y aislamiento entre oportunidades.");


const duplicateSource = await readFile(
  new URL("../src/features/prospects/lib/duplicate-detection.ts", import.meta.url),
  "utf8",
);
const duplicateCompiled = ts.transpileModule(duplicateSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const duplicateUrl = "data:text/javascript;base64," + Buffer.from(duplicateCompiled).toString("base64");
const duplicateEngine = await import(duplicateUrl);

const existingContact = {
  id: "existing-1",
  full_name: "Ana Pérez",
  company_name: "Agencia Norte",
  email: "ANA@EXAMPLE.COM",
  website: "https://www.agencianorte.cl/",
};
const exactEmail = duplicateEngine.detectProspectDuplicates(
  { full_name: "Ana Perez", email: " ana@example.com " },
  [existingContact],
);
assert.equal(exactEmail.length, 1, "Debe detectar correo exacto ignorando mayúsculas, espacios y tildes del nombre");
assert.equal(exactEmail[0].kind, "confirmed");

const sameName = duplicateEngine.detectProspectDuplicates(
  { full_name: "Ana Pérez", company_name: "Otra empresa", email: "otra@example.com" },
  [existingContact],
);
assert.equal(sameName.length, 1, "Debe advertir coincidencia de nombre aunque el correo sea distinto");
assert.equal(sameName[0].kind, "possible");

const differentPerson = duplicateEngine.detectProspectDuplicates(
  { full_name: "María Pérez", company_name: "Agencia Norte", email: "maria@example.com" },
  [existingContact],
);
assert.equal(differentPerson.length, 0, "No debe marcar a otra persona de la misma empresa como duplicado");

const sameRecord = duplicateEngine.detectProspectDuplicates(
  { id: "existing-1", full_name: "Ana Pérez", email: "ana@example.com" },
  [existingContact],
);
assert.equal(sameRecord.length, 0, "No debe compararse un registro consigo mismo");

console.log("OK: 4 pruebas de detección de duplicados.");

const classificationSource = await readFile(
  new URL("../src/features/data-classification/lib/record-classification.ts", import.meta.url),
  "utf8",
);
const classificationCompiled = ts.transpileModule(classificationSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const classificationUrl = "data:text/javascript;base64," + Buffer.from(classificationCompiled).toString("base64");
const classification = await import(classificationUrl);

const demoId = "b1b0bafd-c2de-41a0-9872-c06711e2d2a7";
const realId = "real-prospect-1";
assert.equal(classification.isDemoProspectId(demoId), true, "Debe reconocer un prospecto demo auditado por ID");
assert.equal(classification.isDemoProspectId(realId), false, "No debe clasificar un prospecto real por un ID no registrado");
const realProspects = classification.filterRealProspects([
  { id: demoId, full_name: "Contacto Demo" },
  { id: realId, full_name: "Contacto Demo" },
]);
assert.equal(realProspects.length, 1, "Debe conservar registros reales aunque compartan el nombre de una demo");
assert.equal(realProspects[0].id, realId);
const realOpportunities = classification.filterRealOpportunities([
  { id: "demo-opp", prospect_id: demoId },
  { id: "real-opp", prospect_id: realId },
]);
assert.deepEqual(realOpportunities.map((item) => item.id), ["real-opp"]);
const realActivities = classification.filterRealActivities([
  { id: "demo-activity", prospect_id: demoId, opportunity_id: null },
  { id: "linked-demo-activity", prospect_id: null, opportunity_id: "demo-opp" },
  { id: "real-activity", prospect_id: realId, opportunity_id: "real-opp" },
], new Set(["demo-opp"]));
assert.deepEqual(realActivities.map((item) => item.id), ["real-activity"]);

console.log("OK: 6 pruebas de clasificación de registros demo.");


const qCompositeRecommendation = "No tengo actividades pendientes ni vencidas. ¿Qué prospecto representa mi mejor oportunidad comercial y qué debería hacer?";
assert.equal(engine.classifyCrmQuery(qCompositeRecommendation), "commercial_recommendation", "Una pregunta que combina ausencia de seguimientos y decisión comercial debe priorizar la recomendación sin perder el módulo de actividades.");
const qContactToday = "¿A quién debería contactar hoy?";
assert.equal(
  engine.classifyCrmQuery(qContactToday),
  "prospect_urgency",
  "Una pregunta natural sobre a quién contactar hoy debe clasificarse como urgencia de prospectos.",
);
assert.equal(
  engine.classifyCrmQuery("¿Qué debería hacer hoy para avanzar con TEST OPORTUNIDAD b y cómo registrar el resultado?"),
  "opportunities",
  "La consulta explícita de una oportunidad no debe desviarse por mencionar hoy o contactar.",
);
const genericContextAnswer = crmAnswer.buildCrmAnswer(
  "¿Cómo puedo mejorar mis ventas?",
  crmContext,
  "agency",
);
assert.ok(
  genericContextAnswer.includes("Esta consulta parece ser de estrategia comercial general") &&
  genericContextAnswer.includes("Cambia al modo OpenAI") &&
  !genericContextAnswer.includes("ACTIVIDADES Y SEGUIMIENTOS") &&
  !genericContextAnswer.includes("OPORTUNIDADES ACTIVAS") &&
  !genericContextAnswer.includes("PROSPECTOS PRIORIZADOS"),
  "Una consulta de estrategia comercial general debe derivarse a OpenAI sin volcar módulos del CRM.",
);
const compositeAnswer = crmAnswer.buildCrmAnswer(qCompositeRecommendation, noUrgencyContext, "agency");
assert.ok(compositeAnswer.includes("ACTIVIDADES Y SEGUIMIENTOS"), "La consulta mixta debe conservar el resumen de actividades solicitado.");
assert.ok(compositeAnswer.includes("PROSPECTOS EVALUADOS PARA RECOMENDACIÓN COMERCIAL"), "La consulta mixta debe ejecutar el ranking comercial.");
assert.ok(compositeAnswer.includes("RECOMENDACIÓN PRINCIPAL PARA HOY"), "La consulta mixta debe entregar una recomendación comercial.");
assert.ok(compositeAnswer.includes("No hay compromisos urgentes registrados. Como siguiente acción comercial, considera contactar a"), "Sin actividades urgentes debe recomendar un candidato comercial respaldado por evidencia.");
console.log("OK: enrutamiento seguro, consultas mixtas y preguntas de contacto para hoy.");

assert.ok(
  assistantSource.includes("selectCommercialRecommendation(prioritizedByPotential)") &&
  assistantSource.includes("prioritizeProspectsByUrgency("),
  "La recomendación y la urgencia deben consumir el motor central, no reglas duplicadas en la vista.",
);
assert.ok(
  assistantSource.includes("function buildDemoAnswer(prompt: string)") &&
  assistantSource.includes("no voy a inventar prospectos") &&
  assistantSource.includes("Para consultar tus registros reales, utiliza el modo CRM"),
  "El fallback del modo Demo debe existir y evitar recomendaciones basadas en prospectos ficticios.",
);
assert.match(
  assistantSource,
  /useState<AssistantMode>\("crm"\)/,
  "El agente debe abrir en modo CRM para consultar datos reales y no responder con simulaciones por defecto.",
);
console.log("OK: modo CRM por defecto y fallback Demo sin datos ficticios.");
