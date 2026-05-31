import { createSportsMatchModel } from './sports-model.js'
import tennisClayContext from './day-2026-05-31-tennis-clay-context.generated.json' with { type: 'json' }
import tennisOpponentQualityContext from './day-2026-05-31-tennis-opponent-quality.generated.json' with { type: 'json' }
import tennisWarehouseContext from './day-2026-05-31-tennis-warehouse-context.generated.json' with { type: 'json' }

const rawTennisGames = [
  {
    "id": "rg-w-marta-kostyuk-iga-swiatek-2026-05-31",
    "eventId": "175574",
    "tour": "WTA",
    "title": "Marta Kostyuk vs Iga Swiatek",
    "start": "2:00 AM",
    "startMinutes": 120,
    "court": "Court Philippe-Chatrier",
    "round": "Round 4",
    "pickName": "Marta Kostyuk",
    "basePickName": "Iga Swiatek",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": true,
    "confidence": 61.1,
    "volatility": 55,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Watch only",
      "Model split - pass ML",
      "Positive price edge",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Iga Swiatek has the recent service-hold edge 77% to 73%, so Marta Kostyuk needs the rank/form edge to show up on return games. Marta Kostyuk grades 13 points better on opponent-adjusted recent form. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness warning",
      "target": "Marta Kostyuk",
      "scoreGap": -18,
      "attackingSide": null,
      "vulnerableSide": "Marta Kostyuk",
      "gameFlow": "Marta Kostyuk is the model side, but the fragile profile is on our pick: double-fault pressure (4.9 avg); 7 recent matches with serve instability. Avoid laying a bad price until early holds are confirmed.",
      "liveTrigger": "Do not upgrade Marta Kostyuk unless they hold cleanly in the first service game and keep double faults down.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "Avoid low unders if Marta Kostyuk faces early break points or second-serve pressure.",
      "pick": {
        "name": "Marta Kostyuk",
        "serviceHoldPct": 73,
        "firstServeWonPct": 67,
        "secondServeWonPct": 53,
        "firstServePct": 56,
        "avgAces": 3.4,
        "avgDoubleFaults": 4.9,
        "avgWinners": 38.3,
        "avgUnforcedErrors": 37.3,
        "avgBreakPointsFaced": 7.8,
        "returnPointsWonPct": 52,
        "servicePointsWonPct": 61,
        "weakServeMatches": 7,
        "pressureMatches": 3,
        "matchesWithStats": 8,
        "weaknessScore": 24,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "double-fault pressure (4.9 avg)",
          "7 recent matches with serve instability"
        ],
        "strengths": [
          "creates return pressure (52% return points won)"
        ],
        "gameFlowRead": "Marta Kostyuk can drop points quickly through double-fault pressure (4.9 avg) and 7 recent matches with serve instability."
      },
      "opponent": {
        "name": "Iga Swiatek",
        "serviceHoldPct": 77,
        "firstServeWonPct": 70,
        "secondServeWonPct": 56,
        "firstServePct": 66,
        "avgAces": 1.9,
        "avgDoubleFaults": 2.3,
        "avgWinners": 15.7,
        "avgUnforcedErrors": 23.7,
        "avgBreakPointsFaced": 4.1,
        "returnPointsWonPct": 57,
        "servicePointsWonPct": 64,
        "weakServeMatches": 2,
        "pressureMatches": 2,
        "matchesWithStats": 8,
        "weaknessScore": 6,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "negative winner/error balance (15.7 winners, 23.7 unforced)"
        ],
        "strengths": [
          "protects serve well (77% hold)",
          "second serve holds up (56%)",
          "creates return pressure (57% return points won)"
        ],
        "gameFlowRead": "Iga Swiatek can drop points quickly through negative winner/error balance (15.7 winners, 23.7 unforced)."
      }
    },
    "setWinProjections": [
      {
        "name": "Marta Kostyuk",
        "confidence": 72,
        "modelPct": 61.1,
        "label": "Live to win a set"
      },
      {
        "name": "Iga Swiatek",
        "confidence": 55,
        "modelPct": 38.9,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Marta Kostyuk",
        "americanOdds": 220,
        "modelPct": 61.1,
        "impliedPct": 31.3,
        "edgePct": 29.9,
        "evPer100": 95.5,
        "netEvPer100": 93.5,
        "feePer100": 2,
        "valueIssue": "Model-market outlier",
        "valueGrade": "Model-market outlier",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Marta Kostyuk",
        "line": 4.5,
        "americanOdds": -122,
        "modelPct": 49,
        "impliedPct": 55,
        "edgePct": -6,
        "evPer100": -10.8,
        "netEvPer100": -12.8,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 20.5,
        "americanOdds": -118,
        "expectedGames": 22,
        "modelPct": 63,
        "impliedPct": 54.1,
        "edgePct": 8.9,
        "evPer100": 16.4,
        "netEvPer100": 14.4,
        "feePer100": 2,
        "valueIssue": "Total watch only",
        "valueGrade": "Watch only",
        "reason": "Expected match games 22 vs FanDuel 20.5; Over. hold avg 75%, return games won 62%, first-set sample 8.8g, 36 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Under 9.5",
        "line": 9.5,
        "americanOdds": -148,
        "expectedGames": 7.9,
        "confidence": 73,
        "tiebreakRisk": 18,
        "earlyBreakRisk": 64,
        "modelPct": 73,
        "evPer100": 22.3,
        "netEvPer100": 20.3,
        "valueGrade": "Actionable live watch",
        "reason": "Expected first-set games 7.9 vs FanDuel 9.5; Under 9.5. hold avg 75%, return games won 62%, first-set sample 8.8g, 36 recent sets.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Marta Kostyuk",
          "confidence": 72,
          "modelPct": 61.1,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Iga Swiatek",
          "confidence": 55,
          "modelPct": 38.9,
          "label": "Needs early hold pressure",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": {
      "profiles": [
        {
          "name": "Marta Kostyuk",
          "holdPct": 73,
          "firstServeWonPct": 67,
          "secondServeWonPct": 53,
          "servicePointsWonPct": 61,
          "returnPointsWonPct": 52,
          "returnGamesWonPct": 57.125,
          "aces": 3.4,
          "doubleFaults": 4.9,
          "winners": 38.3,
          "unforcedErrors": 37.3,
          "weaknessScore": 24,
          "weakServeMatches": 7,
          "statMatches": 8,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 18,
            "firstSetSamples": 8,
            "avgFirstSetGames": 9.5,
            "avgSetGames": 9.055555555555555,
            "avgMatchGames": 20.375,
            "avgSetsPlayed": 2.25,
            "tiebreakRate": 0.1111111111111111,
            "extendedSetRate": 0.16666666666666666,
            "shortSetRate": 0.3888888888888889
          }
        },
        {
          "name": "Iga Swiatek",
          "holdPct": 77,
          "firstServeWonPct": 70,
          "secondServeWonPct": 56,
          "servicePointsWonPct": 64,
          "returnPointsWonPct": 57,
          "returnGamesWonPct": 66.375,
          "aces": 1.9,
          "doubleFaults": 2.3,
          "winners": 15.7,
          "unforcedErrors": 23.7,
          "weaknessScore": 6,
          "weakServeMatches": 2,
          "statMatches": 8,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 18,
            "firstSetSamples": 8,
            "avgFirstSetGames": 8,
            "avgSetGames": 8.333333333333334,
            "avgMatchGames": 18.75,
            "avgSetsPlayed": 2.25,
            "tiebreakRate": 0.05555555555555555,
            "extendedSetRate": 0.05555555555555555,
            "shortSetRate": 0.6666666666666666
          }
        }
      ],
      "expectedFirstSetGames": 7.9,
      "expectedMatchGames": 22,
      "signalStrength": 9,
      "holdAvg": 75,
      "returnGamesAvg": 61.8,
      "returnPointsAvg": 54.5,
      "setSamples": 36,
      "firstSetSamples": 16,
      "avgFirstSetGames": 8.8,
      "avgSetGames": 8.7,
      "tiebreakRate": 8.3,
      "extendedSetRate": 11.1,
      "shortSetRate": 52.8,
      "reasonCore": "hold avg 75%, return games won 62%, first-set sample 8.8g, 36 recent sets"
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Marta Kostyuk",
        "line": null,
        "americanOdds": 220,
        "modelPct": 61.1,
        "impliedPct": 31.3,
        "edgePct": 29.9,
        "evPer100": 95.5,
        "netEvPer100": 93.5,
        "grade": "Model-market outlier",
        "issue": "Model-market outlier",
        "reason": "Model is meaningfully above FanDuel implied price."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Marta Kostyuk",
        "line": 4.5,
        "americanOdds": -122,
        "modelPct": 49,
        "impliedPct": 55,
        "edgePct": -6,
        "evPer100": -10.8,
        "netEvPer100": -12.8,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 49,
        "grade": "Negative EV",
        "reason": "Spread is number-dependent; verify first service cycle"
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "Over",
        "line": 20.5,
        "americanOdds": -118,
        "modelPct": 63,
        "impliedPct": 54.1,
        "edgePct": 8.9,
        "evPer100": 16.4,
        "netEvPer100": 14.4,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 63,
        "grade": "Watch only",
        "reason": "Total games need expected match games vs the posted line."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Marta Kostyuk 72% / Iga Swiatek 55%",
        "rows": [
          {
            "name": "Marta Kostyuk",
            "confidence": 72,
            "modelPct": 61.1,
            "label": "Live to win a set"
          },
          {
            "name": "Iga Swiatek",
            "confidence": 55,
            "modelPct": 38.9,
            "label": "Needs early hold pressure"
          }
        ],
        "confidence": 72,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Under 9.5",
        "expectedGames": 7.9,
        "confidence": 73,
        "tiebreakRisk": 18,
        "earlyBreakRisk": 64,
        "grade": "Actionable live watch",
        "reason": "Expected first-set games 7.9 vs FanDuel 9.5; Under 9.5. hold avg 75%, return games won 62%, first-set sample 8.8g, 36 recent sets."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Marta Kostyuk",
      "opponent": "Iga Swiatek",
      "grade": "Watch only",
      "riskGate": "error-control risk, hold risk, opponent return pressure; ML value gate frozen after prior slate",
      "marketOdds": 233,
      "fairOdds": -157,
      "modelProbability": 61.1,
      "dataOnlyProbability": 67.9,
      "marketProbability": 30,
      "marketDisagreementPct": 31.1,
      "netEvPer100": 101.5,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Marta Kostyuk is priced below the model, not guaranteed to win.",
      "useCase": "Straight ML value only at +233 or better; fair price from the ensemble is about -157.",
      "bullets": [
        "Recent hold: Marta Kostyuk 73.1% vs Iga Swiatek 76.8%.",
        "Serve events: Marta Kostyuk 3.4 aces / 4.9 DFs vs Iga Swiatek 1.9 aces / 2.3 DFs.",
        "Serve points: Marta Kostyuk 1st 67%, 2nd 52.6% vs Iga Swiatek 1st 69.6%, 2nd 55.8%.",
        "Winner/error profile: Marta Kostyuk 38.3 winners / 37.3 UEs vs Iga Swiatek 15.7 winners / 23.7 UEs."
      ],
      "risks": [
        "Market still prices Marta Kostyuk as a real underdog at 30% implied.",
        "Iga Swiatek strength: protects serve well (77% hold).",
        "Marta Kostyuk risk: double-fault pressure (4.9 avg)."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page Chrome scrape",
      "capturedAt": "2026-05-31T02:10:15.529Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/marta-kostyuk-v-iga-swiatek-35662992",
      "eventId": "35662992",
      "players": [
        {
          "name": "Marta Kostyuk",
          "odds": 220,
          "americanLabel": "+220",
          "impliedPct": 31.3,
          "decimalOdds": 3.2,
          "modelPct": 61.1,
          "edgePct": 29.9,
          "priceBand": "Underdog",
          "grossProfitPct": 220,
          "grossPayoutMultiple": 3.2,
          "centsAtRisk": 100,
          "centsProfitIfWin": 220
        },
        {
          "name": "Iga Swiatek",
          "odds": -275,
          "americanLabel": "-275",
          "impliedPct": 73.3,
          "decimalOdds": 1.364,
          "modelPct": 38.9,
          "edgePct": -34.4,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 36.4,
          "grossPayoutMultiple": 1.364,
          "centsAtRisk": 100,
          "centsProfitIfWin": 36.4
        }
      ],
      "desk": {
        "name": "Marta Kostyuk",
        "odds": 220,
        "americanLabel": "+220",
        "impliedPct": 31.3,
        "decimalOdds": 3.2,
        "modelPct": 61.1,
        "edgePct": 29.9,
        "priceBand": "Underdog",
        "grossProfitPct": 220,
        "grossPayoutMultiple": 3.2,
        "centsAtRisk": 100,
        "centsProfitIfWin": 220
      },
      "spread": {
        "player": "Marta Kostyuk",
        "spread": 4.5,
        "odds": -122
      },
      "total": {
        "side": "Over",
        "line": 20.5,
        "odds": -118
      },
      "totalOver": {
        "side": "Over",
        "line": 20.5,
        "odds": -118
      },
      "totalUnder": {
        "side": "Under",
        "line": 20.5,
        "odds": -112
      },
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": 106
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": 106
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": -148
      },
      "priceAction": "Model is meaningfully above FanDuel implied price.",
      "spreadValue": "Marta Kostyuk +4.5 (-122)",
      "totalValue": "20.5 games: Over -118 / Under -112",
      "firstSetTotalValue": "9.5 1st-set games: Over +106 / Under -148",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Marta Kostyuk +220 / Iga Swiatek -275",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. Model is meaningfully above FanDuel implied price.",
      "noVigNote": "Model 61.1% vs FanDuel implied 31.3% (+29.9 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Marta-Kostyuk-Vs-Iga-Swiatek/",
    "players": [
      {
        "name": "Marta Kostyuk",
        "ranking": {
          "name": "Marta Kostyuk",
          "rank": 15,
          "points": 2387,
          "age": 23,
          "country": "Ukraine",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/3382/marta-kostyuk",
          "asOf": "2026-05-31"
        },
        "qualityName": "Marta Kostyuk",
        "profile": "Live rank #15 | Ukraine | age 23 | 2026 clay 15-0, 100% | adj form 110 | hold 73%",
        "modelPct": 61.1,
        "weakness": {
          "name": "Marta Kostyuk",
          "serviceHoldPct": 73,
          "firstServeWonPct": 67,
          "secondServeWonPct": 53,
          "firstServePct": 56,
          "avgAces": 3.4,
          "avgDoubleFaults": 4.9,
          "avgWinners": 38.3,
          "avgUnforcedErrors": 37.3,
          "avgBreakPointsFaced": 7.8,
          "returnPointsWonPct": 52,
          "servicePointsWonPct": 61,
          "weakServeMatches": 7,
          "pressureMatches": 3,
          "matchesWithStats": 8,
          "weaknessScore": 24,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "double-fault pressure (4.9 avg)",
            "7 recent matches with serve instability"
          ],
          "strengths": [
            "creates return pressure (52% return points won)"
          ],
          "gameFlowRead": "Marta Kostyuk can drop points quickly through double-fault pressure (4.9 avg) and 7 recent matches with serve instability."
        }
      },
      {
        "name": "Iga Swiatek",
        "ranking": {
          "name": "Iga Swiatek",
          "rank": 3,
          "points": 7273,
          "age": 24,
          "country": "Poland",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/3730/iga-swiatek",
          "asOf": "2026-05-31"
        },
        "qualityName": "Iga Swiatek",
        "profile": "Live rank #3 | Poland | age 24 | 2026 clay 9-3, 75% | adj form 97 | hold 77%",
        "modelPct": 38.9,
        "weakness": {
          "name": "Iga Swiatek",
          "serviceHoldPct": 77,
          "firstServeWonPct": 70,
          "secondServeWonPct": 56,
          "firstServePct": 66,
          "avgAces": 1.9,
          "avgDoubleFaults": 2.3,
          "avgWinners": 15.7,
          "avgUnforcedErrors": 23.7,
          "avgBreakPointsFaced": 4.1,
          "returnPointsWonPct": 57,
          "servicePointsWonPct": 64,
          "weakServeMatches": 2,
          "pressureMatches": 2,
          "matchesWithStats": 8,
          "weaknessScore": 6,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "negative winner/error balance (15.7 winners, 23.7 unforced)"
          ],
          "strengths": [
            "protects serve well (77% hold)",
            "second serve holds up (56%)",
            "creates return pressure (57% return points won)"
          ],
          "gameFlowRead": "Iga Swiatek can drop points quickly through negative winner/error balance (15.7 winners, 23.7 unforced)."
        }
      }
    ]
  },
  {
    "id": "rg-w-sorana-cirstea-wang-xiyu-2026-05-31",
    "eventId": "175531",
    "tour": "WTA",
    "title": "Sorana Cirstea vs Wang Xiyu",
    "start": "2:00 AM",
    "startMinutes": 120,
    "court": "Court Suzanne-Lenglen",
    "round": "Round 4",
    "pickName": "Sorana Cirstea",
    "basePickName": "Sorana Cirstea",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 73.4,
    "volatility": 33,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Lean",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Sorana Cirstea has the cleaner composite of rank, clay record, and recent opponent quality. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": -5,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Sorana Cirstea",
        "serviceHoldPct": 80,
        "firstServeWonPct": 75,
        "secondServeWonPct": 53,
        "firstServePct": 60,
        "avgAces": 3,
        "avgDoubleFaults": 1.3,
        "avgWinners": 14,
        "avgUnforcedErrors": 14.5,
        "avgBreakPointsFaced": 3.7,
        "returnPointsWonPct": 50,
        "servicePointsWonPct": 66,
        "weakServeMatches": 2,
        "pressureMatches": 2,
        "matchesWithStats": 7,
        "weaknessScore": 5,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "protects serve well (80% hold)",
          "wins enough first-serve points (75%)",
          "creates return pressure (50% return points won)"
        ],
        "gameFlowRead": "Sorana Cirstea has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Wang Xiyu",
        "serviceHoldPct": null,
        "firstServeWonPct": null,
        "secondServeWonPct": null,
        "firstServePct": null,
        "avgAces": null,
        "avgDoubleFaults": null,
        "avgWinners": null,
        "avgUnforcedErrors": null,
        "avgBreakPointsFaced": null,
        "returnPointsWonPct": null,
        "servicePointsWonPct": null,
        "weakServeMatches": 0,
        "pressureMatches": null,
        "matchesWithStats": 0,
        "weaknessScore": 0,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Wang Xiyu has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Sorana Cirstea",
        "confidence": 80,
        "modelPct": 73.4,
        "label": "Live to win a set"
      },
      {
        "name": "Wang Xiyu",
        "confidence": 40,
        "modelPct": 26.6,
        "label": "Thin set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Sorana Cirstea",
        "americanOdds": -610,
        "modelPct": 73.4,
        "impliedPct": 85.9,
        "edgePct": -12.5,
        "evPer100": -14.6,
        "netEvPer100": -16.6,
        "feePer100": 2,
        "valueIssue": "Favorite tax trap",
        "valueGrade": "Favorite tax trap",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Sorana Cirstea",
        "line": -5.5,
        "americanOdds": -112,
        "modelPct": 67,
        "impliedPct": 52.8,
        "edgePct": 14.2,
        "evPer100": 26.8,
        "netEvPer100": 24.8,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Watch only",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "line": 19.5,
        "overOdds": -116,
        "underOdds": -116,
        "expectedGames": 19.7,
        "valueGrade": "No direction",
        "reason": "FanDuel total is 19.5; model did not clear a full-match over/under edge from hold, return, and set-shape data. hold avg 80%, return games won 56%, first-set sample 8.1g, 17 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Under 9.5",
        "line": 9.5,
        "americanOdds": -166,
        "expectedGames": 7.9,
        "confidence": 72,
        "tiebreakRisk": 18,
        "earlyBreakRisk": 62,
        "modelPct": 72,
        "evPer100": 15.4,
        "netEvPer100": 13.4,
        "valueGrade": "Actionable live watch",
        "reason": "Expected first-set games 7.9 vs FanDuel 9.5; Under 9.5. hold avg 80%, return games won 56%, first-set sample 8.1g, 17 recent sets.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Sorana Cirstea",
          "confidence": 80,
          "modelPct": 73.4,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Wang Xiyu",
          "confidence": 40,
          "modelPct": 26.6,
          "label": "Thin set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": {
      "profiles": [
        {
          "name": "Sorana Cirstea",
          "holdPct": 80,
          "firstServeWonPct": 75,
          "secondServeWonPct": 53,
          "servicePointsWonPct": 66,
          "returnPointsWonPct": 50,
          "returnGamesWonPct": 56.42857142857143,
          "aces": 3,
          "doubleFaults": 1.3,
          "winners": 14,
          "unforcedErrors": 14.5,
          "weaknessScore": 5,
          "weakServeMatches": 2,
          "statMatches": 7,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 17,
            "firstSetSamples": 8,
            "avgFirstSetGames": 8.125,
            "avgSetGames": 8.411764705882353,
            "avgMatchGames": 17.875,
            "avgSetsPlayed": 2.125,
            "tiebreakRate": 0.058823529411764705,
            "extendedSetRate": 0.11764705882352941,
            "shortSetRate": 0.5294117647058824
          }
        },
        {
          "name": "Wang Xiyu",
          "holdPct": null,
          "firstServeWonPct": null,
          "secondServeWonPct": null,
          "servicePointsWonPct": null,
          "returnPointsWonPct": null,
          "returnGamesWonPct": null,
          "aces": null,
          "doubleFaults": null,
          "winners": null,
          "unforcedErrors": null,
          "weaknessScore": 0,
          "weakServeMatches": 0,
          "statMatches": 0,
          "setShape": {
            "completedMatches": 0,
            "setSamples": 0,
            "firstSetSamples": 0,
            "avgFirstSetGames": null,
            "avgSetGames": null,
            "avgMatchGames": null,
            "avgSetsPlayed": null,
            "tiebreakRate": null,
            "extendedSetRate": null,
            "shortSetRate": null
          }
        }
      ],
      "expectedFirstSetGames": 7.9,
      "expectedMatchGames": 19.7,
      "signalStrength": 6,
      "holdAvg": 80,
      "returnGamesAvg": 56.4,
      "returnPointsAvg": 50,
      "setSamples": 17,
      "firstSetSamples": 8,
      "avgFirstSetGames": 8.1,
      "avgSetGames": 8.4,
      "tiebreakRate": 5.9,
      "extendedSetRate": 11.8,
      "shortSetRate": 52.9,
      "reasonCore": "hold avg 80%, return games won 56%, first-set sample 8.1g, 17 recent sets"
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Sorana Cirstea",
        "line": null,
        "americanOdds": -610,
        "modelPct": 73.4,
        "impliedPct": 85.9,
        "edgePct": -12.5,
        "evPer100": -14.6,
        "netEvPer100": -16.6,
        "grade": "Favorite tax trap",
        "issue": "Favorite tax trap",
        "reason": "Likely winner can still be a bad ML bet after payout and fees. Check spread, total, and set-win instead."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Sorana Cirstea",
        "line": -5.5,
        "americanOdds": -112,
        "modelPct": 67,
        "impliedPct": 52.8,
        "edgePct": 14.2,
        "evPer100": 26.8,
        "netEvPer100": 24.8,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 67,
        "grade": "Watch only",
        "reason": "Spread is number-dependent; verify first service cycle"
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": 19.5,
        "americanOdds": null,
        "modelPct": null,
        "impliedPct": null,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": null,
        "grade": "No direction",
        "reason": "Total games need expected match games vs the posted line."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Sorana Cirstea 80% / Wang Xiyu 40%",
        "rows": [
          {
            "name": "Sorana Cirstea",
            "confidence": 80,
            "modelPct": 73.4,
            "label": "Live to win a set"
          },
          {
            "name": "Wang Xiyu",
            "confidence": 40,
            "modelPct": 26.6,
            "label": "Thin set-win path"
          }
        ],
        "confidence": 80,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Under 9.5",
        "expectedGames": 7.9,
        "confidence": 72,
        "tiebreakRisk": 18,
        "earlyBreakRisk": 62,
        "grade": "Actionable live watch",
        "reason": "Expected first-set games 7.9 vs FanDuel 9.5; Under 9.5. hold avg 80%, return games won 56%, first-set sample 8.1g, 17 recent sets."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Wang Xiyu",
      "opponent": "Sorana Cirstea",
      "grade": "Watch only",
      "riskGate": "hold risk, opponent return pressure",
      "marketOdds": 426,
      "fairOdds": 276,
      "modelProbability": 26.6,
      "dataOnlyProbability": 29.5,
      "marketProbability": 19,
      "marketDisagreementPct": 7.6,
      "netEvPer100": 37.9,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Wang Xiyu is priced below the model, not guaranteed to win.",
      "useCase": "Straight ML value only at +426 or better; fair price from the ensemble is about +276.",
      "bullets": [
        "Recent hold: Wang Xiyu N/A vs Sorana Cirstea 80.1%.",
        "Serve events: Wang Xiyu N/A aces / 0 DFs vs Sorana Cirstea 3 aces / 1.3 DFs.",
        "Serve points: Wang Xiyu 1st N/A, 2nd 0% vs Sorana Cirstea 1st 74.6%, 2nd 52.7%.",
        "Winner/error profile: Wang Xiyu 0 winners / 0 UEs vs Sorana Cirstea 14 winners / 14.5 UEs."
      ],
      "risks": [
        "Desk lean still has Sorana Cirstea; this is a price-dislocation play, not the safest winner.",
        "Market still prices Wang Xiyu as a real underdog at 19% implied.",
        "Sorana Cirstea strength: protects serve well (80% hold)."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page Chrome scrape",
      "capturedAt": "2026-05-31T02:10:06.263Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/sorana-cirstea-v-xiyu-wang-35663230",
      "eventId": "35663230",
      "players": [
        {
          "name": "Sorana Cirstea",
          "odds": -610,
          "americanLabel": "-610",
          "impliedPct": 85.9,
          "decimalOdds": 1.164,
          "modelPct": 73.4,
          "edgePct": -12.5,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 16.4,
          "grossPayoutMultiple": 1.164,
          "centsAtRisk": 100,
          "centsProfitIfWin": 16.4
        },
        {
          "name": "Wang Xiyu",
          "odds": 430,
          "americanLabel": "+430",
          "impliedPct": 18.9,
          "decimalOdds": 5.3,
          "modelPct": 26.6,
          "edgePct": 7.7,
          "priceBand": "Underdog",
          "grossProfitPct": 430,
          "grossPayoutMultiple": 5.3,
          "centsAtRisk": 100,
          "centsProfitIfWin": 430
        }
      ],
      "desk": {
        "name": "Sorana Cirstea",
        "odds": -610,
        "americanLabel": "-610",
        "impliedPct": 85.9,
        "decimalOdds": 1.164,
        "modelPct": 73.4,
        "edgePct": -12.5,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 16.4,
        "grossPayoutMultiple": 1.164,
        "centsAtRisk": 100,
        "centsProfitIfWin": 16.4
      },
      "spread": {
        "player": "Sorana Cirstea",
        "spread": -5.5,
        "odds": -112
      },
      "total": {
        "side": "Over",
        "line": 19.5,
        "odds": -116
      },
      "totalOver": {
        "side": "Over",
        "line": 19.5,
        "odds": -116
      },
      "totalUnder": {
        "side": "Under",
        "line": 19.5,
        "odds": -116
      },
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": 118
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": 118
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": -166
      },
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "Sorana Cirstea -5.5 (-112)",
      "totalValue": "19.5 games: Over -116 / Under -116",
      "firstSetTotalValue": "9.5 1st-set games: Over +118 / Under -166",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Sorana Cirstea -610 / Wang Xiyu +430",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 73.4% vs FanDuel implied 85.9% (-12.5 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Sorana-Cirstea-Vs-Xiyu-Wang/",
    "players": [
      {
        "name": "Sorana Cirstea",
        "ranking": {
          "name": "Sorana Cirstea",
          "rank": 18,
          "points": 1985,
          "age": 36,
          "country": "Romania",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/1774/sorana-cirstea",
          "asOf": "2026-05-31"
        },
        "qualityName": "Sorana Cirstea",
        "profile": "Live rank #18 | Romania | age 36 | 2026 clay 13-3, 81% | adj form 91 | hold 80%",
        "modelPct": 73.4,
        "weakness": {
          "name": "Sorana Cirstea",
          "serviceHoldPct": 80,
          "firstServeWonPct": 75,
          "secondServeWonPct": 53,
          "firstServePct": 60,
          "avgAces": 3,
          "avgDoubleFaults": 1.3,
          "avgWinners": 14,
          "avgUnforcedErrors": 14.5,
          "avgBreakPointsFaced": 3.7,
          "returnPointsWonPct": 50,
          "servicePointsWonPct": 66,
          "weakServeMatches": 2,
          "pressureMatches": 2,
          "matchesWithStats": 7,
          "weaknessScore": 5,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "protects serve well (80% hold)",
            "wins enough first-serve points (75%)",
            "creates return pressure (50% return points won)"
          ],
          "gameFlowRead": "Sorana Cirstea has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Wang Xiyu",
        "ranking": {
          "name": "Wang Xiyu",
          "rank": 148,
          "points": 516,
          "age": 25,
          "country": "China",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/3155/wang-xiyu",
          "asOf": "2026-05-31"
        },
        "qualityName": null,
        "profile": "Live rank #148 | China | age 25",
        "modelPct": 26.6,
        "weakness": {
          "name": "Wang Xiyu",
          "serviceHoldPct": null,
          "firstServeWonPct": null,
          "secondServeWonPct": null,
          "firstServePct": null,
          "avgAces": null,
          "avgDoubleFaults": null,
          "avgWinners": null,
          "avgUnforcedErrors": null,
          "avgBreakPointsFaced": null,
          "returnPointsWonPct": null,
          "servicePointsWonPct": null,
          "weakServeMatches": 0,
          "pressureMatches": null,
          "matchesWithStats": 0,
          "weaknessScore": 0,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Wang Xiyu has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-w-elina-svitolina-belinda-bencic-2026-05-31",
    "eventId": "175575",
    "tour": "WTA",
    "title": "Elina Svitolina vs Belinda Bencic",
    "start": "3:30 AM",
    "startMinutes": 210,
    "court": "Court Philippe-Chatrier",
    "round": "Round 4",
    "pickName": "Elina Svitolina",
    "basePickName": "Elina Svitolina",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 71.4,
    "volatility": 52,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Lean",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Recent service hold is close: Elina Svitolina 75%, Belinda Bencic 75%. Elina Svitolina grades 30 points better on opponent-adjusted recent form. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness warning",
      "target": "Elina Svitolina",
      "scoreGap": -9,
      "attackingSide": null,
      "vulnerableSide": "Elina Svitolina",
      "gameFlow": "Elina Svitolina is the model side, but the fragile profile is on our pick: faces too many break points (11.4 avg); 3 recent matches with serve instability. Avoid laying a bad price until early holds are confirmed.",
      "liveTrigger": "Do not upgrade Elina Svitolina unless they hold cleanly in the first service game and keep double faults down.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Elina Svitolina",
        "serviceHoldPct": 75,
        "firstServeWonPct": 66,
        "secondServeWonPct": 48,
        "firstServePct": 63,
        "avgAces": 2.3,
        "avgDoubleFaults": 2.8,
        "avgWinners": 29,
        "avgUnforcedErrors": 29.3,
        "avgBreakPointsFaced": 11.4,
        "returnPointsWonPct": 51,
        "servicePointsWonPct": 59,
        "weakServeMatches": 3,
        "pressureMatches": 4,
        "matchesWithStats": 8,
        "weaknessScore": 14,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "faces too many break points (11.4 avg)",
          "3 recent matches with serve instability"
        ],
        "strengths": [
          "creates return pressure (51% return points won)"
        ],
        "gameFlowRead": "Elina Svitolina can drop points quickly through faces too many break points (11.4 avg) and 3 recent matches with serve instability."
      },
      "opponent": {
        "name": "Belinda Bencic",
        "serviceHoldPct": 75,
        "firstServeWonPct": 70,
        "secondServeWonPct": 51,
        "firstServePct": 62,
        "avgAces": 2.5,
        "avgDoubleFaults": 3.1,
        "avgWinners": 17.3,
        "avgUnforcedErrors": 13.3,
        "avgBreakPointsFaced": 5.6,
        "returnPointsWonPct": 50,
        "servicePointsWonPct": 63,
        "weakServeMatches": 2,
        "pressureMatches": 2,
        "matchesWithStats": 8,
        "weaknessScore": 5,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "wins enough first-serve points (70%)",
          "positive winner/error balance (17.3 winners, 13.3 unforced)",
          "creates return pressure (50% return points won)"
        ],
        "gameFlowRead": "Belinda Bencic has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Elina Svitolina",
        "confidence": 78,
        "modelPct": 71.4,
        "label": "Live to win a set"
      },
      {
        "name": "Belinda Bencic",
        "confidence": 44,
        "modelPct": 28.6,
        "label": "Thin set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Elina Svitolina",
        "americanOdds": -188,
        "modelPct": 71.4,
        "impliedPct": 65.3,
        "edgePct": 6.1,
        "evPer100": 9.4,
        "netEvPer100": 7.4,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Favorite price needs better proof",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Elina Svitolina",
        "line": -2.5,
        "americanOdds": -130,
        "modelPct": 59,
        "impliedPct": 56.5,
        "edgePct": 2.5,
        "evPer100": 4.4,
        "netEvPer100": 2.4,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Near fair",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "line": 21.5,
        "overOdds": -122,
        "underOdds": -110,
        "expectedGames": 21.3,
        "valueGrade": "No direction",
        "reason": "FanDuel total is 21.5; model did not clear a full-match over/under edge from hold, return, and set-shape data. hold avg 75%, return games won 50%, first-set sample 8.6g, 37 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Under 9.5",
        "line": 9.5,
        "americanOdds": -120,
        "expectedGames": 8.1,
        "confidence": 73,
        "tiebreakRisk": 18,
        "earlyBreakRisk": 59,
        "modelPct": 73,
        "evPer100": 33.8,
        "netEvPer100": 31.8,
        "valueGrade": "Actionable live watch",
        "reason": "Expected first-set games 8.1 vs FanDuel 9.5; Under 9.5. hold avg 75%, return games won 50%, first-set sample 8.6g, 37 recent sets.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Elina Svitolina",
          "confidence": 78,
          "modelPct": 71.4,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Belinda Bencic",
          "confidence": 44,
          "modelPct": 28.6,
          "label": "Thin set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": {
      "profiles": [
        {
          "name": "Elina Svitolina",
          "holdPct": 75,
          "firstServeWonPct": 66,
          "secondServeWonPct": 48,
          "servicePointsWonPct": 59,
          "returnPointsWonPct": 51,
          "returnGamesWonPct": 53.25,
          "aces": 2.3,
          "doubleFaults": 2.8,
          "winners": 29,
          "unforcedErrors": 29.3,
          "weaknessScore": 14,
          "weakServeMatches": 3,
          "statMatches": 8,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 20,
            "firstSetSamples": 8,
            "avgFirstSetGames": 8.25,
            "avgSetGames": 8.95,
            "avgMatchGames": 22.375,
            "avgSetsPlayed": 2.5,
            "tiebreakRate": 0.1,
            "extendedSetRate": 0.1,
            "shortSetRate": 0.5
          }
        },
        {
          "name": "Belinda Bencic",
          "holdPct": 75,
          "firstServeWonPct": 70,
          "secondServeWonPct": 51,
          "servicePointsWonPct": 63,
          "returnPointsWonPct": 50,
          "returnGamesWonPct": 46.125,
          "aces": 2.5,
          "doubleFaults": 3.1,
          "winners": 17.3,
          "unforcedErrors": 13.3,
          "weaknessScore": 5,
          "weakServeMatches": 2,
          "statMatches": 8,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 17,
            "firstSetSamples": 8,
            "avgFirstSetGames": 9,
            "avgSetGames": 9.117647058823529,
            "avgMatchGames": 19.375,
            "avgSetsPlayed": 2.125,
            "tiebreakRate": 0.11764705882352941,
            "extendedSetRate": 0.11764705882352941,
            "shortSetRate": 0.35294117647058826
          }
        }
      ],
      "expectedFirstSetGames": 8.1,
      "expectedMatchGames": 21.3,
      "signalStrength": 9,
      "holdAvg": 75,
      "returnGamesAvg": 49.7,
      "returnPointsAvg": 50.5,
      "setSamples": 37,
      "firstSetSamples": 16,
      "avgFirstSetGames": 8.6,
      "avgSetGames": 9,
      "tiebreakRate": 10.9,
      "extendedSetRate": 10.9,
      "shortSetRate": 42.6,
      "reasonCore": "hold avg 75%, return games won 50%, first-set sample 8.6g, 37 recent sets"
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Elina Svitolina",
        "line": null,
        "americanOdds": -188,
        "modelPct": 71.4,
        "impliedPct": 65.3,
        "edgePct": 6.1,
        "evPer100": 9.4,
        "netEvPer100": 7.4,
        "grade": "Favorite price needs better proof",
        "issue": "Favorite price needs better proof",
        "reason": "ML is close to fair; derivative or live entry needs to carry the edge."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Elina Svitolina",
        "line": -2.5,
        "americanOdds": -130,
        "modelPct": 59,
        "impliedPct": 56.5,
        "edgePct": 2.5,
        "evPer100": 4.4,
        "netEvPer100": 2.4,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 59,
        "grade": "Near fair",
        "reason": "Spread is number-dependent; verify first service cycle"
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": 21.5,
        "americanOdds": null,
        "modelPct": null,
        "impliedPct": null,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": null,
        "grade": "No direction",
        "reason": "Total games need expected match games vs the posted line."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Elina Svitolina 78% / Belinda Bencic 44%",
        "rows": [
          {
            "name": "Elina Svitolina",
            "confidence": 78,
            "modelPct": 71.4,
            "label": "Live to win a set"
          },
          {
            "name": "Belinda Bencic",
            "confidence": 44,
            "modelPct": 28.6,
            "label": "Thin set-win path"
          }
        ],
        "confidence": 78,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Under 9.5",
        "expectedGames": 8.1,
        "confidence": 73,
        "tiebreakRisk": 18,
        "earlyBreakRisk": 59,
        "grade": "Actionable live watch",
        "reason": "Expected first-set games 8.1 vs FanDuel 9.5; Under 9.5. hold avg 75%, return games won 50%, first-set sample 8.6g, 37 recent sets."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Elina Svitolina",
      "opponent": "Belinda Bencic",
      "grade": "Playable favorite",
      "riskGate": "opponent return pressure",
      "marketOdds": -163,
      "fairOdds": -250,
      "modelProbability": 71.4,
      "dataOnlyProbability": 74.5,
      "marketProbability": 62,
      "marketDisagreementPct": 9.4,
      "netEvPer100": 13.2,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Elina Svitolina is priced below the model, not guaranteed to win.",
      "useCase": "Favorite price needs cleaner proof or derivative value; do not confuse win probability with bet value.",
      "bullets": [
        "Recent hold: Elina Svitolina 75.4% vs Belinda Bencic 74.9%.",
        "Serve events: Elina Svitolina 2.3 aces / 2.8 DFs vs Belinda Bencic 2.5 aces / 3.1 DFs.",
        "Serve points: Elina Svitolina 1st 65.5%, 2nd 48.1% vs Belinda Bencic 1st 70.1%, 2nd 50.5%.",
        "Winner/error profile: Elina Svitolina 29 winners / 29.3 UEs vs Belinda Bencic 17.3 winners / 13.3 UEs."
      ],
      "risks": [
        "Belinda Bencic strength: wins enough first-serve points (70%).",
        "Elina Svitolina risk: faces too many break points (11.4 avg)."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page Chrome scrape",
      "capturedAt": "2026-05-31T02:10:24.974Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/elina-svitolina-v-belinda-bencic-35665208",
      "eventId": "35665208",
      "players": [
        {
          "name": "Elina Svitolina",
          "odds": -188,
          "americanLabel": "-188",
          "impliedPct": 65.3,
          "decimalOdds": 1.532,
          "modelPct": 71.4,
          "edgePct": 6.1,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 53.2,
          "grossPayoutMultiple": 1.532,
          "centsAtRisk": 100,
          "centsProfitIfWin": 53.2
        },
        {
          "name": "Belinda Bencic",
          "odds": 155,
          "americanLabel": "+155",
          "impliedPct": 39.2,
          "decimalOdds": 2.55,
          "modelPct": 28.6,
          "edgePct": -10.6,
          "priceBand": "Underdog",
          "grossProfitPct": 155,
          "grossPayoutMultiple": 2.55,
          "centsAtRisk": 100,
          "centsProfitIfWin": 155
        }
      ],
      "desk": {
        "name": "Elina Svitolina",
        "odds": -188,
        "americanLabel": "-188",
        "impliedPct": 65.3,
        "decimalOdds": 1.532,
        "modelPct": 71.4,
        "edgePct": 6.1,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 53.2,
        "grossPayoutMultiple": 1.532,
        "centsAtRisk": 100,
        "centsProfitIfWin": 53.2
      },
      "spread": {
        "player": "Elina Svitolina",
        "spread": -2.5,
        "odds": -130
      },
      "total": {
        "side": "Over",
        "line": 21.5,
        "odds": -122
      },
      "totalOver": {
        "side": "Over",
        "line": 21.5,
        "odds": -122
      },
      "totalUnder": {
        "side": "Under",
        "line": 21.5,
        "odds": -110
      },
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": -116
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": -116
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": -120
      },
      "priceAction": "ML is close to fair; derivative or live entry needs to carry the edge.",
      "spreadValue": "Elina Svitolina -2.5 (-130)",
      "totalValue": "21.5 games: Over -122 / Under -110",
      "firstSetTotalValue": "9.5 1st-set games: Over -116 / Under -120",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Elina Svitolina -188 / Belinda Bencic +155",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. ML is close to fair; derivative or live entry needs to carry the edge.",
      "noVigNote": "Model 71.4% vs FanDuel implied 65.3% (+6.1 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Elina-Svitolina-Vs-Belinda-Bencic/",
    "players": [
      {
        "name": "Elina Svitolina",
        "ranking": {
          "name": "Elina Svitolina",
          "rank": 7,
          "points": 4315,
          "age": 31,
          "country": "Ukraine",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/1797/elina-svitolina",
          "asOf": "2026-05-31"
        },
        "qualityName": "Elina Svitolina",
        "profile": "Live rank #7 | Ukraine | age 31 | 2026 clay 12-2, 86% | adj form 109 | hold 75%",
        "modelPct": 71.4,
        "weakness": {
          "name": "Elina Svitolina",
          "serviceHoldPct": 75,
          "firstServeWonPct": 66,
          "secondServeWonPct": 48,
          "firstServePct": 63,
          "avgAces": 2.3,
          "avgDoubleFaults": 2.8,
          "avgWinners": 29,
          "avgUnforcedErrors": 29.3,
          "avgBreakPointsFaced": 11.4,
          "returnPointsWonPct": 51,
          "servicePointsWonPct": 59,
          "weakServeMatches": 3,
          "pressureMatches": 4,
          "matchesWithStats": 8,
          "weaknessScore": 14,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "faces too many break points (11.4 avg)",
            "3 recent matches with serve instability"
          ],
          "strengths": [
            "creates return pressure (51% return points won)"
          ],
          "gameFlowRead": "Elina Svitolina can drop points quickly through faces too many break points (11.4 avg) and 3 recent matches with serve instability."
        }
      },
      {
        "name": "Belinda Bencic",
        "ranking": {
          "name": "Belinda Bencic",
          "rank": 11,
          "points": 3145,
          "age": 29,
          "country": "Switzerland",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/2183/belinda-bencic",
          "asOf": "2026-05-31"
        },
        "qualityName": "Belinda Bencic",
        "profile": "Live rank #11 | Switzerland | age 29 | 2026 clay 8-3, 73% | adj form 79 | hold 75%",
        "modelPct": 28.6,
        "weakness": {
          "name": "Belinda Bencic",
          "serviceHoldPct": 75,
          "firstServeWonPct": 70,
          "secondServeWonPct": 51,
          "firstServePct": 62,
          "avgAces": 2.5,
          "avgDoubleFaults": 3.1,
          "avgWinners": 17.3,
          "avgUnforcedErrors": 13.3,
          "avgBreakPointsFaced": 5.6,
          "returnPointsWonPct": 50,
          "servicePointsWonPct": 63,
          "weakServeMatches": 2,
          "pressureMatches": 2,
          "matchesWithStats": 8,
          "weaknessScore": 5,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "wins enough first-serve points (70%)",
            "positive winner/error balance (17.3 winners, 13.3 unforced)",
            "creates return pressure (50% return points won)"
          ],
          "gameFlowRead": "Belinda Bencic has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-m-rafael-jodar-pablo-carreno-busta-2026-05-31",
    "eventId": "175776",
    "tour": "ATP",
    "title": "Rafael Jodar vs Pablo Carreno Busta",
    "start": "3:30 AM",
    "startMinutes": 210,
    "court": "Court Suzanne-Lenglen",
    "round": "Round 4",
    "pickName": "Rafael Jodar",
    "basePickName": "Rafael Jodar",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 71.4,
    "volatility": 45,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Lean",
      "No blind bet",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Rafael Jodar has the cleaner composite of rank, clay record, and recent opponent quality. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": 0,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Rafael Jodar",
        "serviceHoldPct": null,
        "firstServeWonPct": null,
        "secondServeWonPct": null,
        "firstServePct": null,
        "avgAces": null,
        "avgDoubleFaults": null,
        "avgWinners": null,
        "avgUnforcedErrors": null,
        "avgBreakPointsFaced": null,
        "returnPointsWonPct": null,
        "servicePointsWonPct": null,
        "weakServeMatches": 0,
        "pressureMatches": null,
        "matchesWithStats": 0,
        "weaknessScore": 0,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Rafael Jodar has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Pablo Carreno Busta",
        "serviceHoldPct": null,
        "firstServeWonPct": null,
        "secondServeWonPct": null,
        "firstServePct": null,
        "avgAces": null,
        "avgDoubleFaults": null,
        "avgWinners": null,
        "avgUnforcedErrors": null,
        "avgBreakPointsFaced": null,
        "returnPointsWonPct": null,
        "servicePointsWonPct": null,
        "weakServeMatches": 0,
        "pressureMatches": null,
        "matchesWithStats": 0,
        "weaknessScore": 0,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Pablo Carreno Busta has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Rafael Jodar",
        "confidence": 91,
        "modelPct": 71.4,
        "label": "Strong set-win path"
      },
      {
        "name": "Pablo Carreno Busta",
        "confidence": 60,
        "modelPct": 28.6,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Rafael Jodar",
        "americanOdds": -480,
        "modelPct": 71.4,
        "impliedPct": 82.8,
        "edgePct": -11.4,
        "evPer100": -13.7,
        "netEvPer100": -15.7,
        "feePer100": 2,
        "valueIssue": "Favorite tax trap",
        "valueGrade": "Favorite tax trap",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Rafael Jodar",
        "line": -6.5,
        "americanOdds": -112,
        "modelPct": 61,
        "impliedPct": 52.8,
        "edgePct": 8.2,
        "evPer100": 15.5,
        "netEvPer100": 13.5,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Watch only",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "line": 34.5,
        "overOdds": -120,
        "underOdds": -110,
        "expectedGames": 34.4,
        "valueGrade": "No direction",
        "reason": "FanDuel total is 34.5; model did not clear a full-match over/under edge from hold, return, and set-shape data. hold avg N/A, return games won N/A, first-set sample N/A, 0 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Pass / near line",
        "line": 9.5,
        "americanOdds": null,
        "expectedGames": 9.7,
        "confidence": 50,
        "tiebreakRisk": 18,
        "earlyBreakRisk": 50,
        "modelPct": 50,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Near fair",
        "reason": "Expected first-set games 9.7 vs FanDuel 9.5; near the number. hold avg N/A, return games won N/A, first-set sample N/A, 0 recent sets.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Rafael Jodar",
          "confidence": 91,
          "modelPct": 71.4,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Pablo Carreno Busta",
          "confidence": 60,
          "modelPct": 28.6,
          "label": "Needs early hold pressure",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": {
      "profiles": [
        {
          "name": "Rafael Jodar",
          "holdPct": null,
          "firstServeWonPct": null,
          "secondServeWonPct": null,
          "servicePointsWonPct": null,
          "returnPointsWonPct": null,
          "returnGamesWonPct": null,
          "aces": null,
          "doubleFaults": null,
          "winners": null,
          "unforcedErrors": null,
          "weaknessScore": 0,
          "weakServeMatches": 0,
          "statMatches": 0,
          "setShape": {
            "completedMatches": 0,
            "setSamples": 0,
            "firstSetSamples": 0,
            "avgFirstSetGames": null,
            "avgSetGames": null,
            "avgMatchGames": null,
            "avgSetsPlayed": null,
            "tiebreakRate": null,
            "extendedSetRate": null,
            "shortSetRate": null
          }
        },
        {
          "name": "Pablo Carreno Busta",
          "holdPct": null,
          "firstServeWonPct": null,
          "secondServeWonPct": null,
          "servicePointsWonPct": null,
          "returnPointsWonPct": null,
          "returnGamesWonPct": null,
          "aces": null,
          "doubleFaults": null,
          "winners": null,
          "unforcedErrors": null,
          "weaknessScore": 0,
          "weakServeMatches": 0,
          "statMatches": 0,
          "setShape": {
            "completedMatches": 0,
            "setSamples": 0,
            "firstSetSamples": 0,
            "avgFirstSetGames": null,
            "avgSetGames": null,
            "avgMatchGames": null,
            "avgSetsPlayed": null,
            "tiebreakRate": null,
            "extendedSetRate": null,
            "shortSetRate": null
          }
        }
      ],
      "expectedFirstSetGames": 9.7,
      "expectedMatchGames": 34.4,
      "signalStrength": 1,
      "holdAvg": null,
      "returnGamesAvg": null,
      "returnPointsAvg": null,
      "setSamples": 0,
      "firstSetSamples": 0,
      "avgFirstSetGames": null,
      "avgSetGames": null,
      "tiebreakRate": null,
      "extendedSetRate": null,
      "shortSetRate": null,
      "reasonCore": "hold avg N/A, return games won N/A, first-set sample N/A, 0 recent sets"
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Rafael Jodar",
        "line": null,
        "americanOdds": -480,
        "modelPct": 71.4,
        "impliedPct": 82.8,
        "edgePct": -11.4,
        "evPer100": -13.7,
        "netEvPer100": -15.7,
        "grade": "Favorite tax trap",
        "issue": "Favorite tax trap",
        "reason": "Likely winner can still be a bad ML bet after payout and fees. Check spread, total, and set-win instead."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Rafael Jodar",
        "line": -6.5,
        "americanOdds": -112,
        "modelPct": 61,
        "impliedPct": 52.8,
        "edgePct": 8.2,
        "evPer100": 15.5,
        "netEvPer100": 13.5,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 61,
        "grade": "Watch only",
        "reason": "Large game spread; ML may be cleaner than laying games"
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": 34.5,
        "americanOdds": null,
        "modelPct": null,
        "impliedPct": null,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": null,
        "grade": "No direction",
        "reason": "Total games need expected match games vs the posted line."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Rafael Jodar 91% / Pablo Carreno Busta 60%",
        "rows": [
          {
            "name": "Rafael Jodar",
            "confidence": 91,
            "modelPct": 71.4,
            "label": "Strong set-win path"
          },
          {
            "name": "Pablo Carreno Busta",
            "confidence": 60,
            "modelPct": 28.6,
            "label": "Needs early hold pressure"
          }
        ],
        "confidence": 91,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Pass / near line",
        "expectedGames": 9.7,
        "confidence": 50,
        "tiebreakRisk": 18,
        "earlyBreakRisk": 50,
        "grade": "Near fair",
        "reason": "Expected first-set games 9.7 vs FanDuel 9.5; near the number. hold avg N/A, return games won N/A, first-set sample N/A, 0 recent sets."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Pablo Carreno Busta",
      "opponent": "Rafael Jodar",
      "grade": "Watch only",
      "riskGate": "clean enough",
      "marketOdds": 400,
      "fairOdds": 249,
      "modelProbability": 28.6,
      "dataOnlyProbability": 31.9,
      "marketProbability": 20,
      "marketDisagreementPct": 8.6,
      "netEvPer100": 41.2,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Pablo Carreno Busta is priced below the model, not guaranteed to win.",
      "useCase": "Straight ML value only at +400 or better; fair price from the ensemble is about +249.",
      "bullets": [],
      "risks": [
        "Desk lean still has Rafael Jodar; this is a price-dislocation play, not the safest winner.",
        "Market still prices Pablo Carreno Busta as a real underdog at 20% implied."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page Chrome scrape",
      "capturedAt": "2026-05-31T02:11:02.635Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/rafael-jodar-v-pablo-carreno-busta-35663624",
      "eventId": "35663624",
      "players": [
        {
          "name": "Rafael Jodar",
          "odds": -480,
          "americanLabel": "-480",
          "impliedPct": 82.8,
          "decimalOdds": 1.208,
          "modelPct": 71.4,
          "edgePct": -11.4,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 20.8,
          "grossPayoutMultiple": 1.208,
          "centsAtRisk": 100,
          "centsProfitIfWin": 20.8
        },
        {
          "name": "Pablo Carreno Busta",
          "odds": 360,
          "americanLabel": "+360",
          "impliedPct": 21.7,
          "decimalOdds": 4.6,
          "modelPct": 28.6,
          "edgePct": 6.9,
          "priceBand": "Underdog",
          "grossProfitPct": 360,
          "grossPayoutMultiple": 4.6,
          "centsAtRisk": 100,
          "centsProfitIfWin": 360
        }
      ],
      "desk": {
        "name": "Rafael Jodar",
        "odds": -480,
        "americanLabel": "-480",
        "impliedPct": 82.8,
        "decimalOdds": 1.208,
        "modelPct": 71.4,
        "edgePct": -11.4,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 20.8,
        "grossPayoutMultiple": 1.208,
        "centsAtRisk": 100,
        "centsProfitIfWin": 20.8
      },
      "spread": {
        "player": "Rafael Jodar",
        "spread": -6.5,
        "odds": -112
      },
      "total": {
        "side": "Over",
        "line": 34.5,
        "odds": -120
      },
      "totalOver": {
        "side": "Over",
        "line": 34.5,
        "odds": -120
      },
      "totalUnder": {
        "side": "Under",
        "line": 34.5,
        "odds": -110
      },
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": -116
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": -116
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": -122
      },
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "Rafael Jodar -6.5 (-112)",
      "totalValue": "34.5 games: Over -120 / Under -110",
      "firstSetTotalValue": "9.5 1st-set games: Over -116 / Under -122",
      "spreadLean": "Large game spread; ML may be cleaner than laying games",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Rafael Jodar -480 / Pablo Carreno Busta +360",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 71.4% vs FanDuel implied 82.8% (-11.4 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Rafael-Jodar-Vs-Pablo-Carreno-Busta/",
    "players": [
      {
        "name": "Rafael Jodar",
        "ranking": {
          "name": "Rafael Jodar",
          "rank": 29,
          "points": 1461,
          "age": 19,
          "country": "Spain",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/12657/rafael-jodar",
          "asOf": "2026-05-31"
        },
        "qualityName": null,
        "profile": "Live rank #29 | Spain | age 19",
        "modelPct": 71.4,
        "weakness": {
          "name": "Rafael Jodar",
          "serviceHoldPct": null,
          "firstServeWonPct": null,
          "secondServeWonPct": null,
          "firstServePct": null,
          "avgAces": null,
          "avgDoubleFaults": null,
          "avgWinners": null,
          "avgUnforcedErrors": null,
          "avgBreakPointsFaced": null,
          "returnPointsWonPct": null,
          "servicePointsWonPct": null,
          "weakServeMatches": 0,
          "pressureMatches": null,
          "matchesWithStats": 0,
          "weaknessScore": 0,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Rafael Jodar has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Pablo Carreno Busta",
        "ranking": {
          "name": "Pablo Carreno Busta",
          "rank": 89,
          "points": 685,
          "age": 34,
          "country": "Spain",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/1590/pablo-carreno-busta",
          "asOf": "2026-05-31"
        },
        "qualityName": null,
        "profile": "Live rank #89 | Spain | age 34",
        "modelPct": 28.6,
        "weakness": {
          "name": "Pablo Carreno Busta",
          "serviceHoldPct": null,
          "firstServeWonPct": null,
          "secondServeWonPct": null,
          "firstServePct": null,
          "avgAces": null,
          "avgDoubleFaults": null,
          "avgWinners": null,
          "avgUnforcedErrors": null,
          "avgBreakPointsFaced": null,
          "returnPointsWonPct": null,
          "servicePointsWonPct": null,
          "weakServeMatches": 0,
          "pressureMatches": null,
          "matchesWithStats": 0,
          "weaknessScore": 0,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Pablo Carreno Busta has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-w-mirra-andreeva-jil-teichmann-2026-05-31",
    "eventId": "175584",
    "tour": "WTA",
    "title": "Mirra Andreeva vs Jil Teichmann",
    "start": "5:30 AM",
    "startMinutes": 330,
    "court": "Court Suzanne-Lenglen",
    "round": "Round 4",
    "pickName": "Mirra Andreeva",
    "basePickName": "Mirra Andreeva",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 78.2,
    "volatility": 34,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "High confidence",
      "Price required",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Mirra Andreeva has the recent service-hold edge 79% to 67%. Jil Teichmann grades 11 points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price. High win probability, but the ML still needs enough payout after comparing the book price to the model.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness edge",
      "target": "Jil Teichmann",
      "scoreGap": 17,
      "attackingSide": "Mirra Andreeva",
      "vulnerableSide": "Jil Teichmann",
      "gameFlow": "Mirra Andreeva has a real path if Jil Teichmann's first two service games show the same weakness: first-serve points won below comfort (60%); negative winner/error balance (20.0 winners, 26.3 unforced).",
      "liveTrigger": "Look for Jil Teichmann facing break points or second-serve pressure before 3-3.",
      "spreadRead": "Mirra Andreeva spread only if the handicap is short and Jil Teichmann is under pressure early.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Mirra Andreeva",
        "serviceHoldPct": 79,
        "firstServeWonPct": 67,
        "secondServeWonPct": 52,
        "firstServePct": 64,
        "avgAces": 2.3,
        "avgDoubleFaults": 3.3,
        "avgWinners": 24.3,
        "avgUnforcedErrors": 31,
        "avgBreakPointsFaced": 6.9,
        "returnPointsWonPct": 48,
        "servicePointsWonPct": 62,
        "weakServeMatches": 1,
        "pressureMatches": 3,
        "matchesWithStats": 8,
        "weaknessScore": 5,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "negative winner/error balance (24.3 winners, 31.0 unforced)"
        ],
        "strengths": [
          "protects serve well (79% hold)",
          "creates return pressure (48% return points won)"
        ],
        "gameFlowRead": "Mirra Andreeva can drop points quickly through negative winner/error balance (24.3 winners, 31.0 unforced)."
      },
      "opponent": {
        "name": "Jil Teichmann",
        "serviceHoldPct": 67,
        "firstServeWonPct": 60,
        "secondServeWonPct": 54,
        "firstServePct": 69,
        "avgAces": 0.5,
        "avgDoubleFaults": 3.3,
        "avgWinners": 20,
        "avgUnforcedErrors": 26.3,
        "avgBreakPointsFaced": 7.9,
        "returnPointsWonPct": 46,
        "servicePointsWonPct": 58,
        "weakServeMatches": 6,
        "pressureMatches": 4,
        "matchesWithStats": 8,
        "weaknessScore": 22,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "first-serve points won below comfort (60%)",
          "negative winner/error balance (20.0 winners, 26.3 unforced)",
          "6 recent matches with serve instability"
        ],
        "strengths": [
          "creates return pressure (46% return points won)"
        ],
        "gameFlowRead": "Jil Teichmann can drop points quickly through first-serve points won below comfort (60%) and negative winner/error balance (20.0 winners, 26.3 unforced)."
      }
    },
    "setWinProjections": [
      {
        "name": "Mirra Andreeva",
        "confidence": 82,
        "modelPct": 78.2,
        "label": "Strong set-win path"
      },
      {
        "name": "Jil Teichmann",
        "confidence": 32,
        "modelPct": 21.8,
        "label": "Thin set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Mirra Andreeva",
        "americanOdds": -1100,
        "modelPct": 78.2,
        "impliedPct": 91.7,
        "edgePct": -13.5,
        "evPer100": -14.7,
        "netEvPer100": -16.7,
        "feePer100": 2,
        "valueIssue": "Favorite tax trap",
        "valueGrade": "Favorite tax trap",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Mirra Andreeva",
        "line": -6.5,
        "americanOdds": 104,
        "modelPct": 72,
        "impliedPct": 49,
        "edgePct": 23,
        "evPer100": 46.9,
        "netEvPer100": 44.9,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Watch only",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 18.5,
        "americanOdds": -118,
        "expectedGames": 20.5,
        "modelPct": 65,
        "impliedPct": 54.1,
        "edgePct": 10.9,
        "evPer100": 20.1,
        "netEvPer100": 18.1,
        "feePer100": 2,
        "valueIssue": "Total watch only",
        "valueGrade": "Watch only",
        "reason": "Expected match games 20.5 vs FanDuel 18.5; Over. hold avg 73%, return games won 46%, first-set sample 9.1g, 37 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Under 9.5",
        "line": 9.5,
        "americanOdds": -210,
        "expectedGames": 8.4,
        "confidence": 70,
        "tiebreakRisk": 18,
        "earlyBreakRisk": 61,
        "modelPct": 70,
        "evPer100": 3.3,
        "netEvPer100": 1.3,
        "valueGrade": "Actionable live watch",
        "reason": "Expected first-set games 8.4 vs FanDuel 9.5; Under 9.5. hold avg 73%, return games won 46%, first-set sample 9.1g, 37 recent sets.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Mirra Andreeva",
          "confidence": 82,
          "modelPct": 78.2,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Jil Teichmann",
          "confidence": 32,
          "modelPct": 21.8,
          "label": "Thin set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": {
      "profiles": [
        {
          "name": "Mirra Andreeva",
          "holdPct": 79,
          "firstServeWonPct": 67,
          "secondServeWonPct": 52,
          "servicePointsWonPct": 62,
          "returnPointsWonPct": 48,
          "returnGamesWonPct": 48.625,
          "aces": 2.3,
          "doubleFaults": 3.3,
          "winners": 24.3,
          "unforcedErrors": 31,
          "weaknessScore": 5,
          "weakServeMatches": 1,
          "statMatches": 8,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 19,
            "firstSetSamples": 8,
            "avgFirstSetGames": 8.75,
            "avgSetGames": 8.526315789473685,
            "avgMatchGames": 20.25,
            "avgSetsPlayed": 2.375,
            "tiebreakRate": 0,
            "extendedSetRate": 0.05263157894736842,
            "shortSetRate": 0.42105263157894735
          }
        },
        {
          "name": "Jil Teichmann",
          "holdPct": 67,
          "firstServeWonPct": 60,
          "secondServeWonPct": 54,
          "servicePointsWonPct": 58,
          "returnPointsWonPct": 46,
          "returnGamesWonPct": 42.5,
          "aces": 0.5,
          "doubleFaults": 3.3,
          "winners": 20,
          "unforcedErrors": 26.3,
          "weaknessScore": 22,
          "weakServeMatches": 6,
          "statMatches": 8,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 18,
            "firstSetSamples": 8,
            "avgFirstSetGames": 9.375,
            "avgSetGames": 9.88888888888889,
            "avgMatchGames": 22.25,
            "avgSetsPlayed": 2.25,
            "tiebreakRate": 0.16666666666666666,
            "extendedSetRate": 0.3333333333333333,
            "shortSetRate": 0.2777777777777778
          }
        }
      ],
      "expectedFirstSetGames": 8.4,
      "expectedMatchGames": 20.5,
      "signalStrength": 9,
      "holdAvg": 73,
      "returnGamesAvg": 45.6,
      "returnPointsAvg": 47,
      "setSamples": 37,
      "firstSetSamples": 16,
      "avgFirstSetGames": 9.1,
      "avgSetGames": 9.2,
      "tiebreakRate": 8.3,
      "extendedSetRate": 19.3,
      "shortSetRate": 34.9,
      "reasonCore": "hold avg 73%, return games won 46%, first-set sample 9.1g, 37 recent sets"
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Mirra Andreeva",
        "line": null,
        "americanOdds": -1100,
        "modelPct": 78.2,
        "impliedPct": 91.7,
        "edgePct": -13.5,
        "evPer100": -14.7,
        "netEvPer100": -16.7,
        "grade": "Favorite tax trap",
        "issue": "Favorite tax trap",
        "reason": "Likely winner can still be a bad ML bet after payout and fees. Check spread, total, and set-win instead."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Mirra Andreeva",
        "line": -6.5,
        "americanOdds": 104,
        "modelPct": 72,
        "impliedPct": 49,
        "edgePct": 23,
        "evPer100": 46.9,
        "netEvPer100": 44.9,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 72,
        "grade": "Watch only",
        "reason": "Large game spread; ML may be cleaner than laying games"
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "Over",
        "line": 18.5,
        "americanOdds": -118,
        "modelPct": 65,
        "impliedPct": 54.1,
        "edgePct": 10.9,
        "evPer100": 20.1,
        "netEvPer100": 18.1,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 65,
        "grade": "Watch only",
        "reason": "Total games need expected match games vs the posted line."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Mirra Andreeva 82% / Jil Teichmann 32%",
        "rows": [
          {
            "name": "Mirra Andreeva",
            "confidence": 82,
            "modelPct": 78.2,
            "label": "Strong set-win path"
          },
          {
            "name": "Jil Teichmann",
            "confidence": 32,
            "modelPct": 21.8,
            "label": "Thin set-win path"
          }
        ],
        "confidence": 82,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Under 9.5",
        "expectedGames": 8.4,
        "confidence": 70,
        "tiebreakRisk": 18,
        "earlyBreakRisk": 61,
        "grade": "Actionable live watch",
        "reason": "Expected first-set games 8.4 vs FanDuel 9.5; Under 9.5. hold avg 73%, return games won 46%, first-set sample 9.1g, 37 recent sets."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Jil Teichmann",
      "opponent": "Mirra Andreeva",
      "grade": "Watch only",
      "riskGate": "hold risk, opponent return pressure",
      "marketOdds": 669,
      "fairOdds": 358,
      "modelProbability": 21.8,
      "dataOnlyProbability": 25.1,
      "marketProbability": 13,
      "marketDisagreementPct": 8.8,
      "netEvPer100": 65.8,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Jil Teichmann is priced below the model, not guaranteed to win.",
      "useCase": "Straight ML value only at +669 or better; fair price from the ensemble is about +358.",
      "bullets": [
        "Recent hold: Jil Teichmann 67.1% vs Mirra Andreeva 78.9%.",
        "Serve events: Jil Teichmann 0.5 aces / 3.3 DFs vs Mirra Andreeva 2.3 aces / 3.3 DFs.",
        "Serve points: Jil Teichmann 1st 59.6%, 2nd 53.9% vs Mirra Andreeva 1st 67.1%, 2nd 52%.",
        "Winner/error profile: Jil Teichmann 20 winners / 26.3 UEs vs Mirra Andreeva 24.3 winners / 31 UEs."
      ],
      "risks": [
        "Desk lean still has Mirra Andreeva; this is a price-dislocation play, not the safest winner.",
        "Market still prices Jil Teichmann as a real underdog at 13% implied.",
        "Mirra Andreeva strength: protects serve well (79% hold).",
        "Jil Teichmann risk: first-serve points won below comfort (60%)."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page Chrome scrape",
      "capturedAt": "2026-05-31T02:10:34.381Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/mirra-andreeva-v-jil-teichmann-35663235",
      "eventId": "35663235",
      "players": [
        {
          "name": "Mirra Andreeva",
          "odds": -1100,
          "americanLabel": "-1100",
          "impliedPct": 91.7,
          "decimalOdds": 1.091,
          "modelPct": 78.2,
          "edgePct": -13.5,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 9.1,
          "grossPayoutMultiple": 1.091,
          "centsAtRisk": 100,
          "centsProfitIfWin": 9.1
        },
        {
          "name": "Jil Teichmann",
          "odds": 680,
          "americanLabel": "+680",
          "impliedPct": 12.8,
          "decimalOdds": 7.8,
          "modelPct": 21.8,
          "edgePct": 9,
          "priceBand": "Underdog",
          "grossProfitPct": 680,
          "grossPayoutMultiple": 7.8,
          "centsAtRisk": 100,
          "centsProfitIfWin": 680
        }
      ],
      "desk": {
        "name": "Mirra Andreeva",
        "odds": -1100,
        "americanLabel": "-1100",
        "impliedPct": 91.7,
        "decimalOdds": 1.091,
        "modelPct": 78.2,
        "edgePct": -13.5,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 9.1,
        "grossPayoutMultiple": 1.091,
        "centsAtRisk": 100,
        "centsProfitIfWin": 9.1
      },
      "spread": {
        "player": "Mirra Andreeva",
        "spread": -6.5,
        "odds": 104
      },
      "total": {
        "side": "Over",
        "line": 18.5,
        "odds": -118
      },
      "totalOver": {
        "side": "Over",
        "line": 18.5,
        "odds": -118
      },
      "totalUnder": {
        "side": "Under",
        "line": 18.5,
        "odds": -112
      },
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": 146
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": 146
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": -210
      },
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "Mirra Andreeva -6.5 (+104)",
      "totalValue": "18.5 games: Over -118 / Under -112",
      "firstSetTotalValue": "9.5 1st-set games: Over +146 / Under -210",
      "spreadLean": "Large game spread; ML may be cleaner than laying games",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Mirra Andreeva -1100 / Jil Teichmann +680",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 78.2% vs FanDuel implied 91.7% (-13.5 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Mirra-Andreeva-Vs-Jil-Teichmann/",
    "players": [
      {
        "name": "Mirra Andreeva",
        "ranking": {
          "name": "Mirra Andreeva",
          "rank": 8,
          "points": 4181,
          "age": 19,
          "country": "Russia",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/9820/mirra-andreeva",
          "asOf": "2026-05-31"
        },
        "qualityName": "Mirra Andreeva",
        "profile": "Live rank #8 | Russia | age 19 | 2026 clay 18-3, 86% | adj form 80 | hold 79%",
        "modelPct": 78.2,
        "weakness": {
          "name": "Mirra Andreeva",
          "serviceHoldPct": 79,
          "firstServeWonPct": 67,
          "secondServeWonPct": 52,
          "firstServePct": 64,
          "avgAces": 2.3,
          "avgDoubleFaults": 3.3,
          "avgWinners": 24.3,
          "avgUnforcedErrors": 31,
          "avgBreakPointsFaced": 6.9,
          "returnPointsWonPct": 48,
          "servicePointsWonPct": 62,
          "weakServeMatches": 1,
          "pressureMatches": 3,
          "matchesWithStats": 8,
          "weaknessScore": 5,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "negative winner/error balance (24.3 winners, 31.0 unforced)"
          ],
          "strengths": [
            "protects serve well (79% hold)",
            "creates return pressure (48% return points won)"
          ],
          "gameFlowRead": "Mirra Andreeva can drop points quickly through negative winner/error balance (24.3 winners, 31.0 unforced)."
        }
      },
      {
        "name": "Jil Teichmann",
        "ranking": null,
        "qualityName": "Jil Teichmann",
        "profile": "Rank not joined | 2026 clay 9-5, 64% | adj form 91 | hold 67%",
        "modelPct": 21.8,
        "weakness": {
          "name": "Jil Teichmann",
          "serviceHoldPct": 67,
          "firstServeWonPct": 60,
          "secondServeWonPct": 54,
          "firstServePct": 69,
          "avgAces": 0.5,
          "avgDoubleFaults": 3.3,
          "avgWinners": 20,
          "avgUnforcedErrors": 26.3,
          "avgBreakPointsFaced": 7.9,
          "returnPointsWonPct": 46,
          "servicePointsWonPct": 58,
          "weakServeMatches": 6,
          "pressureMatches": 4,
          "matchesWithStats": 8,
          "weaknessScore": 22,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "first-serve points won below comfort (60%)",
            "negative winner/error balance (20.0 winners, 26.3 unforced)",
            "6 recent matches with serve instability"
          ],
          "strengths": [
            "creates return pressure (46% return points won)"
          ],
          "gameFlowRead": "Jil Teichmann can drop points quickly through first-serve points won below comfort (60%) and negative winner/error balance (20.0 winners, 26.3 unforced)."
        }
      }
    ]
  },
  {
    "id": "rg-m-jesper-de-jong-alexander-zverev-2026-05-31",
    "eventId": "175778",
    "tour": "ATP",
    "title": "Jesper de Jong vs Alexander Zverev",
    "start": "6:30 AM",
    "startMinutes": 390,
    "court": "",
    "round": "Round 4",
    "pickName": "Alexander Zverev",
    "basePickName": "Alexander Zverev",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 71,
    "volatility": 28,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Lean",
      "No blind bet",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Alexander Zverev has the recent service-hold edge 83% to 77%. Jesper de Jong grades 6 points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price. Lean, not a chase.",
    "totals": "Best O/U angle: over if the book hangs a low best-of-five number, because both recent hold profiles can extend sets.",
    "weaknessEdge": {
      "edgeType": "Weakness edge",
      "target": "Jesper de Jong",
      "scoreGap": 11,
      "attackingSide": "Alexander Zverev",
      "vulnerableSide": "Jesper de Jong",
      "gameFlow": "Alexander Zverev has a real path if Jesper de Jong's first two service games show the same weakness: double-fault pressure (4.6 avg); faces too many break points (10.6 avg).",
      "liveTrigger": "Look for Jesper de Jong facing break points or second-serve pressure before 3-3.",
      "spreadRead": "Alexander Zverev spread only if the handicap is short and Jesper de Jong is under pressure early.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Alexander Zverev",
        "serviceHoldPct": 83,
        "firstServeWonPct": 71,
        "secondServeWonPct": 60,
        "firstServePct": 73,
        "avgAces": 5.8,
        "avgDoubleFaults": 2.3,
        "avgWinners": 31,
        "avgUnforcedErrors": 23.8,
        "avgBreakPointsFaced": 4,
        "returnPointsWonPct": 40,
        "servicePointsWonPct": 68,
        "weakServeMatches": 3,
        "pressureMatches": 4,
        "matchesWithStats": 8,
        "weaknessScore": 8,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "3 recent matches with serve instability"
        ],
        "strengths": [
          "protects serve well (83% hold)",
          "wins enough first-serve points (71%)",
          "second serve holds up (60%)",
          "positive winner/error balance (31.0 winners, 23.8 unforced)"
        ],
        "gameFlowRead": "Alexander Zverev can drop points quickly through 3 recent matches with serve instability."
      },
      "opponent": {
        "name": "Jesper de Jong",
        "serviceHoldPct": 77,
        "firstServeWonPct": 70,
        "secondServeWonPct": 51,
        "firstServePct": 63,
        "avgAces": 9.6,
        "avgDoubleFaults": 4.6,
        "avgWinners": 38,
        "avgUnforcedErrors": 32,
        "avgBreakPointsFaced": 10.6,
        "returnPointsWonPct": 38,
        "servicePointsWonPct": 63,
        "weakServeMatches": 2,
        "pressureMatches": 6,
        "matchesWithStats": 5,
        "weaknessScore": 19,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "double-fault pressure (4.6 avg)",
          "faces too many break points (10.6 avg)"
        ],
        "strengths": [
          "protects serve well (77% hold)",
          "positive winner/error balance (38.0 winners, 32.0 unforced)"
        ],
        "gameFlowRead": "Jesper de Jong can drop points quickly through double-fault pressure (4.6 avg) and faces too many break points (10.6 avg)."
      }
    },
    "setWinProjections": [
      {
        "name": "Jesper de Jong",
        "confidence": 56,
        "modelPct": 29,
        "label": "Needs early hold pressure"
      },
      {
        "name": "Alexander Zverev",
        "confidence": 89,
        "modelPct": 71,
        "label": "Strong set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Alexander Zverev",
        "americanOdds": -2100,
        "modelPct": 71,
        "impliedPct": 95.5,
        "edgePct": -24.5,
        "evPer100": -25.6,
        "netEvPer100": -27.6,
        "feePer100": 2,
        "valueIssue": "Favorite tax trap",
        "valueGrade": "Favorite tax trap",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Alexander Zverev",
        "line": -7.5,
        "americanOdds": -142,
        "modelPct": 65,
        "impliedPct": 58.7,
        "edgePct": 6.3,
        "evPer100": 10.8,
        "netEvPer100": 8.8,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Watch only",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 30.5,
        "americanOdds": -120,
        "expectedGames": 32.5,
        "modelPct": 64,
        "impliedPct": 54.5,
        "edgePct": 9.5,
        "evPer100": 17.3,
        "netEvPer100": 15.3,
        "feePer100": 2,
        "valueIssue": "Total watch only",
        "valueGrade": "Watch only",
        "reason": "Expected match games 32.5 vs FanDuel 30.5; Over. hold avg 80%, return games won 28%, first-set sample 9.6g, 45 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Over 9.5",
        "line": 9.5,
        "americanOdds": -108,
        "expectedGames": 10.6,
        "confidence": 69,
        "tiebreakRisk": 21,
        "earlyBreakRisk": 54,
        "modelPct": 69,
        "evPer100": 32.9,
        "netEvPer100": 30.9,
        "valueGrade": "Actionable live watch",
        "reason": "Expected first-set games 10.6 vs FanDuel 9.5; Over 9.5. hold avg 80%, return games won 28%, first-set sample 9.6g, 45 recent sets.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Jesper de Jong",
          "confidence": 56,
          "modelPct": 29,
          "label": "Needs early hold pressure",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Alexander Zverev",
          "confidence": 89,
          "modelPct": 71,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": {
      "profiles": [
        {
          "name": "Jesper De Jong",
          "holdPct": 77,
          "firstServeWonPct": 70,
          "secondServeWonPct": 51,
          "servicePointsWonPct": 63,
          "returnPointsWonPct": 38,
          "returnGamesWonPct": 25.2,
          "aces": 9.6,
          "doubleFaults": 4.6,
          "winners": 38,
          "unforcedErrors": 32,
          "weaknessScore": 19,
          "weakServeMatches": 2,
          "statMatches": 5,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 24,
            "firstSetSamples": 8,
            "avgFirstSetGames": 10.5,
            "avgSetGames": 9.75,
            "avgMatchGames": 29.25,
            "avgSetsPlayed": 3,
            "tiebreakRate": 0.16666666666666666,
            "extendedSetRate": 0.2916666666666667,
            "shortSetRate": 0.25
          }
        },
        {
          "name": "Alexander Zverev",
          "holdPct": 83,
          "firstServeWonPct": 71,
          "secondServeWonPct": 60,
          "servicePointsWonPct": 68,
          "returnPointsWonPct": 40,
          "returnGamesWonPct": 31.5,
          "aces": 5.8,
          "doubleFaults": 2.3,
          "winners": 31,
          "unforcedErrors": 23.8,
          "weaknessScore": 8,
          "weakServeMatches": 3,
          "statMatches": 8,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 21,
            "firstSetSamples": 8,
            "avgFirstSetGames": 8.75,
            "avgSetGames": 9.095238095238095,
            "avgMatchGames": 23.875,
            "avgSetsPlayed": 2.625,
            "tiebreakRate": 0.047619047619047616,
            "extendedSetRate": 0.19047619047619047,
            "shortSetRate": 0.47619047619047616
          }
        }
      ],
      "expectedFirstSetGames": 10.6,
      "expectedMatchGames": 32.5,
      "signalStrength": 8,
      "holdAvg": 80,
      "returnGamesAvg": 28.4,
      "returnPointsAvg": 39,
      "setSamples": 45,
      "firstSetSamples": 16,
      "avgFirstSetGames": 9.6,
      "avgSetGames": 9.4,
      "tiebreakRate": 10.7,
      "extendedSetRate": 24.1,
      "shortSetRate": 36.3,
      "reasonCore": "hold avg 80%, return games won 28%, first-set sample 9.6g, 45 recent sets"
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Alexander Zverev",
        "line": null,
        "americanOdds": -2100,
        "modelPct": 71,
        "impliedPct": 95.5,
        "edgePct": -24.5,
        "evPer100": -25.6,
        "netEvPer100": -27.6,
        "grade": "Favorite tax trap",
        "issue": "Favorite tax trap",
        "reason": "Likely winner can still be a bad ML bet after payout and fees. Check spread, total, and set-win instead."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Alexander Zverev",
        "line": -7.5,
        "americanOdds": -142,
        "modelPct": 65,
        "impliedPct": 58.7,
        "edgePct": 6.3,
        "evPer100": 10.8,
        "netEvPer100": 8.8,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 65,
        "grade": "Watch only",
        "reason": "Large game spread; ML may be cleaner than laying games"
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "Over",
        "line": 30.5,
        "americanOdds": -120,
        "modelPct": 64,
        "impliedPct": 54.5,
        "edgePct": 9.5,
        "evPer100": 17.3,
        "netEvPer100": 15.3,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 64,
        "grade": "Watch only",
        "reason": "Total games need expected match games vs the posted line."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Jesper de Jong 56% / Alexander Zverev 89%",
        "rows": [
          {
            "name": "Jesper de Jong",
            "confidence": 56,
            "modelPct": 29,
            "label": "Needs early hold pressure"
          },
          {
            "name": "Alexander Zverev",
            "confidence": 89,
            "modelPct": 71,
            "label": "Strong set-win path"
          }
        ],
        "confidence": 89,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Over 9.5",
        "expectedGames": 10.6,
        "confidence": 69,
        "tiebreakRisk": 21,
        "earlyBreakRisk": 54,
        "grade": "Actionable live watch",
        "reason": "Expected first-set games 10.6 vs FanDuel 9.5; Over 9.5. hold avg 80%, return games won 28%, first-set sample 9.6g, 45 recent sets."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Jesper de Jong",
      "opponent": "Alexander Zverev",
      "grade": "Watch only",
      "riskGate": "clean enough",
      "marketOdds": 1150,
      "fairOdds": 245,
      "modelProbability": 29,
      "dataOnlyProbability": 33.6,
      "marketProbability": 8,
      "marketDisagreementPct": 21,
      "netEvPer100": 260,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Jesper de Jong is priced below the model, not guaranteed to win.",
      "useCase": "Straight ML value only at +1150 or better; fair price from the ensemble is about +245.",
      "bullets": [
        "Recent hold: Jesper de Jong 77.4% vs Alexander Zverev 83%.",
        "Serve events: Jesper de Jong 9.6 aces / 4.6 DFs vs Alexander Zverev 5.8 aces / 2.3 DFs.",
        "Serve points: Jesper de Jong 1st 69.8%, 2nd 50.8% vs Alexander Zverev 1st 71%, 2nd 59.9%.",
        "Winner/error profile: Jesper de Jong 38 winners / 32 UEs vs Alexander Zverev 31 winners / 23.8 UEs."
      ],
      "risks": [
        "Desk lean still has Alexander Zverev; this is a price-dislocation play, not the safest winner.",
        "Market still prices Jesper de Jong as a real underdog at 8% implied.",
        "Alexander Zverev strength: protects serve well (83% hold).",
        "Jesper de Jong risk: double-fault pressure (4.6 avg)."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page Chrome scrape",
      "capturedAt": "2026-05-31T02:11:12.096Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/jesper-de-jong-v-alexander-zverev-35665416",
      "eventId": "35665416",
      "players": [
        {
          "name": "Jesper de Jong",
          "odds": 1000,
          "americanLabel": "+1000",
          "impliedPct": 9.1,
          "decimalOdds": 11,
          "modelPct": 29,
          "edgePct": 19.9,
          "priceBand": "Underdog",
          "grossProfitPct": 1000,
          "grossPayoutMultiple": 11,
          "centsAtRisk": 100,
          "centsProfitIfWin": 1000
        },
        {
          "name": "Alexander Zverev",
          "odds": -2100,
          "americanLabel": "-2100",
          "impliedPct": 95.5,
          "decimalOdds": 1.048,
          "modelPct": 71,
          "edgePct": -24.5,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 4.8,
          "grossPayoutMultiple": 1.048,
          "centsAtRisk": 100,
          "centsProfitIfWin": 4.8
        }
      ],
      "desk": {
        "name": "Alexander Zverev",
        "odds": -2100,
        "americanLabel": "-2100",
        "impliedPct": 95.5,
        "decimalOdds": 1.048,
        "modelPct": 71,
        "edgePct": -24.5,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 4.8,
        "grossPayoutMultiple": 1.048,
        "centsAtRisk": 100,
        "centsProfitIfWin": 4.8
      },
      "spread": {
        "player": "Alexander Zverev",
        "spread": -7.5,
        "odds": -142
      },
      "total": {
        "side": "Over",
        "line": 30.5,
        "odds": -120
      },
      "totalOver": {
        "side": "Over",
        "line": 30.5,
        "odds": -120
      },
      "totalUnder": {
        "side": "Under",
        "line": 30.5,
        "odds": -110
      },
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": -108
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": -108
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": -130
      },
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "Alexander Zverev -7.5 (-142)",
      "totalValue": "30.5 games: Over -120 / Under -110",
      "firstSetTotalValue": "9.5 1st-set games: Over -108 / Under -130",
      "spreadLean": "Large game spread; ML may be cleaner than laying games",
      "totalLean": "Over lean if both players hold early",
      "mlValue": "Jesper de Jong +1000 / Alexander Zverev -2100",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 71% vs FanDuel implied 95.5% (-24.5 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Jesper-de-Jong-Vs-Alexander-Zverev/",
    "players": [
      {
        "name": "Jesper de Jong",
        "ranking": {
          "name": "Jesper de Jong",
          "rank": 106,
          "points": 580,
          "age": 25,
          "country": "Netherlands",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/3897/jesper-de-jong",
          "asOf": "2026-05-31"
        },
        "qualityName": "Jesper De Jong",
        "profile": "Live rank #106 | Netherlands | age 25 | 2026 clay 14-9, 61% | adj form 87 | hold 77%",
        "modelPct": 29,
        "weakness": {
          "name": "Jesper de Jong",
          "serviceHoldPct": 77,
          "firstServeWonPct": 70,
          "secondServeWonPct": 51,
          "firstServePct": 63,
          "avgAces": 9.6,
          "avgDoubleFaults": 4.6,
          "avgWinners": 38,
          "avgUnforcedErrors": 32,
          "avgBreakPointsFaced": 10.6,
          "returnPointsWonPct": 38,
          "servicePointsWonPct": 63,
          "weakServeMatches": 2,
          "pressureMatches": 6,
          "matchesWithStats": 5,
          "weaknessScore": 19,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "double-fault pressure (4.6 avg)",
            "faces too many break points (10.6 avg)"
          ],
          "strengths": [
            "protects serve well (77% hold)",
            "positive winner/error balance (38.0 winners, 32.0 unforced)"
          ],
          "gameFlowRead": "Jesper de Jong can drop points quickly through double-fault pressure (4.6 avg) and faces too many break points (10.6 avg)."
        }
      },
      {
        "name": "Alexander Zverev",
        "ranking": {
          "name": "Alexander Zverev",
          "rank": 3,
          "points": 5705,
          "age": 29,
          "country": "Germany",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/2375/alexander-zverev",
          "asOf": "2026-05-31"
        },
        "qualityName": "Alexander Zverev",
        "profile": "Live rank #3 | Germany | age 29 | 2026 clay 16-4, 80% | adj form 81 | hold 83%",
        "modelPct": 71,
        "weakness": {
          "name": "Alexander Zverev",
          "serviceHoldPct": 83,
          "firstServeWonPct": 71,
          "secondServeWonPct": 60,
          "firstServePct": 73,
          "avgAces": 5.8,
          "avgDoubleFaults": 2.3,
          "avgWinners": 31,
          "avgUnforcedErrors": 23.8,
          "avgBreakPointsFaced": 4,
          "returnPointsWonPct": 40,
          "servicePointsWonPct": 68,
          "weakServeMatches": 3,
          "pressureMatches": 4,
          "matchesWithStats": 8,
          "weaknessScore": 8,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "3 recent matches with serve instability"
          ],
          "strengths": [
            "protects serve well (83% hold)",
            "wins enough first-serve points (71%)",
            "second serve holds up (60%)",
            "positive winner/error balance (31.0 winners, 23.8 unforced)"
          ],
          "gameFlowRead": "Alexander Zverev can drop points quickly through 3 recent matches with serve instability."
        }
      }
    ]
  },
  {
    "id": "rg-m-jakub-mensik-andrey-rublev-2026-05-31",
    "eventId": "175762",
    "tour": "ATP",
    "title": "Jakub Mensik vs Andrey Rublev",
    "start": "7:00 AM",
    "startMinutes": 420,
    "court": "Court Suzanne-Lenglen",
    "round": "Round 4",
    "pickName": "Andrey Rublev",
    "basePickName": "Andrey Rublev",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 50.6,
    "volatility": 41,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Watch only",
      "No blind bet",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Recent service hold is close: Andrey Rublev 81%, Jakub Mensik 79%. Opponent-adjusted recent form is basically even: Andrey Rublev 78, Jakub Mensik 77. Lean, not a chase.",
    "totals": "Best O/U angle: over if the book hangs a low best-of-five number, because both recent hold profiles can extend sets.",
    "weaknessEdge": {
      "edgeType": "Weakness edge",
      "target": "Jakub Mensik",
      "scoreGap": 14,
      "attackingSide": "Andrey Rublev",
      "vulnerableSide": "Jakub Mensik",
      "gameFlow": "Andrey Rublev has a real path if Jakub Mensik's first two service games show the same weakness: negative winner/error balance (30.0 winners, 36.3 unforced); 4 recent matches with serve instability.",
      "liveTrigger": "Look for Jakub Mensik facing break points or second-serve pressure before 3-3.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Andrey Rublev",
        "serviceHoldPct": 81,
        "firstServeWonPct": 72,
        "secondServeWonPct": 51,
        "firstServePct": 63,
        "avgAces": 5.9,
        "avgDoubleFaults": 1.9,
        "avgWinners": 31.5,
        "avgUnforcedErrors": 29.3,
        "avgBreakPointsFaced": 7.3,
        "returnPointsWonPct": 36,
        "servicePointsWonPct": 65,
        "weakServeMatches": 1,
        "pressureMatches": 4,
        "matchesWithStats": 8,
        "weaknessScore": 5,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "limited return pressure (36% return points won)"
        ],
        "strengths": [
          "protects serve well (81% hold)",
          "wins enough first-serve points (72%)"
        ],
        "gameFlowRead": "Andrey Rublev can drop points quickly through limited return pressure (36% return points won)."
      },
      "opponent": {
        "name": "Jakub Mensik",
        "serviceHoldPct": 79,
        "firstServeWonPct": 75,
        "secondServeWonPct": 49,
        "firstServePct": 57,
        "avgAces": 7.3,
        "avgDoubleFaults": 3.9,
        "avgWinners": 30,
        "avgUnforcedErrors": 36.3,
        "avgBreakPointsFaced": 6.4,
        "returnPointsWonPct": 37,
        "servicePointsWonPct": 64,
        "weakServeMatches": 4,
        "pressureMatches": 7,
        "matchesWithStats": 8,
        "weaknessScore": 19,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "negative winner/error balance (30.0 winners, 36.3 unforced)",
          "4 recent matches with serve instability",
          "limited return pressure (37% return points won)"
        ],
        "strengths": [
          "protects serve well (79% hold)",
          "wins enough first-serve points (75%)"
        ],
        "gameFlowRead": "Jakub Mensik can drop points quickly through negative winner/error balance (30.0 winners, 36.3 unforced) and 4 recent matches with serve instability."
      }
    },
    "setWinProjections": [
      {
        "name": "Jakub Mensik",
        "confidence": 76,
        "modelPct": 49.4,
        "label": "Live to win a set"
      },
      {
        "name": "Andrey Rublev",
        "confidence": 83,
        "modelPct": 50.6,
        "label": "Strong set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Andrey Rublev",
        "americanOdds": -125,
        "modelPct": 50.6,
        "impliedPct": 55.6,
        "edgePct": -5,
        "evPer100": -8.9,
        "netEvPer100": -10.9,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Andrey Rublev",
        "line": -1.5,
        "americanOdds": -110,
        "modelPct": 49,
        "impliedPct": 52.4,
        "edgePct": -3.4,
        "evPer100": -6.5,
        "netEvPer100": -8.5,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "line": 38.5,
        "overOdds": -120,
        "underOdds": -110,
        "expectedGames": 38.3,
        "valueGrade": "No direction",
        "reason": "FanDuel total is 38.5; model did not clear a full-match over/under edge from hold, return, and set-shape data. hold avg 80%, return games won 21%, first-set sample 9.1g, 46 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Over 9.5",
        "line": 9.5,
        "americanOdds": -158,
        "expectedGames": 10.5,
        "confidence": 69,
        "tiebreakRisk": 36,
        "earlyBreakRisk": 54,
        "modelPct": 69,
        "evPer100": 12.7,
        "netEvPer100": 10.7,
        "valueGrade": "Actionable live watch",
        "reason": "Expected first-set games 10.5 vs FanDuel 9.5; Over 9.5. hold avg 80%, return games won 21%, first-set sample 9.1g, 46 recent sets.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Jakub Mensik",
          "confidence": 76,
          "modelPct": 49.4,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Andrey Rublev",
          "confidence": 83,
          "modelPct": 50.6,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": {
      "profiles": [
        {
          "name": "Jakub Mensik",
          "holdPct": 79,
          "firstServeWonPct": 75,
          "secondServeWonPct": 49,
          "servicePointsWonPct": 64,
          "returnPointsWonPct": 37,
          "returnGamesWonPct": 19.5,
          "aces": 7.3,
          "doubleFaults": 3.9,
          "winners": 30,
          "unforcedErrors": 36.3,
          "weaknessScore": 19,
          "weakServeMatches": 4,
          "statMatches": 8,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 24,
            "firstSetSamples": 8,
            "avgFirstSetGames": 9,
            "avgSetGames": 9.291666666666666,
            "avgMatchGames": 27.875,
            "avgSetsPlayed": 3,
            "tiebreakRate": 0.16666666666666666,
            "extendedSetRate": 0.16666666666666666,
            "shortSetRate": 0.375
          }
        },
        {
          "name": "Andrey Rublev",
          "holdPct": 81,
          "firstServeWonPct": 72,
          "secondServeWonPct": 51,
          "servicePointsWonPct": 65,
          "returnPointsWonPct": 36,
          "returnGamesWonPct": 22.125,
          "aces": 5.9,
          "doubleFaults": 1.9,
          "winners": 31.5,
          "unforcedErrors": 29.3,
          "weaknessScore": 5,
          "weakServeMatches": 1,
          "statMatches": 8,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 22,
            "firstSetSamples": 8,
            "avgFirstSetGames": 9.25,
            "avgSetGames": 10.181818181818182,
            "avgMatchGames": 28,
            "avgSetsPlayed": 2.75,
            "tiebreakRate": 0.22727272727272727,
            "extendedSetRate": 0.3181818181818182,
            "shortSetRate": 0.18181818181818182
          }
        }
      ],
      "expectedFirstSetGames": 10.5,
      "expectedMatchGames": 38.3,
      "signalStrength": 9,
      "holdAvg": 80,
      "returnGamesAvg": 20.8,
      "returnPointsAvg": 36.5,
      "setSamples": 46,
      "firstSetSamples": 16,
      "avgFirstSetGames": 9.1,
      "avgSetGames": 9.7,
      "tiebreakRate": 19.7,
      "extendedSetRate": 24.2,
      "shortSetRate": 27.8,
      "reasonCore": "hold avg 80%, return games won 21%, first-set sample 9.1g, 46 recent sets"
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Andrey Rublev",
        "line": null,
        "americanOdds": -125,
        "modelPct": 50.6,
        "impliedPct": 55.6,
        "edgePct": -5,
        "evPer100": -8.9,
        "netEvPer100": -10.9,
        "grade": "Negative EV",
        "issue": "Favorite price needs better proof",
        "reason": "FanDuel price is richer than the model; pass ML unless live state improves."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Andrey Rublev",
        "line": -1.5,
        "americanOdds": -110,
        "modelPct": 49,
        "impliedPct": 52.4,
        "edgePct": -3.4,
        "evPer100": -6.5,
        "netEvPer100": -8.5,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 49,
        "grade": "Negative EV",
        "reason": "Andrey Rublev spread is playable only if early return pressure shows"
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": 38.5,
        "americanOdds": null,
        "modelPct": null,
        "impliedPct": null,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": null,
        "grade": "No direction",
        "reason": "Total games need expected match games vs the posted line."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Jakub Mensik 76% / Andrey Rublev 83%",
        "rows": [
          {
            "name": "Jakub Mensik",
            "confidence": 76,
            "modelPct": 49.4,
            "label": "Live to win a set"
          },
          {
            "name": "Andrey Rublev",
            "confidence": 83,
            "modelPct": 50.6,
            "label": "Strong set-win path"
          }
        ],
        "confidence": 83,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Over 9.5",
        "expectedGames": 10.5,
        "confidence": 69,
        "tiebreakRisk": 36,
        "earlyBreakRisk": 54,
        "grade": "Actionable live watch",
        "reason": "Expected first-set games 10.5 vs FanDuel 9.5; Over 9.5. hold avg 80%, return games won 21%, first-set sample 9.1g, 46 recent sets."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Jakub Mensik",
      "opponent": "Andrey Rublev",
      "grade": "Watch only",
      "riskGate": "clean enough",
      "marketOdds": 108,
      "fairOdds": 102,
      "modelProbability": 49.4,
      "dataOnlyProbability": 50.2,
      "marketProbability": 48,
      "marketDisagreementPct": 1.4,
      "netEvPer100": 0.8,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Jakub Mensik is priced below the model, not guaranteed to win.",
      "useCase": "Needs a posted market price before sizing.",
      "bullets": [
        "Recent hold: Jakub Mensik 79.4% vs Andrey Rublev 80.5%.",
        "Serve events: Jakub Mensik 7.3 aces / 3.9 DFs vs Andrey Rublev 5.9 aces / 1.9 DFs.",
        "Serve points: Jakub Mensik 1st 75.4%, 2nd 48.6% vs Andrey Rublev 1st 72.3%, 2nd 50.8%.",
        "Winner/error profile: Jakub Mensik 30 winners / 36.3 UEs vs Andrey Rublev 31.5 winners / 29.3 UEs."
      ],
      "risks": [
        "Desk lean still has Andrey Rublev; this is a price-dislocation play, not the safest winner.",
        "Andrey Rublev strength: protects serve well (81% hold).",
        "Jakub Mensik risk: negative winner/error balance (30.0 winners, 36.3 unforced)."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page Chrome scrape",
      "capturedAt": "2026-05-31T02:10:53.153Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/jakub-mensik-v-andrey-rublev-35665055",
      "eventId": "35665055",
      "players": [
        {
          "name": "Jakub Mensik",
          "odds": 104,
          "americanLabel": "+104",
          "impliedPct": 49,
          "decimalOdds": 2.04,
          "modelPct": 49.4,
          "edgePct": 0.4,
          "priceBand": "Coinflip",
          "grossProfitPct": 104,
          "grossPayoutMultiple": 2.04,
          "centsAtRisk": 100,
          "centsProfitIfWin": 104
        },
        {
          "name": "Andrey Rublev",
          "odds": -125,
          "americanLabel": "-125",
          "impliedPct": 55.6,
          "decimalOdds": 1.8,
          "modelPct": 50.6,
          "edgePct": -5,
          "priceBand": "Coinflip",
          "grossProfitPct": 80,
          "grossPayoutMultiple": 1.8,
          "centsAtRisk": 100,
          "centsProfitIfWin": 80
        }
      ],
      "desk": {
        "name": "Andrey Rublev",
        "odds": -125,
        "americanLabel": "-125",
        "impliedPct": 55.6,
        "decimalOdds": 1.8,
        "modelPct": 50.6,
        "edgePct": -5,
        "priceBand": "Coinflip",
        "grossProfitPct": 80,
        "grossPayoutMultiple": 1.8,
        "centsAtRisk": 100,
        "centsProfitIfWin": 80
      },
      "spread": {
        "player": "Andrey Rublev",
        "spread": -1.5,
        "odds": -110
      },
      "total": {
        "side": "Over",
        "line": 38.5,
        "odds": -120
      },
      "totalOver": {
        "side": "Over",
        "line": 38.5,
        "odds": -120
      },
      "totalUnder": {
        "side": "Under",
        "line": 38.5,
        "odds": -110
      },
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": -158
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": -158
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": 114
      },
      "priceAction": "FanDuel price is richer than the model; pass ML unless live state improves.",
      "spreadValue": "Andrey Rublev -1.5 (-110)",
      "totalValue": "38.5 games: Over -120 / Under -110",
      "firstSetTotalValue": "9.5 1st-set games: Over -158 / Under +114",
      "spreadLean": "Andrey Rublev spread is playable only if early return pressure shows",
      "totalLean": "Over lean if both players hold early",
      "mlValue": "Jakub Mensik +104 / Andrey Rublev -125",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. FanDuel price is richer than the model; pass ML unless live state improves.",
      "noVigNote": "Model 50.6% vs FanDuel implied 55.6% (-5 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Jakub-Mensik-Vs-Andrey-Rublev/",
    "players": [
      {
        "name": "Jakub Mensik",
        "ranking": {
          "name": "Jakub Mensik",
          "rank": 27,
          "points": 1550,
          "age": 20,
          "country": "Czechia",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/10319/jakub-mensik",
          "asOf": "2026-05-31"
        },
        "qualityName": "Jakub Mensik",
        "profile": "Live rank #27 | Czechia | age 20 | 2026 clay 6-3, 67% | adj form 77 | hold 79%",
        "modelPct": 49.4,
        "weakness": {
          "name": "Jakub Mensik",
          "serviceHoldPct": 79,
          "firstServeWonPct": 75,
          "secondServeWonPct": 49,
          "firstServePct": 57,
          "avgAces": 7.3,
          "avgDoubleFaults": 3.9,
          "avgWinners": 30,
          "avgUnforcedErrors": 36.3,
          "avgBreakPointsFaced": 6.4,
          "returnPointsWonPct": 37,
          "servicePointsWonPct": 64,
          "weakServeMatches": 4,
          "pressureMatches": 7,
          "matchesWithStats": 8,
          "weaknessScore": 19,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "negative winner/error balance (30.0 winners, 36.3 unforced)",
            "4 recent matches with serve instability",
            "limited return pressure (37% return points won)"
          ],
          "strengths": [
            "protects serve well (79% hold)",
            "wins enough first-serve points (75%)"
          ],
          "gameFlowRead": "Jakub Mensik can drop points quickly through negative winner/error balance (30.0 winners, 36.3 unforced) and 4 recent matches with serve instability."
        }
      },
      {
        "name": "Andrey Rublev",
        "ranking": {
          "name": "Andrey Rublev",
          "rank": 13,
          "points": 2460,
          "age": 28,
          "country": "Russia",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/2642/andrey-rublev",
          "asOf": "2026-05-31"
        },
        "qualityName": "Andrey Rublev",
        "profile": "Live rank #13 | Russia | age 28 | 2026 clay 11-4, 73% | adj form 78 | hold 81%",
        "modelPct": 50.6,
        "weakness": {
          "name": "Andrey Rublev",
          "serviceHoldPct": 81,
          "firstServeWonPct": 72,
          "secondServeWonPct": 51,
          "firstServePct": 63,
          "avgAces": 5.9,
          "avgDoubleFaults": 1.9,
          "avgWinners": 31.5,
          "avgUnforcedErrors": 29.3,
          "avgBreakPointsFaced": 7.3,
          "returnPointsWonPct": 36,
          "servicePointsWonPct": 65,
          "weakServeMatches": 1,
          "pressureMatches": 4,
          "matchesWithStats": 8,
          "weaknessScore": 5,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "limited return pressure (36% return points won)"
          ],
          "strengths": [
            "protects serve well (81% hold)",
            "wins enough first-serve points (72%)"
          ],
          "gameFlowRead": "Andrey Rublev can drop points quickly through limited return pressure (36% return points won)."
        }
      }
    ]
  },
  {
    "id": "rg-m-casper-ruud-joao-fonseca-2026-05-31",
    "eventId": "175759",
    "tour": "ATP",
    "title": "Casper Ruud vs Joao Fonseca",
    "start": "11:15 AM",
    "startMinutes": 675,
    "court": "Court Philippe-Chatrier",
    "round": "Round 4",
    "pickName": "Casper Ruud",
    "basePickName": "Casper Ruud",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 70.6,
    "volatility": 41,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Lean",
      "Positive price edge",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Joao Fonseca has the recent service-hold edge 86% to 80%, so Casper Ruud needs the rank/form edge to show up on return games. Casper Ruud grades 5 points better on opponent-adjusted recent form. Lean, not a chase.",
    "totals": "Best O/U angle: over if the book hangs a low best-of-five number, because both recent hold profiles can extend sets.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": -3,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Casper Ruud",
        "serviceHoldPct": 80,
        "firstServeWonPct": 70,
        "secondServeWonPct": 59,
        "firstServePct": 65,
        "avgAces": 5.9,
        "avgDoubleFaults": 3.3,
        "avgWinners": 28.4,
        "avgUnforcedErrors": 27.3,
        "avgBreakPointsFaced": 7.1,
        "returnPointsWonPct": 39,
        "servicePointsWonPct": 66,
        "weakServeMatches": 3,
        "pressureMatches": 4,
        "matchesWithStats": 8,
        "weaknessScore": 10,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "3 recent matches with serve instability"
        ],
        "strengths": [
          "protects serve well (80% hold)",
          "wins enough first-serve points (70%)",
          "second serve holds up (59%)"
        ],
        "gameFlowRead": "Casper Ruud can drop points quickly through 3 recent matches with serve instability."
      },
      "opponent": {
        "name": "Joao Fonseca",
        "serviceHoldPct": 86,
        "firstServeWonPct": 71,
        "secondServeWonPct": 59,
        "firstServePct": 67,
        "avgAces": 4.9,
        "avgDoubleFaults": 1.1,
        "avgWinners": 31,
        "avgUnforcedErrors": 27.1,
        "avgBreakPointsFaced": 7.9,
        "returnPointsWonPct": 36,
        "servicePointsWonPct": 67,
        "weakServeMatches": 0,
        "pressureMatches": 6,
        "matchesWithStats": 8,
        "weaknessScore": 7,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "limited return pressure (36% return points won)"
        ],
        "strengths": [
          "protects serve well (86% hold)",
          "wins enough first-serve points (71%)",
          "second serve holds up (59%)",
          "positive winner/error balance (31.0 winners, 27.1 unforced)"
        ],
        "gameFlowRead": "Joao Fonseca can drop points quickly through limited return pressure (36% return points won)."
      }
    },
    "setWinProjections": [
      {
        "name": "Casper Ruud",
        "confidence": 89,
        "modelPct": 70.6,
        "label": "Strong set-win path"
      },
      {
        "name": "Joao Fonseca",
        "confidence": 59,
        "modelPct": 29.4,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Casper Ruud",
        "americanOdds": -160,
        "modelPct": 70.6,
        "impliedPct": 61.5,
        "edgePct": 9.1,
        "evPer100": 14.7,
        "netEvPer100": 12.7,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Favorite price needs better proof",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Casper Ruud",
        "line": -2.5,
        "americanOdds": -118,
        "modelPct": 65,
        "impliedPct": 54.1,
        "edgePct": 10.9,
        "evPer100": 20.1,
        "netEvPer100": 18.1,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Watch only",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Under",
        "line": 38.5,
        "americanOdds": -112,
        "expectedGames": 34.9,
        "modelPct": 69,
        "impliedPct": 52.8,
        "edgePct": 16.2,
        "evPer100": 30.6,
        "netEvPer100": 28.6,
        "feePer100": 2,
        "valueIssue": "Total watch only",
        "valueGrade": "Watch only",
        "reason": "Expected match games 34.9 vs FanDuel 38.5; Under. hold avg 83%, return games won 25%, first-set sample 10.2g, 47 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Over 9.5",
        "line": 9.5,
        "americanOdds": -138,
        "expectedGames": 11.5,
        "confidence": 73,
        "tiebreakRisk": 31,
        "earlyBreakRisk": 50,
        "modelPct": 73,
        "evPer100": 25.9,
        "netEvPer100": 23.9,
        "valueGrade": "Actionable live watch",
        "reason": "Expected first-set games 11.5 vs FanDuel 9.5; Over 9.5. hold avg 83%, return games won 25%, first-set sample 10.2g, 47 recent sets.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Casper Ruud",
          "confidence": 89,
          "modelPct": 70.6,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Joao Fonseca",
          "confidence": 59,
          "modelPct": 29.4,
          "label": "Needs early hold pressure",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": {
      "profiles": [
        {
          "name": "Casper Ruud",
          "holdPct": 80,
          "firstServeWonPct": 70,
          "secondServeWonPct": 59,
          "servicePointsWonPct": 66,
          "returnPointsWonPct": 39,
          "returnGamesWonPct": 27.25,
          "aces": 5.9,
          "doubleFaults": 3.3,
          "winners": 28.4,
          "unforcedErrors": 27.3,
          "weaknessScore": 10,
          "weakServeMatches": 3,
          "statMatches": 8,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 23,
            "firstSetSamples": 8,
            "avgFirstSetGames": 10.125,
            "avgSetGames": 10.130434782608695,
            "avgMatchGames": 29.125,
            "avgSetsPlayed": 2.875,
            "tiebreakRate": 0.17391304347826086,
            "extendedSetRate": 0.34782608695652173,
            "shortSetRate": 0.2608695652173913
          }
        },
        {
          "name": "Joao Fonseca",
          "holdPct": 86,
          "firstServeWonPct": 71,
          "secondServeWonPct": 59,
          "servicePointsWonPct": 67,
          "returnPointsWonPct": 36,
          "returnGamesWonPct": 23,
          "aces": 4.9,
          "doubleFaults": 1.1,
          "winners": 31,
          "unforcedErrors": 27.1,
          "weaknessScore": 7,
          "weakServeMatches": 0,
          "statMatches": 8,
          "setShape": {
            "completedMatches": 7,
            "setSamples": 24,
            "firstSetSamples": 7,
            "avgFirstSetGames": 10.285714285714286,
            "avgSetGames": 9.666666666666666,
            "avgMatchGames": 33.142857142857146,
            "avgSetsPlayed": 3.4285714285714284,
            "tiebreakRate": 0.125,
            "extendedSetRate": 0.20833333333333334,
            "shortSetRate": 0.20833333333333334
          }
        }
      ],
      "expectedFirstSetGames": 11.5,
      "expectedMatchGames": 34.9,
      "signalStrength": 9,
      "holdAvg": 83,
      "returnGamesAvg": 25.1,
      "returnPointsAvg": 37.5,
      "setSamples": 47,
      "firstSetSamples": 15,
      "avgFirstSetGames": 10.2,
      "avgSetGames": 9.9,
      "tiebreakRate": 14.9,
      "extendedSetRate": 27.8,
      "shortSetRate": 23.5,
      "reasonCore": "hold avg 83%, return games won 25%, first-set sample 10.2g, 47 recent sets"
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Casper Ruud",
        "line": null,
        "americanOdds": -160,
        "modelPct": 70.6,
        "impliedPct": 61.5,
        "edgePct": 9.1,
        "evPer100": 14.7,
        "netEvPer100": 12.7,
        "grade": "Favorite price needs better proof",
        "issue": "Favorite price needs better proof",
        "reason": "Model is meaningfully above FanDuel implied price."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Casper Ruud",
        "line": -2.5,
        "americanOdds": -118,
        "modelPct": 65,
        "impliedPct": 54.1,
        "edgePct": 10.9,
        "evPer100": 20.1,
        "netEvPer100": 18.1,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 65,
        "grade": "Watch only",
        "reason": "Spread is number-dependent; verify first service cycle"
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "Under",
        "line": 38.5,
        "americanOdds": -112,
        "modelPct": 69,
        "impliedPct": 52.8,
        "edgePct": 16.2,
        "evPer100": 30.6,
        "netEvPer100": 28.6,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 69,
        "grade": "Watch only",
        "reason": "Total games need expected match games vs the posted line."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Casper Ruud 89% / Joao Fonseca 59%",
        "rows": [
          {
            "name": "Casper Ruud",
            "confidence": 89,
            "modelPct": 70.6,
            "label": "Strong set-win path"
          },
          {
            "name": "Joao Fonseca",
            "confidence": 59,
            "modelPct": 29.4,
            "label": "Needs early hold pressure"
          }
        ],
        "confidence": 89,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Over 9.5",
        "expectedGames": 11.5,
        "confidence": 73,
        "tiebreakRisk": 31,
        "earlyBreakRisk": 50,
        "grade": "Actionable live watch",
        "reason": "Expected first-set games 11.5 vs FanDuel 9.5; Over 9.5. hold avg 83%, return games won 25%, first-set sample 10.2g, 47 recent sets."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Casper Ruud",
      "opponent": "Joao Fonseca",
      "grade": "Playable favorite",
      "riskGate": "clean enough",
      "marketOdds": -150,
      "fairOdds": -240,
      "modelProbability": 70.6,
      "dataOnlyProbability": 74.1,
      "marketProbability": 60,
      "marketDisagreementPct": 10.6,
      "netEvPer100": 15.7,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Casper Ruud is priced below the model, not guaranteed to win.",
      "useCase": "Favorite price needs cleaner proof or derivative value; do not confuse win probability with bet value.",
      "bullets": [
        "Recent hold: Casper Ruud 80% vs Joao Fonseca 86%.",
        "Serve events: Casper Ruud 5.9 aces / 3.3 DFs vs Joao Fonseca 4.9 aces / 1.1 DFs.",
        "Serve points: Casper Ruud 1st 70.3%, 2nd 59.4% vs Joao Fonseca 1st 70.7%, 2nd 59.3%.",
        "Winner/error profile: Casper Ruud 28.4 winners / 27.3 UEs vs Joao Fonseca 31 winners / 27.1 UEs."
      ],
      "risks": [
        "Joao Fonseca strength: protects serve well (86% hold).",
        "Casper Ruud risk: 3 recent matches with serve instability."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page Chrome scrape",
      "capturedAt": "2026-05-31T02:10:43.712Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/casper-ruud-v-joao-fonseca-35665336",
      "eventId": "35665336",
      "players": [
        {
          "name": "Casper Ruud",
          "odds": -160,
          "americanLabel": "-160",
          "impliedPct": 61.5,
          "decimalOdds": 1.625,
          "modelPct": 70.6,
          "edgePct": 9.1,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 62.5,
          "grossPayoutMultiple": 1.625,
          "centsAtRisk": 100,
          "centsProfitIfWin": 62.5
        },
        {
          "name": "Joao Fonseca",
          "odds": 132,
          "americanLabel": "+132",
          "impliedPct": 43.1,
          "decimalOdds": 2.32,
          "modelPct": 29.4,
          "edgePct": -13.7,
          "priceBand": "Underdog",
          "grossProfitPct": 132,
          "grossPayoutMultiple": 2.32,
          "centsAtRisk": 100,
          "centsProfitIfWin": 132
        }
      ],
      "desk": {
        "name": "Casper Ruud",
        "odds": -160,
        "americanLabel": "-160",
        "impliedPct": 61.5,
        "decimalOdds": 1.625,
        "modelPct": 70.6,
        "edgePct": 9.1,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 62.5,
        "grossPayoutMultiple": 1.625,
        "centsAtRisk": 100,
        "centsProfitIfWin": 62.5
      },
      "spread": {
        "player": "Casper Ruud",
        "spread": -2.5,
        "odds": -118
      },
      "total": {
        "side": "Over",
        "line": 38.5,
        "odds": -118
      },
      "totalOver": {
        "side": "Over",
        "line": 38.5,
        "odds": -118
      },
      "totalUnder": {
        "side": "Under",
        "line": 38.5,
        "odds": -112
      },
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": -138
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": -138
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": 100
      },
      "priceAction": "Model is meaningfully above FanDuel implied price.",
      "spreadValue": "Casper Ruud -2.5 (-118)",
      "totalValue": "38.5 games: Over -118 / Under -112",
      "firstSetTotalValue": "9.5 1st-set games: Over -138 / Under +100",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Over lean if both players hold early",
      "mlValue": "Casper Ruud -160 / Joao Fonseca +132",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. Model is meaningfully above FanDuel implied price.",
      "noVigNote": "Model 70.6% vs FanDuel implied 61.5% (+9.1 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Casper-Ruud-Vs-Joao-Fonseca/",
    "players": [
      {
        "name": "Casper Ruud",
        "ranking": {
          "name": "Casper Ruud",
          "rank": 16,
          "points": 2275,
          "age": 27,
          "country": "Norway",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/2989/casper-ruud",
          "asOf": "2026-05-31"
        },
        "qualityName": "Casper Ruud",
        "profile": "Live rank #16 | Norway | age 27 | 2026 clay 16-4, 80% | adj form 77 | hold 80%",
        "modelPct": 70.6,
        "weakness": {
          "name": "Casper Ruud",
          "serviceHoldPct": 80,
          "firstServeWonPct": 70,
          "secondServeWonPct": 59,
          "firstServePct": 65,
          "avgAces": 5.9,
          "avgDoubleFaults": 3.3,
          "avgWinners": 28.4,
          "avgUnforcedErrors": 27.3,
          "avgBreakPointsFaced": 7.1,
          "returnPointsWonPct": 39,
          "servicePointsWonPct": 66,
          "weakServeMatches": 3,
          "pressureMatches": 4,
          "matchesWithStats": 8,
          "weaknessScore": 10,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "3 recent matches with serve instability"
          ],
          "strengths": [
            "protects serve well (80% hold)",
            "wins enough first-serve points (70%)",
            "second serve holds up (59%)"
          ],
          "gameFlowRead": "Casper Ruud can drop points quickly through 3 recent matches with serve instability."
        }
      },
      {
        "name": "Joao Fonseca",
        "ranking": {
          "name": "Joao Fonseca",
          "rank": 30,
          "points": 1435,
          "age": 19,
          "country": "Brazil",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/11745/joao-fonseca",
          "asOf": "2026-05-31"
        },
        "qualityName": "Joao Fonseca",
        "profile": "Live rank #30 | Brazil | age 19 | 2026 clay 9-6, 60% | adj form 72 | hold 86%",
        "modelPct": 29.4,
        "weakness": {
          "name": "Joao Fonseca",
          "serviceHoldPct": 86,
          "firstServeWonPct": 71,
          "secondServeWonPct": 59,
          "firstServePct": 67,
          "avgAces": 4.9,
          "avgDoubleFaults": 1.1,
          "avgWinners": 31,
          "avgUnforcedErrors": 27.1,
          "avgBreakPointsFaced": 7.9,
          "returnPointsWonPct": 36,
          "servicePointsWonPct": 67,
          "weakServeMatches": 0,
          "pressureMatches": 6,
          "matchesWithStats": 8,
          "weaknessScore": 7,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "limited return pressure (36% return points won)"
          ],
          "strengths": [
            "protects serve well (86% hold)",
            "wins enough first-serve points (71%)",
            "second serve holds up (59%)",
            "positive winner/error balance (31.0 winners, 27.1 unforced)"
          ],
          "gameFlowRead": "Joao Fonseca can drop points quickly through limited return pressure (36% return points won)."
        }
      }
    ]
  }
]

