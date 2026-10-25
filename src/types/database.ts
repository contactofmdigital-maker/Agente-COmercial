export type ProspectStatus = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
export type ProspectSource = "manual" | "csv" | "other";
export type ProspectInput = {
  full_name: string;
  company_name?: string | null;
  email?: string | null;
  website?: string | null;
  country?: string | null;
  notes?: string | null;
};
