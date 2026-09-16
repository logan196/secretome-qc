export type Verdict = "PASS" | "REVIEW" | "FAIL" | "NA";

export type SampleMeta = {
  sample: string;
  lot: string;
};

export type AbundanceMatrix = {
  proteins: string[];
  samples: string[];
  lots: string[];
  intensities: number[][];
  sourceLabel: string;
  isDemo: boolean;
};

export type ProteinCvRow = {
  protein: string;
  betweenLotCvPct: number | null;
  medianWithinLotCvPct: number | null;
  status: Verdict;
};

export type LotSummaryRow = {
  lot: string;
  nReplicates: number;
  medianWithinLotCvPct: number;
  pctProteinsCvLePass: number;
};

export type QCResult = {
  proteinTable: ProteinCvRow[];
  lotSummary: LotSummaryRow[];
  medianBetweenCv: number;
  pctPass: number;
  verdict: Verdict;
  verdictDetail: string;
  passCv: number;
  reviewCv: number;
};

export type PcaScore = {
  sample: string;
  pc1: number;
  pc2: number;
  lot: string;
};

export type PCAResult = {
  scores: PcaScore[];
  variance: number[];
  betweenWithinRatio: number | null;
  verdict: Verdict;
  verdictDetail: string;
};

export type OraRow = {
  pathway: string;
  description: string;
  overlap: number;
  setInMatrix: number;
  querySize: number;
  pValue: number;
  overlapGenes: string;
};

export type PathwaySpec = {
  description: string;
  genes: string[];
};

export type GeneSetLibrary = Record<string, PathwaySpec>;

export type PathwayResult = {
  lotScores: Record<string, Record<string, number | null>>;
  pathwayNames: string[];
  ora: OraRow[];
  topPathways: string[];
};

export type AnalysisResult = {
  sourceLabel: string;
  isDemo: boolean;
  nProteins: number;
  nSamples: number;
  nLots: number;
  lots: string[];
  samples: string[];
  matrix: AbundanceMatrix;
  qc: QCResult;
  pca: PCAResult;
  pathways: PathwayResult;
};

export const DEFAULT_PASS_CV = 20;
export const DEFAULT_REVIEW_CV = 30;

export const LOT_COLORS: Record<string, string> = {
  LotA: "#0F766E",
  LotB: "#4338CA",
  LotC: "#B45309",
  LotD: "#0369A1",
};

export const LOT_COLORWAY = ["#0F766E", "#4338CA", "#B45309", "#0369A1", "#BE185D", "#4D7C0F"];

export const STATUS_COLORS: Record<string, string> = {
  PASS: "#047857",
  REVIEW: "#B45309",
  FAIL: "#B91C1C",
  NA: "#64748B",
};
