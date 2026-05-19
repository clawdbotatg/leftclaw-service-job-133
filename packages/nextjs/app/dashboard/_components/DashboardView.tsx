"use client";

import { useMemo, useState } from "react";
import { CreateListingForm } from "./CreateListingForm";
import { SellerJobCard } from "./SellerJobCard";
import { SellerListingRow } from "./SellerListingRow";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { JOB_STATUS, formatClawd } from "~~/utils/clawdworks";

type Tab = "overview" | "listings" | "jobs";

export const DashboardView = () => {
  const { address } = useAccount();
  const [tab, setTab] = useState<Tab>("overview");

  const { data: listingCount } = useScaffoldReadContract({
    contractName: "ClawdWorks",
    functionName: "listingCount",
  });
  const ids = useMemo<bigint[]>(() => {
    if (!listingCount) return [];
    const out: bigint[] = [];
    for (let i = 1n; i <= (listingCount as bigint); i++) out.push(i);
    return out;
  }, [listingCount]);
  const { data: allListings } = useScaffoldReadContract({
    contractName: "ClawdWorks",
    functionName: "getListingsByIds",
    args: [ids],
    query: { enabled: ids.length > 0 },
  });
  const { data: sellerJobs } = useScaffoldReadContract({
    contractName: "ClawdWorks",
    functionName: "getJobsBySeller",
    args: [address],
    query: { enabled: !!address },
  });
  const { data: activeCount } = useScaffoldReadContract({
    contractName: "ClawdWorks",
    functionName: "activeJobCount",
    args: [address],
    query: { enabled: !!address },
  });
  const { data: maxConcurrent } = useScaffoldReadContract({
    contractName: "ClawdWorks",
    functionName: "maxActiveJobs",
    args: [address],
    query: { enabled: !!address },
  });
  const { data: defaultMax } = useScaffoldReadContract({
    contractName: "ClawdWorks",
    functionName: "DEFAULT_MAX_ACTIVE_JOBS",
  });

  const myListings = useMemo(() => {
    if (!allListings || !address) return [];
    return (allListings as readonly any[]).filter(l => l.seller?.toLowerCase() === address.toLowerCase());
  }, [allListings, address]);

  const { totalEarnedEstimate, completedCount, deliveredCount, paidCount } = useMemo(() => {
    let total = 0n;
    let completed = 0;
    let delivered = 0;
    let paid = 0;
    if (sellerJobs) {
      for (const j of sellerJobs as readonly any[]) {
        const status = Number(j.status);
        if (status === JOB_STATUS.COMPLETED) {
          completed += 1;
          total += (j.amountPaid * 8000n) / 10000n;
        }
        if (status === JOB_STATUS.DELIVERED) delivered += 1;
        if (status === JOB_STATUS.PAID) paid += 1;
      }
    }
    return {
      totalEarnedEstimate: total,
      completedCount: completed,
      deliveredCount: delivered,
      paidCount: paid,
    };
  }, [sellerJobs]);

  if (!address) {
    return (
      <div className="cw-card p-10 text-center">
        <h2 className="text-lg font-semibold">Connect your wallet</h2>
        <p className="text-sm text-base-content/60 mt-2 mb-6">Sellers manage their listings and jobs here.</p>
        <ConnectButton.Custom>
          {({ openConnectModal }) => (
            <button onClick={openConnectModal} className="btn btn-primary">
              Connect wallet
            </button>
          )}
        </ConnectButton.Custom>
      </div>
    );
  }

  const cap =
    maxConcurrent && (maxConcurrent as bigint) > 0n
      ? (maxConcurrent as bigint)
      : ((defaultMax as bigint | undefined) ?? 0n);

  return (
    <div>
      <nav className="flex gap-1 mb-6 border-b border-base-300 overflow-x-auto">
        {(["overview", "listings", "jobs"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium tracking-tight capitalize transition-colors border-b-2 ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-base-content/60 hover:text-base-content"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-3">
          <Stat label="Active queue" value={`${activeCount?.toString() ?? "0"} / ${cap.toString()}`} />
          <Stat label="Estimated earned" value={formatClawd(totalEarnedEstimate)} accent />
          <Stat label="Completed jobs" value={completedCount.toString()} />
          <Stat label="Awaiting confirm" value={deliveredCount.toString()} />
          <Stat label="In escrow (paid)" value={paidCount.toString()} />
        </div>
      )}

      {tab === "listings" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            {myListings.length === 0 ? (
              <div className="cw-card p-8 text-center text-base-content/60 text-sm">
                You haven’t created any listings yet.
              </div>
            ) : (
              myListings.map(l => <SellerListingRow key={l.id.toString()} listing={l} />)
            )}
          </div>
          <div className="lg:col-span-1">
            <CreateListingForm />
          </div>
        </div>
      )}

      {tab === "jobs" && (
        <div className="space-y-3">
          {!sellerJobs || (sellerJobs as readonly any[]).length === 0 ? (
            <div className="cw-card p-8 text-center text-base-content/60 text-sm">No incoming jobs yet.</div>
          ) : (
            (sellerJobs as readonly any[])
              .slice()
              .sort((a, b) => (a.id > b.id ? -1 : 1))
              .map(j => <SellerJobCard key={j.id.toString()} job={j} />)
          )}
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className="cw-card p-5">
    <p className="text-[10px] uppercase tracking-widest text-base-content/50">{label}</p>
    <p className={`text-2xl font-bold mt-1 tracking-tight ${accent ? "text-primary" : ""}`}>{value}</p>
  </div>
);
