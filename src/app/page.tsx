import Image from "next/image";
import Link from "next/link";
import {
  Activity, ArrowUpRight, Building2, ChartNoAxesCombined, CircleHelp,
  LayoutDashboard, MessageSquareText, Search, Settings2, ShieldCheck,
  Sparkles, Target, Users,
} from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProspectWorkspace } from "@/features/prospects/components/prospect-workspace";
import { AssistantChat } from "@/features/assistant/components/assistant-chat";
import { BusinessSettings } from "@/features/business/components/business-settings";
import { OpportunityPipeline } from "@/features/opportunities/components/opportunity-pipeline";
import { ActivityWorkspace } from "@/features/activities/components/activity-workspace";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Section = "overview" | "prospects" | "opportunities" | "activities" | "assistant" | "organization" | "settings";
type PageProps = { searchParams: Promise<{ section?: string }> };

const sections: { id: Section; label: string; icon: typeof LayoutDashboard; group: "workspace" | "system"; badge?: string }[] = [
  { id: "overview", label: "Resumen", icon: LayoutDashboard, group: "workspace" },
  { id: "prospects", label: "Prospectos", icon: Users, group: "workspace" },
  { id: "opportunities", label: "Oportunidades", icon: Target, group: "workspace" },
  { id: "activities", label: "Actividades", icon: Activity, group: "workspace" },
  { id: "assistant", label: "Asistente comercial", icon: MessageSquareText, group: "workspace", badge: "IA" },
  { id: "organization", label: "Organización", icon: Building2, group: "system" },
  { id: "settings", label: "Configuración", icon: Settings2, group: "system" },
];

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const requested = params.section as Section | undefined;
  const activeSection: Section = sections.some((item) => item.id === requested) ? requested! : "overview";

  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  try { supabase = await createClient(); } catch { supabase = null; }
  if (!supabase) redirect("/login");

  let user: User | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error) user = data.user;
  } catch { user = null; }
  if (!user) redirect("/login");

  let connected = false;
  let prospectCount: number | null = null;
  let connectionMessage = "Configura las variables de Supabase para activar los datos reales.";
  try {
    connected = true;
    const { count, error } = await supabase.from("sales_prospects")
      .select("*", { count: "exact", head: true }).eq("user_id", user.id);
    if (!error) {
      prospectCount = count ?? 0;
      connectionMessage = "Resumen consultado para el usuario autenticado.";
    } else {
      connectionMessage = `Supabase responde, pero falta revisar el esquema o la migración: ${error.message}`;
    }
  } catch {
    connectionMessage = "Supabase no está configurado o no se pudo conectar. Revisa .env.local.";
  }

  const activeLabel = sections.find((item) => item.id === activeSection)?.label ?? "Resumen";

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Image src="/images/upscale-ia-horizontal.png" alt="UpScale IA" width={190} height={60} priority className="brand-logo" />
        </div>
        <div className="workspace-pill">
          <div className="workspace-avatar">U</div>
          <div><b>Workspace comercial</b><small>Fase inicial · VIP Premium</small></div>
          <ArrowUpRight size={15} />
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav className="nav-list" aria-label="Navegación del workspace">
          {sections.filter((item) => item.group === "workspace").map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.id} href={item.id === "overview" ? "/" : `/?section=${item.id}`} className={`nav-item ${activeSection === item.id ? "active" : ""}`} aria-current={activeSection === item.id ? "page" : undefined}>
                <Icon size={17} />{item.label}
                {item.badge && <span className="nav-new">{item.badge}</span>}
                {activeSection === item.id && <span className="nav-dot" />}
              </Link>
            );
          })}
        </nav>

        <div className="nav-label">SISTEMA</div>
        <nav className="nav-list" aria-label="Configuración del sistema">
          {sections.filter((item) => item.group === "system").map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.id} href={`/?section=${item.id}`} className={`nav-item ${activeSection === item.id ? "active" : ""}`} aria-current={activeSection === item.id ? "page" : undefined}>
                <Icon size={17} />{item.label}
                {activeSection === item.id && <span className="nav-dot" />}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="secure-icon"><ShieldCheck size={17} /></div>
          <div><b>Control comercial</b><small>Las acciones externas requieren aprobación.</small></div>
        </div>
        <div className="profile">
          <div className="profile-avatar">{user.email?.slice(0, 2).toUpperCase() || "US"}</div>
          <div><b>{user.email || "Usuario"}</b><small>Sesión autenticada</small></div>
          <CircleHelp size={16} />
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="breadcrumbs">Workspace <span>/</span> <b>{activeLabel}</b></div>
          <div className="top-actions">
            <div className="search-mini"><Search size={15} /><span>Búsqueda rápida</span><kbd>⌘ K</kbd></div>
            <div className="avatar-small" title={user.email || "Usuario autenticado"}>{user.email?.slice(0, 2).toUpperCase() || "US"}</div>
            <SignOutButton />
          </div>
        </header>

        <div className="content">
          {activeSection === "overview" && (
            <>
              <div className="eyebrow"><span className="status-pulse" />COMMERCIAL INTELLIGENCE<span className="eyebrow-divider">/</span>FASE 01</div>
              <div className="hero-row">
                <div>
                  <h1>Tu próximo cliente<br /><span>empieza aquí.</span></h1>
                  <p className="hero-copy">Centraliza tus oportunidades, identifica prioridades y prepara conversaciones comerciales mejor informadas.</p>
                </div>
                <div className="hero-art">
                  <div className="orb orb-one" /><div className="orb orb-two" />
                  <div className="hero-target"><Target size={39} /><Sparkles size={17} className="spark" /></div>
                  <div className="orbit-label label-top">INTELIGENCIA</div><div className="orbit-label label-bottom">CRECIMIENTO</div>
                </div>
              </div>
              <div className={`connection-banner ${connected && prospectCount !== null ? "connected" : "warning"}`}>
                <div className="connection-symbol">{connected && prospectCount !== null ? <ShieldCheck size={17} /> : <CircleHelp size={17} />}</div>
                <div><b>{connected && prospectCount !== null ? "Supabase conectado" : "Conexión pendiente de validar"}</b><p>{connectionMessage}</p></div>
                <span className="connection-state">{connected && prospectCount !== null ? "EN LÍNEA" : "CONFIGURACIÓN"}</span>
              </div>
              <div className="section-heading">
                <div><h2>Resumen comercial</h2><p>Actividad del espacio de trabajo</p></div>
                <span className="period-chip">Vista general <ArrowUpRight size={13} /></span>
              </div>
              <div className="metrics-grid">
                <Metric icon={<Users size={18} />} label="Prospectos registrados" value={prospectCount === null ? "—" : String(prospectCount)} change={connected && prospectCount !== null ? "Dato consultado en Supabase" : "Pendiente de conexión"} tone="violet" />
                <Metric icon={<Target size={18} />} label="Oportunidades activas" value="—" change="Consulta el módulo Oportunidades" tone="blue" />
                <Metric icon={<ChartNoAxesCombined size={18} />} label="Conversión comercial" value="—" change="Se calculará con actividad real" tone="green" />
                <Metric icon={<Activity size={18} />} label="Seguimientos pendientes" value="—" change="Consulta el módulo Actividades" tone="amber" />
              </div>
              <div className="overview-shortcuts">
                <Link href="/?section=prospects">Ir a Prospectos <ArrowUpRight size={14} /></Link>
                <Link href="/?section=opportunities">Ver oportunidades <ArrowUpRight size={14} /></Link>
                <Link href="/?section=activities">Revisar actividades <ArrowUpRight size={14} /></Link>
              </div>
            </>
          )}

          {activeSection === "prospects" && (
            <ModuleHeader kicker="CRM · CAPTACIÓN" title="Prospectos" description="Registra contactos, administra tu base comercial e importa prospectos mediante CSV." icon={<Users size={18} />}>
              <ProspectWorkspace />
            </ModuleHeader>
          )}
          {activeSection === "opportunities" && (
            <ModuleHeader kicker="CRM · GESTIÓN DE VENTAS" title="Oportunidades" description="Organiza negociaciones, controla etapas y revisa el valor de tu pipeline." icon={<Target size={18} />}>
              <OpportunityPipeline />
            </ModuleHeader>
          )}
          {activeSection === "activities" && (
            <ModuleHeader kicker="WORKSPACE · SEGUIMIENTO" title="Actividades" description="Centraliza llamadas, reuniones y tareas para que ninguna oportunidad quede sin seguimiento." icon={<Activity size={18} />}>
              <ActivityWorkspace />
            </ModuleHeader>
          )}
          {activeSection === "assistant" && (
            <ModuleHeader kicker="AI SALES COPILOT" title="Asistente comercial" description="Consulta tu CRM, prioriza prospectos y prepara el siguiente movimiento comercial." icon={<Sparkles size={18} />}>
              <AssistantChat />
            </ModuleHeader>
          )}
          {activeSection === "organization" && (
            <ModuleHeader kicker="SISTEMA · PERFIL DEL NEGOCIO" title="Organización" description="Configura el contexto comercial que utiliza UpScale IA para adaptar sus recomendaciones." icon={<Building2 size={18} />}>
              <BusinessSettings />
            </ModuleHeader>
          )}
          {activeSection === "settings" && (
            <ModuleHeader kicker="SISTEMA · PREFERENCIAS" title="Configuración" description="Preferencias generales de tu espacio de trabajo." icon={<Settings2 size={18} />}>
              <div className="module-placeholder">
                <div className="placeholder-icon"><Settings2 size={22} /></div>
                <h3>Configuración de cuenta</h3>
                <p>La navegación ya está preparada. En la siguiente pasada incorporaremos aquí las preferencias de cuenta y seguridad disponibles.</p>
                <span className="placeholder-status">SECCIÓN PREPARADA</span>
              </div>
            </ModuleHeader>
          )}

          <footer className="footer">
            <span>© 2026 UpScale IA · Agente Comercial VIP Premium</span>
            <span><ShieldCheck size={13} /> Desarrollo local · Fase 01</span>
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

function Metric({ icon, label, value, change, tone }: { icon: ReactNode; label: string; value: string; change: string; tone: string }) {
  return (
    <div className="metric-card">
      <div className="metric-top"><div className={`metric-icon ${tone}`}>{icon}</div><span className="metric-menu">•••</span></div>
      <div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-change">{change}</div>
    </div>
  );
}
