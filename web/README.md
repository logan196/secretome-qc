# SecretomeQC web portal

Private Next.js App Router workbench for the Noveome meeting. Streamlit (`app.py`) cannot run on Vercel serverless, so this `web/` app is the deployable surface. It reuses the same DEMO / PUBLIC matrix, lot-to-lot CV story, PCA comparability, and MoA heatmap as the Python MVP.

**This is not Noveome proprietary Orbitrap data.** The bundled matrix is labeled DEMO / PUBLIC throughout.

## Local run

```bash
cd web
npm install
npm run precompute   # regenerates src/data/demo_results.json from the bundled CSV
npm run dev
```

Open http://localhost:3000. The gate shows **no lot data** until the meeting passcode is accepted.

Meeting passcode: `ST-266` (all caps, with dash). Unlock is remembered in `localStorage` and via an httpOnly cookie from `POST /api/unlock`.

```bash
npm run build
npm start
```

`npm run build` also runs `precompute` so the demo JSON stays in sync with `src/data/DEMO_PUBLIC_st266_style_secretome.csv`.

## Vercel (private deploy)

1. Import **this GitHub repository** into Vercel (or `vercel` from a machine that already has access).
2. Set **Root Directory** to `web`. Do not deploy the repo root — Streamlit is not a Vercel app.
3. Framework: Next.js. Build command: `npm run build`. Output: Next.js default.
4. **Keep the Vercel project private.** In the Vercel project, turn on **Deployment Protection** (Standard Protection / password) under  
   **Project Settings → Deployment Protection**. That password is **separate** from the in-app `ST-266` gate. Set it for the meeting so the preview URL is not world-readable.
5. Optional env: `SECRETOMEQC_PASSCODE=ST-266` (defaults to `ST-266` if unset).
6. Do **not** make the GitHub repository public. This portal is for a closed Noveome conversation.

After deploy, share the protected URL + Vercel password + app passcode `ST-266`.

## What is in the portal

- Bundled DEMO / PUBLIC matrix: 170 genes × LotA–D × 3 replicates (`src/data/DEMO_PUBLIC_st266_style_secretome.csv`, also at `/data/DEMO_PUBLIC_st266_style_secretome.csv`).
- Lot-to-lot CV panel with PASS / REVIEW / FAIL thresholds.
- PCA colored by lot, plus a between/within comparability banner.
- Pathway / signature heatmap from `src/data/moa_gene_sets.json`.
- Optional wide-CSV upload (`gene`, `LotA_rep1`, …). Client-side TS recomputes CV, PCA, and ORA.
- Branded HTML report download (Novaflow × Noveome).
- Passcode gate + `localStorage` remember. Gate page does not render QC panels or demo numbers.

QC logic is ported from `secretomeqc/` into `src/lib/` (`ingest`, `qc`, `pca`, `pathways`). `scripts/precompute-demo.ts` writes `src/data/demo_results.json` so the zero-upload path is instant.

## Demo vs proprietary

Every header, banner, and report states **DEMO / PUBLIC** for the bundled matrix. Uploaded files are labeled as confidential and **not** the bundled demo. Intensities are synthetic-but-realistic, informed by public ST-266 / AMP-cell secretome literature. See `src/data/DEMO_PUBLIC_DATA.md`.
