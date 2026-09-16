import { frobeniusNormSquared, jacobiEigen, matMul, mean, median, populationStd, transpose } from "./math";
import { log2Transform } from "./ingest";
import type { AbundanceMatrix, PCAResult, Verdict } from "./types";

function imputeMedian(rows: number[][]): number[][] {
  if (!rows.length) return rows;
  const nCols = rows[0].length;
  const medians = Array.from({ length: nCols }, (_, col) => median(rows.map((row) => row[col])));
  return rows.map((row) => row.map((value, col) => (Number.isFinite(value) ? value : medians[col])));
}

function standardScale(rows: number[][]): number[][] {
  if (!rows.length) return rows;
  const nCols = rows[0].length;
  const means = Array.from({ length: nCols }, (_, col) => mean(rows.map((row) => row[col])));
  const stds = Array.from({ length: nCols }, (_, col) => {
    const s = populationStd(rows.map((row) => row[col]));
    return !Number.isFinite(s) || s === 0 ? 1 : s;
  });
  return rows.map((row) => row.map((value, col) => (value - means[col]) / stds[col]));
}

function lotGeometry(scores: { pc1: number; pc2: number; lot: string }[]): number {
  const lots = [...new Set(scores.map((row) => row.lot))];
  const centroids = new Map<string, { pc1: number; pc2: number }>();
  for (const lot of lots) {
    const pts = scores.filter((row) => row.lot === lot);
    centroids.set(lot, {
      pc1: mean(pts.map((p) => p.pc1)),
      pc2: mean(pts.map((p) => p.pc2)),
    });
  }
  const within: number[] = [];
  for (const lot of lots) {
    const pts = scores.filter((row) => row.lot === lot);
    if (pts.length < 2) continue;
    const center = centroids.get(lot)!;
    within.push(mean(pts.map((p) => Math.hypot(p.pc1 - center.pc1, p.pc2 - center.pc2))));
  }
  const meanWithin = mean(within);
  if (centroids.size < 2 || !Number.isFinite(meanWithin) || meanWithin === 0) return Number.NaN;
  const coords = [...centroids.values()];
  const dists: number[] = [];
  for (let i = 0; i < coords.length; i += 1) {
    for (let j = i + 1; j < coords.length; j += 1) {
      dists.push(Math.hypot(coords[i].pc1 - coords[j].pc1, coords[i].pc2 - coords[j].pc2));
    }
  }
  return mean(dists) / meanWithin;
}

function pcaVerdict(ratio: number): { verdict: Verdict; detail: string } {
  if (!Number.isFinite(ratio)) {
    return { verdict: "REVIEW", detail: "Not enough replicates to score PCA lot overlap." };
  }
  if (ratio <= 2.2) {
    return {
      verdict: "PASS",
      detail: `Lots overlap in PC space (between/within distance ratio ${ratio.toFixed(2)} ≤ 2.2). Global abundance profiles are comparable.`,
    };
  }
  if (ratio <= 3.5) {
    return {
      verdict: "REVIEW",
      detail: `Lots are partially separated in PC space (ratio ${ratio.toFixed(2)}). Inspect drifting proteins before calling full comparability.`,
    };
  }
  return {
    verdict: "FAIL",
    detail: `Lots form distinct clusters (ratio ${ratio.toFixed(2)} > 3.5). Global secretome profiles are not comparable.`,
  };
}

export function runPca(matrix: AbundanceMatrix): PCAResult {
  const logMat = log2Transform(matrix.intensities);
  const samplesByProtein = transpose(logMat);
  const imputed = imputeMedian(samplesByProtein);
  const scaled = standardScale(imputed);
  const gram = matMul(scaled, transpose(scaled));
  const { values, vectors } = jacobiEigen(gram);
  const order = values.map((value, idx) => ({ value, idx })).sort((a, b) => b.value - a.value);
  const totalVar = frobeniusNormSquared(scaled) || 1;
  const top = [order[0], order[1] ?? order[0]];
  const scores = matrix.samples.map((sample, row) => {
    const u1 = vectors[row][top[0].idx];
    const u2 = vectors[row][top[1].idx];
    const s1 = Math.sqrt(Math.max(top[0].value, 0));
    const s2 = Math.sqrt(Math.max(top[1].value, 0));
    return {
      sample,
      pc1: u1 * s1,
      pc2: u2 * s2,
      lot: matrix.lots[row],
    };
  });
  const ratio = lotGeometry(scores);
  const { verdict, detail } = pcaVerdict(ratio);
  return {
    scores,
    variance: [(top[0].value / totalVar) * 100, (top[1].value / totalVar) * 100],
    betweenWithinRatio: Number.isFinite(ratio) ? ratio : null,
    verdict,
    verdictDetail: detail,
  };
}
