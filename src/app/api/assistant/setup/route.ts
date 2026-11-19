import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const setupSchema = z.object({
  businessSector: z.enum([
    "digital_services",
    "furniture",
    "real_estate",
    "fast_food",
    "barber_beauty",
    "professional_services",
  ]),
}).strict();

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "La solicitud no contiene JSON válido." }, { status: 400 });
  }

  const parsed = setupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Selecciona un rubro válido." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase no está configurado en el servidor." }, { status: 503 });
    }

    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      return NextResponse.json({ error: "Tu sesión expiró. Inicia sesión nuevamente." }, { status: 401 });
    }

    const { error } = await supabase.rpc("set_sales_business_sector", {
      selected_sector: parsed.data.businessSector,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message.includes("ya tiene un rubro")
            ? "Esta cuenta ya tiene un rubro configurado. Actualiza el dashboard."
            : "No se pudo guardar el rubro. Comprueba que ejecutaste la migración 0004 en Supabase." },
        { status: 409 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "No se pudo configurar el rubro de esta cuenta." }, { status: 500 });
  }
}
