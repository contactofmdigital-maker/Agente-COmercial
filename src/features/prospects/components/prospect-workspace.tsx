
"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  AlertTriangle,
  Check,
  FileUp,
  Plus,
  RefreshCw,
  Upload,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { detectProspectDuplicates } from "@/features/prospects/lib/duplicate-detection";
import { filterRealProspects, isDemoProspectId } from "@/features/data-classification/lib/record-classification";

type Prospect = {
  id: string;
  full_name: string;
  company_name: string | null;
  email: string | null;
  website: string | null;
  country: string | null;
  status: string;
  created_at: string;
};

type CsvRow = {
  full_name?: string;
  company_name?: string;
  email?: string;
  website?: string;
  country?: string;
  notes?: string;
};

const statusLabels: Record<string, string> = {
  new: "Nuevo",
  contacted: "Contactar",
  qualified: "Calificado",
  proposal: "Propuesta",
  won: "Ganado",
  lost: "Perdido",
};

/** Extrae el mensaje útil de errores nativos o devueltos por Supabase. */
function getReadableError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (typeof error === "object" && error !== null) {
    const details = error as Record<string, unknown>;
    const parts = [details.message, details.details, details.hint, details.code]
      .filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      );

    if (parts.length > 0) {
      return [...new Set(parts)].join(" | ");
    }
  }

  return fallback;
}

