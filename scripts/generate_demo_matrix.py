#!/usr/bin/env python3
"""Generate the bundled DEMO / PUBLIC ST-266-style secretome abundance matrix."""

from __future__ import annotations

import csv
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "DEMO_PUBLIC_st266_style_secretome.csv"

# Public-literature-informed secretome cargo + typical ECM / protease / carrier proteins.
PROTEINS = [
    "ALB", "FGF2", "GDF15", "GDNF", "NRG1", "TGFB1", "TGFB2", "ANG", "PDGFB", "PDGFA",
    "VEGFA", "VEGFC", "AREG", "DCN", "SPARC", "MIF", "DPP4", "TNFRSF1A", "TNFRSF1B", "AXL",
    "TIMP1", "TIMP2", "IGF1", "IGF2", "BDNF", "NGF", "CNTF", "NTF3", "FGF1", "FGF7",
    "HGF", "EGF", "HBEGF", "PGF", "ANGPT1", "CXCL12", "IL6", "IL10", "IL1RN", "IL1B",
    "SERPINA1", "SERPINE1", "SERPINB2", "FN1", "COL1A1", "COL1A2", "COL3A1", "COL4A1", "COL6A1", "LAMB1",
    "LAMC1", "VTN", "THBS1", "TNC", "FBLN1", "FBN1", "MMP2", "MMP3", "MMP9", "MMP14",
    "ADAMTS1", "PLAU", "CTSD", "CTSB", "IGFBP3", "IGFBP5", "IGFBP7", "LGALS1", "LGALS3", "S100A8",
    "S100A9", "ANXA1", "ANXA2", "ANXA5", "C3", "C1S", "CFH", "CLU", "APOE", "APOA1",
    "TF", "LCN2", "LTF", "HP", "ORM1", "A2M", "ITIH4", "FGA", "FGB", "KNG1",
    "AMBP", "B2M", "PPIB", "CALR", "HSP90B1", "HSPA5", "PDIA3", "P4HB", "ENO1", "GAPDH",
    "ACTB", "VIM", "KRT8", "KRT18", "SPP1", "POSTN", "BGN", "LUM", "FMOD", "VCAN",
    "NID1", "HSPG2", "AGRN", "CD44", "CD59", "ICAM1", "ENG", "FLT1", "NRP1", "NRP2",
    "MET", "EGFR", "ERBB3", "FGFR1", "TGFBR2", "BMP1", "BMP4", "GDF11", "INHBA", "FST",
    "SFRP1", "DKK1", "SOCS3", "HSPB1", "HSP90AA1", "HSPA8", "PEA15", "CFLAR", "TNFSF10", "FAS",
    "SOD1", "SOD2", "CAT", "GPX1", "PRDX1", "TXN", "GSTP1", "PARK7", "HMOX1", "FTH1",
    "FTL", "IL4", "IL13", "CCL2", "CXCL1", "CSF1", "LIF", "OSM", "IL11", "IL1R2",
    "YWHAZ", "PPIA", "LDHA", "PKM", "TPI1", "PGK1", "ALDOA", "MDH2", "IDH1", "F2",
]

# High-abundance carriers / ECM sit at the top of a secretome LFQ dynamic range.
HIGH = {
    "ALB", "FN1", "COL1A1", "COL1A2", "COL3A1", "VTN", "THBS1", "DCN", "SPARC", "A2M",
    "SERPINA1", "CLU", "C3", "ACTB", "VIM", "GAPDH", "ENO1", "HSPA5", "HSP90B1", "TF",
}
# ST-266-style cytokines / growth factors are mid-low abundance (pg–ng/mL literature range).
LOW = {
    "FGF2", "GDNF", "NRG1", "BDNF", "NGF", "CNTF", "NTF3", "IL10", "IL1RN", "IL4",
    "IL13", "GDF15", "ANG", "AREG", "PDGFA", "PDGFB", "VEGFA", "PGF",
}

LOTS = ["LotA", "LotB", "LotC", "LotD"]
REPS = [1, 2, 3]


def main() -> None:
    rng = np.random.default_rng(266)
    columns = [f"{lot}_rep{rep}" for lot in LOTS for rep in REPS]
    # Modest batch effect: lots remain comparable but still color-separate slightly in PCA.
    lot_shift = {"LotA": 0.00, "LotB": 0.03, "LotC": -0.02, "LotD": 0.045}
    neuro = {"FGF2", "GDNF", "NRG1", "BDNF", "NGF", "VEGFA", "IGF1", "GDF15", "HGF"}
    noisy = {"VEGFA", "MMP9", "IL6", "S100A8", "CXCL1"}

    rows: list[dict[str, object]] = []
    for i, gene in enumerate(PROTEINS):
        if gene in HIGH:
            base = rng.uniform(1.2e9, 6.5e9)
        elif gene in LOW:
            base = rng.uniform(2.5e6, 4.5e7)
        else:
            base = rng.uniform(6.0e7, 8.0e8)
        # Typical secretome technical CV ~8%; a short tail of noisier analytes for the CV chart.
        wander = 0.28 if gene in noisy else 0.09
        record: dict[str, object] = {"gene": gene}
        for lot in LOTS:
            extra = 0.0
            if gene in neuro and lot == "LotD":
                extra = 0.07
            if gene in {"TIMP1", "AXL"} and lot == "LotC":
                extra = -0.05
            for rep in REPS:
                noise = rng.normal(0.0, wander)
                value = base * (1.0 + lot_shift[lot] + extra + noise)
                value *= 1.0 + 0.008 * np.sin((i + 1) * rep)
                record[f"{lot}_rep{rep}"] = f"{max(value, 1e5):.4e}"
        rows.append(record)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", newline="") as handle:
        handle.write("# DEMO / PUBLIC DATA — synthetic ST-266-style secretome abundances. Not Noveome proprietary data.\n")
        handle.write("# Rows = gene symbols; columns = lot_replicate LFQ-like intensities. See data/DEMO_PUBLIC_DATA.md.\n")
        writer = csv.DictWriter(handle, fieldnames=["gene", *columns])
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {OUT} ({len(PROTEINS)} proteins × {len(columns)} samples)")


if __name__ == "__main__":
    main()
