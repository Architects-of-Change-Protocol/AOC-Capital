"use client";

import { motion } from "framer-motion";

type FloatingLabelProps = {
  text: string;
  className?: string;
  delay?: number;
};

export function FloatingLabel({ text, className = "", delay = 0 }: FloatingLabelProps) {
  return (
    <motion.div
      className={`absolute z-40 rounded-full border-2 border-black bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wide text-black shadow-[3px_3px_0_#000] md:text-sm ${className}`}
      initial={{ opacity: 0, scale: 0.7, y: 10, rotate: -4 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0.7, 1, 1, 0.9],
        y: [10, 0, -4, -14],
        rotate: [-4, 2, -1, 4],
      }}
      transition={{
        duration: 2.3,
        delay,
        repeat: Infinity,
        repeatDelay: 5.7,
        ease: "easeInOut",
      }}
    >
      {text}
    </motion.div>
  );
}
