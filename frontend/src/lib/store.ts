import { create } from "zustand";
import type { AiSearchResult } from "./types";

interface AppState {
  activeFilters: Record<string, string[]>;
  searchResult: AiSearchResult | null;
  mergeMode: boolean;
  mergeSelection: string[];
  guideOpenFor: string | null;
  hoverNodeId: string | null;
  /** Pending "new branch" modal request — parent node it forks from, and an
   * optional preset attribute selection (e.g. from the active filter chips). */
  addBranchRequest: { parentId: string; presetAttributes?: string[] } | null;
  flashNodeId: string | null;
  graphZoom: number;
  /** First-layer branch (child of root) the user has drilled into from the
   * "Select Modification" dropdown. Its children are revealed on the graph;
   * everything else stays collapsed to root + first layer. */
  focusedBranchId: string | null;
  /** "Show All Modifications" canvas toggle — bypasses the default collapsed
   * view and renders the entire tree regardless of focusedBranchId. */
  showFullTree: boolean;

  setFilters: (filters: Record<string, string[]>) => void;
  toggleFilter: (groupId: string, optionId: string) => void;
  clearFilters: () => void;
  setSearchResult: (result: AiSearchResult | null) => void;
  setMergeMode: (on: boolean) => void;
  toggleMergeSelection: (nodeId: string) => void;
  clearMergeSelection: () => void;
  setGuideOpenFor: (nodeId: string | null) => void;
  setHoverNodeId: (id: string | null) => void;
  openAddBranchModal: (parentId: string, presetAttributes?: string[]) => void;
  closeAddBranchModal: () => void;
  setFlashNodeId: (id: string | null) => void;
  setGraphZoom: (z: number) => void;
  setFocusedBranchId: (id: string | null) => void;
  setShowFullTree: (on: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeFilters: {},
  searchResult: null,
  mergeMode: false,
  mergeSelection: [],
  guideOpenFor: null,
  hoverNodeId: null,
  addBranchRequest: null,
  flashNodeId: null,
  graphZoom: 0.75,
  focusedBranchId: null,
  showFullTree: false,

  setFilters: (filters) => set({ activeFilters: filters }),

  toggleFilter: (groupId, optionId) => {
    const current = get().activeFilters[groupId] ?? [];
    const next = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId];
    set({
      activeFilters: {
        ...get().activeFilters,
        [groupId]: next,
      },
    });
  },

  clearFilters: () => set({ activeFilters: {}, searchResult: null }),

  setSearchResult: (result) => set({ searchResult: result }),

  setMergeMode: (on) =>
    set({
      mergeMode: on,
      mergeSelection: on ? get().mergeSelection : [],
    }),

  toggleMergeSelection: (nodeId) => {
    const sel = get().mergeSelection;
    if (sel.includes(nodeId)) {
      set({ mergeSelection: sel.filter((id) => id !== nodeId) });
      return;
    }
    if (sel.length >= 2) {
      set({ mergeSelection: [sel[1], nodeId] });
      return;
    }
    set({ mergeSelection: [...sel, nodeId] });
  },

  clearMergeSelection: () => set({ mergeSelection: [] }),

  setGuideOpenFor: (nodeId) => set({ guideOpenFor: nodeId }),

  setHoverNodeId: (id) => set({ hoverNodeId: id }),

  openAddBranchModal: (parentId, presetAttributes) =>
    set({ addBranchRequest: { parentId, presetAttributes } }),

  closeAddBranchModal: () => set({ addBranchRequest: null }),

  setFlashNodeId: (id) => set({ flashNodeId: id }),

  setGraphZoom: (z) => set({ graphZoom: z }),

  setFocusedBranchId: (id) =>
    set((s) => ({ focusedBranchId: s.focusedBranchId === id ? null : id })),

  setShowFullTree: (on) => set({ showFullTree: on }),
}));
