#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import re
import sqlite3
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
REPORT_JSON = ROOT / "data-private" / "reports" / "roland-garros-2026-upset-audit.json"
REPORT_MD = ROOT / "data-private" / "reports" / "roland-garros-2026-upset-audit.md"


def normalize_name(value: Any) -> str:
    value = "" if value is None else str(value)
    value = re.sub(r"[^a-zA-Z0-9]+", " ", value).strip().lower()
    return re.sub(r"\s+", " ", value)


def pair_key(left: Any, right: Any) -> str:
    names = [normalize_name(left), normalize_name(right)]
    return " vs ".join(sorted(name for name in names if name))


def split_title(title: str) -> tuple[str, str]:
    parts = re.split(r"\s+vs\s+", title or "", maxsplit=1, flags=re.I)
    if len(parts) != 2:
        return "", ""
    return parts[0].strip(), parts[1].strip()


def parse_scoreline(scoreline: Any, winner_side: int | None) -> dict[str, Any]:
    if not scoreline or winner_side not in (1, 2):
        return {"setsWon": None, "setsLost": None, "gameMargin": None, "setsPlayed": None, "decidingSet": None}
    sets_won = 0
    sets_lost = 0
    games_won = 0
    games_lost = 0
    for token in str(scoreline).split():
        match = re.match(r"(\d+)-(\d+)", token)
        if not match:
            continue
        left = int(match.group(1))
        right = int(match.group(2))
        winner_games = left if winner_side == 1 else right
        loser_games = right if winner_side == 1 else left
        games_won += winner_games
        games_lost += loser_games
        if winner_games > loser_games:
            sets_won += 1
        else:
            sets_lost += 1
    sets_played = sets_won + sets_lost
    return {
        "setsWon": sets_won,
        "setsLost": sets_lost,
        "setsPlayed": sets_played,
        "gameMargin": games_won - games_lost if sets_played else None,
        "decidingSet": sets_played in (3, 5) and sets_lost > 0,
    }


def profit_from_snapshot(row: pd.Series) -> float:
    value = pd.to_numeric(row.get("cents_profit_if_win"), errors="coerce")
    if pd.notna(value):
        return float(value)
    probability = pd.to_numeric(row.get("probability_pct"), errors="coerce")
    if pd.notna(probability) and probability > 0:
        return (100 / float(probability) - 1) * 100
    return np.nan


def bucket_market(probability_pct: float) -> str:
    if probability_pct >= 85:
        return "85%+ extreme favorite"
    if probability_pct >= 75:
        return "75-84% heavy favorite"
    if probability_pct >= 65:
        return "65-74% favorite"
    if probability_pct >= 55:
        return "55-64% modest favorite"
    return "50-54% coinflip favorite"


def round_group(label: str | None) -> str:
    label = str(label or "")
    if re.search(r"qualifying", label, re.I):
        return "Qualifying Final"
    if re.search(r"round 1", label, re.I):
        return "Round 1"
    if re.search(r"round 2", label, re.I):
        return "Round 2"
    if re.search(r"round 3", label, re.I):
        return "Round 3"
    return label or "Unknown"


def read_sql(conn: sqlite3.Connection, sql: str) -> pd.DataFrame:
    return pd.read_sql_query(sql, conn)


def load_frames() -> dict[str, pd.DataFrame]:
    conn = sqlite3.connect(DB_PATH)
    try:
        return {
            "matches": read_sql(conn, "select * from tennis_matches"),
            "results": read_sql(conn, "select * from tennis_match_results"),
            "markets": read_sql(conn, "select * from tennis_prediction_market_snapshots"),
            "grades": read_sql(conn, "select * from tennis_prediction_grades"),
            "context": read_sql(conn, "select * from tennis_player_match_context"),
            "rankings": read_sql(
                conn,
                """
                select *
                from tennis_rankings
                where as_of_date = (select max(as_of_date) from tennis_rankings)
                """,
            ),
            "training": read_sql(conn, "select * from tennis_model_training_rows"),
        }
    finally:
        conn.close()


