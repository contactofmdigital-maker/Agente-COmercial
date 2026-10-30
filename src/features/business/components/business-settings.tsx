"use client";

import { useEffect, useState } from "react";
import { Building2, LoaderCircle, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Segment = "agency" | "local" | "company" | "startup";
type BusinessProfile = {
  business_name: string;
  segment: Segment;
  country: string;
  currency: string;
  description: string;
  products_services: string;
  ideal_customer: string;
  sales_goal: string;
};

const defaults: BusinessProfile = {
  business_name: "",
  segment: "agency",
  country: "Chile",
  currency: "CLP",
  description: "",
  products_services: "",
  ideal_customer: "",
  sales_goal: "",
};

const segments: { value: Segment; label: string; help: string }[] = [
  { value: "agency", label: "Agencia", help: "Captación B2B, cartera de empresas, propuestas y contratos recurrentes." },
  { value: "local", label: "Negocio local", help: "Consultas entrantes, reservas, visitas y ventas de proximidad." },
  { value: "company", label: "Empresa", help: "Cuentas, decisores, pipeline y ciclos de venta." },
  { value: "startup", label: "Emprendimiento", help: "Validación de oferta, primeros clientes y conversión inicial." },
];

export function BusinessSettings() {
  const [profile, setProfile] = useState<BusinessProfile>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      try {
        const supabase = createClient();
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!auth.user) throw new Error("Tu sesión no está activa. Inicia sesión nuevamente.");

        const { data, error: queryError } = await supabase
          .from("business_profiles")
          .select("business_name,segment,country,currency,description,products_services,ideal_customer,sales_goal")
          .eq("user_id", auth.user.id)
          .maybeSingle();
        if (queryError) throw queryError;
        if (active && data) {
          const next = { ...defaults, ...data } as BusinessProfile;
          setProfile(next);
          window.localStorage.setItem("upscale-business-segment", next.segment);
          window.dispatchEvent(new CustomEvent("upscale-business-profile-updated", { detail: { segment: next.segment } }));
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "No se pudo cargar la configuración.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadProfile();
    return () => { active = false; };
  }, []);

  function update<K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
    setNotice("");
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const supabase = createClient();
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("Tu sesión no está activa. Inicia sesión nuevamente.");

      const payload = { user_id: auth.user.id, ...profile };
      const { error: saveError } = await supabase
        .from("business_profiles")
        .upsert(payload, { onConflict: "user_id" });
      if (saveError) throw saveError;

      window.localStorage.setItem("upscale-business-segment", profile.segment);
      window.dispatchEvent(new CustomEvent("upscale-business-profile-updated", { detail: { segment: profile.segment } }));
      setNotice("Configuración guardada en tu cuenta de UpScale IA.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  }

  const selectedSegment = segments.find((item) => item.value === profile.segment);

  return (
    <section className="panel business-settings">
      <div className="panel-heading">
        <div>
          <div className="panel-kicker">WORKSPACE · CONFIGURACIÓN</div>
          <h3>Perfil de negocio</h3>
          <p>Estos datos personalizan el enfoque comercial de tu espacio de trabajo.</p>
        </div>
        <div className="panel-icon"><Building2 size={18} /></div>
      </div>

      {loading ? (
        <p className="business-settings-loading"><LoaderCircle size={16} /> Cargando configuración...</p>
      ) : (
        <form className="business-settings-form" onSubmit={saveProfile}>
          <div className="business-settings-grid">
            <div className="field">
              <label htmlFor="business-name">Nombre del negocio</label>
              <input id="business-name" value={profile.business_name} onChange={(event) => update("business_name", event.target.value)} placeholder="Ej. Mi empresa" maxLength={120} />
            </div>
            <div className="field">
              <label htmlFor="business-segment">Tipo de negocio *</label>
              <select id="business-segment" required value={profile.segment} onChange={(event) => update("segment", event.target.value as Segment)}>
                {segments.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="business-country">País principal</label>
              <input id="business-country" value={profile.country} onChange={(event) => update("country", event.target.value)} placeholder="Chile" maxLength={80} />
            </div>
            <div className="field">
              <label htmlFor="business-currency">Moneda comercial</label>
              <select id="business-currency" value={profile.currency} onChange={(event) => update("currency", event.target.value)}>
                <option value="CLP">Peso chileno (CLP)</option>
                <option value="USD">Dólar estadounidense (USD)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="MXN">Peso mexicano (MXN)</option>
                <option value="PEN">Sol peruano (PEN)</option>
                <option value="COP">Peso colombiano (COP)</option>
                <option value="ARS">Peso argentino (ARS)</option>
              </select>
            </div>
            <div className="field business-settings-full">
              <label htmlFor="business-description">¿A qué se dedica tu negocio?</label>
              <textarea id="business-description" rows={2} value={profile.description} onChange={(event) => update("description", event.target.value)} placeholder="Describe brevemente qué hace tu negocio..." maxLength={1200} />
            </div>
            <div className="field business-settings-full">
              <label htmlFor="business-offer">Productos o servicios principales</label>
              <textarea id="business-offer" rows={2} value={profile.products_services} onChange={(event) => update("products_services", event.target.value)} placeholder="Enumera lo que vendes y, si corresponde, tus precios..." maxLength={1600} />
            </div>
            <div className="field business-settings-full">
              <label htmlFor="business-customer">Cliente ideal</label>
              <textarea id="business-customer" rows={2} value={profile.ideal_customer} onChange={(event) => update("ideal_customer", event.target.value)} placeholder="¿A quién quieres captar? Sector, ubicación, necesidades..." maxLength={1200} />
            </div>
            <div className="field business-settings-full">
              <label htmlFor="business-goal">Objetivo comercial</label>
              <textarea id="business-goal" rows={2} value={profile.sales_goal} onChange={(event) => update("sales_goal", event.target.value)} placeholder="Ej. Conseguir 15 clientes nuevos al mes..." maxLength={800} />
            </div>
          </div>
          {selectedSegment && <p className="business-settings-help"><strong>{selectedSegment.label}:</strong> {selectedSegment.help}</p>}
          {error && <div className="notice error" role="alert">{error}</div>}
          {notice && <div className="notice success" role="status">{notice}</div>}
          <div className="business-settings-footer">
            <span>La configuración queda asociada a tu usuario.</span>
            <button type="submit" className="button button-primary" disabled={saving}>
              {saving ? <LoaderCircle size={15} className="assistant-spin" /> : <Save size={15} />}
              {saving ? "Guardando..." : "Guardar configuración"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
