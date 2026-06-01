import unittest

from pipeline.mlb.warehouse.mlb_warehouse import grade_prop_market_result, prop_market_direction


class MlbWarehousePropGradingTest(unittest.TestCase):
    def test_prop_market_direction_uses_under_when_selected(self) -> None:
        self.assertEqual(prop_market_direction("Under 6.5 strikeouts"), "under")
        self.assertEqual(prop_market_direction("Over 1.5 total bases"), "over")

    def test_grade_prop_market_result_respects_under_side(self) -> None:
        hit, label = grade_prop_market_result("Under 6.5 strikeouts", 3.0, 6.5)
        self.assertEqual(hit, 1)
        self.assertIn("(under)", label)

        miss, miss_label = grade_prop_market_result("Under 3.5 strikeouts", 5.0, 3.5)
        self.assertEqual(miss, 0)
        self.assertIn("(under)", miss_label)

    def test_grade_prop_market_result_respects_over_side(self) -> None:
        hit, label = grade_prop_market_result("Over 1.5 total bases", 3.0, 1.5)
        self.assertEqual(hit, 1)
        self.assertIn("(over)", label)

        miss, miss_label = grade_prop_market_result("Over 4.5 strikeouts", 2.0, 4.5)
        self.assertEqual(miss, 0)
        self.assertIn("(over)", miss_label)


if __name__ == "__main__":
    unittest.main()
