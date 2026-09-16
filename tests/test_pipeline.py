from __future__ import annotations

import io
from pathlib import Path

from secretomeqc.config import DEMO_MATRIX_PATH
from secretomeqc.ingest import load_abundance_matrix, parse_lot_id
from secretomeqc.pathways import analyze_pathways
from secretomeqc.pca import run_pca
from secretomeqc.plots import cv_figure, heatmap_figure, pca_figure
from secretomeqc.qc import compute_lot_cv
from secretomeqc.report import build_html_report


def test_parse_lot_id():
    assert parse_lot_id("LotA_rep1") == "LotA"
    assert parse_lot_id("LotB-rep2") == "LotB"
    assert parse_lot_id("ST266_LotC_rep3") == "LotC"


def test_demo_matrix_zero_upload_path():
    data = load_abundance_matrix(
        DEMO_MATRIX_PATH,
        source_label="demo",
        is_demo=True,
    )
    assert data.n_proteins >= 120
    assert data.n_lots == 4
    assert data.n_samples == 12
    assert set(data.lots) == {"LotA", "LotB", "LotC", "LotD"}

    qc = compute_lot_cv(data)
    pca = run_pca(data)
    pathways = analyze_pathways(data)

    assert qc.verdict in {"PASS", "REVIEW", "FAIL"}
    assert qc.protein_table["status"].isin(["PASS", "REVIEW", "FAIL", "NA"]).all()
    assert pca.scores.shape[0] == 12
    assert set(pathways.lot_scores.columns) >= {"anti-inflammatory", "neuroprotective", "anti-apoptotic"}
    assert len(pathways.ora) == 3

    html = build_html_report(
        data,
        qc,
        pca,
        pathways,
        cv_figure(qc),
        pca_figure(pca),
        heatmap_figure(pathways),
    )
    assert "SecretomeQC" in html
    assert "Novaflow" in html
    assert "Noveome" in html
    assert qc.verdict in html


def test_user_upload_wide_matrix():
    csv = (
        "gene,LotA_rep1,LotA_rep2,LotB_rep1,LotB_rep2\n"
        "FGF2,1.0e7,1.1e7,1.05e7,9.8e6\n"
        "TIMP1,2.0e8,2.1e8,1.9e8,2.2e8\n"
        "VEGFA,4.0e6,4.2e6,3.8e6,4.1e6\n"
        "DCN,3.0e9,3.1e9,2.9e9,3.05e9\n"
        "ALB,5.0e9,5.2e9,4.9e9,5.1e9\n"
        "ANXA1,8.0e7,7.7e7,8.2e7,8.1e7\n"
    )
    data = load_abundance_matrix(io.StringIO(csv), source_label="upload.csv", is_demo=False)
    assert data.n_proteins == 6
    assert data.n_lots == 2
    qc = compute_lot_cv(data)
    assert not qc.protein_table.empty
