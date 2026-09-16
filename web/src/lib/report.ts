import { LOT_COLORS, LOT_COLORWAY, STATUS_COLORS, type AnalysisResult } from "./types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function statusColor(verdict: string): string {
  return STATUS_COLORS[verdict] ?? "#334155";
}

function lotColor(lot: string, index: number): string {
  return LOT_COLORS[lot] ?? LOT_COLORWAY[index % LOT_COLORWAY.length];
}

function cvSvg(result: AnalysisResult): string {
  const rows = result.qc.proteinTable
    .filter((row) => row.betweenLotCvPct !== null)
    .sort((a, b) => (a.betweenLotCvPct ?? 0) - (b.betweenLotCvPct ?? 0))
    .slice(-25)
    .reverse();
  const width = 920;
  const rowH = 22;
  const height = 48 + rows.length * rowH;
  const maxCv = Math.max(result.qc.passCv, ...rows.map((row) => row.betweenLotCvPct ?? 0), 1);
  const labelW = 88;
  const bars = rows
    .map((row, i) => {
      const y = 28 + i * rowH;
      const w = ((row.betweenLotCvPct ?? 0) / maxCv) * (width - labelW - 48);
      const color = statusColor(row.status);
      return `<text x="8" y="${y + 12}" font-size="11" fill="#334155">${escapeHtml(row.protein)}</text>
        <rect x="${labelW}" y="${y}" width="${Math.max(w, 2)}" height="14" rx="4" fill="${color}"/>
        <text x="${labelW + w + 6}" y="${y + 12}" font-size="10" fill="#5b6b76">${(row.betweenLotCvPct ?? 0).toFixed(1)}%</text>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="${height}">${bars}</svg>`;
}

function pcaSvg(result: AnalysisResult): string {
  const pts = result.pca.scores;
  const xs = pts.map((p) => p.pc1);
  const ys = pts.map((p) => p.pc2);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = 36;
  const w = 640;
  const h = 420;
  const sx = (x: number) => pad + ((x - minX) / (maxX - minX || 1)) * (w - pad * 2);
  const sy = (y: number) => h - pad - ((y - minY) / (maxY - minY || 1)) * (h - pad * 2);
  const lots = [...new Set(pts.map((p) => p.lot))];
  const dots = pts
    .map((p) => {
      const color = lotColor(p.lot, lots.indexOf(p.lot));
      return `<circle cx="${sx(p.pc1)}" cy="${sy(p.pc2)}" r="8" fill="${color}" stroke="#fff" stroke-width="1.5">
        <title>${escapeHtml(p.sample)}</title></circle>`;
    })
    .join("");
  const legend = lots
    .map(
      (lot, i) =>
        `<circle cx="${48 + i * 90}" cy="${18}" r="5" fill="${lotColor(lot, i)}"/><text x="${58 + i * 90}" y="${22}" font-size="12" fill="#12202a">${escapeHtml(lot)}</text>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="${h}">
    <rect x="0" y="0" width="${w}" height="${h}" fill="#F8FBFC"/>
    ${legend}
    <text x="${w / 2}" y="${h - 8}" text-anchor="middle" font-size="12" fill="#5b6b76">PC1 (${result.pca.variance[0].toFixed(1)}%)</text>
    <text x="14" y="${h / 2}" transform="rotate(-90 14 ${h / 2})" text-anchor="middle" font-size="12" fill="#5b6b76">PC2 (${result.pca.variance[1].toFixed(1)}%)</text>
    ${dots}
  </svg>`;
}

function heatSvg(result: AnalysisResult): string {
  const lots = Object.keys(result.pathways.lotScores);
  const paths = result.pathways.pathwayNames;
  const values = lots.flatMap((lot) => paths.map((path) => result.pathways.lotScores[lot][path] ?? 0));
  const maxAbs = Math.max(0.01, ...values.map((v) => Math.abs(v)));
  const cellW = 180;
  const cellH = 46;
  const labelW = 70;
  const w = labelW + paths.length * cellW + 16;
  const h = 36 + lots.length * cellH;
  const colorFor = (z: number) => {
    const t = (z / maxAbs + 1) / 2;
    const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
    if (t < 0.5) {
      const u = t / 0.5;
      return `rgb(${mix(30, 248)}, ${mix(58, 250)}, ${mix(95, 252)})`;
    }
    const u = (t - 0.5) / 0.5;
    return `rgb(${mix(248, 15)}, ${mix(250, 118)}, ${mix(252, 110)})`;
  };
  const heads = paths
    .map((path, i) => `<text x="${labelW + i * cellW + cellW / 2}" y="20" text-anchor="middle" font-size="12" fill="#12202a">${escapeHtml(path)}</text>`)
    .join("");
  const cells = lots
    .flatMap((lot, r) =>
      paths.map((path, c) => {
        const z = result.pathways.lotScores[lot][path] ?? 0;
        return `<rect x="${labelW + c * cellW + 8}" y="${32 + r * cellH}" width="${cellW - 16}" height="${cellH - 10}" rx="8" fill="${colorFor(z)}"/>
          <text x="${labelW + c * cellW + cellW / 2}" y="${58 + r * cellH}" text-anchor="middle" font-size="13" fill="#12202a">${z.toFixed(2)}</text>`;
      }),
    )
    .join("");
  const ylabels = lots
    .map((lot, r) => `<text x="8" y="${58 + r * cellH}" font-size="12" fill="#12202a">${escapeHtml(lot)}</text>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="${h}">${heads}${ylabels}${cells}</svg>`;
}

export function buildHtmlReport(result: AnalysisResult): string {
  const generated = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
  const source = result.isDemo ? "DEMO / PUBLIC synthetic secretome matrix" : escapeHtml(result.sourceLabel);
  const color = statusColor(result.qc.verdict);
  const pcaColor = statusColor(result.pca.verdict);
  const oraRows = result.pathways.ora
    .slice(0, 3)
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.pathway)}</td><td>${row.pValue.toExponential(2)}</td><td>${escapeHtml(row.overlapGenes)}</td></tr>`,
    )
    .join("");
  const lotRows = result.qc.lotSummary
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.lot)}</td><td>${row.nReplicates}</td><td>${row.medianWithinLotCvPct.toFixed(2)}%</td><td>${row.pctProteinsCvLePass.toFixed(0)}%</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>SecretomeQC report</title>
  <style>
    body { font-family: "IBM Plex Sans", "Segoe UI", sans-serif; margin: 0; background: #f4f7f8; color: #12202a; }
    header { background: #0b1f2a; color: #ecfeff; padding: 28px 40px; }
    header .brands { opacity: 0.85; letter-spacing: 0.08em; text-transform: uppercase; font-size: 12px; }
    h1 { margin: 8px 0 4px; font-family: "IBM Plex Serif", Georgia, serif; }
    main { max-width: 1080px; margin: 0 auto; padding: 28px 24px 64px; }
    .banner { padding: 16px 18px; border-radius: 12px; background: ${color}14; border: 1px solid ${color}55; color: ${color}; font-weight: 600; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 18px 0; }
    .kpi { background: white; border: 1px solid #d7e0e4; border-radius: 12px; padding: 12px 14px; }
    .kpi span { display: block; color: #5b6b76; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
    .kpi strong { font-size: 22px; }
    section { background: white; border: 1px solid #d7e0e4; border-radius: 14px; padding: 16px; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #e5ecef; }
    .badge { display: inline-block; margin-top: 10px; padding: 4px 10px; border-radius: 999px; background: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; }
    footer { color: #5b6b76; font-size: 12px; margin-top: 24px; }
  </style>
</head>
<body>
  <header>
    <div class="brands">Novaflow  ·  Noveome Biotherapeutics</div>
    <h1>SecretomeQC lot comparability report</h1>
    <div>ST-266-style secretome · ${source} · ${generated}</div>
    <div class="badge">${result.isDemo ? "DEMO / PUBLIC DATA — not Noveome proprietary Orbitrap" : "UPLOADED MATRIX — treat as confidential"}</div>
  </header>
  <main>
    <div class="banner">QC verdict: ${result.qc.verdict} — ${escapeHtml(result.qc.verdictDetail)}</div>
    <div class="kpis">
      <div class="kpi"><span>Proteins</span><strong>${result.nProteins}</strong></div>
      <div class="kpi"><span>Lots</span><strong>${result.nLots}</strong></div>
      <div class="kpi"><span>Median lot-to-lot CV</span><strong>${result.qc.medianBetweenCv.toFixed(1)}%</strong></div>
      <div class="kpi"><span>Proteins passing CV</span><strong>${result.qc.pctPass.toFixed(0)}%</strong></div>
    </div>
    <section>
      <h2>Lot summary</h2>
      <table>
        <tr><th>Lot</th><th>Replicates</th><th>Median within-lot CV</th><th>% proteins ≤ pass CV</th></tr>
        ${lotRows}
      </table>
    </section>
    <section>
      <h2>Lot-to-lot CV</h2>
      ${cvSvg(result)}
    </section>
    <section>
      <h2>PCA comparability</h2>
      <p style="color:${pcaColor};font-weight:600">${result.pca.verdict} — ${escapeHtml(result.pca.verdictDetail)}</p>
      ${pcaSvg(result)}
    </section>
    <section>
      <h2>Pathway / MoA signatures</h2>
      <p>Top signatures by mean lot activity: ${escapeHtml(result.pathways.topPathways.join(", "))}.</p>
      ${heatSvg(result)}
      <h3>Over-representation of high-abundance proteins</h3>
      <table>
        <tr><th>Pathway</th><th>p-value</th><th>Overlap genes</th></tr>
        ${oraRows}
      </table>
    </section>
    <footer>
      Demo-ready SecretomeQC report. Not for regulatory submission. Phase 2 will connect FragPipe/quantms
      and real Orbitrap data post-NDA. DEMO / PUBLIC DATA are synthetic-but-realistic extracellular proteomics
      intensities styled after published amnion-derived secretome literature. This file is not Noveome proprietary data.
    </footer>
  </main>
</body>
</html>`;
}

export function downloadReport(result: AnalysisResult): void {
  const html = buildHtmlReport(result);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "SecretomeQC_report.html";
  anchor.click();
  URL.revokeObjectURL(url);
}
