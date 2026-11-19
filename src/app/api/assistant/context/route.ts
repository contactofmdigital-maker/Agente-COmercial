import { NextResponse } from "next/server";
import { getBusinessKnowledgeContext } from "@/features/knowledge/lib/get-business-knowledge-context";

export const dynamic = "force-dynamic";

/**
 * Authenticated, tenant-isolated knowledge context endpoint.
 * The future LLM orchestration layer should call the same server helper
 * rather than accepting arbitrary user_id or sector values from the browser.
 */
export async function GET() {
  const context = await getBusinessKnowledgeContext();

  if (!context) {
    return NextResponse.json(
      { error: "No hay un rubro o una plantilla de conocimiento configurados para esta cuenta." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    business_sector: context.businessSector,
    knowledge_count: context.questions.length,
    knowledge: context.questions,
  });
}
