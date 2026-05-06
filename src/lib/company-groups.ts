export type CompanyGroup = "all" | "ZB" | "NM" | "OTHER";

type ClassifiableRecord = {
  keterangan?: string | null;
  jenisBiaya?: string | null;
  klaim?: string | null;
  sumberBiaya?: string | null;
};

export const COMPANY_GROUP_OPTIONS: Array<{
  value: CompanyGroup;
  label: string;
}> = [
  { value: "all", label: "Semua Grup" },
  { value: "ZB", label: "ZB / Zimmer Biomet" },
  { value: "NM", label: "NM / Normed" },
  { value: "OTHER", label: "Lainnya" },
];

export function detectCompanyGroup(input: ClassifiableRecord | string): Exclude<CompanyGroup, "all"> {
  const text =
    typeof input === "string"
      ? input
      : [
          input.keterangan,
          input.jenisBiaya,
          input.klaim,
          input.sumberBiaya,
        ]
          .filter(Boolean)
          .join(" ");

  const normalized = text.toLowerCase();

  if (/\bzb\b/.test(normalized) || /\bzimmer\b/.test(normalized) || /\bbiomet\b/.test(normalized)) {
    return "ZB";
  }

  if (/\bnm\b/.test(normalized) || /\bnormed\b/.test(normalized)) {
    return "NM";
  }

  return "OTHER";
}

export function matchesCompanyGroup(
  item: ClassifiableRecord | string,
  selectedGroup: CompanyGroup
) {
  return selectedGroup === "all" || detectCompanyGroup(item) === selectedGroup;
}

export function companyGroupLabel(group: CompanyGroup) {
  return COMPANY_GROUP_OPTIONS.find((option) => option.value === group)?.label ?? "Lainnya";
}
