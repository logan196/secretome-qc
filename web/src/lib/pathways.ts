import { hypergeomSf, mean, sampleStd } from "./math";
import { log2Transform } from "./ingest";
import type { AbundanceMatrix, GeneSetLibrary, PathwayResult } from "./types";

function zscoreRows(matrix: number[][]): number[][] {
  return matrix.map((row) => {
    const mu = mean(row);
    const sd = sampleStd(row);
    if (!Number.isFinite(sd) || sd === 0) return row.map(() => Number.NaN);
    return row.map((value) => (value - mu) / sd);
  });
}

export function analyzePathways(matrix: AbundanceMatrix, geneSets: GeneSetLibrary): PathwayResult {
  const logMat = zscoreRows(log2Transform(matrix.intensities));
  const universe = new Set(matrix.proteins);
  const pathwayNames = Object.keys(geneSets);
  const sampleScores: Record<string, number[]> = {};

  for (const name of pathwayNames) {
    const genes = geneSets[name].genes.map((gene) => gene.toUpperCase()).filter((gene) => universe.has(gene));
    if (!genes.length) {
      sampleScores[name] = matrix.samples.map(() => Number.NaN);
      continue;
    }
    const idxs = genes.map((gene) => matrix.proteins.indexOf(gene));
    sampleScores[name] = matrix.samples.map((_, col) => mean(idxs.map((idx) => logMat[idx][col])));
  }

  const lots = [...new Set(matrix.lots)];
  const lotScores: Record<string, Record<string, number | null>> = {};
  for (const lot of lots) {
    lotScores[lot] = {};
    const cols = matrix.lots.map((value, idx) => (value === lot ? idx : -1)).filter((idx) => idx >= 0);
    for (const name of pathwayNames) {
      const values = cols.map((idx) => sampleScores[name][idx]);
      const scored = mean(values);
      lotScores[lot][name] = Number.isFinite(scored) ? scored : null;
    }
  }

  const means = pathwayNames.map((name) => ({
    name,
    value: mean(lots.map((lot) => lotScores[lot][name] ?? Number.NaN)),
  }));
  means.sort((a, b) => (b.value || 0) - (a.value || 0));

  const abundance = matrix.proteins.map((protein, idx) => ({
    protein,
    value: mean(log2Transform(matrix.intensities)[idx]),
  }));
  abundance.sort((a, b) => b.value - a.value);
  const querySize = Math.max(8, Math.ceil(abundance.length * 0.25));
  const query = new Set(abundance.slice(0, querySize).map((row) => row.protein));
  const nUniverse = universe.size;

  const ora = pathwayNames.map((name) => {
    const spec = geneSets[name];
    const geneset = new Set(spec.genes.map((gene) => gene.toUpperCase()).filter((gene) => universe.has(gene)));
    const overlap = [...query].filter((gene) => geneset.has(gene)).sort();
    const k = overlap.length;
    const kSet = geneset.size;
    const pValue = kSet && k ? hypergeomSf(k, nUniverse, kSet, querySize) : 1;
    return {
      pathway: name,
      description: spec.description ?? "",
      overlap: k,
      setInMatrix: kSet,
      querySize,
      pValue,
      overlapGenes: overlap.slice(0, 12).join(", "),
    };
  });
  ora.sort((a, b) => a.pValue - b.pValue);

  return {
    lotScores,
    pathwayNames,
    ora,
    topPathways: means.map((row) => row.name),
  };
}
