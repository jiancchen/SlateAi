import { createSportsMatchModel } from './sports-model.js'
import tennisClayContext from './day-2026-05-29-tennis-clay-context.generated.json' with { type: 'json' }
import tennisOpponentQualityContext from './day-2026-05-29-tennis-opponent-quality.generated.json' with { type: 'json' }
import tennisWarehouseContext from './day-2026-05-29-tennis-warehouse-context.generated.json' with { type: 'json' }

const rawTennisGames = [
  {
    "id": "rg-w-marta-kostyuk-viktorija-golubic-2026-05-29",
    "eventId": "175553",
    "tour": "WTA",
    "title": "Marta Kostyuk vs Viktorija Golubic",
    "start": "2:00 AM",
    "startMinutes": 120,
    "court": "Court Simonne-Mathieu",
    "round": "Round 3",
    "pickName": "Marta Kostyuk",
    "confidence": 65,
    "volatility": 41,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Lean",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Recent service hold is close: Marta Kostyuk 71%, Viktorija Golubic 70%. Marta Kostyuk grades 26 points better on opponent-adjusted recent form. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness warning",
      "target": "Marta Kostyuk",
      "scoreGap": -20,
      "attackingSide": null,
      "vulnerableSide": "Marta Kostyuk",
      "gameFlow": "Marta Kostyuk is the model side, but the fragile profile is on our pick: double-fault pressure (5.1 avg); faces too many break points (8.0 avg). Avoid laying a bad price until early holds are confirmed.",
      "liveTrigger": "Do not upgrade Marta Kostyuk unless they hold cleanly in the first service game and keep double faults down.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "Avoid low unders if Marta Kostyuk faces early break points or second-serve pressure.",
      "pick": {
        "name": "Marta Kostyuk",
        "serviceHoldPct": 71,
        "firstServeWonPct": 66,
        "secondServeWonPct": 51,
        "firstServePct": 56,
        "avgAces": 3.1,
        "avgDoubleFaults": 5.1,
        "avgWinners": 40,
        "avgUnforcedErrors": 40,
        "avgBreakPointsFaced": 8,
        "returnPointsWonPct": 55,
        "servicePointsWonPct": 60,
        "weakServeMatches": 7,
        "pressureMatches": 3,
        "matchesWithStats": 8,
        "weaknessScore": 25,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "double-fault pressure (5.1 avg)",
          "faces too many break points (8.0 avg)",
          "7 recent matches with serve instability"
        ],
        "strengths": [
          "creates return pressure (55% return points won)"
        ],
        "gameFlowRead": "Marta Kostyuk can drop points quickly through double-fault pressure (5.1 avg) and faces too many break points (8.0 avg)."
      },
      "opponent": {
        "name": "Viktorija Golubic",
        "serviceHoldPct": 70,
        "firstServeWonPct": 62,
        "secondServeWonPct": 54,
        "firstServePct": 68,
        "avgAces": 0.6,
        "avgDoubleFaults": 1,
        "avgWinners": 10,
        "avgUnforcedErrors": 10.5,
        "avgBreakPointsFaced": 4.8,
        "returnPointsWonPct": 56,
        "servicePointsWonPct": 59,
        "weakServeMatches": 2,
        "pressureMatches": 3,
        "matchesWithStats": 5,
        "weaknessScore": 5,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "creates return pressure (56% return points won)"
        ],
        "gameFlowRead": "Viktorija Golubic has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Marta Kostyuk",
        "confidence": 73,
        "modelPct": 65,
        "label": "Live to win a set"
      },
      {
        "name": "Viktorija Golubic",
        "confidence": 49,
        "modelPct": 35,
        "label": "Thin set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Marta Kostyuk",
        "americanOdds": -1600,
        "modelPct": 65,
        "impliedPct": 94.1,
        "edgePct": -29.1,
        "evPer100": -30.9,
        "netEvPer100": -32.9,
        "feePer100": 2,
        "valueIssue": "Favorite tax trap",
        "valueGrade": "Favorite tax trap",
        "betGrade": false
      },
      "spread": null,
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Marta Kostyuk",
          "confidence": 73,
          "modelPct": 65,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Viktorija Golubic",
          "confidence": 49,
          "modelPct": 35,
          "label": "Thin set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook browser scrape",
      "capturedAt": "2026-05-29T05:09:26.000Z",
      "players": [
        {
          "name": "Marta Kostyuk",
          "odds": -1600,
          "americanLabel": "-1600",
          "impliedPct": 94.1,
          "decimalOdds": 1.063,
          "modelPct": 65,
          "edgePct": -29.1,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 6.3,
          "grossPayoutMultiple": 1.063,
          "centsAtRisk": 100,
          "centsProfitIfWin": 6.3
        },
        {
          "name": "Viktorija Golubic",
          "odds": 860,
          "americanLabel": "+860",
          "impliedPct": 10.4,
          "decimalOdds": 9.6,
          "modelPct": 35,
          "edgePct": 24.6,
          "priceBand": "Underdog",
          "grossProfitPct": 860,
          "grossPayoutMultiple": 9.6,
          "centsAtRisk": 100,
          "centsProfitIfWin": 860
        }
      ],
      "desk": {
        "name": "Marta Kostyuk",
        "odds": -1600,
        "americanLabel": "-1600",
        "impliedPct": 94.1,
        "decimalOdds": 1.063,
        "modelPct": 65,
        "edgePct": -29.1,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 6.3,
        "grossPayoutMultiple": 1.063,
        "centsAtRisk": 100,
        "centsProfitIfWin": 6.3
      },
      "spread": null,
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Marta Kostyuk -1600 / Viktorija Golubic +860",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 65% vs FanDuel implied 94.1% (-29.1 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Marta-Kostyuk-Vs-Viktorija-Golubic/",
    "players": [
      {
        "name": "Marta Kostyuk",
        "ranking": {
          "name": "Marta Kostyuk",
          "rank": 15,
          "points": 2447,
          "age": 23.9,
          "country": "UKR",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Marta Kostyuk",
        "profile": "Live rank #15 | UKR | age 23.9 | 2026 clay 14-0, 100% | adj form 110 | hold 71%",
        "modelPct": 65,
        "weakness": {
          "name": "Marta Kostyuk",
          "serviceHoldPct": 71,
          "firstServeWonPct": 66,
          "secondServeWonPct": 51,
          "firstServePct": 56,
          "avgAces": 3.1,
          "avgDoubleFaults": 5.1,
          "avgWinners": 40,
          "avgUnforcedErrors": 40,
          "avgBreakPointsFaced": 8,
          "returnPointsWonPct": 55,
          "servicePointsWonPct": 60,
          "weakServeMatches": 7,
          "pressureMatches": 3,
          "matchesWithStats": 8,
          "weaknessScore": 25,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "double-fault pressure (5.1 avg)",
            "faces too many break points (8.0 avg)",
            "7 recent matches with serve instability"
          ],
          "strengths": [
            "creates return pressure (55% return points won)"
          ],
          "gameFlowRead": "Marta Kostyuk can drop points quickly through double-fault pressure (5.1 avg) and faces too many break points (8.0 avg)."
        }
      },
      {
        "name": "Viktorija Golubic",
        "ranking": {
          "name": "Viktorija Golubic",
          "rank": 79,
          "points": 901,
          "age": 33.6,
          "country": "SUI",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Viktorija Golubic",
        "profile": "Live rank #79 | SUI | age 33.6 | 2026 clay 8-4, 67% | adj form 83 | hold 70%",
        "modelPct": 35,
        "weakness": {
          "name": "Viktorija Golubic",
          "serviceHoldPct": 70,
          "firstServeWonPct": 62,
          "secondServeWonPct": 54,
          "firstServePct": 68,
          "avgAces": 0.6,
          "avgDoubleFaults": 1,
          "avgWinners": 10,
          "avgUnforcedErrors": 10.5,
          "avgBreakPointsFaced": 4.8,
          "returnPointsWonPct": 56,
          "servicePointsWonPct": 59,
          "weakServeMatches": 2,
          "pressureMatches": 3,
          "matchesWithStats": 5,
          "weaknessScore": 5,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "creates return pressure (56% return points won)"
          ],
          "gameFlowRead": "Viktorija Golubic has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-m-nuno-borges-andrey-rublev-2026-05-29",
    "eventId": "175700",
    "tour": "ATP",
    "title": "Nuno Borges vs Andrey Rublev",
    "start": "2:00 AM",
    "startMinutes": 120,
    "court": "Court Suzanne-Lenglen",
    "round": "Round 3",
    "pickName": "Andrey Rublev",
    "confidence": 65,
    "volatility": 35,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Lean",
      "No blind bet",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Nuno Borges has the recent service-hold edge 81% to 76%, so Andrey Rublev needs the rank/form edge to show up on return games. Opponent-adjusted recent form is basically even: Andrey Rublev 69, Nuno Borges 71. Lean, not a chase.",
    "totals": "Best O/U angle: over if the book hangs a low best-of-five number, because both recent hold profiles can extend sets.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": 1,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Andrey Rublev",
        "serviceHoldPct": 76,
        "firstServeWonPct": 70,
        "secondServeWonPct": 48,
        "firstServePct": 63,
        "avgAces": 4.5,
        "avgDoubleFaults": 1.8,
        "avgWinners": 27.3,
        "avgUnforcedErrors": 27.9,
        "avgBreakPointsFaced": 9,
        "returnPointsWonPct": 37,
        "servicePointsWonPct": 63,
        "weakServeMatches": 2,
        "pressureMatches": 4,
        "matchesWithStats": 8,
        "weaknessScore": 10,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "faces too many break points (9.0 avg)",
          "limited return pressure (37% return points won)"
        ],
        "strengths": [
          "wins enough first-serve points (70%)"
        ],
        "gameFlowRead": "Andrey Rublev can drop points quickly through faces too many break points (9.0 avg) and limited return pressure (37% return points won)."
      },
      "opponent": {
        "name": "Nuno Borges",
        "serviceHoldPct": 81,
        "firstServeWonPct": 72,
        "secondServeWonPct": 48,
        "firstServePct": 62,
        "avgAces": 6.2,
        "avgDoubleFaults": 2.3,
        "avgWinners": 24,
        "avgUnforcedErrors": 29.5,
        "avgBreakPointsFaced": 7,
        "returnPointsWonPct": 41,
        "servicePointsWonPct": 62,
        "weakServeMatches": 2,
        "pressureMatches": 6,
        "matchesWithStats": 6,
        "weaknessScore": 11,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "protects serve well (81% hold)",
          "wins enough first-serve points (72%)"
        ],
        "gameFlowRead": "Nuno Borges has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Nuno Borges",
        "confidence": 63,
        "modelPct": 35,
        "label": "Needs early hold pressure"
      },
      {
        "name": "Andrey Rublev",
        "confidence": 87,
        "modelPct": 65,
        "label": "Strong set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Andrey Rublev",
        "americanOdds": -315,
        "modelPct": 65,
        "impliedPct": 75.9,
        "edgePct": -10.9,
        "evPer100": -14.4,
        "netEvPer100": -16.4,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": null,
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Nuno Borges",
          "confidence": 63,
          "modelPct": 35,
          "label": "Needs early hold pressure",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Andrey Rublev",
          "confidence": 87,
          "modelPct": 65,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook browser scrape",
      "capturedAt": "2026-05-29T05:09:26.000Z",
      "players": [
        {
          "name": "Nuno Borges",
          "odds": 245,
          "americanLabel": "+245",
          "impliedPct": 29,
          "decimalOdds": 3.45,
          "modelPct": 35,
          "edgePct": 6,
          "priceBand": "Underdog",
          "grossProfitPct": 245,
          "grossPayoutMultiple": 3.45,
          "centsAtRisk": 100,
          "centsProfitIfWin": 245
        },
        {
          "name": "Andrey Rublev",
          "odds": -315,
          "americanLabel": "-315",
          "impliedPct": 75.9,
          "decimalOdds": 1.317,
          "modelPct": 65,
          "edgePct": -10.9,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 31.7,
          "grossPayoutMultiple": 1.317,
          "centsAtRisk": 100,
          "centsProfitIfWin": 31.7
        }
      ],
      "desk": {
        "name": "Andrey Rublev",
        "odds": -315,
        "americanLabel": "-315",
        "impliedPct": 75.9,
        "decimalOdds": 1.317,
        "modelPct": 65,
        "edgePct": -10.9,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 31.7,
        "grossPayoutMultiple": 1.317,
        "centsAtRisk": 100,
        "centsProfitIfWin": 31.7
      },
      "spread": null,
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Nuno Borges +245 / Andrey Rublev -315",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 65% vs FanDuel implied 75.9% (-10.9 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Nuno-Borges-Vs-Andrey-Rublev/",
    "players": [
      {
        "name": "Nuno Borges",
        "ranking": {
          "name": "Nuno Borges",
          "rank": 51,
          "points": 920,
          "age": 29.2,
          "country": "POR",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Nuno Borges",
        "profile": "Live rank #51 | POR | age 29.2 | 2026 clay 6-6, 50% | adj form 71 | hold 81%",
        "modelPct": 35,
        "weakness": {
          "name": "Nuno Borges",
          "serviceHoldPct": 81,
          "firstServeWonPct": 72,
          "secondServeWonPct": 48,
          "firstServePct": 62,
          "avgAces": 6.2,
          "avgDoubleFaults": 2.3,
          "avgWinners": 24,
          "avgUnforcedErrors": 29.5,
          "avgBreakPointsFaced": 7,
          "returnPointsWonPct": 41,
          "servicePointsWonPct": 62,
          "weakServeMatches": 2,
          "pressureMatches": 6,
          "matchesWithStats": 6,
          "weaknessScore": 11,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "protects serve well (81% hold)",
            "wins enough first-serve points (72%)"
          ],
          "gameFlowRead": "Nuno Borges has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Andrey Rublev",
        "ranking": {
          "name": "Andrey Rublev",
          "rank": 13,
          "points": 2310,
          "age": 28.5,
          "country": "RUS",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Andrey Rublev",
        "profile": "Live rank #13 | RUS | age 28.5 | 2026 clay 10-4, 71% | adj form 69 | hold 76%",
        "modelPct": 65,
        "weakness": {
          "name": "Andrey Rublev",
          "serviceHoldPct": 76,
          "firstServeWonPct": 70,
          "secondServeWonPct": 48,
          "firstServePct": 63,
          "avgAces": 4.5,
          "avgDoubleFaults": 1.8,
          "avgWinners": 27.3,
          "avgUnforcedErrors": 27.9,
          "avgBreakPointsFaced": 9,
          "returnPointsWonPct": 37,
          "servicePointsWonPct": 63,
          "weakServeMatches": 2,
          "pressureMatches": 4,
          "matchesWithStats": 8,
          "weaknessScore": 10,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "faces too many break points (9.0 avg)",
            "limited return pressure (37% return points won)"
          ],
          "strengths": [
            "wins enough first-serve points (70%)"
          ],
          "gameFlowRead": "Andrey Rublev can drop points quickly through faces too many break points (9.0 avg) and limited return pressure (37% return points won)."
        }
      }
    ]
  },
  {
    "id": "rg-m-thiago-agustin-tirante-pablo-carreno-busta-2026-05-29",
    "eventId": "175755",
    "tour": "ATP",
    "title": "Thiago Agustin Tirante vs Pablo Carreno Busta",
    "start": "2:00 AM",
    "startMinutes": 120,
    "court": "Court 14",
    "round": "Round 3",
    "pickName": "Thiago Agustin Tirante",
    "confidence": 50,
    "volatility": 50,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Watch only",
      "No blind bet",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Thiago Agustin Tirante has the cleaner composite of rank, clay record, and recent opponent quality. Lean, not a chase.",
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
        "name": "Thiago Agustin Tirante",
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
        "gameFlowRead": "Thiago Agustin Tirante has no major service weakness in the joined Flashscore sample."
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
        "name": "Thiago Agustin Tirante",
        "confidence": 84,
        "modelPct": 50,
        "label": "Strong set-win path"
      },
      {
        "name": "Pablo Carreno Busta",
        "confidence": 84,
        "modelPct": 50,
        "label": "Strong set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Thiago Agustin Tirante",
        "americanOdds": -245,
        "modelPct": 50,
        "impliedPct": 71,
        "edgePct": -21,
        "evPer100": -29.6,
        "netEvPer100": -31.6,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": null,
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Thiago Agustin Tirante",
          "confidence": 84,
          "modelPct": 50,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Pablo Carreno Busta",
          "confidence": 84,
          "modelPct": 50,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook browser scrape",
      "capturedAt": "2026-05-29T05:09:26.000Z",
      "players": [
        {
          "name": "Thiago Agustin Tirante",
          "odds": -245,
          "americanLabel": "-245",
          "impliedPct": 71,
          "decimalOdds": 1.408,
          "modelPct": 50,
          "edgePct": -21,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 40.8,
          "grossPayoutMultiple": 1.408,
          "centsAtRisk": 100,
          "centsProfitIfWin": 40.8
        },
        {
          "name": "Pablo Carreno Busta",
          "odds": 202,
          "americanLabel": "+202",
          "impliedPct": 33.1,
          "decimalOdds": 3.02,
          "modelPct": 50,
          "edgePct": 16.9,
          "priceBand": "Underdog",
          "grossProfitPct": 202,
          "grossPayoutMultiple": 3.02,
          "centsAtRisk": 100,
          "centsProfitIfWin": 202
        }
      ],
      "desk": {
        "name": "Thiago Agustin Tirante",
        "odds": -245,
        "americanLabel": "-245",
        "impliedPct": 71,
        "decimalOdds": 1.408,
        "modelPct": 50,
        "edgePct": -21,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 40.8,
        "grossPayoutMultiple": 1.408,
        "centsAtRisk": 100,
        "centsProfitIfWin": 40.8
      },
      "spread": null,
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Thiago Agustin Tirante -245 / Pablo Carreno Busta +202",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 50% vs FanDuel implied 71% (-21 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Thiago-Agustin-Tirante-Vs-Pablo-Carreno-Busta/",
    "players": [
      {
        "name": "Thiago Agustin Tirante",
        "ranking": {
          "name": "Thiago Agustín Tirante",
          "rank": 53,
          "points": 911,
          "age": 25.1,
          "country": "ARG",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": null,
        "profile": "Live rank #53 | ARG | age 25.1",
        "modelPct": 50,
        "weakness": {
          "name": "Thiago Agustin Tirante",
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
          "gameFlowRead": "Thiago Agustin Tirante has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Pablo Carreno Busta",
        "ranking": {
          "name": "Pablo Carreño Busta",
          "rank": 84,
          "points": 685,
          "age": 34.8,
          "country": "ESP",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": null,
        "profile": "Live rank #84 | ESP | age 34.8",
        "modelPct": 50,
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
    "id": "rg-w-wang-xiyu-yuliia-starodubtseva-2026-05-29",
    "eventId": "175528",
    "tour": "WTA",
    "title": "Wang Xiyu vs Yuliia Starodubtseva",
    "start": "2:00 AM",
    "startMinutes": 120,
    "court": "Court 7",
    "round": "Round 3",
    "pickName": "Yuliia Starodubtseva",
    "confidence": 57,
    "volatility": 51,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Watch only",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Yuliia Starodubtseva has the cleaner composite of rank, clay record, and recent opponent quality. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness warning",
      "target": "Yuliia Starodubtseva",
      "scoreGap": -15,
      "attackingSide": null,
      "vulnerableSide": "Yuliia Starodubtseva",
      "gameFlow": "Yuliia Starodubtseva is the model side, but the fragile profile is on our pick: negative winner/error balance (12.0 winners, 34.0 unforced); faces too many break points (9.0 avg). Avoid laying a bad price until early holds are confirmed.",
      "liveTrigger": "Do not upgrade Yuliia Starodubtseva unless they hold cleanly in the first service game and keep double faults down.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Yuliia Starodubtseva",
        "serviceHoldPct": 69,
        "firstServeWonPct": 62,
        "secondServeWonPct": 55,
        "firstServePct": 66,
        "avgAces": 0.5,
        "avgDoubleFaults": 2.3,
        "avgWinners": 12,
        "avgUnforcedErrors": 34,
        "avgBreakPointsFaced": 9,
        "returnPointsWonPct": 50,
        "servicePointsWonPct": 60,
        "weakServeMatches": 2,
        "pressureMatches": 4,
        "matchesWithStats": 4,
        "weaknessScore": 15,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "negative winner/error balance (12.0 winners, 34.0 unforced)",
          "faces too many break points (9.0 avg)"
        ],
        "strengths": [
          "creates return pressure (50% return points won)"
        ],
        "gameFlowRead": "Yuliia Starodubtseva can drop points quickly through negative winner/error balance (12.0 winners, 34.0 unforced) and faces too many break points (9.0 avg)."
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
        "name": "Wang Xiyu",
        "confidence": 59,
        "modelPct": 43,
        "label": "Needs early hold pressure"
      },
      {
        "name": "Yuliia Starodubtseva",
        "confidence": 71,
        "modelPct": 57,
        "label": "Live to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Yuliia Starodubtseva",
        "americanOdds": -184,
        "modelPct": 57,
        "impliedPct": 64.8,
        "edgePct": -7.8,
        "evPer100": -12,
        "netEvPer100": -14,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": null,
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Wang Xiyu",
          "confidence": 59,
          "modelPct": 43,
          "label": "Needs early hold pressure",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Yuliia Starodubtseva",
          "confidence": 71,
          "modelPct": 57,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook browser scrape",
      "capturedAt": "2026-05-29T05:09:26.000Z",
      "players": [
        {
          "name": "Wang Xiyu",
          "odds": 150,
          "americanLabel": "+150",
          "impliedPct": 40,
          "decimalOdds": 2.5,
          "modelPct": 43,
          "edgePct": 3,
          "priceBand": "Underdog",
          "grossProfitPct": 150,
          "grossPayoutMultiple": 2.5,
          "centsAtRisk": 100,
          "centsProfitIfWin": 150
        },
        {
          "name": "Yuliia Starodubtseva",
          "odds": -184,
          "americanLabel": "-184",
          "impliedPct": 64.8,
          "decimalOdds": 1.543,
          "modelPct": 57,
          "edgePct": -7.8,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 54.3,
          "grossPayoutMultiple": 1.543,
          "centsAtRisk": 100,
          "centsProfitIfWin": 54.3
        }
      ],
      "desk": {
        "name": "Yuliia Starodubtseva",
        "odds": -184,
        "americanLabel": "-184",
        "impliedPct": 64.8,
        "decimalOdds": 1.543,
        "modelPct": 57,
        "edgePct": -7.8,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 54.3,
        "grossPayoutMultiple": 1.543,
        "centsAtRisk": 100,
        "centsProfitIfWin": 54.3
      },
      "spread": null,
      "priceAction": "FanDuel price is richer than the model; pass ML unless live state improves.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Wang Xiyu +150 / Yuliia Starodubtseva -184",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. FanDuel price is richer than the model; pass ML unless live state improves.",
      "noVigNote": "Model 57% vs FanDuel implied 64.8% (-7.8 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Xiyu-Wang-Vs-Yuliia-Starodubtseva/",
    "players": [
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
          "asOf": "2026-05-26"
        },
        "qualityName": null,
        "profile": "Live rank #148 | China | age 25",
        "modelPct": 43,
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
      },
      {
        "name": "Yuliia Starodubtseva",
        "ranking": {
          "name": "Yuliia Starodubtseva",
          "rank": 55,
          "points": 1093,
          "age": 26,
          "country": "Ukraine",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/13478/yuliia-starodubtseva",
          "asOf": "2026-05-26"
        },
        "qualityName": "Yuliia Starodubtseva",
        "profile": "Live rank #55 | Ukraine | age 26 | 2026 clay 13-6, 68% | adj form 88 | hold 69%",
        "modelPct": 57,
        "weakness": {
          "name": "Yuliia Starodubtseva",
          "serviceHoldPct": 69,
          "firstServeWonPct": 62,
          "secondServeWonPct": 55,
          "firstServePct": 66,
          "avgAces": 0.5,
          "avgDoubleFaults": 2.3,
          "avgWinners": 12,
          "avgUnforcedErrors": 34,
          "avgBreakPointsFaced": 9,
          "returnPointsWonPct": 50,
          "servicePointsWonPct": 60,
          "weakServeMatches": 2,
          "pressureMatches": 4,
          "matchesWithStats": 4,
          "weaknessScore": 15,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "negative winner/error balance (12.0 winners, 34.0 unforced)",
            "faces too many break points (9.0 avg)"
          ],
          "strengths": [
            "creates return pressure (50% return points won)"
          ],
          "gameFlowRead": "Yuliia Starodubtseva can drop points quickly through negative winner/error balance (12.0 winners, 34.0 unforced) and faces too many break points (9.0 avg)."
        }
      }
    ]
  },
  {
    "id": "rg-w-magda-linette-iga-swiatek-2026-05-29",
    "eventId": "175560",
    "tour": "WTA",
    "title": "Magda Linette vs Iga Swiatek",
    "start": "3:00 AM",
    "startMinutes": 180,
    "court": "Court Philippe-Chatrier",
    "round": "Round 3",
    "pickName": "Iga Swiatek",
    "confidence": 73,
    "volatility": 31,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Lean",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Iga Swiatek has the recent service-hold edge 78% to 68%. Iga Swiatek grades 34 points better on opponent-adjusted recent form. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": 4,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Iga Swiatek",
        "serviceHoldPct": 78,
        "firstServeWonPct": 70,
        "secondServeWonPct": 55,
        "firstServePct": 67,
        "avgAces": 2,
        "avgDoubleFaults": 2.3,
        "avgWinners": 17,
        "avgUnforcedErrors": 27,
        "avgBreakPointsFaced": 4.1,
        "returnPointsWonPct": 58,
        "servicePointsWonPct": 65,
        "weakServeMatches": 2,
        "pressureMatches": 3,
        "matchesWithStats": 7,
        "weaknessScore": 6,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "negative winner/error balance (17.0 winners, 27.0 unforced)"
        ],
        "strengths": [
          "protects serve well (78% hold)",
          "wins enough first-serve points (70%)",
          "second serve holds up (55%)",
          "creates return pressure (58% return points won)"
        ],
        "gameFlowRead": "Iga Swiatek can drop points quickly through negative winner/error balance (17.0 winners, 27.0 unforced)."
      },
      "opponent": {
        "name": "Magda Linette",
        "serviceHoldPct": 68,
        "firstServeWonPct": 67,
        "secondServeWonPct": 50,
        "firstServePct": 56,
        "avgAces": 2.9,
        "avgDoubleFaults": 2.1,
        "avgWinners": 35,
        "avgUnforcedErrors": 34.5,
        "avgBreakPointsFaced": 6.7,
        "returnPointsWonPct": 36,
        "servicePointsWonPct": 59,
        "weakServeMatches": 3,
        "pressureMatches": 4,
        "matchesWithStats": 7,
        "weaknessScore": 10,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "3 recent matches with serve instability",
          "limited return pressure (36% return points won)"
        ],
        "strengths": [],
        "gameFlowRead": "Magda Linette can drop points quickly through 3 recent matches with serve instability and limited return pressure (36% return points won)."
      }
    },
    "setWinProjections": [
      {
        "name": "Magda Linette",
        "confidence": 39,
        "modelPct": 27,
        "label": "Thin set-win path"
      },
      {
        "name": "Iga Swiatek",
        "confidence": 79,
        "modelPct": 73,
        "label": "Live to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Iga Swiatek",
        "americanOdds": -4000,
        "modelPct": 73,
        "impliedPct": 97.6,
        "edgePct": -24.6,
        "evPer100": -25.2,
        "netEvPer100": -27.2,
        "feePer100": 2,
        "valueIssue": "Favorite tax trap",
        "valueGrade": "Favorite tax trap",
        "betGrade": false
      },
      "spread": null,
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Magda Linette",
          "confidence": 39,
          "modelPct": 27,
          "label": "Thin set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Iga Swiatek",
          "confidence": 79,
          "modelPct": 73,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook browser scrape",
      "capturedAt": "2026-05-29T05:09:26.000Z",
      "players": [
        {
          "name": "Magda Linette",
          "odds": 1400,
          "americanLabel": "+1400",
          "impliedPct": 6.7,
          "decimalOdds": 15,
          "modelPct": 27,
          "edgePct": 20.3,
          "priceBand": "Underdog",
          "grossProfitPct": 1400,
          "grossPayoutMultiple": 15,
          "centsAtRisk": 100,
          "centsProfitIfWin": 1400
        },
        {
          "name": "Iga Swiatek",
          "odds": -4000,
          "americanLabel": "-4000",
          "impliedPct": 97.6,
          "decimalOdds": 1.025,
          "modelPct": 73,
          "edgePct": -24.6,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 2.5,
          "grossPayoutMultiple": 1.025,
          "centsAtRisk": 100,
          "centsProfitIfWin": 2.5
        }
      ],
      "desk": {
        "name": "Iga Swiatek",
        "odds": -4000,
        "americanLabel": "-4000",
        "impliedPct": 97.6,
        "decimalOdds": 1.025,
        "modelPct": 73,
        "edgePct": -24.6,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 2.5,
        "grossPayoutMultiple": 1.025,
        "centsAtRisk": 100,
        "centsProfitIfWin": 2.5
      },
      "spread": null,
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Magda Linette +1400 / Iga Swiatek -4000",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 73% vs FanDuel implied 97.6% (-24.6 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Magda-Linette-Vs-Iga-Swiatek/",
    "players": [
      {
        "name": "Magda Linette",
        "ranking": {
          "name": "Magda Linette",
          "rank": 62,
          "points": 991,
          "age": 34.2,
          "country": "POL",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Magda Linette",
        "profile": "Live rank #62 | POL | age 34.2 | 2026 clay 3-3, 50% | adj form 55 | hold 68%",
        "modelPct": 27,
        "weakness": {
          "name": "Magda Linette",
          "serviceHoldPct": 68,
          "firstServeWonPct": 67,
          "secondServeWonPct": 50,
          "firstServePct": 56,
          "avgAces": 2.9,
          "avgDoubleFaults": 2.1,
          "avgWinners": 35,
          "avgUnforcedErrors": 34.5,
          "avgBreakPointsFaced": 6.7,
          "returnPointsWonPct": 36,
          "servicePointsWonPct": 59,
          "weakServeMatches": 3,
          "pressureMatches": 4,
          "matchesWithStats": 7,
          "weaknessScore": 10,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "3 recent matches with serve instability",
            "limited return pressure (36% return points won)"
          ],
          "strengths": [],
          "gameFlowRead": "Magda Linette can drop points quickly through 3 recent matches with serve instability and limited return pressure (36% return points won)."
        }
      },
      {
        "name": "Iga Swiatek",
        "ranking": {
          "name": "Iga Świątek",
          "rank": 3,
          "points": 6563,
          "age": 24.9,
          "country": "POL",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Iga Swiatek",
        "profile": "Live rank #3 | POL | age 24.9 | 2026 clay 8-3, 73% | adj form 89 | hold 78%",
        "modelPct": 73,
        "weakness": {
          "name": "Iga Swiatek",
          "serviceHoldPct": 78,
          "firstServeWonPct": 70,
          "secondServeWonPct": 55,
          "firstServePct": 67,
          "avgAces": 2,
          "avgDoubleFaults": 2.3,
          "avgWinners": 17,
          "avgUnforcedErrors": 27,
          "avgBreakPointsFaced": 4.1,
          "returnPointsWonPct": 58,
          "servicePointsWonPct": 65,
          "weakServeMatches": 2,
          "pressureMatches": 3,
          "matchesWithStats": 7,
          "weaknessScore": 6,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "negative winner/error balance (17.0 winners, 27.0 unforced)"
          ],
          "strengths": [
            "protects serve well (78% hold)",
            "wins enough first-serve points (70%)",
            "second serve holds up (55%)",
            "creates return pressure (58% return points won)"
          ],
          "gameFlowRead": "Iga Swiatek can drop points quickly through negative winner/error balance (17.0 winners, 27.0 unforced)."
        }
      }
    ]
  },
  {
    "id": "rg-m-alex-michelsen-rafael-jodar-2026-05-29",
    "eventId": "175722",
    "tour": "ATP",
    "title": "Alex Michelsen vs Rafael Jodar",
    "start": "3:30 AM",
    "startMinutes": 210,
    "court": "Court Simonne-Mathieu",
    "round": "Round 3",
    "pickName": "Rafael Jodar",
    "confidence": 60,
    "volatility": 40,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Watch only",
      "No blind bet",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Rafael Jodar has the recent service-hold edge 85% to 75%. Rafael Jodar grades 25 points better on opponent-adjusted recent form. Lean, not a chase.",
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
        "name": "Rafael Jodar",
        "serviceHoldPct": 85,
        "firstServeWonPct": 69,
        "secondServeWonPct": 60,
        "firstServePct": 64,
        "avgAces": 4,
        "avgDoubleFaults": 2.4,
        "avgWinners": 24.9,
        "avgUnforcedErrors": 29.8,
        "avgBreakPointsFaced": 5.9,
        "returnPointsWonPct": 44,
        "servicePointsWonPct": 66,
        "weakServeMatches": 3,
        "pressureMatches": 6,
        "matchesWithStats": 8,
        "weaknessScore": 11,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "3 recent matches with serve instability"
        ],
        "strengths": [
          "protects serve well (85% hold)",
          "second serve holds up (60%)"
        ],
        "gameFlowRead": "Rafael Jodar can drop points quickly through 3 recent matches with serve instability."
      },
      "opponent": {
        "name": "Alex Michelsen",
        "serviceHoldPct": 75,
        "firstServeWonPct": 69,
        "secondServeWonPct": 51,
        "firstServePct": 62,
        "avgAces": 5.4,
        "avgDoubleFaults": 2.9,
        "avgWinners": 23.9,
        "avgUnforcedErrors": 30.6,
        "avgBreakPointsFaced": 5.7,
        "returnPointsWonPct": 38,
        "servicePointsWonPct": 62,
        "weakServeMatches": 2,
        "pressureMatches": 5,
        "matchesWithStats": 7,
        "weaknessScore": 8,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "negative winner/error balance (23.9 winners, 30.6 unforced)"
        ],
        "strengths": [],
        "gameFlowRead": "Alex Michelsen can drop points quickly through negative winner/error balance (23.9 winners, 30.6 unforced)."
      }
    },
    "setWinProjections": [
      {
        "name": "Alex Michelsen",
        "confidence": 68,
        "modelPct": 40,
        "label": "Live to win a set"
      },
      {
        "name": "Rafael Jodar",
        "confidence": 86,
        "modelPct": 60,
        "label": "Strong set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Rafael Jodar",
        "americanOdds": -550,
        "modelPct": 60,
        "impliedPct": 84.6,
        "edgePct": -24.6,
        "evPer100": -29.1,
        "netEvPer100": -31.1,
        "feePer100": 2,
        "valueIssue": "Favorite tax trap",
        "valueGrade": "Favorite tax trap",
        "betGrade": false
      },
      "spread": null,
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Alex Michelsen",
          "confidence": 68,
          "modelPct": 40,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Rafael Jodar",
          "confidence": 86,
          "modelPct": 60,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook browser scrape",
      "capturedAt": "2026-05-29T05:09:26.000Z",
      "players": [
        {
          "name": "Alex Michelsen",
          "odds": 390,
          "americanLabel": "+390",
          "impliedPct": 20.4,
          "decimalOdds": 4.9,
          "modelPct": 40,
          "edgePct": 19.6,
          "priceBand": "Underdog",
          "grossProfitPct": 390,
          "grossPayoutMultiple": 4.9,
          "centsAtRisk": 100,
          "centsProfitIfWin": 390
        },
        {
          "name": "Rafael Jodar",
          "odds": -550,
          "americanLabel": "-550",
          "impliedPct": 84.6,
          "decimalOdds": 1.182,
          "modelPct": 60,
          "edgePct": -24.6,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 18.2,
          "grossPayoutMultiple": 1.182,
          "centsAtRisk": 100,
          "centsProfitIfWin": 18.2
        }
      ],
      "desk": {
        "name": "Rafael Jodar",
        "odds": -550,
        "americanLabel": "-550",
        "impliedPct": 84.6,
        "decimalOdds": 1.182,
        "modelPct": 60,
        "edgePct": -24.6,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 18.2,
        "grossPayoutMultiple": 1.182,
        "centsAtRisk": 100,
        "centsProfitIfWin": 18.2
      },
      "spread": null,
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Alex Michelsen +390 / Rafael Jodar -550",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 60% vs FanDuel implied 84.6% (-24.6 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Alex-Michelsen-Vs-Rafael-Jodar/",
    "players": [
      {
        "name": "Alex Michelsen",
        "ranking": {
          "name": "Alex Michelsen",
          "rank": 38,
          "points": 1155,
          "age": 21.7,
          "country": "USA",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Alex Michelsen",
        "profile": "Live rank #38 | USA | age 21.7 | 2026 clay 6-6, 50% | adj form 63 | hold 75%",
        "modelPct": 40,
        "weakness": {
          "name": "Alex Michelsen",
          "serviceHoldPct": 75,
          "firstServeWonPct": 69,
          "secondServeWonPct": 51,
          "firstServePct": 62,
          "avgAces": 5.4,
          "avgDoubleFaults": 2.9,
          "avgWinners": 23.9,
          "avgUnforcedErrors": 30.6,
          "avgBreakPointsFaced": 5.7,
          "returnPointsWonPct": 38,
          "servicePointsWonPct": 62,
          "weakServeMatches": 2,
          "pressureMatches": 5,
          "matchesWithStats": 7,
          "weaknessScore": 8,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "negative winner/error balance (23.9 winners, 30.6 unforced)"
          ],
          "strengths": [],
          "gameFlowRead": "Alex Michelsen can drop points quickly through negative winner/error balance (23.9 winners, 30.6 unforced)."
        }
      },
      {
        "name": "Rafael Jodar",
        "ranking": {
          "name": "Rafael Jódar",
          "rank": 29,
          "points": 1499,
          "age": 19.6,
          "country": "ESP",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Rafael Jodar",
        "profile": "Live rank #29 | ESP | age 19.6 | 2026 clay 17-3, 85% | adj form 88 | hold 85%",
        "modelPct": 60,
        "weakness": {
          "name": "Rafael Jodar",
          "serviceHoldPct": 85,
          "firstServeWonPct": 69,
          "secondServeWonPct": 60,
          "firstServePct": 64,
          "avgAces": 4,
          "avgDoubleFaults": 2.4,
          "avgWinners": 24.9,
          "avgUnforcedErrors": 29.8,
          "avgBreakPointsFaced": 5.9,
          "returnPointsWonPct": 44,
          "servicePointsWonPct": 66,
          "weakServeMatches": 3,
          "pressureMatches": 6,
          "matchesWithStats": 8,
          "weaknessScore": 11,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "3 recent matches with serve instability"
          ],
          "strengths": [
            "protects serve well (85% hold)",
            "second serve holds up (60%)"
          ],
          "gameFlowRead": "Rafael Jodar can drop points quickly through 3 recent matches with serve instability."
        }
      }
    ]
  },
  {
    "id": "rg-w-jil-teichmann-karolina-muchova-2026-05-29",
    "eventId": "175572",
    "tour": "WTA",
    "title": "Jil Teichmann vs Karolina Muchova",
    "start": "4:00 AM",
    "startMinutes": 240,
    "court": "Court Suzanne-Lenglen",
    "round": "Round 3",
    "pickName": "Karolina Muchova",
    "confidence": 69,
    "volatility": 35,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Lean",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Recent service hold is close: Karolina Muchova 70%, Jil Teichmann 67%. Jil Teichmann grades 11 points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness edge",
      "target": "Jil Teichmann",
      "scoreGap": 9,
      "attackingSide": "Karolina Muchova",
      "vulnerableSide": "Jil Teichmann",
      "gameFlow": "Karolina Muchova has a real path if Jil Teichmann's first two service games show the same weakness: first-serve points won below comfort (59%); negative winner/error balance (16.0 winners, 27.5 unforced).",
      "liveTrigger": "Look for Jil Teichmann facing break points or second-serve pressure before 3-3.",
      "spreadRead": "Karolina Muchova spread only if the handicap is short and Jil Teichmann is under pressure early.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Karolina Muchova",
        "serviceHoldPct": 70,
        "firstServeWonPct": 66,
        "secondServeWonPct": 45,
        "firstServePct": 67,
        "avgAces": 3.5,
        "avgDoubleFaults": 1.9,
        "avgWinners": 17,
        "avgUnforcedErrors": 21.5,
        "avgBreakPointsFaced": 7.8,
        "returnPointsWonPct": 44,
        "servicePointsWonPct": 59,
        "weakServeMatches": 4,
        "pressureMatches": 3,
        "matchesWithStats": 8,
        "weaknessScore": 13,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "4 recent matches with serve instability"
        ],
        "strengths": [],
        "gameFlowRead": "Karolina Muchova can drop points quickly through 4 recent matches with serve instability."
      },
      "opponent": {
        "name": "Jil Teichmann",
        "serviceHoldPct": 67,
        "firstServeWonPct": 59,
        "secondServeWonPct": 55,
        "firstServePct": 68,
        "avgAces": 0.8,
        "avgDoubleFaults": 3,
        "avgWinners": 16,
        "avgUnforcedErrors": 27.5,
        "avgBreakPointsFaced": 7.1,
        "returnPointsWonPct": 46,
        "servicePointsWonPct": 58,
        "weakServeMatches": 6,
        "pressureMatches": 4,
        "matchesWithStats": 8,
        "weaknessScore": 22,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "first-serve points won below comfort (59%)",
          "negative winner/error balance (16.0 winners, 27.5 unforced)",
          "6 recent matches with serve instability"
        ],
        "strengths": [
          "second serve holds up (55%)",
          "creates return pressure (46% return points won)"
        ],
        "gameFlowRead": "Jil Teichmann can drop points quickly through first-serve points won below comfort (59%) and negative winner/error balance (16.0 winners, 27.5 unforced)."
      }
    },
    "setWinProjections": [
      {
        "name": "Jil Teichmann",
        "confidence": 42,
        "modelPct": 31,
        "label": "Thin set-win path"
      },
      {
        "name": "Karolina Muchova",
        "confidence": 77,
        "modelPct": 69,
        "label": "Live to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Karolina Muchova",
        "americanOdds": -950,
        "modelPct": 69,
        "impliedPct": 90.5,
        "edgePct": -21.5,
        "evPer100": -23.7,
        "netEvPer100": -25.7,
        "feePer100": 2,
        "valueIssue": "Favorite tax trap",
        "valueGrade": "Favorite tax trap",
        "betGrade": false
      },
      "spread": null,
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Jil Teichmann",
          "confidence": 42,
          "modelPct": 31,
          "label": "Thin set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Karolina Muchova",
          "confidence": 77,
          "modelPct": 69,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook browser scrape",
      "capturedAt": "2026-05-29T05:09:26.000Z",
      "players": [
        {
          "name": "Jil Teichmann",
          "odds": 610,
          "americanLabel": "+610",
          "impliedPct": 14.1,
          "decimalOdds": 7.1,
          "modelPct": 31,
          "edgePct": 16.9,
          "priceBand": "Underdog",
          "grossProfitPct": 610,
          "grossPayoutMultiple": 7.1,
          "centsAtRisk": 100,
          "centsProfitIfWin": 610
        },
        {
          "name": "Karolina Muchova",
          "odds": -950,
          "americanLabel": "-950",
          "impliedPct": 90.5,
          "decimalOdds": 1.105,
          "modelPct": 69,
          "edgePct": -21.5,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 10.5,
          "grossPayoutMultiple": 1.105,
          "centsAtRisk": 100,
          "centsProfitIfWin": 10.5
        }
      ],
      "desk": {
        "name": "Karolina Muchova",
        "odds": -950,
        "americanLabel": "-950",
        "impliedPct": 90.5,
        "decimalOdds": 1.105,
        "modelPct": 69,
        "edgePct": -21.5,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 10.5,
        "grossPayoutMultiple": 1.105,
        "centsAtRisk": 100,
        "centsProfitIfWin": 10.5
      },
      "spread": null,
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Jil Teichmann +610 / Karolina Muchova -950",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 69% vs FanDuel implied 90.5% (-21.5 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Jil-Teichmann-Vs-Karolina-Muchova/",
    "players": [
      {
        "name": "Jil Teichmann",
        "ranking": {
          "name": "Jil Teichmann",
          "rank": 173,
          "points": 422,
          "age": 28.8,
          "country": "SUI",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Jil Teichmann",
        "profile": "Live rank #173 | SUI | age 28.8 | 2026 clay 8-5, 62% | adj form 89 | hold 67%",
        "modelPct": 31,
        "weakness": {
          "name": "Jil Teichmann",
          "serviceHoldPct": 67,
          "firstServeWonPct": 59,
          "secondServeWonPct": 55,
          "firstServePct": 68,
          "avgAces": 0.8,
          "avgDoubleFaults": 3,
          "avgWinners": 16,
          "avgUnforcedErrors": 27.5,
          "avgBreakPointsFaced": 7.1,
          "returnPointsWonPct": 46,
          "servicePointsWonPct": 58,
          "weakServeMatches": 6,
          "pressureMatches": 4,
          "matchesWithStats": 8,
          "weaknessScore": 22,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "first-serve points won below comfort (59%)",
            "negative winner/error balance (16.0 winners, 27.5 unforced)",
            "6 recent matches with serve instability"
          ],
          "strengths": [
            "second serve holds up (55%)",
            "creates return pressure (46% return points won)"
          ],
          "gameFlowRead": "Jil Teichmann can drop points quickly through first-serve points won below comfort (59%) and negative winner/error balance (16.0 winners, 27.5 unforced)."
        }
      },
      {
        "name": "Karolina Muchova",
        "ranking": {
          "name": "Karolína Muchová",
          "rank": 10,
          "points": 3378,
          "age": 29.7,
          "country": "CZE",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Karolina Muchova",
        "profile": "Live rank #10 | CZE | age 29.7 | 2026 clay 6-2, 75% | adj form 78 | hold 70%",
        "modelPct": 69,
        "weakness": {
          "name": "Karolina Muchova",
          "serviceHoldPct": 70,
          "firstServeWonPct": 66,
          "secondServeWonPct": 45,
          "firstServePct": 67,
          "avgAces": 3.5,
          "avgDoubleFaults": 1.9,
          "avgWinners": 17,
          "avgUnforcedErrors": 21.5,
          "avgBreakPointsFaced": 7.8,
          "returnPointsWonPct": 44,
          "servicePointsWonPct": 59,
          "weakServeMatches": 4,
          "pressureMatches": 3,
          "matchesWithStats": 8,
          "weaknessScore": 13,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "4 recent matches with serve instability"
          ],
          "strengths": [],
          "gameFlowRead": "Karolina Muchova can drop points quickly through 4 recent matches with serve instability."
        }
      }
    ]
  },
  {
    "id": "rg-w-solana-sierra-sorana-cirstea-2026-05-29",
    "eventId": "175581",
    "tour": "WTA",
    "title": "Solana Sierra vs Sorana Cirstea",
    "start": "4:00 AM",
    "startMinutes": 240,
    "court": "Court 14",
    "round": "Round 3",
    "pickName": "Sorana Cirstea",
    "confidence": 61,
    "volatility": 45,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Watch only",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Sorana Cirstea has the recent service-hold edge 72% to 69%. Opponent-adjusted recent form is basically even: Sorana Cirstea 79, Solana Sierra 83. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": 6,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Sorana Cirstea",
        "serviceHoldPct": 72,
        "firstServeWonPct": 68,
        "secondServeWonPct": 50,
        "firstServePct": 58,
        "avgAces": 2.9,
        "avgDoubleFaults": 1.7,
        "avgWinners": 17,
        "avgUnforcedErrors": 20,
        "avgBreakPointsFaced": 5.9,
        "returnPointsWonPct": 48,
        "servicePointsWonPct": 61,
        "weakServeMatches": 3,
        "pressureMatches": 3,
        "matchesWithStats": 7,
        "weaknessScore": 7,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "3 recent matches with serve instability"
        ],
        "strengths": [
          "creates return pressure (48% return points won)"
        ],
        "gameFlowRead": "Sorana Cirstea can drop points quickly through 3 recent matches with serve instability."
      },
      "opponent": {
        "name": "Solana Sierra",
        "serviceHoldPct": 69,
        "firstServeWonPct": 63,
        "secondServeWonPct": 50,
        "firstServePct": 67,
        "avgAces": 1.6,
        "avgDoubleFaults": 3.4,
        "avgWinners": 28,
        "avgUnforcedErrors": 37.5,
        "avgBreakPointsFaced": 9.8,
        "returnPointsWonPct": 51,
        "servicePointsWonPct": 58,
        "weakServeMatches": 2,
        "pressureMatches": 4,
        "matchesWithStats": 5,
        "weaknessScore": 13,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "negative winner/error balance (28.0 winners, 37.5 unforced)",
          "faces too many break points (9.8 avg)"
        ],
        "strengths": [
          "creates return pressure (51% return points won)"
        ],
        "gameFlowRead": "Solana Sierra can drop points quickly through negative winner/error balance (28.0 winners, 37.5 unforced) and faces too many break points (9.8 avg)."
      }
    },
    "setWinProjections": [
      {
        "name": "Solana Sierra",
        "confidence": 53,
        "modelPct": 39,
        "label": "Needs early hold pressure"
      },
      {
        "name": "Sorana Cirstea",
        "confidence": 74,
        "modelPct": 61,
        "label": "Live to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Sorana Cirstea",
        "americanOdds": -360,
        "modelPct": 61,
        "impliedPct": 78.3,
        "edgePct": -17.3,
        "evPer100": -22.1,
        "netEvPer100": -24.1,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": null,
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Solana Sierra",
          "confidence": 53,
          "modelPct": 39,
          "label": "Needs early hold pressure",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Sorana Cirstea",
          "confidence": 74,
          "modelPct": 61,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook browser scrape",
      "capturedAt": "2026-05-29T05:09:26.000Z",
      "players": [
        {
          "name": "Solana Sierra",
          "odds": 285,
          "americanLabel": "+285",
          "impliedPct": 26,
          "decimalOdds": 3.85,
          "modelPct": 39,
          "edgePct": 13,
          "priceBand": "Underdog",
          "grossProfitPct": 285,
          "grossPayoutMultiple": 3.85,
          "centsAtRisk": 100,
          "centsProfitIfWin": 285
        },
        {
          "name": "Sorana Cirstea",
          "odds": -360,
          "americanLabel": "-360",
          "impliedPct": 78.3,
          "decimalOdds": 1.278,
          "modelPct": 61,
          "edgePct": -17.3,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 27.8,
          "grossPayoutMultiple": 1.278,
          "centsAtRisk": 100,
          "centsProfitIfWin": 27.8
        }
      ],
      "desk": {
        "name": "Sorana Cirstea",
        "odds": -360,
        "americanLabel": "-360",
        "impliedPct": 78.3,
        "decimalOdds": 1.278,
        "modelPct": 61,
        "edgePct": -17.3,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 27.8,
        "grossPayoutMultiple": 1.278,
        "centsAtRisk": 100,
        "centsProfitIfWin": 27.8
      },
      "spread": null,
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Solana Sierra +285 / Sorana Cirstea -360",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 61% vs FanDuel implied 78.3% (-17.3 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Solana-Sierra-Vs-Sorana-Cirstea/",
    "players": [
      {
        "name": "Solana Sierra",
        "ranking": {
          "name": "Solana Sierra",
          "rank": 59,
          "points": 1004,
          "age": 21.9,
          "country": "ARG",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Solana Sierra",
        "profile": "Live rank #59 | ARG | age 21.9 | 2026 clay 9-4, 69% | adj form 83 | hold 69%",
        "modelPct": 39,
        "weakness": {
          "name": "Solana Sierra",
          "serviceHoldPct": 69,
          "firstServeWonPct": 63,
          "secondServeWonPct": 50,
          "firstServePct": 67,
          "avgAces": 1.6,
          "avgDoubleFaults": 3.4,
          "avgWinners": 28,
          "avgUnforcedErrors": 37.5,
          "avgBreakPointsFaced": 9.8,
          "returnPointsWonPct": 51,
          "servicePointsWonPct": 58,
          "weakServeMatches": 2,
          "pressureMatches": 4,
          "matchesWithStats": 5,
          "weaknessScore": 13,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "negative winner/error balance (28.0 winners, 37.5 unforced)",
            "faces too many break points (9.8 avg)"
          ],
          "strengths": [
            "creates return pressure (51% return points won)"
          ],
          "gameFlowRead": "Solana Sierra can drop points quickly through negative winner/error balance (28.0 winners, 37.5 unforced) and faces too many break points (9.8 avg)."
        }
      },
      {
        "name": "Sorana Cirstea",
        "ranking": {
          "name": "Sorana Cîrstea",
          "rank": 18,
          "points": 1957,
          "age": 36.1,
          "country": "ROU",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Sorana Cirstea",
        "profile": "Live rank #18 | ROU | age 36.1 | 2026 clay 12-3, 80% | adj form 79 | hold 72%",
        "modelPct": 61,
        "weakness": {
          "name": "Sorana Cirstea",
          "serviceHoldPct": 72,
          "firstServeWonPct": 68,
          "secondServeWonPct": 50,
          "firstServePct": 58,
          "avgAces": 2.9,
          "avgDoubleFaults": 1.7,
          "avgWinners": 17,
          "avgUnforcedErrors": 20,
          "avgBreakPointsFaced": 5.9,
          "returnPointsWonPct": 48,
          "servicePointsWonPct": 61,
          "weakServeMatches": 3,
          "pressureMatches": 3,
          "matchesWithStats": 7,
          "weaknessScore": 7,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "3 recent matches with serve instability"
          ],
          "strengths": [
            "creates return pressure (48% return points won)"
          ],
          "gameFlowRead": "Sorana Cirstea can drop points quickly through 3 recent matches with serve instability."
        }
      }
    ]
  },
  {
    "id": "rg-w-mirra-andreeva-marie-bouzkova-2026-05-29",
    "eventId": "175557",
    "tour": "WTA",
    "title": "Mirra Andreeva vs Marie Bouzkova",
    "start": "4:30 AM",
    "startMinutes": 270,
    "court": "Court Philippe-Chatrier",
    "round": "Round 3",
    "pickName": "Mirra Andreeva",
    "confidence": 61,
    "volatility": 46,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Watch only",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Mirra Andreeva has the recent service-hold edge 78% to 75%. Mirra Andreeva grades 14 points better on opponent-adjusted recent form. Lean, not a chase.",
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
        "name": "Mirra Andreeva",
        "serviceHoldPct": 78,
        "firstServeWonPct": 68,
        "secondServeWonPct": 53,
        "firstServePct": 65,
        "avgAces": 2.5,
        "avgDoubleFaults": 3.1,
        "avgWinners": 21.5,
        "avgUnforcedErrors": 34,
        "avgBreakPointsFaced": 6.8,
        "returnPointsWonPct": 47,
        "servicePointsWonPct": 63,
        "weakServeMatches": 1,
        "pressureMatches": 4,
        "matchesWithStats": 8,
        "weaknessScore": 7,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "negative winner/error balance (21.5 winners, 34.0 unforced)"
        ],
        "strengths": [
          "protects serve well (78% hold)",
          "creates return pressure (47% return points won)"
        ],
        "gameFlowRead": "Mirra Andreeva can drop points quickly through negative winner/error balance (21.5 winners, 34.0 unforced)."
      },
      "opponent": {
        "name": "Marie Bouzkova",
        "serviceHoldPct": 75,
        "firstServeWonPct": 65,
        "secondServeWonPct": 49,
        "firstServePct": 69,
        "avgAces": 0.3,
        "avgDoubleFaults": 3.2,
        "avgWinners": 23,
        "avgUnforcedErrors": 16,
        "avgBreakPointsFaced": 4.7,
        "returnPointsWonPct": 50,
        "servicePointsWonPct": 60,
        "weakServeMatches": 3,
        "pressureMatches": 3,
        "matchesWithStats": 6,
        "weaknessScore": 7,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "3 recent matches with serve instability"
        ],
        "strengths": [
          "positive winner/error balance (23.0 winners, 16.0 unforced)",
          "creates return pressure (50% return points won)"
        ],
        "gameFlowRead": "Marie Bouzkova can drop points quickly through 3 recent matches with serve instability."
      }
    },
    "setWinProjections": [
      {
        "name": "Mirra Andreeva",
        "confidence": 74,
        "modelPct": 61,
        "label": "Live to win a set"
      },
      {
        "name": "Marie Bouzkova",
        "confidence": 53,
        "modelPct": 39,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Mirra Andreeva",
        "americanOdds": -800,
        "modelPct": 61,
        "impliedPct": 88.9,
        "edgePct": -27.9,
        "evPer100": -31.4,
        "netEvPer100": -33.4,
        "feePer100": 2,
        "valueIssue": "Favorite tax trap",
        "valueGrade": "Favorite tax trap",
        "betGrade": false
      },
      "spread": null,
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Mirra Andreeva",
          "confidence": 74,
          "modelPct": 61,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Marie Bouzkova",
          "confidence": 53,
          "modelPct": 39,
          "label": "Needs early hold pressure",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook browser scrape",
      "capturedAt": "2026-05-29T05:09:26.000Z",
      "players": [
        {
          "name": "Mirra Andreeva",
          "odds": -800,
          "americanLabel": "-800",
          "impliedPct": 88.9,
          "decimalOdds": 1.125,
          "modelPct": 61,
          "edgePct": -27.9,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 12.5,
          "grossPayoutMultiple": 1.125,
          "centsAtRisk": 100,
          "centsProfitIfWin": 12.5
        },
        {
          "name": "Marie Bouzkova",
          "odds": 530,
          "americanLabel": "+530",
          "impliedPct": 15.9,
          "decimalOdds": 6.3,
          "modelPct": 39,
          "edgePct": 23.1,
          "priceBand": "Underdog",
          "grossProfitPct": 530,
          "grossPayoutMultiple": 6.3,
          "centsAtRisk": 100,
          "centsProfitIfWin": 530
        }
      ],
      "desk": {
        "name": "Mirra Andreeva",
        "odds": -800,
        "americanLabel": "-800",
        "impliedPct": 88.9,
        "decimalOdds": 1.125,
        "modelPct": 61,
        "edgePct": -27.9,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 12.5,
        "grossPayoutMultiple": 1.125,
        "centsAtRisk": 100,
        "centsProfitIfWin": 12.5
      },
      "spread": null,
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Mirra Andreeva -800 / Marie Bouzkova +530",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 61% vs FanDuel implied 88.9% (-27.9 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Mirra-Andreeva-Vs-Marie-Bouzkova/",
    "players": [
      {
        "name": "Mirra Andreeva",
        "ranking": {
          "name": "Mirra Andreeva",
          "rank": 8,
          "points": 3821,
          "age": 19,
          "country": "RUS",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Mirra Andreeva",
        "profile": "Live rank #8 | RUS | age 19 | 2026 clay 17-3, 85% | adj form 81 | hold 78%",
        "modelPct": 61,
        "weakness": {
          "name": "Mirra Andreeva",
          "serviceHoldPct": 78,
          "firstServeWonPct": 68,
          "secondServeWonPct": 53,
          "firstServePct": 65,
          "avgAces": 2.5,
          "avgDoubleFaults": 3.1,
          "avgWinners": 21.5,
          "avgUnforcedErrors": 34,
          "avgBreakPointsFaced": 6.8,
          "returnPointsWonPct": 47,
          "servicePointsWonPct": 63,
          "weakServeMatches": 1,
          "pressureMatches": 4,
          "matchesWithStats": 8,
          "weaknessScore": 7,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "negative winner/error balance (21.5 winners, 34.0 unforced)"
          ],
          "strengths": [
            "protects serve well (78% hold)",
            "creates return pressure (47% return points won)"
          ],
          "gameFlowRead": "Mirra Andreeva can drop points quickly through negative winner/error balance (21.5 winners, 34.0 unforced)."
        }
      },
      {
        "name": "Marie Bouzkova",
        "ranking": {
          "name": "Marie Bouzková",
          "rank": 27,
          "points": 1571,
          "age": 27.8,
          "country": "CZE",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Marie Bouzkova",
        "profile": "Live rank #27 | CZE | age 27.8 | 2026 clay 9-3, 75% | adj form 67 | hold 75%",
        "modelPct": 39,
        "weakness": {
          "name": "Marie Bouzkova",
          "serviceHoldPct": 75,
          "firstServeWonPct": 65,
          "secondServeWonPct": 49,
          "firstServePct": 69,
          "avgAces": 0.3,
          "avgDoubleFaults": 3.2,
          "avgWinners": 23,
          "avgUnforcedErrors": 16,
          "avgBreakPointsFaced": 4.7,
          "returnPointsWonPct": 50,
          "servicePointsWonPct": 60,
          "weakServeMatches": 3,
          "pressureMatches": 3,
          "matchesWithStats": 6,
          "weaknessScore": 7,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "3 recent matches with serve instability"
          ],
          "strengths": [
            "positive winner/error balance (23.0 winners, 16.0 unforced)",
            "creates return pressure (50% return points won)"
          ],
          "gameFlowRead": "Marie Bouzkova can drop points quickly through 3 recent matches with serve instability."
        }
      }
    ]
  },
  {
    "id": "rg-m-alex-de-minaur-jakub-mensik-2026-05-29",
    "eventId": "175709",
    "tour": "ATP",
    "title": "Alex de Minaur vs Jakub Mensik",
    "start": "5:30 AM",
    "startMinutes": 330,
    "court": "Court Simonne-Mathieu",
    "round": "Round 3",
    "pickName": "Alex de Minaur",
    "confidence": 55,
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
    "reason": "Jakub Mensik has the recent service-hold edge 83% to 72%, so Alex de Minaur needs the rank/form edge to show up on return games. Jakub Mensik grades 8 points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": -4,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Alex de Minaur",
        "serviceHoldPct": 72,
        "firstServeWonPct": 65,
        "secondServeWonPct": 52,
        "firstServePct": 57,
        "avgAces": 2,
        "avgDoubleFaults": 3,
        "avgWinners": 19.3,
        "avgUnforcedErrors": 33.8,
        "avgBreakPointsFaced": 11,
        "returnPointsWonPct": 42,
        "servicePointsWonPct": 60,
        "weakServeMatches": 2,
        "pressureMatches": 5,
        "matchesWithStats": 7,
        "weaknessScore": 17,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "negative winner/error balance (19.3 winners, 33.8 unforced)",
          "faces too many break points (11.0 avg)"
        ],
        "strengths": [],
        "gameFlowRead": "Alex de Minaur can drop points quickly through negative winner/error balance (19.3 winners, 33.8 unforced) and faces too many break points (11.0 avg)."
      },
      "opponent": {
        "name": "Jakub Mensik",
        "serviceHoldPct": 83,
        "firstServeWonPct": 78,
        "secondServeWonPct": 51,
        "firstServePct": 58,
        "avgAces": 7.6,
        "avgDoubleFaults": 3.5,
        "avgWinners": 28.7,
        "avgUnforcedErrors": 31.6,
        "avgBreakPointsFaced": 5.8,
        "returnPointsWonPct": 35,
        "servicePointsWonPct": 66,
        "weakServeMatches": 3,
        "pressureMatches": 6,
        "matchesWithStats": 8,
        "weaknessScore": 13,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "3 recent matches with serve instability",
          "limited return pressure (35% return points won)"
        ],
        "strengths": [
          "protects serve well (83% hold)",
          "wins enough first-serve points (78%)"
        ],
        "gameFlowRead": "Jakub Mensik can drop points quickly through 3 recent matches with serve instability and limited return pressure (35% return points won)."
      }
    },
    "setWinProjections": [
      {
        "name": "Alex de Minaur",
        "confidence": 83,
        "modelPct": 55,
        "label": "Strong set-win path"
      },
      {
        "name": "Jakub Mensik",
        "confidence": 73,
        "modelPct": 45,
        "label": "Live to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Alex de Minaur",
        "americanOdds": -430,
        "modelPct": 55,
        "impliedPct": 81.1,
        "edgePct": -26.1,
        "evPer100": -32.2,
        "netEvPer100": -34.2,
        "feePer100": 2,
        "valueIssue": "Favorite tax trap",
        "valueGrade": "Favorite tax trap",
        "betGrade": false
      },
      "spread": null,
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Alex de Minaur",
          "confidence": 83,
          "modelPct": 55,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Jakub Mensik",
          "confidence": 73,
          "modelPct": 45,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook browser scrape",
      "capturedAt": "2026-05-29T05:09:26.000Z",
      "players": [
        {
          "name": "Alex de Minaur",
          "odds": -430,
          "americanLabel": "-430",
          "impliedPct": 81.1,
          "decimalOdds": 1.233,
          "modelPct": 55,
          "edgePct": -26.1,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 23.3,
          "grossPayoutMultiple": 1.233,
          "centsAtRisk": 100,
          "centsProfitIfWin": 23.3
        },
        {
          "name": "Jakub Mensik",
          "odds": 330,
          "americanLabel": "+330",
          "impliedPct": 23.3,
          "decimalOdds": 4.3,
          "modelPct": 45,
          "edgePct": 21.7,
          "priceBand": "Underdog",
          "grossProfitPct": 330,
          "grossPayoutMultiple": 4.3,
          "centsAtRisk": 100,
          "centsProfitIfWin": 330
        }
      ],
      "desk": {
        "name": "Alex de Minaur",
        "odds": -430,
        "americanLabel": "-430",
        "impliedPct": 81.1,
        "decimalOdds": 1.233,
        "modelPct": 55,
        "edgePct": -26.1,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 23.3,
        "grossPayoutMultiple": 1.233,
        "centsAtRisk": 100,
        "centsProfitIfWin": 23.3
      },
      "spread": null,
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Alex de Minaur -430 / Jakub Mensik +330",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 55% vs FanDuel implied 81.1% (-26.1 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Alex-de-Minaur-Vs-Jakub-Mensik/",
    "players": [
      {
        "name": "Alex de Minaur",
        "ranking": {
          "name": "Alex de Minaur",
          "rank": 6,
          "points": 3905,
          "age": 27.2,
          "country": "AUS",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Alex De Minaur",
        "profile": "Live rank #6 | AUS | age 27.2 | 2026 clay 7-5, 58% | adj form 66 | hold 72%",
        "modelPct": 55,
        "weakness": {
          "name": "Alex de Minaur",
          "serviceHoldPct": 72,
          "firstServeWonPct": 65,
          "secondServeWonPct": 52,
          "firstServePct": 57,
          "avgAces": 2,
          "avgDoubleFaults": 3,
          "avgWinners": 19.3,
          "avgUnforcedErrors": 33.8,
          "avgBreakPointsFaced": 11,
          "returnPointsWonPct": 42,
          "servicePointsWonPct": 60,
          "weakServeMatches": 2,
          "pressureMatches": 5,
          "matchesWithStats": 7,
          "weaknessScore": 17,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "negative winner/error balance (19.3 winners, 33.8 unforced)",
            "faces too many break points (11.0 avg)"
          ],
          "strengths": [],
          "gameFlowRead": "Alex de Minaur can drop points quickly through negative winner/error balance (19.3 winners, 33.8 unforced) and faces too many break points (11.0 avg)."
        }
      },
      {
        "name": "Jakub Mensik",
        "ranking": {
          "name": "Jakub Menšík",
          "rank": 27,
          "points": 1550,
          "age": 20.7,
          "country": "CZE",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Jakub Mensik",
        "profile": "Live rank #27 | CZE | age 20.7 | 2026 clay 5-3, 63% | adj form 75 | hold 83%",
        "modelPct": 45,
        "weakness": {
          "name": "Jakub Mensik",
          "serviceHoldPct": 83,
          "firstServeWonPct": 78,
          "secondServeWonPct": 51,
          "firstServePct": 58,
          "avgAces": 7.6,
          "avgDoubleFaults": 3.5,
          "avgWinners": 28.7,
          "avgUnforcedErrors": 31.6,
          "avgBreakPointsFaced": 5.8,
          "returnPointsWonPct": 35,
          "servicePointsWonPct": 66,
          "weakServeMatches": 3,
          "pressureMatches": 6,
          "matchesWithStats": 8,
          "weaknessScore": 13,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "3 recent matches with serve instability",
            "limited return pressure (35% return points won)"
          ],
          "strengths": [
            "protects serve well (83% hold)",
            "wins enough first-serve points (78%)"
          ],
          "gameFlowRead": "Jakub Mensik can drop points quickly through 3 recent matches with serve instability and limited return pressure (35% return points won)."
        }
      }
    ]
  },
  {
    "id": "rg-w-elina-svitolina-tamara-korpatsch-2026-05-29",
    "eventId": "175537",
    "tour": "WTA",
    "title": "Elina Svitolina vs Tamara Korpatsch",
    "start": "5:30 AM",
    "startMinutes": 330,
    "court": "Court Suzanne-Lenglen",
    "round": "Round 3",
    "pickName": "Elina Svitolina",
    "confidence": 69,
    "volatility": 35,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Lean",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Elina Svitolina has the recent service-hold edge 75% to 63%. Elina Svitolina grades 26 points better on opponent-adjusted recent form. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness edge",
      "target": "Tamara Korpatsch",
      "scoreGap": 14,
      "attackingSide": "Elina Svitolina",
      "vulnerableSide": "Tamara Korpatsch",
      "gameFlow": "Elina Svitolina has a real path if Tamara Korpatsch's first two service games show the same weakness: first-serve points won below comfort (61%); negative winner/error balance (23.0 winners, 34.5 unforced).",
      "liveTrigger": "Look for Tamara Korpatsch facing break points or second-serve pressure before 3-3.",
      "spreadRead": "Elina Svitolina spread only if the handicap is short and Tamara Korpatsch is under pressure early.",
      "totalRead": "Avoid low unders if Tamara Korpatsch faces early break points or second-serve pressure.",
      "pick": {
        "name": "Elina Svitolina",
        "serviceHoldPct": 75,
        "firstServeWonPct": 66,
        "secondServeWonPct": 48,
        "firstServePct": 63,
        "avgAces": 2.4,
        "avgDoubleFaults": 3,
        "avgWinners": 29.5,
        "avgUnforcedErrors": 29.5,
        "avgBreakPointsFaced": 11.6,
        "returnPointsWonPct": 51,
        "servicePointsWonPct": 60,
        "weakServeMatches": 3,
        "pressureMatches": 4,
        "matchesWithStats": 8,
        "weaknessScore": 14,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "faces too many break points (11.6 avg)",
          "3 recent matches with serve instability"
        ],
        "strengths": [
          "creates return pressure (51% return points won)"
        ],
        "gameFlowRead": "Elina Svitolina can drop points quickly through faces too many break points (11.6 avg) and 3 recent matches with serve instability."
      },
      "opponent": {
        "name": "Tamara Korpatsch",
        "serviceHoldPct": 63,
        "firstServeWonPct": 61,
        "secondServeWonPct": 46,
        "firstServePct": 65,
        "avgAces": 1.2,
        "avgDoubleFaults": 3.6,
        "avgWinners": 23,
        "avgUnforcedErrors": 34.5,
        "avgBreakPointsFaced": 12.2,
        "returnPointsWonPct": 47,
        "servicePointsWonPct": 55,
        "weakServeMatches": 2,
        "pressureMatches": 6,
        "matchesWithStats": 5,
        "weaknessScore": 28,
        "firstGameComfort": "Fragile opening-service profile",
        "liabilities": [
          "first-serve points won below comfort (61%)",
          "negative winner/error balance (23.0 winners, 34.5 unforced)",
          "faces too many break points (12.2 avg)"
        ],
        "strengths": [
          "creates return pressure (47% return points won)"
        ],
        "gameFlowRead": "Tamara Korpatsch can drop points quickly through first-serve points won below comfort (61%) and negative winner/error balance (23.0 winners, 34.5 unforced)."
      }
    },
    "setWinProjections": [
      {
        "name": "Elina Svitolina",
        "confidence": 77,
        "modelPct": 69,
        "label": "Live to win a set"
      },
      {
        "name": "Tamara Korpatsch",
        "confidence": 41,
        "modelPct": 31,
        "label": "Thin set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Elina Svitolina",
        "americanOdds": -2800,
        "modelPct": 69,
        "impliedPct": 96.6,
        "edgePct": -27.6,
        "evPer100": -28.5,
        "netEvPer100": -30.5,
        "feePer100": 2,
        "valueIssue": "Favorite tax trap",
        "valueGrade": "Favorite tax trap",
        "betGrade": false
      },
      "spread": null,
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Elina Svitolina",
          "confidence": 77,
          "modelPct": 69,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Tamara Korpatsch",
          "confidence": 41,
          "modelPct": 31,
          "label": "Thin set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook browser scrape",
      "capturedAt": "2026-05-29T05:09:26.000Z",
      "players": [
        {
          "name": "Elina Svitolina",
          "odds": -2800,
          "americanLabel": "-2800",
          "impliedPct": 96.6,
          "decimalOdds": 1.036,
          "modelPct": 69,
          "edgePct": -27.6,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 3.6,
          "grossPayoutMultiple": 1.036,
          "centsAtRisk": 100,
          "centsProfitIfWin": 3.6
        },
        {
          "name": "Tamara Korpatsch",
          "odds": 1160,
          "americanLabel": "+1160",
          "impliedPct": 7.9,
          "decimalOdds": 12.6,
          "modelPct": 31,
          "edgePct": 23.1,
          "priceBand": "Underdog",
          "grossProfitPct": 1160,
          "grossPayoutMultiple": 12.6,
          "centsAtRisk": 100,
          "centsProfitIfWin": 1160
        }
      ],
      "desk": {
        "name": "Elina Svitolina",
        "odds": -2800,
        "americanLabel": "-2800",
        "impliedPct": 96.6,
        "decimalOdds": 1.036,
        "modelPct": 69,
        "edgePct": -27.6,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 3.6,
        "grossPayoutMultiple": 1.036,
        "centsAtRisk": 100,
        "centsProfitIfWin": 3.6
      },
      "spread": null,
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Elina Svitolina -2800 / Tamara Korpatsch +1160",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 69% vs FanDuel implied 96.6% (-27.6 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Elina-Svitolina-Vs-Tamara-Korpatsch/",
    "players": [
      {
        "name": "Elina Svitolina",
        "ranking": {
          "name": "Elina Svitolina",
          "rank": 7,
          "points": 3955,
          "age": 31.7,
          "country": "UKR",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Elina Svitolina",
        "profile": "Live rank #7 | UKR | age 31.7 | 2026 clay 11-2, 85% | adj form 110 | hold 75%",
        "modelPct": 69,
        "weakness": {
          "name": "Elina Svitolina",
          "serviceHoldPct": 75,
          "firstServeWonPct": 66,
          "secondServeWonPct": 48,
          "firstServePct": 63,
          "avgAces": 2.4,
          "avgDoubleFaults": 3,
          "avgWinners": 29.5,
          "avgUnforcedErrors": 29.5,
          "avgBreakPointsFaced": 11.6,
          "returnPointsWonPct": 51,
          "servicePointsWonPct": 60,
          "weakServeMatches": 3,
          "pressureMatches": 4,
          "matchesWithStats": 8,
          "weaknessScore": 14,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "faces too many break points (11.6 avg)",
            "3 recent matches with serve instability"
          ],
          "strengths": [
            "creates return pressure (51% return points won)"
          ],
          "gameFlowRead": "Elina Svitolina can drop points quickly through faces too many break points (11.6 avg) and 3 recent matches with serve instability."
        }
      },
      {
        "name": "Tamara Korpatsch",
        "ranking": {
          "name": "Tamara Korpatsch",
          "rank": 85,
          "points": 859,
          "age": 31,
          "country": "GER",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Tamara Korpatsch",
        "profile": "Live rank #85 | GER | age 31 | 2026 clay 15-7, 68% | adj form 84 | hold 63%",
        "modelPct": 31,
        "weakness": {
          "name": "Tamara Korpatsch",
          "serviceHoldPct": 63,
          "firstServeWonPct": 61,
          "secondServeWonPct": 46,
          "firstServePct": 65,
          "avgAces": 1.2,
          "avgDoubleFaults": 3.6,
          "avgWinners": 23,
          "avgUnforcedErrors": 34.5,
          "avgBreakPointsFaced": 12.2,
          "returnPointsWonPct": 47,
          "servicePointsWonPct": 55,
          "weakServeMatches": 2,
          "pressureMatches": 6,
          "matchesWithStats": 5,
          "weaknessScore": 28,
          "firstGameComfort": "Fragile opening-service profile",
          "liabilities": [
            "first-serve points won below comfort (61%)",
            "negative winner/error balance (23.0 winners, 34.5 unforced)",
            "faces too many break points (12.2 avg)"
          ],
          "strengths": [
            "creates return pressure (47% return points won)"
          ],
          "gameFlowRead": "Tamara Korpatsch can drop points quickly through first-serve points won below comfort (61%) and negative winner/error balance (23.0 winners, 34.5 unforced)."
        }
      }
    ]
  },
  {
    "id": "rg-m-karen-khachanov-jesper-de-jong-2026-05-29",
    "eventId": "175753",
    "tour": "ATP",
    "title": "Karen Khachanov vs Jesper de Jong",
    "start": "5:30 AM",
    "startMinutes": 330,
    "court": "Court 14",
    "round": "Round 3",
    "pickName": "Karen Khachanov",
    "confidence": 66,
    "volatility": 34,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Lean",
      "No blind bet",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Karen Khachanov has the recent service-hold edge 82% to 75%. Karen Khachanov grades 6 points better on opponent-adjusted recent form. Lean, not a chase.",
    "totals": "Best O/U angle: over if the book hangs a low best-of-five number, because both recent hold profiles can extend sets.",
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
        "name": "Karen Khachanov",
        "serviceHoldPct": 82,
        "firstServeWonPct": 71,
        "secondServeWonPct": 51,
        "firstServePct": 66,
        "avgAces": 5.6,
        "avgDoubleFaults": 1,
        "avgWinners": 27,
        "avgUnforcedErrors": 32.4,
        "avgBreakPointsFaced": 9,
        "returnPointsWonPct": 39,
        "servicePointsWonPct": 64,
        "weakServeMatches": 1,
        "pressureMatches": 7,
        "matchesWithStats": 7,
        "weaknessScore": 12,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "faces too many break points (9.0 avg)"
        ],
        "strengths": [
          "protects serve well (82% hold)",
          "wins enough first-serve points (71%)"
        ],
        "gameFlowRead": "Karen Khachanov can drop points quickly through faces too many break points (9.0 avg)."
      },
      "opponent": {
        "name": "Jesper de Jong",
        "serviceHoldPct": 75,
        "firstServeWonPct": 67,
        "secondServeWonPct": 51,
        "firstServePct": 62,
        "avgAces": 7,
        "avgDoubleFaults": 3.5,
        "avgWinners": 32,
        "avgUnforcedErrors": 30.7,
        "avgBreakPointsFaced": 9.8,
        "returnPointsWonPct": 38,
        "servicePointsWonPct": 61,
        "weakServeMatches": 1,
        "pressureMatches": 6,
        "matchesWithStats": 6,
        "weaknessScore": 12,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "faces too many break points (9.8 avg)",
          "limited return pressure (38% return points won)"
        ],
        "strengths": [],
        "gameFlowRead": "Jesper de Jong can drop points quickly through faces too many break points (9.8 avg) and limited return pressure (38% return points won)."
      }
    },
    "setWinProjections": [
      {
        "name": "Karen Khachanov",
        "confidence": 87,
        "modelPct": 66,
        "label": "Strong set-win path"
      },
      {
        "name": "Jesper de Jong",
        "confidence": 62,
        "modelPct": 34,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Karen Khachanov",
        "americanOdds": -295,
        "modelPct": 66,
        "impliedPct": 74.7,
        "edgePct": -8.7,
        "evPer100": -11.6,
        "netEvPer100": -13.6,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": null,
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Karen Khachanov",
          "confidence": 87,
          "modelPct": 66,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Jesper de Jong",
          "confidence": 62,
          "modelPct": 34,
          "label": "Needs early hold pressure",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook browser scrape",
      "capturedAt": "2026-05-29T05:09:26.000Z",
      "players": [
        {
          "name": "Karen Khachanov",
          "odds": -295,
          "americanLabel": "-295",
          "impliedPct": 74.7,
          "decimalOdds": 1.339,
          "modelPct": 66,
          "edgePct": -8.7,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 33.9,
          "grossPayoutMultiple": 1.339,
          "centsAtRisk": 100,
          "centsProfitIfWin": 33.9
        },
        {
          "name": "Jesper de Jong",
          "odds": 235,
          "americanLabel": "+235",
          "impliedPct": 29.9,
          "decimalOdds": 3.35,
          "modelPct": 34,
          "edgePct": 4.1,
          "priceBand": "Underdog",
          "grossProfitPct": 235,
          "grossPayoutMultiple": 3.35,
          "centsAtRisk": 100,
          "centsProfitIfWin": 235
        }
      ],
      "desk": {
        "name": "Karen Khachanov",
        "odds": -295,
        "americanLabel": "-295",
        "impliedPct": 74.7,
        "decimalOdds": 1.339,
        "modelPct": 66,
        "edgePct": -8.7,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 33.9,
        "grossPayoutMultiple": 1.339,
        "centsAtRisk": 100,
        "centsProfitIfWin": 33.9
      },
      "spread": null,
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Karen Khachanov -295 / Jesper de Jong +235",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 66% vs FanDuel implied 74.7% (-8.7 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Karen-Khachanov-Vs-Jesper-de-Jong/",
    "players": [
      {
        "name": "Karen Khachanov",
        "ranking": {
          "name": "Karen Khachanov",
          "rank": 17,
          "points": 2270,
          "age": 30,
          "country": "RUS",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Karen Khachanov",
        "profile": "Live rank #17 | RUS | age 30 | 2026 clay 7-5, 58% | adj form 90 | hold 82%",
        "modelPct": 66,
        "weakness": {
          "name": "Karen Khachanov",
          "serviceHoldPct": 82,
          "firstServeWonPct": 71,
          "secondServeWonPct": 51,
          "firstServePct": 66,
          "avgAces": 5.6,
          "avgDoubleFaults": 1,
          "avgWinners": 27,
          "avgUnforcedErrors": 32.4,
          "avgBreakPointsFaced": 9,
          "returnPointsWonPct": 39,
          "servicePointsWonPct": 64,
          "weakServeMatches": 1,
          "pressureMatches": 7,
          "matchesWithStats": 7,
          "weaknessScore": 12,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "faces too many break points (9.0 avg)"
          ],
          "strengths": [
            "protects serve well (82% hold)",
            "wins enough first-serve points (71%)"
          ],
          "gameFlowRead": "Karen Khachanov can drop points quickly through faces too many break points (9.0 avg)."
        }
      },
      {
        "name": "Jesper de Jong",
        "ranking": {
          "name": "Jesper de Jong",
          "rank": 102,
          "points": 596,
          "age": 25.9,
          "country": "NED",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Jesper De Jong",
        "profile": "Live rank #102 | NED | age 25.9 | 2026 clay 13-9, 59% | adj form 84 | hold 75%",
        "modelPct": 34,
        "weakness": {
          "name": "Jesper de Jong",
          "serviceHoldPct": 75,
          "firstServeWonPct": 67,
          "secondServeWonPct": 51,
          "firstServePct": 62,
          "avgAces": 7,
          "avgDoubleFaults": 3.5,
          "avgWinners": 32,
          "avgUnforcedErrors": 30.7,
          "avgBreakPointsFaced": 9.8,
          "returnPointsWonPct": 38,
          "servicePointsWonPct": 61,
          "weakServeMatches": 1,
          "pressureMatches": 6,
          "matchesWithStats": 6,
          "weaknessScore": 12,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "faces too many break points (9.8 avg)",
            "limited return pressure (38% return points won)"
          ],
          "strengths": [],
          "gameFlowRead": "Jesper de Jong can drop points quickly through faces too many break points (9.8 avg) and limited return pressure (38% return points won)."
        }
      }
    ]
  },
  {
    "id": "rg-m-joao-fonseca-novak-djokovic-2026-05-29",
    "eventId": "175730",
    "tour": "ATP",
    "title": "Joao Fonseca vs Novak Djokovic",
    "start": "6:30 AM",
    "startMinutes": 390,
    "court": "",
    "round": "Round 3",
    "pickName": "Novak Djokovic",
    "confidence": 60,
    "volatility": 40,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Watch only",
      "No blind bet",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Recent service hold is close: Novak Djokovic 85%, Joao Fonseca 87%. Novak Djokovic grades 13 points better on opponent-adjusted recent form. Lean, not a chase.",
    "totals": "Best O/U angle: over if the book hangs a low best-of-five number, because both recent hold profiles can extend sets.",
    "weaknessEdge": {
      "edgeType": "Weakness warning",
      "target": "Novak Djokovic",
      "scoreGap": -11,
      "attackingSide": null,
      "vulnerableSide": "Novak Djokovic",
      "gameFlow": "Novak Djokovic is the model side, but the fragile profile is on our pick: double-fault pressure (4.2 avg). Avoid laying a bad price until early holds are confirmed.",
      "liveTrigger": "Do not upgrade Novak Djokovic unless they hold cleanly in the first service game and keep double faults down.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Novak Djokovic",
        "serviceHoldPct": 85,
        "firstServeWonPct": 76,
        "secondServeWonPct": 56,
        "firstServePct": 67,
        "avgAces": 6.6,
        "avgDoubleFaults": 4.2,
        "avgWinners": 33.4,
        "avgUnforcedErrors": 27.4,
        "avgBreakPointsFaced": 5.4,
        "returnPointsWonPct": 38,
        "servicePointsWonPct": 70,
        "weakServeMatches": 2,
        "pressureMatches": 8,
        "matchesWithStats": 5,
        "weaknessScore": 16,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "double-fault pressure (4.2 avg)"
        ],
        "strengths": [
          "protects serve well (85% hold)",
          "wins enough first-serve points (76%)",
          "second serve holds up (56%)",
          "positive winner/error balance (33.4 winners, 27.4 unforced)"
        ],
        "gameFlowRead": "Novak Djokovic can drop points quickly through double-fault pressure (4.2 avg)."
      },
      "opponent": {
        "name": "Joao Fonseca",
        "serviceHoldPct": 87,
        "firstServeWonPct": 71,
        "secondServeWonPct": 62,
        "firstServePct": 66,
        "avgAces": 3.7,
        "avgDoubleFaults": 1.1,
        "avgWinners": 25.3,
        "avgUnforcedErrors": 24,
        "avgBreakPointsFaced": 6,
        "returnPointsWonPct": 37,
        "servicePointsWonPct": 68,
        "weakServeMatches": 0,
        "pressureMatches": 6,
        "matchesWithStats": 8,
        "weaknessScore": 5,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "limited return pressure (37% return points won)"
        ],
        "strengths": [
          "protects serve well (87% hold)",
          "wins enough first-serve points (71%)",
          "second serve holds up (62%)"
        ],
        "gameFlowRead": "Joao Fonseca can drop points quickly through limited return pressure (37% return points won)."
      }
    },
    "setWinProjections": [
      {
        "name": "Joao Fonseca",
        "confidence": 69,
        "modelPct": 40,
        "label": "Live to win a set"
      },
      {
        "name": "Novak Djokovic",
        "confidence": 85,
        "modelPct": 60,
        "label": "Strong set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Novak Djokovic",
        "americanOdds": -220,
        "modelPct": 60,
        "impliedPct": 68.8,
        "edgePct": -8.8,
        "evPer100": -12.7,
        "netEvPer100": -14.7,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": null,
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Joao Fonseca",
          "confidence": 69,
          "modelPct": 40,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Novak Djokovic",
          "confidence": 85,
          "modelPct": 60,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook browser scrape",
      "capturedAt": "2026-05-29T05:09:26.000Z",
      "players": [
        {
          "name": "Joao Fonseca",
          "odds": 180,
          "americanLabel": "+180",
          "impliedPct": 35.7,
          "decimalOdds": 2.8,
          "modelPct": 40,
          "edgePct": 4.3,
          "priceBand": "Underdog",
          "grossProfitPct": 180,
          "grossPayoutMultiple": 2.8,
          "centsAtRisk": 100,
          "centsProfitIfWin": 180
        },
        {
          "name": "Novak Djokovic",
          "odds": -220,
          "americanLabel": "-220",
          "impliedPct": 68.8,
          "decimalOdds": 1.455,
          "modelPct": 60,
          "edgePct": -8.8,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 45.5,
          "grossPayoutMultiple": 1.455,
          "centsAtRisk": 100,
          "centsProfitIfWin": 45.5
        }
      ],
      "desk": {
        "name": "Novak Djokovic",
        "odds": -220,
        "americanLabel": "-220",
        "impliedPct": 68.8,
        "decimalOdds": 1.455,
        "modelPct": 60,
        "edgePct": -8.8,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 45.5,
        "grossPayoutMultiple": 1.455,
        "centsAtRisk": 100,
        "centsProfitIfWin": 45.5
      },
      "spread": null,
      "priceAction": "FanDuel price is richer than the model; pass ML unless live state improves.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Joao Fonseca +180 / Novak Djokovic -220",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. FanDuel price is richer than the model; pass ML unless live state improves.",
      "noVigNote": "Model 60% vs FanDuel implied 68.8% (-8.8 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Joao-Fonseca-Vs-Novak-Djokovic/",
    "players": [
      {
        "name": "Joao Fonseca",
        "ranking": {
          "name": "João Fonseca",
          "rank": 30,
          "points": 1385,
          "age": 19.7,
          "country": "BRA",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Joao Fonseca",
        "profile": "Live rank #30 | BRA | age 19.7 | 2026 clay 8-6, 57% | adj form 71 | hold 87%",
        "modelPct": 40,
        "weakness": {
          "name": "Joao Fonseca",
          "serviceHoldPct": 87,
          "firstServeWonPct": 71,
          "secondServeWonPct": 62,
          "firstServePct": 66,
          "avgAces": 3.7,
          "avgDoubleFaults": 1.1,
          "avgWinners": 25.3,
          "avgUnforcedErrors": 24,
          "avgBreakPointsFaced": 6,
          "returnPointsWonPct": 37,
          "servicePointsWonPct": 68,
          "weakServeMatches": 0,
          "pressureMatches": 6,
          "matchesWithStats": 8,
          "weaknessScore": 5,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "limited return pressure (37% return points won)"
          ],
          "strengths": [
            "protects serve well (87% hold)",
            "wins enough first-serve points (71%)",
            "second serve holds up (62%)"
          ],
          "gameFlowRead": "Joao Fonseca can drop points quickly through limited return pressure (37% return points won)."
        }
      },
      {
        "name": "Novak Djokovic",
        "ranking": {
          "name": "Novak Djoković",
          "rank": 9,
          "points": 3710,
          "age": 39,
          "country": "SRB",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Novak Djokovic",
        "profile": "Live rank #9 | SRB | age 39 | 2026 clay 2-1, 67% | adj form 84 | hold 85%",
        "modelPct": 60,
        "weakness": {
          "name": "Novak Djokovic",
          "serviceHoldPct": 85,
          "firstServeWonPct": 76,
          "secondServeWonPct": 56,
          "firstServePct": 67,
          "avgAces": 6.6,
          "avgDoubleFaults": 4.2,
          "avgWinners": 33.4,
          "avgUnforcedErrors": 27.4,
          "avgBreakPointsFaced": 5.4,
          "returnPointsWonPct": 38,
          "servicePointsWonPct": 70,
          "weakServeMatches": 2,
          "pressureMatches": 8,
          "matchesWithStats": 5,
          "weaknessScore": 16,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "double-fault pressure (4.2 avg)"
          ],
          "strengths": [
            "protects serve well (85% hold)",
            "wins enough first-serve points (76%)",
            "second serve holds up (56%)",
            "positive winner/error balance (33.4 winners, 27.4 unforced)"
          ],
          "gameFlowRead": "Novak Djokovic can drop points quickly through double-fault pressure (4.2 avg)."
        }
      }
    ]
  },
  {
    "id": "rg-m-casper-ruud-tommy-paul-2026-05-29",
    "eventId": "175734",
    "tour": "ATP",
    "title": "Casper Ruud vs Tommy Paul",
    "start": "7:00 AM",
    "startMinutes": 420,
    "court": "Court Suzanne-Lenglen",
    "round": "Round 3",
    "pickName": "Casper Ruud",
    "confidence": 56,
    "volatility": 44,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Watch only",
      "No blind bet",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Recent service hold is close: Casper Ruud 79%, Tommy Paul 79%. Tommy Paul grades 13 points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price. Lean, not a chase.",
    "totals": "Best O/U angle: over if the book hangs a low best-of-five number, because both recent hold profiles can extend sets.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": 6,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Casper Ruud",
        "serviceHoldPct": 79,
        "firstServeWonPct": 70,
        "secondServeWonPct": 61,
        "firstServePct": 64,
        "avgAces": 4.1,
        "avgDoubleFaults": 2.3,
        "avgWinners": 24.5,
        "avgUnforcedErrors": 22.8,
        "avgBreakPointsFaced": 5.6,
        "returnPointsWonPct": 43,
        "servicePointsWonPct": 67,
        "weakServeMatches": 2,
        "pressureMatches": 3,
        "matchesWithStats": 8,
        "weaknessScore": 5,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "protects serve well (79% hold)",
          "wins enough first-serve points (70%)",
          "second serve holds up (61%)"
        ],
        "gameFlowRead": "Casper Ruud has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Tommy Paul",
        "serviceHoldPct": 79,
        "firstServeWonPct": 69,
        "secondServeWonPct": 53,
        "firstServePct": 61,
        "avgAces": 3.5,
        "avgDoubleFaults": 2.1,
        "avgWinners": 30.6,
        "avgUnforcedErrors": 40.9,
        "avgBreakPointsFaced": 8.5,
        "returnPointsWonPct": 43,
        "servicePointsWonPct": 61,
        "weakServeMatches": 1,
        "pressureMatches": 6,
        "matchesWithStats": 8,
        "weaknessScore": 11,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "negative winner/error balance (30.6 winners, 40.9 unforced)",
          "faces too many break points (8.5 avg)"
        ],
        "strengths": [
          "protects serve well (79% hold)"
        ],
        "gameFlowRead": "Tommy Paul can drop points quickly through negative winner/error balance (30.6 winners, 40.9 unforced) and faces too many break points (8.5 avg)."
      }
    },
    "setWinProjections": [
      {
        "name": "Casper Ruud",
        "confidence": 85,
        "modelPct": 56,
        "label": "Strong set-win path"
      },
      {
        "name": "Tommy Paul",
        "confidence": 72,
        "modelPct": 44,
        "label": "Live to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Casper Ruud",
        "americanOdds": -310,
        "modelPct": 56,
        "impliedPct": 75.6,
        "edgePct": -19.6,
        "evPer100": -25.9,
        "netEvPer100": -27.9,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": null,
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Casper Ruud",
          "confidence": 85,
          "modelPct": 56,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Tommy Paul",
          "confidence": 72,
          "modelPct": 44,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook browser scrape",
      "capturedAt": "2026-05-29T05:09:26.000Z",
      "players": [
        {
          "name": "Casper Ruud",
          "odds": -310,
          "americanLabel": "-310",
          "impliedPct": 75.6,
          "decimalOdds": 1.323,
          "modelPct": 56,
          "edgePct": -19.6,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 32.3,
          "grossPayoutMultiple": 1.323,
          "centsAtRisk": 100,
          "centsProfitIfWin": 32.3
        },
        {
          "name": "Tommy Paul",
          "odds": 245,
          "americanLabel": "+245",
          "impliedPct": 29,
          "decimalOdds": 3.45,
          "modelPct": 44,
          "edgePct": 15,
          "priceBand": "Underdog",
          "grossProfitPct": 245,
          "grossPayoutMultiple": 3.45,
          "centsAtRisk": 100,
          "centsProfitIfWin": 245
        }
      ],
      "desk": {
        "name": "Casper Ruud",
        "odds": -310,
        "americanLabel": "-310",
        "impliedPct": 75.6,
        "decimalOdds": 1.323,
        "modelPct": 56,
        "edgePct": -19.6,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 32.3,
        "grossPayoutMultiple": 1.323,
        "centsAtRisk": 100,
        "centsProfitIfWin": 32.3
      },
      "spread": null,
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Casper Ruud -310 / Tommy Paul +245",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 56% vs FanDuel implied 75.6% (-19.6 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Casper-Ruud-Vs-Tommy-Paul/",
    "players": [
      {
        "name": "Casper Ruud",
        "ranking": {
          "name": "Casper Ruud",
          "rank": 16,
          "points": 2275,
          "age": 27.4,
          "country": "NOR",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Casper Ruud",
        "profile": "Live rank #16 | NOR | age 27.4 | 2026 clay 15-4, 79% | adj form 77 | hold 79%",
        "modelPct": 56,
        "weakness": {
          "name": "Casper Ruud",
          "serviceHoldPct": 79,
          "firstServeWonPct": 70,
          "secondServeWonPct": 61,
          "firstServePct": 64,
          "avgAces": 4.1,
          "avgDoubleFaults": 2.3,
          "avgWinners": 24.5,
          "avgUnforcedErrors": 22.8,
          "avgBreakPointsFaced": 5.6,
          "returnPointsWonPct": 43,
          "servicePointsWonPct": 67,
          "weakServeMatches": 2,
          "pressureMatches": 3,
          "matchesWithStats": 8,
          "weaknessScore": 5,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "protects serve well (79% hold)",
            "wins enough first-serve points (70%)",
            "second serve holds up (61%)"
          ],
          "gameFlowRead": "Casper Ruud has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Tommy Paul",
        "ranking": {
          "name": "Tommy Paul",
          "rank": 25,
          "points": 1595,
          "age": 29,
          "country": "USA",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Tommy Paul",
        "profile": "Live rank #25 | USA | age 29 | 2026 clay 12-3, 80% | adj form 90 | hold 79%",
        "modelPct": 44,
        "weakness": {
          "name": "Tommy Paul",
          "serviceHoldPct": 79,
          "firstServeWonPct": 69,
          "secondServeWonPct": 53,
          "firstServePct": 61,
          "avgAces": 3.5,
          "avgDoubleFaults": 2.1,
          "avgWinners": 30.6,
          "avgUnforcedErrors": 40.9,
          "avgBreakPointsFaced": 8.5,
          "returnPointsWonPct": 43,
          "servicePointsWonPct": 61,
          "weakServeMatches": 1,
          "pressureMatches": 6,
          "matchesWithStats": 8,
          "weaknessScore": 11,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "negative winner/error balance (30.6 winners, 40.9 unforced)",
            "faces too many break points (8.5 avg)"
          ],
          "strengths": [
            "protects serve well (79% hold)"
          ],
          "gameFlowRead": "Tommy Paul can drop points quickly through negative winner/error balance (30.6 winners, 40.9 unforced) and faces too many break points (8.5 avg)."
        }
      }
    ]
  },
  {
    "id": "rg-w-peyton-stearns-belinda-bencic-2026-05-29",
    "eventId": "175547",
    "tour": "WTA",
    "title": "Peyton Stearns vs Belinda Bencic",
    "start": "7:30 AM",
    "startMinutes": 450,
    "court": "Court Simonne-Mathieu",
    "round": "Round 3",
    "pickName": "Belinda Bencic",
    "confidence": 62,
    "volatility": 44,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Watch only",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Belinda Bencic has the recent service-hold edge 73% to 70%. Belinda Bencic grades 11 points better on opponent-adjusted recent form. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": 1,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Belinda Bencic",
        "serviceHoldPct": 73,
        "firstServeWonPct": 69,
        "secondServeWonPct": 48,
        "firstServePct": 62,
        "avgAces": 2.7,
        "avgDoubleFaults": 3.1,
        "avgWinners": 18.5,
        "avgUnforcedErrors": 15,
        "avgBreakPointsFaced": 6,
        "returnPointsWonPct": 51,
        "servicePointsWonPct": 61,
        "weakServeMatches": 2,
        "pressureMatches": 3,
        "matchesWithStats": 7,
        "weaknessScore": 5,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "positive winner/error balance (18.5 winners, 15.0 unforced)",
          "creates return pressure (51% return points won)"
        ],
        "gameFlowRead": "Belinda Bencic has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Peyton Stearns",
        "serviceHoldPct": 70,
        "firstServeWonPct": 66,
        "secondServeWonPct": 49,
        "firstServePct": 60,
        "avgAces": 3.6,
        "avgDoubleFaults": 2.7,
        "avgWinners": 24.5,
        "avgUnforcedErrors": 26,
        "avgBreakPointsFaced": 7,
        "returnPointsWonPct": 45,
        "servicePointsWonPct": 59,
        "weakServeMatches": 2,
        "pressureMatches": 2,
        "matchesWithStats": 7,
        "weaknessScore": 6,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "creates return pressure (45% return points won)"
        ],
        "gameFlowRead": "Peyton Stearns has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Peyton Stearns",
        "confidence": 52,
        "modelPct": 38,
        "label": "Needs early hold pressure"
      },
      {
        "name": "Belinda Bencic",
        "confidence": 75,
        "modelPct": 62,
        "label": "Live to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Belinda Bencic",
        "americanOdds": -295,
        "modelPct": 62,
        "impliedPct": 74.7,
        "edgePct": -12.7,
        "evPer100": -17,
        "netEvPer100": -19,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": null,
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Peyton Stearns",
          "confidence": 52,
          "modelPct": 38,
          "label": "Needs early hold pressure",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Belinda Bencic",
          "confidence": 75,
          "modelPct": 62,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook browser scrape",
      "capturedAt": "2026-05-29T05:09:26.000Z",
      "players": [
        {
          "name": "Peyton Stearns",
          "odds": 235,
          "americanLabel": "+235",
          "impliedPct": 29.9,
          "decimalOdds": 3.35,
          "modelPct": 38,
          "edgePct": 8.1,
          "priceBand": "Underdog",
          "grossProfitPct": 235,
          "grossPayoutMultiple": 3.35,
          "centsAtRisk": 100,
          "centsProfitIfWin": 235
        },
        {
          "name": "Belinda Bencic",
          "odds": -295,
          "americanLabel": "-295",
          "impliedPct": 74.7,
          "decimalOdds": 1.339,
          "modelPct": 62,
          "edgePct": -12.7,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 33.9,
          "grossPayoutMultiple": 1.339,
          "centsAtRisk": 100,
          "centsProfitIfWin": 33.9
        }
      ],
      "desk": {
        "name": "Belinda Bencic",
        "odds": -295,
        "americanLabel": "-295",
        "impliedPct": 74.7,
        "decimalOdds": 1.339,
        "modelPct": 62,
        "edgePct": -12.7,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 33.9,
        "grossPayoutMultiple": 1.339,
        "centsAtRisk": 100,
        "centsProfitIfWin": 33.9
      },
      "spread": null,
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Peyton Stearns +235 / Belinda Bencic -295",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 62% vs FanDuel implied 74.7% (-12.7 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Peyton-Stearns-Vs-Belinda-Bencic/",
    "players": [
      {
        "name": "Peyton Stearns",
        "ranking": {
          "name": "Peyton Stearns",
          "rank": 64,
          "points": 975,
          "age": 24.6,
          "country": "USA",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Peyton Stearns",
        "profile": "Live rank #64 | USA | age 24.6 | 2026 clay 6-5, 55% | adj form 61 | hold 70%",
        "modelPct": 38,
        "weakness": {
          "name": "Peyton Stearns",
          "serviceHoldPct": 70,
          "firstServeWonPct": 66,
          "secondServeWonPct": 49,
          "firstServePct": 60,
          "avgAces": 3.6,
          "avgDoubleFaults": 2.7,
          "avgWinners": 24.5,
          "avgUnforcedErrors": 26,
          "avgBreakPointsFaced": 7,
          "returnPointsWonPct": 45,
          "servicePointsWonPct": 59,
          "weakServeMatches": 2,
          "pressureMatches": 2,
          "matchesWithStats": 7,
          "weaknessScore": 6,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "creates return pressure (45% return points won)"
          ],
          "gameFlowRead": "Peyton Stearns has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Belinda Bencic",
        "ranking": {
          "name": "Belinda Bencic",
          "rank": 11,
          "points": 3161,
          "age": 29.2,
          "country": "SUI",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Belinda Bencic",
        "profile": "Live rank #11 | SUI | age 29.2 | 2026 clay 7-3, 70% | adj form 72 | hold 73%",
        "modelPct": 62,
        "weakness": {
          "name": "Belinda Bencic",
          "serviceHoldPct": 73,
          "firstServeWonPct": 69,
          "secondServeWonPct": 48,
          "firstServePct": 62,
          "avgAces": 2.7,
          "avgDoubleFaults": 3.1,
          "avgWinners": 18.5,
          "avgUnforcedErrors": 15,
          "avgBreakPointsFaced": 6,
          "returnPointsWonPct": 51,
          "servicePointsWonPct": 61,
          "weakServeMatches": 2,
          "pressureMatches": 3,
          "matchesWithStats": 7,
          "weaknessScore": 5,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "positive winner/error balance (18.5 winners, 15.0 unforced)",
            "creates return pressure (51% return points won)"
          ],
          "gameFlowRead": "Belinda Bencic has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-m-quentin-halys-alexander-zverev-2026-05-29",
    "eventId": "175745",
    "tour": "ATP",
    "title": "Quentin Halys vs Alexander Zverev",
    "start": "11:15 AM",
    "startMinutes": 675,
    "court": "Court Philippe-Chatrier",
    "round": "Round 3",
    "pickName": "Alexander Zverev",
    "confidence": 75,
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
    "reason": "Recent service hold is close: Alexander Zverev 85%, Quentin Halys 86%. Opponent-adjusted recent form is basically even: Alexander Zverev 81, Quentin Halys 82. High win probability, but the ML still needs enough payout after comparing the book price to the model.",
    "totals": "Best O/U angle: over if the book hangs a low best-of-five number, because both recent hold profiles can extend sets.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": 2,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Alexander Zverev",
        "serviceHoldPct": 85,
        "firstServeWonPct": 72,
        "secondServeWonPct": 58,
        "firstServePct": 74,
        "avgAces": 6.5,
        "avgDoubleFaults": 1.6,
        "avgWinners": 27.3,
        "avgUnforcedErrors": 20.3,
        "avgBreakPointsFaced": 3.6,
        "returnPointsWonPct": 40,
        "servicePointsWonPct": 69,
        "weakServeMatches": 2,
        "pressureMatches": 3,
        "matchesWithStats": 8,
        "weaknessScore": 5,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "protects serve well (85% hold)",
          "wins enough first-serve points (72%)",
          "second serve holds up (58%)",
          "positive winner/error balance (27.3 winners, 20.3 unforced)"
        ],
        "gameFlowRead": "Alexander Zverev has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Quentin Halys",
        "serviceHoldPct": 86,
        "firstServeWonPct": 78,
        "secondServeWonPct": 51,
        "firstServePct": 59,
        "avgAces": 13.5,
        "avgDoubleFaults": 3,
        "avgWinners": 37.5,
        "avgUnforcedErrors": 27,
        "avgBreakPointsFaced": 7.5,
        "returnPointsWonPct": 34,
        "servicePointsWonPct": 67,
        "weakServeMatches": 1,
        "pressureMatches": 5,
        "matchesWithStats": 4,
        "weaknessScore": 7,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "limited return pressure (34% return points won)"
        ],
        "strengths": [
          "protects serve well (86% hold)",
          "wins enough first-serve points (78%)",
          "positive winner/error balance (37.5 winners, 27.0 unforced)"
        ],
        "gameFlowRead": "Quentin Halys can drop points quickly through limited return pressure (34% return points won)."
      }
    },
    "setWinProjections": [
      {
        "name": "Quentin Halys",
        "confidence": 54,
        "modelPct": 25,
        "label": "Needs early hold pressure"
      },
      {
        "name": "Alexander Zverev",
        "confidence": 91,
        "modelPct": 75,
        "label": "Strong set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Alexander Zverev",
        "americanOdds": -2300,
        "modelPct": 75,
        "impliedPct": 95.8,
        "edgePct": -20.8,
        "evPer100": -21.7,
        "netEvPer100": -23.7,
        "feePer100": 2,
        "valueIssue": "Favorite tax trap",
        "valueGrade": "Favorite tax trap",
        "betGrade": false
      },
      "spread": null,
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Quentin Halys",
          "confidence": 54,
          "modelPct": 25,
          "label": "Needs early hold pressure",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Alexander Zverev",
          "confidence": 91,
          "modelPct": 75,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook browser scrape",
      "capturedAt": "2026-05-29T05:09:26.000Z",
      "players": [
        {
          "name": "Quentin Halys",
          "odds": 1060,
          "americanLabel": "+1060",
          "impliedPct": 8.6,
          "decimalOdds": 11.6,
          "modelPct": 25,
          "edgePct": 16.4,
          "priceBand": "Underdog",
          "grossProfitPct": 1060,
          "grossPayoutMultiple": 11.6,
          "centsAtRisk": 100,
          "centsProfitIfWin": 1060
        },
        {
          "name": "Alexander Zverev",
          "odds": -2300,
          "americanLabel": "-2300",
          "impliedPct": 95.8,
          "decimalOdds": 1.043,
          "modelPct": 75,
          "edgePct": -20.8,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 4.3,
          "grossPayoutMultiple": 1.043,
          "centsAtRisk": 100,
          "centsProfitIfWin": 4.3
        }
      ],
      "desk": {
        "name": "Alexander Zverev",
        "odds": -2300,
        "americanLabel": "-2300",
        "impliedPct": 95.8,
        "decimalOdds": 1.043,
        "modelPct": 75,
        "edgePct": -20.8,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 4.3,
        "grossPayoutMultiple": 1.043,
        "centsAtRisk": 100,
        "centsProfitIfWin": 4.3
      },
      "spread": null,
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Quentin Halys +1060 / Alexander Zverev -2300",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 75% vs FanDuel implied 95.8% (-20.8 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Quentin-Halys-Vs-Alexander-Zverev/",
    "players": [
      {
        "name": "Quentin Halys",
        "ranking": {
          "name": "Quentin Halys",
          "rank": 94,
          "points": 628,
          "age": 29.5,
          "country": "FRA",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Quentin Halys",
        "profile": "Live rank #94 | FRA | age 29.5 | 2026 clay 6-5, 55% | adj form 82 | hold 86%",
        "modelPct": 25,
        "weakness": {
          "name": "Quentin Halys",
          "serviceHoldPct": 86,
          "firstServeWonPct": 78,
          "secondServeWonPct": 51,
          "firstServePct": 59,
          "avgAces": 13.5,
          "avgDoubleFaults": 3,
          "avgWinners": 37.5,
          "avgUnforcedErrors": 27,
          "avgBreakPointsFaced": 7.5,
          "returnPointsWonPct": 34,
          "servicePointsWonPct": 67,
          "weakServeMatches": 1,
          "pressureMatches": 5,
          "matchesWithStats": 4,
          "weaknessScore": 7,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "limited return pressure (34% return points won)"
          ],
          "strengths": [
            "protects serve well (86% hold)",
            "wins enough first-serve points (78%)",
            "positive winner/error balance (37.5 winners, 27.0 unforced)"
          ],
          "gameFlowRead": "Quentin Halys can drop points quickly through limited return pressure (34% return points won)."
        }
      },
      {
        "name": "Alexander Zverev",
        "ranking": {
          "name": "Alexander Zverev",
          "rank": 3,
          "points": 5355,
          "age": 29.1,
          "country": "GER",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Alexander Zverev",
        "profile": "Live rank #3 | GER | age 29.1 | 2026 clay 15-4, 79% | adj form 81 | hold 85%",
        "modelPct": 75,
        "weakness": {
          "name": "Alexander Zverev",
          "serviceHoldPct": 85,
          "firstServeWonPct": 72,
          "secondServeWonPct": 58,
          "firstServePct": 74,
          "avgAces": 6.5,
          "avgDoubleFaults": 1.6,
          "avgWinners": 27.3,
          "avgUnforcedErrors": 20.3,
          "avgBreakPointsFaced": 3.6,
          "returnPointsWonPct": 40,
          "servicePointsWonPct": 69,
          "weakServeMatches": 2,
          "pressureMatches": 3,
          "matchesWithStats": 8,
          "weaknessScore": 5,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "protects serve well (85% hold)",
            "wins enough first-serve points (72%)",
            "second serve holds up (58%)",
            "positive winner/error balance (27.3 winners, 20.3 unforced)"
          ],
          "gameFlowRead": "Alexander Zverev has no major service weakness in the joined Flashscore sample."
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
      valueBoard: raw.valueBoard,
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
      researchLinks: [{ label: 'ESPN scoreboard', url: 'https://www.espn.com/tennis/scoreboard/_/date/20260529' }, { label: 'Tennistonic H2H', url: raw.h2hUrl }, ...(market?.eventUrl ? [{ label: 'FanDuel event', url: market.eventUrl }] : [])],
      formEdgeName: raw.pickName
    },
    participants,
    moneyline: market ? { available: true, label: 'FanDuel moneyline', provider: market.source, participants } : { available: false, label: 'Moneyline', provider: 'Tennis warehouse model', participants: [] },
    analysis: { available: true, participantId: picked.id, participant: picked, opponent, lean: `Lean ${raw.pickName}`, rationale: raw.reason, confidence: raw.confidence, volatility: raw.volatility, recommendationScore: raw.confidence - Math.round(raw.volatility / 3) + Math.round(Math.max(-8, Math.min(8, deskMarket?.edgePct ?? 0))), tier: raw.tags.includes('High confidence')  ? 'High confidence' : raw.tags.includes('Lean') ? 'Lean' : 'Watch', sourceLabel: market?.source || 'Tennis warehouse model', modelEdge: deskMarket?.edgePct ?? 0, modelEdgeLabel: deskMarket ? `${deskMarket.edgePct > 0 ? '+' : ''}${deskMarket.edgePct} pts vs FanDuel implied` : 'Fair value only until market price is captured', marketProbability: deskMarket?.impliedPct ? deskMarket.impliedPct / 100 : null, marketProbabilityLabel: deskMarket?.impliedPct ? `${deskMarket.impliedPct}% FanDuel implied` : 'No market', inputs: [], inputsUsed: market ? 4 : 3, volatilityNotes: [] }
  }, { structuredAnalysis: true })
}

const matches = rawTennisGames.map(buildGame)

export const slateMeta = { title: 'Roland Garros May 28 Tennis Desk', date: 'May 29, 2026', isoDate: '2026-05-29', timeZone: 'America/Los_Angeles', subtitle: 'Singles-only Roland Garros Round 2 slate with weakness-edge, game-flow gates, and FanDuel ML/spread/total lines.', notes: ['No doubles included.', 'FanDuel ML, game handicap, and total-games lines are attached where the sportsbook board exposed a May 28 singles event.', 'May 28 uses live rank, clay record, opponent-adjusted recent form, and Flashscore recent service rows where joined.'] }
export const filters = ['All', 'Tennis']
export const oddsMeta = { provider: 'FanDuel Sportsbook + Tennis warehouse model', snapshot: 'May 29, 2026 Roland Garros desk', note: 'FanDuel lines are stored for priced matches; very expensive favorites are marked as low-payout or pass-first instead of automatic bets.' }
export const sources = [{ label: 'ESPN tennis scoreboard', url: 'https://www.espn.com/tennis/scoreboard/_/date/20260529' }, { label: 'Live Tennis rankings warehouse', url: 'https://live-tennis.eu/' }, { label: 'FanDuel sportsbook tennis', url: 'https://sportsbook.fanduel.com/tennis' }]
export const games = matches.sort((left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title))
