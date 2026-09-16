import { coefficientOfVariation, median } from "./math";
import type { AbundanceMatrix, QCResult, Verdict } from "./types";
import { uniqueLots } from "./ingest";

export function classifyCv(cv: number, passCv: number, reviewCv: number): Verdict {
  if (!Number.isFinite(cv)) return "NA";
  if (cv <= passCv) return "PASS";
  if (cv <= reviewCv) return "REVIEW";
  return "FAIL";
}

export function overallVerdict(
  medianCv: number,
  pctPass: number,
  passCv: number,
  reviewCv: number,
): { verdict: Verdict; detail: string } {
  if (medianCv <= passCv && pctPass >= 70) {
    return {
      verdict: "PASS",
      detail: `Lots are comparable: median lot-to-lot CV is ${medianCv.toFixed(1)}% and ${pctPass.toFixed(0)}% of proteins meet the ${passCv.toFixed(0)}% threshold.`,
    };
  }
  if (medianCv <= reviewCv || pctPass >= 50) {
    return {
      verdict: "REVIEW",
      detail: `Lots are borderline: median lot-to-lot CV is ${medianCv.toFixed(1)}% (${pctPass.toFixed(0)}% of proteins pass ${passCv.toFixed(0)}%). Review drifting analytes before release.`,
    };
  }
  return {
    verdict: "FAIL",
    detail: `Lots are not comparable under current thresholds: median lot-to-lot CV is ${medianCv.toFixed(1)}% and only ${pctPass.toFixed(0)}% of proteins pass ${passCv.toFixed(0)}%.`,
  };
}

function lotIndexGroups(matrix: AbundanceMatrix): Map<string, number[]> {
  const groups = new Map<string, number[]>();
  matrix.lots.forEach((lot, idx) => {
    const list = groups.get(lot) ?? [];
    list.push(idx);
    groups.set(lot, list);
  });
  return groups;
}

export function computeLotCv(matrix: AbundanceMatrix, passCv = 20, reviewCv = 30): QCResult {
  const groups = lotIndexGroups(matrix);
  const proteinTable = matrix.proteins.map((protein, rowIdx) => {
    const series = matrix.intensities[rowIdx].map((value) => (value < 0 ? 0 : value));
    const lotMeans: number[] = [];
    const within: number[] = [];
    for (const idxs of groups.values()) {
      const vals = idxs.map((idx) => series[idx]);
      within.push(coefficientOfVariation(vals));
      const finite = vals.filter(Number.isFinite);
      if (finite.length) lotMeans.push(finite.reduce((a, b) => a + b, 0) / finite.length);
    }
    const between = coefficientOfVariation(lotMeans);
    return {
      protein,
      betweenLotCvPct: Number.isFinite(between) ? between : null,
      medianWithinLotCvPct: Number.isFinite(median(within)) ? median(within) : null,
      status: classifyCv(between, passCv, reviewCv),
    };
  });

  proteinTable.sort((a, b) => {
    if (a.betweenLotCvPct === null) return 1;
    if (b.betweenLotCvPct === null) return -1;
    return a.betweenLotCvPct - b.betweenLotCvPct;
  });

  const lotSummary = [...groups.entries()].map(([lot, idxs]) => {
    const proteinCvs = matrix.intensities.map((row) => {
      const vals = idxs.map((idx) => (row[idx] < 0 ? 0 : row[idx]));
      return coefficientOfVariation(vals);
    });
    const passShare = proteinCvs.filter((cv) => Number.isFinite(cv) && cv <= passCv).length / proteinCvs.length;
    return {
      lot,
      nReplicates: idxs.length,
      medianWithinLotCvPct: median(proteinCvs),
      pctProteinsCvLePass: passShare * 100,
    };
  });

  const scored = proteinTable.map((row) => row.betweenLotCvPct).filter((value): value is number => value !== null);
  const medianBetween = median(scored);
  const pctPass = (proteinTable.filter((row) => row.status === "PASS").length / proteinTable.length) * 100;
  const { verdict, detail } = overallVerdict(medianBetween, pctPass, passCv, reviewCv);

  return {
    proteinTable,
    lotSummary,
    medianBetweenCv: medianBetween,
    pctPass,
    verdict,
    verdictDetail: detail,
    passCv,
    reviewCv,
  };
}

export function lotCount(matrix: AbundanceMatrix): number {
  return uniqueLots(matrix).length;
}
