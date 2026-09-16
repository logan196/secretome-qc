"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

import { BrandMark } from "@/components/BrandMark";
import { CvPanel } from "@/components/CvPanel";
import { HeatmapPanel } from "@/components/HeatmapPanel";
import { KpiStrip } from "@/components/KpiStrip";
import { PcaPanel } from "@/components/PcaPanel";
import demoResults from "@/data/demo_results.json";
import geneSets from "@/data/moa_gene_sets.json";
import { analyze } from "@/lib/analyze";
import { loadAbundanceMatrix } from "@/lib/ingest";
import { downloadReport } from "@/lib/report";
import {
  DEFAULT_PASS_CV,
  DEFAULT_REVIEW_CV,
  type AnalysisResult,
  type GeneSetLibrary,
} from "@/lib/types";

const bundled = demoResults as unknown as AnalysisResult;
const library = geneSets as GeneSetLibrary;

type DashboardProps = {
  onLock: () => void;
};

export function Dashboard({ onLock }: DashboardProps) {
  const [source, setSource] = useState<"demo" | "upload">("demo");
  const [uploaded, setUploaded] = useState<AnalysisResult | null>(null);
  const [passCv, setPassCv] = useState(DEFAULT_PASS_CV);
  const [reviewCv, setReviewCv] = useState(DEFAULT_REVIEW_CV);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const base = source === "upload" && uploaded ? uploaded : bundled;
  const result = useMemo(() => {
    const nextReview = reviewCv < passCv ? passCv : reviewCv;
    if (base.qc.passCv === passCv && base.qc.reviewCv === nextReview) return base;
    return analyze(base.matrix, library, passCv, nextReview);
  }, [base, passCv, reviewCv]);

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const text = await file.text();
      const matrix = loadAbundanceMatrix(text, { sourceLabel: file.name, isDemo: false });
      const next = analyze(matrix, library, passCv, reviewCv < passCv ? passCv : reviewCv);
      setUploaded(next);
      setFileName(file.name);
      setSource("upload");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read abundance matrix.");
    }
  }

  function useBundled() {
    setSource("demo");
    setUploaded(null);
    setFileName("");
    setError("");
  }

  return (
    <div className="workbench-bg min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="bg-[var(--navy-2)] px-5 py-6 text-cyan-50 lg:min-h-screen">
        <div className="flex items-center gap-3">
          <BrandMark name="novaflow" invert className="h-6 w-auto" />
          <div className="h-5 w-px bg-white/20" />
          <BrandMark name="noveome" invert className="h-6 w-auto" />
        </div>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-200/70">Data</p>
        <div className="mt-3 space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="source"
              checked={source === "demo"}
              onChange={useBundled}
            />
            Bundled DEMO / PUBLIC
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="source"
              checked={source === "upload"}
              onChange={() => setSource("upload")}
            />
            Upload wide CSV
          </label>
        </div>
        <label className="mt-4 block rounded-2xl border border-dashed border-white/20 bg-white/5 px-3 py-4 text-xs leading-5 text-cyan-100/70">
          CSV: gene + LotA_rep1 columns. Lines starting with # are ignored.
          <input
            type="file"
            accept=".csv,text/csv"
            className="mt-3 block w-full text-xs text-cyan-50"
            onChange={(event) => handleUpload(event.target.files?.[0])}
          />
        </label>
        {fileName ? <p className="mt-2 text-xs text-teal-200">Loaded {fileName}</p> : null}
        {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}

        <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-200/70">QC thresholds</p>
        <label className="mt-4 block text-xs">
          Pass if lot-to-lot CV ≤ {passCv.toFixed(0)}%
          <input
            type="range"
            min={5}
            max={40}
            value={passCv}
            onChange={(event) => setPassCv(Number(event.target.value))}
            className="mt-2 w-full"
          />
        </label>
        <label className="mt-4 block text-xs">
          Review if lot-to-lot CV ≤ {Math.max(reviewCv, passCv).toFixed(0)}%
          <input
            type="range"
            min={10}
            max={60}
            value={reviewCv}
            onChange={(event) => setReviewCv(Number(event.target.value))}
            className="mt-2 w-full"
          />
        </label>

        <button
          type="button"
          onClick={() => downloadReport(result)}
          className="mt-8 w-full rounded-2xl bg-gradient-to-r from-teal-300 to-indigo-300 px-4 py-3 text-sm font-semibold text-slate-950"
        >
          Download branded HTML report
        </button>
        <button
          type="button"
          onClick={onLock}
          className="mt-3 w-full rounded-2xl border border-white/15 px-4 py-2 text-xs font-semibold text-cyan-100/80"
        >
          Lock workbench
        </button>
        <p className="mt-6 text-[11px] leading-5 text-cyan-100/45">
          Demo matrix is synthetic-but-realistic extracellular proteomics, labeled DEMO / PUBLIC DATA.
          Phase 2: FragPipe / quantms + real Orbitrap post-NDA.
        </p>
      </aside>

      <main className="px-4 py-6 sm:px-8">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass flex flex-col gap-4 rounded-3xl px-5 py-5 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Novaflow × Noveome
            </p>
            <h1 className="font-serif mt-1 text-3xl tracking-tight text-[var(--ink)]">SecretomeQC</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Self-serve lot comparability + pathway MoA explorer for ST-266-style secretomes
            </p>
          </div>
          <span className={result.isDemo ? "demo-badge" : "prop-badge"}>
            {result.isDemo ? "DEMO / PUBLIC DATA READY" : "UPLOADED MATRIX · NOT BUNDLED DEMO"}
          </span>
        </motion.header>

        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm leading-6 ${
            result.isDemo
              ? "border-amber-200 bg-amber-50 text-amber-950"
              : "border-sky-200 bg-sky-50 text-sky-950"
          }`}
        >
          {result.isDemo ? (
            <>
              Showing <strong>bundled DEMO / PUBLIC DATA</strong> — synthetic ST-266-style secretome
              intensities informed by published AMP-cell / amnion secretome proteins.{" "}
              <strong>Not Noveome proprietary Orbitrap data.</strong>
            </>
          ) : (
            <>
              Loaded <strong>{result.sourceLabel}</strong> · {result.nProteins} proteins · {result.nSamples}{" "}
              samples. Treat this upload as confidential. It is not the bundled DEMO / PUBLIC matrix.
            </>
          )}
        </div>

        <div className="mt-5">
          <KpiStrip result={result} />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_1fr]">
          <CvPanel result={result} />
          <PcaPanel result={result} />
        </div>

        <div className="mt-5">
          <HeatmapPanel result={result} />
        </div>

        <p className="mt-8 pb-8 text-center text-xs text-[var(--muted)]">
          SecretomeQC · Novaflow × Noveome · not for FDA submission. DEMO / PUBLIC vs proprietary
          data are labeled on every panel. Phase 2 roadmap: FragPipe / quantms ingestion and real
          Orbitrap post-NDA.
        </p>
      </main>
    </div>
  );
}
