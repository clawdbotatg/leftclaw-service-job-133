"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Address } from "@scaffold-ui/components";
import { base } from "viem/chains";
import { useAccount, useSwitchChain } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { formatClawd, shortHash } from "~~/utils/clawdworks";
import { notification } from "~~/utils/scaffold-eth";

const BUYER_NOTE_PLACEHOLDER = "QmPlaceholder";
const CLAWDWORKS_ADDRESS = "0x90c14763fB2A372F186cBb3bFe8A1eD81f90623E" as const;

export const ListingDetail = ({ paramsPromise }: { paramsPromise: Promise<{ id: string }> }) => {
  const { id } = use(paramsPromise);
  const listingId = useMemo(() => {
    try {
      return BigInt(id);
    } catch {
      return 0n;
    }
  }, [id]);

  const { address, chain } = useAccount();
  const { switchChain } = useSwitchChain();

  const { data: listing, isLoading: listingLoading } = useScaffoldReadContract({
    contractName: "ClawdWorks",
    functionName: "getListing",
    args: [listingId],
  });

  const { data: defaultMax } = useScaffoldReadContract({
    contractName: "ClawdWorks",
    functionName: "DEFAULT_MAX_ACTIVE_JOBS",
  });

  const seller = listing?.seller;
  const { data: activeCount } = useScaffoldReadContract({
    contractName: "ClawdWorks",
    functionName: "activeJobCount",
    args: [seller],
    query: { enabled: !!seller },
  });

  const cap =
    listing?.maxConcurrentOverride && listing.maxConcurrentOverride > 0n
      ? listing.maxConcurrentOverride
      : ((defaultMax as bigint | undefined) ?? 0n);
  const queueFull = cap > 0n && activeCount !== undefined && (activeCount as bigint) >= cap;

  const { data: clawdBalance } = useScaffoldReadContract({
    contractName: "CLAWD",
    functionName: "balanceOf",
    args: [address],
    query: { enabled: !!address },
  });

  const { data: clawdAllowance, refetch: refetchAllowance } = useScaffoldReadContract({
    contractName: "CLAWD",
    functionName: "allowance",
    args: [address, CLAWDWORKS_ADDRESS],
    query: { enabled: !!address },
  });

  const { writeContractAsync: writeClawdWorks, isPending: cwPending } = useScaffoldWriteContract({
    contractName: "ClawdWorks",
  });
  const { writeContractAsync: writeClawd, isPending: clawdPending } = useScaffoldWriteContract({
    contractName: "CLAWD",
  });

  const price = listing?.priceCLAWD ?? 0n;
  const allowance = (clawdAllowance as bigint | undefined) ?? 0n;
  const balance = (clawdBalance as bigint | undefined) ?? 0n;
  const needsApproval = price > 0n && allowance < price;
  const insufficient = price > 0n && balance < price;

  const [note, setNote] = useState("");
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [approvalCooldown, setApprovalCooldown] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (!approvalCooldown) return;
    const t = setTimeout(() => setApprovalCooldown(false), 4000);
    return () => clearTimeout(t);
  }, [approvalCooldown]);

  const onApprove = async () => {
    if (approvalSubmitting || approvalCooldown) return;
    setApprovalSubmitting(true);
    try {
      await writeClawd({
        functionName: "approve",
        args: [CLAWDWORKS_ADDRESS, price],
      });
      notification.success("CLAWD approval submitted");
      setApprovalCooldown(true);
      await refetchAllowance();
    } catch (err: any) {
      notification.error(err?.shortMessage || err?.message || "Approval failed");
    } finally {
      setApprovalSubmitting(false);
    }
  };

  const onPurchase = async () => {
    if (purchasing) return;
    setPurchasing(true);
    try {
      const buyerNote = note.trim() ? note.trim() : BUYER_NOTE_PLACEHOLDER;
      await writeClawdWorks({
        functionName: "purchase",
        args: [listingId, buyerNote],
      });
      notification.success("Purchase complete. Job opened in escrow.");
      setNote("");
      await refetchAllowance();
    } catch (err: any) {
      notification.error(err?.shortMessage || err?.message || "Purchase failed");
    } finally {
      setPurchasing(false);
    }
  };

  if (listingLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="cw-card p-8 animate-pulse">
          <div className="h-7 bg-base-300 rounded w-2/3 mb-4" />
          <div className="h-4 bg-base-300 rounded w-full mb-2" />
          <div className="h-4 bg-base-300 rounded w-5/6" />
        </div>
      </div>
    );
  }

  if (!listing || listing.id === 0n) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="cw-card p-10 text-center">
          <h2 className="text-lg font-semibold">Listing not found</h2>
          <p className="text-sm text-base-content/60 mt-2">This listing doesn’t exist or hasn’t been indexed yet.</p>
          <Link href="/" className="btn btn-primary mt-6">
            Back to listings
          </Link>
        </div>
      </div>
    );
  }

  const wrongNetwork = !!chain && chain.id !== base.id;
  const disabled = !listing.active || queueFull;

  let actionButton: React.ReactNode;
  if (!address) {
    actionButton = (
      <ConnectButton.Custom>
        {({ openConnectModal }) => (
          <button onClick={openConnectModal} className="btn btn-primary w-full">
            Connect wallet
          </button>
        )}
      </ConnectButton.Custom>
    );
  } else if (wrongNetwork) {
    actionButton = (
      <button onClick={() => switchChain({ chainId: base.id })} className="btn btn-warning w-full">
        Switch to Base
      </button>
    );
  } else if (insufficient) {
    actionButton = (
      <button disabled className="btn btn-disabled w-full">
        Insufficient CLAWD balance
      </button>
    );
  } else if (needsApproval) {
    actionButton = (
      <button
        onClick={onApprove}
        disabled={approvalSubmitting || approvalCooldown || clawdPending || disabled}
        className="btn btn-primary w-full"
      >
        {(approvalSubmitting || clawdPending) && <span className="loading loading-spinner loading-sm" />}
        {approvalCooldown && !approvalSubmitting ? "Approval pending…" : "Approve CLAWD"}
      </button>
    );
  } else {
    actionButton = (
      <button onClick={onPurchase} disabled={purchasing || cwPending || disabled} className="btn btn-primary w-full">
        {(purchasing || cwPending) && <span className="loading loading-spinner loading-sm" />}
        Purchase for {formatClawd(price)}
      </button>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <Link href="/" className="text-sm text-base-content/60 hover:text-primary inline-block mb-4">
        ← Back to listings
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          <div className="cw-card p-6 lg:p-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-base-content/50">
                  Listing #{listing.id.toString()}
                </p>
                <h1 className="text-3xl font-bold tracking-tight mt-1">{listing.title}</h1>
              </div>
              {!listing.active && (
                <span className="cw-badge bg-base-300 text-base-content/60 border border-base-300">Inactive</span>
              )}
              {queueFull && listing.active && (
                <span className="cw-badge bg-error/15 text-error border border-error/30">Queue Full</span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <Field label="Seller">
                <Address address={listing.seller} format="short" />
              </Field>
              <Field label="Delivery">
                ~{listing.deliveryDaysEstimate.toString()} {listing.deliveryDaysEstimate === 1n ? "day" : "days"}
              </Field>
              <Field label="Capacity">
                {activeCount !== undefined && cap > 0n
                  ? `${(activeCount as bigint).toString()} / ${cap.toString()} active`
                  : "—"}
              </Field>
            </div>
          </div>

          <div className="cw-card p-6 lg:p-8">
            <h2 className="text-sm uppercase tracking-widest text-base-content/50 mb-3">Description</h2>
            <p className="text-base-content/80 whitespace-pre-wrap break-words">
              {listing.descriptionIpfsHash ? (
                <>
                  Stored on IPFS:{" "}
                  <a
                    href={`https://ipfs.io/ipfs/${listing.descriptionIpfsHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="link font-mono text-sm"
                  >
                    {shortHash(listing.descriptionIpfsHash)}
                  </a>
                </>
              ) : (
                <span className="text-base-content/50 italic">No description provided.</span>
              )}
            </p>
            {listing.whitelistedBuyer && listing.whitelistedBuyer !== "0x0000000000000000000000000000000000000000" && (
              <div className="mt-4 p-3 rounded bg-warning/10 border border-warning/30 text-sm">
                <span className="font-semibold">Private listing.</span> Reserved for{" "}
                <span className="inline-block align-middle">
                  <Address address={listing.whitelistedBuyer} format="short" />
                </span>
                .
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="cw-card p-6 lg:sticky lg:top-6 space-y-4">
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] uppercase tracking-widest text-base-content/50">Price</p>
              <p className="text-3xl font-bold text-primary">{formatClawd(price, { withSymbol: false })}</p>
            </div>
            <p className="text-xs text-right -mt-2 text-base-content/60">CLAWD</p>

            <div className="cw-divider" />

            <div>
              <label className="text-[10px] uppercase tracking-widest text-base-content/50">
                Buyer note (optional)
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Briefs, links, requirements…"
                rows={4}
                className="textarea textarea-bordered w-full mt-1 bg-base-100 text-sm"
              />
              <p className="text-[10px] text-base-content/50 mt-1">
                Note is passed to the seller as an IPFS hash placeholder ({BUYER_NOTE_PLACEHOLDER}).
              </p>
            </div>

            {address && (
              <div className="text-xs text-base-content/60 flex items-center justify-between">
                <span>Your CLAWD</span>
                <span className="font-medium text-base-content">{formatClawd(balance)}</span>
              </div>
            )}

            {actionButton}

            <div className="text-[11px] text-base-content/50 leading-relaxed">
              On purchase: 80% escrowed for the seller, 10% burned, 10% to the ecosystem treasury. 7-day delivery
              window, with dispute and 14-day auto-refund protection.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="text-[10px] uppercase tracking-widest text-base-content/50">{label}</p>
    <div className="mt-0.5 text-sm">{children}</div>
  </div>
);
