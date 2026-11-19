import { createClient } from "@/lib/supabase/server";
import type { BusinessSector } from "./business-templates";

export type BusinessKnowledgeItem = {
  question_order: number;
  question: string;
  answer: string;
};

export type BusinessKnowledgeContext = {
  businessSector: BusinessSector;
  questions: BusinessKnowledgeItem[];
};

/**
 * Returns only the authenticated user's sector and its private 15-item snapshot.
 * Use this server-side result as the grounding context for the commercial agent.
 */
export async function getBusinessKnowledgeContext(): Promise<BusinessKnowledgeContext | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return null;

  const [{ data: profile, error: profileError }, { data: questions, error: questionsError }] =
    await Promise.all([
      supabase
        .from("sales_business_profiles")
        .select("business_sector")
        .eq("user_id", auth.user.id)
        .maybeSingle(),
      supabase
        .from("sales_business_knowledge")
        .select("question_order,question,answer")
        .eq("user_id", auth.user.id)
        .order("question_order", { ascending: true }),
    ]);

  if (profileError || questionsError || !profile) return null;
  if (!["digital_services", "furniture", "real_estate", "fast_food", "barber_beauty", "professional_services"].includes(profile.business_sector)) return null;

  return {
    businessSector: profile.business_sector as BusinessSector,
    questions: (questions ?? []) as BusinessKnowledgeItem[],
  };
}
