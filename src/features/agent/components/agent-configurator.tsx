"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, CheckCircle2, CircleHelp, LoaderCircle, MessageCircle, Save, ShieldCheck, Sparkles, BookOpen, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AgentPlayground } from "@/features/agent/components/agent-playground";

type Tone = "professional" | "friendly" | "consultative" | "premium" | "direct";
type AgentConfig = {
  agent_name: string; enabled: boolean; objective: string; tone: Tone; personality: string;
  greeting: string; language: string; response_style: string; target_customer: string;
  qualification_questions: string; restrictions: string; knowledge_entry_ids: string[];
  human_handoff_enabled: boolean; handoff_triggers: string; handoff_contact: string;
  handoff_message: string; whatsapp_enabled: boolean; whatsapp_number: string; channel_notes: string;
};
type KnowledgeEntry = { id: string; title: string; category: string; content: string; status: string };

const defaults: AgentConfig = {
  agent_name: "Asistente comercial", enabled: false,
  objective: "Atender consultas, orientar a potenciales clientes y convertir oportunidades comerciales.",
  tone: "professional", personality: "Cercano, resolutivo y orientado a ayudar. No presiona al cliente.",
  greeting: "¡Hola! Gracias por comunicarte. ¿En qué puedo ayudarte?",
  language: "es", response_style: "clear",
  target_customer: "", qualification_questions: "¿Qué producto o servicio te interesa?\n¿Para cuándo lo necesitas?\n¿En qué ciudad o zona te encuentras?",
  restrictions: "No inventar precios, disponibilidad, características ni condiciones. Si falta información, reconocerlo y ofrecer derivación humana.",
  knowledge_entry_ids: [], human_handoff_enabled: true,
  handoff_triggers: "Cuando el cliente solicite una persona, presente una reclamación, negocie condiciones especiales o la respuesta no esté respaldada por información publicada.",
  handoff_contact: "", handoff_message: "Voy a derivar tu consulta a una persona del equipo para que pueda ayudarte. ¡Gracias por tu paciencia!",
  whatsapp_enabled: false, whatsapp_number: "", channel_notes: "Canal preparado. La conexión con WhatsApp se realizará en una fase posterior."
};

const tones: { value: Tone; label: string; detail: string }[] = [
  { value: "professional", label: "Profesional", detail: "Claro, confiable y cordial." },
  { value: "friendly", label: "Cercano", detail: "Conversacional y amable." },
  { value: "consultative", label: "Consultivo", detail: "Pregunta, comprende y recomienda." },
  { value: "premium", label: "Premium", detail: "Atención cuidada y lenguaje elegante." },
  { value: "direct", label: "Directo", detail: "Breve, concreto y orientado a la acción." }
];

