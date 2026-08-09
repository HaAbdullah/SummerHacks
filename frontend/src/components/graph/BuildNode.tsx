"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { BuildNodeData } from "@/lib/types";
import { resolveMediaUrl } from "@/lib/media-url";
import { NODE_SIZE } from "./layout";

export type BuildFlowNode = Node<
  {
    build: BuildNodeData;
    dimmed?: boolean;
    highlighted?: boolean;
    selected?: boolean;
    mergeSelected?: boolean;
    /** 1-based index when in shift-select compare pair; 0 = not selected */
    compareIndex?: number;
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
    compareIndex = 0,
    flash,
  } = data;
  const heat = build.stats.heat;
  const isFusion = build.parentIds.length > 1;
  const size = NODE_SIZE * (0.85 + heat * 0.4);
  const compareSelected = compareIndex > 0;
  const active = !!(selected || highlighted || mergeSelected || compareSelected);

  const imageUrl = resolveMediaUrl(build.heroImage);

  const ringClass = compareSelected
    ? "border-accent-blue shadow-[0_0_0_3px_rgb(60_126_255_/_0.22)]"
    : active
      ? "border-accent/90 shadow-[0_0_0_3px_rgb(255_60_60_/_0.14)]"
      : isFusion
        ? "border-fusion/70"
        : "border-white/15";

  return (
    <div
      className="tree-node relative flex cursor-pointer flex-col items-center"
      style={{
        width: Math.max(size, 88),
        transition: "opacity 200ms ease",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-1.5 !w-1.5 !border-0 !bg-transparent"
      />

      {/* Circle — photo fill when available */}
      <div
        className={`relative overflow-hidden rounded-full border-2 ${ringClass} ${
          (active || flash) && !dimmed ? "node-pulse" : ""
        }`}
        style={{
          width: size,
          height: size,
          filter: flash ? "brightness(1.35)" : undefined,
          background: imageUrl
            ? undefined
            : "linear-gradient(145deg, #1a1a1a 0%, #0c0c0c 100%)",
        }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface" />
        )}

        {/* Soft bottom vignette so ring reads on bright photos */}
        {imageUrl && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.08)",
              background:
                "radial-gradient(circle at 50% 80%, transparent 40%, rgb(0 0 0 / 0.35) 100%)",
            }}
          />
        )}

        {compareSelected && (
          <span className="absolute left-1/2 top-1 z-[1] flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-accent-blue text-[10px] font-bold text-white shadow-sm">
            {compareIndex}
          </span>
        )}
      </div>

      {/* Label under the circle */}
      <div className="pointer-events-none mt-1.5 flex w-full flex-col items-center px-0.5 text-center">
        <span className="heading-font line-clamp-2 max-w-[96px] text-[10px] font-bold uppercase leading-[1.15] text-ink">
          {build.title}
        </span>
        {build.stats.forks > 0 && (
          <span className="mt-0.5 text-[8px] font-medium tabular-nums text-muted-2">
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
