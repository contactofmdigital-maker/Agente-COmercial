"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Plus, RefreshCw, LoaderCircle, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Stage = "qualification" | "diagnosis" | "proposal" | "negotiation" | "won" | "lost";
type Prospect = { id: string; full_name: string; company_name: string | null };
type Opportunity = {
  id: string; prospect_id: string; title: string; description: string | null;
  stage: Stage; estimated_value: number; currency: string;
  expected_close_date: string | null; created_at: string;
};
const stages: { value: Stage; label: string }[] = [
  { value: "qualification", label: "Calificación" },
  { value: "diagnosis", label: "Diagnóstico" },
  { value: "proposal", label: "Propuesta" },
  { value: "negotiation", label: "Negociación" },
  { value: "won", label: "Ganada" },
  { value: "lost", label: "Perdida" },
];

function money(value: number, currency: string) {
  try { return new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: 0 }).format(value); }
  catch { return value.toLocaleString("es-CL") + " " + currency; }
}

export function OpportunityPipeline() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [currency, setCurrency] = useState("CLP");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ prospect_id: "", title: "", description: "", estimated_value: "0", currency: "CLP", expected_close_date: "" });

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const supabase = createClient();
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("Tu sesión no está activa.");
      const [opResult, prospectResult, profileResult] = await Promise.all([
        supabase.from("sales_opportunities").select("id,prospect_id,title,description,stage,estimated_value,currency,expected_close_date,created_at").eq("user_id", auth.user.id).order("created_at", { ascending: false }),
        supabase.from("sales_prospects").select("id,full_name,company_name").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(100),
        supabase.from("business_profiles").select("currency").eq("user_id", auth.user.id).maybeSingle(),
      ]);
      if (opResult.error) throw opResult.error;
      if (prospectResult.error) throw prospectResult.error;
      setOpportunities((opResult.data ?? []) as Opportunity[]);
      setProspects((prospectResult.data ?? []) as Prospect[]);
      const defaultCurrency = profileResult.data?.currency || "CLP";
      setCurrency(defaultCurrency);
      setForm(current => ({ ...current, currency: defaultCurrency, prospect_id: current.prospect_id || prospectResult.data?.[0]?.id || "" }));
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar el pipeline."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const prospectNames = useMemo(() => new Map(prospects.map(p => [p.id, p.company_name ? p.full_name + " · " + p.company_name : p.full_name])), [prospects]);
  const totalOpportunities = opportunities.length;
  const active = opportunities.filter(o => !["won", "lost"].includes(o.stage));
  const totalsByCurrency = (items: Opportunity[]) => {
    const totals = new Map<string, number>();
    items.forEach(item => totals.set(item.currency, (totals.get(item.currency) ?? 0) + Number(item.estimated_value || 0)));
    return totals.size ? Array.from(totals, ([code, value]) => money(value, code)).join(" · ") : money(0, currency);
  };
  const totalActive = totalsByCurrency(active);
  const totalWon = totalsByCurrency(opportunities.filter(o => o.stage === "won"));

  async function createOpportunity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const supabase = createClient();
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("Tu sesión no está activa.");
      const { error: insertError } = await supabase.from("sales_opportunities").insert({
        user_id: auth.user.id, prospect_id: form.prospect_id, title: form.title.trim(),
        description: form.description.trim() || null, estimated_value: Number(form.estimated_value),
        currency: form.currency, expected_close_date: form.expected_close_date || null,
      });
      if (insertError) throw insertError;
      setForm(current => ({ ...current, title: "", description: "", estimated_value: "0", expected_close_date: "" }));
      setShowForm(false); setNotice("Oportunidad creada correctamente."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo crear la oportunidad."); }
    finally { setSaving(false); }
  }

  async function updateStage(id: string, stage: Stage) {
    setError(""); setNotice("");
    const supabase = createClient();
    const { error: updateError } = await supabase.from("sales_opportunities").update({ stage }).eq("id", id);
    if (updateError) { setError(updateError.message); return; }
    setOpportunities(current => current.map(item => item.id === id ? { ...item, stage } : item));
    setNotice("Etapa actualizada.");
  }

  return (
    <section className="panel opportunity-panel" id="pipeline">
      <div className="panel-heading">
        <div><div className="panel-kicker">CRM · GESTIÓN DE VENTAS</div><h3>Pipeline de oportunidades</h3><p>Controla negociaciones, valores y próximos cierres.</p></div>
        <div className="panel-icon"><BriefcaseBusiness size={18} /></div>
      </div>
      <div className="opportunity-summary">
        <div><span>Total de oportunidades</span><strong>{totalOpportunities}</strong></div>
        <div><span>Oportunidades activas</span><strong>{active.length}</strong></div>
        <div><span>Valor del pipeline</span><strong>{totalActive}</strong></div>
        <div><span>Ventas ganadas</span><strong>{totalWon}</strong></div>
      </div>
      {(error || notice) && <div className={error ? "notice error" : "notice success"} role={error ? "alert" : "status"}>{error || notice}</div>}
      <div className="opportunity-toolbar">
        <button className="button button-primary" type="button" onClick={() => setShowForm(v => !v)} disabled={prospects.length === 0}><Plus size={15} />{showForm ? "Cerrar" : "Nueva oportunidad"}</button>
        <button className="button button-secondary" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={14} />{loading ? "Actualizando..." : "Actualizar"}</button>
        {prospects.length === 0 && !loading && <span className="opportunity-hint">Primero registra un prospecto para crear una oportunidad.</span>}
      </div>
      {showForm && <form className="opportunity-form" onSubmit={createOpportunity}>
        <div className="field"><label htmlFor="opp-prospect">Prospecto *</label><select id="opp-prospect" required value={form.prospect_id} onChange={e => setForm({ ...form, prospect_id: e.target.value })}><option value="">Selecciona un prospecto</option>{prospects.map(p => <option key={p.id} value={p.id}>{prospectNames.get(p.id)}</option>)}</select></div>
        <div className="field"><label htmlFor="opp-title">Nombre de oportunidad *</label><input id="opp-title" required maxLength={140} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ej. Implementación de estrategia digital" /></div>
        <div className="field"><label htmlFor="opp-value">Valor estimado</label><input id="opp-value" type="number" min="0" step="1" value={form.estimated_value} onChange={e => setForm({ ...form, estimated_value: e.target.value })} /></div>
        <div className="field"><label htmlFor="opp-currency">Moneda</label><select id="opp-currency" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>{["CLP","USD","EUR","MXN","PEN","COP","ARS"].map(c => <option key={c}>{c}</option>)}</select></div>
        <div className="field"><label htmlFor="opp-date">Cierre estimado</label><input id="opp-date" type="date" value={form.expected_close_date} onChange={e => setForm({ ...form, expected_close_date: e.target.value })} /></div>
        <div className="field opportunity-form-wide"><label htmlFor="opp-description">Descripción / necesidad</label><textarea id="opp-description" rows={2} maxLength={1200} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Contexto de la negociación, alcance y necesidad..." /></div>
        <div className="form-footer"><button type="button" className="button button-secondary" onClick={() => setShowForm(false)} disabled={saving}>Cancelar</button><button type="submit" className="button button-primary" disabled={saving || !form.prospect_id}>{saving ? "Guardando..." : "Crear oportunidad"}</button></div>
      </form>}
      {loading ? <div className="opportunity-empty"><LoaderCircle size={17} /> Cargando oportunidades...</div> : opportunities.length === 0 ? <div className="opportunity-empty"><BriefcaseBusiness size={22} /><strong>Tu pipeline está vacío</strong><span>Crea una oportunidad desde un prospecto existente para comenzar.</span></div> : <div className="opportunity-board">
        {stages.map(stage => {
          const items = opportunities.filter(o => o.stage === stage.value);
          return <div className="opportunity-column" key={stage.value}>
            <div className="opportunity-column-head"><strong>{stage.label}</strong><span>{items.length}</span></div>
            {items.length === 0 ? <p className="opportunity-column-empty">Sin oportunidades</p> : items.map(item => <article className="opportunity-card" key={item.id}>
              <strong>{item.title}</strong><span className="opportunity-prospect">{prospectNames.get(item.prospect_id) || "Prospecto"}</span>
              <b className="opportunity-value">{money(Number(item.estimated_value), item.currency)}</b>
              {item.expected_close_date && <span className="opportunity-date"><CalendarDays size={12} />{new Date(item.expected_close_date + "T12:00:00").toLocaleDateString("es-CL")}</span>}
              <label className="opportunity-stage-label" htmlFor={"stage-" + item.id}>Mover etapa</label>
              <select id={"stage-" + item.id} value={item.stage} onChange={e => void updateStage(item.id, e.target.value as Stage)}>{stages.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
            </article>)}
          </div>;
        })}
      </div>}
    </section>
  );
}
