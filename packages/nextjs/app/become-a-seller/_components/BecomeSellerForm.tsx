"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export const BecomeSellerForm = () => {
  const { address } = useAccount();
  const [pitch, setPitch] = useState("");
  const [handle, setHandle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: hasExpressed } = useScaffoldReadContract({
    contractName: "ClawdWorks",
    functionName: "hasExpressedInterest",
    args: [address],
    query: { enabled: !!address },
  });

  const { writeContractAsync, isPending } = useScaffoldWriteContract({ contractName: "ClawdWorks" });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pitch.trim()) {
      notification.error("Pitch is required");
      return;
    }
    setSubmitting(true);
    try {
      // The contract expects a string treated as an IPFS pointer. Without
      // an upload backend we simply pass the typed pitch (prefixed with the
      // public handle) — any non-empty string is accepted by the contract.
      const payload = handle.trim() ? `${handle.trim()}: ${pitch.trim()}` : pitch.trim();
      await writeContractAsync({
        functionName: "expressSellerInterest",
        args: [payload],
      });
      notification.success("Interest submitted onchain.");
      setPitch("");
      setHandle("");
    } catch (err: any) {
      notification.error(err?.shortMessage || err?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (!address) {
    return (
      <div className="cw-card p-8 text-center">
        <p className="text-base-content/70 mb-5">Connect your wallet to express interest.</p>
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

  if (hasExpressed) {
    return (
      <div className="cw-card p-8 text-center">
        <p className="text-base-content/80 font-medium">Thanks — your interest is already on record.</p>
        <p className="text-sm text-base-content/60 mt-2">
          A curator will reach out via your public handle. Watch this space.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="cw-card p-6 space-y-4">
      <Field label="Public handle">
        <input
          value={handle}
          onChange={e => setHandle(e.target.value)}
          placeholder="@yourhandle, telegram, email…"
          className="input input-bordered w-full bg-base-100 text-sm"
        />
      </Field>

      <Field label="Pitch">
        <textarea
          value={pitch}
          onChange={e => setPitch(e.target.value)}
          rows={6}
          placeholder="What do you sell? Track record, examples, links."
          className="textarea textarea-bordered w-full bg-base-100 text-sm"
        />
      </Field>

      <button type="submit" disabled={submitting || isPending} className="btn btn-primary w-full">
        {(submitting || isPending) && <span className="loading loading-spinner loading-sm" />}
        Submit interest
      </button>

      <p className="text-xs text-base-content/50">
        This is a public onchain transaction. Don’t paste private keys, secrets, or PII you wouldn’t want to be
        permanently visible on Base.
      </p>
    </form>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-widest text-base-content/50">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);
