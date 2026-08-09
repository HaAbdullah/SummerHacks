"use client";

import { useReveal } from "./use-reveal";
import styles from "./landing-v2.module.css";

const NODES = [
  { x: 80, y: 210, color: "#ffffff", label: "stock" },
  { x: 240, y: 210, color: "#ff3c3c", label: "engine" },
  { x: 420, y: 110, color: "#f2c94c", label: "exhaust" },
  { x: 420, y: 310, color: "#f2c94c", label: "exhaust" },
  { x: 600, y: 110, color: "#3c7eff", label: "wheels" },
  { x: 760, y: 210, color: "#8b5cf6", label: "merge" },
];

/**
 * The shape a nested tree cannot represent: the rightmost node has two
 * parents. Drawn rather than described, because "multi-parent" is the one
 * claim that separates this from a folder of build threads.
 */
export function BranchDiagram() {
  const { ref, shown } = useReveal<HTMLDivElement>(0.3);

  return (
    <div ref={ref} className={shown ? styles.revealed : undefined}>
      <svg
        viewBox="0 0 900 420"
        className={styles.dag}
        role="img"
        aria-label="A build graph: a stock node branches into an engine node, which forks into two exhaust branches; one continues to wheels, and both rejoin at a single merge node with two parents."
      >
        {/* edges — order drives the left-to-right draw stagger */}
        <path className={styles.dagPath} d="M80 210 H240" stroke="#4a4a4a" strokeWidth="2.5" />
        <path className={styles.dagPath} d="M240 210 C320 210 340 110 420 110" stroke="#ff3c3c" strokeWidth="2.5" />
        <path className={styles.dagPath} d="M240 210 C320 210 340 310 420 310" stroke="#ff3c3c" strokeWidth="2.5" />
        <path className={styles.dagPath} d="M420 110 H600" stroke="#f2c94c" strokeWidth="2.5" />
        <path className={styles.dagPath} d="M600 110 C680 110 700 210 760 210" stroke="#3c7eff" strokeWidth="2.5" />
        <path className={styles.dagPath} d="M420 310 C560 310 660 210 760 210" stroke="#8b5cf6" strokeWidth="2.5" />

        {/* nodes */}
        {NODES.map((n) => (
          <circle
            key={`${n.x}-${n.y}`}
            className={styles.dagNode}
            cx={n.x}
            cy={n.y}
            r={n.label === "merge" ? 17 : 12}
            fill="#050505"
            stroke={n.color}
            strokeWidth="3"
          />
        ))}

        <g className={styles.dagLabel}>
          {NODES.map((n) => (
            <text
              key={`${n.x}-${n.y}-label`}
              x={n.x}
              y={n.y + 40}
              textAnchor="middle"
              fill="#888888"
              fontSize="13"
              fontWeight="600"
              letterSpacing="1.6"
            >
              {n.label.toUpperCase()}
            </text>
          ))}
          <text
            x={760}
            y={148}
            textAnchor="middle"
            fill="#8b5cf6"
            fontSize="12"
            fontWeight="700"
            letterSpacing="2"
          >
            TWO PARENTS
          </text>
        </g>
      </svg>
    </div>
  );
}
