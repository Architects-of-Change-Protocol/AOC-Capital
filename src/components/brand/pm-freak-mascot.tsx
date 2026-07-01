import type { ReactNode } from "react";

export type PmFreakMood = "chaos" | "calm" | "celebration";

function Face({ mood }: { mood: PmFreakMood }) {
  const eyePath = mood === "calm" ? "M150 143q10 8 20 0M210 143q10 8 20 0" : "M150 139q10-8 20 0M210 139q10-8 20 0";
  const mouthPath = mood === "calm" ? "M160 192q28 18 56 0" : mood === "celebration" ? "M158 194q30 24 60 0" : "M162 192q28-18 56 0";
  const teethPath = "M170 202h40M178 196v12M190 196v12M202 196v12";
  const eyeSize = mood === "calm" ? 4 : 7;

  return (
    <>
      <path d="M96 82c38-46 126-52 182-2" fill="none" stroke="#171717" strokeWidth="7" strokeLinecap="round" />
      <path d="M108 104c34-30 88-42 144-18 22 10 40 24 52 40" fill="none" stroke="#171717" strokeWidth="7" strokeLinecap="round" />
      <circle cx="186" cy="154" r="84" fill="#fffdf8" stroke="#171717" strokeWidth="7" />
      <path d="M112 132c20-18 40-32 64-40M128 168c12-22 30-44 54-64M258 92c-22 12-38 28-52 48M276 134c-16-20-40-34-68-42" fill="none" stroke="#171717" strokeWidth="7" strokeLinecap="round" />
      <rect x="122" y="124" width="68" height="50" rx="22" fill="none" stroke="#171717" strokeWidth="8" />
      <rect x="186" y="124" width="68" height="50" rx="22" fill="none" stroke="#171717" strokeWidth="8" />
      <path d="M190 146h2" stroke="#171717" strokeWidth="8" strokeLinecap="round" />
      <path d={eyePath} fill="none" stroke="#171717" strokeWidth="6" strokeLinecap="round" />
      <circle cx="160" cy="151" r={eyeSize} fill="#171717" />
      <circle cx="220" cy="151" r={eyeSize} fill="#171717" />
      <path d={mouthPath} fill="none" stroke="#171717" strokeWidth="7" strokeLinecap="round" />
      {mood !== "calm" ? <path d={teethPath} fill="none" stroke="#171717" strokeWidth="5" strokeLinecap="round" /> : null}
      <circle cx="124" cy="194" r="10" fill="#4ad4e2" stroke="#171717" strokeWidth="5" />
      <circle cx="248" cy="194" r="10" fill="#4ad4e2" stroke="#171717" strokeWidth="5" />
    </>
  );
}

const sparks: Record<PmFreakMood, ReactNode> = {
  chaos: <path d="M60 60l-16-8M320 64l18-10M92 52l-8-14M280 52l12-14" stroke="#171717" strokeWidth="5" strokeLinecap="round" />,
  calm: (
    <>
      <rect x="252" y="212" width="34" height="34" rx="8" fill="#118383" stroke="#171717" strokeWidth="4" />
      <path d="M262 230l8 8 12-16" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  celebration: <path d="M186 20v24M144 30l10 18M228 30l-10 18M116 52l18 12M256 52l-18 12" fill="none" stroke="#171717" strokeWidth="5" strokeLinecap="round" />,
};

export function PmFreakMascot({ mood = "chaos", className = "w-full" }: { mood?: PmFreakMood; className?: string }) {
  return (
    <svg viewBox="0 0 380 300" className={className} aria-label={`PM Freak mascot ${mood}`}>
      <Face mood={mood} />
      {sparks[mood]}
    </svg>
  );
}
