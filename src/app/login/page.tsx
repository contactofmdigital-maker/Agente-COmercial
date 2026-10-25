"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Zap, Eye, EyeOff, LoaderCircle, ArrowLeft, Clock3,
  MessageSquareText, Target, TrendingUp, Users, ShieldCheck,
  ArrowRight, Building2, Bot, CheckCircle2, Sparkles,
  BrainCircuit, Workflow, ChevronRight
} from "lucide-react";

type Mode = "login" | "register" | "recover";
type ChatMessage = { from: "prospect" | "agent"; text: string };
type Scenario = {
  sector: string;
  contact: string;
  insight: string;
  obstacle: string;
  nextStep: string;
  messages: ChatMessage[];
};

const scenarios: Scenario[] = [
  {
    sector: "TIENDA ONLINE · ECOMMERCE",
    contact: "Comercial · Tienda online",
    insight: "Duda sobre el precio",
    obstacle: "Valor percibido y seguimiento",
    nextStep: "Recomendar según necesidad",
    messages: [
      { from: "prospect", text: "Me interesa, pero lo encuentro un poco caro. Lo voy a pensar." },
      { from: "agent", text: "Claro. Para orientarte mejor, ¿estás comparando precios o todavía no tienes claro cuál opción te conviene?" },
      { from: "prospect", text: "Estoy comparando, no sé si realmente vale la pena." },
      { from: "agent", text: "Tiene sentido comparar. Revisemos qué necesitas resolver y qué opción se ajusta a eso, sin pagar por algo que no usarás." }
    ]
  },
  {
    sector: "SERVICIOS PROFESIONALES · B2B",
    contact: "Comercial · Empresa de servicios",
    insight: "Propuesta sin respuesta",
    obstacle: "Falta de claridad en el valor",
    nextStep: "Acordar una conversación breve",
    messages: [
      { from: "prospect", text: "Gracias por la propuesta. La revisaremos internamente y te avisamos." },
      { from: "agent", text: "Por supuesto. Para facilitar la revisión, ¿hay algún punto que necesiten aclarar antes de decidir?" },
      { from: "prospect", text: "Nos falta entender cómo impactaría en nuestro proceso actual." },
      { from: "agent", text: "Podemos centrarnos en ese punto y mostrar el flujo aplicado a vuestro caso. ¿Te acomoda una reunión breve esta semana?" }
    ]
  },
  {
    sector: "INMOBILIARIA · ALTO INTERÉS",
    contact: "Comercial · Asesor inmobiliario",
    insight: "Interés sin próximo paso",
    obstacle: "Indecisión y dudas pendientes",
    nextStep: "Calificar necesidad y coordinar visita",
    messages: [
      { from: "prospect", text: "Me gustó la propiedad, pero todavía estoy viendo otras opciones." },
      { from: "agent", text: "Es una decisión importante. ¿Qué es lo principal que estás comparando: ubicación, presupuesto o características?" },
      { from: "prospect", text: "Principalmente la ubicación y los gastos mensuales." },
      { from: "agent", text: "Perfecto, comparemos esos dos puntos para que puedas decidir con información clara. Si te encaja, coordinamos una visita." }
    ]
  },
  {
    sector: "NEGOCIO LOCAL · RESERVAS",
    contact: "Comercial · Negocio local",
    insight: "Consulta que se enfría",
    obstacle: "Fricción para reservar",
    nextStep: "Facilitar una reserva concreta",
    messages: [
      { from: "prospect", text: "Hola, quería consultar disponibilidad, pero no sé bien cómo reservar." },
      { from: "agent", text: "¡Te ayudo! ¿Qué día y horario te vendría mejor? Así revisamos la opción adecuada." },
      { from: "prospect", text: "El viernes después de las 18:00, idealmente." },
      { from: "agent", text: "Perfecto. El siguiente paso es confirmar la disponibilidad y dejar la solicitud encaminada. ¿A nombre de quién la registramos?" }
    ]
  },
  {
    sector: "EDUCACIÓN · SERVICIOS",
    contact: "Comercial · Centro de formación",
    insight: "Interés sin inscripción",
    obstacle: "Dudas sobre encaje y horarios",
    nextStep: "Identificar objetivo y orientar programa",
    messages: [
      { from: "prospect", text: "Me interesa el curso, pero no sé si podré compatibilizarlo con el trabajo." },
      { from: "agent", text: "Es importante que te funcione en la práctica. ¿Qué horarios tienes disponibles durante la semana?" },
      { from: "prospect", text: "Solo puedo estudiar por las noches." },
      { from: "agent", text: "Entendido. Revisemos las alternativas compatibles con ese horario y el objetivo que quieres alcanzar antes de que decidas." }
    ]
  }
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [messageIndex, setMessageIndex] = useState(0);
  const [typing, setTyping] = useState(false);

  const scenarioIndex = Math.floor(messageIndex / 4) % scenarios.length;
  const currentMessageIndex = messageIndex % 4;
  const scenario = scenarios[scenarioIndex];
  const visibleMessages = useMemo(
    () => scenario.messages.slice(0, currentMessageIndex + (typing ? 0 : 1)),
    [scenario, currentMessageIndex, typing]
  );

  useEffect(() => {
    let timeoutId: number | undefined;
    const intervalId = window.setInterval(() => {
      setTyping(true);
      timeoutId = window.setTimeout(() => {
        setMessageIndex((current) => (current + 1) % (scenarios.length * 4));
        setTyping(false);
      }, 1000);
    }, 7000);

    return () => {
      window.clearInterval(intervalId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  function switchMode(nextMode: Mode) {
    setError("");
    setSuccess("");
    setMode(nextMode);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Ingresa tu correo electrónico.");
      return;
    }
    if (mode !== "recover" && password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();

      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (authError) throw authError;
        router.replace("/");
        router.refresh();
        return;
      }

      if (mode === "register") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/login` }
        });
        if (authError) throw authError;
        if (data.session) {
          router.replace("/");
          router.refresh();
          return;
        }
        setSuccess("Cuenta creada. Si la confirmación por correo está activada, revisa tu bandeja de entrada para verificarla.");
        setMode("login");
        setPassword("");
        setConfirmPassword("");
        return;
      }

      const { error: authError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/login` }
      );
      if (authError) throw authError;
      setSuccess("Si el correo está registrado y la configuración lo permite, recibirás instrucciones para recuperar tu contraseña.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo completar la operación. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "login" ? "Tu siguiente venta empieza aquí" : mode === "register" ? "Activa tu espacio comercial" : "Recupera tu acceso";
  const subtitle = mode === "login" ? "Entra a tu centro de inteligencia comercial." : mode === "register" ? "Empieza a organizar tus oportunidades comerciales." : "Te enviaremos instrucciones para recuperar tu contraseña.";

  return (
    <main className="premium-login">
      <section className="login-showcase" aria-label="Presentación de UpScale IA">
        <header className="showcase-header">
          <a href="/login" className="showcase-brand" aria-label="UpScale IA">
            <span className="showcase-brand-icon"><Zap size={23} fill="currentColor" /></span>
            <span><strong>UpScale IA</strong><small>REVENUE INTELLIGENCE PLATFORM</small></span>
          </a>
          <span className="system-status"><span className="status-dot" /> SISTEMA COMERCIAL 24/7</span>
        </header>

        <div className="showcase-copy">
          <span className="showcase-eyebrow"><Sparkles size={14} /> CADA CONVERSACIÓN PUEDE SER UNA OPORTUNIDAD</span>
          <h2>Tu negocio no necesita<br />más mensajes.<br /><span>Necesita convertirlos.</span></h2>
          <p>Inviertes tiempo en atraer clientes, recibes consultas y aun así muchas oportunidades se enfrían. Respuestas tardías, objeciones sin resolver y seguimientos olvidados pueden frenar tus ventas. UpScale IA te ayuda a convertir ese proceso en una operación comercial más organizada e inteligente.</p>
          <div className="showcase-promises">
            <span><CheckCircle2 size={15} /> Respuestas con contexto</span>
            <span><CheckCircle2 size={15} /> Seguimiento organizado</span>
            <span><CheckCircle2 size={15} /> Próximos pasos claros</span>
          </div>
        </div>

        <section className="live-demo" aria-label="Demostración ficticia animada del agente comercial">
          <div className="demo-header">
            <div className="demo-heading-icon"><BrainCircuit size={21} /></div>
            <div className="demo-heading-copy"><strong>Así piensa un agente comercial</strong><span>SIMULACIÓN DE VENTA · CASO FICTICIO</span></div>
            <span className="demo-live"><span className="status-dot" /> DEMO ANIMADA</span>
          </div>

          <div className="demo-content">
            <div className="demo-chat-column">
              <div className="demo-contact-row">
                <span className="contact-icon"><Building2 size={19} /></span>
                <div><strong>{scenario.contact}</strong><small>{scenario.sector}</small></div>
                <span className="demo-label"><ShieldCheck size={13} /> DEMO</span>
              </div>
              <div className="chat-messages" aria-live="polite" aria-atomic="false">
                {visibleMessages.map((message, index) => (
                  <div className={`chat-line ${message.from === "agent" ? "chat-line-agent" : "chat-line-prospect"}`} key={`${scenarioIndex}-${index}`}>
                    <span className={`chat-avatar ${message.from === "agent" ? "avatar-agent" : "avatar-prospect"}`}>
                      {message.from === "agent" ? <Bot size={16} /> : <Users size={16} />}
                    </span>
                    <div className="chat-bubble">
                      <span className="chat-sender">{message.from === "agent" ? "UPSCALE IA · AGENTE COMERCIAL" : "PROSPECTO"}</span>
                      <p>{message.text}</p>
                    </div>
                  </div>
                ))}
                {typing && <div className="chat-line chat-line-agent"><span className="chat-avatar avatar-agent"><Bot size={16} /></span><div className="chat-bubble typing-bubble"><span className="chat-sender">UPSCALE IA · AGENTE COMERCIAL</span><span className="typing-dots"><i /><i /><i /></span></div></div>}
              </div>
              <div className="demo-footnote"><span className="status-dot" /> Conversación ficticia que cambia automáticamente entre sectores</div>
            </div>

            <aside className="commercial-reading">
              <div className="reading-title"><Target size={16} /><span>LECTURA COMERCIAL</span></div>
              <div className="reading-card reading-card-active"><span><CheckCircle2 size={13} /> 01 · DETECTAR</span><strong>{scenario.insight}</strong></div>
              <div className="reading-card reading-card-warm"><span><BrainCircuit size={13} /> 02 · COMPRENDER</span><strong>{scenario.obstacle}</strong></div>
              <div className="reading-card"><span><Workflow size={13} /> 03 · AVANZAR</span><strong>{scenario.nextStep}</strong></div>
              <p className="reading-note">No se trata de presionar. Se trata de entender qué necesita el prospecto para avanzar.</p>
            </aside>
          </div>
        </section>

        <div className="showcase-benefits">
          <div><Clock3 size={20} /><span><strong>Disponibilidad 24/7</strong><small>Oportunidades atendidas a tiempo, según configuración.</small></span></div>
          <div><MessageSquareText size={20} /><span><strong>Conversaciones con propósito</strong><small>Preguntar, comprender y orientar.</small></span></div>
          <div><TrendingUp size={20} /><span><strong>Seguimiento más claro</strong><small>Menos oportunidades olvidadas.</small></span></div>
        </div>
        <footer className="showcase-footer"><span><ShieldCheck size={13} /> Un proceso comercial más inteligente</span><span>UPSCALE IA · VIP PREMIUM</span></footer>
      </section>

      <aside className="login-panel-wrap">
        <section className="login-panel">
          <a href="/login" className="login-brand" aria-label="UpScale IA">
            <span className="login-logo"><Zap size={25} fill="currentColor" /></span>
            <span><strong>UpScale IA</strong><small>COMMERCIAL INTELLIGENCE</small></span>
          </a>
          <div className="login-heading">
            <span className="login-eyebrow">TU ESPACIO COMERCIAL</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>

          {error && <div className="login-message login-error" role="alert">{error}</div>}
          {success && <div className="login-message login-success" role="status">{success}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <label htmlFor="email">Correo electrónico</label>
            <input id="email" type="email" autoComplete="email" placeholder="nombre@empresa.com" value={email} onChange={(event) => setEmail(event.target.value)} required />

            {mode !== "recover" && <>
              <label htmlFor="password">Contraseña</label>
              <div className="login-password">
                <input id="password" type={showPassword ? "text" : "password"} autoComplete={mode === "register" ? "new-password" : "current-password"} placeholder="Mínimo 8 caracteres" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
                <button type="button" className="login-eye" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </>}

            {mode === "register" && <>
              <label htmlFor="confirmPassword">Confirmar contraseña</label>
              <input id="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Repite tu contraseña" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required />
            </>}

            {mode === "login" && <button type="button" className="login-text-button" onClick={() => switchMode("recover")}>¿Olvidaste tu contraseña?</button>}
            <button type="submit" className="login-submit" disabled={busy}>
              {busy ? <><LoaderCircle className="animate-spin" size={18} /> Procesando...</> : mode === "login" ? <>Entrar a mi workspace <ArrowRight size={17} /></> : mode === "register" ? <>Crear mi cuenta <ArrowRight size={17} /></> : <>Enviar instrucciones <ArrowRight size={17} /></>}
            </button>
          </form>

          <div className="login-switch">
            {mode === "login" ? <>¿Todavía no tienes cuenta? <button type="button" onClick={() => switchMode("register")}>Crear cuenta <ChevronRight size={14} /></button></> : mode === "register" ? <>¿Ya tienes una cuenta? <button type="button" onClick={() => switchMode("login")}>Iniciar sesión</button></> : <button type="button" onClick={() => switchMode("login")}><ArrowLeft size={14} /> Volver al inicio de sesión</button>}
          </div>

          <div className="login-security"><ShieldCheck size={19} /><span><strong>Acceso protegido</strong><small>Autenticación mediante Supabase Auth.</small></span></div>
        </section>
        <p className="login-panel-caption">INTELIGENCIA COMERCIAL · CONVERSACIONES CON PROPÓSITO</p>
      </aside>
    </main>
  );
}
