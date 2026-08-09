"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { BuildNodeData } from "@/lib/types";
import { NODE_SIZE } from "./layout";

export type BuildFlowNode = Node<
  {
    build: BuildNodeData;
    dimmed?: boolean;
    highlighted?: boolean;
    selected?: boolean;
    mergeSelected?: boolean;
    compareSelected?: boolean;
    compareOrder?: 1 | 2;
    flash?: boolean;
  },
  "build"
>;

function BuildNodeComponent({ data }: NodeProps<BuildFlowNode>) {
  const {
    build,
    dimmed,
    highlighted,
    selected,
    mergeSelected,
    compareSelected,
    compareOrder,
    flash,
  } = data;
  const heat = build.stats.heat;
  const isRoot = build.parentIds.length === 0;
  const isFusion = build.parentIds.length > 1;
  const size = NODE_SIZE * (0.85 + heat * 0.4);
  const active = !!(selected || highlighted || mergeSelected || compareSelected);

  const kicker = isRoot ? "Root" : isFusion ? "Fusion" : "Branch";

  const circleClasses = compareSelected
    ? "bg-blue-500/15 border-blue-400/80"
    : active
      ? "bg-accent/15 border-accent/80"
    : "bg-surface border-blue-900";

  return (
    <div
      className="tree-node relative flex cursor-pointer flex-col items-center"
      style={{
        width: size,
        transition: "opacity 200ms ease",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-1.5 !w-1.5 !border-0 !bg-transparent"
      />

      <div
        className={`relative flex flex-col items-center justify-center gap-0.5 rounded-full border px-1.5 text-center ${circleClasses} ${
          (active || flash) && !dimmed ? "node-pulse" : ""
        }`}
        style={{
          width: size,
          height: size,
          boxShadow: active ? "0 0 0 3px rgb(255 60 60 / 0.12)" : undefined,
          filter: flash ? "brightness(1.35)" : undefined,
        }}
      >
        {compareOrder && (
          <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full border border-blue-300/50 bg-blue-500 text-[9px] font-black text-white shadow">
            {compareOrder === 1 ? "A" : "B"}
          </span>
        )}
        <span
          className={`text-[8px] font-black uppercase leading-none tracking-wider ${
            compareSelected
              ? "text-blue-300"
              : active
                ? "text-accent/80"
                : "text-muted"
          }`}
        >
          {kicker}
        </span>
        <span className="heading-font line-clamp-2 max-w-[85%] text-[10px] font-bold uppercase leading-[1.15] text-ink">
          {build.title}
        </span>
        {build.stats.forks > 0 && (
          <span className="mt-0.5 rounded-full bg-accent px-1.5 py-[1px] text-[8px] font-bold leading-tight text-white">
            {build.stats.forks} fork{build.stats.forks === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-1.5 !w-1.5 !border-0 !bg-transparent"
      />
    </div>
  );
}

export const BuildNode = memo(BuildNodeComponent);
