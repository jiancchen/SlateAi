export type StoryTimelineEvent = {
  atBatIndex: number
  inning: number
  half: string
  battingTeam: string
  batterName: string
  pitcherName: string
  event: string
  eventType: string
  description: string
  awayScore: number
  homeScore: number
  runDelta: number
  outs: number
  baseState: string
  isScoringPlay: boolean
}

export type StoryArchiveGameSummary = {
  gamePk: number
  title: string
  awayTeam: string
  homeTeam: string
  winnerTeam: string | null
  loserTeam: string | null
  leadAfter5Team: string | null
  firstScoringInning: number | null
  leadChanges: number
  maxComebackRuns: number
  totalRunsFirst5: number
  totalRunsFinal: number
  hrOffStarters: number
  hrOffRelievers: number
  tags: string[]
  summary: Record<string, any>
}

export type StoryArchiveGame = StoryArchiveGameSummary & {
  timeline: StoryTimelineEvent[]
}

export type StoryArchiveDaySummary = {
  id: string
  date: string
  headline: string
  metrics: Record<string, number>
  games: StoryArchiveGameSummary[]
}

export type StoryArchiveIndexEntry = {
  id: string
  date: string
  headline: string
  metrics: Record<string, number>
  games: number
}
