import { createSportsMatchModel } from './sports-model.js'
import tennisClayContext from './day-2026-06-01-tennis-clay-context.generated.json' with { type: 'json' }
import tennisOpponentQualityContext from './day-2026-06-01-tennis-opponent-quality.generated.json' with { type: 'json' }
import tennisWarehouseContext from './day-2026-06-01-tennis-warehouse-context.generated.json' with { type: 'json' }

const rawTennisGames = [
  {
    "id": "rg-m-flavio-cobolli-zachary-svajda-2026-06-01",
    "eventId": "175767",
    "tour": "ATP",
    "bestOf": 5,
    "surface": "Clay",
    "title": "Flavio Cobolli vs Zachary Svajda",
    "start": "2:05 AM",
    "startMinutes": 125,
    "court": "Court Philippe-Chatrier",
    "round": "Round 4",
    "pickName": "Flavio Cobolli",
    "basePickName": "Flavio Cobolli",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 72.7,
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
    "reason": "Flavio Cobolli has the recent service-hold edge 86% to 82%. Opponent-adjusted recent form is basically even: Flavio Cobolli 67, Zachary Svajda 67. Lean, not a chase.",
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
        "name": "Flavio Cobolli",
        "serviceHoldPct": 86,
        "firstServeWonPct": 74,
        "secondServeWonPct": 57,
        "firstServePct": 56,
        "avgAces": 4.3,
        "avgDoubleFaults": 2.7,
        "avgWinners": null,
        "avgUnforcedErrors": null,
        "avgBreakPointsFaced": null,
        "returnPointsWonPct": null,
        "servicePointsWonPct": 67,
        "weakServeMatches": 0,
        "pressureMatches": 5,
        "matchesWithStats": 17,
        "weaknessScore": 4,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "protects serve well (86% hold)",
          "wins enough first-serve points (74%)",
          "second serve holds up (57%)"
        ],
        "gameFlowRead": "Flavio Cobolli has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Zachary Svajda",
        "serviceHoldPct": 82,
        "firstServeWonPct": 72,
        "secondServeWonPct": 53,
        "firstServePct": 61,
        "avgAces": 6.9,
        "avgDoubleFaults": 1.8,
        "avgWinners": null,
        "avgUnforcedErrors": null,
        "avgBreakPointsFaced": null,
        "returnPointsWonPct": null,
        "servicePointsWonPct": 64,
        "weakServeMatches": 0,
        "pressureMatches": 6,
        "matchesWithStats": 9,
        "weaknessScore": 5,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "protects serve well (82% hold)",
          "wins enough first-serve points (72%)"
        ],
        "gameFlowRead": "Zachary Svajda has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Flavio Cobolli",
        "confidence": 90,
        "modelPct": 72.7,
        "label": "Strong set-win path"
      },
      {
        "name": "Zachary Svajda",
        "confidence": 57,
        "modelPct": 27.3,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Flavio Cobolli",
        "americanOdds": -820,
        "modelPct": 72.7,
        "impliedPct": 89.1,
        "edgePct": -16.4,
        "evPer100": -18.4,
        "netEvPer100": -20.4,
        "feePer100": 2,
        "valueIssue": "Favorite tax trap",
        "valueGrade": "Favorite tax trap",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Flavio Cobolli",
        "line": -7.5,
        "americanOdds": -110,
        "modelPct": 63,
        "impliedPct": 52.4,
        "edgePct": 10.6,
        "evPer100": 20.3,
        "netEvPer100": 18.3,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Watch only",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "line": 33.5,
        "overOdds": -112,
        "underOdds": -118,
        "expectedGames": 33.4,
        "valueGrade": "No direction",
        "reason": "FanDuel total is 33.5; model did not clear a full-match over/under edge from hold, return, and set-shape data. hold avg 84%, BP saved 59%, BP converted 43%, first-set sample 8.9g, 44 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Over 9.5",
        "line": 9.5,
        "americanOdds": -108,
        "expectedGames": 9.9,
        "confidence": 62,
        "tiebreakRisk": 29,
        "earlyBreakRisk": 50,
        "modelPct": 62,
        "evPer100": 19.4,
        "netEvPer100": 17.4,
        "valueGrade": "Thin value",
        "reason": "Expected first-set games 9.9 vs FanDuel 9.5; Over 9.5. hold avg 84%, BP saved 59%, BP converted 43%, first-set sample 8.9g, 44 recent sets.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Flavio Cobolli",
          "confidence": 90,
          "modelPct": 72.7,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Zachary Svajda",
          "confidence": 57,
          "modelPct": 27.3,
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
          "name": "Flavio Cobolli",
          "holdPct": 86,
          "firstServeWonPct": 74,
          "secondServeWonPct": 57,
          "servicePointsWonPct": 67,
          "returnPointsWonPct": null,
          "returnGamesWonPct": null,
          "breakPointsSavedPct": 66.2,
          "breakPointsConvertedPct": 40.6,
          "aces": 4.3,
          "doubleFaults": 2.7,
          "winners": null,
          "unforcedErrors": null,
          "weaknessScore": 4,
          "weakServeMatches": 0,
          "statMatches": 17,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 20,
            "firstSetSamples": 8,
            "avgFirstSetGames": 9.25,
            "avgSetGames": 9.8,
            "avgMatchGames": 24.5,
            "avgSetsPlayed": 2.5,
            "tiebreakRate": 0.1,
            "extendedSetRate": 0.2,
            "shortSetRate": 0.2
          }
        },
        {
          "name": "Zachary Svajda",
          "holdPct": 82,
          "firstServeWonPct": 72,
          "secondServeWonPct": 53,
          "servicePointsWonPct": 64,
          "returnPointsWonPct": null,
          "returnGamesWonPct": null,
          "breakPointsSavedPct": 52.7,
          "breakPointsConvertedPct": 45.9,
          "aces": 6.9,
          "doubleFaults": 1.8,
          "winners": null,
          "unforcedErrors": null,
          "weaknessScore": 5,
          "weakServeMatches": 0,
          "statMatches": 9,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 24,
            "firstSetSamples": 8,
            "avgFirstSetGames": 8.625,
            "avgSetGames": 9.666666666666666,
            "avgMatchGames": 29,
            "avgSetsPlayed": 3,
            "tiebreakRate": 0.20833333333333334,
            "extendedSetRate": 0.25,
            "shortSetRate": 0.2916666666666667
          }
        }
      ],
      "expectedFirstSetGames": 9.9,
      "expectedMatchGames": 33.4,
      "signalStrength": 8,
      "holdAvg": 84,
      "returnGamesAvg": null,
      "returnPointsAvg": null,
      "breakPointsSavedAvg": 59.5,
      "breakPointsConvertedAvg": 43.3,
      "setSamples": 44,
      "firstSetSamples": 16,
      "avgFirstSetGames": 8.9,
      "avgSetGames": 9.7,
      "tiebreakRate": 15.4,
      "extendedSetRate": 22.5,
      "shortSetRate": 24.6,
      "reasonCore": "hold avg 84%, BP saved 59%, BP converted 43%, first-set sample 8.9g, 44 recent sets"
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Flavio Cobolli",
        "line": null,
        "americanOdds": -820,
        "modelPct": 72.7,
        "impliedPct": 89.1,
        "edgePct": -16.4,
        "evPer100": -18.4,
        "netEvPer100": -20.4,
        "grade": "Favorite tax trap",
        "issue": "Favorite tax trap",
        "reason": "Likely winner can still be a bad ML bet after payout and fees. Check spread, total, and set-win instead."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Flavio Cobolli",
        "line": -7.5,
        "americanOdds": -110,
        "modelPct": 63,
        "impliedPct": 52.4,
        "edgePct": 10.6,
        "evPer100": 20.3,
        "netEvPer100": 18.3,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 63,
        "grade": "Watch only",
        "reason": "Large game spread; ML may be cleaner than laying games"
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": 33.5,
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
        "selection": "Flavio Cobolli 90% / Zachary Svajda 57%",
        "rows": [
          {
            "name": "Flavio Cobolli",
            "confidence": 90,
            "modelPct": 72.7,
            "label": "Strong set-win path"
          },
          {
            "name": "Zachary Svajda",
            "confidence": 57,
            "modelPct": 27.3,
            "label": "Needs early hold pressure"
          }
        ],
        "confidence": 90,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Over 9.5",
        "expectedGames": 9.9,
        "confidence": 62,
        "tiebreakRisk": 29,
        "earlyBreakRisk": 50,
        "grade": "Thin value",
        "reason": "Expected first-set games 9.9 vs FanDuel 9.5; Over 9.5. hold avg 84%, BP saved 59%, BP converted 43%, first-set sample 8.9g, 44 recent sets."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Zachary Svajda",
      "opponent": "Flavio Cobolli",
      "grade": "Watch only",
      "riskGate": "closeout risk",
      "marketOdds": 614,
      "fairOdds": 266,
      "modelProbability": 27.3,
      "dataOnlyProbability": 30.7,
      "marketProbability": 14,
      "marketDisagreementPct": 13.3,
      "netEvPer100": 93,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Zachary Svajda is priced below the model, not guaranteed to win.",
      "useCase": "Straight ML value only at +614 or better; fair price from the ensemble is about +266.",
      "bullets": [
        "Recent hold: Zachary Svajda 81.7% vs Flavio Cobolli 85.7%.",
        "Serve events: Zachary Svajda 6.9 aces / 0 DFs vs Flavio Cobolli 4.3 aces / 0 DFs.",
        "Serve points: Zachary Svajda 1st 71.6%, 2nd 0% vs Flavio Cobolli 1st 74.2%, 2nd 0%."
      ],
      "risks": [
        "Desk lean still has Flavio Cobolli; this is a price-dislocation play, not the safest winner.",
        "Market still prices Zachary Svajda as a real underdog at 14% implied.",
        "Flavio Cobolli strength: protects serve well (86% hold)."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page Chrome scrape",
      "capturedAt": "2026-06-01T07:52:13.803Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/flavio-cobolli-v-zachary-svajda-35667144",
      "eventId": "35667144",
      "players": [
        {
          "name": "Flavio Cobolli",
          "odds": -820,
          "americanLabel": "-820",
          "impliedPct": 89.1,
          "decimalOdds": 1.122,
          "modelPct": 72.7,
          "edgePct": -16.4,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 12.2,
          "grossPayoutMultiple": 1.122,
          "centsAtRisk": 100,
          "centsProfitIfWin": 12.2
        },
        {
          "name": "Zachary Svajda",
          "odds": 550,
          "americanLabel": "+550",
          "impliedPct": 15.4,
          "decimalOdds": 6.5,
          "modelPct": 27.3,
          "edgePct": 11.9,
          "priceBand": "Underdog",
          "grossProfitPct": 550,
          "grossPayoutMultiple": 6.5,
          "centsAtRisk": 100,
          "centsProfitIfWin": 550
        }
      ],
      "desk": {
        "name": "Flavio Cobolli",
        "odds": -820,
        "americanLabel": "-820",
        "impliedPct": 89.1,
        "decimalOdds": 1.122,
        "modelPct": 72.7,
        "edgePct": -16.4,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 12.2,
        "grossPayoutMultiple": 1.122,
        "centsAtRisk": 100,
        "centsProfitIfWin": 12.2
      },
      "spread": {
        "player": "Flavio Cobolli",
        "spread": -7.5,
        "odds": -110
      },
      "total": {
        "side": "Over",
        "line": 33.5,
        "odds": -112
      },
      "totalOver": {
        "side": "Over",
        "line": 33.5,
        "odds": -112
      },
      "totalUnder": {
        "side": "Under",
        "line": 33.5,
        "odds": -118
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
        "odds": -132
      },
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "Flavio Cobolli -7.5 (-110)",
      "totalValue": "33.5 games: Over -112 / Under -118",
      "firstSetTotalValue": "9.5 1st-set games: Over -108 / Under -132",
      "spreadLean": "Large game spread; ML may be cleaner than laying games",
      "totalLean": "Over lean if both players hold early",
      "mlValue": "Flavio Cobolli -820 / Zachary Svajda +550",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 72.7% vs FanDuel implied 89.1% (-16.4 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Flavio-Cobolli-Vs-Zachary-Svajda/",
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
          "asOf": "2026-06-01"
        },
        "qualityName": "Flavio Cobolli",
        "profile": "Live rank #14 | Italy | age 24 | 2026 clay 12-5, 71% | adj form 67 | hold 86%",
        "modelPct": 72.7,
        "weakness": {
          "name": "Flavio Cobolli",
          "serviceHoldPct": 86,
          "firstServeWonPct": 74,
          "secondServeWonPct": 57,
          "firstServePct": 56,
          "avgAces": 4.3,
          "avgDoubleFaults": 2.7,
          "avgWinners": null,
          "avgUnforcedErrors": null,
          "avgBreakPointsFaced": null,
          "returnPointsWonPct": null,
          "servicePointsWonPct": 67,
          "weakServeMatches": 0,
          "pressureMatches": 5,
          "matchesWithStats": 17,
          "weaknessScore": 4,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "protects serve well (86% hold)",
            "wins enough first-serve points (74%)",
            "second serve holds up (57%)"
          ],
          "gameFlowRead": "Flavio Cobolli has no major service weakness in the joined Flashscore sample."
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
          "asOf": "2026-06-01"
        },
        "qualityName": "Zachary Svajda",
        "profile": "Live rank #85 | USA | age 23 | 2026 clay 4-5, 44% | adj form 67 | hold 82%",
        "modelPct": 27.3,
        "weakness": {
          "name": "Zachary Svajda",
          "serviceHoldPct": 82,
          "firstServeWonPct": 72,
          "secondServeWonPct": 53,
          "firstServePct": 61,
          "avgAces": 6.9,
          "avgDoubleFaults": 1.8,
          "avgWinners": null,
          "avgUnforcedErrors": null,
          "avgBreakPointsFaced": null,
          "returnPointsWonPct": null,
          "servicePointsWonPct": 64,
          "weakServeMatches": 0,
          "pressureMatches": 6,
          "matchesWithStats": 9,
          "weaknessScore": 5,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "protects serve well (82% hold)",
            "wins enough first-serve points (72%)"
          ],
          "gameFlowRead": "Zachary Svajda has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-w-anastasia-potapova-anna-kalinskaya-2026-06-01",
    "eventId": "175554",
    "tour": "WTA",
    "bestOf": 3,
    "surface": "Clay",
    "title": "Anastasia Potapova vs Anna Kalinskaya",
    "start": "2:15 AM",
    "startMinutes": 135,
    "court": "Court Suzanne-Lenglen",
    "round": "Round 4",
    "pickName": "Anastasia Potapova",
    "basePickName": "Anastasia Potapova",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 75.3,
    "volatility": 50,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Lean",
      "Price required",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Anastasia Potapova has the recent service-hold edge 70% to 54%. Anastasia Potapova grades 32 points better on opponent-adjusted recent form. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness edge",
      "target": "Anna Kalinskaya",
      "scoreGap": 18,
      "attackingSide": "Anastasia Potapova",
      "vulnerableSide": "Anna Kalinskaya",
      "gameFlow": "Anastasia Potapova has a real path if Anna Kalinskaya's first two service games show the same weakness: low recent hold rate (54%); first-serve points won below comfort (57%).",
      "liveTrigger": "Look for Anna Kalinskaya facing break points or second-serve pressure before 3-3.",
      "spreadRead": "Anastasia Potapova spread only if the handicap is short and Anna Kalinskaya is under pressure early.",
      "totalRead": "Avoid low unders if Anna Kalinskaya faces early break points or second-serve pressure.",
      "pick": {
        "name": "Anastasia Potapova",
        "serviceHoldPct": 70,
        "firstServeWonPct": 68,
        "secondServeWonPct": 44,
        "firstServePct": 60,
        "avgAces": 3.3,
        "avgDoubleFaults": 4.3,
        "avgWinners": null,
        "avgUnforcedErrors": null,
        "avgBreakPointsFaced": null,
        "returnPointsWonPct": null,
        "servicePointsWonPct": 58,
        "weakServeMatches": 0,
        "pressureMatches": 5,
        "matchesWithStats": 21,
        "weaknessScore": 9,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "second-serve points won are attackable (44%)",
          "double-fault pressure (4.3 avg)"
        ],
        "strengths": [],
        "gameFlowRead": "Anastasia Potapova can drop points quickly through second-serve points won are attackable (44%) and double-fault pressure (4.3 avg)."
      },
      "opponent": {
        "name": "Anna Kalinskaya",
        "serviceHoldPct": 54,
        "firstServeWonPct": 57,
        "secondServeWonPct": 40,
        "firstServePct": 70,
        "avgAces": 1.5,
        "avgDoubleFaults": 4.5,
        "avgWinners": null,
        "avgUnforcedErrors": null,
        "avgBreakPointsFaced": null,
        "returnPointsWonPct": null,
        "servicePointsWonPct": 52,
        "weakServeMatches": 0,
        "pressureMatches": 3,
        "matchesWithStats": 10,
        "weaknessScore": 27,
        "firstGameComfort": "Fragile opening-service profile",
        "liabilities": [
          "low recent hold rate (54%)",
          "first-serve points won below comfort (57%)",
          "second-serve points won are attackable (40%)",
          "double-fault pressure (4.5 avg)"
        ],
        "strengths": [],
        "gameFlowRead": "Anna Kalinskaya can drop points quickly through low recent hold rate (54%) and first-serve points won below comfort (57%)."
      }
    },
    "setWinProjections": [
      {
        "name": "Anastasia Potapova",
        "confidence": 81,
        "modelPct": 75.3,
        "label": "Live to win a set"
      },
      {
        "name": "Anna Kalinskaya",
        "confidence": 37,
        "modelPct": 24.7,
        "label": "Thin set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Anastasia Potapova",
        "americanOdds": -220,
        "modelPct": 75.3,
        "impliedPct": 68.8,
        "edgePct": 6.5,
        "evPer100": 9.5,
        "netEvPer100": 7.5,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Favorite price needs better proof",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Anastasia Potapova",
        "line": -3.5,
        "americanOdds": -118,
        "modelPct": 73,
        "impliedPct": 54.1,
        "edgePct": 18.9,
        "evPer100": 34.9,
        "netEvPer100": 32.9,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Watch only",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "line": 21.5,
        "overOdds": -118,
        "underOdds": -112,
        "expectedGames": 21.8,
        "valueGrade": "No direction",
        "reason": "FanDuel total is 21.5; model did not clear a full-match over/under edge from hold, return, and set-shape data. hold avg 62%, BP saved 56%, BP converted 55%, first-set sample 9.8g, 38 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Under 9.5",
        "line": 9.5,
        "americanOdds": -128,
        "expectedGames": 8.7,
        "confidence": 66,
        "tiebreakRisk": 18,
        "earlyBreakRisk": 60,
        "modelPct": 66,
        "evPer100": 17.6,
        "netEvPer100": 15.6,
        "valueGrade": "Actionable live watch",
        "reason": "Expected first-set games 8.7 vs FanDuel 9.5; Under 9.5. hold avg 62%, BP saved 56%, BP converted 55%, first-set sample 9.8g, 38 recent sets.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Anastasia Potapova",
          "confidence": 81,
          "modelPct": 75.3,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Anna Kalinskaya",
          "confidence": 37,
          "modelPct": 24.7,
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
          "name": "Anastasia Potapova",
          "holdPct": 70,
          "firstServeWonPct": 68,
          "secondServeWonPct": 44,
          "servicePointsWonPct": 58,
          "returnPointsWonPct": null,
          "returnGamesWonPct": null,
          "breakPointsSavedPct": 59.1,
          "breakPointsConvertedPct": 49.8,
          "aces": 3.3,
          "doubleFaults": 4.3,
          "winners": null,
          "unforcedErrors": null,
          "weaknessScore": 9,
          "weakServeMatches": 0,
          "statMatches": 21,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 20,
            "firstSetSamples": 8,
            "avgFirstSetGames": 10.25,
            "avgSetGames": 9.55,
            "avgMatchGames": 23.875,
            "avgSetsPlayed": 2.5,
            "tiebreakRate": 0.1,
            "extendedSetRate": 0.2,
            "shortSetRate": 0.4
          }
        },
        {
          "name": "Anna Kalinskaya",
          "holdPct": 54,
          "firstServeWonPct": 57,
          "secondServeWonPct": 40,
          "servicePointsWonPct": 52,
          "returnPointsWonPct": null,
          "returnGamesWonPct": null,
          "breakPointsSavedPct": 51.9,
          "breakPointsConvertedPct": 59.5,
          "aces": 1.5,
          "doubleFaults": 4.5,
          "winners": null,
          "unforcedErrors": null,
          "weaknessScore": 27,
          "weakServeMatches": 0,
          "statMatches": 10,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 18,
            "firstSetSamples": 8,
            "avgFirstSetGames": 9.375,
            "avgSetGames": 9.333333333333334,
            "avgMatchGames": 21,
            "avgSetsPlayed": 2.25,
            "tiebreakRate": 0.1111111111111111,
            "extendedSetRate": 0.16666666666666666,
            "shortSetRate": 0.3333333333333333
          }
        }
      ],
      "expectedFirstSetGames": 8.7,
      "expectedMatchGames": 21.8,
      "signalStrength": 8,
      "holdAvg": 62,
      "returnGamesAvg": null,
      "returnPointsAvg": null,
      "breakPointsSavedAvg": 55.5,
      "breakPointsConvertedAvg": 54.6,
      "setSamples": 38,
      "firstSetSamples": 16,
      "avgFirstSetGames": 9.8,
      "avgSetGames": 9.4,
      "tiebreakRate": 10.6,
      "extendedSetRate": 18.3,
      "shortSetRate": 36.7,
      "reasonCore": "hold avg 62%, BP saved 56%, BP converted 55%, first-set sample 9.8g, 38 recent sets"
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Anastasia Potapova",
        "line": null,
        "americanOdds": -220,
        "modelPct": 75.3,
        "impliedPct": 68.8,
        "edgePct": 6.5,
        "evPer100": 9.5,
        "netEvPer100": 7.5,
        "grade": "Favorite price needs better proof",
        "issue": "Favorite price needs better proof",
        "reason": "ML is close to fair; derivative or live entry needs to carry the edge."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Anastasia Potapova",
        "line": -3.5,
        "americanOdds": -118,
        "modelPct": 73,
        "impliedPct": 54.1,
        "edgePct": 18.9,
        "evPer100": 34.9,
        "netEvPer100": 32.9,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 73,
        "grade": "Watch only",
        "reason": "Anastasia Potapova spread is playable only if early return pressure shows"
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
        "selection": "Anastasia Potapova 81% / Anna Kalinskaya 37%",
        "rows": [
          {
            "name": "Anastasia Potapova",
            "confidence": 81,
            "modelPct": 75.3,
            "label": "Live to win a set"
          },
          {
            "name": "Anna Kalinskaya",
            "confidence": 37,
            "modelPct": 24.7,
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
        "selection": "Under 9.5",
        "expectedGames": 8.7,
        "confidence": 66,
        "tiebreakRisk": 18,
        "earlyBreakRisk": 60,
        "grade": "Actionable live watch",
        "reason": "Expected first-set games 8.7 vs FanDuel 9.5; Under 9.5. hold avg 62%, BP saved 56%, BP converted 55%, first-set sample 9.8g, 38 recent sets."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Anastasia Potapova",
      "opponent": "Anna Kalinskaya",
      "grade": "Playable favorite",
      "riskGate": "error-control risk, hold risk, closeout risk",
      "marketOdds": -203,
      "fairOdds": -304,
      "modelProbability": 75.3,
      "dataOnlyProbability": 78,
      "marketProbability": 67,
      "marketDisagreementPct": 8.3,
      "netEvPer100": 10.3,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Anastasia Potapova is priced below the model, not guaranteed to win.",
      "useCase": "Favorite price needs cleaner proof or derivative value; do not confuse win probability with bet value.",
      "bullets": [
        "Recent hold: Anastasia Potapova 69.5% vs Anna Kalinskaya 54.2%.",
        "Serve events: Anastasia Potapova 3.3 aces / 0 DFs vs Anna Kalinskaya 1.5 aces / 0 DFs.",
        "Serve points: Anastasia Potapova 1st 67.8%, 2nd 0% vs Anna Kalinskaya 1st 56.6%, 2nd 0%."
      ],
      "risks": [
        "Anastasia Potapova risk: second-serve points won are attackable (44%)."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page Chrome scrape",
      "capturedAt": "2026-06-01T07:51:26.520Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/anastasia-potapova-v-anna-kalinskaya-35668143",
      "eventId": "35668143",
      "players": [
        {
          "name": "Anastasia Potapova",
          "odds": -220,
          "americanLabel": "-220",
          "impliedPct": 68.8,
          "decimalOdds": 1.455,
          "modelPct": 75.3,
          "edgePct": 6.5,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 45.5,
          "grossPayoutMultiple": 1.455,
          "centsAtRisk": 100,
          "centsProfitIfWin": 45.5
        },
        {
          "name": "Anna Kalinskaya",
          "odds": 180,
          "americanLabel": "+180",
          "impliedPct": 35.7,
          "decimalOdds": 2.8,
          "modelPct": 24.7,
          "edgePct": -11,
          "priceBand": "Underdog",
          "grossProfitPct": 180,
          "grossPayoutMultiple": 2.8,
          "centsAtRisk": 100,
          "centsProfitIfWin": 180
        }
      ],
      "desk": {
        "name": "Anastasia Potapova",
        "odds": -220,
        "americanLabel": "-220",
        "impliedPct": 68.8,
        "decimalOdds": 1.455,
        "modelPct": 75.3,
        "edgePct": 6.5,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 45.5,
        "grossPayoutMultiple": 1.455,
        "centsAtRisk": 100,
        "centsProfitIfWin": 45.5
      },
      "spread": {
        "player": "Anastasia Potapova",
        "spread": -3.5,
        "odds": -118
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
        "odds": -128
      },
      "priceAction": "ML is close to fair; derivative or live entry needs to carry the edge.",
      "spreadValue": "Anastasia Potapova -3.5 (-118)",
      "totalValue": "21.5 games: Over -118 / Under -112",
      "firstSetTotalValue": "9.5 1st-set games: Over -108 / Under -128",
      "spreadLean": "Anastasia Potapova spread is playable only if early return pressure shows",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Anastasia Potapova -220 / Anna Kalinskaya +180",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. ML is close to fair; derivative or live entry needs to carry the edge.",
      "noVigNote": "Model 75.3% vs FanDuel implied 68.8% (+6.5 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Anastasia-Potapova-Vs-Anna-Kalinskaya/",
    "players": [
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
          "asOf": "2026-06-01"
        },
        "qualityName": "Anastasia Potapova",
        "profile": "Live rank #30 | Austria | age 25 | 2026 clay 17-4, 81% | adj form 97 | hold 70%",
        "modelPct": 75.3,
        "weakness": {
          "name": "Anastasia Potapova",
          "serviceHoldPct": 70,
          "firstServeWonPct": 68,
          "secondServeWonPct": 44,
          "firstServePct": 60,
          "avgAces": 3.3,
          "avgDoubleFaults": 4.3,
          "avgWinners": null,
          "avgUnforcedErrors": null,
          "avgBreakPointsFaced": null,
          "returnPointsWonPct": null,
          "servicePointsWonPct": 58,
          "weakServeMatches": 0,
          "pressureMatches": 5,
          "matchesWithStats": 21,
          "weaknessScore": 9,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "second-serve points won are attackable (44%)",
            "double-fault pressure (4.3 avg)"
          ],
          "strengths": [],
          "gameFlowRead": "Anastasia Potapova can drop points quickly through second-serve points won are attackable (44%) and double-fault pressure (4.3 avg)."
        }
      },
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
          "asOf": "2026-06-01"
        },
        "qualityName": "Anna Kalinskaya",
        "profile": "Live rank #24 | Russia | age 27 | 2026 clay 7-3, 70% | adj form 65 | hold 54%",
        "modelPct": 24.7,
        "weakness": {
          "name": "Anna Kalinskaya",
          "serviceHoldPct": 54,
          "firstServeWonPct": 57,
          "secondServeWonPct": 40,
          "firstServePct": 70,
          "avgAces": 1.5,
          "avgDoubleFaults": 4.5,
          "avgWinners": null,
          "avgUnforcedErrors": null,
          "avgBreakPointsFaced": null,
          "returnPointsWonPct": null,
          "servicePointsWonPct": 52,
          "weakServeMatches": 0,
          "pressureMatches": 3,
          "matchesWithStats": 10,
          "weaknessScore": 27,
          "firstGameComfort": "Fragile opening-service profile",
          "liabilities": [
            "low recent hold rate (54%)",
            "first-serve points won below comfort (57%)",
            "second-serve points won are attackable (40%)",
            "double-fault pressure (4.5 avg)"
          ],
          "strengths": [],
          "gameFlowRead": "Anna Kalinskaya can drop points quickly through low recent hold rate (54%) and first-serve points won below comfort (57%)."
        }
      }
    ]
  },
  {
    "id": "rg-w-madison-keys-diana-shnaider-2026-06-01",
    "eventId": "175540",
    "tour": "WTA",
    "bestOf": 3,
    "surface": "Clay",
    "title": "Madison Keys vs Diana Shnaider",
    "start": "5:30 AM",
    "startMinutes": 330,
    "court": "Court Suzanne-Lenglen",
    "round": "Round 4",
    "pickName": "Madison Keys",
    "basePickName": "Madison Keys",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 66.3,
    "volatility": 46,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Lean",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Madison Keys has the recent service-hold edge 76% to 62%. Madison Keys grades 29 points better on opponent-adjusted recent form. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness edge",
      "target": "Diana Shnaider",
      "scoreGap": 12,
      "attackingSide": "Madison Keys",
      "vulnerableSide": "Diana Shnaider",
      "gameFlow": "Madison Keys has a real path if Diana Shnaider's first two service games show the same weakness: low recent hold rate (62%); first-serve points won below comfort (58%).",
      "liveTrigger": "Look for Diana Shnaider facing break points or second-serve pressure before 3-3.",
      "spreadRead": "Madison Keys spread only if the handicap is short and Diana Shnaider is under pressure early.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Madison Keys",
        "serviceHoldPct": 76,
        "firstServeWonPct": 64,
        "secondServeWonPct": 53,
        "firstServePct": 72,
        "avgAces": 3.2,
        "avgDoubleFaults": 2.1,
        "avgWinners": null,
        "avgUnforcedErrors": null,
        "avgBreakPointsFaced": null,
        "returnPointsWonPct": null,
        "servicePointsWonPct": 61,
        "weakServeMatches": 0,
        "pressureMatches": 2,
        "matchesWithStats": 14,
        "weaknessScore": 0,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Madison Keys has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Diana Shnaider",
        "serviceHoldPct": 62,
        "firstServeWonPct": 58,
        "secondServeWonPct": 48,
        "firstServePct": 71,
        "avgAces": 0.8,
        "avgDoubleFaults": 3.3,
        "avgWinners": null,
        "avgUnforcedErrors": null,
        "avgBreakPointsFaced": null,
        "returnPointsWonPct": null,
        "servicePointsWonPct": 55,
        "weakServeMatches": 0,
        "pressureMatches": 4,
        "matchesWithStats": 12,
        "weaknessScore": 12,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "low recent hold rate (62%)",
          "first-serve points won below comfort (58%)"
        ],
        "strengths": [],
        "gameFlowRead": "Diana Shnaider can drop points quickly through low recent hold rate (62%) and first-serve points won below comfort (58%)."
      }
    },
    "setWinProjections": [
      {
        "name": "Madison Keys",
        "confidence": 78,
        "modelPct": 66.3,
        "label": "Live to win a set"
      },
      {
        "name": "Diana Shnaider",
        "confidence": 47,
        "modelPct": 33.7,
        "label": "Thin set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Madison Keys",
        "americanOdds": -156,
        "modelPct": 66.3,
        "impliedPct": 60.9,
        "edgePct": 5.4,
        "evPer100": 8.8,
        "netEvPer100": 6.8,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Favorite price needs better proof",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Madison Keys",
        "line": -2.5,
        "americanOdds": -112,
        "modelPct": 64,
        "impliedPct": 52.8,
        "edgePct": 11.2,
        "evPer100": 21.1,
        "netEvPer100": 19.1,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Watch only",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "line": 21.5,
        "overOdds": -126,
        "underOdds": -108,
        "expectedGames": 21.7,
        "valueGrade": "No direction",
        "reason": "FanDuel total is 21.5; model did not clear a full-match over/under edge from hold, return, and set-shape data. hold avg 69%, BP saved 62%, BP converted 48%, first-set sample 9.6g, 36 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Pass / near line",
        "line": 9.5,
        "americanOdds": null,
        "expectedGames": 9.3,
        "confidence": 52,
        "tiebreakRisk": 18,
        "earlyBreakRisk": 56,
        "modelPct": 52,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Near fair",
        "reason": "Expected first-set games 9.3 vs FanDuel 9.5; near the number. hold avg 69%, BP saved 62%, BP converted 48%, first-set sample 9.6g, 36 recent sets.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Madison Keys",
          "confidence": 78,
          "modelPct": 66.3,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Diana Shnaider",
          "confidence": 47,
          "modelPct": 33.7,
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
          "name": "Madison Keys",
          "holdPct": 76,
          "firstServeWonPct": 64,
          "secondServeWonPct": 53,
          "servicePointsWonPct": 61,
          "returnPointsWonPct": null,
          "returnGamesWonPct": null,
          "breakPointsSavedPct": 66,
          "breakPointsConvertedPct": 46.6,
          "aces": 3.2,
          "doubleFaults": 2.1,
          "winners": null,
          "unforcedErrors": null,
          "weaknessScore": 0,
          "weakServeMatches": 0,
          "statMatches": 14,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 18,
            "firstSetSamples": 8,
            "avgFirstSetGames": 9.25,
            "avgSetGames": 8.833333333333334,
            "avgMatchGames": 19.875,
            "avgSetsPlayed": 2.25,
            "tiebreakRate": 0,
            "extendedSetRate": 0.1111111111111111,
            "shortSetRate": 0.3888888888888889
          }
        },
        {
          "name": "Diana Shnaider",
          "holdPct": 62,
          "firstServeWonPct": 58,
          "secondServeWonPct": 48,
          "servicePointsWonPct": 55,
          "returnPointsWonPct": null,
          "returnGamesWonPct": null,
          "breakPointsSavedPct": 58,
          "breakPointsConvertedPct": 49.6,
          "aces": 0.8,
          "doubleFaults": 3.3,
          "winners": null,
          "unforcedErrors": null,
          "weaknessScore": 12,
          "weakServeMatches": 0,
          "statMatches": 12,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 18,
            "firstSetSamples": 8,
            "avgFirstSetGames": 10,
            "avgSetGames": 9.166666666666666,
            "avgMatchGames": 20.625,
            "avgSetsPlayed": 2.25,
            "tiebreakRate": 0.1111111111111111,
            "extendedSetRate": 0.2777777777777778,
            "shortSetRate": 0.5
          }
        }
      ],
      "expectedFirstSetGames": 9.3,
      "expectedMatchGames": 21.7,
      "signalStrength": 7,
      "holdAvg": 69,
      "returnGamesAvg": null,
      "returnPointsAvg": null,
      "breakPointsSavedAvg": 62,
      "breakPointsConvertedAvg": 48.1,
      "setSamples": 36,
      "firstSetSamples": 16,
      "avgFirstSetGames": 9.6,
      "avgSetGames": 9,
      "tiebreakRate": 5.6,
      "extendedSetRate": 19.4,
      "shortSetRate": 44.4,
      "reasonCore": "hold avg 69%, BP saved 62%, BP converted 48%, first-set sample 9.6g, 36 recent sets"
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Madison Keys",
        "line": null,
        "americanOdds": -156,
        "modelPct": 66.3,
        "impliedPct": 60.9,
        "edgePct": 5.4,
        "evPer100": 8.8,
        "netEvPer100": 6.8,
        "grade": "Favorite price needs better proof",
        "issue": "Favorite price needs better proof",
        "reason": "ML is close to fair; derivative or live entry needs to carry the edge."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Madison Keys",
        "line": -2.5,
        "americanOdds": -112,
        "modelPct": 64,
        "impliedPct": 52.8,
        "edgePct": 11.2,
        "evPer100": 21.1,
        "netEvPer100": 19.1,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 64,
        "grade": "Watch only",
        "reason": "Madison Keys spread is playable only if early return pressure shows"
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
        "selection": "Madison Keys 78% / Diana Shnaider 47%",
        "rows": [
          {
            "name": "Madison Keys",
            "confidence": 78,
            "modelPct": 66.3,
            "label": "Live to win a set"
          },
          {
            "name": "Diana Shnaider",
            "confidence": 47,
            "modelPct": 33.7,
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
        "selection": "Pass / near line",
        "expectedGames": 9.3,
        "confidence": 52,
        "tiebreakRisk": 18,
        "earlyBreakRisk": 56,
        "grade": "Near fair",
        "reason": "Expected first-set games 9.3 vs FanDuel 9.5; near the number. hold avg 69%, BP saved 62%, BP converted 48%, first-set sample 9.6g, 36 recent sets."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Madison Keys",
      "opponent": "Diana Shnaider",
      "grade": "Playable favorite",
      "riskGate": "error-control risk",
      "marketOdds": -156,
      "fairOdds": -197,
      "modelProbability": 66.3,
      "dataOnlyProbability": 69.2,
      "marketProbability": 61,
      "marketDisagreementPct": 5.3,
      "netEvPer100": 6.9,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Madison Keys is priced below the model, not guaranteed to win.",
      "useCase": "Favorite price needs cleaner proof or derivative value; do not confuse win probability with bet value.",
      "bullets": [
        "Recent hold: Madison Keys 75.8% vs Diana Shnaider 61.8%.",
        "Serve events: Madison Keys 3.2 aces / 0 DFs vs Diana Shnaider 0.8 aces / 0 DFs.",
        "Serve points: Madison Keys 1st 64.4%, 2nd 0% vs Diana Shnaider 1st 57.5%, 2nd 0%."
      ],
      "risks": [
        "Risk is mostly normal tennis variance; do not size this like a lock."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page Chrome scrape",
      "capturedAt": "2026-06-01T07:51:07.647Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/madison-keys-v-diana-shnaider-35668416",
      "eventId": "35668416",
      "players": [
        {
          "name": "Madison Keys",
          "odds": -156,
          "americanLabel": "-156",
          "impliedPct": 60.9,
          "decimalOdds": 1.641,
          "modelPct": 66.3,
          "edgePct": 5.4,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 64.1,
          "grossPayoutMultiple": 1.641,
          "centsAtRisk": 100,
          "centsProfitIfWin": 64.1
        },
        {
          "name": "Diana Shnaider",
          "odds": 130,
          "americanLabel": "+130",
          "impliedPct": 43.5,
          "decimalOdds": 2.3,
          "modelPct": 33.7,
          "edgePct": -9.8,
          "priceBand": "Underdog",
          "grossProfitPct": 130,
          "grossPayoutMultiple": 2.3,
          "centsAtRisk": 100,
          "centsProfitIfWin": 130
        }
      ],
      "desk": {
        "name": "Madison Keys",
        "odds": -156,
        "americanLabel": "-156",
        "impliedPct": 60.9,
        "decimalOdds": 1.641,
        "modelPct": 66.3,
        "edgePct": 5.4,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 64.1,
        "grossPayoutMultiple": 1.641,
        "centsAtRisk": 100,
        "centsProfitIfWin": 64.1
      },
      "spread": {
        "player": "Madison Keys",
        "spread": -2.5,
        "odds": -112
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
        "odds": -108
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
        "odds": -126
      },
      "priceAction": "ML is close to fair; derivative or live entry needs to carry the edge.",
      "spreadValue": "Madison Keys -2.5 (-112)",
      "totalValue": "21.5 games: Over -126 / Under -108",
      "firstSetTotalValue": "9.5 1st-set games: Over -108 / Under -126",
      "spreadLean": "Madison Keys spread is playable only if early return pressure shows",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Madison Keys -156 / Diana Shnaider +130",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. ML is close to fair; derivative or live entry needs to carry the edge.",
      "noVigNote": "Model 66.3% vs FanDuel implied 60.9% (+5.4 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Madison-Keys-Vs-Diana-Shnaider/",
    "players": [
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
          "asOf": "2026-06-01"
        },
        "qualityName": "Madison Keys",
        "profile": "Live rank #19 | USA | age 31 | 2026 clay 11-3, 79% | adj form 95 | hold 76%",
        "modelPct": 66.3,
        "weakness": {
          "name": "Madison Keys",
          "serviceHoldPct": 76,
          "firstServeWonPct": 64,
          "secondServeWonPct": 53,
          "firstServePct": 72,
          "avgAces": 3.2,
          "avgDoubleFaults": 2.1,
          "avgWinners": null,
          "avgUnforcedErrors": null,
          "avgBreakPointsFaced": null,
          "returnPointsWonPct": null,
          "servicePointsWonPct": 61,
          "weakServeMatches": 0,
          "pressureMatches": 2,
          "matchesWithStats": 14,
          "weaknessScore": 0,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Madison Keys has no major service weakness in the joined Flashscore sample."
        }
      },
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
          "asOf": "2026-06-01"
        },
        "qualityName": "Diana Shnaider",
        "profile": "Live rank #23 | Russia | age 22 | 2026 clay 8-4, 67% | adj form 67 | hold 62%",
        "modelPct": 33.7,
        "weakness": {
          "name": "Diana Shnaider",
          "serviceHoldPct": 62,
          "firstServeWonPct": 58,
          "secondServeWonPct": 48,
          "firstServePct": 71,
          "avgAces": 0.8,
          "avgDoubleFaults": 3.3,
          "avgWinners": null,
          "avgUnforcedErrors": null,
          "avgBreakPointsFaced": null,
          "returnPointsWonPct": null,
          "servicePointsWonPct": 55,
          "weakServeMatches": 0,
          "pressureMatches": 4,
          "matchesWithStats": 12,
          "weaknessScore": 12,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "low recent hold rate (62%)",
            "first-serve points won below comfort (58%)"
          ],
          "strengths": [],
          "gameFlowRead": "Diana Shnaider can drop points quickly through low recent hold rate (62%) and first-serve points won below comfort (58%)."
        }
      }
    ]
  },
  {
    "id": "rg-w-maja-chwalinska-diane-parry-2026-06-01",
    "eventId": "175562",
    "tour": "WTA",
    "bestOf": 3,
    "surface": "Clay",
    "title": "Maja Chwalinska vs Diane Parry",
    "start": "5:50 AM",
    "startMinutes": 350,
    "court": "Court Philippe-Chatrier",
    "round": "Round 4",
    "pickName": "Maja Chwalinska",
    "basePickName": "Diane Parry",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": true,
    "confidence": 74.4,
    "volatility": 51,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Lean",
      "Model split - pass ML",
      "Positive price edge",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Maja Chwalinska has the recent service-hold edge 75% to 69%. Diane Parry grades 89 points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price. Lean, not a chase.",
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
        "name": "Maja Chwalinska",
        "serviceHoldPct": 75,
        "firstServeWonPct": 62,
        "secondServeWonPct": 57,
        "firstServePct": 70,
        "avgAces": 0.6,
        "avgDoubleFaults": 1,
        "avgWinners": null,
        "avgUnforcedErrors": null,
        "avgBreakPointsFaced": null,
        "returnPointsWonPct": null,
        "servicePointsWonPct": 61,
        "weakServeMatches": 0,
        "pressureMatches": 3,
        "matchesWithStats": 7,
        "weaknessScore": 1,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "second serve holds up (57%)"
        ],
        "gameFlowRead": "Maja Chwalinska has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Diane Parry",
        "serviceHoldPct": 69,
        "firstServeWonPct": 62,
        "secondServeWonPct": 49,
        "firstServePct": 66,
        "avgAces": 3.2,
        "avgDoubleFaults": 2.8,
        "avgWinners": null,
        "avgUnforcedErrors": null,
        "avgBreakPointsFaced": null,
        "returnPointsWonPct": null,
        "servicePointsWonPct": 58,
        "weakServeMatches": 0,
        "pressureMatches": 4,
        "matchesWithStats": 13,
        "weaknessScore": 2,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Diane Parry has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Maja Chwalinska",
        "confidence": 82,
        "modelPct": 74.4,
        "label": "Strong set-win path"
      },
      {
        "name": "Diane Parry",
        "confidence": 41,
        "modelPct": 25.6,
        "label": "Thin set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Maja Chwalinska",
        "americanOdds": -205,
        "modelPct": 74.4,
        "impliedPct": 67.2,
        "edgePct": 7.2,
        "evPer100": 10.7,
        "netEvPer100": 8.7,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Favorite price needs better proof",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Maja Chwalinska",
        "line": -3.5,
        "americanOdds": -118,
        "modelPct": 68,
        "impliedPct": 54.1,
        "edgePct": 13.9,
        "evPer100": 25.6,
        "netEvPer100": 23.6,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Watch only",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "line": 21.5,
        "overOdds": -110,
        "underOdds": -120,
        "expectedGames": 20.9,
        "valueGrade": "No direction",
        "reason": "FanDuel total is 21.5; model did not clear a full-match over/under edge from hold, return, and set-shape data. hold avg 72%, BP saved 52%, BP converted 49%, first-set sample 9g, 33 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Under 9.5",
        "line": 9.5,
        "americanOdds": -136,
        "expectedGames": 9,
        "confidence": 62,
        "tiebreakRisk": 18,
        "earlyBreakRisk": 50,
        "modelPct": 62,
        "evPer100": 7.6,
        "netEvPer100": 5.6,
        "valueGrade": "Thin value",
        "reason": "Expected first-set games 9 vs FanDuel 9.5; Under 9.5. hold avg 72%, BP saved 52%, BP converted 49%, first-set sample 9g, 33 recent sets.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Maja Chwalinska",
          "confidence": 82,
          "modelPct": 74.4,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Diane Parry",
          "confidence": 41,
          "modelPct": 25.6,
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
          "name": "Maja Chwalinska",
          "holdPct": 75,
          "firstServeWonPct": 62,
          "secondServeWonPct": 57,
          "servicePointsWonPct": 61,
          "returnPointsWonPct": null,
          "returnGamesWonPct": null,
          "breakPointsSavedPct": 50,
          "breakPointsConvertedPct": 61,
          "aces": 0.6,
          "doubleFaults": 1,
          "winners": null,
          "unforcedErrors": null,
          "weaknessScore": 1,
          "weakServeMatches": 0,
          "statMatches": 7,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 17,
            "firstSetSamples": 8,
            "avgFirstSetGames": 8.875,
            "avgSetGames": 8.529411764705882,
            "avgMatchGames": 18.125,
            "avgSetsPlayed": 2.125,
            "tiebreakRate": 0.058823529411764705,
            "extendedSetRate": 0.11764705882352941,
            "shortSetRate": 0.47058823529411764
          }
        },
        {
          "name": "Diane Parry",
          "holdPct": 69,
          "firstServeWonPct": 62,
          "secondServeWonPct": 49,
          "servicePointsWonPct": 58,
          "returnPointsWonPct": null,
          "returnGamesWonPct": null,
          "breakPointsSavedPct": 54.5,
          "breakPointsConvertedPct": 37.5,
          "aces": 3.2,
          "doubleFaults": 2.8,
          "winners": null,
          "unforcedErrors": null,
          "weaknessScore": 2,
          "weakServeMatches": 0,
          "statMatches": 13,
          "setShape": {
            "completedMatches": 7,
            "setSamples": 16,
            "firstSetSamples": 7,
            "avgFirstSetGames": 9.142857142857142,
            "avgSetGames": 9.9375,
            "avgMatchGames": 22.714285714285715,
            "avgSetsPlayed": 2.2857142857142856,
            "tiebreakRate": 0.25,
            "extendedSetRate": 0.3125,
            "shortSetRate": 0.25
          }
        }
      ],
      "expectedFirstSetGames": 9,
      "expectedMatchGames": 20.9,
      "signalStrength": 7,
      "holdAvg": 72,
      "returnGamesAvg": null,
      "returnPointsAvg": null,
      "breakPointsSavedAvg": 52.3,
      "breakPointsConvertedAvg": 49.3,
      "setSamples": 33,
      "firstSetSamples": 15,
      "avgFirstSetGames": 9,
      "avgSetGames": 9.2,
      "tiebreakRate": 15.4,
      "extendedSetRate": 21.5,
      "shortSetRate": 36,
      "reasonCore": "hold avg 72%, BP saved 52%, BP converted 49%, first-set sample 9g, 33 recent sets"
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Maja Chwalinska",
        "line": null,
        "americanOdds": -205,
        "modelPct": 74.4,
        "impliedPct": 67.2,
        "edgePct": 7.2,
        "evPer100": 10.7,
        "netEvPer100": 8.7,
        "grade": "Favorite price needs better proof",
        "issue": "Favorite price needs better proof",
        "reason": "Model is meaningfully above FanDuel implied price."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Maja Chwalinska",
        "line": -3.5,
        "americanOdds": -118,
        "modelPct": 68,
        "impliedPct": 54.1,
        "edgePct": 13.9,
        "evPer100": 25.6,
        "netEvPer100": 23.6,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 68,
        "grade": "Watch only",
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
        "selection": "Maja Chwalinska 82% / Diane Parry 41%",
        "rows": [
          {
            "name": "Maja Chwalinska",
            "confidence": 82,
            "modelPct": 74.4,
            "label": "Strong set-win path"
          },
          {
            "name": "Diane Parry",
            "confidence": 41,
            "modelPct": 25.6,
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
        "expectedGames": 9,
        "confidence": 62,
        "tiebreakRisk": 18,
        "earlyBreakRisk": 50,
        "grade": "Thin value",
        "reason": "Expected first-set games 9 vs FanDuel 9.5; Under 9.5. hold avg 72%, BP saved 52%, BP converted 49%, first-set sample 9g, 33 recent sets."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Maja Chwalinska",
      "opponent": "Diane Parry",
      "grade": "Playable favorite",
      "riskGate": "closeout risk",
      "marketOdds": -194,
      "fairOdds": -291,
      "modelProbability": 74.4,
      "dataOnlyProbability": 77.3,
      "marketProbability": 66,
      "marketDisagreementPct": 8.4,
      "netEvPer100": 10.8,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Maja Chwalinska is priced below the model, not guaranteed to win.",
      "useCase": "Favorite price needs cleaner proof or derivative value; do not confuse win probability with bet value.",
      "bullets": [
        "Recent hold: Maja Chwalinska 74.8% vs Diane Parry 68.5%.",
        "Serve events: Maja Chwalinska 0.6 aces / 0 DFs vs Diane Parry 3.2 aces / 0 DFs.",
        "Serve points: Maja Chwalinska 1st 62%, 2nd 0% vs Diane Parry 1st 62.2%, 2nd 0%."
      ],
      "risks": [
        "Risk is mostly normal tennis variance; do not size this like a lock."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page Chrome scrape",
      "capturedAt": "2026-06-01T07:51:35.969Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/maja-chwalinska-v-diane-parry-35667464",
      "eventId": "35667464",
      "players": [
        {
          "name": "Maja Chwalinska",
          "odds": -205,
          "americanLabel": "-205",
          "impliedPct": 67.2,
          "decimalOdds": 1.488,
          "modelPct": 74.4,
          "edgePct": 7.2,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 48.8,
          "grossPayoutMultiple": 1.488,
          "centsAtRisk": 100,
          "centsProfitIfWin": 48.8
        },
        {
          "name": "Diane Parry",
          "odds": 168,
          "americanLabel": "+168",
          "impliedPct": 37.3,
          "decimalOdds": 2.68,
          "modelPct": 25.6,
          "edgePct": -11.7,
          "priceBand": "Underdog",
          "grossProfitPct": 168,
          "grossPayoutMultiple": 2.68,
          "centsAtRisk": 100,
          "centsProfitIfWin": 168
        }
      ],
      "desk": {
        "name": "Maja Chwalinska",
        "odds": -205,
        "americanLabel": "-205",
        "impliedPct": 67.2,
        "decimalOdds": 1.488,
        "modelPct": 74.4,
        "edgePct": 7.2,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 48.8,
        "grossPayoutMultiple": 1.488,
        "centsAtRisk": 100,
        "centsProfitIfWin": 48.8
      },
      "spread": {
        "player": "Maja Chwalinska",
        "spread": -3.5,
        "odds": -118
      },
      "total": {
        "side": "Over",
        "line": 21.5,
        "odds": -110
      },
      "totalOver": {
        "side": "Over",
        "line": 21.5,
        "odds": -110
      },
      "totalUnder": {
        "side": "Under",
        "line": 21.5,
        "odds": -120
      },
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": -102
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": -102
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": -136
      },
      "priceAction": "Model is meaningfully above FanDuel implied price.",
      "spreadValue": "Maja Chwalinska -3.5 (-118)",
      "totalValue": "21.5 games: Over -110 / Under -120",
      "firstSetTotalValue": "9.5 1st-set games: Over -102 / Under -136",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Maja Chwalinska -205 / Diane Parry +168",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. Model is meaningfully above FanDuel implied price.",
      "noVigNote": "Model 74.4% vs FanDuel implied 67.2% (+7.2 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Maja-Chwalinska-Vs-Diane-Parry/",
    "players": [
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
          "asOf": "2026-06-01"
        },
        "qualityName": "Maja Chwalinska",
        "profile": "Live rank #114 | Poland | age 24 | 2026 clay 16-5, 76% | adj form 0 | hold 75%",
        "modelPct": 74.4,
        "weakness": {
          "name": "Maja Chwalinska",
          "serviceHoldPct": 75,
          "firstServeWonPct": 62,
          "secondServeWonPct": 57,
          "firstServePct": 70,
          "avgAces": 0.6,
          "avgDoubleFaults": 1,
          "avgWinners": null,
          "avgUnforcedErrors": null,
          "avgBreakPointsFaced": null,
          "returnPointsWonPct": null,
          "servicePointsWonPct": 61,
          "weakServeMatches": 0,
          "pressureMatches": 3,
          "matchesWithStats": 7,
          "weaknessScore": 1,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "second serve holds up (57%)"
          ],
          "gameFlowRead": "Maja Chwalinska has no major service weakness in the joined Flashscore sample."
        }
      },
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
          "asOf": "2026-06-01"
        },
        "qualityName": "Diane Parry",
        "profile": "Live rank #92 | France | age 23 | 2026 clay 8-5, 62% | adj form 89 | hold 69%",
        "modelPct": 25.6,
        "weakness": {
          "name": "Diane Parry",
          "serviceHoldPct": 69,
          "firstServeWonPct": 62,
          "secondServeWonPct": 49,
          "firstServePct": 66,
          "avgAces": 3.2,
          "avgDoubleFaults": 2.8,
          "avgWinners": null,
          "avgUnforcedErrors": null,
          "avgBreakPointsFaced": null,
          "returnPointsWonPct": null,
          "servicePointsWonPct": 58,
          "weakServeMatches": 0,
          "pressureMatches": 4,
          "matchesWithStats": 13,
          "weaknessScore": 2,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Diane Parry has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-m-juan-manuel-cerundolo-matteo-berrettini-2026-06-01",
    "eventId": "175756",
    "tour": "ATP",
    "bestOf": 5,
    "surface": "Clay",
    "title": "Juan Manuel Cerundolo vs Matteo Berrettini",
    "start": "7:40 AM",
    "startMinutes": 460,
    "court": "Court Suzanne-Lenglen",
    "round": "Round 4",
    "pickName": "Juan Manuel Cerundolo",
    "basePickName": "Juan Manuel Cerundolo",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 67.4,
    "volatility": 43,
    "tags": [
      "Clay",
      "Roland Garros",
      "ATP",
      "Lean",
      "Positive price edge",
      "Men more stable",
      "Controlled volatility"
    ],
    "reason": "Matteo Berrettini has the recent service-hold edge 87% to 79%, so Juan Manuel Cerundolo needs the rank/form edge to show up on return games. Juan Manuel Cerundolo grades 31 points better on opponent-adjusted recent form. Lean, not a chase.",
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
        "name": "Juan Manuel Cerundolo",
        "serviceHoldPct": 79,
        "firstServeWonPct": 68,
        "secondServeWonPct": 54,
        "firstServePct": 62,
        "avgAces": 4.9,
        "avgDoubleFaults": 2.6,
        "avgWinners": null,
        "avgUnforcedErrors": null,
        "avgBreakPointsFaced": null,
        "returnPointsWonPct": null,
        "servicePointsWonPct": 63,
        "weakServeMatches": 0,
        "pressureMatches": 5,
        "matchesWithStats": 25,
        "weaknessScore": 3,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "protects serve well (79% hold)"
        ],
        "gameFlowRead": "Juan Manuel Cerundolo has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Matteo Berrettini",
        "serviceHoldPct": 87,
        "firstServeWonPct": 74,
        "secondServeWonPct": 56,
        "firstServePct": 64,
        "avgAces": 6,
        "avgDoubleFaults": 1.8,
        "avgWinners": null,
        "avgUnforcedErrors": null,
        "avgBreakPointsFaced": null,
        "returnPointsWonPct": null,
        "servicePointsWonPct": 68,
        "weakServeMatches": 0,
        "pressureMatches": 5,
        "matchesWithStats": 20,
        "weaknessScore": 3,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "protects serve well (87% hold)",
          "wins enough first-serve points (74%)",
          "second serve holds up (56%)"
        ],
        "gameFlowRead": "Matteo Berrettini has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Juan Manuel Cerundolo",
        "confidence": 89,
        "modelPct": 67.4,
        "label": "Strong set-win path"
      },
      {
        "name": "Matteo Berrettini",
        "confidence": 63,
        "modelPct": 32.6,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Juan Manuel Cerundolo",
        "americanOdds": 130,
        "modelPct": 67.4,
        "impliedPct": 43.5,
        "edgePct": 23.9,
        "evPer100": 55,
        "netEvPer100": 53,
        "feePer100": 2,
        "valueIssue": "Model probability outside validated lane",
        "valueGrade": "Model probability outside validated lane",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Juan Manuel Cerundolo",
        "line": 2.5,
        "americanOdds": -116,
        "modelPct": 61,
        "impliedPct": 53.7,
        "edgePct": 7.3,
        "evPer100": 13.6,
        "netEvPer100": 11.6,
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
        "expectedGames": 36,
        "modelPct": 66,
        "impliedPct": 52.8,
        "edgePct": 13.2,
        "evPer100": 24.9,
        "netEvPer100": 22.9,
        "feePer100": 2,
        "valueIssue": "Total watch only",
        "valueGrade": "Watch only",
        "reason": "Expected match games 36 vs FanDuel 38.5; Under. hold avg 83%, BP saved 70%, BP converted 41%, first-set sample 10.4g, 47 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Over 9.5",
        "line": 9.5,
        "americanOdds": -144,
        "expectedGames": 11.5,
        "confidence": 73,
        "tiebreakRisk": 40,
        "earlyBreakRisk": 50,
        "modelPct": 73,
        "evPer100": 23.7,
        "netEvPer100": 21.7,
        "valueGrade": "Actionable live watch",
        "reason": "Expected first-set games 11.5 vs FanDuel 9.5; Over 9.5. hold avg 83%, BP saved 70%, BP converted 41%, first-set sample 10.4g, 47 recent sets.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Juan Manuel Cerundolo",
          "confidence": 89,
          "modelPct": 67.4,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Matteo Berrettini",
          "confidence": 63,
          "modelPct": 32.6,
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
          "holdPct": 79,
          "firstServeWonPct": 68,
          "secondServeWonPct": 54,
          "servicePointsWonPct": 63,
          "returnPointsWonPct": null,
          "returnGamesWonPct": null,
          "breakPointsSavedPct": 73.1,
          "breakPointsConvertedPct": 42.8,
          "aces": 4.9,
          "doubleFaults": 2.6,
          "winners": null,
          "unforcedErrors": null,
          "weaknessScore": 3,
          "weakServeMatches": 0,
          "statMatches": 25,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 24,
            "firstSetSamples": 8,
            "avgFirstSetGames": 9.75,
            "avgSetGames": 10.333333333333334,
            "avgMatchGames": 31,
            "avgSetsPlayed": 3,
            "tiebreakRate": 0.3333333333333333,
            "extendedSetRate": 0.4166666666666667,
            "shortSetRate": 0.3333333333333333
          }
        },
        {
          "name": "Matteo Berrettini",
          "holdPct": 87,
          "firstServeWonPct": 74,
          "secondServeWonPct": 56,
          "servicePointsWonPct": 68,
          "returnPointsWonPct": null,
          "returnGamesWonPct": null,
          "breakPointsSavedPct": 67.8,
          "breakPointsConvertedPct": 38.9,
          "aces": 6,
          "doubleFaults": 1.8,
          "winners": null,
          "unforcedErrors": null,
          "weaknessScore": 3,
          "weakServeMatches": 0,
          "statMatches": 20,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 23,
            "firstSetSamples": 8,
            "avgFirstSetGames": 11.125,
            "avgSetGames": 10.391304347826088,
            "avgMatchGames": 29.875,
            "avgSetsPlayed": 2.875,
            "tiebreakRate": 0.21739130434782608,
            "extendedSetRate": 0.34782608695652173,
            "shortSetRate": 0.17391304347826086
          }
        }
      ],
      "expectedFirstSetGames": 11.5,
      "expectedMatchGames": 36,
      "signalStrength": 9,
      "holdAvg": 83,
      "returnGamesAvg": null,
      "returnPointsAvg": null,
      "breakPointsSavedAvg": 70.4,
      "breakPointsConvertedAvg": 40.8,
      "setSamples": 47,
      "firstSetSamples": 16,
      "avgFirstSetGames": 10.4,
      "avgSetGames": 10.4,
      "tiebreakRate": 27.5,
      "extendedSetRate": 38.2,
      "shortSetRate": 25.4,
      "reasonCore": "hold avg 83%, BP saved 70%, BP converted 41%, first-set sample 10.4g, 47 recent sets"
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Juan Manuel Cerundolo",
        "line": null,
        "americanOdds": 130,
        "modelPct": 67.4,
        "impliedPct": 43.5,
        "edgePct": 23.9,
        "evPer100": 55,
        "netEvPer100": 53,
        "grade": "Model probability outside validated lane",
        "issue": "Model probability outside validated lane",
        "reason": "Model is meaningfully above FanDuel implied price."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Juan Manuel Cerundolo",
        "line": 2.5,
        "americanOdds": -116,
        "modelPct": 61,
        "impliedPct": 53.7,
        "edgePct": 7.3,
        "evPer100": 13.6,
        "netEvPer100": 11.6,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 61,
        "grade": "Watch only",
        "reason": "Spread is number-dependent; verify first service cycle"
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "Under",
        "line": 38.5,
        "americanOdds": -112,
        "modelPct": 66,
        "impliedPct": 52.8,
        "edgePct": 13.2,
        "evPer100": 24.9,
        "netEvPer100": 22.9,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 66,
        "grade": "Watch only",
        "reason": "Total games need expected match games vs the posted line."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Juan Manuel Cerundolo 89% / Matteo Berrettini 63%",
        "rows": [
          {
            "name": "Juan Manuel Cerundolo",
            "confidence": 89,
            "modelPct": 67.4,
            "label": "Strong set-win path"
          },
          {
            "name": "Matteo Berrettini",
            "confidence": 63,
            "modelPct": 32.6,
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
        "tiebreakRisk": 40,
        "earlyBreakRisk": 50,
        "grade": "Actionable live watch",
        "reason": "Expected first-set games 11.5 vs FanDuel 9.5; Over 9.5. hold avg 83%, BP saved 70%, BP converted 41%, first-set sample 10.4g, 47 recent sets."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Juan Manuel Cerundolo",
      "opponent": "Matteo Berrettini",
      "grade": "Bet-grade ML",
      "riskGate": "clean enough",
      "marketOdds": 144,
      "fairOdds": -207,
      "modelProbability": 67.4,
      "dataOnlyProbability": 73.2,
      "marketProbability": 41,
      "marketDisagreementPct": 26.4,
      "netEvPer100": 62.5,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Juan Manuel Cerundolo is priced below the model, not guaranteed to win.",
      "useCase": "Straight ML value only at +144 or better; fair price from the ensemble is about -207.",
      "bullets": [
        "Recent hold: Juan Manuel Cerundolo 79.4% vs Matteo Berrettini 87%.",
        "Serve events: Juan Manuel Cerundolo 4.9 aces / 0 DFs vs Matteo Berrettini 6 aces / 0 DFs.",
        "Serve points: Juan Manuel Cerundolo 1st 68.3%, 2nd 0% vs Matteo Berrettini 1st 74.2%, 2nd 0%."
      ],
      "risks": [
        "Matteo Berrettini strength: protects serve well (87% hold)."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page Chrome scrape",
      "capturedAt": "2026-06-01T07:52:04.315Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/juan-manuel-cerundolo-v-matteo-berrettini-35668186",
      "eventId": "35668186",
      "players": [
        {
          "name": "Juan Manuel Cerundolo",
          "odds": 130,
          "americanLabel": "+130",
          "impliedPct": 43.5,
          "decimalOdds": 2.3,
          "modelPct": 67.4,
          "edgePct": 23.9,
          "priceBand": "Underdog",
          "grossProfitPct": 130,
          "grossPayoutMultiple": 2.3,
          "centsAtRisk": 100,
          "centsProfitIfWin": 130
        },
        {
          "name": "Matteo Berrettini",
          "odds": -156,
          "americanLabel": "-156",
          "impliedPct": 60.9,
          "decimalOdds": 1.641,
          "modelPct": 32.6,
          "edgePct": -28.3,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 64.1,
          "grossPayoutMultiple": 1.641,
          "centsAtRisk": 100,
          "centsProfitIfWin": 64.1
        }
      ],
      "desk": {
        "name": "Juan Manuel Cerundolo",
        "odds": 130,
        "americanLabel": "+130",
        "impliedPct": 43.5,
        "decimalOdds": 2.3,
        "modelPct": 67.4,
        "edgePct": 23.9,
        "priceBand": "Underdog",
        "grossProfitPct": 130,
        "grossPayoutMultiple": 2.3,
        "centsAtRisk": 100,
        "centsProfitIfWin": 130
      },
      "spread": {
        "player": "Juan Manuel Cerundolo",
        "spread": 2.5,
        "odds": -116
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
        "odds": -144
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": -144
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": 104
      },
      "priceAction": "Model is meaningfully above FanDuel implied price.",
      "spreadValue": "Juan Manuel Cerundolo +2.5 (-116)",
      "totalValue": "38.5 games: Over -118 / Under -112",
      "firstSetTotalValue": "9.5 1st-set games: Over -144 / Under +104",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Over lean if both players hold early",
      "mlValue": "Juan Manuel Cerundolo +130 / Matteo Berrettini -156",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. Model is meaningfully above FanDuel implied price.",
      "noVigNote": "Model 67.4% vs FanDuel implied 43.5% (+23.9 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Juan-Manuel-Cerundolo-Vs-Matteo-Berrettini/",
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
          "asOf": "2026-06-01"
        },
        "qualityName": "Juan Manuel Cerundolo",
        "profile": "Live rank #56 | Argentina | age 24 | 2026 clay 20-10, 67% | adj form 112 | hold 79%",
        "modelPct": 67.4,
        "weakness": {
          "name": "Juan Manuel Cerundolo",
          "serviceHoldPct": 79,
          "firstServeWonPct": 68,
          "secondServeWonPct": 54,
          "firstServePct": 62,
          "avgAces": 4.9,
          "avgDoubleFaults": 2.6,
          "avgWinners": null,
          "avgUnforcedErrors": null,
          "avgBreakPointsFaced": null,
          "returnPointsWonPct": null,
          "servicePointsWonPct": 63,
          "weakServeMatches": 0,
          "pressureMatches": 5,
          "matchesWithStats": 25,
          "weaknessScore": 3,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "protects serve well (79% hold)"
          ],
          "gameFlowRead": "Juan Manuel Cerundolo has no major service weakness in the joined Flashscore sample."
        }
      },
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
          "asOf": "2026-06-01"
        },
        "qualityName": "Matteo Berrettini",
        "profile": "Live rank #105 | Italy | age 30 | 2026 clay 11-9, 55% | adj form 82 | hold 87%",
        "modelPct": 32.6,
        "weakness": {
          "name": "Matteo Berrettini",
          "serviceHoldPct": 87,
          "firstServeWonPct": 74,
          "secondServeWonPct": 56,
          "firstServePct": 64,
          "avgAces": 6,
          "avgDoubleFaults": 1.8,
          "avgWinners": null,
          "avgUnforcedErrors": null,
          "avgBreakPointsFaced": null,
          "returnPointsWonPct": null,
          "servicePointsWonPct": 68,
          "weakServeMatches": 0,
          "pressureMatches": 5,
          "matchesWithStats": 20,
          "weaknessScore": 3,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "protects serve well (87% hold)",
            "wins enough first-serve points (74%)",
            "second serve holds up (56%)"
          ],
          "gameFlowRead": "Matteo Berrettini has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-m-felix-auger-aliassime-alejandro-tabilo-2026-06-01",
    "eventId": "175746",
    "tour": "ATP",
    "bestOf": 5,
    "surface": "Clay",
    "title": "Felix Auger-Aliassime vs Alejandro Tabilo",
    "start": "8:10 AM",
    "startMinutes": 490,
    "court": "Court Philippe-Chatrier",
    "round": "Round 4",
    "pickName": "Felix Auger-Aliassime",
    "basePickName": "Felix Auger-Aliassime",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 68,
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
    "reason": "Recent service hold is close: Felix Auger-Aliassime 86%, Alejandro Tabilo 87%. Lean, not a chase.",
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
        "name": "Felix Auger-Aliassime",
        "serviceHoldPct": 86,
        "firstServeWonPct": 74,
        "secondServeWonPct": 49,
        "firstServePct": 69,
        "avgAces": 6.9,
        "avgDoubleFaults": 2.3,
        "avgWinners": null,
        "avgUnforcedErrors": null,
        "avgBreakPointsFaced": null,
        "returnPointsWonPct": null,
        "servicePointsWonPct": 67,
        "weakServeMatches": 0,
        "pressureMatches": null,
        "matchesWithStats": 11,
        "weaknessScore": 0,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "protects serve well (86% hold)",
          "wins enough first-serve points (74%)"
        ],
        "gameFlowRead": "Felix Auger-Aliassime has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Alejandro Tabilo",
        "serviceHoldPct": 87,
        "firstServeWonPct": 75,
        "secondServeWonPct": 54,
        "firstServePct": 64,
        "avgAces": 5.2,
        "avgDoubleFaults": 1.5,
        "avgWinners": null,
        "avgUnforcedErrors": null,
        "avgBreakPointsFaced": null,
        "returnPointsWonPct": null,
        "servicePointsWonPct": 67,
        "weakServeMatches": 0,
        "pressureMatches": null,
        "matchesWithStats": 32,
        "weaknessScore": 0,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "protects serve well (87% hold)",
          "wins enough first-serve points (75%)"
        ],
        "gameFlowRead": "Alejandro Tabilo has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Felix Auger-Aliassime",
        "confidence": 90,
        "modelPct": 68,
        "label": "Strong set-win path"
      },
      {
        "name": "Alejandro Tabilo",
        "confidence": 62,
        "modelPct": 32,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Felix Auger-Aliassime",
        "americanOdds": -182,
        "modelPct": 68,
        "impliedPct": 64.5,
        "edgePct": 3.5,
        "evPer100": 5.4,
        "netEvPer100": 3.4,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Favorite price needs better proof",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Felix Auger-Aliassime",
        "line": -3.5,
        "americanOdds": -110,
        "modelPct": 62,
        "impliedPct": 52.4,
        "edgePct": 9.6,
        "evPer100": 18.4,
        "netEvPer100": 16.4,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Watch only",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "line": 38.5,
        "overOdds": -112,
        "underOdds": -118,
        "expectedGames": 38.5,
        "valueGrade": "No direction",
        "reason": "FanDuel total is 38.5; model did not clear a full-match over/under edge from hold, return, and set-shape data. hold avg 87%, BP saved 68%, BP converted 45%, first-set sample N/A, 0 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Over 9.5",
        "line": 9.5,
        "americanOdds": -148,
        "expectedGames": 10.6,
        "confidence": 65,
        "tiebreakRisk": 18,
        "earlyBreakRisk": 50,
        "modelPct": 65,
        "evPer100": 8.9,
        "netEvPer100": 6.9,
        "valueGrade": "Actionable live watch",
        "reason": "Expected first-set games 10.6 vs FanDuel 9.5; Over 9.5. hold avg 87%, BP saved 68%, BP converted 45%, first-set sample N/A, 0 recent sets.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Felix Auger-Aliassime",
          "confidence": 90,
          "modelPct": 68,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Alejandro Tabilo",
          "confidence": 62,
          "modelPct": 32,
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
          "holdPct": 86,
          "firstServeWonPct": 74,
          "secondServeWonPct": 49,
          "servicePointsWonPct": 67,
          "returnPointsWonPct": null,
          "returnGamesWonPct": null,
          "breakPointsSavedPct": 65.5,
          "breakPointsConvertedPct": 49.2,
          "aces": 6.9,
          "doubleFaults": 2.3,
          "winners": null,
          "unforcedErrors": null,
          "weaknessScore": 0,
          "weakServeMatches": 0,
          "statMatches": 11,
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
          "name": "Alejandro Tabilo",
          "holdPct": 87,
          "firstServeWonPct": 75,
          "secondServeWonPct": 54,
          "servicePointsWonPct": 67,
          "returnPointsWonPct": null,
          "returnGamesWonPct": null,
          "breakPointsSavedPct": 70.4,
          "breakPointsConvertedPct": 40.5,
          "aces": 5.2,
          "doubleFaults": 1.5,
          "winners": null,
          "unforcedErrors": null,
          "weaknessScore": 0,
          "weakServeMatches": 0,
          "statMatches": 32,
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
      "expectedFirstSetGames": 10.6,
      "expectedMatchGames": 38.5,
      "signalStrength": 4,
      "holdAvg": 86.5,
      "returnGamesAvg": null,
      "returnPointsAvg": null,
      "breakPointsSavedAvg": 68,
      "breakPointsConvertedAvg": 44.9,
      "setSamples": 0,
      "firstSetSamples": 0,
      "avgFirstSetGames": null,
      "avgSetGames": null,
      "tiebreakRate": null,
      "extendedSetRate": null,
      "shortSetRate": null,
      "reasonCore": "hold avg 87%, BP saved 68%, BP converted 45%, first-set sample N/A, 0 recent sets"
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Felix Auger-Aliassime",
        "line": null,
        "americanOdds": -182,
        "modelPct": 68,
        "impliedPct": 64.5,
        "edgePct": 3.5,
        "evPer100": 5.4,
        "netEvPer100": 3.4,
        "grade": "Favorite price needs better proof",
        "issue": "Favorite price needs better proof",
        "reason": "ML is close to fair; derivative or live entry needs to carry the edge."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Felix Auger-Aliassime",
        "line": -3.5,
        "americanOdds": -110,
        "modelPct": 62,
        "impliedPct": 52.4,
        "edgePct": 9.6,
        "evPer100": 18.4,
        "netEvPer100": 16.4,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 62,
        "grade": "Watch only",
        "reason": "Spread is number-dependent; verify first service cycle"
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
        "selection": "Felix Auger-Aliassime 90% / Alejandro Tabilo 62%",
        "rows": [
          {
            "name": "Felix Auger-Aliassime",
            "confidence": 90,
            "modelPct": 68,
            "label": "Strong set-win path"
          },
          {
            "name": "Alejandro Tabilo",
            "confidence": 62,
            "modelPct": 32,
            "label": "Needs early hold pressure"
          }
        ],
        "confidence": 90,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Over 9.5",
        "expectedGames": 10.6,
        "confidence": 65,
        "tiebreakRisk": 18,
        "earlyBreakRisk": 50,
        "grade": "Actionable live watch",
        "reason": "Expected first-set games 10.6 vs FanDuel 9.5; Over 9.5. hold avg 87%, BP saved 68%, BP converted 45%, first-set sample N/A, 0 recent sets."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Felix Auger-Aliassime",
      "opponent": "Alejandro Tabilo",
      "grade": "Playable favorite",
      "riskGate": "clean enough",
      "marketOdds": -178,
      "fairOdds": -212,
      "modelProbability": 68,
      "dataOnlyProbability": 70.1,
      "marketProbability": 64,
      "marketDisagreementPct": 4,
      "netEvPer100": 4.2,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Felix Auger-Aliassime is priced below the model, not guaranteed to win.",
      "useCase": "Favorite price needs cleaner proof or derivative value; do not confuse win probability with bet value.",
      "bullets": [
        "Recent hold: Felix Auger-Aliassime 85.5% vs Alejandro Tabilo 86.7%.",
        "Serve events: Felix Auger-Aliassime 6.9 aces / 0 DFs vs Alejandro Tabilo 5.2 aces / 0 DFs.",
        "Serve points: Felix Auger-Aliassime 1st 74.3%, 2nd 0% vs Alejandro Tabilo 1st 75.3%, 2nd 0%."
      ],
      "risks": [
        "Alejandro Tabilo strength: protects serve well (87% hold)."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page Chrome scrape",
      "capturedAt": "2026-06-01T07:51:45.417Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/felix-auger-aliassime-v-alejandro-tabilo-35669004",
      "eventId": "35669004",
      "players": [
        {
          "name": "Felix Auger-Aliassime",
          "odds": -182,
          "americanLabel": "-182",
          "impliedPct": 64.5,
          "decimalOdds": 1.549,
          "modelPct": 68,
          "edgePct": 3.5,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 54.9,
          "grossPayoutMultiple": 1.549,
          "centsAtRisk": 100,
          "centsProfitIfWin": 54.9
        },
        {
          "name": "Alejandro Tabilo",
          "odds": 150,
          "americanLabel": "+150",
          "impliedPct": 40,
          "decimalOdds": 2.5,
          "modelPct": 32,
          "edgePct": -8,
          "priceBand": "Underdog",
          "grossProfitPct": 150,
          "grossPayoutMultiple": 2.5,
          "centsAtRisk": 100,
          "centsProfitIfWin": 150
        }
      ],
      "desk": {
        "name": "Felix Auger-Aliassime",
        "odds": -182,
        "americanLabel": "-182",
        "impliedPct": 64.5,
        "decimalOdds": 1.549,
        "modelPct": 68,
        "edgePct": 3.5,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 54.9,
        "grossPayoutMultiple": 1.549,
        "centsAtRisk": 100,
        "centsProfitIfWin": 54.9
      },
      "spread": {
        "player": "Felix Auger-Aliassime",
        "spread": -3.5,
        "odds": -110
      },
      "total": {
        "side": "Over",
        "line": 38.5,
        "odds": -112
      },
      "totalOver": {
        "side": "Over",
        "line": 38.5,
        "odds": -112
      },
      "totalUnder": {
        "side": "Under",
        "line": 38.5,
        "odds": -118
      },
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": -148
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": -148
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": 106
      },
      "priceAction": "ML is close to fair; derivative or live entry needs to carry the edge.",
      "spreadValue": "Felix Auger-Aliassime -3.5 (-110)",
      "totalValue": "38.5 games: Over -112 / Under -118",
      "firstSetTotalValue": "9.5 1st-set games: Over -148 / Under +106",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Over lean if both players hold early",
      "mlValue": "Felix Auger-Aliassime -182 / Alejandro Tabilo +150",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. ML is close to fair; derivative or live entry needs to carry the edge.",
      "noVigNote": "Model 68% vs FanDuel implied 64.5% (+3.5 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Felix-Auger-Aliassime-Vs-Alejandro-Tabilo/",
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
          "asOf": "2026-06-01"
        },
        "qualityName": "Felix Auger-Aliassime",
        "profile": "Live rank #6 | Canada | age 25 | hold 86%",
        "modelPct": 68,
        "weakness": {
          "name": "Felix Auger-Aliassime",
          "serviceHoldPct": 86,
          "firstServeWonPct": 74,
          "secondServeWonPct": 49,
          "firstServePct": 69,
          "avgAces": 6.9,
          "avgDoubleFaults": 2.3,
          "avgWinners": null,
          "avgUnforcedErrors": null,
          "avgBreakPointsFaced": null,
          "returnPointsWonPct": null,
          "servicePointsWonPct": 67,
          "weakServeMatches": 0,
          "pressureMatches": null,
          "matchesWithStats": 11,
          "weaknessScore": 0,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "protects serve well (86% hold)",
            "wins enough first-serve points (74%)"
          ],
          "gameFlowRead": "Felix Auger-Aliassime has no major service weakness in the joined Flashscore sample."
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
          "asOf": "2026-06-01"
        },
        "qualityName": "Alejandro Tabilo",
        "profile": "Live rank #36 | Chile | age 28 | hold 87%",
        "modelPct": 32,
        "weakness": {
          "name": "Alejandro Tabilo",
          "serviceHoldPct": 87,
          "firstServeWonPct": 75,
          "secondServeWonPct": 54,
          "firstServePct": 64,
          "avgAces": 5.2,
          "avgDoubleFaults": 1.5,
          "avgWinners": null,
          "avgUnforcedErrors": null,
          "avgBreakPointsFaced": null,
          "returnPointsWonPct": null,
          "servicePointsWonPct": 67,
          "weakServeMatches": 0,
          "pressureMatches": null,
          "matchesWithStats": 32,
          "weaknessScore": 0,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "protects serve well (87% hold)",
            "wins enough first-serve points (75%)"
          ],
          "gameFlowRead": "Alejandro Tabilo has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-m-frances-tiafoe-matteo-arnaldi-2026-06-01",
    "eventId": "175751",
    "tour": "ATP",
    "bestOf": 5,
    "surface": "Clay",
    "title": "Frances Tiafoe vs Matteo Arnaldi",
    "start": "10:40 AM",
    "startMinutes": 640,
    "court": "Court Suzanne-Lenglen",
    "round": "Round 4",
    "pickName": "Frances Tiafoe",
    "basePickName": "Frances Tiafoe",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 67.1,
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
    "reason": "Frances Tiafoe has the recent service-hold edge 84% to 77%. Matteo Arnaldi grades 18 points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price. Lean, not a chase.",
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
        "name": "Frances Tiafoe",
        "serviceHoldPct": 84,
        "firstServeWonPct": 76,
        "secondServeWonPct": 52,
        "firstServePct": 57,
        "avgAces": 7.3,
        "avgDoubleFaults": 2.7,
        "avgWinners": null,
        "avgUnforcedErrors": null,
        "avgBreakPointsFaced": null,
        "returnPointsWonPct": null,
        "servicePointsWonPct": 66,
        "weakServeMatches": 0,
        "pressureMatches": 7,
        "matchesWithStats": 10,
        "weaknessScore": 7,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "protects serve well (84% hold)",
          "wins enough first-serve points (76%)"
        ],
        "gameFlowRead": "Frances Tiafoe has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Matteo Arnaldi",
        "serviceHoldPct": 77,
        "firstServeWonPct": 68,
        "secondServeWonPct": 52,
        "firstServePct": 62,
        "avgAces": 3.9,
        "avgDoubleFaults": 3.9,
        "avgWinners": null,
        "avgUnforcedErrors": null,
        "avgBreakPointsFaced": null,
        "returnPointsWonPct": null,
        "servicePointsWonPct": 62,
        "weakServeMatches": 0,
        "pressureMatches": 7,
        "matchesWithStats": 17,
        "weaknessScore": 9,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "protects serve well (77% hold)"
        ],
        "gameFlowRead": "Matteo Arnaldi has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Frances Tiafoe",
        "confidence": 88,
        "modelPct": 67.1,
        "label": "Strong set-win path"
      },
      {
        "name": "Matteo Arnaldi",
        "confidence": 62,
        "modelPct": 32.9,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Frances Tiafoe",
        "americanOdds": -108,
        "modelPct": 67.1,
        "impliedPct": 51.9,
        "edgePct": 15.2,
        "evPer100": 29.2,
        "netEvPer100": 27.2,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Favorite price needs better proof",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Frances Tiafoe",
        "line": 0.5,
        "americanOdds": -120,
        "modelPct": 61,
        "impliedPct": 54.5,
        "edgePct": 6.5,
        "evPer100": 11.8,
        "netEvPer100": 9.8,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Watch only",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Under",
        "line": 39.5,
        "americanOdds": -118,
        "expectedGames": 37.1,
        "modelPct": 66,
        "impliedPct": 54.1,
        "edgePct": 11.9,
        "evPer100": 21.9,
        "netEvPer100": 19.9,
        "feePer100": 2,
        "valueIssue": "Total watch only",
        "valueGrade": "Watch only",
        "reason": "Expected match games 37.1 vs FanDuel 39.5; Under. hold avg 81%, BP saved 68%, BP converted 45%, first-set sample 10.8g, 53 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Over 9.5",
        "line": 9.5,
        "americanOdds": -172,
        "expectedGames": 11.7,
        "confidence": 73,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 50,
        "modelPct": 73,
        "evPer100": 15.4,
        "netEvPer100": 13.4,
        "valueGrade": "Actionable live watch",
        "reason": "Expected first-set games 11.7 vs FanDuel 9.5; Over 9.5. hold avg 81%, BP saved 68%, BP converted 45%, first-set sample 10.8g, 53 recent sets.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Frances Tiafoe",
          "confidence": 88,
          "modelPct": 67.1,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Matteo Arnaldi",
          "confidence": 62,
          "modelPct": 32.9,
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
          "name": "Frances Tiafoe",
          "holdPct": 84,
          "firstServeWonPct": 76,
          "secondServeWonPct": 52,
          "servicePointsWonPct": 66,
          "returnPointsWonPct": null,
          "returnGamesWonPct": null,
          "breakPointsSavedPct": 69.1,
          "breakPointsConvertedPct": 45.6,
          "aces": 7.3,
          "doubleFaults": 2.7,
          "winners": null,
          "unforcedErrors": null,
          "weaknessScore": 7,
          "weakServeMatches": 0,
          "statMatches": 10,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 26,
            "firstSetSamples": 8,
            "avgFirstSetGames": 11.625,
            "avgSetGames": 10.846153846153847,
            "avgMatchGames": 35.25,
            "avgSetsPlayed": 3.25,
            "tiebreakRate": 0.4230769230769231,
            "extendedSetRate": 0.46153846153846156,
            "shortSetRate": 0.15384615384615385
          }
        },
        {
          "name": "Matteo Arnaldi",
          "holdPct": 77,
          "firstServeWonPct": 68,
          "secondServeWonPct": 52,
          "servicePointsWonPct": 62,
          "returnPointsWonPct": null,
          "returnGamesWonPct": null,
          "breakPointsSavedPct": 65.9,
          "breakPointsConvertedPct": 44.1,
          "aces": 3.9,
          "doubleFaults": 3.9,
          "winners": null,
          "unforcedErrors": null,
          "weaknessScore": 9,
          "weakServeMatches": 0,
          "statMatches": 17,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 27,
            "firstSetSamples": 8,
            "avgFirstSetGames": 9.875,
            "avgSetGames": 10,
            "avgMatchGames": 33.75,
            "avgSetsPlayed": 3.375,
            "tiebreakRate": 0.2222222222222222,
            "extendedSetRate": 0.2962962962962963,
            "shortSetRate": 0.18518518518518517
          }
        }
      ],
      "expectedFirstSetGames": 11.7,
      "expectedMatchGames": 37.1,
      "signalStrength": 9,
      "holdAvg": 80.5,
      "returnGamesAvg": null,
      "returnPointsAvg": null,
      "breakPointsSavedAvg": 67.5,
      "breakPointsConvertedAvg": 44.9,
      "setSamples": 53,
      "firstSetSamples": 16,
      "avgFirstSetGames": 10.8,
      "avgSetGames": 10.4,
      "tiebreakRate": 32.3,
      "extendedSetRate": 37.9,
      "shortSetRate": 17,
      "reasonCore": "hold avg 81%, BP saved 68%, BP converted 45%, first-set sample 10.8g, 53 recent sets"
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Frances Tiafoe",
        "line": null,
        "americanOdds": -108,
        "modelPct": 67.1,
        "impliedPct": 51.9,
        "edgePct": 15.2,
        "evPer100": 29.2,
        "netEvPer100": 27.2,
        "grade": "Favorite price needs better proof",
        "issue": "Favorite price needs better proof",
        "reason": "Model is meaningfully above FanDuel implied price."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Frances Tiafoe",
        "line": 0.5,
        "americanOdds": -120,
        "modelPct": 61,
        "impliedPct": 54.5,
        "edgePct": 6.5,
        "evPer100": 11.8,
        "netEvPer100": 9.8,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 61,
        "grade": "Watch only",
        "reason": "Spread is number-dependent; verify first service cycle"
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "Under",
        "line": 39.5,
        "americanOdds": -118,
        "modelPct": 66,
        "impliedPct": 54.1,
        "edgePct": 11.9,
        "evPer100": 21.9,
        "netEvPer100": 19.9,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 66,
        "grade": "Watch only",
        "reason": "Total games need expected match games vs the posted line."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Frances Tiafoe 88% / Matteo Arnaldi 62%",
        "rows": [
          {
            "name": "Frances Tiafoe",
            "confidence": 88,
            "modelPct": 67.1,
            "label": "Strong set-win path"
          },
          {
            "name": "Matteo Arnaldi",
            "confidence": 62,
            "modelPct": 32.9,
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
        "selection": "Over 9.5",
        "expectedGames": 11.7,
        "confidence": 73,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 50,
        "grade": "Actionable live watch",
        "reason": "Expected first-set games 11.7 vs FanDuel 9.5; Over 9.5. hold avg 81%, BP saved 68%, BP converted 45%, first-set sample 10.8g, 53 recent sets."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Frances Tiafoe",
      "opponent": "Matteo Arnaldi",
      "grade": "Bet-grade ML",
      "riskGate": "clean enough",
      "marketOdds": -100,
      "fairOdds": -204,
      "modelProbability": 67.1,
      "dataOnlyProbability": 70.9,
      "marketProbability": 50,
      "marketDisagreementPct": 17.1,
      "netEvPer100": 32.2,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Frances Tiafoe is priced below the model, not guaranteed to win.",
      "useCase": "Favorite price needs cleaner proof or derivative value; do not confuse win probability with bet value.",
      "bullets": [
        "Recent hold: Frances Tiafoe 84.1% vs Matteo Arnaldi 76.8%.",
        "Serve events: Frances Tiafoe 7.3 aces / 0 DFs vs Matteo Arnaldi 3.9 aces / 0 DFs.",
        "Serve points: Frances Tiafoe 1st 75.6%, 2nd 0% vs Matteo Arnaldi 1st 67.6%, 2nd 0%."
      ],
      "risks": [
        "Matteo Arnaldi strength: protects serve well (77% hold)."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page Chrome scrape",
      "capturedAt": "2026-06-01T07:51:54.860Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/frances-tiafoe-v-matteo-arnaldi-35669011",
      "eventId": "35669011",
      "players": [
        {
          "name": "Frances Tiafoe",
          "odds": -108,
          "americanLabel": "-108",
          "impliedPct": 51.9,
          "decimalOdds": 1.926,
          "modelPct": 67.1,
          "edgePct": 15.2,
          "priceBand": "Coinflip",
          "grossProfitPct": 92.6,
          "grossPayoutMultiple": 1.926,
          "centsAtRisk": 100,
          "centsProfitIfWin": 92.6
        },
        {
          "name": "Matteo Arnaldi",
          "odds": -111,
          "americanLabel": "-111",
          "impliedPct": 52.6,
          "decimalOdds": 1.901,
          "modelPct": 32.9,
          "edgePct": -19.7,
          "priceBand": "Coinflip",
          "grossProfitPct": 90.1,
          "grossPayoutMultiple": 1.901,
          "centsAtRisk": 100,
          "centsProfitIfWin": 90.1
        }
      ],
      "desk": {
        "name": "Frances Tiafoe",
        "odds": -108,
        "americanLabel": "-108",
        "impliedPct": 51.9,
        "decimalOdds": 1.926,
        "modelPct": 67.1,
        "edgePct": 15.2,
        "priceBand": "Coinflip",
        "grossProfitPct": 92.6,
        "grossPayoutMultiple": 1.926,
        "centsAtRisk": 100,
        "centsProfitIfWin": 92.6
      },
      "spread": {
        "player": "Frances Tiafoe",
        "spread": 0.5,
        "odds": -120
      },
      "total": {
        "side": "Over",
        "line": 39.5,
        "odds": -112
      },
      "totalOver": {
        "side": "Over",
        "line": 39.5,
        "odds": -112
      },
      "totalUnder": {
        "side": "Under",
        "line": 39.5,
        "odds": -118
      },
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": -172
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": -172
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": 124
      },
      "priceAction": "Model is meaningfully above FanDuel implied price.",
      "spreadValue": "Frances Tiafoe +0.5 (-120)",
      "totalValue": "39.5 games: Over -112 / Under -118",
      "firstSetTotalValue": "9.5 1st-set games: Over -172 / Under +124",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Over lean if both players hold early",
      "mlValue": "Frances Tiafoe -108 / Matteo Arnaldi -111",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. Model is meaningfully above FanDuel implied price.",
      "noVigNote": "Model 67.1% vs FanDuel implied 51.9% (+15.2 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Frances-Tiafoe-Vs-Matteo-Arnaldi/",
    "players": [
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
          "asOf": "2026-06-01"
        },
        "qualityName": "Frances Tiafoe",
        "profile": "Live rank #22 | USA | age 28 | 2026 clay 7-3, 70% | adj form 83 | hold 84%",
        "modelPct": 67.1,
        "weakness": {
          "name": "Frances Tiafoe",
          "serviceHoldPct": 84,
          "firstServeWonPct": 76,
          "secondServeWonPct": 52,
          "firstServePct": 57,
          "avgAces": 7.3,
          "avgDoubleFaults": 2.7,
          "avgWinners": null,
          "avgUnforcedErrors": null,
          "avgBreakPointsFaced": null,
          "returnPointsWonPct": null,
          "servicePointsWonPct": 66,
          "weakServeMatches": 0,
          "pressureMatches": 7,
          "matchesWithStats": 10,
          "weaknessScore": 7,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "protects serve well (84% hold)",
            "wins enough first-serve points (76%)"
          ],
          "gameFlowRead": "Frances Tiafoe has no major service weakness in the joined Flashscore sample."
        }
      },
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
          "asOf": "2026-06-01"
        },
        "qualityName": "Matteo Arnaldi",
        "profile": "Live rank #104 | Italy | age 25 | 2026 clay 11-6, 65% | adj form 101 | hold 77%",
        "modelPct": 32.9,
        "weakness": {
          "name": "Matteo Arnaldi",
          "serviceHoldPct": 77,
          "firstServeWonPct": 68,
          "secondServeWonPct": 52,
          "firstServePct": 62,
          "avgAces": 3.9,
          "avgDoubleFaults": 3.9,
          "avgWinners": null,
          "avgUnforcedErrors": null,
          "avgBreakPointsFaced": null,
          "returnPointsWonPct": null,
          "servicePointsWonPct": 62,
          "weakServeMatches": 0,
          "pressureMatches": 7,
          "matchesWithStats": 17,
          "weaknessScore": 9,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "protects serve well (77% hold)"
          ],
          "gameFlowRead": "Matteo Arnaldi has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rg-w-aryna-sabalenka-naomi-osaka-2026-06-01",
    "eventId": "175544",
    "tour": "WTA",
    "bestOf": 3,
    "surface": "Clay",
    "title": "Aryna Sabalenka vs Naomi Osaka",
    "start": "11:30 AM",
    "startMinutes": 690,
    "court": "Court Philippe-Chatrier",
    "round": "Round 4",
    "pickName": "Aryna Sabalenka",
    "basePickName": "Aryna Sabalenka",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 79.1,
    "volatility": 49,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Lean",
      "Price required",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Aryna Sabalenka has the recent service-hold edge 78% to 73%. Aryna Sabalenka grades 8 points better on opponent-adjusted recent form. Lean, not a chase.",
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
        "name": "Aryna Sabalenka",
        "serviceHoldPct": 78,
        "firstServeWonPct": 67,
        "secondServeWonPct": 52,
        "firstServePct": 66,
        "avgAces": 2.4,
        "avgDoubleFaults": 2.4,
        "avgWinners": null,
        "avgUnforcedErrors": null,
        "avgBreakPointsFaced": null,
        "returnPointsWonPct": null,
        "servicePointsWonPct": 62,
        "weakServeMatches": 0,
        "pressureMatches": 3,
        "matchesWithStats": 9,
        "weaknessScore": 0,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "protects serve well (78% hold)"
        ],
        "gameFlowRead": "Aryna Sabalenka has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Naomi Osaka",
        "serviceHoldPct": 73,
        "firstServeWonPct": 67,
        "secondServeWonPct": 47,
        "firstServePct": 65,
        "avgAces": 4.8,
        "avgDoubleFaults": 3.1,
        "avgWinners": null,
        "avgUnforcedErrors": null,
        "avgBreakPointsFaced": null,
        "returnPointsWonPct": null,
        "servicePointsWonPct": 60,
        "weakServeMatches": 0,
        "pressureMatches": 5,
        "matchesWithStats": 9,
        "weaknessScore": 4,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Naomi Osaka has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Aryna Sabalenka",
        "confidence": 84,
        "modelPct": 79.1,
        "label": "Strong set-win path"
      },
      {
        "name": "Naomi Osaka",
        "confidence": 36,
        "modelPct": 20.9,
        "label": "Thin set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Aryna Sabalenka",
        "americanOdds": -480,
        "modelPct": 79.1,
        "impliedPct": 82.8,
        "edgePct": -3.7,
        "evPer100": -4.4,
        "netEvPer100": -6.4,
        "feePer100": 2,
        "valueIssue": "Favorite tax trap",
        "valueGrade": "Favorite tax trap",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Aryna Sabalenka",
        "line": -4.5,
        "americanOdds": -134,
        "modelPct": 73,
        "impliedPct": 57.3,
        "edgePct": 15.7,
        "evPer100": 27.5,
        "netEvPer100": 25.5,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Watch only",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 20.5,
        "americanOdds": -112,
        "expectedGames": 22.1,
        "modelPct": 62,
        "impliedPct": 52.8,
        "edgePct": 9.2,
        "evPer100": 17.4,
        "netEvPer100": 15.4,
        "feePer100": 2,
        "valueIssue": "Total watch only",
        "valueGrade": "Watch only",
        "reason": "Expected match games 22.1 vs FanDuel 20.5; Over. hold avg 76%, BP saved 59%, BP converted 48%, first-set sample 9.5g, 38 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Pass / near line",
        "line": 9.5,
        "americanOdds": null,
        "expectedGames": 9.6,
        "confidence": 52,
        "tiebreakRisk": 23,
        "earlyBreakRisk": 50,
        "modelPct": 52,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Near fair",
        "reason": "Expected first-set games 9.6 vs FanDuel 9.5; near the number. hold avg 76%, BP saved 59%, BP converted 48%, first-set sample 9.5g, 38 recent sets.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Aryna Sabalenka",
          "confidence": 84,
          "modelPct": 79.1,
          "label": "Strong set-win path",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Naomi Osaka",
          "confidence": 36,
          "modelPct": 20.9,
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
          "name": "Aryna Sabalenka",
          "holdPct": 78,
          "firstServeWonPct": 67,
          "secondServeWonPct": 52,
          "servicePointsWonPct": 62,
          "returnPointsWonPct": null,
          "returnGamesWonPct": null,
          "breakPointsSavedPct": 60.7,
          "breakPointsConvertedPct": 43.4,
          "aces": 2.4,
          "doubleFaults": 2.4,
          "winners": null,
          "unforcedErrors": null,
          "weaknessScore": 0,
          "weakServeMatches": 0,
          "statMatches": 9,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 19,
            "firstSetSamples": 8,
            "avgFirstSetGames": 9,
            "avgSetGames": 9.368421052631579,
            "avgMatchGames": 22.25,
            "avgSetsPlayed": 2.375,
            "tiebreakRate": 0.10526315789473684,
            "extendedSetRate": 0.2631578947368421,
            "shortSetRate": 0.47368421052631576
          }
        },
        {
          "name": "Naomi Osaka",
          "holdPct": 73,
          "firstServeWonPct": 67,
          "secondServeWonPct": 47,
          "servicePointsWonPct": 60,
          "returnPointsWonPct": null,
          "returnGamesWonPct": null,
          "breakPointsSavedPct": 58.2,
          "breakPointsConvertedPct": 52.2,
          "aces": 4.8,
          "doubleFaults": 3.1,
          "winners": null,
          "unforcedErrors": null,
          "weaknessScore": 4,
          "weakServeMatches": 0,
          "statMatches": 9,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 19,
            "firstSetSamples": 8,
            "avgFirstSetGames": 10,
            "avgSetGames": 9.789473684210526,
            "avgMatchGames": 23.25,
            "avgSetsPlayed": 2.375,
            "tiebreakRate": 0.2631578947368421,
            "extendedSetRate": 0.2631578947368421,
            "shortSetRate": 0.3157894736842105
          }
        }
      ],
      "expectedFirstSetGames": 9.6,
      "expectedMatchGames": 22.1,
      "signalStrength": 8,
      "holdAvg": 75.5,
      "returnGamesAvg": null,
      "returnPointsAvg": null,
      "breakPointsSavedAvg": 59.5,
      "breakPointsConvertedAvg": 47.8,
      "setSamples": 38,
      "firstSetSamples": 16,
      "avgFirstSetGames": 9.5,
      "avgSetGames": 9.6,
      "tiebreakRate": 18.4,
      "extendedSetRate": 26.3,
      "shortSetRate": 39.5,
      "reasonCore": "hold avg 76%, BP saved 59%, BP converted 48%, first-set sample 9.5g, 38 recent sets"
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Aryna Sabalenka",
        "line": null,
        "americanOdds": -480,
        "modelPct": 79.1,
        "impliedPct": 82.8,
        "edgePct": -3.7,
        "evPer100": -4.4,
        "netEvPer100": -6.4,
        "grade": "Favorite tax trap",
        "issue": "Favorite tax trap",
        "reason": "Likely winner can still be a bad ML bet after payout and fees. Check spread, total, and set-win instead."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Aryna Sabalenka",
        "line": -4.5,
        "americanOdds": -134,
        "modelPct": 73,
        "impliedPct": 57.3,
        "edgePct": 15.7,
        "evPer100": 27.5,
        "netEvPer100": 25.5,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 73,
        "grade": "Watch only",
        "reason": "Spread is number-dependent; verify first service cycle"
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "Over",
        "line": 20.5,
        "americanOdds": -112,
        "modelPct": 62,
        "impliedPct": 52.8,
        "edgePct": 9.2,
        "evPer100": 17.4,
        "netEvPer100": 15.4,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 62,
        "grade": "Watch only",
        "reason": "Total games need expected match games vs the posted line."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Aryna Sabalenka 84% / Naomi Osaka 36%",
        "rows": [
          {
            "name": "Aryna Sabalenka",
            "confidence": 84,
            "modelPct": 79.1,
            "label": "Strong set-win path"
          },
          {
            "name": "Naomi Osaka",
            "confidence": 36,
            "modelPct": 20.9,
            "label": "Thin set-win path"
          }
        ],
        "confidence": 84,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Pass / near line",
        "expectedGames": 9.6,
        "confidence": 52,
        "tiebreakRisk": 23,
        "earlyBreakRisk": 50,
        "grade": "Near fair",
        "reason": "Expected first-set games 9.6 vs FanDuel 9.5; near the number. hold avg 76%, BP saved 59%, BP converted 48%, first-set sample 9.5g, 38 recent sets."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Naomi Osaka",
      "opponent": "Aryna Sabalenka",
      "grade": "Negative EV",
      "riskGate": "error-control risk, hold risk, closeout risk",
      "marketOdds": 376,
      "fairOdds": 378,
      "modelProbability": 20.9,
      "dataOnlyProbability": 21.4,
      "marketProbability": 21,
      "marketDisagreementPct": 0.1,
      "netEvPer100": -2.4,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Naomi Osaka does not clear a fee-adjusted value case.",
      "useCase": "Needs a posted market price before sizing.",
      "bullets": [
        "Recent hold: Naomi Osaka 73% vs Aryna Sabalenka 77.6%.",
        "Serve events: Naomi Osaka 4.8 aces / 0 DFs vs Aryna Sabalenka 2.4 aces / 0 DFs.",
        "Serve points: Naomi Osaka 1st 66.7%, 2nd 0% vs Aryna Sabalenka 1st 67.2%, 2nd 0%."
      ],
      "risks": [
        "Desk lean still has Aryna Sabalenka; this is a price-dislocation play, not the safest winner.",
        "Market still prices Naomi Osaka as a real underdog at 21% implied.",
        "Aryna Sabalenka strength: protects serve well (78% hold)."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page Chrome scrape",
      "capturedAt": "2026-06-01T07:51:17.065Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/aryna-sabalenka-v-naomi-osaka-35667356",
      "eventId": "35667356",
      "players": [
        {
          "name": "Aryna Sabalenka",
          "odds": -480,
          "americanLabel": "-480",
          "impliedPct": 82.8,
          "decimalOdds": 1.208,
          "modelPct": 79.1,
          "edgePct": -3.7,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 20.8,
          "grossPayoutMultiple": 1.208,
          "centsAtRisk": 100,
          "centsProfitIfWin": 20.8
        },
        {
          "name": "Naomi Osaka",
          "odds": 360,
          "americanLabel": "+360",
          "impliedPct": 21.7,
          "decimalOdds": 4.6,
          "modelPct": 20.9,
          "edgePct": -0.8,
          "priceBand": "Underdog",
          "grossProfitPct": 360,
          "grossPayoutMultiple": 4.6,
          "centsAtRisk": 100,
          "centsProfitIfWin": 360
        }
      ],
      "desk": {
        "name": "Aryna Sabalenka",
        "odds": -480,
        "americanLabel": "-480",
        "impliedPct": 82.8,
        "decimalOdds": 1.208,
        "modelPct": 79.1,
        "edgePct": -3.7,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 20.8,
        "grossPayoutMultiple": 1.208,
        "centsAtRisk": 100,
        "centsProfitIfWin": 20.8
      },
      "spread": {
        "player": "Aryna Sabalenka",
        "spread": -4.5,
        "odds": -134
      },
      "total": {
        "side": "Over",
        "line": 20.5,
        "odds": -112
      },
      "totalOver": {
        "side": "Over",
        "line": 20.5,
        "odds": -112
      },
      "totalUnder": {
        "side": "Under",
        "line": 20.5,
        "odds": -118
      },
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": -106
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": -106
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": -132
      },
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "Aryna Sabalenka -4.5 (-134)",
      "totalValue": "20.5 games: Over -112 / Under -118",
      "firstSetTotalValue": "9.5 1st-set games: Over -106 / Under -132",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Aryna Sabalenka -480 / Naomi Osaka +360",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 79.1% vs FanDuel implied 82.8% (-3.7 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Aryna-Sabalenka-Vs-Naomi-Osaka/",
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
          "asOf": "2026-06-01"
        },
        "qualityName": "Aryna Sabalenka",
        "profile": "Live rank #1 | Belarus | age 28 | 2026 clay 7-2, 78% | adj form 88 | hold 78%",
        "modelPct": 79.1,
        "weakness": {
          "name": "Aryna Sabalenka",
          "serviceHoldPct": 78,
          "firstServeWonPct": 67,
          "secondServeWonPct": 52,
          "firstServePct": 66,
          "avgAces": 2.4,
          "avgDoubleFaults": 2.4,
          "avgWinners": null,
          "avgUnforcedErrors": null,
          "avgBreakPointsFaced": null,
          "returnPointsWonPct": null,
          "servicePointsWonPct": 62,
          "weakServeMatches": 0,
          "pressureMatches": 3,
          "matchesWithStats": 9,
          "weaknessScore": 0,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "protects serve well (78% hold)"
          ],
          "gameFlowRead": "Aryna Sabalenka has no major service weakness in the joined Flashscore sample."
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
          "asOf": "2026-06-01"
        },
        "qualityName": "Naomi Osaka",
        "profile": "Live rank #16 | Japan | age 28 | 2026 clay 7-2, 78% | adj form 80 | hold 73%",
        "modelPct": 20.9,
        "weakness": {
          "name": "Naomi Osaka",
          "serviceHoldPct": 73,
          "firstServeWonPct": 67,
          "secondServeWonPct": 47,
          "firstServePct": 65,
          "avgAces": 4.8,
          "avgDoubleFaults": 3.1,
          "avgWinners": null,
          "avgUnforcedErrors": null,
          "avgBreakPointsFaced": null,
          "returnPointsWonPct": null,
          "servicePointsWonPct": 60,
          "weakServeMatches": 0,
          "pressureMatches": 5,
          "matchesWithStats": 9,
          "weaknessScore": 4,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Naomi Osaka has no major service weakness in the joined Flashscore sample."
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
      centsProfitIfWin: player.centsProfitIfWin,
      bidPct: player.bidPct ?? null,
      lastTradePct: player.lastTradePct ?? null,
      openInterest: player.openInterest ?? null,
      symbol: player.symbol ?? null
    }))
  } : null
  const predictionMarket = market ? {
    source: market.source,
    capturedAt: market.capturedAt,
    totalVolume: market?.totalVolume ?? null,
    players: marketPlayers.map((player) => ({ name: player.name, probabilityPct: player.impliedPct, amount: player.openInterest ?? null, americanOdds: player.odds, edgePct: player.edgePct, priceBand: player.priceBand }))
  } : null
  const oddsMarkets = [
    { label: raw.marketOnly ? 'Prediction market' : 'Model fair', book: raw.marketOnly ? (market?.source || 'Prediction market') : 'Tennis warehouse model', value: raw.players.map((player) => `${player.name} ${player.modelPct}%`).join(' / ') },
    market ? { label: market.source === 'Robinhood prediction market' ? 'Prediction market prices' : 'FanDuel moneyline', book: market.source, value: market.mlValue } : null,
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
    stage: raw.stage || `Roland Garros ${raw.tour === 'ATP' ? 'Men' : 'Women'} | ${raw.round || 'Round 2'}`,
    spotlight: raw.tags.includes('High confidence'),
    confidence: raw.confidence,
    volatility: raw.volatility,
    tags: raw.tags,
    matchup: players.map((player, index) => ({ side: index === 0 ? 'Player 1' : 'Player 2', name: player.name, displayName: player.name, detail: player.profile || 'Profile pending' })),
    summary: raw.marketOnly ? `${raw.pickName} is the current market favorite. ${raw.reason}` : `Our model pick: ${raw.pickName}. ${raw.reason}`,
    factors: [
      raw.reason,
      market?.noVigNote,
      raw.weaknessEdge?.gameFlow,
      raw.weaknessEdge?.liveTrigger,
      raw.totals,
      raw.modelSplit ? `Model split warning: the older score model preferred ${raw.basePickName}, but the multimodel ensemble makes ${raw.pickName} the official pick. Treat ML as pass-first unless the price and live state agree.` : null,
      'May 27 lesson applied: favorites need proof from recent hold, opponent strength, payout, and a visible weakness path.',
      raw.marketOnly ? 'Market-only Challenger row: no warehouse edge, sportsbook derivative, or service profile has been joined yet.' : market ? market.marketNote : 'No FanDuel line is stored for this match yet, so market edge is model-vs-fair only until a price is captured.'
    ].filter(Boolean),
    lean: raw.marketOnly ? `Market watch: ${raw.pickName}; do not treat as a model bet.` : market?.priceAction ? `Lean ${raw.pickName}; ${market.priceAction}` : `Lean ${raw.pickName}; pass if the market price removes payout.`,
    swing: `Risk: ${raw.tour === 'WTA' ? 'best-of-three volatility and break clusters' : 'best-of-five set extension and tiebreak variance'}.`,
    swingFactor: `Risk: ${raw.tour === 'WTA' ? 'best-of-three volatility and break clusters' : 'best-of-five set extension and tiebreak variance'}.`,
    odds: {
      participantOrder: [0, 1],
      markets: oddsMarkets,
      note: market?.marketNote || 'Market price not captured yet. Use this as fair-value context, not a bet ticket.',
      provider: market?.source || 'Tennis warehouse model'
    },
    tennisContext: {
      surface: raw.surface || 'Clay',
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
        market ? { label: market?.source === 'Robinhood prediction market' ? 'Prediction market' : 'FanDuel moneyline', metric: 'Implied price', leftScore: marketPlayers.find((player) => player.name === raw.players[0].name)?.impliedPct ?? 0, rightScore: marketPlayers.find((player) => player.name === raw.players[1].name)?.impliedPct ?? 0, leftLabel: raw.players[0].name, rightLabel: raw.players[1].name, winner: market.priceAction } : null,
        { label: 'Weakness', metric: 'Lower is cleaner', leftScore: raw.players[0].weakness?.weaknessScore ?? 0, rightScore: raw.players[1].weakness?.weaknessScore ?? 0, leftLabel: raw.players[0].name, rightLabel: raw.players[1].name, winner: raw.weaknessEdge?.edgeType || 'No clear weakness edge' },
        { label: 'Volatility', metric: 'Lower is cleaner', leftScore: raw.volatility, rightScore: 100 - raw.volatility, leftLabel: 'Risk', rightLabel: 'Stability', winner: raw.volatility <= 55 ? 'Stable enough' : 'Pass-first' }
      ].filter(Boolean),
      predictionMarket,
      bettingMatrix: raw.bettingMatrix,
      derivativeMarketCase: raw.derivativeCase,
      valueBoard: raw.valueBoard,
      ensembleValueCase: raw.ensembleValueCase,
      projection: { projectedWinner: raw.pickName, projectedSetLine: raw.bestOf === 3 || raw.tour === 'WTA' ? '2-0/2-1 range' : '3-1/3-2 range', setWinProjections: raw.setWinProjections, totalGames: market?.total?.line ?? null, straightSetsProbability: raw.bestOf === 3 ? Math.max(48, Math.min(68, raw.confidence - 8)) : null, upsetRisk: 100 - raw.confidence, overview: raw.weaknessEdge?.gameFlow || raw.reason, fantasy: [] },
      tradePlan: { laneLabel: raw.tags.includes('High confidence') ? 'High confidence, price required' : market?.priceAction || 'Pass-first', summary: raw.weaknessEdge?.gameFlow || raw.totals, trigger: raw.weaknessEdge?.liveTrigger, headline: raw.weaknessEdge?.edgeType, exit: market?.spreadLean || raw.weaknessEdge?.spreadRead, tone: raw.tags.includes('High confidence') ? 'accent' : 'warning' },
      derivativeMarkets: [
        { label: 'ML', value: market ? `${raw.pickName} ${deskMarket?.americanLabel || ''}; ${market.noVigNote}` : 'Need market price', lean: market?.priceAction || raw.weaknessEdge?.edgeType || 'Fair only', confidence: raw.confidence, ...(raw.valueBoard?.ml || {}), tone: market?.desk?.edgePct >= 7 ? 'accent' : market?.desk?.edgePct <= -4 ? 'warning' : 'neutral', reason: market?.marketNote || raw.weaknessEdge?.gameFlow || raw.reason },
        { label: 'Win a set', value: raw.setWinProjections?.map((entry) => entry.name + ' ' + entry.confidence + '%').join(' / ') || 'No set projection', lean: raw.setWinProjections?.find((entry) => entry.name !== raw.pickName)?.label || 'Set-win path', confidence: Math.max(...(raw.setWinProjections || []).map((entry) => Number(entry.confidence) || 0), 0), setWinRows: raw.valueBoard?.setWin || [], valueGrade: 'Needs posted price', tone: raw.bestOf === 5 ? 'accent' : 'neutral', reason: raw.bestOf === 5 ? 'Best-of-five gives the non-ML side more room to win a set; use this to separate upset risk from match-winner confidence.' : 'Best-of-three set-win confidence is more fragile; early service holds matter more.' },
        { label: 'Spread', value: market?.spreadValue || 'Need posted game spread', lean: market?.spreadLean || raw.weaknessEdge?.spreadRead || 'Need number', confidence: Math.max(50, raw.confidence - 6), ...(raw.valueBoard?.spread || {}), tone: raw.weaknessEdge?.edgeType === 'Weakness edge' ? 'accent' : 'neutral', reason: raw.weaknessEdge?.liveTrigger || 'Wait for first service cycle.' },
        { label: 'O/U', value: market?.totalValue || 'Need posted total', lean: raw.valueBoard?.total?.selection || market?.totalLean || raw.weaknessEdge?.totalRead || raw.totals, confidence: raw.valueBoard?.total?.modelPct ?? Math.max(50, raw.confidence - 8), ...(raw.valueBoard?.total || {}), tone: raw.valueBoard?.total?.selection === 'Over' || raw.valueBoard?.total?.selection === 'Under' ? 'accent' : 'neutral', reason: raw.valueBoard?.total?.reason || raw.totals },
        { label: '1st set O/U', value: raw.valueBoard?.firstSetTotal?.line ? `Line ${raw.valueBoard.firstSetTotal.line}` : 'Need posted first-set total', lean: raw.valueBoard?.firstSetTotal?.selection || raw.valueBoard?.firstSetTotal?.lean || 'Price required', confidence: raw.valueBoard?.firstSetTotal?.confidence ?? Math.max(50, raw.confidence - 10), ...(raw.valueBoard?.firstSetTotal || {}), tone: raw.valueBoard?.firstSetTotal?.confidence >= 58 ? 'accent' : 'neutral', reason: raw.valueBoard?.firstSetTotal?.reason || 'Use expected first-set games against the posted 1st-set total.' }
      ],
      marketEconomics,
      clayMatchupData: clayData,
      opponentQualityData: qualityContext,
      researchLinks: [{ label: 'ESPN scoreboard', url: 'https://www.espn.com/tennis/scoreboard/_/date/20260601' }, { label: 'Tennistonic H2H', url: raw.h2hUrl }, ...(market?.eventUrl ? [{ label: market.source === 'Robinhood prediction market' ? 'Robinhood market' : 'FanDuel event', url: market.eventUrl }] : [])],
      formEdgeName: raw.pickName
    },
    participants,
    moneyline: market ? { available: true, label: market.source === 'Robinhood prediction market' ? 'Prediction market' : 'FanDuel moneyline', provider: market.source, participants } : { available: false, label: 'Moneyline', provider: 'Tennis warehouse model', participants: [] },
    analysis: { available: true, participantId: picked.id, participant: picked, opponent, lean: `Lean ${raw.pickName}`, rationale: raw.reason, confidence: raw.confidence, volatility: raw.volatility, recommendationScore: raw.confidence - Math.round(raw.volatility / 3) + Math.round(Math.max(-8, Math.min(8, deskMarket?.edgePct ?? 0))), tier: raw.modelSplit ? 'Model split / pass ML' : raw.tags.includes('High confidence')  ? 'High confidence' : raw.tags.includes('Lean') ? 'Lean' : 'Watch', sourceLabel: raw.modelSource || 'Tennis warehouse model', modelEdge: deskMarket?.edgePct ?? 0, modelEdgeLabel: deskMarket ? `${deskMarket.edgePct > 0 ? '+' : ''}${deskMarket.edgePct} pts vs FanDuel implied` : 'Fair value only until market price is captured', marketProbability: deskMarket?.impliedPct ? deskMarket.impliedPct / 100 : null, marketProbabilityLabel: deskMarket?.impliedPct ? `${deskMarket.impliedPct}% FanDuel implied` : 'No market', inputs: [], inputsUsed: market ? 4 : 3, volatilityNotes: [] }
  }, { structuredAnalysis: true })
}

