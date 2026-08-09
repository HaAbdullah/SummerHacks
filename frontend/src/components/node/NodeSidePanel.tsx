"use client";

import { useEffect, useRef, useState } from "react";
import { askAiChat, generateBuildGuide } from "@/lib/api";
import type { BuildGuide, BuildNodeData, ChatMessage } from "@/lib/types";

export function NodeSidePanel({ node }: { node: BuildNodeData }) {
  const [aiThread, setAiThread] = useState<ChatMessage[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [guide, setGuide] = useState<BuildGuide | null>(null);
  const [building, setBuilding] = useState(false);
  const [compareOn, setCompareOn] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fresh AI thread when switching nodes (no community store).
    setAiThread([]);
    setGuide(null);
    setAiInput("");
  }, [node.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiThread, guide]);

  const sendAi = async () => {
    if (!aiInput.trim() || busy) return;
    setBusy(true);
    const q = aiInput.trim();
    setAiInput("");
    try {
      const pair = await askAiChat(node.id, q);
      setAiThread((t) => [...t, ...pair]);
    } finally {
      setBusy(false);
    }
  };

  const runBuild = async () => {
    setBuilding(true);
    try {
      const g = await generateBuildGuide(node.id);
      setGuide(g);
      setAiThread((t) => [
        ...t,
        {
          id: `guide-${Date.now()}`,
          nodeId: node.id,
          author: "BuildaMod AI",
          avatarColor: "#5e6ad2",
          body: `Guide ready: ${g.title}. ${g.difficulty} · ${g.estCost} · ${g.estTime}.`,
          createdAt: new Date().toISOString(),
          role: "ai",
        },
      ]);
    } finally {
      setBuilding(false);
    }
  };

  return (
    <aside className="glass-sidebar flex h-full w-[320px] shrink-0 flex-col border-l border-line">
      <div className="flex gap-1.5 border-b border-line p-2.5">
        <button
          type="button"
          onClick={() => void runBuild()}
          disabled={building}
          className="btn btn-primary focus-ring flex-1 disabled:opacity-50"
        >
          {building ? "Building…" : "Build"}
        </button>
        <button
          type="button"
          onClick={() => setCompareOn((v) => !v)}
          className={`btn focus-ring flex-1 ${compareOn ? "btn-accent" : "btn-secondary"}`}
        >
          Compare
        </button>
      </div>

      {compareOn && (
        <div className="border-b border-line bg-bg px-3 py-2 text-ui text-muted">
          Compare mode: pick another branch from the graph to diff tags & parts.
        </div>
      )}

      <div className="flex items-center border-b border-line px-3 py-2.5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-accent">
          AI Talk
        </p>
      </div>

      <div className="scroll-soft flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
        {aiThread.map((m) => (
          <div
            key={m.id}
            className={`rounded-[var(--radius-sm)] px-2.5 py-2 text-ui leading-relaxed ${
              m.role === "user"
                ? "ml-4 bg-bg text-ink"
                : "mr-1 border border-line bg-bg text-ink-soft"
            }`}
          >
            {m.role === "ai" && (
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
                AI
              </p>
            )}
            {m.body}
          </div>
        ))}

        {aiThread.length === 0 && !guide && (
          <p className="text-ui text-muted">
            Ask about parts, cost, or build order.
          </p>
        )}

        {guide && (
          <div className="rounded-[var(--radius)] border border-line bg-bg p-3">
            <p className="text-[13px] font-semibold tracking-tight text-ink">
              {guide.title}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {[
                ["Level", guide.difficulty],
                ["Cost", guide.estCost],
                ["Time", guide.estTime],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="rounded-[var(--radius-sm)] border border-line bg-surface px-1.5 py-1.5 text-center"
                >
                  <p className="text-[10px] text-muted">{k}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-ink">{v}</p>
                </div>
              ))}
            </div>
            <ul className="mt-2.5 space-y-1.5">
              {guide.parts.slice(0, 4).map((p) => (
                <li
                  key={p.name}
                  className="flex justify-between gap-2 text-[12px] text-ink-soft"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 tabular-nums text-muted">
                    {p.approxPrice}
                  </span>
                </li>
              ))}
            </ul>
            {guide.renderImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={guide.renderImage}
                alt="AI render"
                className="mt-2.5 w-full rounded-[var(--radius-sm)] border border-line object-cover"
              />
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-line p-2.5">
        <div className="flex gap-1.5">
          <input
            ref={inputRef}
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void sendAi();
            }}
            placeholder="Ask AI…"
            className="input focus-ring min-w-0 flex-1"
            disabled={busy}
          />
          <button
            type="button"
            onClick={() => void sendAi()}
            disabled={busy || !aiInput.trim()}
            className="btn btn-primary focus-ring disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </aside>
  );
}