async function fetchExistingProspects(supabase: ReturnType<typeof createClient>, userId: string) {
  const pageSize = 500;
  const records: { id: string; full_name: string; company_name: string | null; email: string | null; website: string | null }[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from("sales_prospects").select("id,full_name,company_name,email,website").eq("user_id", userId).order("created_at", { ascending: false }).range(offset, offset + pageSize - 1);
    if (error) throw error;
    records.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return records;
}

export function ProspectWorkspace() {
  const router = useRouter();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [csvRows, setCsvRows] = useState<CsvRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [duplicateDialog, setDuplicateDialog] = useState<{ title: string; description: string; items: string[]; confirmLabel: string } | null>(null);
  const [pendingDuplicateAction, setPendingDuplicateAction] = useState<"save" | "import" | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    full_name: "",
    company_name: "",
    email: "",
    website: "",
    country: "",
    notes: "",
  });

  const validCsvRows = useMemo(
    () =>
      (csvRows ?? []).filter(
        (row) =>
          (row.full_name ?? "").trim() &&
          (row.email ?? "").trim(),
      ),
    [csvRows],
  );

  async function loadProspects() {
    setLoading(true);
    setProspects([]);
    setError("");
    setSuccess("");

    try {
      const supabase = createClient();
      const { data: auth, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!auth.user) {
        throw new Error("Tu sesión no está activa. Inicia sesión nuevamente.");
      }

      const { data, error: queryError } = await supabase
        .from("sales_prospects")
        .select(
          "id,full_name,company_name,email,website,country,status,created_at",
        )
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (queryError) throw queryError;

      setProspects(filterRealProspects((data ?? []) as Prospect[]));
      setLoaded(true);
    } catch (err) {
      setError(
        getReadableError(err, "No se pudieron cargar los prospectos."),
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveProspect(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const supabase = createClient();
      const { data: auth, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      if (!auth.user) {
        throw new Error(
          "Debes iniciar sesión con Supabase Auth antes de guardar prospectos.",
        );
      }

      const candidate = {
        full_name: form.full_name.trim(),
        company_name: form.company_name.trim() || null,
        email: form.email.trim() || null,
        website: form.website.trim() || null,
      };
      const existing = await fetchExistingProspects(supabase, auth.user.id);
      const matches = detectProspectDuplicates(candidate, existing.filter((item) => !isDemoProspectId(item.id)));
      if (matches.length) {
        const uniqueMatches = new Map<string, (typeof matches)[number]>();
        for (const match of matches) {
          const key = match.prospect.id ?? [
            match.prospect.full_name,
            match.prospect.email,
            match.prospect.company_name,
            match.kind,
          ].join("|");
          if (!uniqueMatches.has(key)) uniqueMatches.set(key, match);
        }
        const records = [...uniqueMatches.values()];
        const items = records.map((match, index) => {
          const prospect = match.prospect;
          const details = [
            prospect.company_name ? `Empresa: ${prospect.company_name}` : null,
            prospect.email ? `Correo: ${prospect.email}` : null,
            prospect.website ? `Web: ${prospect.website}` : null,
          ].filter(Boolean).join(" · ");
          const type = match.kind === "confirmed" ? "Duplicado confirmado · correo" : "Posible duplicado · nombre";
          return `${index + 1}. ${prospect.full_name || "Sin nombre"} — ${type}${details ? ` | ${details}` : ""}`;
        });
        setPendingDuplicateAction("save");
        setDuplicateDialog({
          title: "Posible prospecto duplicado",
          description: `Se encontraron ${records.length} registro(s) existente(s) distinto(s). Revisa cada ficha antes de continuar.`,
          items,
          confirmLabel: "Guardar igualmente",
        });
        return;
      }

      const { error: insertError } = await supabase
        .from("sales_prospects")
        .insert({
          user_id: auth.user.id,
          ...candidate,
          country: form.country.trim() || null,
          notes: form.notes.trim() || null,
        });

      if (insertError) throw insertError;

      setForm({
        full_name: "",
        company_name: "",
        email: "",
        website: "",
        country: "",
        notes: "",
      });

      setShowForm(false);
      await loadProspects();
      setSuccess("Prospecto guardado en Supabase.");

      // Refresca los componentes de servidor para actualizar el contador superior.
      router.refresh();
    } catch (err) {
      setError(
        getReadableError(err, "No se pudo guardar el prospecto."),
      );
    } finally {
      setBusy(false);
    }
  }

  function handleFile(file?: File) {
    if (!file) return;

    setError("");
    setSuccess("");

    if (file.size > 5 * 1024 * 1024) {
      setError("El archivo CSV supera el límite de 5 MB.");
      return;
    }

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) =>
        header.trim().toLowerCase().replace(/[ -]/g, "_"),

      complete: (result) => {
        const rows: CsvRow[] = result.data.map((row) => {
          const raw = row as CsvRow & Record<string, unknown>;

          return {
            full_name: String(
              raw.full_name ?? raw.name ?? raw.nombre ?? "",
            ).trim(),
            company_name: String(
              raw.company_name ??
                raw.company ??
                raw.empresa ??
                "",
            ).trim(),
            email: String(
              raw.email ?? raw.correo ?? "",
            ).trim(),
            website: String(
              raw.website ??
                raw.web ??
                raw.sitio_web ??
                "",
            ).trim(),
            country: String(
              raw.country ?? raw.pais ?? "",
            ).trim(),
            notes: String(
              raw.notes ?? raw.notas ?? "",
            ).trim(),
          };
        });

        if (result.errors.length > 0 && rows.length === 0) {
          setError(
            result.errors[0]?.message ??
              "No se pudo leer el archivo CSV.",
          );
          return;
        }

        if (rows.length === 0) {
          setError(
            "El CSV no contiene filas. Revisa los encabezados e inténtalo de nuevo.",
          );
          return;
        }
        if (rows.length > 1000) {
          setError("El CSV supera el máximo de 1.000 filas por importación. Divide el archivo e inténtalo nuevamente.");
          return;
        }

        setCsvRows(rows);
      },

      error: (err) => {
        setError(`Error al leer el CSV: ${err.message}`);
      },
    });
  }

  async function importCsv() {
    if (!csvRows?.length) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const supabase = createClient();

      const { data: auth, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      if (!auth.user) {
        throw new Error(
          "Debes iniciar sesión con Supabase Auth antes de importar prospectos.",
        );
      }

      const seen = new Set<string>();

      const rows = validCsvRows.filter((row) => {
        const key = (row.email ?? "").trim().toLowerCase();

        if (key && seen.has(key)) return false;
        if (key) seen.add(key);

        return true;
      });

      if (rows.length === 0) {
        throw new Error(
          "No hay filas válidas. Cada fila debe incluir nombre y correo.",
        );
      }

      const existing = await fetchExistingProspects(supabase, auth.user.id);
      const realExisting = existing.filter((item) => !isDemoProspectId(item.id));
      const duplicateMatches = rows.flatMap((row) =>
        detectProspectDuplicates(row, realExisting).map((match) => ({ row, match }))
      );
      if (duplicateMatches.length) {
        const uniqueMatches = new Map<string, (typeof duplicateMatches)[number]>();
        for (const entry of duplicateMatches) {
          const key = `${(entry.row.email ?? "").trim().toLowerCase()}|${entry.match.prospect.id ?? [
            entry.match.prospect.full_name,
            entry.match.prospect.email,
            entry.match.prospect.company_name,
          ].join("|")}|${entry.match.kind}`;
          if (!uniqueMatches.has(key)) uniqueMatches.set(key, entry);
        }
        const records = [...uniqueMatches.values()];
        const items = records.map(({ row, match }, index) => {
          const prospect = match.prospect;
          const details = [
            prospect.company_name ? `Empresa: ${prospect.company_name}` : null,
            prospect.email ? `Correo: ${prospect.email}` : null,
            prospect.website ? `Web: ${prospect.website}` : null,
          ].filter(Boolean).join(" · ");
          const type = match.kind === "confirmed" ? "correo coincidente" : "posible coincidencia de nombre";
          return `${index + 1}. CSV: ${row.full_name} ↔ Existente: ${prospect.full_name || "Sin nombre"} (${type})${details ? ` | ${details}` : ""}`;
        });
        const distinctExisting = new Set(records.map(({ match }) => match.prospect.id).filter(Boolean));
        setPendingDuplicateAction("import");
        setDuplicateDialog({
          title: "Coincidencias en el archivo CSV",
          description: `Se detectaron ${records.length} coincidencia(s) que involucran ${distinctExisting.size} registro(s) existente(s) distinto(s). Los registros actuales no se modificarán.`,
          items,
          confirmLabel: "Importar igualmente",
        });
        return;
      }

      const payload = rows.map((row) => ({
        user_id: auth.user!.id,
        full_name: row.full_name!.trim(),
        company_name: row.company_name?.trim() || null,
        email: row.email?.trim() || null,
        website: row.website?.trim() || null,
        country: row.country?.trim() || null,
        notes: row.notes?.trim() || null,
      }));

      const { error: insertError } = await supabase
        .from("sales_prospects")
        .insert(payload);

      if (insertError) throw insertError;

      setCsvRows(null);

      if (fileRef.current) {
        fileRef.current.value = "";
      }

      await loadProspects();
      setSuccess(
        `Importación completada: ${payload.length} prospectos guardados. Se omitieron correos duplicados dentro del archivo.`,
      );

      // Refresca los componentes de servidor para actualizar el contador superior.
      router.refresh();
    } catch (err) {
      setError(
        getReadableError(err, "No se pudo completar la importación."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>

      {duplicateDialog && (
        <div className="duplicate-modal-backdrop">
          <section className="duplicate-modal" role="dialog" aria-modal="true" aria-labelledby="duplicate-modal-title">
            <div className="duplicate-modal-icon"><AlertTriangle size={20} /></div>
            <div className="duplicate-modal-heading">
              <span>REVISIÓN DE DUPLICADOS</span>
              <h3 id="duplicate-modal-title">{duplicateDialog.title}</h3>
              <p>{duplicateDialog.description}</p>
            </div>
            <div className="duplicate-modal-list">
              {duplicateDialog.items.map((item, index) => (
                <div className="duplicate-modal-item" key={item + index}>
                  <span className="duplicate-modal-bullet" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <p className="duplicate-modal-footnote">Continuar no modifica ni elimina los prospectos existentes.</p>
            <div className="duplicate-modal-actions">
              <button type="button" className="button button-secondary" onClick={() => { setDuplicateDialog(null); setPendingDuplicateAction(null); }} disabled={busy}>Cancelar</button>
              <button
                type="button"
                className="button button-primary"
                disabled={busy}
                onClick={async () => {
                  const action = pendingDuplicateAction;
                  setDuplicateDialog(null);
                  setPendingDuplicateAction(null);
                  if (!action) return;
                  setBusy(true);
                  setError("");
                  try {
                    const supabase = createClient();
                    const { data: auth, error: authError } = await supabase.auth.getUser();
                    if (authError) throw authError;
                    if (!auth.user) throw new Error("Tu sesión no está activa. Inicia sesión nuevamente.");
                    if (action === "save") {
                      const candidate = {
                        full_name: form.full_name.trim(),
                        company_name: form.company_name.trim() || null,
                        email: form.email.trim() || null,
                        website: form.website.trim() || null,
                      };
                      const { error: insertError } = await supabase.from("sales_prospects").insert({
                        user_id: auth.user.id, ...candidate,
                        country: form.country.trim() || null,
                        notes: form.notes.trim() || null,
                      });
                      if (insertError) throw insertError;
                      setForm({ full_name: "", company_name: "", email: "", website: "", country: "", notes: "" });
                      setShowForm(false);
                      setSuccess("Prospecto guardado. Se conservaron intactos los registros coincidentes.");
                    } else {
                      const seenEmails = new Set<string>();
                      const rows = validCsvRows.filter((row) => {
                        const key = (row.email ?? "").trim().toLowerCase();
                        if (key && seenEmails.has(key)) return false;
                        if (key) seenEmails.add(key);
                        return true;
                      });
                      const payload = rows.map((row) => ({
                        user_id: auth.user!.id,
                        full_name: row.full_name!.trim(),
                        company_name: row.company_name?.trim() || null,
                        email: row.email?.trim() || null,
                        website: row.website?.trim() || null,
                        country: row.country?.trim() || null,
                        notes: row.notes?.trim() || null,
                      }));
                      const { error: insertError } = await supabase.from("sales_prospects").insert(payload);
                      if (insertError) throw insertError;
                      setCsvRows(null);
                      if (fileRef.current) fileRef.current.value = "";
                      setSuccess(`Importación completada: ${payload.length} prospectos guardados. Los registros existentes no se modificaron.`);
                    }
                    await loadProspects();
                    router.refresh();
                  } catch (err) {
                    setError(getReadableError(err, "No se pudo completar la operación."));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Check size={14} /> {duplicateDialog.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}
      {(error || success) && (
        <div
          className={`notice ${
            error ? "error" : "success"
          }`}
          role={error ? "alert" : "status"}
        >
          {error || success}
        </div>
      )}

      <div className="prospect-actions">
        <button
          type="button"
          className="button button-primary"
          onClick={() => {
            setShowForm((visible) => !visible);
            setCsvRows(null);
            setError("");
            setSuccess("");
          }}
        >
          <Plus size={15} />
          {showForm ? "Cerrar formulario" : "Nuevo prospecto"}
        </button>

        <button
          type="button"
          className="button button-secondary"
          onClick={() => fileRef.current?.click()}
        >
          <FileUp size={15} />
          Importar CSV
        </button>

        <button
          type="button"
          className="button button-secondary"
          onClick={loadProspects}
          disabled={loading || busy}
        >
          <RefreshCw
            size={14}
            className={loading ? "animate-spin" : ""}
          />
          {loading
            ? "Consultando..."
            : loaded
              ? "Actualizar"
              : "Consultar base"}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
          }}
        />
      </div>

      {showForm && (
        <form
          className="prospect-form"
          onSubmit={saveProspect}
        >
          <div className="field">
            <label htmlFor="prospect-full-name">
              Nombre completo *
            </label>
            <input
              id="prospect-full-name"
              required
              value={form.full_name}
              onChange={(event) =>
                setForm({
                  ...form,
                  full_name: event.target.value,
                })
              }
              placeholder="Nombre del contacto"
            />
          </div>

          <div className="field">
            <label htmlFor="prospect-company">Empresa</label>
            <input
              id="prospect-company"
              value={form.company_name}
              onChange={(event) =>
                setForm({
                  ...form,
                  company_name: event.target.value,
                })
              }
              placeholder="Nombre de la empresa"
            />
          </div>

          <div className="field">
            <label htmlFor="prospect-email">
              Correo electrónico
            </label>
            <input
              id="prospect-email"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({
                  ...form,
                  email: event.target.value,
                })
              }
              placeholder="contacto@empresa.com"
            />
          </div>

          <div className="field">
            <label htmlFor="prospect-website">
              Sitio web
            </label>
            <input
              id="prospect-website"
              type="url"
              value={form.website}
              onChange={(event) =>
                setForm({
                  ...form,
                  website: event.target.value,
                })
              }
              placeholder="https://empresa.com"
            />
          </div>

          <div className="field">
            <label htmlFor="prospect-country">País</label>
            <input
              id="prospect-country"
              value={form.country}
              onChange={(event) =>
                setForm({
                  ...form,
                  country: event.target.value,
                })
              }
              placeholder="México, Chile, España..."
            />
          </div>

          <div className="field full">
            <label htmlFor="prospect-notes">
              Notas comerciales
            </label>
            <textarea
              id="prospect-notes"
              rows={2}
              value={form.notes}
              onChange={(event) =>
                setForm({
                  ...form,
                  notes: event.target.value,
                })
              }
              placeholder="Contexto, necesidad detectada, próximo paso..."
            />
          </div>

          <div className="form-footer">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setShowForm(false)}
              disabled={busy}
            >
              <X size={14} />
              Cancelar
            </button>

            <button
              type="submit"
              disabled={busy}
              className="button button-primary"
            >
              {busy ? "Guardando..." : "Guardar prospecto"}
            </button>
          </div>
        </form>
      )}

      {csvRows && (
        <div
          className="prospect-form"
          style={{ display: "block" }}
        >
          <div className="panel-heading">
            <div>
              <h3>Vista previa CSV</h3>
              <p>
                {csvRows.length} filas detectadas ·{" "}
                {validCsvRows.length} con nombre y correo ·{" "}
                {csvRows.length - validCsvRows.length} inválidas
              </p>
            </div>

            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setCsvRows(null);
                if (fileRef.current) {
                  fileRef.current.value = "";
                }
              }}
            >
              <X size={14} />
              Cancelar
            </button>
          </div>

          <p
            style={{
              fontSize: 10,
              color: "#9ba7b9",
              lineHeight: 1.7,
            }}
          >
            Encabezados admitidos: full_name/nombre/name,
            company_name/empresa/company, email/correo,
            website/sitio_web/web, country/pais y notes/notas.
            Se omiten duplicados de correo dentro del archivo;
            revisa también los registros existentes en la base.
          </p>

          <div className="prospect-table-wrap">
            <table className="prospect-table">
              <thead>
                <tr>
                  <th>NOMBRE</th>
                  <th>EMPRESA</th>
                  <th>EMAIL</th>
                </tr>
              </thead>

              <tbody>
                {csvRows.slice(0, 5).map((row, index) => (
                  <tr key={index}>
                    <td>{row.full_name || "—"}</td>
                    <td>{row.company_name || "—"}</td>
                    <td>{row.email || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            className="form-footer"
            style={{ marginTop: 12 }}
          >
            <button
              type="button"
              disabled={busy || validCsvRows.length === 0}
              className="button button-primary"
              onClick={importCsv}
            >
              <Upload size={14} />
              {busy
                ? "Importando..."
                : `Importar ${validCsvRows.length} filas válidas`}
            </button>
          </div>
        </div>
      )}

      {!loaded ? (
        <div className="empty-state">
          <Users size={23} />
          <b>Consulta tus prospectos</b>
          Conecta Supabase y pulsa “Consultar base” para cargar
          registros reales.
        </div>
      ) : prospects.length === 0 ? (
        <div className="empty-state">
          <Users size={23} />
          <b>Aún no hay prospectos</b>
          Crea un registro o importa un CSV para empezar.
        </div>
      ) : (
        <div className="prospect-table-wrap">
          <table className="prospect-table">
            <thead>
              <tr>
                <th>CONTACTO</th>
                <th>EMPRESA</th>
                <th>ESTADO</th>
                <th>PAÍS</th>
              </tr>
            </thead>

            <tbody>
              {prospects.map((prospect) => (
                <tr key={prospect.id}>
                  <td className="prospect-name">
                    {prospect.full_name}
                    <span className="prospect-company">
                      {prospect.email ||
                        prospect.website ||
                        "Sin correo ni web"}
                    </span>
                  </td>

                  <td>{prospect.company_name || "—"}</td>

                  <td>
                    <span className="status-pill">
                      {statusLabels[prospect.status] ||
                        prospect.status}
                    </span>
                  </td>

                  <td>{prospect.country || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
