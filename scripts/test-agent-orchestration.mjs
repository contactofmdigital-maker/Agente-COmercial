import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/features/agent/lib/orchestration.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const engine = await import("data:text/javascript;base64," + Buffer.from(compiled).toString("base64"));

const config = {
  agent_name: "Asistente comercial",
  objective: "Atender consultas y calificar oportunidades.",
  tone: "professional",
  personality: "Cercano y resolutivo.",
  greeting: "Hola, ¿en qué puedo ayudarte?",
  language: "es",
  response_style: "clear",
  target_customer: "",
  qualification_questions: "",
  restrictions: "No inventar información.",
  knowledge_entry_ids: [],
  human_handoff_enabled: true,
  handoff_triggers: "Solicitud explícita de una persona o reclamación.",
  handoff_message: "Te derivaré con una persona del equipo.",
};

const first = engine.orchestrateConversation({
  message: "Quiero cotizar una landing page para mi empresa.",
  messages: [],
  config,
  knowledge: [{ id: "unselected", title: "Landing page", content: "Precio: 100 USD", category: "product" }],
});
assert.equal(first.route, "qualify", "El interés comercial debe priorizarse sobre una coincidencia de conocimiento.");
assert.match(first.answer, /nombre/i);
assert.equal(first.sources.length, 0, "No debe usar conocimiento no autorizado.");

const second = engine.orchestrateConversation({
  message: "Mi nombre es Francisco Marín.",
  messages: [{ role: "user", content: "Quiero cotizar una landing page para mi empresa." }, { role: "assistant", content: first.answer }],
  config,
  knowledge: [],
});
assert.equal(second.route, "qualify");
assert.match(second.answer, /correo o teléfono/i);
assert.equal(second.lead_capture.name, "Francisco Marín");

const third = engine.orchestrateConversation({
  message: "Mi correo es prueba@empresa.cl y mi presupuesto es de 150 USD.",
  messages: [
    { role: "user", content: "Quiero cotizar una landing page para mi empresa." },
    { role: "assistant", content: first.answer },
    { role: "user", content: "Mi nombre es Francisco Marín." },
    { role: "assistant", content: second.answer },
  ],
  config,
  knowledge: [],
});
assert.equal(third.route, "qualify", "Una cotización no debe provocar derivación automática.");
assert.equal(third.handoff_required, false);
assert.equal(third.lead_capture.name, "Francisco Marín");
assert.equal(third.lead_capture.email, "prueba@empresa.cl");
assert.match(third.lead_capture.budget ?? "", /150\s*USD/i);
assert.match(third.answer, /empresa/i, "Debe preguntar por el siguiente dato faltante.");

const human = engine.orchestrateConversation({
  message: "Quiero hablar con una persona.",
  messages: [],
  config,
  knowledge: [],
});
assert.equal(human.route, "handoff", "La solicitud explícita de una persona sí debe derivarse.");
assert.equal(human.handoff_required, true);

console.log("OK: 4 escenarios del motor comercial (captura progresiva, prioridad comercial, fuentes autorizadas y derivación explícita).");
