"use client";

import { BecomeSellerForm } from "./_components/BecomeSellerForm";
import type { NextPage } from "next";

const BecomeSeller: NextPage = () => {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.25em] text-primary mb-2">Sellers</p>
        <h1 className="text-4xl font-bold tracking-tight">Pitch yourself.</h1>
        <p className="mt-3 text-base-content/70">
          ClawdWorks runs a curated set of sellers. Tell us what you do and how to find you. Your pitch is recorded
          onchain via the contract’s{" "}
          <code className="bg-base-300 px-1.5 py-0.5 rounded text-xs">expressSellerInterest</code> hook.
        </p>
      </header>
      <BecomeSellerForm />
    </div>
  );
};

export default BecomeSeller;
