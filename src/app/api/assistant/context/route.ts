import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTEXT_LIMIT = 100;

export async function GET() {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "La conexión con Supabase no está configurada." },
        { status: 503 },
      );
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authData.user;

    if (authError || !user) {
      return NextResponse.json(
        { error: "Tu sesión no es válida. Inicia sesión nuevamente." },
        { status: 401 },
      );
    }

    // Todas las consultas están limitadas al usuario autenticado.
    // RLS continúa siendo la segunda barrera de aislamiento de datos.
    const [profileResult, prospectsResult, opportunitiesResult, activitiesResult] =
      await Promise.all([
        supabase
          .from("business_profiles")
          .select(
            "business_name,segment,country,currency,description,products_services,ideal_customer,sales_goal",
          )
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("sales_prospects")
          .select(
            "id,full_name,company_name,email,website,country,notes,status,created_at",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(CONTEXT_LIMIT),
        supabase
          .from("sales_opportunities")
          .select(
            "id,prospect_id,title,description,stage,estimated_value,currency,expected_close_date,created_at",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(CONTEXT_LIMIT),
        supabase
          .from("sales_activities")
          .select(
            "id,prospect_id,opportunity_id,activity_type,title,description,due_at,priority,status,created_at",
          )
          .eq("user_id", user.id)
          .order("due_at", { ascending: true, nullsFirst: false })
          .limit(CONTEXT_LIMIT),
      ]);

    const queryError =
      profileResult.error ||
      prospectsResult.error ||
      opportunitiesResult.error ||
      activitiesResult.error;

    if (queryError) {
      console.error("Commercial context query error:", queryError.message);
      return NextResponse.json(
        {
          error:
            "No se pudo consultar todo el contexto comercial. Verifica las migraciones y permisos de Supabase.",
        },
        { status: 500 },
      );
    }

    const profile = profileResult.data;
    const prospects = prospectsResult.data ?? [];
    const opportunities = opportunitiesResult.data ?? [];
    const activities = activitiesResult.data ?? [];

    const activeOpportunities = opportunities.filter(
      (item) => !["won", "lost"].includes(item.stage),
    );
    const pendingActivities = activities.filter((item) =>
      ["pending", "in_progress"].includes(item.status),
    );
    const overdueActivities = pendingActivities.filter(
      (item) => item.due_at && new Date(item.due_at).getTime() < Date.now(),
    );
    const wonOpportunities = opportunities.filter(
      (item) => item.stage === "won",
    );

    return NextResponse.json({
      generated_at: new Date().toISOString(),
      autonomy: "controlled",
      profile: profile ?? null,
      summary: {
        prospects_loaded: prospects.length,
        opportunities_loaded: opportunities.length,
        active_opportunities: activeOpportunities.length,
        won_opportunities: wonOpportunities.length,
        activities_loaded: activities.length,
        pending_activities: pendingActivities.length,
        overdue_activities: overdueActivities.length,
      },
      data: {
        prospects,
        opportunities,
        activities,
      },
      limits: {
        per_module: CONTEXT_LIMIT,
        note: "El contexto incluye hasta 100 registros recientes por módulo.",
      },
    });
  } catch (error) {
    console.error(
      "Commercial context route error:",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json(
      { error: "Ocurrió un problema al construir el contexto comercial." },
      { status: 500 },
    );
  }
}
