"use client";

import { useState } from "react";
import { AddressInput } from "@scaffold-ui/components";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { parseClawd } from "~~/utils/clawdworks";
import { notification } from "~~/utils/scaffold-eth";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

export const CreateListingForm = () => {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("7");
  const [maxOverride, setMaxOverride] = useState("0");
  const [whitelist, setWhitelist] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { writeContractAsync, isPending } = useScaffoldWriteContract({ contractName: "ClawdWorks" });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      notification.error("Title is required");
      return;
    }
    setSubmitting(true);
    try {
      await writeContractAsync({
        functionName: "createListing",
        args: [
          title.trim(),
          desc.trim(),
          parseClawd(price || "0"),
          BigInt(days || "0"),
          BigInt(maxOverride || "0"),
          (whitelist || ZERO) as `0x${string}`,
        ],
      });
      notification.success("Listing created.");
      setTitle("");
      setDesc("");
      setPrice("");
      setDays("7");
      setMaxOverride("0");
      setWhitelist("");
    } catch (err: any) {
      notification.error(err?.shortMessage || err?.message || "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="cw-card p-5 space-y-3 lg:sticky lg:top-6">
      <h2 className="font-semibold tracking-tight">Create listing</h2>

      <Field label="Title">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="input input-bordered w-full bg-base-100 text-sm"
          placeholder="e.g. Smart contract audit (1 day)"
        />
      </Field>

      <Field label="Description">
        <textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          rows={3}
          className="textarea textarea-bordered w-full bg-base-100 text-sm"
          placeholder="Plain text or an IPFS hash (Qm…)"
        />
        <p className="text-[10px] text-base-content/50 mt-1">
          <strong>Plain text</strong>: visible to anyone, no upload needed. <strong>IPFS hash</strong>: rich/formatted
          content stored offchain.
        </p>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Price (CLAWD)">
          <input
            value={price}
            onChange={e => setPrice(e.target.value)}
            inputMode="decimal"
            className="input input-bordered w-full bg-base-100 text-sm"
            placeholder="500000"
          />
        </Field>
        <Field label="Delivery (days)">
          <input
            value={days}
            onChange={e => setDays(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            className="input input-bordered w-full bg-base-100 text-sm"
          />
        </Field>
      </div>

      <Field label="Max concurrent (0 = default)">
        <input
          value={maxOverride}
          onChange={e => setMaxOverride(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          className="input input-bordered w-full bg-base-100 text-sm"
        />
      </Field>

      <Field label="Whitelisted buyer (optional)">
        <AddressInput value={whitelist} onChange={setWhitelist} placeholder="0x… or leave blank for public" />
      </Field>

      <button type="submit" disabled={submitting || isPending} className="btn btn-primary w-full">
        {(submitting || isPending) && <span className="loading loading-spinner loading-sm" />}
        Create listing
      </button>
    </form>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-widest text-base-content/50">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);
