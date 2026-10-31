"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CalendarClock, Check, Circle, Clock3, LoaderCircle, Mail, MessageCircle, Plus, RefreshCw, Users, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ActivityType = "task" | "call" | "meeting" | "email" | "follow_up";
type ActivityStatus = "pending" | "in_progress" | "completed" | "cancelled";
type Priority = "low" | "medium" | "high";
type Prospect = { id: string; full_name: string; company_name: string | null };
type Opportunity = { id: string; prospect_id: string; title: string };
type SalesActivity = {
  id: string; prospect_id: string | null; opportunity_id: string | null;
  activity_type: ActivityType; title: string; description: string | null;
  due_at: string | null; priority: Priority; status: ActivityStatus; created_at: string;
};

const typeOptions: { value: ActivityType; label: string }[] = [
  { value: "task", label: "Tarea" }, { value: "call", label: "Llamada" },
  { value: "meeting", label: "Reunión" }, { value: "email", label: "Correo" },
  { value: "follow_up", label: "Seguimiento" },
];
const statusOptions: { value: ActivityStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" }, { value: "in_progress", label: "En curso" },
  { value: "completed", label: "Completada" }, { value: "cancelled", label: "Cancelada" },
];
const priorityOptions: { value: Priority; label: string }[] = [
  { value: "low", label: "Baja" }, { value: "medium", label: "Media" }, { value: "high", label: "Alta" },
];

function dateLabel(value: string | null) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}
function typeIcon(type: ActivityType) {
  if (type === "call" || type === "follow_up") return <MessageCircle size={15} />;
  if (type === "meeting") return <Video size={15} />;
  if (type === "email") return <Mail size={15} />;
  return <Check size={15} />;
}

