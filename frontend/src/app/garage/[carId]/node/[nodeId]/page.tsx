"use client";

import { use, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getNode, getNotes } from "@/lib/api/backend";
import type { BuildNodeData, Note } from "@/lib/types";
import { ModCanvas } from "@/components/node/ModCanvas";
import { NodeInfoPanel } from "@/components/node/NodeInfoPanel";
import { NodeSidePanel } from "@/components/node/NodeSidePanel";

export default function NodePage({
  params,
}: {
  params: Promise<{ carId: string; nodeId: string }>;
}) {
  const { carId, nodeId } = use(params);
  const [node, setNode] = useState<BuildNodeData | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [n, ns] = await Promise.all([getNode(nodeId), getNotes(nodeId)]);
        if (cancelled) return;
        setNode(n);
        setNotes(ns);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nodeId]);

  if (loading || !node) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg text-ui text-muted">
        Opening build…
      </div>
    );
  }

  return (
    <motion.div
      className="flex h-screen flex-col bg-bg"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex min-h-0 flex-1">
        <NodeInfoPanel carId={carId} node={node} />
        <ModCanvas
          carId={carId}
          nodeId={node.id}
          notes={notes}
          onNotesChange={setNotes}
        />
        <NodeSidePanel node={node} />
      </div>
    </motion.div>
  );
}
