
"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  FileUp,
  Plus,
  RefreshCw,
  Upload,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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

      setProspects((data ?? []) as Prospect[]);
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

      const { error: insertError } = await supabase
        .from("sales_prospects")
        .insert({
          user_id: auth.user.id,
          full_name: form.full_name.trim(),
          company_name: form.company_name.trim() || null,
          email: form.email.trim() || null,
          website: form.website.trim() || null,
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
