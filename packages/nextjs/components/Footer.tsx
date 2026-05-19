"use client";

import React from "react";
import Link from "next/link";
import { Address } from "@scaffold-ui/components";

const CLAWDWORKS_ADDRESS = "0x90c14763fB2A372F186cBb3bFe8A1eD81f90623E" as const;
const CLAWD_ADDRESS = "0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07" as const;

/**
 * Site footer
 */
export const Footer = () => {
  return (
    <footer className="border-t border-base-300 bg-base-100 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-10 grid gap-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 text-primary">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <path
                d="M8 4 L20 20 M12 4 L22 22 M16 4 L24 24"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <span className="font-bold text-base-content tracking-tight">ClawdWorks</span>
          </div>
          <p className="mt-3 text-sm text-base-content/70 max-w-md">Onchain services, sharpened.</p>
          <p className="mt-1 text-xs text-base-content/50 max-w-md">
            80% to seller · 10% burned · 10% to CLAWD ecosystem treasury.
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-base-content/50 mb-3">Marketplace</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/" className="link link-hover">
                Browse listings
              </Link>
            </li>
            <li>
              <Link href="/how-it-works" className="link link-hover">
                How it works
              </Link>
            </li>
            <li>
              <Link href="/jobs" className="link link-hover">
                My jobs
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-base-content/50 mb-3">Onchain</p>
          <ul className="space-y-2">
            <li className="text-xs text-base-content/60">
              <span className="block text-[10px] uppercase tracking-widest text-base-content/50 mb-0.5">
                ClawdWorks
              </span>
              <Address address={CLAWDWORKS_ADDRESS} format="short" />
            </li>
            <li className="text-xs text-base-content/60">
              <span className="block text-[10px] uppercase tracking-widest text-base-content/50 mb-0.5">
                CLAWD token
              </span>
              <Address address={CLAWD_ADDRESS} format="short" />
            </li>
            <li className="text-xs text-base-content/50 pt-2">Built on Base.</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-base-300">
        <div className="max-w-7xl mx-auto px-6 py-4 text-xs text-base-content/50">
          © {new Date().getFullYear()} ClawdWorks. All transactions are final and onchain.
        </div>
      </div>
    </footer>
  );
};
