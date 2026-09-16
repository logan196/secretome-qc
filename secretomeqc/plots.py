from __future__ import annotations

import plotly.express as px
import plotly.graph_objects as go

from .config import LOT_COLORS, PLOTLY_LAYOUT
from .pathways import PathwayResult
from .pca import PCAResult
from .qc import QCResult


def _apply_layout(fig: go.Figure, title: str) -> go.Figure:
    fig.update_layout(title=title, **PLOTLY_LAYOUT)
    fig.update_xaxes(showgrid=True, gridcolor="#E4EEF1", zeroline=False)
    fig.update_yaxes(showgrid=True, gridcolor="#E4EEF1", zeroline=False)
    return fig


def cv_figure(qc: QCResult) -> go.Figure:
    table = qc.protein_table.dropna(subset=["between_lot_cv_pct"]).copy()
    table = table.sort_values("between_lot_cv_pct").tail(40)
    color_map = {"PASS": "#047857", "REVIEW": "#B45309", "FAIL": "#B91C1C", "NA": "#64748B"}
    fig = px.bar(
        table,
        x="between_lot_cv_pct",
        y="protein",
        color="status",
        color_discrete_map=color_map,
        orientation="h",
        hover_data=["median_within_lot_cv_pct"],
    )
    fig.update_traces(marker_line_width=0)
    fig.update_layout(height=max(420, 16 * len(table)), yaxis={"categoryorder": "total ascending"})
    return _apply_layout(fig, "Lot-to-lot CV by protein (highest 40)")


def pca_figure(pca: PCAResult) -> go.Figure:
    fig = px.scatter(
        pca.scores,
        x="pc1",
        y="pc2",
        color="lot",
        text="sample",
        color_discrete_map=LOT_COLORS,
    )
    fig.update_traces(marker=dict(size=14, line=dict(width=1, color="white")), textposition="top center")
    fig.update_layout(
        height=460,
        xaxis_title=f"PC1 ({pca.variance[0]:.1f}%)",
        yaxis_title=f"PC2 ({pca.variance[1]:.1f}%)",
    )
    return _apply_layout(fig, "PCA of secretome abundance profiles")


def heatmap_figure(pathways: PathwayResult) -> go.Figure:
    z = pathways.lot_scores
    fig = go.Figure(
        data=go.Heatmap(
            z=z.to_numpy(),
            x=list(z.columns),
            y=list(z.index),
            colorscale=[
                [0.0, "#1E3A5F"],
                [0.5, "#F8FAFC"],
                [1.0, "#0F766E"],
            ],
            colorbar=dict(title="Mean z-score"),
            hovertemplate="Lot %{y}<br>%{x}: %{z:.2f}<extra></extra>",
        )
    )
    fig.update_layout(height=340)
    return _apply_layout(fig, "Pathway / signature activity by lot")
