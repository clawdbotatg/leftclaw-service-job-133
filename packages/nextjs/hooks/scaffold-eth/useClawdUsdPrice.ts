"use client";

import { useReadContract } from "wagmi";

// Uniswap V3 CLAWD/USDC 1% fee pool on Base.
// token0 = USDC (6 decimals), token1 = CLAWD (18 decimals).
const CLAWD_USDC_POOL = "0xb72A6e1091D43e19284050b7132e0646509EBa5d" as const;

const SLOT0_ABI = [
  {
    inputs: [],
    name: "slot0",
    outputs: [
      { internalType: "uint160", name: "sqrtPriceX96", type: "uint160" },
      { internalType: "int24", name: "tick", type: "int24" },
      { internalType: "uint16", name: "observationIndex", type: "uint16" },
      { internalType: "uint16", name: "observationCardinality", type: "uint16" },
      { internalType: "uint16", name: "observationCardinalityNext", type: "uint16" },
      { internalType: "uint8", name: "feeProtocol", type: "uint8" },
      { internalType: "bool", name: "unlocked", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Convert Uniswap V3 sqrtPriceX96 to USD price per CLAWD token.
// pool: token0=USDC (6 dec), token1=CLAWD (18 dec)
// price_raw = (sqrtPriceX96 / 2^96)^2 = raw CLAWD per raw USDC
// price_decimal = price_raw * 10^6 / 10^18 = CLAWD per 1 USDC
// usd_per_clawd = 1 / price_decimal
function sqrtPriceX96ToUsdPerClawd(sqrtPriceX96: bigint): number {
  const Q96 = 2n ** 96n;
  // Work in integer math to avoid BigInt precision loss.
  // price_raw_scaled = (sqrtPriceX96^2 * 10^12) / (Q96^2)
  // where 10^12 = 10^18 / 10^6 (decimal adjustment: CLAWD/USDC ratio)
  // usd_per_clawd = 10^12 / price_raw_scaled
  const numerator = Q96 * Q96 * 10n ** 12n;
  const denominator = sqrtPriceX96 * sqrtPriceX96;
  if (denominator === 0n) return 0;
  const result = Number(numerator / denominator);
  return result;
}

/**
 * Returns the current spot price of CLAWD in USD, read directly from the
 * Uniswap V3 CLAWD/USDC pool on Base. Returns undefined while loading or
 * if the pool read fails. Uses slot0 (DEX spot price, not a TWAP).
 */
export function useClawdUsdPrice(): number | undefined {
  const { data } = useReadContract({
    address: CLAWD_USDC_POOL,
    abi: SLOT0_ABI,
    functionName: "slot0",
    chainId: 8453,
    query: { staleTime: 60_000 },
  });

  if (!data) return undefined;
  const sqrtPriceX96 = data[0];
  if (!sqrtPriceX96 || sqrtPriceX96 === 0n) return undefined;
  const price = sqrtPriceX96ToUsdPerClawd(sqrtPriceX96);
  // Sanity gate: reject obviously invalid prices (< $0.000001 or > $1M per CLAWD)
  if (price < 0.000001 || price > 1_000_000) return undefined;
  return price;
}
