"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCw, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { filterRealProspects } from "@/features/data-classification/lib/record-classification";

type Contact = {
  id: string;
  full_name: string;
  company_name: string | null;
  email: string | null;
  status: string;
  created_at: string;
};

const statusLabels: Record<string, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  qualified: "Interesado",
  proposal: "En evaluación",
  won: "Convertido",
  lost: "Cerrado",
};

async function fetchCapturedContacts(): Promise<Contact[]> {
  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("Tu sesión no está activa. Inicia sesión nuevamente.");

  const { data, error: queryError } = await supabase
    .from("sales_prospects")
    .select("id,full_name,company_name,email,status,created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (queryError) throw queryError;

  return filterRealProspects((data ?? []) as Contact[]);
}

export function CapturedContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetchCapturedContacts()
      .then((nextContacts) => {
        if (cancelled) return;
        setContacts(nextContacts);
        setError("");
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "No se pudieron cargar los contactos.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshContacts = async () => {
    setLoading(true);
    setError("");
    try {
      setContacts(await fetchCapturedContacts());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los contactos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="captured-contacts">
      <div className="captured-contacts-toolbar">
        <div>
          <strong>Contactos registrados</strong>
          <p>Los contactos se guardan cuando el agente identifica una oportunidad y obtiene datos suficientes.</p>
        </div>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => {
            void refreshContacts();
          }}
          disabled={loading}
        >
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {error && <div className="notice error" role="alert">{error}</div>}

      {loading ? (
        <div className="captured-contacts-empty"><LoaderCircle size={18} className="assistant-spin" /> Cargando contactos...</div>
      ) : contacts.length === 0 ? (
        <div className="captured-contacts-empty">
          <Users size={24} />
          <strong>Aún no hay contactos capturados</strong>
          <p>Cuando el agente registre datos de una conversación comercial, aparecerán aquí.</p>
        </div>
      ) : (
        <div className="captured-contacts-table-wrap">
          <table className="captured-contacts-table">
            <thead><tr><th>Contacto</th><th>Empresa</th><th>Correo</th><th>Estado</th><th>Fecha</th></tr></thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td><strong>{contact.full_name || "Sin nombre"}</strong></td>
                  <td>{contact.company_name || "—"}</td>
                  <td>{contact.email || "—"}</td>
                  <td><span className="captured-contacts-status">{statusLabels[contact.status] ?? "Registrado"}</span></td>
                  <td>{new Date(contact.created_at).toLocaleDateString("es-CL")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="captured-contacts-footnote">Vista de consulta. La gestión de etapas, tareas e importaciones CRM queda fuera del producto principal.</p>
    </section>
  );
}
