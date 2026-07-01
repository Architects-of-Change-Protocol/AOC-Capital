"use client";

import { motion } from "framer-motion";

type SpiralToTracksProps = {
  phase: "hidden" | "spiral" | "tracks";
};

export function SpiralToTracks({ phase }: SpiralToTracksProps) {
  const showSpiral = phase === "spiral";
  const showTracks = phase === "tracks";

  return (
    <div className="absolute inset-0">
      <motion.svg
        viewBox="0 0 640 460"
        className="absolute inset-0 h-full w-full"
        initial={false}
        animate={{
          opacity: showSpiral ? 1 : 0,
          scale: showSpiral ? [0.3, 1.1, 1] : 0.5,
          rotate: showSpiral ? [0, 360] : 0,
        }}
        transition={{
          opacity: { duration: 0.35 },
          scale: { duration: 1.6, ease: "easeOut" },
          rotate: { duration: 2.2, repeat: showSpiral ? Infinity : 0, ease: "linear" },
        }}
      >
        <path
          d="M320 210 C260 130 150 172 185 268 C225 378 452 338 462 240 C472 130 300 105 260 190 C225 265 350 298 388 226"
          stroke="#ff1493"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
      </motion.svg>

      <motion.svg
        viewBox="0 0 640 140"
        className="absolute bottom-16 left-1/2 z-20 w-[115%] -translate-x-1/2"
        initial={false}
        animate={{
          opacity: showTracks ? 1 : 0,
          y: showTracks ? 0 : 20,
          scaleX: showTracks ? 1 : 0.65,
        }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <path d="M0 56 C120 36 260 36 360 58 C458 78 560 78 640 58" stroke="#000" strokeWidth="8" strokeLinecap="round" />
        <path d="M0 94 C120 74 260 74 360 96 C458 116 560 116 640 96" stroke="#000" strokeWidth="8" strokeLinecap="round" />
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.path
            key={i}
            d={`M${24 + i * 46} 54 L${44 + i * 46} 98`}
            stroke="#000"
            strokeWidth="4"
            strokeLinecap="round"
            initial={false}
            animate={{ opacity: showTracks ? 1 : 0 }}
            transition={{ delay: showTracks ? 0.35 + i * 0.035 : 0, duration: 0.2 }}
          />
        ))}
      </motion.svg>
    </div>
  );
}
