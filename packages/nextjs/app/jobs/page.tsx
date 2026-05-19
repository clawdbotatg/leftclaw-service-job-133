"use client";

import { JobsView } from "./_components/JobsView";
import type { NextPage } from "next";

const JobsPage: NextPage = () => {
  return (
    <div className="max-w-6xl mx-auto w-full px-6 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Your jobs</h1>
        <p className="text-sm text-base-content/60">Track your purchases, deliveries, and refunds.</p>
      </header>
      <JobsView />
    </div>
  );
};

export default JobsPage;
