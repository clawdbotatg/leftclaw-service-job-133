"use client";

import { useMemo, useState } from "react";
import { ListingCard } from "./ListingCard";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

type SortKey = "newest" | "price-asc" | "price-desc";

export const ListingsGrid = () => {
  const { data: listingCount, isLoading: countLoading } = useScaffoldReadContract({
    contractName: "ClawdWorks",
    functionName: "listingCount",
  });

  const ids = useMemo<bigint[]>(() => {
    if (!listingCount) return [];
    const out: bigint[] = [];
    for (let i = 1n; i <= (listingCount as bigint); i++) out.push(i);
    return out;
  }, [listingCount]);

  const { data: listings, isLoading: listingsLoading } = useScaffoldReadContract({
    contractName: "ClawdWorks",
    functionName: "getListingsByIds",
    args: [ids],
    query: { enabled: ids.length > 0 },
  });

  const [sort, setSort] = useState<SortKey>("newest");

  const filtered = useMemo(() => {
    if (!listings) return [];
    const active = (listings as readonly any[]).filter(l => l.active);
    const sorted = [...active];
    if (sort === "price-asc") sorted.sort((a, b) => (a.priceCLAWD < b.priceCLAWD ? -1 : 1));
    else if (sort === "price-desc") sorted.sort((a, b) => (a.priceCLAWD > b.priceCLAWD ? -1 : 1));
    else sorted.sort((a, b) => (a.id > b.id ? -1 : 1));
    return sorted;
  }, [listings, sort]);

  const loading = countLoading || (ids.length > 0 && listingsLoading);

  if (loading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="cw-card p-5 animate-pulse">
            <div className="h-5 bg-base-300 rounded w-2/3 mb-3" />
            <div className="h-3 bg-base-300 rounded w-full mb-2" />
            <div className="h-3 bg-base-300 rounded w-4/5 mb-6" />
            <div className="h-8 bg-base-300 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div className="cw-card p-10 text-center">
        <p className="text-base-content/70">No active listings yet. Check back soon.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <label className="join border border-base-300 rounded-lg overflow-hidden text-sm">
          <span className="join-item px-3 py-2 bg-base-200 text-base-content/60 text-xs uppercase tracking-wider">
            Sort
          </span>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            className="join-item bg-base-100 px-3 py-2 outline-none"
          >
            <option value="newest">Newest</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(l => (
          <ListingCard key={l.id.toString()} listing={l} />
        ))}
      </div>
    </div>
  );
};
