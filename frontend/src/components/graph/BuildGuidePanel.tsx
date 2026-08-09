"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  BookOpen,
  CircleHelp,
  GitCommitHorizontal,
  Lightbulb,
  Link2,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { EASE } from "@/lib/motion";
import type { BuildNodeData, TransitionBuildGuide } from "@/lib/types";

export function BuildGuidePanel({
  base,
  target,
  guide,
  onClose,
}: {
  base: BuildNodeData;
  target: BuildNodeData;
  guide: TransitionBuildGuide;
  onClose: () => void;
}) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 24, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 16, scale: 0.98 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="floating-modal absolute right-4 top-20 z-40 max-h-[calc(100%-6rem)] w-[450px] overflow-y-auto rounded-[22px] p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-accent-blue">
            <BookOpen className="h-3.5 w-3.5" /> Build guide
          </div>
          <h2 className="heading-font mt-1 text-[17px] font-bold text-ink">
            {base.title} to {target.title}
          </h2>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            {guide.summary}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="focus-ring flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-muted hover:bg-white/10 hover:text-ink"
          aria-label="Close build guide"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <Section title="Required changes" icon={<GitCommitHorizontal className="h-3.5 w-3.5" />}>
        {guide.required_changes.length ? (
          <div className="divide-y divide-line border-y border-line">
            {guide.required_changes.map((part) => (
              <div key={`${part.category}-${part.name}`} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12px] font-bold text-ink">{part.name}</span>
                  <span className="text-[9px] font-black uppercase text-accent">
                    {part.action} {part.category}
                  </span>
                </div>
                {part.replaces && (
                  <p className="mt-1 text-[10px] text-muted">Replaces {part.replaces}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted">The selected configurations already match.</p>
        )}
      </Section>

      <Section title="Build stages" icon={<BookOpen className="h-3.5 w-3.5" />}>
        <div className="space-y-5">
          {guide.stages.map((stage) => (
            <div key={`${stage.order}-${stage.title}`}>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent text-[10px] font-black text-white">
                  {stage.order}
                </span>
                <h4 className="text-[12px] font-bold text-ink">{stage.title}</h4>
              </div>
              {stage.components.length > 0 && (
                <p className="ml-8 mt-1 text-[9px] uppercase text-muted-2">
                  {stage.components.join(" / ")}
                </p>
              )}
              <div className="ml-3 mt-3 space-y-3 border-l border-line pl-5">
                {stage.steps.map((step, index) => (
                  <div key={`${stage.order}-${index}`}>
                    <p className="text-[11px] font-semibold leading-relaxed text-ink-soft">
                      {step.instruction}
                    </p>
                    {step.details && (
                      <p className="mt-1 text-[10px] leading-relaxed text-muted">
                        {step.details}
                      </p>
                    )}
                    {step.evidence_ids.length > 0 && (
                      <p className="mt-1.5 text-[9px] text-accent-blue">
                        Evidence: {step.evidence_ids.join(", ")}
                      </p>
                    )}
                    {step.warnings.map((warning) => (
                      <p key={warning} className="mt-1 text-[9px] text-yellow-200">
                        {warning}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {guide.community_tips.length > 0 && (
        <Section title="Community tips" icon={<Lightbulb className="h-3.5 w-3.5" />}>
          <div className="space-y-3">
            {guide.community_tips.map((tip) => (
              <div key={`${tip.text}-${tip.evidence_ids.join()}`} className="border-l-2 border-accent-blue pl-3">
                <p className="text-[11px] leading-relaxed text-ink-soft">{tip.text}</p>
                <p className="mt-1 text-[9px] text-muted">
                  Supported by {tip.evidence_ids.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {guide.dependencies.length > 0 && (
        <ListSection title="Dependencies" items={guide.dependencies} icon={<Link2 className="h-3.5 w-3.5" />} />
      )}
      {guide.warnings.length > 0 && (
        <ListSection title="Warnings" items={guide.warnings} icon={<AlertTriangle className="h-3.5 w-3.5" />} tone="text-yellow-200" />
      )}
      {guide.unknowns.length > 0 && (
        <ListSection title="Unknowns" items={guide.unknowns.map((item) => item.description)} icon={<CircleHelp className="h-3.5 w-3.5" />} />
      )}
    </motion.aside>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-5 border-t border-line pt-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-muted">
        {icon} {title}
      </h3>
      {children}
    </section>
  );
}

function ListSection({
  title,
  items,
  icon,
  tone = "text-ink-soft",
}: {
  title: string;
  items: string[];
  icon: ReactNode;
  tone?: string;
}) {
  return (
    <Section title={title} icon={icon}>
      <ul className={`space-y-2 text-[11px] leading-relaxed ${tone}`}>
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
