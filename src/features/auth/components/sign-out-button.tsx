"use client";

import { useState } from "react";
import { LogOut, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSignOut() {
    setBusy(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) throw signOutError;

      // Force a fresh route render after Supabase clears the session cookies.
      window.location.assign("/login");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cerrar la sesión. Inténtalo nuevamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="signout-wrap">
      <button
        type="button"
        className="button button-secondary signout-button"
        onClick={handleSignOut}
        disabled={busy}
        aria-label="Cerrar sesión"
      >
        {busy ? (
          <LoaderCircle size={14} className="animate-spin" />
        ) : (
          <LogOut size={14} />
        )}
        {busy ? "Cerrando…" : "Cerrar sesión"}
      </button>
      {error && (
        <span className="signout-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
