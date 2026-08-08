"use client";

import { useState } from "react";
import { X, GitFork } from "lucide-react";
import { createBranch } from "@/lib/api";
import type { BuildNodeData } from "@/lib/types";

const ATTRIBUTE_OPTIONS = [
  "offroad",
  "street",
  "sleek",
  "red",
  "blue",
  "black",
  "v8",
  "turbo",
  "lifted",
  "lowered",
  "underglow",
  "widebody",
  "livery",
];

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
  presetAttributes,
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
  const fromFilters = !!presetAttributes && presetAttributes.length > 0;
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [attrs, setAttrs] = useState<string[]>(
    fromFilters ? presetAttributes! : (parent?.attributes.slice(0, 3) ?? []),
  );
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) =>
    setAttrs((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const submit = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      const n = await createBranch([parentId], {
        title: title.trim(),
        attributes: attrs,
        summary: summary.trim() || `Fork of ${parent?.title ?? "build"}`,
      });
      onCreated(n);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="floating-modal w-full max-w-[420px] rounded-[24px] p-6"
        onClick={(e) => e.stopPropagation()}
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
                {fromFilters ? (
                  <>Pre-filled from your active filters</>
                ) : (
                  <>
                    Forking from{" "}
                    <span className="text-ink-soft">
                      {parent?.title ?? "root"}
                    </span>
                  </>
                )}
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
          Attributes
        </label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {ATTRIBUTE_OPTIONS.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              className={`chip focus-ring ${attrs.includes(o) ? "chip-active" : ""}`}
            >
              {o}
            </button>
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
      </div>
    </div>
  );
}
