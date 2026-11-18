import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, Bot, BrainCircuit, Check, ChevronRight, CirclePlay,
  Database, MessageSquareText, ShieldCheck, Sparkles, Target,
  Workflow, Zap, Layers3, BookOpen, Settings2
} from "lucide-react";

const capabilities = [
  { icon: Settings2, number: "01", title: "Configura tu agente", text: "Define el tono, las instrucciones y la forma en que debe orientar cada conversación comercial." },
  { icon: MessageSquareText, number: "02", title: "Prueba antes de activar", text: "Simula conversaciones en Playground, plantea objeciones y comprueba cómo responde tu agente." },
  { icon: BookOpen, number: "03", title: "Conocimiento de tu negocio", text: "Organiza servicios, preguntas frecuentes y respuestas para que el agente trabaje con contexto." },
  { icon: Target, number: "04", title: "Revisa los contactos", text: "Consulta la información de los contactos capturados y entiende qué necesita seguimiento." }
];

const steps = [
  { title: "Define el contexto", text: "Cuéntale al agente qué hace tu negocio, qué ofrece y a quién atiende." },
  { title: "Entrena con información", text: "Añade respuestas y conocimiento propio. Mantén bajo control lo que puede afirmar." },
  { title: "Simula y mejora", text: "Prueba preguntas reales, detecta vacíos y ajusta las instrucciones antes de usarlo." }
];

