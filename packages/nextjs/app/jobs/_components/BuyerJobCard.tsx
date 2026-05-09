"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import {
  DELIVERY_TIMEOUT_DAYS,
  DISPUTE_AUTO_REFUND_DAYS,
  JOB_STATUS,
  JOB_STATUS_LABEL,
  JOB_STATUS_TONE,
  formatClawd,
  formatRemaining,
  shortHash,
} from "~~/utils/clawdworks";
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

export const BuyerJobCard = ({ job }: { job: Job }) => {
  const status = Number(job.status);

  const { data: listing } = useScaffoldReadContract({
    contractName: "ClawdWorks",
    functionName: "getListing",
    args: [job.listingId],
  });

  const { writeContractAsync, isPending } = useScaffoldWriteContract({ contractName: "ClawdWorks" });

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30_000);
    return () => clearInterval(t);
  }, []);

  const deliveryDeadline = useMemo(() => {
    if (!job.deliveredAt || job.deliveredAt === 0n) return null;
    return Number(job.deliveredAt) + DELIVERY_TIMEOUT_DAYS * 86_400;
  }, [job.deliveredAt]);

  const refundUnlockAt = useMemo(() => {
    if (!job.disputedAt || job.disputedAt === 0n) return null;
    return Number(job.disputedAt) + DISPUTE_AUTO_REFUND_DAYS * 86_400;
  }, [job.disputedAt]);

  const [disputeReason, setDisputeReason] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onConfirm = async () => {
    setSubmitting(true);
    try {
      await writeContractAsync({ functionName: "confirmReceipt", args: [job.id] });
      notification.success("Receipt confirmed. Funds released.");
    } catch (err: any) {
      notification.error(err?.shortMessage || err?.message || "Failed to confirm");
    } finally {
      setSubmitting(false);
    }
  };

  const onDispute = async () => {
    setSubmitting(true);
    try {
      const reason = disputeReason.trim() || "QmPlaceholder";
      await writeContractAsync({ functionName: "disputeJob", args: [job.id, reason] });
      notification.success("Dispute opened.");
      setShowDispute(false);
      setDisputeReason("");
    } catch (err: any) {
      notification.error(err?.shortMessage || err?.message || "Failed to open dispute");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className="cw-card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-base-content/50">Job #{job.id.toString()}</span>
            <span className={`cw-badge border ${JOB_STATUS_TONE[status] || ""}`}>{JOB_STATUS_LABEL[status]}</span>
          </div>
          <h3 className="text-lg font-semibold mt-1 truncate">{listing?.title || `Listing #${job.listingId}`}</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-base-content/60">
            <span className="flex items-center gap-1">
              Seller: <Address address={job.seller} format="short" onlyEnsOrAddress />
            </span>
            <span>Paid: {formatClawd(job.amountPaid)}</span>
          </div>
        </div>
        <Link href={`/listing/${job.listingId}`} className="btn btn-ghost btn-sm border border-base-300">
          View listing
        </Link>
      </div>

      {status === JOB_STATUS.DELIVERED && deliveryDeadline && (
        <div className="mt-4 p-4 rounded bg-warning/10 border border-warning/30">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-medium">Delivered — review window open</p>
              <p className="text-xs text-base-content/70 mt-0.5">
                Deliverable:{" "}
                {job.deliverableIpfsHash ? (
                  <a
                    className="link"
                    href={`https://ipfs.io/ipfs/${job.deliverableIpfsHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {shortHash(job.deliverableIpfsHash)}
                  </a>
                ) : (
                  <span className="italic text-base-content/50">none</span>
                )}
              </p>
              <p className="text-xs text-base-content/70 mt-0.5">
                {formatRemaining(deliveryDeadline - now)
                  ? `${formatRemaining(deliveryDeadline - now)} until auto-confirm`
                  : "Auto-confirm window has elapsed"}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={onConfirm} disabled={submitting || isPending} className="btn btn-success btn-sm">
                {(submitting || isPending) && <span className="loading loading-spinner loading-sm" />}
                Confirm receipt
              </button>
              <button
                onClick={() => setShowDispute(s => !s)}
                disabled={submitting || isPending}
                className="btn btn-ghost btn-sm border border-base-300"
              >
                Dispute
              </button>
            </div>
          </div>
          {showDispute && (
            <div className="mt-3">
              <textarea
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                rows={3}
                placeholder="Describe the issue (this is treated as an IPFS hash)…"
                className="textarea textarea-bordered w-full text-sm bg-base-100"
              />
              <button onClick={onDispute} disabled={submitting || isPending} className="btn btn-error btn-sm mt-2">
                {(submitting || isPending) && <span className="loading loading-spinner loading-sm" />}
                Open dispute
              </button>
            </div>
          )}
        </div>
      )}

      {status === JOB_STATUS.DISPUTED && refundUnlockAt && (
        <div className="mt-4 p-4 rounded bg-error/10 border border-error/30">
          <p className="text-sm font-medium">Disputed</p>
          <p className="text-xs text-base-content/70 mt-1">
            Reason:{" "}
            <a
              href={`https://ipfs.io/ipfs/${job.disputeReasonIpfsHash}`}
              target="_blank"
              rel="noreferrer"
              className="link font-mono"
            >
              {shortHash(job.disputeReasonIpfsHash)}
            </a>
          </p>
          <p className="text-xs text-base-content/70 mt-1">
            {formatRemaining(refundUnlockAt - now)
              ? `Auto-refund available in ${formatRemaining(refundUnlockAt - now)}`
              : "Auto-refund is now available."}
          </p>
        </div>
      )}

      {status === JOB_STATUS.COMPLETED && (
        <div className="mt-4 p-3 rounded bg-success/10 border border-success/30 text-sm">
          Completed. Want to leave a review? Reviews can be submitted onchain via{" "}
          <code className="bg-base-300 px-1.5 py-0.5 rounded text-xs">submitReview()</code>.
        </div>
      )}
    </article>
  );
};
