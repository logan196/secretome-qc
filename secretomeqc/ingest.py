from __future__ import annotations

import io
import re
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

LOT_RE = re.compile(r"(lot[a-z0-9]+)", re.IGNORECASE)


@dataclass
class AbundanceMatrix:
    """Wide protein x sample abundance table with lot metadata."""

    intensities: pd.DataFrame
    sample_meta: pd.DataFrame
    source_label: str
    is_demo: bool

    @property
    def n_proteins(self) -> int:
        return int(self.intensities.shape[0])

    @property
    def n_samples(self) -> int:
        return int(self.intensities.shape[1])

    @property
    def lots(self) -> list[str]:
        return list(self.sample_meta["lot"].unique())

    @property
    def n_lots(self) -> int:
        return len(self.lots)


def _read_table(source: Path | io.BytesIO | io.StringIO) -> pd.DataFrame:
    if isinstance(source, Path):
        return pd.read_csv(source, comment="#")
    return pd.read_csv(source, comment="#")


def parse_lot_id(sample_name: str) -> str:
    """Extract a lot ID from headers like LotA_rep1, LotB-r2, ST266_LotC_rep3."""
    match = LOT_RE.search(str(sample_name))
    if match:
        token = match.group(1)
        prefix, rest = token[:3], token[3:]
        return f"{prefix.capitalize()}{rest.upper() if rest.isalpha() and len(rest) <= 2 else rest}"
    stem = re.split(r"[_\-\s.]", str(sample_name), maxsplit=1)[0]
    return stem or str(sample_name)


def load_abundance_matrix(
    source: Path | io.BytesIO | io.StringIO,
    *,
    source_label: str,
    is_demo: bool,
) -> AbundanceMatrix:
    raw = _read_table(source)
    if raw.empty:
        raise ValueError("Uploaded table is empty.")

    gene_col = next(
        (c for c in raw.columns if str(c).strip().lower() in {"gene", "genes", "gene_symbol", "symbol", "protein"}),
        raw.columns[0],
    )
    matrix = raw.set_index(gene_col)
    matrix.index = matrix.index.astype(str).str.strip().str.upper()
    matrix = matrix[~matrix.index.duplicated(keep="first")]
    matrix = matrix.apply(pd.to_numeric, errors="coerce")
    matrix = matrix.dropna(axis=1, how="all").dropna(axis=0, how="all")
    if matrix.shape[1] < 2:
        raise ValueError("Need at least two numeric sample columns.")
    if matrix.shape[0] < 5:
        raise ValueError("Need at least five quantified proteins.")

    sample_meta = pd.DataFrame(
        {
            "sample": matrix.columns.astype(str),
            "lot": [parse_lot_id(c) for c in matrix.columns],
        }
    ).set_index("sample")
    return AbundanceMatrix(
        intensities=matrix,
        sample_meta=sample_meta,
        source_label=source_label,
        is_demo=is_demo,
    )


def log2_transform(matrix: pd.DataFrame) -> pd.DataFrame:
    values = matrix.to_numpy(dtype=float)
    finite = values[np.isfinite(values) & (values > 0)]
    if finite.size == 0:
        return matrix.astype(float)
    # Already log-like if the dynamic range is small and values sit near typical log2 LFQ.
    if np.nanmax(finite) < 40 and np.nanmedian(finite) < 30:
        return matrix.astype(float)
    return np.log2(matrix.clip(lower=0) + 1.0)
