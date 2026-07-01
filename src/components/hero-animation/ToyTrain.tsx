"use client";

import { motion } from "framer-motion";

export function ToyTrain({ active }: { active: boolean }) {
  return (
    <motion.div
      className="absolute bottom-[88px] left-[-180px] z-40"
      animate={{
        x: active ? ["0%", "40%", "100%"] : "0%",
        opacity: active ? [0, 1, 1, 0] : 0,
      }}
      transition={{
        duration: 3,
        ease: ["easeOut", "linear", "easeIn"],
      }}
    >
      <svg viewBox="0 0 190 110" className="w-[150px]">
        <rect x="16" y="38" width="108" height="40" rx="9" fill="#fff" stroke="#000" strokeWidth="4" />
        <circle cx="46" cy="86" r="13" fill="#fff" stroke="#000" strokeWidth="4" />
        <circle cx="102" cy="86" r="13" fill="#fff" stroke="#000" strokeWidth="4" />

        {/* 🔥 humo más intenso */}
        <motion.circle cx="30" cy="14" r="10" fill="#ff1493"
          animate={{ cy: [-10, -40, -80], scale: [1, 1.5, 2], opacity: [0.8, 0.4, 0] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      </svg>
    </motion.div>
  );
}
