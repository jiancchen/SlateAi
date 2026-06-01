import json
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def run_node_json(script: str) -> dict:
    output = subprocess.check_output(
        ["node", "--input-type=module", "-e", script],
        cwd=ROOT,
        text=True,
    )
    return json.loads(output)


class MlbM2GameShapeTest(unittest.TestCase):
    def test_m2_is_registered_but_not_active(self) -> None:
        registry = json.loads((ROOT / "models/mlb/registry.json").read_text())
        m2 = next(entry for entry in registry["cartridges"] if entry["modelId"] == "MLB-M2")

        self.assertEqual(registry["active"]["model"], "MLB-M0")
        self.assertEqual(m2["status"], "draft")
        self.assertEqual(m2["basedOn"], "MLB-M0")

    def test_m2_adds_game_shape_without_changing_m0(self) -> None:
        payload = run_node_json(
            """
import fs from 'node:fs'
import { createSportsMatchModel as createM0 } from './models/mlb/cartridges/MLB-M0/lib/sports-model.js'
import { createSportsMatchModel as createM2 } from './models/mlb/cartridges/MLB-M2/lib/sports-model.js'
const game = JSON.parse(fs.readFileSync('published-data/slates/2026-05-31/games/yankees-athletics.json', 'utf8'))
const m0 = createM0(game)
const m2 = createM2(game)
console.log(JSON.stringify({
  m0Designation: m0.analysis.modelDesignation,
  m0HasShape: Boolean(m0.analysis.gameShape),
  m2Designation: m2.analysis.modelDesignation,
  m2Shape: m2.analysis.gameShape
}))
"""
        )

        shape = payload["m2Shape"]
        self.assertEqual(payload["m0Designation"], "board-moneyline-v1.1")
        self.assertFalse(payload["m0HasShape"])
        self.assertEqual(payload["m2Designation"], "MLB-M2-game-shape-v0.1")
        self.assertEqual(shape["label"], "Weather-carry chaos")
        self.assertEqual(shape["shapeLabel"], "crooked-inning chaos")
        self.assertEqual(shape["category"]["slug"], "weather_chaos_carry")
        self.assertEqual(shape["category"]["bestExpression"], "Totals / HR cluster before side")
        self.assertEqual(shape["laneMap"]["total"], "Primary lane; one crooked inning can beat a side read.")
        self.assertEqual(shape["inningMap"][0]["innings"], "1-2")
        self.assertGreaterEqual(shape["scores"]["chaosScore"], 70)
        self.assertGreaterEqual(shape["scores"]["realityGapScore"], 65)
        self.assertIn("full-game ML", shape["marketImplications"]["side"])
        self.assertEqual(shape["radar"]["version"], "MLB-M2-game-shape-radar-v1")
        self.assertEqual([axis["id"] for axis in shape["radar"]["axes"]], ["pressure", "chaos", "freeze", "air", "bridge", "flow"])
        self.assertEqual(len(shape["radar"]["profiles"]), 2)
        self.assertGreaterEqual(shape["radar"]["gameProfile"]["scores"]["chaos"], 70)

    def test_m2_rf_lens_keeps_moneyline_advisory(self) -> None:
        payload = run_node_json(
            """
import fs from 'node:fs'
import { createSportsMatchModel } from './models/mlb/cartridges/MLB-M2/lib/sports-model.js'
const game = JSON.parse(fs.readFileSync('published-data/slates/2026-05-31/games/yankees-athletics.json', 'utf8'))
const model = createSportsMatchModel(game)
console.log(JSON.stringify(model.analysis.gameShape.rfLens))
"""
        )

        self.assertTrue(payload["laneBaselines"]["totals"]["deployable"])
        self.assertFalse(payload["laneBaselines"]["moneyline"]["deployable"])
        self.assertFalse(payload["laneBaselines"]["first5"]["deployable"])
        self.assertGreaterEqual(payload["impactScore"], 80)
        self.assertIn("Do not let it pick ML", payload["trustedUse"])


if __name__ == "__main__":
    unittest.main()
