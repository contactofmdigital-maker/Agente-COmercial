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

console.log("OK: 22 pruebas del motor y clasificación CRM.");

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
