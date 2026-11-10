"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Check, CircleHelp, FileText, LoaderCircle, Plus, Save, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Category = "product" | "faq" | "policy" | "business" | "instruction";
type Status = "draft" | "published" | "disabled";
type Entry = {
  id: string;
  user_id: string;
  category: Category;
  title: string;
  content: string;
  status: Status;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
type Draft = Pick<Entry, "category" | "title" | "content" | "status">;

const categories: { value: Category; label: string; description: string }[] = [
  { value: "product", label: "Productos y servicios", description: "Qué vendes, características, precios y condiciones." },
  { value: "faq", label: "Preguntas frecuentes", description: "Consultas habituales y respuestas aprobadas." },
  { value: "policy", label: "Políticas comerciales", description: "Garantías, cambios, devoluciones y restricciones." },
  { value: "business", label: "Información del negocio", description: "Horarios, ubicación, cobertura y contacto." },
  { value: "instruction", label: "Instrucciones del agente", description: "Tono, personalidad, límites y reglas de atención." },
];
const emptyDraft: Draft = { category: "product", title: "", content: "", status: "draft" };
const statusLabels: Record<Status, string> = { draft: "Borrador", published: "Publicado", disabled: "Desactivado" };

export function KnowledgeHub() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [filter, setFilter] = useState<"all" | Category>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("Tu sesión no está activa. Inicia sesión nuevamente.");
      const { data, error: queryError } = await supabase
        .from("agent_knowledge_entries")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("updated_at", { ascending: false });
      if (queryError) throw queryError;
      const rows = (data ?? []) as Entry[];
      setEntries(rows);
      if (selectedId && !rows.some((item) => item.id === selectedId)) {
        setSelectedId(null);
        setDraft(emptyDraft);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el centro de conocimiento.");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => { void loadEntries(); }, [loadEntries]);

  const visibleEntries = useMemo(() => entries.filter((entry) => {
    const matchesCategory = filter === "all" || entry.category === filter;
    const term = search.trim().toLocaleLowerCase();
    const matchesSearch = !term || entry.title.toLocaleLowerCase().includes(term) || entry.content.toLocaleLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  }), [entries, filter, search]);

  const publishedCount = entries.filter((item) => item.status === "published").length;
  const selectEntry = (entry: Entry) => {
    setSelectedId(entry.id);
    setDraft({ category: entry.category, title: entry.title, content: entry.content, status: entry.status });
    setNotice("");
    setError("");
  };
  const startNew = () => {
    setSelectedId(null);
    setDraft(emptyDraft);
    setNotice("");
    setError("");
  };

  async function saveEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const supabase = createClient();
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("Tu sesión no está activa. Inicia sesión nuevamente.");
      const payload = {
        user_id: auth.user.id,
        category: draft.category,
        title: draft.title.trim(),
        content: draft.content.trim(),
        status: draft.status,
      };
      if (selectedId) {
        const { error: updateError } = await supabase.from("agent_knowledge_entries").update(payload).eq("id", selectedId).eq("user_id", auth.user.id);
        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase.from("agent_knowledge_entries").insert(payload).select("id").single();
        if (insertError) throw insertError;
        if (data?.id) setSelectedId(data.id as string);
      }
      setNotice("Contenido guardado correctamente.");
      await loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el contenido.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry() {
    if (!selectedId || !window.confirm("¿Eliminar este contenido? Esta acción no se puede deshacer.")) return;
    setDeleting(true);
    setError("");
    setNotice("");
    try {
      const supabase = createClient();
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("Tu sesión no está activa. Inicia sesión nuevamente.");
      const { error: deleteError } = await supabase.from("agent_knowledge_entries").delete().eq("id", selectedId).eq("user_id", auth.user.id);
      if (deleteError) throw deleteError;
      startNew();
      setNotice("Contenido eliminado.");
      await loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el contenido.");
    } finally {
      setDeleting(false);
    }
  }

  const selectedCategory = categories.find((item) => item.value === draft.category)!;

  return (
    <div className="knowledge-hub">
      <div className="knowledge-intro">
        <div className="knowledge-intro-icon"><BookOpen size={21} /></div>
        <div><strong>La fuente de información de tu futuro agente</strong><p>Organiza contenido aprobado para que el agente pueda responder con contexto. Esta versión funciona sin conectar IA y no consume tokens.</p></div>
      </div>

      <div className="knowledge-stats">
        <div><span>CONTENIDOS</span><strong>{entries.length}</strong></div>
        <div><span>PUBLICADOS</span><strong>{publishedCount}</strong></div>
        <div><span>CATEGORÍAS</span><strong>{new Set(entries.map((item) => item.category)).size} / 5</strong></div>
        <div className="knowledge-publish-note"><ShieldCheck size={17} /><span>Solo el contenido publicado quedará habilitado para el futuro agente.</span></div>
      </div>

      <div className="knowledge-workspace">
        <aside className="knowledge-library">
          <div className="knowledge-library-head"><div><span className="panel-kicker">BIBLIOTECA</span><h3>Tu contenido</h3></div><button type="button" className="knowledge-add" onClick={startNew} aria-label="Nuevo contenido"><Plus size={16} /></button></div>
          <label className="knowledge-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar contenido..." /></label>
          <div className="knowledge-filters">
            <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todo</button>
            {categories.map((item) => <button type="button" key={item.value} className={filter === item.value ? "active" : ""} onClick={() => setFilter(item.value)}>{item.label}</button>)}
          </div>
          <div className="knowledge-entry-list">
            {loading ? <div className="knowledge-empty"><LoaderCircle size={17} className="assistant-spin" /> Cargando contenido...</div> :
              visibleEntries.length ? visibleEntries.map((entry) => <button type="button" key={entry.id} className={selectedId === entry.id ? "knowledge-entry selected" : "knowledge-entry"} onClick={() => selectEntry(entry)}>
                <span className="knowledge-entry-icon"><FileText size={15} /></span><span className="knowledge-entry-copy"><strong>{entry.title}</strong><small>{categories.find((item) => item.value === entry.category)?.label}</small></span><span className={`knowledge-status knowledge-status-${entry.status}`}>{statusLabels[entry.status]}</span>
              </button>) : <div className="knowledge-empty"><CircleHelp size={17} /> Aún no hay contenido. Crea tu primer registro.</div>}
          </div>
        </aside>

        <section className="knowledge-editor">
          <div className="knowledge-editor-head"><div><span className="panel-kicker">{selectedId ? "EDITAR CONTENIDO" : "NUEVO REGISTRO"}</span><h3>{selectedId ? "Actualizar información" : "Añadir conocimiento"}</h3></div>{selectedId && <button type="button" className="knowledge-icon-button" onClick={startNew} aria-label="Cerrar edición"><X size={16} /></button>}</div>
          <form onSubmit={saveEntry}>
            <div className="knowledge-field"><label htmlFor="knowledge-category">Categoría</label><select id="knowledge-category" value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as Category }))}>{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><small>{selectedCategory.description}</small></div>
            <div className="knowledge-field"><label htmlFor="knowledge-title">Título</label><input id="knowledge-title" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Ej. Horarios de atención" maxLength={140} minLength={2} required /></div>
            <div className="knowledge-field"><label htmlFor="knowledge-content">Contenido aprobado</label><textarea id="knowledge-content" value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} placeholder="Escribe la información exacta que el agente podrá utilizar..." rows={8} maxLength={10000} minLength={2} required /><small>{draft.content.length.toLocaleString("es-CL")} / 10.000 caracteres</small></div>
            <div className="knowledge-field"><label htmlFor="knowledge-status">Estado del contenido</label><select id="knowledge-status" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as Status }))}><option value="draft">Borrador · Solo preparación</option><option value="published">Publicado · Disponible para el futuro agente</option><option value="disabled">Desactivado · No utilizar</option></select></div>
            <div className="knowledge-preview"><div><span className="panel-kicker">VISTA PREVIA</span><strong>{draft.title.trim() || "Título del contenido"}</strong><p>{draft.content.trim() || "Aquí aparecerá una vista previa de la información que estás preparando."}</p></div><span className={`knowledge-status knowledge-status-${draft.status}`}>{statusLabels[draft.status]}</span></div>
            {error && <div className="notice error" role="alert">{error}</div>}
            {notice && <div className="notice success" role="status"><Check size={14} /> {notice}</div>}
            <div className="knowledge-actions">{selectedId && <button type="button" className="knowledge-delete" onClick={deleteEntry} disabled={deleting || saving}>{deleting ? <LoaderCircle size={15} className="assistant-spin" /> : <Trash2 size={15} />} Eliminar</button>}<button type="submit" className="button button-primary" disabled={saving || deleting}>{saving ? <LoaderCircle size={15} className="assistant-spin" /> : <Save size={15} />}{saving ? "Guardando..." : "Guardar contenido"}</button></div>
          </form>
        </section>
      </div>
    </div>
  );
}
