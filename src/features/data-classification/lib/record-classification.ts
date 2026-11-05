/**
 * Explicitly identified demo records from the CRM data audit.
 * Matching by immutable IDs avoids classifying a real contact merely because
 * its name, email, company or notes resemble sample data.
 */
export const DEMO_PROSPECT_IDS = new Set<string>([
  "b1b0bafd-c2de-41a0-9872-c06711e2d2a7",
  "7c249337-0b4e-4e51-815f-f260994561b4",
  "ee62cf9c-2837-4f8a-8f77-8dd5d3a35474",
  "f0ff2f3f-9d8f-4dc4-a7e8-e73c91ead0d2",
  "ff05fe02-b4b5-493a-a918-61d9b1dc51c9",
]);

export function isDemoProspectId(id: string | null | undefined): boolean {
  return Boolean(id && DEMO_PROSPECT_IDS.has(id));
}

export function filterRealProspects<T extends { id: string }>(items: T[]): T[] {
  return items.filter((item) => !isDemoProspectId(item.id));
}

export function filterRealOpportunities<
  T extends { prospect_id: string },
>(items: T[]): T[] {
  return items.filter((item) => !isDemoProspectId(item.prospect_id));
}

export function filterRealActivities<
  T extends { prospect_id: string | null; opportunity_id: string | null },
>(
  items: T[],
  demoOpportunityIds: ReadonlySet<string> = new Set<string>(),
): T[] {
  return items.filter(
    (item) =>
      !isDemoProspectId(item.prospect_id) &&
      !(item.opportunity_id && demoOpportunityIds.has(item.opportunity_id)),
  );
}
