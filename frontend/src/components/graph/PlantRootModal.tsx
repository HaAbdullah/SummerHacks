"use client";

import { useRef, useState } from "react";
import { X, Sprout, ImagePlus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { backdropVariants, modalPanelVariants } from "@/lib/motion";
import { createBranch } from "@/lib/api";
import type { Car, Mods } from "@/lib/types";

const SLOT_LABELS: Record<keyof Mods, string> = {
  engine: "Engine",
  exhaust: "Exhaust",
  wheels: "Wheels",
  brakes: "Brakes",
};
const SLOT_HINTS: Record<keyof Mods, string> = {
  engine: "leave blank for stock, or e.g. turbo kit",
  exhaust: "leave blank for stock",
  wheels: "leave blank for stock",
  brakes: "leave blank for stock",
};
const SLOTS: (keyof Mods)[] = ["engine", "exhaust", "wheels", "brakes"];

/**
 * First-build modal for an empty garage — plants the root node (parentIds = []).
 */
export function PlantRootModal({
  carId,
  car,
  onClose,
  onCreated,
}: {
  carId: string;
  car: Car | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const model = car?.model ?? "build";
  const [title, setTitle] = useState(`Stock ${model}`);
  const [summary, setSummary] = useState(
    "Factory baseline. The trunk everything grows from.",
  );
  const [mods, setMods] = useState<Mods>({
    engine: "",
    exhaust: "",
    wheels: "",
    brakes: "",
  });
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await createBranch(carId, [], {
        title: title.trim(),
        mods,
        summary:
          summary.trim() ||
          "Factory baseline. The trunk everything grows from.",
        heroImage: heroImage ?? undefined,
        createdBy: "You",
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create node");
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
              <Sprout className="h-4 w-4" />
            </div>
            <div>
              <h3 className="heading-font text-[17px] font-bold text-ink">
                Create first node
              </h3>
              <p className="mt-0.5 text-[12px] text-muted">
                You&apos;re planting the root for{" "}
                <span className="text-ink-soft">
                  {car ? `${car.make} ${car.model}` : "this car"}
                </span>
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

        <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted">
          Cover image
        </label>
        <div className="mt-1.5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`
              focus-ring relative flex h-16 w-16 shrink-0 items-center justify-center
              overflow-hidden rounded-full border border-dashed transition-colors
              ${
                heroImage
                  ? "border-white/20"
                  : "border-line-strong bg-white/[0.03] text-muted hover:border-white/25 hover:bg-white/[0.05]"
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
          placeholder={`e.g. Stock ${model}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />

        <label className="mt-3 block text-[10px] font-black uppercase tracking-[0.15em] text-muted">
          Summary
        </label>
        <textarea
          className="input focus-ring mt-1.5 h-auto min-h-[64px] py-2"
          placeholder="What is this starting point?"
          rows={2}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />

        <label className="mt-3 block text-[10px] font-black uppercase tracking-[0.15em] text-muted">
          Mods
        </label>
        <p className="mt-0.5 text-[11px] text-muted-2">
          Leave blank for a pure stock root — or fill slots if your first node
          is already a modded build.
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

        {error && (
          <p className="mt-3 text-[12px] text-danger">{error}</p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || !title.trim()}
            className="btn btn-primary btn-lg focus-ring flex-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Creating…" : "Plant root"}
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
