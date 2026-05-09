"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick } from "~~/hooks/scaffold-eth";

type HeaderMenuLink = {
  label: string;
  href: string;
};

export const menuLinks: HeaderMenuLink[] = [
  { label: "Browse", href: "/" },
  { label: "Jobs", href: "/jobs" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "How it works", href: "/how-it-works" },
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();

  return (
    <>
      {menuLinks.map(({ label, href }) => {
        const isActive = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              passHref
              className={`${
                isActive ? "text-primary" : "text-base-content/70"
              } hover:text-primary py-1.5 px-3 text-sm font-medium tracking-tight transition-colors`}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </>
  );
};

const ClawLogo = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8 4 L20 20 M12 4 L22 22 M16 4 L24 24"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

/**
 * Site header
 */
export const Header = () => {
  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  return (
    <div className="sticky lg:static top-0 navbar bg-base-100 border-b border-base-300 min-h-0 shrink-0 justify-between z-20 px-2 sm:px-4">
      <div className="navbar-start w-auto lg:w-1/2">
        <details className="dropdown" ref={burgerMenuRef}>
          <summary className="ml-1 btn btn-ghost lg:hidden hover:bg-transparent">
            <Bars3Icon className="h-5 w-5" />
          </summary>
          <ul
            className="menu menu-compact dropdown-content mt-3 p-2 shadow bg-base-200 border border-base-300 rounded-box w-52"
            onClick={() => {
              burgerMenuRef?.current?.removeAttribute("open");
            }}
          >
            <HeaderMenuLinks />
          </ul>
        </details>
        <Link href="/" passHref className="hidden lg:flex items-center gap-2 ml-2 mr-8 shrink-0 text-primary">
          <ClawLogo />
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-base-content tracking-tight">ClawdWorks</span>
            <span className="text-[10px] uppercase tracking-widest text-base-content/50">Onchain · Sharpened</span>
          </div>
        </Link>
        <ul className="hidden lg:flex lg:flex-nowrap menu menu-horizontal px-1 gap-1">
          <HeaderMenuLinks />
        </ul>
      </div>
      <div className="navbar-end grow gap-2">
        <RainbowKitCustomConnectButton />
      </div>
    </div>
  );
};
