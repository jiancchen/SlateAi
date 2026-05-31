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
    "pickName": "Iga Swiatek",
    "confidence": 54,
    "volatility": 55,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Watch only",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Iga Swiatek has the recent service-hold edge 77% to 73%. Marta Kostyuk grades 13 points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness edge",
      "target": "Marta Kostyuk",
      "scoreGap": 18,
      "attackingSide": "Iga Swiatek",
      "vulnerableSide": "Marta Kostyuk",
      "gameFlow": "Iga Swiatek has a real path if Marta Kostyuk's first two service games show the same weakness: double-fault pressure (4.9 avg); 7 recent matches with serve instability.",
      "liveTrigger": "Look for Marta Kostyuk facing break points or second-serve pressure before 3-3.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "Avoid low unders if Marta Kostyuk faces early break points or second-serve pressure.",
      "pick": {
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
      },
      "opponent": {
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
    "setWinProjections": [
      {
        "name": "Marta Kostyuk",
        "confidence": 60,
        "modelPct": 46,
        "label": "Needs early hold pressure"
      },
      {
        "name": "Iga Swiatek",
        "confidence": 71,
        "modelPct": 54,
        "label": "Live to win a set"
      }
    ],
    "valueBoard": {
      "note": "No sportsbook price captured; value math is unavailable.",
      "ml": null,
      "spread": null,
      "total": null,
      "setWin": [
        {
          "name": "Marta Kostyuk",
          "confidence": 60,
          "modelPct": 46,
          "label": "Needs early hold pressure"
        },
        {
          "name": "Iga Swiatek",
          "confidence": 71,
          "modelPct": 54,
          "label": "Live to win a set"
        }
      ]
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Marta Kostyuk 60% / Iga Swiatek 71%",
        "rows": [
          {
            "name": "Marta Kostyuk",
            "confidence": 60,
            "modelPct": 46,
            "label": "Needs early hold pressure"
          },
          {
            "name": "Iga Swiatek",
            "confidence": 71,
            "modelPct": 54,
            "label": "Live to win a set"
          }
        ],
        "confidence": 71,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
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
        "Desk lean still has Iga Swiatek; this is a price-dislocation play, not the safest winner.",
        "Market still prices Marta Kostyuk as a real underdog at 30% implied.",
        "Iga Swiatek strength: protects serve well (77% hold).",
        "Marta Kostyuk risk: double-fault pressure (4.9 avg)."
      ]
    },
    "marketData": null,
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
        "modelPct": 46,
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
        "modelPct": 54,
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
    "confidence": 71,
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
        "confidence": 79,
        "modelPct": 71,
        "label": "Live to win a set"
      },
      {
        "name": "Wang Xiyu",
        "confidence": 42,
        "modelPct": 29,
        "label": "Thin set-win path"
      }
    ],
    "valueBoard": {
      "note": "No sportsbook price captured; value math is unavailable.",
      "ml": null,
      "spread": null,
      "total": null,
      "setWin": [
        {
          "name": "Sorana Cirstea",
          "confidence": 79,
          "modelPct": 71,
          "label": "Live to win a set"
        },
        {
          "name": "Wang Xiyu",
          "confidence": 42,
          "modelPct": 29,
          "label": "Thin set-win path"
        }
      ]
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Sorana Cirstea 79% / Wang Xiyu 42%",
        "rows": [
          {
            "name": "Sorana Cirstea",
            "confidence": 79,
            "modelPct": 71,
            "label": "Live to win a set"
          },
          {
            "name": "Wang Xiyu",
            "confidence": 42,
            "modelPct": 29,
            "label": "Thin set-win path"
          }
        ],
        "confidence": 79,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
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
    "marketData": null,
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
        "modelPct": 71,
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
        "modelPct": 29,
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
    "confidence": 56,
    "volatility": 52,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Watch only",
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
        "confidence": 71,
        "modelPct": 56,
        "label": "Live to win a set"
      },
      {
        "name": "Belinda Bencic",
        "confidence": 60,
        "modelPct": 44,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "No sportsbook price captured; value math is unavailable.",
      "ml": null,
      "spread": null,
      "total": null,
      "setWin": [
        {
          "name": "Elina Svitolina",
          "confidence": 71,
          "modelPct": 56,
          "label": "Live to win a set"
        },
        {
          "name": "Belinda Bencic",
          "confidence": 60,
          "modelPct": 44,
          "label": "Needs early hold pressure"
        }
      ]
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Elina Svitolina 71% / Belinda Bencic 60%",
        "rows": [
          {
            "name": "Elina Svitolina",
            "confidence": 71,
            "modelPct": 56,
            "label": "Live to win a set"
          },
          {
            "name": "Belinda Bencic",
            "confidence": 60,
            "modelPct": 44,
            "label": "Needs early hold pressure"
          }
        ],
        "confidence": 71,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
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
    "marketData": null,
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
        "modelPct": 56,
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
        "modelPct": 44,
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
    "confidence": 56,
    "volatility": 45,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Watch only",
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
        "confidence": 86,
        "modelPct": 56,
        "label": "Strong set-win path"
      },
      {
        "name": "Pablo Carreno Busta",
        "confidence": 73,
        "modelPct": 44,
        "label": "Live to win a set"
      }
    ],
    "valueBoard": {
      "note": "No sportsbook price captured; value math is unavailable.",
      "ml": null,
      "spread": null,
      "total": null,
      "setWin": [
        {
          "name": "Rafael Jodar",
          "confidence": 86,
          "modelPct": 56,
          "label": "Strong set-win path"
        },
        {
          "name": "Pablo Carreno Busta",
          "confidence": 73,
          "modelPct": 44,
          "label": "Live to win a set"
        }
      ]
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Rafael Jodar 86% / Pablo Carreno Busta 73%",
        "rows": [
          {
            "name": "Rafael Jodar",
            "confidence": 86,
            "modelPct": 56,
            "label": "Strong set-win path"
          },
          {
            "name": "Pablo Carreno Busta",
            "confidence": 73,
            "modelPct": 44,
            "label": "Live to win a set"
          }
        ],
        "confidence": 86,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
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
    "marketData": null,
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
        "modelPct": 56,
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
        "modelPct": 44,
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
    "confidence": 70,
    "volatility": 34,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Lean",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Mirra Andreeva has the recent service-hold edge 79% to 67%. Jil Teichmann grades 11 points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price. Lean, not a chase.",
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
        "confidence": 78,
        "modelPct": 70,
        "label": "Live to win a set"
      },
      {
        "name": "Jil Teichmann",
        "confidence": 41,
        "modelPct": 30,
        "label": "Thin set-win path"
      }
    ],
    "valueBoard": {
      "note": "No sportsbook price captured; value math is unavailable.",
      "ml": null,
      "spread": null,
      "total": null,
      "setWin": [
        {
          "name": "Mirra Andreeva",
          "confidence": 78,
          "modelPct": 70,
          "label": "Live to win a set"
        },
        {
          "name": "Jil Teichmann",
          "confidence": 41,
          "modelPct": 30,
          "label": "Thin set-win path"
        }
      ]
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Mirra Andreeva 78% / Jil Teichmann 41%",
        "rows": [
          {
            "name": "Mirra Andreeva",
            "confidence": 78,
            "modelPct": 70,
            "label": "Live to win a set"
          },
          {
            "name": "Jil Teichmann",
            "confidence": 41,
            "modelPct": 30,
            "label": "Thin set-win path"
          }
        ],
        "confidence": 78,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
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
    "marketData": null,
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
        "modelPct": 70,
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
        "modelPct": 30,
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
    "confidence": 79,
    "volatility": 28,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "High confidence",
      "Price required",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Alexander Zverev has the recent service-hold edge 83% to 77%. Jesper de Jong grades 6 points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price. High win probability, but the ML still needs enough payout after comparing the book price to the model.",
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
        "confidence": 49,
        "modelPct": 21,
        "label": "Thin set-win path"
      },
      {
        "name": "Alexander Zverev",
        "confidence": 92,
        "modelPct": 79,
        "label": "Strong set-win path"
      }
    ],
    "valueBoard": {
      "note": "No sportsbook price captured; value math is unavailable.",
      "ml": null,
      "spread": null,
      "total": null,
      "setWin": [
        {
          "name": "Jesper de Jong",
          "confidence": 49,
          "modelPct": 21,
          "label": "Thin set-win path"
        },
        {
          "name": "Alexander Zverev",
          "confidence": 92,
          "modelPct": 79,
          "label": "Strong set-win path"
        }
      ]
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Jesper de Jong 49% / Alexander Zverev 92%",
        "rows": [
          {
            "name": "Jesper de Jong",
            "confidence": 49,
            "modelPct": 21,
            "label": "Thin set-win path"
          },
          {
            "name": "Alexander Zverev",
            "confidence": 92,
            "modelPct": 79,
            "label": "Strong set-win path"
          }
        ],
        "confidence": 92,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
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
    "marketData": null,
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
        "modelPct": 21,
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
        "modelPct": 79,
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
    "confidence": 59,
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
        "confidence": 68,
        "modelPct": 41,
        "label": "Live to win a set"
      },
      {
        "name": "Andrey Rublev",
        "confidence": 86,
        "modelPct": 59,
        "label": "Strong set-win path"
      }
    ],
    "valueBoard": {
      "note": "No sportsbook price captured; value math is unavailable.",
      "ml": null,
      "spread": null,
      "total": null,
      "setWin": [
        {
          "name": "Jakub Mensik",
          "confidence": 68,
          "modelPct": 41,
          "label": "Live to win a set"
        },
        {
          "name": "Andrey Rublev",
          "confidence": 86,
          "modelPct": 59,
          "label": "Strong set-win path"
        }
      ]
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Jakub Mensik 68% / Andrey Rublev 86%",
        "rows": [
          {
            "name": "Jakub Mensik",
            "confidence": 68,
            "modelPct": 41,
            "label": "Live to win a set"
          },
          {
            "name": "Andrey Rublev",
            "confidence": 86,
            "modelPct": 59,
            "label": "Strong set-win path"
          }
        ],
        "confidence": 86,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
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
    "marketData": null,
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
        "modelPct": 41,
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
        "modelPct": 59,
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
    "confidence": 59,
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
        "confidence": 85,
        "modelPct": 59,
        "label": "Strong set-win path"
      },
      {
        "name": "Joao Fonseca",
        "confidence": 69,
        "modelPct": 41,
        "label": "Live to win a set"
      }
    ],
    "valueBoard": {
      "note": "No sportsbook price captured; value math is unavailable.",
      "ml": null,
      "spread": null,
      "total": null,
      "setWin": [
        {
          "name": "Casper Ruud",
          "confidence": 85,
          "modelPct": 59,
          "label": "Strong set-win path"
        },
        {
          "name": "Joao Fonseca",
          "confidence": 69,
          "modelPct": 41,
          "label": "Live to win a set"
        }
      ]
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Casper Ruud 85% / Joao Fonseca 69%",
        "rows": [
          {
            "name": "Casper Ruud",
            "confidence": 85,
            "modelPct": 59,
            "label": "Strong set-win path"
          },
          {
            "name": "Joao Fonseca",
            "confidence": 69,
            "modelPct": 41,
            "label": "Live to win a set"
          }
        ],
        "confidence": 85,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
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
    "marketData": null,
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
        "modelPct": 59,
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
        "modelPct": 41,
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
    market?.total ? { label: 'Total games', book: market.source, value: market.totalValue } : null
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
    summary: `${raw.pickName} is the desk side. ${raw.reason}`,
    factors: [
      raw.reason,
      market?.noVigNote,
      raw.weaknessEdge?.gameFlow,
      raw.weaknessEdge?.liveTrigger,
      raw.totals,
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
        { label: 'O/U', value: market?.totalValue || 'Need posted total', lean: market?.totalLean || raw.weaknessEdge?.totalRead || raw.totals, confidence: Math.max(50, raw.confidence - 8), ...(raw.valueBoard?.total || {}), tone: raw.totals.includes('over') || raw.weaknessEdge?.totalRead?.includes('breaks') ? 'accent' : 'neutral', reason: raw.totals }
      ],
      marketEconomics,
      clayMatchupData: clayData,
      opponentQualityData: qualityContext,
      researchLinks: [{ label: 'ESPN scoreboard', url: 'https://www.espn.com/tennis/scoreboard/_/date/20260531' }, { label: 'Tennistonic H2H', url: raw.h2hUrl }, ...(market?.eventUrl ? [{ label: 'FanDuel event', url: market.eventUrl }] : [])],
      formEdgeName: raw.pickName
    },
    participants,
    moneyline: market ? { available: true, label: 'FanDuel moneyline', provider: market.source, participants } : { available: false, label: 'Moneyline', provider: 'Tennis warehouse model', participants: [] },
    analysis: { available: true, participantId: picked.id, participant: picked, opponent, lean: `Lean ${raw.pickName}`, rationale: raw.reason, confidence: raw.confidence, volatility: raw.volatility, recommendationScore: raw.confidence - Math.round(raw.volatility / 3) + Math.round(Math.max(-8, Math.min(8, deskMarket?.edgePct ?? 0))), tier: raw.tags.includes('High confidence')  ? 'High confidence' : raw.tags.includes('Lean') ? 'Lean' : 'Watch', sourceLabel: market?.source || 'Tennis warehouse model', modelEdge: deskMarket?.edgePct ?? 0, modelEdgeLabel: deskMarket ? `${deskMarket.edgePct > 0 ? '+' : ''}${deskMarket.edgePct} pts vs FanDuel implied` : 'Fair value only until market price is captured', marketProbability: deskMarket?.impliedPct ? deskMarket.impliedPct / 100 : null, marketProbabilityLabel: deskMarket?.impliedPct ? `${deskMarket.impliedPct}% FanDuel implied` : 'No market', inputs: [], inputsUsed: market ? 4 : 3, volatilityNotes: [] }
  }, { structuredAnalysis: true })
}

