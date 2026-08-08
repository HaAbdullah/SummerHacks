"use client";

import { memo } from "react";
import {
  BaseEdge,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";

export type BranchFlowEdge = Edge<{
  isFusionEdge?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
}>;

function BranchEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<BranchFlowEdge>) {
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 20,
  });

  const highlighted = data?.highlighted;
  const fusion = data?.isFusionEdge;

  const stroke = highlighted
    ? "var(--accent)"
    : fusion
      ? "var(--fusion)"
      : "rgb(255 255 255 / 0.25)";
  const width = highlighted ? 2 : 1.25;

  return (
    <g style={{ transition: "opacity 200ms ease" }}>
      {highlighted && (
        <BaseEdge
          id={`${id}-glow`}
          path={path}
          style={{
            stroke: "var(--accent)",
            strokeWidth: 5,
            opacity: 0.12,
            filter: "blur(2px)",
          }}
        />
      )}
      <BaseEdge id={id} path={path} style={{ stroke, strokeWidth: width }} />
      {highlighted && (
        <path
          d={path}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.75}
          className="edge-flow"
          style={{ pointerEvents: "none" }}
        />
      )}
    </g>
  );
}

export const BranchEdge = memo(BranchEdgeComponent);
