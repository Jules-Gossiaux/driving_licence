const dateTimeFormatter = new Intl.DateTimeFormat("fr-BE", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }
  return dateTimeFormatter.format(new Date(value));
}

export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds} s`;
  }

  return `${minutes} min ${String(seconds).padStart(2, "0")} s`;
}

export function formatScore(value: number, total: number): string {
  return `${value}/${total}`;
}

export function modeLabel(mode: "practice" | "exam" | "review"): string {
  switch (mode) {
    case "exam":
      return "Examen blanc";
    case "review":
      return "Révision";
    default:
      return "Entraînement";
  }
}
