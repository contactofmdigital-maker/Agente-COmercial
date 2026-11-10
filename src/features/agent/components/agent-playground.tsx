"use client";

import { useState } from "react";
import { Bot, RotateCcw, Send, ShieldCheck, UserRound } from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string; meta?: string };

export function AgentPlayground() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Prueba aquí el comportamiento de tu agente. Esta simulación usa reglas y conocimiento publicado; no consume tokens ni envía mensajes externos." }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastDecision, setLastDecision] = useState("");

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    const history = messages.filter((item) => item.meta !== "intro").map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, { role: "user", content: message }]);
    setInput(""); setBusy(true); setError("");
    try {
      const response = await fetch("/api/agent/orchestrate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, messages: history.slice(-10) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo procesar el mensaje.");
      setMessages((current) => [...current, { role: "assistant", content: payload.answer, meta: payload.route }]);
      setLastDecision(payload.route + " · " + payload.intent + " · " + payload.confidence);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo conectar con el motor.");
    } finally { setBusy(false); }
  }

  function reset() {
    setMessages([{ role: "assistant", content: "Simulación reiniciada. Escribe como si fueras un cliente potencial.", meta: "intro" }]);
    setLastDecision(""); setError("");
  }

  return (
    <section className="agent-playground">
      <header className="agent-playground-head">
        <div><span className="panel-kicker">LABORATORIO · FASE 03</span><h3>Simulador del motor comercial</h3><p>Ensaya consultas y observa cómo el motor decide responder, calificar o derivar.</p></div>
        <span className="agent-playground-local"><ShieldCheck size={13} /> SIN IA · SIN TOKENS</span>
      </header>
      <div className="agent-playground-chat" aria-live="polite">
        {messages.map((item, index) => <div key={index} className={item.role === "user" ? "agent-playground-message user" : "agent-playground-message assistant"}>
          <span className="agent-playground-avatar">{item.role === "user" ? <UserRound size={15} /> : <Bot size={15} />}</span>
          <div><strong>{item.role === "user" ? "Cliente" : "Agente"}</strong><p>{item.content}</p>{item.meta && item.meta !== "intro" && <small>Decisión: {item.meta.replaceAll("_", " ")}</small>}</div>
        </div>)}
        {busy && <div className="agent-playground-wait">El motor está evaluando la consulta...</div>}
      </div>
      {lastDecision && <div className="agent-playground-decision"><ShieldCheck size={14} /> Última decisión: {lastDecision}</div>}
      {error && <div className="notice error" role="alert">{error}</div>}
      <form className="agent-playground-compose" onSubmit={send}>
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ej. ¿Cuánto cuesta una landing page?" maxLength={2000} aria-label="Mensaje de prueba" />
        <button className="button button-primary" type="submit" disabled={busy || !input.trim()}><Send size={15} /> Enviar</button>
        <button className="button button-secondary" type="button" onClick={reset} disabled={busy} aria-label="Reiniciar simulación"><RotateCcw size={15} /></button>
      </form>
      <p className="agent-playground-footnote">Entorno de prueba aislado: no crea prospectos, no modifica el CRM y no ejecuta derivaciones ni envíos reales.</p>
    </section>
  );
}
