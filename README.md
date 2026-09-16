# SecretomeQC

Self-serve **secretome QC / MoA explorer** for ST-266-style products. Load a multi-lot protein abundance matrix, review lot comparability, inspect anti-inflammatory / neuroprotective / anti-apoptotic signature activity, and export a branded HTML report.

Built by **Novaflow** for **Noveome Biotherapeutics**. This repository is an MVP for an internal meeting — demoware that is meant to look and feel like a real QC workbench.

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
streamlit run app.py
```

Then open the URL Streamlit prints (typically http://localhost:8501).

**Zero-upload demo:** leave the sidebar on *Bundled demo*. The three visualization panels, verdict banners, and report download work immediately.

## What the MVP does

1. **Ingest** a wide abundance matrix — rows = gene symbols, columns = samples named like `LotA_rep1`, `LotB_rep2`.
2. **Lot-to-lot CV** table and bar chart with adjustable PASS / REVIEW / FAIL thresholds.
3. **PCA** colored by lot, plus a comparability verdict from between- vs within-lot geometry.
4. **Pathway / signature heatmap** using a bundled mini gene-set library (anti-inflammatory, neuroprotective, anti-apoptotic) and a lightweight hypergeometric ORA. Heavy tools such as decoupler are intentionally skipped.
5. **One-click HTML report** with verdict, KPIs, plots, and top pathways. Print-to-PDF from the browser if a PDF is needed for the room.

## Demo vs production

| | Demo (what you are running tonight) | Production (not this repo yet) |
|---|---|---|
| Data | Bundled **DEMO / PUBLIC** synthetic matrix styled after extracellular / secretome proteomics | Noveome Orbitrap lots under NDA |
| Intensities | Simulated LFQ-like values with realistic lot structure | FragPipe or quantms quantified tables |
| Gene sets | Mini MoA library shipped in `data/moa_gene_sets.json` | Curated ST-266 signatures + full pathway collections |
| Report | Branded HTML (meeting-ready) | Controlled document / eCTD-adjacent PDF |
| Auth / audit | None | Role-based access, lot genealogy, 21 CFR Part 11 |

The demo file `data/DEMO_PUBLIC_st266_style_secretome.csv` is clearly labeled **DEMO / PUBLIC DATA**. Protein membership is informed by *public* ST-266 / AMP-cell secretome literature (FGF2, GDF15, GDNF, NRG1, TGF-β, angiogenin, PDGF, VEGF, amphiregulin, decorin, SPARC, MIF, DPP4, soluble TNF receptors, AXL, TIMP1/2, and typical ECM / protease cargo). **It is not Noveome proprietary data.** See `data/DEMO_PUBLIC_DATA.md`.

To regenerate the bundled matrix:

```bash
python scripts/generate_demo_matrix.py
```

## Upload format

```text
gene,LotA_rep1,LotA_rep2,LotB_rep1,LotB_rep2
FGF2,1.02e7,9.88e6,1.11e7,1.05e7
TIMP1,2.10e8,2.04e8,1.97e8,2.21e8
```

- First column: gene symbol (`gene`, `symbol`, or `protein` headers are accepted).
- Remaining columns: numeric intensities. Lines starting with `#` are ignored.
- Lot IDs are parsed from headers (`LotA_rep1`, `LotB-r2`, `ST266_LotC_rep3`).

## Phase 2 (post-meeting / post-NDA)

- FragPipe and quantms (and optionally OpenMS) ingestion from real Orbitrap raw → protein groups.
- True ST-266 lot genealogy, system-suitability, and residual-carrier flags (albumin / STM100).
- Locked report templates closer to FDA-facing QC language — **not** in scope for this MVP.

## Tests

```bash
pytest -q
```

## Repository layout

```text
app.py                      # Streamlit UI
secretomeqc/                # ingest, CV, PCA, pathways, report
data/DEMO_PUBLIC_*.csv      # bundled demo matrix
data/moa_gene_sets.json     # mini MoA library
assets/                     # Novaflow + Noveome wordmarks, CSS
```
