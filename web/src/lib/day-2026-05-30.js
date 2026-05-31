import { createSportsMatchModel } from './sports-model.js'
import tennisClayContext from './day-2026-05-30-tennis-clay-context.generated.json' with { type: 'json' }
import tennisOpponentQualityContext from './day-2026-05-30-tennis-opponent-quality.generated.json' with { type: 'json' }
import tennisWarehouseContext from './day-2026-05-30-tennis-warehouse-context.generated.json' with { type: 'json' }

const rawTennisGames = [
  {
    "id": "rg-m-francisco-cerundolo-zachary-svajda-2026-05-30",
    "eventId": "175715",
    "tour": "ATP",
    "title": "Francisco Cerundolo vs Zachary Svajda",
    "start": "2:05 AM",
    "startMinutes": 125,
    "court": "Court 14",
    "round": "Round 3",
    "pickName": "Francisco Cerundolo",
    "basePickName": "Francisco Cerundolo",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 62.2,
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
    "reason": "Francisco Cerundolo grades 26 points better on opponent-adjusted recent form. Lean, not a chase.",
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
        "name": "Francisco Cerundolo",
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
        "pressureMatches": 5,
        "matchesWithStats": 0,
        "weaknessScore": 3,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Francisco Cerundolo has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Zachary Svajda",
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
        "pressureMatches": 5,
        "matchesWithStats": 0,
        "weaknessScore": 3,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Zachary Svajda has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Francisco Cerundolo",
        "confidence": 87,
        "modelPct": 62.2,
        "label": "Strong set-win path"
      },
      {
        "name": "Zachary Svajda",
        "confidence": 67,
        "modelPct": 37.8,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Francisco Cerundolo",
        "americanOdds": -1450,
        "modelPct": 62.2,
        "impliedPct": 93.5,
        "edgePct": -31.3,
        "evPer100": -33.5,
        "netEvPer100": -35.5,
        "feePer100": 2,
        "valueIssue": "Favorite tax trap",
        "valueGrade": "Favorite tax trap",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Francisco Cerundolo",
        "line": -8.5,
        "americanOdds": 102,
        "modelPct": 52,
        "impliedPct": 49.5,
        "edgePct": 2.5,
        "evPer100": 5,
        "netEvPer100": 3,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Near fair",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 30.5,
        "americanOdds": -122,
        "expectedGames": 34.8,
        "modelPct": 66,
        "impliedPct": 55,
        "edgePct": 11,
        "evPer100": 20.1,
        "netEvPer100": 18.1,
        "feePer100": 2,
        "valueIssue": "Total watch only",
        "valueGrade": "Watch only",
        "reason": "Expected match games 34.8 vs FanDuel 30.5; Over. hold avg N/A, return games won N/A, first-set sample 8.8g, 42 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Over 9.5 if posted; pass if Cerundolo breaks before both players serve twice.",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 55,
        "tiebreakRisk": 0.12,
        "earlyBreakRisk": 0.45,
        "modelPct": 55,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Thin",
        "reason": "Over 9.5 if posted; pass if Cerundolo breaks before both players serve twice.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Francisco Cerundolo",
          "confidence": 87,
          "modelPct": 62.2,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Zachary Svajda",
          "confidence": 67,
          "modelPct": 37.8,
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
          "name": "Francisco Cerundolo",
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
          "weaknessScore": 3,
          "weakServeMatches": 0,
          "statMatches": 0,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 21,
            "firstSetSamples": 8,
            "avgFirstSetGames": 9.125,
            "avgSetGames": 9.380952380952381,
            "avgMatchGames": 24.625,
            "avgSetsPlayed": 2.625,
            "tiebreakRate": 0.14285714285714285,
            "extendedSetRate": 0.19047619047619047,
            "shortSetRate": 0.38095238095238093
          }
        },
        {
          "name": "Zachary Svajda",
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
          "weaknessScore": 3,
          "weakServeMatches": 0,
          "statMatches": 0,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 21,
            "firstSetSamples": 8,
            "avgFirstSetGames": 8.375,
            "avgSetGames": 9.619047619047619,
            "avgMatchGames": 25.25,
            "avgSetsPlayed": 2.625,
            "tiebreakRate": 0.23809523809523808,
            "extendedSetRate": 0.2857142857142857,
            "shortSetRate": 0.38095238095238093
          }
        }
      ],
      "expectedFirstSetGames": 8.9,
      "expectedMatchGames": 34.8,
      "signalStrength": 4,
      "holdAvg": null,
      "returnGamesAvg": null,
      "returnPointsAvg": null,
      "setSamples": 42,
      "firstSetSamples": 16,
      "avgFirstSetGames": 8.8,
      "avgSetGames": 9.5,
      "tiebreakRate": 19,
      "extendedSetRate": 23.8,
      "shortSetRate": 38.1,
      "reasonCore": "hold avg N/A, return games won N/A, first-set sample 8.8g, 42 recent sets"
    },
    "derivativeCase": {
      "date": "2026-05-30",
      "matchId": "rg-m-francisco-cerundolo-zachary-svajda-2026-05-30",
      "match": "Francisco Cerundolo vs Zachary Svajda",
      "start": "2:00 AM",
      "expectedMatchGames": 31.8,
      "expectedFirstSetGames": 9.8,
      "totalGames": {
        "postedLine": 30.5,
        "overOdds": -122,
        "underOdds": -110,
        "lean": "Over",
        "edgeGames": 1.3,
        "confidence": 56,
        "grade": "playable",
        "reason": "Cerundolo ML is badly taxed, but best-of-five plus Svajda set-win resistance makes the total more interesting than the winner price."
      },
      "gameHandicap": {
        "selection": "Zachary Svajda",
        "postedSpread": 8.5,
        "odds": -134,
        "projectedMarginGames": 7.2,
        "edgeGames": 1.3,
        "confidence": 56,
        "grade": "watch",
        "reason": "The favorite can win cleanly and still fail -8.5. Svajda needs only one 7-5/7-6 pocket or a 6-4 set to keep the handicap alive."
      },
      "firstSet": {
        "expectedGames": 9.8,
        "lean": "Over 9.5 if posted; pass if Cerundolo breaks before both players serve twice.",
        "tiebreakRisk": 0.12,
        "earlyBreakRisk": 0.45,
        "confidence": 55
      },
      "writeup": {
        "headline": "Francisco Cerundolo vs Zachary Svajda: derivative lane before ML.",
        "betPlan": "No blind bet; use the listed lane only at a good number.",
        "whyItWorks": [
          "The favorite can win cleanly and still fail -8.5. Svajda needs only one 7-5/7-6 pocket or a 6-4 set to keep the handicap alive.",
          null,
          "The matrix separates likely winner from the market that actually pays."
        ],
        "whyItFails": [
          "One-sided first-set breaks can wreck spread and total projections quickly.",
          "If early service games contradict the projected hold/return shape, downgrade before adding exposure."
        ],
        "entryExit": {
          "preMatch": "Over total edge +1.3 games; spread edge +1.3 games.",
          "live": "Over 9.5 if posted; pass if Cerundolo breaks before both players serve twice."
        }
      },
      "evidence": [
        "FanDuel total 30.5 captured.",
        "FanDuel handicap captured for Zachary Svajda.",
        "Model match confidence 63% with volatility 37%.",
        "Set-win projections: Francisco Cerundolo 87% / Zachary Svajda 66%."
      ],
      "dataQuality": {
        "fanDuelTotalCaptured": true,
        "fanDuelSpreadCaptured": true,
        "warehouseRowsUsed": 2,
        "replayRowsUsed": 0,
        "status": "complete"
      }
    },
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Francisco Cerundolo",
        "line": null,
        "americanOdds": -1450,
        "modelPct": 62.2,
        "impliedPct": 93.5,
        "edgePct": -31.3,
        "evPer100": -33.5,
        "netEvPer100": -35.5,
        "grade": "Favorite tax trap",
        "issue": "Favorite tax trap",
        "reason": "Likely winner can still be a bad ML bet after payout and fees. Check spread, total, and set-win instead."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Zachary Svajda",
        "line": 8.5,
        "americanOdds": -134,
        "modelPct": 52,
        "impliedPct": 49.5,
        "edgePct": 2.5,
        "evPer100": 5,
        "netEvPer100": 3,
        "expectedGames": 7.2,
        "edgeGames": 1.3,
        "confidence": 56,
        "grade": "watch",
        "reason": "The favorite can win cleanly and still fail -8.5. Svajda needs only one 7-5/7-6 pocket or a 6-4 set to keep the handicap alive."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "Over",
        "line": 30.5,
        "americanOdds": -122,
        "modelPct": 66,
        "impliedPct": 55,
        "edgePct": 11,
        "evPer100": 20.1,
        "netEvPer100": 18.1,
        "expectedGames": 31.8,
        "edgeGames": 1.3,
        "confidence": 56,
        "grade": "playable",
        "reason": "Cerundolo ML is badly taxed, but best-of-five plus Svajda set-win resistance makes the total more interesting than the winner price."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Francisco Cerundolo 87% / Zachary Svajda 67%",
        "rows": [
          {
            "name": "Francisco Cerundolo",
            "confidence": 87,
            "modelPct": 62.2,
            "label": "Strong set-win path"
          },
          {
            "name": "Zachary Svajda",
            "confidence": 67,
            "modelPct": 37.8,
            "label": "Needs early hold pressure"
          }
        ],
        "confidence": 87,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Over 9.5 if posted; pass if Cerundolo breaks before both players serve twice.",
        "expectedGames": 9.8,
        "confidence": 55,
        "tiebreakRisk": 0.12,
        "earlyBreakRisk": 0.45,
        "grade": "Thin",
        "reason": "Over 9.5 if posted; pass if Cerundolo breaks before both players serve twice."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Zachary Svajda",
      "opponent": "Francisco Cerundolo",
      "grade": "Outlier hold",
      "riskGate": "hold risk, closeout risk",
      "marketOdds": 809,
      "fairOdds": 164,
      "modelProbability": 37.8,
      "dataOnlyProbability": 44.7,
      "marketProbability": 11,
      "marketDisagreementPct": 26.8,
      "netEvPer100": 241.8,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Zachary Svajda is priced below the model, not guaranteed to win.",
      "useCase": "Straight ML value only at +809 or better; fair price from the ensemble is about +164.",
      "bullets": [],
      "risks": [
        "Desk lean still has Francisco Cerundolo; this is a price-dislocation play, not the safest winner.",
        "Market still prices Zachary Svajda as a real underdog at 11% implied."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page browser scrape",
      "capturedAt": "2026-05-30T04:26:27.278Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/francisco-cerundolo-v-zachary-svajda-35660507",
      "players": [
        {
          "name": "Francisco Cerundolo",
          "odds": -1450,
          "americanLabel": "-1450",
          "impliedPct": 93.5,
          "decimalOdds": 1.069,
          "modelPct": 62.2,
          "edgePct": -31.3,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 6.9,
          "grossPayoutMultiple": 1.069,
          "centsAtRisk": 100,
          "centsProfitIfWin": 6.9
        },
        {
          "name": "Zachary Svajda",
          "odds": 860,
          "americanLabel": "+860",
          "impliedPct": 10.4,
          "decimalOdds": 9.6,
          "modelPct": 37.8,
          "edgePct": 27.4,
          "priceBand": "Underdog",
          "grossProfitPct": 860,
          "grossPayoutMultiple": 9.6,
          "centsAtRisk": 100,
          "centsProfitIfWin": 860
        }
      ],
      "desk": {
        "name": "Francisco Cerundolo",
        "odds": -1450,
        "americanLabel": "-1450",
        "impliedPct": 93.5,
        "decimalOdds": 1.069,
        "modelPct": 62.2,
        "edgePct": -31.3,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 6.9,
        "grossPayoutMultiple": 1.069,
        "centsAtRisk": 100,
        "centsProfitIfWin": 6.9
      },
      "spread": {
        "player": "Francisco Cerundolo",
        "spread": -8.5,
        "odds": 102
      },
      "total": {
        "side": "Over",
        "line": 30.5,
        "odds": -122
      },
      "totalOver": {
        "side": "Over",
        "line": 30.5,
        "odds": -122
      },
      "totalUnder": {
        "side": "Under",
        "line": 30.5,
        "odds": -110
      },
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "Francisco Cerundolo -8.5 (+102)",
      "totalValue": "30.5 games: Over -122 / Under -110",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "Large game spread; ML may be cleaner than laying games",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Francisco Cerundolo -1450 / Zachary Svajda +860",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 62.2% vs FanDuel implied 93.5% (-31.3 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Francisco-Cerundolo-Vs-Zachary-Svajda/",
    "players": [
      {
        "name": "Francisco Cerundolo",
        "ranking": {
          "name": "Francisco Cerundolo",
          "rank": 26,
          "points": 1570,
          "age": 27,
          "country": "Argentina",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/3700/francisco-cerundolo",
          "asOf": "2026-05-31"
        },
        "qualityName": "Francisco Cerundolo",
        "profile": "Live rank #26 | Argentina | age 27 | 2026 clay 15-7, 68% | adj form 78",
        "modelPct": 62.2,
        "weakness": {
          "name": "Francisco Cerundolo",
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
          "pressureMatches": 5,
          "matchesWithStats": 0,
          "weaknessScore": 3,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Francisco Cerundolo has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Zachary Svajda",
        "ranking": {
          "name": "Zachary Svajda",
          "rank": 85,
          "points": 696,
          "age": 23,
          "country": "USA",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/3953/zachary-svajda",
          "asOf": "2026-05-31"
        },
        "qualityName": "Zachary Svajda",
        "profile": "Live rank #85 | USA | age 23 | 2026 clay 3-5, 38% | adj form 52",
        "modelPct": 37.8,
        "weakness": {
          "name": "Zachary Svajda",
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
          "pressureMatches": 5,
          "matchesWithStats": 0,
          "weaknessScore": 3,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Zachary Svajda has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-w-maria-sakkari-maja-chwalinska-2026-05-30",
    "eventId": "175527",
    "tour": "WTA",
    "title": "Maria Sakkari vs Maja Chwalinska",
    "start": "2:05 AM",
    "startMinutes": 125,
    "court": "Court Simonne-Mathieu",
    "round": "Round 3",
    "pickName": "Maja Chwalinska",
    "basePickName": "Maria Sakkari",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": true,
    "confidence": 64,
    "volatility": 52,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Lean",
      "Model split - pass ML",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Maria Sakkari grades 46 points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
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
        "name": "Maja Chwalinska",
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
        "pressureMatches": 3,
        "matchesWithStats": 0,
        "weaknessScore": 0,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Maja Chwalinska has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Maria Sakkari",
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
        "gameFlowRead": "Maria Sakkari has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Maria Sakkari",
        "confidence": 52,
        "modelPct": 36,
        "label": "Needs early hold pressure"
      },
      {
        "name": "Maja Chwalinska",
        "confidence": 77,
        "modelPct": 64,
        "label": "Live to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Maja Chwalinska",
        "americanOdds": -142,
        "modelPct": 64,
        "impliedPct": 58.7,
        "edgePct": 5.3,
        "evPer100": 9.1,
        "netEvPer100": 7.1,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Favorite price needs better proof",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Maja Chwalinska",
        "line": -1.5,
        "americanOdds": -120,
        "modelPct": 58,
        "impliedPct": 54.5,
        "edgePct": 3.5,
        "evPer100": 6.3,
        "netEvPer100": 4.3,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Raw positive EV",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "line": 21.5,
        "overOdds": -118,
        "underOdds": -112,
        "expectedGames": 22.2,
        "valueGrade": "No direction",
        "reason": "FanDuel total is 21.5; model did not clear a full-match over/under edge from hold, return, and set-shape data. hold avg N/A, return games won N/A, first-set sample 9.8g, 35 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Over 9.5 if plus price appears; pass after an early break with no response.",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.9,
        "confidence": 54,
        "tiebreakRisk": 0.1,
        "earlyBreakRisk": 0.47,
        "modelPct": 54,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Thin",
        "reason": "Over 9.5 if plus price appears; pass after an early break with no response.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Maria Sakkari",
          "confidence": 52,
          "modelPct": 36,
          "label": "Needs early hold pressure",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Maja Chwalinska",
          "confidence": 77,
          "modelPct": 64,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": {
      "profiles": [
        {
          "name": "Maria Sakkari",
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
          "weaknessScore": 2,
          "weakServeMatches": 0,
          "statMatches": 0,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 18,
            "firstSetSamples": 8,
            "avgFirstSetGames": 10.5,
            "avgSetGames": 9.777777777777779,
            "avgMatchGames": 22,
            "avgSetsPlayed": 2.25,
            "tiebreakRate": 0.16666666666666666,
            "extendedSetRate": 0.2777777777777778,
            "shortSetRate": 0.16666666666666666
          }
        },
        {
          "name": "Maja Chwalinska",
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
            "completedMatches": 8,
            "setSamples": 17,
            "firstSetSamples": 8,
            "avgFirstSetGames": 9.125,
            "avgSetGames": 8.823529411764707,
            "avgMatchGames": 18.75,
            "avgSetsPlayed": 2.125,
            "tiebreakRate": 0.058823529411764705,
            "extendedSetRate": 0.17647058823529413,
            "shortSetRate": 0.4117647058823529
          }
        }
      ],
      "expectedFirstSetGames": 9.9,
      "expectedMatchGames": 22.2,
      "signalStrength": 4,
      "holdAvg": null,
      "returnGamesAvg": null,
      "returnPointsAvg": null,
      "setSamples": 35,
      "firstSetSamples": 16,
      "avgFirstSetGames": 9.8,
      "avgSetGames": 9.3,
      "tiebreakRate": 11.3,
      "extendedSetRate": 22.7,
      "shortSetRate": 28.9,
      "reasonCore": "hold avg N/A, return games won N/A, first-set sample 9.8g, 35 recent sets"
    },
    "derivativeCase": {
      "date": "2026-05-30",
      "matchId": "rg-w-maria-sakkari-maja-chwalinska-2026-05-30",
      "match": "Maria Sakkari vs Maja Chwalinska",
      "start": "2:00 AM",
      "expectedMatchGames": 22.4,
      "expectedFirstSetGames": 9.9,
      "totalGames": {
        "postedLine": 21.5,
        "overOdds": -118,
        "underOdds": -112,
        "lean": "Over",
        "edgeGames": 0.9,
        "confidence": 55,
        "grade": "watch",
        "reason": "Sakkari is the data-side at plus money, but her recent volatility makes the cleaner read a longer match rather than a pure ML."
      },
      "gameHandicap": {
        "selection": "Maria Sakkari",
        "postedSpread": 1.5,
        "odds": -110,
        "projectedMarginGames": 0.6,
        "edgeGames": 2.1,
        "confidence": 57,
        "grade": "playable",
        "reason": "The model prefers Sakkari while the book gives her +1.5. That is a better expression than chasing the winner if confidence stays moderate."
      },
      "firstSet": {
        "expectedGames": 9.9,
        "lean": "Over 9.5 if plus price appears; pass after an early break with no response.",
        "tiebreakRisk": 0.1,
        "earlyBreakRisk": 0.47,
        "confidence": 54
      },
      "writeup": {
        "headline": "Maria Sakkari vs Maja Chwalinska: derivative lane before ML.",
        "betPlan": "Primary: Maria Sakkari spread if the posted number is still available.",
        "whyItWorks": [
          "The model prefers Sakkari while the book gives her +1.5. That is a better expression than chasing the winner if confidence stays moderate.",
          null,
          "The matrix separates likely winner from the market that actually pays."
        ],
        "whyItFails": [
          "One-sided first-set breaks can wreck spread and total projections quickly.",
          "If early service games contradict the projected hold/return shape, downgrade before adding exposure."
        ],
        "entryExit": {
          "preMatch": "Over total edge +0.9 games; spread edge +2.1 games.",
          "live": "Over 9.5 if plus price appears; pass after an early break with no response."
        }
      },
      "evidence": [
        "FanDuel total 21.5 captured.",
        "FanDuel handicap captured for Maria Sakkari.",
        "Model match confidence 56% with volatility 52%.",
        "Set-win projections: Maria Sakkari 73% / Maja Chwalinska 60%."
      ],
      "dataQuality": {
        "fanDuelTotalCaptured": true,
        "fanDuelSpreadCaptured": true,
        "warehouseRowsUsed": 2,
        "replayRowsUsed": 0,
        "status": "complete"
      }
    },
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Maja Chwalinska",
        "line": null,
        "americanOdds": -142,
        "modelPct": 64,
        "impliedPct": 58.7,
        "edgePct": 5.3,
        "evPer100": 9.1,
        "netEvPer100": 7.1,
        "grade": "Favorite price needs better proof",
        "issue": "Favorite price needs better proof",
        "reason": "ML is close to fair; derivative or live entry needs to carry the edge."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Maria Sakkari",
        "line": 1.5,
        "americanOdds": -110,
        "modelPct": 58,
        "impliedPct": 54.5,
        "edgePct": 3.5,
        "evPer100": 6.3,
        "netEvPer100": 4.3,
        "expectedGames": 0.6,
        "edgeGames": 2.1,
        "confidence": 57,
        "grade": "playable",
        "reason": "The model prefers Sakkari while the book gives her +1.5. That is a better expression than chasing the winner if confidence stays moderate."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "Over",
        "line": 21.5,
        "americanOdds": -118,
        "modelPct": 55,
        "impliedPct": null,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "expectedGames": 22.4,
        "edgeGames": 0.9,
        "confidence": 55,
        "grade": "watch",
        "reason": "Sakkari is the data-side at plus money, but her recent volatility makes the cleaner read a longer match rather than a pure ML."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Maria Sakkari 52% / Maja Chwalinska 77%",
        "rows": [
          {
            "name": "Maria Sakkari",
            "confidence": 52,
            "modelPct": 36,
            "label": "Needs early hold pressure"
          },
          {
            "name": "Maja Chwalinska",
            "confidence": 77,
            "modelPct": 64,
            "label": "Live to win a set"
          }
        ],
        "confidence": 77,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Over 9.5 if plus price appears; pass after an early break with no response.",
        "expectedGames": 9.9,
        "confidence": 54,
        "tiebreakRisk": 0.1,
        "earlyBreakRisk": 0.47,
        "grade": "Thin",
        "reason": "Over 9.5 if plus price appears; pass after an early break with no response."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Maja Chwalinska",
      "opponent": "Maria Sakkari",
      "grade": "Playable favorite",
      "riskGate": "closeout risk",
      "marketOdds": -142,
      "fairOdds": -178,
      "modelProbability": 64,
      "dataOnlyProbability": 67.3,
      "marketProbability": 58.7,
      "marketDisagreementPct": 5.3,
      "netEvPer100": 7.1,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Maja Chwalinska is priced below the model, not guaranteed to win.",
      "useCase": "Favorite price needs cleaner proof or derivative value; do not confuse win probability with bet value.",
      "bullets": [],
      "risks": [
        "Risk is mostly normal tennis variance; do not size this like a lock."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page browser scrape",
      "capturedAt": "2026-05-30T04:26:33.874Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/maria-sakkari-v-maja-chwalinska-35661307",
      "players": [
        {
          "name": "Maria Sakkari",
          "odds": 118,
          "americanLabel": "+118",
          "impliedPct": 45.9,
          "decimalOdds": 2.18,
          "modelPct": 36,
          "edgePct": -9.9,
          "priceBand": "Coinflip",
          "grossProfitPct": 118,
          "grossPayoutMultiple": 2.18,
          "centsAtRisk": 100,
          "centsProfitIfWin": 118
        },
        {
          "name": "Maja Chwalinska",
          "odds": -142,
          "americanLabel": "-142",
          "impliedPct": 58.7,
          "decimalOdds": 1.704,
          "modelPct": 64,
          "edgePct": 5.3,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 70.4,
          "grossPayoutMultiple": 1.704,
          "centsAtRisk": 100,
          "centsProfitIfWin": 70.4
        }
      ],
      "desk": {
        "name": "Maja Chwalinska",
        "odds": -142,
        "americanLabel": "-142",
        "impliedPct": 58.7,
        "decimalOdds": 1.704,
        "modelPct": 64,
        "edgePct": 5.3,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 70.4,
        "grossPayoutMultiple": 1.704,
        "centsAtRisk": 100,
        "centsProfitIfWin": 70.4
      },
      "spread": {
        "player": "Maja Chwalinska",
        "spread": -1.5,
        "odds": -120
      },
      "total": {
        "side": "Over",
        "line": 21.5,
        "odds": -118
      },
      "totalOver": {
        "side": "Over",
        "line": 21.5,
        "odds": -118
      },
      "totalUnder": {
        "side": "Under",
        "line": 21.5,
        "odds": -112
      },
      "priceAction": "ML is close to fair; derivative or live entry needs to carry the edge.",
      "spreadValue": "Maja Chwalinska -1.5 (-120)",
      "totalValue": "21.5 games: Over -118 / Under -112",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Maria Sakkari +118 / Maja Chwalinska -142",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. ML is close to fair; derivative or live entry needs to carry the edge.",
      "noVigNote": "Model 64% vs FanDuel implied 58.7% (+5.3 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Maria-Sakkari-Vs-Maja-Chwalinska/",
    "players": [
      {
        "name": "Maria Sakkari",
        "ranking": {
          "name": "Maria Sakkari",
          "rank": 49,
          "points": 1208,
          "age": 30,
          "country": "Greece",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/3018/maria-sakkari",
          "asOf": "2026-05-31"
        },
        "qualityName": "Maria Sakkari",
        "profile": "Live rank #49 | Greece | age 30 | 2026 clay 3-4, 43% | adj form 46",
        "modelPct": 36,
        "weakness": {
          "name": "Maria Sakkari",
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
          "gameFlowRead": "Maria Sakkari has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Maja Chwalinska",
        "ranking": {
          "name": "Maja Chwalinska",
          "rank": 114,
          "points": 693,
          "age": 24,
          "country": "Poland",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/3417/maja-chwalinska",
          "asOf": "2026-05-31"
        },
        "qualityName": "Maja Chwalinska",
        "profile": "Live rank #114 | Poland | age 24 | 2026 clay 15-5, 75% | adj form 0",
        "modelPct": 64,
        "weakness": {
          "name": "Maja Chwalinska",
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
          "pressureMatches": 3,
          "matchesWithStats": 0,
          "weaknessScore": 0,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Maja Chwalinska has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-w-iva-jovic-naomi-osaka-2026-05-30",
    "eventId": "175580",
    "tour": "WTA",
    "title": "Iva Jovic vs Naomi Osaka",
    "start": "2:10 AM",
    "startMinutes": 130,
    "court": "Court Suzanne-Lenglen",
    "round": "Round 3",
    "pickName": "Naomi Osaka",
    "basePickName": "Naomi Osaka",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 53.8,
    "volatility": 57,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Watch only",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Opponent-adjusted recent form is basically even: Naomi Osaka 78, Iva Jovic 76. Lean, not a chase.",
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
        "name": "Naomi Osaka",
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
        "gameFlowRead": "Naomi Osaka has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Iva Jovic",
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
        "gameFlowRead": "Iva Jovic has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Iva Jovic",
        "confidence": 63,
        "modelPct": 46.2,
        "label": "Needs early hold pressure"
      },
      {
        "name": "Naomi Osaka",
        "confidence": 72,
        "modelPct": 53.8,
        "label": "Live to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Naomi Osaka",
        "americanOdds": -118,
        "modelPct": 53.8,
        "impliedPct": 54.1,
        "edgePct": -0.3,
        "evPer100": -0.6,
        "netEvPer100": -2.6,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Near fair",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Naomi Osaka",
        "line": -0.5,
        "americanOdds": -118,
        "modelPct": 48,
        "impliedPct": 54.1,
        "edgePct": -6.1,
        "evPer100": -11.3,
        "netEvPer100": -13.3,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 22.5,
        "americanOdds": -106,
        "expectedGames": 24.2,
        "modelPct": 59,
        "impliedPct": 51.5,
        "edgePct": 7.5,
        "evPer100": 14.7,
        "netEvPer100": 12.7,
        "feePer100": 2,
        "valueIssue": "Total watch only",
        "valueGrade": "Watch only",
        "reason": "Expected match games 24.2 vs FanDuel 22.5; Over. hold avg N/A, return games won N/A, first-set sample 9.8g, 37 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Over 9.5 only if both first service games are comfortable.",
        "line": null,
        "americanOdds": null,
        "expectedGames": 10.1,
        "confidence": 53,
        "tiebreakRisk": 0.13,
        "earlyBreakRisk": 0.43,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Thin",
        "reason": "Over 9.5 only if both first service games are comfortable.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Iva Jovic",
          "confidence": 63,
          "modelPct": 46.2,
          "label": "Needs early hold pressure",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Naomi Osaka",
          "confidence": 72,
          "modelPct": 53.8,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": {
      "profiles": [
        {
          "name": "Iva Jovic",
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
          "weaknessScore": 2,
          "weakServeMatches": 0,
          "statMatches": 0,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 19,
            "firstSetSamples": 8,
            "avgFirstSetGames": 10.25,
            "avgSetGames": 9.526315789473685,
            "avgMatchGames": 22.625,
            "avgSetsPlayed": 2.375,
            "tiebreakRate": 0.10526315789473684,
            "extendedSetRate": 0.2631578947368421,
            "shortSetRate": 0.3684210526315789
          }
        },
        {
          "name": "Naomi Osaka",
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
          "weaknessScore": 2,
          "weakServeMatches": 0,
          "statMatches": 0,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 18,
            "firstSetSamples": 8,
            "avgFirstSetGames": 9.375,
            "avgSetGames": 9.444444444444445,
            "avgMatchGames": 21.25,
            "avgSetsPlayed": 2.25,
            "tiebreakRate": 0.16666666666666666,
            "extendedSetRate": 0.2222222222222222,
            "shortSetRate": 0.3888888888888889
          }
        }
      ],
      "expectedFirstSetGames": 10,
      "expectedMatchGames": 24.2,
      "signalStrength": 4,
      "holdAvg": null,
      "returnGamesAvg": null,
      "returnPointsAvg": null,
      "setSamples": 37,
      "firstSetSamples": 16,
      "avgFirstSetGames": 9.8,
      "avgSetGames": 9.5,
      "tiebreakRate": 13.6,
      "extendedSetRate": 24.3,
      "shortSetRate": 37.9,
      "reasonCore": "hold avg N/A, return games won N/A, first-set sample 9.8g, 37 recent sets"
    },
    "derivativeCase": {
      "date": "2026-05-30",
      "matchId": "rg-w-iva-jovic-naomi-osaka-2026-05-30",
      "match": "Iva Jovic vs Naomi Osaka",
      "start": "2:00 AM",
      "expectedMatchGames": 22.8,
      "expectedFirstSetGames": 10.1,
      "totalGames": {
        "postedLine": 22.5,
        "overOdds": -106,
        "underOdds": -128,
        "lean": "Over",
        "edgeGames": 0.3,
        "confidence": 52,
        "grade": "thin",
        "reason": "The ML is basically fair and both players have enough break volatility for a three-set path, but 22.5 leaves little margin."
      },
      "gameHandicap": {
        "selection": "Iva Jovic",
        "postedSpread": 0.5,
        "odds": -112,
        "projectedMarginGames": 0.2,
        "edgeGames": 0.7,
        "confidence": 53,
        "grade": "thin",
        "reason": "Osaka is the model lean, but -0.5 at a taxed price is not attractive. Jovic +0.5 is the better side if playing the close-match shape."
      },
      "firstSet": {
        "expectedGames": 10.1,
        "lean": "Over 9.5 only if both first service games are comfortable.",
        "tiebreakRisk": 0.13,
        "earlyBreakRisk": 0.43,
        "confidence": 53
      },
      "writeup": {
        "headline": "Iva Jovic vs Naomi Osaka: derivative lane before ML.",
        "betPlan": "No blind bet; use the listed lane only at a good number.",
        "whyItWorks": [
          "Osaka is the model lean, but -0.5 at a taxed price is not attractive. Jovic +0.5 is the better side if playing the close-match shape.",
          null,
          "The matrix separates likely winner from the market that actually pays."
        ],
        "whyItFails": [
          "One-sided first-set breaks can wreck spread and total projections quickly.",
          "If early service games contradict the projected hold/return shape, downgrade before adding exposure."
        ],
        "entryExit": {
          "preMatch": "Over total edge +0.3 games; spread edge +0.7 games.",
          "live": "Over 9.5 only if both first service games are comfortable."
        }
      },
      "evidence": [
        "FanDuel total 22.5 captured.",
        "FanDuel handicap captured for Iva Jovic.",
        "Model match confidence 52% with volatility 57%.",
        "Set-win projections: Iva Jovic 65% / Naomi Osaka 71%."
      ],
      "dataQuality": {
        "fanDuelTotalCaptured": true,
        "fanDuelSpreadCaptured": true,
        "warehouseRowsUsed": 2,
        "replayRowsUsed": 0,
        "status": "complete"
      }
    },
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Naomi Osaka",
        "line": null,
        "americanOdds": -118,
        "modelPct": 53.8,
        "impliedPct": 54.1,
        "edgePct": -0.3,
        "evPer100": -0.6,
        "netEvPer100": -2.6,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "ML is close to fair; derivative or live entry needs to carry the edge."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Iva Jovic",
        "line": 0.5,
        "americanOdds": -112,
        "modelPct": 48,
        "impliedPct": 54.1,
        "edgePct": -6.1,
        "evPer100": -11.3,
        "netEvPer100": -13.3,
        "expectedGames": 0.2,
        "edgeGames": 0.7,
        "confidence": 53,
        "grade": "thin",
        "reason": "Osaka is the model lean, but -0.5 at a taxed price is not attractive. Jovic +0.5 is the better side if playing the close-match shape."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "Over",
        "line": 22.5,
        "americanOdds": -106,
        "modelPct": 59,
        "impliedPct": 51.5,
        "edgePct": 7.5,
        "evPer100": 14.7,
        "netEvPer100": 12.7,
        "expectedGames": 22.8,
        "edgeGames": 0.3,
        "confidence": 52,
        "grade": "thin",
        "reason": "The ML is basically fair and both players have enough break volatility for a three-set path, but 22.5 leaves little margin."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Iva Jovic 63% / Naomi Osaka 72%",
        "rows": [
          {
            "name": "Iva Jovic",
            "confidence": 63,
            "modelPct": 46.2,
            "label": "Needs early hold pressure"
          },
          {
            "name": "Naomi Osaka",
            "confidence": 72,
            "modelPct": 53.8,
            "label": "Live to win a set"
          }
        ],
        "confidence": 72,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Over 9.5 only if both first service games are comfortable.",
        "expectedGames": 10.1,
        "confidence": 53,
        "tiebreakRisk": 0.13,
        "earlyBreakRisk": 0.43,
        "grade": "Thin",
        "reason": "Over 9.5 only if both first service games are comfortable."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Naomi Osaka",
      "opponent": "Iva Jovic",
      "grade": "Negative EV",
      "riskGate": "hold risk, closeout risk, opponent return pressure",
      "marketOdds": -118,
      "fairOdds": -117,
      "modelProbability": 53.8,
      "dataOnlyProbability": 55.9,
      "marketProbability": 54.1,
      "marketDisagreementPct": 0.3,
      "netEvPer100": -2.5,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Naomi Osaka does not clear a fee-adjusted value case.",
      "useCase": "Favorite price needs cleaner proof or derivative value; do not confuse win probability with bet value.",
      "bullets": [],
      "risks": [
        "Risk is mostly normal tennis variance; do not size this like a lock."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page browser scrape",
      "capturedAt": "2026-05-30T04:26:30.840Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/iva-jovic-v-naomi-osaka-35660141",
      "players": [
        {
          "name": "Iva Jovic",
          "odds": 100,
          "americanLabel": "+100",
          "impliedPct": 50,
          "decimalOdds": 2,
          "modelPct": 46.2,
          "edgePct": -3.8,
          "priceBand": "Coinflip",
          "grossProfitPct": 100,
          "grossPayoutMultiple": 2,
          "centsAtRisk": 100,
          "centsProfitIfWin": 100
        },
        {
          "name": "Naomi Osaka",
          "odds": -118,
          "americanLabel": "-118",
          "impliedPct": 54.1,
          "decimalOdds": 1.847,
          "modelPct": 53.8,
          "edgePct": -0.3,
          "priceBand": "Coinflip",
          "grossProfitPct": 84.7,
          "grossPayoutMultiple": 1.847,
          "centsAtRisk": 100,
          "centsProfitIfWin": 84.7
        }
      ],
      "desk": {
        "name": "Naomi Osaka",
        "odds": -118,
        "americanLabel": "-118",
        "impliedPct": 54.1,
        "decimalOdds": 1.847,
        "modelPct": 53.8,
        "edgePct": -0.3,
        "priceBand": "Coinflip",
        "grossProfitPct": 84.7,
        "grossPayoutMultiple": 1.847,
        "centsAtRisk": 100,
        "centsProfitIfWin": 84.7
      },
      "spread": {
        "player": "Naomi Osaka",
        "spread": -0.5,
        "odds": -118
      },
      "total": {
        "side": "Over",
        "line": 22.5,
        "odds": -106
      },
      "totalOver": {
        "side": "Over",
        "line": 22.5,
        "odds": -106
      },
      "totalUnder": {
        "side": "Under",
        "line": 22.5,
        "odds": -128
      },
      "priceAction": "ML is close to fair; derivative or live entry needs to carry the edge.",
      "spreadValue": "Naomi Osaka -0.5 (-118)",
      "totalValue": "22.5 games: Over -106 / Under -128",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Iva Jovic +100 / Naomi Osaka -118",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. ML is close to fair; derivative or live entry needs to carry the edge.",
      "noVigNote": "Model 53.8% vs FanDuel implied 54.1% (-0.3 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Iva-Jovic-Vs-Naomi-Osaka/",
    "players": [
      {
        "name": "Iva Jovic",
        "ranking": {
          "name": "Iva Jovic",
          "rank": 17,
          "points": 2306,
          "age": 18,
          "country": "USA",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/14311/iva-jovic",
          "asOf": "2026-05-31"
        },
        "qualityName": "Iva Jovic",
        "profile": "Live rank #17 | USA | age 18 | 2026 clay 8-6, 57% | adj form 76",
        "modelPct": 46.2,
        "weakness": {
          "name": "Iva Jovic",
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
          "gameFlowRead": "Iva Jovic has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Naomi Osaka",
        "ranking": {
          "name": "Naomi Osaka",
          "rank": 16,
          "points": 2341,
          "age": 28,
          "country": "Japan",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/2789/naomi-osaka",
          "asOf": "2026-05-31"
        },
        "qualityName": "Naomi Osaka",
        "profile": "Live rank #16 | Japan | age 28 | 2026 clay 6-2, 75% | adj form 78",
        "modelPct": 53.8,
        "weakness": {
          "name": "Naomi Osaka",
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
          "gameFlowRead": "Naomi Osaka has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-w-diana-shnaider-oleksandra-oliynykova-2026-05-30",
    "eventId": "175578",
    "tour": "WTA",
    "title": "Diana Shnaider vs Oleksandra Oliynykova",
    "start": "3:05 AM",
    "startMinutes": 185,
    "court": "Court 7",
    "round": "Round 3",
    "pickName": "Diana Shnaider",
    "basePickName": "Diana Shnaider",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 55.4,
    "volatility": 56,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Watch only",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Oleksandra Oliynykova grades 8 points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": -2,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Diana Shnaider",
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
        "gameFlowRead": "Diana Shnaider has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Oleksandra Oliynykova",
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
        "gameFlowRead": "Oleksandra Oliynykova has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Diana Shnaider",
        "confidence": 73,
        "modelPct": 55.4,
        "label": "Live to win a set"
      },
      {
        "name": "Oleksandra Oliynykova",
        "confidence": 61,
        "modelPct": 44.6,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Diana Shnaider",
        "americanOdds": -300,
        "modelPct": 55.4,
        "impliedPct": 75,
        "edgePct": -19.6,
        "evPer100": -26.1,
        "netEvPer100": -28.1,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Diana Shnaider",
        "line": -4.5,
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
        "selection": "Over",
        "line": 20.5,
        "americanOdds": -118,
        "expectedGames": 22.3,
        "modelPct": 59,
        "impliedPct": 54.1,
        "edgePct": 4.9,
        "evPer100": 9,
        "netEvPer100": 7,
        "feePer100": 2,
        "valueIssue": "Total watch only",
        "valueGrade": "Raw positive EV",
        "reason": "Expected match games 22.3 vs FanDuel 20.5; Over. hold avg N/A, return games won N/A, first-set sample 8.8g, 33 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Over 9.5 if Oliynykova holds once without facing multiple break points.",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 54,
        "tiebreakRisk": 0.09,
        "earlyBreakRisk": 0.51,
        "modelPct": 54,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Thin",
        "reason": "Over 9.5 if Oliynykova holds once without facing multiple break points.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Diana Shnaider",
          "confidence": 73,
          "modelPct": 55.4,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Oleksandra Oliynykova",
          "confidence": 61,
          "modelPct": 44.6,
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
          "name": "Diana Shnaider",
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
          "weaknessScore": 2,
          "weakServeMatches": 0,
          "statMatches": 0,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 18,
            "firstSetSamples": 8,
            "avgFirstSetGames": 9.625,
            "avgSetGames": 9,
            "avgMatchGames": 20.25,
            "avgSetsPlayed": 2.25,
            "tiebreakRate": 0.1111111111111111,
            "extendedSetRate": 0.2222222222222222,
            "shortSetRate": 0.5
          }
        },
        {
          "name": "Oleksandra Oliynykova",
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
            "completedMatches": 7,
            "setSamples": 15,
            "firstSetSamples": 7,
            "avgFirstSetGames": 8,
            "avgSetGames": 8.733333333333333,
            "avgMatchGames": 18.714285714285715,
            "avgSetsPlayed": 2.142857142857143,
            "tiebreakRate": 0.06666666666666667,
            "extendedSetRate": 0.13333333333333333,
            "shortSetRate": 0.4666666666666667
          }
        }
      ],
      "expectedFirstSetGames": 8.8,
      "expectedMatchGames": 22.3,
      "signalStrength": 4,
      "holdAvg": null,
      "returnGamesAvg": null,
      "returnPointsAvg": null,
      "setSamples": 33,
      "firstSetSamples": 15,
      "avgFirstSetGames": 8.8,
      "avgSetGames": 8.9,
      "tiebreakRate": 8.9,
      "extendedSetRate": 17.8,
      "shortSetRate": 48.3,
      "reasonCore": "hold avg N/A, return games won N/A, first-set sample 8.8g, 33 recent sets"
    },
    "derivativeCase": {
      "date": "2026-05-30",
      "matchId": "rg-w-diana-shnaider-oleksandra-oliynykova-2026-05-30",
      "match": "Diana Shnaider vs Oleksandra Oliynykova",
      "start": "3:00 AM",
      "expectedMatchGames": 21.7,
      "expectedFirstSetGames": 9.8,
      "totalGames": {
        "postedLine": 20.5,
        "overOdds": -118,
        "underOdds": -112,
        "lean": "Over",
        "edgeGames": 1.2,
        "confidence": 56,
        "grade": "watch",
        "reason": "Shnaider is overpriced on ML. Oliynykova has enough game-winning path to push this past a short WTA total."
      },
      "gameHandicap": {
        "selection": "Oleksandra Oliynykova",
        "postedSpread": 4.5,
        "odds": -120,
        "projectedMarginGames": 2.7,
        "edgeGames": 1.8,
        "confidence": 57,
        "grade": "playable",
        "reason": "The dog does not need to win; she needs to avoid a straight-sets collapse. The model-market gap supports taking games over ML."
      },
      "firstSet": {
        "expectedGames": 9.8,
        "lean": "Over 9.5 if Oliynykova holds once without facing multiple break points.",
        "tiebreakRisk": 0.09,
        "earlyBreakRisk": 0.51,
        "confidence": 54
      },
      "writeup": {
        "headline": "Diana Shnaider vs Oleksandra Oliynykova: derivative lane before ML.",
        "betPlan": "Primary: Oleksandra Oliynykova spread if the posted number is still available.",
        "whyItWorks": [
          "The dog does not need to win; she needs to avoid a straight-sets collapse. The model-market gap supports taking games over ML.",
          null,
          "The matrix separates likely winner from the market that actually pays."
        ],
        "whyItFails": [
          "One-sided first-set breaks can wreck spread and total projections quickly.",
          "If early service games contradict the projected hold/return shape, downgrade before adding exposure."
        ],
        "entryExit": {
          "preMatch": "Over total edge +1.2 games; spread edge +1.8 games.",
          "live": "Over 9.5 if Oliynykova holds once without facing multiple break points."
        }
      },
      "evidence": [
        "FanDuel total 20.5 captured.",
        "FanDuel handicap captured for Oleksandra Oliynykova.",
        "Model match confidence 53% with volatility 56%.",
        "Set-win projections: Diana Shnaider 71% / Oleksandra Oliynykova 64%."
      ],
      "dataQuality": {
        "fanDuelTotalCaptured": true,
        "fanDuelSpreadCaptured": true,
        "warehouseRowsUsed": 2,
        "replayRowsUsed": 0,
        "status": "complete"
      }
    },
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Diana Shnaider",
        "line": null,
        "americanOdds": -300,
        "modelPct": 55.4,
        "impliedPct": 75,
        "edgePct": -19.6,
        "evPer100": -26.1,
        "netEvPer100": -28.1,
        "grade": "Negative EV",
        "issue": "Favorite price needs better proof",
        "reason": "Favorite price has limited payout; require a strong weakness edge or use spread/total."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Oleksandra Oliynykova",
        "line": 4.5,
        "americanOdds": -120,
        "modelPct": 49,
        "impliedPct": 52.4,
        "edgePct": -3.4,
        "evPer100": -6.5,
        "netEvPer100": -8.5,
        "expectedGames": 2.7,
        "edgeGames": 1.8,
        "confidence": 57,
        "grade": "playable",
        "reason": "The dog does not need to win; she needs to avoid a straight-sets collapse. The model-market gap supports taking games over ML."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "Over",
        "line": 20.5,
        "americanOdds": -118,
        "modelPct": 59,
        "impliedPct": 54.1,
        "edgePct": 4.9,
        "evPer100": 9,
        "netEvPer100": 7,
        "expectedGames": 21.7,
        "edgeGames": 1.2,
        "confidence": 56,
        "grade": "watch",
        "reason": "Shnaider is overpriced on ML. Oliynykova has enough game-winning path to push this past a short WTA total."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Diana Shnaider 73% / Oleksandra Oliynykova 61%",
        "rows": [
          {
            "name": "Diana Shnaider",
            "confidence": 73,
            "modelPct": 55.4,
            "label": "Live to win a set"
          },
          {
            "name": "Oleksandra Oliynykova",
            "confidence": 61,
            "modelPct": 44.6,
            "label": "Needs early hold pressure"
          }
        ],
        "confidence": 73,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Over 9.5 if Oliynykova holds once without facing multiple break points.",
        "expectedGames": 9.8,
        "confidence": 54,
        "tiebreakRisk": 0.09,
        "earlyBreakRisk": 0.51,
        "grade": "Thin",
        "reason": "Over 9.5 if Oliynykova holds once without facing multiple break points."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Oleksandra Oliynykova",
      "opponent": "Diana Shnaider",
      "grade": "Watch only",
      "riskGate": "hold risk, closeout risk",
      "marketOdds": 255,
      "fairOdds": 124,
      "modelProbability": 44.6,
      "dataOnlyProbability": 49.1,
      "marketProbability": 28.2,
      "marketDisagreementPct": 16.4,
      "netEvPer100": 56.2,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Oleksandra Oliynykova is priced below the model, not guaranteed to win.",
      "useCase": "Straight ML value only at +255 or better; fair price from the ensemble is about +124.",
      "bullets": [],
      "risks": [
        "Desk lean still has Diana Shnaider; this is a price-dislocation play, not the safest winner.",
        "Market still prices Oleksandra Oliynykova as a real underdog at 28.2% implied."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page browser scrape",
      "capturedAt": "2026-05-30T04:26:37.489Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/diana-shnaider-v-oleksandra-oliynykova-35660290",
      "players": [
        {
          "name": "Diana Shnaider",
          "odds": -300,
          "americanLabel": "-300",
          "impliedPct": 75,
          "decimalOdds": 1.333,
          "modelPct": 55.4,
          "edgePct": -19.6,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 33.3,
          "grossPayoutMultiple": 1.333,
          "centsAtRisk": 100,
          "centsProfitIfWin": 33.3
        },
        {
          "name": "Oleksandra Oliynykova",
          "odds": 235,
          "americanLabel": "+235",
          "impliedPct": 29.9,
          "decimalOdds": 3.35,
          "modelPct": 44.6,
          "edgePct": 14.7,
          "priceBand": "Underdog",
          "grossProfitPct": 235,
          "grossPayoutMultiple": 3.35,
          "centsAtRisk": 100,
          "centsProfitIfWin": 235
        }
      ],
      "desk": {
        "name": "Diana Shnaider",
        "odds": -300,
        "americanLabel": "-300",
        "impliedPct": 75,
        "decimalOdds": 1.333,
        "modelPct": 55.4,
        "edgePct": -19.6,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 33.3,
        "grossPayoutMultiple": 1.333,
        "centsAtRisk": 100,
        "centsProfitIfWin": 33.3
      },
      "spread": {
        "player": "Diana Shnaider",
        "spread": -4.5,
        "odds": -110
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
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "Diana Shnaider -4.5 (-110)",
      "totalValue": "20.5 games: Over -118 / Under -112",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Diana Shnaider -300 / Oleksandra Oliynykova +235",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 55.4% vs FanDuel implied 75% (-19.6 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Diana-Shnaider-Vs-Oleksandra-Oliynykova/",
    "players": [
      {
        "name": "Diana Shnaider",
        "ranking": {
          "name": "Diana Shnaider",
          "rank": 23,
          "points": 1796,
          "age": 22,
          "country": "Russia",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/8017/diana-shnaider",
          "asOf": "2026-05-31"
        },
        "qualityName": "Diana Shnaider",
        "profile": "Live rank #23 | Russia | age 22 | 2026 clay 7-4, 64% | adj form 67",
        "modelPct": 55.4,
        "weakness": {
          "name": "Diana Shnaider",
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
          "gameFlowRead": "Diana Shnaider has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Oleksandra Oliynykova",
        "ranking": {
          "name": "Oleksandra Oliynykova",
          "rank": 65,
          "points": 1005,
          "age": 25,
          "country": "Ukraine",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/5705/oleksandra-oliynykova",
          "asOf": "2026-05-31"
        },
        "qualityName": "Oleksandra Oliynykova",
        "profile": "Live rank #65 | Ukraine | age 25 | 2026 clay 14-7, 67% | adj form 75",
        "modelPct": 44.6,
        "weakness": {
          "name": "Oleksandra Oliynykova",
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
          "gameFlowRead": "Oleksandra Oliynykova has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-m-flavio-cobolli-learner-tien-2026-05-30",
    "eventId": "175712",
    "tour": "ATP",
    "title": "Flavio Cobolli vs Learner Tien",
    "start": "3:05 AM",
    "startMinutes": 185,
    "court": "Court Philippe-Chatrier",
    "round": "Round 3",
    "pickName": "Learner Tien",
    "basePickName": "Learner Tien",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 52.9,
    "volatility": 46,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Watch only",
      "Positive price edge",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Learner Tien grades 33 points better on opponent-adjusted recent form. Lean, not a chase.",
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
        "name": "Learner Tien",
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
        "pressureMatches": 7,
        "matchesWithStats": 0,
        "weaknessScore": 6,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Learner Tien has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
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
        "pressureMatches": 4,
        "matchesWithStats": 0,
        "weaknessScore": 2,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Flavio Cobolli has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Flavio Cobolli",
        "confidence": 76,
        "modelPct": 47.1,
        "label": "Live to win a set"
      },
      {
        "name": "Learner Tien",
        "confidence": 84,
        "modelPct": 52.9,
        "label": "Strong set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Learner Tien",
        "americanOdds": 164,
        "modelPct": 52.9,
        "impliedPct": 37.9,
        "edgePct": 15,
        "evPer100": 39.7,
        "netEvPer100": 37.7,
        "feePer100": 2,
        "valueIssue": "Validated ML candidate",
        "valueGrade": "Bet-grade value",
        "betGrade": true
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Learner Tien",
        "line": 3.5,
        "americanOdds": 104,
        "modelPct": 47,
        "impliedPct": 49,
        "edgePct": -2,
        "evPer100": -4.1,
        "netEvPer100": -6.1,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "line": 37.5,
        "overOdds": -118,
        "underOdds": -112,
        "expectedGames": 37.5,
        "valueGrade": "No direction",
        "reason": "FanDuel total is 37.5; model did not clear a full-match over/under edge from hold, return, and set-shape data. hold avg N/A, return games won N/A, first-set sample 9.3g, 44 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Over 9.5; tiebreak/7-5 path is live unless Cobolli gets immediate return pressure.",
        "line": null,
        "americanOdds": null,
        "expectedGames": 10.3,
        "confidence": 58,
        "tiebreakRisk": 0.18,
        "earlyBreakRisk": 0.37,
        "modelPct": 58,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Actionable live watch",
        "reason": "Over 9.5; tiebreak/7-5 path is live unless Cobolli gets immediate return pressure.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Flavio Cobolli",
          "confidence": 76,
          "modelPct": 47.1,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Learner Tien",
          "confidence": 84,
          "modelPct": 52.9,
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
          "name": "Flavio Cobolli",
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
          "weaknessScore": 2,
          "weakServeMatches": 0,
          "statMatches": 0,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 19,
            "firstSetSamples": 8,
            "avgFirstSetGames": 9.375,
            "avgSetGames": 9.894736842105264,
            "avgMatchGames": 23.5,
            "avgSetsPlayed": 2.375,
            "tiebreakRate": 0.10526315789473684,
            "extendedSetRate": 0.21052631578947367,
            "shortSetRate": 0.15789473684210525
          }
        },
        {
          "name": "Learner Tien",
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
          "weaknessScore": 6,
          "weakServeMatches": 0,
          "statMatches": 0,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 25,
            "firstSetSamples": 8,
            "avgFirstSetGames": 9.25,
            "avgSetGames": 9.64,
            "avgMatchGames": 30.125,
            "avgSetsPlayed": 3.125,
            "tiebreakRate": 0.16,
            "extendedSetRate": 0.28,
            "shortSetRate": 0.28
          }
        }
      ],
      "expectedFirstSetGames": 9.6,
      "expectedMatchGames": 37.5,
      "signalStrength": 4,
      "holdAvg": null,
      "returnGamesAvg": null,
      "returnPointsAvg": null,
      "setSamples": 44,
      "firstSetSamples": 16,
      "avgFirstSetGames": 9.3,
      "avgSetGames": 9.8,
      "tiebreakRate": 13.3,
      "extendedSetRate": 24.5,
      "shortSetRate": 21.9,
      "reasonCore": "hold avg N/A, return games won N/A, first-set sample 9.3g, 44 recent sets"
    },
    "derivativeCase": {
      "date": "2026-05-30",
      "matchId": "rg-m-flavio-cobolli-learner-tien-2026-05-30",
      "match": "Flavio Cobolli vs Learner Tien",
      "start": "3:00 AM",
      "expectedMatchGames": 40.2,
      "expectedFirstSetGames": 10.3,
      "totalGames": {
        "postedLine": 37.5,
        "overOdds": -118,
        "underOdds": -112,
        "lean": "Over",
        "edgeGames": 2.7,
        "confidence": 59,
        "grade": "playable",
        "reason": "The model liked Tien more than market, but the better pre-match expression is extension: best-of-five, close pricing gap, and Tien set-win path."
      },
      "gameHandicap": {
        "selection": "Learner Tien",
        "postedSpread": 3.5,
        "odds": 104,
        "projectedMarginGames": 1.7,
        "edgeGames": 1.8,
        "confidence": 57,
        "grade": "playable",
        "reason": "Tien +3.5 aligns with the model disagreement and avoids needing him to finish the upset."
      },
      "firstSet": {
        "expectedGames": 10.3,
        "lean": "Over 9.5; tiebreak/7-5 path is live unless Cobolli gets immediate return pressure.",
        "tiebreakRisk": 0.18,
        "earlyBreakRisk": 0.37,
        "confidence": 58
      },
      "writeup": {
        "headline": "Flavio Cobolli vs Learner Tien: derivative lane before ML.",
        "betPlan": "Primary: Learner Tien spread if the posted number is still available.",
        "whyItWorks": [
          "Tien +3.5 aligns with the model disagreement and avoids needing him to finish the upset.",
          null,
          "The matrix separates likely winner from the market that actually pays."
        ],
        "whyItFails": [
          "One-sided first-set breaks can wreck spread and total projections quickly.",
          "If early service games contradict the projected hold/return shape, downgrade before adding exposure."
        ],
        "entryExit": {
          "preMatch": "Over total edge +2.7 games; spread edge +1.8 games.",
          "live": "Over 9.5; tiebreak/7-5 path is live unless Cobolli gets immediate return pressure."
        }
      },
      "evidence": [
        "FanDuel total 37.5 captured.",
        "FanDuel handicap captured for Learner Tien.",
        "Model match confidence 54% with volatility 46%.",
        "Set-win projections: Flavio Cobolli 75% / Learner Tien 84%."
      ],
      "dataQuality": {
        "fanDuelTotalCaptured": true,
        "fanDuelSpreadCaptured": true,
        "warehouseRowsUsed": 2,
        "replayRowsUsed": 0,
        "status": "complete"
      }
    },
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Learner Tien",
        "line": null,
        "americanOdds": 164,
        "modelPct": 52.9,
        "impliedPct": 37.9,
        "edgePct": 15,
        "evPer100": 39.7,
        "netEvPer100": 37.7,
        "grade": "Bet-grade value",
        "issue": "Validated ML candidate",
        "reason": "Model is meaningfully above FanDuel implied price."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Learner Tien",
        "line": 3.5,
        "americanOdds": 104,
        "modelPct": 47,
        "impliedPct": 49,
        "edgePct": -2,
        "evPer100": -4.1,
        "netEvPer100": -6.1,
        "expectedGames": 1.7,
        "edgeGames": 1.8,
        "confidence": 57,
        "grade": "playable",
        "reason": "Tien +3.5 aligns with the model disagreement and avoids needing him to finish the upset."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "Over",
        "line": 37.5,
        "americanOdds": -118,
        "modelPct": 59,
        "impliedPct": null,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "expectedGames": 40.2,
        "edgeGames": 2.7,
        "confidence": 59,
        "grade": "playable",
        "reason": "The model liked Tien more than market, but the better pre-match expression is extension: best-of-five, close pricing gap, and Tien set-win path."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Flavio Cobolli 76% / Learner Tien 84%",
        "rows": [
          {
            "name": "Flavio Cobolli",
            "confidence": 76,
            "modelPct": 47.1,
            "label": "Live to win a set"
          },
          {
            "name": "Learner Tien",
            "confidence": 84,
            "modelPct": 52.9,
            "label": "Strong set-win path"
          }
        ],
        "confidence": 84,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Over 9.5; tiebreak/7-5 path is live unless Cobolli gets immediate return pressure.",
        "expectedGames": 10.3,
        "confidence": 58,
        "tiebreakRisk": 0.18,
        "earlyBreakRisk": 0.37,
        "grade": "Actionable live watch",
        "reason": "Over 9.5; tiebreak/7-5 path is live unless Cobolli gets immediate return pressure."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Learner Tien",
      "opponent": "Flavio Cobolli",
      "grade": "Bet-grade ML",
      "riskGate": "clean enough",
      "marketOdds": 164,
      "fairOdds": -112,
      "modelProbability": 52.9,
      "dataOnlyProbability": 57.2,
      "marketProbability": 37.9,
      "marketDisagreementPct": 15,
      "netEvPer100": 37.6,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Learner Tien is priced below the model, not guaranteed to win.",
      "useCase": "Straight ML value only at +164 or better; fair price from the ensemble is about -112.",
      "bullets": [],
      "risks": [
        "Risk is mostly normal tennis variance; do not size this like a lock."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page browser scrape",
      "capturedAt": "2026-05-30T04:26:41.075Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/flavio-cobolli-v-learner-tien-35660296",
      "players": [
        {
          "name": "Flavio Cobolli",
          "odds": -200,
          "americanLabel": "-200",
          "impliedPct": 66.7,
          "decimalOdds": 1.5,
          "modelPct": 47.1,
          "edgePct": -19.6,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 50,
          "grossPayoutMultiple": 1.5,
          "centsAtRisk": 100,
          "centsProfitIfWin": 50
        },
        {
          "name": "Learner Tien",
          "odds": 164,
          "americanLabel": "+164",
          "impliedPct": 37.9,
          "decimalOdds": 2.64,
          "modelPct": 52.9,
          "edgePct": 15,
          "priceBand": "Underdog",
          "grossProfitPct": 164,
          "grossPayoutMultiple": 2.64,
          "centsAtRisk": 100,
          "centsProfitIfWin": 164
        }
      ],
      "desk": {
        "name": "Learner Tien",
        "odds": 164,
        "americanLabel": "+164",
        "impliedPct": 37.9,
        "decimalOdds": 2.64,
        "modelPct": 52.9,
        "edgePct": 15,
        "priceBand": "Underdog",
        "grossProfitPct": 164,
        "grossPayoutMultiple": 2.64,
        "centsAtRisk": 100,
        "centsProfitIfWin": 164
      },
      "spread": {
        "player": "Learner Tien",
        "spread": 3.5,
        "odds": 104
      },
      "total": {
        "side": "Over",
        "line": 37.5,
        "odds": -118
      },
      "totalOver": {
        "side": "Over",
        "line": 37.5,
        "odds": -118
      },
      "totalUnder": {
        "side": "Under",
        "line": 37.5,
        "odds": -112
      },
      "priceAction": "Model is meaningfully above FanDuel implied price.",
      "spreadValue": "Learner Tien +3.5 (+104)",
      "totalValue": "37.5 games: Over -118 / Under -112",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Flavio Cobolli -200 / Learner Tien +164",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. Model is meaningfully above FanDuel implied price.",
      "noVigNote": "Model 52.9% vs FanDuel implied 37.9% (+15 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Flavio-Cobolli-Vs-Learner-Tien/",
    "players": [
      {
        "name": "Flavio Cobolli",
        "ranking": {
          "name": "Flavio Cobolli",
          "rank": 14,
          "points": 2340,
          "age": 24,
          "country": "Italy",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/7602/flavio-cobolli",
          "asOf": "2026-05-31"
        },
        "qualityName": "Flavio Cobolli",
        "profile": "Live rank #14 | Italy | age 24 | 2026 clay 11-5, 69% | adj form 64",
        "modelPct": 47.1,
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
          "pressureMatches": 4,
          "matchesWithStats": 0,
          "weaknessScore": 2,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Flavio Cobolli has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Learner Tien",
        "ranking": {
          "name": "Learner Tien",
          "rank": 18,
          "points": 2180,
          "age": 20,
          "country": "USA",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/10386/learner-tien",
          "asOf": "2026-05-31"
        },
        "qualityName": "Learner Tien",
        "profile": "Live rank #18 | USA | age 20 | 2026 clay 9-3, 75% | adj form 97",
        "modelPct": 52.9,
        "weakness": {
          "name": "Learner Tien",
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
          "pressureMatches": 7,
          "matchesWithStats": 0,
          "weaknessScore": 6,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Learner Tien has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-m-matteo-berrettini-francisco-comesana-2026-05-30",
    "eventId": "175720",
    "tour": "ATP",
    "title": "Matteo Berrettini vs Francisco Comesana",
    "start": "4:40 AM",
    "startMinutes": 280,
    "court": "Court Simonne-Mathieu",
    "round": "Round 3",
    "pickName": "Matteo Berrettini",
    "basePickName": "Matteo Berrettini",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 63.9,
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
    "reason": "Matteo Berrettini grades 14 points better on opponent-adjusted recent form. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
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
        "name": "Matteo Berrettini",
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
        "pressureMatches": 5,
        "matchesWithStats": 0,
        "weaknessScore": 3,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Matteo Berrettini has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Francisco Comesana",
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
        "pressureMatches": 3,
        "matchesWithStats": 0,
        "weaknessScore": 0,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Francisco Comesana has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Matteo Berrettini",
        "confidence": 88,
        "modelPct": 63.9,
        "label": "Strong set-win path"
      },
      {
        "name": "Francisco Comesana",
        "confidence": 67,
        "modelPct": 36.1,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Matteo Berrettini",
        "americanOdds": -230,
        "modelPct": 63.9,
        "impliedPct": 69.7,
        "edgePct": -5.8,
        "evPer100": -8.3,
        "netEvPer100": -10.3,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Matteo Berrettini",
        "line": -4.5,
        "americanOdds": -110,
        "modelPct": 58,
        "impliedPct": 52.4,
        "edgePct": 5.6,
        "evPer100": 10.7,
        "netEvPer100": 8.7,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Watch only",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Under",
        "line": 37.5,
        "americanOdds": -110,
        "expectedGames": 36.4,
        "modelPct": 57,
        "impliedPct": 52.4,
        "edgePct": 4.6,
        "evPer100": 8.8,
        "netEvPer100": 6.8,
        "feePer100": 2,
        "valueIssue": "Total watch only",
        "valueGrade": "Raw positive EV",
        "reason": "Expected match games 36.4 vs FanDuel 37.5; Under. hold avg N/A, return games won N/A, first-set sample 10.2g, 42 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Over 9.5 if Berrettini serve rhythm is clean; pass if Comesana leaks early second-serve points.",
        "line": null,
        "americanOdds": null,
        "expectedGames": 10.2,
        "confidence": 56,
        "tiebreakRisk": 0.17,
        "earlyBreakRisk": 0.39,
        "modelPct": 56,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Thin",
        "reason": "Over 9.5 if Berrettini serve rhythm is clean; pass if Comesana leaks early second-serve points.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Matteo Berrettini",
          "confidence": 88,
          "modelPct": 63.9,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Francisco Comesana",
          "confidence": 67,
          "modelPct": 36.1,
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
          "name": "Matteo Berrettini",
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
          "weaknessScore": 3,
          "weakServeMatches": 0,
          "statMatches": 0,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 21,
            "firstSetSamples": 8,
            "avgFirstSetGames": 10.75,
            "avgSetGames": 10.19047619047619,
            "avgMatchGames": 26.75,
            "avgSetsPlayed": 2.625,
            "tiebreakRate": 0.19047619047619047,
            "extendedSetRate": 0.2857142857142857,
            "shortSetRate": 0.19047619047619047
          }
        },
        {
          "name": "Francisco Comesana",
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
            "completedMatches": 8,
            "setSamples": 21,
            "firstSetSamples": 8,
            "avgFirstSetGames": 9.625,
            "avgSetGames": 9.714285714285714,
            "avgMatchGames": 25.5,
            "avgSetsPlayed": 2.625,
            "tiebreakRate": 0.14285714285714285,
            "extendedSetRate": 0.14285714285714285,
            "shortSetRate": 0.23809523809523808
          }
        }
      ],
      "expectedFirstSetGames": 10.4,
      "expectedMatchGames": 36.4,
      "signalStrength": 4,
      "holdAvg": null,
      "returnGamesAvg": null,
      "returnPointsAvg": null,
      "setSamples": 42,
      "firstSetSamples": 16,
      "avgFirstSetGames": 10.2,
      "avgSetGames": 10,
      "tiebreakRate": 16.7,
      "extendedSetRate": 21.4,
      "shortSetRate": 21.4,
      "reasonCore": "hold avg N/A, return games won N/A, first-set sample 10.2g, 42 recent sets"
    },
    "derivativeCase": {
      "date": "2026-05-30",
      "matchId": "rg-m-matteo-berrettini-francisco-comesana-2026-05-30",
      "match": "Matteo Berrettini vs Francisco Comesana",
      "start": "4:00 AM",
      "expectedMatchGames": 39.3,
      "expectedFirstSetGames": 10.2,
      "totalGames": {
        "postedLine": 37.5,
        "overOdds": -120,
        "underOdds": -110,
        "lean": "Over",
        "edgeGames": 1.8,
        "confidence": 57,
        "grade": "watch",
        "reason": "Berrettini is price-taxed and Comesana has enough set-win projection to extend the match."
      },
      "gameHandicap": {
        "selection": "Francisco Comesana",
        "postedSpread": 4.5,
        "odds": -120,
        "projectedMarginGames": 3.1,
        "edgeGames": 1.4,
        "confidence": 55,
        "grade": "watch",
        "reason": "Comesana +4.5 fits the model-market disagreement better than Berrettini ML."
      },
      "firstSet": {
        "expectedGames": 10.2,
        "lean": "Over 9.5 if Berrettini serve rhythm is clean; pass if Comesana leaks early second-serve points.",
        "tiebreakRisk": 0.17,
        "earlyBreakRisk": 0.39,
        "confidence": 56
      },
      "writeup": {
        "headline": "Matteo Berrettini vs Francisco Comesana: derivative lane before ML.",
        "betPlan": "No blind bet; use the listed lane only at a good number.",
        "whyItWorks": [
          "Comesana +4.5 fits the model-market disagreement better than Berrettini ML.",
          null,
          "The matrix separates likely winner from the market that actually pays."
        ],
        "whyItFails": [
          "One-sided first-set breaks can wreck spread and total projections quickly.",
          "If early service games contradict the projected hold/return shape, downgrade before adding exposure."
        ],
        "entryExit": {
          "preMatch": "Over total edge +1.8 games; spread edge +1.4 games.",
          "live": "Over 9.5 if Berrettini serve rhythm is clean; pass if Comesana leaks early second-serve points."
        }
      },
      "evidence": [
        "FanDuel total 37.5 captured.",
        "FanDuel handicap captured for Francisco Comesana.",
        "Model match confidence 52% with volatility 48%.",
        "Set-win projections: Matteo Berrettini 84% / Francisco Comesana 77%."
      ],
      "dataQuality": {
        "fanDuelTotalCaptured": true,
        "fanDuelSpreadCaptured": true,
        "warehouseRowsUsed": 2,
        "replayRowsUsed": 0,
        "status": "complete"
      }
    },
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Matteo Berrettini",
        "line": null,
        "americanOdds": -230,
        "modelPct": 63.9,
        "impliedPct": 69.7,
        "edgePct": -5.8,
        "evPer100": -8.3,
        "netEvPer100": -10.3,
        "grade": "Negative EV",
        "issue": "Favorite price needs better proof",
        "reason": "FanDuel price is richer than the model; pass ML unless live state improves."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Francisco Comesana",
        "line": 4.5,
        "americanOdds": -120,
        "modelPct": 58,
        "impliedPct": 52.4,
        "edgePct": 5.6,
        "evPer100": 10.7,
        "netEvPer100": 8.7,
        "expectedGames": 3.1,
        "edgeGames": 1.4,
        "confidence": 55,
        "grade": "watch",
        "reason": "Comesana +4.5 fits the model-market disagreement better than Berrettini ML."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "Over",
        "line": 37.5,
        "americanOdds": -120,
        "modelPct": 57,
        "impliedPct": 52.4,
        "edgePct": 4.6,
        "evPer100": 8.8,
        "netEvPer100": 6.8,
        "expectedGames": 39.3,
        "edgeGames": 1.8,
        "confidence": 57,
        "grade": "watch",
        "reason": "Berrettini is price-taxed and Comesana has enough set-win projection to extend the match."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Matteo Berrettini 88% / Francisco Comesana 67%",
        "rows": [
          {
            "name": "Matteo Berrettini",
            "confidence": 88,
            "modelPct": 63.9,
            "label": "Strong set-win path"
          },
          {
            "name": "Francisco Comesana",
            "confidence": 67,
            "modelPct": 36.1,
            "label": "Needs early hold pressure"
          }
        ],
        "confidence": 88,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Over 9.5 if Berrettini serve rhythm is clean; pass if Comesana leaks early second-serve points.",
        "expectedGames": 10.2,
        "confidence": 56,
        "tiebreakRisk": 0.17,
        "earlyBreakRisk": 0.39,
        "grade": "Thin",
        "reason": "Over 9.5 if Berrettini serve rhythm is clean; pass if Comesana leaks early second-serve points."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Francisco Comesana",
      "opponent": "Matteo Berrettini",
      "grade": "Watch only",
      "riskGate": "closeout risk",
      "marketOdds": 188,
      "fairOdds": 177,
      "modelProbability": 36.1,
      "dataOnlyProbability": 39.3,
      "marketProbability": 34.7,
      "marketDisagreementPct": 1.4,
      "netEvPer100": 2,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Francisco Comesana is priced below the model, not guaranteed to win.",
      "useCase": "Needs a posted market price before sizing.",
      "bullets": [],
      "risks": [
        "Desk lean still has Matteo Berrettini; this is a price-dislocation play, not the safest winner.",
        "Market still prices Francisco Comesana as a real underdog at 34.7% implied."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page browser scrape",
      "capturedAt": "2026-05-30T04:26:50.340Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/matteo-berrettini-v-francisco-comesana-35661720",
      "players": [
        {
          "name": "Matteo Berrettini",
          "odds": -230,
          "americanLabel": "-230",
          "impliedPct": 69.7,
          "decimalOdds": 1.435,
          "modelPct": 63.9,
          "edgePct": -5.8,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 43.5,
          "grossPayoutMultiple": 1.435,
          "centsAtRisk": 100,
          "centsProfitIfWin": 43.5
        },
        {
          "name": "Francisco Comesana",
          "odds": 188,
          "americanLabel": "+188",
          "impliedPct": 34.7,
          "decimalOdds": 2.88,
          "modelPct": 36.1,
          "edgePct": 1.4,
          "priceBand": "Underdog",
          "grossProfitPct": 188,
          "grossPayoutMultiple": 2.88,
          "centsAtRisk": 100,
          "centsProfitIfWin": 188
        }
      ],
      "desk": {
        "name": "Matteo Berrettini",
        "odds": -230,
        "americanLabel": "-230",
        "impliedPct": 69.7,
        "decimalOdds": 1.435,
        "modelPct": 63.9,
        "edgePct": -5.8,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 43.5,
        "grossPayoutMultiple": 1.435,
        "centsAtRisk": 100,
        "centsProfitIfWin": 43.5
      },
      "spread": {
        "player": "Matteo Berrettini",
        "spread": -4.5,
        "odds": -110
      },
      "total": {
        "side": "Over",
        "line": 37.5,
        "odds": -120
      },
      "totalOver": {
        "side": "Over",
        "line": 37.5,
        "odds": -120
      },
      "totalUnder": {
        "side": "Under",
        "line": 37.5,
        "odds": -110
      },
      "priceAction": "FanDuel price is richer than the model; pass ML unless live state improves.",
      "spreadValue": "Matteo Berrettini -4.5 (-110)",
      "totalValue": "37.5 games: Over -120 / Under -110",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Matteo Berrettini -230 / Francisco Comesana +188",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. FanDuel price is richer than the model; pass ML unless live state improves.",
      "noVigNote": "Model 63.9% vs FanDuel implied 69.7% (-5.8 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Matteo-Berrettini-Vs-Francisco-Comesana/",
    "players": [
      {
        "name": "Matteo Berrettini",
        "ranking": {
          "name": "Matteo Berrettini",
          "rank": 105,
          "points": 585,
          "age": 30,
          "country": "Italy",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/2622/matteo-berrettini",
          "asOf": "2026-05-31"
        },
        "qualityName": "Matteo Berrettini",
        "profile": "Live rank #105 | Italy | age 30 | 2026 clay 10-9, 53% | adj form 83",
        "modelPct": 63.9,
        "weakness": {
          "name": "Matteo Berrettini",
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
          "pressureMatches": 5,
          "matchesWithStats": 0,
          "weaknessScore": 3,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Matteo Berrettini has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Francisco Comesana",
        "ranking": {
          "name": "Francisco Comesana",
          "rank": 102,
          "points": 598,
          "age": 25,
          "country": "Argentina",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/10044/francisco-comesana",
          "asOf": "2026-05-31"
        },
        "qualityName": "Francisco Comesana",
        "profile": "Live rank #102 | Argentina | age 25 | 2026 clay 11-11, 50% | adj form 69",
        "modelPct": 36.1,
        "weakness": {
          "name": "Francisco Comesana",
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
          "pressureMatches": 3,
          "matchesWithStats": 0,
          "weaknessScore": 0,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Francisco Comesana has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-m-juan-manuel-cerundolo-martin-landaluce-2026-05-30",
    "eventId": "175727",
    "tour": "ATP",
    "title": "Juan Manuel Cerundolo vs Martin Landaluce",
    "start": "5:15 AM",
    "startMinutes": 315,
    "court": "Court 7",
    "round": "Round 3",
    "pickName": "Juan Manuel Cerundolo",
    "basePickName": "Juan Manuel Cerundolo",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 64.6,
    "volatility": 48,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Lean",
      "No blind bet",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Juan Manuel Cerundolo grades 15 points better on opponent-adjusted recent form. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": -1,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Juan Manuel Cerundolo",
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
        "pressureMatches": 5,
        "matchesWithStats": 0,
        "weaknessScore": 3,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Juan Manuel Cerundolo has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Martin Landaluce",
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
        "gameFlowRead": "Martin Landaluce has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Juan Manuel Cerundolo",
        "confidence": 88,
        "modelPct": 64.6,
        "label": "Strong set-win path"
      },
      {
        "name": "Martin Landaluce",
        "confidence": 66,
        "modelPct": 35.4,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Juan Manuel Cerundolo",
        "americanOdds": -140,
        "modelPct": 64.6,
        "impliedPct": 58.3,
        "edgePct": 6.3,
        "evPer100": 10.7,
        "netEvPer100": 8.7,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Favorite price needs better proof",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Juan Manuel Cerundolo",
        "line": -1.5,
        "americanOdds": -120,
        "modelPct": 59,
        "impliedPct": 54.5,
        "edgePct": 4.5,
        "evPer100": 8.2,
        "netEvPer100": 6.2,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Raw positive EV",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Under",
        "line": 38.5,
        "americanOdds": -122,
        "expectedGames": 35.9,
        "modelPct": 61,
        "impliedPct": 55,
        "edgePct": 6,
        "evPer100": 11,
        "netEvPer100": 9,
        "feePer100": 2,
        "valueIssue": "Total watch only",
        "valueGrade": "Watch only",
        "reason": "Expected match games 35.9 vs FanDuel 38.5; Under. hold avg N/A, return games won N/A, first-set sample 9.6g, 45 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Over 9.5; pass 10.5 unless plus money.",
        "line": null,
        "americanOdds": null,
        "expectedGames": 10.3,
        "confidence": 57,
        "tiebreakRisk": 0.16,
        "earlyBreakRisk": 0.38,
        "modelPct": 57,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Thin",
        "reason": "Over 9.5; pass 10.5 unless plus money.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Juan Manuel Cerundolo",
          "confidence": 88,
          "modelPct": 64.6,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Martin Landaluce",
          "confidence": 66,
          "modelPct": 35.4,
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
          "name": "Juan Manuel Cerundolo",
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
          "weaknessScore": 3,
          "weakServeMatches": 0,
          "statMatches": 0,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 21,
            "firstSetSamples": 8,
            "avgFirstSetGames": 10.125,
            "avgSetGames": 10.047619047619047,
            "avgMatchGames": 26.375,
            "avgSetsPlayed": 2.625,
            "tiebreakRate": 0.23809523809523808,
            "extendedSetRate": 0.38095238095238093,
            "shortSetRate": 0.38095238095238093
          }
        },
        {
          "name": "Martin Landaluce",
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
          "weaknessScore": 2,
          "weakServeMatches": 0,
          "statMatches": 0,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 24,
            "firstSetSamples": 8,
            "avgFirstSetGames": 9,
            "avgSetGames": 9.375,
            "avgMatchGames": 28.125,
            "avgSetsPlayed": 3,
            "tiebreakRate": 0.041666666666666664,
            "extendedSetRate": 0.16666666666666666,
            "shortSetRate": 0.3333333333333333
          }
        }
      ],
      "expectedFirstSetGames": 9.7,
      "expectedMatchGames": 35.9,
      "signalStrength": 4,
      "holdAvg": null,
      "returnGamesAvg": null,
      "returnPointsAvg": null,
      "setSamples": 45,
      "firstSetSamples": 16,
      "avgFirstSetGames": 9.6,
      "avgSetGames": 9.7,
      "tiebreakRate": 14,
      "extendedSetRate": 27.4,
      "shortSetRate": 35.7,
      "reasonCore": "hold avg N/A, return games won N/A, first-set sample 9.6g, 45 recent sets"
    },
    "derivativeCase": {
      "date": "2026-05-30",
      "matchId": "rg-m-juan-manuel-cerundolo-martin-landaluce-2026-05-30",
      "match": "Juan Manuel Cerundolo vs Martin Landaluce",
      "start": "4:30 AM",
      "expectedMatchGames": 40,
      "expectedFirstSetGames": 10.3,
      "totalGames": {
        "postedLine": 38.5,
        "overOdds": -110,
        "underOdds": -122,
        "lean": "Over",
        "edgeGames": 1.5,
        "confidence": 57,
        "grade": "watch",
        "reason": "The match grades close and both set-win projections are live, so the best-of-five total is the better lane."
      },
      "gameHandicap": {
        "selection": "Martin Landaluce",
        "postedSpread": 1.5,
        "odds": -110,
        "projectedMarginGames": 0.4,
        "edgeGames": 1.1,
        "confidence": 54,
        "grade": "thin",
        "reason": "Cerundolo is a small model lean, but -1.5 is not worth paying for. Landaluce +1.5 fits the close-match read."
      },
      "firstSet": {
        "expectedGames": 10.3,
        "lean": "Over 9.5; pass 10.5 unless plus money.",
        "tiebreakRisk": 0.16,
        "earlyBreakRisk": 0.38,
        "confidence": 57
      },
      "writeup": {
        "headline": "Juan Manuel Cerundolo vs Martin Landaluce: derivative lane before ML.",
        "betPlan": "No blind bet; use the listed lane only at a good number.",
        "whyItWorks": [
          "Cerundolo is a small model lean, but -1.5 is not worth paying for. Landaluce +1.5 fits the close-match read.",
          null,
          "The matrix separates likely winner from the market that actually pays."
        ],
        "whyItFails": [
          "One-sided first-set breaks can wreck spread and total projections quickly.",
          "If early service games contradict the projected hold/return shape, downgrade before adding exposure."
        ],
        "entryExit": {
          "preMatch": "Over total edge +1.5 games; spread edge +1.1 games.",
          "live": "Over 9.5; pass 10.5 unless plus money."
        }
      },
      "evidence": [
        "FanDuel total 38.5 captured.",
        "FanDuel handicap captured for Martin Landaluce.",
        "Model match confidence 52% with volatility 48%.",
        "Set-win projections: Juan Manuel Cerundolo 84% / Martin Landaluce 77%."
      ],
      "dataQuality": {
        "fanDuelTotalCaptured": true,
        "fanDuelSpreadCaptured": true,
        "warehouseRowsUsed": 2,
        "replayRowsUsed": 0,
        "status": "complete"
      }
    },
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Juan Manuel Cerundolo",
        "line": null,
        "americanOdds": -140,
        "modelPct": 64.6,
        "impliedPct": 58.3,
        "edgePct": 6.3,
        "evPer100": 10.7,
        "netEvPer100": 8.7,
        "grade": "Favorite price needs better proof",
        "issue": "Favorite price needs better proof",
        "reason": "ML is close to fair; derivative or live entry needs to carry the edge."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Martin Landaluce",
        "line": 1.5,
        "americanOdds": -110,
        "modelPct": 59,
        "impliedPct": 54.5,
        "edgePct": 4.5,
        "evPer100": 8.2,
        "netEvPer100": 6.2,
        "expectedGames": 0.4,
        "edgeGames": 1.1,
        "confidence": 54,
        "grade": "thin",
        "reason": "Cerundolo is a small model lean, but -1.5 is not worth paying for. Landaluce +1.5 fits the close-match read."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "Over",
        "line": 38.5,
        "americanOdds": -110,
        "modelPct": 61,
        "impliedPct": 55,
        "edgePct": 6,
        "evPer100": 11,
        "netEvPer100": 9,
        "expectedGames": 40,
        "edgeGames": 1.5,
        "confidence": 57,
        "grade": "watch",
        "reason": "The match grades close and both set-win projections are live, so the best-of-five total is the better lane."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Juan Manuel Cerundolo 88% / Martin Landaluce 66%",
        "rows": [
          {
            "name": "Juan Manuel Cerundolo",
            "confidence": 88,
            "modelPct": 64.6,
            "label": "Strong set-win path"
          },
          {
            "name": "Martin Landaluce",
            "confidence": 66,
            "modelPct": 35.4,
            "label": "Needs early hold pressure"
          }
        ],
        "confidence": 88,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Over 9.5; pass 10.5 unless plus money.",
        "expectedGames": 10.3,
        "confidence": 57,
        "tiebreakRisk": 0.16,
        "earlyBreakRisk": 0.38,
        "grade": "Thin",
        "reason": "Over 9.5; pass 10.5 unless plus money."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Juan Manuel Cerundolo",
      "opponent": "Martin Landaluce",
      "grade": "Playable favorite",
      "riskGate": "clean enough",
      "marketOdds": -152,
      "fairOdds": -182,
      "modelProbability": 64.6,
      "dataOnlyProbability": 66.9,
      "marketProbability": 60.3,
      "marketDisagreementPct": 4.3,
      "netEvPer100": 5,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Juan Manuel Cerundolo is priced below the model, not guaranteed to win.",
      "useCase": "Favorite price needs cleaner proof or derivative value; do not confuse win probability with bet value.",
      "bullets": [],
      "risks": [
        "Risk is mostly normal tennis variance; do not size this like a lock."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page browser scrape",
      "capturedAt": "2026-05-30T04:26:53.476Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/juan-manuel-cerundolo-v-martin-landaluce-35661300",
      "players": [
        {
          "name": "Juan Manuel Cerundolo",
          "odds": -140,
          "americanLabel": "-140",
          "impliedPct": 58.3,
          "decimalOdds": 1.714,
          "modelPct": 64.6,
          "edgePct": 6.3,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 71.4,
          "grossPayoutMultiple": 1.714,
          "centsAtRisk": 100,
          "centsProfitIfWin": 71.4
        },
        {
          "name": "Martin Landaluce",
          "odds": 116,
          "americanLabel": "+116",
          "impliedPct": 46.3,
          "decimalOdds": 2.16,
          "modelPct": 35.4,
          "edgePct": -10.9,
          "priceBand": "Coinflip",
          "grossProfitPct": 116,
          "grossPayoutMultiple": 2.16,
          "centsAtRisk": 100,
          "centsProfitIfWin": 116
        }
      ],
      "desk": {
        "name": "Juan Manuel Cerundolo",
        "odds": -140,
        "americanLabel": "-140",
        "impliedPct": 58.3,
        "decimalOdds": 1.714,
        "modelPct": 64.6,
        "edgePct": 6.3,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 71.4,
        "grossPayoutMultiple": 1.714,
        "centsAtRisk": 100,
        "centsProfitIfWin": 71.4
      },
      "spread": {
        "player": "Juan Manuel Cerundolo",
        "spread": -1.5,
        "odds": -120
      },
      "total": {
        "side": "Over",
        "line": 38.5,
        "odds": -110
      },
      "totalOver": {
        "side": "Over",
        "line": 38.5,
        "odds": -110
      },
      "totalUnder": {
        "side": "Under",
        "line": 38.5,
        "odds": -122
      },
      "priceAction": "ML is close to fair; derivative or live entry needs to carry the edge.",
      "spreadValue": "Juan Manuel Cerundolo -1.5 (-120)",
      "totalValue": "38.5 games: Over -110 / Under -122",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Juan Manuel Cerundolo -140 / Martin Landaluce +116",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. ML is close to fair; derivative or live entry needs to carry the edge.",
      "noVigNote": "Model 64.6% vs FanDuel implied 58.3% (+6.3 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Juan-Manuel-Cerundolo-Vs-Martin-Landaluce/",
    "players": [
      {
        "name": "Juan Manuel Cerundolo",
        "ranking": {
          "name": "Juan Manuel Cerundolo",
          "rank": 56,
          "points": 935,
          "age": 24,
          "country": "Argentina",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/4008/juan-manuel-cerundolo",
          "asOf": "2026-05-31"
        },
        "qualityName": "Juan Manuel Cerundolo",
        "profile": "Live rank #56 | Argentina | age 24 | 2026 clay 19-10, 66% | adj form 103",
        "modelPct": 64.6,
        "weakness": {
          "name": "Juan Manuel Cerundolo",
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
          "pressureMatches": 5,
          "matchesWithStats": 0,
          "weaknessScore": 3,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Juan Manuel Cerundolo has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Martin Landaluce",
        "ranking": {
          "name": "Martin Landaluce",
          "rank": 69,
          "points": 827,
          "age": 20,
          "country": "Spain",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/11640/martin-landaluce",
          "asOf": "2026-05-31"
        },
        "qualityName": "Martin Landaluce",
        "profile": "Live rank #69 | Spain | age 20 | 2026 clay 10-6, 63% | adj form 88",
        "modelPct": 35.4,
        "weakness": {
          "name": "Martin Landaluce",
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
          "gameFlowRead": "Martin Landaluce has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-w-diane-parry-amanda-anisimova-2026-05-30",
    "eventId": "175530",
    "tour": "WTA",
    "title": "Diane Parry vs Amanda Anisimova",
    "start": "5:20 AM",
    "startMinutes": 320,
    "court": "Court Philippe-Chatrier",
    "round": "Round 3",
    "pickName": "Amanda Anisimova",
    "basePickName": "Amanda Anisimova",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 76.4,
    "volatility": 46,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "High confidence",
      "Price required",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Diane Parry grades 16 points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price. High win probability, but the ML still needs enough payout after comparing the book price to the model.",
    "totals": "Best O/U angle: no play without a posted total.",
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
        "name": "Amanda Anisimova",
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
        "gameFlowRead": "Amanda Anisimova has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Diane Parry",
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
        "gameFlowRead": "Diane Parry has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Diane Parry",
        "confidence": 38,
        "modelPct": 23.6,
        "label": "Thin set-win path"
      },
      {
        "name": "Amanda Anisimova",
        "confidence": 83,
        "modelPct": 76.4,
        "label": "Strong set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Amanda Anisimova",
        "americanOdds": -530,
        "modelPct": 76.4,
        "impliedPct": 84.1,
        "edgePct": -7.7,
        "evPer100": -9.2,
        "netEvPer100": -11.2,
        "feePer100": 2,
        "valueIssue": "Favorite tax trap",
        "valueGrade": "Favorite tax trap",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Amanda Anisimova",
        "line": -5.5,
        "americanOdds": 104,
        "modelPct": 70,
        "impliedPct": 49,
        "edgePct": 21,
        "evPer100": 42.8,
        "netEvPer100": 40.8,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Watch only",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 19.5,
        "americanOdds": -130,
        "expectedGames": 20.4,
        "modelPct": 57,
        "impliedPct": 56.5,
        "edgePct": 0.5,
        "evPer100": 0.8,
        "netEvPer100": -1.2,
        "feePer100": 2,
        "valueIssue": "Total watch only",
        "valueGrade": "Near fair",
        "reason": "Expected match games 20.4 vs FanDuel 19.5; Over. hold avg N/A, return games won N/A, first-set sample 9g, 33 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Pass 9.5 pre-match; over only after Parry shows she can hold early.",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.5,
        "confidence": 52,
        "tiebreakRisk": 0.08,
        "earlyBreakRisk": 0.54,
        "modelPct": 52,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Thin",
        "reason": "Pass 9.5 pre-match; over only after Parry shows she can hold early.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Diane Parry",
          "confidence": 38,
          "modelPct": 23.6,
          "label": "Thin set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Amanda Anisimova",
          "confidence": 83,
          "modelPct": 76.4,
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
          "name": "Diane Parry",
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
          "weaknessScore": 2,
          "weakServeMatches": 0,
          "statMatches": 0,
          "setShape": {
            "completedMatches": 7,
            "setSamples": 16,
            "firstSetSamples": 7,
            "avgFirstSetGames": 9.285714285714286,
            "avgSetGames": 9.75,
            "avgMatchGames": 22.285714285714285,
            "avgSetsPlayed": 2.2857142857142856,
            "tiebreakRate": 0.1875,
            "extendedSetRate": 0.25,
            "shortSetRate": 0.25
          }
        },
        {
          "name": "Amanda Anisimova",
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
            "completedMatches": 8,
            "setSamples": 17,
            "firstSetSamples": 8,
            "avgFirstSetGames": 8.625,
            "avgSetGames": 8.294117647058824,
            "avgMatchGames": 17.625,
            "avgSetsPlayed": 2.125,
            "tiebreakRate": 0,
            "extendedSetRate": 0.11764705882352941,
            "shortSetRate": 0.6470588235294118
          }
        }
      ],
      "expectedFirstSetGames": 8.8,
      "expectedMatchGames": 20.4,
      "signalStrength": 4,
      "holdAvg": null,
      "returnGamesAvg": null,
      "returnPointsAvg": null,
      "setSamples": 33,
      "firstSetSamples": 15,
      "avgFirstSetGames": 9,
      "avgSetGames": 9,
      "tiebreakRate": 9.4,
      "extendedSetRate": 18.4,
      "shortSetRate": 44.9,
      "reasonCore": "hold avg N/A, return games won N/A, first-set sample 9g, 33 recent sets"
    },
    "derivativeCase": {
      "date": "2026-05-30",
      "matchId": "rg-w-diane-parry-amanda-anisimova-2026-05-30",
      "match": "Diane Parry vs Amanda Anisimova",
      "start": "5:00 AM",
      "expectedMatchGames": 21.2,
      "expectedFirstSetGames": 9.5,
      "totalGames": {
        "postedLine": 19.5,
        "overOdds": -130,
        "underOdds": -102,
        "lean": "Over",
        "edgeGames": 1.7,
        "confidence": 57,
        "grade": "watch",
        "reason": "Anisimova ML is expensive and Parry has enough volatility leverage to make a short total dangerous."
      },
      "gameHandicap": {
        "selection": "Diane Parry",
        "postedSpread": 5.5,
        "odds": -136,
        "projectedMarginGames": 4,
        "edgeGames": 1.5,
        "confidence": 56,
        "grade": "watch",
        "reason": "Parry +5.5 is a better lane than laying Anisimova games because one loose favorite service set can wreck the cover."
      },
      "firstSet": {
        "expectedGames": 9.5,
        "lean": "Pass 9.5 pre-match; over only after Parry shows she can hold early.",
        "tiebreakRisk": 0.08,
        "earlyBreakRisk": 0.54,
        "confidence": 52
      },
      "writeup": {
        "headline": "Diane Parry vs Amanda Anisimova: derivative lane before ML.",
        "betPlan": "No blind bet; use the listed lane only at a good number.",
        "whyItWorks": [
          "Parry +5.5 is a better lane than laying Anisimova games because one loose favorite service set can wreck the cover.",
          null,
          "The matrix separates likely winner from the market that actually pays."
        ],
        "whyItFails": [
          "One-sided first-set breaks can wreck spread and total projections quickly.",
          "If early service games contradict the projected hold/return shape, downgrade before adding exposure."
        ],
        "entryExit": {
          "preMatch": "Over total edge +1.7 games; spread edge +1.5 games.",
          "live": "Pass 9.5 pre-match; over only after Parry shows she can hold early."
        }
      },
      "evidence": [
        "FanDuel total 19.5 captured.",
        "FanDuel handicap captured for Diane Parry.",
        "Model match confidence 61% with volatility 46%.",
        "Set-win projections: Diane Parry 54% / Amanda Anisimova 75%."
      ],
      "dataQuality": {
        "fanDuelTotalCaptured": true,
        "fanDuelSpreadCaptured": true,
        "warehouseRowsUsed": 2,
        "replayRowsUsed": 0,
        "status": "complete"
      }
    },
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Amanda Anisimova",
        "line": null,
        "americanOdds": -530,
        "modelPct": 76.4,
        "impliedPct": 84.1,
        "edgePct": -7.7,
        "evPer100": -9.2,
        "netEvPer100": -11.2,
        "grade": "Favorite tax trap",
        "issue": "Favorite tax trap",
        "reason": "Likely winner can still be a bad ML bet after payout and fees. Check spread, total, and set-win instead."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Diane Parry",
        "line": 5.5,
        "americanOdds": -136,
        "modelPct": 70,
        "impliedPct": 49,
        "edgePct": 21,
        "evPer100": 42.8,
        "netEvPer100": 40.8,
        "expectedGames": 4,
        "edgeGames": 1.5,
        "confidence": 56,
        "grade": "watch",
        "reason": "Parry +5.5 is a better lane than laying Anisimova games because one loose favorite service set can wreck the cover."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "Over",
        "line": 19.5,
        "americanOdds": -130,
        "modelPct": 57,
        "impliedPct": 56.5,
        "edgePct": 0.5,
        "evPer100": 0.8,
        "netEvPer100": -1.2,
        "expectedGames": 21.2,
        "edgeGames": 1.7,
        "confidence": 57,
        "grade": "watch",
        "reason": "Anisimova ML is expensive and Parry has enough volatility leverage to make a short total dangerous."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Diane Parry 38% / Amanda Anisimova 83%",
        "rows": [
          {
            "name": "Diane Parry",
            "confidence": 38,
            "modelPct": 23.6,
            "label": "Thin set-win path"
          },
          {
            "name": "Amanda Anisimova",
            "confidence": 83,
            "modelPct": 76.4,
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
        "selection": "Pass 9.5 pre-match; over only after Parry shows she can hold early.",
        "expectedGames": 9.5,
        "confidence": 52,
        "tiebreakRisk": 0.08,
        "earlyBreakRisk": 0.54,
        "grade": "Thin",
        "reason": "Pass 9.5 pre-match; over only after Parry shows she can hold early."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Diane Parry",
      "opponent": "Amanda Anisimova",
      "grade": "Watch only",
      "riskGate": "hold risk, closeout risk, opponent return pressure",
      "marketOdds": 421,
      "fairOdds": 324,
      "modelProbability": 23.6,
      "dataOnlyProbability": 26,
      "marketProbability": 19.2,
      "marketDisagreementPct": 4.4,
      "netEvPer100": 21,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Diane Parry is priced below the model, not guaranteed to win.",
      "useCase": "Straight ML value only at +421 or better; fair price from the ensemble is about +324.",
      "bullets": [],
      "risks": [
        "Desk lean still has Amanda Anisimova; this is a price-dislocation play, not the safest winner.",
        "Market still prices Diane Parry as a real underdog at 19.2% implied."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page browser scrape",
      "capturedAt": "2026-05-30T04:26:56.557Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/diane-parry-v-amanda-anisimova-35661210",
      "players": [
        {
          "name": "Diane Parry",
          "odds": 385,
          "americanLabel": "+385",
          "impliedPct": 20.6,
          "decimalOdds": 4.85,
          "modelPct": 23.6,
          "edgePct": 3,
          "priceBand": "Underdog",
          "grossProfitPct": 385,
          "grossPayoutMultiple": 4.85,
          "centsAtRisk": 100,
          "centsProfitIfWin": 385
        },
        {
          "name": "Amanda Anisimova",
          "odds": -530,
          "americanLabel": "-530",
          "impliedPct": 84.1,
          "decimalOdds": 1.189,
          "modelPct": 76.4,
          "edgePct": -7.7,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 18.9,
          "grossPayoutMultiple": 1.189,
          "centsAtRisk": 100,
          "centsProfitIfWin": 18.9
        }
      ],
      "desk": {
        "name": "Amanda Anisimova",
        "odds": -530,
        "americanLabel": "-530",
        "impliedPct": 84.1,
        "decimalOdds": 1.189,
        "modelPct": 76.4,
        "edgePct": -7.7,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 18.9,
        "grossPayoutMultiple": 1.189,
        "centsAtRisk": 100,
        "centsProfitIfWin": 18.9
      },
      "spread": {
        "player": "Amanda Anisimova",
        "spread": -5.5,
        "odds": 104
      },
      "total": {
        "side": "Over",
        "line": 19.5,
        "odds": -130
      },
      "totalOver": {
        "side": "Over",
        "line": 19.5,
        "odds": -130
      },
      "totalUnder": {
        "side": "Under",
        "line": 19.5,
        "odds": -102
      },
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "Amanda Anisimova -5.5 (+104)",
      "totalValue": "19.5 games: Over -130 / Under -102",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Diane Parry +385 / Amanda Anisimova -530",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 76.4% vs FanDuel implied 84.1% (-7.7 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Diane-Parry-Vs-Amanda-Anisimova/",
    "players": [
      {
        "name": "Diane Parry",
        "ranking": {
          "name": "Diane Parry",
          "rank": 92,
          "points": 853,
          "age": 23,
          "country": "France",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/3332/diane-parry",
          "asOf": "2026-05-31"
        },
        "qualityName": "Diane Parry",
        "profile": "Live rank #92 | France | age 23 | 2026 clay 7-5, 58% | adj form 88",
        "modelPct": 23.6,
        "weakness": {
          "name": "Diane Parry",
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
          "gameFlowRead": "Diane Parry has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Amanda Anisimova",
        "ranking": {
          "name": "Amanda Anisimova",
          "rank": 6,
          "points": 5958,
          "age": 24,
          "country": "USA",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/3221/amanda-anisimova",
          "asOf": "2026-05-31"
        },
        "qualityName": "Amanda Anisimova",
        "profile": "Live rank #6 | USA | age 24 | 2026 clay 2-0, 100% | adj form 72",
        "modelPct": 76.4,
        "weakness": {
          "name": "Amanda Anisimova",
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
          "gameFlowRead": "Amanda Anisimova has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-w-aryna-sabalenka-daria-kasatkina-2026-05-30",
    "eventId": "175585",
    "tour": "WTA",
    "title": "Aryna Sabalenka vs Daria Kasatkina",
    "start": "5:30 AM",
    "startMinutes": 330,
    "court": "Court Suzanne-Lenglen",
    "round": "Round 3",
    "pickName": "Aryna Sabalenka",
    "basePickName": "Aryna Sabalenka",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 54.5,
    "volatility": 40,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Watch only",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Opponent-adjusted recent form is basically even: Aryna Sabalenka 88, Daria Kasatkina 86. Lean, not a chase.",
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
        "name": "Aryna Sabalenka",
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
        "pressureMatches": 3,
        "matchesWithStats": 0,
        "weaknessScore": 0,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Aryna Sabalenka has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Daria Kasatkina",
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
        "gameFlowRead": "Daria Kasatkina has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Aryna Sabalenka",
        "confidence": 72,
        "modelPct": 54.5,
        "label": "Live to win a set"
      },
      {
        "name": "Daria Kasatkina",
        "confidence": 60,
        "modelPct": 45.5,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Aryna Sabalenka",
        "americanOdds": -1450,
        "modelPct": 54.5,
        "impliedPct": 93.5,
        "edgePct": -39,
        "evPer100": -41.7,
        "netEvPer100": -43.7,
        "feePer100": 2,
        "valueIssue": "Favorite tax trap",
        "valueGrade": "Favorite tax trap",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Aryna Sabalenka",
        "line": -6.5,
        "americanOdds": -116,
        "modelPct": 45,
        "impliedPct": 53.7,
        "edgePct": -8.7,
        "evPer100": -16.2,
        "netEvPer100": -18.2,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 18.5,
        "americanOdds": 100,
        "expectedGames": 24.2,
        "modelPct": 70,
        "impliedPct": 50,
        "edgePct": 20,
        "evPer100": 40,
        "netEvPer100": 38,
        "feePer100": 2,
        "valueIssue": "Total watch only",
        "valueGrade": "Watch only",
        "reason": "Expected match games 24.2 vs FanDuel 18.5; Over. hold avg N/A, return games won N/A, first-set sample 9.9g, 36 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Pass first-set total pre-match; only play over after Kasatkina shows hold stability.",
        "line": null,
        "americanOdds": null,
        "expectedGames": 8.9,
        "confidence": 51,
        "tiebreakRisk": 0.04,
        "earlyBreakRisk": 0.68,
        "modelPct": 51,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Thin",
        "reason": "Pass first-set total pre-match; only play over after Kasatkina shows hold stability.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Aryna Sabalenka",
          "confidence": 72,
          "modelPct": 54.5,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Daria Kasatkina",
          "confidence": 60,
          "modelPct": 45.5,
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
          "name": "Aryna Sabalenka",
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
            "completedMatches": 8,
            "setSamples": 19,
            "firstSetSamples": 8,
            "avgFirstSetGames": 9.75,
            "avgSetGames": 9.526315789473685,
            "avgMatchGames": 22.625,
            "avgSetsPlayed": 2.375,
            "tiebreakRate": 0.10526315789473684,
            "extendedSetRate": 0.2631578947368421,
            "shortSetRate": 0.42105263157894735
          }
        },
        {
          "name": "Daria Kasatkina",
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
            "completedMatches": 8,
            "setSamples": 17,
            "firstSetSamples": 8,
            "avgFirstSetGames": 10.125,
            "avgSetGames": 9.588235294117647,
            "avgMatchGames": 20.375,
            "avgSetsPlayed": 2.125,
            "tiebreakRate": 0.11764705882352941,
            "extendedSetRate": 0.23529411764705882,
            "shortSetRate": 0.29411764705882354
          }
        }
      ],
      "expectedFirstSetGames": 10.1,
      "expectedMatchGames": 24.2,
      "signalStrength": 4,
      "holdAvg": null,
      "returnGamesAvg": null,
      "returnPointsAvg": null,
      "setSamples": 36,
      "firstSetSamples": 16,
      "avgFirstSetGames": 9.9,
      "avgSetGames": 9.6,
      "tiebreakRate": 11.1,
      "extendedSetRate": 24.9,
      "shortSetRate": 35.8,
      "reasonCore": "hold avg N/A, return games won N/A, first-set sample 9.9g, 36 recent sets"
    },
    "derivativeCase": {
      "date": "2026-05-30",
      "matchId": "rg-w-aryna-sabalenka-daria-kasatkina-2026-05-30",
      "match": "Aryna Sabalenka vs Daria Kasatkina",
      "start": "3:30 AM",
      "expectedMatchGames": 19.2,
      "expectedFirstSetGames": 8.9,
      "totalGames": {
        "postedLine": 18.5,
        "overOdds": 100,
        "underOdds": -134,
        "lean": "Over",
        "edgeGames": 0.7,
        "confidence": 52,
        "grade": "thin",
        "reason": "Kasatkina has the return craft to create a games pocket, but her first-set collapse risk keeps this from being clean."
      },
      "gameHandicap": {
        "selection": "Daria Kasatkina",
        "postedSpread": 6.5,
        "odds": -116,
        "projectedMarginGames": 6.2,
        "edgeGames": 0.3,
        "confidence": 51,
        "grade": "pass",
        "reason": "Kasatkina +6.5 has a path only if she avoids a 6-1/6-0 set. The spread is too exposed to one bad service patch."
      },
      "firstSet": {
        "expectedGames": 8.9,
        "lean": "Pass first-set total pre-match; only play over after Kasatkina shows hold stability.",
        "tiebreakRisk": 0.04,
        "earlyBreakRisk": 0.68,
        "confidence": 51
      },
      "writeup": {
        "headline": "Aryna Sabalenka vs Daria Kasatkina: derivative lane before ML.",
        "betPlan": "No blind bet; use the listed lane only at a good number.",
        "whyItWorks": [
          "Kasatkina +6.5 has a path only if she avoids a 6-1/6-0 set. The spread is too exposed to one bad service patch.",
          null,
          "The matrix separates likely winner from the market that actually pays."
        ],
        "whyItFails": [
          "One-sided first-set breaks can wreck spread and total projections quickly.",
          "If early service games contradict the projected hold/return shape, downgrade before adding exposure."
        ],
        "entryExit": {
          "preMatch": "Over total edge +0.7 games; spread edge +0.3 games.",
          "live": "Pass first-set total pre-match; only play over after Kasatkina shows hold stability."
        }
      },
      "evidence": [
        "FanDuel total 18.5 captured.",
        "FanDuel handicap captured for Daria Kasatkina.",
        "Model match confidence 65% with volatility 40%.",
        "Set-win projections: Aryna Sabalenka 77% / Daria Kasatkina 49%."
      ],
      "dataQuality": {
        "fanDuelTotalCaptured": true,
        "fanDuelSpreadCaptured": true,
        "warehouseRowsUsed": 2,
        "replayRowsUsed": 0,
        "status": "complete"
      }
    },
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Aryna Sabalenka",
        "line": null,
        "americanOdds": -1450,
        "modelPct": 54.5,
        "impliedPct": 93.5,
        "edgePct": -39,
        "evPer100": -41.7,
        "netEvPer100": -43.7,
        "grade": "Favorite tax trap",
        "issue": "Favorite tax trap",
        "reason": "Likely winner can still be a bad ML bet after payout and fees. Check spread, total, and set-win instead."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Daria Kasatkina",
        "line": 6.5,
        "americanOdds": -116,
        "modelPct": 45,
        "impliedPct": 53.7,
        "edgePct": -8.7,
        "evPer100": -16.2,
        "netEvPer100": -18.2,
        "expectedGames": 6.2,
        "edgeGames": 0.3,
        "confidence": 51,
        "grade": "pass",
        "reason": "Kasatkina +6.5 has a path only if she avoids a 6-1/6-0 set. The spread is too exposed to one bad service patch."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "Over",
        "line": 18.5,
        "americanOdds": 100,
        "modelPct": 70,
        "impliedPct": 50,
        "edgePct": 20,
        "evPer100": 40,
        "netEvPer100": 38,
        "expectedGames": 19.2,
        "edgeGames": 0.7,
        "confidence": 52,
        "grade": "thin",
        "reason": "Kasatkina has the return craft to create a games pocket, but her first-set collapse risk keeps this from being clean."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Aryna Sabalenka 72% / Daria Kasatkina 60%",
        "rows": [
          {
            "name": "Aryna Sabalenka",
            "confidence": 72,
            "modelPct": 54.5,
            "label": "Live to win a set"
          },
          {
            "name": "Daria Kasatkina",
            "confidence": 60,
            "modelPct": 45.5,
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
        "selection": "Pass first-set total pre-match; only play over after Kasatkina shows hold stability.",
        "expectedGames": 8.9,
        "confidence": 51,
        "tiebreakRisk": 0.04,
        "earlyBreakRisk": 0.68,
        "grade": "Thin",
        "reason": "Pass first-set total pre-match; only play over after Kasatkina shows hold stability."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Daria Kasatkina",
      "opponent": "Aryna Sabalenka",
      "grade": "Outlier hold",
      "riskGate": "error-control risk, hold risk, closeout risk",
      "marketOdds": 762,
      "fairOdds": 120,
      "modelProbability": 45.5,
      "dataOnlyProbability": 54,
      "marketProbability": 11.6,
      "marketDisagreementPct": 33.9,
      "netEvPer100": 290.6,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Daria Kasatkina is priced below the model, not guaranteed to win.",
      "useCase": "Straight ML value only at +762 or better; fair price from the ensemble is about +120.",
      "bullets": [],
      "risks": [
        "Desk lean still has Aryna Sabalenka; this is a price-dislocation play, not the safest winner.",
        "Market still prices Daria Kasatkina as a real underdog at 11.6% implied."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page browser scrape",
      "capturedAt": "2026-05-30T04:26:44.126Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/aryna-sabalenka-v-daria-kasatkina-35661462",
      "players": [
        {
          "name": "Aryna Sabalenka",
          "odds": -1450,
          "americanLabel": "-1450",
          "impliedPct": 93.5,
          "decimalOdds": 1.069,
          "modelPct": 54.5,
          "edgePct": -39,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 6.9,
          "grossPayoutMultiple": 1.069,
          "centsAtRisk": 100,
          "centsProfitIfWin": 6.9
        },
        {
          "name": "Daria Kasatkina",
          "odds": 810,
          "americanLabel": "+810",
          "impliedPct": 11,
          "decimalOdds": 9.1,
          "modelPct": 45.5,
          "edgePct": 34.5,
          "priceBand": "Underdog",
          "grossProfitPct": 810,
          "grossPayoutMultiple": 9.1,
          "centsAtRisk": 100,
          "centsProfitIfWin": 810
        }
      ],
      "desk": {
        "name": "Aryna Sabalenka",
        "odds": -1450,
        "americanLabel": "-1450",
        "impliedPct": 93.5,
        "decimalOdds": 1.069,
        "modelPct": 54.5,
        "edgePct": -39,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 6.9,
        "grossPayoutMultiple": 1.069,
        "centsAtRisk": 100,
        "centsProfitIfWin": 6.9
      },
      "spread": {
        "player": "Aryna Sabalenka",
        "spread": -6.5,
        "odds": -116
      },
      "total": {
        "side": "Over",
        "line": 18.5,
        "odds": 100
      },
      "totalOver": {
        "side": "Over",
        "line": 18.5,
        "odds": 100
      },
      "totalUnder": {
        "side": "Under",
        "line": 18.5,
        "odds": -134
      },
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "Aryna Sabalenka -6.5 (-116)",
      "totalValue": "18.5 games: Over +100 / Under -134",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "Large game spread; ML may be cleaner than laying games",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Aryna Sabalenka -1450 / Daria Kasatkina +810",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 54.5% vs FanDuel implied 93.5% (-39 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Aryna-Sabalenka-Vs-Daria-Kasatkina/",
    "players": [
      {
        "name": "Aryna Sabalenka",
        "ranking": {
          "name": "Aryna Sabalenka",
          "rank": 1,
          "points": 9960,
          "age": 28,
          "country": "Belarus",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/3038/aryna-sabalenka",
          "asOf": "2026-05-31"
        },
        "qualityName": "Aryna Sabalenka",
        "profile": "Live rank #1 | Belarus | age 28 | 2026 clay 6-2, 75% | adj form 88",
        "modelPct": 54.5,
        "weakness": {
          "name": "Aryna Sabalenka",
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
          "pressureMatches": 3,
          "matchesWithStats": 0,
          "weaknessScore": 0,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Aryna Sabalenka has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Daria Kasatkina",
        "ranking": {
          "name": "Daria Kasatkina",
          "rank": 53,
          "points": 1119,
          "age": 29,
          "country": "Australia",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/2191/daria-kasatkina",
          "asOf": "2026-05-31"
        },
        "qualityName": "Daria Kasatkina",
        "profile": "Live rank #53 | Australia | age 29 | 2026 clay 11-4, 73% | adj form 86",
        "modelPct": 45.5,
        "weakness": {
          "name": "Daria Kasatkina",
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
          "gameFlowRead": "Daria Kasatkina has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-w-anna-kalinskaya-camila-osorio-2026-05-30",
    "eventId": "175533",
    "tour": "WTA",
    "title": "Anna Kalinskaya vs Camila Osorio",
    "start": "5:35 AM",
    "startMinutes": 335,
    "court": "Court 14",
    "round": "Round 3",
    "pickName": "Camila Osorio",
    "basePickName": "Anna Kalinskaya",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": true,
    "confidence": 55,
    "volatility": 55,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Watch only",
      "Model split - pass ML",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Camila Osorio has the cleaner composite of rank, clay record, and recent opponent quality. Lean, not a chase.",
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
      },
      "opponent": {
        "name": "Anna Kalinskaya",
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
        "gameFlowRead": "Anna Kalinskaya has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Anna Kalinskaya",
        "confidence": 62,
        "modelPct": 45,
        "label": "Needs early hold pressure"
      },
      {
        "name": "Camila Osorio",
        "confidence": 73,
        "modelPct": 55,
        "label": "Live to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Camila Osorio",
        "americanOdds": -102,
        "modelPct": 55,
        "impliedPct": 50.5,
        "edgePct": 4.5,
        "evPer100": 8.9,
        "netEvPer100": 6.9,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Favorite price needs better proof",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Camila Osorio",
        "line": 0.5,
        "americanOdds": -116,
        "modelPct": 49,
        "impliedPct": 53.7,
        "edgePct": -4.7,
        "evPer100": -8.8,
        "netEvPer100": -10.8,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 21.5,
        "americanOdds": -126,
        "expectedGames": 22.4,
        "modelPct": 54,
        "impliedPct": 55.8,
        "edgePct": -1.8,
        "evPer100": -3.1,
        "netEvPer100": -5.1,
        "feePer100": 2,
        "valueIssue": "Total watch only",
        "valueGrade": "Near fair",
        "reason": "Expected match games 22.4 vs FanDuel 21.5; Over. hold avg N/A, return games won N/A, first-set sample N/A, 0 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Over 9.5 if both players hold once; pass after an immediate one-way break.",
        "line": null,
        "americanOdds": null,
        "expectedGames": 10,
        "confidence": 54,
        "tiebreakRisk": 0.11,
        "earlyBreakRisk": 0.45,
        "modelPct": 54,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Thin",
        "reason": "Over 9.5 if both players hold once; pass after an immediate one-way break.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Anna Kalinskaya",
          "confidence": 62,
          "modelPct": 45,
          "label": "Needs early hold pressure",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Camila Osorio",
          "confidence": 73,
          "modelPct": 55,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": {
      "profiles": [
        {
          "name": "Anna Kalinskaya",
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
          "name": "Camila Osorio",
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
      "expectedFirstSetGames": 9.4,
      "expectedMatchGames": 22.4,
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
    "derivativeCase": {
      "date": "2026-05-30",
      "matchId": "rg-w-anna-kalinskaya-camila-osorio-2026-05-30",
      "match": "Anna Kalinskaya vs Camila Osorio",
      "start": "4:00 AM",
      "expectedMatchGames": 22.6,
      "expectedFirstSetGames": 10,
      "totalGames": {
        "postedLine": 21.5,
        "overOdds": -126,
        "underOdds": -106,
        "lean": "Over",
        "edgeGames": 1.1,
        "confidence": 55,
        "grade": "watch",
        "reason": "Near-pickem ML pricing plus WTA break-back volatility makes the total more useful than choosing a winner."
      },
      "gameHandicap": {
        "selection": "Camila Osorio",
        "postedSpread": 0.5,
        "odds": -116,
        "projectedMarginGames": 0.1,
        "edgeGames": 0.6,
        "confidence": 52,
        "grade": "thin",
        "reason": "Kalinskaya is only a tiny model lean, so Osorio +0.5 has the slightly better risk shape."
      },
      "firstSet": {
        "expectedGames": 10,
        "lean": "Over 9.5 if both players hold once; pass after an immediate one-way break.",
        "tiebreakRisk": 0.11,
        "earlyBreakRisk": 0.45,
        "confidence": 54
      },
      "writeup": {
        "headline": "Anna Kalinskaya vs Camila Osorio: derivative lane before ML.",
        "betPlan": "No blind bet; use the listed lane only at a good number.",
        "whyItWorks": [
          "Kalinskaya is only a tiny model lean, so Osorio +0.5 has the slightly better risk shape.",
          null,
          "The matrix separates likely winner from the market that actually pays."
        ],
        "whyItFails": [
          "One-sided first-set breaks can wreck spread and total projections quickly.",
          "If early service games contradict the projected hold/return shape, downgrade before adding exposure."
        ],
        "entryExit": {
          "preMatch": "Over total edge +1.1 games; spread edge +0.6 games.",
          "live": "Over 9.5 if both players hold once; pass after an immediate one-way break."
        }
      },
      "evidence": [
        "FanDuel total 21.5 captured.",
        "FanDuel handicap captured for Camila Osorio.",
        "Model match confidence 54% with volatility 55%.",
        "Set-win projections: Anna Kalinskaya 72% / Camila Osorio 63%."
      ],
      "dataQuality": {
        "fanDuelTotalCaptured": true,
        "fanDuelSpreadCaptured": true,
        "warehouseRowsUsed": 2,
        "replayRowsUsed": 0,
        "status": "complete"
      }
    },
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Camila Osorio",
        "line": null,
        "americanOdds": -102,
        "modelPct": 55,
        "impliedPct": 50.5,
        "edgePct": 4.5,
        "evPer100": 8.9,
        "netEvPer100": 6.9,
        "grade": "Favorite price needs better proof",
        "issue": "Favorite price needs better proof",
        "reason": "ML is close to fair; derivative or live entry needs to carry the edge."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Camila Osorio",
        "line": 0.5,
        "americanOdds": -116,
        "modelPct": 49,
        "impliedPct": 53.7,
        "edgePct": -4.7,
        "evPer100": -8.8,
        "netEvPer100": -10.8,
        "expectedGames": 0.1,
        "edgeGames": 0.6,
        "confidence": 52,
        "grade": "thin",
        "reason": "Kalinskaya is only a tiny model lean, so Osorio +0.5 has the slightly better risk shape."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "Over",
        "line": 21.5,
        "americanOdds": -126,
        "modelPct": 54,
        "impliedPct": 55.8,
        "edgePct": -1.8,
        "evPer100": -3.1,
        "netEvPer100": -5.1,
        "expectedGames": 22.6,
        "edgeGames": 1.1,
        "confidence": 55,
        "grade": "watch",
        "reason": "Near-pickem ML pricing plus WTA break-back volatility makes the total more useful than choosing a winner."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Anna Kalinskaya 62% / Camila Osorio 73%",
        "rows": [
          {
            "name": "Anna Kalinskaya",
            "confidence": 62,
            "modelPct": 45,
            "label": "Needs early hold pressure"
          },
          {
            "name": "Camila Osorio",
            "confidence": 73,
            "modelPct": 55,
            "label": "Live to win a set"
          }
        ],
        "confidence": 73,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Over 9.5 if both players hold once; pass after an immediate one-way break.",
        "expectedGames": 10,
        "confidence": 54,
        "tiebreakRisk": 0.11,
        "earlyBreakRisk": 0.45,
        "grade": "Thin",
        "reason": "Over 9.5 if both players hold once; pass after an immediate one-way break."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Camila Osorio",
      "opponent": "Anna Kalinskaya",
      "grade": "Watch only",
      "riskGate": "clean enough",
      "marketOdds": -102,
      "fairOdds": -122,
      "modelProbability": 55,
      "dataOnlyProbability": 58.2,
      "marketProbability": 50.5,
      "marketDisagreementPct": 4.5,
      "netEvPer100": 6.9,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Camila Osorio is priced below the model, not guaranteed to win.",
      "useCase": "Favorite price needs cleaner proof or derivative value; do not confuse win probability with bet value.",
      "bullets": [],
      "risks": [
        "Risk is mostly normal tennis variance; do not size this like a lock."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page browser scrape",
      "capturedAt": "2026-05-30T04:26:47.341Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/anna-kalinskaya-v-camila-osorio-35661205",
      "players": [
        {
          "name": "Anna Kalinskaya",
          "odds": -118,
          "americanLabel": "-118",
          "impliedPct": 54.1,
          "decimalOdds": 1.847,
          "modelPct": 45,
          "edgePct": -9.1,
          "priceBand": "Coinflip",
          "grossProfitPct": 84.7,
          "grossPayoutMultiple": 1.847,
          "centsAtRisk": 100,
          "centsProfitIfWin": 84.7
        },
        {
          "name": "Camila Osorio",
          "odds": -102,
          "americanLabel": "-102",
          "impliedPct": 50.5,
          "decimalOdds": 1.98,
          "modelPct": 55,
          "edgePct": 4.5,
          "priceBand": "Coinflip",
          "grossProfitPct": 98,
          "grossPayoutMultiple": 1.98,
          "centsAtRisk": 100,
          "centsProfitIfWin": 98
        }
      ],
      "desk": {
        "name": "Camila Osorio",
        "odds": -102,
        "americanLabel": "-102",
        "impliedPct": 50.5,
        "decimalOdds": 1.98,
        "modelPct": 55,
        "edgePct": 4.5,
        "priceBand": "Coinflip",
        "grossProfitPct": 98,
        "grossPayoutMultiple": 1.98,
        "centsAtRisk": 100,
        "centsProfitIfWin": 98
      },
      "spread": {
        "player": "Camila Osorio",
        "spread": 0.5,
        "odds": -116
      },
      "total": {
        "side": "Over",
        "line": 21.5,
        "odds": -126
      },
      "totalOver": {
        "side": "Over",
        "line": 21.5,
        "odds": -126
      },
      "totalUnder": {
        "side": "Under",
        "line": 21.5,
        "odds": -106
      },
      "priceAction": "ML is close to fair; derivative or live entry needs to carry the edge.",
      "spreadValue": "Camila Osorio +0.5 (-116)",
      "totalValue": "21.5 games: Over -126 / Under -106",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Anna Kalinskaya -118 / Camila Osorio -102",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. ML is close to fair; derivative or live entry needs to carry the edge.",
      "noVigNote": "Model 55% vs FanDuel implied 50.5% (+4.5 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Anna-Kalinskaya-Vs-Camila-Osorio/",
    "players": [
      {
        "name": "Anna Kalinskaya",
        "ranking": {
          "name": "Anna Kalinskaya",
          "rank": 24,
          "points": 1792,
          "age": 27,
          "country": "Russia",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/2977/anna-kalinskaya",
          "asOf": "2026-05-31"
        },
        "qualityName": null,
        "profile": "Live rank #24 | Russia | age 27",
        "modelPct": 45,
        "weakness": {
          "name": "Anna Kalinskaya",
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
          "gameFlowRead": "Anna Kalinskaya has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Camila Osorio",
        "ranking": {
          "name": "Camila Osorio",
          "rank": 86,
          "points": 868,
          "age": 24,
          "country": "Colombia",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/3404/camila-osorio",
          "asOf": "2026-05-31"
        },
        "qualityName": null,
        "profile": "Live rank #86 | Colombia | age 24",
        "modelPct": 55,
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
    "id": "rg-m-moise-kouame-alejandro-tabilo-2026-05-30",
    "eventId": "175744",
    "tour": "ATP",
    "title": "Moise Kouame vs Alejandro Tabilo",
    "start": "7:15 AM",
    "startMinutes": 435,
    "court": "Court Suzanne-Lenglen",
    "round": "Round 3",
    "pickName": "Alejandro Tabilo",
    "basePickName": "Alejandro Tabilo",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 65.4,
    "volatility": 40,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Lean",
      "No blind bet",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Moise Kouame grades 11 points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price. Lean, not a chase.",
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
        "name": "Alejandro Tabilo",
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
        "gameFlowRead": "Alejandro Tabilo has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Moise Kouame",
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
        "pressureMatches": 5,
        "matchesWithStats": 0,
        "weaknessScore": 3,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Moise Kouame has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Moise Kouame",
        "confidence": 64,
        "modelPct": 34.6,
        "label": "Needs early hold pressure"
      },
      {
        "name": "Alejandro Tabilo",
        "confidence": 88,
        "modelPct": 65.4,
        "label": "Strong set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Alejandro Tabilo",
        "americanOdds": -520,
        "modelPct": 65.4,
        "impliedPct": 83.9,
        "edgePct": -18.5,
        "evPer100": -22,
        "netEvPer100": -24,
        "feePer100": 2,
        "valueIssue": "Favorite tax trap",
        "valueGrade": "Favorite tax trap",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Alejandro Tabilo",
        "line": -6.5,
        "americanOdds": -128,
        "modelPct": 55,
        "impliedPct": 56.1,
        "edgePct": -1.1,
        "evPer100": -2,
        "netEvPer100": -4,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Near fair",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Under",
        "line": 34.5,
        "americanOdds": -120,
        "expectedGames": 33.2,
        "modelPct": 58,
        "impliedPct": 54.5,
        "edgePct": 3.5,
        "evPer100": 6.3,
        "netEvPer100": 4.3,
        "feePer100": 2,
        "valueIssue": "Total watch only",
        "valueGrade": "Raw positive EV",
        "reason": "Expected match games 33.2 vs FanDuel 34.5; Under. hold avg N/A, return games won N/A, first-set sample 8.9g, 39 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Over 9.5 only if Kouame holds his first service game.",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.7,
        "confidence": 54,
        "tiebreakRisk": 0.1,
        "earlyBreakRisk": 0.48,
        "modelPct": 54,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Thin",
        "reason": "Over 9.5 only if Kouame holds his first service game.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Moise Kouame",
          "confidence": 64,
          "modelPct": 34.6,
          "label": "Needs early hold pressure",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Alejandro Tabilo",
          "confidence": 88,
          "modelPct": 65.4,
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
          "name": "Moise Kouame",
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
          "weaknessScore": 3,
          "weakServeMatches": 0,
          "statMatches": 0,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 22,
            "firstSetSamples": 8,
            "avgFirstSetGames": 8.875,
            "avgSetGames": 9.136363636363637,
            "avgMatchGames": 25.125,
            "avgSetsPlayed": 2.75,
            "tiebreakRate": 0.13636363636363635,
            "extendedSetRate": 0.18181818181818182,
            "shortSetRate": 0.45454545454545453
          }
        },
        {
          "name": "Alejandro Tabilo",
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
          "weaknessScore": 2,
          "weakServeMatches": 0,
          "statMatches": 0,
          "setShape": {
            "completedMatches": 7,
            "setSamples": 17,
            "firstSetSamples": 7,
            "avgFirstSetGames": 9,
            "avgSetGames": 9.058823529411764,
            "avgMatchGames": 22,
            "avgSetsPlayed": 2.4285714285714284,
            "tiebreakRate": 0.058823529411764705,
            "extendedSetRate": 0.11764705882352941,
            "shortSetRate": 0.35294117647058826
          }
        }
      ],
      "expectedFirstSetGames": 9,
      "expectedMatchGames": 33.2,
      "signalStrength": 4,
      "holdAvg": null,
      "returnGamesAvg": null,
      "returnPointsAvg": null,
      "setSamples": 39,
      "firstSetSamples": 15,
      "avgFirstSetGames": 8.9,
      "avgSetGames": 9.1,
      "tiebreakRate": 9.8,
      "extendedSetRate": 15,
      "shortSetRate": 40.4,
      "reasonCore": "hold avg N/A, return games won N/A, first-set sample 8.9g, 39 recent sets"
    },
    "derivativeCase": {
      "date": "2026-05-30",
      "matchId": "rg-m-moise-kouame-alejandro-tabilo-2026-05-30",
      "match": "Moise Kouame vs Alejandro Tabilo",
      "start": "5:00 AM",
      "expectedMatchGames": 36,
      "expectedFirstSetGames": 9.7,
      "totalGames": {
        "postedLine": 34.5,
        "overOdds": -110,
        "underOdds": -120,
        "lean": "Over",
        "edgeGames": 1.5,
        "confidence": 56,
        "grade": "watch",
        "reason": "Tabilo is the stronger side, but Kouame set-win pressure and home/young-player volatility point away from a quick total."
      },
      "gameHandicap": {
        "selection": "Moise Kouame",
        "postedSpread": 6.5,
        "odds": -104,
        "projectedMarginGames": 5.2,
        "edgeGames": 1.3,
        "confidence": 55,
        "grade": "watch",
        "reason": "Kouame +6.5 has room if he produces one extended set; Tabilo ML is too expensive."
      },
      "firstSet": {
        "expectedGames": 9.7,
        "lean": "Over 9.5 only if Kouame holds his first service game.",
        "tiebreakRisk": 0.1,
        "earlyBreakRisk": 0.48,
        "confidence": 54
      },
      "writeup": {
        "headline": "Moise Kouame vs Alejandro Tabilo: derivative lane before ML.",
        "betPlan": "No blind bet; use the listed lane only at a good number.",
        "whyItWorks": [
          "Kouame +6.5 has room if he produces one extended set; Tabilo ML is too expensive.",
          null,
          "The matrix separates likely winner from the market that actually pays."
        ],
        "whyItFails": [
          "One-sided first-set breaks can wreck spread and total projections quickly.",
          "If early service games contradict the projected hold/return shape, downgrade before adding exposure."
        ],
        "entryExit": {
          "preMatch": "Over total edge +1.5 games; spread edge +1.3 games.",
          "live": "Over 9.5 only if Kouame holds his first service game."
        }
      },
      "evidence": [
        "FanDuel total 34.5 captured.",
        "FanDuel handicap captured for Moise Kouame.",
        "Model match confidence 61% with volatility 40%.",
        "Set-win projections: Moise Kouame 68% / Alejandro Tabilo 87%."
      ],
      "dataQuality": {
        "fanDuelTotalCaptured": true,
        "fanDuelSpreadCaptured": true,
        "warehouseRowsUsed": 2,
        "replayRowsUsed": 0,
        "status": "complete"
      }
    },
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Alejandro Tabilo",
        "line": null,
        "americanOdds": -520,
        "modelPct": 65.4,
        "impliedPct": 83.9,
        "edgePct": -18.5,
        "evPer100": -22,
        "netEvPer100": -24,
        "grade": "Favorite tax trap",
        "issue": "Favorite tax trap",
        "reason": "Likely winner can still be a bad ML bet after payout and fees. Check spread, total, and set-win instead."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Moise Kouame",
        "line": 6.5,
        "americanOdds": -104,
        "modelPct": 55,
        "impliedPct": 56.1,
        "edgePct": -1.1,
        "evPer100": -2,
        "netEvPer100": -4,
        "expectedGames": 5.2,
        "edgeGames": 1.3,
        "confidence": 55,
        "grade": "watch",
        "reason": "Kouame +6.5 has room if he produces one extended set; Tabilo ML is too expensive."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "Over",
        "line": 34.5,
        "americanOdds": -110,
        "modelPct": 58,
        "impliedPct": 54.5,
        "edgePct": 3.5,
        "evPer100": 6.3,
        "netEvPer100": 4.3,
        "expectedGames": 36,
        "edgeGames": 1.5,
        "confidence": 56,
        "grade": "watch",
        "reason": "Tabilo is the stronger side, but Kouame set-win pressure and home/young-player volatility point away from a quick total."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Moise Kouame 64% / Alejandro Tabilo 88%",
        "rows": [
          {
            "name": "Moise Kouame",
            "confidence": 64,
            "modelPct": 34.6,
            "label": "Needs early hold pressure"
          },
          {
            "name": "Alejandro Tabilo",
            "confidence": 88,
            "modelPct": 65.4,
            "label": "Strong set-win path"
          }
        ],
        "confidence": 88,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Over 9.5 only if Kouame holds his first service game.",
        "expectedGames": 9.7,
        "confidence": 54,
        "tiebreakRisk": 0.1,
        "earlyBreakRisk": 0.48,
        "grade": "Thin",
        "reason": "Over 9.5 only if Kouame holds his first service game."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Moise Kouame",
      "opponent": "Alejandro Tabilo",
      "grade": "Watch only",
      "riskGate": "hold risk, closeout risk",
      "marketOdds": 365,
      "fairOdds": 189,
      "modelProbability": 34.6,
      "dataOnlyProbability": 39,
      "marketProbability": 21.5,
      "marketDisagreementPct": 13.1,
      "netEvPer100": 59,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Moise Kouame is priced below the model, not guaranteed to win.",
      "useCase": "Straight ML value only at +365 or better; fair price from the ensemble is about +189.",
      "bullets": [],
      "risks": [
        "Desk lean still has Alejandro Tabilo; this is a price-dislocation play, not the safest winner.",
        "Market still prices Moise Kouame as a real underdog at 21.5% implied."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page browser scrape",
      "capturedAt": "2026-05-30T04:26:59.591Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/moise-kouame-v-alejandro-tabilo-35660500",
      "players": [
        {
          "name": "Moise Kouame",
          "odds": 390,
          "americanLabel": "+390",
          "impliedPct": 20.4,
          "decimalOdds": 4.9,
          "modelPct": 34.6,
          "edgePct": 14.2,
          "priceBand": "Underdog",
          "grossProfitPct": 390,
          "grossPayoutMultiple": 4.9,
          "centsAtRisk": 100,
          "centsProfitIfWin": 390
        },
        {
          "name": "Alejandro Tabilo",
          "odds": -520,
          "americanLabel": "-520",
          "impliedPct": 83.9,
          "decimalOdds": 1.192,
          "modelPct": 65.4,
          "edgePct": -18.5,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 19.2,
          "grossPayoutMultiple": 1.192,
          "centsAtRisk": 100,
          "centsProfitIfWin": 19.2
        }
      ],
      "desk": {
        "name": "Alejandro Tabilo",
        "odds": -520,
        "americanLabel": "-520",
        "impliedPct": 83.9,
        "decimalOdds": 1.192,
        "modelPct": 65.4,
        "edgePct": -18.5,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 19.2,
        "grossPayoutMultiple": 1.192,
        "centsAtRisk": 100,
        "centsProfitIfWin": 19.2
      },
      "spread": {
        "player": "Alejandro Tabilo",
        "spread": -6.5,
        "odds": -128
      },
      "total": {
        "side": "Over",
        "line": 34.5,
        "odds": -110
      },
      "totalOver": {
        "side": "Over",
        "line": 34.5,
        "odds": -110
      },
      "totalUnder": {
        "side": "Under",
        "line": 34.5,
        "odds": -120
      },
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "Alejandro Tabilo -6.5 (-128)",
      "totalValue": "34.5 games: Over -110 / Under -120",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "Large game spread; ML may be cleaner than laying games",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Moise Kouame +390 / Alejandro Tabilo -520",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 65.4% vs FanDuel implied 83.9% (-18.5 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Moise-Kouame-Vs-Alejandro-Tabilo/",
    "players": [
      {
        "name": "Moise Kouame",
        "ranking": null,
        "qualityName": "Moise Kouame",
        "profile": "Rank not joined | 2026 clay 7-4, 64% | adj form 82",
        "modelPct": 34.6,
        "weakness": {
          "name": "Moise Kouame",
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
          "pressureMatches": 5,
          "matchesWithStats": 0,
          "weaknessScore": 3,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Moise Kouame has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Alejandro Tabilo",
        "ranking": {
          "name": "Alejandro Tabilo",
          "rank": 36,
          "points": 1278,
          "age": 28,
          "country": "Chile",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/2970/alejandro-tabilo",
          "asOf": "2026-05-31"
        },
        "qualityName": "Alejandro Tabilo",
        "profile": "Live rank #36 | Chile | age 28 | 2026 clay 23-9, 72% | adj form 70",
        "modelPct": 65.4,
        "weakness": {
          "name": "Alejandro Tabilo",
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
          "gameFlowRead": "Alejandro Tabilo has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-m-matteo-arnaldi-raphael-collignon-2026-05-30",
    "eventId": "175740",
    "tour": "ATP",
    "title": "Matteo Arnaldi vs Raphael Collignon",
    "start": "8:00 AM",
    "startMinutes": 480,
    "court": "Court 14",
    "round": "Round 3",
    "pickName": "Raphael Collignon",
    "basePickName": "Raphael Collignon",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 58.6,
    "volatility": 43,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Watch only",
      "No blind bet",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Matteo Arnaldi grades 6 points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price. Lean, not a chase.",
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
        "name": "Raphael Collignon",
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
        "pressureMatches": 7,
        "matchesWithStats": 0,
        "weaknessScore": 6,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Raphael Collignon has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Matteo Arnaldi",
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
        "pressureMatches": 7,
        "matchesWithStats": 0,
        "weaknessScore": 6,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Matteo Arnaldi has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Matteo Arnaldi",
        "confidence": 70,
        "modelPct": 41.4,
        "label": "Live to win a set"
      },
      {
        "name": "Raphael Collignon",
        "confidence": 86,
        "modelPct": 58.6,
        "label": "Strong set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Raphael Collignon",
        "americanOdds": -205,
        "modelPct": 58.6,
        "impliedPct": 67.2,
        "edgePct": -8.6,
        "evPer100": -12.8,
        "netEvPer100": -14.8,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": null,
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "line": null,
        "overOdds": null,
        "underOdds": null,
        "expectedGames": 37.6,
        "valueGrade": "No direction",
        "reason": "No posted match total captured.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Over 9.5 if posted; pass 10.5 unless plus money.",
        "line": null,
        "americanOdds": null,
        "expectedGames": 10.2,
        "confidence": 57,
        "tiebreakRisk": 0.16,
        "earlyBreakRisk": 0.39,
        "modelPct": 57,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Thin",
        "reason": "Over 9.5 if posted; pass 10.5 unless plus money.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Matteo Arnaldi",
          "confidence": 70,
          "modelPct": 41.4,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Raphael Collignon",
          "confidence": 86,
          "modelPct": 58.6,
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
          "name": "Matteo Arnaldi",
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
          "weaknessScore": 6,
          "weakServeMatches": 0,
          "statMatches": 0,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 25,
            "firstSetSamples": 8,
            "avgFirstSetGames": 9.75,
            "avgSetGames": 9.88,
            "avgMatchGames": 30.875,
            "avgSetsPlayed": 3.125,
            "tiebreakRate": 0.24,
            "extendedSetRate": 0.28,
            "shortSetRate": 0.2
          }
        },
        {
          "name": "Raphael Collignon",
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
          "weaknessScore": 6,
          "weakServeMatches": 0,
          "statMatches": 0,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 18,
            "firstSetSamples": 8,
            "avgFirstSetGames": 10.75,
            "avgSetGames": 10.61111111111111,
            "avgMatchGames": 23.875,
            "avgSetsPlayed": 2.25,
            "tiebreakRate": 0.3333333333333333,
            "extendedSetRate": 0.5,
            "shortSetRate": 0.2222222222222222
          }
        }
      ],
      "expectedFirstSetGames": 10.6,
      "expectedMatchGames": 37.6,
      "signalStrength": 5,
      "holdAvg": null,
      "returnGamesAvg": null,
      "returnPointsAvg": null,
      "setSamples": 43,
      "firstSetSamples": 16,
      "avgFirstSetGames": 10.3,
      "avgSetGames": 10.2,
      "tiebreakRate": 28.7,
      "extendedSetRate": 39,
      "shortSetRate": 21.1,
      "reasonCore": "hold avg N/A, return games won N/A, first-set sample 10.3g, 43 recent sets"
    },
    "derivativeCase": {
      "date": "2026-05-30",
      "matchId": "rg-m-matteo-arnaldi-raphael-collignon-2026-05-30",
      "match": "Matteo Arnaldi vs Raphael Collignon",
      "start": "5:30 AM",
      "expectedMatchGames": 39.5,
      "expectedFirstSetGames": 10.2,
      "totalGames": {
        "postedLine": null,
        "overOdds": null,
        "underOdds": null,
        "lean": "Over if line is 37.5 or lower; pass 39.5+",
        "edgeGames": null,
        "confidence": 56,
        "grade": "data-incomplete",
        "reason": "No FanDuel total was captured. Both players show strong service indicators and enough resistance profile for a longer best-of-five shape."
      },
      "gameHandicap": {
        "selection": "Raphael Collignon",
        "postedSpread": null,
        "odds": null,
        "projectedMarginGames": 3.8,
        "edgeGames": null,
        "confidence": 54,
        "grade": "data-incomplete",
        "reason": "No FanDuel handicap was captured. Collignon is the winner lean, but Arnaldi's first-serve and break-save profile argues against a blind large spread."
      },
      "firstSet": {
        "expectedGames": 10.2,
        "lean": "Over 9.5 if posted; pass 10.5 unless plus money.",
        "tiebreakRisk": 0.16,
        "earlyBreakRisk": 0.39,
        "confidence": 57
      },
      "writeup": {
        "headline": "Service stability points to a longer men's match.",
        "betPlan": "No pre-match derivative bet without a posted line; look for first-set over or full-match over if the book hangs a low number.",
        "whyItWorks": [
          "Arnaldi has strong tournament first-serve percentage, second-serve points won, and break-point saved numbers.",
          "Collignon has the better winner profile and stronger break conversion, but not enough to assume a rout.",
          "Both have recent resistance profiles that support at least one extended set."
        ],
        "whyItFails": [
          "Collignon could separate if Arnaldi's return pressure stays low.",
          "Arnaldi's underdog price is not attractive enough for a trade-to-sell entry at the captured Kalshi level.",
          "No captured spread or total means this is a projection, not a priced EV row."
        ],
        "entryExit": {
          "preMatch": "Over only if total is 37.5 or lower. First-set over 9.5 is the cleaner derivative if offered.",
          "live": "Upgrade over if the first four service games stay mostly clean; downgrade if Collignon breaks twice before 4-1."
        }
      },
      "evidence": [
        "FanDuel moneyline captured, but no total or handicap captured.",
        "Arnaldi tournament stats: 79.0% first serve, 66.7% second-serve points won, 81.8% break points saved.",
        "Collignon tournament stats: 82.1% first-serve points won and 56.3% break points converted.",
        "Kalshi flow shows Arnaldi resistance, but the 36c entry is too high for a clean trade-to-sell."
      ],
      "dataQuality": {
        "fanDuelTotalCaptured": false,
        "fanDuelSpreadCaptured": false,
        "warehouseRowsUsed": 2,
        "replayRowsUsed": 2,
        "status": "priced-lines-missing"
      }
    },
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Raphael Collignon",
        "line": null,
        "americanOdds": -205,
        "modelPct": 58.6,
        "impliedPct": 67.2,
        "edgePct": -8.6,
        "evPer100": -12.8,
        "netEvPer100": -14.8,
        "grade": "Negative EV",
        "issue": "Favorite price needs better proof",
        "reason": "FanDuel price is richer than the model; pass ML unless live state improves."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Raphael Collignon",
        "line": null,
        "americanOdds": null,
        "modelPct": null,
        "impliedPct": null,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "expectedGames": 3.8,
        "edgeGames": null,
        "confidence": 54,
        "grade": "data-incomplete",
        "reason": "No FanDuel handicap was captured. Collignon is the winner lean, but Arnaldi's first-serve and break-save profile argues against a blind large spread."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "Over if line is 37.5 or lower; pass 39.5+",
        "line": null,
        "americanOdds": null,
        "modelPct": 56,
        "impliedPct": null,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "expectedGames": 39.5,
        "edgeGames": null,
        "confidence": 56,
        "grade": "data-incomplete",
        "reason": "No FanDuel total was captured. Both players show strong service indicators and enough resistance profile for a longer best-of-five shape."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Matteo Arnaldi 70% / Raphael Collignon 86%",
        "rows": [
          {
            "name": "Matteo Arnaldi",
            "confidence": 70,
            "modelPct": 41.4,
            "label": "Live to win a set"
          },
          {
            "name": "Raphael Collignon",
            "confidence": 86,
            "modelPct": 58.6,
            "label": "Strong set-win path"
          }
        ],
        "confidence": 86,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Over 9.5 if posted; pass 10.5 unless plus money.",
        "expectedGames": 10.2,
        "confidence": 57,
        "tiebreakRisk": 0.16,
        "earlyBreakRisk": 0.39,
        "grade": "Thin",
        "reason": "Over 9.5 if posted; pass 10.5 unless plus money."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Matteo Arnaldi",
      "opponent": "Raphael Collignon",
      "grade": "Watch only",
      "riskGate": "clean enough",
      "marketOdds": 172,
      "fairOdds": 142,
      "modelProbability": 41.4,
      "dataOnlyProbability": 43.9,
      "marketProbability": 36.8,
      "marketDisagreementPct": 4.6,
      "netEvPer100": 10.6,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Matteo Arnaldi is priced below the model, not guaranteed to win.",
      "useCase": "Straight ML value only at +172 or better; fair price from the ensemble is about +142.",
      "bullets": [],
      "risks": [
        "Desk lean still has Raphael Collignon; this is a price-dislocation play, not the safest winner."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page browser scrape",
      "capturedAt": "2026-05-30T04:27:01.715Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/matteo-arnaldi-v-raphael-collignon-35661715",
      "players": [
        {
          "name": "Matteo Arnaldi",
          "odds": 172,
          "americanLabel": "+172",
          "impliedPct": 36.8,
          "decimalOdds": 2.72,
          "modelPct": 41.4,
          "edgePct": 4.6,
          "priceBand": "Underdog",
          "grossProfitPct": 172,
          "grossPayoutMultiple": 2.72,
          "centsAtRisk": 100,
          "centsProfitIfWin": 172
        },
        {
          "name": "Raphael Collignon",
          "odds": -205,
          "americanLabel": "-205",
          "impliedPct": 67.2,
          "decimalOdds": 1.488,
          "modelPct": 58.6,
          "edgePct": -8.6,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 48.8,
          "grossPayoutMultiple": 1.488,
          "centsAtRisk": 100,
          "centsProfitIfWin": 48.8
        }
      ],
      "desk": {
        "name": "Raphael Collignon",
        "odds": -205,
        "americanLabel": "-205",
        "impliedPct": 67.2,
        "decimalOdds": 1.488,
        "modelPct": 58.6,
        "edgePct": -8.6,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 48.8,
        "grossPayoutMultiple": 1.488,
        "centsAtRisk": 100,
        "centsProfitIfWin": 48.8
      },
      "spread": null,
      "priceAction": "FanDuel price is richer than the model; pass ML unless live state improves.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Matteo Arnaldi +172 / Raphael Collignon -205",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. FanDuel price is richer than the model; pass ML unless live state improves.",
      "noVigNote": "Model 58.6% vs FanDuel implied 67.2% (-8.6 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Matteo-Arnaldi-Vs-Raphael-Collignon/",
    "players": [
      {
        "name": "Matteo Arnaldi",
        "ranking": {
          "name": "Matteo Arnaldi",
          "rank": 104,
          "points": 586,
          "age": 25,
          "country": "Italy",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/3793/matteo-arnaldi",
          "asOf": "2026-05-31"
        },
        "qualityName": "Matteo Arnaldi",
        "profile": "Live rank #104 | Italy | age 25 | 2026 clay 10-6, 63% | adj form 101",
        "modelPct": 41.4,
        "weakness": {
          "name": "Matteo Arnaldi",
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
          "pressureMatches": 7,
          "matchesWithStats": 0,
          "weaknessScore": 6,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Matteo Arnaldi has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Raphael Collignon",
        "ranking": {
          "name": "Raphael Collignon",
          "rank": 62,
          "points": 866,
          "age": 24,
          "country": "Belgium",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/11222/raphael-collignon",
          "asOf": "2026-05-31"
        },
        "qualityName": "Raphael Collignon",
        "profile": "Live rank #62 | Belgium | age 24 | 2026 clay 12-2, 86% | adj form 95",
        "modelPct": 58.6,
        "weakness": {
          "name": "Raphael Collignon",
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
          "pressureMatches": 7,
          "matchesWithStats": 0,
          "weaknessScore": 6,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Raphael Collignon has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-w-coco-gauff-anastasia-potapova-2026-05-30",
    "eventId": "175526",
    "tour": "WTA",
    "title": "Coco Gauff vs Anastasia Potapova",
    "start": "8:30 AM",
    "startMinutes": 510,
    "court": "Court Philippe-Chatrier",
    "round": "Round 3",
    "pickName": "Coco Gauff",
    "basePickName": "Coco Gauff",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 72.9,
    "volatility": 50,
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
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
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
        "name": "Anastasia Potapova",
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
        "gameFlowRead": "Anastasia Potapova has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Coco Gauff",
        "confidence": 81,
        "modelPct": 72.9,
        "label": "Live to win a set"
      },
      {
        "name": "Anastasia Potapova",
        "confidence": 43,
        "modelPct": 27.1,
        "label": "Thin set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Coco Gauff",
        "americanOdds": -365,
        "modelPct": 72.9,
        "impliedPct": 78.5,
        "edgePct": -5.6,
        "evPer100": -7.1,
        "netEvPer100": -9.1,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Coco Gauff",
        "line": -4.5,
        "americanOdds": -118,
        "modelPct": 67,
        "impliedPct": 54.1,
        "edgePct": 12.9,
        "evPer100": 23.8,
        "netEvPer100": 21.8,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Watch only",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "line": 20.5,
        "overOdds": -120,
        "underOdds": -110,
        "expectedGames": 20.9,
        "valueGrade": "No direction",
        "reason": "FanDuel total is 20.5; model did not clear a full-match over/under edge from hold, return, and set-shape data. hold avg N/A, return games won N/A, first-set sample N/A, 0 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Under 9.5 only if plus price appears; otherwise pass.",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.6,
        "confidence": 54,
        "tiebreakRisk": 0.07,
        "earlyBreakRisk": 0.61,
        "modelPct": 54,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Thin",
        "reason": "Under 9.5 only if plus price appears; otherwise pass.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Coco Gauff",
          "confidence": 81,
          "modelPct": 72.9,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Anastasia Potapova",
          "confidence": 43,
          "modelPct": 27.1,
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
          "name": "Coco Gauff",
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
          "name": "Anastasia Potapova",
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
      "expectedFirstSetGames": 9.4,
      "expectedMatchGames": 20.9,
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
    "derivativeCase": {
      "date": "2026-05-30",
      "matchId": "rg-w-coco-gauff-anastasia-potapova-2026-05-30",
      "match": "Coco Gauff vs Anastasia Potapova",
      "start": "7:00 AM",
      "expectedMatchGames": 20,
      "expectedFirstSetGames": 9.6,
      "totalGames": {
        "postedLine": 20.5,
        "overOdds": -120,
        "underOdds": -110,
        "lean": "Under",
        "edgeGames": -0.5,
        "confidence": 54,
        "grade": "thin",
        "reason": "Gauff has enough return pressure against Potapova's low first-serve profile to create a control path, but Gauff's own second-serve volatility keeps the edge small."
      },
      "gameHandicap": {
        "selection": "Coco Gauff",
        "postedSpread": -4.5,
        "odds": -118,
        "projectedMarginGames": 4.8,
        "edgeGames": 0.3,
        "confidence": 51,
        "grade": "pass",
        "reason": "Gauff can cover if Potapova's error count shows early, but the 2-2 H2H and Gauff service volatility make -4.5 too thin."
      },
      "firstSet": {
        "expectedGames": 9.6,
        "lean": "Under 9.5 only if plus price appears; otherwise pass.",
        "tiebreakRisk": 0.07,
        "earlyBreakRisk": 0.61,
        "confidence": 54
      },
      "writeup": {
        "headline": "Gauff control path, but not a clean blowout spread.",
        "betPlan": "Small Under 20.5 lean; pass the -4.5 unless Potapova's first serve looks shaky immediately.",
        "whyItWorks": [
          "Potapova's tournament first-serve rate is only about 51%, and her unforced-error load is high.",
          "Gauff's return profile can turn second-serve games into breaks quickly.",
          "A 6-3 or 6-4 first set puts the full-match under in range."
        ],
        "whyItFails": [
          "Gauff's second-serve won rate is also fragile, so she can give breaks back.",
          "The H2H is split 2-2, which argues against treating this like a pure mismatch.",
          "If Potapova holds the first two service games without pressure, the under edge is mostly gone."
        ],
        "entryExit": {
          "preMatch": "Under 20.5 at -110 or better is playable only small; pass at 19.5.",
          "live": "Cancel the under if both players hold comfortably through 2-2. Upgrade Gauff spread only if Potapova's first-serve percentage is under 55% with early break points faced."
        }
      },
      "evidence": [
        "FanDuel total 20.5 and Gauff -4.5 were captured.",
        "Gauff tournament stats: 67.6% first-serve points won, 40.5% second-serve points won, 46.4% break points converted.",
        "Potapova tournament stats: 51.4% first serve, 65 unforced errors, 53.3% break points saved.",
        "SofaScore public vote leans Gauff 78.7%, but the warehouse ensemble says Gauff ML is price-taxed."
      ],
      "dataQuality": {
        "fanDuelTotalCaptured": true,
        "fanDuelSpreadCaptured": true,
        "warehouseRowsUsed": 2,
        "replayRowsUsed": 0,
        "status": "complete"
      }
    },
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Coco Gauff",
        "line": null,
        "americanOdds": -365,
        "modelPct": 72.9,
        "impliedPct": 78.5,
        "edgePct": -5.6,
        "evPer100": -7.1,
        "netEvPer100": -9.1,
        "grade": "Negative EV",
        "issue": "Favorite price needs better proof",
        "reason": "Favorite price has limited payout; require a strong weakness edge or use spread/total."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Coco Gauff",
        "line": -4.5,
        "americanOdds": -118,
        "modelPct": 67,
        "impliedPct": 54.1,
        "edgePct": 12.9,
        "evPer100": 23.8,
        "netEvPer100": 21.8,
        "expectedGames": 4.8,
        "edgeGames": 0.3,
        "confidence": 51,
        "grade": "pass",
        "reason": "Gauff can cover if Potapova's error count shows early, but the 2-2 H2H and Gauff service volatility make -4.5 too thin."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "Under",
        "line": 20.5,
        "americanOdds": -110,
        "modelPct": 54,
        "impliedPct": null,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "expectedGames": 20,
        "edgeGames": -0.5,
        "confidence": 54,
        "grade": "thin",
        "reason": "Gauff has enough return pressure against Potapova's low first-serve profile to create a control path, but Gauff's own second-serve volatility keeps the edge small."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Coco Gauff 81% / Anastasia Potapova 43%",
        "rows": [
          {
            "name": "Coco Gauff",
            "confidence": 81,
            "modelPct": 72.9,
            "label": "Live to win a set"
          },
          {
            "name": "Anastasia Potapova",
            "confidence": 43,
            "modelPct": 27.1,
            "label": "Thin set-win path"
          }
        ],
        "confidence": 81,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Under 9.5 only if plus price appears; otherwise pass.",
        "expectedGames": 9.6,
        "confidence": 54,
        "tiebreakRisk": 0.07,
        "earlyBreakRisk": 0.61,
        "grade": "Thin",
        "reason": "Under 9.5 only if plus price appears; otherwise pass."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Anastasia Potapova",
      "opponent": "Coco Gauff",
      "grade": "Watch only",
      "riskGate": "clean enough",
      "marketOdds": 285,
      "fairOdds": 268,
      "modelProbability": 27.1,
      "dataOnlyProbability": 30.2,
      "marketProbability": 26,
      "marketDisagreementPct": 1.1,
      "netEvPer100": 2.5,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Anastasia Potapova is priced below the model, not guaranteed to win.",
      "useCase": "Needs a posted market price before sizing.",
      "bullets": [],
      "risks": [
        "Desk lean still has Coco Gauff; this is a price-dislocation play, not the safest winner.",
        "Market still prices Anastasia Potapova as a real underdog at 26% implied."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page browser scrape",
      "capturedAt": "2026-05-30T04:27:07.841Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/coco-gauff-v-anastasia-potapova-35661654",
      "players": [
        {
          "name": "Coco Gauff",
          "odds": -365,
          "americanLabel": "-365",
          "impliedPct": 78.5,
          "decimalOdds": 1.274,
          "modelPct": 72.9,
          "edgePct": -5.6,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 27.4,
          "grossPayoutMultiple": 1.274,
          "centsAtRisk": 100,
          "centsProfitIfWin": 27.4
        },
        {
          "name": "Anastasia Potapova",
          "odds": 285,
          "americanLabel": "+285",
          "impliedPct": 26,
          "decimalOdds": 3.85,
          "modelPct": 27.1,
          "edgePct": 1.1,
          "priceBand": "Underdog",
          "grossProfitPct": 285,
          "grossPayoutMultiple": 3.85,
          "centsAtRisk": 100,
          "centsProfitIfWin": 285
        }
      ],
      "desk": {
        "name": "Coco Gauff",
        "odds": -365,
        "americanLabel": "-365",
        "impliedPct": 78.5,
        "decimalOdds": 1.274,
        "modelPct": 72.9,
        "edgePct": -5.6,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 27.4,
        "grossPayoutMultiple": 1.274,
        "centsAtRisk": 100,
        "centsProfitIfWin": 27.4
      },
      "spread": {
        "player": "Coco Gauff",
        "spread": -4.5,
        "odds": -118
      },
      "total": {
        "side": "Over",
        "line": 20.5,
        "odds": -120
      },
      "totalOver": {
        "side": "Over",
        "line": 20.5,
        "odds": -120
      },
      "totalUnder": {
        "side": "Under",
        "line": 20.5,
        "odds": -110
      },
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "Coco Gauff -4.5 (-118)",
      "totalValue": "20.5 games: Over -120 / Under -110",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Coco Gauff -365 / Anastasia Potapova +285",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 72.9% vs FanDuel implied 78.5% (-5.6 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Coco-Gauff-Vs-Anastasia-Potapova/",
    "players": [
      {
        "name": "Coco Gauff",
        "ranking": {
          "name": "Coco Gauff",
          "rank": 4,
          "points": 6749,
          "age": 22,
          "country": "USA",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/3626/coco-gauff",
          "asOf": "2026-05-31"
        },
        "qualityName": null,
        "profile": "Live rank #4 | USA | age 22",
        "modelPct": 72.9,
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
        "name": "Anastasia Potapova",
        "ranking": {
          "name": "Anastasia Potapova",
          "rank": 30,
          "points": 1470,
          "age": 25,
          "country": "Austria",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/2971/anastasia-potapova",
          "asOf": "2026-05-31"
        },
        "qualityName": null,
        "profile": "Live rank #30 | Austria | age 25",
        "modelPct": 27.1,
        "weakness": {
          "name": "Anastasia Potapova",
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
          "gameFlowRead": "Anastasia Potapova has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-w-victoria-mboko-madison-keys-2026-05-30",
    "eventId": "175583",
    "tour": "WTA",
    "title": "Victoria Mboko vs Madison Keys",
    "start": "10:20 AM",
    "startMinutes": 620,
    "court": "Court Simonne-Mathieu",
    "round": "Round 3",
    "pickName": "Victoria Mboko",
    "basePickName": "Victoria Mboko",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 60.2,
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
    "reason": "Madison Keys grades 8 points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": -2,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "Pre-match spread is fragile; wait for both players to serve once.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Victoria Mboko",
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
        "gameFlowRead": "Victoria Mboko has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Madison Keys",
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
        "gameFlowRead": "Madison Keys has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Victoria Mboko",
        "confidence": 75,
        "modelPct": 60.2,
        "label": "Live to win a set"
      },
      {
        "name": "Madison Keys",
        "confidence": 57,
        "modelPct": 39.8,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Victoria Mboko",
        "americanOdds": -120,
        "modelPct": 60.2,
        "impliedPct": 54.5,
        "edgePct": 5.7,
        "evPer100": 10.4,
        "netEvPer100": 8.4,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Favorite price needs better proof",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Victoria Mboko",
        "line": -0.5,
        "americanOdds": -120,
        "modelPct": 54,
        "impliedPct": 54.5,
        "edgePct": -0.5,
        "evPer100": -1,
        "netEvPer100": -3,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Near fair",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "line": 22.5,
        "overOdds": -108,
        "underOdds": -126,
        "expectedGames": 23,
        "valueGrade": "No direction",
        "reason": "FanDuel total is 22.5; model did not clear a full-match over/under edge from hold, return, and set-shape data. hold avg N/A, return games won N/A, first-set sample 9.6g, 37 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Over 9.5 if posted at a playable price; pass 10.5 unless plus money.",
        "line": null,
        "americanOdds": null,
        "expectedGames": 10.4,
        "confidence": 55,
        "tiebreakRisk": 0.14,
        "earlyBreakRisk": 0.43,
        "modelPct": 55,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Thin",
        "reason": "Over 9.5 if posted at a playable price; pass 10.5 unless plus money.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Victoria Mboko",
          "confidence": 75,
          "modelPct": 60.2,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Madison Keys",
          "confidence": 57,
          "modelPct": 39.8,
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
          "name": "Victoria Mboko",
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
          "weaknessScore": 2,
          "weakServeMatches": 0,
          "statMatches": 0,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 19,
            "firstSetSamples": 8,
            "avgFirstSetGames": 10,
            "avgSetGames": 9.578947368421053,
            "avgMatchGames": 22.75,
            "avgSetsPlayed": 2.375,
            "tiebreakRate": 0.10526315789473684,
            "extendedSetRate": 0.2631578947368421,
            "shortSetRate": 0.3684210526315789
          }
        },
        {
          "name": "Madison Keys",
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
            "completedMatches": 8,
            "setSamples": 18,
            "firstSetSamples": 8,
            "avgFirstSetGames": 9.25,
            "avgSetGames": 8.444444444444445,
            "avgMatchGames": 19,
            "avgSetsPlayed": 2.25,
            "tiebreakRate": 0,
            "extendedSetRate": 0,
            "shortSetRate": 0.4444444444444444
          }
        }
      ],
      "expectedFirstSetGames": 9.6,
      "expectedMatchGames": 23,
      "signalStrength": 4,
      "holdAvg": null,
      "returnGamesAvg": null,
      "returnPointsAvg": null,
      "setSamples": 37,
      "firstSetSamples": 16,
      "avgFirstSetGames": 9.6,
      "avgSetGames": 9,
      "tiebreakRate": 5.3,
      "extendedSetRate": 13.2,
      "shortSetRate": 40.6,
      "reasonCore": "hold avg N/A, return games won N/A, first-set sample 9.6g, 37 recent sets"
    },
    "derivativeCase": {
      "date": "2026-05-30",
      "matchId": "rg-w-victoria-mboko-madison-keys-2026-05-30",
      "match": "Victoria Mboko vs Madison Keys",
      "start": "6:00 AM",
      "expectedMatchGames": 22.9,
      "expectedFirstSetGames": 10.4,
      "totalGames": {
        "postedLine": 22.5,
        "overOdds": -108,
        "underOdds": -126,
        "lean": "Over",
        "edgeGames": 0.4,
        "confidence": 53,
        "grade": "thin",
        "reason": "The matchup grades close, Keys owns the steadier serve indicators, and Mboko's break-point saved profile creates enough three-set or 7-5 risk for a small over lean."
      },
      "gameHandicap": {
        "selection": "Madison Keys",
        "postedSpread": 0.5,
        "odds": -112,
        "projectedMarginGames": 0.4,
        "edgeGames": 0.9,
        "confidence": 54,
        "grade": "thin",
        "reason": "Winner model is nearly even, but Keys has the better hold, second-serve, break-point saved, and adjusted-form profile."
      },
      "firstSet": {
        "expectedGames": 10.4,
        "lean": "Over 9.5 if posted at a playable price; pass 10.5 unless plus money.",
        "tiebreakRisk": 0.14,
        "earlyBreakRisk": 0.43,
        "confidence": 55
      },
      "writeup": {
        "headline": "Close-match script with Keys stability underneath.",
        "betPlan": "Over 22.5 is the derivative lean; Keys +0.5 games is playable only small.",
        "whyItWorks": [
          "The model has the match almost even, not a real Mboko favorite despite the board lean.",
          "Keys has stronger first-serve points won, second-serve stability, break-point saved rate, and adjusted form.",
          "Mboko's tournament break-point saved rate is weak enough to create momentum swings rather than a clean straight-set favorite path."
        ],
        "whyItFails": [
          "Mboko has crowd/market support and can create return pressure if Keys' first serve dips.",
          "Keys can run hot and cold with errors, so the spread edge is thinner than the stat edge.",
          "A one-sided first set from either player damages the over."
        ],
        "entryExit": {
          "preMatch": "Over 22.5 at -108 is playable small. Keys +0.5 at -112 is a thin value, not a max play.",
          "live": "Keep over only if both players show service comfort early or if each creates break chances. Downgrade if Mboko is broken twice in the first set."
        }
      },
      "evidence": [
        "FanDuel total 22.5 and Mboko -0.5 / Keys +0.5 were captured.",
        "Keys tournament stats: 70.8% first-serve points won, 51.7% second-serve points won, 84.6% break points saved.",
        "Mboko tournament stats: 57.3% first-serve points won and 41.7% break points saved.",
        "Kalshi flow for Keys shows stronger clay form, return pressure, and adjusted-form edge, but entry price is too high for trade-to-sell promotion."
      ],
      "dataQuality": {
        "fanDuelTotalCaptured": true,
        "fanDuelSpreadCaptured": true,
        "warehouseRowsUsed": 2,
        "replayRowsUsed": 1,
        "status": "complete"
      }
    },
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Victoria Mboko",
        "line": null,
        "americanOdds": -120,
        "modelPct": 60.2,
        "impliedPct": 54.5,
        "edgePct": 5.7,
        "evPer100": 10.4,
        "netEvPer100": 8.4,
        "grade": "Favorite price needs better proof",
        "issue": "Favorite price needs better proof",
        "reason": "ML is close to fair; derivative or live entry needs to carry the edge."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Madison Keys",
        "line": 0.5,
        "americanOdds": -112,
        "modelPct": 54,
        "impliedPct": 54.5,
        "edgePct": -0.5,
        "evPer100": -1,
        "netEvPer100": -3,
        "expectedGames": 0.4,
        "edgeGames": 0.9,
        "confidence": 54,
        "grade": "thin",
        "reason": "Winner model is nearly even, but Keys has the better hold, second-serve, break-point saved, and adjusted-form profile."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "Over",
        "line": 22.5,
        "americanOdds": -108,
        "modelPct": 53,
        "impliedPct": null,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "expectedGames": 22.9,
        "edgeGames": 0.4,
        "confidence": 53,
        "grade": "thin",
        "reason": "The matchup grades close, Keys owns the steadier serve indicators, and Mboko's break-point saved profile creates enough three-set or 7-5 risk for a small over lean."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Victoria Mboko 75% / Madison Keys 57%",
        "rows": [
          {
            "name": "Victoria Mboko",
            "confidence": 75,
            "modelPct": 60.2,
            "label": "Live to win a set"
          },
          {
            "name": "Madison Keys",
            "confidence": 57,
            "modelPct": 39.8,
            "label": "Needs early hold pressure"
          }
        ],
        "confidence": 75,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Over 9.5 if posted at a playable price; pass 10.5 unless plus money.",
        "expectedGames": 10.4,
        "confidence": 55,
        "tiebreakRisk": 0.14,
        "earlyBreakRisk": 0.43,
        "grade": "Thin",
        "reason": "Over 9.5 if posted at a playable price; pass 10.5 unless plus money."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Victoria Mboko",
      "opponent": "Madison Keys",
      "grade": "Risk-gated value",
      "riskGate": "hold risk, closeout risk",
      "marketOdds": -120,
      "fairOdds": -151,
      "modelProbability": 60.2,
      "dataOnlyProbability": 63.3,
      "marketProbability": 54.5,
      "marketDisagreementPct": 5.7,
      "netEvPer100": 8.4,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Victoria Mboko is priced below the model, not guaranteed to win.",
      "useCase": "Favorite price needs cleaner proof or derivative value; do not confuse win probability with bet value.",
      "bullets": [],
      "risks": [
        "Risk is mostly normal tennis variance; do not size this like a lock."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page browser scrape",
      "capturedAt": "2026-05-30T04:27:04.792Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/victoria-mboko-v-madison-keys-35661727",
      "players": [
        {
          "name": "Victoria Mboko",
          "odds": -120,
          "americanLabel": "-120",
          "impliedPct": 54.5,
          "decimalOdds": 1.833,
          "modelPct": 60.2,
          "edgePct": 5.7,
          "priceBand": "Coinflip",
          "grossProfitPct": 83.3,
          "grossPayoutMultiple": 1.833,
          "centsAtRisk": 100,
          "centsProfitIfWin": 83.3
        },
        {
          "name": "Madison Keys",
          "odds": 100,
          "americanLabel": "+100",
          "impliedPct": 50,
          "decimalOdds": 2,
          "modelPct": 39.8,
          "edgePct": -10.2,
          "priceBand": "Coinflip",
          "grossProfitPct": 100,
          "grossPayoutMultiple": 2,
          "centsAtRisk": 100,
          "centsProfitIfWin": 100
        }
      ],
      "desk": {
        "name": "Victoria Mboko",
        "odds": -120,
        "americanLabel": "-120",
        "impliedPct": 54.5,
        "decimalOdds": 1.833,
        "modelPct": 60.2,
        "edgePct": 5.7,
        "priceBand": "Coinflip",
        "grossProfitPct": 83.3,
        "grossPayoutMultiple": 1.833,
        "centsAtRisk": 100,
        "centsProfitIfWin": 83.3
      },
      "spread": {
        "player": "Victoria Mboko",
        "spread": -0.5,
        "odds": -120
      },
      "total": {
        "side": "Over",
        "line": 22.5,
        "odds": -108
      },
      "totalOver": {
        "side": "Over",
        "line": 22.5,
        "odds": -108
      },
      "totalUnder": {
        "side": "Under",
        "line": 22.5,
        "odds": -126
      },
      "priceAction": "ML is close to fair; derivative or live entry needs to carry the edge.",
      "spreadValue": "Victoria Mboko -0.5 (-120)",
      "totalValue": "22.5 games: Over -108 / Under -126",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Victoria Mboko -120 / Madison Keys +100",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. ML is close to fair; derivative or live entry needs to carry the edge.",
      "noVigNote": "Model 60.2% vs FanDuel implied 54.5% (+5.7 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Victoria-Mboko-Vs-Madison-Keys/",
    "players": [
      {
        "name": "Victoria Mboko",
        "ranking": {
          "name": "Victoria Mboko",
          "rank": 9,
          "points": 3710,
          "age": 19,
          "country": "Canada",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/11219/victoria-mboko",
          "asOf": "2026-05-31"
        },
        "qualityName": "Victoria Mboko",
        "profile": "Live rank #9 | Canada | age 19 | 2026 clay 5-2, 71% | adj form 76",
        "modelPct": 60.2,
        "weakness": {
          "name": "Victoria Mboko",
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
          "gameFlowRead": "Victoria Mboko has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Madison Keys",
        "ranking": {
          "name": "Madison Keys",
          "rank": 19,
          "points": 1962,
          "age": 31,
          "country": "USA",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/1556/madison-keys",
          "asOf": "2026-05-31"
        },
        "qualityName": "Madison Keys",
        "profile": "Live rank #19 | USA | age 31 | 2026 clay 10-3, 77% | adj form 85",
        "modelPct": 39.8,
        "weakness": {
          "name": "Madison Keys",
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
          "gameFlowRead": "Madison Keys has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-m-jaime-faria-frances-tiafoe-2026-05-30",
    "eventId": "175737",
    "tour": "ATP",
    "title": "Jaime Faria vs Frances Tiafoe",
    "start": "11:20 AM",
    "startMinutes": 680,
    "court": "Court Suzanne-Lenglen",
    "round": "Round 3",
    "pickName": "Jaime Faria",
    "basePickName": "Frances Tiafoe",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": true,
    "confidence": 66.5,
    "volatility": 34,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Lean",
      "Model split - pass ML",
      "Positive price edge",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Frances Tiafoe grades 82 points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price. Lean, not a chase.",
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
        "pressureMatches": 7,
        "matchesWithStats": 0,
        "weaknessScore": 6,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Jaime Faria has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Frances Tiafoe",
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
        "pressureMatches": 7,
        "matchesWithStats": 0,
        "weaknessScore": 6,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Frances Tiafoe has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Jaime Faria",
        "confidence": 88,
        "modelPct": 66.5,
        "label": "Strong set-win path"
      },
      {
        "name": "Frances Tiafoe",
        "confidence": 62,
        "modelPct": 33.5,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Jaime Faria",
        "americanOdds": 155,
        "modelPct": 66.5,
        "impliedPct": 39.2,
        "edgePct": 27.3,
        "evPer100": 69.6,
        "netEvPer100": 67.6,
        "feePer100": 2,
        "valueIssue": "Model-market outlier",
        "valueGrade": "Model-market outlier",
        "betGrade": false
      },
      "spread": null,
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "line": null,
        "overOdds": null,
        "underOdds": null,
        "expectedGames": 36,
        "valueGrade": "No direction",
        "reason": "No posted match total captured.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Over 9.5; pass 10.5 unless plus money.",
        "line": null,
        "americanOdds": null,
        "expectedGames": 10.5,
        "confidence": 59,
        "tiebreakRisk": 0.2,
        "earlyBreakRisk": 0.34,
        "modelPct": 59,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Actionable live watch",
        "reason": "Over 9.5; pass 10.5 unless plus money.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Jaime Faria",
          "confidence": 88,
          "modelPct": 66.5,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Frances Tiafoe",
          "confidence": 62,
          "modelPct": 33.5,
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
          "name": "Jaime Faria",
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
          "weaknessScore": 6,
          "weakServeMatches": 0,
          "statMatches": 0,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 22,
            "firstSetSamples": 8,
            "avgFirstSetGames": 8.875,
            "avgSetGames": 10.181818181818182,
            "avgMatchGames": 28,
            "avgSetsPlayed": 2.75,
            "tiebreakRate": 0.2727272727272727,
            "extendedSetRate": 0.4090909090909091,
            "shortSetRate": 0.2727272727272727
          }
        },
        {
          "name": "Frances Tiafoe",
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
          "weaknessScore": 6,
          "weakServeMatches": 0,
          "statMatches": 0,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 24,
            "firstSetSamples": 8,
            "avgFirstSetGames": 11.5,
            "avgSetGames": 10.958333333333334,
            "avgMatchGames": 32.875,
            "avgSetsPlayed": 3,
            "tiebreakRate": 0.4166666666666667,
            "extendedSetRate": 0.4583333333333333,
            "shortSetRate": 0.08333333333333333
          }
        }
      ],
      "expectedFirstSetGames": 10.6,
      "expectedMatchGames": 36,
      "signalStrength": 6,
      "holdAvg": null,
      "returnGamesAvg": null,
      "returnPointsAvg": null,
      "setSamples": 46,
      "firstSetSamples": 16,
      "avgFirstSetGames": 10.2,
      "avgSetGames": 10.6,
      "tiebreakRate": 34.5,
      "extendedSetRate": 43.4,
      "shortSetRate": 17.8,
      "reasonCore": "hold avg N/A, return games won N/A, first-set sample 10.2g, 46 recent sets"
    },
    "derivativeCase": {
      "date": "2026-05-30",
      "matchId": "rg-m-jaime-faria-frances-tiafoe-2026-05-30",
      "match": "Jaime Faria vs Frances Tiafoe",
      "start": "7:00 AM",
      "expectedMatchGames": 41,
      "expectedFirstSetGames": 10.5,
      "totalGames": {
        "postedLine": null,
        "overOdds": null,
        "underOdds": null,
        "lean": "Over if line is 38.5 or lower; pass 40.5+",
        "edgeGames": null,
        "confidence": 58,
        "grade": "data-incomplete",
        "reason": "No FanDuel total was captured. Faria's hold and resistance profile plus Tiafoe's ace/first-serve scoring point to an extended best-of-five path."
      },
      "gameHandicap": {
        "selection": "Jaime Faria",
        "postedSpread": null,
        "odds": null,
        "projectedMarginGames": 0.8,
        "edgeGames": null,
        "confidence": 55,
        "grade": "data-incomplete",
        "reason": "No FanDuel handicap was captured. The ensemble makes Faria live, but Tiafoe still has tour-level weaponry and serve ceiling."
      },
      "firstSet": {
        "expectedGames": 10.5,
        "lean": "Over 9.5; pass 10.5 unless plus money.",
        "tiebreakRisk": 0.2,
        "earlyBreakRisk": 0.34,
        "confidence": 59
      },
      "writeup": {
        "headline": "Faria is live, and the game-flow case is extension rather than quick upset.",
        "betPlan": "Best angle is first-set over or full-match over if a low line appears. Faria ML is value, but not the same as a derivative play.",
        "whyItWorks": [
          "Faria's recent hold, second-serve, and resistance profile are strong enough to keep sets alive.",
          "Tiafoe brings a high ace count and strong first-serve points won, which lowers immediate break risk.",
          "The ensemble/data-only model likes Faria more than the market, so the favorite should not be priced as a clean straight-set path."
        ],
        "whyItFails": [
          "Tiafoe can blow open a set if his first serve lands and Faria's return pressure fades.",
          "Faria's adjusted-form field is incomplete, so the model is leaning on partial warehouse context.",
          "At 37c, Faria's Kalshi contract is too expensive for a pure trade-to-sell setup."
        ],
        "entryExit": {
          "preMatch": "First-set over 9.5 is playable if offered. Full-match over only at 38.5 or lower.",
          "live": "If Faria holds his first two service games, over and Faria spread become stronger. If he is broken early with low first-serve percentage, drop the position."
        }
      },
      "evidence": [
        "FanDuel moneyline captured, but no total or handicap captured.",
        "Faria clay win rate 70.3%, recent win rate 87.5%, hold 82.1, second serve 67.6.",
        "Tiafoe tournament stats: 13.5 average aces, 84.8% first-serve points won, 56.8% second-serve points won.",
        "Ensemble row: Faria model 50.3%, data-only 54.0%, market 39.2%, net EV +26.4."
      ],
      "dataQuality": {
        "fanDuelTotalCaptured": false,
        "fanDuelSpreadCaptured": false,
        "warehouseRowsUsed": 3,
        "replayRowsUsed": 2,
        "status": "priced-lines-missing"
      }
    },
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Jaime Faria",
        "line": null,
        "americanOdds": 155,
        "modelPct": 66.5,
        "impliedPct": 39.2,
        "edgePct": 27.3,
        "evPer100": 69.6,
        "netEvPer100": 67.6,
        "grade": "Model-market outlier",
        "issue": "Model-market outlier",
        "reason": "Model is meaningfully above FanDuel implied price."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Jaime Faria",
        "line": null,
        "americanOdds": null,
        "modelPct": null,
        "impliedPct": null,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "expectedGames": 0.8,
        "edgeGames": null,
        "confidence": 55,
        "grade": "data-incomplete",
        "reason": "No FanDuel handicap was captured. The ensemble makes Faria live, but Tiafoe still has tour-level weaponry and serve ceiling."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "Over if line is 38.5 or lower; pass 40.5+",
        "line": null,
        "americanOdds": null,
        "modelPct": 58,
        "impliedPct": null,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "expectedGames": 41,
        "edgeGames": null,
        "confidence": 58,
        "grade": "data-incomplete",
        "reason": "No FanDuel total was captured. Faria's hold and resistance profile plus Tiafoe's ace/first-serve scoring point to an extended best-of-five path."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Jaime Faria 88% / Frances Tiafoe 62%",
        "rows": [
          {
            "name": "Jaime Faria",
            "confidence": 88,
            "modelPct": 66.5,
            "label": "Strong set-win path"
          },
          {
            "name": "Frances Tiafoe",
            "confidence": 62,
            "modelPct": 33.5,
            "label": "Needs early hold pressure"
          }
        ],
        "confidence": 88,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Over 9.5; pass 10.5 unless plus money.",
        "expectedGames": 10.5,
        "confidence": 59,
        "tiebreakRisk": 0.2,
        "earlyBreakRisk": 0.34,
        "grade": "Actionable live watch",
        "reason": "Over 9.5; pass 10.5 unless plus money."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Jaime Faria",
      "opponent": "Frances Tiafoe",
      "grade": "Bet-grade ML",
      "riskGate": "clean enough",
      "marketOdds": 155,
      "fairOdds": -198,
      "modelProbability": 66.5,
      "dataOnlyProbability": 72.5,
      "marketProbability": 39.2,
      "marketDisagreementPct": 27.3,
      "netEvPer100": 67.6,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Jaime Faria is priced below the model, not guaranteed to win.",
      "useCase": "Straight ML value only at +155 or better; fair price from the ensemble is about -198.",
      "bullets": [],
      "risks": [
        "Risk is mostly normal tennis variance; do not size this like a lock."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page browser scrape",
      "capturedAt": "2026-05-30T04:27:09.944Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/jaime-faria-v-frances-tiafoe-35661543",
      "players": [
        {
          "name": "Jaime Faria",
          "odds": 155,
          "americanLabel": "+155",
          "impliedPct": 39.2,
          "decimalOdds": 2.55,
          "modelPct": 66.5,
          "edgePct": 27.3,
          "priceBand": "Underdog",
          "grossProfitPct": 155,
          "grossPayoutMultiple": 2.55,
          "centsAtRisk": 100,
          "centsProfitIfWin": 155
        },
        {
          "name": "Frances Tiafoe",
          "odds": -192,
          "americanLabel": "-192",
          "impliedPct": 65.8,
          "decimalOdds": 1.521,
          "modelPct": 33.5,
          "edgePct": -32.3,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 52.1,
          "grossPayoutMultiple": 1.521,
          "centsAtRisk": 100,
          "centsProfitIfWin": 52.1
        }
      ],
      "desk": {
        "name": "Jaime Faria",
        "odds": 155,
        "americanLabel": "+155",
        "impliedPct": 39.2,
        "decimalOdds": 2.55,
        "modelPct": 66.5,
        "edgePct": 27.3,
        "priceBand": "Underdog",
        "grossProfitPct": 155,
        "grossPayoutMultiple": 2.55,
        "centsAtRisk": 100,
        "centsProfitIfWin": 155
      },
      "spread": null,
      "priceAction": "Model is meaningfully above FanDuel implied price.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Jaime Faria +155 / Frances Tiafoe -192",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. Model is meaningfully above FanDuel implied price.",
      "noVigNote": "Model 66.5% vs FanDuel implied 39.2% (+27.3 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Jaime-Faria-Vs-Frances-Tiafoe/",
    "players": [
      {
        "name": "Jaime Faria",
        "ranking": {
          "name": "Jaime Faria",
          "rank": 115,
          "points": 548,
          "age": 22,
          "country": "Portugal",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/10219/jaime-faria",
          "asOf": "2026-05-31"
        },
        "qualityName": "Jaime Faria",
        "profile": "Live rank #115 | Portugal | age 22 | 2026 clay 26-11, 70% | adj form 0",
        "modelPct": 66.5,
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
          "pressureMatches": 7,
          "matchesWithStats": 0,
          "weaknessScore": 6,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Jaime Faria has no major service weakness in the joined Flashscore sample."
        }
      },
      {
        "name": "Frances Tiafoe",
        "ranking": {
          "name": "Frances Tiafoe",
          "rank": 22,
          "points": 1905,
          "age": 28,
          "country": "USA",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/2708/frances-tiafoe",
          "asOf": "2026-05-31"
        },
        "qualityName": "Frances Tiafoe",
        "profile": "Live rank #22 | USA | age 28 | 2026 clay 6-3, 67% | adj form 82",
        "modelPct": 33.5,
        "weakness": {
          "name": "Frances Tiafoe",
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
          "pressureMatches": 7,
          "matchesWithStats": 0,
          "weaknessScore": 6,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Frances Tiafoe has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-m-felix-auger-aliassime-brandon-nakashima-2026-05-30",
    "eventId": "175749",
    "tour": "ATP",
    "title": "Felix Auger-Aliassime vs Brandon Nakashima",
    "start": "11:50 AM",
    "startMinutes": 710,
    "court": "Court Philippe-Chatrier",
    "round": "Round 3",
    "pickName": "Felix Auger-Aliassime",
    "basePickName": "Felix Auger-Aliassime",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 74,
    "volatility": 40,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "High confidence",
      "Price required",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Felix Auger-Aliassime has the cleaner composite of rank, clay record, and recent opponent quality. High win probability, but the ML still needs enough payout after comparing the book price to the model.",
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
        "name": "Brandon Nakashima",
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
        "gameFlowRead": "Brandon Nakashima has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Felix Auger-Aliassime",
        "confidence": 92,
        "modelPct": 74,
        "label": "Strong set-win path"
      },
      {
        "name": "Brandon Nakashima",
        "confidence": 57,
        "modelPct": 26,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Felix Auger-Aliassime",
        "americanOdds": -315,
        "modelPct": 74,
        "impliedPct": 75.9,
        "edgePct": -1.9,
        "evPer100": -2.5,
        "netEvPer100": -4.5,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Near fair",
        "betGrade": false
      },
      "spread": null,
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "line": null,
        "overOdds": null,
        "underOdds": null,
        "expectedGames": 34.1,
        "valueGrade": "No direction",
        "reason": "No posted match total captured.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Over 9.5 if posted; pass 10.5 unless plus money.",
        "line": null,
        "americanOdds": null,
        "expectedGames": 10.4,
        "confidence": 58,
        "tiebreakRisk": 0.18,
        "earlyBreakRisk": 0.36,
        "modelPct": 58,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Actionable live watch",
        "reason": "Over 9.5 if posted; pass 10.5 unless plus money.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Felix Auger-Aliassime",
          "confidence": 92,
          "modelPct": 74,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Brandon Nakashima",
          "confidence": 57,
          "modelPct": 26,
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
          "name": "Felix Auger-Aliassime",
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
          "name": "Brandon Nakashima",
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
      "expectedFirstSetGames": 9.6,
      "expectedMatchGames": 34.1,
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
    "derivativeCase": {
      "date": "2026-05-30",
      "matchId": "rg-m-felix-auger-aliassime-brandon-nakashima-2026-05-30",
      "match": "Felix Auger-Aliassime vs Brandon Nakashima",
      "start": "11:15 AM",
      "expectedMatchGames": 40.2,
      "expectedFirstSetGames": 10.4,
      "totalGames": {
        "postedLine": null,
        "overOdds": null,
        "underOdds": null,
        "lean": "Over if line is 38.5 or lower; pass 40.5+",
        "edgeGames": null,
        "confidence": 57,
        "grade": "data-incomplete",
        "reason": "No FanDuel total was captured. Nakashima's serve numbers and model value case make the match more extendable than the favorite ML price implies."
      },
      "gameHandicap": {
        "selection": "Brandon Nakashima",
        "postedSpread": null,
        "odds": null,
        "projectedMarginGames": 1.2,
        "edgeGames": null,
        "confidence": 56,
        "grade": "data-incomplete",
        "reason": "No FanDuel handicap was captured. Nakashima is the value side against the favorite tax, but his Kalshi spike profile lacks price-history support."
      },
      "firstSet": {
        "expectedGames": 10.4,
        "lean": "Over 9.5 if posted; pass 10.5 unless plus money.",
        "tiebreakRisk": 0.18,
        "earlyBreakRisk": 0.36,
        "confidence": 58
      },
      "writeup": {
        "headline": "Nakashima value points to extension, not a cheap spike trade.",
        "betPlan": "Prefer Nakashima game spread or first-set over if offered; avoid FAA ML at taxed price.",
        "whyItWorks": [
          "Nakashima's tournament serve profile is cleaner: more aces, no double-fault issue in the aggregate, better first-serve and second-serve points won.",
          "FAA has a high ace ceiling but also 7 average double faults and weak second-serve points won.",
          "The ensemble gives Nakashima a much better chance than the market, so the match should be more competitive than the ML suggests."
        ],
        "whyItFails": [
          "FAA still has top-six rank, five-set experience, and first-strike power.",
          "Nakashima's Kalshi trade profile lacks enough price-history support, so this is not a strong trade-to-sell.",
          "No captured total or handicap means derivative EV cannot be fully priced pre-match."
        ],
        "entryExit": {
          "preMatch": "Look for Nakashima spread at +4.5 or better, or first-set over 9.5. Full-match over only at 38.5 or lower.",
          "live": "Upgrade Nakashima spread/over if he holds twice with first-serve points above 70%. Downgrade if FAA attacks second serves immediately."
        }
      },
      "evidence": [
        "FanDuel moneyline captured, but no total or handicap captured.",
        "Nakashima tournament stats: 11.5 average aces, 80.8% first-serve points won, 54.1% second-serve points won.",
        "FAA tournament stats: 8 average aces, 7 average double faults, 41.7% second-serve points won.",
        "Ensemble row: Nakashima model 46.0%, data-only 50.8%, market 29.0%, net EV +56.6."
      ],
      "dataQuality": {
        "fanDuelTotalCaptured": false,
        "fanDuelSpreadCaptured": false,
        "warehouseRowsUsed": 2,
        "replayRowsUsed": 0,
        "status": "priced-lines-missing"
      }
    },
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Felix Auger-Aliassime",
        "line": null,
        "americanOdds": -315,
        "modelPct": 74,
        "impliedPct": 75.9,
        "edgePct": -1.9,
        "evPer100": -2.5,
        "netEvPer100": -4.5,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Favorite price has limited payout; require a strong weakness edge or use spread/total."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Brandon Nakashima",
        "line": null,
        "americanOdds": null,
        "modelPct": null,
        "impliedPct": null,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "expectedGames": 1.2,
        "edgeGames": null,
        "confidence": 56,
        "grade": "data-incomplete",
        "reason": "No FanDuel handicap was captured. Nakashima is the value side against the favorite tax, but his Kalshi spike profile lacks price-history support."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "Over if line is 38.5 or lower; pass 40.5+",
        "line": null,
        "americanOdds": null,
        "modelPct": 57,
        "impliedPct": null,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "expectedGames": 40.2,
        "edgeGames": null,
        "confidence": 57,
        "grade": "data-incomplete",
        "reason": "No FanDuel total was captured. Nakashima's serve numbers and model value case make the match more extendable than the favorite ML price implies."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Felix Auger-Aliassime 92% / Brandon Nakashima 57%",
        "rows": [
          {
            "name": "Felix Auger-Aliassime",
            "confidence": 92,
            "modelPct": 74,
            "label": "Strong set-win path"
          },
          {
            "name": "Brandon Nakashima",
            "confidence": 57,
            "modelPct": 26,
            "label": "Needs early hold pressure"
          }
        ],
        "confidence": 92,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Over 9.5 if posted; pass 10.5 unless plus money.",
        "expectedGames": 10.4,
        "confidence": 58,
        "tiebreakRisk": 0.18,
        "earlyBreakRisk": 0.36,
        "grade": "Actionable live watch",
        "reason": "Over 9.5 if posted; pass 10.5 unless plus money."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Felix Auger-Aliassime",
      "opponent": "Brandon Nakashima",
      "grade": "Negative EV",
      "riskGate": "taxed favorite",
      "marketOdds": -315,
      "fairOdds": -284,
      "modelProbability": 74,
      "dataOnlyProbability": 73,
      "marketProbability": 75.9,
      "marketDisagreementPct": 1.9,
      "netEvPer100": -4.5,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Felix Auger-Aliassime does not clear a fee-adjusted value case.",
      "useCase": "Favorite price needs cleaner proof or derivative value; do not confuse win probability with bet value.",
      "bullets": [],
      "risks": [
        "Risk is mostly normal tennis variance; do not size this like a lock."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page browser scrape",
      "capturedAt": "2026-05-30T04:27:11.831Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/felix-auger-aliassime-v-brandon-nakashima-35662034",
      "players": [
        {
          "name": "Felix Auger-Aliassime",
          "odds": -315,
          "americanLabel": "-315",
          "impliedPct": 75.9,
          "decimalOdds": 1.317,
          "modelPct": 74,
          "edgePct": -1.9,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 31.7,
          "grossPayoutMultiple": 1.317,
          "centsAtRisk": 100,
          "centsProfitIfWin": 31.7
        },
        {
          "name": "Brandon Nakashima",
          "odds": 245,
          "americanLabel": "+245",
          "impliedPct": 29,
          "decimalOdds": 3.45,
          "modelPct": 26,
          "edgePct": -3,
          "priceBand": "Underdog",
          "grossProfitPct": 245,
          "grossPayoutMultiple": 3.45,
          "centsAtRisk": 100,
          "centsProfitIfWin": 245
        }
      ],
      "desk": {
        "name": "Felix Auger-Aliassime",
        "odds": -315,
        "americanLabel": "-315",
        "impliedPct": 75.9,
        "decimalOdds": 1.317,
        "modelPct": 74,
        "edgePct": -1.9,
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
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Felix Auger-Aliassime -315 / Brandon Nakashima +245",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 74% vs FanDuel implied 75.9% (-1.9 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Felix-Auger-Aliassime-Vs-Brandon-Nakashima/",
    "players": [
      {
        "name": "Felix Auger-Aliassime",
        "ranking": {
          "name": "Felix Auger-Aliassime",
          "rank": 6,
          "points": 4050,
          "age": 25,
          "country": "Canada",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/3209/felix-auger-aliassime",
          "asOf": "2026-05-31"
        },
        "qualityName": null,
        "profile": "Live rank #6 | Canada | age 25",
        "modelPct": 74,
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
        "name": "Brandon Nakashima",
        "ranking": {
          "name": "Brandon Nakashima",
          "rank": 35,
          "points": 1295,
          "age": 24,
          "country": "USA",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/3774/brandon-nakashima",
          "asOf": "2026-05-31"
        },
        "qualityName": null,
        "profile": "Live rank #35 | USA | age 24",
        "modelPct": 26,
        "weakness": {
          "name": "Brandon Nakashima",
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
          "gameFlowRead": "Brandon Nakashima has no major service weakness in the joined Flashscore sample."
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
      researchLinks: [{ label: 'ESPN scoreboard', url: 'https://www.espn.com/tennis/scoreboard/_/date/20260530' }, { label: 'Tennistonic H2H', url: raw.h2hUrl }, ...(market?.eventUrl ? [{ label: 'FanDuel event', url: market.eventUrl }] : [])],
      formEdgeName: raw.pickName
    },
    participants,
    moneyline: market ? { available: true, label: 'FanDuel moneyline', provider: market.source, participants } : { available: false, label: 'Moneyline', provider: 'Tennis warehouse model', participants: [] },
    analysis: { available: true, participantId: picked.id, participant: picked, opponent, lean: `Lean ${raw.pickName}`, rationale: raw.reason, confidence: raw.confidence, volatility: raw.volatility, recommendationScore: raw.confidence - Math.round(raw.volatility / 3) + Math.round(Math.max(-8, Math.min(8, deskMarket?.edgePct ?? 0))), tier: raw.modelSplit ? 'Model split / pass ML' : raw.tags.includes('High confidence')  ? 'High confidence' : raw.tags.includes('Lean') ? 'Lean' : 'Watch', sourceLabel: raw.modelSource || 'Tennis warehouse model', modelEdge: deskMarket?.edgePct ?? 0, modelEdgeLabel: deskMarket ? `${deskMarket.edgePct > 0 ? '+' : ''}${deskMarket.edgePct} pts vs FanDuel implied` : 'Fair value only until market price is captured', marketProbability: deskMarket?.impliedPct ? deskMarket.impliedPct / 100 : null, marketProbabilityLabel: deskMarket?.impliedPct ? `${deskMarket.impliedPct}% FanDuel implied` : 'No market', inputs: [], inputsUsed: market ? 4 : 3, volatilityNotes: [] }
  }, { structuredAnalysis: true })
}

const matches = rawTennisGames.map(buildGame)

export const slateMeta = { title: 'May 30, 2026 Tennis Desk', date: 'May 30, 2026', isoDate: '2026-05-30', timeZone: 'America/Los_Angeles', subtitle: 'Singles-only Roland Garros main-draw slate with weakness-edge, game-flow gates, and sportsbook/market lines where captured.', notes: ['No doubles included.', 'FanDuel ML, game handicap, and total-games lines are attached where the sportsbook board exposes a matching singles event.', 'May 30, 2026 uses live rank, clay record, opponent-adjusted recent form, and warehouse service rows where joined.'] }
export const filters = ['All', 'Tennis']
export const oddsMeta = { provider: 'FanDuel Sportsbook + Tennis warehouse model', snapshot: 'May 30, 2026 Roland Garros desk', note: 'FanDuel lines are stored for priced matches; very expensive favorites are marked as low-payout or pass-first instead of automatic bets.' }
export const sources = [{ label: 'ESPN tennis scoreboard', url: 'https://www.espn.com/tennis/scoreboard/_/date/20260530' }, { label: 'Live Tennis rankings warehouse', url: 'https://live-tennis.eu/' }, { label: 'FanDuel sportsbook tennis', url: 'https://sportsbook.fanduel.com/tennis' }]
export const games = matches.sort((left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title))
