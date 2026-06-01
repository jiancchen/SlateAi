import json
import subprocess
import unittest


class MlbTotalChaosGateTest(unittest.TestCase):
    def run_total_replay(self, game_file: str) -> dict:
        script = f"""
import fs from 'node:fs'
import {{ buildMlbAnalysisContext }} from './models/mlb/cartridges/MLB-M0/lib/mlb-analysis-context.js'
const game = JSON.parse(fs.readFileSync('published-data/slates/2026-05-31/games/{game_file}', 'utf8'))
const context = buildMlbAnalysisContext(game, game.matchup)
console.log(JSON.stringify(context.mlbProjection.totals.fullGame))
"""
        output = subprocess.check_output(
            ["node", "--input-type=module", "-e", script],
            text=True,
        )
        return json.loads(output)

    def test_high_chaos_under_is_vetoed(self) -> None:
        full_game = self.run_total_replay("yankees-athletics.json")

        self.assertEqual(full_game["lean"], "Pass")
        self.assertEqual(full_game["originalLean"], "Under")
        self.assertEqual(full_game["chaosGate"]["vetoReason"], "under exposed to mistake-chaos and one-big-inning risk")
        self.assertGreaterEqual(full_game["chaosGate"]["overChaosScore"], 4)

    def test_cleaner_projection_can_survive_gate(self) -> None:
        full_game = self.run_total_replay("diamondbacks-mariners.json")

        self.assertEqual(full_game["lean"], "Over")
        self.assertFalse(full_game["chaosGate"]["vetoed"])

    def test_context_total_is_used_when_odds_market_is_empty(self) -> None:
        full_game = self.run_total_replay("angels-rays.json")

        self.assertNotEqual(full_game["label"], "No market")
        self.assertEqual(full_game["label"], "Hold 8.5")
        self.assertTrue(full_game["chaosGate"]["warning"])


if __name__ == "__main__":
    unittest.main()