def build_result_frame(frames: dict[str, pd.DataFrame]) -> pd.DataFrame:
    results = frames["results"].copy()
    results = results[results["completed"].fillna(0).astype(int).eq(1)].copy()
    results["roundGroup"] = results["round_label"].map(round_group)
    results = results[results["roundGroup"].isin(["Qualifying Final", "Round 1", "Round 2"])].copy()
    results["pairKey"] = results.apply(lambda row: pair_key(row["player1_name"], row["player2_name"]), axis=1)

    matches = frames["matches"].copy()
    matches["pairKey"] = matches.apply(lambda row: pair_key(row["player1_name"], row["player2_name"]), axis=1)
    match_keep = [
        "slate_date",
        "pairKey",
        "match_id",
        "league",
        "stage",
        "desk_pick_name",
        "desk_confidence",
        "desk_volatility",
    ]
    out = results.merge(matches[match_keep], how="left", on=["slate_date", "pairKey"], suffixes=("", "_board"))
    out["match_id"] = out["match_id"].combine_first(out.get("match_id_board"))
    out["player1_normalized_name"] = out["player1_normalized_name"].fillna(out["player1_name"].map(normalize_name))
    out["player2_normalized_name"] = out["player2_normalized_name"].fillna(out["player2_name"].map(normalize_name))
    out["winnerSide"] = np.where(
        out["winner_normalized_name"].eq(out["player1_normalized_name"]),
        1,
        np.where(out["winner_normalized_name"].eq(out["player2_normalized_name"]), 2, np.nan),
    )
    score_bits = out.apply(lambda row: parse_scoreline(row.get("scoreline"), int(row["winnerSide"]) if pd.notna(row["winnerSide"]) else None), axis=1)
    score_df = pd.DataFrame(score_bits.tolist())
    return pd.concat([out.reset_index(drop=True), score_df], axis=1)


def join_ranks(results: pd.DataFrame, frames: dict[str, pd.DataFrame]) -> pd.DataFrame:
    rankings = frames["rankings"].copy()
    ranking_map = rankings.drop_duplicates("normalized_name").set_index("normalized_name")["rank"].to_dict()
    context = frames["context"].copy()
    context_map = context.dropna(subset=["rank"]).drop_duplicates(["match_id", "normalized_name"]).set_index(
        ["match_id", "normalized_name"]
    )["rank"].to_dict()

    def rank_for(row: pd.Series, side: int) -> float:
        normalized = row[f"player{side}_normalized_name"]
        match_id = row.get("match_id")
        value = context_map.get((match_id, normalized)) if pd.notna(match_id) else None
        if value is None or pd.isna(value):
            value = ranking_map.get(normalized)
        return float(value) if value is not None and pd.notna(value) else np.nan

    results["player1Rank"] = results.apply(lambda row: rank_for(row, 1), axis=1)
    results["player2Rank"] = results.apply(lambda row: rank_for(row, 2), axis=1)
    results["rankFavoriteSide"] = np.where(
        results["player1Rank"].notna() & results["player2Rank"].notna() & (results["player1Rank"] < results["player2Rank"]),
        1,
        np.where(
            results["player1Rank"].notna()
            & results["player2Rank"].notna()
            & (results["player2Rank"] < results["player1Rank"]),
            2,
            np.nan,
        ),
    )
    results["rankGap"] = (results["player1Rank"] - results["player2Rank"]).abs()
    results["rankUpset"] = results["rankFavoriteSide"].notna() & results["winnerSide"].notna() & results["rankFavoriteSide"].ne(results["winnerSide"])
    return results


def build_market_frame(results: pd.DataFrame, frames: dict[str, pd.DataFrame]) -> pd.DataFrame:
    markets = frames["markets"].copy()
    if markets.empty:
        return pd.DataFrame()
    markets["probability_pct"] = pd.to_numeric(markets["probability_pct"], errors="coerce")
    markets["profitIfWin"] = markets.apply(profit_from_snapshot, axis=1)
    rows = []
    for match_id, group in markets.dropna(subset=["match_id", "probability_pct"]).groupby("match_id"):
        if len(group) < 2:
            continue
        group = group.sort_values("probability_pct", ascending=False).head(2).copy()
        result = results[results["match_id"].eq(match_id)]
        if result.empty:
            continue
        result_row = result.iloc[0]
        for _, market in group.iterrows():
            normalized = normalize_name(market["normalized_name"])
            side = 1 if normalized == result_row["player1_normalized_name"] else 2 if normalized == result_row["player2_normalized_name"] else None
            rows.append(
                {
                    "slate_date": result_row["slate_date"],
                    "roundGroup": result_row["roundGroup"],
                    "match_id": match_id,
                    "title": result_row["title"],
                    "selection": market["player_name"],
                    "normalizedName": normalized,
                    "side": side,
                    "winnerSide": result_row["winnerSide"],
                    "isWinner": side == result_row["winnerSide"],
                    "probabilityPct": float(market["probability_pct"]),
                    "profitIfWin": float(market["profitIfWin"]) if pd.notna(market["profitIfWin"]) else np.nan,
                    "rankGap": result_row.get("rankGap"),
                    "rankUpset": bool(result_row.get("rankUpset")),
                    "scoreline": result_row.get("scoreline"),
                    "gameMargin": result_row.get("gameMargin"),
                }
            )
    market_rows = pd.DataFrame(rows)
    if market_rows.empty:
        return market_rows
    market_rows = market_rows.sort_values(["match_id", "probabilityPct"], ascending=[True, False]).copy()
    market_rows["marketPriceRank"] = market_rows.groupby("match_id").cumcount() + 1
    favorite_prob = market_rows.groupby("match_id")["probabilityPct"].transform("max")
    market_rows["isMarketFavorite"] = market_rows["marketPriceRank"].eq(1)
    market_rows["isMarketUnderdog"] = market_rows["marketPriceRank"].eq(2)
    market_rows["favoriteBucket"] = favorite_prob.map(bucket_market)
    market_rows["profitFlat100"] = np.where(market_rows["isWinner"], market_rows["profitIfWin"], -100.0)
    return market_rows


