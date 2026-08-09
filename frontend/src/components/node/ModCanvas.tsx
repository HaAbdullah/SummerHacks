"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Node,
  type NodeProps,
  type OnNodeDrag,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Mic, Upload, PenLine, ZoomIn, ZoomOut } from "lucide-react";
import { addNote, updateNotePosition, uploadNote } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media-url";
import type { Note } from "@/lib/types";
import { BlueprintVersionActions } from "@/components/node/BlueprintVersionActions";

const YOU = "#5e6ad2";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Freeform "clumps of postings" default layout
//
// Notes are grouped into small clumps (2-4 cards each, in array order). Each
// clump gets an anchor point on a loose brick-pattern grid; members scatter
// around their clump's anchor at fixed, non-overlapping slot offsets plus a
// small deterministic jitter derived from the note id (never Math.random() —
// must be stable across re-renders so it doesn't fight the user's drags).
// This is ONLY the default layout: once a card has a position (in React
// Flow's node state) it is never recomputed, only ever moved by dragging.
// The board itself is React Flow's normal infinite pan/zoom canvas — the
// same exact mechanism the tree/graph view uses — so there's no "out of
// view" concern; any position, including negative ones, is reachable by
// panning.
// ---------------------------------------------------------------------------

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const CARD_W = 280;
const CLUMP_COLS = 3;
const CELL_W = 760;
const CELL_H = 860;
const MARGIN_X = 200;
const MARGIN_Y = 200;

/** Fixed 2x2 offsets from a clump anchor, spaced wide enough that up to 4
 *  ~300x360 cards (generous envelope for the tallest media card) plus a
 *  small per-card jitter never overlap each other. */
const CLUMP_SLOTS = [
  { dx: -175, dy: -205 },
  { dx: 175, dy: -205 },
  { dx: -175, dy: 205 },
  { dx: 175, dy: 205 },
];

function clumpMemberCount(clumpIndex: number): number {
  return 2 + (hashStr(`clump-size-${clumpIndex}`) % 3); // 2, 3, or 4
}

function clumpAnchor(clumpIndex: number): { x: number; y: number } {
  const col = clumpIndex % CLUMP_COLS;
  const row = Math.floor(clumpIndex / CLUMP_COLS);
  const h = hashStr(`clump-anchor-${clumpIndex}`);
  const jitterX = (h % 60) - 30;
  const jitterY = ((h >>> 8) % 60) - 30;
  const stagger = row % 2 === 1 ? CELL_W / 2 : 0; // brick-pattern rows
  return {
    x: MARGIN_X + col * CELL_W + stagger + jitterX,
    y: MARGIN_Y + row * CELL_H + jitterY,
  };
}

function memberJitter(id: string): { dx: number; dy: number } {
  const h = hashStr(id);
  return {
    dx: (h % 25) - 12,
    dy: ((h >>> 8) % 25) - 12,
  };
}

/** Deterministic default position for the Nth note ever discovered (N =
 *  count of notes already positioned). Never touches already-placed notes. */
function clumpPositionForOrdinal(
  ordinal: number,
  noteId: string,
): { x: number; y: number } {
  let clumpIndex = 0;
  let remaining = ordinal;
  let size = clumpMemberCount(clumpIndex);
  while (remaining >= size) {
    remaining -= size;
    clumpIndex += 1;
    size = clumpMemberCount(clumpIndex);
  }
  const slot = CLUMP_SLOTS[remaining % CLUMP_SLOTS.length];
  const anchor = clumpAnchor(clumpIndex);
  const jitter = memberJitter(noteId);
  return {
    x: anchor.x + slot.dx + jitter.dx,
    y: anchor.y + slot.dy + jitter.dy,
  };
}

