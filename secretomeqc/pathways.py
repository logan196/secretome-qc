from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import hypergeom

from .config import GENE_SETS_PATH
from .ingest import AbundanceMatrix, log2_transform


@dataclass
class PathwayResult:
    sample_scores: pd.DataFrame
    lot_scores: pd.DataFrame
    ora: pd.DataFrame
    top_pathways: list[str]


def load_gene_sets(path: Path | None = None) -> dict[str, dict]:
    return json.loads((path or GENE_SETS_PATH).read_text())


def _zscore_matrix(matrix: pd.DataFrame) -> pd.DataFrame:
    mean = matrix.mean(axis=1)
    std = matrix.std(axis=1, ddof=1).replace(0, np.nan)
    return matrix.sub(mean, axis=0).div(std, axis=0)


def signature_scores(data: AbundanceMatrix, gene_sets: dict[str, dict]) -> tuple[pd.DataFrame, pd.DataFrame]:
    log_mat = _zscore_matrix(log2_transform(data.intensities))
    universe = set(log_mat.index)
    sample_cols = {}
    for name, spec in gene_sets.items():
        genes = [g.upper() for g in spec["genes"] if g.upper() in universe]
        if not genes:
            sample_cols[name] = pd.Series(np.nan, index=log_mat.columns)
        else:
            sample_cols[name] = log_mat.loc[genes].mean(axis=0)
    sample_scores = pd.DataFrame(sample_cols)
    sample_scores.index.name = "sample"
    lot = data.sample_meta.loc[sample_scores.index, "lot"]
    lot_scores = sample_scores.groupby(lot).mean()
    lot_scores.index.name = "lot"
    return sample_scores, lot_scores


def over_representation(data: AbundanceMatrix, gene_sets: dict[str, dict], top_frac: float = 0.25) -> pd.DataFrame:
    log_mat = log2_transform(data.intensities)
    abundance = log_mat.mean(axis=1).sort_values(ascending=False)
    n_query = max(8, int(np.ceil(len(abundance) * top_frac)))
    query = set(abundance.head(n_query).index)
    universe = set(abundance.index)
    n_universe = len(universe)
    rows = []
    for name, spec in gene_sets.items():
        geneset = {g.upper() for g in spec["genes"]} & universe
        overlap = sorted(query & geneset)
        k = len(overlap)
        k_set = len(geneset)
        # P(X >= k)
        pval = float(hypergeom.sf(k - 1, n_universe, k_set, n_query)) if k_set and k else 1.0
        rows.append(
            {
                "pathway": name,
                "description": spec.get("description", ""),
                "overlap": k,
                "set_in_matrix": k_set,
                "query_size": n_query,
                "p_value": pval,
                "overlap_genes": ", ".join(overlap[:12]),
            }
        )
    ora = pd.DataFrame(rows).sort_values("p_value")
    return ora


def analyze_pathways(data: AbundanceMatrix, gene_sets: dict[str, dict] | None = None) -> PathwayResult:
    gene_sets = gene_sets or load_gene_sets()
    sample_scores, lot_scores = signature_scores(data, gene_sets)
    ora = over_representation(data, gene_sets)
    ranked = lot_scores.mean(axis=0).sort_values(ascending=False)
    return PathwayResult(
        sample_scores=sample_scores,
        lot_scores=lot_scores,
        ora=ora,
        top_pathways=list(ranked.index),
    )
