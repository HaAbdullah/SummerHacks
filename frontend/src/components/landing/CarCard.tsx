"use client";

import { useRouter } from "next/navigation";
import { GitFork } from "lucide-react";
import { motion } from "framer-motion";
import { listItem } from "@/lib/motion";

export interface FeaturedCar {
  id: string;
  make: string;
  model: string;
  badgeLabel: string;
  /** Tailwind bg-* class for the flavor badge chip */
  badgeClassName: string;
  nodeCount: string;
  tagline: string;
  imageUrl: string;
  avatarSeeds: string[];
  extraCount?: number;
}

export function CarCard({ car }: { car: FeaturedCar }) {
  const router = useRouter();
  const go = () =>
    router.push(
      `/garage/${car.id}?${new URLSearchParams({ make: car.make, model: car.model }).toString()}`,
    );

  return (
    <motion.div
      variants={listItem}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      role="link"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      }}
      className="car-card-hover group relative cursor-pointer overflow-hidden rounded-[32px] border border-line bg-surface transition-[border-color,box-shadow] duration-500"
    >
      <div className="aspect-[4/5] overflow-hidden">
        <img
          src={car.imageUrl}
          alt={`${car.make} ${car.model}`}
          className="car-image h-full w-full object-cover grayscale-[0.5] transition-all duration-700 group-hover:grayscale-0"
        />
      </div>
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black via-black/40 to-transparent p-8">
        <div className="mb-3 flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-black text-white ${car.badgeClassName}`}
          >
            {car.badgeLabel}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-ink-soft">
            {car.nodeCount}
          </span>
        </div>
        <h4 className="heading-font mb-1 text-3xl font-bold">
          {car.make} {car.model}
        </h4>
        <p className="mb-6 text-sm text-muted">{car.tagline}</p>
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {car.avatarSeeds.map((seed) => (
              <img
                key={seed}
                src={`https://i.pravatar.cc/150?u=${seed}`}
                alt=""
                className="h-8 w-8 rounded-full border-2 border-black"
              />
            ))}
            {car.extraCount ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-neutral-800 text-[10px] font-bold">
                +{car.extraCount}
              </div>
            ) : null}
          </div>
          <motion.button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go();
            }}
            whileHover={{ scale: 1.12, rotate: -8 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            aria-label={`Fork ${car.make} ${car.model}`}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-fg"
          >
            <GitFork size={20} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
