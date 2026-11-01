import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight, Check, Clock3, MessageCircle, ShieldCheck, Sparkles, Target, Workflow, LockKeyhole, Layers3 } from "lucide-react";
import { GuidedDemo } from "./guided-demo";
import "./inicio.css";

export const metadata: Metadata = {
  title: "UpScale IA | Agente comercial 24/7",
  description: "Una experiencia comercial inteligente para emprendedores: atención con contexto, seguimiento y derivación humana.",
};

function UpScaleLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`up-brand ${compact ? "up-brand-compact" : ""}`} aria-label="UpScale IA">
      <span className="up-brand-mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" role="img" aria-label="">
          <defs>
            <linearGradient id="upLogoResin" x1="7" y1="4" x2="42" y2="45" gradientUnits="userSpaceOnUse">
              <stop stopColor="#E4D8FF" />
              <stop offset=".32" stopColor="#7C8CFF" />
              <stop offset=".68" stopColor="#39D6C4" />
              <stop offset="1" stopColor="#D4A66A" />
            </linearGradient>
            <linearGradient id="upLogoGlass" x1="9" y1="5" x2="37" y2="43" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFFFFF" stopOpacity=".42" />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity=".02" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="44" height="44" rx="14" fill="#121C2C" stroke="#8294B9" strokeOpacity=".5" />
          <rect x="3" y="3" width="42" height="42" rx="13" fill="url(#upLogoGlass)" />
          <path d="M12 29.8 21.4 13l4.2 7.1 4.5-5.8L37 28.1l-9.7 6.7-5.1-4.1-5.5 3.1L12 29.8Z" fill="url(#upLogoResin)" opacity=".96" />
          <path d="m15 28.2 6.6-11.7 4.1 7 4.4-5.6 4.2 9.7-8.1 5.2-4.8-3.8-4.2 2.5-2.2-3.3Z" fill="#F7FAFF" fillOpacity=".18" />
          <path d="m18 27 4.1-7.3 3.1 5.2 3.1-3.8" fill="none" stroke="#FFFFFF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="up-brand-copy"><strong>UpScale <i>IA</i></strong><small>AGENTE COMERCIAL</small></span>
    </span>
  );
}

const benefits = [
  { icon: MessageCircle, title: "Responde con contexto", description: "Trabaja a partir de la información del negocio que hayas configurado: servicios, preguntas frecuentes y condiciones." },
  { icon: Target, title: "Orienta el siguiente paso", description: "Ayuda a ordenar la consulta para avanzar hacia una recomendación, una cotización o un contacto comercial." },
  { icon: ShieldCheck, title: "Reconoce sus límites", description: "Cuando falta información o se necesita criterio humano, debe explicarlo y facilitar la derivación." },
];
const steps = [
  ["01", "Configura tu negocio", "Define tus servicios, preguntas frecuentes, políticas y tono de atención."],
  ["02", "Prepara la atención", "El agente usa información aprobada y evita inventar precios, plazos o condiciones."],
  ["03", "Continúa con criterio", "Organiza la consulta y señala cuándo corresponde que intervenga una persona."],
];

