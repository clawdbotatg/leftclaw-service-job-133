"use client";

import { useState } from "react";
import { Address } from "@scaffold-ui/components";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { JOB_STATUS, JOB_STATUS_LABEL, JOB_STATUS_TONE, formatClawd, shortHash } from "~~/utils/clawdworks";
import { notification } from "~~/utils/scaffold-eth";

type Job = {
  id: bigint;
  listingId: bigint;
  buyer: `0x${string}`;
  seller: `0x${string}`;
  amountPaid: bigint;
  buyerNoteIpfsHash: string;
  deliverableIpfsHash: string;
  deliveredAt: bigint;
  disputedAt: bigint;
  disputeReasonIpfsHash: string;
  disputeResolutionIpfsHash: string;
  status: number;
};

export const SellerJobCard = ({ job }: { job: Job }) => {
  const status = Number(job.status);
  const { data: listing } = useScaffoldReadContract({
    contractName: "ClawdWorks",
    functionName: "getListing",
    args: [job.listingId],
  });
  const { writeContractAsync, isPending } = useScaffoldWriteContract({ contractName: "ClawdWorks" });
  const [hash, setHash] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onDeliver = async () => {
    if (!hash.trim()) {
      notification.error("Deliverable IPFS hash required");
      return;
    }
    setSubmitting(true);
    try {
      await writeContractAsync({ functionName: "markDelivered", args: [job.id, hash.trim()] });
      notification.success("Marked as delivered.");
      setHash("");
    } catch (err: any) {
      notification.error(err?.shortMessage || err?.message || "Failed to mark delivered");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className="cw-card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-base-content/50">Job #{job.id.toString()}</span>
            <span className={`cw-badge border ${JOB_STATUS_TONE[status] || ""}`}>{JOB_STATUS_LABEL[status]}</span>
          </div>
          <h3 className="text-lg font-semibold mt-1">{listing?.title || `Listing #${job.listingId}`}</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-base-content/60">
            <span className="flex items-center gap-1">
              Buyer: <Address address={job.buyer} format="short" onlyEnsOrAddress />
            </span>
            <span>Paid: {formatClawd(job.amountPaid)}</span>
          </div>
          {job.buyerNoteIpfsHash && (
            <p className="text-xs text-base-content/70 mt-2">
              Buyer note:{" "}
              <a
                href={`https://ipfs.io/ipfs/${job.buyerNoteIpfsHash}`}
                target="_blank"
                rel="noreferrer"
                className="link font-mono"
              >
                {shortHash(job.buyerNoteIpfsHash)}
              </a>
            </p>
          )}
        </div>
      </div>

      {status === JOB_STATUS.PAID && (
        <div className="mt-4 p-4 rounded bg-base-300/40 border border-base-300">
          <p className="text-sm font-medium">In escrow — deliver to release funds</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <input
              value={hash}
              onChange={e => setHash(e.target.value)}
              placeholder="Deliverable IPFS hash (Qm…)"
              className="input input-bordered input-sm bg-base-100 text-sm grow font-mono"
            />
            <button onClick={onDeliver} disabled={submitting || isPending} className="btn btn-primary btn-sm">
              {(submitting || isPending) && <span className="loading loading-spinner loading-sm" />}
              Mark delivered
            </button>
          </div>
        </div>
      )}

      {status === JOB_STATUS.DELIVERED && (
        <div className="mt-4 p-3 rounded bg-warning/10 border border-warning/30 text-sm">
          Awaiting buyer confirmation. Deliverable:{" "}
          {job.deliverableIpfsHash ? (
            <a
              className="link font-mono"
              href={`https://ipfs.io/ipfs/${job.deliverableIpfsHash}`}
              target="_blank"
              rel="noreferrer"
            >
              {shortHash(job.deliverableIpfsHash)}
            </a>
          ) : (
            "—"
          )}
        </div>
      )}

      {status === JOB_STATUS.DISPUTED && (
        <div className="mt-4 p-3 rounded bg-error/10 border border-error/30 text-sm">
          Buyer opened a dispute. Reason:{" "}
          <a
            className="link font-mono"
            href={`https://ipfs.io/ipfs/${job.disputeReasonIpfsHash}`}
            target="_blank"
            rel="noreferrer"
          >
            {shortHash(job.disputeReasonIpfsHash)}
          </a>
        </div>
      )}
    </article>
  );
};