export function AgentConfigurator() {
  const [config, setConfig] = useState<AgentConfig>(defaults);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [hasConfig, setHasConfig] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = createClient();
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!auth.user) throw new Error("Tu sesión no está activa. Inicia sesión nuevamente.");
        const [configResult, knowledgeResult] = await Promise.all([
          supabase.from("agent_configurations").select("*").eq("user_id", auth.user.id).maybeSingle(),
          supabase.from("agent_knowledge_entries").select("id,title,category,content,status").eq("user_id", auth.user.id).eq("status", "published").order("updated_at", { ascending: false })
        ]);
        if (configResult.error) throw configResult.error;
        if (knowledgeResult.error) throw knowledgeResult.error;
        if (!active) return;
        if (configResult.data) {
          const saved = configResult.data as Partial<AgentConfig>;
          setConfig({ ...defaults, ...saved, knowledge_entry_ids: saved.knowledge_entry_ids ?? [] });
          setHasConfig(true);
        }
        setKnowledge((knowledgeResult.data ?? []) as KnowledgeEntry[]);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "No se pudo cargar la configuración del agente.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  function update<K extends keyof AgentConfig>(key: K, value: AgentConfig[K]) {
    setConfig(current => ({ ...current, [key]: value }));
    setNotice("");
  }

  function toggleKnowledge(id: string) {
    setConfig(current => ({
      ...current,
      knowledge_entry_ids: current.knowledge_entry_ids.includes(id)
        ? current.knowledge_entry_ids.filter(item => item !== id)
        : [...current.knowledge_entry_ids, id]
    }));
    setNotice("");
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      const supabase = createClient();
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("Tu sesión no está activa. Inicia sesión nuevamente.");
      const payload = { user_id: auth.user.id, ...config, agent_name: config.agent_name.trim() };
      const { error: saveError } = await supabase.from("agent_configurations").upsert(payload, { onConflict: "user_id" });
      if (saveError) throw saveError;
      setHasConfig(true);
      setNotice("Configuración guardada en Supabase. El agente aún no está conectado a IA ni a WhatsApp.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la configuración.");
    } finally { setSaving(false); }
  }

  const selectedKnowledge = useMemo(() => knowledge.filter(item => config.knowledge_entry_ids.includes(item.id)), [knowledge, config.knowledge_entry_ids]);
  const tone = tones.find(item => item.value === config.tone)!;

  if (loading) return <div className="agent-config-loading"><LoaderCircle size={18} className="assistant-spin" /> Cargando configuración del agente...</div>;

  return (
    <div className="agent-config">
      <div className="agent-config-banner">
        <div className="agent-config-banner-icon"><Bot size={22} /></div>
        <div><strong>Diseña cómo debe comportarse tu agente</strong><p>Define identidad, objetivos, conocimiento, límites y derivación humana. Todo se guarda sin conectar modelos de IA ni consumir tokens.</p></div>
        <span className={config.enabled ? "agent-state agent-state-on" : "agent-state"}>{config.enabled ? "HABILITACIÓN CONFIGURADA" : "EN PREPARACIÓN"}</span>
      </div>

      <div className="agent-config-summary">
        <div><span>IDENTIDAD</span><strong>{config.agent_name || "Sin nombre"}</strong></div>
        <div><span>CONOCIMIENTO</span><strong>{selectedKnowledge.length} / {knowledge.length}</strong></div>
        <div><span>DERIVACIÓN HUMANA</span><strong>{config.human_handoff_enabled ? "Activada" : "Desactivada"}</strong></div>
        <div><span>WHATSAPP</span><strong>{config.whatsapp_enabled ? "Preparado" : "Pendiente"}</strong></div>
      </div>

      <form className="agent-config-form" onSubmit={save}>
        <section className="agent-config-card">
          <div className="agent-config-card-head"><div><span className="panel-kicker">01 · IDENTIDAD</span><h3>Nombre y personalidad</h3><p>La identidad que tendrá el asistente al conversar con tus clientes.</p></div><Bot size={19} /></div>
          <label className="agent-toggle"><input type="checkbox" checked={config.enabled} onChange={e => update("enabled", e.target.checked)} /><span><strong>Marcar agente como habilitado para una futura conexión</strong><small>Este ajuste guarda tu preferencia; no activa IA ni conecta WhatsApp.</small></span></label>
          <div className="agent-config-grid">
            <div className="agent-field"><label htmlFor="agent-name">Nombre del agente</label><input id="agent-name" value={config.agent_name} onChange={e => update("agent_name", e.target.value)} maxLength={80} minLength={2} required /></div>
            <div className="agent-field"><label htmlFor="agent-language">Idioma principal</label><select id="agent-language" value={config.language} onChange={e => update("language", e.target.value)}><option value="es">Español</option><option value="en">Inglés</option><option value="pt">Portugués</option></select></div>
            <div className="agent-field agent-field-full"><label htmlFor="agent-personality">Personalidad e instrucciones de comportamiento</label><textarea id="agent-personality" rows={3} value={config.personality} onChange={e => update("personality", e.target.value)} placeholder="Describe cómo debe expresarse y comportarse..." maxLength={3000} /></div>
            <div className="agent-field agent-field-full"><label htmlFor="agent-greeting">Saludo inicial</label><input id="agent-greeting" value={config.greeting} onChange={e => update("greeting", e.target.value)} maxLength={500} placeholder="Mensaje con el que inicia una conversación" /></div>
          </div>
        </section>

        <section className="agent-config-card">
          <div className="agent-config-card-head"><div><span className="panel-kicker">02 · ESTRATEGIA</span><h3>Objetivo y estilo comercial</h3><p>Define qué busca conseguir y cómo debe orientar la conversación.</p></div><Sparkles size={19} /></div>
          <div className="agent-field"><label htmlFor="agent-objective">Objetivo comercial principal</label><textarea id="agent-objective" rows={2} value={config.objective} onChange={e => update("objective", e.target.value)} maxLength={1500} /></div>
          <div className="agent-tone-grid">{tones.map(item => <button type="button" key={item.value} className={config.tone === item.value ? "agent-tone-option selected" : "agent-tone-option"} onClick={() => update("tone", item.value)}><strong>{item.label}</strong><small>{item.detail}</small></button>)}</div>
          <div className="agent-config-grid">
            <div className="agent-field"><label htmlFor="agent-response-style">Formato de respuesta</label><select id="agent-response-style" value={config.response_style} onChange={e => update("response_style", e.target.value)}><option value="clear">Claro y equilibrado</option><option value="concise">Breve y directo</option><option value="detailed">Detallado y explicativo</option></select></div>
            <div className="agent-field"><label htmlFor="agent-customer">Cliente ideal</label><textarea id="agent-customer" rows={2} value={config.target_customer} onChange={e => update("target_customer", e.target.value)} placeholder="Perfil, sector, ubicación o necesidad..." maxLength={1500} /></div>
            <div className="agent-field agent-field-full"><label htmlFor="agent-questions">Preguntas para calificar oportunidades</label><textarea id="agent-questions" rows={4} value={config.qualification_questions} onChange={e => update("qualification_questions", e.target.value)} maxLength={2500} /><small>Escribe una pregunta por línea. Se utilizarán como guía, no como un interrogatorio rígido.</small></div>
          </div>
        </section>

        <section className="agent-config-card">
          <div className="agent-config-card-head"><div><span className="panel-kicker">03 · CONOCIMIENTO</span><h3>Fuentes autorizadas</h3><p>Selecciona qué información publicada puede utilizar el futuro agente.</p></div><BookOpen size={19} /></div>
          {knowledge.length ? <div className="agent-knowledge-list">{knowledge.map(item => <label key={item.id} className="agent-knowledge-item"><input type="checkbox" checked={config.knowledge_entry_ids.includes(item.id)} onChange={() => toggleKnowledge(item.id)} /><span><strong>{item.title}</strong><small>{item.category === "faq" ? "Pregunta frecuente" : item.category === "product" ? "Producto o servicio" : item.category === "policy" ? "Política comercial" : item.category === "business" ? "Información del negocio" : "Instrucción"} · Publicado</small></span><CheckCircle2 size={16} /></label>)}</div> : <div className="agent-config-empty"><CircleHelp size={17} /> Aún no hay contenidos publicados. Publica información en el Centro de conocimiento para seleccionarla aquí.</div>}
          <div className="agent-config-note"><ShieldCheck size={16} /><span>Solo se muestran contenidos publicados de tu usuario. Los borradores y contenidos desactivados no se incluyen.</span></div>
        </section>

        <section className="agent-config-card">
          <div className="agent-config-card-head"><div><span className="panel-kicker">04 · SEGURIDAD</span><h3>Límites y derivación humana</h3><p>Establece qué no debe hacer y cuándo debe pedir apoyo al equipo.</p></div><ShieldCheck size={19} /></div>
          <div className="agent-field"><label htmlFor="agent-restrictions">Restricciones y reglas obligatorias</label><textarea id="agent-restrictions" rows={4} value={config.restrictions} onChange={e => update("restrictions", e.target.value)} maxLength={3000} /></div>
          <label className="agent-toggle"><input type="checkbox" checked={config.human_handoff_enabled} onChange={e => update("human_handoff_enabled", e.target.checked)} /><span><strong>Permitir derivación a una persona</strong><small>El agente deberá reconocer cuándo no puede resolver una consulta.</small></span></label>
          {config.human_handoff_enabled && <div className="agent-config-grid">
            <div className="agent-field agent-field-full"><label htmlFor="agent-handoff-triggers">Cuándo derivar</label><textarea id="agent-handoff-triggers" rows={3} value={config.handoff_triggers} onChange={e => update("handoff_triggers", e.target.value)} maxLength={2000} /></div>
            <div className="agent-field"><label htmlFor="agent-handoff-contact">Contacto o responsable</label><input id="agent-handoff-contact" value={config.handoff_contact} onChange={e => update("handoff_contact", e.target.value)} placeholder="Nombre, correo o teléfono del equipo" maxLength={180} /></div>
            <div className="agent-field"><label htmlFor="agent-handoff-message">Mensaje de derivación</label><textarea id="agent-handoff-message" rows={3} value={config.handoff_message} onChange={e => update("handoff_message", e.target.value)} maxLength={700} /></div>
          </div>}
        </section>

        <section className="agent-config-card">
          <div className="agent-config-card-head"><div><span className="panel-kicker">05 · CANALES</span><h3>Preparación para WhatsApp</h3><p>Deja definidos los datos del canal. Esta etapa no realiza conexiones ni envía mensajes.</p></div><MessageCircle size={19} /></div>
          <label className="agent-toggle"><input type="checkbox" checked={config.whatsapp_enabled} onChange={e => update("whatsapp_enabled", e.target.checked)} /><span><strong>Marcar WhatsApp como canal prioritario</strong><small>Solo guarda tu preferencia; no significa que el canal esté conectado.</small></span></label>
          <div className="agent-config-grid">
            <div className="agent-field"><label htmlFor="agent-whatsapp-number">Número de WhatsApp del negocio</label><input id="agent-whatsapp-number" value={config.whatsapp_number} onChange={e => update("whatsapp_number", e.target.value)} placeholder="+56 9 1234 5678" maxLength={30} /></div>
            <div className="agent-field"><label htmlFor="agent-channel-notes">Notas de configuración del canal</label><textarea id="agent-channel-notes" rows={2} value={config.channel_notes} onChange={e => update("channel_notes", e.target.value)} maxLength={1000} /></div>
          </div>
          <div className="agent-config-note"><MessageCircle size={16} /><span>Estado actual: sin conexión. La integración con WhatsApp Business se implementará y autorizará por separado.</span></div>
        </section>

        <section className="agent-config-card agent-config-preview">
          <div className="agent-config-card-head"><div><span className="panel-kicker">VISTA PREVIA</span><h3>Resumen del comportamiento</h3><p>Revisa cómo quedaría definido el agente antes de guardar.</p></div><Eye size={19} /></div>
          <button type="button" className="agent-preview-button" onClick={() => setPreview(value => !value)}>{preview ? "Ocultar resumen" : "Ver resumen de configuración"}</button>
          {preview && <div className="agent-preview-content"><strong>{config.agent_name}</strong><p>{config.greeting || "Sin saludo inicial definido."}</p><dl><dt>Objetivo</dt><dd>{config.objective || "No definido"}</dd><dt>Personalidad</dt><dd>{config.personality || "No definida"}</dd><dt>Tono</dt><dd>{tone.label} · {tone.detail}</dd><dt>Fuentes autorizadas</dt><dd>{selectedKnowledge.map(item => item.title).join(", ") || "Ninguna seleccionada"}</dd><dt>Derivación humana</dt><dd>{config.human_handoff_enabled ? config.handoff_triggers : "Desactivada"}</dd><dt>Canal</dt><dd>WhatsApp: {config.whatsapp_enabled ? "prioritario (sin conexión)" : "no seleccionado"}</dd></dl></div>}
        </section>

        {error && <div className="notice error" role="alert">{error}</div>}
        {notice && <div className="notice success" role="status">{notice}</div>}
        <div className="agent-config-footer"><span>{hasConfig ? "Ya existe una configuración guardada para tu usuario." : "Aún no has guardado la configuración del agente."} Se guardará de forma privada en tu cuenta.</span><button type="submit" className="button button-primary" disabled={saving || config.agent_name.trim().length < 2}>{saving ? <LoaderCircle size={15} className="assistant-spin" /> : <Save size={15} />}{saving ? "Guardando..." : "Guardar configuración del agente"}</button></div>
      </form>
      <AgentPlayground />
    </div>
  );
}
