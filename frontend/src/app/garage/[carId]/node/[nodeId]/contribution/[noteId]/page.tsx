"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mic, PenLine, Send, Upload } from "lucide-react";
import {
  addContributionReply,
  getContribution,
  getContributionReplies,
  uploadContributionReply,
} from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media-url";
import type { Note, NoteReply } from "@/lib/types";
import { BlueprintVersionActions } from "@/components/node/BlueprintVersionActions";

function replyHasMedia(r: NoteReply): boolean {
  return (
    (r.kind === "image" || r.kind === "sketch" || r.kind === "video" || r.kind === "blueprint") &&
    !!resolveMediaUrl(r.mediaUrl)
  );
}

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

export default function ContributionPage({
  params,
}: {
  params: Promise<{ carId: string; nodeId: string; noteId: string }>;
}) {
  const { carId, nodeId, noteId } = use(params);
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [replies, setReplies] = useState<NoteReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Reply composer: text is the default (the input row below), Image/Sketch/Voice are
  // the same three physical-input options a post gets, scoped to this one contribution.
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageCaption, setImageCaption] = useState("");
  const imagePreviewUrl = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : null),
    [imageFile],
  );
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const [sketchOn, setSketchOn] = useState(false);
  const [sketchTitle, setSketchTitle] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const [recordingVoice, setRecordingVoice] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [n, r] = await Promise.all([
          getContribution(noteId),
          getContributionReplies(noteId),
        ]);
        if (cancelled) return;
        setNote(n);
        setReplies(r);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [noteId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies]);

  const send = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const body = input.trim();
    setInput("");
    try {
      const r = await addContributionReply(noteId, body);
      setReplies((prev) => [...prev, r]);
    } finally {
      setSending(false);
    }
  };

  const submitImageReply = async () => {
    if (!imageFile || sending) return;
    setSending(true);
    try {
      const r = await uploadContributionReply(noteId, imageFile, {
        kind: "image",
        author: "You",
        body: imageCaption.trim() || imageFile.name,
      });
      setReplies((prev) => [...prev, r]);
    } finally {
      setSending(false);
      setImageFile(null);
      setImageCaption("");
    }
  };

  const startSketchReply = () => {
    setSketchTitle("");
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

  const submitSketchReply = async () => {
    const c = canvasRef.current;
    if (!c || sending) return;
    const blob = await new Promise<Blob | null>((resolve) =>
      c.toBlob(resolve, "image/png"),
    );
    if (!blob) return;
    setSending(true);
    try {
      const r = await uploadContributionReply(noteId, blob, {
        kind: "sketch",
        author: "You",
        body: sketchTitle.trim() || "Sketch",
        filename: "sketch.png",
      });
      setReplies((prev) => [...prev, r]);
    } finally {
      setSending(false);
      setSketchOn(false);
    }
  };

  const recordVoiceReply = async () => {
    if (recordingVoice) return;
    setRecordingVoice(true);
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
        try {
          const r = await uploadContributionReply(noteId, blob, {
            kind: "voice",
            author: "You",
            body: "Voice reply",
            durationSec: 4,
            filename: "voice-reply.webm",
          });
          setReplies((prev) => [...prev, r]);
        } finally {
          setRecordingVoice(false);
        }
      };
      rec.start();
      setTimeout(() => rec.stop(), 4000);
    } catch {
      setRecordingVoice(false);
    }
  };

  if (loading || !note) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg text-ui text-muted">
        Opening contribution…
      </div>
    );
  }

  const mediaSrc = resolveMediaUrl(note.mediaUrl);
  const hasMedia =
    (note.kind === "image" ||
      note.kind === "sketch" ||
      note.kind === "video" ||
      note.kind === "blueprint") &&
    !!mediaSrc;

  return (
    <div className="flex h-screen flex-col bg-bg">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-6 py-4">
        <Link
          href={`/garage/${carId}/node/${nodeId}`}
          className="focus-ring btn btn-ghost !h-8 gap-1.5"
        >
          <ArrowLeft size={14} /> Back to Node
        </Link>
        <div className="h-3.5 w-px bg-line" />
        <p className="text-[12px] text-muted">
          A single contribution — replies here are just about this post, not
          the whole build.
        </p>
      </header>

      <div className="scroll-soft mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col overflow-y-auto px-6 py-8">
        <div className="canvas-card rounded-2xl p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
              style={{ background: note.avatarColor }}
            >
              {note.author.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold text-ink">
                @{note.author}
              </p>
              <p className="text-[11px] text-muted-2">
                {timeAgo(note.createdAt)}
              </p>
            </div>
          </div>

          {hasMedia && (
            <div className="mb-4 overflow-hidden rounded-xl bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaSrc}
                alt={note.body ?? note.kind}
                className={`max-h-[480px] w-full ${
                  note.kind === "sketch" ? "object-contain bg-white" : "object-cover"
                }`}
              />
            </div>
          )}

          {note.kind === "voice" && (
            <div className="mb-4 flex flex-col gap-2.5 rounded-xl border border-line bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <Mic size={24} className="shrink-0 text-accent" />
                <div className="min-w-0">
                  <span className="block text-[12px] font-bold text-ink">
                    {note.body ?? "Voice note"}
                  </span>
                  <span className="block text-[10px] text-muted">
                    {note.durationSec ?? 0}s
                  </span>
                </div>
              </div>
              {mediaSrc && <audio controls src={mediaSrc} className="h-8 w-full" />}
            </div>
          )}

          {(!hasMedia && note.kind !== "voice") || (hasMedia && note.body) ? (
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">
              {note.body}
            </p>
          ) : null}

          {note.kind === "blueprint" && mediaSrc && (
            <div className="mt-5 flex justify-end border-t border-line pt-4">
              <BlueprintVersionActions
                note={note}
                nodeId={nodeId}
                onCreated={(created) =>
                  router.push(
                    `/garage/${encodeURIComponent(carId)}/node/${encodeURIComponent(nodeId)}/contribution/${encodeURIComponent(created.id)}`,
                  )
                }
              />
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center gap-2">
          <h2 className="heading-font text-[13px] font-bold text-ink">
            Replies
          </h2>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-muted">
            {replies.length}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {replies.map((r) => {
            const replyMediaSrc = resolveMediaUrl(r.mediaUrl);
            const hasReplyMedia = replyHasMedia(r);
            return (
              <div key={r.id} className="flex gap-2.5">
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ background: r.avatarColor }}
                >
                  {r.author.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-muted">
                    @{r.author}{" "}
                    <span className="text-muted-2">· {timeAgo(r.createdAt)}</span>
                  </p>

                  {hasReplyMedia && (
                    <div className="mt-1 overflow-hidden rounded-xl bg-black/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={replyMediaSrc}
                        alt={r.body || r.kind}
                        className={`max-h-[280px] w-full ${
                          r.kind === "sketch" ? "object-contain bg-white" : "object-cover"
                        }`}
                      />
                    </div>
                  )}

                  {r.kind === "voice" && (
                    <div className="mt-1 flex flex-col gap-2 rounded-xl border border-line bg-white/5 p-3">
                      <div className="flex items-center gap-2">
                        <Mic size={16} className="shrink-0 text-accent" />
                        <span className="text-[12px] font-bold text-ink">
                          {r.body || "Voice reply"}
                        </span>
                      </div>
                      {replyMediaSrc && (
                        <audio controls src={replyMediaSrc} className="h-8 w-full" />
                      )}
                    </div>
                  )}

                  {(!hasReplyMedia && r.kind !== "voice" && r.body) ||
                  (hasReplyMedia && r.body) ? (
                    <div className="chat-bubble mt-1 px-3 py-2 text-[13px] leading-relaxed text-ink-soft">
                      {r.body}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}

          {replies.length === 0 && (
            <p className="text-ui text-muted">
              No replies yet — be the first to weigh in on this contribution.
            </p>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl shrink-0 border-t border-line px-6 py-4">
        <div className="mb-2 flex items-center gap-0.5 rounded-[var(--radius)] border border-line bg-surface p-0.5 shadow-[var(--shadow-sm)]">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="btn btn-ghost focus-ring !h-8 gap-1.5"
          >
            <Upload size={13} /> Image
          </button>
          <button
            type="button"
            onClick={startSketchReply}
            className="btn btn-ghost focus-ring !h-8 gap-1.5"
          >
            <PenLine size={13} /> Sketch
          </button>
          <button
            type="button"
            onClick={() => void recordVoiceReply()}
            disabled={recordingVoice}
            className="btn btn-ghost focus-ring !h-8 gap-1.5 disabled:opacity-50"
          >
            <Mic size={13} /> {recordingVoice ? "Recording…" : "Voice"}
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setImageFile(file);
            e.target.value = "";
          }}
        />

        <div className="flex gap-1.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
            }}
            placeholder="Reply to this contribution…"
            className="input focus-ring min-w-0 flex-1"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || !input.trim()}
            className="btn btn-primary focus-ring gap-1.5 disabled:opacity-50"
          >
            <Send size={13} /> Reply
          </button>
        </div>
      </div>

      {imageFile && imagePreviewUrl && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-ink/20 p-6 backdrop-blur-[2px]"
          onClick={() => setImageFile(null)}
        >
          <div
            className="w-full max-w-[420px] rounded-[var(--radius-md)] border border-line bg-surface p-4 shadow-[var(--shadow-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[13px] font-semibold tracking-tight text-ink">
              Reply with a photo
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
                  void submitImageReply();
                }
              }}
            />
            <div className="mt-2.5 flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setImageFile(null)}
                className="btn btn-secondary focus-ring"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitImageReply()}
                disabled={sending}
                className="btn btn-primary focus-ring disabled:opacity-50"
              >
                Reply
              </button>
            </div>
          </div>
        </div>
      )}

      {sketchOn && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/20 p-6 backdrop-blur-[2px]">
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
            <input
              autoFocus
              className="input focus-ring mt-2.5"
              placeholder="Title this sketch…"
              value={sketchTitle}
              onChange={(e) => setSketchTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitSketchReply();
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
                onClick={() => void submitSketchReply()}
                disabled={sending}
                className="btn btn-primary focus-ring disabled:opacity-50"
              >
                Reply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
