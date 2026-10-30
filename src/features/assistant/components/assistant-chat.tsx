"use client";

import { FormEvent, useState } from "react";
import { Bot, Send, Sparkles, User, RotateCcw, LoaderCircle, FlaskConical, Zap } from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string };
type AssistantMode = "demo" | "openai";

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
  return disclaimer + "ANÁLISIS COMERCIAL DE EJEMPLO\n\nPara demostrar la priorización, considera estos prospectos ficticios:\n\n1. Empresa Norte — prioridad alta: solicitó información y tiene una necesidad definida. Acción: contactar hoy y agendar diagnóstico.\n2. Estudio Central — prioridad media: mostró interés, pero no confirmó presupuesto ni plazo. Acción: enviar una pregunta de calificación.\n3. Comercio Sur — prioridad baja: contacto inicial sin respuesta. Acción: realizar un seguimiento breve y luego pausar.\n\nCriterios: intención, necesidad, interacción reciente y claridad del próximo paso. Estos datos son ficticios; para analizar tu CRM real cambia a Modo OpenAI cuando tengas cuota disponible.";
}

export function AssistantChat() {
  const [mode, setMode] = useState<AssistantMode>("demo");
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: welcomeMessage }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
    } catch {
      setError("No se pudo conectar con el asistente. Comprueba tu conexión e inténtalo otra vez.");
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
        ? "Modo Demo activado. Puedes probar los flujos comerciales sin consumir créditos de OpenAI. Las respuestas usan ejemplos ilustrativos, no datos reales del CRM."
        : "Modo OpenAI activado. Las respuestas utilizarán la API y el contexto de tus prospectos del CRM. Este modo puede consumir cuota de tu cuenta.",
    }]);
    setError("");
  }

  return (
    <div className="assistant-chat">
      <div className="assistant-mode-switch" role="group" aria-label="Modo del agente">
        <button type="button" className={mode === "demo" ? "active" : ""} onClick={() => changeMode("demo")} disabled={busy}>
          <FlaskConical size={14} /> Modo Demo <small>Gratis</small>
        </button>
        <button type="button" className={mode === "openai" ? "active" : ""} onClick={() => changeMode("openai")} disabled={busy}>
          <Zap size={14} /> Modo OpenAI
        </button>
      </div>
      <div className={`assistant-mode-note ${mode}`}>
        {mode === "demo" ? "Simulación local · Sin llamadas a OpenAI ni consumo de tokens." : "Conectado a OpenAI · Utiliza cuota de API y contexto del CRM."}
      </div>
      <div className="assistant-chat-toolbar">
        <span><span className="assistant-online-dot" /> {mode === "demo" ? "Demo lista para probar" : "Agente listo para conversar"}</span>
        <button type="button" className="assistant-reset" onClick={() => { setMessages([{ role: "assistant", content: "Conversación reiniciada. ¿Qué objetivo comercial quieres trabajar?" }]); setError(""); }} disabled={busy} aria-label="Reiniciar conversación" title="Reiniciar conversación">
          <RotateCcw size={14} /> Reiniciar
        </button>
      </div>
      <div className="assistant-messages" aria-live="polite">
        {messages.map((message, index) => (
          <div className={`assistant-message ${message.role}`} key={index}>
            <div className="assistant-message-avatar">{message.role === "assistant" ? <Bot size={15} /> : <User size={15} />}</div>
            <div className="assistant-message-content">
              <span>{message.role === "assistant" ? "UPSCALE IA" : "TÚ"}</span>
              <p>{message.content}</p>
            </div>
          </div>
        ))}
        {busy && <div className="assistant-message assistant"><div className="assistant-message-avatar"><Bot size={15} /></div><div className="assistant-message-content"><span>UPSCALE IA</span><p className="assistant-thinking"><LoaderCircle size={15} /> {mode === "demo" ? "Preparando simulación..." : "Analizando contexto comercial..."}</p></div></div>}
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
