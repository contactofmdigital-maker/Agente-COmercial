"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bot, Send, Sparkles, User, RotateCcw, LoaderCircle, FlaskConical, Zap, Database, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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

function scoreProspect(prospect: Prospect) {
  let score = 20;
  const reasons: string[] = [];
  const status = prospect.status.toLowerCase();
  if (status === "qualified") { score += 30; reasons.push("Está calificado"); }
  else if (status === "proposal") { score += 35; reasons.push("Tiene propuesta en curso"); }
  else if (status === "contacted") { score += 15; reasons.push("Ya existe contacto"); }
  else if (status === "new") { score += 5; reasons.push("Es un contacto nuevo"); }
  else if (status === "won") { score += 10; reasons.push("Cliente ganado: oportunidad de continuidad"); }
  else if (status === "lost") { score -= 15; reasons.push("Figura como perdido"); }

  if (prospect.email) { score += 8; reasons.push("Tiene correo disponible"); }
  if (prospect.website) { score += 7; reasons.push("Tiene sitio web para investigar"); }
  if (prospect.company_name) { score += 5; reasons.push("Tiene empresa identificada"); }

  const notes = (prospect.notes ?? "").toLowerCase();
  const positiveSignals = ["interes", "solicit", "cotiz", "presupuesto", "reunion", "urgente", "necesita", "propuesta", "comprar", "reserv"];
  const negativeSignals = ["no responde", "sin respuesta", "no interesado", "rechaz", "más adelante", "mas adelante"];
  if (positiveSignals.some((term) => notes.includes(term))) { score += 15; reasons.push("Las notas contienen señales de interés o necesidad"); }
  if (negativeSignals.some((term) => notes.includes(term))) { score -= 10; reasons.push("Las notas indican fricción o baja respuesta"); }

  const daysSinceCreated = Math.floor((Date.now() - new Date(prospect.created_at).getTime()) / 86400000);
  if (daysSinceCreated <= 7) { score += 5; reasons.push("Registro reciente"); }
  score = Math.max(0, Math.min(100, score));
  return { score, reasons };
}

function getSegmentAction(segment: BusinessSegment, prospect: Prospect) {
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

function buildCrmAnswer(prompt: string, prospects: Prospect[], segment: BusinessSegment) {
  const label = segmentOptions.find((item) => item.value === segment)?.label ?? "Negocio";
  const header = "MODO CRM · Datos reales de tu CRM; puntuación heurística, no predicción de IA.\nPerfil: " + label + ". " + segmentGuidance[segment] + "\n\n";
  if (!prospects.length) {
    return header + "Todavía no hay prospectos disponibles en tu CRM. Registra contactos o importa un CSV desde el módulo Prospectos y vuelve a intentarlo. No se han creado datos ficticios.";
  }

  const ranked = prospects
    .map((prospect) => ({ prospect, ...scoreProspect(prospect) }))
    .sort((a, b) => b.score - a.score);

  const asksForMessage = /mensaje|correo|contact|prospecci|whatsapp/i.test(prompt);
  const asksForFollowup = /seguimiento|follow|no responde/i.test(prompt);

  const lines = ranked.slice(0, 10).map((item, index) => {
    const p = item.prospect;
    const action = getSegmentAction(segment, p);
    const signals = item.reasons.length ? item.reasons.join("; ") : "Información comercial limitada";
    const statusLabels: Record<string, string> = { new: "Nuevo", contacted: "Contactado", qualified: "Calificado", proposal: "Propuesta", won: "Ganado", lost: "Perdido" };
    return (index + 1) + ". " + p.full_name + (p.company_name ? " — " + p.company_name : "") +
      "\n   Puntuación: " + item.score + "/100 · Estado: " + (statusLabels[p.status] ?? p.status) +
      "\n   Señales: " + signals +
      "\n   Próxima acción: " + action;
  });

  let response = header + "RESULTADO DE PRIORIZACIÓN\nSe analizaron " + prospects.length + " prospectos reales (máximo 100 cargados). Ordenados mediante reglas transparentes:\n\n" + lines.join("\n\n");
  if (asksForMessage || asksForFollowup) {
    const first = ranked[0].prospect;
    response += "\n\nBORRADOR PARA EL CONTACTO PRIORITARIO\nHola, " + first.full_name + ". Quería retomar el contacto para conocer mejor tus prioridades y evaluar si podemos ayudarte con una solución adecuada para " + (first.company_name || "tu negocio") + ". ¿Te parece si coordinamos una breve conversación?\n\nRevisa y personaliza este texto antes de enviarlo.";
  }
  response += "\n\nNota: el scoring es una ayuda operativa basada solo en estado, campos disponibles, palabras clave de notas y antigüedad del registro. No mide presupuesto, intención real ni probabilidad estadística de cierre.";
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
        const supabase = createClient();
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!auth.user) throw new Error("Tu sesión no está activa. Inicia sesión nuevamente.");
        const { data, error: queryError } = await supabase
          .from("sales_prospects")
          .select("id,full_name,company_name,email,website,country,notes,status,created_at")
          .eq("user_id", auth.user.id)
          .order("created_at", { ascending: false })
          .limit(100);
        if (queryError) throw queryError;
        const answer = buildCrmAnswer(content, (data ?? []) as Prospect[], segment);
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
          ? "Modo CRM activado. Consultaré tus prospectos reales de Supabase y aplicaré reglas transparentes de priorización. No consume tokens."
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
        {mode === "demo" ? "Simulación local · Sin llamadas a OpenAI." : mode === "crm" ? "CRM real · Reglas comerciales locales · Sin tokens." : "OpenAI · Contexto del CRM · Puede consumir cuota de API."}
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
        {busy && <div className="assistant-message assistant"><div className="assistant-message-avatar"><Bot size={15} /></div><div className="assistant-message-content"><span>UPSCALE IA</span><p className="assistant-thinking"><LoaderCircle size={15} /> {mode === "demo" ? "Preparando simulación..." : mode === "crm" ? "Consultando tus prospectos..." : "Analizando contexto comercial..."}</p></div></div>}
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
