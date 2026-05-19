"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import {
  DELIVERY_TIMEOUT_DAYS,
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

  const onCancel = async () => {
    setSubmitting(true);
    try {
      await writeContractAsync({ functionName: "cancelJob", args: [job.id] });
      notification.success("Job cancelled. Funds refunded.");
    } catch (err: any) {
      notification.error(err?.shortMessage || err?.message || "Failed to cancel");
    } finally {
      setSubmitting(false);
    }
  };

  const { data: reviewId } = useScaffoldReadContract({
    contractName: "ClawdWorks",
    functionName: "reviewByJob",
    args: [job.id],
    query: { enabled: status === JOB_STATUS.COMPLETED },
  });

  const [reviewStars, setReviewStars] = useState(5);
  const [reviewHash, setReviewHash] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const onSubmitReview = async () => {
    if (!reviewHash.trim()) {
      notification.error("Review content (IPFS hash or text) required");
      return;
    }
    setReviewSubmitting(true);
    try {
      await writeContractAsync({
        functionName: "submitReview",
        args: [job.id, reviewStars, reviewHash.trim()],
      });
      notification.success("Review submitted onchain.");
      setReviewHash("");
    } catch (err: any) {
      notification.error(err?.shortMessage || err?.message || "Failed to submit review");
    } finally {
      setReviewSubmitting(false);
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

      {status === JOB_STATUS.PAID && (
        <div className="mt-4 p-4 rounded bg-info/10 border border-info/30">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-medium">In escrow — awaiting seller delivery</p>
              <p className="text-xs text-base-content/70 mt-0.5">You can cancel before the seller marks delivery.</p>
            </div>
            <button
              onClick={onCancel}
              disabled={submitting || isPending}
              className="btn btn-ghost btn-sm border border-base-300"
            >
              {(submitting || isPending) && <span className="loading loading-spinner loading-sm" />}
              Cancel & refund
            </button>
          </div>
        </div>
      )}

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
                  ? `${formatRemaining(deliveryDeadline - now)} until auto-timeout`
                  : "7-day window has elapsed — seller may claim timeout"}
              </p>
            </div>
            <button onClick={onConfirm} disabled={submitting || isPending} className="btn btn-success btn-sm">
              {(submitting || isPending) && <span className="loading loading-spinner loading-sm" />}
              Confirm receipt
            </button>
          </div>
        </div>
      )}

      {status === JOB_STATUS.COMPLETED && (
        <div className="mt-4 p-3 rounded bg-success/10 border border-success/30">
          {reviewId && (reviewId as bigint) > 0n ? (
            <p className="text-sm text-success font-medium">Review submitted. Thank you!</p>
          ) : (
            <div>
              <p className="text-sm font-medium mb-2">Leave a review for this seller</p>
              <div className="flex items-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setReviewStars(n)}
                    className={`text-xl transition-colors ${n <= reviewStars ? "text-warning" : "text-base-content/30"}`}
                  >
                    ★
                  </button>
                ))}
                <span className="text-xs text-base-content/60 ml-1">{reviewStars}/5</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <input
                  value={reviewHash}
                  onChange={e => setReviewHash(e.target.value)}
                  placeholder="Review IPFS hash or short note"
                  className="input input-bordered input-sm bg-base-100 text-sm grow"
                />
                <button
                  onClick={onSubmitReview}
                  disabled={reviewSubmitting || isPending}
                  className="btn btn-success btn-sm"
                >
                  {(reviewSubmitting || isPending) && <span className="loading loading-spinner loading-sm" />}
                  Submit review
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
};
