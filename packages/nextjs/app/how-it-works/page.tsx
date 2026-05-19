import Link from "next/link";
import type { NextPage } from "next";

const HowItWorks: NextPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <header className="mb-10">
        <p className="text-[11px] uppercase tracking-[0.25em] text-primary mb-2">Documentation</p>
        <h1 className="text-4xl font-bold tracking-tight">How ClawdWorks works</h1>
        <p className="mt-3 text-base-content/70">
          A CLAWD-native marketplace built around three principles: instant payment, escrowed delivery, and a
          deflationary loop.
        </p>
      </header>

      <Section title="How buying works" idx="01">
        <Step n={1} title="Pick a listing">
          Every listing shows a fixed CLAWD price, an estimated delivery time, and a queue indicator if the seller is at
          capacity.
        </Step>
        <Step n={2} title="Approve & purchase">
          You approve CLAWD spending once for the exact listing price, then purchase. The contract pulls funds in a
          single transaction and opens an escrowed job.
        </Step>
        <Step n={3} title="Receive delivery">
          The seller marks the job delivered with a reference to your deliverable. You have 7 days to confirm receipt.
          If you don&apos;t, the seller can claim funds via timeout.
        </Step>
      </Section>

      <Section title="Paying with CLAWD" idx="02">
        <p>
          ClawdWorks is denominated in CLAWD — no stablecoin or ETH leg. Prices are set as raw CLAWD amounts (18
          decimals) and are immutable for the lifetime of a listing.
        </p>
      </Section>

      <Section title="The 7-day window" idx="03">
        <p>
          Once a seller marks a job delivered, the buyer has 7 days to confirm receipt (which releases escrow). If the
          window elapses without confirmation, the seller can claim the funds via{" "}
          <code className="bg-base-300 px-1 py-0.5 rounded text-xs">claimTimeout</code>.
        </p>
      </Section>

      <Section title="Buyer & seller protections" idx="04">
        <Step n={1} title="Buyer cancel (before delivery)">
          A buyer can cancel any job that has not been marked delivered yet. Funds return instantly — no escrow lock-in.
        </Step>
        <Step n={2} title="Seller refund anytime">
          A seller can voluntarily refund the buyer at any point — whether the job is still in escrow or already
          delivered. No admin needed. Useful if the work cannot be completed.
        </Step>
        <Step n={3} title="No disputes needed">
          The contract is ownerless — there is no arbitrator. Parties resolve issues directly via cancel or voluntary
          refund. This keeps the contract simple and trustless.
        </Step>
      </Section>

      <Section title="Privacy & delivery" idx="05">
        <p>
          Buyer notes and seller deliverables are stored as IPFS hashes — the contract only references them. What you
          put behind those hashes is up to you (encrypted blobs, public URLs, plain text). The chain stores the
          pointers; the content is yours.
        </p>
      </Section>

      <Section title="Where the money goes" idx="06">
        <div className="grid sm:grid-cols-3 gap-3 mt-2">
          <Money pct="80%" label="To the seller" tone="text-primary" />
          <Money pct="10%" label="Burned forever" tone="text-warning" />
          <Money pct="10%" label="Ecosystem treasury" tone="text-secondary" />
        </div>
        <p className="mt-4">
          Every job creates a small permanent burn of CLAWD supply and funds a community-controlled treasury, giving the
          token a steady deflationary loop.
        </p>
      </Section>

      <Section title="FAQ" idx="07">
        <Faq q="Is this custodial?">
          No. CLAWD goes from your wallet directly into the ClawdWorks escrow contract on Base. No third party can move
          it. There is no admin, no owner, no upgrade key.
        </Faq>
        <Faq q="Who can sell on ClawdWorks?">
          Anyone. The marketplace is fully open — connect your wallet, create a listing, and start selling. No approval
          or whitelist required.
        </Faq>
        <Faq q="Can I cancel a job after paying?">
          Yes — as long as the seller has not marked delivery yet, the buyer can cancel at any time and receive a full
          refund. Once the seller marks delivery, you confirm or wait for the 7-day timeout.
        </Faq>
        <Faq q="What if the seller cannot complete the work?">
          The seller can voluntarily refund the buyer at any point — before or after marking delivery. No admin or
          dispute process needed. The refund goes back in full.
        </Faq>
        <Faq q="What happens after delivery — is there a dispute system?">
          No formal dispute system. The contract is ownerless — no arbitrator exists. Buyer and seller resolve issues
          directly: the buyer confirms receipt, or the seller refunds. The 7-day seller timeout is the final backstop if
          the buyer goes silent.
        </Faq>
        <Faq q="Can I leave a review?">
          Yes — both sides can leave a rating after a job completes. The buyer rates the seller, and the seller rates
          the buyer. Each rating is one-shot and recorded permanently onchain.
        </Faq>
        <Faq q="What does the description field support?">
          Plain text or an IPFS hash. Plain text is visible directly onchain — good for short descriptions. An IPFS hash
          lets you link to richer content (markdown, images) stored offchain. Both are valid.
        </Faq>
        <Faq q="What chain is this on?">Base mainnet (chain id 8453).</Faq>
        <Faq q="Where are the contracts?">
          The marketplace contract is fully immutable and ownerless — no admin can pause or modify it. Source is
          available on{" "}
          <a
            href="https://github.com/clawdbotatg/leftclaw-service-job-133"
            target="_blank"
            rel="noreferrer"
            className="link"
          >
            GitHub
          </a>
          .
        </Faq>
      </Section>

      <div className="mt-12 cw-strip rounded-lg p-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold">Ready to move?</p>
          <p className="text-sm text-base-content/70">Browse what’s on sale or pitch yourself as a seller.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="btn btn-primary btn-sm">
            Browse
          </Link>
        </div>
      </div>
    </div>
  );
};

const Section = ({ idx, title, children }: { idx: string; title: string; children: React.ReactNode }) => (
  <section className="cw-card p-6 mb-4">
    <div className="flex items-baseline gap-3 mb-3">
      <span className="text-[11px] tracking-widest text-base-content/50 font-mono">{idx}</span>
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
    </div>
    <div className="text-base-content/80 space-y-3 text-sm leading-relaxed">{children}</div>
  </section>
);

const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <div className="flex gap-3">
    <span className="size-6 shrink-0 rounded-full bg-primary/15 text-primary text-xs font-bold inline-flex items-center justify-center mt-0.5">
      {n}
    </span>
    <div>
      <p className="font-semibold text-base-content">{title}</p>
      <p>{children}</p>
    </div>
  </div>
);

const Money = ({ pct, label, tone }: { pct: string; label: string; tone: string }) => (
  <div className="cw-card p-4 text-center">
    <p className={`text-2xl font-bold ${tone}`}>{pct}</p>
    <p className="text-xs uppercase tracking-widest text-base-content/60 mt-1">{label}</p>
  </div>
);

const Faq = ({ q, children }: { q: string; children: React.ReactNode }) => (
  <details className="border border-base-300 rounded p-3 group">
    <summary className="cursor-pointer font-medium text-base-content list-none flex justify-between items-center">
      <span>{q}</span>
      <span className="text-base-content/40 group-open:rotate-45 transition-transform">+</span>
    </summary>
    <p className="mt-2 text-base-content/70">{children}</p>
  </details>
);

export default HowItWorks;
