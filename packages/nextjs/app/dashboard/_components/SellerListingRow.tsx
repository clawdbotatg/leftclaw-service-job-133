"use client";

import { useState } from "react";
import Link from "next/link";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { formatClawd } from "~~/utils/clawdworks";
import { notification } from "~~/utils/scaffold-eth";

type Listing = {
  id: bigint;
  seller: `0x${string}`;
  title: string;
  descriptionIpfsHash: string;
  priceCLAWD: bigint;
  deliveryDaysEstimate: bigint;
  maxConcurrentOverride: bigint;
  whitelistedBuyer: `0x${string}`;
  active: boolean;
};

export const SellerListingRow = ({ listing }: { listing: Listing }) => {
  const { writeContractAsync, isPending } = useScaffoldWriteContract({ contractName: "ClawdWorks" });
  const [submitting, setSubmitting] = useState(false);

  const onDeactivate = async () => {
    setSubmitting(true);
    try {
      await writeContractAsync({ functionName: "deactivateListing", args: [listing.id] });
      notification.success("Listing deactivated.");
    } catch (err: any) {
      notification.error(err?.shortMessage || err?.message || "Failed to deactivate");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cw-card p-4 flex items-center justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-base-content/50">#{listing.id.toString()}</span>
          <span
            className={`cw-badge border ${
              listing.active
                ? "bg-success/15 text-success border-success/30"
                : "bg-base-300 text-base-content/60 border-base-300"
            }`}
          >
            {listing.active ? "Active" : "Inactive"}
          </span>
        </div>
        <h3 className="font-semibold truncate mt-0.5">{listing.title}</h3>
        <p className="text-sm text-primary mt-0.5">{formatClawd(listing.priceCLAWD)}</p>
      </div>
      <div className="flex gap-2">
        <Link href={`/listing/${listing.id}`} className="btn btn-ghost btn-sm border border-base-300">
          View
        </Link>
        {listing.active && (
          <button onClick={onDeactivate} disabled={submitting || isPending} className="btn btn-error btn-sm">
            {(submitting || isPending) && <span className="loading loading-spinner loading-sm" />}
            Deactivate
          </button>
        )}
      </div>
    </div>
  );
};
