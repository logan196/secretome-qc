from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
ASSETS_DIR = ROOT / "assets"

DEMO_MATRIX_PATH = DATA_DIR / "DEMO_PUBLIC_st266_style_secretome.csv"
GENE_SETS_PATH = DATA_DIR / "moa_gene_sets.json"
DEMO_NOTICE_PATH = DATA_DIR / "DEMO_PUBLIC_DATA.md"

DEFAULT_PASS_CV = 20.0
DEFAULT_REVIEW_CV = 30.0

PLOTLY_LAYOUT = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="#F8FBFC",
    font=dict(family="IBM Plex Sans, Segoe UI, sans-serif", color="#12202A", size=13),
    colorway=["#0F766E", "#4338CA", "#B45309", "#0369A1", "#BE185D", "#4D7C0F"],
    margin=dict(l=48, r=18, t=48, b=48),
)

LOT_COLORS = {
    "LotA": "#0F766E",
    "LotB": "#4338CA",
    "LotC": "#B45309",
    "LotD": "#0369A1",
}
