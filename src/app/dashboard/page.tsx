import Image from "next/image";
import Link from "next/link";
import { BookOpen, Bot, Users, ShieldCheck, CircleHelp } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CapturedContacts } from "@/features/contacts/components/captured-contacts";
import { KnowledgeHub } from "@/features/knowledge/components/knowledge-hub";
import { AgentConfigurator } from "@/features/agent/components/agent-configurator";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Section = "agent" | "knowledge" | "contacts";
type PageProps = { searchParams: Promise<{ section?: string }> };

const sections: { id: Section; label: string; icon: typeof Bot; optional?: boolean }[] = [
  { id: "agent", label: "Agente IA", icon: Bot },
  { id: "knowledge", label: "Conocimiento", icon: BookOpen },
  { id: "contacts", label: "Contactos capturados", icon: Users, optional: true },
];

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const requested = params.section;
  const activeSection: Section = sections.some((item) => item.id === requested) ? requested as Section : "agent";

  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  try { supabase = await createClient(); } catch { supabase = null; }
  if (!supabase) redirect("/login");

  let user: User | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error) user = data.user;
  } catch { user = null; }
  if (!user) redirect("/login");

  const active = sections.find((item) => item.id === activeSection) ?? sections[0];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Image src="/images/upscale-ia-horizontal.png" alt="UpScale IA" width={190} height={60} priority className="brand-logo" />
        </div>
        <div className="workspace-pill">
          <div className="workspace-avatar">U</div>
          <div><b>UpScale IA</b><small>Agente comercial</small></div>
        </div>

        <div className="nav-label">PRODUCTO</div>
        <nav className="nav-list" aria-label="Navegación principal">
          {sections.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.id} href={item.id === "agent" ? "/dashboard" : `/dashboard?section=${item.id}`} className={`nav-item ${activeSection === item.id ? "active" : ""}`} aria-current={activeSection === item.id ? "page" : undefined}>
                <Icon size={17} />{item.label}
                {item.optional && <span className="nav-new">OPCIONAL</span>}
                {activeSection === item.id && <span className="nav-dot" />}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="secure-icon"><ShieldCheck size={17} /></div>
          <div><b>Datos protegidos</b><small>Cada cuenta accede solo a su información.</small></div>
        </div>
        <div className="profile">
          <div className="profile-avatar">{user.email?.slice(0, 2).toUpperCase() || "US"}</div>
          <div><b>{user.email || "Usuario"}</b><small>Sesión autenticada</small></div>
          <CircleHelp size={16} />
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="breadcrumbs">UpScale IA <span>/</span> <b>{active.label}</b></div>
          <div className="top-actions">
            <span className="connection-state">AGENTE COMERCIAL</span>
            <div className="avatar-small" title={user.email || "Usuario autenticado"}>{user.email?.slice(0, 2).toUpperCase() || "US"}</div>
            <SignOutButton />
          </div>
        </header>

        <div className="content">
          {activeSection === "agent" && (
            <ModuleHeader kicker="CENTRO DE CONTROL" title="Tu agente comercial" description="Configura su comportamiento, define qué información puede utilizar y prueba cómo atiende a tus clientes." icon={<Bot size={19} />}>
              <AgentConfigurator />
            </ModuleHeader>
          )}

          {activeSection === "knowledge" && (
            <ModuleHeader kicker="FUENTE DE INFORMACIÓN" title="Centro de conocimiento" description="Mantén actualizados los servicios, precios, preguntas frecuentes y políticas que el agente tiene permitido utilizar." icon={<BookOpen size={19} />}>
              <KnowledgeHub />
            </ModuleHeader>
          )}

          {activeSection === "contacts" && (
            <ModuleHeader kicker="RESULTADO DEL AGENTE · OPCIONAL" title="Contactos capturados" description="Consulta los contactos registrados durante las conversaciones. Esta bandeja es complementaria y no pretende sustituir un CRM." icon={<Users size={19} />}>
              <CapturedContacts />
            </ModuleHeader>
          )}

          <footer className="footer">
            <span>© 2026 UpScale IA · Agente Comercial</span>
            <span><ShieldCheck size={13} /> Atención con contexto y control humano</span>
          </footer>
        </div>
      </section>
    </main>
  );
}

function ModuleHeader({ kicker, title, description, icon, children }: { kicker: string; title: string; description: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="module-page">
      <div className="module-title-row">
        <div><div className="panel-kicker">{kicker}</div><h1>{title}</h1><p>{description}</p></div>
        <div className="panel-icon">{icon}</div>
      </div>
      {children}
    </section>
  );
}
