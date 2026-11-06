import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidActivityDueDate } from "@/features/assistant/lib/prioritization";
import { filterRealActivities, filterRealOpportunities, filterRealProspects } from "@/features/data-classification/lib/record-classification";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTEXT_PAGE_SIZE = 500;
const CONTEXT_RATE_LIMIT = 60;

async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
): Promise<T[]> {
  const records: T[] = [];
  for (let from = 0; ; from += CONTEXT_PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + CONTEXT_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    records.push(...(data ?? []));
    if (!data || data.length < CONTEXT_PAGE_SIZE) break;
  }
  return records;
}

function privateJson(body: unknown, status = 200, headers?: HeadersInit) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Cache-Control", "private, no-store, max-age=0");
  responseHeaders.set("Vary", "Cookie");
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  return NextResponse.json(body, { status, headers: responseHeaders });
}

export async function GET() {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return privateJson(
        { error: "La conexión con Supabase no está configurada." },
        503,
      );
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authData.user;

    if (authError || !user) {
      return privateJson(
        { error: "Tu sesión no es válida. Inicia sesión nuevamente." },
        401,
      );
    }

    const rateLimit = checkRateLimit(`assistant-context:${user.id}`, CONTEXT_RATE_LIMIT, 60_000);
    if (!rateLimit.allowed) {
      return privateJson(
        { error: "Se alcanzó el límite temporal de consultas al contexto comercial. Inténtalo nuevamente en un momento." },
        429,
        { "Retry-After": String(rateLimit.retryAfterSeconds) },
      );
    }

    // Todas las consultas están limitadas al usuario autenticado.
    // RLS continúa siendo la segunda barrera de aislamiento de datos.
    const [profileResult, prospectRows, opportunityRows, activityRows] =
      await Promise.all([
        supabase
          .from("business_profiles")
          .select(
            "business_name,segment,country,currency,description,products_services,ideal_customer,sales_goal",
          )
          .eq("user_id", user.id)
          .maybeSingle(),
        fetchAllPages((from, to) =>
          supabase
            .from("sales_prospects")
            .select("id,full_name,company_name,email,website,country,notes,status,created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .order("id", { ascending: true })
            .range(from, to),
        ),
        fetchAllPages((from, to) =>
          supabase
            .from("sales_opportunities")
            .select("id,prospect_id,title,description,stage,estimated_value,currency,expected_close_date,created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .order("id", { ascending: true })
            .range(from, to),
        ),
        fetchAllPages((from, to) =>
          supabase
            .from("sales_activities")
            .select("id,prospect_id,opportunity_id,activity_type,title,description,due_at,priority,status,created_at,completed_at")
            .eq("user_id", user.id)
            .order("due_at", { ascending: true, nullsFirst: false })
            .order("id", { ascending: true })
            .range(from, to),
        ),
      ]);

    if (profileResult.error) {
      console.error("Commercial profile query error:", profileResult.error.message);
      return privateJson(
        { error: "No se pudo consultar el perfil comercial. Verifica las migraciones y permisos de Supabase." },
        500,
      );
    }

    const profile = profileResult.data;
    const prospects = filterRealProspects(prospectRows);
    const opportunities = filterRealOpportunities(opportunityRows);
    const demoOpportunityIds = new Set(
      opportunityRows
        .filter((item) => !opportunities.some((real) => real.id === item.id))
        .map((item) => item.id),
    );
    const activities = filterRealActivities(activityRows, demoOpportunityIds);

    const normalizeCrmValue = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();
    const activeOpportunityStages = new Set(["qualification", "diagnosis", "proposal", "negotiation"]);
    const closedOpportunityStages = new Set(["won", "lost"]);
    const activeOpportunities = opportunities.filter((item) => activeOpportunityStages.has(normalizeCrmValue(item.stage)));
    const unknownStageOpportunities = opportunities.filter((item) =>
      !activeOpportunityStages.has(normalizeCrmValue(item.stage)) &&
      !closedOpportunityStages.has(normalizeCrmValue(item.stage))
    );
    const pendingActivities = activities.filter((item) => ["pending", "in_progress"].includes(normalizeCrmValue(item.status)));
    const invalidDateActivities = pendingActivities.filter(
      (item) => item.due_at !== null && !isValidActivityDueDate(item.due_at, item.created_at),
    );
    const invalidDateIds = new Set(invalidDateActivities.map((item) => item.id));
    const overdueActivities = pendingActivities.filter(
      (item) =>
        item.due_at !== null &&
        !invalidDateIds.has(item.id) &&
        new Date(item.due_at).getTime() < Date.now(),
    );
    const wonOpportunities = opportunities.filter((item) => normalizeCrmValue(item.stage) === "won");

    return privateJson({
      generated_at: new Date().toISOString(),
      autonomy: "controlled",
      profile: profile ?? null,
      summary: {
        prospects_loaded: prospects.length,
        opportunities_loaded: opportunities.length,
        active_opportunities: activeOpportunities.length,
        won_opportunities: wonOpportunities.length,
        unknown_stage_opportunities: unknownStageOpportunities.length,
        activities_loaded: activities.length,
        pending_activities: pendingActivities.length,
        overdue_activities: overdueActivities.length,
        invalid_date_activities: invalidDateActivities.length,
      },
      data: {
        prospects,
        opportunities,
        activities,
      },
      limits: {
        complete: true,
        page_size: CONTEXT_PAGE_SIZE,
        note: "Se recuperan todos los registros de prospectos, oportunidades y actividades en páginas de 500, con orden estable. Los conteos corresponden al conjunto completo visible para el usuario autenticado y las políticas RLS.",
      },
    });
  } catch (error) {
    console.error(
      "Commercial context route error:",
      error instanceof Error ? error.message : "unknown",
    );
    return privateJson(
      { error: "Ocurrió un problema al construir el contexto comercial." },
      500,
    );
  }
}
