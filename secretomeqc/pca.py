from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler

from .ingest import AbundanceMatrix, log2_transform


@dataclass
class PCAResult:
    scores: pd.DataFrame
    variance: list[float]
    between_within_ratio: float
    verdict: str
    verdict_detail: str


def _lot_geometry(scores: pd.DataFrame) -> float:
    lots = scores["lot"].unique()
    centroids = scores.groupby("lot")[["pc1", "pc2"]].mean()
    within = []
    for lot in lots:
        pts = scores.loc[scores["lot"] == lot, ["pc1", "pc2"]].to_numpy()
        if len(pts) < 2:
            continue
        center = centroids.loc[lot].to_numpy()
        within.append(float(np.mean(np.linalg.norm(pts - center, axis=1))))
    mean_within = float(np.mean(within)) if within else np.nan
    if len(centroids) < 2 or not np.isfinite(mean_within) or mean_within == 0:
        return np.nan
    # Mean pairwise centroid distance / mean within-lot radius.
    coords = centroids.to_numpy()
    dists = []
    for i in range(len(coords)):
        for j in range(i + 1, len(coords)):
            dists.append(float(np.linalg.norm(coords[i] - coords[j])))
    return float(np.mean(dists) / mean_within)


def run_pca(data: AbundanceMatrix) -> PCAResult:
    log_mat = log2_transform(data.intensities)
    x = log_mat.T.to_numpy(dtype=float)
    x = SimpleImputer(strategy="median").fit_transform(x)
    x = StandardScaler().fit_transform(x)
    model = PCA(n_components=2, random_state=7)
    pcs = model.fit_transform(x)
    scores = pd.DataFrame(
        {
            "sample": log_mat.columns,
            "pc1": pcs[:, 0],
            "pc2": pcs[:, 1],
            "lot": data.sample_meta.loc[log_mat.columns, "lot"].to_numpy(),
        }
    )
    ratio = _lot_geometry(scores)
    if not np.isfinite(ratio):
        verdict, detail = "REVIEW", "Not enough replicates to score PCA lot overlap."
    elif ratio <= 2.2:
        verdict, detail = (
            "PASS",
            f"Lots overlap in PC space (between/within distance ratio {ratio:.2f} ≤ 2.2). "
            "Global abundance profiles are comparable.",
        )
    elif ratio <= 3.5:
        verdict, detail = (
            "REVIEW",
            f"Lots are partially separated in PC space (ratio {ratio:.2f}). "
            "Inspect drifting proteins before calling full comparability.",
        )
    else:
        verdict, detail = (
            "FAIL",
            f"Lots form distinct clusters (ratio {ratio:.2f} > 3.5). "
            "Global secretome profiles are not comparable.",
        )
    return PCAResult(
        scores=scores,
        variance=[float(v * 100.0) for v in model.explained_variance_ratio_],
        between_within_ratio=ratio,
        verdict=verdict,
        verdict_detail=detail,
    )
