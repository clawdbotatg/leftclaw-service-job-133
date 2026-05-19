"use client";

import { useState } from "react";
import { Address } from "@scaffold-ui/components";
import { useScaffoldReadContract, useScaffoldWriteContract, useWriteAndOpen } from "~~/hooks/scaffold-eth";
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
  const { writeAndOpen } = useWriteAndOpen();
  const [hash, setHash] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onDeliver = async () => {
    if (!hash.trim()) {
      notification.error("Deliverable hash or reference required");
      return;
    }
    setSubmitting(true);
    try {
      await writeAndOpen(() => writeContractAsync({ functionName: "markDelivered", args: [job.id, hash.trim()] }));
      notification.success("Marked as delivered.");
      setHash("");
    } catch (err: any) {
      notification.error(err?.shortMessage || err?.message || "Failed to mark delivered");
    } finally {
      setSubmitting(false);
    }
  };

  const onRefund = async () => {
    setSubmitting(true);
    try {
      await writeAndOpen(() => writeContractAsync({ functionName: "refundBuyer", args: [job.id] }));
      notification.success("Buyer refunded.");
    } catch (err: any) {
      notification.error(err?.shortMessage || err?.message || "Failed to refund");
    } finally {
      setSubmitting(false);
    }
  };

  const { data: sellerReviewId } = useScaffoldReadContract({
    contractName: "ClawdWorks",
    functionName: "sellerReviewByJob",
    args: [job.id],
    query: { enabled: status === JOB_STATUS.COMPLETED },
  });

  const [reviewStars, setReviewStars] = useState(5);
  const [reviewHash, setReviewHash] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const onSubmitSellerReview = async () => {
    if (!reviewHash.trim()) {
      notification.error("Review content required");
      return;
    }
    setReviewSubmitting(true);
    try {
      await writeAndOpen(() =>
        writeContractAsync({
          functionName: "submitSellerReview",
          args: [job.id, reviewStars, reviewHash.trim()],
        }),
      );
      notification.success("Buyer review submitted.");
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
              Buyer note: <span className="font-mono">{shortHash(job.buyerNoteIpfsHash)}</span>
            </p>
          )}
        </div>
      </div>

      {status === JOB_STATUS.PAID && (
        <div className="mt-4 p-4 rounded bg-base-300/40 border border-base-300">
          <p className="text-sm font-medium mb-2">In escrow — deliver to release funds</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <input
              value={hash}
              onChange={e => setHash(e.target.value)}
              placeholder="IPFS hash or deliverable reference"
              className="input input-bordered input-sm bg-base-100 text-sm grow font-mono"
            />
            <button onClick={onDeliver} disabled={submitting || isPending} className="btn btn-primary btn-sm">
              {(submitting || isPending) && <span className="loading loading-spinner loading-sm" />}
              Mark delivered
            </button>
          </div>
          <div className="mt-3 pt-3 border-t border-base-300">
            <button
              onClick={onRefund}
              disabled={submitting || isPending}
              className="btn btn-ghost btn-sm border border-base-300 text-xs"
            >
              Refund buyer instead
            </button>
          </div>
        </div>
      )}

      {status === JOB_STATUS.DELIVERED && (
        <div className="mt-4 p-4 rounded bg-warning/10 border border-warning/30">
          <p className="text-sm font-medium">Awaiting buyer confirmation</p>
          <p className="text-xs text-base-content/70 mt-0.5">
            Deliverable:{" "}
            {job.deliverableIpfsHash ? <span className="font-mono">{shortHash(job.deliverableIpfsHash)}</span> : "—"}
          </p>
          <div className="mt-3 pt-3 border-t border-warning/30">
            <button
              onClick={onRefund}
              disabled={submitting || isPending}
              className="btn btn-ghost btn-sm border border-base-300 text-xs"
            >
              {(submitting || isPending) && <span className="loading loading-spinner loading-sm" />}
              Refund buyer
            </button>
          </div>
        </div>
      )}

      {status === JOB_STATUS.COMPLETED && (
        <div className="mt-4 p-3 rounded bg-success/10 border border-success/30">
          {sellerReviewId && (sellerReviewId as bigint) > 0n ? (
            <p className="text-sm text-success font-medium">Buyer review submitted.</p>
          ) : (
            <div>
              <p className="text-sm font-medium mb-2">Rate this buyer</p>
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
                  placeholder="Review note or IPFS hash"
                  className="input input-bordered input-sm bg-base-100 text-sm grow"
                />
                <button
                  onClick={onSubmitSellerReview}
                  disabled={reviewSubmitting || isPending}
                  className="btn btn-success btn-sm"
                >
                  {(reviewSubmitting || isPending) && <span className="loading loading-spinner loading-sm" />}
                  Rate buyer
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
};
