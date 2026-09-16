import { uniqueLots } from "./ingest";
import { analyzePathways } from "./pathways";
import { runPca } from "./pca";
import { computeLotCv } from "./qc";
import type { AbundanceMatrix, AnalysisResult, GeneSetLibrary } from "./types";

export function analyze(
  matrix: AbundanceMatrix,
  geneSets: GeneSetLibrary,
  passCv = 20,
  reviewCv = 30,
): AnalysisResult {
  const qc = computeLotCv(matrix, passCv, reviewCv);
  const pca = runPca(matrix);
  const pathways = analyzePathways(matrix, geneSets);
  const lots = uniqueLots(matrix);
  return {
    sourceLabel: matrix.sourceLabel,
    isDemo: matrix.isDemo,
    nProteins: matrix.proteins.length,
    nSamples: matrix.samples.length,
    nLots: lots.length,
    lots,
    samples: matrix.samples,
    matrix,
    qc,
    pca,
    pathways,
  };
}

export function recomputeQc(result: AnalysisResult, geneSets: GeneSetLibrary, passCv: number, reviewCv: number): AnalysisResult {
  return analyze(result.matrix, geneSets, passCv, reviewCv);
}
