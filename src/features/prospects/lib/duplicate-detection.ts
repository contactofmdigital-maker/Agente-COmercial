export type DuplicateCandidate = {
  id?: string;
  full_name: string | null;
  company_name?: string | null;
  email?: string | null;
  website?: string | null;
};

export type DuplicateMatch = {
  prospect: DuplicateCandidate;
  kind: "confirmed" | "possible";
  reasons: string[];
};

const normalize = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9@.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeWebsite = (value: string | null | undefined) =>
  normalize(value)
    .replace(/^https?:/, "")
    .replace(/^\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");

export const normalizeProspectEmail = (email: string | null | undefined) =>
  normalize(email);

export function detectProspectDuplicates(
  candidate: DuplicateCandidate,
  existing: DuplicateCandidate[],
): DuplicateMatch[] {
  const email = normalizeProspectEmail(candidate.email);
  const name = normalize(candidate.full_name);
  const company = normalize(candidate.company_name);
  const website = normalizeWebsite(candidate.website);

  if (!email && !name) return [];

  return existing
    .filter((prospect) => !candidate.id || prospect.id !== candidate.id)
    .map((prospect): DuplicateMatch | null => {
      const existingEmail = normalizeProspectEmail(prospect.email);
      const existingName = normalize(prospect.full_name);
      const existingCompany = normalize(prospect.company_name);
      const existingWebsite = normalizeWebsite(prospect.website);

      if (email && existingEmail && email === existingEmail) {
        return {
          prospect,
          kind: "confirmed",
          reasons: ["El correo electrónico coincide exactamente."],
        };
      }

      if (name && existingName && name === existingName) {
        const sameCompany = Boolean(company && existingCompany && company === existingCompany);
        const sameWebsite = Boolean(website && existingWebsite && website === existingWebsite);
        return {
          prospect,
          kind: "possible",
          reasons: [
            "El nombre del contacto coincide.",
            ...(sameCompany ? ["La empresa también coincide."] : []),
            ...(sameWebsite ? ["El sitio web también coincide."] : []),
          ],
        };
      }

      return null;
    })
    .filter((match): match is DuplicateMatch => match !== null)
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "confirmed" ? -1 : 1));
}