function GalleryCard({
  note,
  carId,
  nodeId,
  onBlueprintVersionCreated,
}: {
  note: Note;
  carId: string;
  nodeId: string;
  onBlueprintVersionCreated: (created: Note) => void;
}) {
  const router = useRouter();
  const mediaSrc = resolveMediaUrl(note.mediaUrl);
  const hasMedia =
    (note.kind === "image" ||
      note.kind === "sketch" ||
      note.kind === "video" ||
      note.kind === "blueprint") &&
    !!mediaSrc;

  return (
    <div className="canvas-card flex h-fit flex-col rounded-2xl p-4">
      <div className="mb-4 flex items-center gap-2">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white"
          style={{ background: note.avatarColor }}
        >
          {note.author.slice(0, 1).toUpperCase()}
        </span>
        <span className="truncate text-[10px] font-bold text-muted">
          @{note.author}
        </span>
      </div>

      {hasMedia && (
        <div className="mb-4 aspect-video overflow-hidden rounded-xl bg-black/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaSrc}
            alt={note.body ?? note.kind}
            className="h-full w-full object-contain bg-white"
            draggable={false}
          />
        </div>
      )}

      {note.kind === "voice" && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-line bg-white/5 p-4">
          <Mic size={22} className="shrink-0 text-accent" />
          <div className="min-w-0">
            <span className="block truncate text-[10px] font-bold text-ink">
              {note.body ?? "Voice note"}
            </span>
            <span className="block text-[9px] text-muted">
              {note.durationSec ?? 0}s
            </span>
          </div>
        </div>
      )}

      {!hasMedia && note.kind !== "voice" && (
        <div className="mb-4 rounded-xl border border-line bg-white/5 p-4">
          <p className="line-clamp-3 text-[11px] leading-relaxed text-ink-soft">
            {note.body}
          </p>
        </div>
      )}

      {hasMedia && note.body && (
        <p className="mb-1 line-clamp-2 text-[11px] font-bold text-ink">
          {note.body}
        </p>
      )}

      {note.kind === "blueprint" && mediaSrc && (
        <div className="mb-3 mt-2 border-t border-line pt-3">
          <BlueprintVersionActions
            note={note}
            nodeId={nodeId}
            onCreated={onBlueprintVersionCreated}
            compact
          />
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-1">
        <span className="text-[10px] text-muted-2">
          {timeAgo(note.createdAt)}
        </span>
        <button
          type="button"
          onClick={() =>
            router.push(`/garage/${carId}/node/${nodeId}/contribution/${note.id}`)
          }
          className="nodrag rounded-lg bg-accent px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          Reply
        </button>
      </div>
    </div>
  );
}

type PostingFlowNode = Node<
  {
    note: Note;
    carId: string;
    nodeId: string;
    onBlueprintVersionCreated: (created: Note) => void;
  },
  "posting"
>;

function PostingNode({ data }: NodeProps<PostingFlowNode>) {
  return (
    <div style={{ width: CARD_W }}>
      <GalleryCard
        note={data.note}
        carId={data.carId}
        nodeId={data.nodeId}
        onBlueprintVersionCreated={data.onBlueprintVersionCreated}
      />
    </div>
  );
}

const nodeTypes = { posting: PostingNode };

function BoardInner({
  carId,
  nodeId,
  notes,
  onNotesChange,
}: {
  carId: string;
  nodeId: string;
  notes: Note[];
  onNotesChange: (notes: Note[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [sketchOn, setSketchOn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [noteComposerOn, setNoteComposerOn] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  // Photos get their own caption modal before landing on the board — a
  // small queue so dropping/selecting several images composes them one at
  // a time instead of dumping them in untitled.
  const [imageQueue, setImageQueue] = useState<File[]>([]);
  const [imageCaption, setImageCaption] = useState("");
  const currentImage = imageQueue[0] ?? null;

  const imagePreviewUrl = useMemo(
    () => (currentImage ? URL.createObjectURL(currentImage) : null),
    [currentImage],
  );

  // Release the previous object URL once we've moved past it.
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  // Reset the caption draft when the composer advances to a new image
  // (React-sanctioned "adjust state during render" — see
  // react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  const lastComposedImage = useRef<File | null>(null);
  if (lastComposedImage.current !== currentImage) {
    lastComposedImage.current = currentImage;
    if (imageCaption !== "") setImageCaption("");
  }

  const [zoomPct, setZoomPct] = useState(100);
  const entered = useRef(false);
  const { zoomIn, zoomOut, getZoom, fitView } = useReactFlow();

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<PostingFlowNode>(
    [],
  );

  const onBlueprintVersionCreated = useCallback(
    (created: Note) => onNotesChange([created, ...notes]),
    [notes, onNotesChange],
  );

  // Merge `notes` into React Flow's node state: keep existing nodes' current
  // (possibly user-dragged) positions untouched, only assign a fresh clump
  // position to ids we've never seen before.
  useEffect(() => {
    setRfNodes((prev) => {
      const byId = new Map(prev.map((n) => [n.id, n]));
      let ordinal = prev.length;
      const next: PostingFlowNode[] = [];
      for (const nt of notes) {
        const existing = byId.get(nt.id);
        if (existing) {
          next.push({
            ...existing,
            data: { note: nt, carId, nodeId, onBlueprintVersionCreated },
          });
        } else {
          const pos = clumpPositionForOrdinal(ordinal, nt.id);
          ordinal += 1;
          next.push({
            id: nt.id,
            type: "posting",
            position: pos,
            data: { note: nt, carId, nodeId, onBlueprintVersionCreated },
          });
        }
      }
      return next;
    });
  }, [notes, carId, nodeId, onBlueprintVersionCreated, setRfNodes]);

  useEffect(() => {
    if (!entered.current && rfNodes.length > 0) {
      entered.current = true;
      requestAnimationFrame(() => {
        fitView({ padding: 0.3, duration: 500, maxZoom: 1 });
      });
    }
  }, [rfNodes, fitView]);

  const onNodeDragStop: OnNodeDrag<PostingFlowNode> = (_e, node) => {
    void updateNotePosition(node.id, {
      canvasX: node.position.x,
      canvasY: node.position.y,
    });
  };

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const images = arr.filter((f) => f.type.startsWith("image/"));
    const audios = arr.filter((f) => f.type.startsWith("audio/"));

    if (images.length > 0) {
      setImageQueue((q) => [...q, ...images]);
    }

    if (audios.length > 0) {
      const next = [...notes];
      for (const file of audios) {
        const created = await uploadNote(nodeId, file, {
          kind: "voice",
          author: "You",
          body: file.name,
        });
        next.unshift(created);
      }
      onNotesChange(next);
    }
  };

  const submitImageComposer = async () => {
    const file = imageQueue[0];
    if (!file) return;
    const created = await uploadNote(nodeId, file, {
      kind: "image",
      author: "You",
      body: imageCaption.trim() || file.name,
    });
    onNotesChange([created, ...notes]);
    setImageQueue((q) => q.slice(1));
  };

  const skipImageComposer = () => {
    setImageQueue((q) => q.slice(1));
  };

  const openNoteComposer = () => {
    setNoteDraft("");
    setNoteComposerOn(true);
  };

  const submitNoteComposer = async () => {
    const body = noteDraft.trim();
    if (!body) return;
    const created = await addNote(nodeId, {
      nodeId,
      author: "You",
      avatarColor: YOU,
      kind: "text",
      body,
    });
    onNotesChange([created, ...notes]);
    setNoteComposerOn(false);
    setNoteDraft("");
  };

  const attachSketch = async () => {
    const c = canvasRef.current;
    if (!c) return;
    const blob = await new Promise<Blob | null>((resolve) =>
      c.toBlob(resolve, "image/png"),
    );
    if (!blob) return;
    const created = await uploadNote(nodeId, blob, {
      kind: "sketch",
      author: "You",
      body: "Sketch",
      filename: "sketch.png",
    });
    onNotesChange([created, ...notes]);
    setSketchOn(false);
  };

  const startSketch = () => {
    setSketchOn(true);
    requestAnimationFrame(() => {
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.strokeStyle = "#171717";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
    });
  };

  const recordVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size) chunks.push(ev.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        const created = await uploadNote(nodeId, blob, {
          kind: "voice",
          author: "You",
          body: "Voice note",
          durationSec: 5,
          filename: "voice-note.webm",
        });
        onNotesChange([created, ...notes]);
      };
      rec.start();
      setTimeout(() => rec.stop(), 4000);
    } catch {
      const created = await addNote(nodeId, {
        nodeId,
        author: "You",
        avatarColor: YOU,
        kind: "voice",
        body: "Mic blocked — sample attached.",
        durationSec: 8,
      });
      onNotesChange([created, ...notes]);
    }
  };

  return (
    <div className="relative flex h-full min-w-0 flex-1 flex-col bg-bg">
      <header className="relative z-10 flex shrink-0 items-center justify-between p-6">
        <div className="flex items-center gap-3 rounded-full border border-line bg-black/60 px-4 py-2 backdrop-blur-md">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          <span className="text-xs font-bold uppercase tracking-tight">
            Node Gallery
          </span>
        </div>

        <div className="flex items-center gap-0.5 rounded-[var(--radius)] border border-line bg-surface p-0.5 shadow-[var(--shadow-sm)]">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="btn btn-ghost focus-ring !h-8 gap-1.5"
          >
            <Upload size={13} /> Image
          </button>
          <button
            type="button"
            onClick={startSketch}
            className="btn btn-ghost focus-ring !h-8 gap-1.5"
          >
            <PenLine size={13} /> Sketch
          </button>
          <button
            type="button"
            onClick={() => void recordVoice()}
            className="btn btn-ghost focus-ring !h-8 gap-1.5"
          >
            <Mic size={13} /> Voice
          </button>
          <button
            type="button"
            onClick={openNoteComposer}
            className="btn btn-ghost focus-ring !h-8"
          >
            Note
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*,audio/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </header>

      {/* The board is a real React Flow canvas — the same pan/zoom engine
          as the tree/graph view — so dragging empty space to pan, scroll to
          pan, and ctrl/cmd+scroll or pinch to zoom all just work exactly
          like they do there. */}
      <div
        className="canvas-grid relative min-h-0 flex-1"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files?.length) {
            void handleFiles(e.dataTransfer.files);
          }
        }}
      >
        <ReactFlow
          nodes={rfNodes}
          edges={[]}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeDragStop={onNodeDragStop}
          onMove={(_, v) => setZoomPct(Math.round(v.zoom * 100))}
          nodesConnectable={false}
          elementsSelectable
          panOnScroll
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          className="!bg-transparent"
        />

        {notes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="max-w-xs text-center text-ui text-muted">
              Drop images and notes anywhere to start this node&rsquo;s board.
            </p>
          </div>
        )}

        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-0.5 rounded-[var(--radius)] border border-line bg-surface p-0.5 shadow-[var(--shadow-sm)]">
          <button
            type="button"
            className="btn btn-ghost focus-ring !h-7 !w-7 !px-0"
            onClick={() => {
              zoomOut({ duration: 180 });
              setZoomPct(Math.round(getZoom() * 100));
            }}
          >
            <ZoomOut size={13} />
          </button>
          <span className="min-w-[2.75rem] text-center text-[11px] font-medium tabular-nums text-muted">
            {zoomPct}%
          </span>
          <button
            type="button"
            className="btn btn-ghost focus-ring !h-7 !w-7 !px-0"
            onClick={() => {
              zoomIn({ duration: 180 });
              setZoomPct(Math.round(getZoom() * 100));
            }}
          >
            <ZoomIn size={13} />
          </button>
        </div>
      </div>

      {noteComposerOn && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-ink/20 p-6 backdrop-blur-[2px]"
          onClick={() => setNoteComposerOn(false)}
        >
          <div
            className="w-full max-w-[420px] rounded-[var(--radius-md)] border border-line bg-surface p-4 shadow-[var(--shadow-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[13px] font-semibold tracking-tight text-ink">
              New note
            </p>
            <textarea
              autoFocus
              className="input focus-ring mt-2.5 h-auto min-h-[100px] py-2"
              placeholder="Write your note…"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  void submitNoteComposer();
                }
              }}
            />
            <div className="mt-2.5 flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setNoteComposerOn(false)}
                className="btn btn-secondary focus-ring"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitNoteComposer()}
                disabled={!noteDraft.trim()}
                className="btn btn-primary focus-ring disabled:opacity-50"
              >
                Add to board
              </button>
            </div>
          </div>
        </div>
      )}

      {imageQueue.length > 0 && imagePreviewUrl && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-ink/20 p-6 backdrop-blur-[2px]">
          <div className="w-full max-w-[420px] rounded-[var(--radius-md)] border border-line bg-surface p-4 shadow-[var(--shadow-lg)]">
            <p className="text-[13px] font-semibold tracking-tight text-ink">
              Add photo
              {imageQueue.length > 1 ? ` (1 of ${imageQueue.length})` : ""}
            </p>
            <div className="mt-2.5 overflow-hidden rounded-xl bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreviewUrl}
                alt=""
                className="max-h-[260px] w-full object-cover"
              />
            </div>
            <textarea
              autoFocus
              className="input focus-ring mt-2.5 h-auto min-h-[70px] py-2"
              placeholder="Add a caption…"
              value={imageCaption}
              onChange={(e) => setImageCaption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  void submitImageComposer();
                }
              }}
            />
            <div className="mt-2.5 flex justify-end gap-1.5">
              <button
                type="button"
                onClick={skipImageComposer}
                className="btn btn-secondary focus-ring"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={() => void submitImageComposer()}
                className="btn btn-primary focus-ring"
              >
                Add to board
              </button>
            </div>
          </div>
        </div>
      )}

      {sketchOn && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-ink/20 p-6 backdrop-blur-[2px]">
          <div className="rounded-[var(--radius-md)] border border-line bg-surface p-3 shadow-[var(--shadow-lg)]">
            <canvas
              ref={canvasRef}
              width={440}
              height={280}
              className="rounded-[var(--radius-sm)] border border-line bg-white touch-none"
              onMouseDown={(e) => {
                drawing.current = true;
                const c = canvasRef.current!;
                const ctx = c.getContext("2d")!;
                const r = c.getBoundingClientRect();
                const sx = c.width / r.width;
                const sy = c.height / r.height;
                ctx.strokeStyle = "#171717";
                ctx.lineWidth = 2;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.beginPath();
                ctx.moveTo(
                  (e.clientX - r.left) * sx,
                  (e.clientY - r.top) * sy,
                );
              }}
              onMouseMove={(e) => {
                if (!drawing.current || !canvasRef.current) return;
                const c = canvasRef.current;
                const ctx = c.getContext("2d")!;
                const r = c.getBoundingClientRect();
                const sx = c.width / r.width;
                const sy = c.height / r.height;
                ctx.lineTo(
                  (e.clientX - r.left) * sx,
                  (e.clientY - r.top) * sy,
                );
                ctx.stroke();
              }}
              onMouseUp={() => {
                drawing.current = false;
              }}
              onMouseLeave={() => {
                drawing.current = false;
              }}
            />
            <div className="mt-2.5 flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setSketchOn(false)}
                className="btn btn-secondary focus-ring"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void attachSketch()}
                className="btn btn-primary focus-ring"
              >
                Add to board
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ModCanvas(props: {
  carId: string;
  nodeId: string;
  notes: Note[];
  onNotesChange: (notes: Note[]) => void;
}) {
  return (
    <ReactFlowProvider>
      <BoardInner {...props} />
    </ReactFlowProvider>
  );
}
