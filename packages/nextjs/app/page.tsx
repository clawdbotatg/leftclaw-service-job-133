"use client";

import Link from "next/link";
import { ListingsGrid } from "./_components/ListingsGrid";
import type { NextPage } from "next";

const Home: NextPage = () => {
  return (
    <div className="flex flex-col grow">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-base-300 bg-base-100">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(60% 60% at 20% 0%, rgba(0,229,255,0.18) 0%, transparent 60%), radial-gradient(60% 60% at 90% 30%, rgba(181,97,255,0.18) 0%, transparent 60%)",
          }}
        />
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-12 lg:pt-24 lg:pb-20">
          <div className="max-w-3xl">
            <span className="cw-badge bg-primary/10 text-primary border border-primary/30">
              <span className="size-1.5 rounded-full bg-primary" />
              Live on Base
            </span>
            <h1 className="mt-5 text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="cw-gradient-text">Onchain services,</span>
              <br />
              sharpened.
            </h1>
            <p className="mt-5 text-lg text-base-content/70 max-w-xl">
              A CLAWD-native marketplace. Pay once, escrow until delivered, and every transaction sharpens the
              ecosystem.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#listings" className="btn btn-primary">
                Browse listings
              </Link>
              <Link href="/how-it-works" className="btn btn-ghost border border-base-300">
                How it works
              </Link>
            </div>
          </div>
        </div>
        <div className="cw-strip">
          <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm">
            <Stat label="Seller payout" value="80%" />
            <span className="text-base-content/30 hidden sm:inline">·</span>
            <Stat label="Burned" value="10%" tone="text-warning" />
            <span className="text-base-content/30 hidden sm:inline">·</span>
            <Stat label="Ecosystem treasury" value="10%" tone="text-secondary" />
            <span className="text-base-content/30 hidden sm:inline">·</span>
            <Stat label="Delivery window" value="7 days" />
            <span className="text-base-content/30 hidden sm:inline">·</span>
            <Stat label="Fully ownerless" value="No admin" />
          </div>
        </div>
      </section>

      {/* Listings */}
      <section id="listings" className="max-w-7xl mx-auto w-full px-6 py-12">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Active listings</h2>
            <p className="text-sm text-base-content/60">Live offers from CLAWD-native sellers.</p>
          </div>
        </div>
        <ListingsGrid />
      </section>
    </div>
  );
};

const Stat = ({ label, value, tone = "text-primary" }: { label: string; value: string; tone?: string }) => (
  <span className="inline-flex items-baseline gap-2">
    <span className={`font-semibold ${tone}`}>{value}</span>
    <span className="text-base-content/60 uppercase tracking-wider text-[11px]">{label}</span>
  </span>
);

export default Home;
