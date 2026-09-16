"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

import { VerdictBanner } from "@/components/VerdictBanner";
import { LOT_COLORS, LOT_COLORWAY, type AnalysisResult } from "@/lib/types";

function colorFor(lot: string, index: number) {
  return LOT_COLORS[lot] ?? LOT_COLORWAY[index % LOT_COLORWAY.length];
}

export function PcaPanel({ result }: { result: AnalysisResult }) {
  const [hover, setHover] = useState<string | null>(null);
  const lots = result.lots;
  const { points, width, height } = useMemo(() => {
    const w = 640;
    const h = 420;
    const pad = 42;
    const xs = result.pca.scores.map((row) => row.pc1);
    const ys = result.pca.scores.map((row) => row.pc2);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const points = result.pca.scores.map((row) => ({
      ...row,
      x: pad + ((row.pc1 - minX) / (maxX - minX || 1)) * (w - pad * 2),
      y: h - pad - ((row.pc2 - minY) / (maxY - minY || 1)) * (h - pad * 2),
    }));
    return { points, width: w, height: h };
  }, [result.pca.scores]);

  return (
    <section className="glass rounded-3xl p-5">
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">(b) PCA lot comparability</p>
        <h2 className="font-serif mt-1 text-2xl text-[var(--ink)]">Global secretome geometry</h2>
      </div>
      <VerdictBanner verdict={result.pca.verdict} detail={result.pca.verdictDetail} />

      <svg viewBox={`0 0 ${width} ${height}`} className="mt-5 h-auto w-full" role="img" aria-label="PCA scatter by lot">
        <rect x="0" y="0" width={width} height={height} rx="18" fill="#F8FBFC" />
        {[0.25, 0.5, 0.75].map((frac) => (
          <g key={frac} stroke="#E4EEF1">
            <line x1="42" x2={width - 24} y1={height * frac} y2={height * frac} />
            <line y1="42" y2={height - 36} x1={width * frac} x2={width * frac} />
          </g>
        ))}
        <text x={width / 2} y={height - 10} textAnchor="middle" fill="#5b6b76" fontSize="12">
          PC1 ({result.pca.variance[0].toFixed(1)}%)
        </text>
        <text
          x="14"
          y={height / 2}
          textAnchor="middle"
          fill="#5b6b76"
          fontSize="12"
          transform={`rotate(-90 14 ${height / 2})`}
        >
          PC2 ({result.pca.variance[1].toFixed(1)}%)
        </text>
        {lots.map((lot, lotIndex) => {
          const members = points.filter((point) => point.lot === lot);
          const cx = members.reduce((sum, p) => sum + p.x, 0) / members.length;
          const cy = members.reduce((sum, p) => sum + p.y, 0) / members.length;
          return (
            <motion.circle
              key={`${lot}-halo`}
              cx={cx}
              cy={cy}
              r="28"
              fill={colorFor(lot, lotIndex)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.08 }}
              transition={{ delay: 0.2 }}
            />
          );
        })}
        {points.map((point, index) => (
          <motion.circle
            key={point.sample}
            cx={point.x}
            cy={point.y}
            r={hover === point.sample ? 10 : 8}
            fill={colorFor(point.lot, lots.indexOf(point.lot))}
            stroke="#fff"
            strokeWidth="1.6"
            initial={{ opacity: 0, scale: 0.2 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + index * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: `${point.x}px ${point.y}px` }}
            onMouseEnter={() => setHover(point.sample)}
            onMouseLeave={() => setHover(null)}
          >
            <title>{point.sample}</title>
          </motion.circle>
        ))}
      </svg>
      {hover ? (
        <p className="mt-2 text-sm font-medium text-[var(--ink)]">{hover}</p>
      ) : (
        <p className="mt-2 text-sm text-[var(--muted)]">Hover a replicate to identify the sample.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-3">
        {lots.map((lot, index) => (
          <span key={lot} className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--ink)]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorFor(lot, index) }} />
            {lot}
          </span>
        ))}
      </div>
    </section>
  );
}
