import { formatUnits, parseUnits } from "viem";

export const CLAWD_DECIMALS = 18;

export const JOB_STATUS = {
  PAID: 0,
  DELIVERED: 1,
  COMPLETED: 2,
  REFUNDED: 3,
} as const;

export const JOB_STATUS_LABEL: Record<number, string> = {
  0: "Paid",
  1: "Delivered",
  2: "Completed",
  3: "Refunded",
};

export const JOB_STATUS_TONE: Record<number, string> = {
  0: "bg-info/15 text-info border-info/30",
  1: "bg-warning/15 text-warning border-warning/30",
  2: "bg-success/15 text-success border-success/30",
  3: "bg-base-300 text-base-content/60 border-base-300",
};

export const DELIVERY_TIMEOUT_DAYS = 7;

/**
 * Format a uint256 CLAWD amount (18 decimals) into a clean compact string
 * such as "500K CLAWD" or "1.25M CLAWD".
 */
export function formatClawd(amount: bigint | undefined, opts: { withSymbol?: boolean } = {}): string {
  const { withSymbol = true } = opts;
  if (amount === undefined || amount === null) return withSymbol ? "— CLAWD" : "—";

  const wholeStr = formatUnits(amount, CLAWD_DECIMALS);
  const num = Number(wholeStr);
  if (!Number.isFinite(num)) return withSymbol ? `${wholeStr} CLAWD` : wholeStr;

  let body: string;
  if (num === 0) body = "0";
  else if (num < 0.01) body = "<0.01";
  else if (num < 1_000) body = trim(num);
  else if (num < 1_000_000) body = `${trim(num / 1_000)}K`;
  else if (num < 1_000_000_000) body = `${trim(num / 1_000_000)}M`;
  else body = `${trim(num / 1_000_000_000)}B`;

  return withSymbol ? `${body} CLAWD` : body;
}

function trim(n: number): string {
  if (n >= 100) return n.toFixed(0);
  if (n >= 10) return n.toFixed(1).replace(/\.0$/, "");
  return n.toFixed(2).replace(/\.?0+$/, "");
}

export function parseClawd(input: string): bigint {
  return parseUnits(input || "0", CLAWD_DECIMALS);
}

/**
 * Returns a string like "3d 4h" describing time remaining. Negative deltas
 * return null so the caller can render a different state (e.g. "expired").
 */
export function formatRemaining(seconds: number): string | null {
  if (seconds <= 0) return null;
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Truncate a long IPFS hash or arbitrary string for display.
 */
export function shortHash(s?: string): string {
  if (!s) return "—";
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

/**
 * Given a CLAWD amount (bigint, 18 decimals) and a USD price per CLAWD,
 * returns a formatted "~$X.XX" string or null if price is unavailable.
 */
export function formatUsdFromClawd(amount: bigint | undefined, usdPerClawd: number | undefined): string | null {
  if (amount === undefined || usdPerClawd === undefined || usdPerClawd === 0) return null;
  const clawdNum = Number(formatUnits(amount, CLAWD_DECIMALS));
  const usd = clawdNum * usdPerClawd;
  if (!Number.isFinite(usd) || usd < 0) return null;
  if (usd < 0.01) return "~<$0.01";
  if (usd < 10) return `~$${usd.toFixed(2)}`;
  if (usd < 1_000) return `~$${usd.toFixed(0)}`;
  if (usd < 1_000_000) return `~$${(usd / 1_000).toFixed(1)}K`;
  return `~$${(usd / 1_000_000).toFixed(2)}M`;
}