const normalizePlayerName = (value) => {
  const normalized = String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase()
  return ({ 'xinyu wang': 'wang xinyu', 'xiyu wang': 'wang xiyu', 'yibing wu': 'wu yibing' })[normalized] || normalized
}

const participant = (id, index, role, player) => ({
  id: `${id}:${index}`,
  index,
  role,
  name: player.name,
  detail: player.profile || 'Profile pending',
  americanOdds: player.market?.odds ?? null,
  americanLabel: player.market?.americanLabel ?? 'N/A',
  decimalOdds: player.market?.decimalOdds ?? null,
  impliedProbability: player.market?.impliedPct ? player.market.impliedPct / 100 : null,
  impliedProbabilityLabel: player.market?.impliedPct ? `${player.market.impliedPct}%` : 'N/A'
})

const buildGame = (raw) => {
  const market = raw.marketData ?? null
  const players = raw.players.map((player) => ({ ...player, market: market?.players?.find((entry) => entry.name === player.name) ?? null }))
  const participants = [participant(raw.id, 0, 'Player 1', players[0]), participant(raw.id, 1, 'Player 2', players[1])]
  const pickIndex = raw.pickName === raw.players[0].name ? 0 : 1
  const picked = participants[pickIndex]
  const opponent = participants[pickIndex === 0 ? 1 : 0]
  const qualityContext = tennisOpponentQualityContext.matches?.[raw.id] ?? null
  const clayData = tennisClayContext.matches?.[raw.id] ?? null
  const warehouseContext = tennisWarehouseContext.matches?.[raw.id] ?? null
  const marketPlayers = market?.players ?? []
  const deskMarket = market?.desk ?? null
  const marketEconomics = market ? {
    source: market.source,
    capturedAt: market.capturedAt,
    eventUrl: market.eventUrl,
    deskName: raw.pickName,
    deskPricePct: deskMarket?.impliedPct ?? null,
    deskEdgePct: deskMarket?.edgePct ?? null,
    priceAction: market.priceAction,
    players: marketPlayers.map((player) => ({
      name: player.name,
      americanOdds: player.odds,
      impliedPct: player.impliedPct,
      modelPct: player.modelPct,
      edgePct: player.edgePct,
      priceBand: player.priceBand,
      grossProfitPct: player.grossProfitPct,
      grossPayoutMultiple: player.grossPayoutMultiple,
      centsAtRisk: player.centsAtRisk,
      centsProfitIfWin: player.centsProfitIfWin
    }))
  } : null
  const predictionMarket = market ? {
    source: market.source,
    capturedAt: market.capturedAt,
    totalVolume: null,
    players: marketPlayers.map((player) => ({ name: player.name, probabilityPct: player.impliedPct, amount: null, americanOdds: player.odds, edgePct: player.edgePct, priceBand: player.priceBand }))
  } : null
  const oddsMarkets = [
    { label: 'Model fair', book: 'Tennis warehouse model', value: raw.players.map((player) => `${player.name} ${player.modelPct}%`).join(' / ') },
    market ? { label: 'FanDuel moneyline', book: market.source, value: market.mlValue } : null,
    market?.spread ? { label: 'Game handicap', book: market.source, value: market.spreadValue } : null,
    market?.total ? { label: 'Total games', book: market.source, value: market.totalValue } : null,
    market?.firstSetTotal ? { label: '1st set total games', book: market.source, value: market.firstSetTotalValue } : null
  ].filter(Boolean)
  return createSportsMatchModel({
    id: raw.id,
    eventId: raw.eventId,
    league: 'Tennis',
    start: raw.start,
    startMinutes: raw.startMinutes,
    title: raw.title,
    stage: `Roland Garros ${raw.tour === 'ATP' ? 'Men' : 'Women'} | ${raw.round || 'Round 2'}`,
    spotlight: raw.tags.includes('High confidence'),
    confidence: raw.confidence,
    volatility: raw.volatility,
    tags: raw.tags,
    matchup: players.map((player, index) => ({ side: index === 0 ? 'Player 1' : 'Player 2', name: player.name, displayName: player.name, detail: player.profile || 'Profile pending' })),
    summary: `Our model pick: ${raw.pickName}. ${raw.reason}`,
    factors: [
      raw.reason,
      market?.noVigNote,
      raw.weaknessEdge?.gameFlow,
      raw.weaknessEdge?.liveTrigger,
      raw.totals,
      raw.modelSplit ? `Model split warning: the older score model preferred ${raw.basePickName}, but the multimodel ensemble makes ${raw.pickName} the official pick. Treat ML as pass-first unless the price and live state agree.` : null,
      'May 27 lesson applied: favorites need proof from recent hold, opponent strength, payout, and a visible weakness path.',
      market ? market.marketNote : 'No FanDuel line is stored for this match yet, so market edge is model-vs-fair only until a price is captured.'
    ].filter(Boolean),
    lean: market?.priceAction ? `Lean ${raw.pickName}; ${market.priceAction}` : `Lean ${raw.pickName}; pass if the market price removes payout.`,
    swing: `Risk: ${raw.tour === 'WTA' ? 'best-of-three volatility and break clusters' : 'best-of-five set extension and tiebreak variance'}.`,
    swingFactor: `Risk: ${raw.tour === 'WTA' ? 'best-of-three volatility and break clusters' : 'best-of-five set extension and tiebreak variance'}.`,
    odds: {
      participantOrder: [0, 1],
      markets: oddsMarkets,
      note: market?.marketNote || 'Market price not captured yet. Use this as fair-value context, not a bet ticket.',
      provider: market?.source || 'Tennis warehouse model'
    },
    tennisContext: {
      surface: 'Clay',
      court: raw.court,
      h2hLeader: '',
      fatigueFlag: false,
      liveDog: false,
      weaknessEdge: raw.weaknessEdge,
      warehouseContext,
      sofascoreData: warehouseContext,
      players: players.map((player) => ({
        name: player.name,
        rank: player.ranking?.rank ?? null,
        label: player.name,
        form: null,
        boardPct: player.modelPct,
        decimalOdds: player.market?.decimalOdds ?? null,
        marketLabel: player.market ? `${player.market.americanLabel} / ${player.market.impliedPct}% implied` : `Model fair ${player.modelPct}%`,
        clayLine: player.profile || 'Profile pending',
        weakness: player.weakness,
        warehouseStats: warehouseContext?.players?.find((entry) => normalizePlayerName(entry.name) === normalizePlayerName(player.name)) ?? null,
        record2026: '',
        notes: player.name === raw.pickName ? `Pick: model ${raw.confidence}%` : `Opponent case: model ${100 - raw.confidence}%`,
        matchupNote: player.name === raw.pickName ? `Why pick: ${raw.reason}` : 'Upset path: needs early scoreboard pressure or a market price that pays for volatility.'
      })),
      comparisonRows: [
        { label: 'Model pick', metric: 'Fair win split', leftScore: raw.players[0].modelPct, rightScore: raw.players[1].modelPct, leftLabel: raw.players[0].name, rightLabel: raw.players[1].name, winner: raw.pickName },
        market ? { label: 'FanDuel moneyline', metric: 'Implied price', leftScore: marketPlayers.find((player) => player.name === raw.players[0].name)?.impliedPct ?? 0, rightScore: marketPlayers.find((player) => player.name === raw.players[1].name)?.impliedPct ?? 0, leftLabel: raw.players[0].name, rightLabel: raw.players[1].name, winner: market.priceAction } : null,
        { label: 'Weakness', metric: 'Lower is cleaner', leftScore: raw.players[0].weakness?.weaknessScore ?? 0, rightScore: raw.players[1].weakness?.weaknessScore ?? 0, leftLabel: raw.players[0].name, rightLabel: raw.players[1].name, winner: raw.weaknessEdge?.edgeType || 'No clear weakness edge' },
        { label: 'Volatility', metric: 'Lower is cleaner', leftScore: raw.volatility, rightScore: 100 - raw.volatility, leftLabel: 'Risk', rightLabel: 'Stability', winner: raw.volatility <= 55 ? 'Stable enough' : 'Pass-first' }
      ].filter(Boolean),
      predictionMarket,
      bettingMatrix: raw.bettingMatrix,
      derivativeMarketCase: raw.derivativeCase,
      valueBoard: raw.valueBoard,
      ensembleValueCase: raw.ensembleValueCase,
      projection: { projectedWinner: raw.pickName, projectedSetLine: raw.tour === 'ATP' ? '3-1/3-2 range' : '2-0/2-1 range', setWinProjections: raw.setWinProjections, totalGames: market?.total?.line ?? null, straightSetsProbability: raw.tour === 'ATP' ? null : Math.max(48, Math.min(68, raw.confidence - 8)), upsetRisk: 100 - raw.confidence, overview: raw.weaknessEdge?.gameFlow || raw.reason, fantasy: [] },
      tradePlan: { laneLabel: raw.tags.includes('High confidence') ? 'High confidence, price required' : market?.priceAction || 'Pass-first', summary: raw.weaknessEdge?.gameFlow || raw.totals, trigger: raw.weaknessEdge?.liveTrigger, headline: raw.weaknessEdge?.edgeType, exit: market?.spreadLean || raw.weaknessEdge?.spreadRead, tone: raw.tags.includes('High confidence') ? 'accent' : 'warning' },
      derivativeMarkets: [
        { label: 'ML', value: market ? `${raw.pickName} ${deskMarket?.americanLabel || ''}; ${market.noVigNote}` : 'Need market price', lean: market?.priceAction || raw.weaknessEdge?.edgeType || 'Fair only', confidence: raw.confidence, ...(raw.valueBoard?.ml || {}), tone: market?.desk?.edgePct >= 7 ? 'accent' : market?.desk?.edgePct <= -4 ? 'warning' : 'neutral', reason: market?.marketNote || raw.weaknessEdge?.gameFlow || raw.reason },
        { label: 'Win a set', value: raw.setWinProjections?.map((entry) => entry.name + ' ' + entry.confidence + '%').join(' / ') || 'No set projection', lean: raw.setWinProjections?.find((entry) => entry.name !== raw.pickName)?.label || 'Set-win path', confidence: Math.max(...(raw.setWinProjections || []).map((entry) => Number(entry.confidence) || 0), 0), setWinRows: raw.valueBoard?.setWin || [], valueGrade: 'Needs posted price', tone: raw.tour === 'ATP' ? 'accent' : 'neutral', reason: raw.tour === 'ATP' ? 'Best-of-five gives the non-ML side more room to win a set; use this to separate upset risk from match-winner confidence.' : 'Best-of-three set-win confidence is more fragile; early service holds matter more.' },
        { label: 'Spread', value: market?.spreadValue || 'Need posted game spread', lean: market?.spreadLean || raw.weaknessEdge?.spreadRead || 'Need number', confidence: Math.max(50, raw.confidence - 6), ...(raw.valueBoard?.spread || {}), tone: raw.weaknessEdge?.edgeType === 'Weakness edge' ? 'accent' : 'neutral', reason: raw.weaknessEdge?.liveTrigger || 'Wait for first service cycle.' },
        { label: 'O/U', value: market?.totalValue || 'Need posted total', lean: raw.valueBoard?.total?.selection || market?.totalLean || raw.weaknessEdge?.totalRead || raw.totals, confidence: raw.valueBoard?.total?.modelPct ?? Math.max(50, raw.confidence - 8), ...(raw.valueBoard?.total || {}), tone: raw.valueBoard?.total?.selection === 'Over' || raw.valueBoard?.total?.selection === 'Under' ? 'accent' : 'neutral', reason: raw.valueBoard?.total?.reason || raw.totals },
        { label: '1st set O/U', value: raw.valueBoard?.firstSetTotal?.line ? `Line ${raw.valueBoard.firstSetTotal.line}` : 'Need posted first-set total', lean: raw.valueBoard?.firstSetTotal?.selection || raw.valueBoard?.firstSetTotal?.lean || 'Price required', confidence: raw.valueBoard?.firstSetTotal?.confidence ?? Math.max(50, raw.confidence - 10), ...(raw.valueBoard?.firstSetTotal || {}), tone: raw.valueBoard?.firstSetTotal?.confidence >= 58 ? 'accent' : 'neutral', reason: raw.valueBoard?.firstSetTotal?.reason || 'Use expected first-set games against the posted 1st-set total.' }
      ],
      marketEconomics,
      clayMatchupData: clayData,
      opponentQualityData: qualityContext,
      researchLinks: [{ label: 'ESPN scoreboard', url: 'https://www.espn.com/tennis/scoreboard/_/date/20260531' }, { label: 'Tennistonic H2H', url: raw.h2hUrl }, ...(market?.eventUrl ? [{ label: 'FanDuel event', url: market.eventUrl }] : [])],
      formEdgeName: raw.pickName
    },
    participants,
    moneyline: market ? { available: true, label: 'FanDuel moneyline', provider: market.source, participants } : { available: false, label: 'Moneyline', provider: 'Tennis warehouse model', participants: [] },
    analysis: { available: true, participantId: picked.id, participant: picked, opponent, lean: `Lean ${raw.pickName}`, rationale: raw.reason, confidence: raw.confidence, volatility: raw.volatility, recommendationScore: raw.confidence - Math.round(raw.volatility / 3) + Math.round(Math.max(-8, Math.min(8, deskMarket?.edgePct ?? 0))), tier: raw.modelSplit ? 'Model split / pass ML' : raw.tags.includes('High confidence')  ? 'High confidence' : raw.tags.includes('Lean') ? 'Lean' : 'Watch', sourceLabel: raw.modelSource || 'Tennis warehouse model', modelEdge: deskMarket?.edgePct ?? 0, modelEdgeLabel: deskMarket ? `${deskMarket.edgePct > 0 ? '+' : ''}${deskMarket.edgePct} pts vs FanDuel implied` : 'Fair value only until market price is captured', marketProbability: deskMarket?.impliedPct ? deskMarket.impliedPct / 100 : null, marketProbabilityLabel: deskMarket?.impliedPct ? `${deskMarket.impliedPct}% FanDuel implied` : 'No market', inputs: [], inputsUsed: market ? 4 : 3, volatilityNotes: [] }
  }, { structuredAnalysis: true })
}

