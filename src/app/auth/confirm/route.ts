
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const requestedNext = url.searchParams.get("next");

  // Solo permitir destinos internos de la aplicación.
  const nextPath =
    requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/";

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL("/login?error=missing-token", url.origin)
    );
  }

  try {
    const supabase = await createClient();

    // Evita acceder a auth si el cliente no pudo inicializarse.
    if (!supabase) {
      return NextResponse.redirect(
        new URL("/login?error=supabase-not-configured", url.origin)
      );
    }

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) {
      return NextResponse.redirect(
        new URL("/login?error=confirmation-failed", url.origin)
      );
    }

    return NextResponse.redirect(new URL(nextPath, url.origin));
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=confirmation-failed", url.origin)
    );
  }
}
