"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import type { AnalysisResult } from "@/lib/types";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const item = {
  hidden: { opacity: 0, y: 18, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function useCountUp(target: number, enabled: boolean, decimals = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const start = performance.now();
    const duration = 900;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setValue(target * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, enabled]);
  return decimals ? value.toFixed(decimals) : Math.round(value).toString();
}

export function KpiStrip({ result }: { result: AnalysisResult }) {
  const proteins = useCountUp(result.nProteins, true);
  const lots = useCountUp(result.nLots, true);
  const samples = useCountUp(result.nSamples, true);
  const cv = useCountUp(result.qc.medianBetweenCv, true, 1);
  const pass = useCountUp(result.qc.pctPass, true);

  const cards = [
    { label: "Proteins", value: proteins, hint: "quantified genes" },
    { label: "Lots / samples", value: `${lots} / ${samples}`, hint: "lot genealogy" },
    { label: "Median lot-to-lot CV", value: `${cv}%`, hint: "between-lot" },
    { label: "Proteins passing CV", value: `${pass}%`, hint: `≤ ${result.qc.passCv.toFixed(0)}%` },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 gap-3 xl:grid-cols-4"
    >
      {cards.map((card) => (
        <motion.article
          key={card.label}
          variants={item}
          className="glass rounded-2xl px-4 py-4"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            {card.label}
          </p>
          <p className="font-serif mt-2 text-3xl font-semibold tracking-tight text-[var(--ink)]">{card.value}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{card.hint}</p>
        </motion.article>
      ))}
    </motion.div>
  );
}