const matches = rawTennisGames.map(buildGame)

export const tennisModelCartridge = {
  "id": "T0",
  "sport": "tennis",
  "label": "T0 tennis baseline",
  "status": "baseline",
  "entrypoint": "models/tennis/cartridges/T0/runner.mjs",
  "manifestPath": "models/tennis/cartridges/T0/manifest.json"
}
export const slateMeta = { title: 'May 31, 2026 Tennis Desk', date: 'May 31, 2026', isoDate: '2026-05-31', timeZone: 'America/Los_Angeles', modelCartridge: tennisModelCartridge, subtitle: 'Singles-only Roland Garros main-draw slate with weakness-edge, game-flow gates, and sportsbook/market lines where captured.', notes: ['No doubles included.', 'FanDuel ML, game handicap, and total-games lines are attached where the sportsbook board exposes a matching singles event.', 'May 31, 2026 uses live rank, clay record, opponent-adjusted recent form, and warehouse service rows where joined.'] }
export const filters = ['All', 'Tennis']
export const oddsMeta = { provider: 'FanDuel Sportsbook + Tennis warehouse model', snapshot: 'May 31, 2026 Roland Garros desk', note: 'FanDuel lines are stored for priced matches; very expensive favorites are marked as low-payout or pass-first instead of automatic bets.' }
export const sources = [{ label: 'ESPN tennis scoreboard', url: 'https://www.espn.com/tennis/scoreboard/_/date/20260531' }, { label: 'Live Tennis rankings warehouse', url: 'https://live-tennis.eu/' }, { label: 'FanDuel sportsbook tennis', url: 'https://sportsbook.fanduel.com/tennis' }]
export const games = matches.sort((left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title))
