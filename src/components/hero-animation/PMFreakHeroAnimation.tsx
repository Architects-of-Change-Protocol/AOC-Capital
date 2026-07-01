"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FloatingLabel } from "./FloatingLabel";
import { PMFreakFace } from "./PMFreakFace";
import { SceneText } from "./SceneText";
import { SpiralToTracks } from "./SpiralToTracks";
import { ToyTrain } from "./ToyTrain";

type Phase = 0 | 1 | 2 | 3 | 4 | 5;

const timeline = [
  { phase: 0, duration: 2600 }, // caos largo
  { phase: 1, duration: 1800 }, // caos + spirals
  { phase: 2, duration: 900 },  // transición rápida
  { phase: 3, duration: 1400 }, // tracks
  { phase: 4, duration: 1800 }, // train
  { phase: 5, duration: 2600 }, // resultado respira
];

export function PMFreakHeroAnimation() {
  const [phase, setPhase] = useState<Phase>(0);

  useEffect(() => {
    let i = 0;
    let timeout: NodeJS.Timeout;

    const run = () => {
      const current = timeline[i];
      setPhase(current.phase as Phase);

      timeout = setTimeout(() => {
        i = (i + 1) % timeline.length;
        run();
      }, current.duration);
    };

    run();
    return () => clearTimeout(timeout);
  }, []);

  const showChaos = phase <= 1;
  const showSpirals = phase === 1 || phase === 2;
  const showFromChaos = phase === 2;
  const showTracks = phase >= 3;
  const showTrain = phase === 4;
  const showFinal = phase === 5;

  return (
    <div className="relative min-h-[340px] w-full overflow-hidden rounded-3xl border-2 border-black bg-[radial-gradient(circle_at_center,#ffe4ec_0%,#fff8ec_50%,#ffffff_100%)] shadow-[8px_8px_0_#000] md:min-h-[460px]">

      {showChaos && (
        <>
          <FloatingLabel text="Scope Creep" className="left-[4%] top-[16%]" delay={0} />
          <FloatingLabel text="Shipping Delay" className="right-[8%] top-[20%]" delay={0.12} />
          <FloatingLabel text="No Owner" className="left-[10%] top-[65%]" delay={0.24} />
          <FloatingLabel text="Missing Docs" className="right-[7%] top-[62%]" delay={0.36} />
          <FloatingLabel text="Escalation" className="left-[34%] top-[7%]" delay={0.48} />
        </>
      )}

      {/* FACE */}
      <motion.div
        className="absolute left-1/2 top-[15%] z-30 h-[180px] w-[180px] -translate-x-1/2 md:h-[230px] md:w-[230px]"
        animate={{
          scale: showSpirals ? [1, 1.05, 1] : 1,
          rotate: showChaos ? [-1, 1, -1] : 0,
          opacity: showFinal ? 0 : 1,
        }}
      >
        <PMFreakFace spirals={showSpirals} />
      </motion.div>

      <SpiralToTracks phase={showFromChaos ? "spiral" : showTracks ? "tracks" : "hidden"} />

      <SceneText
        text="From chaos to..."
        active={showFromChaos}
        className="left-1/2 top-[47%] -translate-x-1/2"
      />

      <ToyTrain active={showTrain} />

      {/* 🔥 HERO MOMENT */}
      <motion.div
        className="absolute left-1/2 top-[16%] z-50 -translate-x-1/2"
        animate={{
          scale: showFinal ? [1, 1.12, 1] : 0.9,
          opacity: showFinal ? 1 : 0,
        }}
        transition={{ duration: 0.6 }}
      >
        <SceneText text="Back on Track" active={showFinal} className="bg-[#ff1493] text-white text-3xl md:text-5xl px-6 py-3" />
      </motion.div>

      {/* CALM FACE */}
      <motion.div
        className="absolute left-1/2 top-[32%] z-50 h-[170px] w-[170px] -translate-x-1/2 md:h-[220px] md:w-[220px]"
        animate={{
          opacity: showFinal ? 1 : 0,
          y: showFinal ? [10, 0] : 10,
          scale: showFinal ? [0.9, 1] : 0.8,
        }}
        transition={{ duration: 0.7 }}
      >
        <PMFreakFace calm />
      </motion.div>
    </div>
  );
}
