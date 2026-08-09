/** Client for evidence-grounded, structured Node A to Node B build guides. */

import type { TransitionBuildGuide } from "../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class BuildGuideError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "BuildGuideError";
  }
}

export async function generateTransitionBuildGuide(
  nodeAId: string,
  nodeBId: string,
  signal?: AbortSignal,
): Promise<TransitionBuildGuide> {
  const response = await fetch(`${API_URL}/api/ai/build-guide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ node_a_id: nodeAId, node_b_id: nodeBId }),
    signal,
  });

  if (!response.ok) {
    const detail = await response
      .json()
      .then((body) => body?.detail)
      .catch(() => null);
    throw new BuildGuideError(
      detail ?? `Build guide generation failed (${response.status})`,
      response.status,
    );
  }

  return (await response.json()) as TransitionBuildGuide;
}