const matches = rawTennisGames.map(buildGame)

export const tennisModelCartridge = {
  "id": "TEN-T0",
  "sport": "tennis",
  "label": "TEN-T0 tennis baseline",
  "status": "baseline",
  "entrypoint": "models/tennis/cartridges/TEN-T0/runner.mjs",
  "manifestPath": "models/tennis/cartridges/TEN-T0/manifest.json"
}
export const slateMeta = { title: 'June 1, 2026 Tennis Desk', date: 'June 1, 2026', isoDate: '2026-06-01', timeZone: 'America/Los_Angeles', modelCartridge: tennisModelCartridge, subtitle: 'Roland Garros senior singles plus Robinhood ATP Challenger prediction-market inventory; model edges only apply where warehouse context is joined.', notes: ['No doubles included.', 'FanDuel ML, game handicap, and total-games lines are attached where the sportsbook board exposes a matching singles event.', 'June 1, 2026 uses live rank, clay record, opponent-adjusted recent form, and warehouse service rows where joined.'] }
export const filters = ['All', 'Tennis']
export const oddsMeta = { provider: 'FanDuel Sportsbook + Robinhood prediction markets + Tennis warehouse model', snapshot: 'June 1, 2026 Roland Garros desk', note: 'FanDuel lines are stored for priced matches; very expensive favorites are marked as low-payout or pass-first instead of automatic bets.' }
export const sources = [{ label: 'ESPN tennis scoreboard', url: 'https://www.espn.com/tennis/scoreboard/_/date/20260601' }, { label: 'Live Tennis rankings warehouse', url: 'https://live-tennis.eu/' }, { label: 'FanDuel sportsbook tennis', url: 'https://sportsbook.fanduel.com/tennis' }, { label: 'Robinhood tennis prediction markets', url: 'https://robinhood.com/us/en/prediction-markets/tennis/' }]
export const games = matches.sort((left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title))
