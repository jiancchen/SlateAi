import { createSportsMatchModel } from './sports-model.js'
import tennisClayContext from './day-2026-05-28-tennis-clay-context.generated.json' with { type: 'json' }
import tennisOpponentQualityContext from './day-2026-05-28-tennis-opponent-quality.generated.json' with { type: 'json' }
import tennisWarehouseContext from './day-2026-05-28-tennis-warehouse-context.generated.json' with { type: 'json' }

const rawTennisGames = [
  {
    "id": "rg-m-adolfo-daniel-vallejo-moise-kouame-2026-05-28",
    "eventId": "175717",
    "tour": "ATP",
    "title": "Adolfo Daniel Vallejo vs Moise Kouame",
    "start": "2:00 AM",
    "startMinutes": 120,
    "court": "Court Suzanne-Lenglen",
    "round": "Round 2",
    "pickName": "Adolfo Daniel Vallejo",
    "confidence": 64,
    "volatility": 36,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Lean",
      "No blind bet",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Adolfo Daniel Vallejo has the recent service-hold edge 81% to 69%. Moise Kouame grades 8 points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": 5,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "Spread needs the posted number before grading.",
      "totalRead": "No total edge without posted number and first-set hold data.",
      "pick": {
        "name": "Adolfo Daniel Vallejo",
        "serviceHoldPct": 81,
        "firstServeWonPct": 68,
        "secondServeWonPct": 51,
        "firstServePct": 63,
        "avgAces": 2.3,
        "avgDoubleFaults": 2.7,
        "avgWinners": 19,
        "avgUnforcedErrors": 21.3,
        "avgBreakPointsFaced": 3.7,
        "returnPointsWonPct": 34,
        "servicePointsWonPct": 62,
        "weakServeMatches": 2,
        "pressureMatches": 5,
        "matchesWithStats": 3,
        "weaknessScore": 8,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "limited return pressure (34% return points won)"
        ],
        "strengths": [
          "protects serve well (81% hold)"
        ],
        "gameFlowRead": "Adolfo Daniel Vallejo can drop points quickly through limited return pressure (34% return points won)."
      },
      "opponent": {
        "name": "Moise Kouame",
        "serviceHoldPct": 69,
        "firstServeWonPct": 65,
        "secondServeWonPct": 50,
        "firstServePct": 57,
        "avgAces": 4.5,
        "avgDoubleFaults": 4,
        "avgWinners": 20,
        "avgUnforcedErrors": 28,
        "avgBreakPointsFaced": 8,
        "returnPointsWonPct": 38,
        "servicePointsWonPct": 58,
        "weakServeMatches": 2,
        "pressureMatches": 4,
        "matchesWithStats": 2,
        "weaknessScore": 13,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "double-fault pressure (4.0 avg)",
          "negative winner/error balance (20.0 winners, 28.0 unforced)",
          "faces too many break points (8.0 avg)"
        ],
        "strengths": [],
        "gameFlowRead": "Moise Kouame can drop points quickly through double-fault pressure (4.0 avg) and negative winner/error balance (20.0 winners, 28.0 unforced)."
      }
    },
    "setWinProjections": [
      {
        "name": "Adolfo Daniel Vallejo",
        "confidence": 87,
        "modelPct": 64,
        "label": "Strong set-win path"
      },
      {
        "name": "Moise Kouame",
        "confidence": 64,
        "modelPct": 36,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Adolfo Daniel Vallejo",
        "americanOdds": -330,
        "modelPct": 64,
        "impliedPct": 76.7,
        "edgePct": -12.7,
        "evPer100": -16.6,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Adolfo Daniel Vallejo",
        "line": -6.5,
        "americanOdds": -108,
        "modelPct": 54,
        "impliedPct": 51.9,
        "edgePct": 2.1,
        "evPer100": 4,
        "valueGrade": "Near fair",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Adolfo Daniel Vallejo",
          "confidence": 87,
          "modelPct": 64,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Moise Kouame",
          "confidence": 64,
          "modelPct": 36,
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
      "capturedAt": "2026-05-28T01:27:16.973Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/adolfo-daniel-vallejo-v-moise-kouame-35654060",
      "eventId": "35654060",
      "players": [
        {
          "name": "Adolfo Daniel Vallejo",
          "odds": -330,
          "americanLabel": "-330",
          "impliedPct": 76.7,
          "decimalOdds": 1.303,
          "modelPct": 64,
          "edgePct": -12.7,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 30.3,
          "grossPayoutMultiple": 1.303,
          "centsAtRisk": 100,
          "centsProfitIfWin": 30.3
        },
        {
          "name": "Moise Kouame",
          "odds": 260,
          "americanLabel": "+260",
          "impliedPct": 27.8,
          "decimalOdds": 3.6,
          "modelPct": 36,
          "edgePct": 8.2,
          "priceBand": "Underdog",
          "grossProfitPct": 260,
          "grossPayoutMultiple": 3.6,
          "centsAtRisk": 100,
          "centsProfitIfWin": 260
        }
      ],
      "desk": {
        "name": "Adolfo Daniel Vallejo",
        "odds": -330,
        "americanLabel": "-330",
        "impliedPct": 76.7,
        "decimalOdds": 1.303,
        "modelPct": 64,
        "edgePct": -12.7,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 30.3,
        "grossPayoutMultiple": 1.303,
        "centsAtRisk": 100,
        "centsProfitIfWin": 30.3
      },
      "spread": {
        "marketLine": -6.5,
        "player": "Adolfo Daniel Vallejo",
        "spread": -6.5,
        "odds": -108
      },
      "total": {
        "line": 35.5,
        "side": "Over",
        "odds": -110
      },
      "totalOver": {
        "line": 35.5,
        "side": "Over",
        "odds": -110
      },
      "totalUnder": {
        "line": 35.5,
        "side": "Under",
        "odds": -122
      },
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "Adolfo Daniel Vallejo -6.5 (-108)",
      "totalValue": "35.5 games: Over -110 / Under -122",
      "spreadLean": "Large game spread; ML may be cleaner than laying games",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Adolfo Daniel Vallejo -330 / Moise Kouame +260",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 64% vs FanDuel implied 76.7% (-12.7 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Adolfo-Daniel-Vallejo-Vs-Moise-Kouame/",
    "players": [
      {
        "name": "Adolfo Daniel Vallejo",
        "ranking": {
          "name": "Adolfo Daniel Vallejo",
          "rank": 68,
          "points": 828,
          "age": 22,
          "country": "PAR",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Adolfo Daniel Vallejo",
        "profile": "Live rank #68 | PAR | age 22 | 2026 clay 30-9, 77% | adj form 75 | hold 81%",
        "modelPct": 64,
        "weakness": {
          "name": "Adolfo Daniel Vallejo",
          "serviceHoldPct": 81,
          "firstServeWonPct": 68,
          "secondServeWonPct": 51,
          "firstServePct": 63,
          "avgAces": 2.3,
          "avgDoubleFaults": 2.7,
          "avgWinners": 19,
          "avgUnforcedErrors": 21.3,
          "avgBreakPointsFaced": 3.7,
          "returnPointsWonPct": 34,
          "servicePointsWonPct": 62,
          "weakServeMatches": 2,
          "pressureMatches": 5,
          "matchesWithStats": 3,
          "weaknessScore": 8,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "limited return pressure (34% return points won)"
          ],
          "strengths": [
            "protects serve well (81% hold)"
          ],
          "gameFlowRead": "Adolfo Daniel Vallejo can drop points quickly through limited return pressure (34% return points won)."
        }
      },
      {
        "name": "Moise Kouame",
        "ranking": {
          "name": "Moïse Kouamé",
          "rank": 253,
          "points": 215,
          "age": 17.2,
          "country": "FRA",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Moise Kouame",
        "profile": "Live rank #253 | FRA | age 17.2 | 2026 clay 6-4, 60% | adj form 83 | hold 69%",
        "modelPct": 36,
        "weakness": {
          "name": "Moise Kouame",
          "serviceHoldPct": 69,
          "firstServeWonPct": 65,
          "secondServeWonPct": 50,
          "firstServePct": 57,
          "avgAces": 4.5,
          "avgDoubleFaults": 4,
          "avgWinners": 20,
          "avgUnforcedErrors": 28,
          "avgBreakPointsFaced": 8,
          "returnPointsWonPct": 38,
          "servicePointsWonPct": 58,
          "weakServeMatches": 2,
          "pressureMatches": 4,
          "matchesWithStats": 2,
          "weaknessScore": 13,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "double-fault pressure (4.0 avg)",
            "negative winner/error balance (20.0 winners, 28.0 unforced)",
            "faces too many break points (8.0 avg)"
          ],
          "strengths": [],
          "gameFlowRead": "Moise Kouame can drop points quickly through double-fault pressure (4.0 avg) and negative winner/error balance (20.0 winners, 28.0 unforced)."
        }
      }
    ]
  },
  {
    "id": "rg-w-donna-vekic-naomi-osaka-2026-05-28",
    "eventId": "175566",
    "tour": "WTA",
    "title": "Donna Vekic vs Naomi Osaka",
    "start": "2:00 AM",
    "startMinutes": 120,
    "court": "Court Simonne-Mathieu",
    "round": "Round 2",
    "pickName": "Naomi Osaka",
    "confidence": 55,
    "volatility": 53,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Watch only",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Donna Vekic has the recent service-hold edge 84% to 70%, so Naomi Osaka needs the rank/form edge to show up on return games. Opponent-adjusted recent form is basically even: Naomi Osaka 66, Donna Vekic 65. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": -2,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "Spread needs the posted number before grading.",
      "totalRead": "No total edge without posted number and first-set hold data.",
      "pick": {
        "name": "Naomi Osaka",
        "serviceHoldPct": 70,
        "firstServeWonPct": 66,
        "secondServeWonPct": 54,
        "firstServePct": 57,
        "avgAces": 3.6,
        "avgDoubleFaults": 3,
        "avgWinners": 27,
        "avgUnforcedErrors": 34,
        "avgBreakPointsFaced": 7.6,
        "returnPointsWonPct": 44,
        "servicePointsWonPct": 61,
        "weakServeMatches": 2,
        "pressureMatches": 3,
        "matchesWithStats": 5,
        "weaknessScore": 8,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "negative winner/error balance (27.0 winners, 34.0 unforced)"
        ],
        "strengths": [],
        "gameFlowRead": "Naomi Osaka can drop points quickly through negative winner/error balance (27.0 winners, 34.0 unforced)."
      },
      "opponent": {
        "name": "Donna Vekic",
        "serviceHoldPct": 84,
        "firstServeWonPct": 71,
        "secondServeWonPct": 59,
        "firstServePct": 61,
        "avgAces": 3.5,
        "avgDoubleFaults": 4,
        "avgWinners": 27,
        "avgUnforcedErrors": 24,
        "avgBreakPointsFaced": 7,
        "returnPointsWonPct": 44,
        "servicePointsWonPct": 66,
        "weakServeMatches": 1,
        "pressureMatches": 2,
        "matchesWithStats": 2,
        "weaknessScore": 6,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "double-fault pressure (4.0 avg)"
        ],
        "strengths": [
          "protects serve well (84% hold)",
          "wins enough first-serve points (71%)",
          "second serve holds up (59%)",
          "positive winner/error balance (27.0 winners, 24.0 unforced)"
        ],
        "gameFlowRead": "Donna Vekic can drop points quickly through double-fault pressure (4.0 avg)."
      }
    },
    "setWinProjections": [
      {
        "name": "Donna Vekic",
        "confidence": 61,
        "modelPct": 45,
        "label": "Needs early hold pressure"
      },
      {
        "name": "Naomi Osaka",
        "confidence": 71,
        "modelPct": 55,
        "label": "Live to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Naomi Osaka",
        "americanOdds": -315,
        "modelPct": 55,
        "impliedPct": 75.9,
        "edgePct": -20.9,
        "evPer100": -27.5,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Naomi Osaka",
        "line": -4.5,
        "americanOdds": -110,
        "modelPct": 49,
        "impliedPct": 52.4,
        "edgePct": -3.4,
        "evPer100": -6.5,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Donna Vekic",
          "confidence": 61,
          "modelPct": 45,
          "label": "Needs early hold pressure",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Naomi Osaka",
          "confidence": 71,
          "modelPct": 55,
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
      "capturedAt": "2026-05-28T01:27:22.162Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/donna-vekic-v-naomi-osaka-35654208",
      "eventId": "35654208",
      "players": [
        {
          "name": "Donna Vekic",
          "odds": 250,
          "americanLabel": "+250",
          "impliedPct": 28.6,
          "decimalOdds": 3.5,
          "modelPct": 45,
          "edgePct": 16.4,
          "priceBand": "Underdog",
          "grossProfitPct": 250,
          "grossPayoutMultiple": 3.5,
          "centsAtRisk": 100,
          "centsProfitIfWin": 250
        },
        {
          "name": "Naomi Osaka",
          "odds": -315,
          "americanLabel": "-315",
          "impliedPct": 75.9,
          "decimalOdds": 1.317,
          "modelPct": 55,
          "edgePct": -20.9,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 31.7,
          "grossPayoutMultiple": 1.317,
          "centsAtRisk": 100,
          "centsProfitIfWin": 31.7
        }
      ],
      "desk": {
        "name": "Naomi Osaka",
        "odds": -315,
        "americanLabel": "-315",
        "impliedPct": 75.9,
        "decimalOdds": 1.317,
        "modelPct": 55,
        "edgePct": -20.9,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 31.7,
        "grossPayoutMultiple": 1.317,
        "centsAtRisk": 100,
        "centsProfitIfWin": 31.7
      },
      "spread": {
        "marketLine": 4.5,
        "player": "Naomi Osaka",
        "spread": -4.5,
        "odds": -110
      },
      "total": {
        "line": 20.5,
        "side": "Over",
        "odds": -122
      },
      "totalOver": {
        "line": 20.5,
        "side": "Over",
        "odds": -122
      },
      "totalUnder": {
        "line": 20.5,
        "side": "Under",
        "odds": -108
      },
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "Naomi Osaka -4.5 (-110)",
      "totalValue": "20.5 games: Over -122 / Under -108",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Donna Vekic +250 / Naomi Osaka -315",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 55% vs FanDuel implied 75.9% (-20.9 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Donna-Vekic-Vs-Naomi-Osaka/",
    "players": [
      {
        "name": "Donna Vekic",
        "ranking": {
          "name": "Donna Vekić",
          "rank": 72,
          "points": 933,
          "age": 29.9,
          "country": "CRO",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Donna Vekic",
        "profile": "Live rank #72 | CRO | age 29.9 | 2026 clay 12-4, 75% | adj form 65 | hold 84%",
        "modelPct": 45,
        "weakness": {
          "name": "Donna Vekic",
          "serviceHoldPct": 84,
          "firstServeWonPct": 71,
          "secondServeWonPct": 59,
          "firstServePct": 61,
          "avgAces": 3.5,
          "avgDoubleFaults": 4,
          "avgWinners": 27,
          "avgUnforcedErrors": 24,
          "avgBreakPointsFaced": 7,
          "returnPointsWonPct": 44,
          "servicePointsWonPct": 66,
          "weakServeMatches": 1,
          "pressureMatches": 2,
          "matchesWithStats": 2,
          "weaknessScore": 6,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "double-fault pressure (4.0 avg)"
          ],
          "strengths": [
            "protects serve well (84% hold)",
            "wins enough first-serve points (71%)",
            "second serve holds up (59%)",
            "positive winner/error balance (27.0 winners, 24.0 unforced)"
          ],
          "gameFlowRead": "Donna Vekic can drop points quickly through double-fault pressure (4.0 avg)."
        }
      },
      {
        "name": "Naomi Osaka",
        "ranking": {
          "name": "Naomi Osaka",
          "rank": 16,
          "points": 2401,
          "age": 28.6,
          "country": "JPN",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Naomi Osaka",
        "profile": "Live rank #16 | JPN | age 28.6 | 2026 clay 5-2, 71% | adj form 66 | hold 70%",
        "modelPct": 55,
        "weakness": {
          "name": "Naomi Osaka",
          "serviceHoldPct": 70,
          "firstServeWonPct": 66,
          "secondServeWonPct": 54,
          "firstServePct": 57,
          "avgAces": 3.6,
          "avgDoubleFaults": 3,
          "avgWinners": 27,
          "avgUnforcedErrors": 34,
          "avgBreakPointsFaced": 7.6,
          "returnPointsWonPct": 44,
          "servicePointsWonPct": 61,
          "weakServeMatches": 2,
          "pressureMatches": 3,
          "matchesWithStats": 5,
          "weaknessScore": 8,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "negative winner/error balance (27.0 winners, 34.0 unforced)"
          ],
          "strengths": [],
          "gameFlowRead": "Naomi Osaka can drop points quickly through negative winner/error balance (27.0 winners, 34.0 unforced)."
        }
      }
    ]
  },
  {
    "id": "rg-m-facundo-diaz-acosta-learner-tien-2026-05-28",
    "eventId": "175724",
    "tour": "ATP",
    "title": "Facundo Diaz Acosta vs Learner Tien",
    "start": "2:00 AM",
    "startMinutes": 120,
    "court": "Court 6",
    "round": "Round 2",
    "pickName": "Learner Tien",
    "confidence": 60,
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
    "reason": "Facundo Diaz Acosta has the recent service-hold edge 86% to 76%, so Learner Tien needs the rank/form edge to show up on return games. Facundo Diaz Acosta grades 17 points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price. Lean, not a chase.",
    "totals": "Best O/U angle: over if the book hangs a low best-of-five number, because both recent hold profiles can extend sets.",
    "weaknessEdge": {
      "edgeType": "Weakness warning",
      "target": "Learner Tien",
      "scoreGap": -9,
      "attackingSide": null,
      "vulnerableSide": "Learner Tien",
      "gameFlow": "Learner Tien is the model side, but the fragile profile is on our pick: 4 recent matches with serve instability. Avoid laying a bad price until early holds are confirmed.",
      "liveTrigger": "Do not upgrade Learner Tien unless they hold cleanly in the first service game and keep double faults down.",
      "spreadRead": "Spread needs the posted number before grading.",
      "totalRead": "No total edge without posted number and first-set hold data.",
      "pick": {
        "name": "Learner Tien",
        "serviceHoldPct": 76,
        "firstServeWonPct": 70,
        "secondServeWonPct": 56,
        "firstServePct": 63,
        "avgAces": 4.1,
        "avgDoubleFaults": 3.1,
        "avgWinners": 27.1,
        "avgUnforcedErrors": 29.1,
        "avgBreakPointsFaced": 6.1,
        "returnPointsWonPct": 44,
        "servicePointsWonPct": 64,
        "weakServeMatches": 4,
        "pressureMatches": 6,
        "matchesWithStats": 8,
        "weaknessScore": 14,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "4 recent matches with serve instability"
        ],
        "strengths": [
          "protects serve well (76% hold)",
          "second serve holds up (56%)"
        ],
        "gameFlowRead": "Learner Tien can drop points quickly through 4 recent matches with serve instability."
      },
      "opponent": {
        "name": "Facundo Diaz Acosta",
        "serviceHoldPct": 86,
        "firstServeWonPct": 71,
        "secondServeWonPct": 59,
        "firstServePct": 69,
        "avgAces": 4.7,
        "avgDoubleFaults": 1.3,
        "avgWinners": 20.7,
        "avgUnforcedErrors": 14.7,
        "avgBreakPointsFaced": 2.7,
        "returnPointsWonPct": 46,
        "servicePointsWonPct": 68,
        "weakServeMatches": 0,
        "pressureMatches": 6,
        "matchesWithStats": 3,
        "weaknessScore": 5,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "protects serve well (86% hold)",
          "wins enough first-serve points (71%)",
          "second serve holds up (59%)",
          "positive winner/error balance (20.7 winners, 14.7 unforced)",
          "creates return pressure (46% return points won)"
        ],
        "gameFlowRead": "Facundo Diaz Acosta has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Facundo Diaz Acosta",
        "confidence": 69,
        "modelPct": 40,
        "label": "Live to win a set"
      },
      {
        "name": "Learner Tien",
        "confidence": 85,
        "modelPct": 60,
        "label": "Strong set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Learner Tien",
        "americanOdds": -350,
        "modelPct": 60,
        "impliedPct": 77.8,
        "edgePct": -17.8,
        "evPer100": -22.9,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Learner Tien",
        "line": -5.5,
        "americanOdds": -126,
        "modelPct": 48,
        "impliedPct": 55.8,
        "edgePct": -7.8,
        "evPer100": -13.9,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 36.5,
        "americanOdds": -110,
        "modelPct": 52,
        "impliedPct": 52.4,
        "edgePct": -0.4,
        "evPer100": -0.7,
        "valueGrade": "Near fair",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Facundo Diaz Acosta",
          "confidence": 69,
          "modelPct": 40,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Learner Tien",
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
      "capturedAt": "2026-05-28T01:27:27.347Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/facundo-diaz-acosta-v-learner-tien-35654251",
      "eventId": "35654251",
      "players": [
        {
          "name": "Facundo Diaz Acosta",
          "odds": 275,
          "americanLabel": "+275",
          "impliedPct": 26.7,
          "decimalOdds": 3.75,
          "modelPct": 40,
          "edgePct": 13.3,
          "priceBand": "Underdog",
          "grossProfitPct": 275,
          "grossPayoutMultiple": 3.75,
          "centsAtRisk": 100,
          "centsProfitIfWin": 275
        },
        {
          "name": "Learner Tien",
          "odds": -350,
          "americanLabel": "-350",
          "impliedPct": 77.8,
          "decimalOdds": 1.286,
          "modelPct": 60,
          "edgePct": -17.8,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 28.6,
          "grossPayoutMultiple": 1.286,
          "centsAtRisk": 100,
          "centsProfitIfWin": 28.6
        }
      ],
      "desk": {
        "name": "Learner Tien",
        "odds": -350,
        "americanLabel": "-350",
        "impliedPct": 77.8,
        "decimalOdds": 1.286,
        "modelPct": 60,
        "edgePct": -17.8,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 28.6,
        "grossPayoutMultiple": 1.286,
        "centsAtRisk": 100,
        "centsProfitIfWin": 28.6
      },
      "spread": {
        "marketLine": 5.5,
        "player": "Learner Tien",
        "spread": -5.5,
        "odds": -126
      },
      "total": {
        "line": 36.5,
        "side": "Over",
        "odds": -110
      },
      "totalOver": {
        "line": 36.5,
        "side": "Over",
        "odds": -110
      },
      "totalUnder": {
        "line": 36.5,
        "side": "Under",
        "odds": -120
      },
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "Learner Tien -5.5 (-126)",
      "totalValue": "36.5 games: Over -110 / Under -120",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Over lean if both players hold early",
      "mlValue": "Facundo Diaz Acosta +275 / Learner Tien -350",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 60% vs FanDuel implied 77.8% (-17.8 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Facundo-Diaz-Acosta-Vs-Learner-Tien/",
    "players": [
      {
        "name": "Facundo Diaz Acosta",
        "ranking": {
          "name": "Facundo Díaz Acosta",
          "rank": 127,
          "points": 481,
          "age": 25.4,
          "country": "ARG",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Facundo Diaz Acosta",
        "profile": "Live rank #127 | ARG | age 25.4 | 2026 clay 25-8, 76% | adj form 114 | hold 86%",
        "modelPct": 40,
        "weakness": {
          "name": "Facundo Diaz Acosta",
          "serviceHoldPct": 86,
          "firstServeWonPct": 71,
          "secondServeWonPct": 59,
          "firstServePct": 69,
          "avgAces": 4.7,
          "avgDoubleFaults": 1.3,
          "avgWinners": 20.7,
          "avgUnforcedErrors": 14.7,
          "avgBreakPointsFaced": 2.7,
          "returnPointsWonPct": 46,
          "servicePointsWonPct": 68,
          "weakServeMatches": 0,
          "pressureMatches": 6,
          "matchesWithStats": 3,
          "weaknessScore": 5,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "protects serve well (86% hold)",
            "wins enough first-serve points (71%)",
            "second serve holds up (59%)",
            "positive winner/error balance (20.7 winners, 14.7 unforced)",
            "creates return pressure (46% return points won)"
          ],
          "gameFlowRead": "Facundo Diaz Acosta has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Learner Tien",
        "ranking": {
          "name": "Learner Tien",
          "rank": 18,
          "points": 2220,
          "age": 20.4,
          "country": "USA",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Learner Tien",
        "profile": "Live rank #18 | USA | age 20.4 | 2026 clay 8-3, 73% | adj form 97 | hold 76%",
        "modelPct": 60,
        "weakness": {
          "name": "Learner Tien",
          "serviceHoldPct": 76,
          "firstServeWonPct": 70,
          "secondServeWonPct": 56,
          "firstServePct": 63,
          "avgAces": 4.1,
          "avgDoubleFaults": 3.1,
          "avgWinners": 27.1,
          "avgUnforcedErrors": 29.1,
          "avgBreakPointsFaced": 6.1,
          "returnPointsWonPct": 44,
          "servicePointsWonPct": 64,
          "weakServeMatches": 4,
          "pressureMatches": 6,
          "matchesWithStats": 8,
          "weaknessScore": 14,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "4 recent matches with serve instability"
          ],
          "strengths": [
            "protects serve well (76% hold)",
            "second serve holds up (56%)"
          ],
          "gameFlowRead": "Learner Tien can drop points quickly through 4 recent matches with serve instability."
        }
      }
    ]
  },
  {
    "id": "rg-m-flavio-cobolli-wu-yibing-2026-05-28",
    "eventId": "175729",
    "tour": "ATP",
    "title": "Flavio Cobolli vs Wu Yibing",
    "start": "2:00 AM",
    "startMinutes": 120,
    "court": "Court 7",
    "round": "Round 2",
    "pickName": "Flavio Cobolli",
    "confidence": 61,
    "volatility": 39,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Watch only",
      "No blind bet",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Flavio Cobolli has the cleaner composite of rank, clay record, and recent opponent quality. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": 0,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "Spread needs the posted number before grading.",
      "totalRead": "No total edge without posted number and first-set hold data.",
      "pick": {
        "name": "Flavio Cobolli",
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
        "gameFlowRead": "Flavio Cobolli has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Wu Yibing",
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
        "gameFlowRead": "Wu Yibing has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Flavio Cobolli",
        "confidence": 87,
        "modelPct": 61,
        "label": "Strong set-win path"
      },
      {
        "name": "Wu Yibing",
        "confidence": 68,
        "modelPct": 39,
        "label": "Live to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Flavio Cobolli",
        "americanOdds": -350,
        "modelPct": 61,
        "impliedPct": 77.8,
        "edgePct": -16.8,
        "evPer100": -21.6,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Flavio Cobolli",
        "line": -5.5,
        "americanOdds": -118,
        "modelPct": 55,
        "impliedPct": 54.1,
        "edgePct": 0.9,
        "evPer100": 1.6,
        "valueGrade": "Near fair",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Flavio Cobolli",
          "confidence": 87,
          "modelPct": 61,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Wu Yibing",
          "confidence": 68,
          "modelPct": 39,
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
      "capturedAt": "2026-05-28T01:27:32.519Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/flavio-cobolli-v-yibing-wu-35651677",
      "eventId": "35651677",
      "players": [
        {
          "name": "Flavio Cobolli",
          "odds": -350,
          "americanLabel": "-350",
          "impliedPct": 77.8,
          "decimalOdds": 1.286,
          "modelPct": 61,
          "edgePct": -16.8,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 28.6,
          "grossPayoutMultiple": 1.286,
          "centsAtRisk": 100,
          "centsProfitIfWin": 28.6
        },
        {
          "name": "Wu Yibing",
          "odds": 280,
          "americanLabel": "+280",
          "impliedPct": 26.3,
          "decimalOdds": 3.8,
          "modelPct": 39,
          "edgePct": 12.7,
          "priceBand": "Underdog",
          "grossProfitPct": 280,
          "grossPayoutMultiple": 3.8,
          "centsAtRisk": 100,
          "centsProfitIfWin": 280
        }
      ],
      "desk": {
        "name": "Flavio Cobolli",
        "odds": -350,
        "americanLabel": "-350",
        "impliedPct": 77.8,
        "decimalOdds": 1.286,
        "modelPct": 61,
        "edgePct": -16.8,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 28.6,
        "grossPayoutMultiple": 1.286,
        "centsAtRisk": 100,
        "centsProfitIfWin": 28.6
      },
      "spread": {
        "marketLine": -5.5,
        "player": "Flavio Cobolli",
        "spread": -5.5,
        "odds": -118
      },
      "total": {
        "line": 36.5,
        "side": "Over",
        "odds": -118
      },
      "totalOver": {
        "line": 36.5,
        "side": "Over",
        "odds": -118
      },
      "totalUnder": {
        "line": 36.5,
        "side": "Under",
        "odds": -112
      },
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "Flavio Cobolli -5.5 (-118)",
      "totalValue": "36.5 games: Over -118 / Under -112",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Flavio Cobolli -350 / Wu Yibing +280",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 61% vs FanDuel implied 77.8% (-16.8 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Flavio-Cobolli-Vs-Wu-Yibing/",
    "players": [
      {
        "name": "Flavio Cobolli",
        "ranking": {
          "name": "Flavio Cobolli",
          "rank": 15,
          "points": 2290,
          "age": 24,
          "country": "ITA",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": null,
        "profile": "Live rank #15 | ITA | age 24",
        "modelPct": 61,
        "weakness": {
          "name": "Flavio Cobolli",
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
          "gameFlowRead": "Flavio Cobolli has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Wu Yibing",
        "ranking": {
          "name": "Wu Yibing",
          "rank": 92,
          "points": 655,
          "age": 26,
          "country": "China",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/2875/wu-yibing",
          "asOf": "2026-05-26"
        },
        "qualityName": null,
        "profile": "Live rank #92 | China | age 26",
        "modelPct": 39,
        "weakness": {
          "name": "Wu Yibing",
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
          "gameFlowRead": "Wu Yibing has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-w-iva-jovic-emma-navarro-2026-05-28",
    "eventId": "175541",
    "tour": "WTA",
    "title": "Iva Jovic vs Emma Navarro",
    "start": "2:00 AM",
    "startMinutes": 120,
    "court": "Court 14",
    "round": "Round 2",
    "pickName": "Iva Jovic",
    "confidence": 50,
    "volatility": 59,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Watch only",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Recent service hold is close: Iva Jovic 64%, Emma Navarro 66%. Emma Navarro grades 30 points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness edge",
      "target": "Emma Navarro",
      "scoreGap": 12,
      "attackingSide": "Iva Jovic",
      "vulnerableSide": "Emma Navarro",
      "gameFlow": "Iva Jovic has a real path if Emma Navarro's first two service games show the same weakness: double-fault pressure (5.0 avg); negative winner/error balance (13.0 winners, 35.0 unforced).",
      "liveTrigger": "Look for Emma Navarro facing break points or second-serve pressure before 3-3.",
      "spreadRead": "Game spread is fragile; prefer live entry after the first service cycle.",
      "totalRead": "Weak service profile points to breaks; be careful with low unders.",
      "pick": {
        "name": "Iva Jovic",
        "serviceHoldPct": 64,
        "firstServeWonPct": 64,
        "secondServeWonPct": 47,
        "firstServePct": 58,
        "avgAces": 2.4,
        "avgDoubleFaults": 2.9,
        "avgWinners": 34,
        "avgUnforcedErrors": 29,
        "avgBreakPointsFaced": 7.4,
        "returnPointsWonPct": 48,
        "servicePointsWonPct": 57,
        "weakServeMatches": 3,
        "pressureMatches": 4,
        "matchesWithStats": 7,
        "weaknessScore": 14,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "3 recent matches with serve instability"
        ],
        "strengths": [
          "positive winner/error balance (34.0 winners, 29.0 unforced)",
          "creates return pressure (48% return points won)"
        ],
        "gameFlowRead": "Iva Jovic can drop points quickly through 3 recent matches with serve instability."
      },
      "opponent": {
        "name": "Emma Navarro",
        "serviceHoldPct": 66,
        "firstServeWonPct": 65,
        "secondServeWonPct": 49,
        "firstServePct": 53,
        "avgAces": 2.8,
        "avgDoubleFaults": 5,
        "avgWinners": 13,
        "avgUnforcedErrors": 35,
        "avgBreakPointsFaced": 10.8,
        "returnPointsWonPct": 52,
        "servicePointsWonPct": 57,
        "weakServeMatches": 2,
        "pressureMatches": 4,
        "matchesWithStats": 5,
        "weaknessScore": 26,
        "firstGameComfort": "Fragile opening-service profile",
        "liabilities": [
          "double-fault pressure (5.0 avg)",
          "negative winner/error balance (13.0 winners, 35.0 unforced)",
          "faces too many break points (10.8 avg)"
        ],
        "strengths": [
          "creates return pressure (52% return points won)"
        ],
        "gameFlowRead": "Emma Navarro can drop points quickly through double-fault pressure (5.0 avg) and negative winner/error balance (13.0 winners, 35.0 unforced)."
      }
    },
    "setWinProjections": [
      {
        "name": "Iva Jovic",
        "confidence": 68,
        "modelPct": 50,
        "label": "Live to win a set"
      },
      {
        "name": "Emma Navarro",
        "confidence": 67,
        "modelPct": 50,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Iva Jovic",
        "americanOdds": -122,
        "modelPct": 50,
        "impliedPct": 55,
        "edgePct": -5,
        "evPer100": -9,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Iva Jovic",
        "line": -0.5,
        "americanOdds": -120,
        "modelPct": 48,
        "impliedPct": 54.5,
        "edgePct": -6.5,
        "evPer100": -12,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 21.5,
        "americanOdds": -120,
        "modelPct": 42,
        "impliedPct": 54.5,
        "edgePct": -12.5,
        "evPer100": -23,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Iva Jovic",
          "confidence": 68,
          "modelPct": 50,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Emma Navarro",
          "confidence": 67,
          "modelPct": 50,
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
      "capturedAt": "2026-05-28T01:27:37.747Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/iva-jovic-v-emma-navarro-35653376",
      "eventId": "35653376",
      "players": [
        {
          "name": "Iva Jovic",
          "odds": -122,
          "americanLabel": "-122",
          "impliedPct": 55,
          "decimalOdds": 1.82,
          "modelPct": 50,
          "edgePct": -5,
          "priceBand": "Coinflip",
          "grossProfitPct": 82,
          "grossPayoutMultiple": 1.82,
          "centsAtRisk": 100,
          "centsProfitIfWin": 82
        },
        {
          "name": "Emma Navarro",
          "odds": 102,
          "americanLabel": "+102",
          "impliedPct": 49.5,
          "decimalOdds": 2.02,
          "modelPct": 50,
          "edgePct": 0.5,
          "priceBand": "Coinflip",
          "grossProfitPct": 102,
          "grossPayoutMultiple": 2.02,
          "centsAtRisk": 100,
          "centsProfitIfWin": 102
        }
      ],
      "desk": {
        "name": "Iva Jovic",
        "odds": -122,
        "americanLabel": "-122",
        "impliedPct": 55,
        "decimalOdds": 1.82,
        "modelPct": 50,
        "edgePct": -5,
        "priceBand": "Coinflip",
        "grossProfitPct": 82,
        "grossPayoutMultiple": 1.82,
        "centsAtRisk": 100,
        "centsProfitIfWin": 82
      },
      "spread": {
        "marketLine": -0.5,
        "player": "Iva Jovic",
        "spread": -0.5,
        "odds": -120
      },
      "total": {
        "line": 21.5,
        "side": "Over",
        "odds": -120
      },
      "totalOver": {
        "line": 21.5,
        "side": "Over",
        "odds": -120
      },
      "totalUnder": {
        "line": 21.5,
        "side": "Under",
        "odds": -110
      },
      "priceAction": "FanDuel price is richer than the model; pass ML unless live state improves.",
      "spreadValue": "Iva Jovic -0.5 (-120)",
      "totalValue": "21.5 games: Over -120 / Under -110",
      "spreadLean": "Iva Jovic spread is playable only if early return pressure shows",
      "totalLean": "Over or pass if early service games are loose",
      "mlValue": "Iva Jovic -122 / Emma Navarro +102",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. FanDuel price is richer than the model; pass ML unless live state improves.",
      "noVigNote": "Model 50% vs FanDuel implied 55% (-5 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Iva-Jovic-Vs-Emma-Navarro/",
    "players": [
      {
        "name": "Iva Jovic",
        "ranking": {
          "name": "Iva Jovic",
          "rank": 17,
          "points": 2306,
          "age": 18.4,
          "country": "USA",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Iva Jovic",
        "profile": "Live rank #17 | USA | age 18.4 | 2026 clay 7-6, 54% | adj form 67 | hold 64%",
        "modelPct": 50,
        "weakness": {
          "name": "Iva Jovic",
          "serviceHoldPct": 64,
          "firstServeWonPct": 64,
          "secondServeWonPct": 47,
          "firstServePct": 58,
          "avgAces": 2.4,
          "avgDoubleFaults": 2.9,
          "avgWinners": 34,
          "avgUnforcedErrors": 29,
          "avgBreakPointsFaced": 7.4,
          "returnPointsWonPct": 48,
          "servicePointsWonPct": 57,
          "weakServeMatches": 3,
          "pressureMatches": 4,
          "matchesWithStats": 7,
          "weaknessScore": 14,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "3 recent matches with serve instability"
          ],
          "strengths": [
            "positive winner/error balance (34.0 winners, 29.0 unforced)",
            "creates return pressure (48% return points won)"
          ],
          "gameFlowRead": "Iva Jovic can drop points quickly through 3 recent matches with serve instability."
        }
      },
      {
        "name": "Emma Navarro",
        "ranking": {
          "name": "Emma Navarro",
          "rank": 24,
          "points": 1779,
          "age": 25,
          "country": "USA",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Emma Navarro",
        "profile": "Live rank #24 | USA | age 25 | 2026 clay 7-2, 78% | adj form 97 | hold 66%",
        "modelPct": 50,
        "weakness": {
          "name": "Emma Navarro",
          "serviceHoldPct": 66,
          "firstServeWonPct": 65,
          "secondServeWonPct": 49,
          "firstServePct": 53,
          "avgAces": 2.8,
          "avgDoubleFaults": 5,
          "avgWinners": 13,
          "avgUnforcedErrors": 35,
          "avgBreakPointsFaced": 10.8,
          "returnPointsWonPct": 52,
          "servicePointsWonPct": 57,
          "weakServeMatches": 2,
          "pressureMatches": 4,
          "matchesWithStats": 5,
          "weaknessScore": 26,
          "firstGameComfort": "Fragile opening-service profile",
          "liabilities": [
            "double-fault pressure (5.0 avg)",
            "negative winner/error balance (13.0 winners, 35.0 unforced)",
            "faces too many break points (10.8 avg)"
          ],
          "strengths": [
            "creates return pressure (52% return points won)"
          ],
          "gameFlowRead": "Emma Navarro can drop points quickly through double-fault pressure (5.0 avg) and negative winner/error balance (13.0 winners, 35.0 unforced)."
        }
      }
    ]
  },
  {
    "id": "rg-m-jan-lennard-struff-jaime-faria-2026-05-28",
    "eventId": "175711",
    "tour": "ATP",
    "title": "Jan-Lennard Struff vs Jaime Faria",
    "start": "2:00 AM",
    "startMinutes": 120,
    "court": "Court 12",
    "round": "Round 2",
    "pickName": "Jan-Lennard Struff",
    "confidence": 50,
    "volatility": 50,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Watch only",
      "Positive price edge",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Jan-Lennard Struff has the cleaner composite of rank, clay record, and recent opponent quality. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": 0,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "Spread needs the posted number before grading.",
      "totalRead": "No total edge without posted number and first-set hold data.",
      "pick": {
        "name": "Jan-Lennard Struff",
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
        "gameFlowRead": "Jan-Lennard Struff has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Jaime Faria",
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
        "gameFlowRead": "Jaime Faria has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Jan-Lennard Struff",
        "confidence": 84,
        "modelPct": 50,
        "label": "Strong set-win path"
      },
      {
        "name": "Jaime Faria",
        "confidence": 84,
        "modelPct": 50,
        "label": "Strong set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Jan-Lennard Struff",
        "americanOdds": 150,
        "modelPct": 50,
        "impliedPct": 40,
        "edgePct": 10,
        "evPer100": 25,
        "valueGrade": "Bet-grade value",
        "betGrade": true
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Jan-Lennard Struff",
        "line": 3.5,
        "americanOdds": -122,
        "modelPct": 44,
        "impliedPct": 55,
        "edgePct": -11,
        "evPer100": -19.9,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Jan-Lennard Struff",
          "confidence": 84,
          "modelPct": 50,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Jaime Faria",
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
      "capturedAt": "2026-05-28T01:27:42.928Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/jan-lennard-struff-v-jaime-faria-35654874",
      "eventId": "35654874",
      "players": [
        {
          "name": "Jan-Lennard Struff",
          "odds": 150,
          "americanLabel": "+150",
          "impliedPct": 40,
          "decimalOdds": 2.5,
          "modelPct": 50,
          "edgePct": 10,
          "priceBand": "Underdog",
          "grossProfitPct": 150,
          "grossPayoutMultiple": 2.5,
          "centsAtRisk": 100,
          "centsProfitIfWin": 150
        },
        {
          "name": "Jaime Faria",
          "odds": -178,
          "americanLabel": "-178",
          "impliedPct": 64,
          "decimalOdds": 1.562,
          "modelPct": 50,
          "edgePct": -14,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 56.2,
          "grossPayoutMultiple": 1.562,
          "centsAtRisk": 100,
          "centsProfitIfWin": 56.2
        }
      ],
      "desk": {
        "name": "Jan-Lennard Struff",
        "odds": 150,
        "americanLabel": "+150",
        "impliedPct": 40,
        "decimalOdds": 2.5,
        "modelPct": 50,
        "edgePct": 10,
        "priceBand": "Underdog",
        "grossProfitPct": 150,
        "grossPayoutMultiple": 2.5,
        "centsAtRisk": 100,
        "centsProfitIfWin": 150
      },
      "spread": {
        "marketLine": 3.5,
        "player": "Jan-Lennard Struff",
        "spread": 3.5,
        "odds": -122
      },
      "total": {
        "line": 38.5,
        "side": "Over",
        "odds": -116
      },
      "totalOver": {
        "line": 38.5,
        "side": "Over",
        "odds": -116
      },
      "totalUnder": {
        "line": 38.5,
        "side": "Under",
        "odds": -116
      },
      "priceAction": "Model is meaningfully above FanDuel implied price.",
      "spreadValue": "Jan-Lennard Struff +3.5 (-122)",
      "totalValue": "38.5 games: Over -116 / Under -116",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Jan-Lennard Struff +150 / Jaime Faria -178",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. Model is meaningfully above FanDuel implied price.",
      "noVigNote": "Model 50% vs FanDuel implied 40% (+10 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Jan-Lennard-Struff-Vs-Jaime-Faria/",
    "players": [
      {
        "name": "Jan-Lennard Struff",
        "ranking": {
          "name": "Jan Lennard Struff",
          "rank": 72,
          "points": 779,
          "age": 36,
          "country": "GER",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": null,
        "profile": "Live rank #72 | GER | age 36",
        "modelPct": 50,
        "weakness": {
          "name": "Jan-Lennard Struff",
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
          "gameFlowRead": "Jan-Lennard Struff has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Jaime Faria",
        "ranking": {
          "name": "Jaime Faria",
          "rank": 98,
          "points": 618,
          "age": 22.8,
          "country": "POR",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": null,
        "profile": "Live rank #98 | POR | age 22.8",
        "modelPct": 50,
        "weakness": {
          "name": "Jaime Faria",
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
          "gameFlowRead": "Jaime Faria has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-w-oleksandra-oliynykova-kimberly-birrell-2026-05-28",
    "eventId": "175558",
    "tour": "WTA",
    "title": "Oleksandra Oliynykova vs Kimberly Birrell",
    "start": "2:00 AM",
    "startMinutes": 120,
    "court": "Court 10",
    "round": "Round 2",
    "pickName": "Oleksandra Oliynykova",
    "confidence": 58,
    "volatility": 50,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Watch only",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Oleksandra Oliynykova has the recent service-hold edge 62% to 46%. Oleksandra Oliynykova grades 13 points better on opponent-adjusted recent form. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness edge",
      "target": "Kimberly Birrell",
      "scoreGap": 25,
      "attackingSide": "Oleksandra Oliynykova",
      "vulnerableSide": "Kimberly Birrell",
      "gameFlow": "Oleksandra Oliynykova has a real path if Kimberly Birrell's first two service games show the same weakness: low recent hold rate (46%); first-serve points won below comfort (52%).",
      "liveTrigger": "Look for Kimberly Birrell facing break points or second-serve pressure before 3-3.",
      "spreadRead": "Spread needs the posted number before grading.",
      "totalRead": "Weak service profile points to breaks; be careful with low unders.",
      "pick": {
        "name": "Oleksandra Oliynykova",
        "serviceHoldPct": 62,
        "firstServeWonPct": 61,
        "secondServeWonPct": 31,
        "firstServePct": 75,
        "avgAces": 0.6,
        "avgDoubleFaults": 2.6,
        "avgWinners": 19,
        "avgUnforcedErrors": 25,
        "avgBreakPointsFaced": 5.9,
        "returnPointsWonPct": 53,
        "servicePointsWonPct": 54,
        "weakServeMatches": 4,
        "pressureMatches": 1,
        "matchesWithStats": 8,
        "weaknessScore": 27,
        "firstGameComfort": "Fragile opening-service profile",
        "liabilities": [
          "low recent hold rate (62%)",
          "first-serve points won below comfort (61%)",
          "second-serve points won are attackable (31%)",
          "negative winner/error balance (19.0 winners, 25.0 unforced)",
          "4 recent matches with serve instability"
        ],
        "strengths": [
          "creates return pressure (53% return points won)"
        ],
        "gameFlowRead": "Oleksandra Oliynykova can drop points quickly through low recent hold rate (62%) and first-serve points won below comfort (61%)."
      },
      "opponent": {
        "name": "Kimberly Birrell",
        "serviceHoldPct": 46,
        "firstServeWonPct": 52,
        "secondServeWonPct": 38,
        "firstServePct": 69,
        "avgAces": 1.3,
        "avgDoubleFaults": 3.7,
        "avgWinners": 24,
        "avgUnforcedErrors": 28,
        "avgBreakPointsFaced": 9.3,
        "returnPointsWonPct": 46,
        "servicePointsWonPct": 48,
        "weakServeMatches": 3,
        "pressureMatches": 6,
        "matchesWithStats": 3,
        "weaknessScore": 52,
        "firstGameComfort": "Fragile opening-service profile",
        "liabilities": [
          "low recent hold rate (46%)",
          "first-serve points won below comfort (52%)",
          "second-serve points won are attackable (38%)",
          "faces too many break points (9.3 avg)",
          "3 recent matches with serve instability"
        ],
        "strengths": [
          "creates return pressure (46% return points won)"
        ],
        "gameFlowRead": "Kimberly Birrell can drop points quickly through low recent hold rate (46%) and first-serve points won below comfort (52%)."
      }
    },
    "setWinProjections": [
      {
        "name": "Oleksandra Oliynykova",
        "confidence": 70,
        "modelPct": 58,
        "label": "Live to win a set"
      },
      {
        "name": "Kimberly Birrell",
        "confidence": 52,
        "modelPct": 42,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Oleksandra Oliynykova",
        "americanOdds": -225,
        "modelPct": 58,
        "impliedPct": 69.2,
        "edgePct": -11.2,
        "evPer100": -16.2,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Oleksandra Oliynykova",
        "line": -3.5,
        "americanOdds": -126,
        "modelPct": 56,
        "impliedPct": 55.8,
        "edgePct": 0.2,
        "evPer100": 0.4,
        "valueGrade": "Near fair",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 21.5,
        "americanOdds": -110,
        "modelPct": 50,
        "impliedPct": 52.4,
        "edgePct": -2.4,
        "evPer100": -4.5,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Oleksandra Oliynykova",
          "confidence": 70,
          "modelPct": 58,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Kimberly Birrell",
          "confidence": 52,
          "modelPct": 42,
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
      "capturedAt": "2026-05-28T01:27:48.092Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/oleksandra-oliynykova-v-kimberly-birrell-35655236",
      "eventId": "35655236",
      "players": [
        {
          "name": "Oleksandra Oliynykova",
          "odds": -225,
          "americanLabel": "-225",
          "impliedPct": 69.2,
          "decimalOdds": 1.444,
          "modelPct": 58,
          "edgePct": -11.2,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 44.4,
          "grossPayoutMultiple": 1.444,
          "centsAtRisk": 100,
          "centsProfitIfWin": 44.4
        },
        {
          "name": "Kimberly Birrell",
          "odds": 184,
          "americanLabel": "+184",
          "impliedPct": 35.2,
          "decimalOdds": 2.84,
          "modelPct": 42,
          "edgePct": 6.8,
          "priceBand": "Underdog",
          "grossProfitPct": 184,
          "grossPayoutMultiple": 2.84,
          "centsAtRisk": 100,
          "centsProfitIfWin": 184
        }
      ],
      "desk": {
        "name": "Oleksandra Oliynykova",
        "odds": -225,
        "americanLabel": "-225",
        "impliedPct": 69.2,
        "decimalOdds": 1.444,
        "modelPct": 58,
        "edgePct": -11.2,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 44.4,
        "grossPayoutMultiple": 1.444,
        "centsAtRisk": 100,
        "centsProfitIfWin": 44.4
      },
      "spread": {
        "marketLine": -3.5,
        "player": "Oleksandra Oliynykova",
        "spread": -3.5,
        "odds": -126
      },
      "total": {
        "line": 21.5,
        "side": "Over",
        "odds": -110
      },
      "totalOver": {
        "line": 21.5,
        "side": "Over",
        "odds": -110
      },
      "totalUnder": {
        "line": 21.5,
        "side": "Under",
        "odds": -122
      },
      "priceAction": "FanDuel price is richer than the model; pass ML unless live state improves.",
      "spreadValue": "Oleksandra Oliynykova -3.5 (-126)",
      "totalValue": "21.5 games: Over -110 / Under -122",
      "spreadLean": "Oleksandra Oliynykova spread is playable only if early return pressure shows",
      "totalLean": "Over or pass if early service games are loose",
      "mlValue": "Oleksandra Oliynykova -225 / Kimberly Birrell +184",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. FanDuel price is richer than the model; pass ML unless live state improves.",
      "noVigNote": "Model 58% vs FanDuel implied 69.2% (-11.2 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Oleksandra-Oliynykova-Vs-Kimberly-Birrell/",
    "players": [
      {
        "name": "Oleksandra Oliynykova",
        "ranking": {
          "name": "Oleksandra Oliynykova",
          "rank": 54,
          "points": 1060,
          "age": 25.3,
          "country": "UKR",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Oleksandra Oliynykova",
        "profile": "Live rank #54 | UKR | age 25.3 | 2026 clay 13-7, 65% | adj form 75 | hold 62%",
        "modelPct": 58,
        "weakness": {
          "name": "Oleksandra Oliynykova",
          "serviceHoldPct": 62,
          "firstServeWonPct": 61,
          "secondServeWonPct": 31,
          "firstServePct": 75,
          "avgAces": 0.6,
          "avgDoubleFaults": 2.6,
          "avgWinners": 19,
          "avgUnforcedErrors": 25,
          "avgBreakPointsFaced": 5.9,
          "returnPointsWonPct": 53,
          "servicePointsWonPct": 54,
          "weakServeMatches": 4,
          "pressureMatches": 1,
          "matchesWithStats": 8,
          "weaknessScore": 27,
          "firstGameComfort": "Fragile opening-service profile",
          "liabilities": [
            "low recent hold rate (62%)",
            "first-serve points won below comfort (61%)",
            "second-serve points won are attackable (31%)",
            "negative winner/error balance (19.0 winners, 25.0 unforced)",
            "4 recent matches with serve instability"
          ],
          "strengths": [
            "creates return pressure (53% return points won)"
          ],
          "gameFlowRead": "Oleksandra Oliynykova can drop points quickly through low recent hold rate (62%) and first-serve points won below comfort (61%)."
        }
      },
      {
        "name": "Kimberly Birrell",
        "ranking": {
          "name": "Kimberly Birrell",
          "rank": 70,
          "points": 940,
          "age": 28,
          "country": "AUS",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Kimberly Birrell",
        "profile": "Live rank #70 | AUS | age 28 | 2026 clay 1-3, 25% | adj form 62 | hold 46%",
        "modelPct": 42,
        "weakness": {
          "name": "Kimberly Birrell",
          "serviceHoldPct": 46,
          "firstServeWonPct": 52,
          "secondServeWonPct": 38,
          "firstServePct": 69,
          "avgAces": 1.3,
          "avgDoubleFaults": 3.7,
          "avgWinners": 24,
          "avgUnforcedErrors": 28,
          "avgBreakPointsFaced": 9.3,
          "returnPointsWonPct": 46,
          "servicePointsWonPct": 48,
          "weakServeMatches": 3,
          "pressureMatches": 6,
          "matchesWithStats": 3,
          "weaknessScore": 52,
          "firstGameComfort": "Fragile opening-service profile",
          "liabilities": [
            "low recent hold rate (46%)",
            "first-serve points won below comfort (52%)",
            "second-serve points won are attackable (38%)",
            "faces too many break points (9.3 avg)",
            "3 recent matches with serve instability"
          ],
          "strengths": [
            "creates return pressure (46% return points won)"
          ],
          "gameFlowRead": "Kimberly Birrell can drop points quickly through low recent hold rate (46%) and first-serve points won below comfort (52%)."
        }
      }
    ]
  },
  {
    "id": "rg-m-zachary-svajda-adam-walton-2026-05-28",
    "eventId": "175748",
    "tour": "ATP",
    "title": "Zachary Svajda vs Adam Walton",
    "start": "2:00 AM",
    "startMinutes": 120,
    "court": "Court 13",
    "round": "Round 2",
    "pickName": "Adam Walton",
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
    "reason": "Adam Walton has the recent service-hold edge 74% to 68%. Adam Walton grades 52 points better on opponent-adjusted recent form. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness warning",
      "target": "Adam Walton",
      "scoreGap": -17,
      "attackingSide": null,
      "vulnerableSide": "Adam Walton",
      "gameFlow": "Adam Walton is the model side, but the fragile profile is on our pick: second-serve points won are attackable (43%); negative winner/error balance (34.0 winners, 46.0 unforced). Avoid laying a bad price until early holds are confirmed.",
      "liveTrigger": "Do not upgrade Adam Walton unless they hold cleanly in the first service game and keep double faults down.",
      "spreadRead": "Spread needs the posted number before grading.",
      "totalRead": "Weak service profile points to breaks; be careful with low unders.",
      "pick": {
        "name": "Adam Walton",
        "serviceHoldPct": 74,
        "firstServeWonPct": 63,
        "secondServeWonPct": 43,
        "firstServePct": 67,
        "avgAces": 3,
        "avgDoubleFaults": 1,
        "avgWinners": 34,
        "avgUnforcedErrors": 46,
        "avgBreakPointsFaced": 21,
        "returnPointsWonPct": 39,
        "servicePointsWonPct": 57,
        "weakServeMatches": 0,
        "pressureMatches": 6,
        "matchesWithStats": 1,
        "weaknessScore": 27,
        "firstGameComfort": "Fragile opening-service profile",
        "liabilities": [
          "second-serve points won are attackable (43%)",
          "negative winner/error balance (34.0 winners, 46.0 unforced)",
          "faces too many break points (21.0 avg)"
        ],
        "strengths": [],
        "gameFlowRead": "Adam Walton can drop points quickly through second-serve points won are attackable (43%) and negative winner/error balance (34.0 winners, 46.0 unforced)."
      },
      "opponent": {
        "name": "Zachary Svajda",
        "serviceHoldPct": 68,
        "firstServeWonPct": 69,
        "secondServeWonPct": 45,
        "firstServePct": 62,
        "avgAces": 6,
        "avgDoubleFaults": 2,
        "avgWinners": 25.8,
        "avgUnforcedErrors": 27.6,
        "avgBreakPointsFaced": 7.2,
        "returnPointsWonPct": 25,
        "servicePointsWonPct": 60,
        "weakServeMatches": 2,
        "pressureMatches": 5,
        "matchesWithStats": 5,
        "weaknessScore": 10,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "limited return pressure (25% return points won)"
        ],
        "strengths": [],
        "gameFlowRead": "Zachary Svajda can drop points quickly through limited return pressure (25% return points won)."
      }
    },
    "setWinProjections": [
      {
        "name": "Zachary Svajda",
        "confidence": 73,
        "modelPct": 45,
        "label": "Live to win a set"
      },
      {
        "name": "Adam Walton",
        "confidence": 82,
        "modelPct": 55,
        "label": "Strong set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Adam Walton",
        "americanOdds": 100,
        "modelPct": 55,
        "impliedPct": 50,
        "edgePct": 5,
        "evPer100": 10,
        "valueGrade": "Thin value",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Adam Walton",
        "line": 0.5,
        "americanOdds": -112,
        "modelPct": 43,
        "impliedPct": 52.8,
        "edgePct": -9.8,
        "evPer100": -18.6,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 38.5,
        "americanOdds": -118,
        "modelPct": 47,
        "impliedPct": 54.1,
        "edgePct": -7.1,
        "evPer100": -13.2,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Zachary Svajda",
          "confidence": 73,
          "modelPct": 45,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Adam Walton",
          "confidence": 82,
          "modelPct": 55,
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
      "capturedAt": "2026-05-28T01:27:53.250Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/zachary-svajda-v-adam-walton-35653948",
      "eventId": "35653948",
      "players": [
        {
          "name": "Zachary Svajda",
          "odds": -120,
          "americanLabel": "-120",
          "impliedPct": 54.5,
          "decimalOdds": 1.833,
          "modelPct": 45,
          "edgePct": -9.5,
          "priceBand": "Coinflip",
          "grossProfitPct": 83.3,
          "grossPayoutMultiple": 1.833,
          "centsAtRisk": 100,
          "centsProfitIfWin": 83.3
        },
        {
          "name": "Adam Walton",
          "odds": 100,
          "americanLabel": "+100",
          "impliedPct": 50,
          "decimalOdds": 2,
          "modelPct": 55,
          "edgePct": 5,
          "priceBand": "Coinflip",
          "grossProfitPct": 100,
          "grossPayoutMultiple": 2,
          "centsAtRisk": 100,
          "centsProfitIfWin": 100
        }
      ],
      "desk": {
        "name": "Adam Walton",
        "odds": 100,
        "americanLabel": "+100",
        "impliedPct": 50,
        "decimalOdds": 2,
        "modelPct": 55,
        "edgePct": 5,
        "priceBand": "Coinflip",
        "grossProfitPct": 100,
        "grossPayoutMultiple": 2,
        "centsAtRisk": 100,
        "centsProfitIfWin": 100
      },
      "spread": {
        "marketLine": -0.5,
        "player": "Adam Walton",
        "spread": 0.5,
        "odds": -112
      },
      "total": {
        "line": 38.5,
        "side": "Over",
        "odds": -118
      },
      "totalOver": {
        "line": 38.5,
        "side": "Over",
        "odds": -118
      },
      "totalUnder": {
        "line": 38.5,
        "side": "Under",
        "odds": -112
      },
      "priceAction": "ML is close to fair; derivative or live entry needs to carry the edge.",
      "spreadValue": "Adam Walton +0.5 (-112)",
      "totalValue": "38.5 games: Over -118 / Under -112",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Over or pass if early service games are loose",
      "mlValue": "Zachary Svajda -120 / Adam Walton +100",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. ML is close to fair; derivative or live entry needs to carry the edge.",
      "noVigNote": "Model 55% vs FanDuel implied 50% (+5 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Zachary-Svajda-Vs-Adam-Walton/",
    "players": [
      {
        "name": "Zachary Svajda",
        "ranking": {
          "name": "Zachary Svajda",
          "rank": 80,
          "points": 725,
          "age": 23.4,
          "country": "USA",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Zachary Svajda",
        "profile": "Live rank #80 | USA | age 23.4 | 2026 clay 2-5, 29% | adj form 44 | hold 68%",
        "modelPct": 45,
        "weakness": {
          "name": "Zachary Svajda",
          "serviceHoldPct": 68,
          "firstServeWonPct": 69,
          "secondServeWonPct": 45,
          "firstServePct": 62,
          "avgAces": 6,
          "avgDoubleFaults": 2,
          "avgWinners": 25.8,
          "avgUnforcedErrors": 27.6,
          "avgBreakPointsFaced": 7.2,
          "returnPointsWonPct": 25,
          "servicePointsWonPct": 60,
          "weakServeMatches": 2,
          "pressureMatches": 5,
          "matchesWithStats": 5,
          "weaknessScore": 10,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "limited return pressure (25% return points won)"
          ],
          "strengths": [],
          "gameFlowRead": "Zachary Svajda can drop points quickly through limited return pressure (25% return points won)."
        }
      },
      {
        "name": "Adam Walton",
        "ranking": {
          "name": "Adam Walton",
          "rank": 99,
          "points": 614,
          "age": 27.1,
          "country": "AUS",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Adam Walton",
        "profile": "Live rank #99 | AUS | age 27.1 | 2026 clay 2-2, 50% | adj form 96 | hold 74%",
        "modelPct": 55,
        "weakness": {
          "name": "Adam Walton",
          "serviceHoldPct": 74,
          "firstServeWonPct": 63,
          "secondServeWonPct": 43,
          "firstServePct": 67,
          "avgAces": 3,
          "avgDoubleFaults": 1,
          "avgWinners": 34,
          "avgUnforcedErrors": 46,
          "avgBreakPointsFaced": 21,
          "returnPointsWonPct": 39,
          "servicePointsWonPct": 57,
          "weakServeMatches": 0,
          "pressureMatches": 6,
          "matchesWithStats": 1,
          "weaknessScore": 27,
          "firstGameComfort": "Fragile opening-service profile",
          "liabilities": [
            "second-serve points won are attackable (43%)",
            "negative winner/error balance (34.0 winners, 46.0 unforced)",
            "faces too many break points (21.0 avg)"
          ],
          "strengths": [],
          "gameFlowRead": "Adam Walton can drop points quickly through second-serve points won are attackable (43%) and negative winner/error balance (34.0 winners, 46.0 unforced)."
        }
      }
    ]
  },
  {
    "id": "rg-m-jannik-sinner-juan-manuel-cerundolo-2026-05-28",
    "eventId": "175688",
    "tour": "ATP",
    "title": "Jannik Sinner vs Juan Manuel Cerundolo",
    "start": "3:00 AM",
    "startMinutes": 180,
    "court": "Court Philippe-Chatrier",
    "round": "Round 2",
    "pickName": "Jannik Sinner",
    "confidence": 83,
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
    "reason": "Jannik Sinner has the recent service-hold edge 96% to 82%. Jannik Sinner grades 18 points better on opponent-adjusted recent form. High win probability, but the ML still needs enough payout after comparing the book price to the model.",
    "totals": "Best O/U angle: over if the book hangs a low best-of-five number, because both recent hold profiles can extend sets.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": 7,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "Spread needs the posted number before grading.",
      "totalRead": "No total edge without posted number and first-set hold data.",
      "pick": {
        "name": "Jannik Sinner",
        "serviceHoldPct": 96,
        "firstServeWonPct": 81,
        "secondServeWonPct": 62,
        "firstServePct": 62,
        "avgAces": 5.1,
        "avgDoubleFaults": 1,
        "avgWinners": 24.4,
        "avgUnforcedErrors": 17.4,
        "avgBreakPointsFaced": 1.8,
        "returnPointsWonPct": 47,
        "servicePointsWonPct": 74,
        "weakServeMatches": 0,
        "pressureMatches": 2,
        "matchesWithStats": 8,
        "weaknessScore": 0,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "protects serve well (96% hold)",
          "wins enough first-serve points (81%)",
          "second serve holds up (62%)",
          "positive winner/error balance (24.4 winners, 17.4 unforced)",
          "creates return pressure (47% return points won)"
        ],
        "gameFlowRead": "Jannik Sinner has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Juan Manuel Cerundolo",
        "serviceHoldPct": 82,
        "firstServeWonPct": 70,
        "secondServeWonPct": 50,
        "firstServePct": 68,
        "avgAces": 5,
        "avgDoubleFaults": 4,
        "avgWinners": 29,
        "avgUnforcedErrors": 32.5,
        "avgBreakPointsFaced": 8.5,
        "returnPointsWonPct": 41,
        "servicePointsWonPct": 63,
        "weakServeMatches": 0,
        "pressureMatches": 4,
        "matchesWithStats": 2,
        "weaknessScore": 7,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "double-fault pressure (4.0 avg)",
          "faces too many break points (8.5 avg)"
        ],
        "strengths": [
          "protects serve well (82% hold)"
        ],
        "gameFlowRead": "Juan Manuel Cerundolo can drop points quickly through double-fault pressure (4.0 avg) and faces too many break points (8.5 avg)."
      }
    },
    "setWinProjections": [
      {
        "name": "Jannik Sinner",
        "confidence": 94,
        "modelPct": 83,
        "label": "Strong set-win path"
      },
      {
        "name": "Juan Manuel Cerundolo",
        "confidence": 47,
        "modelPct": 17,
        "label": "Thin set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Jannik Sinner",
        "americanOdds": -10000,
        "modelPct": 83,
        "impliedPct": 99,
        "edgePct": -16,
        "evPer100": -16.2,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Jannik Sinner",
        "line": -10.5,
        "americanOdds": 104,
        "modelPct": 73,
        "impliedPct": 49,
        "edgePct": 24,
        "evPer100": 48.9,
        "valueGrade": "Bet-grade value",
        "betGrade": true
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 26.5,
        "americanOdds": -128,
        "modelPct": 68,
        "impliedPct": 56.1,
        "edgePct": 11.9,
        "evPer100": 21.1,
        "valueGrade": "Bet-grade value",
        "betGrade": true
      },
      "setWin": [
        {
          "name": "Jannik Sinner",
          "confidence": 94,
          "modelPct": 83,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Juan Manuel Cerundolo",
          "confidence": 47,
          "modelPct": 17,
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
      "capturedAt": "2026-05-28T01:27:58.423Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/jannik-sinner-v-juan-manuel-cerundolo-35655273",
      "eventId": "35655273",
      "players": [
        {
          "name": "Jannik Sinner",
          "odds": -10000,
          "americanLabel": "-10000",
          "impliedPct": 99,
          "decimalOdds": 1.01,
          "modelPct": 83,
          "edgePct": -16,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 1,
          "grossPayoutMultiple": 1.01,
          "centsAtRisk": 100,
          "centsProfitIfWin": 1
        },
        {
          "name": "Juan Manuel Cerundolo",
          "odds": 2400,
          "americanLabel": "+2400",
          "impliedPct": 4,
          "decimalOdds": 25,
          "modelPct": 17,
          "edgePct": 13,
          "priceBand": "Underdog",
          "grossProfitPct": 2400,
          "grossPayoutMultiple": 25,
          "centsAtRisk": 100,
          "centsProfitIfWin": 2400
        }
      ],
      "desk": {
        "name": "Jannik Sinner",
        "odds": -10000,
        "americanLabel": "-10000",
        "impliedPct": 99,
        "decimalOdds": 1.01,
        "modelPct": 83,
        "edgePct": -16,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 1,
        "grossPayoutMultiple": 1.01,
        "centsAtRisk": 100,
        "centsProfitIfWin": 1
      },
      "spread": {
        "marketLine": -10.5,
        "player": "Jannik Sinner",
        "spread": -10.5,
        "odds": 104
      },
      "total": {
        "line": 26.5,
        "side": "Over",
        "odds": -128
      },
      "totalOver": {
        "line": 26.5,
        "side": "Over",
        "odds": -128
      },
      "totalUnder": {
        "line": 26.5,
        "side": "Under",
        "odds": -104
      },
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "Jannik Sinner -10.5 (+104)",
      "totalValue": "26.5 games: Over -128 / Under -104",
      "spreadLean": "Large game spread; ML may be cleaner than laying games",
      "totalLean": "Over lean if both players hold early",
      "mlValue": "Jannik Sinner -10000 / Juan Manuel Cerundolo +2400",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 83% vs FanDuel implied 99% (-16 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Jannik-Sinner-Vs-Juan-Manuel-Cerundolo/",
    "players": [
      {
        "name": "Jannik Sinner",
        "ranking": {
          "name": "Jannik Sinner",
          "rank": 1,
          "points": 13500,
          "age": 24.7,
          "country": "ITA",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Jannik Sinner",
        "profile": "Live rank #1 | ITA | age 24.7 | 2026 clay 18-0, 100% | adj form 109 | hold 96%",
        "modelPct": 83,
        "weakness": {
          "name": "Jannik Sinner",
          "serviceHoldPct": 96,
          "firstServeWonPct": 81,
          "secondServeWonPct": 62,
          "firstServePct": 62,
          "avgAces": 5.1,
          "avgDoubleFaults": 1,
          "avgWinners": 24.4,
          "avgUnforcedErrors": 17.4,
          "avgBreakPointsFaced": 1.8,
          "returnPointsWonPct": 47,
          "servicePointsWonPct": 74,
          "weakServeMatches": 0,
          "pressureMatches": 2,
          "matchesWithStats": 8,
          "weaknessScore": 0,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "protects serve well (96% hold)",
            "wins enough first-serve points (81%)",
            "second serve holds up (62%)",
            "positive winner/error balance (24.4 winners, 17.4 unforced)",
            "creates return pressure (47% return points won)"
          ],
          "gameFlowRead": "Jannik Sinner has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Juan Manuel Cerundolo",
        "ranking": {
          "name": "Juan Manuel Cerúndolo",
          "rank": 55,
          "points": 905,
          "age": 24.5,
          "country": "ARG",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Juan Manuel Cerundolo",
        "profile": "Live rank #55 | ARG | age 24.5 | 2026 clay 18-10, 64% | adj form 92 | hold 82%",
        "modelPct": 17,
        "weakness": {
          "name": "Juan Manuel Cerundolo",
          "serviceHoldPct": 82,
          "firstServeWonPct": 70,
          "secondServeWonPct": 50,
          "firstServePct": 68,
          "avgAces": 5,
          "avgDoubleFaults": 4,
          "avgWinners": 29,
          "avgUnforcedErrors": 32.5,
          "avgBreakPointsFaced": 8.5,
          "returnPointsWonPct": 41,
          "servicePointsWonPct": 63,
          "weakServeMatches": 0,
          "pressureMatches": 4,
          "matchesWithStats": 2,
          "weaknessScore": 7,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "double-fault pressure (4.0 avg)",
            "faces too many break points (8.5 avg)"
          ],
          "strengths": [
            "protects serve well (82% hold)"
          ],
          "gameFlowRead": "Juan Manuel Cerundolo can drop points quickly through double-fault pressure (4.0 avg) and faces too many break points (8.5 avg)."
        }
      }
    ]
  },
  {
    "id": "rg-m-martin-landaluce-vit-kopriva-2026-05-28",
    "eventId": "175690",
    "tour": "ATP",
    "title": "Martin Landaluce vs Vit Kopriva",
    "start": "3:00 AM",
    "startMinutes": 180,
    "court": "Court 9",
    "round": "Round 2",
    "pickName": "Martin Landaluce",
    "confidence": 52,
    "volatility": 48,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Watch only",
      "No blind bet",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Martin Landaluce has the recent service-hold edge 83% to 78%. Martin Landaluce grades 20 points better on opponent-adjusted recent form. Lean, not a chase.",
    "totals": "Best O/U angle: over if the book hangs a low best-of-five number, because both recent hold profiles can extend sets.",
    "weaknessEdge": {
      "edgeType": "Weakness warning",
      "target": "Martin Landaluce",
      "scoreGap": -14,
      "attackingSide": null,
      "vulnerableSide": "Martin Landaluce",
      "gameFlow": "Martin Landaluce is the model side, but the fragile profile is on our pick: double-fault pressure (4.3 avg); negative winner/error balance (27.0 winners, 34.9 unforced). Avoid laying a bad price until early holds are confirmed.",
      "liveTrigger": "Do not upgrade Martin Landaluce unless they hold cleanly in the first service game and keep double faults down.",
      "spreadRead": "Spread needs the posted number before grading.",
      "totalRead": "No total edge without posted number and first-set hold data.",
      "pick": {
        "name": "Martin Landaluce",
        "serviceHoldPct": 83,
        "firstServeWonPct": 71,
        "secondServeWonPct": 53,
        "firstServePct": 63,
        "avgAces": 3.6,
        "avgDoubleFaults": 4.3,
        "avgWinners": 27,
        "avgUnforcedErrors": 34.9,
        "avgBreakPointsFaced": 9.1,
        "returnPointsWonPct": 43,
        "servicePointsWonPct": 65,
        "weakServeMatches": 4,
        "pressureMatches": 4,
        "matchesWithStats": 7,
        "weaknessScore": 19,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "double-fault pressure (4.3 avg)",
          "negative winner/error balance (27.0 winners, 34.9 unforced)",
          "faces too many break points (9.1 avg)",
          "4 recent matches with serve instability"
        ],
        "strengths": [
          "protects serve well (83% hold)",
          "wins enough first-serve points (71%)"
        ],
        "gameFlowRead": "Martin Landaluce can drop points quickly through double-fault pressure (4.3 avg) and negative winner/error balance (27.0 winners, 34.9 unforced)."
      },
      "opponent": {
        "name": "Vit Kopriva",
        "serviceHoldPct": 78,
        "firstServeWonPct": 72,
        "secondServeWonPct": 49,
        "firstServePct": 63,
        "avgAces": 3,
        "avgDoubleFaults": 2.6,
        "avgWinners": 20.6,
        "avgUnforcedErrors": 24.8,
        "avgBreakPointsFaced": 6.1,
        "returnPointsWonPct": 37,
        "servicePointsWonPct": 64,
        "weakServeMatches": 2,
        "pressureMatches": 1,
        "matchesWithStats": 8,
        "weaknessScore": 5,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "limited return pressure (37% return points won)"
        ],
        "strengths": [
          "protects serve well (78% hold)",
          "wins enough first-serve points (72%)"
        ],
        "gameFlowRead": "Vit Kopriva can drop points quickly through limited return pressure (37% return points won)."
      }
    },
    "setWinProjections": [
      {
        "name": "Martin Landaluce",
        "confidence": 82,
        "modelPct": 52,
        "label": "Strong set-win path"
      },
      {
        "name": "Vit Kopriva",
        "confidence": 77,
        "modelPct": 48,
        "label": "Live to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Martin Landaluce",
        "americanOdds": 108,
        "modelPct": 52,
        "impliedPct": 48.1,
        "edgePct": 3.9,
        "evPer100": 8.2,
        "valueGrade": "Thin value",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Martin Landaluce",
        "line": 1.5,
        "americanOdds": -118,
        "modelPct": 42,
        "impliedPct": 54.1,
        "edgePct": -12.1,
        "evPer100": -22.4,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 37.5,
        "americanOdds": -120,
        "modelPct": 44,
        "impliedPct": 54.5,
        "edgePct": -10.5,
        "evPer100": -19.3,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Martin Landaluce",
          "confidence": 82,
          "modelPct": 52,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Vit Kopriva",
          "confidence": 77,
          "modelPct": 48,
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
      "capturedAt": "2026-05-28T01:28:03.619Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/martin-landaluce-v-vit-kopriva-35654767",
      "eventId": "35654767",
      "players": [
        {
          "name": "Martin Landaluce",
          "odds": 108,
          "americanLabel": "+108",
          "impliedPct": 48.1,
          "decimalOdds": 2.08,
          "modelPct": 52,
          "edgePct": 3.9,
          "priceBand": "Coinflip",
          "grossProfitPct": 108,
          "grossPayoutMultiple": 2.08,
          "centsAtRisk": 100,
          "centsProfitIfWin": 108
        },
        {
          "name": "Vit Kopriva",
          "odds": -130,
          "americanLabel": "-130",
          "impliedPct": 56.5,
          "decimalOdds": 1.769,
          "modelPct": 48,
          "edgePct": -8.5,
          "priceBand": "Coinflip",
          "grossProfitPct": 76.9,
          "grossPayoutMultiple": 1.769,
          "centsAtRisk": 100,
          "centsProfitIfWin": 76.9
        }
      ],
      "desk": {
        "name": "Martin Landaluce",
        "odds": 108,
        "americanLabel": "+108",
        "impliedPct": 48.1,
        "decimalOdds": 2.08,
        "modelPct": 52,
        "edgePct": 3.9,
        "priceBand": "Coinflip",
        "grossProfitPct": 108,
        "grossPayoutMultiple": 2.08,
        "centsAtRisk": 100,
        "centsProfitIfWin": 108
      },
      "spread": {
        "marketLine": 1.5,
        "player": "Martin Landaluce",
        "spread": 1.5,
        "odds": -118
      },
      "total": {
        "line": 37.5,
        "side": "Over",
        "odds": -120
      },
      "totalOver": {
        "line": 37.5,
        "side": "Over",
        "odds": -120
      },
      "totalUnder": {
        "line": 37.5,
        "side": "Under",
        "odds": -110
      },
      "priceAction": "ML is close to fair; derivative or live entry needs to carry the edge.",
      "spreadValue": "Martin Landaluce +1.5 (-118)",
      "totalValue": "37.5 games: Over -120 / Under -110",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Over lean if both players hold early",
      "mlValue": "Martin Landaluce +108 / Vit Kopriva -130",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. ML is close to fair; derivative or live entry needs to carry the edge.",
      "noVigNote": "Model 52% vs FanDuel implied 48.1% (+3.9 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Martin-Landaluce-Vs-Vit-Kopriva/",
    "players": [
      {
        "name": "Martin Landaluce",
        "ranking": {
          "name": "Martin Landaluce",
          "rank": 59,
          "points": 869,
          "age": 20.3,
          "country": "ESP",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Martin Landaluce",
        "profile": "Live rank #59 | ESP | age 20.3 | 2026 clay 9-6, 60% | adj form 81 | hold 83%",
        "modelPct": 52,
        "weakness": {
          "name": "Martin Landaluce",
          "serviceHoldPct": 83,
          "firstServeWonPct": 71,
          "secondServeWonPct": 53,
          "firstServePct": 63,
          "avgAces": 3.6,
          "avgDoubleFaults": 4.3,
          "avgWinners": 27,
          "avgUnforcedErrors": 34.9,
          "avgBreakPointsFaced": 9.1,
          "returnPointsWonPct": 43,
          "servicePointsWonPct": 65,
          "weakServeMatches": 4,
          "pressureMatches": 4,
          "matchesWithStats": 7,
          "weaknessScore": 19,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "double-fault pressure (4.3 avg)",
            "negative winner/error balance (27.0 winners, 34.9 unforced)",
            "faces too many break points (9.1 avg)",
            "4 recent matches with serve instability"
          ],
          "strengths": [
            "protects serve well (83% hold)",
            "wins enough first-serve points (71%)"
          ],
          "gameFlowRead": "Martin Landaluce can drop points quickly through double-fault pressure (4.3 avg) and negative winner/error balance (27.0 winners, 34.9 unforced)."
        }
      },
      {
        "name": "Vit Kopriva",
        "ranking": {
          "name": "Vít Kopřiva",
          "rank": 62,
          "points": 856,
          "age": 28.9,
          "country": "CZE",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Vit Kopriva",
        "profile": "Live rank #62 | CZE | age 28.9 | 2026 clay 13-10, 56% | adj form 62 | hold 78%",
        "modelPct": 48,
        "weakness": {
          "name": "Vit Kopriva",
          "serviceHoldPct": 78,
          "firstServeWonPct": 72,
          "secondServeWonPct": 49,
          "firstServePct": 63,
          "avgAces": 3,
          "avgDoubleFaults": 2.6,
          "avgWinners": 20.6,
          "avgUnforcedErrors": 24.8,
          "avgBreakPointsFaced": 6.1,
          "returnPointsWonPct": 37,
          "servicePointsWonPct": 64,
          "weakServeMatches": 2,
          "pressureMatches": 1,
          "matchesWithStats": 8,
          "weaknessScore": 5,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "limited return pressure (37% return points won)"
          ],
          "strengths": [
            "protects serve well (78% hold)",
            "wins enough first-serve points (72%)"
          ],
          "gameFlowRead": "Vit Kopriva can drop points quickly through limited return pressure (37% return points won)."
        }
      }
    ]
  },
  {
    "id": "rg-m-francisco-cerundolo-hugo-gaston-2026-05-28",
    "eventId": "175739",
    "tour": "ATP",
    "title": "Francisco Cerundolo vs Hugo Gaston",
    "start": "3:30 AM",
    "startMinutes": 210,
    "court": "Court Simonne-Mathieu",
    "round": "Round 2",
    "pickName": "Francisco Cerundolo",
    "confidence": 69,
    "volatility": 31,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Lean",
      "No blind bet",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Francisco Cerundolo has the recent service-hold edge 78% to 63%. Francisco Cerundolo grades 19 points better on opponent-adjusted recent form. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": 7,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "Spread needs the posted number before grading.",
      "totalRead": "No total edge without posted number and first-set hold data.",
      "pick": {
        "name": "Francisco Cerundolo",
        "serviceHoldPct": 78,
        "firstServeWonPct": 69,
        "secondServeWonPct": 57,
        "firstServePct": 58,
        "avgAces": 3.9,
        "avgDoubleFaults": 2.4,
        "avgWinners": 23.1,
        "avgUnforcedErrors": 35.4,
        "avgBreakPointsFaced": 7,
        "returnPointsWonPct": 43,
        "servicePointsWonPct": 64,
        "weakServeMatches": 2,
        "pressureMatches": 5,
        "matchesWithStats": 7,
        "weaknessScore": 12,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "negative winner/error balance (23.1 winners, 35.4 unforced)"
        ],
        "strengths": [
          "protects serve well (78% hold)",
          "second serve holds up (57%)"
        ],
        "gameFlowRead": "Francisco Cerundolo can drop points quickly through negative winner/error balance (23.1 winners, 35.4 unforced)."
      },
      "opponent": {
        "name": "Hugo Gaston",
        "serviceHoldPct": 63,
        "firstServeWonPct": 62,
        "secondServeWonPct": 48,
        "firstServePct": 54,
        "avgAces": 2.2,
        "avgDoubleFaults": 2,
        "avgWinners": 26,
        "avgUnforcedErrors": 25.8,
        "avgBreakPointsFaced": 10.2,
        "returnPointsWonPct": 39,
        "servicePointsWonPct": 56,
        "weakServeMatches": 3,
        "pressureMatches": 4,
        "matchesWithStats": 5,
        "weaknessScore": 19,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "faces too many break points (10.2 avg)",
          "3 recent matches with serve instability"
        ],
        "strengths": [],
        "gameFlowRead": "Hugo Gaston can drop points quickly through faces too many break points (10.2 avg) and 3 recent matches with serve instability."
      }
    },
    "setWinProjections": [
      {
        "name": "Francisco Cerundolo",
        "confidence": 88,
        "modelPct": 69,
        "label": "Strong set-win path"
      },
      {
        "name": "Hugo Gaston",
        "confidence": 58,
        "modelPct": 31,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Francisco Cerundolo",
        "americanOdds": -1000,
        "modelPct": 69,
        "impliedPct": 90.9,
        "edgePct": -21.9,
        "evPer100": -24.1,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Francisco Cerundolo",
        "line": -8.5,
        "americanOdds": 100,
        "modelPct": 59,
        "impliedPct": 50,
        "edgePct": 9,
        "evPer100": 18,
        "valueGrade": "Bet-grade value",
        "betGrade": true
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Francisco Cerundolo",
          "confidence": 88,
          "modelPct": 69,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Hugo Gaston",
          "confidence": 58,
          "modelPct": 31,
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
      "capturedAt": "2026-05-28T01:28:08.796Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/francisco-cerundolo-v-hugo-gaston-35651999",
      "eventId": "35651999",
      "players": [
        {
          "name": "Francisco Cerundolo",
          "odds": -1000,
          "americanLabel": "-1000",
          "impliedPct": 90.9,
          "decimalOdds": 1.1,
          "modelPct": 69,
          "edgePct": -21.9,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 10,
          "grossPayoutMultiple": 1.1,
          "centsAtRisk": 100,
          "centsProfitIfWin": 10
        },
        {
          "name": "Hugo Gaston",
          "odds": 640,
          "americanLabel": "+640",
          "impliedPct": 13.5,
          "decimalOdds": 7.4,
          "modelPct": 31,
          "edgePct": 17.5,
          "priceBand": "Underdog",
          "grossProfitPct": 640,
          "grossPayoutMultiple": 7.4,
          "centsAtRisk": 100,
          "centsProfitIfWin": 640
        }
      ],
      "desk": {
        "name": "Francisco Cerundolo",
        "odds": -1000,
        "americanLabel": "-1000",
        "impliedPct": 90.9,
        "decimalOdds": 1.1,
        "modelPct": 69,
        "edgePct": -21.9,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 10,
        "grossPayoutMultiple": 1.1,
        "centsAtRisk": 100,
        "centsProfitIfWin": 10
      },
      "spread": {
        "marketLine": -8.5,
        "player": "Francisco Cerundolo",
        "spread": -8.5,
        "odds": 100
      },
      "total": {
        "line": 31.5,
        "side": "Over",
        "odds": -118
      },
      "totalOver": {
        "line": 31.5,
        "side": "Over",
        "odds": -118
      },
      "totalUnder": {
        "line": 31.5,
        "side": "Under",
        "odds": -112
      },
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "Francisco Cerundolo -8.5 (+100)",
      "totalValue": "31.5 games: Over -118 / Under -112",
      "spreadLean": "Large game spread; ML may be cleaner than laying games",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Francisco Cerundolo -1000 / Hugo Gaston +640",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 69% vs FanDuel implied 90.9% (-21.9 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Francisco-Cerundolo-Vs-Hugo-Gaston/",
    "players": [
      {
        "name": "Francisco Cerundolo",
        "ranking": {
          "name": "Francisco Cerúndolo",
          "rank": 23,
          "points": 1610,
          "age": 27.7,
          "country": "ARG",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Francisco Cerundolo",
        "profile": "Live rank #23 | ARG | age 27.7 | 2026 clay 14-7, 67% | adj form 69 | hold 78%",
        "modelPct": 69,
        "weakness": {
          "name": "Francisco Cerundolo",
          "serviceHoldPct": 78,
          "firstServeWonPct": 69,
          "secondServeWonPct": 57,
          "firstServePct": 58,
          "avgAces": 3.9,
          "avgDoubleFaults": 2.4,
          "avgWinners": 23.1,
          "avgUnforcedErrors": 35.4,
          "avgBreakPointsFaced": 7,
          "returnPointsWonPct": 43,
          "servicePointsWonPct": 64,
          "weakServeMatches": 2,
          "pressureMatches": 5,
          "matchesWithStats": 7,
          "weaknessScore": 12,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "negative winner/error balance (23.1 winners, 35.4 unforced)"
          ],
          "strengths": [
            "protects serve well (78% hold)",
            "second serve holds up (57%)"
          ],
          "gameFlowRead": "Francisco Cerundolo can drop points quickly through negative winner/error balance (23.1 winners, 35.4 unforced)."
        }
      },
      {
        "name": "Hugo Gaston",
        "ranking": {
          "name": "Hugo Gaston",
          "rank": 119,
          "points": 533,
          "age": 25.6,
          "country": "FRA",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Hugo Gaston",
        "profile": "Live rank #119 | FRA | age 25.6 | 2026 clay 5-8, 39% | adj form 50 | hold 63%",
        "modelPct": 31,
        "weakness": {
          "name": "Hugo Gaston",
          "serviceHoldPct": 63,
          "firstServeWonPct": 62,
          "secondServeWonPct": 48,
          "firstServePct": 54,
          "avgAces": 2.2,
          "avgDoubleFaults": 2,
          "avgWinners": 26,
          "avgUnforcedErrors": 25.8,
          "avgBreakPointsFaced": 10.2,
          "returnPointsWonPct": 39,
          "servicePointsWonPct": 56,
          "weakServeMatches": 3,
          "pressureMatches": 4,
          "matchesWithStats": 5,
          "weaknessScore": 19,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "faces too many break points (10.2 avg)",
            "3 recent matches with serve instability"
          ],
          "strengths": [],
          "gameFlowRead": "Hugo Gaston can drop points quickly through faces too many break points (10.2 avg) and 3 recent matches with serve instability."
        }
      }
    ]
  },
  {
    "id": "rg-m-hubert-hurkacz-frances-tiafoe-2026-05-28",
    "eventId": "175695",
    "tour": "ATP",
    "title": "Hubert Hurkacz vs Frances Tiafoe",
    "start": "3:30 AM",
    "startMinutes": 210,
    "court": "Court 14",
    "round": "Round 2",
    "pickName": "Frances Tiafoe",
    "confidence": 53,
    "volatility": 47,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Watch only",
      "Positive price edge",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Recent service hold is close: Frances Tiafoe 80%, Hubert Hurkacz 82%. Opponent-adjusted recent form is basically even: Frances Tiafoe 81, Hubert Hurkacz 81. Lean, not a chase.",
    "totals": "Best O/U angle: over if the book hangs a low best-of-five number, because both recent hold profiles can extend sets.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": -5,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "Spread needs the posted number before grading.",
      "totalRead": "No total edge without posted number and first-set hold data.",
      "pick": {
        "name": "Frances Tiafoe",
        "serviceHoldPct": 80,
        "firstServeWonPct": 72,
        "secondServeWonPct": 50,
        "firstServePct": 55,
        "avgAces": 4.8,
        "avgDoubleFaults": 3,
        "avgWinners": 27.8,
        "avgUnforcedErrors": 31,
        "avgBreakPointsFaced": 6.4,
        "returnPointsWonPct": 40,
        "servicePointsWonPct": 62,
        "weakServeMatches": 2,
        "pressureMatches": 7,
        "matchesWithStats": 5,
        "weaknessScore": 12,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "protects serve well (80% hold)",
          "wins enough first-serve points (72%)"
        ],
        "gameFlowRead": "Frances Tiafoe has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Hubert Hurkacz",
        "serviceHoldPct": 82,
        "firstServeWonPct": 75,
        "secondServeWonPct": 53,
        "firstServePct": 61,
        "avgAces": 11.3,
        "avgDoubleFaults": 2.3,
        "avgWinners": 37,
        "avgUnforcedErrors": 37.3,
        "avgBreakPointsFaced": 8,
        "returnPointsWonPct": 35,
        "servicePointsWonPct": 67,
        "weakServeMatches": 0,
        "pressureMatches": 6,
        "matchesWithStats": 3,
        "weaknessScore": 7,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "faces too many break points (8.0 avg)",
          "limited return pressure (35% return points won)"
        ],
        "strengths": [
          "protects serve well (82% hold)",
          "wins enough first-serve points (75%)"
        ],
        "gameFlowRead": "Hubert Hurkacz can drop points quickly through faces too many break points (8.0 avg) and limited return pressure (35% return points won)."
      }
    },
    "setWinProjections": [
      {
        "name": "Hubert Hurkacz",
        "confidence": 75,
        "modelPct": 47,
        "label": "Live to win a set"
      },
      {
        "name": "Frances Tiafoe",
        "confidence": 83,
        "modelPct": 53,
        "label": "Strong set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Frances Tiafoe",
        "americanOdds": 126,
        "modelPct": 53,
        "impliedPct": 44.2,
        "edgePct": 8.8,
        "evPer100": 19.8,
        "valueGrade": "Bet-grade value",
        "betGrade": true
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Frances Tiafoe",
        "line": 1.5,
        "americanOdds": -110,
        "modelPct": 47,
        "impliedPct": 52.4,
        "edgePct": -5.4,
        "evPer100": -10.3,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 40.5,
        "americanOdds": -118,
        "modelPct": 45,
        "impliedPct": 54.1,
        "edgePct": -9.1,
        "evPer100": -16.9,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Hubert Hurkacz",
          "confidence": 75,
          "modelPct": 47,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Frances Tiafoe",
          "confidence": 83,
          "modelPct": 53,
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
      "capturedAt": "2026-05-28T01:28:13.978Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/hubert-hurkacz-v-frances-tiafoe-35651294",
      "eventId": "35651294",
      "players": [
        {
          "name": "Hubert Hurkacz",
          "odds": -152,
          "americanLabel": "-152",
          "impliedPct": 60.3,
          "decimalOdds": 1.658,
          "modelPct": 47,
          "edgePct": -13.3,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 65.8,
          "grossPayoutMultiple": 1.658,
          "centsAtRisk": 100,
          "centsProfitIfWin": 65.8
        },
        {
          "name": "Frances Tiafoe",
          "odds": 126,
          "americanLabel": "+126",
          "impliedPct": 44.2,
          "decimalOdds": 2.26,
          "modelPct": 53,
          "edgePct": 8.8,
          "priceBand": "Underdog",
          "grossProfitPct": 126,
          "grossPayoutMultiple": 2.26,
          "centsAtRisk": 100,
          "centsProfitIfWin": 126
        }
      ],
      "desk": {
        "name": "Frances Tiafoe",
        "odds": 126,
        "americanLabel": "+126",
        "impliedPct": 44.2,
        "decimalOdds": 2.26,
        "modelPct": 53,
        "edgePct": 8.8,
        "priceBand": "Underdog",
        "grossProfitPct": 126,
        "grossPayoutMultiple": 2.26,
        "centsAtRisk": 100,
        "centsProfitIfWin": 126
      },
      "spread": {
        "marketLine": -1.5,
        "player": "Frances Tiafoe",
        "spread": 1.5,
        "odds": -110
      },
      "total": {
        "line": 40.5,
        "side": "Over",
        "odds": -118
      },
      "totalOver": {
        "line": 40.5,
        "side": "Over",
        "odds": -118
      },
      "totalUnder": {
        "line": 40.5,
        "side": "Under",
        "odds": -112
      },
      "priceAction": "Model is meaningfully above FanDuel implied price.",
      "spreadValue": "Frances Tiafoe +1.5 (-110)",
      "totalValue": "40.5 games: Over -118 / Under -112",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Over lean if both players hold early",
      "mlValue": "Hubert Hurkacz -152 / Frances Tiafoe +126",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. Model is meaningfully above FanDuel implied price.",
      "noVigNote": "Model 53% vs FanDuel implied 44.2% (+8.8 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Hubert-Hurkacz-Vs-Frances-Tiafoe/",
    "players": [
      {
        "name": "Hubert Hurkacz",
        "ranking": {
          "name": "Hubert Hurkacz",
          "rank": 88,
          "points": 640,
          "age": 29.2,
          "country": "POL",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Hubert Hurkacz",
        "profile": "Live rank #88 | POL | age 29.2 | 2026 clay 8-4, 67% | adj form 81 | hold 82%",
        "modelPct": 47,
        "weakness": {
          "name": "Hubert Hurkacz",
          "serviceHoldPct": 82,
          "firstServeWonPct": 75,
          "secondServeWonPct": 53,
          "firstServePct": 61,
          "avgAces": 11.3,
          "avgDoubleFaults": 2.3,
          "avgWinners": 37,
          "avgUnforcedErrors": 37.3,
          "avgBreakPointsFaced": 8,
          "returnPointsWonPct": 35,
          "servicePointsWonPct": 67,
          "weakServeMatches": 0,
          "pressureMatches": 6,
          "matchesWithStats": 3,
          "weaknessScore": 7,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "faces too many break points (8.0 avg)",
            "limited return pressure (35% return points won)"
          ],
          "strengths": [
            "protects serve well (82% hold)",
            "wins enough first-serve points (75%)"
          ],
          "gameFlowRead": "Hubert Hurkacz can drop points quickly through faces too many break points (8.0 avg) and limited return pressure (35% return points won)."
        }
      },
      {
        "name": "Frances Tiafoe",
        "ranking": {
          "name": "Frances Tiafoe",
          "rank": 26,
          "points": 1555,
          "age": 28.3,
          "country": "USA",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Frances Tiafoe",
        "profile": "Live rank #26 | USA | age 28.3 | 2026 clay 5-3, 63% | adj form 81 | hold 80%",
        "modelPct": 53,
        "weakness": {
          "name": "Frances Tiafoe",
          "serviceHoldPct": 80,
          "firstServeWonPct": 72,
          "secondServeWonPct": 50,
          "firstServePct": 55,
          "avgAces": 4.8,
          "avgDoubleFaults": 3,
          "avgWinners": 27.8,
          "avgUnforcedErrors": 31,
          "avgBreakPointsFaced": 6.4,
          "returnPointsWonPct": 40,
          "servicePointsWonPct": 62,
          "weakServeMatches": 2,
          "pressureMatches": 7,
          "matchesWithStats": 5,
          "weaknessScore": 12,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "protects serve well (80% hold)",
            "wins enough first-serve points (72%)"
          ],
          "gameFlowRead": "Frances Tiafoe has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-w-anna-kalinskaya-alina-korneeva-2026-05-28",
    "eventId": "175582",
    "tour": "WTA",
    "title": "Anna Kalinskaya vs Alina Korneeva",
    "start": "4:00 AM",
    "startMinutes": 240,
    "court": "Court 6",
    "round": "Round 2",
    "pickName": "Anna Kalinskaya",
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
    "reason": "Alina Korneeva has the recent service-hold edge 71% to 59%, so Anna Kalinskaya needs the rank/form edge to show up on return games. Alina Korneeva grades 21 points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness warning",
      "target": "Anna Kalinskaya",
      "scoreGap": -14,
      "attackingSide": null,
      "vulnerableSide": "Anna Kalinskaya",
      "gameFlow": "Anna Kalinskaya is the model side, but the fragile profile is on our pick: low recent hold rate (59%); first-serve points won below comfort (60%). Avoid laying a bad price until early holds are confirmed.",
      "liveTrigger": "Do not upgrade Anna Kalinskaya unless they hold cleanly in the first service game and keep double faults down.",
      "spreadRead": "Spread needs the posted number before grading.",
      "totalRead": "Weak service profile points to breaks; be careful with low unders.",
      "pick": {
        "name": "Anna Kalinskaya",
        "serviceHoldPct": 59,
        "firstServeWonPct": 60,
        "secondServeWonPct": 39,
        "firstServePct": 64,
        "avgAces": 1.4,
        "avgDoubleFaults": 4.6,
        "avgWinners": 18,
        "avgUnforcedErrors": 22,
        "avgBreakPointsFaced": 9,
        "returnPointsWonPct": 43,
        "servicePointsWonPct": 52,
        "weakServeMatches": 4,
        "pressureMatches": 1,
        "matchesWithStats": 5,
        "weaknessScore": 33,
        "firstGameComfort": "Fragile opening-service profile",
        "liabilities": [
          "low recent hold rate (59%)",
          "first-serve points won below comfort (60%)",
          "second-serve points won are attackable (39%)",
          "double-fault pressure (4.6 avg)",
          "faces too many break points (9.0 avg)",
          "4 recent matches with serve instability"
        ],
        "strengths": [],
        "gameFlowRead": "Anna Kalinskaya can drop points quickly through low recent hold rate (59%) and first-serve points won below comfort (60%)."
      },
      "opponent": {
        "name": "Alina Korneeva",
        "serviceHoldPct": 71,
        "firstServeWonPct": 65,
        "secondServeWonPct": 44,
        "firstServePct": 68,
        "avgAces": 3.3,
        "avgDoubleFaults": 4.2,
        "avgWinners": 26.7,
        "avgUnforcedErrors": 34.3,
        "avgBreakPointsFaced": 9.2,
        "returnPointsWonPct": 47,
        "servicePointsWonPct": 58,
        "weakServeMatches": 3,
        "pressureMatches": 4,
        "matchesWithStats": 6,
        "weaknessScore": 19,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "second-serve points won are attackable (44%)",
          "double-fault pressure (4.2 avg)",
          "negative winner/error balance (26.7 winners, 34.3 unforced)",
          "faces too many break points (9.2 avg)",
          "3 recent matches with serve instability"
        ],
        "strengths": [
          "creates return pressure (47% return points won)"
        ],
        "gameFlowRead": "Alina Korneeva can drop points quickly through second-serve points won are attackable (44%) and double-fault pressure (4.2 avg)."
      }
    },
    "setWinProjections": [
      {
        "name": "Anna Kalinskaya",
        "confidence": 68,
        "modelPct": 54,
        "label": "Live to win a set"
      },
      {
        "name": "Alina Korneeva",
        "confidence": 60,
        "modelPct": 46,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Anna Kalinskaya",
        "americanOdds": -260,
        "modelPct": 54,
        "impliedPct": 72.2,
        "edgePct": -18.2,
        "evPer100": -25.2,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Anna Kalinskaya",
        "line": -4.5,
        "americanOdds": -104,
        "modelPct": 42,
        "impliedPct": 51,
        "edgePct": -9,
        "evPer100": -17.6,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 20.5,
        "americanOdds": -122,
        "modelPct": 46,
        "impliedPct": 55,
        "edgePct": -9,
        "evPer100": -16.3,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Anna Kalinskaya",
          "confidence": 68,
          "modelPct": 54,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Alina Korneeva",
          "confidence": 60,
          "modelPct": 46,
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
      "capturedAt": "2026-05-28T01:28:19.158Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/anna-kalinskaya-v-alina-korneeva-35654774",
      "eventId": "35654774",
      "players": [
        {
          "name": "Anna Kalinskaya",
          "odds": -260,
          "americanLabel": "-260",
          "impliedPct": 72.2,
          "decimalOdds": 1.385,
          "modelPct": 54,
          "edgePct": -18.2,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 38.5,
          "grossPayoutMultiple": 1.385,
          "centsAtRisk": 100,
          "centsProfitIfWin": 38.5
        },
        {
          "name": "Alina Korneeva",
          "odds": 210,
          "americanLabel": "+210",
          "impliedPct": 32.3,
          "decimalOdds": 3.1,
          "modelPct": 46,
          "edgePct": 13.7,
          "priceBand": "Underdog",
          "grossProfitPct": 210,
          "grossPayoutMultiple": 3.1,
          "centsAtRisk": 100,
          "centsProfitIfWin": 210
        }
      ],
      "desk": {
        "name": "Anna Kalinskaya",
        "odds": -260,
        "americanLabel": "-260",
        "impliedPct": 72.2,
        "decimalOdds": 1.385,
        "modelPct": 54,
        "edgePct": -18.2,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 38.5,
        "grossPayoutMultiple": 1.385,
        "centsAtRisk": 100,
        "centsProfitIfWin": 38.5
      },
      "spread": {
        "marketLine": -4.5,
        "player": "Anna Kalinskaya",
        "spread": -4.5,
        "odds": -104
      },
      "total": {
        "line": 20.5,
        "side": "Over",
        "odds": -122
      },
      "totalOver": {
        "line": 20.5,
        "side": "Over",
        "odds": -122
      },
      "totalUnder": {
        "line": 20.5,
        "side": "Under",
        "odds": -110
      },
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "Anna Kalinskaya -4.5 (-104)",
      "totalValue": "20.5 games: Over -122 / Under -110",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Over or pass if early service games are loose",
      "mlValue": "Anna Kalinskaya -260 / Alina Korneeva +210",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 54% vs FanDuel implied 72.2% (-18.2 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Anna-Kalinskaya-Vs-Alina-Korneeva/",
    "players": [
      {
        "name": "Anna Kalinskaya",
        "ranking": {
          "name": "Anna Kalinskaya",
          "rank": 20,
          "points": 1852,
          "age": 27.4,
          "country": "RUS",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Anna Kalinskaya",
        "profile": "Live rank #20 | RUS | age 27.4 | 2026 clay 5-3, 63% | adj form 62 | hold 59%",
        "modelPct": 54,
        "weakness": {
          "name": "Anna Kalinskaya",
          "serviceHoldPct": 59,
          "firstServeWonPct": 60,
          "secondServeWonPct": 39,
          "firstServePct": 64,
          "avgAces": 1.4,
          "avgDoubleFaults": 4.6,
          "avgWinners": 18,
          "avgUnforcedErrors": 22,
          "avgBreakPointsFaced": 9,
          "returnPointsWonPct": 43,
          "servicePointsWonPct": 52,
          "weakServeMatches": 4,
          "pressureMatches": 1,
          "matchesWithStats": 5,
          "weaknessScore": 33,
          "firstGameComfort": "Fragile opening-service profile",
          "liabilities": [
            "low recent hold rate (59%)",
            "first-serve points won below comfort (60%)",
            "second-serve points won are attackable (39%)",
            "double-fault pressure (4.6 avg)",
            "faces too many break points (9.0 avg)",
            "4 recent matches with serve instability"
          ],
          "strengths": [],
          "gameFlowRead": "Anna Kalinskaya can drop points quickly through low recent hold rate (59%) and first-serve points won below comfort (60%)."
        }
      },
      {
        "name": "Alina Korneeva",
        "ranking": {
          "name": "Alina Korneeva",
          "rank": 94,
          "points": 793,
          "age": 18.9,
          "country": "RUS",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Alina Korneeva",
        "profile": "Live rank #94 | RUS | age 18.9 | 2026 clay 7-4, 64% | adj form 84 | hold 71%",
        "modelPct": 46,
        "weakness": {
          "name": "Alina Korneeva",
          "serviceHoldPct": 71,
          "firstServeWonPct": 65,
          "secondServeWonPct": 44,
          "firstServePct": 68,
          "avgAces": 3.3,
          "avgDoubleFaults": 4.2,
          "avgWinners": 26.7,
          "avgUnforcedErrors": 34.3,
          "avgBreakPointsFaced": 9.2,
          "returnPointsWonPct": 47,
          "servicePointsWonPct": 58,
          "weakServeMatches": 3,
          "pressureMatches": 4,
          "matchesWithStats": 6,
          "weaknessScore": 19,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "second-serve points won are attackable (44%)",
            "double-fault pressure (4.2 avg)",
            "negative winner/error balance (26.7 winners, 34.3 unforced)",
            "faces too many break points (9.2 avg)",
            "3 recent matches with serve instability"
          ],
          "strengths": [
            "creates return pressure (47% return points won)"
          ],
          "gameFlowRead": "Alina Korneeva can drop points quickly through second-serve points won are attackable (44%) and double-fault pressure (4.2 avg)."
        }
      }
    ]
  },
  {
    "id": "rg-w-diana-shnaider-mccartney-kessler-2026-05-28",
    "eventId": "175563",
    "tour": "WTA",
    "title": "Diana Shnaider vs McCartney Kessler",
    "start": "4:00 AM",
    "startMinutes": 240,
    "court": "Court 7",
    "round": "Round 2",
    "pickName": "Diana Shnaider",
    "confidence": 50,
    "volatility": 60,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Watch only",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Diana Shnaider has the recent service-hold edge 58% to 54%. Opponent-adjusted recent form is basically even: Diana Shnaider 57, McCartney Kessler 58. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": 4,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "Game spread is fragile; prefer live entry after the first service cycle.",
      "totalRead": "Weak service profile points to breaks; be careful with low unders.",
      "pick": {
        "name": "Diana Shnaider",
        "serviceHoldPct": 58,
        "firstServeWonPct": 55,
        "secondServeWonPct": 47,
        "firstServePct": 64,
        "avgAces": 0.8,
        "avgDoubleFaults": 2.8,
        "avgWinners": 22,
        "avgUnforcedErrors": 27,
        "avgBreakPointsFaced": 10.8,
        "returnPointsWonPct": 46,
        "servicePointsWonPct": 52,
        "weakServeMatches": 5,
        "pressureMatches": 4,
        "matchesWithStats": 5,
        "weaknessScore": 34,
        "firstGameComfort": "Fragile opening-service profile",
        "liabilities": [
          "low recent hold rate (58%)",
          "first-serve points won below comfort (55%)",
          "faces too many break points (10.8 avg)",
          "5 recent matches with serve instability"
        ],
        "strengths": [
          "creates return pressure (46% return points won)"
        ],
        "gameFlowRead": "Diana Shnaider can drop points quickly through low recent hold rate (58%) and first-serve points won below comfort (55%)."
      },
      "opponent": {
        "name": "McCartney Kessler",
        "serviceHoldPct": 54,
        "firstServeWonPct": 59,
        "secondServeWonPct": 41,
        "firstServePct": 63,
        "avgAces": 1.8,
        "avgDoubleFaults": 3.6,
        "avgWinners": null,
        "avgUnforcedErrors": null,
        "avgBreakPointsFaced": 11,
        "returnPointsWonPct": 48,
        "servicePointsWonPct": 52,
        "weakServeMatches": 4,
        "pressureMatches": 4,
        "matchesWithStats": 5,
        "weaknessScore": 38,
        "firstGameComfort": "Fragile opening-service profile",
        "liabilities": [
          "low recent hold rate (54%)",
          "first-serve points won below comfort (59%)",
          "second-serve points won are attackable (41%)",
          "faces too many break points (11.0 avg)",
          "4 recent matches with serve instability"
        ],
        "strengths": [
          "creates return pressure (48% return points won)"
        ],
        "gameFlowRead": "McCartney Kessler can drop points quickly through low recent hold rate (54%) and first-serve points won below comfort (59%)."
      }
    },
    "setWinProjections": [
      {
        "name": "Diana Shnaider",
        "confidence": 66,
        "modelPct": 50,
        "label": "Needs early hold pressure"
      },
      {
        "name": "McCartney Kessler",
        "confidence": 65,
        "modelPct": 50,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Diana Shnaider",
        "americanOdds": -400,
        "modelPct": 50,
        "impliedPct": 80,
        "edgePct": -30,
        "evPer100": -37.5,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Diana Shnaider",
        "line": -5.5,
        "americanOdds": 102,
        "modelPct": 44,
        "impliedPct": 49.5,
        "edgePct": -5.5,
        "evPer100": -11.1,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 19.5,
        "americanOdds": -122,
        "modelPct": 42,
        "impliedPct": 55,
        "edgePct": -13,
        "evPer100": -23.6,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Diana Shnaider",
          "confidence": 66,
          "modelPct": 50,
          "label": "Needs early hold pressure",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "McCartney Kessler",
          "confidence": 65,
          "modelPct": 50,
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
      "capturedAt": "2026-05-28T01:28:24.330Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/diana-shnaider-v-mccartney-kessler-35651909",
      "eventId": "35651909",
      "players": [
        {
          "name": "Diana Shnaider",
          "odds": -400,
          "americanLabel": "-400",
          "impliedPct": 80,
          "decimalOdds": 1.25,
          "modelPct": 50,
          "edgePct": -30,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 25,
          "grossPayoutMultiple": 1.25,
          "centsAtRisk": 100,
          "centsProfitIfWin": 25
        },
        {
          "name": "McCartney Kessler",
          "odds": 315,
          "americanLabel": "+315",
          "impliedPct": 24.1,
          "decimalOdds": 4.15,
          "modelPct": 50,
          "edgePct": 25.9,
          "priceBand": "Underdog",
          "grossProfitPct": 315,
          "grossPayoutMultiple": 4.15,
          "centsAtRisk": 100,
          "centsProfitIfWin": 315
        }
      ],
      "desk": {
        "name": "Diana Shnaider",
        "odds": -400,
        "americanLabel": "-400",
        "impliedPct": 80,
        "decimalOdds": 1.25,
        "modelPct": 50,
        "edgePct": -30,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 25,
        "grossPayoutMultiple": 1.25,
        "centsAtRisk": 100,
        "centsProfitIfWin": 25
      },
      "spread": {
        "marketLine": -5.5,
        "player": "Diana Shnaider",
        "spread": -5.5,
        "odds": 102
      },
      "total": {
        "line": 19.5,
        "side": "Over",
        "odds": -122
      },
      "totalOver": {
        "line": 19.5,
        "side": "Over",
        "odds": -122
      },
      "totalUnder": {
        "line": 19.5,
        "side": "Under",
        "odds": -110
      },
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "Diana Shnaider -5.5 (+102)",
      "totalValue": "19.5 games: Over -122 / Under -110",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Over or pass if early service games are loose",
      "mlValue": "Diana Shnaider -400 / McCartney Kessler +315",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 50% vs FanDuel implied 80% (-30 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Diana-Shnaider-Vs-McCartney-Kessler/",
    "players": [
      {
        "name": "Diana Shnaider",
        "ranking": {
          "name": "Diana Shnaider",
          "rank": 23,
          "points": 1796,
          "age": 22.1,
          "country": "RUS",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Diana Shnaider",
        "profile": "Live rank #23 | RUS | age 22.1 | 2026 clay 6-4, 60% | adj form 57 | hold 58%",
        "modelPct": 50,
        "weakness": {
          "name": "Diana Shnaider",
          "serviceHoldPct": 58,
          "firstServeWonPct": 55,
          "secondServeWonPct": 47,
          "firstServePct": 64,
          "avgAces": 0.8,
          "avgDoubleFaults": 2.8,
          "avgWinners": 22,
          "avgUnforcedErrors": 27,
          "avgBreakPointsFaced": 10.8,
          "returnPointsWonPct": 46,
          "servicePointsWonPct": 52,
          "weakServeMatches": 5,
          "pressureMatches": 4,
          "matchesWithStats": 5,
          "weaknessScore": 34,
          "firstGameComfort": "Fragile opening-service profile",
          "liabilities": [
            "low recent hold rate (58%)",
            "first-serve points won below comfort (55%)",
            "faces too many break points (10.8 avg)",
            "5 recent matches with serve instability"
          ],
          "strengths": [
            "creates return pressure (46% return points won)"
          ],
          "gameFlowRead": "Diana Shnaider can drop points quickly through low recent hold rate (58%) and first-serve points won below comfort (55%)."
        }
      },
      {
        "name": "McCartney Kessler",
        "ranking": {
          "name": "Mccartney Kessler",
          "rank": 37,
          "points": 1289,
          "age": 26.8,
          "country": "USA",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Mccartney Kessler",
        "profile": "Live rank #37 | USA | age 26.8 | 2026 clay 7-5, 58% | adj form 58 | hold 54%",
        "modelPct": 50,
        "weakness": {
          "name": "McCartney Kessler",
          "serviceHoldPct": 54,
          "firstServeWonPct": 59,
          "secondServeWonPct": 41,
          "firstServePct": 63,
          "avgAces": 1.8,
          "avgDoubleFaults": 3.6,
          "avgWinners": null,
          "avgUnforcedErrors": null,
          "avgBreakPointsFaced": 11,
          "returnPointsWonPct": 48,
          "servicePointsWonPct": 52,
          "weakServeMatches": 4,
          "pressureMatches": 4,
          "matchesWithStats": 5,
          "weaknessScore": 38,
          "firstGameComfort": "Fragile opening-service profile",
          "liabilities": [
            "low recent hold rate (54%)",
            "first-serve points won below comfort (59%)",
            "second-serve points won are attackable (41%)",
            "faces too many break points (11.0 avg)",
            "4 recent matches with serve instability"
          ],
          "strengths": [
            "creates return pressure (48% return points won)"
          ],
          "gameFlowRead": "McCartney Kessler can drop points quickly through low recent hold rate (54%) and first-serve points won below comfort (59%)."
        }
      }
    ]
  },
  {
    "id": "rg-w-julia-grabher-amanda-anisimova-2026-05-28",
    "eventId": "175529",
    "tour": "WTA",
    "title": "Julia Grabher vs Amanda Anisimova",
    "start": "4:00 AM",
    "startMinutes": 240,
    "court": "Court Suzanne-Lenglen",
    "round": "Round 2",
    "pickName": "Amanda Anisimova",
    "confidence": 67,
    "volatility": 38,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Lean",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Recent service hold is close: Amanda Anisimova 63%, Julia Grabher 62%. Opponent-adjusted recent form is basically even: Amanda Anisimova 63, Julia Grabher 62. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness edge",
      "target": "Julia Grabher",
      "scoreGap": 10,
      "attackingSide": "Amanda Anisimova",
      "vulnerableSide": "Julia Grabher",
      "gameFlow": "Amanda Anisimova has a real path if Julia Grabher's first two service games show the same weakness: first-serve points won below comfort (58%); double-fault pressure (4.6 avg).",
      "liveTrigger": "Look for Julia Grabher facing break points or second-serve pressure before 3-3.",
      "spreadRead": "Amanda Anisimova game spread is more interesting than ML if the number is short.",
      "totalRead": "Weak service profile points to breaks; be careful with low unders.",
      "pick": {
        "name": "Amanda Anisimova",
        "serviceHoldPct": 63,
        "firstServeWonPct": 67,
        "secondServeWonPct": 43,
        "firstServePct": 59,
        "avgAces": 3,
        "avgDoubleFaults": 5,
        "avgWinners": 24,
        "avgUnforcedErrors": 24,
        "avgBreakPointsFaced": 8,
        "returnPointsWonPct": 69,
        "servicePointsWonPct": 57,
        "weakServeMatches": 1,
        "pressureMatches": 3,
        "matchesWithStats": 1,
        "weaknessScore": 18,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "second-serve points won are attackable (43%)",
          "double-fault pressure (5.0 avg)",
          "faces too many break points (8.0 avg)"
        ],
        "strengths": [
          "creates return pressure (69% return points won)"
        ],
        "gameFlowRead": "Amanda Anisimova can drop points quickly through second-serve points won are attackable (43%) and double-fault pressure (5.0 avg)."
      },
      "opponent": {
        "name": "Julia Grabher",
        "serviceHoldPct": 62,
        "firstServeWonPct": 58,
        "secondServeWonPct": 50,
        "firstServePct": 65,
        "avgAces": 1.6,
        "avgDoubleFaults": 4.6,
        "avgWinners": 24,
        "avgUnforcedErrors": 18,
        "avgBreakPointsFaced": 8.4,
        "returnPointsWonPct": 44,
        "servicePointsWonPct": 56,
        "weakServeMatches": 4,
        "pressureMatches": 5,
        "matchesWithStats": 5,
        "weaknessScore": 28,
        "firstGameComfort": "Fragile opening-service profile",
        "liabilities": [
          "first-serve points won below comfort (58%)",
          "double-fault pressure (4.6 avg)",
          "faces too many break points (8.4 avg)",
          "4 recent matches with serve instability"
        ],
        "strengths": [
          "positive winner/error balance (24.0 winners, 18.0 unforced)"
        ],
        "gameFlowRead": "Julia Grabher can drop points quickly through first-serve points won below comfort (58%) and double-fault pressure (4.6 avg)."
      }
    },
    "setWinProjections": [
      {
        "name": "Julia Grabher",
        "confidence": 44,
        "modelPct": 33,
        "label": "Thin set-win path"
      },
      {
        "name": "Amanda Anisimova",
        "confidence": 75,
        "modelPct": 67,
        "label": "Live to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Amanda Anisimova",
        "americanOdds": -600,
        "modelPct": 67,
        "impliedPct": 85.7,
        "edgePct": -18.7,
        "evPer100": -21.8,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Amanda Anisimova",
        "line": -5.5,
        "americanOdds": -110,
        "modelPct": 65,
        "impliedPct": 52.4,
        "edgePct": 12.6,
        "evPer100": 24.1,
        "valueGrade": "Bet-grade value",
        "betGrade": true
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 19.5,
        "americanOdds": -120,
        "modelPct": 59,
        "impliedPct": 54.5,
        "edgePct": 4.5,
        "evPer100": 8.2,
        "valueGrade": "Thin value",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Julia Grabher",
          "confidence": 44,
          "modelPct": 33,
          "label": "Thin set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Amanda Anisimova",
          "confidence": 75,
          "modelPct": 67,
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
      "capturedAt": "2026-05-28T01:28:29.515Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/julia-grabher-v-amanda-anisimova-35651262",
      "eventId": "35651262",
      "players": [
        {
          "name": "Julia Grabher",
          "odds": 420,
          "americanLabel": "+420",
          "impliedPct": 19.2,
          "decimalOdds": 5.2,
          "modelPct": 33,
          "edgePct": 13.8,
          "priceBand": "Underdog",
          "grossProfitPct": 420,
          "grossPayoutMultiple": 5.2,
          "centsAtRisk": 100,
          "centsProfitIfWin": 420
        },
        {
          "name": "Amanda Anisimova",
          "odds": -600,
          "americanLabel": "-600",
          "impliedPct": 85.7,
          "decimalOdds": 1.167,
          "modelPct": 67,
          "edgePct": -18.7,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 16.7,
          "grossPayoutMultiple": 1.167,
          "centsAtRisk": 100,
          "centsProfitIfWin": 16.7
        }
      ],
      "desk": {
        "name": "Amanda Anisimova",
        "odds": -600,
        "americanLabel": "-600",
        "impliedPct": 85.7,
        "decimalOdds": 1.167,
        "modelPct": 67,
        "edgePct": -18.7,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 16.7,
        "grossPayoutMultiple": 1.167,
        "centsAtRisk": 100,
        "centsProfitIfWin": 16.7
      },
      "spread": {
        "marketLine": 5.5,
        "player": "Amanda Anisimova",
        "spread": -5.5,
        "odds": -110
      },
      "total": {
        "line": 19.5,
        "side": "Over",
        "odds": -120
      },
      "totalOver": {
        "line": 19.5,
        "side": "Over",
        "odds": -120
      },
      "totalUnder": {
        "line": 19.5,
        "side": "Under",
        "odds": -110
      },
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "Amanda Anisimova -5.5 (-110)",
      "totalValue": "19.5 games: Over -120 / Under -110",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Over or pass if early service games are loose",
      "mlValue": "Julia Grabher +420 / Amanda Anisimova -600",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 67% vs FanDuel implied 85.7% (-18.7 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Julia-Grabher-Vs-Amanda-Anisimova/",
    "players": [
      {
        "name": "Julia Grabher",
        "ranking": {
          "name": "Julia Grabher",
          "rank": 113,
          "points": 682,
          "age": 29.8,
          "country": "AUT",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Julia Grabher",
        "profile": "Live rank #113 | AUT | age 29.8 | 2026 clay 7-8, 47% | adj form 62 | hold 62%",
        "modelPct": 33,
        "weakness": {
          "name": "Julia Grabher",
          "serviceHoldPct": 62,
          "firstServeWonPct": 58,
          "secondServeWonPct": 50,
          "firstServePct": 65,
          "avgAces": 1.6,
          "avgDoubleFaults": 4.6,
          "avgWinners": 24,
          "avgUnforcedErrors": 18,
          "avgBreakPointsFaced": 8.4,
          "returnPointsWonPct": 44,
          "servicePointsWonPct": 56,
          "weakServeMatches": 4,
          "pressureMatches": 5,
          "matchesWithStats": 5,
          "weaknessScore": 28,
          "firstGameComfort": "Fragile opening-service profile",
          "liabilities": [
            "first-serve points won below comfort (58%)",
            "double-fault pressure (4.6 avg)",
            "faces too many break points (8.4 avg)",
            "4 recent matches with serve instability"
          ],
          "strengths": [
            "positive winner/error balance (24.0 winners, 18.0 unforced)"
          ],
          "gameFlowRead": "Julia Grabher can drop points quickly through first-serve points won below comfort (58%) and double-fault pressure (4.6 avg)."
        }
      },
      {
        "name": "Amanda Anisimova",
        "ranking": {
          "name": "Amanda Anisimova",
          "rank": 5,
          "points": 5788,
          "age": 24.7,
          "country": "USA",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Amanda Anisimova",
        "profile": "Live rank #5 | USA | age 24.7 | 2026 clay 1-0, 100% | adj form 63 | hold 63%",
        "modelPct": 67,
        "weakness": {
          "name": "Amanda Anisimova",
          "serviceHoldPct": 63,
          "firstServeWonPct": 67,
          "secondServeWonPct": 43,
          "firstServePct": 59,
          "avgAces": 3,
          "avgDoubleFaults": 5,
          "avgWinners": 24,
          "avgUnforcedErrors": 24,
          "avgBreakPointsFaced": 8,
          "returnPointsWonPct": 69,
          "servicePointsWonPct": 57,
          "weakServeMatches": 1,
          "pressureMatches": 3,
          "matchesWithStats": 1,
          "weaknessScore": 18,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "second-serve points won are attackable (43%)",
            "double-fault pressure (5.0 avg)",
            "faces too many break points (8.0 avg)"
          ],
          "strengths": [
            "creates return pressure (69% return points won)"
          ],
          "gameFlowRead": "Amanda Anisimova can drop points quickly through second-serve points won are attackable (43%) and double-fault pressure (5.0 avg)."
        }
      }
    ]
  },
  {
    "id": "rg-w-maja-chwalinska-elise-mertens-2026-05-28",
    "eventId": "175532",
    "tour": "WTA",
    "title": "Maja Chwalinska vs Elise Mertens",
    "start": "4:00 AM",
    "startMinutes": 240,
    "court": "Court 12",
    "round": "Round 2",
    "pickName": "Elise Mertens",
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
    "reason": "Recent service hold is close: Elise Mertens 76%, Maja Chwalinska 77%. Maja Chwalinska grades 27 points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": 0,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "Spread needs the posted number before grading.",
      "totalRead": "No total edge without posted number and first-set hold data.",
      "pick": {
        "name": "Elise Mertens",
        "serviceHoldPct": 76,
        "firstServeWonPct": 71,
        "secondServeWonPct": 49,
        "firstServePct": 62,
        "avgAces": 4.2,
        "avgDoubleFaults": 2.7,
        "avgWinners": 36,
        "avgUnforcedErrors": 22,
        "avgBreakPointsFaced": 6.3,
        "returnPointsWonPct": 47,
        "servicePointsWonPct": 63,
        "weakServeMatches": 1,
        "pressureMatches": 3,
        "matchesWithStats": 6,
        "weaknessScore": 3,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "protects serve well (76% hold)",
          "wins enough first-serve points (71%)",
          "positive winner/error balance (36.0 winners, 22.0 unforced)",
          "creates return pressure (47% return points won)"
        ],
        "gameFlowRead": "Elise Mertens has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Maja Chwalinska",
        "serviceHoldPct": 77,
        "firstServeWonPct": 63,
        "secondServeWonPct": 61,
        "firstServePct": 71,
        "avgAces": null,
        "avgDoubleFaults": 0,
        "avgWinners": 17.3,
        "avgUnforcedErrors": 9.7,
        "avgBreakPointsFaced": 4.7,
        "returnPointsWonPct": 62,
        "servicePointsWonPct": 63,
        "weakServeMatches": 1,
        "pressureMatches": 3,
        "matchesWithStats": 3,
        "weaknessScore": 3,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "protects serve well (77% hold)",
          "second serve holds up (61%)",
          "positive winner/error balance (17.3 winners, 9.7 unforced)",
          "creates return pressure (62% return points won)"
        ],
        "gameFlowRead": "Maja Chwalinska has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Maja Chwalinska",
        "confidence": 60,
        "modelPct": 44,
        "label": "Needs early hold pressure"
      },
      {
        "name": "Elise Mertens",
        "confidence": 73,
        "modelPct": 56,
        "label": "Live to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Elise Mertens",
        "americanOdds": -210,
        "modelPct": 56,
        "impliedPct": 67.7,
        "edgePct": -11.7,
        "evPer100": -17.3,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Elise Mertens",
        "line": -3.5,
        "americanOdds": -118,
        "modelPct": 50,
        "impliedPct": 54.1,
        "edgePct": -4.1,
        "evPer100": -7.6,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Maja Chwalinska",
          "confidence": 60,
          "modelPct": 44,
          "label": "Needs early hold pressure",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Elise Mertens",
          "confidence": 73,
          "modelPct": 56,
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
      "capturedAt": "2026-05-28T01:28:34.683Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/maja-chwalinska-v-elise-mertens-35650063",
      "eventId": "35650063",
      "players": [
        {
          "name": "Maja Chwalinska",
          "odds": 172,
          "americanLabel": "+172",
          "impliedPct": 36.8,
          "decimalOdds": 2.72,
          "modelPct": 44,
          "edgePct": 7.2,
          "priceBand": "Underdog",
          "grossProfitPct": 172,
          "grossPayoutMultiple": 2.72,
          "centsAtRisk": 100,
          "centsProfitIfWin": 172
        },
        {
          "name": "Elise Mertens",
          "odds": -210,
          "americanLabel": "-210",
          "impliedPct": 67.7,
          "decimalOdds": 1.476,
          "modelPct": 56,
          "edgePct": -11.7,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 47.6,
          "grossPayoutMultiple": 1.476,
          "centsAtRisk": 100,
          "centsProfitIfWin": 47.6
        }
      ],
      "desk": {
        "name": "Elise Mertens",
        "odds": -210,
        "americanLabel": "-210",
        "impliedPct": 67.7,
        "decimalOdds": 1.476,
        "modelPct": 56,
        "edgePct": -11.7,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 47.6,
        "grossPayoutMultiple": 1.476,
        "centsAtRisk": 100,
        "centsProfitIfWin": 47.6
      },
      "spread": {
        "marketLine": 3.5,
        "player": "Elise Mertens",
        "spread": -3.5,
        "odds": -118
      },
      "total": {
        "line": 21.5,
        "side": "Over",
        "odds": -118
      },
      "totalOver": {
        "line": 21.5,
        "side": "Over",
        "odds": -118
      },
      "totalUnder": {
        "line": 21.5,
        "side": "Under",
        "odds": -112
      },
      "priceAction": "FanDuel price is richer than the model; pass ML unless live state improves.",
      "spreadValue": "Elise Mertens -3.5 (-118)",
      "totalValue": "21.5 games: Over -118 / Under -112",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Maja Chwalinska +172 / Elise Mertens -210",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. FanDuel price is richer than the model; pass ML unless live state improves.",
      "noVigNote": "Model 56% vs FanDuel implied 67.7% (-11.7 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Maja-Chwalinska-Vs-Elise-Mertens/",
    "players": [
      {
        "name": "Maja Chwalinska",
        "ranking": {
          "name": "Maja Chwalińska",
          "rank": 98,
          "points": 766,
          "age": 24.6,
          "country": "POL",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Maja Chwalinska",
        "profile": "Live rank #98 | POL | age 24.6 | 2026 clay 14-5, 74% | adj form 99 | hold 77%",
        "modelPct": 44,
        "weakness": {
          "name": "Maja Chwalinska",
          "serviceHoldPct": 77,
          "firstServeWonPct": 63,
          "secondServeWonPct": 61,
          "firstServePct": 71,
          "avgAces": null,
          "avgDoubleFaults": 0,
          "avgWinners": 17.3,
          "avgUnforcedErrors": 9.7,
          "avgBreakPointsFaced": 4.7,
          "returnPointsWonPct": 62,
          "servicePointsWonPct": 63,
          "weakServeMatches": 1,
          "pressureMatches": 3,
          "matchesWithStats": 3,
          "weaknessScore": 3,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "protects serve well (77% hold)",
            "second serve holds up (61%)",
            "positive winner/error balance (17.3 winners, 9.7 unforced)",
            "creates return pressure (62% return points won)"
          ],
          "gameFlowRead": "Maja Chwalinska has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Elise Mertens",
        "ranking": {
          "name": "Elise Mertens",
          "rank": 19,
          "points": 1918,
          "age": 30.5,
          "country": "BEL",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Elise Mertens",
        "profile": "Live rank #19 | BEL | age 30.5 | 2026 clay 6-3, 67% | adj form 73 | hold 76%",
        "modelPct": 56,
        "weakness": {
          "name": "Elise Mertens",
          "serviceHoldPct": 76,
          "firstServeWonPct": 71,
          "secondServeWonPct": 49,
          "firstServePct": 62,
          "avgAces": 4.2,
          "avgDoubleFaults": 2.7,
          "avgWinners": 36,
          "avgUnforcedErrors": 22,
          "avgBreakPointsFaced": 6.3,
          "returnPointsWonPct": 47,
          "servicePointsWonPct": 63,
          "weakServeMatches": 1,
          "pressureMatches": 3,
          "matchesWithStats": 6,
          "weaknessScore": 3,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "protects serve well (76% hold)",
            "wins enough first-serve points (71%)",
            "positive winner/error balance (36.0 winners, 22.0 unforced)",
            "creates return pressure (47% return points won)"
          ],
          "gameFlowRead": "Elise Mertens has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-w-yulia-putintseva-camila-osorio-2026-05-28",
    "eventId": "175577",
    "tour": "WTA",
    "title": "Yulia Putintseva vs Camila Osorio",
    "start": "4:00 AM",
    "startMinutes": 240,
    "court": "Court 13",
    "round": "Round 2",
    "pickName": "Yulia Putintseva",
    "confidence": 50,
    "volatility": 60,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Watch only",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Yulia Putintseva has the cleaner composite of rank, clay record, and recent opponent quality. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": 0,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "Game spread is fragile; prefer live entry after the first service cycle.",
      "totalRead": "No total edge without posted number and first-set hold data.",
      "pick": {
        "name": "Yulia Putintseva",
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
        "gameFlowRead": "Yulia Putintseva has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Camila Osorio",
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
        "gameFlowRead": "Camila Osorio has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Yulia Putintseva",
        "confidence": 70,
        "modelPct": 50,
        "label": "Live to win a set"
      },
      {
        "name": "Camila Osorio",
        "confidence": 70,
        "modelPct": 50,
        "label": "Live to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Yulia Putintseva",
        "americanOdds": 125,
        "modelPct": 50,
        "impliedPct": 44.4,
        "edgePct": 5.6,
        "evPer100": 12.5,
        "valueGrade": "Thin value",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Yulia Putintseva",
        "line": 2.5,
        "americanOdds": -120,
        "modelPct": 44,
        "impliedPct": 54.5,
        "edgePct": -10.5,
        "evPer100": -19.3,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Yulia Putintseva",
          "confidence": 70,
          "modelPct": 50,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Camila Osorio",
          "confidence": 70,
          "modelPct": 50,
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
      "capturedAt": "2026-05-28T01:28:39.834Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/yulia-putintseva-v-camila-osorio-35651790",
      "eventId": "35651790",
      "players": [
        {
          "name": "Yulia Putintseva",
          "odds": 125,
          "americanLabel": "+125",
          "impliedPct": 44.4,
          "decimalOdds": 2.25,
          "modelPct": 50,
          "edgePct": 5.6,
          "priceBand": "Underdog",
          "grossProfitPct": 125,
          "grossPayoutMultiple": 2.25,
          "centsAtRisk": 100,
          "centsProfitIfWin": 125
        },
        {
          "name": "Camila Osorio",
          "odds": -152,
          "americanLabel": "-152",
          "impliedPct": 60.3,
          "decimalOdds": 1.658,
          "modelPct": 50,
          "edgePct": -10.3,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 65.8,
          "grossPayoutMultiple": 1.658,
          "centsAtRisk": 100,
          "centsProfitIfWin": 65.8
        }
      ],
      "desk": {
        "name": "Yulia Putintseva",
        "odds": 125,
        "americanLabel": "+125",
        "impliedPct": 44.4,
        "decimalOdds": 2.25,
        "modelPct": 50,
        "edgePct": 5.6,
        "priceBand": "Underdog",
        "grossProfitPct": 125,
        "grossPayoutMultiple": 2.25,
        "centsAtRisk": 100,
        "centsProfitIfWin": 125
      },
      "spread": {
        "marketLine": 2.5,
        "player": "Yulia Putintseva",
        "spread": 2.5,
        "odds": -120
      },
      "total": {
        "line": 21.5,
        "side": "Over",
        "odds": -118
      },
      "totalOver": {
        "line": 21.5,
        "side": "Over",
        "odds": -118
      },
      "totalUnder": {
        "line": 21.5,
        "side": "Under",
        "odds": -112
      },
      "priceAction": "ML is close to fair; derivative or live entry needs to carry the edge.",
      "spreadValue": "Yulia Putintseva +2.5 (-120)",
      "totalValue": "21.5 games: Over -118 / Under -112",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Yulia Putintseva +125 / Camila Osorio -152",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. ML is close to fair; derivative or live entry needs to carry the edge.",
      "noVigNote": "Model 50% vs FanDuel implied 44.4% (+5.6 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Yulia-Putintseva-Vs-Camila-Osorio/",
    "players": [
      {
        "name": "Yulia Putintseva",
        "ranking": {
          "name": "Yulia Putintseva",
          "rank": 86,
          "points": 858,
          "age": 31.3,
          "country": "KAZ",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": null,
        "profile": "Live rank #86 | KAZ | age 31.3",
        "modelPct": 50,
        "weakness": {
          "name": "Yulia Putintseva",
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
          "gameFlowRead": "Yulia Putintseva has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Camila Osorio",
        "ranking": {
          "name": "Camila Osorio",
          "rank": 73,
          "points": 928,
          "age": 24.4,
          "country": "COL",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": null,
        "profile": "Live rank #73 | COL | age 24.4",
        "modelPct": 50,
        "weakness": {
          "name": "Camila Osorio",
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
          "gameFlowRead": "Camila Osorio has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-w-ann-li-diane-parry-2026-05-28",
    "eventId": "175534",
    "tour": "WTA",
    "title": "Ann Li vs Diane Parry",
    "start": "5:00 AM",
    "startMinutes": 300,
    "court": "Court Philippe-Chatrier",
    "round": "Round 2",
    "pickName": "Ann Li",
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
    "reason": "Diane Parry grades 21 points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness edge",
      "target": "Diane Parry",
      "scoreGap": 27,
      "attackingSide": "Ann Li",
      "vulnerableSide": "Diane Parry",
      "gameFlow": "Ann Li has a real path if Diane Parry's first two service games show the same weakness: low recent hold rate (61%); first-serve points won below comfort (59%).",
      "liveTrigger": "Look for Diane Parry facing break points or second-serve pressure before 3-3.",
      "spreadRead": "Spread needs the posted number before grading.",
      "totalRead": "Weak service profile points to breaks; be careful with low unders.",
      "pick": {
        "name": "Ann Li",
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
        "pressureMatches": 2,
        "matchesWithStats": 0,
        "weaknessScore": 0,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Ann Li has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Diane Parry",
        "serviceHoldPct": 61,
        "firstServeWonPct": 59,
        "secondServeWonPct": 50,
        "firstServePct": 65,
        "avgAces": 2.3,
        "avgDoubleFaults": 2.7,
        "avgWinners": 28,
        "avgUnforcedErrors": 48,
        "avgBreakPointsFaced": 10.3,
        "returnPointsWonPct": 40,
        "servicePointsWonPct": 55,
        "weakServeMatches": 3,
        "pressureMatches": 4,
        "matchesWithStats": 3,
        "weaknessScore": 27,
        "firstGameComfort": "Fragile opening-service profile",
        "liabilities": [
          "low recent hold rate (61%)",
          "first-serve points won below comfort (59%)",
          "negative winner/error balance (28.0 winners, 48.0 unforced)",
          "faces too many break points (10.3 avg)",
          "3 recent matches with serve instability"
        ],
        "strengths": [],
        "gameFlowRead": "Diane Parry can drop points quickly through low recent hold rate (61%) and first-serve points won below comfort (59%)."
      }
    },
    "setWinProjections": [
      {
        "name": "Ann Li",
        "confidence": 73,
        "modelPct": 57,
        "label": "Live to win a set"
      },
      {
        "name": "Diane Parry",
        "confidence": 56,
        "modelPct": 43,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Ann Li",
        "americanOdds": -275,
        "modelPct": 57,
        "impliedPct": 73.3,
        "edgePct": -16.3,
        "evPer100": -22.3,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Ann Li",
        "line": -4.5,
        "americanOdds": -110,
        "modelPct": 55,
        "impliedPct": 52.4,
        "edgePct": 2.6,
        "evPer100": 5,
        "valueGrade": "Near fair",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 20.5,
        "americanOdds": -118,
        "modelPct": 49,
        "impliedPct": 54.1,
        "edgePct": -5.1,
        "evPer100": -9.5,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Ann Li",
          "confidence": 73,
          "modelPct": 57,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Diane Parry",
          "confidence": 56,
          "modelPct": 43,
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
      "capturedAt": "2026-05-28T01:28:45.021Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/ann-li-v-diane-parry-35654881",
      "eventId": "35654881",
      "players": [
        {
          "name": "Ann Li",
          "odds": -275,
          "americanLabel": "-275",
          "impliedPct": 73.3,
          "decimalOdds": 1.364,
          "modelPct": 57,
          "edgePct": -16.3,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 36.4,
          "grossPayoutMultiple": 1.364,
          "centsAtRisk": 100,
          "centsProfitIfWin": 36.4
        },
        {
          "name": "Diane Parry",
          "odds": 220,
          "americanLabel": "+220",
          "impliedPct": 31.3,
          "decimalOdds": 3.2,
          "modelPct": 43,
          "edgePct": 11.8,
          "priceBand": "Underdog",
          "grossProfitPct": 220,
          "grossPayoutMultiple": 3.2,
          "centsAtRisk": 100,
          "centsProfitIfWin": 220
        }
      ],
      "desk": {
        "name": "Ann Li",
        "odds": -275,
        "americanLabel": "-275",
        "impliedPct": 73.3,
        "decimalOdds": 1.364,
        "modelPct": 57,
        "edgePct": -16.3,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 36.4,
        "grossPayoutMultiple": 1.364,
        "centsAtRisk": 100,
        "centsProfitIfWin": 36.4
      },
      "spread": {
        "marketLine": -4.5,
        "player": "Ann Li",
        "spread": -4.5,
        "odds": -110
      },
      "total": {
        "line": 20.5,
        "side": "Over",
        "odds": -118
      },
      "totalOver": {
        "line": 20.5,
        "side": "Over",
        "odds": -118
      },
      "totalUnder": {
        "line": 20.5,
        "side": "Under",
        "odds": -112
      },
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "Ann Li -4.5 (-110)",
      "totalValue": "20.5 games: Over -118 / Under -112",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Over or pass if early service games are loose",
      "mlValue": "Ann Li -275 / Diane Parry +220",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 57% vs FanDuel implied 73.3% (-16.3 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Ann-Li-Vs-Diane-Parry/",
    "players": [
      {
        "name": "Ann Li",
        "ranking": {
          "name": "Ann Li",
          "rank": 26,
          "points": 1601,
          "age": 25.9,
          "country": "USA",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Ann Li",
        "profile": "Live rank #26 | USA | age 25.9 | 2026 clay 9-5, 64% | adj form 63",
        "modelPct": 57,
        "weakness": {
          "name": "Ann Li",
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
          "pressureMatches": 2,
          "matchesWithStats": 0,
          "weaknessScore": 0,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Ann Li has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Diane Parry",
        "ranking": {
          "name": "Diane Parry",
          "rank": 80,
          "points": 900,
          "age": 23.7,
          "country": "FRA",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Diane Parry",
        "profile": "Live rank #80 | FRA | age 23.7 | 2026 clay 6-5, 55% | adj form 84 | hold 61%",
        "modelPct": 43,
        "weakness": {
          "name": "Diane Parry",
          "serviceHoldPct": 61,
          "firstServeWonPct": 59,
          "secondServeWonPct": 50,
          "firstServePct": 65,
          "avgAces": 2.3,
          "avgDoubleFaults": 2.7,
          "avgWinners": 28,
          "avgUnforcedErrors": 48,
          "avgBreakPointsFaced": 10.3,
          "returnPointsWonPct": 40,
          "servicePointsWonPct": 55,
          "weakServeMatches": 3,
          "pressureMatches": 4,
          "matchesWithStats": 3,
          "weaknessScore": 27,
          "firstGameComfort": "Fragile opening-service profile",
          "liabilities": [
            "low recent hold rate (61%)",
            "first-serve points won below comfort (59%)",
            "negative winner/error balance (28.0 winners, 48.0 unforced)",
            "faces too many break points (10.3 avg)",
            "3 recent matches with serve instability"
          ],
          "strengths": [],
          "gameFlowRead": "Diane Parry can drop points quickly through low recent hold rate (61%) and first-serve points won below comfort (59%)."
        }
      }
    ]
  },
  {
    "id": "rg-m-alejandro-tabilo-valentin-vacherot-2026-05-28",
    "eventId": "175726",
    "tour": "ATP",
    "title": "Alejandro Tabilo vs Valentin Vacherot",
    "start": "5:30 AM",
    "startMinutes": 330,
    "court": "Court 13",
    "round": "Round 2",
    "pickName": "Valentin Vacherot",
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
    "reason": "Valentin Vacherot has the recent service-hold edge 88% to 71%. Opponent-adjusted recent form is basically even: Valentin Vacherot 72, Alejandro Tabilo 69. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness warning",
      "target": "Valentin Vacherot",
      "scoreGap": -11,
      "attackingSide": null,
      "vulnerableSide": "Valentin Vacherot",
      "gameFlow": "Valentin Vacherot is the model side, but the fragile profile is on our pick: double-fault pressure (5.0 avg); limited return pressure (35% return points won). Avoid laying a bad price until early holds are confirmed.",
      "liveTrigger": "Do not upgrade Valentin Vacherot unless they hold cleanly in the first service game and keep double faults down.",
      "spreadRead": "Spread needs the posted number before grading.",
      "totalRead": "No total edge without posted number and first-set hold data.",
      "pick": {
        "name": "Valentin Vacherot",
        "serviceHoldPct": 88,
        "firstServeWonPct": 76,
        "secondServeWonPct": 60,
        "firstServePct": 61,
        "avgAces": 10.5,
        "avgDoubleFaults": 5,
        "avgWinners": 39,
        "avgUnforcedErrors": 39,
        "avgBreakPointsFaced": 6,
        "returnPointsWonPct": 35,
        "servicePointsWonPct": 69,
        "weakServeMatches": 2,
        "pressureMatches": 6,
        "matchesWithStats": 2,
        "weaknessScore": 15,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "double-fault pressure (5.0 avg)",
          "limited return pressure (35% return points won)"
        ],
        "strengths": [
          "protects serve well (88% hold)",
          "wins enough first-serve points (76%)",
          "second serve holds up (60%)"
        ],
        "gameFlowRead": "Valentin Vacherot can drop points quickly through double-fault pressure (5.0 avg) and limited return pressure (35% return points won)."
      },
      "opponent": {
        "name": "Alejandro Tabilo",
        "serviceHoldPct": 71,
        "firstServeWonPct": 76,
        "secondServeWonPct": 50,
        "firstServePct": 60,
        "avgAces": 3.7,
        "avgDoubleFaults": 1.3,
        "avgWinners": 23,
        "avgUnforcedErrors": 19.7,
        "avgBreakPointsFaced": 5,
        "returnPointsWonPct": 43,
        "servicePointsWonPct": 66,
        "weakServeMatches": 1,
        "pressureMatches": 4,
        "matchesWithStats": 3,
        "weaknessScore": 4,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "wins enough first-serve points (76%)",
          "positive winner/error balance (23.0 winners, 19.7 unforced)"
        ],
        "gameFlowRead": "Alejandro Tabilo has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Alejandro Tabilo",
        "confidence": 74,
        "modelPct": 45,
        "label": "Live to win a set"
      },
      {
        "name": "Valentin Vacherot",
        "confidence": 84,
        "modelPct": 55,
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
          "name": "Alejandro Tabilo",
          "confidence": 74,
          "modelPct": 45,
          "label": "Live to win a set"
        },
        {
          "name": "Valentin Vacherot",
          "confidence": 84,
          "modelPct": 55,
          "label": "Strong set-win path"
        }
      ]
    },
    "marketData": null,
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Alejandro-Tabilo-Vs-Valentin-Vacherot/",
    "players": [
      {
        "name": "Alejandro Tabilo",
        "ranking": {
          "name": "Alejandro Tabilo",
          "rank": 36,
          "points": 1278,
          "age": 28.9,
          "country": "CHI",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Alejandro Tabilo",
        "profile": "Live rank #36 | CHI | age 28.9 | 2026 clay 23-9, 72% | adj form 69 | hold 71%",
        "modelPct": 45,
        "weakness": {
          "name": "Alejandro Tabilo",
          "serviceHoldPct": 71,
          "firstServeWonPct": 76,
          "secondServeWonPct": 50,
          "firstServePct": 60,
          "avgAces": 3.7,
          "avgDoubleFaults": 1.3,
          "avgWinners": 23,
          "avgUnforcedErrors": 19.7,
          "avgBreakPointsFaced": 5,
          "returnPointsWonPct": 43,
          "servicePointsWonPct": 66,
          "weakServeMatches": 1,
          "pressureMatches": 4,
          "matchesWithStats": 3,
          "weaknessScore": 4,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "wins enough first-serve points (76%)",
            "positive winner/error balance (23.0 winners, 19.7 unforced)"
          ],
          "gameFlowRead": "Alejandro Tabilo has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Valentin Vacherot",
        "ranking": {
          "name": "Valentin Vacherot",
          "rank": 19,
          "points": 2145,
          "age": 27.5,
          "country": "MON",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Valentin Vacherot",
        "profile": "Live rank #19 | MON | age 27.5 | 2026 clay 5-2, 71% | adj form 72 | hold 88%",
        "modelPct": 55,
        "weakness": {
          "name": "Valentin Vacherot",
          "serviceHoldPct": 88,
          "firstServeWonPct": 76,
          "secondServeWonPct": 60,
          "firstServePct": 61,
          "avgAces": 10.5,
          "avgDoubleFaults": 5,
          "avgWinners": 39,
          "avgUnforcedErrors": 39,
          "avgBreakPointsFaced": 6,
          "returnPointsWonPct": 35,
          "servicePointsWonPct": 69,
          "weakServeMatches": 2,
          "pressureMatches": 6,
          "matchesWithStats": 2,
          "weaknessScore": 15,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "double-fault pressure (5.0 avg)",
            "limited return pressure (35% return points won)"
          ],
          "strengths": [
            "protects serve well (88% hold)",
            "wins enough first-serve points (76%)",
            "second serve holds up (60%)"
          ],
          "gameFlowRead": "Valentin Vacherot can drop points quickly through double-fault pressure (5.0 avg) and limited return pressure (35% return points won)."
        }
      }
    ]
  },
  {
    "id": "rg-w-antonia-ruzic-madison-keys-2026-05-28",
    "eventId": "175561",
    "tour": "WTA",
    "title": "Antonia Ruzic vs Madison Keys",
    "start": "5:30 AM",
    "startMinutes": 330,
    "court": "Court 14",
    "round": "Round 2",
    "pickName": "Madison Keys",
    "confidence": 72,
    "volatility": 32,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Lean",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Madison Keys has the recent service-hold edge 85% to 47%. Madison Keys grades 41 points better on opponent-adjusted recent form. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness edge",
      "target": "Antonia Ruzic",
      "scoreGap": 50,
      "attackingSide": "Madison Keys",
      "vulnerableSide": "Antonia Ruzic",
      "gameFlow": "Madison Keys has a real path if Antonia Ruzic's first two service games show the same weakness: low recent hold rate (47%); first-serve points won below comfort (57%).",
      "liveTrigger": "Look for Antonia Ruzic facing break points or second-serve pressure before 3-3.",
      "spreadRead": "Madison Keys game spread is more interesting than ML if the number is short.",
      "totalRead": "Weak service profile points to breaks; be careful with low unders.",
      "pick": {
        "name": "Madison Keys",
        "serviceHoldPct": 85,
        "firstServeWonPct": 76,
        "secondServeWonPct": 48,
        "firstServePct": 68,
        "avgAces": 4.3,
        "avgDoubleFaults": 2.3,
        "avgWinners": 29,
        "avgUnforcedErrors": 21,
        "avgBreakPointsFaced": 7.7,
        "returnPointsWonPct": 45,
        "servicePointsWonPct": 67,
        "weakServeMatches": 0,
        "pressureMatches": 3,
        "matchesWithStats": 3,
        "weaknessScore": 2,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "protects serve well (85% hold)",
          "wins enough first-serve points (76%)",
          "positive winner/error balance (29.0 winners, 21.0 unforced)"
        ],
        "gameFlowRead": "Madison Keys has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Antonia Ruzic",
        "serviceHoldPct": 47,
        "firstServeWonPct": 57,
        "secondServeWonPct": 35,
        "firstServePct": 63,
        "avgAces": 0.6,
        "avgDoubleFaults": 3.4,
        "avgWinners": 19,
        "avgUnforcedErrors": 35,
        "avgBreakPointsFaced": 11.2,
        "returnPointsWonPct": 41,
        "servicePointsWonPct": 50,
        "weakServeMatches": 3,
        "pressureMatches": 5,
        "matchesWithStats": 5,
        "weaknessScore": 52,
        "firstGameComfort": "Fragile opening-service profile",
        "liabilities": [
          "low recent hold rate (47%)",
          "first-serve points won below comfort (57%)",
          "second-serve points won are attackable (35%)",
          "negative winner/error balance (19.0 winners, 35.0 unforced)",
          "faces too many break points (11.2 avg)",
          "3 recent matches with serve instability"
        ],
        "strengths": [],
        "gameFlowRead": "Antonia Ruzic can drop points quickly through low recent hold rate (47%) and first-serve points won below comfort (57%)."
      }
    },
    "setWinProjections": [
      {
        "name": "Antonia Ruzic",
        "confidence": 35,
        "modelPct": 28,
        "label": "Thin set-win path"
      },
      {
        "name": "Madison Keys",
        "confidence": 80,
        "modelPct": 72,
        "label": "Live to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Madison Keys",
        "americanOdds": -720,
        "modelPct": 72,
        "impliedPct": 87.8,
        "edgePct": -15.8,
        "evPer100": -18,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Madison Keys",
        "line": -5.5,
        "americanOdds": -132,
        "modelPct": 70,
        "impliedPct": 56.9,
        "edgePct": 13.1,
        "evPer100": 23,
        "valueGrade": "Bet-grade value",
        "betGrade": true
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 19.5,
        "americanOdds": -104,
        "modelPct": 64,
        "impliedPct": 51,
        "edgePct": 13,
        "evPer100": 25.5,
        "valueGrade": "Bet-grade value",
        "betGrade": true
      },
      "setWin": [
        {
          "name": "Antonia Ruzic",
          "confidence": 35,
          "modelPct": 28,
          "label": "Thin set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Madison Keys",
          "confidence": 80,
          "modelPct": 72,
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
      "capturedAt": "2026-05-28T01:28:50.173Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/antonia-ruzic-v-madison-keys-35654948",
      "eventId": "35654948",
      "players": [
        {
          "name": "Antonia Ruzic",
          "odds": 500,
          "americanLabel": "+500",
          "impliedPct": 16.7,
          "decimalOdds": 6,
          "modelPct": 28,
          "edgePct": 11.3,
          "priceBand": "Underdog",
          "grossProfitPct": 500,
          "grossPayoutMultiple": 6,
          "centsAtRisk": 100,
          "centsProfitIfWin": 500
        },
        {
          "name": "Madison Keys",
          "odds": -720,
          "americanLabel": "-720",
          "impliedPct": 87.8,
          "decimalOdds": 1.139,
          "modelPct": 72,
          "edgePct": -15.8,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 13.9,
          "grossPayoutMultiple": 1.139,
          "centsAtRisk": 100,
          "centsProfitIfWin": 13.9
        }
      ],
      "desk": {
        "name": "Madison Keys",
        "odds": -720,
        "americanLabel": "-720",
        "impliedPct": 87.8,
        "decimalOdds": 1.139,
        "modelPct": 72,
        "edgePct": -15.8,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 13.9,
        "grossPayoutMultiple": 1.139,
        "centsAtRisk": 100,
        "centsProfitIfWin": 13.9
      },
      "spread": {
        "marketLine": 5.5,
        "player": "Madison Keys",
        "spread": -5.5,
        "odds": -132
      },
      "total": {
        "line": 19.5,
        "side": "Over",
        "odds": -104
      },
      "totalOver": {
        "line": 19.5,
        "side": "Over",
        "odds": -104
      },
      "totalUnder": {
        "line": 19.5,
        "side": "Under",
        "odds": -130
      },
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "Madison Keys -5.5 (-132)",
      "totalValue": "19.5 games: Over -104 / Under -130",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Over or pass if early service games are loose",
      "mlValue": "Antonia Ruzic +500 / Madison Keys -720",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 72% vs FanDuel implied 87.8% (-15.8 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Antonia-Ruzic-Vs-Madison-Keys/",
    "players": [
      {
        "name": "Antonia Ruzic",
        "ranking": {
          "name": "Antonia Ružić",
          "rank": 53,
          "points": 1061,
          "age": 23.3,
          "country": "CRO",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Antonia Ruzic",
        "profile": "Live rank #53 | CRO | age 23.3 | 2026 clay 5-6, 46% | adj form 45 | hold 47%",
        "modelPct": 28,
        "weakness": {
          "name": "Antonia Ruzic",
          "serviceHoldPct": 47,
          "firstServeWonPct": 57,
          "secondServeWonPct": 35,
          "firstServePct": 63,
          "avgAces": 0.6,
          "avgDoubleFaults": 3.4,
          "avgWinners": 19,
          "avgUnforcedErrors": 35,
          "avgBreakPointsFaced": 11.2,
          "returnPointsWonPct": 41,
          "servicePointsWonPct": 50,
          "weakServeMatches": 3,
          "pressureMatches": 5,
          "matchesWithStats": 5,
          "weaknessScore": 52,
          "firstGameComfort": "Fragile opening-service profile",
          "liabilities": [
            "low recent hold rate (47%)",
            "first-serve points won below comfort (57%)",
            "second-serve points won are attackable (35%)",
            "negative winner/error balance (19.0 winners, 35.0 unforced)",
            "faces too many break points (11.2 avg)",
            "3 recent matches with serve instability"
          ],
          "strengths": [],
          "gameFlowRead": "Antonia Ruzic can drop points quickly through low recent hold rate (47%) and first-serve points won below comfort (57%)."
        }
      },
      {
        "name": "Madison Keys",
        "ranking": {
          "name": "Madison Keys",
          "rank": 25,
          "points": 1602,
          "age": 31.2,
          "country": "USA",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Madison Keys",
        "profile": "Live rank #25 | USA | age 31.2 | 2026 clay 9-3, 75% | adj form 86 | hold 85%",
        "modelPct": 72,
        "weakness": {
          "name": "Madison Keys",
          "serviceHoldPct": 85,
          "firstServeWonPct": 76,
          "secondServeWonPct": 48,
          "firstServePct": 68,
          "avgAces": 4.3,
          "avgDoubleFaults": 2.3,
          "avgWinners": 29,
          "avgUnforcedErrors": 21,
          "avgBreakPointsFaced": 7.7,
          "returnPointsWonPct": 45,
          "servicePointsWonPct": 67,
          "weakServeMatches": 0,
          "pressureMatches": 3,
          "matchesWithStats": 3,
          "weaknessScore": 2,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "protects serve well (85% hold)",
            "wins enough first-serve points (76%)",
            "positive winner/error balance (29.0 winners, 21.0 unforced)"
          ],
          "gameFlowRead": "Madison Keys has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-w-coco-gauff-mayar-sherif-2026-05-28",
    "eventId": "175559",
    "tour": "WTA",
    "title": "Coco Gauff vs Mayar Sherif",
    "start": "5:30 AM",
    "startMinutes": 330,
    "court": "Court Suzanne-Lenglen",
    "round": "Round 2",
    "pickName": "Coco Gauff",
    "confidence": 64,
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
    "reason": "Coco Gauff has the cleaner composite of rank, clay record, and recent opponent quality. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": 0,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "Spread needs the posted number before grading.",
      "totalRead": "No total edge without posted number and first-set hold data.",
      "pick": {
        "name": "Coco Gauff",
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
        "gameFlowRead": "Coco Gauff has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Mayar Sherif",
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
        "gameFlowRead": "Mayar Sherif has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Coco Gauff",
        "confidence": 76,
        "modelPct": 64,
        "label": "Live to win a set"
      },
      {
        "name": "Mayar Sherif",
        "confidence": 50,
        "modelPct": 36,
        "label": "Thin set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Coco Gauff",
        "americanOdds": -2500,
        "modelPct": 64,
        "impliedPct": 96.2,
        "edgePct": -32.2,
        "evPer100": -33.4,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Coco Gauff",
        "line": -6.5,
        "americanOdds": -152,
        "modelPct": 54,
        "impliedPct": 60.3,
        "edgePct": -6.3,
        "evPer100": -10.5,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Coco Gauff",
          "confidence": 76,
          "modelPct": 64,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Mayar Sherif",
          "confidence": 50,
          "modelPct": 36,
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
      "capturedAt": "2026-05-28T01:28:55.346Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/coco-gauff-v-mayar-sherif-35654203",
      "eventId": "35654203",
      "players": [
        {
          "name": "Coco Gauff",
          "odds": -2500,
          "americanLabel": "-2500",
          "impliedPct": 96.2,
          "decimalOdds": 1.04,
          "modelPct": 64,
          "edgePct": -32.2,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 4,
          "grossPayoutMultiple": 1.04,
          "centsAtRisk": 100,
          "centsProfitIfWin": 4
        },
        {
          "name": "Mayar Sherif",
          "odds": 1100,
          "americanLabel": "+1100",
          "impliedPct": 8.3,
          "decimalOdds": 12,
          "modelPct": 36,
          "edgePct": 27.7,
          "priceBand": "Underdog",
          "grossProfitPct": 1100,
          "grossPayoutMultiple": 12,
          "centsAtRisk": 100,
          "centsProfitIfWin": 1100
        }
      ],
      "desk": {
        "name": "Coco Gauff",
        "odds": -2500,
        "americanLabel": "-2500",
        "impliedPct": 96.2,
        "decimalOdds": 1.04,
        "modelPct": 64,
        "edgePct": -32.2,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 4,
        "grossPayoutMultiple": 1.04,
        "centsAtRisk": 100,
        "centsProfitIfWin": 4
      },
      "spread": {
        "marketLine": -6.5,
        "player": "Coco Gauff",
        "spread": -6.5,
        "odds": -152
      },
      "total": {
        "line": 17.5,
        "side": "Over",
        "odds": -110
      },
      "totalOver": {
        "line": 17.5,
        "side": "Over",
        "odds": -110
      },
      "totalUnder": {
        "line": 17.5,
        "side": "Under",
        "odds": -120
      },
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "Coco Gauff -6.5 (-152)",
      "totalValue": "17.5 games: Over -110 / Under -120",
      "spreadLean": "Large game spread; ML may be cleaner than laying games",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Coco Gauff -2500 / Mayar Sherif +1100",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 64% vs FanDuel implied 96.2% (-32.2 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Coco-Gauff-Vs-Mayar-Sherif/",
    "players": [
      {
        "name": "Coco Gauff",
        "ranking": {
          "name": "Coco Gauff",
          "rank": 6,
          "points": 4819,
          "age": 22.2,
          "country": "USA",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": null,
        "profile": "Live rank #6 | USA | age 22.2",
        "modelPct": 64,
        "weakness": {
          "name": "Coco Gauff",
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
          "gameFlowRead": "Coco Gauff has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Mayar Sherif",
        "ranking": {
          "name": "Mayar Sherif",
          "rank": 115,
          "points": 681,
          "age": 30,
          "country": "EGY",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": null,
        "profile": "Live rank #115 | EGY | age 30",
        "modelPct": 36,
        "weakness": {
          "name": "Mayar Sherif",
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
          "gameFlowRead": "Mayar Sherif has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-w-daria-kasatkina-susan-bandecchi-2026-05-28",
    "eventId": "175538",
    "tour": "WTA",
    "title": "Daria Kasatkina vs Susan Bandecchi",
    "start": "5:30 AM",
    "startMinutes": 330,
    "court": "Court 12",
    "round": "Round 2",
    "pickName": "Susan Bandecchi",
    "confidence": 51,
    "volatility": 59,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Watch only",
      "Positive price edge",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Susan Bandecchi has the recent service-hold edge 72% to 62%. Susan Bandecchi grades 18 points better on opponent-adjusted recent form. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness edge",
      "target": "Daria Kasatkina",
      "scoreGap": 15,
      "attackingSide": "Susan Bandecchi",
      "vulnerableSide": "Daria Kasatkina",
      "gameFlow": "Susan Bandecchi has a real path if Daria Kasatkina's first two service games show the same weakness: low recent hold rate (62%); first-serve points won below comfort (60%).",
      "liveTrigger": "Look for Daria Kasatkina facing break points or second-serve pressure before 3-3.",
      "spreadRead": "Game spread is fragile; prefer live entry after the first service cycle.",
      "totalRead": "Weak service profile points to breaks; be careful with low unders.",
      "pick": {
        "name": "Susan Bandecchi",
        "serviceHoldPct": 72,
        "firstServeWonPct": 59,
        "secondServeWonPct": 59,
        "firstServePct": 79,
        "avgAces": 3.7,
        "avgDoubleFaults": 2,
        "avgWinners": 27,
        "avgUnforcedErrors": 34.3,
        "avgBreakPointsFaced": 11.3,
        "returnPointsWonPct": 50,
        "servicePointsWonPct": 59,
        "weakServeMatches": 2,
        "pressureMatches": 5,
        "matchesWithStats": 3,
        "weaknessScore": 17,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "first-serve points won below comfort (59%)",
          "negative winner/error balance (27.0 winners, 34.3 unforced)",
          "faces too many break points (11.3 avg)"
        ],
        "strengths": [
          "second serve holds up (59%)",
          "creates return pressure (50% return points won)"
        ],
        "gameFlowRead": "Susan Bandecchi can drop points quickly through first-serve points won below comfort (59%) and negative winner/error balance (27.0 winners, 34.3 unforced)."
      },
      "opponent": {
        "name": "Daria Kasatkina",
        "serviceHoldPct": 62,
        "firstServeWonPct": 60,
        "secondServeWonPct": 40,
        "firstServePct": 74,
        "avgAces": 1.7,
        "avgDoubleFaults": 4,
        "avgWinners": 9,
        "avgUnforcedErrors": 38,
        "avgBreakPointsFaced": 9.1,
        "returnPointsWonPct": 55,
        "servicePointsWonPct": 55,
        "weakServeMatches": 3,
        "pressureMatches": 2,
        "matchesWithStats": 7,
        "weaknessScore": 32,
        "firstGameComfort": "Fragile opening-service profile",
        "liabilities": [
          "low recent hold rate (62%)",
          "first-serve points won below comfort (60%)",
          "second-serve points won are attackable (40%)",
          "double-fault pressure (4.0 avg)",
          "negative winner/error balance (9.0 winners, 38.0 unforced)",
          "faces too many break points (9.1 avg)",
          "3 recent matches with serve instability"
        ],
        "strengths": [
          "creates return pressure (55% return points won)"
        ],
        "gameFlowRead": "Daria Kasatkina can drop points quickly through low recent hold rate (62%) and first-serve points won below comfort (60%)."
      }
    },
    "setWinProjections": [
      {
        "name": "Daria Kasatkina",
        "confidence": 62,
        "modelPct": 49,
        "label": "Needs early hold pressure"
      },
      {
        "name": "Susan Bandecchi",
        "confidence": 68,
        "modelPct": 51,
        "label": "Live to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Susan Bandecchi",
        "americanOdds": 660,
        "modelPct": 51,
        "impliedPct": 13.2,
        "edgePct": 37.8,
        "evPer100": 287.6,
        "valueGrade": "Bet-grade value",
        "betGrade": true
      },
      "spread": null,
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 18.5,
        "americanOdds": -120,
        "modelPct": 43,
        "impliedPct": 54.5,
        "edgePct": -11.5,
        "evPer100": -21.2,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Daria Kasatkina",
          "confidence": 62,
          "modelPct": 49,
          "label": "Needs early hold pressure",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Susan Bandecchi",
          "confidence": 68,
          "modelPct": 51,
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
      "capturedAt": "2026-05-28T01:29:00.470Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/daria-kasatkina-v-susan-bandecchi-35649560",
      "eventId": "35649560",
      "players": [
        {
          "name": "Daria Kasatkina",
          "odds": -1050,
          "americanLabel": "-1050",
          "impliedPct": 91.3,
          "decimalOdds": 1.095,
          "modelPct": 49,
          "edgePct": -42.3,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 9.5,
          "grossPayoutMultiple": 1.095,
          "centsAtRisk": 100,
          "centsProfitIfWin": 9.5
        },
        {
          "name": "Susan Bandecchi",
          "odds": 660,
          "americanLabel": "+660",
          "impliedPct": 13.2,
          "decimalOdds": 7.6,
          "modelPct": 51,
          "edgePct": 37.8,
          "priceBand": "Underdog",
          "grossProfitPct": 660,
          "grossPayoutMultiple": 7.6,
          "centsAtRisk": 100,
          "centsProfitIfWin": 660
        }
      ],
      "desk": {
        "name": "Susan Bandecchi",
        "odds": 660,
        "americanLabel": "+660",
        "impliedPct": 13.2,
        "decimalOdds": 7.6,
        "modelPct": 51,
        "edgePct": 37.8,
        "priceBand": "Underdog",
        "grossProfitPct": 660,
        "grossPayoutMultiple": 7.6,
        "centsAtRisk": 100,
        "centsProfitIfWin": 660
      },
      "spread": null,
      "total": {
        "line": 18.5,
        "side": "Over",
        "odds": -120
      },
      "totalOver": {
        "line": 18.5,
        "side": "Over",
        "odds": -120
      },
      "totalUnder": {
        "line": 18.5,
        "side": "Under",
        "odds": -110
      },
      "priceAction": "Model is meaningfully above FanDuel implied price.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "18.5 games: Over -120 / Under -110",
      "spreadLean": "No spread line",
      "totalLean": "Over or pass if early service games are loose",
      "mlValue": "Daria Kasatkina -1050 / Susan Bandecchi +660",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. Model is meaningfully above FanDuel implied price.",
      "noVigNote": "Model 51% vs FanDuel implied 13.2% (+37.8 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Daria-Kasatkina-Vs-Susan-Bandecchi/",
    "players": [
      {
        "name": "Daria Kasatkina",
        "ranking": {
          "name": "Daria Kasatkina",
          "rank": 68,
          "points": 949,
          "age": 29,
          "country": "AUS",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Daria Kasatkina",
        "profile": "Live rank #68 | AUS | age 29 | 2026 clay 10-4, 71% | adj form 83 | hold 62%",
        "modelPct": 49,
        "weakness": {
          "name": "Daria Kasatkina",
          "serviceHoldPct": 62,
          "firstServeWonPct": 60,
          "secondServeWonPct": 40,
          "firstServePct": 74,
          "avgAces": 1.7,
          "avgDoubleFaults": 4,
          "avgWinners": 9,
          "avgUnforcedErrors": 38,
          "avgBreakPointsFaced": 9.1,
          "returnPointsWonPct": 55,
          "servicePointsWonPct": 55,
          "weakServeMatches": 3,
          "pressureMatches": 2,
          "matchesWithStats": 7,
          "weaknessScore": 32,
          "firstGameComfort": "Fragile opening-service profile",
          "liabilities": [
            "low recent hold rate (62%)",
            "first-serve points won below comfort (60%)",
            "second-serve points won are attackable (40%)",
            "double-fault pressure (4.0 avg)",
            "negative winner/error balance (9.0 winners, 38.0 unforced)",
            "faces too many break points (9.1 avg)",
            "3 recent matches with serve instability"
          ],
          "strengths": [
            "creates return pressure (55% return points won)"
          ],
          "gameFlowRead": "Daria Kasatkina can drop points quickly through low recent hold rate (62%) and first-serve points won below comfort (60%)."
        }
      },
      {
        "name": "Susan Bandecchi",
        "ranking": {
          "name": "Susan Bandecchi",
          "rank": 166,
          "points": 438,
          "age": 27.9,
          "country": "SUI",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Susan Bandecchi",
        "profile": "Live rank #166 | SUI | age 27.9 | 2026 clay 9-3, 75% | adj form 101 | hold 72%",
        "modelPct": 51,
        "weakness": {
          "name": "Susan Bandecchi",
          "serviceHoldPct": 72,
          "firstServeWonPct": 59,
          "secondServeWonPct": 59,
          "firstServePct": 79,
          "avgAces": 3.7,
          "avgDoubleFaults": 2,
          "avgWinners": 27,
          "avgUnforcedErrors": 34.3,
          "avgBreakPointsFaced": 11.3,
          "returnPointsWonPct": 50,
          "servicePointsWonPct": 59,
          "weakServeMatches": 2,
          "pressureMatches": 5,
          "matchesWithStats": 3,
          "weaknessScore": 17,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "first-serve points won below comfort (59%)",
            "negative winner/error balance (27.0 winners, 34.3 unforced)",
            "faces too many break points (11.3 avg)"
          ],
          "strengths": [
            "second serve holds up (59%)",
            "creates return pressure (50% return points won)"
          ],
          "gameFlowRead": "Susan Bandecchi can drop points quickly through first-serve points won below comfort (59%) and negative winner/error balance (27.0 winners, 34.3 unforced)."
        }
      }
    ]
  },
  {
    "id": "rg-m-francisco-comesana-luciano-darderi-2026-05-28",
    "eventId": "175685",
    "tour": "ATP",
    "title": "Francisco Comesana vs Luciano Darderi",
    "start": "5:30 AM",
    "startMinutes": 330,
    "court": "Court 6",
    "round": "Round 2",
    "pickName": "Luciano Darderi",
    "confidence": 64,
    "volatility": 36,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Lean",
      "No blind bet",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Francisco Comesana has the recent service-hold edge 71% to 65%, so Luciano Darderi needs the rank/form edge to show up on return games. Luciano Darderi grades 13 points better on opponent-adjusted recent form. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness warning",
      "target": "Luciano Darderi",
      "scoreGap": -10,
      "attackingSide": null,
      "vulnerableSide": "Luciano Darderi",
      "gameFlow": "Luciano Darderi is the model side, but the fragile profile is on our pick: negative winner/error balance (20.4 winners, 26.8 unforced); 3 recent matches with serve instability. Avoid laying a bad price until early holds are confirmed.",
      "liveTrigger": "Do not upgrade Luciano Darderi unless they hold cleanly in the first service game and keep double faults down.",
      "spreadRead": "Spread needs the posted number before grading.",
      "totalRead": "No total edge without posted number and first-set hold data.",
      "pick": {
        "name": "Luciano Darderi",
        "serviceHoldPct": 65,
        "firstServeWonPct": 67,
        "secondServeWonPct": 51,
        "firstServePct": 58,
        "avgAces": 4.5,
        "avgDoubleFaults": 2.1,
        "avgWinners": 20.4,
        "avgUnforcedErrors": 26.8,
        "avgBreakPointsFaced": 6.5,
        "returnPointsWonPct": 40,
        "servicePointsWonPct": 60,
        "weakServeMatches": 3,
        "pressureMatches": 6,
        "matchesWithStats": 8,
        "weaknessScore": 15,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "negative winner/error balance (20.4 winners, 26.8 unforced)",
          "3 recent matches with serve instability"
        ],
        "strengths": [],
        "gameFlowRead": "Luciano Darderi can drop points quickly through negative winner/error balance (20.4 winners, 26.8 unforced) and 3 recent matches with serve instability."
      },
      "opponent": {
        "name": "Francisco Comesana",
        "serviceHoldPct": 71,
        "firstServeWonPct": 76,
        "secondServeWonPct": 55,
        "firstServePct": 66,
        "avgAces": 5.4,
        "avgDoubleFaults": 2.7,
        "avgWinners": 24.9,
        "avgUnforcedErrors": 21.7,
        "avgBreakPointsFaced": 4.1,
        "returnPointsWonPct": 29,
        "servicePointsWonPct": 57,
        "weakServeMatches": 2,
        "pressureMatches": 3,
        "matchesWithStats": 7,
        "weaknessScore": 5,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "limited return pressure (29% return points won)"
        ],
        "strengths": [
          "wins enough first-serve points (76%)",
          "positive winner/error balance (24.9 winners, 21.7 unforced)"
        ],
        "gameFlowRead": "Francisco Comesana can drop points quickly through limited return pressure (29% return points won)."
      }
    },
    "setWinProjections": [
      {
        "name": "Francisco Comesana",
        "confidence": 65,
        "modelPct": 36,
        "label": "Needs early hold pressure"
      },
      {
        "name": "Luciano Darderi",
        "confidence": 86,
        "modelPct": 64,
        "label": "Strong set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Luciano Darderi",
        "americanOdds": -315,
        "modelPct": 64,
        "impliedPct": 75.9,
        "edgePct": -11.9,
        "evPer100": -15.7,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Luciano Darderi",
        "line": -5.5,
        "americanOdds": -110,
        "modelPct": 52,
        "impliedPct": 52.4,
        "edgePct": -0.4,
        "evPer100": -0.7,
        "valueGrade": "Near fair",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Francisco Comesana",
          "confidence": 65,
          "modelPct": 36,
          "label": "Needs early hold pressure",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Luciano Darderi",
          "confidence": 86,
          "modelPct": 64,
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
      "capturedAt": "2026-05-28T01:29:05.634Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/francisco-comesana-v-luciano-darderi-35655002",
      "eventId": "35655002",
      "players": [
        {
          "name": "Francisco Comesana",
          "odds": 250,
          "americanLabel": "+250",
          "impliedPct": 28.6,
          "decimalOdds": 3.5,
          "modelPct": 36,
          "edgePct": 7.4,
          "priceBand": "Underdog",
          "grossProfitPct": 250,
          "grossPayoutMultiple": 3.5,
          "centsAtRisk": 100,
          "centsProfitIfWin": 250
        },
        {
          "name": "Luciano Darderi",
          "odds": -315,
          "americanLabel": "-315",
          "impliedPct": 75.9,
          "decimalOdds": 1.317,
          "modelPct": 64,
          "edgePct": -11.9,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 31.7,
          "grossPayoutMultiple": 1.317,
          "centsAtRisk": 100,
          "centsProfitIfWin": 31.7
        }
      ],
      "desk": {
        "name": "Luciano Darderi",
        "odds": -315,
        "americanLabel": "-315",
        "impliedPct": 75.9,
        "decimalOdds": 1.317,
        "modelPct": 64,
        "edgePct": -11.9,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 31.7,
        "grossPayoutMultiple": 1.317,
        "centsAtRisk": 100,
        "centsProfitIfWin": 31.7
      },
      "spread": {
        "marketLine": 5.5,
        "player": "Luciano Darderi",
        "spread": -5.5,
        "odds": -110
      },
      "total": {
        "line": 37.5,
        "side": "Over",
        "odds": -110
      },
      "totalOver": {
        "line": 37.5,
        "side": "Over",
        "odds": -110
      },
      "totalUnder": {
        "line": 37.5,
        "side": "Under",
        "odds": -120
      },
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "Luciano Darderi -5.5 (-110)",
      "totalValue": "37.5 games: Over -110 / Under -120",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Francisco Comesana +250 / Luciano Darderi -315",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 64% vs FanDuel implied 75.9% (-11.9 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Francisco-Comesana-Vs-Luciano-Darderi/",
    "players": [
      {
        "name": "Francisco Comesana",
        "ranking": {
          "name": "Francisco Comesaña",
          "rank": 89,
          "points": 638,
          "age": 25.6,
          "country": "ARG",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Francisco Comesana",
        "profile": "Live rank #89 | ARG | age 25.6 | 2026 clay 10-11, 48% | adj form 65 | hold 71%",
        "modelPct": 36,
        "weakness": {
          "name": "Francisco Comesana",
          "serviceHoldPct": 71,
          "firstServeWonPct": 76,
          "secondServeWonPct": 55,
          "firstServePct": 66,
          "avgAces": 5.4,
          "avgDoubleFaults": 2.7,
          "avgWinners": 24.9,
          "avgUnforcedErrors": 21.7,
          "avgBreakPointsFaced": 4.1,
          "returnPointsWonPct": 29,
          "servicePointsWonPct": 57,
          "weakServeMatches": 2,
          "pressureMatches": 3,
          "matchesWithStats": 7,
          "weaknessScore": 5,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "limited return pressure (29% return points won)"
          ],
          "strengths": [
            "wins enough first-serve points (76%)",
            "positive winner/error balance (24.9 winners, 21.7 unforced)"
          ],
          "gameFlowRead": "Francisco Comesana can drop points quickly through limited return pressure (29% return points won)."
        }
      },
      {
        "name": "Luciano Darderi",
        "ranking": {
          "name": "Luciano Darderi",
          "rank": 14,
          "points": 2300,
          "age": 24.2,
          "country": "ITA",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Luciano Darderi",
        "profile": "Live rank #14 | ITA | age 24.2 | 2026 clay 17-8, 68% | adj form 78 | hold 65%",
        "modelPct": 64,
        "weakness": {
          "name": "Luciano Darderi",
          "serviceHoldPct": 65,
          "firstServeWonPct": 67,
          "secondServeWonPct": 51,
          "firstServePct": 58,
          "avgAces": 4.5,
          "avgDoubleFaults": 2.1,
          "avgWinners": 20.4,
          "avgUnforcedErrors": 26.8,
          "avgBreakPointsFaced": 6.5,
          "returnPointsWonPct": 40,
          "servicePointsWonPct": 60,
          "weakServeMatches": 3,
          "pressureMatches": 6,
          "matchesWithStats": 8,
          "weaknessScore": 15,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "negative winner/error balance (20.4 winners, 26.8 unforced)",
            "3 recent matches with serve instability"
          ],
          "strengths": [],
          "gameFlowRead": "Luciano Darderi can drop points quickly through negative winner/error balance (20.4 winners, 26.8 unforced) and 3 recent matches with serve instability."
        }
      }
    ]
  },
  {
    "id": "rg-w-maria-sakkari-claire-liu-2026-05-28",
    "eventId": "175535",
    "tour": "WTA",
    "title": "Maria Sakkari vs Claire Liu",
    "start": "5:30 AM",
    "startMinutes": 330,
    "court": "Court 7",
    "round": "Round 2",
    "pickName": "Claire Liu",
    "confidence": 56,
    "volatility": 52,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Watch only",
      "Positive price edge",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Claire Liu grades 82 points better on opponent-adjusted recent form. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness edge",
      "target": "Maria Sakkari",
      "scoreGap": 14,
      "attackingSide": "Claire Liu",
      "vulnerableSide": "Maria Sakkari",
      "gameFlow": "Claire Liu has a real path if Maria Sakkari's first two service games show the same weakness: low recent hold rate (60%); first-serve points won below comfort (59%).",
      "liveTrigger": "Look for Maria Sakkari facing break points or second-serve pressure before 3-3.",
      "spreadRead": "Spread needs the posted number before grading.",
      "totalRead": "No total edge without posted number and first-set hold data.",
      "pick": {
        "name": "Claire Liu",
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
        "pressureMatches": 4,
        "matchesWithStats": 0,
        "weaknessScore": 2,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Claire Liu has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Maria Sakkari",
        "serviceHoldPct": 60,
        "firstServeWonPct": 59,
        "secondServeWonPct": 51,
        "firstServePct": 61,
        "avgAces": 2.8,
        "avgDoubleFaults": 2.4,
        "avgWinners": 24,
        "avgUnforcedErrors": 26,
        "avgBreakPointsFaced": 7.8,
        "returnPointsWonPct": 38,
        "servicePointsWonPct": 55,
        "weakServeMatches": 2,
        "pressureMatches": 3,
        "matchesWithStats": 5,
        "weaknessScore": 16,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "low recent hold rate (60%)",
          "first-serve points won below comfort (59%)"
        ],
        "strengths": [],
        "gameFlowRead": "Maria Sakkari can drop points quickly through low recent hold rate (60%) and first-serve points won below comfort (59%)."
      }
    },
    "setWinProjections": [
      {
        "name": "Maria Sakkari",
        "confidence": 58,
        "modelPct": 44,
        "label": "Needs early hold pressure"
      },
      {
        "name": "Claire Liu",
        "confidence": 73,
        "modelPct": 56,
        "label": "Live to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Claire Liu",
        "americanOdds": 180,
        "modelPct": 56,
        "impliedPct": 35.7,
        "edgePct": 20.3,
        "evPer100": 56.8,
        "valueGrade": "Bet-grade value",
        "betGrade": true
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Claire Liu",
        "line": 3.5,
        "americanOdds": -112,
        "modelPct": 54,
        "impliedPct": 52.8,
        "edgePct": 1.2,
        "evPer100": 2.2,
        "valueGrade": "Near fair",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Maria Sakkari",
          "confidence": 58,
          "modelPct": 44,
          "label": "Needs early hold pressure",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Claire Liu",
          "confidence": 73,
          "modelPct": 56,
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
      "capturedAt": "2026-05-28T01:29:10.778Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/maria-sakkari-v-claire-liu-35653955",
      "eventId": "35653955",
      "players": [
        {
          "name": "Maria Sakkari",
          "odds": -220,
          "americanLabel": "-220",
          "impliedPct": 68.8,
          "decimalOdds": 1.455,
          "modelPct": 44,
          "edgePct": -24.8,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 45.5,
          "grossPayoutMultiple": 1.455,
          "centsAtRisk": 100,
          "centsProfitIfWin": 45.5
        },
        {
          "name": "Claire Liu",
          "odds": 180,
          "americanLabel": "+180",
          "impliedPct": 35.7,
          "decimalOdds": 2.8,
          "modelPct": 56,
          "edgePct": 20.3,
          "priceBand": "Underdog",
          "grossProfitPct": 180,
          "grossPayoutMultiple": 2.8,
          "centsAtRisk": 100,
          "centsProfitIfWin": 180
        }
      ],
      "desk": {
        "name": "Claire Liu",
        "odds": 180,
        "americanLabel": "+180",
        "impliedPct": 35.7,
        "decimalOdds": 2.8,
        "modelPct": 56,
        "edgePct": 20.3,
        "priceBand": "Underdog",
        "grossProfitPct": 180,
        "grossPayoutMultiple": 2.8,
        "centsAtRisk": 100,
        "centsProfitIfWin": 180
      },
      "spread": {
        "marketLine": -3.5,
        "player": "Claire Liu",
        "spread": 3.5,
        "odds": -112
      },
      "total": {
        "line": 21.5,
        "side": "Over",
        "odds": -116
      },
      "totalOver": {
        "line": 21.5,
        "side": "Over",
        "odds": -116
      },
      "totalUnder": {
        "line": 21.5,
        "side": "Under",
        "odds": -116
      },
      "priceAction": "Model is meaningfully above FanDuel implied price.",
      "spreadValue": "Claire Liu +3.5 (-112)",
      "totalValue": "21.5 games: Over -116 / Under -116",
      "spreadLean": "Claire Liu spread is playable only if early return pressure shows",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Maria Sakkari -220 / Claire Liu +180",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. Model is meaningfully above FanDuel implied price.",
      "noVigNote": "Model 56% vs FanDuel implied 35.7% (+20.3 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Maria-Sakkari-Vs-Claire-Liu/",
    "players": [
      {
        "name": "Maria Sakkari",
        "ranking": {
          "name": "Maria Sakkari",
          "rank": 38,
          "points": 1268,
          "age": 30.8,
          "country": "GRE",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Maria Sakkari",
        "profile": "Live rank #38 | GRE | age 30.8 | 2026 clay 2-4, 33% | adj form 36 | hold 60%",
        "modelPct": 44,
        "weakness": {
          "name": "Maria Sakkari",
          "serviceHoldPct": 60,
          "firstServeWonPct": 59,
          "secondServeWonPct": 51,
          "firstServePct": 61,
          "avgAces": 2.8,
          "avgDoubleFaults": 2.4,
          "avgWinners": 24,
          "avgUnforcedErrors": 26,
          "avgBreakPointsFaced": 7.8,
          "returnPointsWonPct": 38,
          "servicePointsWonPct": 55,
          "weakServeMatches": 2,
          "pressureMatches": 3,
          "matchesWithStats": 5,
          "weaknessScore": 16,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "low recent hold rate (60%)",
            "first-serve points won below comfort (59%)"
          ],
          "strengths": [],
          "gameFlowRead": "Maria Sakkari can drop points quickly through low recent hold rate (60%) and first-serve points won below comfort (59%)."
        }
      },
      {
        "name": "Claire Liu",
        "ranking": {
          "name": "Claire Liu",
          "rank": 142,
          "points": 526,
          "age": 26,
          "country": "USA",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Claire Liu",
        "profile": "Live rank #142 | USA | age 26 | 2026 clay 15-4, 79% | adj form 117",
        "modelPct": 56,
        "weakness": {
          "name": "Claire Liu",
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
          "pressureMatches": 4,
          "matchesWithStats": 0,
          "weaknessScore": 2,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Claire Liu has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-w-aryna-sabalenka-elsa-jacquemot-2026-05-28",
    "eventId": "175546",
    "tour": "WTA",
    "title": "Aryna Sabalenka vs Elsa Jacquemot",
    "start": "6:30 AM",
    "startMinutes": 390,
    "court": "Court Philippe-Chatrier",
    "round": "Round 2",
    "pickName": "Aryna Sabalenka",
    "confidence": 77,
    "volatility": 28,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "High confidence",
      "Price required",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Aryna Sabalenka has the recent service-hold edge 78% to 58%. Aryna Sabalenka grades 51 points better on opponent-adjusted recent form. High win probability, but the ML still needs enough payout after comparing the book price to the model.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness edge",
      "target": "Elsa Jacquemot",
      "scoreGap": 23,
      "attackingSide": "Aryna Sabalenka",
      "vulnerableSide": "Elsa Jacquemot",
      "gameFlow": "Aryna Sabalenka has a real path if Elsa Jacquemot's first two service games show the same weakness: low recent hold rate (58%); second-serve points won are attackable (39%).",
      "liveTrigger": "Look for Elsa Jacquemot facing break points or second-serve pressure before 3-3.",
      "spreadRead": "Aryna Sabalenka game spread is more interesting than ML if the number is short.",
      "totalRead": "Weak service profile points to breaks; be careful with low unders.",
      "pick": {
        "name": "Aryna Sabalenka",
        "serviceHoldPct": 78,
        "firstServeWonPct": 69,
        "secondServeWonPct": 52,
        "firstServePct": 66,
        "avgAces": 2.7,
        "avgDoubleFaults": 2.9,
        "avgWinners": 29,
        "avgUnforcedErrors": 25,
        "avgBreakPointsFaced": 6.7,
        "returnPointsWonPct": 47,
        "servicePointsWonPct": 63,
        "weakServeMatches": 4,
        "pressureMatches": 4,
        "matchesWithStats": 7,
        "weaknessScore": 11,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "4 recent matches with serve instability"
        ],
        "strengths": [
          "protects serve well (78% hold)",
          "positive winner/error balance (29.0 winners, 25.0 unforced)",
          "creates return pressure (47% return points won)"
        ],
        "gameFlowRead": "Aryna Sabalenka can drop points quickly through 4 recent matches with serve instability."
      },
      "opponent": {
        "name": "Elsa Jacquemot",
        "serviceHoldPct": 58,
        "firstServeWonPct": 63,
        "secondServeWonPct": 39,
        "firstServePct": 67,
        "avgAces": 2.3,
        "avgDoubleFaults": 5.5,
        "avgWinners": 31,
        "avgUnforcedErrors": 23,
        "avgBreakPointsFaced": 8.8,
        "returnPointsWonPct": 40,
        "servicePointsWonPct": 55,
        "weakServeMatches": 3,
        "pressureMatches": 4,
        "matchesWithStats": 4,
        "weaknessScore": 34,
        "firstGameComfort": "Fragile opening-service profile",
        "liabilities": [
          "low recent hold rate (58%)",
          "second-serve points won are attackable (39%)",
          "double-fault pressure (5.5 avg)",
          "faces too many break points (8.8 avg)",
          "3 recent matches with serve instability"
        ],
        "strengths": [
          "positive winner/error balance (31.0 winners, 23.0 unforced)"
        ],
        "gameFlowRead": "Elsa Jacquemot can drop points quickly through low recent hold rate (58%) and second-serve points won are attackable (39%)."
      }
    },
    "setWinProjections": [
      {
        "name": "Aryna Sabalenka",
        "confidence": 81,
        "modelPct": 77,
        "label": "Live to win a set"
      },
      {
        "name": "Elsa Jacquemot",
        "confidence": 31,
        "modelPct": 23,
        "label": "Thin set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Aryna Sabalenka",
        "americanOdds": -8000,
        "modelPct": 77,
        "impliedPct": 98.8,
        "edgePct": -21.8,
        "evPer100": -22,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Aryna Sabalenka",
        "line": -7.5,
        "americanOdds": -134,
        "modelPct": 71,
        "impliedPct": 57.3,
        "edgePct": 13.7,
        "evPer100": 24,
        "valueGrade": "Bet-grade value",
        "betGrade": true
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 16.5,
        "americanOdds": -108,
        "modelPct": 68,
        "impliedPct": 51.9,
        "edgePct": 16.1,
        "evPer100": 31,
        "valueGrade": "Bet-grade value",
        "betGrade": true
      },
      "setWin": [
        {
          "name": "Aryna Sabalenka",
          "confidence": 81,
          "modelPct": 77,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Elsa Jacquemot",
          "confidence": 31,
          "modelPct": 23,
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
      "capturedAt": "2026-05-28T01:29:15.949Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/aryna-sabalenka-v-elsa-jacquemot-35654457",
      "eventId": "35654457",
      "players": [
        {
          "name": "Aryna Sabalenka",
          "odds": -8000,
          "americanLabel": "-8000",
          "impliedPct": 98.8,
          "decimalOdds": 1.012,
          "modelPct": 77,
          "edgePct": -21.8,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 1.3,
          "grossPayoutMultiple": 1.012,
          "centsAtRisk": 100,
          "centsProfitIfWin": 1.3
        },
        {
          "name": "Elsa Jacquemot",
          "odds": 2200,
          "americanLabel": "+2200",
          "impliedPct": 4.3,
          "decimalOdds": 23,
          "modelPct": 23,
          "edgePct": 18.7,
          "priceBand": "Underdog",
          "grossProfitPct": 2200,
          "grossPayoutMultiple": 23,
          "centsAtRisk": 100,
          "centsProfitIfWin": 2200
        }
      ],
      "desk": {
        "name": "Aryna Sabalenka",
        "odds": -8000,
        "americanLabel": "-8000",
        "impliedPct": 98.8,
        "decimalOdds": 1.012,
        "modelPct": 77,
        "edgePct": -21.8,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 1.3,
        "grossPayoutMultiple": 1.012,
        "centsAtRisk": 100,
        "centsProfitIfWin": 1.3
      },
      "spread": {
        "marketLine": -7.5,
        "player": "Aryna Sabalenka",
        "spread": -7.5,
        "odds": -134
      },
      "total": {
        "line": 16.5,
        "side": "Over",
        "odds": -108
      },
      "totalOver": {
        "line": 16.5,
        "side": "Over",
        "odds": -108
      },
      "totalUnder": {
        "line": 16.5,
        "side": "Under",
        "odds": -126
      },
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "Aryna Sabalenka -7.5 (-134)",
      "totalValue": "16.5 games: Over -108 / Under -126",
      "spreadLean": "Large game spread; ML may be cleaner than laying games",
      "totalLean": "Over or pass if early service games are loose",
      "mlValue": "Aryna Sabalenka -8000 / Elsa Jacquemot +2200",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 77% vs FanDuel implied 98.8% (-21.8 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Aryna-Sabalenka-Vs-Elsa-Jacquemot/",
    "players": [
      {
        "name": "Aryna Sabalenka",
        "ranking": {
          "name": "Aryna Sabalenka",
          "rank": 1,
          "points": 8730,
          "age": 28,
          "country": "BLR",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Aryna Sabalenka",
        "profile": "Live rank #1 | BLR | age 28 | 2026 clay 5-2, 71% | adj form 89 | hold 78%",
        "modelPct": 77,
        "weakness": {
          "name": "Aryna Sabalenka",
          "serviceHoldPct": 78,
          "firstServeWonPct": 69,
          "secondServeWonPct": 52,
          "firstServePct": 66,
          "avgAces": 2.7,
          "avgDoubleFaults": 2.9,
          "avgWinners": 29,
          "avgUnforcedErrors": 25,
          "avgBreakPointsFaced": 6.7,
          "returnPointsWonPct": 47,
          "servicePointsWonPct": 63,
          "weakServeMatches": 4,
          "pressureMatches": 4,
          "matchesWithStats": 7,
          "weaknessScore": 11,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "4 recent matches with serve instability"
          ],
          "strengths": [
            "protects serve well (78% hold)",
            "positive winner/error balance (29.0 winners, 25.0 unforced)",
            "creates return pressure (47% return points won)"
          ],
          "gameFlowRead": "Aryna Sabalenka can drop points quickly through 4 recent matches with serve instability."
        }
      },
      {
        "name": "Elsa Jacquemot",
        "ranking": {
          "name": "Elsa Jacquemot",
          "rank": 76,
          "points": 911,
          "age": 23,
          "country": "FRA",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Elsa Jacquemot",
        "profile": "Live rank #76 | FRA | age 23 | 2026 clay 4-6, 40% | adj form 39 | hold 58%",
        "modelPct": 23,
        "weakness": {
          "name": "Elsa Jacquemot",
          "serviceHoldPct": 58,
          "firstServeWonPct": 63,
          "secondServeWonPct": 39,
          "firstServePct": 67,
          "avgAces": 2.3,
          "avgDoubleFaults": 5.5,
          "avgWinners": 31,
          "avgUnforcedErrors": 23,
          "avgBreakPointsFaced": 8.8,
          "returnPointsWonPct": 40,
          "servicePointsWonPct": 55,
          "weakServeMatches": 3,
          "pressureMatches": 4,
          "matchesWithStats": 4,
          "weaknessScore": 34,
          "firstGameComfort": "Fragile opening-service profile",
          "liabilities": [
            "low recent hold rate (58%)",
            "second-serve points won are attackable (39%)",
            "double-fault pressure (5.5 avg)",
            "faces too many break points (8.8 avg)",
            "3 recent matches with serve instability"
          ],
          "strengths": [
            "positive winner/error balance (31.0 winners, 23.0 unforced)"
          ],
          "gameFlowRead": "Elsa Jacquemot can drop points quickly through low recent hold rate (58%) and second-serve points won are attackable (39%)."
        }
      }
    ]
  },
  {
    "id": "rg-m-felix-auger-aliassime-roman-andres-burruchaga-2026-05-28",
    "eventId": "175697",
    "tour": "ATP",
    "title": "Felix Auger-Aliassime vs Roman Andres Burruchaga",
    "start": "7:00 AM",
    "startMinutes": 420,
    "court": "Court Simonne-Mathieu",
    "round": "Round 2",
    "pickName": "Felix Auger-Aliassime",
    "confidence": 66,
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
    "reason": "Felix Auger-Aliassime has the cleaner composite of rank, clay record, and recent opponent quality. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": 0,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "Spread needs the posted number before grading.",
      "totalRead": "No total edge without posted number and first-set hold data.",
      "pick": {
        "name": "Felix Auger-Aliassime",
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
        "gameFlowRead": "Felix Auger-Aliassime has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Roman Andres Burruchaga",
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
        "gameFlowRead": "Roman Andres Burruchaga has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Felix Auger-Aliassime",
        "confidence": 89,
        "modelPct": 66,
        "label": "Strong set-win path"
      },
      {
        "name": "Roman Andres Burruchaga",
        "confidence": 63,
        "modelPct": 34,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Felix Auger-Aliassime",
        "americanOdds": -280,
        "modelPct": 66,
        "impliedPct": 73.7,
        "edgePct": -7.7,
        "evPer100": -10.4,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Felix Auger-Aliassime",
        "line": -4.5,
        "americanOdds": -130,
        "modelPct": 60,
        "impliedPct": 56.5,
        "edgePct": 3.5,
        "evPer100": 6.2,
        "valueGrade": "Thin value",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Felix Auger-Aliassime",
          "confidence": 89,
          "modelPct": 66,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Roman Andres Burruchaga",
          "confidence": 63,
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
      "capturedAt": "2026-05-28T01:29:21.134Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/felix-auger-aliassime-v-roman-andres-burruchaga-35655315",
      "eventId": "35655315",
      "players": [
        {
          "name": "Felix Auger-Aliassime",
          "odds": -280,
          "americanLabel": "-280",
          "impliedPct": 73.7,
          "decimalOdds": 1.357,
          "modelPct": 66,
          "edgePct": -7.7,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 35.7,
          "grossPayoutMultiple": 1.357,
          "centsAtRisk": 100,
          "centsProfitIfWin": 35.7
        },
        {
          "name": "Roman Andres Burruchaga",
          "odds": 220,
          "americanLabel": "+220",
          "impliedPct": 31.3,
          "decimalOdds": 3.2,
          "modelPct": 34,
          "edgePct": 2.8,
          "priceBand": "Underdog",
          "grossProfitPct": 220,
          "grossPayoutMultiple": 3.2,
          "centsAtRisk": 100,
          "centsProfitIfWin": 220
        }
      ],
      "desk": {
        "name": "Felix Auger-Aliassime",
        "odds": -280,
        "americanLabel": "-280",
        "impliedPct": 73.7,
        "decimalOdds": 1.357,
        "modelPct": 66,
        "edgePct": -7.7,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 35.7,
        "grossPayoutMultiple": 1.357,
        "centsAtRisk": 100,
        "centsProfitIfWin": 35.7
      },
      "spread": {
        "marketLine": -4.5,
        "player": "Felix Auger-Aliassime",
        "spread": -4.5,
        "odds": -130
      },
      "total": {
        "line": 37.5,
        "side": "Over",
        "odds": -112
      },
      "totalOver": {
        "line": 37.5,
        "side": "Over",
        "odds": -112
      },
      "totalUnder": {
        "line": 37.5,
        "side": "Under",
        "odds": -118
      },
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "Felix Auger-Aliassime -4.5 (-130)",
      "totalValue": "37.5 games: Over -112 / Under -118",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Felix Auger-Aliassime -280 / Roman Andres Burruchaga +220",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 66% vs FanDuel implied 73.7% (-7.7 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Felix-Auger-Aliassime-Vs-Roman-Andres-Burruchaga/",
    "players": [
      {
        "name": "Felix Auger-Aliassime",
        "ranking": {
          "name": "Félix Auger-Aliassime",
          "rank": 4,
          "points": 4090,
          "age": 25.7,
          "country": "CAN",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": null,
        "profile": "Live rank #4 | CAN | age 25.7",
        "modelPct": 66,
        "weakness": {
          "name": "Felix Auger-Aliassime",
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
          "gameFlowRead": "Felix Auger-Aliassime has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Roman Andres Burruchaga",
        "ranking": {
          "name": "Román Andrés Burruchaga",
          "rank": 58,
          "points": 875,
          "age": 24.3,
          "country": "ARG",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": null,
        "profile": "Live rank #58 | ARG | age 24.3",
        "modelPct": 34,
        "weakness": {
          "name": "Roman Andres Burruchaga",
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
          "gameFlowRead": "Roman Andres Burruchaga has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-m-luca-van-assche-brandon-nakashima-2026-05-28",
    "eventId": "175702",
    "tour": "ATP",
    "title": "Luca Van Assche vs Brandon Nakashima",
    "start": "7:00 AM",
    "startMinutes": 420,
    "court": "Court 7",
    "round": "Round 2",
    "pickName": "Brandon Nakashima",
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
    "reason": "Brandon Nakashima has the recent service-hold edge 89% to 60%. Brandon Nakashima grades 24 points better on opponent-adjusted recent form. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness edge",
      "target": "Luca Van Assche",
      "scoreGap": 20,
      "attackingSide": "Brandon Nakashima",
      "vulnerableSide": "Luca Van Assche",
      "gameFlow": "Brandon Nakashima has a real path if Luca Van Assche's first two service games show the same weakness: low recent hold rate (60%); second-serve points won are attackable (44%).",
      "liveTrigger": "Look for Luca Van Assche facing break points or second-serve pressure before 3-3.",
      "spreadRead": "Brandon Nakashima game spread is more interesting than ML if the number is short.",
      "totalRead": "No total edge without posted number and first-set hold data.",
      "pick": {
        "name": "Brandon Nakashima",
        "serviceHoldPct": 89,
        "firstServeWonPct": 78,
        "secondServeWonPct": 51,
        "firstServePct": 69,
        "avgAces": 8,
        "avgDoubleFaults": 0.5,
        "avgWinners": 22.5,
        "avgUnforcedErrors": 24,
        "avgBreakPointsFaced": 3,
        "returnPointsWonPct": 38,
        "servicePointsWonPct": 69,
        "weakServeMatches": 0,
        "pressureMatches": 5,
        "matchesWithStats": 4,
        "weaknessScore": 3,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "protects serve well (89% hold)",
          "wins enough first-serve points (78%)"
        ],
        "gameFlowRead": "Brandon Nakashima has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Luca Van Assche",
        "serviceHoldPct": 60,
        "firstServeWonPct": 65,
        "secondServeWonPct": 44,
        "firstServePct": 55,
        "avgAces": 3.8,
        "avgDoubleFaults": 2.8,
        "avgWinners": 17.8,
        "avgUnforcedErrors": 30.5,
        "avgBreakPointsFaced": 11.3,
        "returnPointsWonPct": 34,
        "servicePointsWonPct": 55,
        "weakServeMatches": 2,
        "pressureMatches": 3,
        "matchesWithStats": 4,
        "weaknessScore": 23,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "low recent hold rate (60%)",
          "second-serve points won are attackable (44%)",
          "negative winner/error balance (17.8 winners, 30.5 unforced)",
          "faces too many break points (11.3 avg)",
          "limited return pressure (34% return points won)"
        ],
        "strengths": [],
        "gameFlowRead": "Luca Van Assche can drop points quickly through low recent hold rate (60%) and second-serve points won are attackable (44%)."
      }
    },
    "setWinProjections": [
      {
        "name": "Luca Van Assche",
        "confidence": 61,
        "modelPct": 34,
        "label": "Needs early hold pressure"
      },
      {
        "name": "Brandon Nakashima",
        "confidence": 88,
        "modelPct": 66,
        "label": "Strong set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Brandon Nakashima",
        "americanOdds": -255,
        "modelPct": 66,
        "impliedPct": 71.8,
        "edgePct": -5.8,
        "evPer100": -8.1,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Brandon Nakashima",
        "line": -4.5,
        "americanOdds": -120,
        "modelPct": 64,
        "impliedPct": 54.5,
        "edgePct": 9.5,
        "evPer100": 17.3,
        "valueGrade": "Bet-grade value",
        "betGrade": true
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "valueGrade": "No direction",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Luca Van Assche",
          "confidence": 61,
          "modelPct": 34,
          "label": "Needs early hold pressure",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Brandon Nakashima",
          "confidence": 88,
          "modelPct": 66,
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
      "capturedAt": "2026-05-28T01:29:26.308Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/luca-van-assche-v-brandon-nakashima-35650148",
      "eventId": "35650148",
      "players": [
        {
          "name": "Luca Van Assche",
          "odds": 205,
          "americanLabel": "+205",
          "impliedPct": 32.8,
          "decimalOdds": 3.05,
          "modelPct": 34,
          "edgePct": 1.2,
          "priceBand": "Underdog",
          "grossProfitPct": 205,
          "grossPayoutMultiple": 3.05,
          "centsAtRisk": 100,
          "centsProfitIfWin": 205
        },
        {
          "name": "Brandon Nakashima",
          "odds": -255,
          "americanLabel": "-255",
          "impliedPct": 71.8,
          "decimalOdds": 1.392,
          "modelPct": 66,
          "edgePct": -5.8,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 39.2,
          "grossPayoutMultiple": 1.392,
          "centsAtRisk": 100,
          "centsProfitIfWin": 39.2
        }
      ],
      "desk": {
        "name": "Brandon Nakashima",
        "odds": -255,
        "americanLabel": "-255",
        "impliedPct": 71.8,
        "decimalOdds": 1.392,
        "modelPct": 66,
        "edgePct": -5.8,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 39.2,
        "grossPayoutMultiple": 1.392,
        "centsAtRisk": 100,
        "centsProfitIfWin": 39.2
      },
      "spread": {
        "marketLine": 4.5,
        "player": "Brandon Nakashima",
        "spread": -4.5,
        "odds": -120
      },
      "total": {
        "line": 37.5,
        "side": "Over",
        "odds": -118
      },
      "totalOver": {
        "line": 37.5,
        "side": "Over",
        "odds": -118
      },
      "totalUnder": {
        "line": 37.5,
        "side": "Under",
        "odds": -112
      },
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "Brandon Nakashima -4.5 (-120)",
      "totalValue": "37.5 games: Over -118 / Under -112",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Luca Van Assche +205 / Brandon Nakashima -255",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 66% vs FanDuel implied 71.8% (-5.8 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Luca-Van-Assche-Vs-Brandon-Nakashima/",
    "players": [
      {
        "name": "Luca Van Assche",
        "ranking": {
          "name": "Luca Van Assche",
          "rank": 92,
          "points": 633,
          "age": 22,
          "country": "FRA",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Luca Van Assche",
        "profile": "Live rank #92 | FRA | age 22 | 2026 clay 6-7, 46% | adj form 42 | hold 60%",
        "modelPct": 34,
        "weakness": {
          "name": "Luca Van Assche",
          "serviceHoldPct": 60,
          "firstServeWonPct": 65,
          "secondServeWonPct": 44,
          "firstServePct": 55,
          "avgAces": 3.8,
          "avgDoubleFaults": 2.8,
          "avgWinners": 17.8,
          "avgUnforcedErrors": 30.5,
          "avgBreakPointsFaced": 11.3,
          "returnPointsWonPct": 34,
          "servicePointsWonPct": 55,
          "weakServeMatches": 2,
          "pressureMatches": 3,
          "matchesWithStats": 4,
          "weaknessScore": 23,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "low recent hold rate (60%)",
            "second-serve points won are attackable (44%)",
            "negative winner/error balance (17.8 winners, 30.5 unforced)",
            "faces too many break points (11.3 avg)",
            "limited return pressure (34% return points won)"
          ],
          "strengths": [],
          "gameFlowRead": "Luca Van Assche can drop points quickly through low recent hold rate (60%) and second-serve points won are attackable (44%)."
        }
      },
      {
        "name": "Brandon Nakashima",
        "ranking": {
          "name": "Brandon Nakashima",
          "rank": 32,
          "points": 1335,
          "age": 24.8,
          "country": "USA",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Brandon Nakashima",
        "profile": "Live rank #32 | USA | age 24.8 | 2026 clay 4-4, 50% | adj form 66 | hold 89%",
        "modelPct": 66,
        "weakness": {
          "name": "Brandon Nakashima",
          "serviceHoldPct": 89,
          "firstServeWonPct": 78,
          "secondServeWonPct": 51,
          "firstServePct": 69,
          "avgAces": 8,
          "avgDoubleFaults": 0.5,
          "avgWinners": 22.5,
          "avgUnforcedErrors": 24,
          "avgBreakPointsFaced": 3,
          "returnPointsWonPct": 38,
          "servicePointsWonPct": 69,
          "weakServeMatches": 0,
          "pressureMatches": 5,
          "matchesWithStats": 4,
          "weaknessScore": 3,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "protects serve well (89% hold)",
            "wins enough first-serve points (78%)"
          ],
          "gameFlowRead": "Brandon Nakashima has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-m-matteo-arnaldi-stefanos-tsitsipas-2026-05-28",
    "eventId": "175704",
    "tour": "ATP",
    "title": "Matteo Arnaldi vs Stefanos Tsitsipas",
    "start": "7:00 AM",
    "startMinutes": 420,
    "court": "Court 14",
    "round": "Round 2",
    "pickName": "Matteo Arnaldi",
    "confidence": 50,
    "volatility": 50,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Watch only",
      "Positive price edge",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Stefanos Tsitsipas has the recent service-hold edge 90% to 82%, so Matteo Arnaldi needs the rank/form edge to show up on return games. Matteo Arnaldi grades 32 points better on opponent-adjusted recent form. Lean, not a chase.",
    "totals": "Best O/U angle: over if the book hangs a low best-of-five number, because both recent hold profiles can extend sets.",
    "weaknessEdge": {
      "edgeType": "Weakness warning",
      "target": "Matteo Arnaldi",
      "scoreGap": -11,
      "attackingSide": null,
      "vulnerableSide": "Matteo Arnaldi",
      "gameFlow": "Matteo Arnaldi is the model side, but the fragile profile is on our pick: double-fault pressure (4.0 avg); limited return pressure (37% return points won). Avoid laying a bad price until early holds are confirmed.",
      "liveTrigger": "Do not upgrade Matteo Arnaldi unless they hold cleanly in the first service game and keep double faults down.",
      "spreadRead": "Spread needs the posted number before grading.",
      "totalRead": "No total edge without posted number and first-set hold data.",
      "pick": {
        "name": "Matteo Arnaldi",
        "serviceHoldPct": 82,
        "firstServeWonPct": 71,
        "secondServeWonPct": 54,
        "firstServePct": 63,
        "avgAces": 5,
        "avgDoubleFaults": 4,
        "avgWinners": 32,
        "avgUnforcedErrors": 31.3,
        "avgBreakPointsFaced": 6.5,
        "returnPointsWonPct": 37,
        "servicePointsWonPct": 64,
        "weakServeMatches": 2,
        "pressureMatches": 6,
        "matchesWithStats": 4,
        "weaknessScore": 13,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "double-fault pressure (4.0 avg)",
          "limited return pressure (37% return points won)"
        ],
        "strengths": [
          "protects serve well (82% hold)",
          "wins enough first-serve points (71%)"
        ],
        "gameFlowRead": "Matteo Arnaldi can drop points quickly through double-fault pressure (4.0 avg) and limited return pressure (37% return points won)."
      },
      "opponent": {
        "name": "Stefanos Tsitsipas",
        "serviceHoldPct": 90,
        "firstServeWonPct": 77,
        "secondServeWonPct": 49,
        "firstServePct": 67,
        "avgAces": 4.6,
        "avgDoubleFaults": 1,
        "avgWinners": 25.9,
        "avgUnforcedErrors": 22.4,
        "avgBreakPointsFaced": 4.1,
        "returnPointsWonPct": 41,
        "servicePointsWonPct": 69,
        "weakServeMatches": 0,
        "pressureMatches": 4,
        "matchesWithStats": 8,
        "weaknessScore": 2,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "protects serve well (90% hold)",
          "wins enough first-serve points (77%)",
          "positive winner/error balance (25.9 winners, 22.4 unforced)"
        ],
        "gameFlowRead": "Stefanos Tsitsipas has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Matteo Arnaldi",
        "confidence": 82,
        "modelPct": 50,
        "label": "Strong set-win path"
      },
      {
        "name": "Stefanos Tsitsipas",
        "confidence": 84,
        "modelPct": 50,
        "label": "Strong set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Matteo Arnaldi",
        "americanOdds": 146,
        "modelPct": 50,
        "impliedPct": 40.7,
        "edgePct": 9.3,
        "evPer100": 23,
        "valueGrade": "Bet-grade value",
        "betGrade": true
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Matteo Arnaldi",
        "line": 3.5,
        "americanOdds": -120,
        "modelPct": 42,
        "impliedPct": 54.5,
        "edgePct": -12.5,
        "evPer100": -23,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 38.5,
        "americanOdds": -120,
        "modelPct": 42,
        "impliedPct": 54.5,
        "edgePct": -12.5,
        "evPer100": -23,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Matteo Arnaldi",
          "confidence": 82,
          "modelPct": 50,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Stefanos Tsitsipas",
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
      "capturedAt": "2026-05-28T01:29:31.489Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/matteo-arnaldi-v-stefanos-tsitsipas-35654022",
      "eventId": "35654022",
      "players": [
        {
          "name": "Matteo Arnaldi",
          "odds": 146,
          "americanLabel": "+146",
          "impliedPct": 40.7,
          "decimalOdds": 2.46,
          "modelPct": 50,
          "edgePct": 9.3,
          "priceBand": "Underdog",
          "grossProfitPct": 146,
          "grossPayoutMultiple": 2.46,
          "centsAtRisk": 100,
          "centsProfitIfWin": 146
        },
        {
          "name": "Stefanos Tsitsipas",
          "odds": -178,
          "americanLabel": "-178",
          "impliedPct": 64,
          "decimalOdds": 1.562,
          "modelPct": 50,
          "edgePct": -14,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 56.2,
          "grossPayoutMultiple": 1.562,
          "centsAtRisk": 100,
          "centsProfitIfWin": 56.2
        }
      ],
      "desk": {
        "name": "Matteo Arnaldi",
        "odds": 146,
        "americanLabel": "+146",
        "impliedPct": 40.7,
        "decimalOdds": 2.46,
        "modelPct": 50,
        "edgePct": 9.3,
        "priceBand": "Underdog",
        "grossProfitPct": 146,
        "grossPayoutMultiple": 2.46,
        "centsAtRisk": 100,
        "centsProfitIfWin": 146
      },
      "spread": {
        "marketLine": 3.5,
        "player": "Matteo Arnaldi",
        "spread": 3.5,
        "odds": -120
      },
      "total": {
        "line": 38.5,
        "side": "Over",
        "odds": -120
      },
      "totalOver": {
        "line": 38.5,
        "side": "Over",
        "odds": -120
      },
      "totalUnder": {
        "line": 38.5,
        "side": "Under",
        "odds": -110
      },
      "priceAction": "Model is meaningfully above FanDuel implied price.",
      "spreadValue": "Matteo Arnaldi +3.5 (-120)",
      "totalValue": "38.5 games: Over -120 / Under -110",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Over lean if both players hold early",
      "mlValue": "Matteo Arnaldi +146 / Stefanos Tsitsipas -178",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. Model is meaningfully above FanDuel implied price.",
      "noVigNote": "Model 50% vs FanDuel implied 40.7% (+9.3 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Matteo-Arnaldi-Vs-Stefanos-Tsitsipas/",
    "players": [
      {
        "name": "Matteo Arnaldi",
        "ranking": {
          "name": "Matteo Arnaldi",
          "rank": 105,
          "points": 586,
          "age": 25.2,
          "country": "ITA",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Matteo Arnaldi",
        "profile": "Live rank #105 | ITA | age 25.2 | 2026 clay 9-6, 60% | adj form 100 | hold 82%",
        "modelPct": 50,
        "weakness": {
          "name": "Matteo Arnaldi",
          "serviceHoldPct": 82,
          "firstServeWonPct": 71,
          "secondServeWonPct": 54,
          "firstServePct": 63,
          "avgAces": 5,
          "avgDoubleFaults": 4,
          "avgWinners": 32,
          "avgUnforcedErrors": 31.3,
          "avgBreakPointsFaced": 6.5,
          "returnPointsWonPct": 37,
          "servicePointsWonPct": 64,
          "weakServeMatches": 2,
          "pressureMatches": 6,
          "matchesWithStats": 4,
          "weaknessScore": 13,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "double-fault pressure (4.0 avg)",
            "limited return pressure (37% return points won)"
          ],
          "strengths": [
            "protects serve well (82% hold)",
            "wins enough first-serve points (71%)"
          ],
          "gameFlowRead": "Matteo Arnaldi can drop points quickly through double-fault pressure (4.0 avg) and limited return pressure (37% return points won)."
        }
      },
      {
        "name": "Stefanos Tsitsipas",
        "ranking": {
          "name": "Stefanos Tsitsipas",
          "rank": 78,
          "points": 740,
          "age": 27.7,
          "country": "GRE",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Stefanos Tsitsipas",
        "profile": "Live rank #78 | GRE | age 27.7 | 2026 clay 5-6, 46% | adj form 68 | hold 90%",
        "modelPct": 50,
        "weakness": {
          "name": "Stefanos Tsitsipas",
          "serviceHoldPct": 90,
          "firstServeWonPct": 77,
          "secondServeWonPct": 49,
          "firstServePct": 67,
          "avgAces": 4.6,
          "avgDoubleFaults": 1,
          "avgWinners": 25.9,
          "avgUnforcedErrors": 22.4,
          "avgBreakPointsFaced": 4.1,
          "returnPointsWonPct": 41,
          "servicePointsWonPct": 69,
          "weakServeMatches": 0,
          "pressureMatches": 4,
          "matchesWithStats": 8,
          "weaknessScore": 2,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "protects serve well (90% hold)",
            "wins enough first-serve points (77%)",
            "positive winner/error balance (25.9 winners, 22.4 unforced)"
          ],
          "gameFlowRead": "Stefanos Tsitsipas has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-m-raphael-collignon-ben-shelton-2026-05-28",
    "eventId": "175706",
    "tour": "ATP",
    "title": "Raphael Collignon vs Ben Shelton",
    "start": "7:00 AM",
    "startMinutes": 420,
    "court": "Court Suzanne-Lenglen",
    "round": "Round 2",
    "pickName": "Ben Shelton",
    "confidence": 63,
    "volatility": 37,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Watch only",
      "No blind bet",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Ben Shelton has the recent service-hold edge 88% to 80%. Raphael Collignon grades 9 points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price. Lean, not a chase.",
    "totals": "Best O/U angle: over if the book hangs a low best-of-five number, because both recent hold profiles can extend sets.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": 0,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "Spread needs the posted number before grading.",
      "totalRead": "No total edge without posted number and first-set hold data.",
      "pick": {
        "name": "Ben Shelton",
        "serviceHoldPct": 88,
        "firstServeWonPct": 78,
        "secondServeWonPct": 54,
        "firstServePct": 68,
        "avgAces": 7.6,
        "avgDoubleFaults": 3.6,
        "avgWinners": 37.4,
        "avgUnforcedErrors": 39.6,
        "avgBreakPointsFaced": 6,
        "returnPointsWonPct": 33,
        "servicePointsWonPct": 69,
        "weakServeMatches": 1,
        "pressureMatches": 6,
        "matchesWithStats": 5,
        "weaknessScore": 9,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "limited return pressure (33% return points won)"
        ],
        "strengths": [
          "protects serve well (88% hold)",
          "wins enough first-serve points (78%)"
        ],
        "gameFlowRead": "Ben Shelton can drop points quickly through limited return pressure (33% return points won)."
      },
      "opponent": {
        "name": "Raphael Collignon",
        "serviceHoldPct": 80,
        "firstServeWonPct": 73,
        "secondServeWonPct": 48,
        "firstServePct": 62,
        "avgAces": 8,
        "avgDoubleFaults": 3.3,
        "avgWinners": 25,
        "avgUnforcedErrors": 22.7,
        "avgBreakPointsFaced": 7.3,
        "returnPointsWonPct": 37,
        "servicePointsWonPct": 63,
        "weakServeMatches": 1,
        "pressureMatches": 6,
        "matchesWithStats": 3,
        "weaknessScore": 9,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "limited return pressure (37% return points won)"
        ],
        "strengths": [
          "protects serve well (80% hold)",
          "wins enough first-serve points (73%)"
        ],
        "gameFlowRead": "Raphael Collignon can drop points quickly through limited return pressure (37% return points won)."
      }
    },
    "setWinProjections": [
      {
        "name": "Raphael Collignon",
        "confidence": 65,
        "modelPct": 37,
        "label": "Needs early hold pressure"
      },
      {
        "name": "Ben Shelton",
        "confidence": 87,
        "modelPct": 63,
        "label": "Strong set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Ben Shelton",
        "americanOdds": -210,
        "modelPct": 63,
        "impliedPct": 67.7,
        "edgePct": -4.7,
        "evPer100": -7,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Ben Shelton",
        "line": -3.5,
        "americanOdds": -118,
        "modelPct": 57,
        "impliedPct": 54.1,
        "edgePct": 2.9,
        "evPer100": 5.3,
        "valueGrade": "Near fair",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 39.5,
        "americanOdds": -116,
        "modelPct": 55,
        "impliedPct": 53.7,
        "edgePct": 1.3,
        "evPer100": 2.4,
        "valueGrade": "Near fair",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Raphael Collignon",
          "confidence": 65,
          "modelPct": 37,
          "label": "Needs early hold pressure",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Ben Shelton",
          "confidence": 87,
          "modelPct": 63,
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
      "capturedAt": "2026-05-28T01:29:36.664Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/raphael-collignon-v-ben-shelton-35651684",
      "eventId": "35651684",
      "players": [
        {
          "name": "Raphael Collignon",
          "odds": 172,
          "americanLabel": "+172",
          "impliedPct": 36.8,
          "decimalOdds": 2.72,
          "modelPct": 37,
          "edgePct": 0.2,
          "priceBand": "Underdog",
          "grossProfitPct": 172,
          "grossPayoutMultiple": 2.72,
          "centsAtRisk": 100,
          "centsProfitIfWin": 172
        },
        {
          "name": "Ben Shelton",
          "odds": -210,
          "americanLabel": "-210",
          "impliedPct": 67.7,
          "decimalOdds": 1.476,
          "modelPct": 63,
          "edgePct": -4.7,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 47.6,
          "grossPayoutMultiple": 1.476,
          "centsAtRisk": 100,
          "centsProfitIfWin": 47.6
        }
      ],
      "desk": {
        "name": "Ben Shelton",
        "odds": -210,
        "americanLabel": "-210",
        "impliedPct": 67.7,
        "decimalOdds": 1.476,
        "modelPct": 63,
        "edgePct": -4.7,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 47.6,
        "grossPayoutMultiple": 1.476,
        "centsAtRisk": 100,
        "centsProfitIfWin": 47.6
      },
      "spread": {
        "marketLine": 3.5,
        "player": "Ben Shelton",
        "spread": -3.5,
        "odds": -118
      },
      "total": {
        "line": 39.5,
        "side": "Over",
        "odds": -116
      },
      "totalOver": {
        "line": 39.5,
        "side": "Over",
        "odds": -116
      },
      "totalUnder": {
        "line": 39.5,
        "side": "Under",
        "odds": -116
      },
      "priceAction": "FanDuel price is richer than the model; pass ML unless live state improves.",
      "spreadValue": "Ben Shelton -3.5 (-118)",
      "totalValue": "39.5 games: Over -116 / Under -116",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Over lean if both players hold early",
      "mlValue": "Raphael Collignon +172 / Ben Shelton -210",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. FanDuel price is richer than the model; pass ML unless live state improves.",
      "noVigNote": "Model 63% vs FanDuel implied 67.7% (-4.7 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Raphael-Collignon-Vs-Ben-Shelton/",
    "players": [
      {
        "name": "Raphael Collignon",
        "ranking": {
          "name": "Raphaël Collignon",
          "rank": 52,
          "points": 916,
          "age": 24.3,
          "country": "BEL",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Raphael Collignon",
        "profile": "Live rank #52 | BEL | age 24.3 | 2026 clay 11-2, 85% | adj form 93 | hold 80%",
        "modelPct": 37,
        "weakness": {
          "name": "Raphael Collignon",
          "serviceHoldPct": 80,
          "firstServeWonPct": 73,
          "secondServeWonPct": 48,
          "firstServePct": 62,
          "avgAces": 8,
          "avgDoubleFaults": 3.3,
          "avgWinners": 25,
          "avgUnforcedErrors": 22.7,
          "avgBreakPointsFaced": 7.3,
          "returnPointsWonPct": 37,
          "servicePointsWonPct": 63,
          "weakServeMatches": 1,
          "pressureMatches": 6,
          "matchesWithStats": 3,
          "weaknessScore": 9,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "limited return pressure (37% return points won)"
          ],
          "strengths": [
            "protects serve well (80% hold)",
            "wins enough first-serve points (73%)"
          ],
          "gameFlowRead": "Raphael Collignon can drop points quickly through limited return pressure (37% return points won)."
        }
      },
      {
        "name": "Ben Shelton",
        "ranking": {
          "name": "Ben Shelton",
          "rank": 5,
          "points": 3920,
          "age": 23.6,
          "country": "USA",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Ben Shelton",
        "profile": "Live rank #5 | USA | age 23.6 | 2026 clay 8-4, 67% | adj form 85 | hold 88%",
        "modelPct": 63,
        "weakness": {
          "name": "Ben Shelton",
          "serviceHoldPct": 88,
          "firstServeWonPct": 78,
          "secondServeWonPct": 54,
          "firstServePct": 68,
          "avgAces": 7.6,
          "avgDoubleFaults": 3.6,
          "avgWinners": 37.4,
          "avgUnforcedErrors": 39.6,
          "avgBreakPointsFaced": 6,
          "returnPointsWonPct": 33,
          "servicePointsWonPct": 69,
          "weakServeMatches": 1,
          "pressureMatches": 6,
          "matchesWithStats": 5,
          "weaknessScore": 9,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "limited return pressure (33% return points won)"
          ],
          "strengths": [
            "protects serve well (88% hold)",
            "wins enough first-serve points (78%)"
          ],
          "gameFlowRead": "Ben Shelton can drop points quickly through limited return pressure (33% return points won)."
        }
      }
    ]
  },
  {
    "id": "rg-w-katie-boulter-anastasia-potapova-2026-05-28",
    "eventId": "175573",
    "tour": "WTA",
    "title": "Katie Boulter vs Anastasia Potapova",
    "start": "7:30 AM",
    "startMinutes": 450,
    "court": "Court 6",
    "round": "Round 2",
    "pickName": "Anastasia Potapova",
    "confidence": 58,
    "volatility": 49,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Watch only",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Katie Boulter has the recent service-hold edge 79% to 66%, so Anastasia Potapova needs the rank/form edge to show up on return games. Anastasia Potapova grades 23 points better on opponent-adjusted recent form. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": -6,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "Spread needs the posted number before grading.",
      "totalRead": "Weak service profile points to breaks; be careful with low unders.",
      "pick": {
        "name": "Anastasia Potapova",
        "serviceHoldPct": 66,
        "firstServeWonPct": 69,
        "secondServeWonPct": 45,
        "firstServePct": 56,
        "avgAces": 1.3,
        "avgDoubleFaults": 4,
        "avgWinners": 12,
        "avgUnforcedErrors": 21,
        "avgBreakPointsFaced": 8.9,
        "returnPointsWonPct": 53,
        "servicePointsWonPct": 58,
        "weakServeMatches": 5,
        "pressureMatches": 4,
        "matchesWithStats": 8,
        "weaknessScore": 25,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "second-serve points won are attackable (45%)",
          "double-fault pressure (4.0 avg)",
          "negative winner/error balance (12.0 winners, 21.0 unforced)",
          "faces too many break points (8.9 avg)",
          "5 recent matches with serve instability"
        ],
        "strengths": [
          "creates return pressure (53% return points won)"
        ],
        "gameFlowRead": "Anastasia Potapova can drop points quickly through second-serve points won are attackable (45%) and double-fault pressure (4.0 avg)."
      },
      "opponent": {
        "name": "Katie Boulter",
        "serviceHoldPct": 79,
        "firstServeWonPct": 74,
        "secondServeWonPct": 44,
        "firstServePct": 61,
        "avgAces": 3,
        "avgDoubleFaults": 5.3,
        "avgWinners": 24,
        "avgUnforcedErrors": 35,
        "avgBreakPointsFaced": 6.7,
        "returnPointsWonPct": 41,
        "servicePointsWonPct": 62,
        "weakServeMatches": 2,
        "pressureMatches": 5,
        "matchesWithStats": 3,
        "weaknessScore": 19,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "second-serve points won are attackable (44%)",
          "double-fault pressure (5.3 avg)",
          "negative winner/error balance (24.0 winners, 35.0 unforced)"
        ],
        "strengths": [
          "protects serve well (79% hold)",
          "wins enough first-serve points (74%)"
        ],
        "gameFlowRead": "Katie Boulter can drop points quickly through second-serve points won are attackable (44%) and double-fault pressure (5.3 avg)."
      }
    },
    "setWinProjections": [
      {
        "name": "Katie Boulter",
        "confidence": 55,
        "modelPct": 42,
        "label": "Needs early hold pressure"
      },
      {
        "name": "Anastasia Potapova",
        "confidence": 70,
        "modelPct": 58,
        "label": "Live to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Anastasia Potapova",
        "americanOdds": -465,
        "modelPct": 58,
        "impliedPct": 82.3,
        "edgePct": -24.3,
        "evPer100": -29.5,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Anastasia Potapova",
        "line": -5.5,
        "americanOdds": 104,
        "modelPct": 52,
        "impliedPct": 49,
        "edgePct": 3,
        "evPer100": 6.1,
        "valueGrade": "Thin value",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 20.5,
        "americanOdds": -106,
        "modelPct": 50,
        "impliedPct": 51.5,
        "edgePct": -1.5,
        "evPer100": -2.8,
        "valueGrade": "Near fair",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Katie Boulter",
          "confidence": 55,
          "modelPct": 42,
          "label": "Needs early hold pressure",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Anastasia Potapova",
          "confidence": 70,
          "modelPct": 58,
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
      "capturedAt": "2026-05-28T01:29:41.829Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/katie-boulter-v-anastasia-potapova-35651785",
      "eventId": "35651785",
      "players": [
        {
          "name": "Katie Boulter",
          "odds": 350,
          "americanLabel": "+350",
          "impliedPct": 22.2,
          "decimalOdds": 4.5,
          "modelPct": 42,
          "edgePct": 19.8,
          "priceBand": "Underdog",
          "grossProfitPct": 350,
          "grossPayoutMultiple": 4.5,
          "centsAtRisk": 100,
          "centsProfitIfWin": 350
        },
        {
          "name": "Anastasia Potapova",
          "odds": -465,
          "americanLabel": "-465",
          "impliedPct": 82.3,
          "decimalOdds": 1.215,
          "modelPct": 58,
          "edgePct": -24.3,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 21.5,
          "grossPayoutMultiple": 1.215,
          "centsAtRisk": 100,
          "centsProfitIfWin": 21.5
        }
      ],
      "desk": {
        "name": "Anastasia Potapova",
        "odds": -465,
        "americanLabel": "-465",
        "impliedPct": 82.3,
        "decimalOdds": 1.215,
        "modelPct": 58,
        "edgePct": -24.3,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 21.5,
        "grossPayoutMultiple": 1.215,
        "centsAtRisk": 100,
        "centsProfitIfWin": 21.5
      },
      "spread": {
        "marketLine": 5.5,
        "player": "Anastasia Potapova",
        "spread": -5.5,
        "odds": 104
      },
      "total": {
        "line": 20.5,
        "side": "Over",
        "odds": -106
      },
      "totalOver": {
        "line": 20.5,
        "side": "Over",
        "odds": -106
      },
      "totalUnder": {
        "line": 20.5,
        "side": "Under",
        "odds": -128
      },
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "Anastasia Potapova -5.5 (+104)",
      "totalValue": "20.5 games: Over -106 / Under -128",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Over or pass if early service games are loose",
      "mlValue": "Katie Boulter +350 / Anastasia Potapova -465",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 58% vs FanDuel implied 82.3% (-24.3 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Katie-Boulter-Vs-Anastasia-Potapova/",
    "players": [
      {
        "name": "Katie Boulter",
        "ranking": {
          "name": "Katie Boulter",
          "rank": 69,
          "points": 941,
          "age": 29.8,
          "country": "GBR",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Katie Boulter",
        "profile": "Live rank #69 | GBR | age 29.8 | 2026 clay 5-5, 50% | adj form 61 | hold 79%",
        "modelPct": 42,
        "weakness": {
          "name": "Katie Boulter",
          "serviceHoldPct": 79,
          "firstServeWonPct": 74,
          "secondServeWonPct": 44,
          "firstServePct": 61,
          "avgAces": 3,
          "avgDoubleFaults": 5.3,
          "avgWinners": 24,
          "avgUnforcedErrors": 35,
          "avgBreakPointsFaced": 6.7,
          "returnPointsWonPct": 41,
          "servicePointsWonPct": 62,
          "weakServeMatches": 2,
          "pressureMatches": 5,
          "matchesWithStats": 3,
          "weaknessScore": 19,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "second-serve points won are attackable (44%)",
            "double-fault pressure (5.3 avg)",
            "negative winner/error balance (24.0 winners, 35.0 unforced)"
          ],
          "strengths": [
            "protects serve well (79% hold)",
            "wins enough first-serve points (74%)"
          ],
          "gameFlowRead": "Katie Boulter can drop points quickly through second-serve points won are attackable (44%) and double-fault pressure (5.3 avg)."
        }
      },
      {
        "name": "Anastasia Potapova",
        "ranking": {
          "name": "Anastasia Potapova",
          "rank": 29,
          "points": 1470,
          "age": 25.1,
          "country": "AUT",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Anastasia Potapova",
        "profile": "Live rank #29 | AUT | age 25.1 | 2026 clay 15-4, 79% | adj form 85 | hold 66%",
        "modelPct": 58,
        "weakness": {
          "name": "Anastasia Potapova",
          "serviceHoldPct": 66,
          "firstServeWonPct": 69,
          "secondServeWonPct": 45,
          "firstServePct": 56,
          "avgAces": 1.3,
          "avgDoubleFaults": 4,
          "avgWinners": 12,
          "avgUnforcedErrors": 21,
          "avgBreakPointsFaced": 8.9,
          "returnPointsWonPct": 53,
          "servicePointsWonPct": 58,
          "weakServeMatches": 5,
          "pressureMatches": 4,
          "matchesWithStats": 8,
          "weaknessScore": 25,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "second-serve points won are attackable (45%)",
            "double-fault pressure (4.0 avg)",
            "negative winner/error balance (12.0 winners, 21.0 unforced)",
            "faces too many break points (8.9 avg)",
            "5 recent matches with serve instability"
          ],
          "strengths": [
            "creates return pressure (53% return points won)"
          ],
          "gameFlowRead": "Anastasia Potapova can drop points quickly through second-serve points won are attackable (45%) and double-fault pressure (4.0 avg)."
        }
      }
    ]
  },
  {
    "id": "rg-w-victoria-mboko-katerina-siniakova-2026-05-28",
    "eventId": "175569",
    "tour": "WTA",
    "title": "Victoria Mboko vs Katerina Siniakova",
    "start": "9:00 AM",
    "startMinutes": 540,
    "court": "Court Simonne-Mathieu",
    "round": "Round 2",
    "pickName": "Victoria Mboko",
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
    "reason": "Katerina Siniakova has the recent service-hold edge 75% to 70%, so Victoria Mboko needs the rank/form edge to show up on return games. Victoria Mboko grades 7 points better on opponent-adjusted recent form. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness edge",
      "target": "Katerina Siniakova",
      "scoreGap": 8,
      "attackingSide": "Victoria Mboko",
      "vulnerableSide": "Katerina Siniakova",
      "gameFlow": "Victoria Mboko has a real path if Katerina Siniakova's first two service games show the same weakness: double-fault pressure (4.4 avg); negative winner/error balance (17.0 winners, 39.0 unforced).",
      "liveTrigger": "Look for Katerina Siniakova facing break points or second-serve pressure before 3-3.",
      "spreadRead": "Victoria Mboko game spread is more interesting than ML if the number is short.",
      "totalRead": "Weak service profile points to breaks; be careful with low unders.",
      "pick": {
        "name": "Victoria Mboko",
        "serviceHoldPct": 70,
        "firstServeWonPct": 64,
        "secondServeWonPct": 52,
        "firstServePct": 64,
        "avgAces": 3.5,
        "avgDoubleFaults": 4.3,
        "avgWinners": 22,
        "avgUnforcedErrors": 15,
        "avgBreakPointsFaced": 8.3,
        "returnPointsWonPct": 44,
        "servicePointsWonPct": 59,
        "weakServeMatches": 4,
        "pressureMatches": 4,
        "matchesWithStats": 6,
        "weaknessScore": 17,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "double-fault pressure (4.3 avg)",
          "faces too many break points (8.3 avg)",
          "4 recent matches with serve instability"
        ],
        "strengths": [
          "positive winner/error balance (22.0 winners, 15.0 unforced)"
        ],
        "gameFlowRead": "Victoria Mboko can drop points quickly through double-fault pressure (4.3 avg) and faces too many break points (8.3 avg)."
      },
      "opponent": {
        "name": "Katerina Siniakova",
        "serviceHoldPct": 75,
        "firstServeWonPct": 66,
        "secondServeWonPct": 50,
        "firstServePct": 62,
        "avgAces": 1.1,
        "avgDoubleFaults": 4.4,
        "avgWinners": 17,
        "avgUnforcedErrors": 39,
        "avgBreakPointsFaced": 10.3,
        "returnPointsWonPct": 46,
        "servicePointsWonPct": 60,
        "weakServeMatches": 4,
        "pressureMatches": 4,
        "matchesWithStats": 7,
        "weaknessScore": 25,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "double-fault pressure (4.4 avg)",
          "negative winner/error balance (17.0 winners, 39.0 unforced)",
          "faces too many break points (10.3 avg)",
          "4 recent matches with serve instability"
        ],
        "strengths": [
          "creates return pressure (46% return points won)"
        ],
        "gameFlowRead": "Katerina Siniakova can drop points quickly through double-fault pressure (4.4 avg) and negative winner/error balance (17.0 winners, 39.0 unforced)."
      }
    },
    "setWinProjections": [
      {
        "name": "Victoria Mboko",
        "confidence": 73,
        "modelPct": 61,
        "label": "Live to win a set"
      },
      {
        "name": "Katerina Siniakova",
        "confidence": 51,
        "modelPct": 39,
        "label": "Thin set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Victoria Mboko",
        "americanOdds": -280,
        "modelPct": 61,
        "impliedPct": 73.7,
        "edgePct": -12.7,
        "evPer100": -17.2,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Victoria Mboko",
        "line": -4.5,
        "americanOdds": -108,
        "modelPct": 59,
        "impliedPct": 51.9,
        "edgePct": 7.1,
        "evPer100": 13.6,
        "valueGrade": "Bet-grade value",
        "betGrade": true
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 20.5,
        "americanOdds": -122,
        "modelPct": 53,
        "impliedPct": 55,
        "edgePct": -2,
        "evPer100": -3.6,
        "valueGrade": "Near fair",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Victoria Mboko",
          "confidence": 73,
          "modelPct": 61,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Katerina Siniakova",
          "confidence": 51,
          "modelPct": 39,
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
      "capturedAt": "2026-05-28T01:29:47.006Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/victoria-mboko-v-katerina-siniakova-35655115",
      "eventId": "35655115",
      "players": [
        {
          "name": "Victoria Mboko",
          "odds": -280,
          "americanLabel": "-280",
          "impliedPct": 73.7,
          "decimalOdds": 1.357,
          "modelPct": 61,
          "edgePct": -12.7,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 35.7,
          "grossPayoutMultiple": 1.357,
          "centsAtRisk": 100,
          "centsProfitIfWin": 35.7
        },
        {
          "name": "Katerina Siniakova",
          "odds": 225,
          "americanLabel": "+225",
          "impliedPct": 30.8,
          "decimalOdds": 3.25,
          "modelPct": 39,
          "edgePct": 8.2,
          "priceBand": "Underdog",
          "grossProfitPct": 225,
          "grossPayoutMultiple": 3.25,
          "centsAtRisk": 100,
          "centsProfitIfWin": 225
        }
      ],
      "desk": {
        "name": "Victoria Mboko",
        "odds": -280,
        "americanLabel": "-280",
        "impliedPct": 73.7,
        "decimalOdds": 1.357,
        "modelPct": 61,
        "edgePct": -12.7,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 35.7,
        "grossPayoutMultiple": 1.357,
        "centsAtRisk": 100,
        "centsProfitIfWin": 35.7
      },
      "spread": {
        "marketLine": -4.5,
        "player": "Victoria Mboko",
        "spread": -4.5,
        "odds": -108
      },
      "total": {
        "line": 20.5,
        "side": "Over",
        "odds": -122
      },
      "totalOver": {
        "line": 20.5,
        "side": "Over",
        "odds": -122
      },
      "totalUnder": {
        "line": 20.5,
        "side": "Under",
        "odds": -110
      },
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "Victoria Mboko -4.5 (-108)",
      "totalValue": "20.5 games: Over -122 / Under -110",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Over or pass if early service games are loose",
      "mlValue": "Victoria Mboko -280 / Katerina Siniakova +225",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 61% vs FanDuel implied 73.7% (-12.7 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Victoria-Mboko-Vs-Katerina-Siniakova/",
    "players": [
      {
        "name": "Victoria Mboko",
        "ranking": {
          "name": "Victoria Mboko",
          "rank": 9,
          "points": 3610,
          "age": 19.7,
          "country": "CAN",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Victoria Mboko",
        "profile": "Live rank #9 | CAN | age 19.7 | 2026 clay 4-2, 67% | adj form 74 | hold 70%",
        "modelPct": 61,
        "weakness": {
          "name": "Victoria Mboko",
          "serviceHoldPct": 70,
          "firstServeWonPct": 64,
          "secondServeWonPct": 52,
          "firstServePct": 64,
          "avgAces": 3.5,
          "avgDoubleFaults": 4.3,
          "avgWinners": 22,
          "avgUnforcedErrors": 15,
          "avgBreakPointsFaced": 8.3,
          "returnPointsWonPct": 44,
          "servicePointsWonPct": 59,
          "weakServeMatches": 4,
          "pressureMatches": 4,
          "matchesWithStats": 6,
          "weaknessScore": 17,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "double-fault pressure (4.3 avg)",
            "faces too many break points (8.3 avg)",
            "4 recent matches with serve instability"
          ],
          "strengths": [
            "positive winner/error balance (22.0 winners, 15.0 unforced)"
          ],
          "gameFlowRead": "Victoria Mboko can drop points quickly through double-fault pressure (4.3 avg) and faces too many break points (8.3 avg)."
        }
      },
      {
        "name": "Katerina Siniakova",
        "ranking": {
          "name": "Kateřina Siniaková",
          "rank": 31,
          "points": 1422,
          "age": 30,
          "country": "CZE",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/wta-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/wta-live-ranking browser snapshot"
        },
        "qualityName": "Katerina Siniakova",
        "profile": "Live rank #31 | CZE | age 30 | 2026 clay 4-3, 57% | adj form 67 | hold 75%",
        "modelPct": 39,
        "weakness": {
          "name": "Katerina Siniakova",
          "serviceHoldPct": 75,
          "firstServeWonPct": 66,
          "secondServeWonPct": 50,
          "firstServePct": 62,
          "avgAces": 1.1,
          "avgDoubleFaults": 4.4,
          "avgWinners": 17,
          "avgUnforcedErrors": 39,
          "avgBreakPointsFaced": 10.3,
          "returnPointsWonPct": 46,
          "servicePointsWonPct": 60,
          "weakServeMatches": 4,
          "pressureMatches": 4,
          "matchesWithStats": 7,
          "weaknessScore": 25,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "double-fault pressure (4.4 avg)",
            "negative winner/error balance (17.0 winners, 39.0 unforced)",
            "faces too many break points (10.3 avg)",
            "4 recent matches with serve instability"
          ],
          "strengths": [
            "creates return pressure (46% return points won)"
          ],
          "gameFlowRead": "Katerina Siniakova can drop points quickly through double-fault pressure (4.4 avg) and negative winner/error balance (17.0 winners, 39.0 unforced)."
        }
      }
    ]
  },
  {
    "id": "rg-m-arthur-rinderknech-matteo-berrettini-2026-05-28",
    "eventId": "175682",
    "tour": "ATP",
    "title": "Arthur Rinderknech vs Matteo Berrettini",
    "start": "11:15 AM",
    "startMinutes": 675,
    "court": "Court Philippe-Chatrier",
    "round": "Round 2",
    "pickName": "Arthur Rinderknech",
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
    "reason": "Arthur Rinderknech has the recent service-hold edge 92% to 79%. Opponent-adjusted recent form is basically even: Arthur Rinderknech 61, Matteo Berrettini 64. Lean, not a chase.",
    "totals": "Best O/U angle: over if the book hangs a low best-of-five number, because both recent hold profiles can extend sets.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": -3,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "Spread needs the posted number before grading.",
      "totalRead": "No total edge without posted number and first-set hold data.",
      "pick": {
        "name": "Arthur Rinderknech",
        "serviceHoldPct": 92,
        "firstServeWonPct": 81,
        "secondServeWonPct": 55,
        "firstServePct": 65,
        "avgAces": 12,
        "avgDoubleFaults": 3,
        "avgWinners": 33.7,
        "avgUnforcedErrors": 25.5,
        "avgBreakPointsFaced": 5,
        "returnPointsWonPct": 40,
        "servicePointsWonPct": 71,
        "weakServeMatches": 2,
        "pressureMatches": 4,
        "matchesWithStats": 6,
        "weaknessScore": 6,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "protects serve well (92% hold)",
          "wins enough first-serve points (81%)",
          "positive winner/error balance (33.7 winners, 25.5 unforced)"
        ],
        "gameFlowRead": "Arthur Rinderknech has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Matteo Berrettini",
        "serviceHoldPct": 79,
        "firstServeWonPct": 70,
        "secondServeWonPct": 51,
        "firstServePct": 62,
        "avgAces": 6,
        "avgDoubleFaults": 2.3,
        "avgWinners": 27.3,
        "avgUnforcedErrors": 29,
        "avgBreakPointsFaced": 7.7,
        "returnPointsWonPct": 34,
        "servicePointsWonPct": 64,
        "weakServeMatches": 0,
        "pressureMatches": 4,
        "matchesWithStats": 3,
        "weaknessScore": 3,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "limited return pressure (34% return points won)"
        ],
        "strengths": [
          "protects serve well (79% hold)",
          "wins enough first-serve points (70%)"
        ],
        "gameFlowRead": "Matteo Berrettini can drop points quickly through limited return pressure (34% return points won)."
      }
    },
    "setWinProjections": [
      {
        "name": "Arthur Rinderknech",
        "confidence": 86,
        "modelPct": 59,
        "label": "Strong set-win path"
      },
      {
        "name": "Matteo Berrettini",
        "confidence": 70,
        "modelPct": 41,
        "label": "Live to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Arthur Rinderknech",
        "americanOdds": -110,
        "modelPct": 59,
        "impliedPct": 52.4,
        "edgePct": 6.6,
        "evPer100": 12.6,
        "valueGrade": "Thin value",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Arthur Rinderknech",
        "line": -0.5,
        "americanOdds": -110,
        "modelPct": 53,
        "impliedPct": 52.4,
        "edgePct": 0.6,
        "evPer100": 1.2,
        "valueGrade": "Near fair",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 40.5,
        "americanOdds": -120,
        "modelPct": 51,
        "impliedPct": 54.5,
        "edgePct": -3.5,
        "evPer100": -6.5,
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Arthur Rinderknech",
          "confidence": 86,
          "modelPct": 59,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Matteo Berrettini",
          "confidence": 70,
          "modelPct": 41,
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
      "capturedAt": "2026-05-28T01:29:52.179Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/arthur-rinderknech-v-matteo-berrettini-35649678",
      "eventId": "35649678",
      "players": [
        {
          "name": "Arthur Rinderknech",
          "odds": -110,
          "americanLabel": "-110",
          "impliedPct": 52.4,
          "decimalOdds": 1.909,
          "modelPct": 59,
          "edgePct": 6.6,
          "priceBand": "Coinflip",
          "grossProfitPct": 90.9,
          "grossPayoutMultiple": 1.909,
          "centsAtRisk": 100,
          "centsProfitIfWin": 90.9
        },
        {
          "name": "Matteo Berrettini",
          "odds": -110,
          "americanLabel": "-110",
          "impliedPct": 52.4,
          "decimalOdds": 1.909,
          "modelPct": 41,
          "edgePct": -11.4,
          "priceBand": "Coinflip",
          "grossProfitPct": 90.9,
          "grossPayoutMultiple": 1.909,
          "centsAtRisk": 100,
          "centsProfitIfWin": 90.9
        }
      ],
      "desk": {
        "name": "Arthur Rinderknech",
        "odds": -110,
        "americanLabel": "-110",
        "impliedPct": 52.4,
        "decimalOdds": 1.909,
        "modelPct": 59,
        "edgePct": 6.6,
        "priceBand": "Coinflip",
        "grossProfitPct": 90.9,
        "grossPayoutMultiple": 1.909,
        "centsAtRisk": 100,
        "centsProfitIfWin": 90.9
      },
      "spread": {
        "marketLine": -0.5,
        "player": "Arthur Rinderknech",
        "spread": -0.5,
        "odds": -110
      },
      "total": {
        "line": 40.5,
        "side": "Over",
        "odds": -120
      },
      "totalOver": {
        "line": 40.5,
        "side": "Over",
        "odds": -120
      },
      "totalUnder": {
        "line": 40.5,
        "side": "Under",
        "odds": -110
      },
      "priceAction": "ML is close to fair; derivative or live entry needs to carry the edge.",
      "spreadValue": "Arthur Rinderknech -0.5 (-110)",
      "totalValue": "40.5 games: Over -120 / Under -110",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Over lean if both players hold early",
      "mlValue": "Arthur Rinderknech -110 / Matteo Berrettini -110",
      "marketNote": "FanDuel ML, game handicap, and total captured from sportsbook page. ML is close to fair; derivative or live entry needs to carry the edge.",
      "noVigNote": "Model 59% vs FanDuel implied 52.4% (+6.6 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Arthur-Rinderknech-Vs-Matteo-Berrettini/",
    "players": [
      {
        "name": "Arthur Rinderknech",
        "ranking": {
          "name": "Arthur Rinderknech",
          "rank": 22,
          "points": 1776,
          "age": 30.8,
          "country": "FRA",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Arthur Rinderknech",
        "profile": "Live rank #22 | FRA | age 30.8 | 2026 clay 6-5, 55% | adj form 61 | hold 92%",
        "modelPct": 59,
        "weakness": {
          "name": "Arthur Rinderknech",
          "serviceHoldPct": 92,
          "firstServeWonPct": 81,
          "secondServeWonPct": 55,
          "firstServePct": 65,
          "avgAces": 12,
          "avgDoubleFaults": 3,
          "avgWinners": 33.7,
          "avgUnforcedErrors": 25.5,
          "avgBreakPointsFaced": 5,
          "returnPointsWonPct": 40,
          "servicePointsWonPct": 71,
          "weakServeMatches": 2,
          "pressureMatches": 4,
          "matchesWithStats": 6,
          "weaknessScore": 6,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "protects serve well (92% hold)",
            "wins enough first-serve points (81%)",
            "positive winner/error balance (33.7 winners, 25.5 unforced)"
          ],
          "gameFlowRead": "Arthur Rinderknech has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Matteo Berrettini",
        "ranking": {
          "name": "Matteo Berrettini",
          "rank": 90,
          "points": 635,
          "age": 30.1,
          "country": "ITA",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "profileUrl": "https://live-tennis.eu/en/atp-live-ranking",
          "asOf": "2026-05-26",
          "liveRankSource": "https://live-tennis.eu/en/atp-live-ranking browser snapshot"
        },
        "qualityName": "Matteo Berrettini",
        "profile": "Live rank #90 | ITA | age 30.1 | 2026 clay 9-9, 50% | adj form 64 | hold 79%",
        "modelPct": 41,
        "weakness": {
          "name": "Matteo Berrettini",
          "serviceHoldPct": 79,
          "firstServeWonPct": 70,
          "secondServeWonPct": 51,
          "firstServePct": 62,
          "avgAces": 6,
          "avgDoubleFaults": 2.3,
          "avgWinners": 27.3,
          "avgUnforcedErrors": 29,
          "avgBreakPointsFaced": 7.7,
          "returnPointsWonPct": 34,
          "servicePointsWonPct": 64,
          "weakServeMatches": 0,
          "pressureMatches": 4,
          "matchesWithStats": 3,
          "weaknessScore": 3,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "limited return pressure (34% return points won)"
          ],
          "strengths": [
            "protects serve well (79% hold)",
            "wins enough first-serve points (70%)"
          ],
          "gameFlowRead": "Matteo Berrettini can drop points quickly through limited return pressure (34% return points won)."
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
      researchLinks: [{ label: 'ESPN scoreboard', url: 'https://www.espn.com/tennis/scoreboard/_/date/20260528' }, { label: 'Tennistonic H2H', url: raw.h2hUrl }, ...(market?.eventUrl ? [{ label: 'FanDuel event', url: market.eventUrl }] : [])],
      formEdgeName: raw.pickName
    },
    participants,
    moneyline: market ? { available: true, label: 'FanDuel moneyline', provider: market.source, participants } : { available: false, label: 'Moneyline', provider: 'Tennis warehouse model', participants: [] },
    analysis: { available: true, participantId: picked.id, participant: picked, opponent, lean: `Lean ${raw.pickName}`, rationale: raw.reason, confidence: raw.confidence, volatility: raw.volatility, recommendationScore: raw.confidence - Math.round(raw.volatility / 3) + Math.round(Math.max(-8, Math.min(8, deskMarket?.edgePct ?? 0))), tier: raw.tags.includes('High confidence')  ? 'High confidence' : raw.tags.includes('Lean') ? 'Lean' : 'Watch', sourceLabel: market?.source || 'Tennis warehouse model', modelEdge: deskMarket?.edgePct ?? 0, modelEdgeLabel: deskMarket ? `${deskMarket.edgePct > 0 ? '+' : ''}${deskMarket.edgePct} pts vs FanDuel implied` : 'Fair value only until market price is captured', marketProbability: deskMarket?.impliedPct ? deskMarket.impliedPct / 100 : null, marketProbabilityLabel: deskMarket?.impliedPct ? `${deskMarket.impliedPct}% FanDuel implied` : 'No market', inputs: [], inputsUsed: market ? 4 : 3, volatilityNotes: [] }
  }, { structuredAnalysis: true })
}

const matches = rawTennisGames.map(buildGame)

export const slateMeta = { title: 'Roland Garros May 28 Tennis Desk', date: 'May 28, 2026', isoDate: '2026-05-28', timeZone: 'America/Los_Angeles', subtitle: 'Singles-only Roland Garros Round 2 slate with weakness-edge, game-flow gates, and FanDuel ML/spread/total lines.', notes: ['No doubles included.', 'FanDuel ML, game handicap, and total-games lines are attached where the sportsbook board exposed a May 28 singles event.', 'May 28 uses live rank, clay record, opponent-adjusted recent form, and Flashscore recent service rows where joined.'] }
export const filters = ['All', 'Tennis']
export const oddsMeta = { provider: 'FanDuel Sportsbook + Tennis warehouse model', snapshot: 'May 28, 2026 Roland Garros desk', note: 'FanDuel lines are stored for priced matches; very expensive favorites are marked as low-payout or pass-first instead of automatic bets.' }
export const sources = [{ label: 'ESPN tennis scoreboard', url: 'https://www.espn.com/tennis/scoreboard/_/date/20260528' }, { label: 'Live Tennis rankings warehouse', url: 'https://live-tennis.eu/' }, { label: 'FanDuel sportsbook tennis', url: 'https://sportsbook.fanduel.com/tennis' }]
export const games = matches.sort((left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title))
