"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

import { VerdictBanner } from "@/components/VerdictBanner";
import { STATUS_COLORS, type AnalysisResult } from "@/lib/types";

export function CvPanel({ result }: { result: AnalysisResult }) {
  const [open, setOpen] = useState(false);
  const rows = useMemo(() => {
    return result.qc.proteinTable
      .filter((row) => row.betweenLotCvPct !== null)
      .sort((a, b) => (a.betweenLotCvPct ?? 0) - (b.betweenLotCvPct ?? 0))
      .slice(-25)
      .reverse();
  }, [result.qc.proteinTable]);
  const maxCv = Math.max(result.qc.reviewCv, ...rows.map((row) => row.betweenLotCvPct ?? 0), 1);

  return (
    <section className="glass rounded-3xl p-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">(a) Lot-to-lot CV</p>
          <h2 className="font-serif mt-1 text-2xl text-[var(--ink)]">Comparability by protein</h2>
        </div>
        <p className="text-xs text-[var(--muted)]">Highest 25 CVs · linear intensities</p>
      </div>
      <VerdictBanner verdict={result.qc.verdict} detail={result.qc.verdictDetail} />

      <div className="mt-5 overflow-x-auto">
        <table className="mb-5 w-full text-left text-sm">
          <thead className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
            <tr>
              <th className="pb-2 font-semibold">Lot</th>
              <th className="pb-2 font-semibold">Reps</th>
              <th className="pb-2 font-semibold">Median within-lot CV</th>
              <th className="pb-2 font-semibold">% ≤ pass</th>
            </tr>
          </thead>
          <tbody>
            {result.qc.lotSummary.map((lot) => (
              <tr key={lot.lot} className="border-t border-[var(--line)]">
                <td className="py-2 font-semibold">{lot.lot}</td>
                <td>{lot.nReplicates}</td>
                <td>{lot.medianWithinLotCvPct.toFixed(2)}%</td>
                <td>{lot.pctProteinsCvLePass.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-1.5">
        {rows.map((row, index) => {
          const width = ((row.betweenLotCvPct ?? 0) / maxCv) * 100;
          return (
            <div key={row.protein} className="grid grid-cols-[72px_1fr_52px] items-center gap-2">
              <span className="truncate text-xs font-semibold text-[var(--ink)]">{row.protein}</span>
              <div className="relative h-3 overflow-hidden rounded-full bg-slate-100">
                <span
                  className="absolute inset-y-0 left-0 border-r border-dashed border-emerald-400/80"
                  style={{ width: `${(result.qc.passCv / maxCv) * 100}%` }}
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.7, delay: index * 0.03, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full"
                  style={{ background: STATUS_COLORS[row.status] }}
                />
              </div>
              <span className="text-right text-xs text-[var(--muted)]">{(row.betweenLotCvPct ?? 0).toFixed(1)}%</span>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mt-5 text-sm font-semibold text-teal-800 underline-offset-4 hover:underline"
      >
        {open ? "Hide full protein CV table" : "Show full protein CV table"}
      </button>
      {open ? (
        <div className="mt-3 max-h-80 overflow-auto rounded-2xl border border-[var(--line)]">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-white text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
              <tr>
                <th className="px-3 py-2">Protein</th>
                <th className="px-3 py-2">Between-lot CV</th>
                <th className="px-3 py-2">Median within-lot CV</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {result.qc.proteinTable.map((row) => (
                <tr key={row.protein} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 font-semibold">{row.protein}</td>
                  <td className="px-3 py-1.5">{row.betweenLotCvPct?.toFixed(2) ?? "NA"}</td>
                  <td className="px-3 py-1.5">{row.medianWithinLotCvPct?.toFixed(2) ?? "NA"}</td>
                  <td className="px-3 py-1.5" style={{ color: STATUS_COLORS[row.status] }}>
                    {row.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
