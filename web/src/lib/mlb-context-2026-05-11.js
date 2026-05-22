export const teamOffenseContextByTeam = {
  Angels: { hitsPerGame: 7.73, last3HitsPerGame: 7.67, homeHitsPerGame: 6.72, awayHitsPerGame: 8.52 },
  Astros: { hitsPerGame: 8.76, last3HitsPerGame: 6.67, homeHitsPerGame: 7.58, awayHitsPerGame: 9.77 },
  'Blue Jays': { hitsPerGame: 8.48, last3HitsPerGame: 9.33, homeHitsPerGame: 8.33, awayHitsPerGame: 8.63 },
  Dodgers: { hitsPerGame: 8.93, last3HitsPerGame: 4.33, homeHitsPerGame: 7.57, awayHitsPerGame: 10.42 },
  'D-backs': { hitsPerGame: 7.79, last3HitsPerGame: 5.33, homeHitsPerGame: 7.26, awayHitsPerGame: 8.3 },
  Giants: { hitsPerGame: 8.18, last3HitsPerGame: 10.67, homeHitsPerGame: 7.64, awayHitsPerGame: 8.83 },
  Guardians: { hitsPerGame: 7.55, last3HitsPerGame: 7.0, homeHitsPerGame: 7.21, awayHitsPerGame: 7.83 },
  Mariners: { hitsPerGame: 7.54, last3HitsPerGame: 7.67, homeHitsPerGame: 7.78, awayHitsPerGame: 7.22 },
  Orioles: { hitsPerGame: 7.68, last3HitsPerGame: 6.33, homeHitsPerGame: 8.24, awayHitsPerGame: 7.1 },
  Rangers: { hitsPerGame: 7.68, last3HitsPerGame: 6.0, homeHitsPerGame: 6.61, awayHitsPerGame: 8.55 },
  Rays: { hitsPerGame: 8.49, last3HitsPerGame: 8.33, homeHitsPerGame: 8.11, awayHitsPerGame: 8.81 },
  Yankees: { hitsPerGame: 7.83, last3HitsPerGame: 5.33, homeHitsPerGame: 8.1, awayHitsPerGame: 7.57 }
}

export const teamBullpenContextByTeam = {
  Angels: { era: 5.38, whip: 1.51, homeRuns: 22, walks: 74, strikeouts: 155 },
  Astros: { era: 6.05, whip: 1.63, homeRuns: 34, walks: 103, strikeouts: 172 },
  'Blue Jays': { era: 4.26, whip: 1.31, homeRuns: 18, walks: 50, strikeouts: 181 },
  Dodgers: { era: 3.35, whip: 1.16, homeRuns: 8, walks: 41, strikeouts: 131 },
  'D-backs': { era: 4.43, whip: 1.16, homeRuns: 17, walks: 47, strikeouts: 122 },
  Giants: { era: 3.73, whip: 1.42, homeRuns: 11, walks: 68, strikeouts: 114 },
  Guardians: { era: 3.98, whip: 1.28, homeRuns: 19, walks: 52, strikeouts: 155 },
  Mariners: { era: 3.41, whip: 1.35, homeRuns: 11, walks: 42, strikeouts: 129 },
  Orioles: { era: 4.39, whip: 1.34, homeRuns: 20, walks: 63, strikeouts: 161 },
  Rangers: { era: 2.8, whip: 1.2, homeRuns: 12, walks: 51, strikeouts: 114 },
  Rays: { era: 3.93, whip: 1.27, homeRuns: 20, walks: 51, strikeouts: 136 },
  Yankees: { era: 3.25, whip: 1.26, homeRuns: 13, walks: 49, strikeouts: 135 }
}

export const lineupMatchupContextByGame = {
  'angels-guardians': {
    Angels: { averageMatchupGrade: -1.46, trackedBatters: 13, starterThreatCount: 9, contactCount: 1, powerCount: 2, platoonCount: 9 },
    Guardians: { averageMatchupGrade: 6.31, trackedBatters: 13, starterThreatCount: 9, contactCount: 2, powerCount: 1, platoonCount: 7 }
  },
  'yankees-orioles': {
    Yankees: { averageMatchupGrade: 4.62, trackedBatters: 13, starterThreatCount: 9, contactCount: 1, powerCount: 2, platoonCount: 8 },
    Orioles: { averageMatchupGrade: 1.77, trackedBatters: 13, starterThreatCount: 9, contactCount: 0, powerCount: 2, platoonCount: 9 }
  },
  'rays-blue-jays': {
    Rays: { averageMatchupGrade: -2.54, trackedBatters: 13, starterThreatCount: 9, contactCount: 3, powerCount: 1, platoonCount: 7 },
    'Blue Jays': { averageMatchupGrade: -1.08, trackedBatters: 13, starterThreatCount: 8, contactCount: 3, powerCount: 2, platoonCount: 6 }
  },
  'd-backs-rangers': {
    'D-backs': { averageMatchupGrade: -0.23, trackedBatters: 13, starterThreatCount: 9, contactCount: 3, powerCount: 1, platoonCount: 6 },
    Rangers: { averageMatchupGrade: 0.85, trackedBatters: 13, starterThreatCount: 9, contactCount: 0, powerCount: 3, platoonCount: 6 }
  },
  'mariners-astros': {
    Mariners: { averageMatchupGrade: 4.08, trackedBatters: 13, starterThreatCount: 9, contactCount: 2, powerCount: 2, platoonCount: 8 },
    Astros: { averageMatchupGrade: -4.85, trackedBatters: 13, starterThreatCount: 9, contactCount: 2, powerCount: 2, platoonCount: 4 }
  },
  'giants-dodgers': {
    Giants: { averageMatchupGrade: 1.0, trackedBatters: 13, starterThreatCount: 9, contactCount: 2, powerCount: 2, platoonCount: 5 },
    Dodgers: { averageMatchupGrade: -0.54, trackedBatters: 13, starterThreatCount: 9, contactCount: 3, powerCount: 3, platoonCount: 7 }
  }
}
