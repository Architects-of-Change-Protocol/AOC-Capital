"use client";

import { motion } from "framer-motion";

type SceneTextProps = {
  text: string;
  active: boolean;
  className?: string;
};

export function SceneText({ text, active, className = "" }: SceneTextProps) {
  return (
    <motion.div
      className={`absolute z-50 rounded-2xl border-2 border-black bg-white px-4 py-2 text-lg font-black shadow-[4px_4px_0_#000] md:text-2xl ${className}`}
      initial={{ opacity: 0, scale: 0.85, y: 10 }}
      animate={{
        opacity: active ? 1 : 0,
        scale: active ? 1 : 0.85,
        y: active ? 0 : 10,
      }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      {text}
    </motion.div>
  );
}
