from __future__ import annotations

from datetime import datetime, timezone
from html import escape

import plotly.io as pio

from .ingest import AbundanceMatrix
from .pathways import PathwayResult
from .pca import PCAResult
from .qc import QCResult


def _status_color(verdict: str) -> str:
    return {"PASS": "#047857", "REVIEW": "#b45309", "FAIL": "#b91c1c"}.get(verdict, "#334155")


def build_html_report(
    data: AbundanceMatrix,
    qc: QCResult,
    pca: PCAResult,
    pathways: PathwayResult,
    cv_fig,
    pca_fig,
    heat_fig,
) -> str:
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    source = "DEMO / PUBLIC synthetic secretome matrix" if data.is_demo else escape(data.source_label)
    color = _status_color(qc.verdict)
    pca_color = _status_color(pca.verdict)
    top_ora = pathways.ora.head(3)
    ora_rows = "".join(
        f"<tr><td>{escape(str(r.pathway))}</td><td>{r.p_value:.3g}</td>"
        f"<td>{escape(str(r.overlap_genes))}</td></tr>"
        for r in top_ora.itertuples()
    )
    lot_rows = "".join(
        f"<tr><td>{escape(str(r.lot))}</td><td>{r.n_replicates}</td>"
        f"<td>{r.median_within_lot_cv_pct:.2f}%</td>"
        f"<td>{r.pct_proteins_cv_le_pass:.0f}%</td></tr>"
        for r in qc.lot_summary.itertuples()
    )
    cv_html = pio.to_html(cv_fig, include_plotlyjs=False, full_html=False)
    pca_html = pio.to_html(pca_fig, include_plotlyjs=False, full_html=False)
    heat_html = pio.to_html(heat_fig, include_plotlyjs=False, full_html=False)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>SecretomeQC report</title>
  <script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
  <style>
    body {{ font-family: "IBM Plex Sans", "Segoe UI", sans-serif; margin: 0; background: #f4f7f8; color: #12202a; }}
    header {{ background: #0b1f2a; color: #ecfeff; padding: 28px 40px; }}
    header .brands {{ opacity: 0.85; letter-spacing: 0.08em; text-transform: uppercase; font-size: 12px; }}
    h1 {{ margin: 8px 0 4px; font-family: "IBM Plex Serif", Georgia, serif; }}
    main {{ max-width: 1080px; margin: 0 auto; padding: 28px 24px 64px; }}
    .banner {{ padding: 16px 18px; border-radius: 12px; background: {color}14; border: 1px solid {color}55; color: {color}; font-weight: 600; }}
    .kpis {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 18px 0; }}
    .kpi {{ background: white; border: 1px solid #d7e0e4; border-radius: 12px; padding: 12px 14px; }}
    .kpi span {{ display: block; color: #5b6b76; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }}
    .kpi strong {{ font-size: 22px; }}
    section {{ background: white; border: 1px solid #d7e0e4; border-radius: 14px; padding: 16px; margin: 16px 0; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 14px; }}
    th, td {{ text-align: left; padding: 8px 6px; border-bottom: 1px solid #e5ecef; }}
    footer {{ color: #5b6b76; font-size: 12px; margin-top: 24px; }}
  </style>
</head>
<body>
  <header>
    <div class="brands">Novaflow  ·  Noveome Biotherapeutics</div>
    <h1>SecretomeQC lot comparability report</h1>
    <div>ST-266-style secretome · {source} · {generated}</div>
  </header>
  <main>
    <div class="banner">QC verdict: {qc.verdict} — {escape(qc.verdict_detail)}</div>
    <div class="kpis">
      <div class="kpi"><span>Proteins</span><strong>{data.n_proteins}</strong></div>
      <div class="kpi"><span>Lots</span><strong>{data.n_lots}</strong></div>
      <div class="kpi"><span>Median lot-to-lot CV</span><strong>{qc.median_between_cv:.1f}%</strong></div>
      <div class="kpi"><span>Proteins passing CV</span><strong>{qc.pct_pass:.0f}%</strong></div>
    </div>
    <section>
      <h2>Lot summary</h2>
      <table>
        <tr><th>Lot</th><th>Replicates</th><th>Median within-lot CV</th><th>% proteins ≤ pass CV</th></tr>
        {lot_rows}
      </table>
    </section>
    <section>
      <h2>Lot-to-lot CV</h2>
      {cv_html}
    </section>
    <section>
      <h2>PCA comparability</h2>
      <p style="color:{pca_color};font-weight:600">{pca.verdict} — {escape(pca.verdict_detail)}</p>
      {pca_html}
    </section>
    <section>
      <h2>Pathway / MoA signatures</h2>
      <p>Top signatures by mean lot activity: {escape(", ".join(pathways.top_pathways))}.</p>
      {heat_html}
      <h3>Over-representation of high-abundance proteins</h3>
      <table>
        <tr><th>Pathway</th><th>p-value</th><th>Overlap genes</th></tr>
        {ora_rows}
      </table>
    </section>
    <footer>
      Demo-ready SecretomeQC report. Not for regulatory submission. Phase 2 will connect FragPipe/quantms
      and real Orbitrap data post-NDA. DEMO / PUBLIC DATA are synthetic-but-realistic extracellular proteomics
      intensities styled after published amnion-derived secretome literature.
    </footer>
  </main>
</body>
</html>
"""
