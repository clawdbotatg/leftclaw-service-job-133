"use client";

import { DashboardView } from "./_components/DashboardView";
import type { NextPage } from "next";

const DashboardPage: NextPage = () => {
  return (
    <div className="max-w-6xl mx-auto w-full px-6 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Seller dashboard</h1>
        <p className="text-sm text-base-content/60">Manage your listings and active jobs.</p>
      </header>
      <DashboardView />
    </div>
  );
};

export default DashboardPage;
