export function money(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

export function signedMoney(n: number): string {
  if (Math.abs(n) < 0.005) return "$0.00";
  return `${n > 0 ? "+" : "-"}$${Math.abs(n).toFixed(2)}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