const matches = rawTennisGames.map(buildGame)

export const slateMeta = { title: 'May 31, 2026 Tennis Desk', date: 'May 31, 2026', isoDate: '2026-05-31', timeZone: 'America/Los_Angeles', subtitle: 'Singles-only Roland Garros main-draw slate with weakness-edge, game-flow gates, and sportsbook/market lines where captured.', notes: ['No doubles included.', 'FanDuel ML, game handicap, and total-games lines are attached where the sportsbook board exposes a matching singles event.', 'May 31, 2026 uses live rank, clay record, opponent-adjusted recent form, and warehouse service rows where joined.'] }
export const filters = ['All', 'Tennis']
export const oddsMeta = { provider: 'FanDuel Sportsbook + Tennis warehouse model', snapshot: 'May 31, 2026 Roland Garros desk', note: 'FanDuel lines are stored for priced matches; very expensive favorites are marked as low-payout or pass-first instead of automatic bets.' }
export const sources = [{ label: 'ESPN tennis scoreboard', url: 'https://www.espn.com/tennis/scoreboard/_/date/20260531' }, { label: 'Live Tennis rankings warehouse', url: 'https://live-tennis.eu/' }, { label: 'FanDuel sportsbook tennis', url: 'https://sportsbook.fanduel.com/tennis' }]
export const games = matches.sort((left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title))
