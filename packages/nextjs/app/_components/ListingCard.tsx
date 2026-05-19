"use client";

import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { formatClawd } from "~~/utils/clawdworks";

type Listing = {
  id: bigint;
  seller: `0x${string}`;
  title: string;
  description: string;
  priceCLAWD: bigint;
  deliveryDaysEstimate: bigint;
  maxConcurrentOverride: bigint;
  whitelistedBuyer: `0x${string}`;
  active: boolean;
};

export const ListingCard = ({ listing }: { listing: Listing }) => {
  const { data: activeCount } = useScaffoldReadContract({
    contractName: "ClawdWorks",
    functionName: "activeJobCount",
    args: [listing.seller],
  });
  const { data: defaultMax } = useScaffoldReadContract({
    contractName: "ClawdWorks",
    functionName: "DEFAULT_MAX_ACTIVE_JOBS",
  });

  const cap =
    listing.maxConcurrentOverride && listing.maxConcurrentOverride > 0n
      ? listing.maxConcurrentOverride
      : ((defaultMax as bigint | undefined) ?? 0n);
  const queueFull = cap > 0n && activeCount !== undefined && (activeCount as bigint) >= cap;

  return (
    <Link href={`/listing/${listing.id}`} className="cw-card p-5 flex flex-col gap-4 group">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold leading-tight tracking-tight group-hover:text-primary transition-colors">
          {listing.title || "Untitled"}
        </h3>
        {queueFull && (
          <span className="cw-badge bg-error/15 text-error border border-error/30 shrink-0">Queue Full</span>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-base-content/60">
        <span>by</span>
        <Address address={listing.seller} format="short" disableAddressLink onlyEnsOrAddress />
      </div>

      <div className="flex items-end justify-between mt-auto pt-3 border-t border-base-300">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-base-content/50">Price</p>
          <p className="text-2xl font-bold text-primary">
            {formatClawd(listing.priceCLAWD, { withSymbol: false })}
            <span className="text-xs font-medium text-base-content/60 ml-1.5">CLAWD</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-base-content/50">Delivery</p>
          <p className="text-sm font-medium">
            ~{listing.deliveryDaysEstimate.toString()} {listing.deliveryDaysEstimate === 1n ? "day" : "days"}
          </p>
        </div>
      </div>
    </Link>
  );
};