export default function InicioPage() {
  return (
    <main className="upscale-public">
      <div className="up-space-glow up-space-glow-a" aria-hidden="true" />
      <div className="up-space-glow up-space-glow-b" aria-hidden="true" />
      <header className="up-nav">
        <Link href="/inicio" className="up-brand-link" aria-label="UpScale IA, inicio"><UpScaleLogo /></Link>
        <nav className="up-nav-links" aria-label="Navegación principal">
          <a href="#como-funciona">Cómo funciona</a><a href="#demo">Probar demo</a><a href="#criterio">Criterio comercial</a>
        </nav>
        <Link href="/login" className="up-nav-login">Acceder <ArrowRight size={15} /></Link>
      </header>

      <section className="up-hero">
        <div className="up-hero-copy">
          <div className="up-eyebrow"><span className="up-eyebrow-dot" /> INTELIGENCIA COMERCIAL PARA EMPRENDEDORES</div>
          <h1>Tu negocio merece una atención que <em>no se desconecta.</em></h1>
          <p className="up-hero-lead">Un agente comercial que ayuda a responder consultas, entender necesidades y preparar el siguiente paso. Con tecnología, contexto y límites claros.</p>
          <div className="up-hero-actions"><a className="up-button up-button-primary" href="#demo">Explorar demo <ArrowRight size={16} /></a><a className="up-text-link" href="#como-funciona">Conocer el sistema <ArrowDown size={15} /></a></div>
          <div className="up-hero-note"><ShieldCheck size={16} /> Tú mantienes el control de la información y de la atención humana.</div>
          <div className="up-hero-tags"><span><span className="up-tag-dot" /> Atención con contexto</span><span><span className="up-tag-dot up-tag-dot-cyan" /> Derivación humana</span><span><span className="up-tag-dot up-tag-dot-violet" /> Control del negocio</span></div>
        </div>
        <div className="up-hero-art" aria-label="Concepto visual del agente comercial">
          <div className="up-orbit up-orbit-one"/><div className="up-orbit up-orbit-two"/><div className="up-orbit up-orbit-three"/>
          <div className="up-orb-core"><div className="up-orb-logo"><UpScaleLogo compact /></div><span className="up-orb-ring"/><span className="up-orb-ring up-orb-ring-two"/><span className="up-orb-glint"/></div>
          <div className="up-art-floating up-floating-top"><span className="up-float-icon"><MessageCircle size={15}/></span><div><strong>Consulta recibida</strong><small>Contexto comercial</small></div><span className="up-float-status">01</span></div>
          <div className="up-art-floating up-floating-bottom"><span className="up-float-icon up-float-icon-cyan"><ShieldCheck size={15}/></span><div><strong>Respuesta con criterio</strong><small>Sin inventar información</small></div><Check size={15} className="up-float-check"/></div>
          <div className="up-art-caption"><span className="up-caption-line"/> SISTEMA COMERCIAL · CONCEPTO VISUAL</div>
        </div>
      </section>

      <section className="up-proof-strip" aria-label="Principios del producto"><span><Check size={15}/> Información configurada por el negocio</span><span><Check size={15}/> Respuestas con límites claros</span><span><Check size={15}/> Intervención humana cuando corresponde</span></section>

      <section className="up-section up-demo-section" id="demo">
        <div className="up-section-heading">
          <div className="up-eyebrow">ENTORNO DE PRUEBA</div><h2>Explora el agente.<br/><em>Decide el siguiente paso.</em></h2>
          <p>Selecciona una consulta y luego elige cómo continúa el cliente. La demo usa escenarios básicos con respuestas preparadas; no está conectada a una IA real ni envía mensajes.</p>
          <div className="up-demo-tier"><span className="up-tier-icon"><Layers3 size={17}/></span><div><strong>Demo · Parámetros básicos</strong><small>Escenarios limitados para conocer el flujo.</small></div><span className="up-tier-pill">BÁSICA</span></div>
          <Link href="/login" className="up-demo-upgrade"><LockKeyhole size={15}/> Accede para explorar más funcionalidades <ArrowRight size={15}/></Link>
          <p className="up-tier-footnote">Las funciones avanzadas dependerán de la configuración y disponibilidad de tu cuenta.</p>
        </div>
        <GuidedDemo />
      </section>

      <section className="up-section up-how-section" id="como-funciona">
        <div className="up-section-heading up-section-heading-row"><div><div className="up-eyebrow">UN FLUJO CLARO</div><h2>Menos improvisación.<br/><em>Más contexto.</em></h2></div><p>La automatización debe reducir tareas repetitivas y ayudar a tu negocio a dar una respuesta consistente, sin quitarte el control de la relación con tus clientes.</p></div>
        <div className="up-steps-grid">{steps.map(([number,title,description])=><article className="up-step-card" key={number}><span className="up-step-number">{number}</span><div className="up-step-icon">{number==="01"?<Workflow size={21}/>:number==="02"?<MessageCircle size={21}/>:<ArrowRight size={21}/>}</div><h3>{title}</h3><p>{description}</p></article>)}</div>
      </section>

      <section className="up-section up-benefits-section" id="criterio"><div className="up-section-heading"><div className="up-eyebrow">TECNOLOGÍA CON CRITERIO</div><h2>Preparado para ayudar.<br/><em>Diseñado para ser honesto.</em></h2></div><div className="up-benefits-grid">{benefits.map(({icon:Icon,title,description})=><article className="up-benefit" key={title}><span className="up-benefit-icon"><Icon size={21}/></span><h3>{title}</h3><p>{description}</p></article>)}</div></section>

      <section className="up-cta-section"><div><div className="up-eyebrow">TU NEGOCIO, TU CRITERIO</div><h2>Una atención mejor<br/><em>empieza con contexto.</em></h2><p>Accede al espacio comercial para explorar las funcionalidades disponibles y la configuración de tu cuenta.</p></div><Link href="/login" className="up-button up-button-primary">Acceder a UpScale IA <ArrowRight size={16}/></Link></section>
      <footer className="up-footer"><Link href="/inicio" className="up-brand-link"><UpScaleLogo compact/></Link><p>Inteligencia comercial con criterio humano.</p><span>© {new Date().getFullYear()} UpScale IA</span></footer>
    </main>
  );
}
