export function clampNumber(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function toNumber(x: unknown): number {
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    const v = Number(x.replace(/[^0-9.+-]/g, ""));
    return Number.isFinite(v) ? v : NaN;
  }
  return NaN;
}

export function fmtMoney(n: number): string {
  if (!Number.isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function fmtNumber(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
}

export function fmtPercent(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "0%";
  return `${fmtNumber(n, digits)}%`;
}
