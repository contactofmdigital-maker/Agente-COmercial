"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthModal, AuthTrigger } from "@/components/marketing/auth-modal";
import Image from "next/image";
import {
  ArrowRight, ArrowUpRight, Bot, BrainCircuit, Check, ChevronDown,
  CirclePlay, Database, MessageSquareText, ShieldCheck, Sparkles,
  Target, Workflow, Zap, Layers3, BookOpen, Settings2, Gauge,
  LockKeyhole, ChartNoAxesCombined, Cpu
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

const plans = [
  { name: "Growth", eyebrow: "PLAN ÚNICO · UPSCALE IA", title: "Todo lo esencial para construir y mejorar tu agente comercial.", description: "Una única experiencia para configurar tu agente, incorporar el conocimiento de tu negocio, probar conversaciones y revisar los contactos capturados.", featured: true }
];

const faqs = [
  { q: "¿Qué es exactamente UpScale IA?", a: "UpScale IA es una plataforma para configurar, probar y mejorar un agente comercial con el contexto de tu negocio. Reúne la configuración del agente, el Playground para simular conversaciones, el centro de conocimiento y la revisión de contactos capturados." },
  { q: "¿Necesito conocimientos técnicos para utilizarlo?", a: "La plataforma está organizada para que puedas definir la información de tu negocio, configurar instrucciones y probar respuestas desde tu espacio. No necesitas programar para realizar esas tareas." },
  { q: "¿Cómo aprende el agente sobre mi negocio?", a: "Trabaja con las instrucciones y el conocimiento que incorporas: servicios, preguntas frecuentes y otra información relevante. Por eso es importante mantener esos contenidos claros y actualizados." },
  { q: "¿Puedo probarlo antes de utilizarlo?", a: "Sí. El Playground permite simular preguntas y escenarios para revisar cómo responde el agente y ajustar su configuración antes de llevar esos cambios a tu operación." },
  { q: "¿El agente puede inventar información o precios?", a: "La plataforma permite definir reglas y conocimiento para orientar sus respuestas. Debes incorporar la información autorizada y probar escenarios; no conviene publicar precios, condiciones o promesas que no hayas confirmado." },
  { q: "¿Qué plan debería elegir?", a: "UpScale IA trabajará con un único plan que reúne las herramientas esenciales de la plataforma: configuración del agente, Playground, centro de conocimiento y revisión de contactos capturados. Los precios y límites se confirmarán en la propuesta comercial." }
];

const prices = {
  CLP: { symbol: "$", setup: "40.000", monthly: "10.000" },
  USD: { symbol: "US$", setup: "40", monthly: "10" },
  ARS: { symbol: "$", setup: "62.500", monthly: "15.600" },
  MXN: { symbol: "MX$", setup: "2.160", monthly: "540" },
  EUR: { symbol: "€", setup: "37", monthly: "9" },
  PEN: { symbol: "S/", setup: "137", monthly: "34" }
};
type Currency = keyof typeof prices;

export default function MarketingHome() {
  const [currency, setCurrency] = useState<Currency>("CLP");
  const price = prices[currency];
  return (
    <main className="marketing-shell">\n      <AuthModal />
      <div className="marketing-noise" aria-hidden="true" />
      <div className="marketing-ambient marketing-ambient-one" aria-hidden="true" />
      <div className="marketing-ambient marketing-ambient-two" aria-hidden="true" />
      <header className="marketing-nav">
        <Link href="/" className="marketing-logo" aria-label="UpScale IA, inicio">
          <Image src="/images/upscale-ia-horizontal.png" alt="UpScale IA" width={220} height={58} priority />
        </Link>
        <nav className="marketing-nav-links" aria-label="Navegación principal">
          <a href="#origen">Nosotros</a><a href="#plataforma">Plataforma</a><a href="#planes">Planes</a><a href="#preguntas">FAQ</a>
        </nav>
        <div className="marketing-nav-actions"><AuthTrigger className="marketing-login-link">Iniciar sesión</AuthTrigger><AuthTrigger className="marketing-nav-cta">Acceder a UpScale IA <ArrowUpRight size={15} /></AuthTrigger></div>
      </header>

      <section className="marketing-hero">
        <div className="marketing-hero-copy">
          <div className="marketing-eyebrow"><span className="marketing-eyebrow-dot" /> INTELIGENCIA COMERCIAL · AUTOMATIZACIÓN · IA</div>
          <h1>Tu negocio tiene una forma de vender.<br /><span>Enséñasela a la IA.</span></h1>
          <p className="marketing-hero-lead">Configura, prueba y mejora un agente comercial con el contexto de tu negocio. Convierte tu conocimiento en conversaciones más claras, respuestas coherentes y oportunidades mejor atendidas.</p>
          <div className="marketing-actions">
            <AuthTrigger className="marketing-button-primary">Acceder a la plataforma <ArrowRight size={17} /></AuthTrigger>
            <a href="#demo" className="marketing-button-quiet"><CirclePlay size={17} /> Ver cómo funciona</a>
          </div>
          <div className="marketing-trust"><ShieldCheck size={15} /> Tú defines el conocimiento, las reglas y el comportamiento del agente.</div>
          <div className="marketing-hero-micro"><span>01 / CONTEXTO</span><i /><span>02 / CONVERSACIÓN</span><i /><span>03 / MEJORA</span></div>
        </div>

        <div className="marketing-stage" aria-label="Representación visual de UpScale IA">
          <div className="stage-halo" /><div className="stage-ring stage-ring-a" /><div className="stage-ring stage-ring-b" />
          <div className="stage-orbit-dot stage-orbit-dot-a" /><div className="stage-orbit-dot stage-orbit-dot-b" />
          <div className="stage-core"><div className="stage-core-inner"><Image src="/images/upscale-ia-horizontal.png" alt="Símbolo de UpScale IA" width={104} height={104} priority /></div><span>INTELIGENCIA COMERCIAL</span></div>
          <div className="stage-ui stage-chat">
            <div className="stage-ui-head"><span className="stage-mini-icon"><Bot size={15} /></span><span><b>Agente comercial</b><small>SIMULACIÓN ACTIVA</small></span><i /></div>
            <div className="stage-chat-bubble">Hola, quiero saber qué servicio me conviene.</div>
            <div className="stage-chat-answer"><span>UPSCALE IA</span>¡Claro! Primero quiero entender qué quieres conseguir y cómo funciona hoy tu proceso comercial.</div>
            <div className="stage-chat-foot"><span /> RESPUESTA CON CONTEXTO</div>
          </div>
          <div className="stage-ui stage-insight"><div className="stage-insight-head"><ChartNoAxesCombined size={15} /> LECTURA COMERCIAL</div><div><span>01</span><b>Intención detectada</b><Check size={13} /></div><div><span>02</span><b>Contexto identificado</b><Check size={13} /></div><div><span>03</span><b>Próximo paso sugerido</b><ArrowUpRight size={13} /></div></div>
          <div className="stage-float stage-float-knowledge"><Database size={15} /><span><b>Centro de conocimiento</b><small>Tu información, tus reglas</small></span></div>
          <div className="stage-float stage-float-config"><BrainCircuit size={15} /><span><b>Agente personalizado</b><small>Configurado para tu negocio</small></span></div>
          <div className="stage-caption"><span /> SISTEMA DE INTELIGENCIA COMERCIAL <span>·</span> UPSCALE IA</div>
        </div>
        <div className="marketing-scroll-cue"><span /> DESLIZA PARA DESCUBRIR</div>
      </section>

      <section className="marketing-proof-strip">
        <div><span className="proof-icon"><Workflow size={18} /></span><span><b>Configura</b><small>Adapta el agente a tu negocio</small></span></div>
        <div><span className="proof-icon"><MessageSquareText size={18} /></span><span><b>Experimenta</b><small>Prueba escenarios en Playground</small></span></div>
        <div><span className="proof-icon"><Layers3 size={18} /></span><span><b>Organiza</b><small>Centraliza respuestas y conocimiento</small></span></div>
        <div><span className="proof-icon"><Zap size={18} /></span><span><b>Mejora</b><small>Ajusta a partir de tus pruebas</small></span></div>
      </section>

      <section className="marketing-origin" id="origen">
        <div className="origin-mark"><Image src="/images/upscale-ia-horizontal.png" alt="" width={78} height={78} /></div>
        <div className="origin-copy"><div className="marketing-eyebrow"><span className="marketing-eyebrow-dot" /> DE LA EXPERIENCIA A LA INNOVACIÓN</div><h2>Hacemos crecer marcas.<br /><span>Construimos lo que sigue.</span></h2><p>UpScale nace de la experiencia en marketing digital, combinando estrategia, creatividad, datos y tecnología para ayudar a empresas y emprendimientos a crecer. Desde esa experiencia nace UpScale IA: nuestro proyecto tecnológico enfocado en explorar nuevas formas de trabajar con inteligencia artificial y automatización.</p></div>
        <div className="origin-pillars"><div><Gauge size={18} /><span>Marketing y estrategia</span></div><div><Cpu size={18} /><span>Tecnología e IA</span></div><div><ChartNoAxesCombined size={18} /><span>Datos y crecimiento</span></div></div>
      </section>

      <section className="marketing-section" id="plataforma">
        <div className="marketing-section-heading"><div><div className="marketing-eyebrow"><span className="marketing-eyebrow-dot" /> UNA PLATAFORMA, CUATRO ÁREAS</div><h2>Todo empieza por<br /><span>entender tu negocio.</span></h2></div><p>UpScale IA reúne las herramientas esenciales para construir y revisar el comportamiento de tu agente comercial, sin perder de vista el contexto de tu empresa.</p></div>
        <div className="marketing-capabilities">{capabilities.map(({ icon: Icon, number, title, text }) => <article className="marketing-capability" key={number}><div className="capability-top"><span className="capability-icon"><Icon size={20} /></span><span>{number}</span></div><h3>{title}</h3><p>{text}</p><AuthTrigger className="marketing-capability-link" ariaLabel={`Acceder para ${title.toLowerCase()}`}>Explorar función <ChevronDown size={14} /></AuthTrigger></article>)}</div>
      </section>

      <section className="marketing-demo-section" id="demo">
        <div className="demo-section-copy"><div className="marketing-eyebrow"><span className="marketing-eyebrow-dot" /> NO TE QUEDES CON LA PROMESA. PONLO A PRUEBA.</div><h2>Una conversación.<br /><span>Una nueva forma de avanzar.</span></h2><p>El agente no debería responder por responder. Debe comprender la consulta, apoyarse en la información de tu negocio y orientar el siguiente paso sin inventar lo que no sabe.</p><AuthTrigger className="marketing-text-link">Conoce el entorno de prueba <ArrowUpRight size={15} /></AuthTrigger></div>
        <div className="demo-window"><div className="demo-window-bar"><div><i /><i /><i /></div><span>PLAYGROUND · UPSCALE IA</span><b>DEMO CONCEPTUAL</b></div><div className="demo-window-body"><aside className="demo-side"><span className="demo-side-logo"><Bot size={18} /></span><b>Agente comercial</b><small>ENTORNO DE PRUEBA</small><div className="demo-side-item active"><MessageSquareText size={14} /> Conversación</div><div className="demo-side-item"><BookOpen size={14} /> Conocimiento</div><div className="demo-side-item"><Settings2 size={14} /> Instrucciones</div></aside><div className="demo-conversation"><div className="demo-conversation-title"><span><span className="demo-online" /> Agente listo para probar</span><span>CASO FICTICIO</span></div><div className="demo-bubble prospect">¿Qué servicios ofrecen y cuál me recomendarías para empezar?</div><div className="demo-bubble agent"><b><Sparkles size={13} /> UPSCALE IA</b>Podemos orientarte. Para recomendarte algo útil, primero necesito conocer tu objetivo y cómo estás consiguiendo clientes actualmente.</div><div className="demo-composer"><span>Escribe una consulta para probar...</span><span><ArrowRight size={14} /></span></div><div className="demo-footnote"><ShieldCheck size={13} /> Respuesta ilustrativa. El resultado real depende de la configuración y el conocimiento incorporado.</div></div></div></div>
      </section>

      <section className="marketing-process" id="como-funciona"><div className="process-heading"><div className="marketing-eyebrow"><span className="marketing-eyebrow-dot" /> DE LA CONFIGURACIÓN A LA PRUEBA</div><h2>Construye con criterio.<br /><span>Mejora con cada prueba.</span></h2><p>No necesitas empezar con un agente perfecto. Necesitas información clara, pruebas útiles y un proceso para corregir lo que no funciona.</p></div><div className="process-steps">{steps.map((step, index) => <article className="process-step" key={step.title}><span className="process-number">0{index + 1}</span><div className="process-line" /><h3>{step.title}</h3><p>{step.text}</p></article>)}</div></section>

      <section className="marketing-plans" id="planes"><div className="plans-heading"><div className="marketing-eyebrow"><span className="marketing-eyebrow-dot" /> ENCUENTRA TU FORMA DE CRECER</div><h2>Un punto de partida.<br /><span>Un camino para escalar.</span></h2><p>Un único plan, con una implementación inicial y una mensualidad accesible para mantener tu agente comercial.</p></div><div className="plans-grid">{plans.map((plan) => <article className={`plan-card ${plan.featured ? "plan-card-featured" : ""}`} key={plan.name}>{plan.featured && <div className="plan-ribbon">RECOMENDADO</div>}<div className="plan-eyebrow">{plan.eyebrow}</div><h3>{plan.name}</h3><p className="plan-title">{plan.title}</p><p className="plan-description">{plan.description}</p><div className="plan-divider" /><ul><li><Check size={15} /> Configuración del agente</li><li><Check size={15} /> Pruebas en Playground</li><li><Check size={15} /> Centro de conocimiento</li><li><Check size={15} /> Revisión de contactos</li></ul><AuthTrigger className={plan.featured ? "plan-cta plan-cta-primary" : "plan-cta"}>Contratar UpScale IA <ArrowUpRight size={15} /></AuthTrigger></article>)}</div><div className="pricing-currency"><label htmlFor="pricing-currency">Ver precios en</label><select id="pricing-currency" value={currency} onChange={(event) => setCurrency(event.target.value as Currency)}><option value="CLP">Chile · CLP</option><option value="USD">Estados Unidos · USD</option><option value="ARS">Argentina · ARS</option><option value="MXN">México · MXN</option><option value="EUR">Europa · EUR</option><option value="PEN">Perú · PEN</option></select></div><div className="pricing-breakdown"><article className="pricing-item"><span className="pricing-step">PAGO ÚNICO · INICIO</span><h3>Implementación del SaaS</h3><strong>{price.symbol}{price.setup}</strong><p>Configuración inicial y puesta en marcha de tu espacio UpScale IA.</p></article><article className="pricing-item pricing-item-monthly"><span className="pricing-step">SUSCRIPCIÓN MENSUAL</span><h3>Uso de la plataforma</h3><strong>{price.symbol}{price.monthly}<small> / mes</small></strong><p>Acceso continuo a tu agente, Playground y centro de conocimiento.</p></article></div><p className="plans-note"><LockKeyhole size={13} /> CLP es la moneda base. Los importes en otras monedas son referencias aproximadas de conversión y pueden variar; la moneda y el importe final se confirman al contratar.</p></section>

      <section className="marketing-control"><div className="control-visual"><div className="control-orbit" /><div className="control-card"><ShieldCheck size={26} /><span>CONTROL Y CONTEXTO</span><b>La IA no debería<br />inventar por tu negocio.</b><small>Tú defines qué información puede utilizar.</small></div><div className="control-chip"><Check size={13} /> Conocimiento autorizado</div><div className="control-chip control-chip-two"><Check size={13} /> Instrucciones propias</div></div><div className="control-copy"><div className="marketing-eyebrow"><span className="marketing-eyebrow-dot" /> TU NEGOCIO CONSERVA EL CRITERIO</div><h2>La IA trabaja mejor<br /><span>cuando tiene contexto.</span></h2><p>Por eso UpScale IA pone el foco en tus instrucciones, tu información y las pruebas antes de dar por válida una respuesta. El conocimiento que incorporas y la configuración que defines son la base del agente.</p><div className="control-points"><span><Check size={15} /> Tú defines las reglas</span><span><Check size={15} /> Tú incorporas la información</span><span><Check size={15} /> Tú revisas y mejoras</span></div></div></section>

      <section className="marketing-faq" id="preguntas"><div className="faq-intro"><div className="marketing-eyebrow"><span className="marketing-eyebrow-dot" /> RESPUESTAS CLARAS ANTES DE EMPEZAR</div><h2>¿Tienes preguntas?<br /><span>Vamos a resolverlas.</span></h2><p>Queremos que entiendas qué hace la plataforma, cómo se utiliza y qué puedes esperar de ella.</p><AuthTrigger className="marketing-text-link">Hablar sobre UpScale IA <ArrowUpRight size={15} /></AuthTrigger></div><div className="faq-list">{faqs.map((faq, index) => <details className="faq-item" key={faq.q}><summary><span className="faq-index">0{index + 1}</span><b>{faq.q}</b><ChevronDown size={17} /></summary><p>{faq.a}</p></details>)}</div></section>

      <section className="marketing-final-cta"><div><div className="marketing-eyebrow"><span className="marketing-eyebrow-dot" /> EL SIGUIENTE PASO EMPIEZA AQUÍ</div><h2>Tu negocio ya tiene el conocimiento.<br /><span>Es hora de ponerlo en acción.</span></h2><p>Entra a UpScale IA y comienza a construir un agente comercial con el contexto de tu negocio.</p></div><AuthTrigger className="marketing-button-primary">Comenzar con UpScale IA <ArrowRight size={17} /></AuthTrigger></section>
      <footer className="marketing-footer"><Link href="/" className="marketing-footer-brand"><Image src="/images/upscale-ia-horizontal.png" alt="UpScale IA" width={150} height={40} /></Link><span>Hacemos crecer marcas. Construimos lo que sigue.</span><div><AuthTrigger className="marketing-footer-access">Acceso a la plataforma</AuthTrigger><span>© {new Date().getFullYear()} UpScale IA</span></div></footer>
    </main>
  );
}
