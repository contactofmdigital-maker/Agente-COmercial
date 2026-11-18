import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function loadTsModule(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import("data:text/javascript;base64," + Buffer.from(compiled).toString("base64"));
}

const [{ businessTemplates }, engine] = await Promise.all([
  loadTsModule("../src/features/knowledge/lib/business-templates.ts"),
  loadTsModule("../src/features/agent/lib/orchestration.ts"),
]);

const config = {
  agent_name: "Asistente comercial",
  objective: "Responder consultas usando información publicada.",
  tone: "professional",
  personality: "Cercano y resolutivo.",
  greeting: "Hola, ¿en qué puedo ayudarte?",
  language: "es",
  response_style: "clear",
  target_customer: "",
  qualification_questions: "",
  restrictions: "No inventar información.",
  knowledge_entry_ids: [],
  human_handoff_enabled: false,
  handoff_triggers: "",
  handoff_message: "",
};

const keys = ["digital_services", "furniture", "real_estate", "barber_shop", "quick_service", "professional_services"];
const allKnowledge = keys.flatMap((key) =>
  businessTemplates[key].entries.map((entry, index) => ({
    id: key + "-" + index,
    title: entry.title,
    content: entry.content,
    category: entry.category,
    template: key,
  }))
);

let passed = 0;
const failures = [];

for (const key of keys) {
  const entries = businessTemplates[key].entries;
  assert.equal(entries.length, 15, key + " debe contener exactamente 15 preguntas.");

  for (const [index, entry] of entries.entries()) {
    const expectedId = key + "-" + index;
    const result = engine.orchestrateConversation({
      message: entry.title,
      messages: [],
      config,
      knowledge: allKnowledge,
      businessContext: "",
    });

    const correctSource = result.sources.some((source) => source.id === expectedId);
    const wrongSource = result.sources.some((source) => !source.id.startsWith(key + "-"));
    const ok = result.route === "answer_from_knowledge"
      && correctSource
      && !wrongSource
      && result.answer.includes(entry.content);

    if (ok) {
      passed += 1;
      console.log("PASS [" + key + " " + (index + 1) + "/15] " + entry.title);
    } else {
      failures.push({
        template: key,
        number: index + 1,
        question: entry.title,
        route: result.route,
        intent: result.intent,
        confidence: result.confidence,
        sources: result.sources.map((source) => source.id),
        answer: result.answer,
      });
      console.log("FAIL [" + key + " " + (index + 1) + "/15] " + entry.title);
      console.log("  route=" + result.route + " confidence=" + result.confidence + " sources=" + result.sources.map((source) => source.id).join(","));
    }
  }
}

// Regresiones semánticas: variantes de SEO y montaje deben recuperar la fuente específica.
const semanticRegressions = [
  { label: "SEO por sinónimos", question: "¿Una landing page incluye posicionamiento SEO en Google?", expected: "digital_services-10", forbidden: ["furniture-", "real_estate-"] },
  { label: "Montaje por sinónimos", question: "¿Hay que armar los muebles?", expected: "furniture-11", forbidden: ["digital_services-", "real_estate-"] },
  { label: "Montaje como armado", question: "¿Los muebles vienen para ensamblar?", expected: "furniture-11", forbidden: ["digital_services-", "real_estate-"] },
  { label: "Montaje como instalación", question: "¿Necesito montar yo mismo el mueble?", expected: "furniture-11", forbidden: ["digital_services-", "real_estate-"] },
  { label: "Definición de landing page", question: "¿Qué es una landing page?", expected: "digital_services-0", forbidden: ["furniture-", "real_estate-"] },
  { label: "Página para promocionar servicios", question: "Quiero una página para promocionar mis servicios.", expected: "digital_services-2", forbidden: ["furniture-", "real_estate-"] },
];
let semanticPassed = 0;
for (const regression of semanticRegressions) {
  const result = engine.orchestrateConversation({
    message: regression.question,
    messages: [],
    config,
    knowledge: allKnowledge,
    businessContext: "",
  });
  const sourceIds = result.sources.map((source) => source.id);
  const expectedTemplatePrefix = regression.expected.replace(/-\\d+$/, "-");
  const ok = result.route === "answer_from_knowledge"
    && sourceIds.includes(regression.expected)
    && sourceIds.every((id) => id.startsWith(expectedTemplatePrefix))
    && !sourceIds.some((id) => regression.forbidden.some((prefix) => id.startsWith(prefix)));
  if (ok) {
    semanticPassed += 1;
    console.log("PASS [regresión] " + regression.label + " -> " + regression.expected);
  } else {
    failures.push({
      template: "semantic_regression",
      question: regression.question,
      expected: regression.expected,
      route: result.route,
      sources: sourceIds,
      answer: result.answer,
    });
    console.log("FAIL [regresión] " + regression.label + " expected=" + regression.expected + " sources=" + sourceIds.join(","));
  }
}

console.log("\nRESULTADO: " + passed + "/" + (keys.length * 15) + " preguntas exactas aprobadas.");
console.log("REGRESIONES SEMÁNTICAS: " + semanticPassed + "/" + semanticRegressions.length + " aprobadas.");
console.log("FALLOS: " + failures.length);

if (failures.length) {
  console.log("\nDETALLE DE FALLOS:");
  for (const failure of failures) {
    console.log(JSON.stringify(failure, null, 2));
  }
  process.exitCode = 1;
} else {
  console.log("OK: todas las preguntas recuperan su respuesta y fuente correctas sin mezclar plantillas.");
}
