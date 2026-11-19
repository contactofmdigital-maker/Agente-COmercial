"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BUSINESS_SECTOR_OPTIONS, isBusinessSector, type BusinessSector } from "@/features/knowledge/lib/business-templates";
import { Bot, LoaderCircle, RotateCcw, Send, ShieldCheck, Sparkles, UserRound } from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AssistantChatProps = {
  sectorLabel: string;
  knowledgeCount: number;
  enabled: boolean;
  providerConfigured: boolean;
  needsSectorSetup: boolean;
};

const initialMessage: ChatMessage = {
  role: "assistant",
  content: "¡Hola! Soy el asistente comercial de tu negocio. Cuéntame qué necesita tu cliente y te ayudaré a orientar la conversación con la información disponible.",
};

export function AssistantChat({ sectorLabel, knowledgeCount, enabled, providerConfigured, needsSectorSetup }: AssistantChatProps) {
  const router = useRouter();
  const [selectedSector, setSelectedSector] = useState<BusinessSector | "">("");
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();

    if (!content || busy || !enabled) return;

    const previousMessages = messages;
    const nextMessages = [...messages, { role: "user" as const, content }].slice(-10);

    setMessages(nextMessages);
    setDraft("");
    setError("");
    setBusy(true);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok || !data.reply) {
        throw new Error(data.error || "No se pudo obtener una respuesta del agente.");
      }

      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
    } catch (caught) {
      setMessages(previousMessages);
      setDraft(content);
      setError(caught instanceof Error ? caught.message : "Ocurrió un error al contactar al agente.");
    } finally {
      setBusy(false);
    }
  }

  function resetConversation() {
    if (busy) return;
    setMessages([initialMessage]);
    setDraft("");
    setError("");
  }

  return (
    <div className="assistant-chat">
      <div className="assistant-chat-status">
        <span className="assistant-chat-status-dot" />
        <span>{needsSectorSetup ? "Configura el rubro de tu negocio" : enabled ? "Agente listo para pruebas" : !providerConfigured ? "Proveedor IA pendiente" : "Conocimiento incompleto"}</span>
        <span className="assistant-chat-sector">{sectorLabel}</span>
      </div>

      <div className="assistant-chat-knowledge">
        <ShieldCheck size={14} />
        <span>Conocimiento del rubro: <strong>{knowledgeCount}/15</strong></span>
        <span className="assistant-chat-privacy">Historial temporal</span>
      </div>

      {needsSectorSetup && (
        <form
          className="assistant-sector-setup"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!isBusinessSector(selectedSector) || setupBusy) return;
            setSetupBusy(true);
            setSetupError("");
            try {
              const response = await fetch("/api/assistant/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessSector: selectedSector }),
              });
              const data = (await response.json()) as { error?: string };
              if (!response.ok) throw new Error(data.error || "No se pudo configurar el rubro.");
              router.refresh();
            } catch (caught) {
              setSetupError(caught instanceof Error ? caught.message : "No se pudo configurar el rubro.");
            } finally {
              setSetupBusy(false);
            }
          }}
        >
          <strong>Primero, configuremos tu negocio</strong>
          <p>Selecciona el rubro de esta cuenta. Cargaremos sus 15 preguntas y respuestas para que el agente mantenga el contexto correcto.</p>
          <select
            value={selectedSector}
            onChange={(event) => setSelectedSector(isBusinessSector(event.target.value) ? event.target.value : "")}
            required
          >
            <option value="">Selecciona el rubro</option>
            {BUSINESS_SECTOR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button type="submit" disabled={!isBusinessSector(selectedSector) || setupBusy}>
            {setupBusy ? "Configurando..." : "Guardar rubro y cargar conocimiento"}
          </button>
          {setupError && <span role="alert">{setupError}</span>}
        </form>
      )}

      {!enabled && !needsSectorSetup && (
        <div className="assistant-chat-disabled">
          {!providerConfigured
            ? "Falta configurar OPENAI_API_KEY en .env.local. La clave debe permanecer en el servidor y nunca debe llevar el prefijo NEXT_PUBLIC_."
            : "Esta cuenta necesita tener cargadas las 15 preguntas de su rubro para habilitar el agente."}
        </div>
      )}

      <div className="assistant-chat-messages" aria-live="polite" aria-label="Conversación con el agente comercial">
        {messages.map((message, index) => (
          <div className={`assistant-chat-row ${message.role === "user" ? "is-user" : "is-assistant"}`} key={`${index}-${message.role}`}>
            <span className="assistant-chat-avatar">
              {message.role === "assistant" ? <Bot size={15} /> : <UserRound size={15} />}
            </span>
            <div className="assistant-chat-bubble">
              <span className="assistant-chat-sender">{message.role === "assistant" ? "UPSCALE IA" : "TÚ"}</span>
              <p>{message.content}</p>
            </div>
          </div>
        ))}
        {busy && (
          <div className="assistant-chat-row is-assistant">
            <span className="assistant-chat-avatar"><Bot size={15} /></span>
            <div className="assistant-chat-bubble assistant-chat-typing">
              <span className="assistant-chat-sender">UPSCALE IA</span>
              <span><i /><i /><i /></span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && <div className="assistant-chat-error" role="alert">{error}</div>}

      <form className="assistant-chat-form" onSubmit={handleSubmit}>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={enabled ? "Escribe una consulta comercial..." : "Configura el agente para comenzar"}
          rows={2}
          maxLength={1200}
          disabled={!enabled || busy}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button type="submit" aria-label="Enviar mensaje" disabled={!enabled || busy || !draft.trim()}>
          {busy ? <LoaderCircle size={17} className="assistant-chat-spinner" /> : <Send size={17} />}
        </button>
      </form>

      <div className="assistant-chat-footer">
        <span><Sparkles size={13} /> Respuestas basadas en el rubro configurado</span>
        <button type="button" onClick={resetConversation} disabled={busy} aria-label="Reiniciar conversación">
          <RotateCcw size={13} /> Reiniciar
        </button>
      </div>
      <p className="assistant-chat-disclaimer">El agente no envía mensajes ni confirma reservas o ventas. Requiere validación humana cuando faltan datos.</p>
    </div>
  );
}
