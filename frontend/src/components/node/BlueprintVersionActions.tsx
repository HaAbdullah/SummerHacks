"use client";

import {
  AlertTriangle,
  Download,
  GitBranch,
  LoaderCircle,
  Upload,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { uploadNote } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media-url";
import type { Note } from "@/lib/types";

const MAX_BRANCH_BYTES = 25 * 1024 * 1024;
const ACCEPTED_BRANCH_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function safeFilename(note: Note) {
  const sourcePath = note.storagePath ?? note.mediaUrl ?? "";
  const extension = sourcePath.match(/\.(png|webp|jpe?g)(?:\?|$)/i)?.[1] ?? "jpg";
  const stem = note.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${stem || "engine-blueprint"}-source.${extension.toLowerCase()}`;
}

export function BlueprintVersionActions({
  note,
  nodeId,
  onCreated,
  compact = false,
}: {
  note: Note;
  nodeId: string;
  onCreated?: (created: Note) => void;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [branchFile, setBranchFile] = useState<File | null>(null);
  const [changeNote, setChangeNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaUrl = resolveMediaUrl(note.mediaUrl);
  const previewUrl = useMemo(
    () => (branchFile ? URL.createObjectURL(branchFile) : null),
    [branchFile],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const closeComposer = () => {
    if (submitting) return;
    setBranchFile(null);
    setChangeNote("");
    setError(null);
  };

  const chooseBranchFile = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_BRANCH_TYPES.has(file.type)) {
      setError("Choose a JPEG, PNG, or WebP blueprint image.");
      return;
    }
    if (file.size > MAX_BRANCH_BYTES) {
      setError("The branch image must be 25MB or smaller.");
      return;
    }
    setError(null);
    setBranchFile(file);
  };

  const downloadSource = async () => {
    if (!mediaUrl || downloading) return;
    setDownloading(true);
    setError(null);
    try {
      const response = await fetch(mediaUrl);
      if (!response.ok) throw new Error("download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = safeFilename(note);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(mediaUrl, "_blank", "noopener,noreferrer");
    } finally {
      setDownloading(false);
    }
  };

  const submitBranch = async () => {
    if (!branchFile || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const sourceTitle = note.title || "Engine blueprint";
      const detail = changeNote.trim();
      const created = await uploadNote(nodeId, branchFile, {
        kind: "blueprint",
        author: "You",
        title: `${sourceTitle.slice(0, 72)} - Branch version`,
        body: `Branch version of "${sourceTitle}".${detail ? ` ${detail}` : ""}`,
      });
      onCreated?.(created);
      setBranchFile(null);
      setChangeNote("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Branch upload failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className={`nodrag flex items-center ${compact ? "gap-1" : "gap-2"}`}>
        <button
          type="button"
          title="Download source blueprint"
          onClick={() => void downloadSource()}
          disabled={!mediaUrl || downloading}
          className={
            compact
              ? "focus-ring flex h-7 items-center gap-1 rounded-md border border-line bg-white/5 px-2 text-[9px] font-bold text-ink-soft hover:bg-white/10 disabled:opacity-40"
              : "btn btn-secondary focus-ring gap-1.5 disabled:opacity-40"
          }
        >
          {downloading ? (
            <LoaderCircle size={compact ? 11 : 13} className="animate-spin" />
          ) : (
            <Download size={compact ? 11 : 13} />
          )}
          Download
        </button>
        <button
          type="button"
          title="Upload an edited branch version"
          onClick={() => inputRef.current?.click()}
          className={
            compact
              ? "focus-ring flex h-7 items-center gap-1 rounded-md bg-accent px-2 text-[9px] font-bold text-white hover:bg-accent-hover"
              : "btn btn-primary focus-ring gap-1.5"
          }
        >
          <GitBranch size={compact ? 11 : 13} />
          Branch version
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          chooseBranchFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {branchFile && previewUrl && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-labelledby={`branch-blueprint-${note.id}`}
              onMouseDown={(event) => {
                if (event.currentTarget === event.target) closeComposer();
              }}
            >
              <div className="w-full max-w-lg overflow-hidden rounded-lg border border-line bg-bg shadow-2xl">
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-accent">
                      Blueprint branch
                    </p>
                    <h2
                      id={`branch-blueprint-${note.id}`}
                      className="heading-font mt-1 text-lg font-bold text-ink"
                    >
                      Submit edited version
                    </h2>
                  </div>
                  <button
                    type="button"
                    title="Close"
                    aria-label="Close"
                    onClick={closeComposer}
                    disabled={submitting}
                    className="focus-ring flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-white/5 hover:text-ink disabled:opacity-40"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4 p-5">
                  <div className="overflow-hidden rounded-md border border-line bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Edited blueprint branch preview"
                      className="max-h-72 w-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 text-xs">
                    <span className="min-w-0 truncate font-semibold text-ink">
                      {branchFile.name}
                    </span>
                    <span className="shrink-0 text-muted">
                      {(branchFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <label className="block">
                    <span className="mb-2 block text-[10px] font-bold uppercase text-muted">
                      Change note
                    </span>
                    <textarea
                      value={changeNote}
                      onChange={(event) => setChangeNote(event.target.value)}
                      placeholder="What changed in this version?"
                      className="input focus-ring h-auto min-h-24 py-2"
                    />
                  </label>
                  {error && (
                    <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-100">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                      <p>{error}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
                  <button
                    type="button"
                    onClick={closeComposer}
                    disabled={submitting}
                    className="btn btn-secondary focus-ring disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void submitBranch()}
                    disabled={submitting}
                    className="btn btn-primary focus-ring gap-1.5 disabled:opacity-50"
                  >
                    {submitting ? (
                      <LoaderCircle size={13} className="animate-spin" />
                    ) : (
                      <Upload size={13} />
                    )}
                    {submitting ? "Uploading" : "Submit branch"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