def summarize_strategy(name: str, rows: pd.DataFrame) -> dict[str, Any]:
    rows = rows.dropna(subset=["profitFlat100"]).copy()
    if rows.empty:
        return {"strategy": name, "bets": 0, "wins": 0, "hitRate": None, "profit": 0, "roi": None}
    wins = int(rows["isWinner"].sum())
    profit = float(rows["profitFlat100"].sum())
    return {
        "strategy": name,
        "bets": int(len(rows)),
        "wins": wins,
        "hitRate": round(wins / len(rows), 3),
        "profitPer100Flat": round(profit, 1),
        "roi": round(profit / (100 * len(rows)), 3),
    }


def build_replay_frame() -> pd.DataFrame:
    conn = sqlite3.connect(DB_PATH)
    try:
        return read_sql(
            conn,
            """
            select
              board_match_id as match_id,
              count(*) as games,
              sum(case when break_game = 1 then 1 else 0 end) as breaks,
              avg(point_count) as avgPoints,
              sum(case when point_count >= 8 then 1 else 0 end) * 1.0 / count(*) as longGameRate
            from tennis_sofascore_replay_games
            where board_match_id is not null
              and slate_date between '2026-05-21' and '2026-05-28'
            group by board_match_id
            """,
        )
    finally:
        conn.close()


