export type PropSummary = {
  hits: number
  total: number
  hitRate: number | null
}

export type DailyPropSummary = {
  overall: PropSummary
  byType: Record<string, PropSummary>
  topHits: string[]
  topMisses: string[]
}

export const mlbPropPerformanceByDate: Record<string, DailyPropSummary> = {
  "2026-05-16": {
    "overall": {
      "hits": 36,
      "total": 115,
      "hitRate": 31.3
    },
    "byType": {
      "rbi": {
        "hits": 11,
        "total": 29,
        "hitRate": 37.9
      },
      "totalBases": {
        "hits": 6,
        "total": 17,
        "hitRate": 35.3
      },
      "singles": {
        "hits": 10,
        "total": 22,
        "hitRate": 45.5
      },
      "hits": {
        "hits": 5,
        "total": 32,
        "hitRate": 15.6
      },
      "walks": {
        "hits": 4,
        "total": 15,
        "hitRate": 26.7
      }
    },
    "topHits": [
      "Daylen Lile Over 0.5 RBI",
      "Spencer Steer Over 0.5 RBI",
      "James Wood Over 1.5 total bases",
      "Jonathan Aranda Over 0.5 RBI"
    ],
    "topMisses": [
      "Jordan Walker Over 0.5 RBI",
      "Jordan Walker Over 1.5 total bases",
      "James Wood Over 0.5 RBI",
      "JJ Bleday Over 0.5 RBI"
    ]
  },
  "2026-05-17": {
    "overall": {
      "hits": 24,
      "total": 68,
      "hitRate": 35.3
    },
    "byType": {
      "rbi": {
        "hits": 6,
        "total": 19,
        "hitRate": 31.6
      },
      "totalBases": {
        "hits": 2,
        "total": 7,
        "hitRate": 28.6
      },
      "singles": {
        "hits": 8,
        "total": 15,
        "hitRate": 53.3
      },
      "hits": {
        "hits": 4,
        "total": 19,
        "hitRate": 21.1
      },
      "walks": {
        "hits": 4,
        "total": 8,
        "hitRate": 50
      }
    },
    "topHits": [
      "Drake Baldwin Over 0.5 RBI",
      "Keibert Ruiz Over 0.5 RBI",
      "Luis García Jr. Over 0.5 singles",
      "Juan Soto Over 0.5 singles"
    ],
    "topMisses": [
      "Juan Soto Over 0.5 RBI",
      "Daylen Lile Over 0.5 RBI",
      "JJ Bleday Over 0.5 RBI",
      "Drake Baldwin Over 1.5 total bases"
    ]
  },
  "2026-05-18": {
    "overall": {
      "hits": 135,
      "total": 308,
      "hitRate": 43.8
    },
    "byType": {
      "totalBases": {
        "hits": 34,
        "total": 71,
        "hitRate": 47.9
      },
      "rbi": {
        "hits": 28,
        "total": 77,
        "hitRate": 36.4
      },
      "walks": {
        "hits": 22,
        "total": 48,
        "hitRate": 45.8
      },
      "singles": {
        "hits": 29,
        "total": 54,
        "hitRate": 53.7
      },
      "hits": {
        "hits": 22,
        "total": 58,
        "hitRate": 37.9
      }
    },
    "topHits": [
      "Ryan Jeffers Over 1.5 total bases",
      "Paul Goldschmidt Over 1.5 total bases",
      "Juan Soto Over 1.5 total bases",
      "Ryan Vilade Over 1.5 total bases"
    ],
    "topMisses": [
      "JJ Bleday Over 1.5 total bases",
      "Dillon Dingler Over 1.5 total bases",
      "Casey Schmitt Over 1.5 total bases",
      "Elly De La Cruz Over 1.5 total bases"
    ]
  },
  "2026-05-19": {
    "overall": {
      "hits": 63,
      "total": 216,
      "hitRate": 29.2
    },
    "byType": {
      "totalBases": {
        "hits": 18,
        "total": 53,
        "hitRate": 34
      },
      "rbi": {
        "hits": 16,
        "total": 62,
        "hitRate": 25.8
      },
      "walks": {
        "hits": 9,
        "total": 27,
        "hitRate": 33.3
      },
      "singles": {
        "hits": 14,
        "total": 40,
        "hitRate": 35
      },
      "hits": {
        "hits": 6,
        "total": 34,
        "hitRate": 17.6
      }
    },
    "topHits": [
      "Byron Buxton Over 1.5 total bases",
      "Elly De La Cruz Over 1.5 total bases",
      "Matt McLain Over 0.5 RBI",
      "Junior Caminero Over 1.5 total bases"
    ],
    "topMisses": [
      "Matt McLain Over 1.5 total bases",
      "Colson Montgomery Over 1.5 total bases",
      "Gavin Sheets Over 1.5 total bases",
      "Byron Buxton Over 0.5 RBI"
    ]
  },
  "2026-05-20": {
    "overall": {
      "hits": 60,
      "total": 206,
      "hitRate": 29.1
    },
    "byType": {
      "totalBases": {
        "hits": 14,
        "total": 44,
        "hitRate": 31.8
      },
      "hits": {
        "hits": 6,
        "total": 34,
        "hitRate": 17.6
      },
      "rbi": {
        "hits": 16,
        "total": 53,
        "hitRate": 30.2
      },
      "singles": {
        "hits": 18,
        "total": 39,
        "hitRate": 46.2
      },
      "walks": {
        "hits": 6,
        "total": 36,
        "hitRate": 16.7
      }
    },
    "topHits": [
      "Justin Foscue Over 1.5 total bases",
      "Casey Schmitt Over 1.5 total bases",
      "Juan Soto Over 1.5 total bases",
      "Luis Arraez Over 0.5 singles"
    ],
    "topMisses": [
      "Byron Buxton Over 1.5 total bases",
      "Luke Raley Over 1.5 total bases",
      "Corbin Carroll Over 1.5 total bases",
      "Luis Arraez Over 1.5 hits"
    ]
  },
  "2026-05-21": {
    "overall": {
      "hits": 39,
      "total": 110,
      "hitRate": 35.5
    },
    "byType": {
      "totalBases": {
        "hits": 8,
        "total": 22,
        "hitRate": 36.4
      },
      "rbi": {
        "hits": 7,
        "total": 28,
        "hitRate": 25
      },
      "singles": {
        "hits": 13,
        "total": 21,
        "hitRate": 61.9
      },
      "walks": {
        "hits": 7,
        "total": 22,
        "hitRate": 31.8
      },
      "hits": {
        "hits": 4,
        "total": 17,
        "hitRate": 23.5
      }
    },
    "topHits": [
      "Keibert Ruiz Over 1.5 total bases",
      "Brandon Lowe Over 1.5 total bases",
      "Corbin Carroll Over 0.5 RBI",
      "Brandon Lowe Over 0.5 RBI"
    ],
    "topMisses": [
      "Juan Soto Over 1.5 total bases",
      "Corbin Carroll Over 1.5 total bases",
      "Juan Soto Over 0.5 RBI",
      "Spencer Horwitz Over 0.5 RBI"
    ]
  },
  "2026-05-22": {
    "overall": {
      "hits": 17,
      "total": 29,
      "hitRate": 58.6
    },
    "byType": {
      "totalBases": {
        "hits": 13,
        "total": 23,
        "hitRate": 56.5
      },
      "singles": {
        "hits": 2,
        "total": 4,
        "hitRate": 50
      },
      "walks": {
        "hits": 2,
        "total": 2,
        "hitRate": 100
      }
    },
    "topHits": [
      "Corbin Carroll Over 1.5 total bases",
      "Juan Soto Over 1.5 total bases",
      "Munetaka Murakami Over 1.5 total bases",
      "Gunnar Henderson Over 1.5 total bases"
    ],
    "topMisses": [
      "Samuel Basallo Over 1.5 total bases",
      "Randy Arozarena Over 1.5 total bases",
      "Kyle Schwarber Over 1.5 total bases",
      "Michael Harris II Over 1.5 total bases"
    ]
  },
  "2026-05-23": {
    "overall": {
      "hits": 12,
      "total": 28,
      "hitRate": 42.9
    },
    "byType": {
      "totalBases": {
        "hits": 8,
        "total": 20,
        "hitRate": 40
      },
      "singles": {
        "hits": 4,
        "total": 6,
        "hitRate": 66.7
      },
      "rbi": {
        "hits": 0,
        "total": 2,
        "hitRate": 0
      }
    },
    "topHits": [
      "Blake Dunn Over 1.5 total bases",
      "Corbin Carroll Over 1.5 total bases",
      "Ketel Marte Over 1.5 total bases",
      "Casey Schmitt Over 1.5 total bases"
    ],
    "topMisses": [
      "Randal Grichuk Over 1.5 total bases",
      "Munetaka Murakami Over 1.5 total bases",
      "Bryan Torres Over 1.5 total bases",
      "Sal Stewart Over 1.5 total bases"
    ]
  },
  "2026-05-24": {
    "overall": {
      "hits": 0,
      "total": 29,
      "hitRate": 0
    },
    "byType": {
      "totalBases": {
        "hits": 0,
        "total": 22,
        "hitRate": 0
      },
      "singles": {
        "hits": 0,
        "total": 6,
        "hitRate": 0
      },
      "walks": {
        "hits": 0,
        "total": 1,
        "hitRate": 0
      }
    },
    "topHits": [],
    "topMisses": [
      "Randal Grichuk Over 1.5 total bases",
      "Bryan Torres Over 1.5 total bases",
      "Corbin Carroll Over 1.5 total bases",
      "Elly De La Cruz Over 1.5 total bases"
    ]
  },
  "2026-05-25": {
    "overall": {
      "hits": 0,
      "total": 28,
      "hitRate": 0
    },
    "byType": {
      "totalBases": {
        "hits": 0,
        "total": 15,
        "hitRate": 0
      },
      "singles": {
        "hits": 0,
        "total": 6,
        "hitRate": 0
      },
      "rbi": {
        "hits": 0,
        "total": 3,
        "hitRate": 0
      },
      "walks": {
        "hits": 0,
        "total": 4,
        "hitRate": 0
      }
    },
    "topHits": [],
    "topMisses": [
      "Junior Caminero Over 1.5 total bases",
      "Yandy Díaz Over 1.5 total bases",
      "Alejandro Osuna Over 0.5 singles",
      "Tommy Troy Over 1.5 total bases"
    ]
  }
}
