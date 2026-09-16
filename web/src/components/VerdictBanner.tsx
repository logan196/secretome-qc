"use client";

import { motion } from "framer-motion";

import type { Verdict } from "@/lib/types";

const TONE: Record<string, string> = {
  PASS: "bg-emerald-50 text-emerald-800 border-emerald-200",
  REVIEW: "bg-amber-50 text-amber-900 border-amber-200",
  FAIL: "bg-rose-50 text-rose-800 border-rose-200",
  NA: "bg-slate-50 text-slate-700 border-slate-200",
};

export function VerdictBanner({
  verdict,
  detail,
}: {
  verdict: Verdict;
  detail: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 ${TONE[verdict] ?? TONE.NA}`}
    >
      <span className="mr-2 tracking-[0.14em]">{verdict}</span>
      <span className="font-medium opacity-90">— {detail}</span>
    </motion.div>
  );
}
