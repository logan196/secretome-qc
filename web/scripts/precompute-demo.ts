import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { analyze } from "../src/lib/analyze";
import { loadAbundanceMatrix } from "../src/lib/ingest";
import { DEFAULT_PASS_CV, DEFAULT_REVIEW_CV } from "../src/lib/types";
import geneSets from "../src/data/moa_gene_sets.json";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const csvPath = resolve(root, "src/data/DEMO_PUBLIC_st266_style_secretome.csv");
const outPath = resolve(root, "src/data/demo_results.json");

const csv = readFileSync(csvPath, "utf8");
const matrix = loadAbundanceMatrix(csv, {
  sourceLabel: "Bundled DEMO / PUBLIC ST-266-style matrix",
  isDemo: true,
});
const result = analyze(matrix, geneSets, DEFAULT_PASS_CV, DEFAULT_REVIEW_CV);

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);

console.log(
  `Wrote ${outPath}\n` +
    `  proteins=${result.nProteins} lots=${result.nLots} samples=${result.nSamples}\n` +
    `  QC=${result.qc.verdict} medianCV=${result.qc.medianBetweenCv.toFixed(2)}% pass=${result.qc.pctPass.toFixed(1)}%\n` +
    `  PCA=${result.pca.verdict} ratio=${result.pca.betweenWithinRatio?.toFixed(2)} var=${result.pca.variance.map((v) => v.toFixed(1)).join("/")}%`,
);
