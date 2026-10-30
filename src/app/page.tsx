
import Image from "next/image";
import {
  Activity,
  ArrowUpRight,
  Building2,
  ChartNoAxesCombined,
  CircleHelp,
  LayoutDashboard,
  MessageSquareText,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProspectWorkspace } from "@/features/prospects/components/prospect-workspace";
import { AssistantChat } from "@/features/assistant/components/assistant-chat";
import { BusinessSettings } from "@/features/business/components/business-settings";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Require a valid authenticated Supabase user before rendering the dashboard.
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;

  try {
    supabase = await createClient();
  } catch {
    supabase = null;
  }

  if (!supabase) {
    redirect("/login");
  }

  let user: User | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error) user = data.user;
  } catch {
    user = null;
  }

  if (!user) {
    redirect("/login");
  }

  let connected = false;
  let prospectCount: number | null = null;
  let connectionMessage =
    "Configura las variables de Supabase para activar los datos reales.";

  try {
    connected = true;
    const { count, error } = await supabase
      .from("sales_prospects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (!error) {
      prospectCount = count ?? 0;
      connectionMessage =
        "Resumen consultado para el usuario autenticado. También estamos verificando las políticas RLS de la base.";
    } else {
      connectionMessage = `Supabase responde, pero falta revisar el esquema o la migración: ${error.message}`;
    }
  } catch {
    connectionMessage =
      "Supabase no está configurado o no se pudo conectar. Revisa .env.local.";
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Image
            src="/images/upscale-ia-horizontal.png"
            alt="UpScale IA"
            width={190}
            height={60}
            priority
            className="brand-logo"
          />
        </div>

        <div className="workspace-pill">
          <div className="workspace-avatar">U</div>
          <div>
            <b>Workspace comercial</b>
            <small>Fase inicial · VIP Premium</small>
          </div>
          <ArrowUpRight size={15} />
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav className="nav-list">
          <a className="nav-item active">
            <LayoutDashboard size={17} />
            Resumen
            <span className="nav-dot" />
          </a>
          <a className="nav-item">
            <Users size={17} />
            Prospectos
          </a>
          <a className="nav-item">
            <Target size={17} />
            Oportunidades
          </a>
          <a className="nav-item">
            <Activity size={17} />
            Actividades
          </a>
          <a className="nav-item">
            <MessageSquareText size={17} />
            Asistente comercial
            <span className="nav-new">IA</span>
          </a>
        </nav>

        <div className="nav-label">SISTEMA</div>
        <nav className="nav-list">
          <a className="nav-item">
            <Building2 size={17} />
            Organización
          </a>
          <a className="nav-item">
            <Settings2 size={17} />
            Configuración
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="secure-icon">
            <ShieldCheck size={17} />
          </div>
          <div>
            <b>Control comercial</b>
            <small>
              Las acciones externas requieren aprobación.
            </small>
          </div>
        </div>

        <div className="profile">
          <div className="profile-avatar">
            {user.email?.slice(0, 2).toUpperCase() || "US"}
          </div>
          <div>
            <b>{user.email || "Usuario"}</b>
            <small>Sesión autenticada</small>
          </div>
          <CircleHelp size={16} />
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="breadcrumbs">
            Workspace <span>/</span> <b>Resumen</b>
          </div>
          <div className="top-actions">
            <div className="search-mini">
              <Search size={15} />
              <span>Búsqueda rápida</span>
              <kbd>⌘ K</kbd>
            </div>
            <div
              className="avatar-small"
              title={user.email || "Usuario autenticado"}
            >
              {user.email?.slice(0, 2).toUpperCase() || "US"}
            </div>
            <SignOutButton />
          </div>
        </header>

        <div className="content">
          <div className="eyebrow">
            <span className="status-pulse" />
            COMMERCIAL INTELLIGENCE
            <span className="eyebrow-divider">/</span>
            FASE 01
          </div>

          <div className="hero-row">
            <div>
              <h1>
                Tu próximo cliente
                <br />
                <span>empieza aquí.</span>
              </h1>
              <p className="hero-copy">
                Centraliza tus oportunidades, identifica prioridades y
                prepara conversaciones comerciales mejor informadas.
              </p>
            </div>
            <div className="hero-art">
              <div className="orb orb-one" />
              <div className="orb orb-two" />
              <div className="hero-target">
                <Target size={39} />
                <Sparkles size={17} className="spark" />
              </div>
              <div className="orbit-label label-top">INTELIGENCIA</div>
              <div className="orbit-label label-bottom">CRECIMIENTO</div>
            </div>
          </div>

          <div
            className={`connection-banner ${
              connected && prospectCount !== null ? "connected" : "warning"
            }`}
          >
            <div className="connection-symbol">
              {connected && prospectCount !== null ? (
                <ShieldCheck size={17} />
              ) : (
                <CircleHelp size={17} />
              )}
            </div>
            <div>
              <b>
                {connected && prospectCount !== null
                  ? "Supabase conectado"
                  : "Conexión pendiente de validar"}
              </b>
              <p>{connectionMessage}</p>
            </div>
            <span className="connection-state">
              {connected && prospectCount !== null
                ? "EN LÍNEA"
                : "CONFIGURACIÓN"}
            </span>
          </div>

          <div className="section-heading">
            <div>
              <h2>Resumen comercial</h2>
              <p>Actividad del espacio de trabajo</p>
            </div>
            <span className="period-chip">
              Vista general <ArrowUpRight size={13} />
            </span>
          </div>

          <div className="metrics-grid">
            <Metric
              icon={<Users size={18} />}
              label="Prospectos registrados"
              value={
                prospectCount === null ? "—" : String(prospectCount)
              }
              change={
                connected && prospectCount !== null
                  ? "Dato consultado en Supabase"
                  : "Pendiente de conexión"
              }
              tone="violet"
            />
            <Metric
              icon={<Target size={18} />}
              label="Oportunidades activas"
              value="—"
              change="Disponible tras configurar el pipeline"
              tone="blue"
            />
            <Metric
              icon={<ChartNoAxesCombined size={18} />}
              label="Conversión comercial"
              value="—"
              change="Se calculará con actividad real"
              tone="green"
            />
            <Metric
              icon={<Activity size={18} />}
              label="Seguimientos pendientes"
              value="—"
              change="Requiere módulo de tareas"
              tone="amber"
            />
          </div>

          <BusinessSettings />

          <div className="workspace-grid">
            <section className="panel prospect-panel">
              <div className="panel-heading">
                <div>
                  <div className="panel-kicker">CRM · CAPTACIÓN</div>
                  <h3>Prospectos</h3>
                  <p>Registra contactos e importa tu base comercial.</p>
                </div>
                <div className="panel-icon">
                  <Users size={18} />
                </div>
              </div>
              <ProspectWorkspace />
            </section>

            <section className="panel assistant-panel">
              <div className="panel-heading">
                <div>
                  <div className="panel-kicker">AI SALES COPILOT</div>
                  <h3>Agente Comercial</h3>
                  <p>Consulta tu CRM y prepara tu siguiente movimiento comercial.</p>
                </div>
                <div className="ai-icon">
                  <Sparkles size={19} />
                </div>
              </div>
              <AssistantChat />
            </section>
          </div>

          <footer className="footer">
            <span>© 2026 UpScale IA · Agente Comercial VIP Premium</span>
            <span>
              <ShieldCheck size={13} /> Desarrollo local · Fase 01
            </span>
          </footer>
        </div>
      </section>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
  change,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  change: string;
  tone: string;
}) {
  return (
    <div className="metric-card">
      <div className="metric-top">
        <div className={`metric-icon ${tone}`}>{icon}</div>
        <span className="metric-menu">•••</span>
      </div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-change">{change}</div>
    </div>
  );
}