export function ActivityWorkspace() {
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | ActivityStatus>("all");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    activity_type: "task" as ActivityType, title: "", description: "",
    prospect_id: "", opportunity_id: "", due_at: "", priority: "medium" as Priority,
  });

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const supabase = createClient();
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("Tu sesión no está activa.");
      const [activityResult, prospectResult, opportunityResult] = await Promise.all([
        supabase.from("sales_activities").select("id,prospect_id,opportunity_id,activity_type,title,description,due_at,priority,status,created_at").eq("user_id", auth.user.id).order("due_at", { ascending: true, nullsFirst: false }),
        supabase.from("sales_prospects").select("id,full_name,company_name").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(100),
        supabase.from("sales_opportunities").select("id,prospect_id,title").eq("user_id", auth.user.id).order("created_at", { ascending: false }),
      ]);
      if (activityResult.error) throw activityResult.error;
      if (prospectResult.error) throw prospectResult.error;
      if (opportunityResult.error) throw opportunityResult.error;
      setActivities((activityResult.data ?? []) as SalesActivity[]);
      setProspects((prospectResult.data ?? []) as Prospect[]);
      setOpportunities((opportunityResult.data ?? []) as Opportunity[]);
      setForm(current => ({ ...current, prospect_id: current.prospect_id || prospectResult.data?.[0]?.id || "" }));
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudieron cargar las actividades."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const prospectNames = useMemo(() => new Map(prospects.map(p => [p.id, p.company_name ? p.full_name + " · " + p.company_name : p.full_name])), [prospects]);
  const visibleActivities = activities.filter(item => filter === "all" || item.status === filter);
  const pendingCount = activities.filter(item => item.status === "pending" || item.status === "in_progress").length;
  const overdueCount = activities.filter(item => item.due_at && new Date(item.due_at) < new Date() && !["completed", "cancelled"].includes(item.status)).length;

  async function createActivity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const supabase = createClient();
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("Tu sesión no está activa.");
      const { error: insertError } = await supabase.from("sales_activities").insert({
        user_id: auth.user.id, prospect_id: form.prospect_id,
        opportunity_id: form.opportunity_id || null, activity_type: form.activity_type,
        title: form.title.trim(), description: form.description.trim() || null,
        due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
        priority: form.priority, status: "pending",
      });
      if (insertError) throw insertError;
      setForm(current => ({ ...current, title: "", description: "", opportunity_id: "", due_at: "" }));
      setShowForm(false); setNotice("Actividad creada correctamente."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo crear la actividad."); }
    finally { setSaving(false); }
  }

  async function updateStatus(id: string, status: ActivityStatus) {
    setError(""); setNotice("");
    const supabase = createClient();
    const { error: updateError } = await supabase.from("sales_activities").update({ status }).eq("id", id);
    if (updateError) { setError(updateError.message); return; }
    setActivities(current => current.map(item => item.id === id ? { ...item, status } : item));
    setNotice("Estado actualizado.");
  }

  return (
    <section className="activity-workspace">
      <div className="activity-summary">
        <div><span>Total de actividades</span><strong>{activities.length}</strong></div>
        <div><span>Pendientes / en curso</span><strong>{pendingCount}</strong></div>
        <div><span>Vencidas</span><strong>{overdueCount}</strong></div>
      </div>
      {(error || notice) && <div className={error ? "notice error" : "notice success"} role={error ? "alert" : "status"}>{error || notice}</div>}
      <div className="activity-toolbar">
        <button className="button button-primary" type="button" onClick={() => setShowForm(value => !value)} disabled={prospects.length === 0}><Plus size={15} />{showForm ? "Cerrar" : "Nueva actividad"}</button>
        <button className="button button-secondary" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={14} />{loading ? "Actualizando..." : "Actualizar"}</button>
        {prospects.length === 0 && !loading && <span className="opportunity-hint">Primero registra un prospecto para crear una actividad.</span>}
      </div>

      {showForm && <form className="activity-form" onSubmit={createActivity}>
        <div className="field"><label htmlFor="activity-type">Tipo de actividad</label><select id="activity-type" value={form.activity_type} onChange={e => setForm({ ...form, activity_type: e.target.value as ActivityType })}>{typeOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        <div className="field"><label htmlFor="activity-title">Nombre *</label><input id="activity-title" required maxLength={160} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ej. Llamar para confirmar reunión" /></div>
        <div className="field"><label htmlFor="activity-prospect">Prospecto *</label><select id="activity-prospect" required value={form.prospect_id} onChange={e => setForm({ ...form, prospect_id: e.target.value, opportunity_id: "" })}><option value="">Selecciona un prospecto</option>{prospects.map(item => <option key={item.id} value={item.id}>{prospectNames.get(item.id)}</option>)}</select></div>
        <div className="field"><label htmlFor="activity-opportunity">Oportunidad relacionada</label><select id="activity-opportunity" value={form.opportunity_id} onChange={e => setForm({ ...form, opportunity_id: e.target.value })}><option value="">Sin oportunidad específica</option>{opportunities.filter(item => item.prospect_id === form.prospect_id).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
        <div className="field"><label htmlFor="activity-due">Fecha y hora</label><input id="activity-due" type="datetime-local" value={form.due_at} onChange={e => setForm({ ...form, due_at: e.target.value })} /></div>
        <div className="field"><label htmlFor="activity-priority">Prioridad</label><select id="activity-priority" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Priority })}>{priorityOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        <div className="field activity-form-wide"><label htmlFor="activity-description">Notas</label><textarea id="activity-description" rows={3} maxLength={1500} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Detalles, acuerdos o información para el seguimiento..." /></div>
        <div className="form-footer"><button type="button" className="button button-secondary" onClick={() => setShowForm(false)} disabled={saving}>Cancelar</button><button type="submit" className="button button-primary" disabled={saving || !form.prospect_id}>{saving ? "Guardando..." : "Guardar actividad"}</button></div>
      </form>}

      <div className="activity-filters" role="group" aria-label="Filtrar actividades">
        {[{ value: "all", label: "Todas" }, ...statusOptions].map(item => <button key={item.value} type="button" className={filter === item.value ? "active" : ""} onClick={() => setFilter(item.value as "all" | ActivityStatus)}>{item.label}</button>)}
      </div>

      {loading ? <div className="opportunity-empty"><LoaderCircle size={17} /> Cargando actividades...</div> : visibleActivities.length === 0 ? (
        <div className="opportunity-empty"><CalendarClock size={22} /><strong>{activities.length ? "No hay actividades en este filtro" : "Todavía no tienes actividades"}</strong><span>Programa llamadas, reuniones y seguimientos para mantener tu proceso comercial en movimiento.</span></div>
      ) : <div className="activity-list">{visibleActivities.map(item => (
        <article className={`activity-card status-${item.status}`} key={item.id}>
          <div className="activity-type-icon">{typeIcon(item.activity_type)}</div>
          <div className="activity-card-main">
            <div className="activity-card-title"><strong>{item.title}</strong><span className={`priority priority-${item.priority}`}>{priorityOptions.find(option => option.value === item.priority)?.label}</span></div>
            <div className="activity-card-meta"><span><Users size={12} />{item.prospect_id ? prospectNames.get(item.prospect_id) || "Prospecto" : "Sin prospecto"}</span><span><Clock3 size={12} />{dateLabel(item.due_at)}</span><span>{typeOptions.find(option => option.value === item.activity_type)?.label}</span></div>
            {item.description && <p>{item.description}</p>}
          </div>
          <div className="activity-card-actions"><label className="sr-only" htmlFor={`activity-status-${item.id}`}>Estado de {item.title}</label><select id={`activity-status-${item.id}`} value={item.status} onChange={e => void updateStatus(item.id, e.target.value as ActivityStatus)}>{statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
        </article>
      ))}</div>}
    </section>
  );
}
