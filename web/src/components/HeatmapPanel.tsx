"use client";

import { motion } from "framer-motion";

import type { AnalysisResult } from "@/lib/types";

function heatColor(z: number, maxAbs: number) {
  const t = (z / maxAbs + 1) / 2;
  const mix = (from: number[], to: number[], u: number) =>
    from.map((channel, i) => Math.round(channel + (to[i] - channel) * u));
  const low = [30, 58, 95];
  const mid = [248, 250, 252];
  const high = [15, 118, 110];
  const rgb = t < 0.5 ? mix(low, mid, t / 0.5) : mix(mid, high, (t - 0.5) / 0.5);
  return `rgb(${rgb.join(",")})`;
}

export function HeatmapPanel({ result }: { result: AnalysisResult }) {
  const lots = Object.keys(result.pathways.lotScores);
  const paths = result.pathways.pathwayNames;
  const values = lots.flatMap((lot) => paths.map((path) => result.pathways.lotScores[lot][path] ?? 0));
  const maxAbs = Math.max(0.01, ...values.map((value) => Math.abs(value)));

  return (
    <section className="glass rounded-3xl p-5">
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">(c) Pathway / signature activity</p>
        <h2 className="font-serif mt-1 text-2xl text-[var(--ink)]">MoA heatmap by lot</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Lightweight signature scores (mean protein z-score) plus hypergeometric ORA on the top-abundance
          quartile against the bundled mini library: anti-inflammatory, neuroprotective, anti-apoptotic.
        </p>
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid min-w-[640px] gap-2"
          style={{ gridTemplateColumns: `88px repeat(${paths.length}, minmax(0, 1fr))` }}
        >
          <div />
          {paths.map((path) => (
            <div key={path} className="px-2 text-center text-xs font-semibold capitalize text-[var(--ink)]">
              {path}
            </div>
          ))}
          {lots.flatMap((lot, row) => [
            <div key={`${lot}-label`} className="flex items-center text-sm font-semibold">
              {lot}
            </div>,
            ...paths.map((path, col) => {
              const z = result.pathways.lotScores[lot][path] ?? 0;
              return (
                <motion.div
                  key={`${lot}-${path}`}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.08 * (row + col), duration: 0.45 }}
                  className="flex h-16 items-center justify-center rounded-2xl text-sm font-semibold text-[var(--ink)]"
                  style={{ background: heatColor(z, maxAbs) }}
                >
                  {z.toFixed(2)}
                </motion.div>
              );
            }),
          ])}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
            <tr>
              <th className="pb-2">Pathway</th>
              <th className="pb-2">p-value</th>
              <th className="pb-2">Overlap</th>
              <th className="pb-2">Genes</th>
            </tr>
          </thead>
          <tbody>
            {result.pathways.ora.map((row) => (
              <tr key={row.pathway} className="border-t border-[var(--line)] align-top">
                <td className="py-2 font-semibold capitalize">{row.pathway}</td>
                <td className="py-2">{row.pValue.toExponential(2)}</td>
                <td className="py-2">
                  {row.overlap}/{row.setInMatrix}
                </td>
                <td className="py-2 text-[var(--muted)]">{row.overlapGenes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
