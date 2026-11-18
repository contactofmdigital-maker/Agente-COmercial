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

const keys = ["digital_services", "furniture", "real_estate"];
const allKnowledge = keys.flatMap((key) =>
  businessTemplates[key].entries.map((entry, index) => ({
    id: key + "-" + index,
    title: entry.title,
    content: entry.content,
    category: entry.category,
  }))
);

// Preguntas inéditas: no repiten los títulos de las plantillas.
// Las preguntas supported deben recuperar la fuente indicada.
// Las preguntas unsupported deben abstenerse de responder desde una fuente no pertinente.
const cases = [
  { group: "Servicios digitales", question: "Necesito una página para que las personas dejen sus datos y me contacten.", expected: "digital_services-3" },
  { group: "Servicios digitales", question: "¿Puedo promocionar un solo servicio sin montar un sitio con muchas secciones?", expected: "digital_services-1" },
  { group: "Servicios digitales", question: "¿Puedo incluir un botón para que me escriban directamente por WhatsApp?", expected: "digital_services-8" },
  { group: "Servicios digitales", question: "¿Me aseguran quedar en el primer resultado de Google?", expected: "digital_services-10" },
  { group: "Servicios digitales", question: "¿Cuántas visitas y ventas obtendré durante la primera semana?", expected: null },
  { group: "Muebles", question: "Busco un mueble para que mi hija dibuje, ¿qué opciones tienen?", expected: "furniture-1" },
  { group: "Muebles", question: "Si les mando una captura, ¿pueden reconocer qué modelo es?", expected: "furniture-8" },
  { group: "Muebles", question: "¿Puedo escoger el acabado según la decoración de la habitación?", expected: "furniture-5" },
  { group: "Muebles", question: "¿Cómo averiguo si todavía queda una unidad del modelo que vi?", expected: "furniture-7" },
  { group: "Muebles", question: "¿La mesita soporta 80 kilos?", expected: null },
  { group: "Inmobiliaria", question: "Soy dueño de un departamento y quiero ponerlo en venta, ¿qué datos les paso?", expected: "real_estate-1" },
  { group: "Inmobiliaria", question: "Busco una vivienda en arriendo: ¿qué presupuesto y características debo indicar?", expected: "real_estate-3" },
  { group: "Inmobiliaria", question: "¿Podemos reservar una hora para conocer la casa?", expected: "real_estate-5" },
  { group: "Inmobiliaria", question: "Si presento una oferta, ¿queda aceptada automáticamente?", expected: "real_estate-10" },
  { group: "Inmobiliaria", question: "¿El banco aprobará mi crédito hipotecario?", expected: null },
];

let passed = 0;
const failures = [];

for (const testCase of cases) {
  const result = engine.orchestrateConversation({
    message: testCase.question,
    messages: [],
    config,
    knowledge: allKnowledge,
    businessContext: "",
  });
  const sourceIds = result.sources.map((source) => source.id);
  const wrongBusiness = sourceIds.some((id) => !id.startsWith(
    testCase.group === "Servicios digitales" ? "digital_services-"
      : testCase.group === "Muebles" ? "furniture-" : "real_estate-"
  ));
  const ok = testCase.expected
    ? result.route === "answer_from_knowledge"
      && sourceIds.includes(testCase.expected)
      && !wrongBusiness
    : result.route !== "answer_from_knowledge" && sourceIds.length === 0;

  if (ok) {
    passed += 1;
    console.log("PASS [" + testCase.group + "] " + testCase.question);
    console.log("  -> " + (testCase.expected || "abstención segura") + " | " + result.route);
  } else {
    const failure = {
      group: testCase.group,
      question: testCase.question,
      expected: testCase.expected || "sin fuente / abstención",
      route: result.route,
      confidence: result.confidence,
      sources: sourceIds,
      answer: result.answer,
    };
    failures.push(failure);
    console.log("FAIL [" + testCase.group + "] " + testCase.question);
    console.log("  -> esperado=" + failure.expected + " | route=" + result.route + " | sources=" + sourceIds.join(","));
  }
}

console.log("\nRESULTADO PREGUNTAS INÉDITAS: " + passed + "/" + cases.length);
console.log("FALLOS: " + failures.length);
if (failures.length) {
  console.log("\nDETALLE DE FALLOS:");
  for (const failure of failures) console.log(JSON.stringify(failure, null, 2));
  process.exitCode = 1;
} else {
  console.log("OK: recuperación pertinente y abstención segura en las preguntas inéditas.");
}
