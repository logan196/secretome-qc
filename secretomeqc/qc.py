from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from .ingest import AbundanceMatrix


@dataclass
class QCResult:
    protein_table: pd.DataFrame
    lot_summary: pd.DataFrame
    median_between_cv: float
    pct_pass: float
    verdict: str
    verdict_detail: str


def _cv(values: np.ndarray) -> float:
    values = values[np.isfinite(values)]
    if values.size < 2:
        return np.nan
    mean = float(np.mean(values))
    if mean == 0:
        return np.nan
    return float(np.std(values, ddof=1) / abs(mean) * 100.0)


def classify_cv(cv: float, pass_cv: float, review_cv: float) -> str:
    if not np.isfinite(cv):
        return "NA"
    if cv <= pass_cv:
        return "PASS"
    if cv <= review_cv:
        return "REVIEW"
    return "FAIL"


def overall_verdict(median_cv: float, pct_pass: float, pass_cv: float, review_cv: float) -> tuple[str, str]:
    if median_cv <= pass_cv and pct_pass >= 70:
        return (
            "PASS",
            f"Lots are comparable: median lot-to-lot CV is {median_cv:.1f}% "
            f"and {pct_pass:.0f}% of proteins meet the {pass_cv:.0f}% threshold.",
        )
    if median_cv <= review_cv or pct_pass >= 50:
        return (
            "REVIEW",
            f"Lots are borderline: median lot-to-lot CV is {median_cv:.1f}% "
            f"({pct_pass:.0f}% of proteins pass {pass_cv:.0f}%). Review drifting analytes before release.",
        )
    return (
        "FAIL",
        f"Lots are not comparable under current thresholds: median lot-to-lot CV is {median_cv:.1f}% "
        f"and only {pct_pass:.0f}% of proteins pass {pass_cv:.0f}%.",
    )


def compute_lot_cv(data: AbundanceMatrix, pass_cv: float = 20.0, review_cv: float = 30.0) -> QCResult:
    # Analytical CVs are computed on linear intensities (not log2), matching typical proteomics QC.
    linear = data.intensities.clip(lower=0)
    lots = data.sample_meta["lot"]
    rows = []
    for protein, series in linear.iterrows():
        lot_means = []
        within = []
        for lot, idx in lots.groupby(lots).groups.items():
            vals = series.loc[list(idx)].to_numpy(dtype=float)
            within.append(_cv(vals))
            if np.isfinite(vals).any():
                lot_means.append(float(np.nanmean(vals)))
        between = _cv(np.array(lot_means, dtype=float))
        rows.append(
            {
                "protein": protein,
                "between_lot_cv_pct": between,
                "median_within_lot_cv_pct": float(np.nanmedian(within)) if within else np.nan,
                "status": classify_cv(between, pass_cv, review_cv),
            }
        )
    protein_table = pd.DataFrame(rows).sort_values("between_lot_cv_pct", na_position="last")

    lot_rows = []
    for lot, idx in lots.groupby(lots).groups.items():
        lot_mat = linear.loc[:, list(idx)]
        protein_cvs = lot_mat.apply(lambda s: _cv(s.to_numpy(dtype=float)), axis=1)
        lot_rows.append(
            {
                "lot": lot,
                "n_replicates": int(len(idx)),
                "median_within_lot_cv_pct": float(np.nanmedian(protein_cvs)),
                "pct_proteins_cv_le_pass": float((protein_cvs <= pass_cv).mean() * 100.0),
            }
        )
    lot_summary = pd.DataFrame(lot_rows)

    scored = protein_table["between_lot_cv_pct"].dropna()
    median_between = float(np.nanmedian(scored)) if len(scored) else np.nan
    pct_pass = float((protein_table["status"] == "PASS").mean() * 100.0)
    verdict, detail = overall_verdict(median_between, pct_pass, pass_cv, review_cv)
    return QCResult(
        protein_table=protein_table,
        lot_summary=lot_summary,
        median_between_cv=median_between,
        pct_pass=pct_pass,
        verdict=verdict,
        verdict_detail=detail,
    )
