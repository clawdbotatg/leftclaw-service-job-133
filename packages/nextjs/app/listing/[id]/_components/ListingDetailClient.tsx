"use client";

import dynamic from "next/dynamic";

const ListingDetailInner = dynamic(() => import("./ListingDetail").then(m => ({ default: m.ListingDetail })), {
  ssr: false,
  loading: () => <div className="max-w-5xl mx-auto px-6 py-12 animate-pulse h-64 rounded-xl bg-base-200" />,
});

export const ListingDetailClient = ({ paramsPromise }: { paramsPromise: Promise<{ id: string }> }) => {
  return <ListingDetailInner paramsPromise={paramsPromise} />;
};
