import type { Transition, Variants } from "framer-motion";

/** House easing — matches the CSS cubic-bezier already used across globals.css. */
export const EASE = [0.16, 1, 0.3, 1] as const;
export const EASE_SNAPPY = [0.4, 0, 0.2, 1] as const;

export const springSnappy: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 32,
  mass: 0.7,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, ease: EASE } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: EASE } },
};

/** Container that staggers its direct motion children into view. */
export const staggerContainer = (stagger = 0.08, delay = 0): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

/** Props for a scroll-triggered stagger container — spread onto a motion.div. */
export const viewportStagger = {
  initial: "hidden",
  whileInView: "show",
  viewport: { once: true, amount: 0.2 },
} as const;

/** Backdrop scrim for modals/drawers. */
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: EASE } },
};

/** Centered modal panel — scale + rise entrance, quick exit. */
export const modalPanelVariants: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 12 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.28, ease: EASE },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: 0.16, ease: EASE_SNAPPY },
  },
};

/** Bottom sheet on mobile / side panel on desktop. */
export const sheetVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
  exit: { opacity: 0, y: 16, transition: { duration: 0.18, ease: EASE_SNAPPY } },
};

/** Dropdown menus / popovers. */
export const dropdownVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: -6 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.16, ease: EASE_SNAPPY },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: -4,
    transition: { duration: 0.12, ease: EASE_SNAPPY },
  },
};

/** List item entrance for use inside a staggerContainer. */
export const listItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};
