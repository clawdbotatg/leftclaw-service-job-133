"use client";

import { useMemo, useState } from "react";
import { BuyerJobCard } from "./BuyerJobCard";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { JOB_STATUS } from "~~/utils/clawdworks";

type Tab = "active" | "delivered" | "completed" | "refunded";

const TABS: { id: Tab; label: string; statuses: number[] }[] = [
  { id: "active", label: "Active", statuses: [JOB_STATUS.PAID] },
  { id: "delivered", label: "Delivered", statuses: [JOB_STATUS.DELIVERED] },
  { id: "completed", label: "Completed", statuses: [JOB_STATUS.COMPLETED] },
  { id: "refunded", label: "Refunded", statuses: [JOB_STATUS.REFUNDED] },
];

export const JobsView = () => {
  const { address } = useAccount();
  const [tab, setTab] = useState<Tab>("active");

  const { data: jobs, isLoading } = useScaffoldReadContract({
    contractName: "ClawdWorks",
    functionName: "getJobsByBuyer",
    args: [address],
    query: { enabled: !!address },
  });

  const counts = useMemo(() => {
    const out: Record<Tab, number> = {
      active: 0,
      delivered: 0,
      completed: 0,
      refunded: 0,
    };
    if (!jobs) return out;
    for (const j of jobs as readonly any[]) {
      const status = Number(j.status);
      const t = TABS.find(t => t.statuses.includes(status));
      if (t) out[t.id] += 1;
    }
    return out;
  }, [jobs]);

  const filtered = useMemo(() => {
    if (!jobs) return [];
    const t = TABS.find(t => t.id === tab)!;
    return (jobs as readonly any[]).filter(j => t.statuses.includes(Number(j.status)));
  }, [jobs, tab]);

  if (!address) {
    return (
      <div className="cw-card p-10 text-center">
        <h2 className="text-lg font-semibold">Connect your wallet</h2>
        <p className="text-sm text-base-content/60 mt-2 mb-6">View the jobs you’ve purchased on ClawdWorks.</p>
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

  return (
    <div>
      <nav className="flex gap-1 mb-6 border-b border-base-300 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium tracking-tight transition-colors border-b-2 ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-base-content/60 hover:text-base-content"
            }`}
          >
            {t.label}
            <span className="ml-2 text-[11px] text-base-content/50">{counts[t.id]}</span>
          </button>
        ))}
      </nav>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="cw-card p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="cw-card p-10 text-center">
          <p className="text-base-content/60">Nothing here yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(j => (
            <BuyerJobCard key={j.id.toString()} job={j} />
          ))}
        </div>
      )}
    </div>
  );
};
