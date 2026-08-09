"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, GitCompareArrows, Send, X } from "lucide-react";
import type { BuildNodeData } from "@/lib/types";

type ChatLine = {
  id: string;
  role: "ai" | "user" | "system";
  body: string;
};

function attrDelta(from: BuildNodeData, to: BuildNodeData) {
  const fromSet = new Set(from.attributes);
  const toSet = new Set(to.attributes);
  const added = to.attributes.filter((a) => !fromSet.has(a));
  const removed = from.attributes.filter((a) => !toSet.has(a));
  const kept = to.attributes.filter((a) => fromSet.has(a));
  return { added, removed, kept };
}

function buildMockThread(from: BuildNodeData, to: BuildNodeData): ChatLine[] {
  const { added, removed, kept } = attrDelta(from, to);
  const steps: string[] = [];

  if (removed.length) {
    steps.push(
      `Dial back **${removed.join(", ")}** from *${from.title}* — those don’t carry into *${to.title}*.`,
    );
  }
  if (added.length) {
    steps.push(
      `Add **${added.join(", ")}**. Community heat on *${to.title}* is ~${Math.round(to.stats.heat * 100)}%.`,
    );
  }
  if (!added.length && !removed.length) {
    steps.push(
      `Attributes already line up. Focus on finish work and notes between the two builds.`,
    );
  }
  if (kept.length) {
    steps.push(`Keep shared DNA: **${kept.slice(0, 4).join(", ")}**.`);
  }
  steps.push(
    `Est. path: **${from.title}** → stock baseline touch-up → **${to.title}**. (Mock guide — wire to API later.)`,
  );

  return [
    {
      id: "sys-1",
      role: "system",
      body: `Comparing **${from.title}** → **${to.title}**`,
    },
    {
      id: "ai-1",
      role: "ai",
      body: `Here's a practical route from *${from.title}* to *${to.title}*:`,
    },
    ...steps.map((body, i) => ({
      id: `ai-step-${i}`,
      role: "ai" as const,
      body: `**${i + 1}.** ${body}`,
    })),
    {
      id: "ai-end",
      role: "ai",
      body: `Ask anything about parts, cost, or order — this panel is UI-only for now.`,
    },
  ];
}

export function ComparePanel({
  from,
  to,
  onClose,
}: {
  from: BuildNodeData;
  to: BuildNodeData;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatLine[]>(() =>
    buildMockThread(from, to),
  );
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Rebuild mock thread when the pair changes
  useEffect(() => {
    setMessages(buildMockThread(from, to));
    setInput("");
  }, [from, to]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const subtitle = useMemo(
    () => `${from.title} → ${to.title}`,
    [from.title, to.title],
  );

  const send = () => {
    const q = input.trim();
    if (!q) return;
    setInput("");
    setMessages((m) => [
      ...m,
      { id: `u-${Date.now()}`, role: "user", body: q },
      {
        id: `a-${Date.now() + 1}`,
        role: "ai",
        body: `Got it — once the compare API is live I'll answer against the path from *${from.title}* to *${to.title}*. For now this is a placeholder reply.`,
      },
    ]);
  };

  return (
    <aside className="floating-modal absolute bottom-8 right-8 top-8 z-40 flex w-[min(380px,28vw)] min-w-[300px] flex-col overflow-hidden rounded-[32px]">
      <div className="flex items-start justify-between gap-3 border-b border-line p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-blue/15 text-accent-blue">
            <GitCompareArrows className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="heading-font text-[16px] font-bold text-ink">
              Compare
            </h3>
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted">
              <span className="truncate text-ink-soft">{from.title}</span>
              <ArrowRight className="h-3 w-3 shrink-0 opacity-50" />
              <span className="truncate text-ink-soft">{to.title}</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="focus-ring flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-muted transition-colors hover:bg-white/10 hover:text-ink"
          aria-label="Close compare"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Node chips */}
      <div className="flex items-center gap-2 border-b border-line px-5 py-3">
        <NodeChip label="From" node={from} index={1} />
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-2" />
        <NodeChip label="To" node={to} index={2} />
      </div>

      <div className="scroll-soft flex-1 space-y-3 overflow-y-auto p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-2">
          Path guide · mock
        </p>
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "system" ? (
              <p className="w-full text-center text-[11px] text-muted-2">
                {renderLightMarkdown(m.body)}
              </p>
            ) : (
              <div
                className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  m.role === "user"
                    ? "bg-accent text-white"
                    : "border border-line bg-white/[0.04] text-ink-soft"
                }`}
              >
                {renderLightMarkdown(m.body)}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="border-t border-line p-4">
        <p className="mb-2 truncate text-[10px] text-muted-2" title={subtitle}>
          Ask about this path
        </p>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="e.g. parts list, cost, time…"
            className="input focus-ring flex-1 !h-10"
          />
          <button
            type="button"
            onClick={send}
            disabled={!input.trim()}
            className="btn btn-primary focus-ring !h-10 !w-10 !px-0 disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function NodeChip({
  label,
  node,
  index,
}: {
  label: string;
  node: BuildNodeData;
  index: number;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-white/[0.03] px-2.5 py-2">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-blue/20 text-[10px] font-bold text-accent-blue">
        {index}
      </span>
      {node.heroImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={node.heroImage}
          alt=""
          className="h-7 w-7 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="h-7 w-7 shrink-0 rounded-full bg-white/10" />
      )}
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider text-muted">
          {label}
        </p>
        <p className="truncate text-[11px] font-semibold text-ink">{node.title}</p>
      </div>
    </div>
  );
}

/** Tiny **bold** / *italic* renderer for mock copy — no full markdown. */
function renderLightMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={i} className="text-ink-soft">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
