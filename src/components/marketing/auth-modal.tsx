"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, Eye, EyeOff, LoaderCircle, ShieldCheck, X } from "lucide-react";

type Mode = "login" | "register" | "recover";

export function AuthTrigger({ children, className, ariaLabel }: { children: React.ReactNode; className: string; ariaLabel?: string }) {
  return <button type="button" className={className} aria-label={ariaLabel} onClick={() => window.dispatchEvent(new Event("upscale:open-auth"))}>{children}</button>;
}

export function AuthModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const show = () => { setOpen(true); setMode("login"); setError(""); setSuccess(""); };
    window.addEventListener("upscale:open-auth", show);
    return () => window.removeEventListener("upscale:open-auth", show);
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", closeOnEscape); document.body.style.overflow = ""; };
  }, [open]);

  function changeMode(next: Mode) { setMode(next); setError(""); setSuccess(""); }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");
    if (mode !== "recover" && password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (mode === "register" && password !== confirmPassword) { setError("Las contraseñas no coinciden."); return; }
    setBusy(true);
    try {
      const supabase = createClient();
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        setOpen(false); router.replace("/dashboard"); router.refresh(); return;
      }
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin + "/" } });
        if (error) throw error;
        if (data.session) { setOpen(false); router.replace("/dashboard"); router.refresh(); return; }
        setSuccess("Cuenta creada. Revisa tu correo si necesitas confirmar el registro."); setMode("login"); setPassword(""); setConfirmPassword(""); return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + "/" });
      if (error) throw error;
      setSuccess("Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo completar la operación. Inténtalo de nuevo.");
    } finally { setBusy(false); }
  }

  if (!open) return null;
  const title = mode === "login" ? "Bienvenido de nuevo" : mode === "register" ? "Crea tu espacio comercial" : "Recupera tu acceso";
  const subtitle = mode === "login" ? "Inicia sesión para entrar a tu dashboard." : mode === "register" ? "Activa tu espacio en UpScale IA." : "Te enviaremos instrucciones a tu correo.";

  return (
    <div className="auth-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <button className="auth-modal-close" type="button" aria-label="Cerrar" onClick={() => setOpen(false)}><X size={19} /></button>
        <div className="auth-modal-brand"><span className="auth-modal-brand-mark">U</span><span><b>UpScale IA</b><small>INTELIGENCIA COMERCIAL</small></span></div>
        <span className="auth-modal-eyebrow">ACCESO A TU PLATAFORMA</span>
        <h2 id="auth-modal-title">{title}</h2><p className="auth-modal-subtitle">{subtitle}</p>
        {error && <div className="auth-modal-message is-error" role="alert">{error}</div>}
        {success && <div className="auth-modal-message is-success" role="status">{success}</div>}
        <form className="auth-modal-form" onSubmit={handleSubmit}>
          <label htmlFor="auth-email">Correo electrónico</label>
          <input id="auth-email" type="email" autoComplete="email" placeholder="nombre@empresa.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          {mode !== "recover" && <>
            <label htmlFor="auth-password">Contraseña</label>
            <div className="auth-modal-password"><input id="auth-password" type={showPassword ? "text" : "password"} autoComplete={mode === "register" ? "new-password" : "current-password"} placeholder="Mínimo 8 caracteres" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          </>}
          {mode === "register" && <><label htmlFor="auth-confirm">Confirmar contraseña</label><input id="auth-confirm" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Repite tu contraseña" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required /></>}
          {mode === "login" && <button className="auth-modal-forgot" type="button" onClick={() => changeMode("recover")}>¿Olvidaste tu contraseña?</button>}
          <button className="auth-modal-submit" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="animate-spin" size={17} /> Procesando...</> : <>{mode === "login" ? "Iniciar sesión" : mode === "register" ? "Crear cuenta" : "Enviar instrucciones"} <ArrowRight size={17} /></>}</button>
        </form>
        <div className="auth-modal-switch">{mode === "login" ? <>¿No tienes cuenta? <button type="button" onClick={() => changeMode("register")}>Crear cuenta</button></> : mode === "register" ? <>¿Ya tienes cuenta? <button type="button" onClick={() => changeMode("login")}>Iniciar sesión</button></> : <button type="button" onClick={() => changeMode("login")}>Volver al inicio de sesión</button>}</div>
        <div className="auth-modal-security"><ShieldCheck size={17} /><span>Acceso protegido mediante Supabase Auth</span></div>
      </section>
    </div>
  );
}
