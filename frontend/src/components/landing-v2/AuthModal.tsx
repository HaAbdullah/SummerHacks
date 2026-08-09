"use client";

import { useEffect, useRef, useState } from "react";
import { GitBranch } from "lucide-react";
import styles from "./landing-v2.module.css";

export type AuthMode = "signin" | "join";

/**
 * Sign in / Join Club dialog.
 *
 * Deliberately non-functional — Supabase auth isn't wired yet. It submits to
 * nothing and says so rather than pretending to accept credentials, so nobody
 * types a real password into it.
 */
export function AuthModal({
  mode,
  onClose,
  onModeChange,
}: {
  mode: AuthMode | null;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
}) {
  const [notice, setNotice] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!mode) return;
    setNotice(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const focus = window.setTimeout(() => firstFieldRef.current?.focus(), 60);
    // Stop the page scrolling behind the dialog.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(focus);
      document.body.style.overflow = previous;
    };
  }, [mode, onClose]);

  if (!mode) return null;

  const joining = mode === "join";

  return (
    <div
      className={`${styles.modalBackdrop} fixed inset-0 z-[100] flex items-center justify-center p-5`}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={joining ? "Join the club" : "Sign in"}
        onClick={(e) => e.stopPropagation()}
        className={`${styles.modalCard} w-full max-w-[420px] border border-line-strong bg-surface p-8`}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center bg-accent">
            <GitBranch size={15} className="text-white" />
          </div>
          <span className="heading-font text-lg font-bold tracking-tighter">
            BuildaMod
          </span>
        </div>

        <h2 className="heading-font mt-7 text-3xl font-extrabold leading-none tracking-tighter">
          {joining ? "JOIN THE CLUB" : "WELCOME BACK"}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {joining
            ? "Reading the graph is open to everyone. An account is what lets you fork a build and push it back."
            : "Sign in to pick up the branches you're working on."}
        </p>

        <form
          className="mt-7 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setNotice(true);
          }}
        >
          {joining && (
            <label className="block">
              <span className="text-label">Handle</span>
              <input
                ref={firstFieldRef}
                type="text"
                autoComplete="off"
                placeholder="boosted_2zr"
                className="input input-lg mt-1.5"
              />
            </label>
          )}
          <label className="block">
            <span className="text-label">Email</span>
            <input
              ref={joining ? undefined : firstFieldRef}
              type="email"
              autoComplete="off"
              placeholder="you@garage.com"
              className="input input-lg mt-1.5"
            />
          </label>

          <button
            type="submit"
            className="btn btn-xl btn-accent w-full font-bold tracking-tight"
          >
            {joining ? "CREATE ACCOUNT" : "SIGN IN"}
          </button>
        </form>

        {notice && (
          <p className="mt-4 border-l-2 border-accent bg-accent-soft px-3 py-2 text-xs leading-relaxed text-ink-soft">
            Accounts aren&apos;t live in this preview — auth lands with Supabase.
            Everything else on the site is reading the real database right now.
          </p>
        )}

        <div className="mt-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-2">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {["Google", "Discord"].map((provider) => (
            <button
              key={provider}
              type="button"
              onClick={() => setNotice(true)}
              className="btn btn-lg btn-secondary"
            >
              {provider}
            </button>
          ))}
        </div>

        <p className="mt-7 text-center text-xs text-muted">
          {joining ? "Already building?" : "First time here?"}{" "}
          <button
            type="button"
            onClick={() => onModeChange(joining ? "signin" : "join")}
            className="font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-accent"
          >
            {joining ? "Sign in" : "Join the club"}
          </button>
        </p>
      </div>
    </div>
  );
}
