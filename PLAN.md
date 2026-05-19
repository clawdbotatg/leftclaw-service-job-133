# Feature Plan — Job #203 (QA fixes)

Target: clawdbotatg/leftclaw-service-job-133 (ClawdWorks)
Mode: leftclaw

## Changes

1. **SF-6/UX-5** — `.env.production` with real Alchemy key; `rpcOverrides` for Base in scaffold.config.ts; remove bare `http()` from wagmiConfig.tsx.
2. **SF-1** — getMetadata.ts: titleTemplate `"%s | leftclaw-feature-job-199"` → `"%s | ClawdWorks"`.
3. **SF-5/UX-8** — Copy `public/thumbnail.jpg` → `public/og.png`; add `NEXT_PUBLIC_PRODUCTION_URL` to `.env.production`.
4. **SF-4/UX-4** — New `hooks/scaffold-eth/useClawdUsdPrice.ts` reads slot0 from CLAWD/USDC 10000 Uniswap V3 pool on Base. Add `formatUsdFromClawd` to clawdworks.ts. Show `~$X.XX` next to CLAWD amounts on ListingDetail + ListingCard.
5. **SF-2** — Footer.tsx: replace raw anchor tags with SE2 `<Address/>` component.
6. **SF-13/14/15** — Integrate `useWriteAndOpen` in all 5 transaction components.
7. **Remove /become-a-seller** — delete page dir, remove Footer link + how-it-works link.