def analyze() -> dict[str, Any]:
    frames = load_frames()
    results = join_ranks(build_result_frame(frames), frames)
    market_rows = build_market_frame(results, frames)

    round_rows = []
    for round_name, group in results.groupby("roundGroup"):
        rank_known = group[group["rankFavoriteSide"].notna()]
        round_rows.append(
            {
                "round": round_name,
                "matches": int(len(group)),
                "rankKnown": int(len(rank_known)),
                "rankUpsets": int(rank_known["rankUpset"].sum()) if not rank_known.empty else 0,
                "rankUpsetRate": round(float(rank_known["rankUpset"].mean()), 3) if not rank_known.empty else None,
                "avgWinnerGameMargin": round(float(pd.to_numeric(group["gameMargin"], errors="coerce").mean()), 2),
                "decidingSetRate": round(float(pd.to_numeric(group["decidingSet"], errors="coerce").mean()), 3),
            }
        )

    market_by_match = []
    if not market_rows.empty:
        favs = market_rows[market_rows["isMarketFavorite"]].copy()
        dogs = market_rows[market_rows["isMarketUnderdog"]].copy()
        for _, fav in favs.iterrows():
            dog = dogs[dogs["match_id"].eq(fav["match_id"])].iloc[0]
            market_by_match.append(
                {
                    "date": fav["slate_date"],
                    "round": fav["roundGroup"],
                    "matchId": fav["match_id"],
                    "match": fav["title"],
                    "favorite": fav["selection"],
                    "favoriteProb": fav["probabilityPct"],
                    "underdog": dog["selection"],
                    "underdogProb": dog["probabilityPct"],
                    "winner": fav["selection"] if fav["isWinner"] else dog["selection"],
                    "upset": bool(not fav["isWinner"]),
                    "favoriteProfit": fav["profitFlat100"],
                    "underdogProfit": dog["profitFlat100"],
                    "favoriteBucket": fav["favoriteBucket"],
                    "scoreline": fav["scoreline"],
                    "gameMargin": fav["gameMargin"],
                    "rankGap": fav["rankGap"],
                    "rankUpset": fav["rankUpset"],
                }
            )
    market_matches = pd.DataFrame(market_by_match)

    bucket_rows = []
    if not market_matches.empty:
        for bucket, group in market_matches.groupby("favoriteBucket"):
            bucket_rows.append(
                {
                    "bucket": bucket,
                    "matches": int(len(group)),
                    "upsets": int(group["upset"].sum()),
                    "upsetRate": round(float(group["upset"].mean()), 3),
                    "betFavoriteRoi": summarize_strategy("favorite", market_rows[market_rows["match_id"].isin(group["matchId"]) & market_rows["isMarketFavorite"]])["roi"],
                    "betUnderdogRoi": summarize_strategy("underdog", market_rows[market_rows["match_id"].isin(group["matchId"]) & market_rows["isMarketUnderdog"]])["roi"],
                }
            )

    strategies = []
    if not market_rows.empty:
        strategies = [
            summarize_strategy("Bet every market favorite", market_rows[market_rows["isMarketFavorite"]]),
            summarize_strategy("Bet every market underdog", market_rows[market_rows["isMarketUnderdog"]]),
            summarize_strategy("Bet favorites only under 70%", market_rows[market_rows["isMarketFavorite"] & market_rows["probabilityPct"].lt(70)]),
            summarize_strategy("Bet favorites only 55-70%", market_rows[market_rows["isMarketFavorite"] & market_rows["probabilityPct"].between(55, 70, inclusive="left")]),
            summarize_strategy("Fade favorites 75%+ / bet the dog", market_rows[market_rows["isMarketUnderdog"] & market_rows["match_id"].isin(market_matches[market_matches["favoriteProb"].ge(75)]["matchId"])]),
            summarize_strategy("Bet dogs priced 25-49%", market_rows[market_rows["isMarketUnderdog"] & market_rows["probabilityPct"].between(25, 49, inclusive="both")]),
            summarize_strategy("Bet dogs priced 30-49%", market_rows[market_rows["isMarketUnderdog"] & market_rows["probabilityPct"].between(30, 49, inclusive="both")]),
            summarize_strategy("Pass 75%+ favorites; bet all other favorites", market_rows[market_rows["isMarketFavorite"] & market_rows["probabilityPct"].lt(75)]),
        ]

    biggest_upsets = []
    if not market_matches.empty:
        biggest_upsets = (
            market_matches[market_matches["upset"]]
            .sort_values(["favoriteProb", "rankGap"], ascending=[False, False])
            .head(15)
            .to_dict("records")
        )

    rank_gap_rows = []
    rank_known = results[results["rankGap"].notna()].copy()
    if not rank_known.empty:
        rank_known["rankGapBucket"] = pd.cut(
            rank_known["rankGap"],
            bins=[-1, 10, 25, 50, 100, 250, 10000],
            labels=["0-10", "11-25", "26-50", "51-100", "101-250", "250+"],
        )
        for (round_name, bucket), group in rank_known.groupby(["roundGroup", "rankGapBucket"], observed=True):
            rank_gap_rows.append(
                {
                    "round": round_name,
                    "rankGap": str(bucket),
                    "matches": int(len(group)),
                    "rankUpsets": int(group["rankUpset"].sum()),
                    "rankUpsetRate": round(float(group["rankUpset"].mean()), 3),
                }
            )

    market_round_rows = []
    replay_outcome_rows = []
    if not market_rows.empty:
        favorites = market_rows[market_rows["isMarketFavorite"]].copy()
        underdogs = market_rows[market_rows["isMarketUnderdog"]].copy()
        for round_name, group in favorites.groupby("roundGroup"):
            matching_dogs = underdogs[underdogs["match_id"].isin(group["match_id"])]
            market_round_rows.append(
                {
                    "round": round_name,
                    "matches": int(len(group)),
                    "favoriteHitRate": round(float(group["isWinner"].mean()), 3),
                    "favoriteRoi": summarize_strategy("favorite", group)["roi"],
                    "underdogHitRate": round(float(matching_dogs["isWinner"].mean()), 3) if not matching_dogs.empty else None,
                    "underdogRoi": summarize_strategy("underdog", matching_dogs)["roi"],
                }
            )

        replay = build_replay_frame()
        if not replay.empty:
            flow = favorites.merge(replay, how="left", on="match_id")
            flow["favoriteLost"] = ~flow["isWinner"]
            for favorite_lost, group in flow.groupby("favoriteLost"):
                replay_known = group[group["games"].notna()]
                replay_outcome_rows.append(
                    {
                        "marketFavoriteOutcome": "favorite lost" if bool(favorite_lost) else "favorite won",
                        "matches": int(len(group)),
                        "replayKnown": int(len(replay_known)),
                        "avgBreaksInMatch": round(float(replay_known["breaks"].mean()), 2) if not replay_known.empty else None,
                        "avgLongGameRate": round(float(replay_known["longGameRate"].mean()), 3) if not replay_known.empty else None,
                        "avgPointsPerGame": round(float(replay_known["avgPoints"].mean()), 2) if not replay_known.empty else None,
                        "avgWinnerGameMargin": round(float(pd.to_numeric(group["gameMargin"], errors="coerce").mean()), 2),
                    }
                )

    payload = {
        "coverage": {
            "warehouseResultRows": int(len(results)),
            "qualifyingFinalRows": int((results["roundGroup"] == "Qualifying Final").sum()),
            "round1Rows": int((results["roundGroup"] == "Round 1").sum()),
            "round2Rows": int((results["roundGroup"] == "Round 2").sum()),
            "marketPricedMatches": int(market_matches["matchId"].nunique()) if not market_matches.empty else 0,
            "replayMatchesThroughRound2": int(
                read_sql(
                    sqlite3.connect(DB_PATH),
                    "select count(distinct board_match_id) as count from tennis_sofascore_replay_games",
                ).iloc[0]["count"]
            ),
            "note": "Market ROI uses only matches with captured prediction-market prices. Qualifying has outcomes but very thin price/replay coverage.",
        },
        "roundSummary": round_rows,
        "marketFavoriteBuckets": sorted(bucket_rows, key=lambda row: row["bucket"]),
        "marketByRound": market_round_rows,
        "rankGapBucketsByRound": rank_gap_rows,
        "replayFlowByMarketOutcome": replay_outcome_rows,
        "strategies": strategies,
        "biggestMarketUpsets": biggest_upsets,
        "rankUpsetsByRound": round_rows,
    }
    return payload


