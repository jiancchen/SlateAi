import { createSportsMatchModel } from './sports-model.js'
import tennisClayContext from './day-2026-06-02-tennis-clay-context.generated.json' with { type: 'json' }
import tennisOpponentQualityContext from './day-2026-06-02-tennis-opponent-quality.generated.json' with { type: 'json' }
import tennisWarehouseContext from './day-2026-06-02-tennis-warehouse-context.generated.json' with { type: 'json' }

const rawTennisGames = [
  {
    "id": "rh-atp-challenger-perugia-echargui-vs-tseng-2026-06-02",
    "eventId": "5ef28092-79bb-47b9-b8b3-8a83c0b4d829",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Chun Hsin Tseng vs Moez Echargui",
    "start": "1:00 AM",
    "startMinutes": 60,
    "court": "ATP Challenger Perugia",
    "round": "Round Of 32",
    "stage": "ATP Challenger Perugia | Round Of 32",
    "pickName": "Chun Hsin Tseng",
    "basePickName": "Chun Hsin Tseng",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 80,
    "volatility": 52,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Market favorite"
    ],
    "reason": "Chun Hsin Tseng is only the current Robinhood market favorite over Moez Echargui; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Chun Hsin Tseng",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Moez Echargui",
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
        "name": "Chun Hsin Tseng",
        "confidence": 88,
        "modelPct": 80,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Moez Echargui",
        "confidence": 42,
        "modelPct": 22,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Chun Hsin Tseng",
        "americanOdds": null,
        "modelPct": 80,
        "impliedPct": 80,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 48,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Chun Hsin Tseng",
          "confidence": 88,
          "modelPct": 80,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Moez Echargui",
          "confidence": 42,
          "modelPct": 22,
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
        "selection": "Chun Hsin Tseng",
        "line": null,
        "americanOdds": null,
        "modelPct": 80,
        "impliedPct": 80,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Chun Hsin Tseng 88% / Moez Echargui 42%",
        "rows": [
          {
            "name": "Chun Hsin Tseng",
            "confidence": 88,
            "modelPct": 80,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Moez Echargui",
            "confidence": 42,
            "modelPct": 22,
            "label": "Underdog set-win path needs early holds"
          }
        ],
        "confidence": 88,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Price required",
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
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
      "eventId": "5ef28092-79bb-47b9-b8b3-8a83c0b4d829",
      "totalOpenInterest": 469,
      "totalVolume": 0,
      "players": [
        {
          "name": "Chun Hsin Tseng",
          "odds": null,
          "americanLabel": "80c",
          "impliedPct": 80,
          "bidPct": 78,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 80,
          "edgePct": null,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 20,
          "grossPayoutMultiple": 1.25,
          "centsAtRisk": 80,
          "centsProfitIfWin": 20,
          "openInterest": 77,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02ECHTSE-TSE"
        },
        {
          "name": "Moez Echargui",
          "odds": null,
          "americanLabel": "22c",
          "impliedPct": 22,
          "bidPct": 21,
          "lastTradePct": 22,
          "decimalOdds": null,
          "modelPct": 22,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 78,
          "grossPayoutMultiple": 4.545,
          "centsAtRisk": 22,
          "centsProfitIfWin": 78,
          "openInterest": 392,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02ECHTSE-ECH"
        }
      ],
      "desk": {
        "name": "Chun Hsin Tseng",
        "odds": null,
        "americanLabel": "80c",
        "impliedPct": 80,
        "bidPct": 78,
        "lastTradePct": 0,
        "decimalOdds": null,
        "modelPct": 80,
        "edgePct": null,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 20,
        "grossPayoutMultiple": 1.25,
        "centsAtRisk": 80,
        "centsProfitIfWin": 20,
        "openInterest": 77,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02ECHTSE-TSE"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Chun Hsin Tseng 80c / Moez Echargui 22c",
      "marketNote": "Robinhood prediction-market prices captured: Chun Hsin Tseng 80c / Moez Echargui 22c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Chun-Hsin-Tseng-Vs-Moez-Echargui/",
    "players": [
      {
        "name": "Chun Hsin Tseng",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 80,
        "weakness": {
          "name": "Chun Hsin Tseng",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Moez Echargui",
        "ranking": {
          "name": "Moez Echargui",
          "rank": 139,
          "points": 441,
          "age": 33,
          "country": "Tunisia",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/3696/moez-echargui",
          "asOf": "2026-06-02"
        },
        "qualityName": null,
        "profile": "Live rank #139 | Tunisia | age 33",
        "modelPct": 22,
        "weakness": {
          "name": "Moez Echargui",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-centurion-2-peliwo-vs-coulibaly-2026-06-02",
    "eventId": "06d2fd18-70d1-452a-9619-8e604c8a9a9c",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Filip Peliwo vs Eliakim Coulibaly",
    "start": "1:00 AM",
    "startMinutes": 60,
    "court": "ATP Challenger Centurion 2",
    "round": "Round Of 32",
    "stage": "ATP Challenger Centurion 2 | Round Of 32",
    "pickName": "Eliakim Coulibaly",
    "basePickName": "Eliakim Coulibaly",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 90,
    "volatility": 45,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Market favorite"
    ],
    "reason": "Eliakim Coulibaly is only the current Robinhood market favorite over Filip Peliwo; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Eliakim Coulibaly",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Filip Peliwo",
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
        "name": "Filip Peliwo",
        "confidence": 36,
        "modelPct": 16,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Eliakim Coulibaly",
        "confidence": 88,
        "modelPct": 90,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Eliakim Coulibaly",
        "americanOdds": null,
        "modelPct": 90,
        "impliedPct": 90,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 48,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Filip Peliwo",
          "confidence": 36,
          "modelPct": 16,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Eliakim Coulibaly",
          "confidence": 88,
          "modelPct": 90,
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
        "selection": "Eliakim Coulibaly",
        "line": null,
        "americanOdds": null,
        "modelPct": 90,
        "impliedPct": 90,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Filip Peliwo 36% / Eliakim Coulibaly 88%",
        "rows": [
          {
            "name": "Filip Peliwo",
            "confidence": 36,
            "modelPct": 16,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Eliakim Coulibaly",
            "confidence": 88,
            "modelPct": 90,
            "label": "Market favorite to win a set"
          }
        ],
        "confidence": 88,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Price required",
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
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
      "eventId": "06d2fd18-70d1-452a-9619-8e604c8a9a9c",
      "totalOpenInterest": 13,
      "totalVolume": 0,
      "players": [
        {
          "name": "Filip Peliwo",
          "odds": null,
          "americanLabel": "16c",
          "impliedPct": 16,
          "bidPct": 12,
          "lastTradePct": 16,
          "decimalOdds": null,
          "modelPct": 16,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 84,
          "grossPayoutMultiple": 6.25,
          "centsAtRisk": 16,
          "centsProfitIfWin": 84,
          "openInterest": 13,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02PELCOU-PEL"
        },
        {
          "name": "Eliakim Coulibaly",
          "odds": null,
          "americanLabel": "90c",
          "impliedPct": 90,
          "bidPct": 84,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 90,
          "edgePct": null,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 10,
          "grossPayoutMultiple": 1.111,
          "centsAtRisk": 90,
          "centsProfitIfWin": 10,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02PELCOU-COU"
        }
      ],
      "desk": {
        "name": "Eliakim Coulibaly",
        "odds": null,
        "americanLabel": "90c",
        "impliedPct": 90,
        "bidPct": 84,
        "lastTradePct": 0,
        "decimalOdds": null,
        "modelPct": 90,
        "edgePct": null,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 10,
        "grossPayoutMultiple": 1.111,
        "centsAtRisk": 90,
        "centsProfitIfWin": 10,
        "openInterest": 0,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02PELCOU-COU"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Filip Peliwo 16c / Eliakim Coulibaly 90c",
      "marketNote": "Robinhood prediction-market prices captured: Filip Peliwo 16c / Eliakim Coulibaly 90c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Filip-Peliwo-Vs-Eliakim-Coulibaly/",
    "players": [
      {
        "name": "Filip Peliwo",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 16,
        "weakness": {
          "name": "Filip Peliwo",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Eliakim Coulibaly",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 90,
        "weakness": {
          "name": "Eliakim Coulibaly",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-perugia-rocha-vs-dalla-valle-2026-06-02",
    "eventId": "bfa93dc0-54a6-4330-886d-cf843e4e86bb",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Henrique Rocha vs Enrico Dalla Valle",
    "start": "1:00 AM",
    "startMinutes": 60,
    "court": "ATP Challenger Perugia",
    "round": "Round Of 32",
    "stage": "ATP Challenger Perugia | Round Of 32",
    "pickName": "Henrique Rocha",
    "basePickName": "Henrique Rocha",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 69,
    "volatility": 62,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Henrique Rocha is only the current Robinhood market favorite over Enrico Dalla Valle; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Henrique Rocha",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Enrico Dalla Valle",
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
        "name": "Henrique Rocha",
        "confidence": 77,
        "modelPct": 69,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Enrico Dalla Valle",
        "confidence": 53,
        "modelPct": 33,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Henrique Rocha",
        "americanOdds": null,
        "modelPct": 69,
        "impliedPct": 69,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Henrique Rocha",
          "confidence": 77,
          "modelPct": 69,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Enrico Dalla Valle",
          "confidence": 53,
          "modelPct": 33,
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
        "selection": "Henrique Rocha",
        "line": null,
        "americanOdds": null,
        "modelPct": 69,
        "impliedPct": 69,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Henrique Rocha 77% / Enrico Dalla Valle 53%",
        "rows": [
          {
            "name": "Henrique Rocha",
            "confidence": 77,
            "modelPct": 69,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Enrico Dalla Valle",
            "confidence": 53,
            "modelPct": 33,
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
        "selection": "Price required",
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "bfa93dc0-54a6-4330-886d-cf843e4e86bb",
      "totalOpenInterest": 492,
      "totalVolume": 0,
      "players": [
        {
          "name": "Henrique Rocha",
          "odds": null,
          "americanLabel": "69c",
          "impliedPct": 69,
          "bidPct": 67,
          "lastTradePct": 69,
          "decimalOdds": null,
          "modelPct": 69,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 31,
          "grossPayoutMultiple": 1.449,
          "centsAtRisk": 69,
          "centsProfitIfWin": 31,
          "openInterest": 398,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02ROCDAL-ROC"
        },
        {
          "name": "Enrico Dalla Valle",
          "odds": null,
          "americanLabel": "33c",
          "impliedPct": 33,
          "bidPct": 30,
          "lastTradePct": 31,
          "decimalOdds": null,
          "modelPct": 33,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 67,
          "grossPayoutMultiple": 3.03,
          "centsAtRisk": 33,
          "centsProfitIfWin": 67,
          "openInterest": 94,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02ROCDAL-DAL"
        }
      ],
      "desk": {
        "name": "Henrique Rocha",
        "odds": null,
        "americanLabel": "69c",
        "impliedPct": 69,
        "bidPct": 67,
        "lastTradePct": 69,
        "decimalOdds": null,
        "modelPct": 69,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 31,
        "grossPayoutMultiple": 1.449,
        "centsAtRisk": 69,
        "centsProfitIfWin": 31,
        "openInterest": 398,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02ROCDAL-ROC"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Henrique Rocha 69c / Enrico Dalla Valle 33c",
      "marketNote": "Robinhood prediction-market prices captured: Henrique Rocha 69c / Enrico Dalla Valle 33c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Henrique-Rocha-Vs-Enrico-Dalla-Valle/",
    "players": [
      {
        "name": "Henrique Rocha",
        "ranking": {
          "name": "Henrique Rocha",
          "rank": 119,
          "points": 528,
          "age": 22,
          "country": "Portugal",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/10248/henrique-rocha",
          "asOf": "2026-06-02"
        },
        "qualityName": null,
        "profile": "Live rank #119 | Portugal | age 22",
        "modelPct": 69,
        "weakness": {
          "name": "Henrique Rocha",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Enrico Dalla Valle",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 33,
        "weakness": {
          "name": "Enrico Dalla Valle",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-centurion-2-weightman-vs-badenhorst-2026-06-02",
    "eventId": "31356141-b3f4-4b9d-8f99-bc81661d6bd5",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Oscar Weightman vs Devin Badenhorst",
    "start": "1:00 AM",
    "startMinutes": 60,
    "court": "ATP Challenger Centurion 2",
    "round": "Round Of 32",
    "stage": "ATP Challenger Centurion 2 | Round Of 32",
    "pickName": "Devin Badenhorst",
    "basePickName": "Devin Badenhorst",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 67,
    "volatility": 64,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Devin Badenhorst is only the current Robinhood market favorite over Oscar Weightman; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Devin Badenhorst",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Oscar Weightman",
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
        "name": "Oscar Weightman",
        "confidence": 55,
        "modelPct": 36,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Devin Badenhorst",
        "confidence": 75,
        "modelPct": 67,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Devin Badenhorst",
        "americanOdds": null,
        "modelPct": 67,
        "impliedPct": 67,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Oscar Weightman",
          "confidence": 55,
          "modelPct": 36,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Devin Badenhorst",
          "confidence": 75,
          "modelPct": 67,
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
        "selection": "Devin Badenhorst",
        "line": null,
        "americanOdds": null,
        "modelPct": 67,
        "impliedPct": 67,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Oscar Weightman 55% / Devin Badenhorst 75%",
        "rows": [
          {
            "name": "Oscar Weightman",
            "confidence": 55,
            "modelPct": 36,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Devin Badenhorst",
            "confidence": 75,
            "modelPct": 67,
            "label": "Market favorite to win a set"
          }
        ],
        "confidence": 75,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Price required",
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "31356141-b3f4-4b9d-8f99-bc81661d6bd5",
      "totalOpenInterest": 333,
      "totalVolume": 0,
      "players": [
        {
          "name": "Oscar Weightman",
          "odds": null,
          "americanLabel": "36c",
          "impliedPct": 36,
          "bidPct": 34,
          "lastTradePct": 36,
          "decimalOdds": null,
          "modelPct": 36,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 64,
          "grossPayoutMultiple": 2.778,
          "centsAtRisk": 36,
          "centsProfitIfWin": 64,
          "openInterest": 326,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02WEIBAD-WEI"
        },
        {
          "name": "Devin Badenhorst",
          "odds": null,
          "americanLabel": "67c",
          "impliedPct": 67,
          "bidPct": 63,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 67,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 33,
          "grossPayoutMultiple": 1.493,
          "centsAtRisk": 67,
          "centsProfitIfWin": 33,
          "openInterest": 7,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02WEIBAD-BAD"
        }
      ],
      "desk": {
        "name": "Devin Badenhorst",
        "odds": null,
        "americanLabel": "67c",
        "impliedPct": 67,
        "bidPct": 63,
        "lastTradePct": 0,
        "decimalOdds": null,
        "modelPct": 67,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 33,
        "grossPayoutMultiple": 1.493,
        "centsAtRisk": 67,
        "centsProfitIfWin": 33,
        "openInterest": 7,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02WEIBAD-BAD"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Oscar Weightman 36c / Devin Badenhorst 67c",
      "marketNote": "Robinhood prediction-market prices captured: Oscar Weightman 36c / Devin Badenhorst 67c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Oscar-Weightman-Vs-Devin-Badenhorst/",
    "players": [
      {
        "name": "Oscar Weightman",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 36,
        "weakness": {
          "name": "Oscar Weightman",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Devin Badenhorst",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 67,
        "weakness": {
          "name": "Devin Badenhorst",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-perugia-bertola-vs-ratti-2026-06-02",
    "eventId": "eb9b02fb-81f6-4481-ad4d-e5eee4cd6e38",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Remy Bertola vs Lucio Ratti",
    "start": "1:00 AM",
    "startMinutes": 60,
    "court": "ATP Challenger Perugia",
    "round": "Round Of 32",
    "stage": "ATP Challenger Perugia | Round Of 32",
    "pickName": "Remy Bertola",
    "basePickName": "Remy Bertola",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 70,
    "volatility": 61,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Market favorite"
    ],
    "reason": "Remy Bertola is only the current Robinhood market favorite over Lucio Ratti; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Remy Bertola",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Lucio Ratti",
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
        "name": "Remy Bertola",
        "confidence": 78,
        "modelPct": 70,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Lucio Ratti",
        "confidence": 52,
        "modelPct": 32,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Remy Bertola",
        "americanOdds": null,
        "modelPct": 70,
        "impliedPct": 70,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.2,
        "confidence": 50,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 50,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Remy Bertola",
          "confidence": 78,
          "modelPct": 70,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Lucio Ratti",
          "confidence": 52,
          "modelPct": 32,
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
        "selection": "Remy Bertola",
        "line": null,
        "americanOdds": null,
        "modelPct": 70,
        "impliedPct": 70,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Remy Bertola 78% / Lucio Ratti 52%",
        "rows": [
          {
            "name": "Remy Bertola",
            "confidence": 78,
            "modelPct": 70,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Lucio Ratti",
            "confidence": 52,
            "modelPct": 32,
            "label": "Underdog set-win path needs early holds"
          }
        ],
        "confidence": 78,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Price required",
        "expectedGames": 9.2,
        "confidence": 50,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
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
      "eventId": "eb9b02fb-81f6-4481-ad4d-e5eee4cd6e38",
      "totalOpenInterest": 123,
      "totalVolume": 0,
      "players": [
        {
          "name": "Remy Bertola",
          "odds": null,
          "americanLabel": "70c",
          "impliedPct": 70,
          "bidPct": 67,
          "lastTradePct": 76,
          "decimalOdds": null,
          "modelPct": 70,
          "edgePct": null,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 30,
          "grossPayoutMultiple": 1.429,
          "centsAtRisk": 70,
          "centsProfitIfWin": 30,
          "openInterest": 22,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02BERRAT-BER"
        },
        {
          "name": "Lucio Ratti",
          "odds": null,
          "americanLabel": "32c",
          "impliedPct": 32,
          "bidPct": 30,
          "lastTradePct": 29,
          "decimalOdds": null,
          "modelPct": 32,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 68,
          "grossPayoutMultiple": 3.125,
          "centsAtRisk": 32,
          "centsProfitIfWin": 68,
          "openInterest": 101,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02BERRAT-RAT"
        }
      ],
      "desk": {
        "name": "Remy Bertola",
        "odds": null,
        "americanLabel": "70c",
        "impliedPct": 70,
        "bidPct": 67,
        "lastTradePct": 76,
        "decimalOdds": null,
        "modelPct": 70,
        "edgePct": null,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 30,
        "grossPayoutMultiple": 1.429,
        "centsAtRisk": 70,
        "centsProfitIfWin": 30,
        "openInterest": 22,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02BERRAT-BER"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Remy Bertola 70c / Lucio Ratti 32c",
      "marketNote": "Robinhood prediction-market prices captured: Remy Bertola 70c / Lucio Ratti 32c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Remy-Bertola-Vs-Lucio-Ratti/",
    "players": [
      {
        "name": "Remy Bertola",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 70,
        "weakness": {
          "name": "Remy Bertola",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Lucio Ratti",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 32,
        "weakness": {
          "name": "Lucio Ratti",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-centurion-2-rawat-vs-winter-2026-06-02",
    "eventId": "a5a91b86-a6f2-4f90-beba-426abe8db1a6",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Sidharth Rawat vs Edward Winter",
    "start": "1:00 AM",
    "startMinutes": 60,
    "court": "ATP Challenger Centurion 2",
    "round": "Round Of 32",
    "stage": "ATP Challenger Centurion 2 | Round Of 32",
    "pickName": "Edward Winter",
    "basePickName": "Edward Winter",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 80,
    "volatility": 53,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Market favorite"
    ],
    "reason": "Edward Winter is only the current Robinhood market favorite over Sidharth Rawat; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Edward Winter",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Sidharth Rawat",
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
        "name": "Sidharth Rawat",
        "confidence": 42,
        "modelPct": 24,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Edward Winter",
        "confidence": 88,
        "modelPct": 80,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Edward Winter",
        "americanOdds": null,
        "modelPct": 80,
        "impliedPct": 80,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 48,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Sidharth Rawat",
          "confidence": 42,
          "modelPct": 24,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Edward Winter",
          "confidence": 88,
          "modelPct": 80,
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
        "selection": "Edward Winter",
        "line": null,
        "americanOdds": null,
        "modelPct": 80,
        "impliedPct": 80,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Sidharth Rawat 42% / Edward Winter 88%",
        "rows": [
          {
            "name": "Sidharth Rawat",
            "confidence": 42,
            "modelPct": 24,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Edward Winter",
            "confidence": 88,
            "modelPct": 80,
            "label": "Market favorite to win a set"
          }
        ],
        "confidence": 88,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Price required",
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
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
      "eventId": "a5a91b86-a6f2-4f90-beba-426abe8db1a6",
      "totalOpenInterest": 0,
      "totalVolume": 0,
      "players": [
        {
          "name": "Sidharth Rawat",
          "odds": null,
          "americanLabel": "24c",
          "impliedPct": 24,
          "bidPct": 23,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 24,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 76,
          "grossPayoutMultiple": 4.167,
          "centsAtRisk": 24,
          "centsProfitIfWin": 76,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02RAWWIN-RAW"
        },
        {
          "name": "Edward Winter",
          "odds": null,
          "americanLabel": "80c",
          "impliedPct": 80,
          "bidPct": 76,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 80,
          "edgePct": null,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 20,
          "grossPayoutMultiple": 1.25,
          "centsAtRisk": 80,
          "centsProfitIfWin": 20,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02RAWWIN-WIN"
        }
      ],
      "desk": {
        "name": "Edward Winter",
        "odds": null,
        "americanLabel": "80c",
        "impliedPct": 80,
        "bidPct": 76,
        "lastTradePct": 0,
        "decimalOdds": null,
        "modelPct": 80,
        "edgePct": null,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 20,
        "grossPayoutMultiple": 1.25,
        "centsAtRisk": 80,
        "centsProfitIfWin": 20,
        "openInterest": 0,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02RAWWIN-WIN"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Sidharth Rawat 24c / Edward Winter 80c",
      "marketNote": "Robinhood prediction-market prices captured: Sidharth Rawat 24c / Edward Winter 80c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Sidharth-Rawat-Vs-Edward-Winter/",
    "players": [
      {
        "name": "Sidharth Rawat",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 24,
        "weakness": {
          "name": "Sidharth Rawat",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Edward Winter",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 80,
        "weakness": {
          "name": "Edward Winter",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-prostejov-sanchez-izquierdo-vs-pavlovic-2026-06-02",
    "eventId": "a575aaf0-ff35-4096-859c-e69927a4a5d1",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Luka Pavlovic vs Nikolas Sanchez Izquierdo",
    "start": "1:30 AM",
    "startMinutes": 90,
    "court": "ATP Challenger Prostejov",
    "round": "Round Of 32",
    "stage": "ATP Challenger Prostejov | Round Of 32",
    "pickName": "Nikolas Sanchez Izquierdo",
    "basePickName": "Nikolas Sanchez Izquierdo",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 56,
    "volatility": 74,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Nikolas Sanchez Izquierdo is only the current Robinhood market favorite over Luka Pavlovic; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Nikolas Sanchez Izquierdo",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Luka Pavlovic",
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
        "name": "Luka Pavlovic",
        "confidence": 66,
        "modelPct": 48,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Nikolas Sanchez Izquierdo",
        "confidence": 64,
        "modelPct": 56,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Nikolas Sanchez Izquierdo",
        "americanOdds": null,
        "modelPct": 56,
        "impliedPct": 56,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 10.1,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Luka Pavlovic",
          "confidence": 66,
          "modelPct": 48,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Nikolas Sanchez Izquierdo",
          "confidence": 64,
          "modelPct": 56,
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
        "selection": "Nikolas Sanchez Izquierdo",
        "line": null,
        "americanOdds": null,
        "modelPct": 56,
        "impliedPct": 56,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Luka Pavlovic 66% / Nikolas Sanchez Izquierdo 64%",
        "rows": [
          {
            "name": "Luka Pavlovic",
            "confidence": 66,
            "modelPct": 48,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Nikolas Sanchez Izquierdo",
            "confidence": 64,
            "modelPct": 56,
            "label": "Market favorite to win a set"
          }
        ],
        "confidence": 66,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Price required",
        "expectedGames": 10.1,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "a575aaf0-ff35-4096-859c-e69927a4a5d1",
      "totalOpenInterest": 159,
      "totalVolume": 0,
      "players": [
        {
          "name": "Luka Pavlovic",
          "odds": null,
          "americanLabel": "48c",
          "impliedPct": 48,
          "bidPct": 45,
          "lastTradePct": 48,
          "decimalOdds": null,
          "modelPct": 48,
          "edgePct": null,
          "priceBand": "Coinflip",
          "grossProfitPct": 52,
          "grossPayoutMultiple": 2.083,
          "centsAtRisk": 48,
          "centsProfitIfWin": 52,
          "openInterest": 76,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02SAIPAV-PAV"
        },
        {
          "name": "Nikolas Sanchez Izquierdo",
          "odds": null,
          "americanLabel": "56c",
          "impliedPct": 56,
          "bidPct": 52,
          "lastTradePct": 56,
          "decimalOdds": null,
          "modelPct": 56,
          "edgePct": null,
          "priceBand": "Coinflip",
          "grossProfitPct": 44,
          "grossPayoutMultiple": 1.786,
          "centsAtRisk": 56,
          "centsProfitIfWin": 44,
          "openInterest": 83,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02SAIPAV-SAI"
        }
      ],
      "desk": {
        "name": "Nikolas Sanchez Izquierdo",
        "odds": null,
        "americanLabel": "56c",
        "impliedPct": 56,
        "bidPct": 52,
        "lastTradePct": 56,
        "decimalOdds": null,
        "modelPct": 56,
        "edgePct": null,
        "priceBand": "Coinflip",
        "grossProfitPct": 44,
        "grossPayoutMultiple": 1.786,
        "centsAtRisk": 56,
        "centsProfitIfWin": 44,
        "openInterest": 83,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02SAIPAV-SAI"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Luka Pavlovic 48c / Nikolas Sanchez Izquierdo 56c",
      "marketNote": "Robinhood prediction-market prices captured: Luka Pavlovic 48c / Nikolas Sanchez Izquierdo 56c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Luka-Pavlovic-Vs-Nikolas-Sanchez-Izquierdo/",
    "players": [
      {
        "name": "Luka Pavlovic",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 48,
        "weakness": {
          "name": "Luka Pavlovic",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Nikolas Sanchez Izquierdo",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 56,
        "weakness": {
          "name": "Nikolas Sanchez Izquierdo",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-prostejov-damas-vs-dzumhur-2026-06-02",
    "eventId": "7550c5b6-3363-469b-8659-47cf03448686",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Miguel Damas vs Damir Dzumhur",
    "start": "1:30 AM",
    "startMinutes": 90,
    "court": "ATP Challenger Prostejov",
    "round": "Round Of 32",
    "stage": "ATP Challenger Prostejov | Round Of 32",
    "pickName": "Damir Dzumhur",
    "basePickName": "Damir Dzumhur",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 75,
    "volatility": 56,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Market favorite"
    ],
    "reason": "Damir Dzumhur is only the current Robinhood market favorite over Miguel Damas; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Damir Dzumhur",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Miguel Damas",
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
        "name": "Miguel Damas",
        "confidence": 47,
        "modelPct": 26,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Damir Dzumhur",
        "confidence": 83,
        "modelPct": 75,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Damir Dzumhur",
        "americanOdds": null,
        "modelPct": 75,
        "impliedPct": 75,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 48,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Miguel Damas",
          "confidence": 47,
          "modelPct": 26,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Damir Dzumhur",
          "confidence": 83,
          "modelPct": 75,
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
        "modelPct": 75,
        "impliedPct": 75,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Miguel Damas 47% / Damir Dzumhur 83%",
        "rows": [
          {
            "name": "Miguel Damas",
            "confidence": 47,
            "modelPct": 26,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Damir Dzumhur",
            "confidence": 83,
            "modelPct": 75,
            "label": "Market favorite to win a set"
          }
        ],
        "confidence": 83,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Price required",
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
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
      "eventId": "7550c5b6-3363-469b-8659-47cf03448686",
      "totalOpenInterest": 326,
      "totalVolume": 0,
      "players": [
        {
          "name": "Miguel Damas",
          "odds": null,
          "americanLabel": "26c",
          "impliedPct": 26,
          "bidPct": 25,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 26,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 74,
          "grossPayoutMultiple": 3.846,
          "centsAtRisk": 26,
          "centsProfitIfWin": 74,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02DAMDZU-DAM"
        },
        {
          "name": "Damir Dzumhur",
          "odds": null,
          "americanLabel": "75c",
          "impliedPct": 75,
          "bidPct": 73,
          "lastTradePct": 75,
          "decimalOdds": null,
          "modelPct": 75,
          "edgePct": null,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 25,
          "grossPayoutMultiple": 1.333,
          "centsAtRisk": 75,
          "centsProfitIfWin": 25,
          "openInterest": 326,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02DAMDZU-DZU"
        }
      ],
      "desk": {
        "name": "Damir Dzumhur",
        "odds": null,
        "americanLabel": "75c",
        "impliedPct": 75,
        "bidPct": 73,
        "lastTradePct": 75,
        "decimalOdds": null,
        "modelPct": 75,
        "edgePct": null,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 25,
        "grossPayoutMultiple": 1.333,
        "centsAtRisk": 75,
        "centsProfitIfWin": 25,
        "openInterest": 326,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02DAMDZU-DZU"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Miguel Damas 26c / Damir Dzumhur 75c",
      "marketNote": "Robinhood prediction-market prices captured: Miguel Damas 26c / Damir Dzumhur 75c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Miguel-Damas-Vs-Damir-Dzumhur/",
    "players": [
      {
        "name": "Miguel Damas",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 26,
        "weakness": {
          "name": "Miguel Damas",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
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
          "profileUrl": "https://www.espn.com/tennis/player/_/id/1842/damir-dzumhur",
          "asOf": "2026-06-02"
        },
        "qualityName": null,
        "profile": "Live rank #87 | Bosnia and Herzegovina | age 34",
        "modelPct": 75,
        "weakness": {
          "name": "Damir Dzumhur",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-prostejov-baez-vs-gueymard-wayenburg-2026-06-02",
    "eventId": "cedba9c3-5394-4660-824b-df8b22e61c0b",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Sebastian Baez vs Sascha Gueymard Wayenburg",
    "start": "1:30 AM",
    "startMinutes": 90,
    "court": "ATP Challenger Prostejov",
    "round": "Round Of 32",
    "stage": "ATP Challenger Prostejov | Round Of 32",
    "pickName": "Sebastian Baez",
    "basePickName": "Sebastian Baez",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 84,
    "volatility": 48,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Market favorite"
    ],
    "reason": "Sebastian Baez is only the current Robinhood market favorite over Sascha Gueymard Wayenburg; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Sebastian Baez",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Sascha Gueymard Wayenburg",
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
        "name": "Sebastian Baez",
        "confidence": 88,
        "modelPct": 84,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Sascha Gueymard Wayenburg",
        "confidence": 38,
        "modelPct": 17,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Sebastian Baez",
        "americanOdds": null,
        "modelPct": 84,
        "impliedPct": 84,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 48,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Sebastian Baez",
          "confidence": 88,
          "modelPct": 84,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Sascha Gueymard Wayenburg",
          "confidence": 38,
          "modelPct": 17,
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
        "selection": "Sebastian Baez",
        "line": null,
        "americanOdds": null,
        "modelPct": 84,
        "impliedPct": 84,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Sebastian Baez 88% / Sascha Gueymard Wayenburg 38%",
        "rows": [
          {
            "name": "Sebastian Baez",
            "confidence": 88,
            "modelPct": 84,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Sascha Gueymard Wayenburg",
            "confidence": 38,
            "modelPct": 17,
            "label": "Underdog set-win path needs early holds"
          }
        ],
        "confidence": 88,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Price required",
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
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
      "eventId": "cedba9c3-5394-4660-824b-df8b22e61c0b",
      "totalOpenInterest": 23,
      "totalVolume": 0,
      "players": [
        {
          "name": "Sebastian Baez",
          "odds": null,
          "americanLabel": "84c",
          "impliedPct": 84,
          "bidPct": 82,
          "lastTradePct": 84,
          "decimalOdds": null,
          "modelPct": 84,
          "edgePct": null,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 16,
          "grossPayoutMultiple": 1.19,
          "centsAtRisk": 84,
          "centsProfitIfWin": 16,
          "openInterest": 23,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02BAEGUE-BAE"
        },
        {
          "name": "Sascha Gueymard Wayenburg",
          "odds": null,
          "americanLabel": "17c",
          "impliedPct": 17,
          "bidPct": 15,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 17,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 83,
          "grossPayoutMultiple": 5.882,
          "centsAtRisk": 17,
          "centsProfitIfWin": 83,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02BAEGUE-GUE"
        }
      ],
      "desk": {
        "name": "Sebastian Baez",
        "odds": null,
        "americanLabel": "84c",
        "impliedPct": 84,
        "bidPct": 82,
        "lastTradePct": 84,
        "decimalOdds": null,
        "modelPct": 84,
        "edgePct": null,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 16,
        "grossPayoutMultiple": 1.19,
        "centsAtRisk": 84,
        "centsProfitIfWin": 16,
        "openInterest": 23,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02BAEGUE-BAE"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Sebastian Baez 84c / Sascha Gueymard Wayenburg 17c",
      "marketNote": "Robinhood prediction-market prices captured: Sebastian Baez 84c / Sascha Gueymard Wayenburg 17c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Sebastian-Baez-Vs-Sascha-Gueymard-Wayenburg/",
    "players": [
      {
        "name": "Sebastian Baez",
        "ranking": {
          "name": "Sebastian Baez",
          "rank": 64,
          "points": 860,
          "age": 25,
          "country": "Argentina",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/3340/sebastian-baez",
          "asOf": "2026-06-02"
        },
        "qualityName": null,
        "profile": "Live rank #64 | Argentina | age 25",
        "modelPct": 84,
        "weakness": {
          "name": "Sebastian Baez",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Sascha Gueymard Wayenburg",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 17,
        "weakness": {
          "name": "Sascha Gueymard Wayenburg",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rg-w-mirra-andreeva-sorana-cirstea-2026-06-02",
    "eventId": "175568",
    "tour": "WTA",
    "bestOf": 3,
    "surface": "Clay",
    "title": "Mirra Andreeva vs Sorana Cirstea",
    "start": "2:00 AM",
    "startMinutes": 120,
    "court": "Court Philippe-Chatrier",
    "round": "Quarterfinal",
    "pickName": "Mirra Andreeva",
    "basePickName": "Mirra Andreeva",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 64.8,
    "volatility": 54,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Lean",
      "No blind bet",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Mirra Andreeva has the recent service-hold edge 81% to 75%. Mirra Andreeva grades 5 points better on opponent-adjusted recent form. Lean, not a chase.",
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
        "name": "Mirra Andreeva",
        "serviceHoldPct": 81,
        "firstServeWonPct": 67,
        "secondServeWonPct": 54,
        "firstServePct": 66,
        "avgAces": 2.3,
        "avgDoubleFaults": 3.1,
        "avgWinners": 22.3,
        "avgUnforcedErrors": 28.5,
        "avgBreakPointsFaced": 6.9,
        "returnPointsWonPct": 51,
        "servicePointsWonPct": 63,
        "weakServeMatches": 1,
        "pressureMatches": 3,
        "matchesWithStats": 8,
        "weaknessScore": 4,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "negative winner/error balance (22.3 winners, 28.5 unforced)"
        ],
        "strengths": [
          "protects serve well (81% hold)",
          "creates return pressure (51% return points won)"
        ],
        "gameFlowRead": "Mirra Andreeva can drop points quickly through negative winner/error balance (22.3 winners, 28.5 unforced)."
      },
      "opponent": {
        "name": "Sorana Cirstea",
        "serviceHoldPct": 75,
        "firstServeWonPct": 73,
        "secondServeWonPct": 50,
        "firstServePct": 62,
        "avgAces": 2.7,
        "avgDoubleFaults": 1.1,
        "avgWinners": 18,
        "avgUnforcedErrors": 20.7,
        "avgBreakPointsFaced": 5.1,
        "returnPointsWonPct": 49,
        "servicePointsWonPct": 64,
        "weakServeMatches": 2,
        "pressureMatches": 3,
        "matchesWithStats": 7,
        "weaknessScore": 5,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [],
        "strengths": [
          "wins enough first-serve points (73%)",
          "creates return pressure (49% return points won)"
        ],
        "gameFlowRead": "Sorana Cirstea has no major service weakness in the joined Flashscore sample."
      }
    },
    "setWinProjections": [
      {
        "name": "Mirra Andreeva",
        "confidence": 77,
        "modelPct": 64.8,
        "label": "Live to win a set"
      },
      {
        "name": "Sorana Cirstea",
        "confidence": 51,
        "modelPct": 35.2,
        "label": "Thin set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Mirra Andreeva",
        "americanOdds": -196,
        "modelPct": 64.8,
        "impliedPct": 66.2,
        "edgePct": -1.4,
        "evPer100": -2.1,
        "netEvPer100": -4.1,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Near fair",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Mirra Andreeva",
        "line": -3.5,
        "americanOdds": -112,
        "modelPct": 59,
        "impliedPct": 52.8,
        "edgePct": 6.2,
        "evPer100": 11.7,
        "netEvPer100": 9.7,
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
        "expectedGames": 21,
        "valueGrade": "No direction",
        "reason": "FanDuel total is 21.5; model did not clear a full-match over/under edge from hold, return, and set-shape data. hold avg 78%, return games won 54%, first-set sample 8.5g, 36 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Under 9.5",
        "line": 9.5,
        "americanOdds": -132,
        "expectedGames": 8.1,
        "confidence": 72,
        "tiebreakRisk": 18,
        "earlyBreakRisk": 61,
        "modelPct": 72,
        "evPer100": 26.5,
        "netEvPer100": 24.5,
        "valueGrade": "Actionable live watch",
        "reason": "Expected first-set games 8.1 vs FanDuel 9.5; Under 9.5. hold avg 78%, return games won 54%, first-set sample 8.5g, 36 recent sets.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Mirra Andreeva",
          "confidence": 77,
          "modelPct": 64.8,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Sorana Cirstea",
          "confidence": 51,
          "modelPct": 35.2,
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
          "holdPct": 81,
          "firstServeWonPct": 67,
          "secondServeWonPct": 54,
          "servicePointsWonPct": 63,
          "returnPointsWonPct": 51,
          "returnGamesWonPct": 54.75,
          "breakPointsSavedPct": 0,
          "breakPointsConvertedPct": 50,
          "aces": 2.3,
          "doubleFaults": 3.1,
          "winners": 22.3,
          "unforcedErrors": 28.5,
          "weaknessScore": 4,
          "weakServeMatches": 1,
          "statMatches": 8,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 19,
            "firstSetSamples": 8,
            "avgFirstSetGames": 8.75,
            "avgSetGames": 8.31578947368421,
            "avgMatchGames": 19.75,
            "avgSetsPlayed": 2.375,
            "tiebreakRate": 0,
            "extendedSetRate": 0,
            "shortSetRate": 0.47368421052631576
          }
        },
        {
          "name": "Sorana Cirstea",
          "holdPct": 75,
          "firstServeWonPct": 73,
          "secondServeWonPct": 50,
          "servicePointsWonPct": 64,
          "returnPointsWonPct": 49,
          "returnGamesWonPct": 53.42857142857143,
          "breakPointsSavedPct": 0,
          "breakPointsConvertedPct": 48.1,
          "aces": 2.7,
          "doubleFaults": 1.1,
          "winners": 18,
          "unforcedErrors": 20.7,
          "weaknessScore": 5,
          "weakServeMatches": 2,
          "statMatches": 7,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 17,
            "firstSetSamples": 8,
            "avgFirstSetGames": 8.25,
            "avgSetGames": 8.882352941176471,
            "avgMatchGames": 18.875,
            "avgSetsPlayed": 2.125,
            "tiebreakRate": 0.11764705882352941,
            "extendedSetRate": 0.17647058823529413,
            "shortSetRate": 0.4117647058823529
          }
        }
      ],
      "expectedFirstSetGames": 8.1,
      "expectedMatchGames": 21,
      "signalStrength": 8,
      "holdAvg": 78,
      "returnGamesAvg": 54.1,
      "returnPointsAvg": 50,
      "breakPointsSavedAvg": 0,
      "breakPointsConvertedAvg": 49,
      "setSamples": 36,
      "firstSetSamples": 16,
      "avgFirstSetGames": 8.5,
      "avgSetGames": 8.6,
      "tiebreakRate": 5.9,
      "extendedSetRate": 8.8,
      "shortSetRate": 44.3,
      "reasonCore": "hold avg 78%, return games won 54%, first-set sample 8.5g, 36 recent sets"
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Mirra Andreeva",
        "line": null,
        "americanOdds": -196,
        "modelPct": 64.8,
        "impliedPct": 66.2,
        "edgePct": -1.4,
        "evPer100": -2.1,
        "netEvPer100": -4.1,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "ML is close to fair; derivative or live entry needs to carry the edge."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Mirra Andreeva",
        "line": -3.5,
        "americanOdds": -112,
        "modelPct": 59,
        "impliedPct": 52.8,
        "edgePct": 6.2,
        "evPer100": 11.7,
        "netEvPer100": 9.7,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 59,
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
        "selection": "Mirra Andreeva 77% / Sorana Cirstea 51%",
        "rows": [
          {
            "name": "Mirra Andreeva",
            "confidence": 77,
            "modelPct": 64.8,
            "label": "Live to win a set"
          },
          {
            "name": "Sorana Cirstea",
            "confidence": 51,
            "modelPct": 35.2,
            "label": "Thin set-win path"
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
        "expectedGames": 8.1,
        "confidence": 72,
        "tiebreakRisk": 18,
        "earlyBreakRisk": 61,
        "grade": "Actionable live watch",
        "reason": "Expected first-set games 8.1 vs FanDuel 9.5; Under 9.5. hold avg 78%, return games won 54%, first-set sample 8.5g, 36 recent sets."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Mirra Andreeva",
      "opponent": "Sorana Cirstea",
      "grade": "Likely winner, price taxed",
      "riskGate": "opponent return pressure",
      "marketOdds": -186,
      "fairOdds": -184,
      "modelProbability": 64.8,
      "dataOnlyProbability": 64.7,
      "marketProbability": 65,
      "marketDisagreementPct": 0.2,
      "netEvPer100": -2.4,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Mirra Andreeva does not clear a fee-adjusted value case.",
      "useCase": "Favorite price needs cleaner proof or derivative value; do not confuse win probability with bet value.",
      "bullets": [
        "Recent hold: Mirra Andreeva 80.8% vs Sorana Cirstea 75%.",
        "Serve events: Mirra Andreeva 2.3 aces / 3.1 DFs vs Sorana Cirstea 2.7 aces / 1.1 DFs.",
        "Serve points: Mirra Andreeva 1st 67.1%, 2nd 54.1% vs Sorana Cirstea 1st 72.6%, 2nd 50%.",
        "Winner/error profile: Mirra Andreeva 22.3 winners / 28.5 UEs vs Sorana Cirstea 18 winners / 20.7 UEs."
      ],
      "risks": [
        "Sorana Cirstea strength: wins enough first-serve points (73%).",
        "Mirra Andreeva risk: negative winner/error balance (22.3 winners, 28.5 unforced)."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page Chrome scrape",
      "capturedAt": "2026-06-01T23:54:02.691Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/mirra-andreeva-v-sorana-cirstea-35672154",
      "eventId": "35672154",
      "players": [
        {
          "name": "Mirra Andreeva",
          "odds": -196,
          "americanLabel": "-196",
          "impliedPct": 66.2,
          "decimalOdds": 1.51,
          "modelPct": 64.8,
          "edgePct": -1.4,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 51,
          "grossPayoutMultiple": 1.51,
          "centsAtRisk": 100,
          "centsProfitIfWin": 51
        },
        {
          "name": "Sorana Cirstea",
          "odds": 162,
          "americanLabel": "+162",
          "impliedPct": 38.2,
          "decimalOdds": 2.62,
          "modelPct": 35.2,
          "edgePct": -3,
          "priceBand": "Underdog",
          "grossProfitPct": 162,
          "grossPayoutMultiple": 2.62,
          "centsAtRisk": 100,
          "centsProfitIfWin": 162
        }
      ],
      "desk": {
        "name": "Mirra Andreeva",
        "odds": -196,
        "americanLabel": "-196",
        "impliedPct": 66.2,
        "decimalOdds": 1.51,
        "modelPct": 64.8,
        "edgePct": -1.4,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 51,
        "grossPayoutMultiple": 1.51,
        "centsAtRisk": 100,
        "centsProfitIfWin": 51
      },
      "spread": {
        "player": "Mirra Andreeva",
        "spread": -3.5,
        "odds": -112
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
      "priceAction": "ML is close to fair; derivative or live entry needs to carry the edge.",
      "spreadValue": "Mirra Andreeva -3.5 (-112)",
      "totalValue": "21.5 games: Over -118 / Under -112",
      "firstSetTotalValue": "9.5 1st-set games: Over -106 / Under -132",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Mirra Andreeva -196 / Sorana Cirstea +162",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. ML is close to fair; derivative or live entry needs to carry the edge.",
      "noVigNote": "Model 64.8% vs FanDuel implied 66.2% (-1.4 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Mirra-Andreeva-Vs-Sorana-Cirstea/",
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
          "asOf": "2026-06-02"
        },
        "qualityName": "Mirra Andreeva",
        "profile": "Live rank #8 | Russia | age 19 | 2026 clay 19-3, 86% | adj form 97 | hold 81%",
        "modelPct": 64.8,
        "weakness": {
          "name": "Mirra Andreeva",
          "serviceHoldPct": 81,
          "firstServeWonPct": 67,
          "secondServeWonPct": 54,
          "firstServePct": 66,
          "avgAces": 2.3,
          "avgDoubleFaults": 3.1,
          "avgWinners": 22.3,
          "avgUnforcedErrors": 28.5,
          "avgBreakPointsFaced": 6.9,
          "returnPointsWonPct": 51,
          "servicePointsWonPct": 63,
          "weakServeMatches": 1,
          "pressureMatches": 3,
          "matchesWithStats": 8,
          "weaknessScore": 4,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "negative winner/error balance (22.3 winners, 28.5 unforced)"
          ],
          "strengths": [
            "protects serve well (81% hold)",
            "creates return pressure (51% return points won)"
          ],
          "gameFlowRead": "Mirra Andreeva can drop points quickly through negative winner/error balance (22.3 winners, 28.5 unforced)."
        }
      },
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
          "asOf": "2026-06-02"
        },
        "qualityName": "Sorana Cirstea",
        "profile": "Live rank #18 | Romania | age 36 | 2026 clay 14-3, 82% | adj form 91 | hold 75%",
        "modelPct": 35.2,
        "weakness": {
          "name": "Sorana Cirstea",
          "serviceHoldPct": 75,
          "firstServeWonPct": 73,
          "secondServeWonPct": 50,
          "firstServePct": 62,
          "avgAces": 2.7,
          "avgDoubleFaults": 1.1,
          "avgWinners": 18,
          "avgUnforcedErrors": 20.7,
          "avgBreakPointsFaced": 5.1,
          "returnPointsWonPct": 49,
          "servicePointsWonPct": 64,
          "weakServeMatches": 2,
          "pressureMatches": 3,
          "matchesWithStats": 7,
          "weaknessScore": 5,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [],
          "strengths": [
            "wins enough first-serve points (73%)",
            "creates return pressure (49% return points won)"
          ],
          "gameFlowRead": "Sorana Cirstea has no major service weakness in the joined Flashscore sample."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-centurion-2-santillan-vs-donski-2026-06-02",
    "eventId": "ce951214-9e0e-4f98-87d6-314bf68241f5",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Akira Santillan vs Alexander Donski",
    "start": "2:10 AM",
    "startMinutes": 130,
    "court": "ATP Challenger Centurion 2",
    "round": "Round Of 32",
    "stage": "ATP Challenger Centurion 2 | Round Of 32",
    "pickName": "Akira Santillan",
    "basePickName": "Akira Santillan",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 66,
    "volatility": 65,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Akira Santillan is only the current Robinhood market favorite over Alexander Donski; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Akira Santillan",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Alexander Donski",
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
        "name": "Akira Santillan",
        "confidence": 74,
        "modelPct": 66,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Alexander Donski",
        "confidence": 56,
        "modelPct": 37,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Akira Santillan",
        "americanOdds": null,
        "modelPct": 66,
        "impliedPct": 66,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Akira Santillan",
          "confidence": 74,
          "modelPct": 66,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Alexander Donski",
          "confidence": 56,
          "modelPct": 37,
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
        "selection": "Akira Santillan",
        "line": null,
        "americanOdds": null,
        "modelPct": 66,
        "impliedPct": 66,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Akira Santillan 74% / Alexander Donski 56%",
        "rows": [
          {
            "name": "Akira Santillan",
            "confidence": 74,
            "modelPct": 66,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Alexander Donski",
            "confidence": 56,
            "modelPct": 37,
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
        "selection": "Price required",
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "ce951214-9e0e-4f98-87d6-314bf68241f5",
      "totalOpenInterest": 0,
      "totalVolume": 0,
      "players": [
        {
          "name": "Akira Santillan",
          "odds": null,
          "americanLabel": "66c",
          "impliedPct": 66,
          "bidPct": 63,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 66,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 34,
          "grossPayoutMultiple": 1.515,
          "centsAtRisk": 66,
          "centsProfitIfWin": 34,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02SANDON-SAN"
        },
        {
          "name": "Alexander Donski",
          "odds": null,
          "americanLabel": "37c",
          "impliedPct": 37,
          "bidPct": 36,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 37,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 63,
          "grossPayoutMultiple": 2.703,
          "centsAtRisk": 37,
          "centsProfitIfWin": 63,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02SANDON-DON"
        }
      ],
      "desk": {
        "name": "Akira Santillan",
        "odds": null,
        "americanLabel": "66c",
        "impliedPct": 66,
        "bidPct": 63,
        "lastTradePct": 0,
        "decimalOdds": null,
        "modelPct": 66,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 34,
        "grossPayoutMultiple": 1.515,
        "centsAtRisk": 66,
        "centsProfitIfWin": 34,
        "openInterest": 0,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02SANDON-SAN"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Akira Santillan 66c / Alexander Donski 37c",
      "marketNote": "Robinhood prediction-market prices captured: Akira Santillan 66c / Alexander Donski 37c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Akira-Santillan-Vs-Alexander-Donski/",
    "players": [
      {
        "name": "Akira Santillan",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 66,
        "weakness": {
          "name": "Akira Santillan",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Alexander Donski",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 37,
        "weakness": {
          "name": "Alexander Donski",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-perugia-broady-vs-jorda-sanchis-2026-06-02",
    "eventId": "ab800d71-39a2-4c5f-b20d-b84995f53f44",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "David Jorda Sanchis vs Liam Broady",
    "start": "2:10 AM",
    "startMinutes": 130,
    "court": "ATP Challenger Perugia",
    "round": "Round Of 32",
    "stage": "ATP Challenger Perugia | Round Of 32",
    "pickName": "David Jorda Sanchis",
    "basePickName": "David Jorda Sanchis",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 53,
    "volatility": 77,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "David Jorda Sanchis is only the current Robinhood market favorite over Liam Broady; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "David Jorda Sanchis",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Liam Broady",
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
        "name": "David Jorda Sanchis",
        "confidence": 61,
        "modelPct": 53,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Liam Broady",
        "confidence": 69,
        "modelPct": 50,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "David Jorda Sanchis",
        "americanOdds": null,
        "modelPct": 53,
        "impliedPct": 53,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 10.1,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "David Jorda Sanchis",
          "confidence": 61,
          "modelPct": 53,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Liam Broady",
          "confidence": 69,
          "modelPct": 50,
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
        "selection": "David Jorda Sanchis",
        "line": null,
        "americanOdds": null,
        "modelPct": 53,
        "impliedPct": 53,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "David Jorda Sanchis 61% / Liam Broady 69%",
        "rows": [
          {
            "name": "David Jorda Sanchis",
            "confidence": 61,
            "modelPct": 53,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Liam Broady",
            "confidence": 69,
            "modelPct": 50,
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
        "selection": "Price required",
        "expectedGames": 10.1,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "ab800d71-39a2-4c5f-b20d-b84995f53f44",
      "totalOpenInterest": 36,
      "totalVolume": 0,
      "players": [
        {
          "name": "David Jorda Sanchis",
          "odds": null,
          "americanLabel": "53c",
          "impliedPct": 53,
          "bidPct": 50,
          "lastTradePct": 53,
          "decimalOdds": null,
          "modelPct": 53,
          "edgePct": null,
          "priceBand": "Coinflip",
          "grossProfitPct": 47,
          "grossPayoutMultiple": 1.887,
          "centsAtRisk": 53,
          "centsProfitIfWin": 47,
          "openInterest": 36,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02BROJOR-JOR"
        },
        {
          "name": "Liam Broady",
          "odds": null,
          "americanLabel": "50c",
          "impliedPct": 50,
          "bidPct": 47,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 50,
          "edgePct": null,
          "priceBand": "Coinflip",
          "grossProfitPct": 50,
          "grossPayoutMultiple": 2,
          "centsAtRisk": 50,
          "centsProfitIfWin": 50,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02BROJOR-BRO"
        }
      ],
      "desk": {
        "name": "David Jorda Sanchis",
        "odds": null,
        "americanLabel": "53c",
        "impliedPct": 53,
        "bidPct": 50,
        "lastTradePct": 53,
        "decimalOdds": null,
        "modelPct": 53,
        "edgePct": null,
        "priceBand": "Coinflip",
        "grossProfitPct": 47,
        "grossPayoutMultiple": 1.887,
        "centsAtRisk": 53,
        "centsProfitIfWin": 47,
        "openInterest": 36,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02BROJOR-JOR"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "David Jorda Sanchis 53c / Liam Broady 50c",
      "marketNote": "Robinhood prediction-market prices captured: David Jorda Sanchis 53c / Liam Broady 50c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/David-Jorda-Sanchis-Vs-Liam-Broady/",
    "players": [
      {
        "name": "David Jorda Sanchis",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 53,
        "weakness": {
          "name": "David Jorda Sanchis",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Liam Broady",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 50,
        "weakness": {
          "name": "Liam Broady",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-centurion-2-dalmasso-vs-bittoun-kouzmine-2026-06-02",
    "eventId": "e6de1359-20fb-468d-85a4-4c172ae5d355",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Guillaume Dalmasso vs Constantin Bittoun Kouzmine",
    "start": "2:10 AM",
    "startMinutes": 130,
    "court": "ATP Challenger Centurion 2",
    "round": "Round Of 32",
    "stage": "ATP Challenger Centurion 2 | Round Of 32",
    "pickName": "Constantin Bittoun Kouzmine",
    "basePickName": "Constantin Bittoun Kouzmine",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 58,
    "volatility": 72,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Constantin Bittoun Kouzmine is only the current Robinhood market favorite over Guillaume Dalmasso; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Constantin Bittoun Kouzmine",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Guillaume Dalmasso",
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
        "name": "Guillaume Dalmasso",
        "confidence": 64,
        "modelPct": 44,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Constantin Bittoun Kouzmine",
        "confidence": 66,
        "modelPct": 58,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Constantin Bittoun Kouzmine",
        "americanOdds": null,
        "modelPct": 58,
        "impliedPct": 58,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Guillaume Dalmasso",
          "confidence": 64,
          "modelPct": 44,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Constantin Bittoun Kouzmine",
          "confidence": 66,
          "modelPct": 58,
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
        "selection": "Constantin Bittoun Kouzmine",
        "line": null,
        "americanOdds": null,
        "modelPct": 58,
        "impliedPct": 58,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Guillaume Dalmasso 64% / Constantin Bittoun Kouzmine 66%",
        "rows": [
          {
            "name": "Guillaume Dalmasso",
            "confidence": 64,
            "modelPct": 44,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Constantin Bittoun Kouzmine",
            "confidence": 66,
            "modelPct": 58,
            "label": "Market favorite to win a set"
          }
        ],
        "confidence": 66,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Price required",
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "e6de1359-20fb-468d-85a4-4c172ae5d355",
      "totalOpenInterest": 0,
      "totalVolume": 0,
      "players": [
        {
          "name": "Guillaume Dalmasso",
          "odds": null,
          "americanLabel": "44c",
          "impliedPct": 44,
          "bidPct": 42,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 44,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 56,
          "grossPayoutMultiple": 2.273,
          "centsAtRisk": 44,
          "centsProfitIfWin": 56,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02DALBIT-DAL"
        },
        {
          "name": "Constantin Bittoun Kouzmine",
          "odds": null,
          "americanLabel": "58c",
          "impliedPct": 58,
          "bidPct": 56,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 58,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 42,
          "grossPayoutMultiple": 1.724,
          "centsAtRisk": 58,
          "centsProfitIfWin": 42,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02DALBIT-BIT"
        }
      ],
      "desk": {
        "name": "Constantin Bittoun Kouzmine",
        "odds": null,
        "americanLabel": "58c",
        "impliedPct": 58,
        "bidPct": 56,
        "lastTradePct": 0,
        "decimalOdds": null,
        "modelPct": 58,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 42,
        "grossPayoutMultiple": 1.724,
        "centsAtRisk": 58,
        "centsProfitIfWin": 42,
        "openInterest": 0,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02DALBIT-BIT"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Guillaume Dalmasso 44c / Constantin Bittoun Kouzmine 58c",
      "marketNote": "Robinhood prediction-market prices captured: Guillaume Dalmasso 44c / Constantin Bittoun Kouzmine 58c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Guillaume-Dalmasso-Vs-Constantin-Bittoun-Kouzmine/",
    "players": [
      {
        "name": "Guillaume Dalmasso",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 44,
        "weakness": {
          "name": "Guillaume Dalmasso",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Constantin Bittoun Kouzmine",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 58,
        "weakness": {
          "name": "Constantin Bittoun Kouzmine",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-centurion-2-montsi-vs-hemery-2026-06-02",
    "eventId": "9452c33b-91c5-4214-9677-0e8973861d1b",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Khololwam Montsi vs Calvin Hemery",
    "start": "2:10 AM",
    "startMinutes": 130,
    "court": "ATP Challenger Centurion 2",
    "round": "Round Of 32",
    "stage": "ATP Challenger Centurion 2 | Round Of 32",
    "pickName": "Calvin Hemery",
    "basePickName": "Calvin Hemery",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 66,
    "volatility": 65,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Calvin Hemery is only the current Robinhood market favorite over Khololwam Montsi; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Calvin Hemery",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Khololwam Montsi",
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
        "name": "Khololwam Montsi",
        "confidence": 56,
        "modelPct": 37,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Calvin Hemery",
        "confidence": 74,
        "modelPct": 66,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Calvin Hemery",
        "americanOdds": null,
        "modelPct": 66,
        "impliedPct": 66,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Khololwam Montsi",
          "confidence": 56,
          "modelPct": 37,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Calvin Hemery",
          "confidence": 74,
          "modelPct": 66,
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
        "selection": "Calvin Hemery",
        "line": null,
        "americanOdds": null,
        "modelPct": 66,
        "impliedPct": 66,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Khololwam Montsi 56% / Calvin Hemery 74%",
        "rows": [
          {
            "name": "Khololwam Montsi",
            "confidence": 56,
            "modelPct": 37,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Calvin Hemery",
            "confidence": 74,
            "modelPct": 66,
            "label": "Market favorite to win a set"
          }
        ],
        "confidence": 74,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Price required",
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "9452c33b-91c5-4214-9677-0e8973861d1b",
      "totalOpenInterest": 0,
      "totalVolume": 0,
      "players": [
        {
          "name": "Khololwam Montsi",
          "odds": null,
          "americanLabel": "37c",
          "impliedPct": 37,
          "bidPct": 35,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 37,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 63,
          "grossPayoutMultiple": 2.703,
          "centsAtRisk": 37,
          "centsProfitIfWin": 63,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02MONHEM-MON"
        },
        {
          "name": "Calvin Hemery",
          "odds": null,
          "americanLabel": "66c",
          "impliedPct": 66,
          "bidPct": 61,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 66,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 34,
          "grossPayoutMultiple": 1.515,
          "centsAtRisk": 66,
          "centsProfitIfWin": 34,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02MONHEM-HEM"
        }
      ],
      "desk": {
        "name": "Calvin Hemery",
        "odds": null,
        "americanLabel": "66c",
        "impliedPct": 66,
        "bidPct": 61,
        "lastTradePct": 0,
        "decimalOdds": null,
        "modelPct": 66,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 34,
        "grossPayoutMultiple": 1.515,
        "centsAtRisk": 66,
        "centsProfitIfWin": 34,
        "openInterest": 0,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02MONHEM-HEM"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Khololwam Montsi 37c / Calvin Hemery 66c",
      "marketNote": "Robinhood prediction-market prices captured: Khololwam Montsi 37c / Calvin Hemery 66c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Khololwam-Montsi-Vs-Calvin-Hemery/",
    "players": [
      {
        "name": "Khololwam Montsi",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 37,
        "weakness": {
          "name": "Khololwam Montsi",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Calvin Hemery",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 66,
        "weakness": {
          "name": "Calvin Hemery",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-perugia-royer-vs-alvarez-varona-2026-06-02",
    "eventId": "4cd23202-45db-4a75-9dd1-84b7cdff7fc2",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Valentin Royer vs Nicolas Alvarez Varona",
    "start": "2:10 AM",
    "startMinutes": 130,
    "court": "ATP Challenger Perugia",
    "round": "Round Of 32",
    "stage": "ATP Challenger Perugia | Round Of 32",
    "pickName": "Valentin Royer",
    "basePickName": "Valentin Royer",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 77,
    "volatility": 55,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Market favorite"
    ],
    "reason": "Valentin Royer is only the current Robinhood market favorite over Nicolas Alvarez Varona; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Valentin Royer",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Nicolas Alvarez Varona",
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
        "name": "Valentin Royer",
        "confidence": 85,
        "modelPct": 77,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Nicolas Alvarez Varona",
        "confidence": 45,
        "modelPct": 26,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Valentin Royer",
        "americanOdds": null,
        "modelPct": 77,
        "impliedPct": 77,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 48,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Valentin Royer",
          "confidence": 85,
          "modelPct": 77,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Nicolas Alvarez Varona",
          "confidence": 45,
          "modelPct": 26,
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
        "selection": "Valentin Royer",
        "line": null,
        "americanOdds": null,
        "modelPct": 77,
        "impliedPct": 77,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Valentin Royer 85% / Nicolas Alvarez Varona 45%",
        "rows": [
          {
            "name": "Valentin Royer",
            "confidence": 85,
            "modelPct": 77,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Nicolas Alvarez Varona",
            "confidence": 45,
            "modelPct": 26,
            "label": "Underdog set-win path needs early holds"
          }
        ],
        "confidence": 85,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Price required",
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
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
      "eventId": "4cd23202-45db-4a75-9dd1-84b7cdff7fc2",
      "totalOpenInterest": 1,
      "totalVolume": 0,
      "players": [
        {
          "name": "Valentin Royer",
          "odds": null,
          "americanLabel": "77c",
          "impliedPct": 77,
          "bidPct": 74,
          "lastTradePct": 77,
          "decimalOdds": null,
          "modelPct": 77,
          "edgePct": null,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 23,
          "grossPayoutMultiple": 1.299,
          "centsAtRisk": 77,
          "centsProfitIfWin": 23,
          "openInterest": 1,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02ROYALV-ROY"
        },
        {
          "name": "Nicolas Alvarez Varona",
          "odds": null,
          "americanLabel": "26c",
          "impliedPct": 26,
          "bidPct": 23,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 26,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 74,
          "grossPayoutMultiple": 3.846,
          "centsAtRisk": 26,
          "centsProfitIfWin": 74,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02ROYALV-ALV"
        }
      ],
      "desk": {
        "name": "Valentin Royer",
        "odds": null,
        "americanLabel": "77c",
        "impliedPct": 77,
        "bidPct": 74,
        "lastTradePct": 77,
        "decimalOdds": null,
        "modelPct": 77,
        "edgePct": null,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 23,
        "grossPayoutMultiple": 1.299,
        "centsAtRisk": 77,
        "centsProfitIfWin": 23,
        "openInterest": 1,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02ROYALV-ROY"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Valentin Royer 77c / Nicolas Alvarez Varona 26c",
      "marketNote": "Robinhood prediction-market prices captured: Valentin Royer 77c / Nicolas Alvarez Varona 26c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Valentin-Royer-Vs-Nicolas-Alvarez-Varona/",
    "players": [
      {
        "name": "Valentin Royer",
        "ranking": {
          "name": "Valentin Royer",
          "rank": 74,
          "points": 773,
          "age": 25,
          "country": "France",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/4022/valentin-royer",
          "asOf": "2026-06-02"
        },
        "qualityName": null,
        "profile": "Live rank #74 | France | age 25",
        "modelPct": 77,
        "weakness": {
          "name": "Valentin Royer",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Nicolas Alvarez Varona",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 26,
        "weakness": {
          "name": "Nicolas Alvarez Varona",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-perugia-cretu-vs-vasami-2026-06-02",
    "eventId": "1dfba6d4-89a2-4c98-9f6d-521b34c23c7c",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Cezar Cretu (b. 2001) vs Jacopo Vasami",
    "start": "2:30 AM",
    "startMinutes": 150,
    "court": "ATP Challenger Perugia",
    "round": "Round Of 32",
    "stage": "ATP Challenger Perugia | Round Of 32",
    "pickName": "Jacopo Vasami",
    "basePickName": "Jacopo Vasami",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 58,
    "volatility": 72,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Jacopo Vasami is only the current Robinhood market favorite over Cezar Cretu (b. 2001); no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Jacopo Vasami",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Cezar Cretu (b. 2001)",
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
        "name": "Cezar Cretu (b. 2001)",
        "confidence": 64,
        "modelPct": 45,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Jacopo Vasami",
        "confidence": 66,
        "modelPct": 58,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Jacopo Vasami",
        "americanOdds": null,
        "modelPct": 58,
        "impliedPct": 58,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Cezar Cretu (b. 2001)",
          "confidence": 64,
          "modelPct": 45,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Jacopo Vasami",
          "confidence": 66,
          "modelPct": 58,
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
        "selection": "Jacopo Vasami",
        "line": null,
        "americanOdds": null,
        "modelPct": 58,
        "impliedPct": 58,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Cezar Cretu (b. 2001) 64% / Jacopo Vasami 66%",
        "rows": [
          {
            "name": "Cezar Cretu (b. 2001)",
            "confidence": 64,
            "modelPct": 45,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Jacopo Vasami",
            "confidence": 66,
            "modelPct": 58,
            "label": "Market favorite to win a set"
          }
        ],
        "confidence": 66,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Price required",
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "1dfba6d4-89a2-4c98-9f6d-521b34c23c7c",
      "totalOpenInterest": 0,
      "totalVolume": 0,
      "players": [
        {
          "name": "Cezar Cretu (b. 2001)",
          "odds": null,
          "americanLabel": "45c",
          "impliedPct": 45,
          "bidPct": 42,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 45,
          "edgePct": null,
          "priceBand": "Coinflip",
          "grossProfitPct": 55,
          "grossPayoutMultiple": 2.222,
          "centsAtRisk": 45,
          "centsProfitIfWin": 55,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02CREVAS-CRE"
        },
        {
          "name": "Jacopo Vasami",
          "odds": null,
          "americanLabel": "58c",
          "impliedPct": 58,
          "bidPct": 55,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 58,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 42,
          "grossPayoutMultiple": 1.724,
          "centsAtRisk": 58,
          "centsProfitIfWin": 42,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02CREVAS-VAS"
        }
      ],
      "desk": {
        "name": "Jacopo Vasami",
        "odds": null,
        "americanLabel": "58c",
        "impliedPct": 58,
        "bidPct": 55,
        "lastTradePct": 0,
        "decimalOdds": null,
        "modelPct": 58,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 42,
        "grossPayoutMultiple": 1.724,
        "centsAtRisk": 58,
        "centsProfitIfWin": 42,
        "openInterest": 0,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02CREVAS-VAS"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Cezar Cretu (b. 2001) 45c / Jacopo Vasami 58c",
      "marketNote": "Robinhood prediction-market prices captured: Cezar Cretu (b. 2001) 45c / Jacopo Vasami 58c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Cezar-Cretu-b-2001-Vs-Jacopo-Vasami/",
    "players": [
      {
        "name": "Cezar Cretu (b. 2001)",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 45,
        "weakness": {
          "name": "Cezar Cretu (b. 2001)",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Jacopo Vasami",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 58,
        "weakness": {
          "name": "Jacopo Vasami",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-bad-rappenau-dellien-vs-schoenhaus-2026-06-02",
    "eventId": "200a1246-172e-4d55-97a1-8bfdcae8175b",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Hugo Dellien vs Max Schoenhaus",
    "start": "2:30 AM",
    "startMinutes": 150,
    "court": "ATP Challenger Bad Rappenau",
    "round": "Round Of 32",
    "stage": "ATP Challenger Bad Rappenau | Round Of 32",
    "pickName": "Hugo Dellien",
    "basePickName": "Hugo Dellien",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 61,
    "volatility": 69,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Hugo Dellien is only the current Robinhood market favorite over Max Schoenhaus; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Hugo Dellien",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Max Schoenhaus",
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
        "name": "Hugo Dellien",
        "confidence": 69,
        "modelPct": 61,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Max Schoenhaus",
        "confidence": 61,
        "modelPct": 42,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Hugo Dellien",
        "americanOdds": null,
        "modelPct": 61,
        "impliedPct": 61,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Hugo Dellien",
          "confidence": 69,
          "modelPct": 61,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Max Schoenhaus",
          "confidence": 61,
          "modelPct": 42,
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
        "selection": "Hugo Dellien",
        "line": null,
        "americanOdds": null,
        "modelPct": 61,
        "impliedPct": 61,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Hugo Dellien 69% / Max Schoenhaus 61%",
        "rows": [
          {
            "name": "Hugo Dellien",
            "confidence": 69,
            "modelPct": 61,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Max Schoenhaus",
            "confidence": 61,
            "modelPct": 42,
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
        "selection": "Price required",
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "200a1246-172e-4d55-97a1-8bfdcae8175b",
      "totalOpenInterest": 34,
      "totalVolume": 0,
      "players": [
        {
          "name": "Hugo Dellien",
          "odds": null,
          "americanLabel": "61c",
          "impliedPct": 61,
          "bidPct": 58,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 61,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 39,
          "grossPayoutMultiple": 1.639,
          "centsAtRisk": 61,
          "centsProfitIfWin": 39,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02DELSCH-DEL"
        },
        {
          "name": "Max Schoenhaus",
          "odds": null,
          "americanLabel": "42c",
          "impliedPct": 42,
          "bidPct": 40,
          "lastTradePct": 42,
          "decimalOdds": null,
          "modelPct": 42,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 58,
          "grossPayoutMultiple": 2.381,
          "centsAtRisk": 42,
          "centsProfitIfWin": 58,
          "openInterest": 34,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02DELSCH-SCH"
        }
      ],
      "desk": {
        "name": "Hugo Dellien",
        "odds": null,
        "americanLabel": "61c",
        "impliedPct": 61,
        "bidPct": 58,
        "lastTradePct": 0,
        "decimalOdds": null,
        "modelPct": 61,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 39,
        "grossPayoutMultiple": 1.639,
        "centsAtRisk": 61,
        "centsProfitIfWin": 39,
        "openInterest": 0,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02DELSCH-DEL"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Hugo Dellien 61c / Max Schoenhaus 42c",
      "marketNote": "Robinhood prediction-market prices captured: Hugo Dellien 61c / Max Schoenhaus 42c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Hugo-Dellien-Vs-Max-Schoenhaus/",
    "players": [
      {
        "name": "Hugo Dellien",
        "ranking": {
          "name": "Hugo Dellien",
          "rank": 144,
          "points": 421,
          "age": 32,
          "country": "Bolivia",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/1849/hugo-dellien",
          "asOf": "2026-06-02"
        },
        "qualityName": null,
        "profile": "Live rank #144 | Bolivia | age 32",
        "modelPct": 61,
        "weakness": {
          "name": "Hugo Dellien",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Max Schoenhaus",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 42,
        "weakness": {
          "name": "Max Schoenhaus",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-birmingham-duckworth-vs-harris-2026-06-02",
    "eventId": "d36a27b6-b643-4aa4-adca-3a08d77d981f",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "James Duckworth vs Billy Harris",
    "start": "2:30 AM",
    "startMinutes": 150,
    "court": "ATP Challenger Birmingham",
    "round": "Round Of 32",
    "stage": "ATP Challenger Birmingham | Round Of 32",
    "pickName": "James Duckworth",
    "basePickName": "James Duckworth",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 64,
    "volatility": 67,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "James Duckworth is only the current Robinhood market favorite over Billy Harris; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "James Duckworth",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Billy Harris",
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
        "name": "James Duckworth",
        "confidence": 72,
        "modelPct": 64,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Billy Harris",
        "confidence": 58,
        "modelPct": 39,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "James Duckworth",
        "americanOdds": null,
        "modelPct": 64,
        "impliedPct": 64,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "James Duckworth",
          "confidence": 72,
          "modelPct": 64,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Billy Harris",
          "confidence": 58,
          "modelPct": 39,
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
        "selection": "James Duckworth",
        "line": null,
        "americanOdds": null,
        "modelPct": 64,
        "impliedPct": 64,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "James Duckworth 72% / Billy Harris 58%",
        "rows": [
          {
            "name": "James Duckworth",
            "confidence": 72,
            "modelPct": 64,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Billy Harris",
            "confidence": 58,
            "modelPct": 39,
            "label": "Underdog set-win path needs early holds"
          }
        ],
        "confidence": 72,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Price required",
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "d36a27b6-b643-4aa4-adca-3a08d77d981f",
      "totalOpenInterest": 131,
      "totalVolume": 0,
      "players": [
        {
          "name": "James Duckworth",
          "odds": null,
          "americanLabel": "64c",
          "impliedPct": 64,
          "bidPct": 61,
          "lastTradePct": 64,
          "decimalOdds": null,
          "modelPct": 64,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 36,
          "grossPayoutMultiple": 1.563,
          "centsAtRisk": 64,
          "centsProfitIfWin": 36,
          "openInterest": 131,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02DUCHAR-DUC"
        },
        {
          "name": "Billy Harris",
          "odds": null,
          "americanLabel": "39c",
          "impliedPct": 39,
          "bidPct": 36,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 39,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 61,
          "grossPayoutMultiple": 2.564,
          "centsAtRisk": 39,
          "centsProfitIfWin": 61,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02DUCHAR-HAR"
        }
      ],
      "desk": {
        "name": "James Duckworth",
        "odds": null,
        "americanLabel": "64c",
        "impliedPct": 64,
        "bidPct": 61,
        "lastTradePct": 64,
        "decimalOdds": null,
        "modelPct": 64,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 36,
        "grossPayoutMultiple": 1.563,
        "centsAtRisk": 64,
        "centsProfitIfWin": 36,
        "openInterest": 131,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02DUCHAR-DUC"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "James Duckworth 64c / Billy Harris 39c",
      "marketNote": "Robinhood prediction-market prices captured: James Duckworth 64c / Billy Harris 39c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/James-Duckworth-Vs-Billy-Harris/",
    "players": [
      {
        "name": "James Duckworth",
        "ranking": {
          "name": "James Duckworth",
          "rank": 82,
          "points": 722,
          "age": 34,
          "country": "Australia",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/1857/james-duckworth",
          "asOf": "2026-06-02"
        },
        "qualityName": null,
        "profile": "Live rank #82 | Australia | age 34",
        "modelPct": 64,
        "weakness": {
          "name": "James Duckworth",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
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
          "profileUrl": "https://www.espn.com/tennis/player/_/id/2361/billy-harris",
          "asOf": "2026-06-02"
        },
        "qualityName": null,
        "profile": "Live rank #150 | Great Britain | age 31",
        "modelPct": 39,
        "weakness": {
          "name": "Billy Harris",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-bad-rappenau-reis-da-silva-vs-barrena-2026-06-02",
    "eventId": "bbce0136-ed15-48e9-889b-05070c4a8d3d",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Joao Lucas Reis Da Silva vs Alex Barrena",
    "start": "2:30 AM",
    "startMinutes": 150,
    "court": "ATP Challenger Bad Rappenau",
    "round": "Round Of 32",
    "stage": "ATP Challenger Bad Rappenau | Round Of 32",
    "pickName": "Joao Lucas Reis Da Silva",
    "basePickName": "Joao Lucas Reis Da Silva",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 58,
    "volatility": 72,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Joao Lucas Reis Da Silva is only the current Robinhood market favorite over Alex Barrena; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Joao Lucas Reis Da Silva",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Alex Barrena",
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
        "name": "Joao Lucas Reis Da Silva",
        "confidence": 66,
        "modelPct": 58,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Alex Barrena",
        "confidence": 64,
        "modelPct": 45,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Joao Lucas Reis Da Silva",
        "americanOdds": null,
        "modelPct": 58,
        "impliedPct": 58,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Joao Lucas Reis Da Silva",
          "confidence": 66,
          "modelPct": 58,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Alex Barrena",
          "confidence": 64,
          "modelPct": 45,
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
        "selection": "Joao Lucas Reis Da Silva",
        "line": null,
        "americanOdds": null,
        "modelPct": 58,
        "impliedPct": 58,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Joao Lucas Reis Da Silva 66% / Alex Barrena 64%",
        "rows": [
          {
            "name": "Joao Lucas Reis Da Silva",
            "confidence": 66,
            "modelPct": 58,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Alex Barrena",
            "confidence": 64,
            "modelPct": 45,
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
        "selection": "Price required",
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "bbce0136-ed15-48e9-889b-05070c4a8d3d",
      "totalOpenInterest": 77,
      "totalVolume": 0,
      "players": [
        {
          "name": "Joao Lucas Reis Da Silva",
          "odds": null,
          "americanLabel": "58c",
          "impliedPct": 58,
          "bidPct": 55,
          "lastTradePct": 58,
          "decimalOdds": null,
          "modelPct": 58,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 42,
          "grossPayoutMultiple": 1.724,
          "centsAtRisk": 58,
          "centsProfitIfWin": 42,
          "openInterest": 65,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02REIBAR-REI"
        },
        {
          "name": "Alex Barrena",
          "odds": null,
          "americanLabel": "45c",
          "impliedPct": 45,
          "bidPct": 42,
          "lastTradePct": 45,
          "decimalOdds": null,
          "modelPct": 45,
          "edgePct": null,
          "priceBand": "Coinflip",
          "grossProfitPct": 55,
          "grossPayoutMultiple": 2.222,
          "centsAtRisk": 45,
          "centsProfitIfWin": 55,
          "openInterest": 12,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02REIBAR-BAR"
        }
      ],
      "desk": {
        "name": "Joao Lucas Reis Da Silva",
        "odds": null,
        "americanLabel": "58c",
        "impliedPct": 58,
        "bidPct": 55,
        "lastTradePct": 58,
        "decimalOdds": null,
        "modelPct": 58,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 42,
        "grossPayoutMultiple": 1.724,
        "centsAtRisk": 58,
        "centsProfitIfWin": 42,
        "openInterest": 65,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02REIBAR-REI"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Joao Lucas Reis Da Silva 58c / Alex Barrena 45c",
      "marketNote": "Robinhood prediction-market prices captured: Joao Lucas Reis Da Silva 58c / Alex Barrena 45c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Joao-Lucas-Reis-Da-Silva-Vs-Alex-Barrena/",
    "players": [
      {
        "name": "Joao Lucas Reis Da Silva",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 58,
        "weakness": {
          "name": "Joao Lucas Reis Da Silva",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Alex Barrena",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 45,
        "weakness": {
          "name": "Alex Barrena",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-birmingham-lajal-vs-riedi-2026-06-02",
    "eventId": "a8c250d0-26f5-415d-a3e3-996ecd5f78b4",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Leandro Riedi vs Mark Lajal",
    "start": "2:30 AM",
    "startMinutes": 150,
    "court": "ATP Challenger Birmingham",
    "round": "Round Of 32",
    "stage": "ATP Challenger Birmingham | Round Of 32",
    "pickName": "Leandro Riedi",
    "basePickName": "Leandro Riedi",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 64,
    "volatility": 66,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Leandro Riedi is only the current Robinhood market favorite over Mark Lajal; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Leandro Riedi",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Mark Lajal",
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
        "name": "Leandro Riedi",
        "confidence": 72,
        "modelPct": 64,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Mark Lajal",
        "confidence": 58,
        "modelPct": 38,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Leandro Riedi",
        "americanOdds": null,
        "modelPct": 64,
        "impliedPct": 64,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Leandro Riedi",
          "confidence": 72,
          "modelPct": 64,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Mark Lajal",
          "confidence": 58,
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
        "selection": "Leandro Riedi",
        "line": null,
        "americanOdds": null,
        "modelPct": 64,
        "impliedPct": 64,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Leandro Riedi 72% / Mark Lajal 58%",
        "rows": [
          {
            "name": "Leandro Riedi",
            "confidence": 72,
            "modelPct": 64,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Mark Lajal",
            "confidence": 58,
            "modelPct": 38,
            "label": "Underdog set-win path needs early holds"
          }
        ],
        "confidence": 72,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Price required",
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "a8c250d0-26f5-415d-a3e3-996ecd5f78b4",
      "totalOpenInterest": 4332,
      "totalVolume": 0,
      "players": [
        {
          "name": "Leandro Riedi",
          "odds": null,
          "americanLabel": "64c",
          "impliedPct": 64,
          "bidPct": 62,
          "lastTradePct": 64,
          "decimalOdds": null,
          "modelPct": 64,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 36,
          "grossPayoutMultiple": 1.563,
          "centsAtRisk": 64,
          "centsProfitIfWin": 36,
          "openInterest": 2536,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01LAJRIE-RIE"
        },
        {
          "name": "Mark Lajal",
          "odds": null,
          "americanLabel": "38c",
          "impliedPct": 38,
          "bidPct": 36,
          "lastTradePct": 38,
          "decimalOdds": null,
          "modelPct": 38,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 62,
          "grossPayoutMultiple": 2.632,
          "centsAtRisk": 38,
          "centsProfitIfWin": 62,
          "openInterest": 1796,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01LAJRIE-LAJ"
        }
      ],
      "desk": {
        "name": "Leandro Riedi",
        "odds": null,
        "americanLabel": "64c",
        "impliedPct": 64,
        "bidPct": 62,
        "lastTradePct": 64,
        "decimalOdds": null,
        "modelPct": 64,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 36,
        "grossPayoutMultiple": 1.563,
        "centsAtRisk": 64,
        "centsProfitIfWin": 36,
        "openInterest": 2536,
        "symbol": "KXATPCHALLENGERMATCH-26JUN01LAJRIE-RIE"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Leandro Riedi 64c / Mark Lajal 38c",
      "marketNote": "Robinhood prediction-market prices captured: Leandro Riedi 64c / Mark Lajal 38c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Leandro-Riedi-Vs-Mark-Lajal/",
    "players": [
      {
        "name": "Leandro Riedi",
        "ranking": {
          "name": "Leandro Riedi",
          "rank": 120,
          "points": 525,
          "age": 24,
          "country": "Switzerland",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/8243/leandro-riedi",
          "asOf": "2026-06-02"
        },
        "qualityName": null,
        "profile": "Live rank #120 | Switzerland | age 24",
        "modelPct": 64,
        "weakness": {
          "name": "Leandro Riedi",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Mark Lajal",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 38,
        "weakness": {
          "name": "Mark Lajal",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-birmingham-bellucci-vs-bolt-2026-06-02",
    "eventId": "cd308132-3702-483a-9c91-a976108dbf6d",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Mattia Bellucci vs Alex Bolt",
    "start": "2:30 AM",
    "startMinutes": 150,
    "court": "ATP Challenger Birmingham",
    "round": "Round Of 32",
    "stage": "ATP Challenger Birmingham | Round Of 32",
    "pickName": "Mattia Bellucci",
    "basePickName": "Mattia Bellucci",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 59,
    "volatility": 71,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Mattia Bellucci is only the current Robinhood market favorite over Alex Bolt; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Mattia Bellucci",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Alex Bolt",
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
        "name": "Mattia Bellucci",
        "confidence": 67,
        "modelPct": 59,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Alex Bolt",
        "confidence": 63,
        "modelPct": 44,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Mattia Bellucci",
        "americanOdds": null,
        "modelPct": 59,
        "impliedPct": 59,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Mattia Bellucci",
          "confidence": 67,
          "modelPct": 59,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Alex Bolt",
          "confidence": 63,
          "modelPct": 44,
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
        "selection": "Mattia Bellucci",
        "line": null,
        "americanOdds": null,
        "modelPct": 59,
        "impliedPct": 59,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Mattia Bellucci 67% / Alex Bolt 63%",
        "rows": [
          {
            "name": "Mattia Bellucci",
            "confidence": 67,
            "modelPct": 59,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Alex Bolt",
            "confidence": 63,
            "modelPct": 44,
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
        "selection": "Price required",
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "cd308132-3702-483a-9c91-a976108dbf6d",
      "totalOpenInterest": 213,
      "totalVolume": 0,
      "players": [
        {
          "name": "Mattia Bellucci",
          "odds": null,
          "americanLabel": "59c",
          "impliedPct": 59,
          "bidPct": 56,
          "lastTradePct": 59,
          "decimalOdds": null,
          "modelPct": 59,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 41,
          "grossPayoutMultiple": 1.695,
          "centsAtRisk": 59,
          "centsProfitIfWin": 41,
          "openInterest": 159,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02BELBOL-BEL"
        },
        {
          "name": "Alex Bolt",
          "odds": null,
          "americanLabel": "44c",
          "impliedPct": 44,
          "bidPct": 41,
          "lastTradePct": 45,
          "decimalOdds": null,
          "modelPct": 44,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 56,
          "grossPayoutMultiple": 2.273,
          "centsAtRisk": 44,
          "centsProfitIfWin": 56,
          "openInterest": 54,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02BELBOL-BOL"
        }
      ],
      "desk": {
        "name": "Mattia Bellucci",
        "odds": null,
        "americanLabel": "59c",
        "impliedPct": 59,
        "bidPct": 56,
        "lastTradePct": 59,
        "decimalOdds": null,
        "modelPct": 59,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 41,
        "grossPayoutMultiple": 1.695,
        "centsAtRisk": 59,
        "centsProfitIfWin": 41,
        "openInterest": 159,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02BELBOL-BEL"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Mattia Bellucci 59c / Alex Bolt 44c",
      "marketNote": "Robinhood prediction-market prices captured: Mattia Bellucci 59c / Alex Bolt 44c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Mattia-Bellucci-Vs-Alex-Bolt/",
    "players": [
      {
        "name": "Mattia Bellucci",
        "ranking": {
          "name": "Mattia Bellucci",
          "rank": 73,
          "points": 777,
          "age": 24,
          "country": "Italy",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/10153/mattia-bellucci",
          "asOf": "2026-06-02"
        },
        "qualityName": null,
        "profile": "Live rank #73 | Italy | age 24",
        "modelPct": 59,
        "weakness": {
          "name": "Mattia Bellucci",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Alex Bolt",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 44,
        "weakness": {
          "name": "Alex Bolt",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-bad-rappenau-petkovic-vs-moro-canas-2026-06-02",
    "eventId": "be7f7fbb-bd45-4caf-878d-972266a8aeb2",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Mika Petkovic vs Alejandro Moro Canas",
    "start": "2:30 AM",
    "startMinutes": 150,
    "court": "ATP Challenger Bad Rappenau",
    "round": "Round Of 32",
    "stage": "ATP Challenger Bad Rappenau | Round Of 32",
    "pickName": "Alejandro Moro Canas",
    "basePickName": "Alejandro Moro Canas",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 65,
    "volatility": 66,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Alejandro Moro Canas is only the current Robinhood market favorite over Mika Petkovic; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Alejandro Moro Canas",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Mika Petkovic",
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
        "name": "Mika Petkovic",
        "confidence": 57,
        "modelPct": 38,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Alejandro Moro Canas",
        "confidence": 73,
        "modelPct": 65,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Alejandro Moro Canas",
        "americanOdds": null,
        "modelPct": 65,
        "impliedPct": 65,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Mika Petkovic",
          "confidence": 57,
          "modelPct": 38,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Alejandro Moro Canas",
          "confidence": 73,
          "modelPct": 65,
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
        "selection": "Alejandro Moro Canas",
        "line": null,
        "americanOdds": null,
        "modelPct": 65,
        "impliedPct": 65,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Mika Petkovic 57% / Alejandro Moro Canas 73%",
        "rows": [
          {
            "name": "Mika Petkovic",
            "confidence": 57,
            "modelPct": 38,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Alejandro Moro Canas",
            "confidence": 73,
            "modelPct": 65,
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
        "selection": "Price required",
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "be7f7fbb-bd45-4caf-878d-972266a8aeb2",
      "totalOpenInterest": 63,
      "totalVolume": 0,
      "players": [
        {
          "name": "Mika Petkovic",
          "odds": null,
          "americanLabel": "38c",
          "impliedPct": 38,
          "bidPct": 35,
          "lastTradePct": 38,
          "decimalOdds": null,
          "modelPct": 38,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 62,
          "grossPayoutMultiple": 2.632,
          "centsAtRisk": 38,
          "centsProfitIfWin": 62,
          "openInterest": 63,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02PETMOR-PET"
        },
        {
          "name": "Alejandro Moro Canas",
          "odds": null,
          "americanLabel": "65c",
          "impliedPct": 65,
          "bidPct": 62,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 65,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 35,
          "grossPayoutMultiple": 1.538,
          "centsAtRisk": 65,
          "centsProfitIfWin": 35,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02PETMOR-MOR"
        }
      ],
      "desk": {
        "name": "Alejandro Moro Canas",
        "odds": null,
        "americanLabel": "65c",
        "impliedPct": 65,
        "bidPct": 62,
        "lastTradePct": 0,
        "decimalOdds": null,
        "modelPct": 65,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 35,
        "grossPayoutMultiple": 1.538,
        "centsAtRisk": 65,
        "centsProfitIfWin": 35,
        "openInterest": 0,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02PETMOR-MOR"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Mika Petkovic 38c / Alejandro Moro Canas 65c",
      "marketNote": "Robinhood prediction-market prices captured: Mika Petkovic 38c / Alejandro Moro Canas 65c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Mika-Petkovic-Vs-Alejandro-Moro-Canas/",
    "players": [
      {
        "name": "Mika Petkovic",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 38,
        "weakness": {
          "name": "Mika Petkovic",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Alejandro Moro Canas",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 65,
        "weakness": {
          "name": "Alejandro Moro Canas",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-prostejov-olivieri-vs-krumich-2026-06-02",
    "eventId": "ecbafe1a-db39-4669-8283-c68d192d7b18",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Genaro Alberto Olivieri vs Martin Krumich",
    "start": "2:40 AM",
    "startMinutes": 160,
    "court": "ATP Challenger Prostejov",
    "round": "Round Of 32",
    "stage": "ATP Challenger Prostejov | Round Of 32",
    "pickName": "Martin Krumich",
    "basePickName": "Martin Krumich",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 59,
    "volatility": 71,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Martin Krumich is only the current Robinhood market favorite over Genaro Alberto Olivieri; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Martin Krumich",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Genaro Alberto Olivieri",
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
        "name": "Genaro Alberto Olivieri",
        "confidence": 63,
        "modelPct": 44,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Martin Krumich",
        "confidence": 67,
        "modelPct": 59,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Martin Krumich",
        "americanOdds": null,
        "modelPct": 59,
        "impliedPct": 59,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Genaro Alberto Olivieri",
          "confidence": 63,
          "modelPct": 44,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Martin Krumich",
          "confidence": 67,
          "modelPct": 59,
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
        "selection": "Martin Krumich",
        "line": null,
        "americanOdds": null,
        "modelPct": 59,
        "impliedPct": 59,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Genaro Alberto Olivieri 63% / Martin Krumich 67%",
        "rows": [
          {
            "name": "Genaro Alberto Olivieri",
            "confidence": 63,
            "modelPct": 44,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Martin Krumich",
            "confidence": 67,
            "modelPct": 59,
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
        "selection": "Price required",
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "ecbafe1a-db39-4669-8283-c68d192d7b18",
      "totalOpenInterest": 0,
      "totalVolume": 0,
      "players": [
        {
          "name": "Genaro Alberto Olivieri",
          "odds": null,
          "americanLabel": "44c",
          "impliedPct": 44,
          "bidPct": 41,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 44,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 56,
          "grossPayoutMultiple": 2.273,
          "centsAtRisk": 44,
          "centsProfitIfWin": 56,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02OLIKRU-OLI"
        },
        {
          "name": "Martin Krumich",
          "odds": null,
          "americanLabel": "59c",
          "impliedPct": 59,
          "bidPct": 56,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 59,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 41,
          "grossPayoutMultiple": 1.695,
          "centsAtRisk": 59,
          "centsProfitIfWin": 41,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02OLIKRU-KRU"
        }
      ],
      "desk": {
        "name": "Martin Krumich",
        "odds": null,
        "americanLabel": "59c",
        "impliedPct": 59,
        "bidPct": 56,
        "lastTradePct": 0,
        "decimalOdds": null,
        "modelPct": 59,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 41,
        "grossPayoutMultiple": 1.695,
        "centsAtRisk": 59,
        "centsProfitIfWin": 41,
        "openInterest": 0,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02OLIKRU-KRU"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Genaro Alberto Olivieri 44c / Martin Krumich 59c",
      "marketNote": "Robinhood prediction-market prices captured: Genaro Alberto Olivieri 44c / Martin Krumich 59c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Genaro-Alberto-Olivieri-Vs-Martin-Krumich/",
    "players": [
      {
        "name": "Genaro Alberto Olivieri",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 44,
        "weakness": {
          "name": "Genaro Alberto Olivieri",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Martin Krumich",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 59,
        "weakness": {
          "name": "Martin Krumich",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-prostejov-daniel-vs-forejtek-2026-06-02",
    "eventId": "04d4cdc8-32f3-4499-8156-d25ee56437cb",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Taro Daniel vs Jonas Forejtek",
    "start": "2:40 AM",
    "startMinutes": 160,
    "court": "ATP Challenger Prostejov",
    "round": "Round Of 32",
    "stage": "ATP Challenger Prostejov | Round Of 32",
    "pickName": "Jonas Forejtek",
    "basePickName": "Jonas Forejtek",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 58,
    "volatility": 72,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Jonas Forejtek is only the current Robinhood market favorite over Taro Daniel; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Jonas Forejtek",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Taro Daniel",
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
        "name": "Taro Daniel",
        "confidence": 64,
        "modelPct": 44,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Jonas Forejtek",
        "confidence": 66,
        "modelPct": 58,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Jonas Forejtek",
        "americanOdds": null,
        "modelPct": 58,
        "impliedPct": 58,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Taro Daniel",
          "confidence": 64,
          "modelPct": 44,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Jonas Forejtek",
          "confidence": 66,
          "modelPct": 58,
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
        "selection": "Jonas Forejtek",
        "line": null,
        "americanOdds": null,
        "modelPct": 58,
        "impliedPct": 58,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Taro Daniel 64% / Jonas Forejtek 66%",
        "rows": [
          {
            "name": "Taro Daniel",
            "confidence": 64,
            "modelPct": 44,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Jonas Forejtek",
            "confidence": 66,
            "modelPct": 58,
            "label": "Market favorite to win a set"
          }
        ],
        "confidence": 66,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Price required",
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "04d4cdc8-32f3-4499-8156-d25ee56437cb",
      "totalOpenInterest": 0,
      "totalVolume": 0,
      "players": [
        {
          "name": "Taro Daniel",
          "odds": null,
          "americanLabel": "44c",
          "impliedPct": 44,
          "bidPct": 42,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 44,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 56,
          "grossPayoutMultiple": 2.273,
          "centsAtRisk": 44,
          "centsProfitIfWin": 56,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02DANFOR-DAN"
        },
        {
          "name": "Jonas Forejtek",
          "odds": null,
          "americanLabel": "58c",
          "impliedPct": 58,
          "bidPct": 56,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 58,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 42,
          "grossPayoutMultiple": 1.724,
          "centsAtRisk": 58,
          "centsProfitIfWin": 42,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02DANFOR-FOR"
        }
      ],
      "desk": {
        "name": "Jonas Forejtek",
        "odds": null,
        "americanLabel": "58c",
        "impliedPct": 58,
        "bidPct": 56,
        "lastTradePct": 0,
        "decimalOdds": null,
        "modelPct": 58,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 42,
        "grossPayoutMultiple": 1.724,
        "centsAtRisk": 58,
        "centsProfitIfWin": 42,
        "openInterest": 0,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02DANFOR-FOR"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Taro Daniel 44c / Jonas Forejtek 58c",
      "marketNote": "Robinhood prediction-market prices captured: Taro Daniel 44c / Jonas Forejtek 58c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Taro-Daniel-Vs-Jonas-Forejtek/",
    "players": [
      {
        "name": "Taro Daniel",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 44,
        "weakness": {
          "name": "Taro Daniel",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Jonas Forejtek",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 58,
        "weakness": {
          "name": "Jonas Forejtek",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-prostejov-martin-vs-kopriva-2026-06-02",
    "eventId": "9dde981e-4fde-45c4-a2c4-a0810eff17f1",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Vit Kopriva vs Andrej Martin",
    "start": "2:40 AM",
    "startMinutes": 160,
    "court": "ATP Challenger Prostejov",
    "round": "Round Of 32",
    "stage": "ATP Challenger Prostejov | Round Of 32",
    "pickName": "Vit Kopriva",
    "basePickName": "Vit Kopriva",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 86,
    "volatility": 47,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Market favorite"
    ],
    "reason": "Vit Kopriva is only the current Robinhood market favorite over Andrej Martin; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Vit Kopriva",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Andrej Martin",
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
        "name": "Vit Kopriva",
        "confidence": 88,
        "modelPct": 86,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Andrej Martin",
        "confidence": 36,
        "modelPct": 17,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Vit Kopriva",
        "americanOdds": null,
        "modelPct": 86,
        "impliedPct": 86,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 48,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Vit Kopriva",
          "confidence": 88,
          "modelPct": 86,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Andrej Martin",
          "confidence": 36,
          "modelPct": 17,
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
        "selection": "Vit Kopriva",
        "line": null,
        "americanOdds": null,
        "modelPct": 86,
        "impliedPct": 86,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Vit Kopriva 88% / Andrej Martin 36%",
        "rows": [
          {
            "name": "Vit Kopriva",
            "confidence": 88,
            "modelPct": 86,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Andrej Martin",
            "confidence": 36,
            "modelPct": 17,
            "label": "Underdog set-win path needs early holds"
          }
        ],
        "confidence": 88,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Price required",
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
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
      "eventId": "9dde981e-4fde-45c4-a2c4-a0810eff17f1",
      "totalOpenInterest": 0,
      "totalVolume": 0,
      "players": [
        {
          "name": "Vit Kopriva",
          "odds": null,
          "americanLabel": "86c",
          "impliedPct": 86,
          "bidPct": 83,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 86,
          "edgePct": null,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 14,
          "grossPayoutMultiple": 1.163,
          "centsAtRisk": 86,
          "centsProfitIfWin": 14,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02MARKOP-KOP"
        },
        {
          "name": "Andrej Martin",
          "odds": null,
          "americanLabel": "17c",
          "impliedPct": 17,
          "bidPct": 15,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 17,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 83,
          "grossPayoutMultiple": 5.882,
          "centsAtRisk": 17,
          "centsProfitIfWin": 83,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02MARKOP-MAR"
        }
      ],
      "desk": {
        "name": "Vit Kopriva",
        "odds": null,
        "americanLabel": "86c",
        "impliedPct": 86,
        "bidPct": 83,
        "lastTradePct": 0,
        "decimalOdds": null,
        "modelPct": 86,
        "edgePct": null,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 14,
        "grossPayoutMultiple": 1.163,
        "centsAtRisk": 86,
        "centsProfitIfWin": 14,
        "openInterest": 0,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02MARKOP-KOP"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Vit Kopriva 86c / Andrej Martin 17c",
      "marketNote": "Robinhood prediction-market prices captured: Vit Kopriva 86c / Andrej Martin 17c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Vit-Kopriva-Vs-Andrej-Martin/",
    "players": [
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
          "profileUrl": "https://www.espn.com/tennis/player/_/id/3809/vit-kopriva",
          "asOf": "2026-06-02"
        },
        "qualityName": null,
        "profile": "Live rank #66 | Czechia | age 28",
        "modelPct": 86,
        "weakness": {
          "name": "Vit Kopriva",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Andrej Martin",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 17,
        "weakness": {
          "name": "Andrej Martin",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-perugia-carballes-baena-vs-carboni-2026-06-02",
    "eventId": "e2b7113d-33ff-4dab-9040-2a3158d3330f",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Lorenzo Carboni vs Roberto Carballes Baena",
    "start": "3:20 AM",
    "startMinutes": 200,
    "court": "ATP Challenger Perugia",
    "round": "Round Of 32",
    "stage": "ATP Challenger Perugia | Round Of 32",
    "pickName": "Roberto Carballes Baena",
    "basePickName": "Roberto Carballes Baena",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 73,
    "volatility": 59,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Market favorite"
    ],
    "reason": "Roberto Carballes Baena is only the current Robinhood market favorite over Lorenzo Carboni; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Roberto Carballes Baena",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Lorenzo Carboni",
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
        "name": "Lorenzo Carboni",
        "confidence": 49,
        "modelPct": 31,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Roberto Carballes Baena",
        "confidence": 81,
        "modelPct": 73,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Roberto Carballes Baena",
        "americanOdds": null,
        "modelPct": 73,
        "impliedPct": 73,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 48,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Lorenzo Carboni",
          "confidence": 49,
          "modelPct": 31,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Roberto Carballes Baena",
          "confidence": 81,
          "modelPct": 73,
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
        "selection": "Roberto Carballes Baena",
        "line": null,
        "americanOdds": null,
        "modelPct": 73,
        "impliedPct": 73,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Lorenzo Carboni 49% / Roberto Carballes Baena 81%",
        "rows": [
          {
            "name": "Lorenzo Carboni",
            "confidence": 49,
            "modelPct": 31,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Roberto Carballes Baena",
            "confidence": 81,
            "modelPct": 73,
            "label": "Market favorite to win a set"
          }
        ],
        "confidence": 81,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Price required",
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
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
      "eventId": "e2b7113d-33ff-4dab-9040-2a3158d3330f",
      "totalOpenInterest": 0,
      "totalVolume": 0,
      "players": [
        {
          "name": "Lorenzo Carboni",
          "odds": null,
          "americanLabel": "31c",
          "impliedPct": 31,
          "bidPct": 30,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 31,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 69,
          "grossPayoutMultiple": 3.226,
          "centsAtRisk": 31,
          "centsProfitIfWin": 69,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02CARCAR2-CAR2"
        },
        {
          "name": "Roberto Carballes Baena",
          "odds": null,
          "americanLabel": "73c",
          "impliedPct": 73,
          "bidPct": 70,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 73,
          "edgePct": null,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 27,
          "grossPayoutMultiple": 1.37,
          "centsAtRisk": 73,
          "centsProfitIfWin": 27,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02CARCAR2-CAR"
        }
      ],
      "desk": {
        "name": "Roberto Carballes Baena",
        "odds": null,
        "americanLabel": "73c",
        "impliedPct": 73,
        "bidPct": 70,
        "lastTradePct": 0,
        "decimalOdds": null,
        "modelPct": 73,
        "edgePct": null,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 27,
        "grossPayoutMultiple": 1.37,
        "centsAtRisk": 73,
        "centsProfitIfWin": 27,
        "openInterest": 0,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02CARCAR2-CAR"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Lorenzo Carboni 31c / Roberto Carballes Baena 73c",
      "marketNote": "Robinhood prediction-market prices captured: Lorenzo Carboni 31c / Roberto Carballes Baena 73c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Lorenzo-Carboni-Vs-Roberto-Carballes-Baena/",
    "players": [
      {
        "name": "Lorenzo Carboni",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 31,
        "weakness": {
          "name": "Lorenzo Carboni",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Roberto Carballes Baena",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 73,
        "weakness": {
          "name": "Roberto Carballes Baena",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-centurion-2-kimhi-vs-henning-2026-06-02",
    "eventId": "aa219277-4b96-418d-b09d-edb8c87a0839",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Orel Kimhi vs Philip Henning",
    "start": "3:20 AM",
    "startMinutes": 200,
    "court": "ATP Challenger Centurion 2",
    "round": "Round Of 32",
    "stage": "ATP Challenger Centurion 2 | Round Of 32",
    "pickName": "Philip Henning",
    "basePickName": "Philip Henning",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 81,
    "volatility": 51,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Market favorite"
    ],
    "reason": "Philip Henning is only the current Robinhood market favorite over Orel Kimhi; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Philip Henning",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Orel Kimhi",
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
        "name": "Orel Kimhi",
        "confidence": 41,
        "modelPct": 22,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Philip Henning",
        "confidence": 88,
        "modelPct": 81,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Philip Henning",
        "americanOdds": null,
        "modelPct": 81,
        "impliedPct": 81,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 48,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Orel Kimhi",
          "confidence": 41,
          "modelPct": 22,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Philip Henning",
          "confidence": 88,
          "modelPct": 81,
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
        "selection": "Philip Henning",
        "line": null,
        "americanOdds": null,
        "modelPct": 81,
        "impliedPct": 81,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Orel Kimhi 41% / Philip Henning 88%",
        "rows": [
          {
            "name": "Orel Kimhi",
            "confidence": 41,
            "modelPct": 22,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Philip Henning",
            "confidence": 88,
            "modelPct": 81,
            "label": "Market favorite to win a set"
          }
        ],
        "confidence": 88,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Price required",
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
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
      "eventId": "aa219277-4b96-418d-b09d-edb8c87a0839",
      "totalOpenInterest": 1,
      "totalVolume": 0,
      "players": [
        {
          "name": "Orel Kimhi",
          "odds": null,
          "americanLabel": "22c",
          "impliedPct": 22,
          "bidPct": 19,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 22,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 78,
          "grossPayoutMultiple": 4.545,
          "centsAtRisk": 22,
          "centsProfitIfWin": 78,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02KIMHEN-KIM"
        },
        {
          "name": "Philip Henning",
          "odds": null,
          "americanLabel": "81c",
          "impliedPct": 81,
          "bidPct": 77,
          "lastTradePct": 83,
          "decimalOdds": null,
          "modelPct": 81,
          "edgePct": null,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 19,
          "grossPayoutMultiple": 1.235,
          "centsAtRisk": 81,
          "centsProfitIfWin": 19,
          "openInterest": 1,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02KIMHEN-HEN"
        }
      ],
      "desk": {
        "name": "Philip Henning",
        "odds": null,
        "americanLabel": "81c",
        "impliedPct": 81,
        "bidPct": 77,
        "lastTradePct": 83,
        "decimalOdds": null,
        "modelPct": 81,
        "edgePct": null,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 19,
        "grossPayoutMultiple": 1.235,
        "centsAtRisk": 81,
        "centsProfitIfWin": 19,
        "openInterest": 1,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02KIMHEN-HEN"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Orel Kimhi 22c / Philip Henning 81c",
      "marketNote": "Robinhood prediction-market prices captured: Orel Kimhi 22c / Philip Henning 81c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Orel-Kimhi-Vs-Philip-Henning/",
    "players": [
      {
        "name": "Orel Kimhi",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 22,
        "weakness": {
          "name": "Orel Kimhi",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Philip Henning",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 81,
        "weakness": {
          "name": "Philip Henning",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-centurion-2-strombachs-vs-hurrion-2026-06-02",
    "eventId": "880aa27c-d6ed-4c90-afa2-a9d8f66534a6",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Robert Strombachs vs Millen Hurrion",
    "start": "3:20 AM",
    "startMinutes": 200,
    "court": "ATP Challenger Centurion 2",
    "round": "Round Of 32",
    "stage": "ATP Challenger Centurion 2 | Round Of 32",
    "pickName": "Robert Strombachs",
    "basePickName": "Robert Strombachs",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 58,
    "volatility": 73,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Robert Strombachs is only the current Robinhood market favorite over Millen Hurrion; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Robert Strombachs",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Millen Hurrion",
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
        "name": "Robert Strombachs",
        "confidence": 66,
        "modelPct": 58,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Millen Hurrion",
        "confidence": 64,
        "modelPct": 46,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Robert Strombachs",
        "americanOdds": null,
        "modelPct": 58,
        "impliedPct": 58,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Robert Strombachs",
          "confidence": 66,
          "modelPct": 58,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Millen Hurrion",
          "confidence": 64,
          "modelPct": 46,
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
        "selection": "Robert Strombachs",
        "line": null,
        "americanOdds": null,
        "modelPct": 58,
        "impliedPct": 58,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Robert Strombachs 66% / Millen Hurrion 64%",
        "rows": [
          {
            "name": "Robert Strombachs",
            "confidence": 66,
            "modelPct": 58,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Millen Hurrion",
            "confidence": 64,
            "modelPct": 46,
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
        "selection": "Price required",
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "880aa27c-d6ed-4c90-afa2-a9d8f66534a6",
      "totalOpenInterest": 0,
      "totalVolume": 0,
      "players": [
        {
          "name": "Robert Strombachs",
          "odds": null,
          "americanLabel": "58c",
          "impliedPct": 58,
          "bidPct": 55,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 58,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 42,
          "grossPayoutMultiple": 1.724,
          "centsAtRisk": 58,
          "centsProfitIfWin": 42,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02STRHUR-STR"
        },
        {
          "name": "Millen Hurrion",
          "odds": null,
          "americanLabel": "46c",
          "impliedPct": 46,
          "bidPct": 42,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 46,
          "edgePct": null,
          "priceBand": "Coinflip",
          "grossProfitPct": 54,
          "grossPayoutMultiple": 2.174,
          "centsAtRisk": 46,
          "centsProfitIfWin": 54,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02STRHUR-HUR"
        }
      ],
      "desk": {
        "name": "Robert Strombachs",
        "odds": null,
        "americanLabel": "58c",
        "impliedPct": 58,
        "bidPct": 55,
        "lastTradePct": 0,
        "decimalOdds": null,
        "modelPct": 58,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 42,
        "grossPayoutMultiple": 1.724,
        "centsAtRisk": 58,
        "centsProfitIfWin": 42,
        "openInterest": 0,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02STRHUR-STR"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Robert Strombachs 58c / Millen Hurrion 46c",
      "marketNote": "Robinhood prediction-market prices captured: Robert Strombachs 58c / Millen Hurrion 46c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Robert-Strombachs-Vs-Millen-Hurrion/",
    "players": [
      {
        "name": "Robert Strombachs",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 58,
        "weakness": {
          "name": "Robert Strombachs",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Millen Hurrion",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 46,
        "weakness": {
          "name": "Millen Hurrion",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rg-w-elina-svitolina-marta-kostyuk-2026-06-02",
    "eventId": "175543",
    "tour": "WTA",
    "bestOf": 3,
    "surface": "Clay",
    "title": "Elina Svitolina vs Marta Kostyuk",
    "start": "3:30 AM",
    "startMinutes": 210,
    "court": "Court Philippe-Chatrier",
    "round": "Quarterfinal",
    "pickName": "Elina Svitolina",
    "basePickName": "Elina Svitolina",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 57.2,
    "volatility": 58,
    "tags": [
      "Clay",
      "Roland Garros",
      "WTA",
      "Watch only",
      "Positive price edge",
      "WTA volatility tax",
      "Controlled volatility"
    ],
    "reason": "Recent service hold is close: Elina Svitolina 73%, Marta Kostyuk 71%. Opponent-adjusted recent form is basically even: Elina Svitolina 110, Marta Kostyuk 109. Lean, not a chase.",
    "totals": "Best O/U angle: no play without a posted total.",
    "weaknessEdge": {
      "edgeType": "No clear weakness edge",
      "target": "Both sides",
      "scoreGap": 3,
      "attackingSide": null,
      "vulnerableSide": null,
      "gameFlow": "The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.",
      "liveTrigger": "Wait for a visible service-pressure split before entering.",
      "spreadRead": "Pre-match spread is fragile; wait for both players to serve once.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Elina Svitolina",
        "serviceHoldPct": 73,
        "firstServeWonPct": 65,
        "secondServeWonPct": 45,
        "firstServePct": 64,
        "avgAces": 2.5,
        "avgDoubleFaults": 2.8,
        "avgWinners": 30.5,
        "avgUnforcedErrors": 28.5,
        "avgBreakPointsFaced": 11.6,
        "returnPointsWonPct": 50,
        "servicePointsWonPct": 58,
        "weakServeMatches": 3,
        "pressureMatches": 5,
        "matchesWithStats": 8,
        "weaknessScore": 18,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "faces too many break points (11.6 avg)",
          "3 recent matches with serve instability"
        ],
        "strengths": [
          "creates return pressure (50% return points won)"
        ],
        "gameFlowRead": "Elina Svitolina can drop points quickly through faces too many break points (11.6 avg) and 3 recent matches with serve instability."
      },
      "opponent": {
        "name": "Marta Kostyuk",
        "serviceHoldPct": 71,
        "firstServeWonPct": 67,
        "secondServeWonPct": 52,
        "firstServePct": 56,
        "avgAces": 3.4,
        "avgDoubleFaults": 4.6,
        "avgWinners": 35,
        "avgUnforcedErrors": 34.8,
        "avgBreakPointsFaced": 7.5,
        "returnPointsWonPct": 52,
        "servicePointsWonPct": 60,
        "weakServeMatches": 6,
        "pressureMatches": 3,
        "matchesWithStats": 8,
        "weaknessScore": 21,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "double-fault pressure (4.6 avg)",
          "6 recent matches with serve instability"
        ],
        "strengths": [
          "creates return pressure (52% return points won)"
        ],
        "gameFlowRead": "Marta Kostyuk can drop points quickly through double-fault pressure (4.6 avg) and 6 recent matches with serve instability."
      }
    },
    "setWinProjections": [
      {
        "name": "Elina Svitolina",
        "confidence": 71,
        "modelPct": 57.2,
        "label": "Live to win a set"
      },
      {
        "name": "Marta Kostyuk",
        "confidence": 57,
        "modelPct": 42.8,
        "label": "Needs early hold pressure"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Elina Svitolina",
        "americanOdds": 104,
        "modelPct": 57.2,
        "impliedPct": 49,
        "edgePct": 8.2,
        "evPer100": 16.7,
        "netEvPer100": 14.7,
        "feePer100": 2,
        "valueIssue": "Validated ML candidate",
        "valueGrade": "Bet-grade value",
        "betGrade": true
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Elina Svitolina",
        "line": 1.5,
        "americanOdds": -120,
        "modelPct": 51,
        "impliedPct": 54.5,
        "edgePct": -3.5,
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
        "line": 21.5,
        "americanOdds": -122,
        "expectedGames": 23.6,
        "modelPct": 65,
        "impliedPct": 55,
        "edgePct": 10,
        "evPer100": 18.3,
        "netEvPer100": 16.3,
        "feePer100": 2,
        "valueIssue": "Total watch only",
        "valueGrade": "Watch only",
        "reason": "Expected match games 23.6 vs FanDuel 21.5; Over. hold avg 72%, return games won 56%, first-set sample 9.4g, 39 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Under 9.5",
        "line": 9.5,
        "americanOdds": -128,
        "expectedGames": 8.5,
        "confidence": 69,
        "tiebreakRisk": 18,
        "earlyBreakRisk": 62,
        "modelPct": 69,
        "evPer100": 22.9,
        "netEvPer100": 20.9,
        "valueGrade": "Actionable live watch",
        "reason": "Expected first-set games 8.5 vs FanDuel 9.5; Under 9.5. hold avg 72%, return games won 56%, first-set sample 9.4g, 39 recent sets.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Elina Svitolina",
          "confidence": 71,
          "modelPct": 57.2,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Marta Kostyuk",
          "confidence": 57,
          "modelPct": 42.8,
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
          "name": "Elina Svitolina",
          "holdPct": 73,
          "firstServeWonPct": 65,
          "secondServeWonPct": 45,
          "servicePointsWonPct": 58,
          "returnPointsWonPct": 50,
          "returnGamesWonPct": 51.875,
          "breakPointsSavedPct": 0,
          "breakPointsConvertedPct": 46.2,
          "aces": 2.5,
          "doubleFaults": 2.8,
          "winners": 30.5,
          "unforcedErrors": 28.5,
          "weaknessScore": 18,
          "weakServeMatches": 3,
          "statMatches": 8,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 21,
            "firstSetSamples": 8,
            "avgFirstSetGames": 8.625,
            "avgSetGames": 9.047619047619047,
            "avgMatchGames": 23.75,
            "avgSetsPlayed": 2.625,
            "tiebreakRate": 0.09523809523809523,
            "extendedSetRate": 0.09523809523809523,
            "shortSetRate": 0.42857142857142855
          }
        },
        {
          "name": "Marta Kostyuk",
          "holdPct": 71,
          "firstServeWonPct": 67,
          "secondServeWonPct": 52,
          "servicePointsWonPct": 60,
          "returnPointsWonPct": 52,
          "returnGamesWonPct": 59.25,
          "breakPointsSavedPct": 0,
          "breakPointsConvertedPct": 50.6,
          "aces": 3.4,
          "doubleFaults": 4.6,
          "winners": 35,
          "unforcedErrors": 34.8,
          "weaknessScore": 21,
          "weakServeMatches": 6,
          "statMatches": 8,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 18,
            "firstSetSamples": 8,
            "avgFirstSetGames": 10.125,
            "avgSetGames": 9.166666666666666,
            "avgMatchGames": 20.625,
            "avgSetsPlayed": 2.25,
            "tiebreakRate": 0.1111111111111111,
            "extendedSetRate": 0.2222222222222222,
            "shortSetRate": 0.3888888888888889
          }
        }
      ],
      "expectedFirstSetGames": 8.5,
      "expectedMatchGames": 23.6,
      "signalStrength": 9,
      "holdAvg": 72,
      "returnGamesAvg": 55.6,
      "returnPointsAvg": 51,
      "breakPointsSavedAvg": 0,
      "breakPointsConvertedAvg": 48.4,
      "setSamples": 39,
      "firstSetSamples": 16,
      "avgFirstSetGames": 9.4,
      "avgSetGames": 9.1,
      "tiebreakRate": 10.3,
      "extendedSetRate": 15.9,
      "shortSetRate": 40.9,
      "reasonCore": "hold avg 72%, return games won 56%, first-set sample 9.4g, 39 recent sets"
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Elina Svitolina",
        "line": null,
        "americanOdds": 104,
        "modelPct": 57.2,
        "impliedPct": 49,
        "edgePct": 8.2,
        "evPer100": 16.7,
        "netEvPer100": 14.7,
        "grade": "Bet-grade value",
        "issue": "Validated ML candidate",
        "reason": "Model is meaningfully above FanDuel implied price."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Elina Svitolina",
        "line": 1.5,
        "americanOdds": -120,
        "modelPct": 51,
        "impliedPct": 54.5,
        "edgePct": -3.5,
        "evPer100": -6.5,
        "netEvPer100": -8.5,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 51,
        "grade": "Negative EV",
        "reason": "Spread is number-dependent; verify first service cycle"
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "Over",
        "line": 21.5,
        "americanOdds": -122,
        "modelPct": 65,
        "impliedPct": 55,
        "edgePct": 10,
        "evPer100": 18.3,
        "netEvPer100": 16.3,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 65,
        "grade": "Watch only",
        "reason": "Total games need expected match games vs the posted line."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Elina Svitolina 71% / Marta Kostyuk 57%",
        "rows": [
          {
            "name": "Elina Svitolina",
            "confidence": 71,
            "modelPct": 57.2,
            "label": "Live to win a set"
          },
          {
            "name": "Marta Kostyuk",
            "confidence": 57,
            "modelPct": 42.8,
            "label": "Needs early hold pressure"
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
        "expectedGames": 8.5,
        "confidence": 69,
        "tiebreakRisk": 18,
        "earlyBreakRisk": 62,
        "grade": "Actionable live watch",
        "reason": "Expected first-set games 8.5 vs FanDuel 9.5; Under 9.5. hold avg 72%, return games won 56%, first-set sample 9.4g, 39 recent sets."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Elina Svitolina",
      "opponent": "Marta Kostyuk",
      "grade": "Watch only",
      "riskGate": "hold risk, opponent return pressure; ML value gate frozen after prior slate",
      "marketOdds": 117,
      "fairOdds": -134,
      "modelProbability": 57.2,
      "dataOnlyProbability": 61,
      "marketProbability": 46,
      "marketDisagreementPct": 11.2,
      "netEvPer100": 22.2,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Elina Svitolina is priced below the model, not guaranteed to win.",
      "useCase": "Straight ML value only at +117 or better; fair price from the ensemble is about -134.",
      "bullets": [
        "Recent hold: Elina Svitolina 72.5% vs Marta Kostyuk 70.8%.",
        "Serve events: Elina Svitolina 2.5 aces / 2.8 DFs vs Marta Kostyuk 3.4 aces / 4.6 DFs.",
        "Serve points: Elina Svitolina 1st 64.8%, 2nd 45.1% vs Marta Kostyuk 1st 66.6%, 2nd 51.6%.",
        "Winner/error profile: Elina Svitolina 30.5 winners / 28.5 UEs vs Marta Kostyuk 35 winners / 34.8 UEs."
      ],
      "risks": [
        "Marta Kostyuk strength: creates return pressure (52% return points won).",
        "Elina Svitolina risk: faces too many break points (11.6 avg)."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page Chrome scrape",
      "capturedAt": "2026-06-01T23:53:52.633Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/women's-roland-garros-2026/elina-svitolina-v-marta-kostyuk-35670937",
      "eventId": "35670937",
      "players": [
        {
          "name": "Elina Svitolina",
          "odds": 104,
          "americanLabel": "+104",
          "impliedPct": 49,
          "decimalOdds": 2.04,
          "modelPct": 57.2,
          "edgePct": 8.2,
          "priceBand": "Coinflip",
          "grossProfitPct": 104,
          "grossPayoutMultiple": 2.04,
          "centsAtRisk": 100,
          "centsProfitIfWin": 104
        },
        {
          "name": "Marta Kostyuk",
          "odds": -125,
          "americanLabel": "-125",
          "impliedPct": 55.6,
          "decimalOdds": 1.8,
          "modelPct": 42.8,
          "edgePct": -12.8,
          "priceBand": "Coinflip",
          "grossProfitPct": 80,
          "grossPayoutMultiple": 1.8,
          "centsAtRisk": 100,
          "centsProfitIfWin": 80
        }
      ],
      "desk": {
        "name": "Elina Svitolina",
        "odds": 104,
        "americanLabel": "+104",
        "impliedPct": 49,
        "decimalOdds": 2.04,
        "modelPct": 57.2,
        "edgePct": 8.2,
        "priceBand": "Coinflip",
        "grossProfitPct": 104,
        "grossPayoutMultiple": 2.04,
        "centsAtRisk": 100,
        "centsProfitIfWin": 104
      },
      "spread": {
        "player": "Elina Svitolina",
        "spread": 1.5,
        "odds": -120
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
      "priceAction": "Model is meaningfully above FanDuel implied price.",
      "spreadValue": "Elina Svitolina +1.5 (-120)",
      "totalValue": "21.5 games: Over -122 / Under -110",
      "firstSetTotalValue": "9.5 1st-set games: Over -108 / Under -128",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Total needs live serve data before entry",
      "mlValue": "Elina Svitolina +104 / Marta Kostyuk -125",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. Model is meaningfully above FanDuel implied price.",
      "noVigNote": "Model 57.2% vs FanDuel implied 49% (+8.2 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Elina-Svitolina-Vs-Marta-Kostyuk/",
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
          "asOf": "2026-06-02"
        },
        "qualityName": "Elina Svitolina",
        "profile": "Live rank #7 | Ukraine | age 31 | 2026 clay 13-2, 87% | adj form 110 | hold 73%",
        "modelPct": 57.2,
        "weakness": {
          "name": "Elina Svitolina",
          "serviceHoldPct": 73,
          "firstServeWonPct": 65,
          "secondServeWonPct": 45,
          "firstServePct": 64,
          "avgAces": 2.5,
          "avgDoubleFaults": 2.8,
          "avgWinners": 30.5,
          "avgUnforcedErrors": 28.5,
          "avgBreakPointsFaced": 11.6,
          "returnPointsWonPct": 50,
          "servicePointsWonPct": 58,
          "weakServeMatches": 3,
          "pressureMatches": 5,
          "matchesWithStats": 8,
          "weaknessScore": 18,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "faces too many break points (11.6 avg)",
            "3 recent matches with serve instability"
          ],
          "strengths": [
            "creates return pressure (50% return points won)"
          ],
          "gameFlowRead": "Elina Svitolina can drop points quickly through faces too many break points (11.6 avg) and 3 recent matches with serve instability."
        }
      },
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
          "asOf": "2026-06-02"
        },
        "qualityName": "Marta Kostyuk",
        "profile": "Live rank #15 | Ukraine | age 23 | 2026 clay 16-0, 100% | adj form 109 | hold 71%",
        "modelPct": 42.8,
        "weakness": {
          "name": "Marta Kostyuk",
          "serviceHoldPct": 71,
          "firstServeWonPct": 67,
          "secondServeWonPct": 52,
          "firstServePct": 56,
          "avgAces": 3.4,
          "avgDoubleFaults": 4.6,
          "avgWinners": 35,
          "avgUnforcedErrors": 34.8,
          "avgBreakPointsFaced": 7.5,
          "returnPointsWonPct": 52,
          "servicePointsWonPct": 60,
          "weakServeMatches": 6,
          "pressureMatches": 3,
          "matchesWithStats": 8,
          "weaknessScore": 21,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "double-fault pressure (4.6 avg)",
            "6 recent matches with serve instability"
          ],
          "strengths": [
            "creates return pressure (52% return points won)"
          ],
          "gameFlowRead": "Marta Kostyuk can drop points quickly through double-fault pressure (4.6 avg) and 6 recent matches with serve instability."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-birmingham-watt-vs-wendelken-2026-06-02",
    "eventId": "16557b1e-3f52-450e-804d-eb3895c93fcb",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "James Watt vs Harry Wendelken",
    "start": "3:40 AM",
    "startMinutes": 220,
    "court": "ATP Challenger Birmingham",
    "round": "Round Of 32",
    "stage": "ATP Challenger Birmingham | Round Of 32",
    "pickName": "Harry Wendelken",
    "basePickName": "Harry Wendelken",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 63,
    "volatility": 66,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Harry Wendelken is only the current Robinhood market favorite over James Watt; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Harry Wendelken",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "James Watt",
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
        "name": "James Watt",
        "confidence": 59,
        "modelPct": 37,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Harry Wendelken",
        "confidence": 71,
        "modelPct": 63,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Harry Wendelken",
        "americanOdds": null,
        "modelPct": 63,
        "impliedPct": 63,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "James Watt",
          "confidence": 59,
          "modelPct": 37,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Harry Wendelken",
          "confidence": 71,
          "modelPct": 63,
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
        "selection": "Harry Wendelken",
        "line": null,
        "americanOdds": null,
        "modelPct": 63,
        "impliedPct": 63,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "James Watt 59% / Harry Wendelken 71%",
        "rows": [
          {
            "name": "James Watt",
            "confidence": 59,
            "modelPct": 37,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Harry Wendelken",
            "confidence": 71,
            "modelPct": 63,
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
        "selection": "Price required",
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "16557b1e-3f52-450e-804d-eb3895c93fcb",
      "totalOpenInterest": 2175,
      "totalVolume": 0,
      "players": [
        {
          "name": "James Watt",
          "odds": null,
          "americanLabel": "37c",
          "impliedPct": 37,
          "bidPct": 36,
          "lastTradePct": 37,
          "decimalOdds": null,
          "modelPct": 37,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 63,
          "grossPayoutMultiple": 2.703,
          "centsAtRisk": 37,
          "centsProfitIfWin": 63,
          "openInterest": 2041,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02WATWEN-WAT"
        },
        {
          "name": "Harry Wendelken",
          "odds": null,
          "americanLabel": "63c",
          "impliedPct": 63,
          "bidPct": 60,
          "lastTradePct": 61,
          "decimalOdds": null,
          "modelPct": 63,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 37,
          "grossPayoutMultiple": 1.587,
          "centsAtRisk": 63,
          "centsProfitIfWin": 37,
          "openInterest": 134,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02WATWEN-WEN"
        }
      ],
      "desk": {
        "name": "Harry Wendelken",
        "odds": null,
        "americanLabel": "63c",
        "impliedPct": 63,
        "bidPct": 60,
        "lastTradePct": 61,
        "decimalOdds": null,
        "modelPct": 63,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 37,
        "grossPayoutMultiple": 1.587,
        "centsAtRisk": 63,
        "centsProfitIfWin": 37,
        "openInterest": 134,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02WATWEN-WEN"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "James Watt 37c / Harry Wendelken 63c",
      "marketNote": "Robinhood prediction-market prices captured: James Watt 37c / Harry Wendelken 63c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/James-Watt-Vs-Harry-Wendelken/",
    "players": [
      {
        "name": "James Watt",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 37,
        "weakness": {
          "name": "James Watt",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Harry Wendelken",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 63,
        "weakness": {
          "name": "Harry Wendelken",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-bad-rappenau-choinski-vs-gentzsch-2026-06-02",
    "eventId": "2b5b81da-d68f-407a-96d0-48031bada613",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Jan Choinski vs Tom Gentzsch",
    "start": "3:40 AM",
    "startMinutes": 220,
    "court": "ATP Challenger Bad Rappenau",
    "round": "Round Of 32",
    "stage": "ATP Challenger Bad Rappenau | Round Of 32",
    "pickName": "Jan Choinski",
    "basePickName": "Jan Choinski",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 59,
    "volatility": 71,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Jan Choinski is only the current Robinhood market favorite over Tom Gentzsch; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Jan Choinski",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Tom Gentzsch",
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
        "name": "Jan Choinski",
        "confidence": 67,
        "modelPct": 59,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Tom Gentzsch",
        "confidence": 63,
        "modelPct": 44,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Jan Choinski",
        "americanOdds": null,
        "modelPct": 59,
        "impliedPct": 59,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Jan Choinski",
          "confidence": 67,
          "modelPct": 59,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Tom Gentzsch",
          "confidence": 63,
          "modelPct": 44,
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
        "selection": "Jan Choinski",
        "line": null,
        "americanOdds": null,
        "modelPct": 59,
        "impliedPct": 59,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Jan Choinski 67% / Tom Gentzsch 63%",
        "rows": [
          {
            "name": "Jan Choinski",
            "confidence": 67,
            "modelPct": 59,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Tom Gentzsch",
            "confidence": 63,
            "modelPct": 44,
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
        "selection": "Price required",
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "2b5b81da-d68f-407a-96d0-48031bada613",
      "totalOpenInterest": 54,
      "totalVolume": 0,
      "players": [
        {
          "name": "Jan Choinski",
          "odds": null,
          "americanLabel": "59c",
          "impliedPct": 59,
          "bidPct": 56,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 59,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 41,
          "grossPayoutMultiple": 1.695,
          "centsAtRisk": 59,
          "centsProfitIfWin": 41,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02CHOGEN-CHO"
        },
        {
          "name": "Tom Gentzsch",
          "odds": null,
          "americanLabel": "44c",
          "impliedPct": 44,
          "bidPct": 41,
          "lastTradePct": 44,
          "decimalOdds": null,
          "modelPct": 44,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 56,
          "grossPayoutMultiple": 2.273,
          "centsAtRisk": 44,
          "centsProfitIfWin": 56,
          "openInterest": 54,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02CHOGEN-GEN"
        }
      ],
      "desk": {
        "name": "Jan Choinski",
        "odds": null,
        "americanLabel": "59c",
        "impliedPct": 59,
        "bidPct": 56,
        "lastTradePct": 0,
        "decimalOdds": null,
        "modelPct": 59,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 41,
        "grossPayoutMultiple": 1.695,
        "centsAtRisk": 59,
        "centsProfitIfWin": 41,
        "openInterest": 0,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02CHOGEN-CHO"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Jan Choinski 59c / Tom Gentzsch 44c",
      "marketNote": "Robinhood prediction-market prices captured: Jan Choinski 59c / Tom Gentzsch 44c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Jan-Choinski-Vs-Tom-Gentzsch/",
    "players": [
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
          "profileUrl": "https://www.espn.com/tennis/player/_/id/2720/jan-choinski",
          "asOf": "2026-06-02"
        },
        "qualityName": null,
        "profile": "Live rank #101 | Great Britain | age 29",
        "modelPct": 59,
        "weakness": {
          "name": "Jan Choinski",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Tom Gentzsch",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 44,
        "weakness": {
          "name": "Tom Gentzsch",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-birmingham-schoolkate-vs-fery-2026-06-02",
    "eventId": "3d412d9a-26c4-42af-a33a-107b8826f676",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Tristan Schoolkate vs Arthur Fery",
    "start": "3:40 AM",
    "startMinutes": 220,
    "court": "ATP Challenger Birmingham",
    "round": "Round Of 32",
    "stage": "ATP Challenger Birmingham | Round Of 32",
    "pickName": "Arthur Fery",
    "basePickName": "Arthur Fery",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 63,
    "volatility": 67,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Arthur Fery is only the current Robinhood market favorite over Tristan Schoolkate; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Arthur Fery",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Tristan Schoolkate",
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
        "name": "Tristan Schoolkate",
        "confidence": 59,
        "modelPct": 39,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Arthur Fery",
        "confidence": 71,
        "modelPct": 63,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Arthur Fery",
        "americanOdds": null,
        "modelPct": 63,
        "impliedPct": 63,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Tristan Schoolkate",
          "confidence": 59,
          "modelPct": 39,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Arthur Fery",
          "confidence": 71,
          "modelPct": 63,
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
        "selection": "Arthur Fery",
        "line": null,
        "americanOdds": null,
        "modelPct": 63,
        "impliedPct": 63,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Tristan Schoolkate 59% / Arthur Fery 71%",
        "rows": [
          {
            "name": "Tristan Schoolkate",
            "confidence": 59,
            "modelPct": 39,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Arthur Fery",
            "confidence": 71,
            "modelPct": 63,
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
        "selection": "Price required",
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "3d412d9a-26c4-42af-a33a-107b8826f676",
      "totalOpenInterest": 0,
      "totalVolume": 0,
      "players": [
        {
          "name": "Tristan Schoolkate",
          "odds": null,
          "americanLabel": "39c",
          "impliedPct": 39,
          "bidPct": 37,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 39,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 61,
          "grossPayoutMultiple": 2.564,
          "centsAtRisk": 39,
          "centsProfitIfWin": 61,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02SCHFER-SCH"
        },
        {
          "name": "Arthur Fery",
          "odds": null,
          "americanLabel": "63c",
          "impliedPct": 63,
          "bidPct": 61,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 63,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 37,
          "grossPayoutMultiple": 1.587,
          "centsAtRisk": 63,
          "centsProfitIfWin": 37,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02SCHFER-FER"
        }
      ],
      "desk": {
        "name": "Arthur Fery",
        "odds": null,
        "americanLabel": "63c",
        "impliedPct": 63,
        "bidPct": 61,
        "lastTradePct": 0,
        "decimalOdds": null,
        "modelPct": 63,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 37,
        "grossPayoutMultiple": 1.587,
        "centsAtRisk": 63,
        "centsProfitIfWin": 37,
        "openInterest": 0,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02SCHFER-FER"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Tristan Schoolkate 39c / Arthur Fery 63c",
      "marketNote": "Robinhood prediction-market prices captured: Tristan Schoolkate 39c / Arthur Fery 63c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Tristan-Schoolkate-Vs-Arthur-Fery/",
    "players": [
      {
        "name": "Tristan Schoolkate",
        "ranking": {
          "name": "Tristan Schoolkate",
          "rank": 123,
          "points": 512,
          "age": 25,
          "country": "Australia",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/4029/tristan-schoolkate",
          "asOf": "2026-06-02"
        },
        "qualityName": null,
        "profile": "Live rank #123 | Australia | age 25",
        "modelPct": 39,
        "weakness": {
          "name": "Tristan Schoolkate",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Arthur Fery",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 63,
        "weakness": {
          "name": "Arthur Fery",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-prostejov-mrva-vs-svrcina-2026-06-02",
    "eventId": "26819026-8f70-44e6-bd8f-161b5127603d",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Maxim Mrva vs Dalibor Svrcina",
    "start": "3:50 AM",
    "startMinutes": 230,
    "court": "ATP Challenger Prostejov",
    "round": "Round Of 32",
    "stage": "ATP Challenger Prostejov | Round Of 32",
    "pickName": "Dalibor Svrcina",
    "basePickName": "Dalibor Svrcina",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 73,
    "volatility": 59,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Market favorite"
    ],
    "reason": "Dalibor Svrcina is only the current Robinhood market favorite over Maxim Mrva; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Dalibor Svrcina",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Maxim Mrva",
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
        "name": "Maxim Mrva",
        "confidence": 49,
        "modelPct": 31,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Dalibor Svrcina",
        "confidence": 81,
        "modelPct": 73,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Dalibor Svrcina",
        "americanOdds": null,
        "modelPct": 73,
        "impliedPct": 73,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 48,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Maxim Mrva",
          "confidence": 49,
          "modelPct": 31,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Dalibor Svrcina",
          "confidence": 81,
          "modelPct": 73,
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
        "selection": "Dalibor Svrcina",
        "line": null,
        "americanOdds": null,
        "modelPct": 73,
        "impliedPct": 73,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Maxim Mrva 49% / Dalibor Svrcina 81%",
        "rows": [
          {
            "name": "Maxim Mrva",
            "confidence": 49,
            "modelPct": 31,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Dalibor Svrcina",
            "confidence": 81,
            "modelPct": 73,
            "label": "Market favorite to win a set"
          }
        ],
        "confidence": 81,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Price required",
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
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
      "eventId": "26819026-8f70-44e6-bd8f-161b5127603d",
      "totalOpenInterest": 141,
      "totalVolume": 0,
      "players": [
        {
          "name": "Maxim Mrva",
          "odds": null,
          "americanLabel": "31c",
          "impliedPct": 31,
          "bidPct": 26,
          "lastTradePct": 31,
          "decimalOdds": null,
          "modelPct": 31,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 69,
          "grossPayoutMultiple": 3.226,
          "centsAtRisk": 31,
          "centsProfitIfWin": 69,
          "openInterest": 76,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02MRVSVR-MRV"
        },
        {
          "name": "Dalibor Svrcina",
          "odds": null,
          "americanLabel": "73c",
          "impliedPct": 73,
          "bidPct": 71,
          "lastTradePct": 74,
          "decimalOdds": null,
          "modelPct": 73,
          "edgePct": null,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 27,
          "grossPayoutMultiple": 1.37,
          "centsAtRisk": 73,
          "centsProfitIfWin": 27,
          "openInterest": 65,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02MRVSVR-SVR"
        }
      ],
      "desk": {
        "name": "Dalibor Svrcina",
        "odds": null,
        "americanLabel": "73c",
        "impliedPct": 73,
        "bidPct": 71,
        "lastTradePct": 74,
        "decimalOdds": null,
        "modelPct": 73,
        "edgePct": null,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 27,
        "grossPayoutMultiple": 1.37,
        "centsAtRisk": 73,
        "centsProfitIfWin": 27,
        "openInterest": 65,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02MRVSVR-SVR"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Maxim Mrva 31c / Dalibor Svrcina 73c",
      "marketNote": "Robinhood prediction-market prices captured: Maxim Mrva 31c / Dalibor Svrcina 73c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Maxim-Mrva-Vs-Dalibor-Svrcina/",
    "players": [
      {
        "name": "Maxim Mrva",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 31,
        "weakness": {
          "name": "Maxim Mrva",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Dalibor Svrcina",
        "ranking": {
          "name": "Dalibor Svrcina",
          "rank": 108,
          "points": 577,
          "age": 23,
          "country": "Czechia",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/3812/dalibor-svrcina",
          "asOf": "2026-06-02"
        },
        "qualityName": null,
        "profile": "Live rank #108 | Czechia | age 23",
        "modelPct": 73,
        "weakness": {
          "name": "Dalibor Svrcina",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-prostejov-durasovic-vs-gombos-2026-06-02",
    "eventId": "0f37d0ac-83f2-46f0-88a9-785daa9395c3",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Viktor Durasovic vs Norbert Gombos",
    "start": "3:50 AM",
    "startMinutes": 230,
    "court": "ATP Challenger Prostejov",
    "round": "Round Of 32",
    "stage": "ATP Challenger Prostejov | Round Of 32",
    "pickName": "Norbert Gombos",
    "basePickName": "Norbert Gombos",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 62,
    "volatility": 69,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Norbert Gombos is only the current Robinhood market favorite over Viktor Durasovic; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Norbert Gombos",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Viktor Durasovic",
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
        "name": "Viktor Durasovic",
        "confidence": 60,
        "modelPct": 42,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Norbert Gombos",
        "confidence": 70,
        "modelPct": 62,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Norbert Gombos",
        "americanOdds": null,
        "modelPct": 62,
        "impliedPct": 62,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Viktor Durasovic",
          "confidence": 60,
          "modelPct": 42,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Norbert Gombos",
          "confidence": 70,
          "modelPct": 62,
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
        "selection": "Norbert Gombos",
        "line": null,
        "americanOdds": null,
        "modelPct": 62,
        "impliedPct": 62,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Viktor Durasovic 60% / Norbert Gombos 70%",
        "rows": [
          {
            "name": "Viktor Durasovic",
            "confidence": 60,
            "modelPct": 42,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Norbert Gombos",
            "confidence": 70,
            "modelPct": 62,
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
        "selection": "Price required",
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "0f37d0ac-83f2-46f0-88a9-785daa9395c3",
      "totalOpenInterest": 0,
      "totalVolume": 0,
      "players": [
        {
          "name": "Viktor Durasovic",
          "odds": null,
          "americanLabel": "42c",
          "impliedPct": 42,
          "bidPct": 38,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 42,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 58,
          "grossPayoutMultiple": 2.381,
          "centsAtRisk": 42,
          "centsProfitIfWin": 58,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02DURGOM-DUR"
        },
        {
          "name": "Norbert Gombos",
          "odds": null,
          "americanLabel": "62c",
          "impliedPct": 62,
          "bidPct": 58,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 62,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 38,
          "grossPayoutMultiple": 1.613,
          "centsAtRisk": 62,
          "centsProfitIfWin": 38,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02DURGOM-GOM"
        }
      ],
      "desk": {
        "name": "Norbert Gombos",
        "odds": null,
        "americanLabel": "62c",
        "impliedPct": 62,
        "bidPct": 58,
        "lastTradePct": 0,
        "decimalOdds": null,
        "modelPct": 62,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 38,
        "grossPayoutMultiple": 1.613,
        "centsAtRisk": 62,
        "centsProfitIfWin": 38,
        "openInterest": 0,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02DURGOM-GOM"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Viktor Durasovic 42c / Norbert Gombos 62c",
      "marketNote": "Robinhood prediction-market prices captured: Viktor Durasovic 42c / Norbert Gombos 62c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Viktor-Durasovic-Vs-Norbert-Gombos/",
    "players": [
      {
        "name": "Viktor Durasovic",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 42,
        "weakness": {
          "name": "Viktor Durasovic",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Norbert Gombos",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 62,
        "weakness": {
          "name": "Norbert Gombos",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-prostejov-sachko-vs-kumstat-2026-06-02",
    "eventId": "18166fb6-1893-4f54-a44b-bf8860dbea80",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Vitaliy Sachko vs Jan Kumstat",
    "start": "3:50 AM",
    "startMinutes": 230,
    "court": "ATP Challenger Prostejov",
    "round": "Round Of 32",
    "stage": "ATP Challenger Prostejov | Round Of 32",
    "pickName": "Vitaliy Sachko",
    "basePickName": "Vitaliy Sachko",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 68,
    "volatility": 64,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Vitaliy Sachko is only the current Robinhood market favorite over Jan Kumstat; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Vitaliy Sachko",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Jan Kumstat",
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
        "name": "Vitaliy Sachko",
        "confidence": 76,
        "modelPct": 68,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Jan Kumstat",
        "confidence": 54,
        "modelPct": 36,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Vitaliy Sachko",
        "americanOdds": null,
        "modelPct": 68,
        "impliedPct": 68,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Vitaliy Sachko",
          "confidence": 76,
          "modelPct": 68,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Jan Kumstat",
          "confidence": 54,
          "modelPct": 36,
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
        "selection": "Vitaliy Sachko",
        "line": null,
        "americanOdds": null,
        "modelPct": 68,
        "impliedPct": 68,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Vitaliy Sachko 76% / Jan Kumstat 54%",
        "rows": [
          {
            "name": "Vitaliy Sachko",
            "confidence": 76,
            "modelPct": 68,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Jan Kumstat",
            "confidence": 54,
            "modelPct": 36,
            "label": "Underdog set-win path needs early holds"
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
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "18166fb6-1893-4f54-a44b-bf8860dbea80",
      "totalOpenInterest": 53,
      "totalVolume": 0,
      "players": [
        {
          "name": "Vitaliy Sachko",
          "odds": null,
          "americanLabel": "68c",
          "impliedPct": 68,
          "bidPct": 64,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 68,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 32,
          "grossPayoutMultiple": 1.471,
          "centsAtRisk": 68,
          "centsProfitIfWin": 32,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02SACKUM-SAC"
        },
        {
          "name": "Jan Kumstat",
          "odds": null,
          "americanLabel": "36c",
          "impliedPct": 36,
          "bidPct": 33,
          "lastTradePct": 45,
          "decimalOdds": null,
          "modelPct": 36,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 64,
          "grossPayoutMultiple": 2.778,
          "centsAtRisk": 36,
          "centsProfitIfWin": 64,
          "openInterest": 53,
          "symbol": "KXATPCHALLENGERMATCH-26JUN02SACKUM-KUM"
        }
      ],
      "desk": {
        "name": "Vitaliy Sachko",
        "odds": null,
        "americanLabel": "68c",
        "impliedPct": 68,
        "bidPct": 64,
        "lastTradePct": 0,
        "decimalOdds": null,
        "modelPct": 68,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 32,
        "grossPayoutMultiple": 1.471,
        "centsAtRisk": 68,
        "centsProfitIfWin": 32,
        "openInterest": 0,
        "symbol": "KXATPCHALLENGERMATCH-26JUN02SACKUM-SAC"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Vitaliy Sachko 68c / Jan Kumstat 36c",
      "marketNote": "Robinhood prediction-market prices captured: Vitaliy Sachko 68c / Jan Kumstat 36c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Vitaliy-Sachko-Vs-Jan-Kumstat/",
    "players": [
      {
        "name": "Vitaliy Sachko",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 68,
        "weakness": {
          "name": "Vitaliy Sachko",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Jan Kumstat",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 36,
        "weakness": {
          "name": "Jan Kumstat",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-centurion-2-bertrand-vs-zahraj-2026-06-02",
    "eventId": "2646c846-c8dc-44cd-86b2-b71cd087fd41",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Robin Bertrand vs Patrick Zahraj",
    "start": "4:30 AM",
    "startMinutes": 270,
    "court": "ATP Challenger Centurion 2",
    "round": "Round Of 32",
    "stage": "ATP Challenger Centurion 2 | Round Of 32",
    "pickName": "Robin Bertrand",
    "basePickName": "Robin Bertrand",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 62,
    "volatility": 69,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Robin Bertrand is only the current Robinhood market favorite over Patrick Zahraj; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Robin Bertrand",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Patrick Zahraj",
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
        "name": "Robin Bertrand",
        "confidence": 70,
        "modelPct": 62,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Patrick Zahraj",
        "confidence": 60,
        "modelPct": 41,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Robin Bertrand",
        "americanOdds": null,
        "modelPct": 62,
        "impliedPct": 62,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Robin Bertrand",
          "confidence": 70,
          "modelPct": 62,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Patrick Zahraj",
          "confidence": 60,
          "modelPct": 41,
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
        "selection": "Robin Bertrand",
        "line": null,
        "americanOdds": null,
        "modelPct": 62,
        "impliedPct": 62,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Robin Bertrand 70% / Patrick Zahraj 60%",
        "rows": [
          {
            "name": "Robin Bertrand",
            "confidence": 70,
            "modelPct": 62,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Patrick Zahraj",
            "confidence": 60,
            "modelPct": 41,
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
        "selection": "Price required",
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "2646c846-c8dc-44cd-86b2-b71cd087fd41",
      "totalOpenInterest": 1484,
      "totalVolume": 0,
      "players": [
        {
          "name": "Robin Bertrand",
          "odds": null,
          "americanLabel": "62c",
          "impliedPct": 62,
          "bidPct": 60,
          "lastTradePct": 61,
          "decimalOdds": null,
          "modelPct": 62,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 38,
          "grossPayoutMultiple": 1.613,
          "centsAtRisk": 62,
          "centsProfitIfWin": 38,
          "openInterest": 1315,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01BERZAH-BER"
        },
        {
          "name": "Patrick Zahraj",
          "odds": null,
          "americanLabel": "41c",
          "impliedPct": 41,
          "bidPct": 37,
          "lastTradePct": 41,
          "decimalOdds": null,
          "modelPct": 41,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 59,
          "grossPayoutMultiple": 2.439,
          "centsAtRisk": 41,
          "centsProfitIfWin": 59,
          "openInterest": 169,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01BERZAH-ZAH"
        }
      ],
      "desk": {
        "name": "Robin Bertrand",
        "odds": null,
        "americanLabel": "62c",
        "impliedPct": 62,
        "bidPct": 60,
        "lastTradePct": 61,
        "decimalOdds": null,
        "modelPct": 62,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 38,
        "grossPayoutMultiple": 1.613,
        "centsAtRisk": 62,
        "centsProfitIfWin": 38,
        "openInterest": 1315,
        "symbol": "KXATPCHALLENGERMATCH-26JUN01BERZAH-BER"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Robin Bertrand 62c / Patrick Zahraj 41c",
      "marketNote": "Robinhood prediction-market prices captured: Robin Bertrand 62c / Patrick Zahraj 41c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Robin-Bertrand-Vs-Patrick-Zahraj/",
    "players": [
      {
        "name": "Robin Bertrand",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 62,
        "weakness": {
          "name": "Robin Bertrand",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Patrick Zahraj",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 41,
        "weakness": {
          "name": "Patrick Zahraj",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-birmingham-wong-vs-tarvet-2026-06-02",
    "eventId": "5b5fe494-1068-4646-83fa-a78f0a429102",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Coleman Wong vs Oliver Tarvet",
    "start": "4:50 AM",
    "startMinutes": 290,
    "court": "ATP Challenger Birmingham",
    "round": "Round Of 32",
    "stage": "ATP Challenger Birmingham | Round Of 32",
    "pickName": "Coleman Wong",
    "basePickName": "Coleman Wong",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 59,
    "volatility": 71,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Coleman Wong is only the current Robinhood market favorite over Oliver Tarvet; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Coleman Wong",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Oliver Tarvet",
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
        "name": "Coleman Wong",
        "confidence": 67,
        "modelPct": 59,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Oliver Tarvet",
        "confidence": 63,
        "modelPct": 43,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Coleman Wong",
        "americanOdds": null,
        "modelPct": 59,
        "impliedPct": 59,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Coleman Wong",
          "confidence": 67,
          "modelPct": 59,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Oliver Tarvet",
          "confidence": 63,
          "modelPct": 43,
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
        "americanOdds": null,
        "modelPct": 59,
        "impliedPct": 59,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Coleman Wong 67% / Oliver Tarvet 63%",
        "rows": [
          {
            "name": "Coleman Wong",
            "confidence": 67,
            "modelPct": 59,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Oliver Tarvet",
            "confidence": 63,
            "modelPct": 43,
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
        "selection": "Price required",
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "5b5fe494-1068-4646-83fa-a78f0a429102",
      "totalOpenInterest": 9210,
      "totalVolume": 0,
      "players": [
        {
          "name": "Coleman Wong",
          "odds": null,
          "americanLabel": "59c",
          "impliedPct": 59,
          "bidPct": 57,
          "lastTradePct": 57,
          "decimalOdds": null,
          "modelPct": 59,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 41,
          "grossPayoutMultiple": 1.695,
          "centsAtRisk": 59,
          "centsProfitIfWin": 41,
          "openInterest": 4976,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01WONTAR-WON"
        },
        {
          "name": "Oliver Tarvet",
          "odds": null,
          "americanLabel": "43c",
          "impliedPct": 43,
          "bidPct": 41,
          "lastTradePct": 42,
          "decimalOdds": null,
          "modelPct": 43,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 57,
          "grossPayoutMultiple": 2.326,
          "centsAtRisk": 43,
          "centsProfitIfWin": 57,
          "openInterest": 4234,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01WONTAR-TAR"
        }
      ],
      "desk": {
        "name": "Coleman Wong",
        "odds": null,
        "americanLabel": "59c",
        "impliedPct": 59,
        "bidPct": 57,
        "lastTradePct": 57,
        "decimalOdds": null,
        "modelPct": 59,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 41,
        "grossPayoutMultiple": 1.695,
        "centsAtRisk": 59,
        "centsProfitIfWin": 41,
        "openInterest": 4976,
        "symbol": "KXATPCHALLENGERMATCH-26JUN01WONTAR-WON"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Coleman Wong 59c / Oliver Tarvet 43c",
      "marketNote": "Robinhood prediction-market prices captured: Coleman Wong 59c / Oliver Tarvet 43c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Coleman-Wong-Vs-Oliver-Tarvet/",
    "players": [
      {
        "name": "Coleman Wong",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 59,
        "weakness": {
          "name": "Coleman Wong",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Oliver Tarvet",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 43,
        "weakness": {
          "name": "Oliver Tarvet",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rg-m-rafael-jodar-alexander-zverev-2026-06-02",
    "eventId": "175663",
    "tour": "ATP",
    "bestOf": 5,
    "surface": "Clay",
    "title": "Rafael Jodar vs Alexander Zverev",
    "start": "5:00 AM",
    "startMinutes": 300,
    "court": "Court Philippe-Chatrier",
    "round": "Quarterfinal",
    "pickName": "Alexander Zverev",
    "basePickName": "Alexander Zverev",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 53.4,
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
    "reason": "Recent service hold is close: Alexander Zverev 82%, Rafael Jodar 83%. Rafael Jodar grades 21 points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price. Lean, not a chase.",
    "totals": "Best O/U angle: over if the book hangs a low best-of-five number, because both recent hold profiles can extend sets.",
    "weaknessEdge": {
      "edgeType": "Weakness edge",
      "target": "Rafael Jodar",
      "scoreGap": 10,
      "attackingSide": "Alexander Zverev",
      "vulnerableSide": "Rafael Jodar",
      "gameFlow": "Alexander Zverev has a real path if Rafael Jodar's first two service games show the same weakness: double-fault pressure (4.0 avg); 4 recent matches with serve instability.",
      "liveTrigger": "Look for Rafael Jodar facing break points or second-serve pressure before 3-3.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "No total edge unless the posted number is low and both players hold comfortably early.",
      "pick": {
        "name": "Alexander Zverev",
        "serviceHoldPct": 82,
        "firstServeWonPct": 71,
        "secondServeWonPct": 59,
        "firstServePct": 73,
        "avgAces": 5.5,
        "avgDoubleFaults": 2.3,
        "avgWinners": 32,
        "avgUnforcedErrors": 25.1,
        "avgBreakPointsFaced": 4.3,
        "returnPointsWonPct": 40,
        "servicePointsWonPct": 68,
        "weakServeMatches": 3,
        "pressureMatches": 5,
        "matchesWithStats": 8,
        "weaknessScore": 10,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "3 recent matches with serve instability"
        ],
        "strengths": [
          "protects serve well (82% hold)",
          "wins enough first-serve points (71%)",
          "second serve holds up (59%)",
          "positive winner/error balance (32.0 winners, 25.1 unforced)"
        ],
        "gameFlowRead": "Alexander Zverev can drop points quickly through 3 recent matches with serve instability."
      },
      "opponent": {
        "name": "Rafael Jodar",
        "serviceHoldPct": 83,
        "firstServeWonPct": 70,
        "secondServeWonPct": 57,
        "firstServePct": 65,
        "avgAces": 5.1,
        "avgDoubleFaults": 4,
        "avgWinners": 34.9,
        "avgUnforcedErrors": 38.4,
        "avgBreakPointsFaced": 7.6,
        "returnPointsWonPct": 45,
        "servicePointsWonPct": 66,
        "weakServeMatches": 4,
        "pressureMatches": 7,
        "matchesWithStats": 8,
        "weaknessScore": 20,
        "firstGameComfort": "Needs early holds confirmed",
        "liabilities": [
          "double-fault pressure (4.0 avg)",
          "4 recent matches with serve instability"
        ],
        "strengths": [
          "protects serve well (83% hold)",
          "wins enough first-serve points (70%)",
          "second serve holds up (57%)",
          "creates return pressure (45% return points won)"
        ],
        "gameFlowRead": "Rafael Jodar can drop points quickly through double-fault pressure (4.0 avg) and 4 recent matches with serve instability."
      }
    },
    "setWinProjections": [
      {
        "name": "Rafael Jodar",
        "confidence": 73,
        "modelPct": 46.6,
        "label": "Live to win a set"
      },
      {
        "name": "Alexander Zverev",
        "confidence": 83,
        "modelPct": 53.4,
        "label": "Strong set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Alexander Zverev",
        "americanOdds": -310,
        "modelPct": 53.4,
        "impliedPct": 75.6,
        "edgePct": -22.2,
        "evPer100": -29.4,
        "netEvPer100": -31.4,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Alexander Zverev",
        "line": -5.5,
        "americanOdds": -104,
        "modelPct": 51,
        "impliedPct": 51,
        "edgePct": 0,
        "evPer100": 0,
        "netEvPer100": -2,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Near fair",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "No bet",
        "line": 37.5,
        "overOdds": -112,
        "underOdds": -118,
        "expectedGames": 37.2,
        "valueGrade": "No direction",
        "reason": "FanDuel total is 37.5; model did not clear a full-match over/under edge from hold, return, and set-shape data. hold avg 83%, return games won 35%, first-set sample 9.5g, 49 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Over 9.5",
        "line": 9.5,
        "americanOdds": -130,
        "expectedGames": 10.4,
        "confidence": 68,
        "tiebreakRisk": 24,
        "earlyBreakRisk": 56,
        "modelPct": 68,
        "evPer100": 20.3,
        "netEvPer100": 18.3,
        "valueGrade": "Actionable live watch",
        "reason": "Expected first-set games 10.4 vs FanDuel 9.5; Over 9.5. hold avg 83%, return games won 35%, first-set sample 9.5g, 49 recent sets.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Rafael Jodar",
          "confidence": 73,
          "modelPct": 46.6,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Alexander Zverev",
          "confidence": 83,
          "modelPct": 53.4,
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
          "name": "Rafael Jodar",
          "holdPct": 83,
          "firstServeWonPct": 70,
          "secondServeWonPct": 57,
          "servicePointsWonPct": 66,
          "returnPointsWonPct": 45,
          "returnGamesWonPct": 37.625,
          "breakPointsSavedPct": 0,
          "breakPointsConvertedPct": 45.6,
          "aces": 5.1,
          "doubleFaults": 4,
          "winners": 34.9,
          "unforcedErrors": 38.4,
          "weaknessScore": 20,
          "weakServeMatches": 4,
          "statMatches": 8,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 27,
            "firstSetSamples": 8,
            "avgFirstSetGames": 9.625,
            "avgSetGames": 9.592592592592593,
            "avgMatchGames": 32.375,
            "avgSetsPlayed": 3.375,
            "tiebreakRate": 0.18518518518518517,
            "extendedSetRate": 0.25925925925925924,
            "shortSetRate": 0.3333333333333333
          }
        },
        {
          "name": "Alexander Zverev",
          "holdPct": 82,
          "firstServeWonPct": 71,
          "secondServeWonPct": 59,
          "servicePointsWonPct": 68,
          "returnPointsWonPct": 40,
          "returnGamesWonPct": 31.375,
          "breakPointsSavedPct": 0,
          "breakPointsConvertedPct": 43.8,
          "aces": 5.5,
          "doubleFaults": 2.3,
          "winners": 32,
          "unforcedErrors": 25.1,
          "weaknessScore": 10,
          "weakServeMatches": 3,
          "statMatches": 8,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 22,
            "firstSetSamples": 8,
            "avgFirstSetGames": 9.375,
            "avgSetGames": 9.136363636363637,
            "avgMatchGames": 25.125,
            "avgSetsPlayed": 2.75,
            "tiebreakRate": 0.09090909090909091,
            "extendedSetRate": 0.18181818181818182,
            "shortSetRate": 0.45454545454545453
          }
        }
      ],
      "expectedFirstSetGames": 10.4,
      "expectedMatchGames": 37.2,
      "signalStrength": 9,
      "holdAvg": 82.5,
      "returnGamesAvg": 34.5,
      "returnPointsAvg": 42.5,
      "breakPointsSavedAvg": 0,
      "breakPointsConvertedAvg": 44.7,
      "setSamples": 49,
      "firstSetSamples": 16,
      "avgFirstSetGames": 9.5,
      "avgSetGames": 9.4,
      "tiebreakRate": 13.8,
      "extendedSetRate": 22.1,
      "shortSetRate": 39.4,
      "reasonCore": "hold avg 83%, return games won 35%, first-set sample 9.5g, 49 recent sets"
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Alexander Zverev",
        "line": null,
        "americanOdds": -310,
        "modelPct": 53.4,
        "impliedPct": 75.6,
        "edgePct": -22.2,
        "evPer100": -29.4,
        "netEvPer100": -31.4,
        "grade": "Negative EV",
        "issue": "Favorite price needs better proof",
        "reason": "Favorite price has limited payout; require a strong weakness edge or use spread/total."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Alexander Zverev",
        "line": -5.5,
        "americanOdds": -104,
        "modelPct": 51,
        "impliedPct": 51,
        "edgePct": 0,
        "evPer100": 0,
        "netEvPer100": -2,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 51,
        "grade": "Near fair",
        "reason": "Spread is number-dependent; verify first service cycle"
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "No bet",
        "line": 37.5,
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
        "selection": "Rafael Jodar 73% / Alexander Zverev 83%",
        "rows": [
          {
            "name": "Rafael Jodar",
            "confidence": 73,
            "modelPct": 46.6,
            "label": "Live to win a set"
          },
          {
            "name": "Alexander Zverev",
            "confidence": 83,
            "modelPct": 53.4,
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
        "expectedGames": 10.4,
        "confidence": 68,
        "tiebreakRisk": 24,
        "earlyBreakRisk": 56,
        "grade": "Actionable live watch",
        "reason": "Expected first-set games 10.4 vs FanDuel 9.5; Over 9.5. hold avg 83%, return games won 35%, first-set sample 9.5g, 49 recent sets."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Rafael Jodar",
      "opponent": "Alexander Zverev",
      "grade": "Watch only",
      "riskGate": "clean enough",
      "marketOdds": 270,
      "fairOdds": 114,
      "modelProbability": 46.6,
      "dataOnlyProbability": 50.9,
      "marketProbability": 27,
      "marketDisagreementPct": 19.6,
      "netEvPer100": 70.5,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Rafael Jodar is priced below the model, not guaranteed to win.",
      "useCase": "Straight ML value only at +270 or better; fair price from the ensemble is about +114.",
      "bullets": [
        "Recent hold: Rafael Jodar 82.8% vs Alexander Zverev 82.1%.",
        "Serve events: Rafael Jodar 5.1 aces / 4 DFs vs Alexander Zverev 5.5 aces / 2.3 DFs.",
        "Serve points: Rafael Jodar 1st 70%, 2nd 57% vs Alexander Zverev 1st 70.5%, 2nd 59.3%.",
        "Winner/error profile: Rafael Jodar 34.9 winners / 38.4 UEs vs Alexander Zverev 32 winners / 25.1 UEs."
      ],
      "risks": [
        "Desk lean still has Alexander Zverev; this is a price-dislocation play, not the safest winner.",
        "Market still prices Rafael Jodar as a real underdog at 27% implied.",
        "Alexander Zverev strength: protects serve well (82% hold).",
        "Rafael Jodar risk: double-fault pressure (4.0 avg)."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page Chrome scrape",
      "capturedAt": "2026-06-01T23:54:22.787Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/rafael-jodar-v-alexander-zverev-35671633",
      "eventId": "35671633",
      "players": [
        {
          "name": "Rafael Jodar",
          "odds": 245,
          "americanLabel": "+245",
          "impliedPct": 29,
          "decimalOdds": 3.45,
          "modelPct": 46.6,
          "edgePct": 17.6,
          "priceBand": "Underdog",
          "grossProfitPct": 245,
          "grossPayoutMultiple": 3.45,
          "centsAtRisk": 100,
          "centsProfitIfWin": 245
        },
        {
          "name": "Alexander Zverev",
          "odds": -310,
          "americanLabel": "-310",
          "impliedPct": 75.6,
          "decimalOdds": 1.323,
          "modelPct": 53.4,
          "edgePct": -22.2,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 32.3,
          "grossPayoutMultiple": 1.323,
          "centsAtRisk": 100,
          "centsProfitIfWin": 32.3
        }
      ],
      "desk": {
        "name": "Alexander Zverev",
        "odds": -310,
        "americanLabel": "-310",
        "impliedPct": 75.6,
        "decimalOdds": 1.323,
        "modelPct": 53.4,
        "edgePct": -22.2,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 32.3,
        "grossPayoutMultiple": 1.323,
        "centsAtRisk": 100,
        "centsProfitIfWin": 32.3
      },
      "spread": {
        "player": "Alexander Zverev",
        "spread": -5.5,
        "odds": -104
      },
      "total": {
        "side": "Over",
        "line": 37.5,
        "odds": -112
      },
      "totalOver": {
        "side": "Over",
        "line": 37.5,
        "odds": -112
      },
      "totalUnder": {
        "side": "Under",
        "line": 37.5,
        "odds": -118
      },
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
        "odds": -108
      },
      "priceAction": "Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "spreadValue": "Alexander Zverev -5.5 (-104)",
      "totalValue": "37.5 games: Over -112 / Under -118",
      "firstSetTotalValue": "9.5 1st-set games: Over -130 / Under -108",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Over lean if both players hold early",
      "mlValue": "Rafael Jodar +245 / Alexander Zverev -310",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. Favorite price has limited payout; require a strong weakness edge or use spread/total.",
      "noVigNote": "Model 53.4% vs FanDuel implied 75.6% (-22.2 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Rafael-Jodar-Vs-Alexander-Zverev/",
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
          "asOf": "2026-06-02"
        },
        "qualityName": "Rafael Jodar",
        "profile": "Live rank #29 | Spain | age 19 | 2026 clay 19-3, 86% | adj form 102 | hold 83%",
        "modelPct": 46.6,
        "weakness": {
          "name": "Rafael Jodar",
          "serviceHoldPct": 83,
          "firstServeWonPct": 70,
          "secondServeWonPct": 57,
          "firstServePct": 65,
          "avgAces": 5.1,
          "avgDoubleFaults": 4,
          "avgWinners": 34.9,
          "avgUnforcedErrors": 38.4,
          "avgBreakPointsFaced": 7.6,
          "returnPointsWonPct": 45,
          "servicePointsWonPct": 66,
          "weakServeMatches": 4,
          "pressureMatches": 7,
          "matchesWithStats": 8,
          "weaknessScore": 20,
          "firstGameComfort": "Needs early holds confirmed",
          "liabilities": [
            "double-fault pressure (4.0 avg)",
            "4 recent matches with serve instability"
          ],
          "strengths": [
            "protects serve well (83% hold)",
            "wins enough first-serve points (70%)",
            "second serve holds up (57%)",
            "creates return pressure (45% return points won)"
          ],
          "gameFlowRead": "Rafael Jodar can drop points quickly through double-fault pressure (4.0 avg) and 4 recent matches with serve instability."
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
          "asOf": "2026-06-02"
        },
        "qualityName": "Alexander Zverev",
        "profile": "Live rank #3 | Germany | age 29 | 2026 clay 17-4, 81% | adj form 82 | hold 82%",
        "modelPct": 53.4,
        "weakness": {
          "name": "Alexander Zverev",
          "serviceHoldPct": 82,
          "firstServeWonPct": 71,
          "secondServeWonPct": 59,
          "firstServePct": 73,
          "avgAces": 5.5,
          "avgDoubleFaults": 2.3,
          "avgWinners": 32,
          "avgUnforcedErrors": 25.1,
          "avgBreakPointsFaced": 4.3,
          "returnPointsWonPct": 40,
          "servicePointsWonPct": 68,
          "weakServeMatches": 3,
          "pressureMatches": 5,
          "matchesWithStats": 8,
          "weaknessScore": 10,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "3 recent matches with serve instability"
          ],
          "strengths": [
            "protects serve well (82% hold)",
            "wins enough first-serve points (71%)",
            "second serve holds up (59%)",
            "positive winner/error balance (32.0 winners, 25.1 unforced)"
          ],
          "gameFlowRead": "Alexander Zverev can drop points quickly through 3 recent matches with serve instability."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-centurion-2-duran-vs-napolitano-2026-06-02",
    "eventId": "58952a0b-ac64-46d5-a4f4-2ea846ab4323",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Tuncay Duran vs Stefano Napolitano",
    "start": "5:40 AM",
    "startMinutes": 340,
    "court": "ATP Challenger Centurion 2",
    "round": "Round Of 32",
    "stage": "ATP Challenger Centurion 2 | Round Of 32",
    "pickName": "Stefano Napolitano",
    "basePickName": "Stefano Napolitano",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 76,
    "volatility": 56,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Market favorite"
    ],
    "reason": "Stefano Napolitano is only the current Robinhood market favorite over Tuncay Duran; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Stefano Napolitano",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Tuncay Duran",
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
        "name": "Tuncay Duran",
        "confidence": 46,
        "modelPct": 27,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Stefano Napolitano",
        "confidence": 84,
        "modelPct": 76,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Stefano Napolitano",
        "americanOdds": null,
        "modelPct": 76,
        "impliedPct": 76,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 48,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Tuncay Duran",
          "confidence": 46,
          "modelPct": 27,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Stefano Napolitano",
          "confidence": 84,
          "modelPct": 76,
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
        "selection": "Stefano Napolitano",
        "line": null,
        "americanOdds": null,
        "modelPct": 76,
        "impliedPct": 76,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Tuncay Duran 46% / Stefano Napolitano 84%",
        "rows": [
          {
            "name": "Tuncay Duran",
            "confidence": 46,
            "modelPct": 27,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Stefano Napolitano",
            "confidence": 84,
            "modelPct": 76,
            "label": "Market favorite to win a set"
          }
        ],
        "confidence": 84,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Price required",
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
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
      "eventId": "58952a0b-ac64-46d5-a4f4-2ea846ab4323",
      "totalOpenInterest": 7,
      "totalVolume": 0,
      "players": [
        {
          "name": "Tuncay Duran",
          "odds": null,
          "americanLabel": "27c",
          "impliedPct": 27,
          "bidPct": 24,
          "lastTradePct": 27,
          "decimalOdds": null,
          "modelPct": 27,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 73,
          "grossPayoutMultiple": 3.704,
          "centsAtRisk": 27,
          "centsProfitIfWin": 73,
          "openInterest": 7,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01DURNAP-DUR"
        },
        {
          "name": "Stefano Napolitano",
          "odds": null,
          "americanLabel": "76c",
          "impliedPct": 76,
          "bidPct": 73,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 76,
          "edgePct": null,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 24,
          "grossPayoutMultiple": 1.316,
          "centsAtRisk": 76,
          "centsProfitIfWin": 24,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01DURNAP-NAP"
        }
      ],
      "desk": {
        "name": "Stefano Napolitano",
        "odds": null,
        "americanLabel": "76c",
        "impliedPct": 76,
        "bidPct": 73,
        "lastTradePct": 0,
        "decimalOdds": null,
        "modelPct": 76,
        "edgePct": null,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 24,
        "grossPayoutMultiple": 1.316,
        "centsAtRisk": 76,
        "centsProfitIfWin": 24,
        "openInterest": 0,
        "symbol": "KXATPCHALLENGERMATCH-26JUN01DURNAP-NAP"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Tuncay Duran 27c / Stefano Napolitano 76c",
      "marketNote": "Robinhood prediction-market prices captured: Tuncay Duran 27c / Stefano Napolitano 76c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Tuncay-Duran-Vs-Stefano-Napolitano/",
    "players": [
      {
        "name": "Tuncay Duran",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 27,
        "weakness": {
          "name": "Tuncay Duran",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Stefano Napolitano",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 76,
        "weakness": {
          "name": "Stefano Napolitano",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-birmingham-pinnington-jones-vs-vukic-2026-06-02",
    "eventId": "0489a14a-13aa-4a9a-9c57-c76a9e8ddc2c",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Jack Pinnington Jones vs Aleksandar Vukic",
    "start": "6:10 AM",
    "startMinutes": 370,
    "court": "ATP Challenger Birmingham",
    "round": "Round Of 32",
    "stage": "ATP Challenger Birmingham | Round Of 32",
    "pickName": "Jack Pinnington Jones",
    "basePickName": "Jack Pinnington Jones",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 56,
    "volatility": 74,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Jack Pinnington Jones is only the current Robinhood market favorite over Aleksandar Vukic; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Jack Pinnington Jones",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Aleksandar Vukic",
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
        "name": "Jack Pinnington Jones",
        "confidence": 64,
        "modelPct": 56,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Aleksandar Vukic",
        "confidence": 66,
        "modelPct": 46,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Jack Pinnington Jones",
        "americanOdds": null,
        "modelPct": 56,
        "impliedPct": 56,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 10.1,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Jack Pinnington Jones",
          "confidence": 64,
          "modelPct": 56,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Aleksandar Vukic",
          "confidence": 66,
          "modelPct": 46,
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
        "selection": "Jack Pinnington Jones",
        "line": null,
        "americanOdds": null,
        "modelPct": 56,
        "impliedPct": 56,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Jack Pinnington Jones 64% / Aleksandar Vukic 66%",
        "rows": [
          {
            "name": "Jack Pinnington Jones",
            "confidence": 64,
            "modelPct": 56,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Aleksandar Vukic",
            "confidence": 66,
            "modelPct": 46,
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
        "selection": "Price required",
        "expectedGames": 10.1,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "0489a14a-13aa-4a9a-9c57-c76a9e8ddc2c",
      "totalOpenInterest": 6380,
      "totalVolume": 0,
      "players": [
        {
          "name": "Jack Pinnington Jones",
          "odds": null,
          "americanLabel": "56c",
          "impliedPct": 56,
          "bidPct": 54,
          "lastTradePct": 54,
          "decimalOdds": null,
          "modelPct": 56,
          "edgePct": null,
          "priceBand": "Coinflip",
          "grossProfitPct": 44,
          "grossPayoutMultiple": 1.786,
          "centsAtRisk": 56,
          "centsProfitIfWin": 44,
          "openInterest": 5360,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01PINVUK-PIN"
        },
        {
          "name": "Aleksandar Vukic",
          "odds": null,
          "americanLabel": "46c",
          "impliedPct": 46,
          "bidPct": 45,
          "lastTradePct": 45,
          "decimalOdds": null,
          "modelPct": 46,
          "edgePct": null,
          "priceBand": "Coinflip",
          "grossProfitPct": 54,
          "grossPayoutMultiple": 2.174,
          "centsAtRisk": 46,
          "centsProfitIfWin": 54,
          "openInterest": 1020,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01PINVUK-VUK"
        }
      ],
      "desk": {
        "name": "Jack Pinnington Jones",
        "odds": null,
        "americanLabel": "56c",
        "impliedPct": 56,
        "bidPct": 54,
        "lastTradePct": 54,
        "decimalOdds": null,
        "modelPct": 56,
        "edgePct": null,
        "priceBand": "Coinflip",
        "grossProfitPct": 44,
        "grossPayoutMultiple": 1.786,
        "centsAtRisk": 56,
        "centsProfitIfWin": 44,
        "openInterest": 5360,
        "symbol": "KXATPCHALLENGERMATCH-26JUN01PINVUK-PIN"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Jack Pinnington Jones 56c / Aleksandar Vukic 46c",
      "marketNote": "Robinhood prediction-market prices captured: Jack Pinnington Jones 56c / Aleksandar Vukic 46c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Jack-Pinnington-Jones-Vs-Aleksandar-Vukic/",
    "players": [
      {
        "name": "Jack Pinnington Jones",
        "ranking": {
          "name": "Jack Pinnington Jones",
          "rank": 132,
          "points": 468,
          "age": 23,
          "country": "Great Britain",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/10126/jack-pinnington-jones",
          "asOf": "2026-06-02"
        },
        "qualityName": null,
        "profile": "Live rank #132 | Great Britain | age 23",
        "modelPct": 56,
        "weakness": {
          "name": "Jack Pinnington Jones",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
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
          "profileUrl": "https://www.espn.com/tennis/player/_/id/3471/aleksandar-vukic",
          "asOf": "2026-06-02"
        },
        "qualityName": null,
        "profile": "Live rank #96 | Australia | age 30",
        "modelPct": 46,
        "weakness": {
          "name": "Aleksandar Vukic",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-tyler-walton-vs-wu-2026-06-02",
    "eventId": "8d69075a-83f4-4a75-ae76-540c88f9d9fa",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Adam Walton vs Tung-Lin Wu",
    "start": "7:00 AM",
    "startMinutes": 420,
    "court": "ATP Challenger Tyler",
    "round": "Round Of 32",
    "stage": "ATP Challenger Tyler | Round Of 32",
    "pickName": "Adam Walton",
    "basePickName": "Adam Walton",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 77,
    "volatility": 55,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Market favorite"
    ],
    "reason": "Adam Walton is only the current Robinhood market favorite over Tung-Lin Wu; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Adam Walton",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Tung-Lin Wu",
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
        "name": "Adam Walton",
        "confidence": 85,
        "modelPct": 77,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Tung-Lin Wu",
        "confidence": 45,
        "modelPct": 25,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Adam Walton",
        "americanOdds": null,
        "modelPct": 77,
        "impliedPct": 77,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 48,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Adam Walton",
          "confidence": 85,
          "modelPct": 77,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Tung-Lin Wu",
          "confidence": 45,
          "modelPct": 25,
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
        "selection": "Adam Walton",
        "line": null,
        "americanOdds": null,
        "modelPct": 77,
        "impliedPct": 77,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Adam Walton 85% / Tung-Lin Wu 45%",
        "rows": [
          {
            "name": "Adam Walton",
            "confidence": 85,
            "modelPct": 77,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Tung-Lin Wu",
            "confidence": 45,
            "modelPct": 25,
            "label": "Underdog set-win path needs early holds"
          }
        ],
        "confidence": 85,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Price required",
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
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
      "eventId": "8d69075a-83f4-4a75-ae76-540c88f9d9fa",
      "totalOpenInterest": 562,
      "totalVolume": 0,
      "players": [
        {
          "name": "Adam Walton",
          "odds": null,
          "americanLabel": "77c",
          "impliedPct": 77,
          "bidPct": 75,
          "lastTradePct": 77,
          "decimalOdds": null,
          "modelPct": 77,
          "edgePct": null,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 23,
          "grossPayoutMultiple": 1.299,
          "centsAtRisk": 77,
          "centsProfitIfWin": 23,
          "openInterest": 562,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01WALTUN-WAL"
        },
        {
          "name": "Tung-Lin Wu",
          "odds": null,
          "americanLabel": "25c",
          "impliedPct": 25,
          "bidPct": 24,
          "lastTradePct": 0,
          "decimalOdds": null,
          "modelPct": 25,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 75,
          "grossPayoutMultiple": 4,
          "centsAtRisk": 25,
          "centsProfitIfWin": 75,
          "openInterest": 0,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01WALTUN-TUN"
        }
      ],
      "desk": {
        "name": "Adam Walton",
        "odds": null,
        "americanLabel": "77c",
        "impliedPct": 77,
        "bidPct": 75,
        "lastTradePct": 77,
        "decimalOdds": null,
        "modelPct": 77,
        "edgePct": null,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 23,
        "grossPayoutMultiple": 1.299,
        "centsAtRisk": 77,
        "centsProfitIfWin": 23,
        "openInterest": 562,
        "symbol": "KXATPCHALLENGERMATCH-26JUN01WALTUN-WAL"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Adam Walton 77c / Tung-Lin Wu 25c",
      "marketNote": "Robinhood prediction-market prices captured: Adam Walton 77c / Tung-Lin Wu 25c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Adam-Walton-Vs-Tung-Lin-Wu/",
    "players": [
      {
        "name": "Adam Walton",
        "ranking": {
          "name": "Adam Walton",
          "rank": 97,
          "points": 614,
          "age": 27,
          "country": "Australia",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/3093/adam-walton",
          "asOf": "2026-06-02"
        },
        "qualityName": null,
        "profile": "Live rank #97 | Australia | age 27",
        "modelPct": 77,
        "weakness": {
          "name": "Adam Walton",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Tung-Lin Wu",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 25,
        "weakness": {
          "name": "Tung-Lin Wu",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-tyler-martin-vs-ellis-2026-06-02",
    "eventId": "33d4d934-d103-4f8c-a8a2-e7002b467556",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Andres Martin vs Blake Ellis",
    "start": "7:00 AM",
    "startMinutes": 420,
    "court": "ATP Challenger Tyler",
    "round": "Round Of 32",
    "stage": "ATP Challenger Tyler | Round Of 32",
    "pickName": "Andres Martin",
    "basePickName": "Andres Martin",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 66,
    "volatility": 65,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Andres Martin is only the current Robinhood market favorite over Blake Ellis; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Andres Martin",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Blake Ellis",
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
        "name": "Andres Martin",
        "confidence": 74,
        "modelPct": 66,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Blake Ellis",
        "confidence": 56,
        "modelPct": 36,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Andres Martin",
        "americanOdds": null,
        "modelPct": 66,
        "impliedPct": 66,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Andres Martin",
          "confidence": 74,
          "modelPct": 66,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Blake Ellis",
          "confidence": 56,
          "modelPct": 36,
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
        "selection": "Andres Martin",
        "line": null,
        "americanOdds": null,
        "modelPct": 66,
        "impliedPct": 66,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Andres Martin 74% / Blake Ellis 56%",
        "rows": [
          {
            "name": "Andres Martin",
            "confidence": 74,
            "modelPct": 66,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Blake Ellis",
            "confidence": 56,
            "modelPct": 36,
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
        "selection": "Price required",
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "33d4d934-d103-4f8c-a8a2-e7002b467556",
      "totalOpenInterest": 2187,
      "totalVolume": 0,
      "players": [
        {
          "name": "Andres Martin",
          "odds": null,
          "americanLabel": "66c",
          "impliedPct": 66,
          "bidPct": 64,
          "lastTradePct": 65,
          "decimalOdds": null,
          "modelPct": 66,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 34,
          "grossPayoutMultiple": 1.515,
          "centsAtRisk": 66,
          "centsProfitIfWin": 34,
          "openInterest": 1302,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01MARELL-MAR"
        },
        {
          "name": "Blake Ellis",
          "odds": null,
          "americanLabel": "36c",
          "impliedPct": 36,
          "bidPct": 34,
          "lastTradePct": 36,
          "decimalOdds": null,
          "modelPct": 36,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 64,
          "grossPayoutMultiple": 2.778,
          "centsAtRisk": 36,
          "centsProfitIfWin": 64,
          "openInterest": 885,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01MARELL-ELL"
        }
      ],
      "desk": {
        "name": "Andres Martin",
        "odds": null,
        "americanLabel": "66c",
        "impliedPct": 66,
        "bidPct": 64,
        "lastTradePct": 65,
        "decimalOdds": null,
        "modelPct": 66,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 34,
        "grossPayoutMultiple": 1.515,
        "centsAtRisk": 66,
        "centsProfitIfWin": 34,
        "openInterest": 1302,
        "symbol": "KXATPCHALLENGERMATCH-26JUN01MARELL-MAR"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Andres Martin 66c / Blake Ellis 36c",
      "marketNote": "Robinhood prediction-market prices captured: Andres Martin 66c / Blake Ellis 36c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Andres-Martin-Vs-Blake-Ellis/",
    "players": [
      {
        "name": "Andres Martin",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 66,
        "weakness": {
          "name": "Andres Martin",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Blake Ellis",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 36,
        "weakness": {
          "name": "Blake Ellis",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-tyler-qualification-shick-vs-hohmann-2026-06-02",
    "eventId": "093aef7b-0038-4add-9e9b-86ca5108f225",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Braden Shick vs Ronald Hohmann",
    "start": "7:00 AM",
    "startMinutes": 420,
    "court": "ATP Challenger Tyler Qualification",
    "round": "Final",
    "stage": "ATP Challenger Tyler Qualification | Final",
    "pickName": "Braden Shick",
    "basePickName": "Braden Shick",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 81,
    "volatility": 52,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Market favorite"
    ],
    "reason": "Braden Shick is only the current Robinhood market favorite over Ronald Hohmann; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Braden Shick",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Ronald Hohmann",
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
        "name": "Braden Shick",
        "confidence": 88,
        "modelPct": 81,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Ronald Hohmann",
        "confidence": 41,
        "modelPct": 23,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Braden Shick",
        "americanOdds": null,
        "modelPct": 81,
        "impliedPct": 81,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 48,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Braden Shick",
          "confidence": 88,
          "modelPct": 81,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Ronald Hohmann",
          "confidence": 41,
          "modelPct": 23,
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
        "selection": "Braden Shick",
        "line": null,
        "americanOdds": null,
        "modelPct": 81,
        "impliedPct": 81,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Braden Shick 88% / Ronald Hohmann 41%",
        "rows": [
          {
            "name": "Braden Shick",
            "confidence": 88,
            "modelPct": 81,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Ronald Hohmann",
            "confidence": 41,
            "modelPct": 23,
            "label": "Underdog set-win path needs early holds"
          }
        ],
        "confidence": 88,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Price required",
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
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
      "eventId": "093aef7b-0038-4add-9e9b-86ca5108f225",
      "totalOpenInterest": 323,
      "totalVolume": 0,
      "players": [
        {
          "name": "Braden Shick",
          "odds": null,
          "americanLabel": "81c",
          "impliedPct": 81,
          "bidPct": 77,
          "lastTradePct": 81,
          "decimalOdds": null,
          "modelPct": 81,
          "edgePct": null,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 19,
          "grossPayoutMultiple": 1.235,
          "centsAtRisk": 81,
          "centsProfitIfWin": 19,
          "openInterest": 317,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01SHIHOH-SHI"
        },
        {
          "name": "Ronald Hohmann",
          "odds": null,
          "americanLabel": "23c",
          "impliedPct": 23,
          "bidPct": 19,
          "lastTradePct": 24,
          "decimalOdds": null,
          "modelPct": 23,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 77,
          "grossPayoutMultiple": 4.348,
          "centsAtRisk": 23,
          "centsProfitIfWin": 77,
          "openInterest": 6,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01SHIHOH-HOH"
        }
      ],
      "desk": {
        "name": "Braden Shick",
        "odds": null,
        "americanLabel": "81c",
        "impliedPct": 81,
        "bidPct": 77,
        "lastTradePct": 81,
        "decimalOdds": null,
        "modelPct": 81,
        "edgePct": null,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 19,
        "grossPayoutMultiple": 1.235,
        "centsAtRisk": 81,
        "centsProfitIfWin": 19,
        "openInterest": 317,
        "symbol": "KXATPCHALLENGERMATCH-26JUN01SHIHOH-SHI"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Braden Shick 81c / Ronald Hohmann 23c",
      "marketNote": "Robinhood prediction-market prices captured: Braden Shick 81c / Ronald Hohmann 23c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Braden-Shick-Vs-Ronald-Hohmann/",
    "players": [
      {
        "name": "Braden Shick",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 81,
        "weakness": {
          "name": "Braden Shick",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Ronald Hohmann",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 23,
        "weakness": {
          "name": "Ronald Hohmann",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-tyler-butvilas-vs-svajda-2026-06-02",
    "eventId": "7106da63-4602-4b7c-a38c-220d1387cd23",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Edas Butvilas vs Trevor Svajda",
    "start": "7:00 AM",
    "startMinutes": 420,
    "court": "ATP Challenger Tyler",
    "round": "Round Of 32",
    "stage": "ATP Challenger Tyler | Round Of 32",
    "pickName": "Edas Butvilas",
    "basePickName": "Edas Butvilas",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 61,
    "volatility": 69,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Edas Butvilas is only the current Robinhood market favorite over Trevor Svajda; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Edas Butvilas",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Trevor Svajda",
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
        "name": "Edas Butvilas",
        "confidence": 69,
        "modelPct": 61,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Trevor Svajda",
        "confidence": 61,
        "modelPct": 42,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Edas Butvilas",
        "americanOdds": null,
        "modelPct": 61,
        "impliedPct": 61,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Edas Butvilas",
          "confidence": 69,
          "modelPct": 61,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Trevor Svajda",
          "confidence": 61,
          "modelPct": 42,
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
        "selection": "Edas Butvilas",
        "line": null,
        "americanOdds": null,
        "modelPct": 61,
        "impliedPct": 61,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Edas Butvilas 69% / Trevor Svajda 61%",
        "rows": [
          {
            "name": "Edas Butvilas",
            "confidence": 69,
            "modelPct": 61,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Trevor Svajda",
            "confidence": 61,
            "modelPct": 42,
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
        "selection": "Price required",
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "7106da63-4602-4b7c-a38c-220d1387cd23",
      "totalOpenInterest": 809,
      "totalVolume": 0,
      "players": [
        {
          "name": "Edas Butvilas",
          "odds": null,
          "americanLabel": "61c",
          "impliedPct": 61,
          "bidPct": 58,
          "lastTradePct": 60,
          "decimalOdds": null,
          "modelPct": 61,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 39,
          "grossPayoutMultiple": 1.639,
          "centsAtRisk": 61,
          "centsProfitIfWin": 39,
          "openInterest": 544,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01BUTSVA-BUT"
        },
        {
          "name": "Trevor Svajda",
          "odds": null,
          "americanLabel": "42c",
          "impliedPct": 42,
          "bidPct": 38,
          "lastTradePct": 39,
          "decimalOdds": null,
          "modelPct": 42,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 58,
          "grossPayoutMultiple": 2.381,
          "centsAtRisk": 42,
          "centsProfitIfWin": 58,
          "openInterest": 265,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01BUTSVA-SVA"
        }
      ],
      "desk": {
        "name": "Edas Butvilas",
        "odds": null,
        "americanLabel": "61c",
        "impliedPct": 61,
        "bidPct": 58,
        "lastTradePct": 60,
        "decimalOdds": null,
        "modelPct": 61,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 39,
        "grossPayoutMultiple": 1.639,
        "centsAtRisk": 61,
        "centsProfitIfWin": 39,
        "openInterest": 544,
        "symbol": "KXATPCHALLENGERMATCH-26JUN01BUTSVA-BUT"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Edas Butvilas 61c / Trevor Svajda 42c",
      "marketNote": "Robinhood prediction-market prices captured: Edas Butvilas 61c / Trevor Svajda 42c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Edas-Butvilas-Vs-Trevor-Svajda/",
    "players": [
      {
        "name": "Edas Butvilas",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 61,
        "weakness": {
          "name": "Edas Butvilas",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Trevor Svajda",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 42,
        "weakness": {
          "name": "Trevor Svajda",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-tyler-sun-vs-ilagan-2026-06-02",
    "eventId": "300ff787-a1c6-4d2d-b0c6-35e985b674cf",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Fajing Sun vs Andre Ilagan",
    "start": "7:00 AM",
    "startMinutes": 420,
    "court": "ATP Challenger Tyler",
    "round": "Round Of 32",
    "stage": "ATP Challenger Tyler | Round Of 32",
    "pickName": "Andre Ilagan",
    "basePickName": "Andre Ilagan",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 55,
    "volatility": 74,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Andre Ilagan is only the current Robinhood market favorite over Fajing Sun; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Andre Ilagan",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Fajing Sun",
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
        "name": "Fajing Sun",
        "confidence": 67,
        "modelPct": 46,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Andre Ilagan",
        "confidence": 63,
        "modelPct": 55,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Andre Ilagan",
        "americanOdds": null,
        "modelPct": 55,
        "impliedPct": 55,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 10.1,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Fajing Sun",
          "confidence": 67,
          "modelPct": 46,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Andre Ilagan",
          "confidence": 63,
          "modelPct": 55,
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
        "selection": "Andre Ilagan",
        "line": null,
        "americanOdds": null,
        "modelPct": 55,
        "impliedPct": 55,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Fajing Sun 67% / Andre Ilagan 63%",
        "rows": [
          {
            "name": "Fajing Sun",
            "confidence": 67,
            "modelPct": 46,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Andre Ilagan",
            "confidence": 63,
            "modelPct": 55,
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
        "selection": "Price required",
        "expectedGames": 10.1,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "300ff787-a1c6-4d2d-b0c6-35e985b674cf",
      "totalOpenInterest": 2450,
      "totalVolume": 0,
      "players": [
        {
          "name": "Fajing Sun",
          "odds": null,
          "americanLabel": "46c",
          "impliedPct": 46,
          "bidPct": 45,
          "lastTradePct": 46,
          "decimalOdds": null,
          "modelPct": 46,
          "edgePct": null,
          "priceBand": "Coinflip",
          "grossProfitPct": 54,
          "grossPayoutMultiple": 2.174,
          "centsAtRisk": 46,
          "centsProfitIfWin": 54,
          "openInterest": 1276,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01SUNILA-SUN"
        },
        {
          "name": "Andre Ilagan",
          "odds": null,
          "americanLabel": "55c",
          "impliedPct": 55,
          "bidPct": 53,
          "lastTradePct": 54,
          "decimalOdds": null,
          "modelPct": 55,
          "edgePct": null,
          "priceBand": "Coinflip",
          "grossProfitPct": 45,
          "grossPayoutMultiple": 1.818,
          "centsAtRisk": 55,
          "centsProfitIfWin": 45,
          "openInterest": 1174,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01SUNILA-ILA"
        }
      ],
      "desk": {
        "name": "Andre Ilagan",
        "odds": null,
        "americanLabel": "55c",
        "impliedPct": 55,
        "bidPct": 53,
        "lastTradePct": 54,
        "decimalOdds": null,
        "modelPct": 55,
        "edgePct": null,
        "priceBand": "Coinflip",
        "grossProfitPct": 45,
        "grossPayoutMultiple": 1.818,
        "centsAtRisk": 55,
        "centsProfitIfWin": 45,
        "openInterest": 1174,
        "symbol": "KXATPCHALLENGERMATCH-26JUN01SUNILA-ILA"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Fajing Sun 46c / Andre Ilagan 55c",
      "marketNote": "Robinhood prediction-market prices captured: Fajing Sun 46c / Andre Ilagan 55c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Fajing-Sun-Vs-Andre-Ilagan/",
    "players": [
      {
        "name": "Fajing Sun",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 46,
        "weakness": {
          "name": "Fajing Sun",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Andre Ilagan",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 55,
        "weakness": {
          "name": "Andre Ilagan",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-tyler-ardila-vs-zink-2026-06-02",
    "eventId": "bcbaaa6f-c4ee-44cf-b872-24e68cc4f54a",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Landon Ardila vs Tyler Zink",
    "start": "7:00 AM",
    "startMinutes": 420,
    "court": "ATP Challenger Tyler",
    "round": "Round Of 32",
    "stage": "ATP Challenger Tyler | Round Of 32",
    "pickName": "Tyler Zink",
    "basePickName": "Tyler Zink",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 87,
    "volatility": 46,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Market favorite"
    ],
    "reason": "Tyler Zink is only the current Robinhood market favorite over Landon Ardila; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Tyler Zink",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Landon Ardila",
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
        "name": "Landon Ardila",
        "confidence": 36,
        "modelPct": 15,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Tyler Zink",
        "confidence": 88,
        "modelPct": 87,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Tyler Zink",
        "americanOdds": null,
        "modelPct": 87,
        "impliedPct": 87,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 48,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Landon Ardila",
          "confidence": 36,
          "modelPct": 15,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Tyler Zink",
          "confidence": 88,
          "modelPct": 87,
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
        "selection": "Tyler Zink",
        "line": null,
        "americanOdds": null,
        "modelPct": 87,
        "impliedPct": 87,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Landon Ardila 36% / Tyler Zink 88%",
        "rows": [
          {
            "name": "Landon Ardila",
            "confidence": 36,
            "modelPct": 15,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Tyler Zink",
            "confidence": 88,
            "modelPct": 87,
            "label": "Market favorite to win a set"
          }
        ],
        "confidence": 88,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Price required",
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
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
      "eventId": "bcbaaa6f-c4ee-44cf-b872-24e68cc4f54a",
      "totalOpenInterest": 8825,
      "totalVolume": 0,
      "players": [
        {
          "name": "Landon Ardila",
          "odds": null,
          "americanLabel": "15c",
          "impliedPct": 15,
          "bidPct": 14,
          "lastTradePct": 14,
          "decimalOdds": null,
          "modelPct": 15,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 85,
          "grossPayoutMultiple": 6.667,
          "centsAtRisk": 15,
          "centsProfitIfWin": 85,
          "openInterest": 2819,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01ARDZIN-ARD"
        },
        {
          "name": "Tyler Zink",
          "odds": null,
          "americanLabel": "87c",
          "impliedPct": 87,
          "bidPct": 86,
          "lastTradePct": 87,
          "decimalOdds": null,
          "modelPct": 87,
          "edgePct": null,
          "priceBand": "Very expensive favorite",
          "grossProfitPct": 13,
          "grossPayoutMultiple": 1.149,
          "centsAtRisk": 87,
          "centsProfitIfWin": 13,
          "openInterest": 6006,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01ARDZIN-ZIN"
        }
      ],
      "desk": {
        "name": "Tyler Zink",
        "odds": null,
        "americanLabel": "87c",
        "impliedPct": 87,
        "bidPct": 86,
        "lastTradePct": 87,
        "decimalOdds": null,
        "modelPct": 87,
        "edgePct": null,
        "priceBand": "Very expensive favorite",
        "grossProfitPct": 13,
        "grossPayoutMultiple": 1.149,
        "centsAtRisk": 87,
        "centsProfitIfWin": 13,
        "openInterest": 6006,
        "symbol": "KXATPCHALLENGERMATCH-26JUN01ARDZIN-ZIN"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Landon Ardila 15c / Tyler Zink 87c",
      "marketNote": "Robinhood prediction-market prices captured: Landon Ardila 15c / Tyler Zink 87c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Landon-Ardila-Vs-Tyler-Zink/",
    "players": [
      {
        "name": "Landon Ardila",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 15,
        "weakness": {
          "name": "Landon Ardila",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Tyler Zink",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 87,
        "weakness": {
          "name": "Tyler Zink",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-tyler-legout-vs-andrade-2026-06-02",
    "eventId": "8a58aff5-83a2-4fe1-bcc5-4fa3c4f09f28",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Timo Legout vs Andres Andrade",
    "start": "7:00 AM",
    "startMinutes": 420,
    "court": "ATP Challenger Tyler",
    "round": "Round Of 32",
    "stage": "ATP Challenger Tyler | Round Of 32",
    "pickName": "Andres Andrade",
    "basePickName": "Andres Andrade",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 72,
    "volatility": 59,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Market favorite"
    ],
    "reason": "Andres Andrade is only the current Robinhood market favorite over Timo Legout; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Andres Andrade",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Timo Legout",
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
        "name": "Timo Legout",
        "confidence": 50,
        "modelPct": 30,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Andres Andrade",
        "confidence": 80,
        "modelPct": 72,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Andres Andrade",
        "americanOdds": null,
        "modelPct": 72,
        "impliedPct": 72,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
        "modelPct": 48,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Timo Legout",
          "confidence": 50,
          "modelPct": 30,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Andres Andrade",
          "confidence": 80,
          "modelPct": 72,
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
        "selection": "Andres Andrade",
        "line": null,
        "americanOdds": null,
        "modelPct": 72,
        "impliedPct": 72,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Timo Legout 50% / Andres Andrade 80%",
        "rows": [
          {
            "name": "Timo Legout",
            "confidence": 50,
            "modelPct": 30,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Andres Andrade",
            "confidence": 80,
            "modelPct": 72,
            "label": "Market favorite to win a set"
          }
        ],
        "confidence": 80,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Price required",
        "expectedGames": 8.8,
        "confidence": 48,
        "tiebreakRisk": 52,
        "earlyBreakRisk": 48,
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
      "eventId": "8a58aff5-83a2-4fe1-bcc5-4fa3c4f09f28",
      "totalOpenInterest": 1051,
      "totalVolume": 0,
      "players": [
        {
          "name": "Timo Legout",
          "odds": null,
          "americanLabel": "30c",
          "impliedPct": 30,
          "bidPct": 29,
          "lastTradePct": 29,
          "decimalOdds": null,
          "modelPct": 30,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 70,
          "grossPayoutMultiple": 3.333,
          "centsAtRisk": 30,
          "centsProfitIfWin": 70,
          "openInterest": 262,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01LEGAND-LEG"
        },
        {
          "name": "Andres Andrade",
          "odds": null,
          "americanLabel": "72c",
          "impliedPct": 72,
          "bidPct": 70,
          "lastTradePct": 72,
          "decimalOdds": null,
          "modelPct": 72,
          "edgePct": null,
          "priceBand": "Low-payout favorite",
          "grossProfitPct": 28,
          "grossPayoutMultiple": 1.389,
          "centsAtRisk": 72,
          "centsProfitIfWin": 28,
          "openInterest": 789,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01LEGAND-AND"
        }
      ],
      "desk": {
        "name": "Andres Andrade",
        "odds": null,
        "americanLabel": "72c",
        "impliedPct": 72,
        "bidPct": 70,
        "lastTradePct": 72,
        "decimalOdds": null,
        "modelPct": 72,
        "edgePct": null,
        "priceBand": "Low-payout favorite",
        "grossProfitPct": 28,
        "grossPayoutMultiple": 1.389,
        "centsAtRisk": 72,
        "centsProfitIfWin": 28,
        "openInterest": 789,
        "symbol": "KXATPCHALLENGERMATCH-26JUN01LEGAND-AND"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Timo Legout 30c / Andres Andrade 72c",
      "marketNote": "Robinhood prediction-market prices captured: Timo Legout 30c / Andres Andrade 72c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Timo-Legout-Vs-Andres-Andrade/",
    "players": [
      {
        "name": "Timo Legout",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 30,
        "weakness": {
          "name": "Timo Legout",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Andres Andrade",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 72,
        "weakness": {
          "name": "Andres Andrade",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-tyler-shimizu-vs-sweeny-2026-06-02",
    "eventId": "bf964f14-9519-42ca-97c9-86641cf5938c",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Yuta Shimizu vs Dane Sweeny",
    "start": "7:00 AM",
    "startMinutes": 420,
    "court": "ATP Challenger Tyler",
    "round": "Round Of 32",
    "stage": "ATP Challenger Tyler | Round Of 32",
    "pickName": "Dane Sweeny",
    "basePickName": "Dane Sweeny",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 59,
    "volatility": 71,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Dane Sweeny is only the current Robinhood market favorite over Yuta Shimizu; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Dane Sweeny",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Yuta Shimizu",
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
        "name": "Yuta Shimizu",
        "confidence": 63,
        "modelPct": 44,
        "label": "Underdog set-win path needs early holds"
      },
      {
        "name": "Dane Sweeny",
        "confidence": 67,
        "modelPct": 59,
        "label": "Market favorite to win a set"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Dane Sweeny",
        "americanOdds": null,
        "modelPct": 59,
        "impliedPct": 59,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Yuta Shimizu",
          "confidence": 63,
          "modelPct": 44,
          "label": "Underdog set-win path needs early holds",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Dane Sweeny",
          "confidence": 67,
          "modelPct": 59,
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
        "selection": "Dane Sweeny",
        "line": null,
        "americanOdds": null,
        "modelPct": 59,
        "impliedPct": 59,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Yuta Shimizu 63% / Dane Sweeny 67%",
        "rows": [
          {
            "name": "Yuta Shimizu",
            "confidence": 63,
            "modelPct": 44,
            "label": "Underdog set-win path needs early holds"
          },
          {
            "name": "Dane Sweeny",
            "confidence": 67,
            "modelPct": 59,
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
        "selection": "Price required",
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "bf964f14-9519-42ca-97c9-86641cf5938c",
      "totalOpenInterest": 1184,
      "totalVolume": 0,
      "players": [
        {
          "name": "Yuta Shimizu",
          "odds": null,
          "americanLabel": "44c",
          "impliedPct": 44,
          "bidPct": 43,
          "lastTradePct": 44,
          "decimalOdds": null,
          "modelPct": 44,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 56,
          "grossPayoutMultiple": 2.273,
          "centsAtRisk": 44,
          "centsProfitIfWin": 56,
          "openInterest": 999,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01SHISWE-SHI"
        },
        {
          "name": "Dane Sweeny",
          "odds": null,
          "americanLabel": "59c",
          "impliedPct": 59,
          "bidPct": 56,
          "lastTradePct": 59,
          "decimalOdds": null,
          "modelPct": 59,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 41,
          "grossPayoutMultiple": 1.695,
          "centsAtRisk": 59,
          "centsProfitIfWin": 41,
          "openInterest": 185,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01SHISWE-SWE"
        }
      ],
      "desk": {
        "name": "Dane Sweeny",
        "odds": null,
        "americanLabel": "59c",
        "impliedPct": 59,
        "bidPct": 56,
        "lastTradePct": 59,
        "decimalOdds": null,
        "modelPct": 59,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 41,
        "grossPayoutMultiple": 1.695,
        "centsAtRisk": 59,
        "centsProfitIfWin": 41,
        "openInterest": 185,
        "symbol": "KXATPCHALLENGERMATCH-26JUN01SHISWE-SWE"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Yuta Shimizu 44c / Dane Sweeny 59c",
      "marketNote": "Robinhood prediction-market prices captured: Yuta Shimizu 44c / Dane Sweeny 59c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Yuta-Shimizu-Vs-Dane-Sweeny/",
    "players": [
      {
        "name": "Yuta Shimizu",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 44,
        "weakness": {
          "name": "Yuta Shimizu",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Dane Sweeny",
        "ranking": {
          "name": "Dane Sweeny",
          "rank": 131,
          "points": 468,
          "age": 25,
          "country": "Australia",
          "tour": "ATP",
          "source": "https://www.espn.com/tennis/rankings/_/type/atp/season/2026",
          "profileUrl": "https://www.espn.com/tennis/player/_/id/4030/dane-sweeny",
          "asOf": "2026-06-02"
        },
        "qualityName": null,
        "profile": "Live rank #131 | Australia | age 25",
        "modelPct": 59,
        "weakness": {
          "name": "Dane Sweeny",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      }
    ]
  },
  {
    "id": "rg-m-jakub-mensik-joao-fonseca-2026-06-02",
    "eventId": "175661",
    "tour": "ATP",
    "bestOf": 5,
    "surface": "Clay",
    "title": "Jakub Mensik vs Joao Fonseca",
    "start": "11:15 AM",
    "startMinutes": 675,
    "court": "Court Philippe-Chatrier",
    "round": "Quarterfinal",
    "pickName": "Joao Fonseca",
    "basePickName": "Joao Fonseca",
    "modelSource": "Tennis multimodel ensemble",
    "modelSplit": false,
    "confidence": 57.2,
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
    "reason": "Joao Fonseca has the recent service-hold edge 85% to 77%. Opponent-adjusted recent form is basically even: Joao Fonseca 72, Jakub Mensik 77. Lean, not a chase.",
    "totals": "Best O/U angle: over if the book hangs a low best-of-five number, because both recent hold profiles can extend sets.",
    "weaknessEdge": {
      "edgeType": "Weakness edge",
      "target": "Jakub Mensik",
      "scoreGap": 19,
      "attackingSide": "Joao Fonseca",
      "vulnerableSide": "Jakub Mensik",
      "gameFlow": "Joao Fonseca has a real path if Jakub Mensik's first two service games show the same weakness: double-fault pressure (4.8 avg); faces too many break points (8.3 avg).",
      "liveTrigger": "Look for Jakub Mensik facing break points or second-serve pressure before 3-3.",
      "spreadRead": "No spread edge without a posted handicap and first service-cycle read.",
      "totalRead": "Avoid low unders if Jakub Mensik faces early break points or second-serve pressure.",
      "pick": {
        "name": "Joao Fonseca",
        "serviceHoldPct": 85,
        "firstServeWonPct": 70,
        "secondServeWonPct": 61,
        "firstServePct": 68,
        "avgAces": 4.9,
        "avgDoubleFaults": 1,
        "avgWinners": 35.3,
        "avgUnforcedErrors": 33,
        "avgBreakPointsFaced": 7.9,
        "returnPointsWonPct": 35,
        "servicePointsWonPct": 67,
        "weakServeMatches": 0,
        "pressureMatches": 7,
        "matchesWithStats": 8,
        "weaknessScore": 8,
        "firstGameComfort": "Comfortable enough if first serve lands",
        "liabilities": [
          "limited return pressure (35% return points won)"
        ],
        "strengths": [
          "protects serve well (85% hold)",
          "wins enough first-serve points (70%)",
          "second serve holds up (61%)"
        ],
        "gameFlowRead": "Joao Fonseca can drop points quickly through limited return pressure (35% return points won)."
      },
      "opponent": {
        "name": "Jakub Mensik",
        "serviceHoldPct": 77,
        "firstServeWonPct": 75,
        "secondServeWonPct": 47,
        "firstServePct": 56,
        "avgAces": 7.1,
        "avgDoubleFaults": 4.8,
        "avgWinners": 35.7,
        "avgUnforcedErrors": 41.4,
        "avgBreakPointsFaced": 8.3,
        "returnPointsWonPct": 37,
        "servicePointsWonPct": 62,
        "weakServeMatches": 5,
        "pressureMatches": 7,
        "matchesWithStats": 8,
        "weaknessScore": 27,
        "firstGameComfort": "Fragile opening-service profile",
        "liabilities": [
          "double-fault pressure (4.8 avg)",
          "faces too many break points (8.3 avg)",
          "5 recent matches with serve instability",
          "limited return pressure (37% return points won)"
        ],
        "strengths": [
          "protects serve well (77% hold)",
          "wins enough first-serve points (75%)"
        ],
        "gameFlowRead": "Jakub Mensik can drop points quickly through double-fault pressure (4.8 avg) and faces too many break points (8.3 avg)."
      }
    },
    "setWinProjections": [
      {
        "name": "Jakub Mensik",
        "confidence": 70,
        "modelPct": 42.8,
        "label": "Live to win a set"
      },
      {
        "name": "Joao Fonseca",
        "confidence": 85,
        "modelPct": 57.2,
        "label": "Strong set-win path"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Joao Fonseca",
        "americanOdds": -210,
        "modelPct": 57.2,
        "impliedPct": 67.7,
        "edgePct": -10.5,
        "evPer100": -15.6,
        "netEvPer100": -17.6,
        "feePer100": 2,
        "valueIssue": "Favorite price needs better proof",
        "valueGrade": "Negative EV",
        "betGrade": false
      },
      "spread": {
        "marketType": "Spread",
        "selection": "Joao Fonseca",
        "line": -4.5,
        "americanOdds": -108,
        "modelPct": 55,
        "impliedPct": 51.9,
        "edgePct": 3.1,
        "evPer100": 5.9,
        "netEvPer100": 3.9,
        "feePer100": 2,
        "valueIssue": "Spread watch only",
        "valueGrade": "Raw positive EV",
        "betGrade": false
      },
      "total": {
        "marketType": "Total",
        "selection": "Over",
        "line": 37.5,
        "americanOdds": -118,
        "expectedGames": 39.2,
        "modelPct": 64,
        "impliedPct": 54.1,
        "edgePct": 9.9,
        "evPer100": 18.2,
        "netEvPer100": 16.2,
        "feePer100": 2,
        "valueIssue": "Total watch only",
        "valueGrade": "Watch only",
        "reason": "Expected match games 39.2 vs FanDuel 37.5; Over. hold avg 81%, return games won 20%, first-set sample 9.8g, 53 recent sets.",
        "betGrade": false
      },
      "firstSetTotal": {
        "marketType": "First-set total",
        "selection": "Over 9.5",
        "line": 9.5,
        "americanOdds": -128,
        "expectedGames": 11,
        "confidence": 73,
        "tiebreakRisk": 33,
        "earlyBreakRisk": 54,
        "modelPct": 73,
        "evPer100": 30,
        "netEvPer100": 28,
        "valueGrade": "Actionable live watch",
        "reason": "Expected first-set games 11 vs FanDuel 9.5; Over 9.5. hold avg 81%, return games won 20%, first-set sample 9.8g, 53 recent sets.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Jakub Mensik",
          "confidence": 70,
          "modelPct": 42.8,
          "label": "Live to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Joao Fonseca",
          "confidence": 85,
          "modelPct": 57.2,
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
          "holdPct": 77,
          "firstServeWonPct": 75,
          "secondServeWonPct": 47,
          "servicePointsWonPct": 62,
          "returnPointsWonPct": 37,
          "returnGamesWonPct": 20.5,
          "breakPointsSavedPct": 0,
          "breakPointsConvertedPct": 32.9,
          "aces": 7.1,
          "doubleFaults": 4.8,
          "winners": 35.7,
          "unforcedErrors": 41.4,
          "weaknessScore": 27,
          "weakServeMatches": 5,
          "statMatches": 8,
          "setShape": {
            "completedMatches": 8,
            "setSamples": 27,
            "firstSetSamples": 8,
            "avgFirstSetGames": 8.875,
            "avgSetGames": 9.222222222222221,
            "avgMatchGames": 31.125,
            "avgSetsPlayed": 3.375,
            "tiebreakRate": 0.14814814814814814,
            "extendedSetRate": 0.14814814814814814,
            "shortSetRate": 0.37037037037037035
          }
        },
        {
          "name": "Joao Fonseca",
          "holdPct": 85,
          "firstServeWonPct": 70,
          "secondServeWonPct": 61,
          "servicePointsWonPct": 67,
          "returnPointsWonPct": 35,
          "returnGamesWonPct": 20.142857142857142,
          "breakPointsSavedPct": 0,
          "breakPointsConvertedPct": 45.7,
          "aces": 4.9,
          "doubleFaults": 1,
          "winners": 35.3,
          "unforcedErrors": 33,
          "weaknessScore": 8,
          "weakServeMatches": 0,
          "statMatches": 8,
          "setShape": {
            "completedMatches": 7,
            "setSamples": 26,
            "firstSetSamples": 7,
            "avgFirstSetGames": 10.714285714285714,
            "avgSetGames": 10,
            "avgMatchGames": 37.142857142857146,
            "avgSetsPlayed": 3.7142857142857144,
            "tiebreakRate": 0.15384615384615385,
            "extendedSetRate": 0.3076923076923077,
            "shortSetRate": 0.19230769230769232
          }
        }
      ],
      "expectedFirstSetGames": 11,
      "expectedMatchGames": 39.2,
      "signalStrength": 9,
      "holdAvg": 81,
      "returnGamesAvg": 20.3,
      "returnPointsAvg": 36,
      "breakPointsSavedAvg": 0,
      "breakPointsConvertedAvg": 39.3,
      "setSamples": 53,
      "firstSetSamples": 15,
      "avgFirstSetGames": 9.8,
      "avgSetGames": 9.6,
      "tiebreakRate": 15.1,
      "extendedSetRate": 22.8,
      "shortSetRate": 28.1,
      "reasonCore": "hold avg 81%, return games won 20%, first-set sample 9.8g, 53 recent sets"
    },
    "derivativeCase": null,
    "bettingMatrix": [
      {
        "marketType": "Moneyline",
        "label": "ML value",
        "selection": "Joao Fonseca",
        "line": null,
        "americanOdds": -210,
        "modelPct": 57.2,
        "impliedPct": 67.7,
        "edgePct": -10.5,
        "evPer100": -15.6,
        "netEvPer100": -17.6,
        "grade": "Negative EV",
        "issue": "Favorite price needs better proof",
        "reason": "FanDuel price is richer than the model; pass ML unless live state improves."
      },
      {
        "marketType": "Game spread",
        "label": "Game spread",
        "selection": "Joao Fonseca",
        "line": -4.5,
        "americanOdds": -108,
        "modelPct": 55,
        "impliedPct": 51.9,
        "edgePct": 3.1,
        "evPer100": 5.9,
        "netEvPer100": 3.9,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 55,
        "grade": "Raw positive EV",
        "reason": "Spread is number-dependent; verify first service cycle"
      },
      {
        "marketType": "Total games",
        "label": "O/U games",
        "selection": "Over",
        "line": 37.5,
        "americanOdds": -118,
        "modelPct": 64,
        "impliedPct": 54.1,
        "edgePct": 9.9,
        "evPer100": 18.2,
        "netEvPer100": 16.2,
        "expectedGames": null,
        "edgeGames": null,
        "confidence": 64,
        "grade": "Watch only",
        "reason": "Total games need expected match games vs the posted line."
      },
      {
        "marketType": "Win a set",
        "label": "Win a set %",
        "selection": "Jakub Mensik 70% / Joao Fonseca 85%",
        "rows": [
          {
            "name": "Jakub Mensik",
            "confidence": 70,
            "modelPct": 42.8,
            "label": "Live to win a set"
          },
          {
            "name": "Joao Fonseca",
            "confidence": 85,
            "modelPct": 57.2,
            "label": "Strong set-win path"
          }
        ],
        "confidence": 85,
        "grade": "Price required",
        "reason": "Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early."
      },
      {
        "marketType": "First-set total games",
        "label": "1st set O/U",
        "selection": "Over 9.5",
        "expectedGames": 11,
        "confidence": 73,
        "tiebreakRisk": 33,
        "earlyBreakRisk": 54,
        "grade": "Actionable live watch",
        "reason": "Expected first-set games 11 vs FanDuel 9.5; Over 9.5. hold avg 81%, return games won 20%, first-set sample 9.8g, 53 recent sets."
      }
    ],
    "ensembleValueCase": {
      "source": "Multimodel ensemble",
      "selection": "Jakub Mensik",
      "opponent": "Joao Fonseca",
      "grade": "Watch only",
      "riskGate": "clean enough",
      "marketOdds": 186,
      "fairOdds": 134,
      "modelProbability": 42.8,
      "dataOnlyProbability": 45.4,
      "marketProbability": 35,
      "marketDisagreementPct": 7.8,
      "netEvPer100": 20.4,
      "modelBlend": "logit_l1,random_forest,grad_boost,xgboost",
      "headline": "Jakub Mensik is priced below the model, not guaranteed to win.",
      "useCase": "Straight ML value only at +186 or better; fair price from the ensemble is about +134.",
      "bullets": [
        "Recent hold: Jakub Mensik 76.9% vs Joao Fonseca 84.7%.",
        "Serve events: Jakub Mensik 7.1 aces / 4.8 DFs vs Joao Fonseca 4.9 aces / 1 DFs.",
        "Serve points: Jakub Mensik 1st 74.8%, 2nd 46.9% vs Joao Fonseca 1st 70.1%, 2nd 60.9%.",
        "Winner/error profile: Jakub Mensik 35.7 winners / 41.4 UEs vs Joao Fonseca 35.3 winners / 33 UEs."
      ],
      "risks": [
        "Desk lean still has Joao Fonseca; this is a price-dislocation play, not the safest winner.",
        "Joao Fonseca strength: protects serve well (85% hold).",
        "Jakub Mensik risk: double-fault pressure (4.8 avg)."
      ]
    },
    "marketData": {
      "source": "FanDuel Sportsbook",
      "sourceDetail": "FanDuel Sportsbook event-page Chrome scrape",
      "capturedAt": "2026-06-01T23:54:13.164Z",
      "eventUrl": "https://sportsbook.fanduel.com/tennis/men's-roland-garros-2026/jakub-mensik-v-joao-fonseca-35672751",
      "eventId": "35672751",
      "players": [
        {
          "name": "Jakub Mensik",
          "odds": 172,
          "americanLabel": "+172",
          "impliedPct": 36.8,
          "decimalOdds": 2.72,
          "modelPct": 42.8,
          "edgePct": 6,
          "priceBand": "Underdog",
          "grossProfitPct": 172,
          "grossPayoutMultiple": 2.72,
          "centsAtRisk": 100,
          "centsProfitIfWin": 172
        },
        {
          "name": "Joao Fonseca",
          "odds": -210,
          "americanLabel": "-210",
          "impliedPct": 67.7,
          "decimalOdds": 1.476,
          "modelPct": 57.2,
          "edgePct": -10.5,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 47.6,
          "grossPayoutMultiple": 1.476,
          "centsAtRisk": 100,
          "centsProfitIfWin": 47.6
        }
      ],
      "desk": {
        "name": "Joao Fonseca",
        "odds": -210,
        "americanLabel": "-210",
        "impliedPct": 67.7,
        "decimalOdds": 1.476,
        "modelPct": 57.2,
        "edgePct": -10.5,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 47.6,
        "grossPayoutMultiple": 1.476,
        "centsAtRisk": 100,
        "centsProfitIfWin": 47.6
      },
      "spread": {
        "player": "Joao Fonseca",
        "spread": -4.5,
        "odds": -108
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
      "firstSetTotal": {
        "side": "Over",
        "line": 9.5,
        "odds": -128
      },
      "firstSetTotalOver": {
        "side": "Over",
        "line": 9.5,
        "odds": -128
      },
      "firstSetTotalUnder": {
        "side": "Under",
        "line": 9.5,
        "odds": -110
      },
      "priceAction": "FanDuel price is richer than the model; pass ML unless live state improves.",
      "spreadValue": "Joao Fonseca -4.5 (-108)",
      "totalValue": "37.5 games: Over -118 / Under -112",
      "firstSetTotalValue": "9.5 1st-set games: Over -128 / Under -110",
      "spreadLean": "Spread is number-dependent; verify first service cycle",
      "totalLean": "Over lean if both players hold early",
      "mlValue": "Jakub Mensik +172 / Joao Fonseca -210",
      "marketNote": "FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. FanDuel price is richer than the model; pass ML unless live state improves.",
      "noVigNote": "Model 57.2% vs FanDuel implied 67.7% (-10.5 pts)."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Jakub-Mensik-Vs-Joao-Fonseca/",
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
          "asOf": "2026-06-02"
        },
        "qualityName": "Jakub Mensik",
        "profile": "Live rank #27 | Czechia | age 20 | 2026 clay 7-3, 70% | adj form 77 | hold 77%",
        "modelPct": 42.8,
        "weakness": {
          "name": "Jakub Mensik",
          "serviceHoldPct": 77,
          "firstServeWonPct": 75,
          "secondServeWonPct": 47,
          "firstServePct": 56,
          "avgAces": 7.1,
          "avgDoubleFaults": 4.8,
          "avgWinners": 35.7,
          "avgUnforcedErrors": 41.4,
          "avgBreakPointsFaced": 8.3,
          "returnPointsWonPct": 37,
          "servicePointsWonPct": 62,
          "weakServeMatches": 5,
          "pressureMatches": 7,
          "matchesWithStats": 8,
          "weaknessScore": 27,
          "firstGameComfort": "Fragile opening-service profile",
          "liabilities": [
            "double-fault pressure (4.8 avg)",
            "faces too many break points (8.3 avg)",
            "5 recent matches with serve instability",
            "limited return pressure (37% return points won)"
          ],
          "strengths": [
            "protects serve well (77% hold)",
            "wins enough first-serve points (75%)"
          ],
          "gameFlowRead": "Jakub Mensik can drop points quickly through double-fault pressure (4.8 avg) and faces too many break points (8.3 avg)."
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
          "asOf": "2026-06-02"
        },
        "qualityName": "Joao Fonseca",
        "profile": "Live rank #30 | Brazil | age 19 | 2026 clay 10-6, 63% | adj form 72 | hold 85%",
        "modelPct": 57.2,
        "weakness": {
          "name": "Joao Fonseca",
          "serviceHoldPct": 85,
          "firstServeWonPct": 70,
          "secondServeWonPct": 61,
          "firstServePct": 68,
          "avgAces": 4.9,
          "avgDoubleFaults": 1,
          "avgWinners": 35.3,
          "avgUnforcedErrors": 33,
          "avgBreakPointsFaced": 7.9,
          "returnPointsWonPct": 35,
          "servicePointsWonPct": 67,
          "weakServeMatches": 0,
          "pressureMatches": 7,
          "matchesWithStats": 8,
          "weaknessScore": 8,
          "firstGameComfort": "Comfortable enough if first serve lands",
          "liabilities": [
            "limited return pressure (35% return points won)"
          ],
          "strengths": [
            "protects serve well (85% hold)",
            "wins enough first-serve points (70%)",
            "second serve holds up (61%)"
          ],
          "gameFlowRead": "Joao Fonseca can drop points quickly through limited return pressure (35% return points won)."
        }
      }
    ]
  },
  {
    "id": "rh-atp-challenger-tyler-searle-vs-krueger-2026-06-02",
    "eventId": "b5a112c2-6256-4c39-8407-d795496b12bd",
    "tour": "ATP",
    "bestOf": 3,
    "surface": "Unknown",
    "title": "Henry Searle vs Mitchell Krueger",
    "start": "5:10 PM",
    "startMinutes": 1030,
    "court": "ATP Challenger Tyler",
    "round": "Round Of 32",
    "stage": "ATP Challenger Tyler | Round Of 32",
    "pickName": "Henry Searle",
    "basePickName": "Henry Searle",
    "modelSource": "Robinhood market watch only",
    "modelSplit": false,
    "marketOnly": true,
    "confidence": 60,
    "volatility": 70,
    "tags": [
      "ATP Challenger",
      "Prediction market",
      "Market only",
      "No model edge",
      "Coinflip price"
    ],
    "reason": "Henry Searle is only the current Robinhood market favorite over Mitchell Krueger; no warehouse service, break-point, or opponent-quality edge is joined yet.",
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
        "name": "Henry Searle",
        "weaknessScore": null,
        "liabilities": [
          "No warehouse weakness data joined yet"
        ],
        "strengths": [],
        "firstGameComfort": "Market-only row; wait for serve pressure data",
        "gameFlowRead": "No service/break profile joined yet."
      },
      "opponent": {
        "name": "Mitchell Krueger",
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
        "name": "Henry Searle",
        "confidence": 68,
        "modelPct": 60,
        "label": "Market favorite to win a set"
      },
      {
        "name": "Mitchell Krueger",
        "confidence": 62,
        "modelPct": 43,
        "label": "Underdog set-win path needs early holds"
      }
    ],
    "valueBoard": {
      "note": "EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.",
      "ml": {
        "marketType": "ML",
        "selection": "Henry Searle",
        "americanOdds": null,
        "modelPct": 60,
        "impliedPct": 60,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
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
        "selection": "Price required",
        "line": null,
        "americanOdds": null,
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
        "modelPct": 53,
        "evPer100": null,
        "netEvPer100": null,
        "valueGrade": "Needs posted first-set total",
        "reason": "Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.",
        "betGrade": false
      },
      "setWin": [
        {
          "name": "Henry Searle",
          "confidence": 68,
          "modelPct": 60,
          "label": "Market favorite to win a set",
          "marketType": "Win a set",
          "valueGrade": "Needs posted price",
          "betGrade": false
        },
        {
          "name": "Mitchell Krueger",
          "confidence": 62,
          "modelPct": 43,
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
        "selection": "Henry Searle",
        "line": null,
        "americanOdds": null,
        "modelPct": 60,
        "impliedPct": 60,
        "edgePct": null,
        "evPer100": null,
        "netEvPer100": null,
        "grade": "Near fair",
        "issue": "Favorite price needs better proof",
        "reason": "Prediction-market price captured; no sportsbook EV is inferred from this row."
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
        "selection": "Henry Searle 68% / Mitchell Krueger 62%",
        "rows": [
          {
            "name": "Henry Searle",
            "confidence": 68,
            "modelPct": 60,
            "label": "Market favorite to win a set"
          },
          {
            "name": "Mitchell Krueger",
            "confidence": 62,
            "modelPct": 43,
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
        "selection": "Price required",
        "expectedGames": 9.8,
        "confidence": 53,
        "tiebreakRisk": 42,
        "earlyBreakRisk": 58,
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
      "eventId": "b5a112c2-6256-4c39-8407-d795496b12bd",
      "totalOpenInterest": 3705,
      "totalVolume": 0,
      "players": [
        {
          "name": "Henry Searle",
          "odds": null,
          "americanLabel": "60c",
          "impliedPct": 60,
          "bidPct": 58,
          "lastTradePct": 60,
          "decimalOdds": null,
          "modelPct": 60,
          "edgePct": null,
          "priceBand": "Moderate favorite",
          "grossProfitPct": 40,
          "grossPayoutMultiple": 1.667,
          "centsAtRisk": 60,
          "centsProfitIfWin": 40,
          "openInterest": 1794,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01SEAKRU-SEA"
        },
        {
          "name": "Mitchell Krueger",
          "odds": null,
          "americanLabel": "43c",
          "impliedPct": 43,
          "bidPct": 40,
          "lastTradePct": 43,
          "decimalOdds": null,
          "modelPct": 43,
          "edgePct": null,
          "priceBand": "Underdog",
          "grossProfitPct": 57,
          "grossPayoutMultiple": 2.326,
          "centsAtRisk": 43,
          "centsProfitIfWin": 57,
          "openInterest": 1911,
          "symbol": "KXATPCHALLENGERMATCH-26JUN01SEAKRU-KRU"
        }
      ],
      "desk": {
        "name": "Henry Searle",
        "odds": null,
        "americanLabel": "60c",
        "impliedPct": 60,
        "bidPct": 58,
        "lastTradePct": 60,
        "decimalOdds": null,
        "modelPct": 60,
        "edgePct": null,
        "priceBand": "Moderate favorite",
        "grossProfitPct": 40,
        "grossPayoutMultiple": 1.667,
        "centsAtRisk": 60,
        "centsProfitIfWin": 40,
        "openInterest": 1794,
        "symbol": "KXATPCHALLENGERMATCH-26JUN01SEAKRU-SEA"
      },
      "priceAction": "Prediction-market price captured; no sportsbook EV is inferred from this row.",
      "spreadValue": "No game spread captured",
      "totalValue": "No total captured",
      "firstSetTotalValue": "No first-set total captured",
      "spreadLean": "No spread line",
      "totalLean": "No total line",
      "mlValue": "Henry Searle 60c / Mitchell Krueger 43c",
      "marketNote": "Robinhood prediction-market prices captured: Henry Searle 60c / Mitchell Krueger 43c. This is price context, not a sportsbook value signal.",
      "noVigNote": "Prediction-market price only; no FanDuel moneyline edge calculated."
    },
    "h2hUrl": "https://tennistonic.com/head-to-head-compare/Henry-Searle-Vs-Mitchell-Krueger/",
    "players": [
      {
        "name": "Henry Searle",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 60,
        "weakness": {
          "name": "Henry Searle",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
        }
      },
      {
        "name": "Mitchell Krueger",
        "ranking": null,
        "qualityName": null,
        "profile": "Rank not joined",
        "modelPct": 43,
        "weakness": {
          "name": "Mitchell Krueger",
          "weaknessScore": null,
          "liabilities": [
            "No warehouse weakness data joined yet"
          ],
          "strengths": [],
          "firstGameComfort": "Market-only row; wait for serve pressure data",
          "gameFlowRead": "No service/break profile joined yet."
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
      researchLinks: [{ label: 'ESPN scoreboard', url: 'https://www.espn.com/tennis/scoreboard/_/date/20260602' }, { label: 'Tennistonic H2H', url: raw.h2hUrl }, ...(market?.eventUrl ? [{ label: market.source === 'Robinhood prediction market' ? 'Robinhood market' : 'FanDuel event', url: market.eventUrl }] : [])],
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
export const slateMeta = { title: 'June 2, 2026 Tennis Desk', date: 'June 2, 2026', isoDate: '2026-06-02', timeZone: 'America/Los_Angeles', modelCartridge: tennisModelCartridge, subtitle: 'Roland Garros senior singles plus Robinhood ATP Challenger prediction-market inventory; model edges only apply where warehouse context is joined.', notes: ['No doubles included.', 'FanDuel ML, game handicap, and total-games lines are attached where the sportsbook board exposes a matching singles event.', 'June 2, 2026 uses live rank, clay record, opponent-adjusted recent form, and warehouse service rows where joined.'] }
export const filters = ['All', 'Tennis']
export const oddsMeta = { provider: 'FanDuel Sportsbook + Robinhood prediction markets + Tennis warehouse model', snapshot: 'June 2, 2026 Roland Garros desk', note: 'FanDuel lines are stored for priced matches; very expensive favorites are marked as low-payout or pass-first instead of automatic bets.' }
export const sources = [{ label: 'ESPN tennis scoreboard', url: 'https://www.espn.com/tennis/scoreboard/_/date/20260602' }, { label: 'Live Tennis rankings warehouse', url: 'https://live-tennis.eu/' }, { label: 'FanDuel sportsbook tennis', url: 'https://sportsbook.fanduel.com/tennis' }, { label: 'Robinhood tennis prediction markets', url: 'https://robinhood.com/us/en/prediction-markets/tennis/' }]
export const games = matches.sort((left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title))
