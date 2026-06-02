# Tennis Selector Rule Experiment - 2026-06-01

## Question

Do the June 1 lessons help the model if they are used as selector gates instead of raw probability features?

## Result

- Desk/pick baseline: 183/282 (64.9%).
- Desk/pick after later-round risk veto: 182/275 (66.2%).
- Veto removed 7 desk rows: 6 misses avoided, 1 winners removed.
- Positive-EV ML baseline: 4/10 (40.0%), ROI -35.6%.
- Positive-EV ML after veto: 4/6 (66.7%), ROI 7.2%.

## June 1 Counterfactual

- June 1 desk baseline: 3/8 (37.5%).
- June 1 after veto: 3/4 (75.0%).
- June 1 positive-EV ML after veto: 2/2 (100.0%).

Vetoed June 1 ML/value rows:
- Frances Tiafoe vs Matteo Arnaldi: Frances Tiafoe (Favorite price needs better proof), hit=False, risks=opponent-return-pressure, opponent-tiebreak, time-load.
- Juan Manuel Cerundolo vs Matteo Berrettini: Juan Manuel Cerundolo (Model probability outside validated lane), hit=False, risks=time-load.
- Anastasia Potapova vs Anna Kalinskaya: Anastasia Potapova (Favorite price needs better proof), hit=False, risks=error-control, favorite-tax, late-service, long-service, opponent-bp-conversion, opponent-return-pressure, opponent-tiebreak, second-serve.
- Madison Keys vs Diana Shnaider: Madison Keys (Favorite price needs better proof), hit=False, risks=error-control, opponent-return-pressure.

## Pressure-Dog Lane

- Pressure-dog candidates: 9/24 (37.5%), contract ROI 0.098.
- This is a trade/watch lane, not a blind winner lane. It needs Kalshi max-price history before publishing.

## Serve-Floor Flip Lane

- Serve-floor flip candidates: 9/15 (60.0%).
- This is promising as a veto/derivative hint, but too noisy to promote as automatic ML flips.

## Derivative And Data-Integrity Gates

- Compression-under veto saw 1 published Over rows; hit rate on vetoed Overs was 0.0%.
- Rows with N/A hold/return explanations: 0 graded, hit rate n/a.
- If a derivative row cannot explain hold, break, BP saved, and BP conversion from warehouse rows, it should not be bet-grade.

## Kalshi Health

- 2026-05-29: 1/16 candidates missing required fields.
- 2026-05-30: 3/16 candidates missing required fields.
- 2026-05-31: 1/8 candidates missing required fields.
- 2026-06-01: 1/8 candidates missing required fields.
- 2026-06-02: 4/4 candidates missing required fields.

## Promotion Decision

Promote the later-round risk veto and data-integrity gate into the publish/value-board layer.

Do not promote pressure-dog or serve-floor flips as direct winner picks yet. Store them as watch/trade lanes and require day-bucket ROI before they can become bet-grade.
