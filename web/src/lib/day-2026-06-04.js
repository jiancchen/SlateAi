import { createSportsMatchModel } from './sports-model.js'
import tennisClayContext from './day-2026-06-04-tennis-clay-context.generated.json' with { type: 'json' }
import tennisOpponentQualityContext from './day-2026-06-04-tennis-opponent-quality.generated.json' with { type: 'json' }
import tennisWarehouseContext from './day-2026-06-04-tennis-warehouse-context.generated.json' with { type: 'json' }

const rawTennisGames = [
  {
    "id": "rh-atp-challenger-centurion-2-beckley-vs-duran-2026-06-04",
    "eventId": "ca93979e-616b-470d-8aad-b23bf7056db4",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Hard",
    "surfaceSource": "ATP Challenger Centurion surface",
    "title": "Alec Beckley vs Tuncay Duran",
    "start": "1:00 AM",
    "startMinutes": 60,
    "court": "ATP Challenger Centurion 2",
    "round": "Round Of 16",
    "stage": "ATP Challenger Centurion 2 | Round Of 16",
    "pickName": "Tuncay Duran",
    "basePickName": "Tuncay Duran",
    "modelSource": "Flashscore/SofaScore warehouse Challenger model",
    "modelSplit": false,
    "marketOnly": false,
    "confidence": 52,
    "volatility": 48,
    "tags": [
      "ATP Challenger",
      "Hard",
      "Prediction market",
      "Warehouse joined",
      "Flashscore first",
      "Coinflip price"
    ],
    "reason": "Tuncay Duran has the recent service-hold edge 100% to 75%. Lean, not a chase.",
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
        "name": "Tuncay Duran",
        "serviceHoldPct": 100,
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
        "strengths": [
          "protects serve well (100% hold)"
        ],
        "gameFlowRead": "Tuncay Duran has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Alec Beckley",
        "serviceHoldPct": 75,
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
        "gameFlowRead": "Alec Beckley has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Alec Beckley",
        "confidence": 70,
        "modelPct": 48.4,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Tuncay Duran",
        "confidence": 60,
        "modelPct": 52,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Tuncay Duran",
        "americanOdds": -125,
        "modelPct": 52,
        "impliedPct": 55.6,
        "edgePct": -3.6,
        "evPer100": -6.4,
        "netEvPer100": -8.4,
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
        "expectedGames": null,
        "valueGrade": "No direction",
        "reason": "No posted match total captured.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Pass / near line",
        "line": 9.5,
        "americanOdds": null,
        "expectedGames": 9.5,
        "confidence": 50,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 50,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Near fair",
        "reason": "Expected first-set games 9.5 vs DraftKings Sportsbook 9.5; Pass / near line.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Alec Beckley",
          "confidence": 70,
          "modelPct": 48.4,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Tuncay Duran",
          "confidence": 60,
          "modelPct": 52,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": null,
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Tuncay Duran",
        "line": null,
        "americanOdds": -125,
        "modelPct": 52,
        "impliedPct": 55.6,
        "edgePct": -3.6,
        "evPer100": -6.4,
        "netEvPer100": -8.4,
        "grade": "Negative EV",
        "issue": "Favorite price needs better proof",
        "reason": "ML is close to fair; derivative or live entry needs to carry the edge."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": null,
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
        "selection": "Alec Beckley 70% / Tuncay Duran 60%",
        "rows": [
          {
            "name": "Alec Beckley",
            "confidence": 70,
            "modelPct": 48.4,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Tuncay Duran",
            "confidence": 60,
            "modelPct": 52,
            "label": "Market favorite to win a set"
          }
        ],
        "confidence": 70,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Pass / near line",
        "expectedGames": 9.5,
        "confidence": 50,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "grade": "Near fair",
        "reason": "Expected first-set games 9.5 vs DraftKings Sportsbook 9.5; Pass / near line."
      }
    ],
    "ensembleValueCase": null,
    "marketData": {
      "source": "DraftKings Sportsbook",
      "sourceDetail": "DraftKings Sportsbook BFF",
      "capturedAt": "2026-06-04T03:58:54.329Z",
      "eventUrl": "https://sportsbook.draftkings.com/leagues/tennis/challenger-centurion-2?event=34236801",
      "eventId": "34236801",
      "players": [
        {
          "name": "Alec Beckley",
          "odds": -110,
          "americanLabel": "-110",
          "impliedPct": 52.4,
          "decimalOdds": 1.909,
          "modelPct": 48.4,
          "edgePct": -4,
          "priceBand": "Coinflip",
          "grossProfitPct": 90.9,
          "grossPayoutMultiple": 1.909,
          "centsAtRisk": 100,
          "centsProfitIfWin": 90.9
        },
        {
          "name": "Tuncay Duran",
          "odds": -125,
          "americanLabel": "-125",
          "impliedPct": 55.6,
          "decimalOdds": 1.8,
          "modelPct": 52,
          "edgePct": -3.6,
          "priceBand": "Coinflip",
          "grossProfitPct": 80,
          "grossPayoutMultiple": 1.8,
          "centsAtRisk": 100,
          "centsProfitIfWin": 80
        }
      ],
      "desk": {
        "name": "Tuncay Duran",
        "odds": -125,
        "americanLabel": "-125",
        "impliedPct": 55.6,
        "decimalOdds": 1.8,
        "modelPct": 52,
        "edgePct": -3.6,
        "priceBand": "Coinflip",
        "grossProfitPct": 80,
        "grossPayoutMultiple": 1.8,
        "centsAtRisk": 100,
        "centsProfitIfWin": 80
      },
      "spread": null,
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": -125
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": -125
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": -110
      },
      "firstServiceGameTotalPoints": [],
      "firstGameProps": [],
      "setWinMarkets": [],
      "priceAction": "ML is close to fair; derivative or live entry needs to carry the edge.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "9.5 1st-set games: Over -125 / Under -110",
      "firstServiceGameValue": "No first-service-game market captured",
      "firstGamePropsValue": "No first-game prop market captured",
      "setWinValue": "No set-win price captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Alec Beckley -110 / Tuncay Duran -125",
      "marketNote": "DraftKings Sportsbook ML, game handicap, match total, first-set total, set-win, and first-service-game markets captured where available. ML is close to fair; derivative or live entry needs to carry the edge.",
      "noVigNote": "Model 52% vs DraftKings Sportsbook implied 55.6% (-3.6 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Alec-Beckley-Vs-Tuncay-Duran/",
    "players": [
      {
        "name": "Alec Beckley",
        "ranking": {
          "name": "Alec Beckley",
          "rank": 506,
          "points": 84,
          "age": 24.9,
          "country": "RSA",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "asOf": "2026-05-26"
        },
        "qualityName": "Alec Beckley",
        "profile": "Hard | Live rank #506 | RSA | age 24.9 | hold 75%",
        "modelPct": 48.4,
        "weakness": {
          "name": "Alec Beckley",
          "serviceHoldPct": 75,
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
          "gameFlowRead": "Alec Beckley has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      },
      {
        "name": "Tuncay Duran",
        "ranking": {
          "name": "Tuncay Duran",
          "rank": 759,
          "points": 38,
          "age": 21.9,
          "country": "TUR",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "asOf": "2026-05-26"
        },
        "qualityName": "Tuncay Duran",
        "profile": "Hard | Live rank #759 | TUR | age 21.9 | hold 100%",
        "modelPct": 52,
        "weakness": {
          "name": "Tuncay Duran",
          "serviceHoldPct": 100,
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
          "strengths": [
            "protects serve well (100% hold)"
          ],
          "gameFlowRead": "Tuncay Duran has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-centurion-2-donski-vs-winter-2026-06-04",
    "eventId": "fb70ec79-e215-4f30-be3e-e417773474c0",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Hard",
    "surfaceSource": "ATP Challenger Centurion surface",
    "title": "Edward Winter vs Alexander Donski",
    "start": "1:00 AM",
    "startMinutes": 60,
    "court": "ATP Challenger Centurion 2",
    "round": "Round Of 16",
    "stage": "ATP Challenger Centurion 2 | Round Of 16",
    "pickName": "Edward Winter",
    "basePickName": "Edward Winter",
    "modelSource": "Flashscore/SofaScore warehouse Challenger model",
    "modelSplit": false,
    "marketOnly": false,
    "confidence": 60.8,
    "volatility": 49,
    "tags": [
      "ATP Challenger",
      "Hard",
      "Prediction market",
      "Warehouse joined",
      "Flashscore first",
      "Coinflip price"
    ],
    "reason": "Alexander Donski has the recent service-hold edge 100% to 80%, so Edward Winter needs the rank/form edge to show up on return games. Lean, not a chase.",
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
        "name": "Edward Winter",
        "serviceHoldPct": 80,
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
        "strengths": [
          "protects serve well (80% hold)"
        ],
        "gameFlowRead": "Edward Winter has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Alexander Donski",
        "serviceHoldPct": 100,
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
        "strengths": [
          "protects serve well (100% hold)"
        ],
        "gameFlowRead": "Alexander Donski has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Edward Winter",
        "confidence": 69,
        "modelPct": 60.8,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Alexander Donski",
        "confidence": 61,
        "modelPct": 40,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Edward Winter",
        "americanOdds": -380,
        "modelPct": 60.8,
        "impliedPct": 79.2,
        "edgePct": -18.4,
        "evPer100": -23.2,
        "netEvPer100": -25.2,
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
        "expectedGames": null,
        "valueGrade": "No direction",
        "reason": "No posted match total captured.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Under 9.5",
        "line": 9.5,
        "americanOdds": -120,
        "expectedGames": 9.2,
        "confidence": 52,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 52,
        "evPer100": -4.7,
        "netEvPer100": -6.7,
        "valueGrade": "Near fair",
        "reason": "Expected first-set games 9.2 vs DraftKings Sportsbook 9.5; Under 9.5.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Edward Winter",
          "confidence": 69,
          "modelPct": 60.8,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Alexander Donski",
          "confidence": 61,
          "modelPct": 40,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": null,
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Edward Winter",
        "line": null,
        "americanOdds": -380,
        "modelPct": 60.8,
        "impliedPct": 79.2,
        "edgePct": -18.4,
        "evPer100": -23.2,
        "netEvPer100": -25.2,
        "grade": "Negative EV",
        "issue": "Favorite price needs better proof",
        "reason": "Favorite price has limited payout; require a strong weakness edge or use spread/total."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": null,
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
        "selection": "Edward Winter 69% / Alexander Donski 61%",
        "rows": [
          {
            "name": "Edward Winter",
            "confidence": 69,
            "modelPct": 60.8,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Alexander Donski",
            "confidence": 61,
            "modelPct": 40,
            "label": "Underdog set-win path needs early holds"
          }
        ],
        "confidence": 69,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Under 9.5",
        "expectedGames": 9.2,
        "confidence": 52,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "grade": "Near fair",
        "reason": "Expected first-set games 9.2 vs DraftKings Sportsbook 9.5; Under 9.5."
      }
    ],
    "ensembleValueCase": null,
    "marketData": {
      "source": "DraftKings Sportsbook",
      "sourceDetail": "DraftKings Sportsbook BFF",
      "capturedAt": "2026-06-04T03:58:52.840Z",
      "eventUrl": "https://sportsbook.draftkings.com/leagues/tennis/challenger-centurion-2?event=34234835",
      "eventId": "34234835",
      "players": [
        {
          "name": "Edward Winter",
          "odds": -380,
          "americanLabel": "-380",
          "impliedPct": 79.2,
          "decimalOdds": 1.263,
          "modelPct": 60.8,
          "edgePct": -18.4,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 26.3,
          "grossPayoutMultiple": 1.263,
          "centsAtRisk": 100,
          "centsProfitIfWin": 26.3
        },
        {
          "name": "Alexander Donski",
          "odds": 250,
          "americanLabel": "+250",
          "impliedPct": 28.6,
          "decimalOdds": 3.5,
          "modelPct": 40,
          "edgePct": 11.4,
          "priceBand": "Underdog",
          "grossProfitPct": 250,
          "grossPayoutMultiple": 3.5,
          "centsAtRisk": 100,
          "centsProfitIfWin": 250
        }
      ],
      "desk": {
        "name": "Edward Winter",
        "odds": -380,
        "americanLabel": "-380",
        "impliedPct": 79.2,
        "decimalOdds": 1.263,
        "modelPct": 60.8,
        "edgePct": -18.4,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 26.3,
        "grossPayoutMultiple": 1.263,
        "centsAtRisk": 100,
        "centsProfitIfWin": 26.3
      },
      "spread": null,
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": -115
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": -115
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": -120
      },
      "firstServiceGameTotalPoints": [],
      "firstGameProps": [],
      "setWinMarkets": [],
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "9.5 1st-set games: Over -115 / Under -120",
      "firstServiceGameValue": "No first-service-game market captured",
      "firstGamePropsValue": "No first-game prop market captured",
      "setWinValue": "No set-win price captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Edward Winter -380 / Alexander Donski +250",
      "marketNote": "DraftKings Sportsbook ML, game handicap, match total, first-set total, set-win, and first-service-game markets captured where available. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 60.8% vs DraftKings Sportsbook implied 79.2% (-18.4 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Edward-Winter-Vs-Alexander-Donski/",
    "players": [
      {
        "name": "Edward Winter",
        "ranking": {
          "name": "Edward Winter",
          "rank": 500,
          "points": 85,
          "age": 21.6,
          "country": "AUS",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "asOf": "2026-05-26"
        },
        "qualityName": "Edward Winter",
        "profile": "Hard | Live rank #500 | AUS | age 21.6 | hold 80%",
        "modelPct": 60.8,
        "weakness": {
          "name": "Edward Winter",
          "serviceHoldPct": 80,
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
          "strengths": [
            "protects serve well (80% hold)"
          ],
          "gameFlowRead": "Edward Winter has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 7,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      },
      {
        "name": "Alexander Donski",
        "ranking": {
          "name": "Alexander Donski",
          "rank": 672,
          "points": 49,
          "age": 27.8,
          "country": "BUL",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "asOf": "2026-05-26"
        },
        "qualityName": "Alexander Donski",
        "profile": "Hard | Live rank #672 | BUL | age 27.8 | hold 100%",
        "modelPct": 40,
        "weakness": {
          "name": "Alexander Donski",
          "serviceHoldPct": 100,
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
          "strengths": [
            "protects serve well (100% hold)"
          ],
          "gameFlowRead": "Alexander Donski has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 7,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-prostejov-sachko-vs-kopriva-2026-06-04",
    "eventId": "bda09e48-33a0-463f-a3ac-0ecc1a1c14a1",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Clay",
    "surfaceSource": "ATP Challenger Prostejov surface",
    "title": "Vitaliy Sachko vs Vit Kopriva",
    "start": "2:00 AM",
    "startMinutes": 120,
    "court": "ATP Challenger Prostejov",
    "round": "Round Of 16",
    "stage": "ATP Challenger Prostejov | Round Of 16",
    "pickName": "Vit Kopriva",
    "basePickName": "Vit Kopriva",
    "modelSource": "Flashscore/SofaScore warehouse Challenger model",
    "modelSplit": false,
    "marketOnly": false,
    "confidence": 64.1,
    "volatility": 55,
    "tags": [
      "ATP Challenger",
      "Clay",
      "Prediction market",
      "Warehouse joined",
      "Flashscore first",
      "Coinflip price"
    ],
    "reason": "Vitaliy Sachko has the recent service-hold edge 50% to 33%, so Vit Kopriva needs the rank/form edge to show up on return games. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness warning",
      "target": "Vit Kopriva",
      "scoreGap": -15,
      "attackingSide": null,
      "vulnerableSide": "Vit Kopriva",
      "gameFlow": "Vit Kopriva is the model side, but the fragile profile is on our pick: low recent hold rate (33%). Avoid laying a bad price until early holds are confirmed.",
      "liveTrigger": "Do not upgrade Vit Kopriva unless they hold cleanly in the first service game and keep double faults down.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "Avoid low unders if Vit Kopriva faces early break points or second-serve pressure.",
      "pick": {
        "name": "Vit Kopriva",
        "serviceHoldPct": 33,
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
        "weaknessScore": 31,
        "firstGameComfort": "Fragile opening-service profile",
        "liabilities": [
          "low recent hold rate (33%)"
        ],
        "strengths": [],
        "gameFlowRead": "Vit Kopriva can drop points quickly through low recent hold rate (33%)."
      },
      "opponent": {
        "name": "Vitaliy Sachko",
        "serviceHoldPct": 50,
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
        "weaknessScore": 16,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "low recent hold rate (50%)"
        ],
        "strengths": [],
        "gameFlowRead": "Vitaliy Sachko can drop points quickly through low recent hold rate (50%)."
      }
    },
    "setWinProjections": [
      {
        "name": "Vitaliy Sachko",
        "confidence": 58,
        "modelPct": 36.3,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Vit Kopriva",
        "confidence": 72,
        "modelPct": 64.1,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Vit Kopriva",
        "americanOdds": -430,
        "modelPct": 64.1,
        "impliedPct": 81.1,
        "edgePct": -17,
        "evPer100": -21,
        "netEvPer100": -23,
        "feePer100": 2,
        "valueIssue": "Favorite tax trap",
        "valueGrade": "Favorite tax trap",
        "betGrade": false
      },
      "spread": null,
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "line": null,
        "overOdds": null,
        "underOdds": null,
        "expectedGames": null,
        "valueGrade": "No direction",
        "reason": "No posted match total captured.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Under 9.5",
        "line": 9.5,
        "americanOdds": -165,
        "expectedGames": 9.2,
        "confidence": 52,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 52,
        "evPer100": -16.5,
        "netEvPer100": -18.5,
        "valueGrade": "Near fair",
        "reason": "Expected first-set games 9.2 vs DraftKings Sportsbook 9.5; Under 9.5.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Vitaliy Sachko",
          "confidence": 58,
          "modelPct": 36.3,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Vit Kopriva",
          "confidence": 72,
          "modelPct": 64.1,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": null,
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Vit Kopriva",
        "line": null,
        "americanOdds": -430,
        "modelPct": 64.1,
        "impliedPct": 81.1,
        "edgePct": -17,
        "evPer100": -21,
        "netEvPer100": -23,
        "grade": "Favorite tax trap",
        "issue": "Favorite tax trap",
        "reason": "Likely winner can still be a bad ML bet after payout and fees. Check spread, total, and set-win instead."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": null,
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
        "selection": "Vitaliy Sachko 58% / Vit Kopriva 72%",
        "rows": [
          {
            "name": "Vitaliy Sachko",
            "confidence": 58,
            "modelPct": 36.3,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Vit Kopriva",
            "confidence": 72,
            "modelPct": 64.1,
            "label": "Market favorite to win a set"
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
        "expectedGames": 9.2,
        "confidence": 52,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "grade": "Near fair",
        "reason": "Expected first-set games 9.2 vs DraftKings Sportsbook 9.5; Under 9.5."
      }
    ],
    "ensembleValueCase": null,
    "marketData": {
      "source": "DraftKings Sportsbook",
      "sourceDetail": "DraftKings Sportsbook BFF",
      "capturedAt": "2026-06-04T03:58:28.349Z",
      "eventUrl": "https://sportsbook.draftkings.com/leagues/tennis/challenger-prostejov?event=34235763",
      "eventId": "34235763",
      "players": [
        {
          "name": "Vitaliy Sachko",
          "odds": 296,
          "americanLabel": "+296",
          "impliedPct": 25.3,
          "decimalOdds": 3.96,
          "modelPct": 36.3,
          "edgePct": 11,
          "priceBand": "Underdog",
          "grossProfitPct": 296,
          "grossPayoutMultiple": 3.96,
          "centsAtRisk": 100,
          "centsProfitIfWin": 296
        },
        {
          "name": "Vit Kopriva",
          "odds": -430,
          "americanLabel": "-430",
          "impliedPct": 81.1,
          "decimalOdds": 1.233,
          "modelPct": 64.1,
          "edgePct": -17,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 23.3,
          "grossPayoutMultiple": 1.233,
          "centsAtRisk": 100,
          "centsProfitIfWin": 23.3
        }
      ],
      "desk": {
        "name": "Vit Kopriva",
        "odds": -430,
        "americanLabel": "-430",
        "impliedPct": 81.1,
        "decimalOdds": 1.233,
        "modelPct": 64.1,
        "edgePct": -17,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 23.3,
        "grossPayoutMultiple": 1.233,
        "centsAtRisk": 100,
        "centsProfitIfWin": 23.3
      },
      "spread": null,
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": 110
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": 110
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": -165
      },
      "firstServiceGameTotalPoints": [],
      "firstGameProps": [],
      "setWinMarkets": [],
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "9.5 1st-set games: Over +110 / Under -165",
      "firstServiceGameValue": "No first-service-game market captured",
      "firstGamePropsValue": "No first-game prop market captured",
      "setWinValue": "No set-win price captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Vitaliy Sachko +296 / Vit Kopriva -430",
      "marketNote": "DraftKings Sportsbook ML, game handicap, match total, first-set total, set-win, and first-service-game markets captured where available. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 64.1% vs DraftKings Sportsbook implied 81.1% (-17 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Vitaliy-Sachko-Vs-Vit-Kopriva/",
    "players": [
      {
        "name": "Vitaliy Sachko",
        "ranking": {
          "name": "Vitaliy Sachko",
          "rank": 226,
          "points": 252,
          "age": 28.8,
          "country": "UKR",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "asOf": "2026-05-26"
        },
        "qualityName": "Vitaliy Sachko",
        "profile": "Clay | Live rank #226 | UKR | age 28.8 | hold 50%",
        "modelPct": 36.3,
        "weakness": {
          "name": "Vitaliy Sachko",
          "serviceHoldPct": 50,
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
          "weaknessScore": 16,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "low recent hold rate (50%)"
          ],
          "strengths": [],
          "gameFlowRead": "Vitaliy Sachko can drop points quickly through low recent hold rate (50%)."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      },
      {
        "name": "Vit Kopriva",
        "ranking": {
          "name": "Vit Kopriva",
          "rank": 66,
          "points": 856,
          "age": 28,
          "country": "Czechia",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "asOf": "2026-06-02"
        },
        "qualityName": "Vit Kopriva",
        "profile": "Clay | Live rank #66 | Czechia | age 28 | hold 33%",
        "modelPct": 64.1,
        "weakness": {
          "name": "Vit Kopriva",
          "serviceHoldPct": 33,
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
          "weaknessScore": 31,
          "firstGameComfort": "Fragile opening-service profile",
          "liabilities": [
            "low recent hold rate (33%)"
          ],
          "strengths": [],
          "gameFlowRead": "Vit Kopriva can drop points quickly through low recent hold rate (33%)."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-centurion-2-bertrand-vs-hussey-2026-06-04",
    "eventId": "368d7bc3-bc0c-4472-9dd7-2a6428d5dbe6",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Hard",
    "surfaceSource": "ATP Challenger Centurion surface",
    "title": "Giles Hussey vs Robin Bertrand",
    "start": "2:10 AM",
    "startMinutes": 130,
    "court": "ATP Challenger Centurion 2",
    "round": "Round Of 16",
    "stage": "ATP Challenger Centurion 2 | Round Of 16",
    "pickName": "Giles Hussey",
    "basePickName": "Giles Hussey",
    "modelSource": "Flashscore/SofaScore warehouse Challenger model",
    "modelSplit": false,
    "marketOnly": false,
    "confidence": 53.5,
    "volatility": 49,
    "tags": [
      "ATP Challenger",
      "Hard",
      "Prediction market",
      "Warehouse joined",
      "Flashscore first",
      "Coinflip price"
    ],
    "reason": "Robin Bertrand has the recent service-hold edge 100% to 80%, so Giles Hussey needs the rank/form edge to show up on return games. Lean, not a chase.",
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
        "name": "Giles Hussey",
        "serviceHoldPct": 80,
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
        "strengths": [
          "protects serve well (80% hold)"
        ],
        "gameFlowRead": "Giles Hussey has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Robin Bertrand",
        "serviceHoldPct": 100,
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
        "strengths": [
          "protects serve well (100% hold)"
        ],
        "gameFlowRead": "Robin Bertrand has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Giles Hussey",
        "confidence": 62,
        "modelPct": 53.5,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Robin Bertrand",
        "confidence": 69,
        "modelPct": 47,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Giles Hussey",
        "americanOdds": -165,
        "modelPct": 53.5,
        "impliedPct": 62.3,
        "edgePct": -8.8,
        "evPer100": -14.1,
        "netEvPer100": -16.1,
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
        "expectedGames": null,
        "valueGrade": "No direction",
        "reason": "No posted match total captured.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Pass / near line",
        "line": 9.5,
        "americanOdds": null,
        "expectedGames": 9.5,
        "confidence": 50,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 50,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Near fair",
        "reason": "Expected first-set games 9.5 vs DraftKings Sportsbook 9.5; Pass / near line.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Giles Hussey",
          "confidence": 62,
          "modelPct": 53.5,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Robin Bertrand",
          "confidence": 69,
          "modelPct": 47,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": null,
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Giles Hussey",
        "line": null,
        "americanOdds": -165,
        "modelPct": 53.5,
        "impliedPct": 62.3,
        "edgePct": -8.8,
        "evPer100": -14.1,
        "netEvPer100": -16.1,
        "grade": "Negative EV",
        "issue": "Favorite price needs better proof",
        "reason": "DraftKings Sportsbook price is richer than the model; pass ML unless live state improves."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": null,
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
        "selection": "Giles Hussey 62% / Robin Bertrand 69%",
        "rows": [
          {
            "name": "Giles Hussey",
            "confidence": 62,
            "modelPct": 53.5,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Robin Bertrand",
            "confidence": 69,
            "modelPct": 47,
            "label": "Underdog set-win path needs early holds"
          }
        ],
        "confidence": 69,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Pass / near line",
        "expectedGames": 9.5,
        "confidence": 50,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "grade": "Near fair",
        "reason": "Expected first-set games 9.5 vs DraftKings Sportsbook 9.5; Pass / near line."
      }
    ],
    "ensembleValueCase": null,
    "marketData": {
      "source": "DraftKings Sportsbook",
      "sourceDetail": "DraftKings Sportsbook BFF",
      "capturedAt": "2026-06-04T03:58:57.324Z",
      "eventUrl": "https://sportsbook.draftkings.com/leagues/tennis/challenger-centurion-2?event=34235872",
      "eventId": "34235872",
      "players": [
        {
          "name": "Giles Hussey",
          "odds": -165,
          "americanLabel": "-165",
          "impliedPct": 62.3,
          "decimalOdds": 1.606,
          "modelPct": 53.5,
          "edgePct": -8.8,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 60.6,
          "grossPayoutMultiple": 1.606,
          "centsAtRisk": 100,
          "centsProfitIfWin": 60.6
        },
        {
          "name": "Robin Bertrand",
          "odds": 110,
          "americanLabel": "+110",
          "impliedPct": 47.6,
          "decimalOdds": 2.1,
          "modelPct": 47,
          "edgePct": -0.6,
          "priceBand": "Coinflip",
          "grossProfitPct": 110,
          "grossPayoutMultiple": 2.1,
          "centsAtRisk": 100,
          "centsProfitIfWin": 110
        }
      ],
      "desk": {
        "name": "Giles Hussey",
        "odds": -165,
        "americanLabel": "-165",
        "impliedPct": 62.3,
        "decimalOdds": 1.606,
        "modelPct": 53.5,
        "edgePct": -8.8,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 60.6,
        "grossPayoutMultiple": 1.606,
        "centsAtRisk": 100,
        "centsProfitIfWin": 60.6
      },
      "spread": null,
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": 100
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": 100
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": -140
      },
      "firstServiceGameTotalPoints": [],
      "firstGameProps": [],
      "setWinMarkets": [],
      "priceAction": "DraftKings Sportsbook price is richer than the model; pass ML unless live state improves.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "9.5 1st-set games: Over +100 / Under -140",
      "firstServiceGameValue": "No first-service-game market captured",
      "firstGamePropsValue": "No first-game prop market captured",
      "setWinValue": "No set-win price captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Giles Hussey -165 / Robin Bertrand +110",
      "marketNote": "DraftKings Sportsbook ML, game handicap, match total, first-set total, set-win, and first-service-game markets captured where available. DraftKings Sportsbook price is richer than the model; pass ML unless live state improves.",
      "noVigNote": "Model 53.5% vs DraftKings Sportsbook implied 62.3% (-8.8 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Giles-Hussey-Vs-Robin-Bertrand/",
    "players": [
      {
        "name": "Giles Hussey",
        "ranking": {
          "name": "Giles Hussey",
          "rank": 366,
          "points": 131,
          "age": 29,
          "country": "GBR",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "asOf": "2026-05-26"
        },
        "qualityName": "Giles Hussey",
        "profile": "Hard | Live rank #366 | GBR | age 29 | hold 80%",
        "modelPct": 53.5,
        "weakness": {
          "name": "Giles Hussey",
          "serviceHoldPct": 80,
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
          "strengths": [
            "protects serve well (80% hold)"
          ],
          "gameFlowRead": "Giles Hussey has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 7,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      },
      {
        "name": "Robin Bertrand",
        "ranking": {
          "name": "Robin Bertrand",
          "rank": 280,
          "points": 188,
          "age": 23.1,
          "country": "FRA",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "asOf": "2026-05-26"
        },
        "qualityName": "Robin Bertrand",
        "profile": "Hard | Live rank #280 | FRA | age 23.1 | hold 100%",
        "modelPct": 47,
        "weakness": {
          "name": "Robin Bertrand",
          "serviceHoldPct": 100,
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
          "strengths": [
            "protects serve well (100% hold)"
          ],
          "gameFlowRead": "Robin Bertrand has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 7,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-centurion-2-strombachs-vs-henning-2026-06-04",
    "eventId": "61216d1f-19d3-4897-843e-51cdeab44724",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Hard",
    "surfaceSource": "ATP Challenger Centurion surface",
    "title": "Philip Henning vs Robert Strombachs",
    "start": "2:10 AM",
    "startMinutes": 130,
    "court": "ATP Challenger Centurion 2",
    "round": "Round Of 16",
    "stage": "ATP Challenger Centurion 2 | Round Of 16",
    "pickName": "Philip Henning",
    "basePickName": "Philip Henning",
    "modelSource": "Flashscore/SofaScore warehouse Challenger model",
    "modelSplit": false,
    "marketOnly": false,
    "confidence": 62.2,
    "volatility": 48,
    "tags": [
      "ATP Challenger",
      "Hard",
      "Prediction market",
      "Warehouse joined",
      "Flashscore first",
      "Coinflip price"
    ],
    "reason": "Philip Henning has the recent service-hold edge 67% to 50%. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness edge",
      "target": "Robert Strombachs",
      "scoreGap": 15,
      "attackingSide": "Philip Henning",
      "vulnerableSide": "Robert Strombachs",
      "gameFlow": "Philip Henning has a real path if Robert Strombachs's first two service games show the same weakness: low recent hold rate (50%).",
      "liveTrigger": "Look for Robert Strombachs facing break points or second-serve pressure before 3-3.",
      "spreadRead": "Philip Henning spread only if the handicap is short and Robert Strombachs is under pressure early.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Philip Henning",
        "serviceHoldPct": 67,
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
        "weaknessScore": 1,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Philip Henning has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Robert Strombachs",
        "serviceHoldPct": 50,
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
        "weaknessScore": 16,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "low recent hold rate (50%)"
        ],
        "strengths": [],
        "gameFlowRead": "Robert Strombachs can drop points quickly through low recent hold rate (50%)."
      }
    },
    "setWinProjections": [
      {
        "name": "Philip Henning",
        "confidence": 70,
        "modelPct": 62.2,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Robert Strombachs",
        "confidence": 60,
        "modelPct": 38.6,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Philip Henning",
        "americanOdds": -330,
        "modelPct": 62.2,
        "impliedPct": 76.7,
        "edgePct": -14.5,
        "evPer100": -19,
        "netEvPer100": -21,
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
        "expectedGames": null,
        "valueGrade": "No direction",
        "reason": "No posted match total captured.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Under 9.5",
        "line": 9.5,
        "americanOdds": -105,
        "expectedGames": 9.2,
        "confidence": 52,
        "tiebreakRisk": 38,
        "earlyBreakRisk": 62,
        "modelPct": 52,
        "evPer100": 1.5,
        "netEvPer100": -0.5,
        "valueGrade": "Near fair",
        "reason": "Expected first-set games 9.2 vs DraftKings Sportsbook 9.5; Under 9.5.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Philip Henning",
          "confidence": 70,
          "modelPct": 62.2,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Robert Strombachs",
          "confidence": 60,
          "modelPct": 38.6,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": null,
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Philip Henning",
        "line": null,
        "americanOdds": -330,
        "modelPct": 62.2,
        "impliedPct": 76.7,
        "edgePct": -14.5,
        "evPer100": -19,
        "netEvPer100": -21,
        "grade": "Negative EV",
        "issue": "Favorite price needs better proof",
        "reason": "Favorite price has limited payout; require a strong weakness edge or use spread/total."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": null,
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
        "selection": "Philip Henning 70% / Robert Strombachs 60%",
        "rows": [
          {
            "name": "Philip Henning",
            "confidence": 70,
            "modelPct": 62.2,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Robert Strombachs",
            "confidence": 60,
            "modelPct": 38.6,
            "label": "Underdog set-win path needs early holds"
          }
        ],
        "confidence": 70,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Under 9.5",
        "expectedGames": 9.2,
        "confidence": 52,
        "tiebreakRisk": 38,
        "earlyBreakRisk": 62,
        "grade": "Near fair",
        "reason": "Expected first-set games 9.2 vs DraftKings Sportsbook 9.5; Under 9.5."
      }
    ],
    "ensembleValueCase": null,
    "marketData": {
      "source": "DraftKings Sportsbook",
      "sourceDetail": "DraftKings Sportsbook BFF",
      "capturedAt": "2026-06-04T03:58:56.125Z",
      "eventUrl": "https://sportsbook.draftkings.com/leagues/tennis/challenger-centurion-2?event=34235766",
      "eventId": "34235766",
      "players": [
        {
          "name": "Philip Henning",
          "odds": -330,
          "americanLabel": "-330",
          "impliedPct": 76.7,
          "decimalOdds": 1.303,
          "modelPct": 62.2,
          "edgePct": -14.5,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 30.3,
          "grossPayoutMultiple": 1.303,
          "centsAtRisk": 100,
          "centsProfitIfWin": 30.3
        },
        {
          "name": "Robert Strombachs",
          "odds": 215,
          "americanLabel": "+215",
          "impliedPct": 31.7,
          "decimalOdds": 3.15,
          "modelPct": 38.6,
          "edgePct": 6.9,
          "priceBand": "Underdog",
          "grossProfitPct": 215,
          "grossPayoutMultiple": 3.15,
          "centsAtRisk": 100,
          "centsProfitIfWin": 215
        }
      ],
      "desk": {
        "name": "Philip Henning",
        "odds": -330,
        "americanLabel": "-330",
        "impliedPct": 76.7,
        "decimalOdds": 1.303,
        "modelPct": 62.2,
        "edgePct": -14.5,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 30.3,
        "grossPayoutMultiple": 1.303,
        "centsAtRisk": 100,
        "centsProfitIfWin": 30.3
      },
      "spread": null,
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": -130
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": -130
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": -105
      },
      "firstServiceGameTotalPoints": [],
      "firstGameProps": [],
      "setWinMarkets": [],
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "9.5 1st-set games: Over -130 / Under -105",
      "firstServiceGameValue": "No first-service-game market captured",
      "firstGamePropsValue": "No first-game prop market captured",
      "setWinValue": "No set-win price captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Philip Henning -330 / Robert Strombachs +215",
      "marketNote": "DraftKings Sportsbook ML, game handicap, match total, first-set total, set-win, and first-service-game markets captured where available. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 62.2% vs DraftKings Sportsbook implied 76.7% (-14.5 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Philip-Henning-Vs-Robert-Strombachs/",
    "players": [
      {
        "name": "Philip Henning",
        "ranking": {
          "name": "Philip Henning",
          "rank": 313,
          "points": 165,
          "age": 25.5,
          "country": "RSA",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "asOf": "2026-05-26"
        },
        "qualityName": "Philip Henning",
        "profile": "Hard | Live rank #313 | RSA | age 25.5 | hold 67%",
        "modelPct": 62.2,
        "weakness": {
          "name": "Philip Henning",
          "serviceHoldPct": 67,
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
          "weaknessScore": 1,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Philip Henning has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      },
      {
        "name": "Robert Strombachs",
        "ranking": {
          "name": "Robert Strombachs",
          "rank": 471,
          "points": 96,
          "age": 26.6,
          "country": "LAT",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "asOf": "2026-05-26"
        },
        "qualityName": "Robert Strombachs",
        "profile": "Hard | Live rank #471 | LAT | age 26.6 | hold 50%",
        "modelPct": 38.6,
        "weakness": {
          "name": "Robert Strombachs",
          "serviceHoldPct": 50,
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
          "weaknessScore": 16,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "low recent hold rate (50%)"
          ],
          "strengths": [],
          "gameFlowRead": "Robert Strombachs can drop points quickly through low recent hold rate (50%)."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-birmingham-wong-vs-romano-2026-06-04",
    "eventId": "0578c40c-1506-4613-b51e-2c56b8823062",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Grass",
    "surfaceSource": "Grass tournament surface",
    "title": "Coleman Wong vs Filippo Romano",
    "start": "2:30 AM",
    "startMinutes": 150,
    "court": "ATP Challenger Birmingham",
    "round": "Round Of 16",
    "stage": "ATP Challenger Birmingham | Round Of 16",
    "pickName": "Coleman Wong",
    "basePickName": "Coleman Wong",
    "modelSource": "Flashscore/SofaScore warehouse Challenger model",
    "modelSplit": false,
    "marketOnly": false,
    "confidence": 65.1,
    "volatility": 46,
    "tags": [
      "ATP Challenger",
      "Grass",
      "Prediction market",
      "Warehouse joined",
      "Flashscore first",
      "Coinflip price"
    ],
    "reason": "Filippo Romano has the recent service-hold edge 100% to 80%, so Coleman Wong needs the rank/form edge to show up on return games. Lean, not a chase.",
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
        "name": "Coleman Wong",
        "serviceHoldPct": 80,
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
        "strengths": [
          "protects serve well (80% hold)"
        ],
        "gameFlowRead": "Coleman Wong has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Filippo Romano",
        "serviceHoldPct": 100,
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
        "strengths": [
          "protects serve well (100% hold)"
        ],
        "gameFlowRead": "Filippo Romano has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Coleman Wong",
        "confidence": 73,
        "modelPct": 65.1,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Filippo Romano",
        "confidence": 57,
        "modelPct": 35.3,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Coleman Wong",
        "americanOdds": -485,
        "modelPct": 65.1,
        "impliedPct": 82.9,
        "edgePct": -17.8,
        "evPer100": -21.5,
        "netEvPer100": -23.5,
        "feePer100": 2,
        "valueIssue": "Favorite tax trap",
        "valueGrade": "Favorite tax trap",
        "betGrade": false
      },
      "spread": null,
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "line": null,
        "overOdds": null,
        "underOdds": null,
        "expectedGames": null,
        "valueGrade": "No direction",
        "reason": "No posted match total captured.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Under 9.5",
        "line": 9.5,
        "americanOdds": 140,
        "expectedGames": 9.2,
        "confidence": 52,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 52,
        "evPer100": 24.8,
        "netEvPer100": 22.8,
        "valueGrade": "Near fair",
        "reason": "Expected first-set games 9.2 vs DraftKings Sportsbook 9.5; Under 9.5.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Coleman Wong",
          "confidence": 73,
          "modelPct": 65.1,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Filippo Romano",
          "confidence": 57,
          "modelPct": 35.3,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": null,
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Coleman Wong",
        "line": null,
        "americanOdds": -485,
        "modelPct": 65.1,
        "impliedPct": 82.9,
        "edgePct": -17.8,
        "evPer100": -21.5,
        "netEvPer100": -23.5,
        "grade": "Favorite tax trap",
        "issue": "Favorite tax trap",
        "reason": "Likely winner can still be a bad ML bet after payout and fees. Check spread, total, and set-win instead."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": null,
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
        "selection": "Coleman Wong 73% / Filippo Romano 57%",
        "rows": [
          {
            "name": "Coleman Wong",
            "confidence": 73,
            "modelPct": 65.1,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Filippo Romano",
            "confidence": 57,
            "modelPct": 35.3,
            "label": "Underdog set-win path needs early holds"
          }
        ],
        "confidence": 73,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Under 9.5",
        "expectedGames": 9.2,
        "confidence": 52,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "grade": "Near fair",
        "reason": "Expected first-set games 9.2 vs DraftKings Sportsbook 9.5; Under 9.5."
      }
    ],
    "ensembleValueCase": null,
    "marketData": {
      "source": "DraftKings Sportsbook",
      "sourceDetail": "DraftKings Sportsbook BFF",
      "capturedAt": "2026-06-04T03:58:38.082Z",
      "eventUrl": "https://sportsbook.draftkings.com/leagues/tennis/challenger-birmingham?event=34236840",
      "eventId": "34236840",
      "players": [
        {
          "name": "Coleman Wong",
          "odds": -485,
          "americanLabel": "-485",
          "impliedPct": 82.9,
          "decimalOdds": 1.206,
          "modelPct": 65.1,
          "edgePct": -17.8,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 20.6,
          "grossPayoutMultiple": 1.206,
          "centsAtRisk": 100,
          "centsProfitIfWin": 20.6
        },
        {
          "name": "Filippo Romano",
          "odds": 326,
          "americanLabel": "+326",
          "impliedPct": 23.5,
          "decimalOdds": 4.26,
          "modelPct": 35.3,
          "edgePct": 11.8,
          "priceBand": "Underdog",
          "grossProfitPct": 326,
          "grossPayoutMultiple": 4.26,
          "centsAtRisk": 100,
          "centsProfitIfWin": 326
        }
      ],
      "desk": {
        "name": "Coleman Wong",
        "odds": -485,
        "americanLabel": "-485",
        "impliedPct": 82.9,
        "decimalOdds": 1.206,
        "modelPct": 65.1,
        "edgePct": -17.8,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 20.6,
        "grossPayoutMultiple": 1.206,
        "centsAtRisk": 100,
        "centsProfitIfWin": 20.6
      },
      "spread": null,
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": -215
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": -215
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": 140
      },
      "firstServiceGameTotalPoints": [],
      "firstGameProps": [],
      "setWinMarkets": [],
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "9.5 1st-set games: Over -215 / Under +140",
      "firstServiceGameValue": "No first-service-game market captured",
      "firstGamePropsValue": "No first-game prop market captured",
      "setWinValue": "No set-win price captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Coleman Wong -485 / Filippo Romano +326",
      "marketNote": "DraftKings Sportsbook ML, game handicap, match total, first-set total, set-win, and first-service-game markets captured where available. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 65.1% vs DraftKings Sportsbook implied 82.9% (-17.8 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Chak-Lam-Coleman-Wong-Vs-Filippo-Romano/",
    "players": [
      {
        "name": "Coleman Wong",
        "ranking": {
          "name": "Coleman Wong",
          "rank": 107,
          "points": 579,
          "age": 21.9,
          "country": "HKG",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "asOf": "2026-05-26"
        },
        "qualityName": "Coleman Wong",
        "profile": "Grass | Live rank #107 | HKG | age 21.9 | hold 80%",
        "modelPct": 65.1,
        "weakness": {
          "name": "Coleman Wong",
          "serviceHoldPct": 80,
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
          "strengths": [
            "protects serve well (80% hold)"
          ],
          "gameFlowRead": "Coleman Wong has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      },
      {
        "name": "Filippo Romano",
        "ranking": {
          "name": "Filippo Romano",
          "rank": 388,
          "points": 122,
          "age": 20.8,
          "country": "ITA",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "asOf": "2026-05-26"
        },
        "qualityName": "Filippo Romano",
        "profile": "Grass | Live rank #388 | ITA | age 20.8 | hold 100%",
        "modelPct": 35.3,
        "weakness": {
          "name": "Filippo Romano",
          "serviceHoldPct": 100,
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
          "strengths": [
            "protects serve well (100% hold)"
          ],
          "gameFlowRead": "Filippo Romano has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-birmingham-gill-vs-majchrzak-2026-06-04",
    "eventId": "337d601a-7ed4-4ec9-871e-dd68a7b9fe93",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Grass",
    "surfaceSource": "Grass tournament surface",
    "title": "Felix Gill vs Kamil Majchrzak",
    "start": "2:30 AM",
    "startMinutes": 150,
    "court": "ATP Challenger Birmingham",
    "round": "Round Of 16",
    "stage": "ATP Challenger Birmingham | Round Of 16",
    "pickName": "Kamil Majchrzak",
    "basePickName": "Kamil Majchrzak",
    "modelSource": "Flashscore/SofaScore warehouse Challenger model",
    "modelSplit": false,
    "marketOnly": false,
    "confidence": 65.3,
    "volatility": 43,
    "tags": [
      "ATP Challenger",
      "Grass",
      "Prediction market",
      "Warehouse joined",
      "Flashscore first",
      "Coinflip price"
    ],
    "reason": "Kamil Majchrzak has the recent service-hold edge 100% to 75%. Lean, not a chase.",
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
        "name": "Kamil Majchrzak",
        "serviceHoldPct": 100,
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
        "strengths": [
          "protects serve well (100% hold)"
        ],
        "gameFlowRead": "Kamil Majchrzak has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Felix Gill",
        "serviceHoldPct": 75,
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
        "gameFlowRead": "Felix Gill has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Felix Gill",
        "confidence": 57,
        "modelPct": 35.5,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Kamil Majchrzak",
        "confidence": 73,
        "modelPct": 65.3,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Kamil Majchrzak",
        "americanOdds": -339,
        "modelPct": 65.3,
        "impliedPct": 77.2,
        "edgePct": -11.9,
        "evPer100": -15.4,
        "netEvPer100": -17.4,
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
        "expectedGames": null,
        "valueGrade": "No direction",
        "reason": "No posted match total captured.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Under 9.5",
        "line": 9.5,
        "americanOdds": -105,
        "expectedGames": 9.2,
        "confidence": 52,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 52,
        "evPer100": 1.5,
        "netEvPer100": -0.5,
        "valueGrade": "Near fair",
        "reason": "Expected first-set games 9.2 vs DraftKings Sportsbook 9.5; Under 9.5.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Felix Gill",
          "confidence": 57,
          "modelPct": 35.5,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Kamil Majchrzak",
          "confidence": 73,
          "modelPct": 65.3,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": null,
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Kamil Majchrzak",
        "line": null,
        "americanOdds": -339,
        "modelPct": 65.3,
        "impliedPct": 77.2,
        "edgePct": -11.9,
        "evPer100": -15.4,
        "netEvPer100": -17.4,
        "grade": "Negative EV",
        "issue": "Favorite price needs better proof",
        "reason": "Favorite price has limited payout; require a strong weakness edge or use spread/total."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": null,
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
        "selection": "Felix Gill 57% / Kamil Majchrzak 73%",
        "rows": [
          {
            "name": "Felix Gill",
            "confidence": 57,
            "modelPct": 35.5,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Kamil Majchrzak",
            "confidence": 73,
            "modelPct": 65.3,
            "label": "Market favorite to win a set"
          }
        ],
        "confidence": 73,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Under 9.5",
        "expectedGames": 9.2,
        "confidence": 52,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "grade": "Near fair",
        "reason": "Expected first-set games 9.2 vs DraftKings Sportsbook 9.5; Under 9.5."
      }
    ],
    "ensembleValueCase": null,
    "marketData": {
      "source": "DraftKings Sportsbook",
      "sourceDetail": "DraftKings Sportsbook BFF",
      "capturedAt": "2026-06-04T03:58:39.673Z",
      "eventUrl": "https://sportsbook.draftkings.com/leagues/tennis/challenger-birmingham?event=34240050",
      "eventId": "34240050",
      "players": [
        {
          "name": "Felix Gill",
          "odds": 242,
          "americanLabel": "+242",
          "impliedPct": 29.2,
          "decimalOdds": 3.42,
          "modelPct": 35.5,
          "edgePct": 6.3,
          "priceBand": "Underdog",
          "grossProfitPct": 242,
          "grossPayoutMultiple": 3.42,
          "centsAtRisk": 100,
          "centsProfitIfWin": 242
        },
        {
          "name": "Kamil Majchrzak",
          "odds": -339,
          "americanLabel": "-339",
          "impliedPct": 77.2,
          "decimalOdds": 1.295,
          "modelPct": 65.3,
          "edgePct": -11.9,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 29.5,
          "grossPayoutMultiple": 1.295,
          "centsAtRisk": 100,
          "centsProfitIfWin": 29.5
        }
      ],
      "desk": {
        "name": "Kamil Majchrzak",
        "odds": -339,
        "americanLabel": "-339",
        "impliedPct": 77.2,
        "decimalOdds": 1.295,
        "modelPct": 65.3,
        "edgePct": -11.9,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 29.5,
        "grossPayoutMultiple": 1.295,
        "centsAtRisk": 100,
        "centsProfitIfWin": 29.5
      },
      "spread": null,
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": -135
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": -135
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": -105
      },
      "firstServiceGameTotalPoints": [],
      "firstGameProps": [],
      "setWinMarkets": [],
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "9.5 1st-set games: Over -135 / Under -105",
      "firstServiceGameValue": "No first-service-game market captured",
      "firstGamePropsValue": "No first-game prop market captured",
      "setWinValue": "No set-win price captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Felix Gill +242 / Kamil Majchrzak -339",
      "marketNote": "DraftKings Sportsbook ML, game handicap, match total, first-set total, set-win, and first-service-game markets captured where available. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 65.3% vs DraftKings Sportsbook implied 77.2% (-11.9 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Felix-Gill-Vs-Kamil-Majchrzak/",
    "players": [
      {
        "name": "Felix Gill",
        "ranking": {
          "name": "Felix Gill",
          "rank": 222,
          "points": 255,
          "age": 23.9,
          "country": "GBR",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "asOf": "2026-05-26"
        },
        "qualityName": "Felix Gill",
        "profile": "Grass | Live rank #222 | GBR | age 23.9 | hold 75%",
        "modelPct": 35.5,
        "weakness": {
          "name": "Felix Gill",
          "serviceHoldPct": 75,
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
          "gameFlowRead": "Felix Gill has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 7,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      },
      {
        "name": "Kamil Majchrzak",
        "ranking": {
          "name": "Kamil Majchrzak",
          "rank": 78,
          "points": 747,
          "age": 30,
          "country": "Poland",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "asOf": "2026-06-02"
        },
        "qualityName": "Kamil Majchrzak",
        "profile": "Grass | Live rank #78 | Poland | age 30 | hold 100%",
        "modelPct": 65.3,
        "weakness": {
          "name": "Kamil Majchrzak",
          "serviceHoldPct": 100,
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
          "strengths": [
            "protects serve well (100% hold)"
          ],
          "gameFlowRead": "Kamil Majchrzak has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 7,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-birmingham-shimabukuro-vs-ymer-2026-06-04",
    "eventId": "e33a3939-dd06-497d-8711-fc423cf4963c",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Grass",
    "surfaceSource": "Grass tournament surface",
    "title": "Sho Shimabukuro vs Elias Ymer",
    "start": "2:30 AM",
    "startMinutes": 150,
    "court": "ATP Challenger Birmingham",
    "round": "Round Of 16",
    "stage": "ATP Challenger Birmingham | Round Of 16",
    "pickName": "Sho Shimabukuro",
    "basePickName": "Sho Shimabukuro",
    "modelSource": "Flashscore/SofaScore warehouse Challenger model",
    "modelSplit": false,
    "marketOnly": false,
    "confidence": 56.1,
    "volatility": 42,
    "tags": [
      "ATP Challenger",
      "Grass",
      "Prediction market",
      "Warehouse joined",
      "Flashscore first",
      "Coinflip price"
    ],
    "reason": "Sho Shimabukuro has the recent service-hold edge 100% to 50%. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness edge",
      "target": "Elias Ymer",
      "scoreGap": 16,
      "attackingSide": "Sho Shimabukuro",
      "vulnerableSide": "Elias Ymer",
      "gameFlow": "Sho Shimabukuro has a real path if Elias Ymer's first two service games show the same weakness: low recent hold rate (50%).",
      "liveTrigger": "Look for Elias Ymer facing break points or second-serve pressure before 3-3.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Sho Shimabukuro",
        "serviceHoldPct": 100,
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
        "strengths": [
          "protects serve well (100% hold)"
        ],
        "gameFlowRead": "Sho Shimabukuro has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Elias Ymer",
        "serviceHoldPct": 50,
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
        "weaknessScore": 16,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "low recent hold rate (50%)"
        ],
        "strengths": [],
        "gameFlowRead": "Elias Ymer can drop points quickly through low recent hold rate (50%)."
      }
    },
    "setWinProjections": [
      {
        "name": "Sho Shimabukuro",
        "confidence": 64,
        "modelPct": 56.1,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Elias Ymer",
        "confidence": 66,
        "modelPct": 43.9,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Sho Shimabukuro",
        "americanOdds": -136,
        "modelPct": 56.1,
        "impliedPct": 57.6,
        "edgePct": -1.5,
        "evPer100": -2.6,
        "netEvPer100": -4.6,
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
        "expectedGames": null,
        "valueGrade": "No direction",
        "reason": "No posted match total captured.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Under 9.5",
        "line": 9.5,
        "americanOdds": 120,
        "expectedGames": 8.8,
        "confidence": 56,
        "tiebreakRisk": 38,
        "earlyBreakRisk": 62,
        "modelPct": 56,
        "evPer100": 23.2,
        "netEvPer100": 21.2,
        "valueGrade": "Thin value",
        "reason": "Expected first-set games 8.8 vs DraftKings Sportsbook 9.5; Under 9.5.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Sho Shimabukuro",
          "confidence": 64,
          "modelPct": 56.1,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Elias Ymer",
          "confidence": 66,
          "modelPct": 43.9,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": null,
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Sho Shimabukuro",
        "line": null,
        "americanOdds": -136,
        "modelPct": 56.1,
        "impliedPct": 57.6,
        "edgePct": -1.5,
        "evPer100": -2.6,
        "netEvPer100": -4.6,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "ML is close to fair; derivative or live entry needs to carry the edge."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": null,
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
        "selection": "Sho Shimabukuro 64% / Elias Ymer 66%",
        "rows": [
          {
            "name": "Sho Shimabukuro",
            "confidence": 64,
            "modelPct": 56.1,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Elias Ymer",
            "confidence": 66,
            "modelPct": 43.9,
            "label": "Underdog set-win path needs early holds"
          }
        ],
        "confidence": 66,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Under 9.5",
        "expectedGames": 8.8,
        "confidence": 56,
        "tiebreakRisk": 38,
        "earlyBreakRisk": 62,
        "grade": "Thin value",
        "reason": "Expected first-set games 8.8 vs DraftKings Sportsbook 9.5; Under 9.5."
      }
    ],
    "ensembleValueCase": null,
    "marketData": {
      "source": "DraftKings Sportsbook",
      "sourceDetail": "DraftKings Sportsbook BFF",
      "capturedAt": "2026-06-04T03:58:41.161Z",
      "eventUrl": "https://sportsbook.draftkings.com/leagues/tennis/challenger-birmingham?event=34240558",
      "eventId": "34240558",
      "players": [
        {
          "name": "Sho Shimabukuro",
          "odds": -136,
          "americanLabel": "-136",
          "impliedPct": 57.6,
          "decimalOdds": 1.735,
          "modelPct": 56.1,
          "edgePct": -1.5,
          "priceBand": "Coinflip",
          "grossProfitPct": 73.5,
          "grossPayoutMultiple": 1.735,
          "centsAtRisk": 100,
          "centsProfitIfWin": 73.5
        },
        {
          "name": "Elias Ymer",
          "odds": 104,
          "americanLabel": "+104",
          "impliedPct": 49,
          "decimalOdds": 2.04,
          "modelPct": 43.9,
          "edgePct": -5.1,
          "priceBand": "Coinflip",
          "grossProfitPct": 104,
          "grossPayoutMultiple": 2.04,
          "centsAtRisk": 100,
          "centsProfitIfWin": 104
        }
      ],
      "desk": {
        "name": "Sho Shimabukuro",
        "odds": -136,
        "americanLabel": "-136",
        "impliedPct": 57.6,
        "decimalOdds": 1.735,
        "modelPct": 56.1,
        "edgePct": -1.5,
        "priceBand": "Coinflip",
        "grossProfitPct": 73.5,
        "grossPayoutMultiple": 1.735,
        "centsAtRisk": 100,
        "centsProfitIfWin": 73.5
      },
      "spread": null,
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": -175
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": -175
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": 120
      },
      "firstServiceGameTotalPoints": [],
      "firstGameProps": [],
      "setWinMarkets": [],
      "priceAction": "ML is close to fair; derivative or live entry needs to carry the edge.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "9.5 1st-set games: Over -175 / Under +120",
      "firstServiceGameValue": "No first-service-game market captured",
      "firstGamePropsValue": "No first-game prop market captured",
      "setWinValue": "No set-win price captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Sho Shimabukuro -136 / Elias Ymer +104",
      "marketNote": "DraftKings Sportsbook ML, game handicap, match total, first-set total, set-win, and first-service-game markets captured where available. ML is close to fair; derivative or live entry needs to carry the edge.",
      "noVigNote": "Model 56.1% vs DraftKings Sportsbook implied 57.6% (-1.5 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Sho-Shimabukuro-Vs-Elias-Ymer/",
    "players": [
      {
        "name": "Sho Shimabukuro",
        "ranking": {
          "name": "Sho Shimabukuro",
          "rank": 103,
          "points": 596,
          "age": 28,
          "country": "Japan",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "asOf": "2026-06-02"
        },
        "qualityName": "Sho Shimabukuro",
        "profile": "Grass | Live rank #103 | Japan | age 28 | hold 100%",
        "modelPct": 56.1,
        "weakness": {
          "name": "Sho Shimabukuro",
          "serviceHoldPct": 100,
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
          "strengths": [
            "protects serve well (100% hold)"
          ],
          "gameFlowRead": "Sho Shimabukuro has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 7,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      },
      {
        "name": "Elias Ymer",
        "ranking": {
          "name": "Elias Ymer",
          "rank": 182,
          "points": 315,
          "age": 30.1,
          "country": "SWE",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "asOf": "2026-05-26"
        },
        "qualityName": "Elias Ymer",
        "profile": "Grass | Live rank #182 | SWE | age 30.1 | hold 50%",
        "modelPct": 43.9,
        "weakness": {
          "name": "Elias Ymer",
          "serviceHoldPct": 50,
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
          "weaknessScore": 16,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "low recent hold rate (50%)"
          ],
          "strengths": [],
          "gameFlowRead": "Elias Ymer can drop points quickly through low recent hold rate (50%)."
        },
        "warehouseDepth": {
          "expectedRows": 7,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-bad-rappenau-dedura-palomero-vs-reis-da-silva-2026-06-04",
    "eventId": "6015f8d2-eb6a-4752-8108-1a20a01830fb",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Clay",
    "surfaceSource": "ATP Challenger Bad Rappenau surface",
    "title": "Diego Dedura-Palomero vs Joao Lucas Reis Da Silva",
    "start": "3:00 AM",
    "startMinutes": 180,
    "court": "ATP Challenger Bad Rappenau",
    "round": "Round Of 16",
    "stage": "ATP Challenger Bad Rappenau | Round Of 16",
    "pickName": "Diego Dedura-Palomero",
    "basePickName": "Diego Dedura-Palomero",
    "modelSource": "Flashscore/SofaScore warehouse Challenger model",
    "modelSplit": false,
    "marketOnly": false,
    "confidence": 59.2,
    "volatility": 46,
    "tags": [
      "ATP Challenger",
      "Clay",
      "Prediction market",
      "Warehouse joined",
      "Flashscore first",
      "Coinflip price"
    ],
    "reason": "Diego Dedura-Palomero has the recent service-hold edge 80% to 60%. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": 7,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Diego Dedura-Palomero",
        "serviceHoldPct": 80,
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
        "strengths": [
          "protects serve well (80% hold)"
        ],
        "gameFlowRead": "Diego Dedura-Palomero has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Joao Lucas Reis Da Silva",
        "serviceHoldPct": 60,
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
        "weaknessScore": 7,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "low recent hold rate (60%)"
        ],
        "strengths": [],
        "gameFlowRead": "Joao Lucas Reis Da Silva can drop points quickly through low recent hold rate (60%)."
      }
    },
    "setWinProjections": [
      {
        "name": "Diego Dedura-Palomero",
        "confidence": 67,
        "modelPct": 59.2,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Joao Lucas Reis Da Silva",
        "confidence": 63,
        "modelPct": 41.6,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Diego Dedura-Palomero",
        "americanOdds": -200,
        "modelPct": 59.2,
        "impliedPct": 66.7,
        "edgePct": -7.5,
        "evPer100": -11.2,
        "netEvPer100": -13.2,
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
        "expectedGames": null,
        "valueGrade": "No direction",
        "reason": "No posted match total captured.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Under 9.5",
        "line": 9.5,
        "americanOdds": -130,
        "expectedGames": 9.2,
        "confidence": 52,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 52,
        "evPer100": -8,
        "netEvPer100": -10,
        "valueGrade": "Near fair",
        "reason": "Expected first-set games 9.2 vs DraftKings Sportsbook 9.5; Under 9.5.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Diego Dedura-Palomero",
          "confidence": 67,
          "modelPct": 59.2,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Joao Lucas Reis Da Silva",
          "confidence": 63,
          "modelPct": 41.6,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": null,
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Diego Dedura-Palomero",
        "line": null,
        "americanOdds": -200,
        "modelPct": 59.2,
        "impliedPct": 66.7,
        "edgePct": -7.5,
        "evPer100": -11.2,
        "netEvPer100": -13.2,
        "grade": "Negative EV",
        "issue": "Favorite price needs better proof",
        "reason": "DraftKings Sportsbook price is richer than the model; pass ML unless live state improves."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": null,
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
        "selection": "Diego Dedura-Palomero 67% / Joao Lucas Reis Da Silva 63%",
        "rows": [
          {
            "name": "Diego Dedura-Palomero",
            "confidence": 67,
            "modelPct": 59.2,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Joao Lucas Reis Da Silva",
            "confidence": 63,
            "modelPct": 41.6,
            "label": "Underdog set-win path needs early holds"
          }
        ],
        "confidence": 67,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Under 9.5",
        "expectedGames": 9.2,
        "confidence": 52,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "grade": "Near fair",
        "reason": "Expected first-set games 9.2 vs DraftKings Sportsbook 9.5; Under 9.5."
      }
    ],
    "ensembleValueCase": null,
    "marketData": {
      "source": "DraftKings Sportsbook",
      "sourceDetail": "DraftKings Sportsbook BFF",
      "capturedAt": "2026-06-04T03:58:34.228Z",
      "eventUrl": "https://sportsbook.draftkings.com/leagues/tennis/challenger-heilbronn?event=34236849",
      "eventId": "34236849",
      "players": [
        {
          "name": "Diego Dedura-Palomero",
          "odds": -200,
          "americanLabel": "-200",
          "impliedPct": 66.7,
          "decimalOdds": 1.5,
          "modelPct": 59.2,
          "edgePct": -7.5,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 50,
          "grossPayoutMultiple": 1.5,
          "centsAtRisk": 100,
          "centsProfitIfWin": 50
        },
        {
          "name": "Joao Lucas Reis Da Silva",
          "odds": 151,
          "americanLabel": "+151",
          "impliedPct": 39.8,
          "decimalOdds": 2.51,
          "modelPct": 41.6,
          "edgePct": 1.8,
          "priceBand": "Underdog",
          "grossProfitPct": 151,
          "grossPayoutMultiple": 2.51,
          "centsAtRisk": 100,
          "centsProfitIfWin": 151
        }
      ],
      "desk": {
        "name": "Diego Dedura-Palomero",
        "odds": -200,
        "americanLabel": "-200",
        "impliedPct": 66.7,
        "decimalOdds": 1.5,
        "modelPct": 59.2,
        "edgePct": -7.5,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 50,
        "grossPayoutMultiple": 1.5,
        "centsAtRisk": 100,
        "centsProfitIfWin": 50
      },
      "spread": null,
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": -110
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": -110
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": -130
      },
      "firstServiceGameTotalPoints": [],
      "firstGameProps": [],
      "setWinMarkets": [],
      "priceAction": "DraftKings Sportsbook price is richer than the model; pass ML unless live state improves.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "9.5 1st-set games: Over -110 / Under -130",
      "firstServiceGameValue": "No first-service-game market captured",
      "firstGamePropsValue": "No first-game prop market captured",
      "setWinValue": "No set-win price captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Diego Dedura-Palomero -200 / Joao Lucas Reis Da Silva +151",
      "marketNote": "DraftKings Sportsbook ML, game handicap, match total, first-set total, set-win, and first-service-game markets captured where available. DraftKings Sportsbook price is richer than the model; pass ML unless live state improves.",
      "noVigNote": "Model 59.2% vs DraftKings Sportsbook implied 66.7% (-7.5 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Diego-Dedura-Vs-Joao-Lucas-Reis-Da-Silva/",
    "players": [
      {
        "name": "Diego Dedura-Palomero",
        "ranking": null,
        "qualityName": "Diego Dedura-Palomero",
        "profile": "Clay | Rank not joined | hold 80%",
        "modelPct": 59.2,
        "weakness": {
          "name": "Diego Dedura-Palomero",
          "serviceHoldPct": 80,
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
          "strengths": [
            "protects serve well (80% hold)"
          ],
          "gameFlowRead": "Diego Dedura-Palomero has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      },
      {
        "name": "Joao Lucas Reis Da Silva",
        "ranking": {
          "name": "Joao Lucas Reis Da Silva",
          "rank": 203,
          "points": 274,
          "age": 26.1,
          "country": "BRA",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "asOf": "2026-05-26"
        },
        "qualityName": "Joao Lucas Reis Da Silva",
        "profile": "Clay | Live rank #203 | BRA | age 26.1 | hold 60%",
        "modelPct": 41.6,
        "weakness": {
          "name": "Joao Lucas Reis Da Silva",
          "serviceHoldPct": 60,
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
          "weaknessScore": 7,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "low recent hold rate (60%)"
          ],
          "strengths": [],
          "gameFlowRead": "Joao Lucas Reis Da Silva can drop points quickly through low recent hold rate (60%)."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      }
    ]
  },
  {
    "id": "rh-wta-125k-birmingham-krueger-vs-tjen-2026-06-04",
    "eventId": "4c671a23-ec94-41c1-8ed0-95a149a2714a",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Grass",
    "surfaceSource": "Grass tournament surface",
    "title": "Janice Tjen vs Ashlyn Krueger",
    "start": "3:00 AM",
    "startMinutes": 180,
    "court": "WTA 125K Birmingham",
    "round": "Round Of 16",
    "stage": "WTA 125K Birmingham | Round Of 16",
    "pickName": "Janice Tjen",
    "basePickName": "Janice Tjen",
    "modelSource": "Flashscore/SofaScore warehouse Challenger model",
    "modelSplit": false,
    "marketOnly": false,
    "confidence": 52.7,
    "volatility": 43,
    "tags": [
      "ATP Challenger",
      "Grass",
      "Prediction market",
      "Warehouse joined",
      "Flashscore first",
      "Coinflip price"
    ],
    "reason": "Janice Tjen has the cleaner composite of rank, recent opponent quality, and joined service data; clay record is context only on Grass. Lean, not a chase.",
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
        "name": "Janice Tjen",
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
        "gameFlowRead": "Janice Tjen has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Ashlyn Krueger",
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
        "gameFlowRead": "Ashlyn Krueger has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Janice Tjen",
        "confidence": 61,
        "modelPct": 52.7,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Ashlyn Krueger",
        "confidence": 69,
        "modelPct": 47.7,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Janice Tjen",
        "americanOdds": 106,
        "modelPct": 52.7,
        "impliedPct": 48.5,
        "edgePct": 4.2,
        "evPer100": 8.6,
        "netEvPer100": 6.6,
        "feePer100": 2,
        "valueIssue": "Raw ML edge only",
        "valueGrade": "Raw ML edge only",
        "betGrade": false
      },
      "spread": null,
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "line": null,
        "overOdds": null,
        "underOdds": null,
        "expectedGames": null,
        "valueGrade": "No direction",
        "reason": "No posted match total captured.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Pass / near line",
        "line": 9.5,
        "americanOdds": null,
        "expectedGames": 9.5,
        "confidence": 50,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 50,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Near fair",
        "reason": "Expected first-set games 9.5 vs DraftKings Sportsbook 9.5; Pass / near line.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Janice Tjen",
          "confidence": 61,
          "modelPct": 52.7,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Ashlyn Krueger",
          "confidence": 69,
          "modelPct": 47.7,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": null,
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Janice Tjen",
        "line": null,
        "americanOdds": 106,
        "modelPct": 52.7,
        "impliedPct": 48.5,
        "edgePct": 4.2,
        "evPer100": 8.6,
        "netEvPer100": 6.6,
        "grade": "Raw ML edge only",
        "issue": "Raw ML edge only",
        "reason": "ML is close to fair; derivative or live entry needs to carry the edge."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": null,
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
        "selection": "Janice Tjen 61% / Ashlyn Krueger 69%",
        "rows": [
          {
            "name": "Janice Tjen",
            "confidence": 61,
            "modelPct": 52.7,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Ashlyn Krueger",
            "confidence": 69,
            "modelPct": 47.7,
            "label": "Underdog set-win path needs early holds"
          }
        ],
        "confidence": 69,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Pass / near line",
        "expectedGames": 9.5,
        "confidence": 50,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "grade": "Near fair",
        "reason": "Expected first-set games 9.5 vs DraftKings Sportsbook 9.5; Pass / near line."
      }
    ],
    "ensembleValueCase": null,
    "marketData": {
      "source": "DraftKings Sportsbook",
      "sourceDetail": "DraftKings Sportsbook BFF",
      "capturedAt": "2026-06-04T03:58:22.322Z",
      "eventUrl": "https://sportsbook.draftkings.com/leagues/tennis/wta-birmingham?event=34240848",
      "eventId": "34240848",
      "players": [
        {
          "name": "Janice Tjen",
          "odds": 106,
          "americanLabel": "+106",
          "impliedPct": 48.5,
          "decimalOdds": 2.06,
          "modelPct": 52.7,
          "edgePct": 4.2,
          "priceBand": "Coinflip",
          "grossProfitPct": 106,
          "grossPayoutMultiple": 2.06,
          "centsAtRisk": 100,
          "centsProfitIfWin": 106
        },
        {
          "name": "Ashlyn Krueger",
          "odds": -138,
          "americanLabel": "-138",
          "impliedPct": 58,
          "decimalOdds": 1.725,
          "modelPct": 47.7,
          "edgePct": -10.3,
          "priceBand": "Coinflip",
          "grossProfitPct": 72.5,
          "grossPayoutMultiple": 1.725,
          "centsAtRisk": 100,
          "centsProfitIfWin": 72.5
        }
      ],
      "desk": {
        "name": "Janice Tjen",
        "odds": 106,
        "americanLabel": "+106",
        "impliedPct": 48.5,
        "decimalOdds": 2.06,
        "modelPct": 52.7,
        "edgePct": 4.2,
        "priceBand": "Coinflip",
        "grossProfitPct": 106,
        "grossPayoutMultiple": 2.06,
        "centsAtRisk": 100,
        "centsProfitIfWin": 106
      },
      "spread": null,
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": -115
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": -115
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": -125
      },
      "firstServiceGameTotalPoints": [],
      "firstGameProps": [],
      "setWinMarkets": [],
      "priceAction": "ML is close to fair; derivative or live entry needs to carry the edge.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "9.5 1st-set games: Over -115 / Under -125",
      "firstServiceGameValue": "No first-service-game market captured",
      "firstGamePropsValue": "No first-game prop market captured",
      "setWinValue": "No set-win price captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Janice Tjen +106 / Ashlyn Krueger -138",
      "marketNote": "DraftKings Sportsbook ML, game handicap, match total, first-set total, set-win, and first-service-game markets captured where available. ML is close to fair; derivative or live entry needs to carry the edge.",
      "noVigNote": "Model 52.7% vs DraftKings Sportsbook implied 48.5% (+4.2 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Janice-Tjen-Vs-Ashlyn-Krueger/",
    "players": [
      {
        "name": "Janice Tjen",
        "ranking": {
          "name": "Janice Tjen",
          "rank": 40,
          "points": 1292,
          "age": 24,
          "country": "Indonesia",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "asOf": "2026-06-02"
        },
        "qualityName": "Janice Tjen",
        "profile": "Grass | Live rank #40 | Indonesia | age 24",
        "modelPct": 52.7,
        "weakness": {
          "name": "Janice Tjen",
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
          "gameFlowRead": "Janice Tjen has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 3,
          "recentRows": 3,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      },
      {
        "name": "Ashlyn Krueger",
        "ranking": {
          "name": "Ashlyn Krueger",
          "rank": 120,
          "points": 663,
          "age": 22,
          "country": "USA",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "asOf": "2026-06-02"
        },
        "qualityName": "Ashlyn Krueger",
        "profile": "Grass | Live rank #120 | USA | age 22",
        "modelPct": 47.7,
        "weakness": {
          "name": "Ashlyn Krueger",
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
          "gameFlowRead": "Ashlyn Krueger has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 4,
          "recentRows": 4,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-bad-rappenau-choinski-vs-mikrut-2026-06-04",
    "eventId": "0af15356-3f82-4a06-a655-9215700b86d5",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Clay",
    "surfaceSource": "ATP Challenger Bad Rappenau surface",
    "title": "Luka Mikrut vs Jan Choinski",
    "start": "3:00 AM",
    "startMinutes": 180,
    "court": "ATP Challenger Bad Rappenau",
    "round": "Round Of 16",
    "stage": "ATP Challenger Bad Rappenau | Round Of 16",
    "pickName": "Jan Choinski",
    "basePickName": "Jan Choinski",
    "modelSource": "Flashscore/SofaScore warehouse Challenger model",
    "modelSplit": false,
    "marketOnly": false,
    "confidence": 52.6,
    "volatility": 54,
    "tags": [
      "ATP Challenger",
      "Clay",
      "Prediction market",
      "Warehouse joined",
      "Flashscore first",
      "Coinflip price"
    ],
    "reason": "Luka Mikrut has the recent service-hold edge 75% to 25%, so Jan Choinski needs the rank/form edge to show up on return games. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness warning",
      "target": "Jan Choinski",
      "scoreGap": -39,
      "attackingSide": null,
      "vulnerableSide": "Jan Choinski",
      "gameFlow": "Jan Choinski is the model side, but the fragile profile is on our pick: low recent hold rate (25%). Avoid laying a bad price until early holds are confirmed.",
      "liveTrigger": "Do not upgrade Jan Choinski unless they hold cleanly in the first service game and keep double faults down.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "Avoid low unders if Jan Choinski faces early break points or second-serve pressure.",
      "pick": {
        "name": "Jan Choinski",
        "serviceHoldPct": 25,
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
        "weaknessScore": 39,
        "firstGameComfort": "Fragile opening-service profile",
        "liabilities": [
          "low recent hold rate (25%)"
        ],
        "strengths": [],
        "gameFlowRead": "Jan Choinski can drop points quickly through low recent hold rate (25%)."
      },
      "opponent": {
        "name": "Luka Mikrut",
        "serviceHoldPct": 75,
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
        "gameFlowRead": "Luka Mikrut has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Luka Mikrut",
        "confidence": 69,
        "modelPct": 47.9,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Jan Choinski",
        "confidence": 61,
        "modelPct": 52.6,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Jan Choinski",
        "americanOdds": -197,
        "modelPct": 52.6,
        "impliedPct": 66.3,
        "edgePct": -13.7,
        "evPer100": -20.7,
        "netEvPer100": -22.7,
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
        "expectedGames": null,
        "valueGrade": "No direction",
        "reason": "No posted match total captured.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Pass / near line",
        "line": 9.5,
        "americanOdds": null,
        "expectedGames": 9.5,
        "confidence": 50,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 50,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Near fair",
        "reason": "Expected first-set games 9.5 vs DraftKings Sportsbook 9.5; Pass / near line.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Luka Mikrut",
          "confidence": 69,
          "modelPct": 47.9,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Jan Choinski",
          "confidence": 61,
          "modelPct": 52.6,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": null,
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Jan Choinski",
        "line": null,
        "americanOdds": -197,
        "modelPct": 52.6,
        "impliedPct": 66.3,
        "edgePct": -13.7,
        "evPer100": -20.7,
        "netEvPer100": -22.7,
        "grade": "Negative EV",
        "issue": "Favorite price needs better proof",
        "reason": "DraftKings Sportsbook price is richer than the model; pass ML unless live state improves."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": null,
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
        "selection": "Luka Mikrut 69% / Jan Choinski 61%",
        "rows": [
          {
            "name": "Luka Mikrut",
            "confidence": 69,
            "modelPct": 47.9,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Jan Choinski",
            "confidence": 61,
            "modelPct": 52.6,
            "label": "Market favorite to win a set"
          }
        ],
        "confidence": 69,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Pass / near line",
        "expectedGames": 9.5,
        "confidence": 50,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "grade": "Near fair",
        "reason": "Expected first-set games 9.5 vs DraftKings Sportsbook 9.5; Pass / near line."
      }
    ],
    "ensembleValueCase": null,
    "marketData": {
      "source": "DraftKings Sportsbook",
      "sourceDetail": "DraftKings Sportsbook BFF",
      "capturedAt": "2026-06-04T03:58:32.785Z",
      "eventUrl": "https://sportsbook.draftkings.com/leagues/tennis/challenger-heilbronn?event=34235762",
      "eventId": "34235762",
      "players": [
        {
          "name": "Luka Mikrut",
          "odds": 149,
          "americanLabel": "+149",
          "impliedPct": 40.2,
          "decimalOdds": 2.49,
          "modelPct": 47.9,
          "edgePct": 7.7,
          "priceBand": "Underdog",
          "grossProfitPct": 149,
          "grossPayoutMultiple": 2.49,
          "centsAtRisk": 100,
          "centsProfitIfWin": 149
        },
        {
          "name": "Jan Choinski",
          "odds": -197,
          "americanLabel": "-197",
          "impliedPct": 66.3,
          "decimalOdds": 1.508,
          "modelPct": 52.6,
          "edgePct": -13.7,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 50.8,
          "grossPayoutMultiple": 1.508,
          "centsAtRisk": 100,
          "centsProfitIfWin": 50.8
        }
      ],
      "desk": {
        "name": "Jan Choinski",
        "odds": -197,
        "americanLabel": "-197",
        "impliedPct": 66.3,
        "decimalOdds": 1.508,
        "modelPct": 52.6,
        "edgePct": -13.7,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 50.8,
        "grossPayoutMultiple": 1.508,
        "centsAtRisk": 100,
        "centsProfitIfWin": 50.8
      },
      "spread": null,
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": -130
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": -130
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": -115
      },
      "firstServiceGameTotalPoints": [],
      "firstGameProps": [],
      "setWinMarkets": [],
      "priceAction": "DraftKings Sportsbook price is richer than the model; pass ML unless live state improves.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "9.5 1st-set games: Over -130 / Under -115",
      "firstServiceGameValue": "No first-service-game market captured",
      "firstGamePropsValue": "No first-game prop market captured",
      "setWinValue": "No set-win price captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Luka Mikrut +149 / Jan Choinski -197",
      "marketNote": "DraftKings Sportsbook ML, game handicap, match total, first-set total, set-win, and first-service-game markets captured where available. DraftKings Sportsbook price is richer than the model; pass ML unless live state improves.",
      "noVigNote": "Model 52.6% vs DraftKings Sportsbook implied 66.3% (-13.7 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Luka-Mikrut-Vs-Jan-Choinski/",
    "players": [
      {
        "name": "Luka Mikrut",
        "ranking": {
          "name": "Luka Mikrut",
          "rank": 192,
          "points": 298,
          "age": 22.1,
          "country": "CRO",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "asOf": "2026-05-26"
        },
        "qualityName": "Luka Mikrut",
        "profile": "Clay | Live rank #192 | CRO | age 22.1 | hold 75%",
        "modelPct": 47.9,
        "weakness": {
          "name": "Luka Mikrut",
          "serviceHoldPct": 75,
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
          "gameFlowRead": "Luka Mikrut has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      },
      {
        "name": "Jan Choinski",
        "ranking": {
          "name": "Jan Choinski",
          "rank": 101,
          "points": 599,
          "age": 29,
          "country": "Great Britain",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "asOf": "2026-06-02"
        },
        "qualityName": "Jan Choinski",
        "profile": "Clay | Live rank #101 | Great Britain | age 29 | hold 25%",
        "modelPct": 52.6,
        "weakness": {
          "name": "Jan Choinski",
          "serviceHoldPct": 25,
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
          "weaknessScore": 39,
          "firstGameComfort": "Fragile opening-service profile",
          "liabilities": [
            "low recent hold rate (25%)"
          ],
          "strengths": [],
          "gameFlowRead": "Jan Choinski can drop points quickly through low recent hold rate (25%)."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-prostejov-molcan-vs-karol-2026-06-04",
    "eventId": "08c8dc8a-0328-4c43-9eec-d3f9fa529cb7",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Clay",
    "surfaceSource": "ATP Challenger Prostejov surface",
    "title": "Milos Karol vs Alex Molcan",
    "start": "3:10 AM",
    "startMinutes": 190,
    "court": "ATP Challenger Prostejov",
    "round": "Round Of 16",
    "stage": "ATP Challenger Prostejov | Round Of 16",
    "pickName": "Alex Molcan",
    "basePickName": "Alex Molcan",
    "modelSource": "Flashscore/SofaScore warehouse Challenger model",
    "modelSplit": false,
    "marketOnly": false,
    "confidence": 70,
    "volatility": 45,
    "tags": [
      "ATP Challenger",
      "Clay",
      "Prediction market",
      "Warehouse joined",
      "Flashscore first",
      "Market favorite"
    ],
    "reason": "Recent service hold is close: Alex Molcan 67%, Milos Karol 67%. Lean, not a chase.",
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
        "name": "Alex Molcan",
        "serviceHoldPct": 67,
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
        "weaknessScore": 1,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Alex Molcan has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Milos Karol",
        "serviceHoldPct": 67,
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
        "weaknessScore": 1,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Milos Karol has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Milos Karol",
        "confidence": 52,
        "modelPct": 30.4,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Alex Molcan",
        "confidence": 78,
        "modelPct": 70,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Alex Molcan",
        "americanOdds": -1080,
        "modelPct": 70,
        "impliedPct": 91.5,
        "edgePct": -21.5,
        "evPer100": -23.5,
        "netEvPer100": -25.5,
        "feePer100": 2,
        "valueIssue": "Favorite tax trap",
        "valueGrade": "Favorite tax trap",
        "betGrade": false
      },
      "spread": null,
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "line": null,
        "overOdds": null,
        "underOdds": null,
        "expectedGames": null,
        "valueGrade": "No direction",
        "reason": "No posted match total captured.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Under 9.5",
        "line": 9.5,
        "americanOdds": -165,
        "expectedGames": 9.2,
        "confidence": 52,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 52,
        "evPer100": -16.5,
        "netEvPer100": -18.5,
        "valueGrade": "Near fair",
        "reason": "Expected first-set games 9.2 vs DraftKings Sportsbook 9.5; Under 9.5.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Milos Karol",
          "confidence": 52,
          "modelPct": 30.4,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Alex Molcan",
          "confidence": 78,
          "modelPct": 70,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": null,
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Alex Molcan",
        "line": null,
        "americanOdds": -1080,
        "modelPct": 70,
        "impliedPct": 91.5,
        "edgePct": -21.5,
        "evPer100": -23.5,
        "netEvPer100": -25.5,
        "grade": "Favorite tax trap",
        "issue": "Favorite tax trap",
        "reason": "Likely winner can still be a bad ML bet after payout and fees. Check spread, total, and set-win instead."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": null,
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
        "selection": "Milos Karol 52% / Alex Molcan 78%",
        "rows": [
          {
            "name": "Milos Karol",
            "confidence": 52,
            "modelPct": 30.4,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Alex Molcan",
            "confidence": 78,
            "modelPct": 70,
            "label": "Market favorite to win a set"
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
        "expectedGames": 9.2,
        "confidence": 52,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "grade": "Near fair",
        "reason": "Expected first-set games 9.2 vs DraftKings Sportsbook 9.5; Under 9.5."
      }
    ],
    "ensembleValueCase": null,
    "marketData": {
      "source": "DraftKings Sportsbook",
      "sourceDetail": "DraftKings Sportsbook BFF",
      "capturedAt": "2026-06-04T03:58:30.560Z",
      "eventUrl": "https://sportsbook.draftkings.com/leagues/tennis/challenger-prostejov?event=34236823",
      "eventId": "34236823",
      "players": [
        {
          "name": "Milos Karol",
          "odds": 584,
          "americanLabel": "+584",
          "impliedPct": 14.6,
          "decimalOdds": 6.84,
          "modelPct": 30.4,
          "edgePct": 15.8,
          "priceBand": "Underdog",
          "grossProfitPct": 584,
          "grossPayoutMultiple": 6.84,
          "centsAtRisk": 100,
          "centsProfitIfWin": 584
        },
        {
          "name": "Alex Molcan",
          "odds": -1080,
          "americanLabel": "-1080",
          "impliedPct": 91.5,
          "decimalOdds": 1.093,
          "modelPct": 70,
          "edgePct": -21.5,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 9.3,
          "grossPayoutMultiple": 1.093,
          "centsAtRisk": 100,
          "centsProfitIfWin": 9.3
        }
      ],
      "desk": {
        "name": "Alex Molcan",
        "odds": -1080,
        "americanLabel": "-1080",
        "impliedPct": 91.5,
        "decimalOdds": 1.093,
        "modelPct": 70,
        "edgePct": -21.5,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 9.3,
        "grossPayoutMultiple": 1.093,
        "centsAtRisk": 100,
        "centsProfitIfWin": 9.3
      },
      "spread": null,
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": 105
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": 105
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": -165
      },
      "firstServiceGameTotalPoints": [],
      "firstGameProps": [],
      "setWinMarkets": [],
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "9.5 1st-set games: Over +105 / Under -165",
      "firstServiceGameValue": "No first-service-game market captured",
      "firstGamePropsValue": "No first-game prop market captured",
      "setWinValue": "No set-win price captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Milos Karol +584 / Alex Molcan -1080",
      "marketNote": "DraftKings Sportsbook ML, game handicap, match total, first-set total, set-win, and first-service-game markets captured where available. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 70% vs DraftKings Sportsbook implied 91.5% (-21.5 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Milos-Karol-Vs-Alex-Molcan/",
    "players": [
      {
        "name": "Milos Karol",
        "ranking": {
          "name": "Milos Karol",
          "rank": 465,
          "points": 98,
          "age": 23.4,
          "country": "SVK",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "asOf": "2026-05-26"
        },
        "qualityName": "Milos Karol",
        "profile": "Clay | Live rank #465 | SVK | age 23.4 | hold 67%",
        "modelPct": 30.4,
        "weakness": {
          "name": "Milos Karol",
          "serviceHoldPct": 67,
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
          "weaknessScore": 1,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Milos Karol has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      },
      {
        "name": "Alex Molcan",
        "ranking": {
          "name": "Alex Molcan",
          "rank": 110,
          "points": 571,
          "age": 28,
          "country": "Slovakia",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "asOf": "2026-06-02"
        },
        "qualityName": "Alex Molcan",
        "profile": "Clay | Live rank #110 | Slovakia | age 28 | hold 67%",
        "modelPct": 70,
        "weakness": {
          "name": "Alex Molcan",
          "serviceHoldPct": 67,
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
          "weaknessScore": 1,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Alex Molcan has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      }
    ]
  },
  {
    "id": "rh-wta-125k-birmingham-eala-vs-charaeva-2026-06-04",
    "eventId": "9101ad50-7f21-462b-9573-57878a44c130",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Grass",
    "surfaceSource": "Grass tournament surface",
    "title": "Alexandra Eala vs Alina Charaeva",
    "start": "3:40 AM",
    "startMinutes": 220,
    "court": "WTA 125K Birmingham",
    "round": "Round Of 16",
    "stage": "WTA 125K Birmingham | Round Of 16",
    "pickName": "Alexandra Eala",
    "basePickName": "Alexandra Eala",
    "modelSource": "Flashscore/SofaScore warehouse Challenger model",
    "modelSplit": false,
    "marketOnly": false,
    "confidence": 65.7,
    "volatility": 43,
    "tags": [
      "ATP Challenger",
      "Grass",
      "Prediction market",
      "Warehouse joined",
      "Flashscore first",
      "Coinflip price"
    ],
    "reason": "Alexandra Eala has the cleaner composite of rank, recent opponent quality, and joined service data; clay record is context only on Grass. Lean, not a chase.",
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
        "name": "Alexandra Eala",
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
        "gameFlowRead": "Alexandra Eala has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Alina Charaeva",
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
        "gameFlowRead": "Alina Charaeva has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Alexandra Eala",
        "confidence": 74,
        "modelPct": 65.7,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Alina Charaeva",
        "confidence": 56,
        "modelPct": 35.5,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Alexandra Eala",
        "americanOdds": -333,
        "modelPct": 65.7,
        "impliedPct": 76.9,
        "edgePct": -11.2,
        "evPer100": -14.6,
        "netEvPer100": -16.6,
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
        "expectedGames": null,
        "valueGrade": "No direction",
        "reason": "No posted match total captured.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Under 9.5",
        "line": 9.5,
        "americanOdds": -165,
        "expectedGames": 9.2,
        "confidence": 52,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 52,
        "evPer100": -16.5,
        "netEvPer100": -18.5,
        "valueGrade": "Near fair",
        "reason": "Expected first-set games 9.2 vs DraftKings Sportsbook 9.5; Under 9.5.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Alexandra Eala",
          "confidence": 74,
          "modelPct": 65.7,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Alina Charaeva",
          "confidence": 56,
          "modelPct": 35.5,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": null,
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Alexandra Eala",
        "line": null,
        "americanOdds": -333,
        "modelPct": 65.7,
        "impliedPct": 76.9,
        "edgePct": -11.2,
        "evPer100": -14.6,
        "netEvPer100": -16.6,
        "grade": "Negative EV",
        "issue": "Favorite price needs better proof",
        "reason": "Favorite price has limited payout; require a strong weakness edge or use spread/total."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": null,
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
        "selection": "Alexandra Eala 74% / Alina Charaeva 56%",
        "rows": [
          {
            "name": "Alexandra Eala",
            "confidence": 74,
            "modelPct": 65.7,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Alina Charaeva",
            "confidence": 56,
            "modelPct": 35.5,
            "label": "Underdog set-win path needs early holds"
          }
        ],
        "confidence": 74,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Under 9.5",
        "expectedGames": 9.2,
        "confidence": 52,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "grade": "Near fair",
        "reason": "Expected first-set games 9.2 vs DraftKings Sportsbook 9.5; Under 9.5."
      }
    ],
    "ensembleValueCase": null,
    "marketData": {
      "source": "DraftKings Sportsbook",
      "sourceDetail": "DraftKings Sportsbook BFF",
      "capturedAt": "2026-06-04T03:58:23.841Z",
      "eventUrl": "https://sportsbook.draftkings.com/leagues/tennis/wta-birmingham?event=34235356",
      "eventId": "34235356",
      "players": [
        {
          "name": "Alexandra Eala",
          "odds": -333,
          "americanLabel": "-333",
          "impliedPct": 76.9,
          "decimalOdds": 1.3,
          "modelPct": 65.7,
          "edgePct": -11.2,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 30,
          "grossPayoutMultiple": 1.3,
          "centsAtRisk": 100,
          "centsProfitIfWin": 30
        },
        {
          "name": "Alina Charaeva",
          "odds": 238,
          "americanLabel": "+238",
          "impliedPct": 29.6,
          "decimalOdds": 3.38,
          "modelPct": 35.5,
          "edgePct": 5.9,
          "priceBand": "Underdog",
          "grossProfitPct": 238,
          "grossPayoutMultiple": 3.38,
          "centsAtRisk": 100,
          "centsProfitIfWin": 238
        }
      ],
      "desk": {
        "name": "Alexandra Eala",
        "odds": -333,
        "americanLabel": "-333",
        "impliedPct": 76.9,
        "decimalOdds": 1.3,
        "modelPct": 65.7,
        "edgePct": -11.2,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 30,
        "grossPayoutMultiple": 1.3,
        "centsAtRisk": 100,
        "centsProfitIfWin": 30
      },
      "spread": null,
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": 110
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": 110
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": -165
      },
      "firstServiceGameTotalPoints": [],
      "firstGameProps": [],
      "setWinMarkets": [],
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "9.5 1st-set games: Over +110 / Under -165",
      "firstServiceGameValue": "No first-service-game market captured",
      "firstGamePropsValue": "No first-game prop market captured",
      "setWinValue": "No set-win price captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Alexandra Eala -333 / Alina Charaeva +238",
      "marketNote": "DraftKings Sportsbook ML, game handicap, match total, first-set total, set-win, and first-service-game markets captured where available. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 65.7% vs DraftKings Sportsbook implied 76.9% (-11.2 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Alexandra-Eala-Vs-Alina-Charaeva/",
    "players": [
      {
        "name": "Alexandra Eala",
        "ranking": {
          "name": "Alexandra Eala",
          "rank": 37,
          "points": 1340,
          "age": 21,
          "country": "Philippines",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "asOf": "2026-06-02"
        },
        "qualityName": "Alexandra Eala",
        "profile": "Grass | Live rank #37 | Philippines | age 21",
        "modelPct": 65.7,
        "weakness": {
          "name": "Alexandra Eala",
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
          "gameFlowRead": "Alexandra Eala has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 4,
          "recentRows": 4,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      },
      {
        "name": "Alina Charaeva",
        "ranking": {
          "name": "Alina Charaeva",
          "rank": 130,
          "points": 591,
          "age": 24,
          "country": "Russia",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "asOf": "2026-06-02"
        },
        "qualityName": null,
        "profile": "Grass | Live rank #130 | Russia | age 24",
        "modelPct": 35.5,
        "weakness": {
          "name": "Alina Charaeva",
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
          "gameFlowRead": "Alina Charaeva has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 0,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      }
    ]
  },
  {
    "id": "rh-wta-125k-birmingham-sawangkaew-vs-day-2026-06-04",
    "eventId": "76af511c-32c2-4764-8893-4cde75946a94",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Grass",
    "surfaceSource": "Grass tournament surface",
    "title": "Mananchaya Sawangkaew vs Kayla Day",
    "start": "3:40 AM",
    "startMinutes": 220,
    "court": "WTA 125K Birmingham",
    "round": "Round Of 16",
    "stage": "WTA 125K Birmingham | Round Of 16",
    "pickName": "Mananchaya Sawangkaew",
    "basePickName": "Mananchaya Sawangkaew",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 55,
    "volatility": 74,
    "tags": [
      "ATP Challenger",
      "Grass",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Mananchaya Sawangkaew is only the current Robinhood market favorite over Kayla Day; Grass surface is tagged, but no surface-specific warehouse service, break-point, or opponent-quality edge is joined yet.",
    "totals": "No posted sportsbook total captured for this Challenger market.",
    "weaknessEdge": {
      "edgeType": "Market-only",
      "target": "No warehouse weakness edge",
      "scoreGap": null,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "Robinhood market is captured, but rank/form/service data has not been joined for this Challenger row yet.",
      "liveTrigger": "Only enter after visible first-service comfort and break-point pressure; no pre-match model edge.",
      "spreadRead": "No spread line",
      "totalRead": "No total line",
      "pick": {
        "name": "Mananchaya Sawangkaew",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Kayla Day",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      }
    },
    "setWinProjections": [
      {
        "name": "Mananchaya Sawangkaew",
        "confidence": 63,
        "modelPct": 55,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Kayla Day",
        "confidence": 67,
        "modelPct": 47,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Mananchaya Sawangkaew",
        "americanOdds": -142,
        "modelPct": 55,
        "impliedPct": 58.7,
        "edgePct": -3.7,
        "evPer100": -6.3,
        "netEvPer100": -8.3,
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
        "expectedGames": null,
        "valueGrade": "No direction",
        "reason": "No posted match total captured.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Over 9.5",
        "line": 9.5,
        "americanOdds": 100,
        "expectedGames": 10.1,
        "confidence": 58,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 58,
        "evPer100": 16,
        "netEvPer100": 14,
        "valueGrade": "Thin value",
        "reason": "Expected first-set games 10.1 vs DraftKings Sportsbook 9.5; Over 9.5.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Mananchaya Sawangkaew",
          "confidence": 63,
          "modelPct": 55,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Kayla Day",
          "confidence": 67,
          "modelPct": 47,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": null,
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Mananchaya Sawangkaew",
        "line": null,
        "americanOdds": -142,
        "modelPct": 55,
        "impliedPct": 58.7,
        "edgePct": -3.7,
        "evPer100": -6.3,
        "netEvPer100": -8.3,
        "grade": "Negative EV",
        "issue": "Favorite price needs better proof",
        "reason": "ML is close to fair; derivative or live entry needs to carry the edge."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": null,
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
        "selection": "Mananchaya Sawangkaew 63% / Kayla Day 67%",
        "rows": [
          {
            "name": "Mananchaya Sawangkaew",
            "confidence": 63,
            "modelPct": 55,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Kayla Day",
            "confidence": 67,
            "modelPct": 47,
            "label": "Underdog set-win path needs early holds"
          }
        ],
        "confidence": 67,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Over 9.5",
        "expectedGames": 10.1,
        "confidence": 58,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "grade": "Thin value",
        "reason": "Expected first-set games 10.1 vs DraftKings Sportsbook 9.5; Over 9.5."
      }
    ],
    "ensembleValueCase": null,
    "marketData": {
      "source": "DraftKings Sportsbook",
      "sourceDetail": "DraftKings Sportsbook BFF",
      "capturedAt": "2026-06-04T03:58:25.477Z",
      "eventUrl": "https://sportsbook.draftkings.com/leagues/tennis/wta-birmingham?event=34236819",
      "eventId": "34236819",
      "players": [
        {
          "name": "Mananchaya Sawangkaew",
          "odds": -142,
          "americanLabel": "-142",
          "impliedPct": 58.7,
          "decimalOdds": 1.704,
          "modelPct": 55,
          "edgePct": -3.7,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 70.4,
          "grossPayoutMultiple": 1.704,
          "centsAtRisk": 100,
          "centsProfitIfWin": 70.4
        },
        {
          "name": "Kayla Day",
          "odds": 104,
          "americanLabel": "+104",
          "impliedPct": 49,
          "decimalOdds": 2.04,
          "modelPct": 47,
          "edgePct": -2,
          "priceBand": "Coinflip",
          "grossProfitPct": 104,
          "grossPayoutMultiple": 2.04,
          "centsAtRisk": 100,
          "centsProfitIfWin": 104
        }
      ],
      "desk": {
        "name": "Mananchaya Sawangkaew",
        "odds": -142,
        "americanLabel": "-142",
        "impliedPct": 58.7,
        "decimalOdds": 1.704,
        "modelPct": 55,
        "edgePct": -3.7,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 70.4,
        "grossPayoutMultiple": 1.704,
        "centsAtRisk": 100,
        "centsProfitIfWin": 70.4
      },
      "spread": null,
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": 100
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": 100
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": -150
      },
      "firstServiceGameTotalPoints": [],
      "firstGameProps": [],
      "setWinMarkets": [],
      "priceAction": "ML is close to fair; derivative or live entry needs to carry the edge.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "9.5 1st-set games: Over +100 / Under -150",
      "firstServiceGameValue": "No first-service-game market captured",
      "firstGamePropsValue": "No first-game prop market captured",
      "setWinValue": "No set-win price captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Mananchaya Sawangkaew -142 / Kayla Day +104",
      "marketNote": "DraftKings Sportsbook ML, game handicap, match total, first-set total, set-win, and first-service-game markets captured where available. ML is close to fair; derivative or live entry needs to carry the edge.",
      "noVigNote": "Model 55% vs DraftKings Sportsbook implied 58.7% (-3.7 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Mananchaya-Sawangkaew-Vs-Kayla-Day/",
    "players": [
      {
        "name": "Mananchaya Sawangkaew",
        "ranking": {
          "name": "Mananchaya Sawangkaew",
          "rank": 171,
          "points": 428,
          "age": 23.8,
          "country": "THA",
          "tour": "WTA",
          "source": "https://live-tennis.eu/en/wta-live-ranking browser snapshot",
          "asOf": "2026-05-26"
        },
        "qualityName": null,
        "profile": "Grass | Live rank #171 | THA | age 23.8",
        "modelPct": 55,
        "weakness": {
          "name": "Mananchaya Sawangkaew",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        },
        "warehouseDepth": {
          "expectedRows": 0,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      },
      {
        "name": "Kayla Day",
        "ranking": {
          "name": "Kayla Day",
          "rank": 145,
          "points": 522,
          "age": 26,
          "country": "USA",
          "tour": "WTA",
          "source": "https://www.espn.com/tennis/rankings/_/type/wta/season/2026",
          "asOf": "2026-06-02"
        },
        "qualityName": null,
        "profile": "Grass | Live rank #145 | USA | age 26",
        "modelPct": 47,
        "weakness": {
          "name": "Kayla Day",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        },
        "warehouseDepth": {
          "expectedRows": 0,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-birmingham-harris-vs-bu-2026-06-04",
    "eventId": "683b1e9a-de04-428c-b9ab-168407d0d965",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Grass",
    "surfaceSource": "Grass tournament surface",
    "title": "Billy Harris vs Yunchaokete Bu",
    "start": "4:00 AM",
    "startMinutes": 240,
    "court": "ATP Challenger Birmingham",
    "round": "Round Of 16",
    "stage": "ATP Challenger Birmingham | Round Of 16",
    "pickName": "Yunchaokete Bu",
    "basePickName": "Yunchaokete Bu",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 54,
    "volatility": 75,
    "tags": [
      "ATP Challenger",
      "Grass",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Yunchaokete Bu is only the current Robinhood market favorite over Billy Harris; Grass surface is tagged, but no surface-specific warehouse service, break-point, or opponent-quality edge is joined yet.",
    "totals": "No posted sportsbook total captured for this Challenger market.",
    "weaknessEdge": {
      "edgeType": "Market-only",
      "target": "No warehouse weakness edge",
      "scoreGap": null,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "Robinhood market is captured, but rank/form/service data has not been joined for this Challenger row yet.",
      "liveTrigger": "Only enter after visible first-service comfort and break-point pressure; no pre-match model edge.",
      "spreadRead": "No spread line",
      "totalRead": "No total line",
      "pick": {
        "name": "Billy Harris",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Yunchaokete Bu",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      }
    },
    "setWinProjections": [
      {
        "name": "Billy Harris",
        "confidence": 68,
        "modelPct": 47,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Yunchaokete Bu",
        "confidence": 62,
        "modelPct": 54,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Yunchaokete Bu",
        "americanOdds": -127,
        "modelPct": 54,
        "impliedPct": 55.9,
        "edgePct": -1.9,
        "evPer100": -3.5,
        "netEvPer100": -5.5,
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
        "expectedGames": null,
        "valueGrade": "No direction",
        "reason": "No posted match total captured.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Over 9.5",
        "line": 9.5,
        "americanOdds": -215,
        "expectedGames": 10.1,
        "confidence": 58,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 58,
        "evPer100": -15,
        "netEvPer100": -17,
        "valueGrade": "Thin value",
        "reason": "Expected first-set games 10.1 vs DraftKings Sportsbook 9.5; Over 9.5.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Billy Harris",
          "confidence": 68,
          "modelPct": 47,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Yunchaokete Bu",
          "confidence": 62,
          "modelPct": 54,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": null,
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Yunchaokete Bu",
        "line": null,
        "americanOdds": -127,
        "modelPct": 54,
        "impliedPct": 55.9,
        "edgePct": -1.9,
        "evPer100": -3.5,
        "netEvPer100": -5.5,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "ML is close to fair; derivative or live entry needs to carry the edge."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": null,
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
        "selection": "Billy Harris 68% / Yunchaokete Bu 62%",
        "rows": [
          {
            "name": "Billy Harris",
            "confidence": 68,
            "modelPct": 47,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Yunchaokete Bu",
            "confidence": 62,
            "modelPct": 54,
            "label": "Market favorite to win a set"
          }
        ],
        "confidence": 68,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Over 9.5",
        "expectedGames": 10.1,
        "confidence": 58,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "grade": "Thin value",
        "reason": "Expected first-set games 10.1 vs DraftKings Sportsbook 9.5; Over 9.5."
      }
    ],
    "ensembleValueCase": null,
    "marketData": {
      "source": "DraftKings Sportsbook",
      "sourceDetail": "DraftKings Sportsbook BFF",
      "capturedAt": "2026-06-04T03:58:44.875Z",
      "eventUrl": "https://sportsbook.draftkings.com/leagues/tennis/challenger-birmingham?event=34235870",
      "eventId": "34235870",
      "players": [
        {
          "name": "Billy Harris",
          "odds": -103,
          "americanLabel": "-103",
          "impliedPct": 50.7,
          "decimalOdds": 1.971,
          "modelPct": 47,
          "edgePct": -3.7,
          "priceBand": "Coinflip",
          "grossProfitPct": 97.1,
          "grossPayoutMultiple": 1.971,
          "centsAtRisk": 100,
          "centsProfitIfWin": 97.1
        },
        {
          "name": "Yunchaokete Bu",
          "odds": -127,
          "americanLabel": "-127",
          "impliedPct": 55.9,
          "decimalOdds": 1.787,
          "modelPct": 54,
          "edgePct": -1.9,
          "priceBand": "Coinflip",
          "grossProfitPct": 78.7,
          "grossPayoutMultiple": 1.787,
          "centsAtRisk": 100,
          "centsProfitIfWin": 78.7
        }
      ],
      "desk": {
        "name": "Yunchaokete Bu",
        "odds": -127,
        "americanLabel": "-127",
        "impliedPct": 55.9,
        "decimalOdds": 1.787,
        "modelPct": 54,
        "edgePct": -1.9,
        "priceBand": "Coinflip",
        "grossProfitPct": 78.7,
        "grossPayoutMultiple": 1.787,
        "centsAtRisk": 100,
        "centsProfitIfWin": 78.7
      },
      "spread": null,
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": -215
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": -215
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": 140
      },
      "firstServiceGameTotalPoints": [],
      "firstGameProps": [],
      "setWinMarkets": [],
      "priceAction": "ML is close to fair; derivative or live entry needs to carry the edge.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "9.5 1st-set games: Over -215 / Under +140",
      "firstServiceGameValue": "No first-service-game market captured",
      "firstGamePropsValue": "No first-game prop market captured",
      "setWinValue": "No set-win price captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Billy Harris -103 / Yunchaokete Bu -127",
      "marketNote": "DraftKings Sportsbook ML, game handicap, match total, first-set total, set-win, and first-service-game markets captured where available. ML is close to fair; derivative or live entry needs to carry the edge.",
      "noVigNote": "Model 54% vs DraftKings Sportsbook implied 55.9% (-1.9 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Billy-Harris-Vs-Bu-Yunchaokete/",
    "players": [
      {
        "name": "Billy Harris",
        "ranking": {
          "name": "Billy Harris",
          "rank": 150,
          "points": 408,
          "age": 31,
          "country": "Great Britain",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "asOf": "2026-06-02"
        },
        "qualityName": null,
        "profile": "Grass | Live rank #150 | Great Britain | age 31",
        "modelPct": 47,
        "weakness": {
          "name": "Billy Harris",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        },
        "warehouseDepth": {
          "expectedRows": 0,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      },
      {
        "name": "Yunchaokete Bu",
        "ranking": {
          "name": "Yunchaokete Bu",
          "rank": 165,
          "points": 348,
          "age": 24.3,
          "country": "CHN",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "asOf": "2026-05-26"
        },
        "qualityName": null,
        "profile": "Grass | Live rank #165 | CHN | age 24.3",
        "modelPct": 54,
        "weakness": {
          "name": "Yunchaokete Bu",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        },
        "warehouseDepth": {
          "expectedRows": 0,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-birmingham-mcdonald-vs-hijikata-2026-06-04",
    "eventId": "75b47723-4065-4f81-a27f-ef01925227b2",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Grass",
    "surfaceSource": "Grass tournament surface",
    "title": "Mackenzie McDonald vs Rinky Hijikata",
    "start": "4:00 AM",
    "startMinutes": 240,
    "court": "ATP Challenger Birmingham",
    "round": "Round Of 16",
    "stage": "ATP Challenger Birmingham | Round Of 16",
    "pickName": "Rinky Hijikata",
    "basePickName": "Rinky Hijikata",
    "modelSource": "Flashscore/SofaScore warehouse Challenger model",
    "modelSplit": false,
    "marketOnly": false,
    "confidence": 53.9,
    "volatility": 49,
    "tags": [
      "ATP Challenger",
      "Grass",
      "Prediction market",
      "Warehouse joined",
      "Flashscore first",
      "Coinflip price"
    ],
    "reason": "Mackenzie McDonald has the recent service-hold edge 80% to 60%, so Rinky Hijikata needs the rank/form edge to show up on return games. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": -7,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Rinky Hijikata",
        "serviceHoldPct": 60,
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
        "weaknessScore": 7,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "low recent hold rate (60%)"
        ],
        "strengths": [],
        "gameFlowRead": "Rinky Hijikata can drop points quickly through low recent hold rate (60%)."
      },
      "opponent": {
        "name": "Mackenzie McDonald",
        "serviceHoldPct": 80,
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
        "strengths": [
          "protects serve well (80% hold)"
        ],
        "gameFlowRead": "Mackenzie McDonald has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Mackenzie McDonald",
        "confidence": 68,
        "modelPct": 46.9,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Rinky Hijikata",
        "confidence": 62,
        "modelPct": 53.9,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Rinky Hijikata",
        "americanOdds": -159,
        "modelPct": 53.9,
        "impliedPct": 61.4,
        "edgePct": -7.5,
        "evPer100": -12.2,
        "netEvPer100": -14.2,
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
        "expectedGames": null,
        "valueGrade": "No direction",
        "reason": "No posted match total captured.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Pass / near line",
        "line": 9.5,
        "americanOdds": null,
        "expectedGames": 9.5,
        "confidence": 50,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 50,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Near fair",
        "reason": "Expected first-set games 9.5 vs DraftKings Sportsbook 9.5; Pass / near line.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Mackenzie McDonald",
          "confidence": 68,
          "modelPct": 46.9,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Rinky Hijikata",
          "confidence": 62,
          "modelPct": 53.9,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": null,
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Rinky Hijikata",
        "line": null,
        "americanOdds": -159,
        "modelPct": 53.9,
        "impliedPct": 61.4,
        "edgePct": -7.5,
        "evPer100": -12.2,
        "netEvPer100": -14.2,
        "grade": "Negative EV",
        "issue": "Favorite price needs better proof",
        "reason": "DraftKings Sportsbook price is richer than the model; pass ML unless live state improves."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": null,
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
        "selection": "Mackenzie McDonald 68% / Rinky Hijikata 62%",
        "rows": [
          {
            "name": "Mackenzie McDonald",
            "confidence": 68,
            "modelPct": 46.9,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Rinky Hijikata",
            "confidence": 62,
            "modelPct": 53.9,
            "label": "Market favorite to win a set"
          }
        ],
        "confidence": 68,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Pass / near line",
        "expectedGames": 9.5,
        "confidence": 50,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "grade": "Near fair",
        "reason": "Expected first-set games 9.5 vs DraftKings Sportsbook 9.5; Pass / near line."
      }
    ],
    "ensembleValueCase": null,
    "marketData": {
      "source": "DraftKings Sportsbook",
      "sourceDetail": "DraftKings Sportsbook BFF",
      "capturedAt": "2026-06-04T03:58:43.239Z",
      "eventUrl": "https://sportsbook.draftkings.com/leagues/tennis/challenger-birmingham?event=34236800",
      "eventId": "34236800",
      "players": [
        {
          "name": "Mackenzie McDonald",
          "odds": 121,
          "americanLabel": "+121",
          "impliedPct": 45.2,
          "decimalOdds": 2.21,
          "modelPct": 46.9,
          "edgePct": 1.7,
          "priceBand": "Coinflip",
          "grossProfitPct": 121,
          "grossPayoutMultiple": 2.21,
          "centsAtRisk": 100,
          "centsProfitIfWin": 121
        },
        {
          "name": "Rinky Hijikata",
          "odds": -159,
          "americanLabel": "-159",
          "impliedPct": 61.4,
          "decimalOdds": 1.629,
          "modelPct": 53.9,
          "edgePct": -7.5,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 62.9,
          "grossPayoutMultiple": 1.629,
          "centsAtRisk": 100,
          "centsProfitIfWin": 62.9
        }
      ],
      "desk": {
        "name": "Rinky Hijikata",
        "odds": -159,
        "americanLabel": "-159",
        "impliedPct": 61.4,
        "decimalOdds": 1.629,
        "modelPct": 53.9,
        "edgePct": -7.5,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 62.9,
        "grossPayoutMultiple": 1.629,
        "centsAtRisk": 100,
        "centsProfitIfWin": 62.9
      },
      "spread": null,
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": -150
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": -150
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": 105
      },
      "firstServiceGameTotalPoints": [],
      "firstGameProps": [],
      "setWinMarkets": [],
      "priceAction": "DraftKings Sportsbook price is richer than the model; pass ML unless live state improves.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "9.5 1st-set games: Over -150 / Under +105",
      "firstServiceGameValue": "No first-service-game market captured",
      "firstGamePropsValue": "No first-game prop market captured",
      "setWinValue": "No set-win price captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Mackenzie McDonald +121 / Rinky Hijikata -159",
      "marketNote": "DraftKings Sportsbook ML, game handicap, match total, first-set total, set-win, and first-service-game markets captured where available. DraftKings Sportsbook price is richer than the model; pass ML unless live state improves.",
      "noVigNote": "Model 53.9% vs DraftKings Sportsbook implied 61.4% (-7.5 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Mackenzie-McDonald-Vs-Rinky-Hijikata/",
    "players": [
      {
        "name": "Mackenzie McDonald",
        "ranking": {
          "name": "Mackenzie McDonald",
          "rank": 126,
          "points": 501,
          "age": 31,
          "country": "USA",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "asOf": "2026-06-02"
        },
        "qualityName": "Mackenzie McDonald",
        "profile": "Grass | Live rank #126 | USA | age 31 | hold 80%",
        "modelPct": 46.9,
        "weakness": {
          "name": "Mackenzie McDonald",
          "serviceHoldPct": 80,
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
          "strengths": [
            "protects serve well (80% hold)"
          ],
          "gameFlowRead": "Mackenzie McDonald has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      },
      {
        "name": "Rinky Hijikata",
        "ranking": {
          "name": "Rinky Hijikata",
          "rank": 98,
          "points": 612,
          "age": 25,
          "country": "Australia",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "asOf": "2026-06-02"
        },
        "qualityName": "Rinky Hijikata",
        "profile": "Grass | Live rank #98 | Australia | age 25 | hold 60%",
        "modelPct": 53.9,
        "weakness": {
          "name": "Rinky Hijikata",
          "serviceHoldPct": 60,
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
          "weaknessScore": 7,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "low recent hold rate (60%)"
          ],
          "strengths": [],
          "gameFlowRead": "Rinky Hijikata can drop points quickly through low recent hold rate (60%)."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-birmingham-virtanen-vs-vukic-2026-06-04",
    "eventId": "4fc8c761-df82-47e6-98cf-61da8fd4ca09",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Grass",
    "surfaceSource": "Grass tournament surface",
    "title": "Otto Virtanen vs Aleksandar Vukic",
    "start": "4:00 AM",
    "startMinutes": 240,
    "court": "ATP Challenger Birmingham",
    "round": "Round Of 16",
    "stage": "ATP Challenger Birmingham | Round Of 16",
    "pickName": "Otto Virtanen",
    "basePickName": "Otto Virtanen",
    "modelSource": "Flashscore/SofaScore warehouse Challenger model",
    "modelSplit": false,
    "marketOnly": false,
    "confidence": 53.7,
    "volatility": 46,
    "tags": [
      "ATP Challenger",
      "Grass",
      "Prediction market",
      "Warehouse joined",
      "Flashscore first",
      "Coinflip price"
    ],
    "reason": "Aleksandar Vukic has the recent service-hold edge 100% to 75%, so Otto Virtanen needs the rank/form edge to show up on return games. Lean, not a chase.",
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
        "name": "Otto Virtanen",
        "serviceHoldPct": 75,
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
        "gameFlowRead": "Otto Virtanen has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Aleksandar Vukic",
        "serviceHoldPct": 100,
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
        "strengths": [
          "protects serve well (100% hold)"
        ],
        "gameFlowRead": "Aleksandar Vukic has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Otto Virtanen",
        "confidence": 62,
        "modelPct": 53.7,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Aleksandar Vukic",
        "confidence": 68,
        "modelPct": 47.6,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Otto Virtanen",
        "americanOdds": -268,
        "modelPct": 53.7,
        "impliedPct": 72.8,
        "edgePct": -19.1,
        "evPer100": -26.3,
        "netEvPer100": -28.3,
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
        "expectedGames": null,
        "valueGrade": "No direction",
        "reason": "No posted match total captured.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Under 10.5",
        "line": 10.5,
        "americanOdds": -200,
        "expectedGames": 9.5,
        "confidence": 58,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 58,
        "evPer100": -13,
        "netEvPer100": -15,
        "valueGrade": "Thin value",
        "reason": "Expected first-set games 9.5 vs DraftKings Sportsbook 10.5; Under 10.5.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Otto Virtanen",
          "confidence": 62,
          "modelPct": 53.7,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Aleksandar Vukic",
          "confidence": 68,
          "modelPct": 47.6,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": null,
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Otto Virtanen",
        "line": null,
        "americanOdds": -268,
        "modelPct": 53.7,
        "impliedPct": 72.8,
        "edgePct": -19.1,
        "evPer100": -26.3,
        "netEvPer100": -28.3,
        "grade": "Negative EV",
        "issue": "Favorite price needs better proof",
        "reason": "Favorite price has limited payout; require a strong weakness edge or use spread/total."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": null,
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
        "selection": "Otto Virtanen 62% / Aleksandar Vukic 68%",
        "rows": [
          {
            "name": "Otto Virtanen",
            "confidence": 62,
            "modelPct": 53.7,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Aleksandar Vukic",
            "confidence": 68,
            "modelPct": 47.6,
            "label": "Underdog set-win path needs early holds"
          }
        ],
        "confidence": 68,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Under 10.5",
        "expectedGames": 9.5,
        "confidence": 58,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "grade": "Thin value",
        "reason": "Expected first-set games 9.5 vs DraftKings Sportsbook 10.5; Under 10.5."
      }
    ],
    "ensembleValueCase": null,
    "marketData": {
      "source": "DraftKings Sportsbook",
      "sourceDetail": "DraftKings Sportsbook BFF",
      "capturedAt": "2026-06-04T03:58:46.616Z",
      "eventUrl": "https://sportsbook.draftkings.com/leagues/tennis/challenger-birmingham?event=34240559",
      "eventId": "34240559",
      "players": [
        {
          "name": "Otto Virtanen",
          "odds": -268,
          "americanLabel": "-268",
          "impliedPct": 72.8,
          "decimalOdds": 1.373,
          "modelPct": 53.7,
          "edgePct": -19.1,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 37.3,
          "grossPayoutMultiple": 1.373,
          "centsAtRisk": 100,
          "centsProfitIfWin": 37.3
        },
        {
          "name": "Aleksandar Vukic",
          "odds": 197,
          "americanLabel": "+197",
          "impliedPct": 33.7,
          "decimalOdds": 2.97,
          "modelPct": 47.6,
          "edgePct": 13.9,
          "priceBand": "Underdog",
          "grossProfitPct": 197,
          "grossPayoutMultiple": 2.97,
          "centsAtRisk": 100,
          "centsProfitIfWin": 197
        }
      ],
      "desk": {
        "name": "Otto Virtanen",
        "odds": -268,
        "americanLabel": "-268",
        "impliedPct": 72.8,
        "decimalOdds": 1.373,
        "modelPct": 53.7,
        "edgePct": -19.1,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 37.3,
        "grossPayoutMultiple": 1.373,
        "centsAtRisk": 100,
        "centsProfitIfWin": 37.3
      },
      "spread": null,
      "firstSetTotal": {
        "side": "Over",
        "line": 10.5,
        "odds": 135
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 10.5,
        "odds": 135
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 10.5,
        "odds": -200
      },
      "firstServiceGameTotalPoints": [],
      "firstGameProps": [],
      "setWinMarkets": [],
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "10.5 1st-set games: Over +135 / Under -200",
      "firstServiceGameValue": "No first-service-game market captured",
      "firstGamePropsValue": "No first-game prop market captured",
      "setWinValue": "No set-win price captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Otto Virtanen -268 / Aleksandar Vukic +197",
      "marketNote": "DraftKings Sportsbook ML, game handicap, match total, first-set total, set-win, and first-service-game markets captured where available. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 53.7% vs DraftKings Sportsbook implied 72.8% (-19.1 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Otto-Virtanen-Vs-Aleksandar-Vukic/",
    "players": [
      {
        "name": "Otto Virtanen",
        "ranking": {
          "name": "Otto Virtanen",
          "rank": 134,
          "points": 462,
          "age": 24,
          "country": "Finland",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "asOf": "2026-06-02"
        },
        "qualityName": "Otto Virtanen",
        "profile": "Grass | Live rank #134 | Finland | age 24 | hold 75%",
        "modelPct": 53.7,
        "weakness": {
          "name": "Otto Virtanen",
          "serviceHoldPct": 75,
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
          "gameFlowRead": "Otto Virtanen has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 7,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      },
      {
        "name": "Aleksandar Vukic",
        "ranking": {
          "name": "Aleksandar Vukic",
          "rank": 96,
          "points": 626,
          "age": 30,
          "country": "Australia",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "asOf": "2026-06-02"
        },
        "qualityName": "Aleksandar Vukic",
        "profile": "Grass | Live rank #96 | Australia | age 30 | hold 100%",
        "modelPct": 47.6,
        "weakness": {
          "name": "Aleksandar Vukic",
          "serviceHoldPct": 100,
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
          "strengths": [
            "protects serve well (100% hold)"
          ],
          "gameFlowRead": "Aleksandar Vukic has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 7,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-bad-rappenau-trungelliti-vs-hsu-2026-06-04",
    "eventId": "3ad65e6f-5b88-4351-9009-ba130a9935c4",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Clay",
    "surfaceSource": "ATP Challenger Bad Rappenau surface",
    "title": "Marco Trungelliti vs Yu Hsiou Hsu",
    "start": "4:10 AM",
    "startMinutes": 250,
    "court": "ATP Challenger Bad Rappenau",
    "round": "Round Of 16",
    "stage": "ATP Challenger Bad Rappenau | Round Of 16",
    "pickName": "Marco Trungelliti",
    "basePickName": "Marco Trungelliti",
    "modelSource": "Flashscore/SofaScore warehouse Challenger model",
    "modelSplit": false,
    "marketOnly": false,
    "confidence": 69.3,
    "volatility": 43,
    "tags": [
      "ATP Challenger",
      "Clay",
      "Prediction market",
      "Warehouse joined",
      "Flashscore first",
      "Coinflip price"
    ],
    "reason": "Marco Trungelliti has the recent service-hold edge 100% to 80%. Lean, not a chase.",
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
        "name": "Marco Trungelliti",
        "serviceHoldPct": 100,
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
        "strengths": [
          "protects serve well (100% hold)"
        ],
        "gameFlowRead": "Marco Trungelliti has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Yu Hsiou Hsu",
        "serviceHoldPct": 80,
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
        "strengths": [
          "protects serve well (80% hold)"
        ],
        "gameFlowRead": "Yu Hsiou Hsu has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Marco Trungelliti",
        "confidence": 77,
        "modelPct": 69.3,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Yu Hsiou Hsu",
        "confidence": 53,
        "modelPct": 31.5,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Marco Trungelliti",
        "americanOdds": -740,
        "modelPct": 69.3,
        "impliedPct": 88.1,
        "edgePct": -18.8,
        "evPer100": -21.3,
        "netEvPer100": -23.3,
        "feePer100": 2,
        "valueIssue": "Favorite tax trap",
        "valueGrade": "Favorite tax trap",
        "betGrade": false
      },
      "spread": null,
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "line": null,
        "overOdds": null,
        "underOdds": null,
        "expectedGames": null,
        "valueGrade": "No direction",
        "reason": "No posted match total captured.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Under 9.5",
        "line": 9.5,
        "americanOdds": -150,
        "expectedGames": 9.2,
        "confidence": 52,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 52,
        "evPer100": -13.3,
        "netEvPer100": -15.3,
        "valueGrade": "Near fair",
        "reason": "Expected first-set games 9.2 vs DraftKings Sportsbook 9.5; Under 9.5.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Marco Trungelliti",
          "confidence": 77,
          "modelPct": 69.3,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Yu Hsiou Hsu",
          "confidence": 53,
          "modelPct": 31.5,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": null,
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Marco Trungelliti",
        "line": null,
        "americanOdds": -740,
        "modelPct": 69.3,
        "impliedPct": 88.1,
        "edgePct": -18.8,
        "evPer100": -21.3,
        "netEvPer100": -23.3,
        "grade": "Favorite tax trap",
        "issue": "Favorite tax trap",
        "reason": "Likely winner can still be a bad ML bet after payout and fees. Check spread, total, and set-win instead."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": null,
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
        "selection": "Marco Trungelliti 77% / Yu Hsiou Hsu 53%",
        "rows": [
          {
            "name": "Marco Trungelliti",
            "confidence": 77,
            "modelPct": 69.3,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Yu Hsiou Hsu",
            "confidence": 53,
            "modelPct": 31.5,
            "label": "Underdog set-win path needs early holds"
          }
        ],
        "confidence": 77,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Under 9.5",
        "expectedGames": 9.2,
        "confidence": 52,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "grade": "Near fair",
        "reason": "Expected first-set games 9.2 vs DraftKings Sportsbook 9.5; Under 9.5."
      }
    ],
    "ensembleValueCase": null,
    "marketData": {
      "source": "DraftKings Sportsbook",
      "sourceDetail": "DraftKings Sportsbook BFF",
      "capturedAt": "2026-06-04T03:58:35.762Z",
      "eventUrl": "https://sportsbook.draftkings.com/leagues/tennis/challenger-heilbronn?event=34236798",
      "eventId": "34236798",
      "players": [
        {
          "name": "Marco Trungelliti",
          "odds": -740,
          "americanLabel": "-740",
          "impliedPct": 88.1,
          "decimalOdds": 1.135,
          "modelPct": 69.3,
          "edgePct": -18.8,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 13.5,
          "grossPayoutMultiple": 1.135,
          "centsAtRisk": 100,
          "centsProfitIfWin": 13.5
        },
        {
          "name": "Yu Hsiou Hsu",
          "odds": 449,
          "americanLabel": "+449",
          "impliedPct": 18.2,
          "decimalOdds": 5.49,
          "modelPct": 31.5,
          "edgePct": 13.3,
          "priceBand": "Underdog",
          "grossProfitPct": 449,
          "grossPayoutMultiple": 5.49,
          "centsAtRisk": 100,
          "centsProfitIfWin": 449
        }
      ],
      "desk": {
        "name": "Marco Trungelliti",
        "odds": -740,
        "americanLabel": "-740",
        "impliedPct": 88.1,
        "decimalOdds": 1.135,
        "modelPct": 69.3,
        "edgePct": -18.8,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 13.5,
        "grossPayoutMultiple": 1.135,
        "centsAtRisk": 100,
        "centsProfitIfWin": 13.5
      },
      "spread": null,
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": 100
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": 100
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": -150
      },
      "firstServiceGameTotalPoints": [],
      "firstGameProps": [],
      "setWinMarkets": [],
      "priceAction": "ML payout is tiny; use spread/total or pass unless the number moves.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "9.5 1st-set games: Over +100 / Under -150",
      "firstServiceGameValue": "No first-service-game market captured",
      "firstGamePropsValue": "No first-game prop market captured",
      "setWinValue": "No set-win price captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Marco Trungelliti -740 / Yu Hsiou Hsu +449",
      "marketNote": "DraftKings Sportsbook ML, game handicap, match total, first-set total, set-win, and first-service-game markets captured where available. ML payout is tiny; use spread/total or pass unless the number moves.",
      "noVigNote": "Model 69.3% vs DraftKings Sportsbook implied 88.1% (-18.8 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Marco-Trungelliti-Vs-Yu-Hsiou-Hsu/",
    "players": [
      {
        "name": "Marco Trungelliti",
        "ranking": {
          "name": "Marco Trungelliti",
          "rank": 81,
          "points": 731,
          "age": 36,
          "country": "Argentina",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "asOf": "2026-06-02"
        },
        "qualityName": "Marco Trungelliti",
        "profile": "Clay | Live rank #81 | Argentina | age 36 | hold 100%",
        "modelPct": 69.3,
        "weakness": {
          "name": "Marco Trungelliti",
          "serviceHoldPct": 100,
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
          "strengths": [
            "protects serve well (100% hold)"
          ],
          "gameFlowRead": "Marco Trungelliti has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      },
      {
        "name": "Yu Hsiou Hsu",
        "ranking": {
          "name": "Yu Hsiou Hsu",
          "rank": 205,
          "points": 273,
          "age": 27.1,
          "country": "TWN",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "asOf": "2026-05-26"
        },
        "qualityName": "Yu Hsiou Hsu",
        "profile": "Clay | Live rank #205 | TWN | age 27.1 | hold 80%",
        "modelPct": 31.5,
        "weakness": {
          "name": "Yu Hsiou Hsu",
          "serviceHoldPct": 80,
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
          "strengths": [
            "protects serve well (80% hold)"
          ],
          "gameFlowRead": "Yu Hsiou Hsu has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-prostejov-daniel-vs-dzumhur-2026-06-04",
    "eventId": "d616d79f-b797-4ee1-b3d4-37f484378a5d",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Clay",
    "surfaceSource": "ATP Challenger Prostejov surface",
    "title": "Taro Daniel vs Damir Dzumhur",
    "start": "4:20 AM",
    "startMinutes": 260,
    "court": "ATP Challenger Prostejov",
    "round": "Round Of 16",
    "stage": "ATP Challenger Prostejov | Round Of 16",
    "pickName": "Damir Dzumhur",
    "basePickName": "Damir Dzumhur",
    "modelSource": "Flashscore/SofaScore warehouse Challenger model",
    "modelSplit": false,
    "marketOnly": false,
    "confidence": 67.6,
    "volatility": 41,
    "tags": [
      "ATP Challenger",
      "Clay",
      "Prediction market",
      "Warehouse joined",
      "Flashscore first",
      "Coinflip price"
    ],
    "reason": "Damir Dzumhur has the recent service-hold edge 100% to 25%. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness edge",
      "target": "Taro Daniel",
      "scoreGap": 39,
      "attackingSide": "Damir Dzumhur",
      "vulnerableSide": "Taro Daniel",
      "gameFlow": "Damir Dzumhur has a real path if Taro Daniel's first two service games show the same weakness: low recent hold rate (25%).",
      "liveTrigger": "Look for Taro Daniel facing break points or second-serve pressure before 3-3.",
      "spreadRead": "Damir Dzumhur spread only if the handicap is short and Taro Daniel is under pressure early.",
      "totalRead": "Avoid low unders if Taro Daniel faces early break points or second-serve pressure.",
      "pick": {
        "name": "Damir Dzumhur",
        "serviceHoldPct": 100,
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
        "strengths": [
          "protects serve well (100% hold)"
        ],
        "gameFlowRead": "Damir Dzumhur has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Taro Daniel",
        "serviceHoldPct": 25,
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
        "weaknessScore": 39,
        "firstGameComfort": "Fragile opening-service profile",
        "liabilities": [
          "low recent hold rate (25%)"
        ],
        "strengths": [],
        "gameFlowRead": "Taro Daniel can drop points quickly through low recent hold rate (25%)."
      }
    },
    "setWinProjections": [
      {
        "name": "Taro Daniel",
        "confidence": 54,
        "modelPct": 33.2,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Damir Dzumhur",
        "confidence": 76,
        "modelPct": 67.6,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "Robinhood prediction-market rows use model probability minus ask cents. This is a prediction-market value lane, not sportsbook arbitrage.",
      "ml": {
        "marketType": "Prediction-market ML",
        "selection": "Damir Dzumhur",
        "americanOdds": null,
        "priceCents": 63,
        "modelPct": 67.6,
        "impliedPct": 63,
        "edgePct": 4.6,
        "predictionMarketEdgePct": 4.6,
        "evPer100": 4.6,
        "netEvPer100": 4.6,
        "expectedCents": 4.6,
        "maxEntryCents": 65.6,
        "feePer100": null,
        "valueIssue": "Model is above the prediction-market ask, but not a validated sportsbook EV lane.",
        "valueGrade": "Prediction-market watch",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Damir Dzumhur",
        "line": null,
        "americanOdds": null,
        "modelPct": 61.599999999999994,
        "valueIssue": "Robinhood did not expose a game-spread market for this event.",
        "valueGrade": "Needs posted number",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "line": null,
        "americanOdds": null,
        "modelPct": 59.599999999999994,
        "valueIssue": "Robinhood did not expose a match-total market for this event.",
        "valueGrade": "Needs posted total",
        "reason": "No posted match-total line captured.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 8.8,
        "confidence": 50,
        "tiebreakRisk": 38,
        "earlyBreakRisk": 62,
        "modelPct": 50,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Taro Daniel",
          "confidence": 54,
          "modelPct": 33.2,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Damir Dzumhur",
          "confidence": 76,
          "modelPct": 67.6,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": null,
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Damir Dzumhur",
        "line": null,
        "americanOdds": null,
        "modelPct": 67.6,
        "impliedPct": 63,
        "edgePct": 4.6,
        "evPer100": 4.6,
        "netEvPer100": 4.6,
        "grade": "Prediction-market watch",
        "issue": "Model is above the prediction-market ask, but not a validated sportsbook EV lane.",
        "reason": "Prediction-market watch lane; model is above the ask, but sizing still needs live liquidity."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Damir Dzumhur",
        "line": null,
        "americanOdds": null,
        "modelPct": 61.599999999999994,
        "impliedPct": null,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 61.599999999999994,
        "grade": "Needs posted number",
        "reason": "No spread line"
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": null,
        "americanOdds": null,
        "modelPct": 59.599999999999994,
        "impliedPct": null,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 59.599999999999994,
        "grade": "Needs posted total",
        "reason": "Total games need expected match games vs the posted line."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Taro Daniel 54% / Damir Dzumhur 76%",
        "rows": [
          {
            "name": "Taro Daniel",
            "confidence": 54,
            "modelPct": 33.2,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Damir Dzumhur",
            "confidence": 76,
            "modelPct": 67.6,
            "label": "Market favorite to win a set"
          }
        ],
        "confidence": 76,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Price required",
        "expectedGames": 8.8,
        "confidence": 50,
        "tiebreakRisk": 38,
        "earlyBreakRisk": 62,
        "grade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone."
      }
    ],
    "ensembleValueCase": null,
    "marketData": {
      "source": "Robinhood prediction market",
      "sourceDetail": "Robinhood public prediction-markets tennis page",
      "capturedAt": null,
      "eventUrl": "https://robinhood.com/us/en/prediction-markets/tennis/",
      "eventId": "d616d79f-b797-4ee1-b3d4-37f484378a5d",
      "totalOpenInterest": 53,
      "totalVolume": 0,
      "players": [
        {
          "name": "Taro Daniel",
          "odds": null,
          "americanLabel": "39c",
          "impliedPct": 39,
          "bidPct": 37,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 33.2,
          "edgePct": -5.8,
          "predictionMarketEdgePct": -5.8,
          "grossExpectedCents": -5.8,
          "netExpectedCents": -5.8,
          "maxEntryCents": 31.2,
          "priceBand": "Underdog",
          "grossProfitPct": 61,
          "grossPayoutMultiple": 2.564,
          "centsAtRisk": 39,
          "centsProfitIfWin": 61,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN04DANDZU-DAN"
        },
        {
          "name": "Damir Dzumhur",
          "odds": null,
          "americanLabel": "63c",
          "impliedPct": 63,
          "bidPct": 61,
          "lastTradePct": 63,
          "decimalOdds": null,
          "modelPct": 67.6,
          "edgePct": 4.6,
          "predictionMarketEdgePct": 4.6,
          "grossExpectedCents": 4.6,
          "netExpectedCents": 4.6,
          "maxEntryCents": 65.6,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 37,
          "grossPayoutMultiple": 1.587,
          "centsAtRisk": 63,
          "centsProfitIfWin": 37,
          "openInterest": 53,
          "symbol": "KXATPCHALLENGERMATCH-26JUN04DANDZU-DZU"
        }
      ],
      "desk": {
        "name": "Damir Dzumhur",
        "odds": null,
        "americanLabel": "63c",
        "impliedPct": 63,
        "bidPct": 61,
        "lastTradePct": 63,
        "decimalOdds": null,
        "modelPct": 67.6,
        "edgePct": 4.6,
        "predictionMarketEdgePct": 4.6,
        "grossExpectedCents": 4.6,
        "netExpectedCents": 4.6,
        "maxEntryCents": 65.6,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 37,
        "grossPayoutMultiple": 1.587,
        "centsAtRisk": 63,
        "centsProfitIfWin": 37,
        "openInterest": 53,
        "symbol": "KXATPCHALLENGERMATCH-26JUN04DANDZU-DZU"
      },
      "priceAction": "Prediction-market watch lane; model is above the ask, but sizing still needs live liquidity.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Taro Daniel 39c / Damir Dzumhur 63c",
      "marketNote": "Robinhood prediction-market prices captured: Taro Daniel 39c / Damir Dzumhur 63c. Prediction-market watch lane; model is above the ask, but sizing still needs live liquidity.",
      "noVigNote": "Prediction-market cents only; this is model-vs-ask edge, not sportsbook moneyline EV."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Taro-Daniel-Vs-Damir-Dzumhur/",
    "players": [
      {
        "name": "Taro Daniel",
        "ranking": {
          "name": "Taro Daniel",
          "rank": 319,
          "points": 161,
          "age": 33.3,
          "country": "JPN",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "asOf": "2026-05-26"
        },
        "qualityName": "Taro Daniel",
        "profile": "Clay | Live rank #319 | JPN | age 33.3 | hold 25%",
        "modelPct": 33.2,
        "weakness": {
          "name": "Taro Daniel",
          "serviceHoldPct": 25,
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
          "weaknessScore": 39,
          "firstGameComfort": "Fragile opening-service profile",
          "liabilities": [
            "low recent hold rate (25%)"
          ],
          "strengths": [],
          "gameFlowRead": "Taro Daniel can drop points quickly through low recent hold rate (25%)."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      },
      {
        "name": "Damir Dzumhur",
        "ranking": {
          "name": "Damir Dzumhur",
          "rank": 87,
          "points": 694,
          "age": 34,
          "country": "Bosnia and Herzegovina",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "asOf": "2026-06-02"
        },
        "qualityName": "Damir Dzumhur",
        "profile": "Clay | Live rank #87 | Bosnia and Herzegovina | age 34 | hold 100%",
        "modelPct": 67.6,
        "weakness": {
          "name": "Damir Dzumhur",
          "serviceHoldPct": 100,
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
          "strengths": [
            "protects serve well (100% hold)"
          ],
          "gameFlowRead": "Damir Dzumhur has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-birmingham-bolt-vs-fery-2026-06-04",
    "eventId": "13fd8adb-b1be-42ad-9a35-52015a9352e7",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Grass",
    "surfaceSource": "Grass tournament surface",
    "title": "Arthur Fery vs Alex Bolt",
    "start": "5:00 AM",
    "startMinutes": 300,
    "court": "ATP Challenger Birmingham",
    "round": "Round Of 16",
    "stage": "ATP Challenger Birmingham | Round Of 16",
    "pickName": "Alex Bolt",
    "basePickName": "Alex Bolt",
    "modelSource": "Flashscore/SofaScore warehouse Challenger model",
    "modelSplit": false,
    "marketOnly": false,
    "confidence": 52,
    "volatility": 56,
    "tags": [
      "ATP Challenger",
      "Grass",
      "Prediction market",
      "Warehouse joined",
      "Flashscore first",
      "Coinflip price"
    ],
    "reason": "Alex Bolt has the recent service-hold edge 75% to 40%. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "Weakness edge",
      "target": "Arthur Fery",
      "scoreGap": 25,
      "attackingSide": "Alex Bolt",
      "vulnerableSide": "Arthur Fery",
      "gameFlow": "Alex Bolt has a real path if Arthur Fery's first two service games show the same weakness: low recent hold rate (40%).",
      "liveTrigger": "Look for Arthur Fery facing break points or second-serve pressure before 3-3.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "Avoid low unders if Arthur Fery faces early break points or second-serve pressure.",
      "pick": {
        "name": "Alex Bolt",
        "serviceHoldPct": 75,
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
        "gameFlowRead": "Alex Bolt has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Arthur Fery",
        "serviceHoldPct": 40,
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
        "weaknessScore": 25,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "low recent hold rate (40%)"
        ],
        "strengths": [],
        "gameFlowRead": "Arthur Fery can drop points quickly through low recent hold rate (40%)."
      }
    },
    "setWinProjections": [
      {
        "name": "Arthur Fery",
        "confidence": 70,
        "modelPct": 49.3,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Alex Bolt",
        "confidence": 60,
        "modelPct": 52,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Alex Bolt",
        "americanOdds": -126,
        "modelPct": 52,
        "impliedPct": 55.8,
        "edgePct": -3.8,
        "evPer100": -6.7,
        "netEvPer100": -8.7,
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
        "expectedGames": null,
        "valueGrade": "No direction",
        "reason": "No posted match total captured.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Pass / near line",
        "line": 9.5,
        "americanOdds": null,
        "expectedGames": 9.5,
        "confidence": 50,
        "tiebreakRisk": 38,
        "earlyBreakRisk": 62,
        "modelPct": 50,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Near fair",
        "reason": "Expected first-set games 9.5 vs DraftKings Sportsbook 9.5; Pass / near line.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Arthur Fery",
          "confidence": 70,
          "modelPct": 49.3,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Alex Bolt",
          "confidence": 60,
          "modelPct": 52,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": null,
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Alex Bolt",
        "line": null,
        "americanOdds": -126,
        "modelPct": 52,
        "impliedPct": 55.8,
        "edgePct": -3.8,
        "evPer100": -6.7,
        "netEvPer100": -8.7,
        "grade": "Negative EV",
        "issue": "Favorite price needs better proof",
        "reason": "ML is close to fair; derivative or live entry needs to carry the edge."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": null,
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
        "selection": "Arthur Fery 70% / Alex Bolt 60%",
        "rows": [
          {
            "name": "Arthur Fery",
            "confidence": 70,
            "modelPct": 49.3,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Alex Bolt",
            "confidence": 60,
            "modelPct": 52,
            "label": "Market favorite to win a set"
          }
        ],
        "confidence": 70,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Pass / near line",
        "expectedGames": 9.5,
        "confidence": 50,
        "tiebreakRisk": 38,
        "earlyBreakRisk": 62,
        "grade": "Near fair",
        "reason": "Expected first-set games 9.5 vs DraftKings Sportsbook 9.5; Pass / near line."
      }
    ],
    "ensembleValueCase": null,
    "marketData": {
      "source": "DraftKings Sportsbook",
      "sourceDetail": "DraftKings Sportsbook BFF",
      "capturedAt": "2026-06-04T03:58:48.521Z",
      "eventUrl": "https://sportsbook.draftkings.com/leagues/tennis/challenger-birmingham?event=34235270",
      "eventId": "34235270",
      "players": [
        {
          "name": "Arthur Fery",
          "odds": -103,
          "americanLabel": "-103",
          "impliedPct": 50.7,
          "decimalOdds": 1.971,
          "modelPct": 49.3,
          "edgePct": -1.4,
          "priceBand": "Coinflip",
          "grossProfitPct": 97.1,
          "grossPayoutMultiple": 1.971,
          "centsAtRisk": 100,
          "centsProfitIfWin": 97.1
        },
        {
          "name": "Alex Bolt",
          "odds": -126,
          "americanLabel": "-126",
          "impliedPct": 55.8,
          "decimalOdds": 1.794,
          "modelPct": 52,
          "edgePct": -3.8,
          "priceBand": "Coinflip",
          "grossProfitPct": 79.4,
          "grossPayoutMultiple": 1.794,
          "centsAtRisk": 100,
          "centsProfitIfWin": 79.4
        }
      ],
      "desk": {
        "name": "Alex Bolt",
        "odds": -126,
        "americanLabel": "-126",
        "impliedPct": 55.8,
        "decimalOdds": 1.794,
        "modelPct": 52,
        "edgePct": -3.8,
        "priceBand": "Coinflip",
        "grossProfitPct": 79.4,
        "grossPayoutMultiple": 1.794,
        "centsAtRisk": 100,
        "centsProfitIfWin": 79.4
      },
      "spread": null,
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": -165
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": -165
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": 110
      },
      "firstServiceGameTotalPoints": [],
      "firstGameProps": [],
      "setWinMarkets": [],
      "priceAction": "ML is close to fair; derivative or live entry needs to carry the edge.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "9.5 1st-set games: Over -165 / Under +110",
      "firstServiceGameValue": "No first-service-game market captured",
      "firstGamePropsValue": "No first-game prop market captured",
      "setWinValue": "No set-win price captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Arthur Fery -103 / Alex Bolt -126",
      "marketNote": "DraftKings Sportsbook ML, game handicap, match total, first-set total, set-win, and first-service-game markets captured where available. ML is close to fair; derivative or live entry needs to carry the edge.",
      "noVigNote": "Model 52% vs DraftKings Sportsbook implied 55.8% (-3.8 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Arthur-Fery-Vs-Alex-Bolt/",
    "players": [
      {
        "name": "Arthur Fery",
        "ranking": {
          "name": "Arthur Fery",
          "rank": 144,
          "points": 409,
          "age": 23.8,
          "country": "GBR",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "asOf": "2026-05-26"
        },
        "qualityName": "Arthur Fery",
        "profile": "Grass | Live rank #144 | GBR | age 23.8 | hold 40%",
        "modelPct": 49.3,
        "weakness": {
          "name": "Arthur Fery",
          "serviceHoldPct": 40,
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
          "weaknessScore": 25,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "low recent hold rate (40%)"
          ],
          "strengths": [],
          "gameFlowRead": "Arthur Fery can drop points quickly through low recent hold rate (40%)."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      },
      {
        "name": "Alex Bolt",
        "ranking": {
          "name": "Alex Bolt",
          "rank": 155,
          "points": 385,
          "age": 33.3,
          "country": "AUS",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "asOf": "2026-05-26"
        },
        "qualityName": "Alex Bolt",
        "profile": "Grass | Live rank #155 | AUS | age 33.3 | hold 75%",
        "modelPct": 52,
        "weakness": {
          "name": "Alex Bolt",
          "serviceHoldPct": 75,
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
          "gameFlowRead": "Alex Bolt has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      }
    ]
  },
  {
    "id": "rh-french-open-women-singles-kostyuk-vs-andreeva-2026-06-04",
    "eventId": "9e8856ff-b49c-4bc2-b649-4797bcb3e373",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Clay",
    "surfaceSource": "Grand Slam tournament surface",
    "title": "Marta Kostyuk vs Mirra Andreeva",
    "start": "6:00 AM",
    "startMinutes": 360,
    "court": "French Open Women Singles",
    "round": "Semifinal",
    "stage": "French Open Women Singles | Semifinal",
    "pickName": "Mirra Andreeva",
    "basePickName": "Mirra Andreeva",
    "modelSource": "Flashscore/SofaScore warehouse Challenger model",
    "modelSplit": false,
    "marketOnly": false,
    "confidence": 50.6,
    "volatility": 47,
    "tags": [
      "ATP Challenger",
      "Clay",
      "Prediction market",
      "Warehouse joined",
      "Flashscore first",
      "Coinflip price"
    ],
    "reason": "Mirra Andreeva has the cleaner composite of rank, clay record, and recent opponent quality. Lean, not a chase.",
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
        "gameFlowRead": "Mirra Andreeva has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Marta Kostyuk",
        "serviceHoldPct": 75,
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
        "gameFlowRead": "Marta Kostyuk has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Marta Kostyuk",
        "confidence": 71,
        "modelPct": 50.2,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Mirra Andreeva",
        "confidence": 59,
        "modelPct": 50.6,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Mirra Andreeva",
        "americanOdds": 116,
        "modelPct": 50.6,
        "impliedPct": 46.3,
        "edgePct": 4.3,
        "evPer100": 9.3,
        "netEvPer100": 7.3,
        "feePer100": 2,
        "valueIssue": "Raw ML edge only",
        "valueGrade": "Raw ML edge only",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Mirra Andreeva",
        "line": 1.5,
        "americanOdds": -110,
        "modelPct": 45,
        "impliedPct": 52.4,
        "edgePct": -7.4,
        "evPer100": -14.1,
        "netEvPer100": -16.1,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "line": 21.5,
        "overOdds": -115,
        "underOdds": -125,
        "expectedGames": null,
        "valueGrade": "No direction",
        "reason": "DraftKings Sportsbook total is 21.5; model did not clear a full-match over/under edge from hold, return, and set-shape data. .",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Pass / near line",
        "line": 9.5,
        "americanOdds": null,
        "expectedGames": 9.5,
        "confidence": 50,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 50,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Near fair",
        "reason": "Expected first-set games 9.5 vs DraftKings Sportsbook 9.5; Pass / near line.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Marta Kostyuk",
          "confidence": 71,
          "modelPct": 50.2,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Mirra Andreeva",
          "confidence": 59,
          "modelPct": 50.6,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": null,
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Mirra Andreeva",
        "line": null,
        "americanOdds": 116,
        "modelPct": 50.6,
        "impliedPct": 46.3,
        "edgePct": 4.3,
        "evPer100": 9.3,
        "netEvPer100": 7.3,
        "grade": "Raw ML edge only",
        "issue": "Raw ML edge only",
        "reason": "ML is close to fair; derivative or live entry needs to carry the edge."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Mirra Andreeva",
        "line": 1.5,
        "americanOdds": -110,
        "modelPct": 45,
        "impliedPct": 52.4,
        "edgePct": -7.4,
        "evPer100": -14.1,
        "netEvPer100": -16.1,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 45,
        "grade": "Negative EV",
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
        "selection": "Marta Kostyuk 71% / Mirra Andreeva 59%",
        "rows": [
          {
            "name": "Marta Kostyuk",
            "confidence": 71,
            "modelPct": 50.2,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Mirra Andreeva",
            "confidence": 59,
            "modelPct": 50.6,
            "label": "Market favorite to win a set"
          }
        ],
        "confidence": 71,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Pass / near line",
        "expectedGames": 9.5,
        "confidence": 50,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "grade": "Near fair",
        "reason": "Expected first-set games 9.5 vs DraftKings Sportsbook 9.5; Pass / near line."
      }
    ],
    "ensembleValueCase": null,
    "marketData": {
      "source": "DraftKings Sportsbook",
      "sourceDetail": "DraftKings Sportsbook BFF",
      "capturedAt": "2026-06-04T03:58:17.369Z",
      "eventUrl": "https://sportsbook.draftkings.com/leagues/tennis/french-open-women?event=34235049",
      "eventId": "34235049",
      "players": [
        {
          "name": "Marta Kostyuk",
          "odds": -142,
          "americanLabel": "-142",
          "impliedPct": 58.7,
          "decimalOdds": 1.704,
          "modelPct": 50.2,
          "edgePct": -8.5,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 70.4,
          "grossPayoutMultiple": 1.704,
          "centsAtRisk": 100,
          "centsProfitIfWin": 70.4
        },
        {
          "name": "Mirra Andreeva",
          "odds": 116,
          "americanLabel": "+116",
          "impliedPct": 46.3,
          "decimalOdds": 2.16,
          "modelPct": 50.6,
          "edgePct": 4.3,
          "priceBand": "Coinflip",
          "grossProfitPct": 116,
          "grossPayoutMultiple": 2.16,
          "centsAtRisk": 100,
          "centsProfitIfWin": 116
        }
      ],
      "desk": {
        "name": "Mirra Andreeva",
        "odds": 116,
        "americanLabel": "+116",
        "impliedPct": 46.3,
        "decimalOdds": 2.16,
        "modelPct": 50.6,
        "edgePct": 4.3,
        "priceBand": "Coinflip",
        "grossProfitPct": 116,
        "grossPayoutMultiple": 2.16,
        "centsAtRisk": 100,
        "centsProfitIfWin": 116
      },
      "spread": {
        "player": "Mirra Andreeva",
        "spread": 1.5,
        "odds": -110
      },
      "total": {
        "side": "Over",
        "line": 21.5,
        "odds": -115
      },
      "totalOver": {
        "side": "Over",
        "line": 21.5,
        "odds": -115
      },
      "totalUnder": {
        "side": "Under",
        "line": 21.5,
        "odds": -125
      },
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": 105
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": 105
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": -150
      },
      "firstServiceGameTotalPoints": [
        {
          "player": "Marta Kostyuk",
          "market": "Marta Kostyuk’s 1st Service Game - Winner",
          "side": "Marta Kostyuk",
          "line": null,
          "odds": -225
        },
        {
          "player": "Marta Kostyuk",
          "market": "Marta Kostyuk’s 1st Service Game - Winner",
          "side": "Mirra Andreeva",
          "line": null,
          "odds": 160
        },
        {
          "player": "Mirra Andreeva",
          "market": "Mirra Andreeva’s 1st Service Game - Winner",
          "side": "Marta Kostyuk",
          "line": null,
          "odds": 135
        },
        {
          "player": "Mirra Andreeva",
          "market": "Mirra Andreeva’s 1st Service Game - Winner",
          "side": "Mirra Andreeva",
          "line": null,
          "odds": -185
        },
        {
          "player": "Marta Kostyuk",
          "market": "Marta Kostyuk’s 1st Service Game - 1st Point",
          "side": "Marta Kostyuk",
          "line": null,
          "odds": -150
        },
        {
          "player": "Marta Kostyuk",
          "market": "Marta Kostyuk’s 1st Service Game - 1st Point",
          "side": "Mirra Andreeva",
          "line": null,
          "odds": 110
        },
        {
          "player": "Mirra Andreeva",
          "market": "Mirra Andreeva’s 1st Service Game - 1st Point",
          "side": "Marta Kostyuk",
          "line": null,
          "odds": 100
        },
        {
          "player": "Mirra Andreeva",
          "market": "Mirra Andreeva’s 1st Service Game - 1st Point",
          "side": "Mirra Andreeva",
          "line": null,
          "odds": -140
        },
        {
          "player": "Marta Kostyuk",
          "market": "Marta Kostyuk's 1st Service Game - Win to Love or 15",
          "side": "Yes",
          "line": null,
          "odds": 225
        },
        {
          "player": "Marta Kostyuk",
          "market": "Marta Kostyuk's 1st Service Game - Win to Love or 15",
          "side": "No",
          "line": null,
          "odds": -330
        },
        {
          "player": "Mirra Andreeva",
          "market": "Mirra Andreeva's 1st Service Game - Win to Love or 15",
          "side": "Yes",
          "line": null,
          "odds": 240
        },
        {
          "player": "Mirra Andreeva",
          "market": "Mirra Andreeva's 1st Service Game - Win to Love or 15",
          "side": "No",
          "line": null,
          "odds": -380
        },
        {
          "player": "Marta Kostyuk",
          "market": "Marta Kostyuk's 1st Service Game - Win to Love, 15 or 30",
          "side": "Yes",
          "line": null,
          "odds": 100
        },
        {
          "player": "Marta Kostyuk",
          "market": "Marta Kostyuk's 1st Service Game - Win to Love, 15 or 30",
          "side": "No",
          "line": null,
          "odds": -140
        },
        {
          "player": "Mirra Andreeva",
          "market": "Mirra Andreeva's 1st Service Game - Win to Love, 15 or 30",
          "side": "Yes",
          "line": null,
          "odds": 110
        },
        {
          "player": "Mirra Andreeva",
          "market": "Mirra Andreeva's 1st Service Game - Win to Love, 15 or 30",
          "side": "No",
          "line": null,
          "odds": -150
        }
      ],
      "firstGameProps": [
        {
          "market": "First 2 Game Props",
          "selection": "All Holds of Serve",
          "odds": 120
        },
        {
          "market": "First 2 Game Props",
          "selection": "Break Point in Every Game",
          "odds": 200
        },
        {
          "market": "First 2 Game Props",
          "selection": "All Breaks of Serve",
          "odds": 500
        },
        {
          "market": "First 4 Game Props",
          "selection": "All Holds of Serve",
          "odds": 330
        },
        {
          "market": "First 4 Game Props",
          "selection": "Break Point in Every Game",
          "odds": 800
        },
        {
          "market": "First 4 Game Props",
          "selection": "All Breaks of Serve",
          "odds": 2500
        }
      ],
      "setWinMarkets": [
        {
          "market": "Player to Win at Least One Set",
          "player": "Marta Kostyuk",
          "selection": "Marta Kostyuk Yes",
          "odds": -350
        },
        {
          "market": "Player to Win at Least One Set",
          "player": "Marta Kostyuk",
          "selection": "Marta Kostyuk No",
          "odds": 250
        },
        {
          "market": "Player to Win at Least One Set",
          "player": "Mirra Andreeva",
          "selection": "Mirra Andreeva Yes",
          "odds": -215
        },
        {
          "market": "Player to Win at Least One Set",
          "player": "Mirra Andreeva",
          "selection": "Mirra Andreeva No",
          "odds": 160
        }
      ],
      "priceAction": "ML is close to fair; derivative or live entry needs to carry the edge.",
      "spreadValue": "Mirra Andreeva +1.5 (-110)",
      "totalValue": "21.5 games: Over -115 / Under -125",
      "firstSetTotalValue": "9.5 1st-set games: Over +105 / Under -150",
      "firstServiceGameValue": "16 first-service-game prices captured",
      "firstGamePropsValue": "First 2 Game Props: All Holds of Serve +120 / First 2 Game Props: Break Point in Every Game +200 / First 2 Game Props: All Breaks of Serve +500 / First 4 Game Props: All Holds of Serve +330 / First 4 Game Props: Break Point in Every Game +800 / First 4 Game Props: All Breaks of Serve +2500",
      "setWinValue": "Marta Kostyuk Yes -350 / Marta Kostyuk No +250 / Mirra Andreeva Yes -215 / Mirra Andreeva No +160",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Marta Kostyuk -142 / Mirra Andreeva +116",
      "marketNote": "DraftKings Sportsbook ML, game handicap, match total, first-set total, set-win, and first-service-game markets captured where available. ML is close to fair; derivative or live entry needs to carry the edge.",
      "noVigNote": "Model 50.6% vs DraftKings Sportsbook implied 46.3% (+4.3 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Marta-Kostyuk-Vs-Mirra-Andreeva/",
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
          "asOf": "2026-06-02"
        },
        "qualityName": "Marta Kostyuk",
        "profile": "Clay | Live rank #15 | Ukraine | age 23 | hold 75%",
        "modelPct": 50.2,
        "weakness": {
          "name": "Marta Kostyuk",
          "serviceHoldPct": 75,
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
          "gameFlowRead": "Marta Kostyuk has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      },
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
          "asOf": "2026-06-02"
        },
        "qualityName": "Mirra Andreeva",
        "profile": "Clay | Live rank #8 | Russia | age 19",
        "modelPct": 50.6,
        "weakness": {
          "name": "Mirra Andreeva",
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
          "gameFlowRead": "Mirra Andreeva has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-birmingham-wendelken-vs-lajal-2026-06-04",
    "eventId": "df0b2709-b39f-4caf-a8f4-4ed3bb6442b4",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Grass",
    "surfaceSource": "Grass tournament surface",
    "title": "Harry Wendelken vs Mark Lajal",
    "start": "6:10 AM",
    "startMinutes": 370,
    "court": "ATP Challenger Birmingham",
    "round": "Round Of 16",
    "stage": "ATP Challenger Birmingham | Round Of 16",
    "pickName": "Mark Lajal",
    "basePickName": "Mark Lajal",
    "modelSource": "Flashscore/SofaScore warehouse Challenger model",
    "modelSplit": false,
    "marketOnly": false,
    "confidence": 58.7,
    "volatility": 48,
    "tags": [
      "ATP Challenger",
      "Grass",
      "Prediction market",
      "Warehouse joined",
      "Flashscore first",
      "Coinflip price"
    ],
    "reason": "Mark Lajal has the recent service-hold edge 100% to 75%. Lean, not a chase.",
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
        "name": "Mark Lajal",
        "serviceHoldPct": 100,
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
        "strengths": [
          "protects serve well (100% hold)"
        ],
        "gameFlowRead": "Mark Lajal has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
        "name": "Harry Wendelken",
        "serviceHoldPct": 75,
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
        "gameFlowRead": "Harry Wendelken has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Harry Wendelken",
        "confidence": 63,
        "modelPct": 42.1,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Mark Lajal",
        "confidence": 67,
        "modelPct": 58.7,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Mark Lajal",
        "americanOdds": -252,
        "modelPct": 58.7,
        "impliedPct": 71.6,
        "edgePct": -12.9,
        "evPer100": -18,
        "netEvPer100": -20,
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
        "expectedGames": null,
        "valueGrade": "No direction",
        "reason": "No posted match total captured.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Under 9.5",
        "line": 9.5,
        "americanOdds": -105,
        "expectedGames": 9.2,
        "confidence": 52,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 52,
        "evPer100": 1.5,
        "netEvPer100": -0.5,
        "valueGrade": "Near fair",
        "reason": "Expected first-set games 9.2 vs DraftKings Sportsbook 9.5; Under 9.5.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Harry Wendelken",
          "confidence": 63,
          "modelPct": 42.1,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Mark Lajal",
          "confidence": 67,
          "modelPct": 58.7,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": null,
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Mark Lajal",
        "line": null,
        "americanOdds": -252,
        "modelPct": 58.7,
        "impliedPct": 71.6,
        "edgePct": -12.9,
        "evPer100": -18,
        "netEvPer100": -20,
        "grade": "Negative EV",
        "issue": "Favorite price needs better proof",
        "reason": "Favorite price has limited payout; require a strong weakness edge or use spread/total."
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": null,
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
        "selection": "Harry Wendelken 63% / Mark Lajal 67%",
        "rows": [
          {
            "name": "Harry Wendelken",
            "confidence": 63,
            "modelPct": 42.1,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Mark Lajal",
            "confidence": 67,
            "modelPct": 58.7,
            "label": "Market favorite to win a set"
          }
        ],
        "confidence": 67,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Under 9.5",
        "expectedGames": 9.2,
        "confidence": 52,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "grade": "Near fair",
        "reason": "Expected first-set games 9.2 vs DraftKings Sportsbook 9.5; Under 9.5."
      }
    ],
    "ensembleValueCase": null,
    "marketData": {
      "source": "DraftKings Sportsbook",
      "sourceDetail": "DraftKings Sportsbook BFF",
      "capturedAt": "2026-06-04T03:58:50.177Z",
      "eventUrl": "https://sportsbook.draftkings.com/leagues/tennis/challenger-birmingham?event=34235869",
      "eventId": "34235869",
      "players": [
        {
          "name": "Harry Wendelken",
          "odds": 186,
          "americanLabel": "+186",
          "impliedPct": 35,
          "decimalOdds": 2.86,
          "modelPct": 42.1,
          "edgePct": 7.1,
          "priceBand": "Underdog",
          "grossProfitPct": 186,
          "grossPayoutMultiple": 2.86,
          "centsAtRisk": 100,
          "centsProfitIfWin": 186
        },
        {
          "name": "Mark Lajal",
          "odds": -252,
          "americanLabel": "-252",
          "impliedPct": 71.6,
          "decimalOdds": 1.397,
          "modelPct": 58.7,
          "edgePct": -12.9,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 39.7,
          "grossPayoutMultiple": 1.397,
          "centsAtRisk": 100,
          "centsProfitIfWin": 39.7
        }
      ],
      "desk": {
        "name": "Mark Lajal",
        "odds": -252,
        "americanLabel": "-252",
        "impliedPct": 71.6,
        "decimalOdds": 1.397,
        "modelPct": 58.7,
        "edgePct": -12.9,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 39.7,
        "grossPayoutMultiple": 1.397,
        "centsAtRisk": 100,
        "centsProfitIfWin": 39.7
      },
      "spread": null,
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": -140
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": -140
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": -105
      },
      "firstServiceGameTotalPoints": [],
      "firstGameProps": [],
      "setWinMarkets": [],
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "No primary game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "9.5 1st-set games: Over -140 / Under -105",
      "firstServiceGameValue": "No first-service-game market captured",
      "firstGamePropsValue": "No first-game prop market captured",
      "setWinValue": "No set-win price captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Harry Wendelken +186 / Mark Lajal -252",
      "marketNote": "DraftKings Sportsbook ML, game handicap, match total, first-set total, set-win, and first-service-game markets captured where available. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 58.7% vs DraftKings Sportsbook implied 71.6% (-12.9 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Harry-Wendelken-Vs-Mark-Lajal/",
    "players": [
      {
        "name": "Harry Wendelken",
        "ranking": {
          "name": "Harry Wendelken",
          "rank": 225,
          "points": 253,
          "age": 24.4,
          "country": "GBR",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "asOf": "2026-05-26"
        },
        "qualityName": "Harry Wendelken",
        "profile": "Grass | Live rank #225 | GBR | age 24.4 | hold 75%",
        "modelPct": 42.1,
        "weakness": {
          "name": "Harry Wendelken",
          "serviceHoldPct": 75,
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
          "gameFlowRead": "Harry Wendelken has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      },
      {
        "name": "Mark Lajal",
        "ranking": {
          "name": "Mark Lajal",
          "rank": 154,
          "points": 386,
          "age": 23,
          "country": "EST",
          "tour": "ATP",
          "source": "https://live-tennis.eu/en/atp-live-ranking browser snapshot",
          "asOf": "2026-05-26"
        },
        "qualityName": "Mark Lajal",
        "profile": "Grass | Live rank #154 | EST | age 23 | hold 100%",
        "modelPct": 58.7,
        "weakness": {
          "name": "Mark Lajal",
          "serviceHoldPct": 100,
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
          "strengths": [
            "protects serve well (100% hold)"
          ],
          "gameFlowRead": "Mark Lajal has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 8,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      }
    ]
  },
  {
    "id": "rh-french-open-women-singles-shnaider-vs-chwalinska-2026-06-04",
    "eventId": "7a0f01d9-97b9-44ff-8907-043c9567a396",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Clay",
    "surfaceSource": "Grand Slam tournament surface",
    "title": "Diana Shnaider vs Maja Chwalinska",
    "start": "7:10 AM",
    "startMinutes": 430,
    "court": "French Open Women Singles",
    "round": "Semifinal",
    "stage": "French Open Women Singles | Semifinal",
    "pickName": "Diana Shnaider",
    "basePickName": "Diana Shnaider",
    "modelSource": "Flashscore/SofaScore warehouse Challenger model",
    "modelSplit": false,
    "marketOnly": false,
    "confidence": 62.8,
    "volatility": 40,
    "tags": [
      "ATP Challenger",
      "Clay",
      "Prediction market",
      "Warehouse joined",
      "Flashscore first",
      "Coinflip price"
    ],
    "reason": "Diana Shnaider has the cleaner composite of rank, clay record, and recent opponent quality. Lean, not a chase.",
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
        "name": "Diana Shnaider",
        "serviceHoldPct": 100,
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
        "strengths": [
          "protects serve well (100% hold)"
        ],
        "gameFlowRead": "Diana Shnaider has no major service weakness in the joined Flashscore sample."
      },
      "opponent": {
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
        "pressureMatches": null,
        "matchesWithStats": 0,
        "weaknessScore": 0,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [],
        "gameFlowRead": "Maja Chwalinska has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Diana Shnaider",
        "confidence": 71,
        "modelPct": 62.8,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Maja Chwalinska",
        "confidence": 59,
        "modelPct": 38,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Diana Shnaider",
        "americanOdds": -190,
        "modelPct": 62.8,
        "impliedPct": 65.5,
        "edgePct": -2.7,
        "evPer100": -4.1,
        "netEvPer100": -6.1,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Diana Shnaider",
        "line": -3.5,
        "americanOdds": -115,
        "modelPct": 57,
        "impliedPct": 53.5,
        "edgePct": 3.5,
        "evPer100": 6.6,
        "netEvPer100": 4.6,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Raw positive EV",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "line": 21.5,
        "overOdds": -115,
        "underOdds": -125,
        "expectedGames": null,
        "valueGrade": "No direction",
        "reason": "DraftKings Sportsbook total is 21.5; model did not clear a full-match over/under edge from hold, return, and set-shape data. .",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Under 9.5",
        "line": 9.5,
        "americanOdds": -150,
        "expectedGames": 8.8,
        "confidence": 56,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 56,
        "evPer100": -6.7,
        "netEvPer100": -8.7,
        "valueGrade": "Thin value",
        "reason": "Expected first-set games 8.8 vs DraftKings Sportsbook 9.5; Under 9.5.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Diana Shnaider",
          "confidence": 71,
          "modelPct": 62.8,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Maja Chwalinska",
          "confidence": 59,
          "modelPct": 38,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        }
      ]
    },
    "totalsProfile": null,
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Diana Shnaider",
        "line": null,
        "americanOdds": -190,
        "modelPct": 62.8,
        "impliedPct": 65.5,
        "edgePct": -2.7,
        "evPer100": -4.1,
        "netEvPer100": -6.1,
        "grade": "Negative EV",
        "issue": "Favorite price needs better proof",
        "reason": "ML is close to fair; derivative or live entry needs to carry the edge."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Diana Shnaider",
        "line": -3.5,
        "americanOdds": -115,
        "modelPct": 57,
        "impliedPct": 53.5,
        "edgePct": 3.5,
        "evPer100": 6.6,
        "netEvPer100": 4.6,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 57,
        "grade": "Raw positive EV",
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
        "selection": "Diana Shnaider 71% / Maja Chwalinska 59%",
        "rows": [
          {
            "name": "Diana Shnaider",
            "confidence": 71,
            "modelPct": 62.8,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Maja Chwalinska",
            "confidence": 59,
            "modelPct": 38,
            "label": "Underdog set-win path needs early holds"
          }
        ],
        "confidence": 71,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Under 9.5",
        "expectedGames": 8.8,
        "confidence": 56,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "grade": "Thin value",
        "reason": "Expected first-set games 8.8 vs DraftKings Sportsbook 9.5; Under 9.5."
      }
    ],
    "ensembleValueCase": null,
    "marketData": {
      "source": "DraftKings Sportsbook",
      "sourceDetail": "DraftKings Sportsbook BFF",
      "capturedAt": "2026-06-04T03:58:18.848Z",
      "eventUrl": "https://sportsbook.draftkings.com/leagues/tennis/french-open-women?event=34239299",
      "eventId": "34239299",
      "players": [
        {
          "name": "Diana Shnaider",
          "odds": -190,
          "americanLabel": "-190",
          "impliedPct": 65.5,
          "decimalOdds": 1.526,
          "modelPct": 62.8,
          "edgePct": -2.7,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 52.6,
          "grossPayoutMultiple": 1.526,
          "centsAtRisk": 100,
          "centsProfitIfWin": 52.6
        },
        {
          "name": "Maja Chwalinska",
          "odds": 154,
          "americanLabel": "+154",
          "impliedPct": 39.4,
          "decimalOdds": 2.54,
          "modelPct": 38,
          "edgePct": -1.4,
          "priceBand": "Underdog",
          "grossProfitPct": 154,
          "grossPayoutMultiple": 2.54,
          "centsAtRisk": 100,
          "centsProfitIfWin": 154
        }
      ],
      "desk": {
        "name": "Diana Shnaider",
        "odds": -190,
        "americanLabel": "-190",
        "impliedPct": 65.5,
        "decimalOdds": 1.526,
        "modelPct": 62.8,
        "edgePct": -2.7,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 52.6,
        "grossPayoutMultiple": 1.526,
        "centsAtRisk": 100,
        "centsProfitIfWin": 52.6
      },
      "spread": {
        "player": "Diana Shnaider",
        "spread": -3.5,
        "odds": -115
      },
      "total": {
        "side": "Over",
        "line": 21.5,
        "odds": -115
      },
      "totalOver": {
        "side": "Over",
        "line": 21.5,
        "odds": -115
      },
      "totalUnder": {
        "side": "Under",
        "line": 21.5,
        "odds": -125
      },
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": 105
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": 105
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": -150
      },
      "firstServiceGameTotalPoints": [
        {
          "player": "Diana Shnaider",
          "market": "Diana Shnaider’s 1st Service Game - Winner",
          "side": "Diana Shnaider",
          "line": null,
          "odds": -200
        },
        {
          "player": "Diana Shnaider",
          "market": "Diana Shnaider’s 1st Service Game - Winner",
          "side": "Maja Chwalinska",
          "line": null,
          "odds": 140
        },
        {
          "player": "Maja Chwalinska",
          "market": "Maja Chwalinska’s 1st Service Game - Winner",
          "side": "Diana Shnaider",
          "line": null,
          "odds": 105
        },
        {
          "player": "Maja Chwalinska",
          "market": "Maja Chwalinska’s 1st Service Game - Winner",
          "side": "Maja Chwalinska",
          "line": null,
          "odds": -140
        },
        {
          "player": "Diana Shnaider",
          "market": "Diana Shnaider’s 1st Service Game - 1st Point",
          "side": "Diana Shnaider",
          "line": null,
          "odds": -140
        },
        {
          "player": "Diana Shnaider",
          "market": "Diana Shnaider’s 1st Service Game - 1st Point",
          "side": "Maja Chwalinska",
          "line": null,
          "odds": 105
        },
        {
          "player": "Maja Chwalinska",
          "market": "Maja Chwalinska’s 1st Service Game - 1st Point",
          "side": "Diana Shnaider",
          "line": null,
          "odds": -110
        },
        {
          "player": "Maja Chwalinska",
          "market": "Maja Chwalinska’s 1st Service Game - 1st Point",
          "side": "Maja Chwalinska",
          "line": null,
          "odds": -125
        },
        {
          "player": "Diana Shnaider",
          "market": "Diana Shnaider's 1st Service Game - Win to Love or 15",
          "side": "Yes",
          "line": null,
          "odds": 225
        },
        {
          "player": "Diana Shnaider",
          "market": "Diana Shnaider's 1st Service Game - Win to Love or 15",
          "side": "No",
          "line": null,
          "odds": -330
        },
        {
          "player": "Maja Chwalinska",
          "market": "Maja Chwalinska's 1st Service Game - Win to Love or 15",
          "side": "Yes",
          "line": null,
          "odds": 265
        },
        {
          "player": "Maja Chwalinska",
          "market": "Maja Chwalinska's 1st Service Game - Win to Love or 15",
          "side": "No",
          "line": null,
          "odds": -400
        },
        {
          "player": "Diana Shnaider",
          "market": "Diana Shnaider's 1st Service Game - Win to Love, 15 or 30",
          "side": "Yes",
          "line": null,
          "odds": 100
        },
        {
          "player": "Diana Shnaider",
          "market": "Diana Shnaider's 1st Service Game - Win to Love, 15 or 30",
          "side": "No",
          "line": null,
          "odds": -140
        },
        {
          "player": "Maja Chwalinska",
          "market": "Maja Chwalinska's 1st Service Game - Win to Love, 15 or 30",
          "side": "Yes",
          "line": null,
          "odds": 125
        },
        {
          "player": "Maja Chwalinska",
          "market": "Maja Chwalinska's 1st Service Game - Win to Love, 15 or 30",
          "side": "No",
          "line": null,
          "odds": -175
        }
      ],
      "firstGameProps": [
        {
          "market": "First 2 Game Props",
          "selection": "All Holds of Serve",
          "odds": 135
        },
        {
          "market": "First 2 Game Props",
          "selection": "Break Point in Every Game",
          "odds": 185
        },
        {
          "market": "First 2 Game Props",
          "selection": "All Breaks of Serve",
          "odds": 450
        },
        {
          "market": "First 4 Game Props",
          "selection": "All Holds of Serve",
          "odds": 400
        },
        {
          "market": "First 4 Game Props",
          "selection": "Break Point in Every Game",
          "odds": 650
        },
        {
          "market": "First 4 Game Props",
          "selection": "All Breaks of Serve",
          "odds": 2000
        }
      ],
      "setWinMarkets": [
        {
          "market": "Player to Win at Least One Set",
          "player": "Diana Shnaider",
          "selection": "Diana Shnaider Yes",
          "odds": -475
        },
        {
          "market": "Player to Win at Least One Set",
          "player": "Diana Shnaider",
          "selection": "Diana Shnaider No",
          "odds": 330
        },
        {
          "market": "Player to Win at Least One Set",
          "player": "Maja Chwalinska",
          "selection": "Maja Chwalinska Yes",
          "odds": -175
        },
        {
          "market": "Player to Win at Least One Set",
          "player": "Maja Chwalinska",
          "selection": "Maja Chwalinska No",
          "odds": 125
        }
      ],
      "priceAction": "ML is close to fair; derivative or live entry needs to carry the edge.",
      "spreadValue": "Diana Shnaider -3.5 (-115)",
      "totalValue": "21.5 games: Over -115 / Under -125",
      "firstSetTotalValue": "9.5 1st-set games: Over +105 / Under -150",
      "firstServiceGameValue": "16 first-service-game prices captured",
      "firstGamePropsValue": "First 2 Game Props: All Holds of Serve +135 / First 2 Game Props: Break Point in Every Game +185 / First 2 Game Props: All Breaks of Serve +450 / First 4 Game Props: All Holds of Serve +400 / First 4 Game Props: Break Point in Every Game +650 / First 4 Game Props: All Breaks of Serve +2000",
      "setWinValue": "Diana Shnaider Yes -475 / Diana Shnaider No +330 / Maja Chwalinska Yes -175 / Maja Chwalinska No +125",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Diana Shnaider -190 / Maja Chwalinska +154",
      "marketNote": "DraftKings Sportsbook ML, game handicap, match total, first-set total, set-win, and first-service-game markets captured where available. ML is close to fair; derivative or live entry needs to carry the edge.",
      "noVigNote": "Model 62.8% vs DraftKings Sportsbook implied 65.5% (-2.7 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Diana-Shnaider-Vs-Maja-Chwalinska/",
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
          "asOf": "2026-06-02"
        },
        "qualityName": "Diana Shnaider",
        "profile": "Clay | Live rank #23 | Russia | age 22 | hold 100%",
        "modelPct": 62.8,
        "weakness": {
          "name": "Diana Shnaider",
          "serviceHoldPct": 100,
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
          "strengths": [
            "protects serve well (100% hold)"
          ],
          "gameFlowRead": "Diana Shnaider has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 7,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
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
          "asOf": "2026-06-02"
        },
        "qualityName": "Maja Chwalinska",
        "profile": "Clay | Live rank #114 | Poland | age 24",
        "modelPct": 38,
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
          "pressureMatches": null,
          "matchesWithStats": 0,
          "weaknessScore": 0,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [],
          "gameFlowRead": "Maja Chwalinska has no major service weakness in the joined Flashscore sample."
        },
        "warehouseDepth": {
          "expectedRows": 7,
          "recentRows": 0,
          "recentMatches": 0,
          "source": "sql-tennis.db typed pressure/form snapshots"
        }
      }
    ]
  }
]

const normalizePlayerName = (value) => {
  const normalized = String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase()
  return ({ 'bu yunchaokete': 'yunchaokete bu', 'chak lam coleman wong': 'coleman wong', 'diego dedura': 'diego dedura palomero', 'xinyu wang': 'wang xinyu', 'xiyu wang': 'wang xiyu', 'yibing wu': 'wu yibing' })[normalized] || normalized
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
    market ? { label: market.source === 'Robinhood prediction market' ? 'Prediction market prices' : `${market.source} moneyline`, book: market.source, value: market.mlValue } : null,
    market?.spread ? { label: 'Game handicap', book: market.source, value: market.spreadValue } : null,
    market?.total ? { label: 'Total games', book: market.source, value: market.totalValue } : null,
    market?.firstSetTotal ? { label: '1st set total games', book: market.source, value: market.firstSetTotalValue } : null,
    market?.setWinMarkets?.length ? { label: 'To win a set', book: market.source, value: market.setWinValue } : null,
    market?.firstServiceGameTotalPoints?.length ? { label: '1st service game', book: market.source, value: market.firstServiceGameValue } : null,
    market?.firstGameProps?.length ? { label: 'First games props', book: market.source, value: market.firstGamePropsValue } : null
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
      raw.marketOnly ? 'Market-only Challenger row: no warehouse edge, sportsbook derivative, or service profile has been joined yet.' : market ? market.marketNote : 'No sportsbook line is stored for this match yet, so market edge is model-vs-fair only until a price is captured.'
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
      surface: raw.surface || 'Unknown',
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
        market ? { label: market?.source === 'Robinhood prediction market' ? 'Prediction market' : `${market.source} moneyline`, metric: 'Implied price', leftScore: marketPlayers.find((player) => player.name === raw.players[0].name)?.impliedPct ?? 0, rightScore: marketPlayers.find((player) => player.name === raw.players[1].name)?.impliedPct ?? 0, leftLabel: raw.players[0].name, rightLabel: raw.players[1].name, winner: market.priceAction } : null,
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
        { label: 'Win a set', value: market?.setWinValue || raw.setWinProjections?.map((entry) => entry.name + ' ' + entry.confidence + '%').join(' / ') || 'No set projection', lean: market?.setWinMarkets?.length ? `${market.source} set-win prices captured` : raw.setWinProjections?.find((entry) => entry.name !== raw.pickName)?.label || 'Set-win path', confidence: Math.max(...(raw.setWinProjections || []).map((entry) => Number(entry.confidence) || 0), 0), setWinRows: market?.setWinMarkets || raw.valueBoard?.setWin || [], valueGrade: market?.setWinMarkets?.length ? 'Priced set-win market' : 'Needs posted price', tone: market?.setWinMarkets?.length ? 'accent' : raw.tour === 'ATP' ? 'accent' : 'neutral', reason: market?.setWinMarkets?.length ? `${market.source} to-win-a-set prices are captured for this event.` : raw.tour === 'ATP' ? 'Best-of-five gives the non-ML side more room to win a set; use this to separate upset risk from match-winner confidence.' : 'Best-of-three set-win confidence is more fragile; early service holds matter more.' },
        { label: 'Spread', value: market?.spreadValue || 'Need posted game spread', lean: market?.spreadLean || raw.weaknessEdge?.spreadRead || 'Need number', confidence: Math.max(50, raw.confidence - 6), ...(raw.valueBoard?.spread || {}), tone: raw.weaknessEdge?.edgeType === 'Weakness edge' ? 'accent' : 'neutral', reason: raw.weaknessEdge?.liveTrigger || 'Wait for first service cycle.' },
        { label: 'O/U', value: market?.totalValue || 'Need posted total', lean: raw.valueBoard?.total?.selection || market?.totalLean || raw.weaknessEdge?.totalRead || raw.totals, confidence: raw.valueBoard?.total?.modelPct ?? Math.max(50, raw.confidence - 8), ...(raw.valueBoard?.total || {}), tone: raw.valueBoard?.total?.selection === 'Over' || raw.valueBoard?.total?.selection === 'Under' ? 'accent' : 'neutral', reason: raw.valueBoard?.total?.reason || raw.totals },
        { label: '1st set O/U', value: raw.valueBoard?.firstSetTotal?.line ? `Line ${raw.valueBoard.firstSetTotal.line}` : 'Need posted first-set total', lean: raw.valueBoard?.firstSetTotal?.selection || raw.valueBoard?.firstSetTotal?.lean || 'Price required', confidence: raw.valueBoard?.firstSetTotal?.confidence ?? Math.max(50, raw.confidence - 10), ...(raw.valueBoard?.firstSetTotal || {}), tone: raw.valueBoard?.firstSetTotal?.confidence >= 58 ? 'accent' : 'neutral', reason: raw.valueBoard?.firstSetTotal?.reason || 'Use expected first-set games against the posted 1st-set total.' },
        { label: '1st service game', value: market?.firstServiceGameValue || 'No first-service-game market captured', lean: 'First-service-game prices', confidence: raw.confidence, firstServiceGameRows: market?.firstServiceGameTotalPoints || [], tone: market?.firstServiceGameTotalPoints?.length ? 'neutral' : 'muted', reason: market?.firstServiceGameTotalPoints?.length ? `${market.source} exposes first-service-game prices for this event.` : 'No sportsbook first-service-game market captured.' },
        { label: 'First games', value: market?.firstGamePropsValue || 'No first-games prop captured', lean: 'First-game prop prices', confidence: raw.confidence, firstGamePropRows: market?.firstGameProps || [], tone: market?.firstGameProps?.length ? 'neutral' : 'muted', reason: market?.firstGameProps?.length ? `${market.source} exposes first-2/first-4 game props for this event.` : 'No sportsbook first-games prop captured.' }
      ],
      marketEconomics,
      clayMatchupData: clayData,
      opponentQualityData: qualityContext,
      researchLinks: [{ label: 'ESPN scoreboard', url: 'https://www.espn.com/tennis/scoreboard/_/date/20260604' }, { label: 'Tennistonic H2H', url: clayData?.sourceUrl || raw.h2hUrl }, ...(market?.eventUrl ? [{ label: market.source === 'Robinhood prediction market' ? 'Robinhood market' : `${market.source} event`, url: market.eventUrl }] : [])],
      formEdgeName: raw.pickName
    },
    participants,
    moneyline: market ? { available: true, label: market.source === 'Robinhood prediction market' ? 'Prediction market' : `${market.source} moneyline`, provider: market.source, participants } : { available: false, label: 'Moneyline', provider: 'Tennis warehouse model', participants: [] },
    analysis: { available: true, participantId: picked.id, participant: picked, opponent, lean: `Lean ${raw.pickName}`, rationale: raw.reason, confidence: raw.confidence, volatility: raw.volatility, recommendationScore: raw.confidence - Math.round(raw.volatility / 3) + Math.round(Math.max(-8, Math.min(8, deskMarket?.edgePct ?? 0))), tier: raw.modelSplit ? 'Model split / pass ML' : raw.tags.includes('High confidence')  ? 'High confidence' : raw.tags.includes('Lean') ? 'Lean' : 'Watch', sourceLabel: raw.modelSource || 'Tennis warehouse model', modelEdge: deskMarket?.edgePct ?? 0, modelEdgeLabel: deskMarket ? `${deskMarket.edgePct > 0 ? '+' : ''}${deskMarket.edgePct} pts vs ${market?.source === 'Robinhood prediction market' ? 'prediction-market ask' : `${market.source} implied`}` : 'Fair value only until market price is captured', marketProbability: deskMarket?.impliedPct ? deskMarket.impliedPct / 100 : null, marketProbabilityLabel: deskMarket?.impliedPct ? `${deskMarket.impliedPct}% ${market?.source === 'Robinhood prediction market' ? 'prediction-market ask' : `${market.source} implied`}` : 'No market', inputs: [], inputsUsed: market ? 4 : 3, volatilityNotes: [] }
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
export const slateMeta = { title: 'June 4, 2026 Tennis Desk', date: 'June 4, 2026', isoDate: '2026-06-04', timeZone: 'America/Los_Angeles', modelCartridge: tennisModelCartridge, subtitle: 'Roland Garros senior singles plus Robinhood ATP Challenger prediction-market inventory; model edges only apply where warehouse context is joined.', notes: ['No doubles included.', 'DraftKings lines are preferred, with FanDuel and Robinhood fallback where needed.', 'June 4, 2026 uses live rank, clay record, opponent-adjusted recent form, and warehouse service rows where joined.'] }
export const filters = ['All', 'Tennis']
export const oddsMeta = { provider: 'DraftKings Sportsbook + FanDuel fallback + Robinhood prediction markets + Tennis warehouse model', snapshot: 'June 4, 2026 Roland Garros desk', note: 'DraftKings lines are preferred for priced matches; very expensive favorites are marked as low-payout or pass-first instead of automatic bets.' }
export const sources = [{ label: 'ESPN tennis scoreboard', url: 'https://www.espn.com/tennis/scoreboard/_/date/20260604' }, { label: 'Live Tennis rankings warehouse', url: 'https://live-tennis.eu/' }, { label: 'DraftKings sportsbook tennis', url: 'https://sportsbook.draftkings.com/sports/tennis' }, { label: 'FanDuel sportsbook tennis', url: 'https://sportsbook.fanduel.com/tennis' }, { label: 'Robinhood tennis prediction markets', url: 'https://robinhood.com/us/en/prediction-markets/tennis/' }]
export const games = matches.sort((left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title))