def markdown_table(rows: list[dict[str, Any]], columns: list[str]) -> str:
    if not rows:
        return "_No rows._"
    out = ["|" + "|".join(columns) + "|", "|" + "|".join(["---"] * len(columns)) + "|"]
    for row in rows:
        out.append("|" + "|".join(str(row.get(col, "")) for col in columns) + "|")
    return "\n".join(out)


def write_reports(payload: dict[str, Any]) -> None:
    REPORT_JSON.parent.mkdir(parents=True, exist_ok=True)
    REPORT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    lines = [
        "# Roland Garros 2026 Upset Audit",
        "",
        "## Coverage",
        "",
        "```json",
        json.dumps(payload["coverage"], indent=2),
        "```",
        "",
        "## Upsets By Round",
        "",
        markdown_table(payload["roundSummary"], ["round", "matches", "rankKnown", "rankUpsets", "rankUpsetRate", "avgWinnerGameMargin", "decidingSetRate"]),
        "",
        "## Market Favorite Buckets",
        "",
        markdown_table(payload["marketFavoriteBuckets"], ["bucket", "matches", "upsets", "upsetRate", "betFavoriteRoi", "betUnderdogRoi"]),
        "",
        "## Market ROI By Round",
        "",
        markdown_table(payload["marketByRound"], ["round", "matches", "favoriteHitRate", "favoriteRoi", "underdogHitRate", "underdogRoi"]),
        "",
        "## Rank Gap Buckets By Round",
        "",
        markdown_table(payload["rankGapBucketsByRound"], ["round", "rankGap", "matches", "rankUpsets", "rankUpsetRate"]),
        "",
        "## Replay Flow By Market Outcome",
        "",
        markdown_table(payload["replayFlowByMarketOutcome"], ["marketFavoriteOutcome", "matches", "replayKnown", "avgBreaksInMatch", "avgLongGameRate", "avgPointsPerGame", "avgWinnerGameMargin"]),
        "",
        "## Simple Betting Strategies",
        "",
        markdown_table(payload["strategies"], ["strategy", "bets", "wins", "hitRate", "profitPer100Flat", "roi"]),
        "",
        "## Biggest Captured Market Upsets",
        "",
        markdown_table(payload["biggestMarketUpsets"], ["date", "round", "match", "favorite", "favoriteProb", "underdog", "underdogProb", "winner", "scoreline", "gameMargin", "rankGap"]),
        "",
        "## Read",
        "",
        "No strategy is guaranteed. In this sample, the profitable pattern was not blind favorite betting; it was avoiding taxed favorites and respecting underdog prices when the favorite was vulnerable. The replay layer is the next source of robustness because it separates stable favorites from favorites that leak service games, fail closeouts, or collapse after momentum turns.",
        "",
    ]
    REPORT_MD.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    payload = analyze()
    write_reports(payload)
    print(json.dumps(payload["coverage"], indent=2))
    print(f"Wrote {REPORT_JSON.relative_to(ROOT)}")
    print(f"Wrote {REPORT_MD.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
