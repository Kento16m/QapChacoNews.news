const PROFILE_COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#F59E0B",
  "#10B981",
  "#F97316",
  "#EC4899",
  "#14B8A6",
  "#6366F1",
  "#EF4444",
  "#84CC16",
] as const;

export function getProfileColor(seed?: string | null, fallback = PROFILE_COLORS[0]): string {
  const value = (seed ?? "").trim();
  if (!value) return fallback;

  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }

  const safeHash = Math.abs(hash);
  const selectedIndex = safeHash % PROFILE_COLORS.length;
  return PROFILE_COLORS[selectedIndex] ?? fallback;
}

export function getProfileGradient(seed?: string | null): { from: string; to: string } {
  const base = getProfileColor(seed);
  return {
    from: base,
    to: `${base}CC`,
  };
}
