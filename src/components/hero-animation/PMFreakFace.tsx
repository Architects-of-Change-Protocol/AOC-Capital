"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export function PMFreakFace({
  calm = false,
  spirals = false,
}: {
  calm?: boolean;
  spirals?: boolean;
}) {
  const src = calm ? "/assets/calm.png" : "/assets/freak.png";

  return (
    <div className="relative h-full w-full">
      <Image
        src={src}
        alt="PMFreak"
        fill
        className="object-contain"
        priority
      />

      {/* 🔥 SPIRAL OVERLAY */}
      {spirals && !calm && (
        <>
          <motion.div
            className="absolute left-[32%] top-[45%] h-8 w-8 rounded-full border-[4px] border-[#ff1493] border-l-transparent"
            animate={{ rotate: 360, scale: [1, 1.2, 1] }}
            transition={{ duration: 0.4, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute left-[58%] top-[45%] h-8 w-8 rounded-full border-[4px] border-[#ff1493] border-l-transparent"
            animate={{ rotate: -360, scale: [1, 1.2, 1] }}
            transition={{ duration: 0.4, repeat: Infinity, ease: "linear" }}
          />
        </>
      )}
    </div>
  );
}