export default function MarketingHome() {
  return (
    <main className="marketing-shell">
      <div className="marketing-noise" aria-hidden="true" />
      <header className="marketing-nav">
        <Link href="/" className="marketing-logo" aria-label="UpScale IA, inicio">
          <Image src="/images/upscale-ia-horizontal.png" alt="UpScale IA" width={220} height={58} priority />
        </Link>
        <nav className="marketing-nav-links" aria-label="Navegación principal">
          <a href="#plataforma">Plataforma</a><a href="#como-funciona">Cómo funciona</a><a href="#preguntas">Preguntas</a>
        </nav>
        <Link className="marketing-nav-cta" href="/login">Acceder <ArrowRight size={15} /></Link>
      </header>

      <section className="marketing-hero">
        <div className="marketing-hero-copy">
          <div className="marketing-eyebrow"><span className="marketing-eyebrow-dot" /> INTELIGENCIA COMERCIAL PARA TU NEGOCIO</div>
          <h1>Las conversaciones<br />también pueden ser<br /><span>tu ventaja comercial.</span></h1>
          <p>Configura, prueba y mejora un agente comercial con el contexto de tu negocio. Una plataforma para convertir conocimiento en conversaciones más claras y oportunidades mejor atendidas.</p>
          <div className="marketing-actions">
            <Link href="/login" className="marketing-button-primary">Entrar a UpScale IA <ArrowRight size={17} /></Link>
            <a href="#plataforma" className="marketing-button-quiet"><CirclePlay size={17} /> Explorar la plataforma</a>
          </div>
          <div className="marketing-trust"><ShieldCheck size={15} /> Tú defines el conocimiento, las reglas y el comportamiento del agente.</div>
        </div>

        <div className="marketing-visual" aria-label="Vista conceptual de la plataforma UpScale IA">
          <div className="visual-orbit visual-orbit-a" /><div className="visual-orbit visual-orbit-b" />
          <div className="visual-glow" />
          <div className="visual-panel visual-panel-main">
            <div className="visual-panel-top"><div className="visual-brand-mark"><Sparkles size={17} /></div><div><b>Agente comercial</b><small>ENTORNO DE PRUEBA</small></div><span className="visual-status">LISTO</span></div>
            <div className="visual-conversation-label">SIMULACIÓN · CONSULTA DE CLIENTE</div>
            <div className="visual-message visual-message-user">Hola, quiero saber qué servicio me conviene para mi negocio.</div>
            <div className="visual-message visual-message-agent"><span><Bot size={14} /> UPSCALE IA</span>¡Claro! Para orientarte bien, primero quiero entender qué necesitas conseguir y cómo funciona hoy tu proceso comercial.</div>
            <div className="visual-input"><span>Escribe una pregunta para probar…</span><span className="visual-send"><ArrowRight size={14} /></span></div>
          </div>
          <div className="visual-float visual-float-knowledge"><div className="visual-float-icon"><Database size={16} /></div><div><b>Centro de conocimiento</b><small>Información de tu negocio</small></div><Check size={15} /></div>
          <div className="visual-float visual-float-config"><div className="visual-float-icon violet"><BrainCircuit size={16} /></div><div><b>Configuración del agente</b><small>Instrucciones y comportamiento</small></div><span className="visual-config-dot" /></div>
          <div className="visual-caption"><span /> CONTEXTO · SIMULACIÓN · MEJORA CONTINUA</div>
        </div>
        <div className="marketing-scroll-cue"><span /> UNA FORMA MÁS CLARA DE TRABAJAR TUS CONVERSACIONES</div>
      </section>

      <section className="marketing-proof-strip">
        <div><span className="proof-icon"><Workflow size={18} /></span><span><b>Configura</b><small>Adapta el agente a tu negocio</small></span></div>
        <div><span className="proof-icon"><MessageSquareText size={18} /></span><span><b>Experimenta</b><small>Prueba escenarios en Playground</small></span></div>
        <div><span className="proof-icon"><Layers3 size={18} /></span><span><b>Organiza</b><small>Centraliza respuestas y conocimiento</small></span></div>
        <div><span className="proof-icon"><Zap size={18} /></span><span><b>Mejora</b><small>Ajusta a partir de tus pruebas</small></span></div>
      </section>

      <section className="marketing-section" id="plataforma">
        <div className="marketing-section-heading">
          <div><div className="marketing-eyebrow"><span className="marketing-eyebrow-dot" /> UNA PLATAFORMA, CUATRO ÁREAS</div><h2>Todo empieza por<br /><span>entender tu negocio.</span></h2></div>
          <p>UpScale IA reúne las herramientas esenciales para construir y revisar el comportamiento de tu agente comercial, sin perder de vista el contexto de tu empresa.</p>
        </div>
        <div className="marketing-capabilities">
          {capabilities.map(({ icon: Icon, number, title, text }) => <article className="marketing-capability" key={number}>
            <div className="capability-top"><span className="capability-icon"><Icon size={20} /></span><span>{number}</span></div>
            <h3>{title}</h3><p>{text}</p><a href="/login" aria-label={`Acceder para ${title.toLowerCase()}`}>Conocer en mi espacio <ChevronRight size={14} /></a>
          </article>)}
        </div>
      </section>

      <section className="marketing-process" id="como-funciona">
        <div className="process-heading"><div className="marketing-eyebrow"><span className="marketing-eyebrow-dot" /> DE LA CONFIGURACIÓN A LA PRUEBA</div><h2>Construye con criterio.<br /><span>Mejora con cada prueba.</span></h2><p>No necesitas empezar con un agente perfecto. Necesitas información clara, pruebas útiles y un proceso para corregir lo que no funciona.</p></div>
        <div className="process-steps">{steps.map((step, index) => <article className="process-step" key={step.title}><span className="process-number">0{index + 1}</span><div className="process-line" /><h3>{step.title}</h3><p>{step.text}</p></article>)}</div>
      </section>

      <section className="marketing-quote-section" id="preguntas">
        <div className="quote-orb" />
        <div className="marketing-eyebrow"><span className="marketing-eyebrow-dot" /> CONTROL Y CONTEXTO</div>
        <h2>La IA no debería<br />inventar por tu negocio.</h2>
        <p>Por eso UpScale IA pone el foco en tus instrucciones, tu información y las pruebas antes de dar por válida una respuesta. El conocimiento que incorporas y la configuración que defines son la base del agente.</p>
        <div className="quote-note"><ShieldCheck size={18} /><span><b>Tu negocio conserva el criterio.</b><small>Revisa y mejora las respuestas desde tu propio espacio.</small></span></div>
      </section>

      <section className="marketing-final-cta">
        <div><div className="marketing-eyebrow"><span className="marketing-eyebrow-dot" /> EMPIEZA A CONSTRUIR</div><h2>Tu próximo paso es<br /><span>ponerlo a prueba.</span></h2><p>Accede a tu espacio y comienza a configurar el agente comercial de tu negocio.</p></div>
        <Link href="/login" className="marketing-button-primary">Acceder a UpScale IA <ArrowRight size={17} /></Link>
      </section>

      <footer className="marketing-footer"><Link href="/" className="marketing-footer-brand"><Image src="/images/upscale-ia-horizontal.png" alt="UpScale IA" width={150} height={40} /></Link><span>Inteligencia comercial con contexto.</span><div><Link href="/login">Acceso a la plataforma</Link><span>© {new Date().getFullYear()} UpScale IA</span></div></footer>
    </main>
  );
}
