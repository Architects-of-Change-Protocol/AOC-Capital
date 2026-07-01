"use client";

import Link from "next/link";

export function AnimatedHero() {
  return (
    <section
      id="hero"
      className="scroll-mt-28 grid gap-8 rounded-3xl border-2 border-black bg-[#fff8ec] p-6 shadow-[10px_10px_0_#161616] md:grid-cols-[1.05fr_0.95fr] md:p-10"
    >
      {/* LEFT */}
      <div className="flex flex-col justify-center">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-pink-600">
          AI Project Manager
        </p>

        <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
          Your AI Project Manager that keeps execution on track.
        </h1>

        <p className="mt-5 max-w-xl text-base font-medium text-black/80 md:text-lg">
          PMFreak detects project drift, nudges hard when things get risky,
          and brings execution back on track.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="rounded-full border-2 border-black bg-pink-500 px-6 py-3 text-sm font-black text-white shadow-[4px_4px_0_#161616]"
          >
            Try PMFreak
          </Link>

          <Link
            href="/#product"
            className="rounded-full border-2 border-black bg-white px-6 py-3 text-sm font-black shadow-[4px_4px_0_#161616]"
          >
            See the product
          </Link>
        </div>
      </div>

      {/* RIGHT — VIDEO WITH FRAME */}
      <div className="flex items-center justify-center">
        <div className="rounded-2xl border-4 border-black bg-white p-2 shadow-[8px_8px_0_#161616]">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full max-w-[500px] h-auto rounded-lg"
          >
            <source src="/Hero.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </section>
  );
}
