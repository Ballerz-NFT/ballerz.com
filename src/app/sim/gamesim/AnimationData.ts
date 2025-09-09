import type { TeamData } from "./Team";

export const ignoreEvents = [
  "elamDone",
  "elamActive",
  "sub",
  "injury",
  "fgAtRimAndOne",
  "fgLowPostAndOne",
  "fgMidRangeAndOne",
  "tpAndOne",
  "ft",
  "missFt",
  "pfNonShooting",
  "pfBonus",
  "pfFG",
  "pfTP",
  "pfAndOne",
  "foulOut",
];

export const attemptsEvents = [
  "fgaAtRim",
  "fgaLowPost",
  "fgaMidRange",
  "fgaTp",
] as const;

export type AttemptEvent = (typeof attemptsEvents)[number];

export function isAttemptEvent(event: string): event is AttemptEvent {
  return attemptsEvents.includes(event as AttemptEvent);
}

export const textOnlyEvents = [
  ...attemptsEvents,
  "ast",
  "quarter",
  "text",
] as const;

export type TextOnlyEventKeys = (typeof textOnlyEvents)[number];

export function isTextOnlyEvent(event: string): event is TextOnlyEventKeys {
  return textOnlyEvents.includes(event as TextOnlyEventKeys);
}

export type TeamNum = 0 | 1;
export type Report = {
  event: EventKey | TextOnlyEventKeys;
  text: string;
  t: TeamNum;
  time: string;
  animation: AnimationEvent | null;
  secondsElapsedFromStart: number;
  currentScore: [number, number];
  teams: [TeamData, TeamData];
  players?: {
    offensive?: number;
    defensive?: number;
    assist?: number;
  };
} & Record<string, any>;

export interface AnimationData {
  events: AnimationEvent[];
  teams: [TeamData, TeamData];
  overtimes: number;
  numPlayersOnCourt: number;
  elamTarget?: number;
  startTimestamp: number;
  reports: Report[];
}

export type AnimationDataWithID = AnimationData & {
  gid: number;
  id: string;
  day: number | null;
};

export interface AnimationEvent {
  event: EventKey;
  t: number;
  random: number;
  players?: {
    offensive?: number;
    defensive?: number;
    assist?: number;
  };
  offensiveTeam: 0 | 1;
  playersOnCourt: [number[], number[]];
  score: [number, number];
}

export type EventKey =
  | "elamDone"
  | "timeOver"
  | "gameOver"
  | "jumpBall"
  | "elamActive"
  | "quarterStart"
  | "quarterEnd"
  | "overtime"
  | "sub"
  | "injury"
  | "tov"
  | "stl"
  | "fgAtRim"
  | "fgAtRimAndOne"
  | "fgLowPost"
  | "fgLowPostAndOne"
  | "fgMidRange"
  | "fgMidRangeAndOne"
  | "tp"
  | "tpAndOne"
  | "missAtRim"
  | "missLowPost"
  | "missMidRange"
  | "missTp"
  | "blkAtRim"
  | "blkLowPost"
  | "blkMidRange"
  | "blkTp"
  | "ft"
  | "missFt"
  | "pfNonShooting"
  | "pfBonus"
  | "pfFG"
  | "pfTP"
  | "pfAndOne"
  | "foulOut"
  | "oob"
  | "drb"
  | "orb";
