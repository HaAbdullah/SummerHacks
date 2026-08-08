"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mic, Send } from "lucide-react";
import { addContributionReply, getContribution, getContributionReplies } from "@/lib/api";
import type { Note, NoteReply } from "@/lib/types";

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
  const [note, setNote] = useState<Note | null>(null);
  const [replies, setReplies] = useState<NoteReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

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

  if (loading || !note) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg text-ui text-muted">
        Opening contribution…
      </div>
    );
  }

  const hasMedia =
    (note.kind === "image" ||
      note.kind === "sketch" ||
      note.kind === "video" ||
      note.kind === "blueprint") &&
    !!note.mediaUrl;

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
                src={note.mediaUrl}
                alt={note.body ?? note.kind}
                className="max-h-[480px] w-full object-cover"
              />
            </div>
          )}

          {note.kind === "voice" && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-line bg-white/5 p-4">
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
          )}

          {(!hasMedia && note.kind !== "voice") || (hasMedia && note.body) ? (
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">
              {note.body}
            </p>
          ) : null}
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
          {replies.map((r) => (
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
                <div className="chat-bubble mt-1 px-3 py-2 text-[13px] leading-relaxed text-ink-soft">
                  {r.body}
                </div>
              </div>
            </div>
          ))}

          {replies.length === 0 && (
            <p className="text-ui text-muted">
              No replies yet — be the first to weigh in on this contribution.
            </p>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl shrink-0 border-t border-line px-6 py-4">
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
    </div>
  );
}
