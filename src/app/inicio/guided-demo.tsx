"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, RotateCcw, Sparkles, UserRound, Check, LockKeyhole } from "lucide-react";
import Link from "next/link";

type FollowUp = { label: string; response: string };
type Scenario = { id: string; question: string; intent: string; answer: string; followUps: FollowUp[] };

const scenarios: Scenario[] = [
  { id: "price", question: "¿Cuánto cuesta el servicio?", intent: "Consulta de precio", answer: "Te puedo orientar. Para darte una información correcta, primero necesito saber qué solución buscas. Así evitamos recomendarte algo que no encaje con tu necesidad.", followUps: [
    { label: "Conocer las opciones", response: "Perfecto. En una configuración real, podría mostrarte las opciones registradas y resumir sus diferencias. Si falta un precio o una condición, lo correcto es confirmarlo con el equipo." },
    { label: "Solicitar cotización", response: "Puedo ayudarte a preparar una solicitud de cotización. El precio final quedará sujeto a la confirmación del negocio; no voy a inventar una cifra." },
  ]},
  { id: "recommend", question: "¿Qué opción me recomiendas?", intent: "Orientación de compra", answer: "Con gusto. Para orientarte sin asumir cosas, cuéntame qué es lo más importante: tu presupuesto, una característica concreta o resolver una necesidad específica.", followUps: [
    { label: "Tengo presupuesto limitado", response: "Entiendo. Podemos comparar las alternativas disponibles según tu presupuesto. Si no hay suficiente información para recomendar una opción, te lo diré con claridad." },
    { label: "Comparar opciones", response: "Buena idea. Puedo resumir las diferencias entre las opciones registradas, qué incluye cada una y qué conviene confirmar antes de decidir." },
  ]},
  { id: "hours", question: "¿Puedo consultar fuera de horario?", intent: "Atención fuera de horario", answer: "Puedes dejar tu consulta cuando quieras. La respuesta inmediata depende de que el agente esté configurado y conectado al canal correspondiente.", followUps: [
    { label: "Dejar mi consulta", response: "En una integración real, el agente podría recoger tu pregunta y los datos que decidas compartir para que el negocio retome el caso. Esta demo no envía ni almacena información." },
    { label: "Hablar con alguien", response: "Por supuesto. Cuando una persona deba intervenir, el agente debe indicarlo y explicar cómo solicitar contacto según las opciones configuradas." },
  ]},
  { id: "human", question: "Necesito hablar con una persona.", intent: "Derivación humana", answer: "Por supuesto. Hay consultas que necesitan atención personal. Puedo ayudarte a ordenar el motivo de tu consulta para que el equipo tenga contexto al continuar.", followUps: [
    { label: "Consulta sobre un pedido", response: "Entendido. Para proteger tus datos, un canal real debería solicitar solo la información necesaria y derivarte al equipo autorizado. Esta demo no consulta pedidos reales." },
    { label: "Solicitar contacto", response: "En una integración activa, se podría registrar una solicitud si el canal y el consentimiento lo permiten. Aquí solo mostramos el flujo; no se enviará ninguna solicitud." },
  ]},
];

export function GuidedDemo() {
  const [activeId, setActiveId] = useState(scenarios[0].id);
  const [followUp, setFollowUp] = useState<number | null>(null);
  const active = scenarios.find((scenario) => scenario.id === activeId) ?? scenarios[0];

  function chooseScenario(id: string) { setActiveId(id); setFollowUp(null); }
  function resetDemo() { setFollowUp(null); }

  return (
    <div className="up-demo-layout">
      <div className="up-demo-picker">
        <div className="up-demo-picker-head"><span className="up-demo-step">01</span><div><strong>Elige una situación</strong><small>¿Qué pregunta haría tu cliente?</small></div></div>
        <div className="up-demo-question-list" role="group" aria-label="Preguntas de la demostración">
          {scenarios.map((scenario, index) => <button type="button" className={`up-demo-question ${activeId === scenario.id ? "is-active" : ""}`} key={scenario.id} onClick={() => chooseScenario(scenario.id)} aria-pressed={activeId === scenario.id}><span className="up-question-index">0{index + 1}</span><span className="up-question-text">{scenario.question}</span><ArrowRight size={16} className="up-question-arrow"/></button>)}
        </div>
        <div className="up-demo-honesty"><span className="up-honesty-icon"><Sparkles size={17}/></span><p><strong>Entorno de demostración</strong><br/>Respuestas de ejemplo con parámetros básicos. No hay una IA conectada ni se envían mensajes.</p></div>
        <Link className="up-demo-unlock" href="/login"><LockKeyhole size={15}/> Explorar funcionalidades avanzadas <ArrowRight size={14}/></Link>
      </div>

      <div className="up-demo-conversation">
        <div className="up-conversation-top"><div className="up-conversation-identity"><span className="up-agent-avatar"><Sparkles size={18}/></span><div><strong>Agente comercial</strong><small><span className="up-live-dot"/> Conversación de ejemplo · {active.intent}</small></div></div><button className="up-reset-demo" type="button" onClick={resetDemo} aria-label="Reiniciar conversación"><RotateCcw size={15}/><span>Reiniciar</span></button></div>
        <div className="up-chat-thread" aria-live="polite" aria-atomic="true">
          <AnimatePresence mode="wait"><motion.div key={`${active.id}-${followUp === null ? "initial" : followUp}`} className="up-chat-turn" initial={{opacity:0,y:10,filter:"blur(3px)"}} animate={{opacity:1,y:0,filter:"blur(0px)"}} exit={{opacity:0,y:-5,filter:"blur(2px)"}} transition={{duration:0.24,ease:"easeOut"}}>
            <div className="up-chat-message up-chat-user"><span className="up-chat-label"><UserRound size={13}/> Cliente <span className="up-message-time">Ahora</span></span>{active.question}</div>
            <div className="up-chat-message up-chat-response"><span className="up-chat-label"><span className="up-chat-spark"><Sparkles size={12}/></span> Agente <span className="up-message-time">Respuesta de ejemplo</span></span>{followUp === null ? active.answer : active.followUps[followUp].response}</div>
          </motion.div></AnimatePresence>
        </div>
        <div className="up-followup-area"><div className="up-followup-head"><span className="up-followup-label">{followUp === null ? "Elige cómo continúa" : "Puedes probar otra respuesta"}</span><span className="up-followup-count">{followUp === null ? "PASO 02" : "PASO 03"}</span></div><div className="up-followup-options">{active.followUps.map((option,index)=><button type="button" key={option.label} className={`up-followup-button ${followUp===index?"is-selected":""}`} onClick={()=>setFollowUp(index)} aria-pressed={followUp===index}><span>{option.label}</span>{followUp===index?<Check size={15}/>:<ArrowRight size={15}/>}</button>)}</div></div>
        <div className="up-conversation-foot"><span><span className="up-demo-status-dot"/> DEMO BÁSICA</span><span>Sin mensajes reales ni datos guardados</span></div>
      </div>
    </div>
  );
}
