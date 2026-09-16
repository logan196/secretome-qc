from __future__ import annotations

import pandas as pd
import streamlit as st

from secretomeqc.config import ASSETS_DIR, DEMO_MATRIX_PATH, DEFAULT_PASS_CV, DEFAULT_REVIEW_CV
from secretomeqc.ingest import load_abundance_matrix
from secretomeqc.pathways import analyze_pathways, load_gene_sets
from secretomeqc.pca import run_pca
from secretomeqc.plots import cv_figure, heatmap_figure, pca_figure
from secretomeqc.qc import compute_lot_cv
from secretomeqc.report import build_html_report

st.set_page_config(
    page_title="SecretomeQC · Novaflow × Noveome",
    page_icon="🧬",
    layout="wide",
    initial_sidebar_state="expanded",
)


def load_css() -> None:
    css = (ASSETS_DIR / "app.css").read_text()
    st.markdown(f"<style>{css}</style>", unsafe_allow_html=True)


def verdict_class(verdict: str) -> str:
    return {"PASS": "pass", "REVIEW": "review", "FAIL": "fail"}.get(verdict, "review")


def render_header() -> None:
    nova = (ASSETS_DIR / "novaflow.svg").read_text()
    nove = (ASSETS_DIR / "noveome.svg").read_text()
    st.markdown(
        f"""
        <div class="sqc-header">
          <div class="sqc-brands">
            {nova}
            <div class="sqc-divider"></div>
            {nove}
          </div>
          <div class="sqc-title">
            <h1>SecretomeQC</h1>
            <p>Self-serve lot comparability + pathway MoA explorer for ST-266-style secretomes</p>
          </div>
          <div class="sqc-badge">DEMO / PUBLIC DATA READY</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def load_data(mode: str, upload) -> tuple:
    if mode.startswith("Upload") and upload is not None:
        return load_abundance_matrix(upload, source_label=upload.name, is_demo=False)
    return load_abundance_matrix(
        DEMO_MATRIX_PATH,
        source_label="Bundled DEMO / PUBLIC ST-266-style matrix",
        is_demo=True,
    )


def main() -> None:
    load_css()
    render_header()

    with st.sidebar:
        st.markdown("### Data")
        mode = st.radio(
            "Source",
            ["Bundled demo (zero upload)", "Upload wide abundance matrix"],
            index=0,
        )
        upload = st.file_uploader(
            "CSV: rows = gene symbols, columns = LotA_rep1, LotB_rep2, …",
            type=["csv"],
            disabled=mode.startswith("Bundled"),
        )
        st.markdown("### QC thresholds")
        pass_cv = st.slider("Pass if lot-to-lot CV ≤", 5.0, 40.0, DEFAULT_PASS_CV, 1.0)
        review_cv = st.slider("Review if lot-to-lot CV ≤", 10.0, 60.0, DEFAULT_REVIEW_CV, 1.0)
        if review_cv < pass_cv:
            st.warning("Review threshold should be ≥ pass threshold.")
            review_cv = pass_cv
        st.caption(
            "Demo matrix is synthetic-but-realistic extracellular proteomics, labeled DEMO / PUBLIC DATA. "
            "Phase 2: FragPipe / quantms + real Orbitrap post-NDA."
        )

    try:
        data = load_data(mode, upload)
    except Exception as exc:
        st.error(f"Could not read abundance matrix: {exc}")
        st.stop()

    qc = compute_lot_cv(data, pass_cv=pass_cv, review_cv=review_cv)
    pca = run_pca(data)
    pathways = analyze_pathways(data, load_gene_sets())
    cv_fig = cv_figure(qc)
    pca_fig = pca_figure(pca)
    heat_fig = heatmap_figure(pathways)

    if data.is_demo:
        st.info(
            "Showing **bundled DEMO / PUBLIC DATA** — synthetic ST-266-style secretome intensities "
            "informed by published AMP-cell / amnion secretome proteins. Not Noveome proprietary Orbitrap data."
        )
    else:
        st.success(f"Loaded **{data.source_label}** · {data.n_proteins} proteins · {data.n_samples} samples.")

    st.markdown(
        f"""
        <div class="sqc-kpis">
          <div class="sqc-card"><div class="lbl">Proteins</div><div class="val">{data.n_proteins}</div></div>
          <div class="sqc-card"><div class="lbl">Lots / samples</div><div class="val">{data.n_lots} / {data.n_samples}</div></div>
          <div class="sqc-card"><div class="lbl">Median lot-to-lot CV</div><div class="val">{qc.median_between_cv:.1f}%</div></div>
          <div class="sqc-card"><div class="lbl">Proteins passing CV</div><div class="val">{qc.pct_pass:.0f}%</div></div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    report_html = build_html_report(data, qc, pca, pathways, cv_fig, pca_fig, heat_fig)
    st.download_button(
        "Download branded HTML report",
        data=report_html.encode("utf-8"),
        file_name="SecretomeQC_report.html",
        mime="text/html",
        type="primary",
    )

    panel_a, panel_b = st.columns((1.15, 1.0))
    with panel_a:
        st.markdown("### (a) Lot-to-lot CV")
        st.markdown(
            f'<div class="sqc-verdict {verdict_class(qc.verdict)}">{qc.verdict} — {qc.verdict_detail}</div>',
            unsafe_allow_html=True,
        )
        st.dataframe(
            qc.lot_summary.style.format(
                {"median_within_lot_cv_pct": "{:.2f}", "pct_proteins_cv_le_pass": "{:.1f}"}
            ),
            use_container_width=True,
            hide_index=True,
        )
        st.plotly_chart(cv_fig, use_container_width=True)
        with st.expander("Full protein CV table"):
            pretty = qc.protein_table.copy()
            pretty["between_lot_cv_pct"] = pretty["between_lot_cv_pct"].map(lambda x: f"{x:.2f}" if pd.notna(x) else "NA")
            pretty["median_within_lot_cv_pct"] = pretty["median_within_lot_cv_pct"].map(
                lambda x: f"{x:.2f}" if pd.notna(x) else "NA"
            )
            st.dataframe(pretty, use_container_width=True, hide_index=True, height=320)

    with panel_b:
        st.markdown("### (b) PCA lot comparability")
        st.markdown(
            f'<div class="sqc-verdict {verdict_class(pca.verdict)}">{pca.verdict} — {pca.verdict_detail}</div>',
            unsafe_allow_html=True,
        )
        st.plotly_chart(pca_fig, use_container_width=True)

    st.markdown("### (c) Pathway / signature activity")
    st.caption(
        "Lightweight signature scores (mean protein z-score) plus hypergeometric ORA on the top-abundance quartile "
        "against a bundled mini library: anti-inflammatory, neuroprotective, anti-apoptotic."
    )
    st.plotly_chart(heat_fig, use_container_width=True)
    ora = pathways.ora.copy()
    ora["p_value"] = ora["p_value"].map(lambda x: f"{x:.3g}")
    st.dataframe(ora, use_container_width=True, hide_index=True)

    st.markdown("---")
    st.caption(
        "SecretomeQC MVP · Novaflow × Noveome · not for FDA submission. "
        "Phase 2 roadmap: FragPipe / quantms ingestion and real Orbitrap post-NDA."
    )


if __name__ == "__main__":
    main()
