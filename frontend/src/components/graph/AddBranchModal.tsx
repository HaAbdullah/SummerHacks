"use client";

import { useRef, useState } from "react";
import { X, GitFork, ImagePlus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { backdropVariants, modalPanelVariants } from "@/lib/motion";
import { createBranch } from "@/lib/api";
import type { BuildNodeData, Mods } from "@/lib/types";

const SLOT_LABELS: Record<keyof Mods, string> = {
  engine: "Engine",
  exhaust: "Exhaust",
  wheels: "Wheels",
  brakes: "Brakes",
};
const SLOT_HINTS: Record<keyof Mods, string> = {
  engine: "e.g. Garrett GT2860 turbo, 8psi",
  exhaust: "e.g. 3in catback",
  wheels: "e.g. 18in forged, all-terrain",
  brakes: "e.g. Brembo 4-pot, big brake kit",
};
const SLOTS: (keyof Mods)[] = ["engine", "exhaust", "wheels", "brakes"];

/**
 * Shared "new branch" modal — used for:
 *  - right-click-to-fork from an existing node
 *  - the "Start New Branch" button (defaults to the root node)
 *  - the empty-filter-match "Add a branch with these attributes" prompt
 * All three flows funnel through `useAppStore().openAddBranchModal`, so this
 * is the single place `createBranch` is called from the graph UI.
 */
export function AddBranchModal({
  parentId,
  nodes,
  onClose,
  onCreated,
}: {
  parentId: string;
  nodes: BuildNodeData[];
  presetAttributes?: string[];
  onClose: () => void;
  onCreated: (n: BuildNodeData) => void;
}) {
  const parent = nodes.find((n) => n.id === parentId);
  const carId = parent?.carId ?? nodes[0]?.carId ?? "";
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [mods, setMods] = useState<Mods>({
    engine: parent?.mods.engine ?? "",
    exhaust: parent?.mods.exhaust ?? "",
    wheels: parent?.mods.wheels ?? "",
    brakes: parent?.mods.brakes ?? "",
  });
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const setSlot = (slot: keyof Mods, value: string) =>
    setMods((m) => ({ ...m, [slot]: value }));

  const onPickFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setHeroImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!title.trim() || !carId || busy) return;
    setBusy(true);
    try {
      const n = await createBranch(carId, [parentId], {
        title: title.trim(),
        mods,
        summary: summary.trim() || `Fork of ${parent?.title ?? "build"}`,
        heroImage: heroImage ?? undefined,
      });
      onCreated(n);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      variants={backdropVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        variants={modalPanelVariants}
        onClick={(e) => e.stopPropagation()}
        className="floating-modal max-h-[min(90vh,760px)] w-full max-w-[440px] overflow-y-auto rounded-[24px] p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <GitFork className="h-4 w-4" />
            </div>
            <div>
              <h3 className="heading-font text-[17px] font-bold text-ink">
                New Branch
              </h3>
              <p className="mt-0.5 text-[12px] text-muted">
                Forking from{" "}
                <span className="text-ink-soft">{parent?.title ?? "root"}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-muted transition-colors hover:bg-white/10 hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Cover image — becomes the graph circle */}
        <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted">
          Cover image
        </label>
        <div className="mt-1.5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`
              focus-ring relative flex h-16 w-16 shrink-0 items-center justify-center
              overflow-hidden rounded-full border border-dashed
              transition-colors
              ${
                heroImage
                  ? "border-white/20"
                  : "border-line-strong bg-white/[0.03] text-muted hover:border-white/25 hover:bg-white/[0.05] hover:text-ink-soft"
              }
            `}
            aria-label="Choose cover image"
          >
            {heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroImage}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[12px] leading-snug text-ink-soft">
              Shown as the circle on the graph.
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="btn btn-secondary focus-ring !h-7 !px-2.5 !text-[11px]"
              >
                {heroImage ? "Change" : "Upload"}
              </button>
              {heroImage && (
                <button
                  type="button"
                  onClick={() => setHeroImage(null)}
                  className="btn btn-ghost focus-ring !h-7 !px-2 !text-[11px] text-muted"
                  aria-label="Remove image"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              onPickFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        <label className="mt-4 block text-[10px] font-black uppercase tracking-[0.15em] text-muted">
          Title
        </label>
        <input
          className="input focus-ring mt-1.5"
          placeholder="e.g. V8 Overland Spec"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />

        <label className="mt-3 block text-[10px] font-black uppercase tracking-[0.15em] text-muted">
          Summary
        </label>
        <textarea
          className="input focus-ring mt-1.5 h-auto min-h-[64px] py-2"
          placeholder="What makes this branch different?"
          rows={2}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />

        <label className="mt-3 block text-[10px] font-black uppercase tracking-[0.15em] text-muted">
          Mods
        </label>
        <p className="mt-0.5 text-[11px] text-muted-2">
          Prefilled from the parent — edit the slot this branch changes.
        </p>
        <div className="mt-1.5 space-y-2">
          {SLOTS.map((slot) => (
            <div key={slot}>
              <label className="mb-1 block text-[10px] font-semibold text-muted">
                {SLOT_LABELS[slot]}
              </label>
              <input
                className="input focus-ring"
                placeholder={SLOT_HINTS[slot]}
                value={mods[slot]}
                onChange={(e) => setSlot(slot, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={busy || !title.trim()}
            className="btn btn-primary btn-lg focus-ring flex-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create branch"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-lg focus-ring"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
