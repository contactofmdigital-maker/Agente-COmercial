"use client";

import { FormEvent, useState } from "react";
import { Bot, Send, Sparkles, User, RotateCcw, LoaderCircle } from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const suggestions = [
  "Analiza mis prospectos y dime a cuáles debería priorizar.",
  "Ayúdame a redactar un primer mensaje de prospección.",
  "Prepara respuestas para una objeción de precio.",
];

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hola. Soy tu Agente Comercial de UpScale IA. Puedo ayudarte a priorizar prospectos, preparar mensajes, responder objeciones y definir próximos pasos usando la información de tu CRM. ¿Qué necesitas trabajar hoy?",
    },
  ]);
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

  return (
    <div className="assistant-chat">
      <div className="assistant-chat-toolbar">
        <span><span className="assistant-online-dot" /> Asistente listo para conversar</span>
        <button
          type="button"
          className="assistant-reset"
          onClick={() => {
            setMessages([{ role: "assistant", content: "Conversación reiniciada. ¿Qué objetivo comercial quieres trabajar?" }]);
            setError("");
          }}
          disabled={busy}
          aria-label="Reiniciar conversación"
          title="Reiniciar conversación"
        >
          <RotateCcw size={14} /> Reiniciar
        </button>
      </div>

      <div className="assistant-messages" aria-live="polite">
        {messages.map((message, index) => (
          <div className={`assistant-message ${message.role}`} key={index}>
            <div className="assistant-message-avatar">
              {message.role === "assistant" ? <Bot size={15} /> : <User size={15} />}
            </div>
            <div className="assistant-message-content">
              <span>{message.role === "assistant" ? "UPSCALE IA" : "TÚ"}</span>
              <p>{message.content}</p>
            </div>
          </div>
        ))}
        {busy && (
          <div className="assistant-message assistant">
            <div className="assistant-message-avatar"><Bot size={15} /></div>
            <div className="assistant-message-content">
              <span>UPSCALE IA</span>
              <p className="assistant-thinking"><LoaderCircle size={15} /> Analizando contexto comercial...</p>
            </div>
          </div>
        )}
      </div>

      {messages.length === 1 && (
        <div className="assistant-suggestions">
          {suggestions.map((suggestion) => (
            <button type="button" key={suggestion} onClick={() => void sendMessage(undefined, suggestion)} disabled={busy}>
              <Sparkles size={13} /> {suggestion}
            </button>
          ))}
        </div>
      )}

      {error && <div className="assistant-error" role="alert">{error}</div>}

      <form className="assistant-composer" onSubmit={(event) => void sendMessage(event)}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Escribe tu consulta comercial..."
          rows={2}
          maxLength={4000}
          disabled={busy}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void sendMessage();
            }
          }}
        />
        <button type="submit" className="button button-primary" disabled={busy || !input.trim()}>
          {busy ? <LoaderCircle size={16} className="assistant-spin" /> : <Send size={16} />}
          Enviar
        </button>
      </form>
      <div className="assistant-foot">
        <span className="mini-dot" /> Las respuestas son sugerencias. Tú revisas y autorizas cada acción comercial.
      </div>
    </div>
  );
}
