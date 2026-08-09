"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkX, ExternalLink } from "lucide-react";
import {
  getLibraryForCar,
  LIBRARY_CHANGED_EVENT,
  removeFromLibrary,
  type SavedMod,
} from "@/lib/library";

export function SavedMods({ carId }: { carId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<SavedMod[]>([]);

  const reload = useCallback(() => {
    setItems(getLibraryForCar(carId));
  }, [carId]);

  useEffect(() => {
    reload();
    const onChange = () => reload();
    window.addEventListener(LIBRARY_CHANGED_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(LIBRARY_CHANGED_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [reload]);

  const open = (mod: SavedMod) => {
    router.push(`/garage/${mod.carId}/node/${mod.nodeId}`);
  };

  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted">
          <Bookmark className="h-3 w-3" />
          Saved mods
        </h2>
        {items.length > 0 && (
          <span className="text-[10px] tabular-nums text-muted-2">
            {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-3 py-4 text-center text-[12px] leading-relaxed text-muted">
          Nothing saved yet. Open a node and hit{" "}
          <span className="text-ink-soft">Save to Library</span>.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((mod) => (
            <li key={mod.nodeId}>
              <div className="group flex items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.03] p-2 transition-colors hover:bg-white/[0.06]">
                <button
                  type="button"
                  onClick={() => open(mod)}
                  className="focus-ring flex min-w-0 flex-1 items-center gap-2.5 rounded-xl text-left"
                >
                  {mod.heroImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mod.heroImage}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-muted">
                      <Bookmark className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="heading-font truncate text-[12px] font-bold text-ink">
                      {mod.title}
                    </p>
                    <p className="truncate text-[10px] text-muted">
                      {mod.attributes.slice(0, 3).join(" · ") || "Saved build"}
                    </p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-2 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
                <button
                  type="button"
                  onClick={() => removeFromLibrary(mod.nodeId)}
                  className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/10 hover:text-ink"
                  title="Remove from library"
                  aria-label={`Remove ${mod.title} from library`}
                >
                  <BookmarkX className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
