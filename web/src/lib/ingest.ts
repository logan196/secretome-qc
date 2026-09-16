import type { AbundanceMatrix } from "./types";

const LOT_RE = /(lot[a-z0-9]+)/i;
const GENE_HEADERS = new Set(["gene", "genes", "gene_symbol", "symbol", "protein"]);

export function parseLotId(sampleName: string): string {
  const match = LOT_RE.exec(String(sampleName));
  if (match) {
    const token = match[1];
    const prefix = token.slice(0, 3);
    const rest = token.slice(3);
    const formattedRest = /^[a-zA-Z]+$/.test(rest) && rest.length <= 2 ? rest.toUpperCase() : rest;
    return `${prefix[0].toUpperCase()}${prefix.slice(1).toLowerCase()}${formattedRest}`;
  }
  const stem = String(sampleName).split(/[_\-\s.]/, 1)[0];
  return stem || String(sampleName);
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

export function loadAbundanceMatrix(
  csvText: string,
  options: { sourceLabel: string; isDemo: boolean },
): AbundanceMatrix {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  if (lines.length < 2) {
    throw new Error("Uploaded table is empty.");
  }

  const header = parseCsvLine(lines[0]);
  const geneCol = header.findIndex((col) => GENE_HEADERS.has(col.trim().toLowerCase()));
  const geneIndex = geneCol >= 0 ? geneCol : 0;
  const sampleNames = header.filter((_, idx) => idx !== geneIndex);
  if (sampleNames.length < 2) {
    throw new Error("Need at least two numeric sample columns.");
  }

  const proteins: string[] = [];
  const intensities: number[][] = [];
  const seen = new Set<string>();

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const protein = String(cells[geneIndex] ?? "")
      .trim()
      .toUpperCase();
    if (!protein || seen.has(protein)) continue;
    const row = sampleNames.map((_, idx) => {
      const raw = cells[idx < geneIndex ? idx : idx + 1];
      const value = raw === undefined || raw === "" ? Number.NaN : Number(raw);
      return Number.isFinite(value) ? value : Number.NaN;
    });
    if (row.every((value) => Number.isNaN(value))) continue;
    seen.add(protein);
    proteins.push(protein);
    intensities.push(row);
  }

  const keepCols = sampleNames.map((_, col) => intensities.some((row) => Number.isFinite(row[col])));
  const samples = sampleNames.filter((_, col) => keepCols[col]);
  const filtered = intensities.map((row) => row.filter((_, col) => keepCols[col]));

  if (samples.length < 2) {
    throw new Error("Need at least two numeric sample columns.");
  }
  if (proteins.length < 5) {
    throw new Error("Need at least five quantified proteins.");
  }

  return {
    proteins,
    samples,
    lots: samples.map(parseLotId),
    intensities: filtered,
    sourceLabel: options.sourceLabel,
    isDemo: options.isDemo,
  };
}

export function uniqueLots(matrix: AbundanceMatrix): string[] {
  return [...new Set(matrix.lots)];
}

export function log2Transform(values: number[][]): number[][] {
  const finite: number[] = [];
  for (const row of values) {
    for (const value of row) {
      if (Number.isFinite(value) && value > 0) finite.push(value);
    }
  }
  if (!finite.length) return values.map((row) => row.slice());
  const max = Math.max(...finite);
  const med = [...finite].sort((a, b) => a - b)[Math.floor(finite.length / 2)];
  if (max < 40 && med < 30) return values.map((row) => row.slice());
  return values.map((row) => row.map((value) => Math.log2(Math.max(value, 0) + 1)));
}

export function columnValues(matrix: number[][], col: number): number[] {
  return matrix.map((row) => row[col]);
}
