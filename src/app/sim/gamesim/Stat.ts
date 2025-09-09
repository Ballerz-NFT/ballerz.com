export const AllGameStatsKey = [
  'ast',
  'ba',
  'benchTime',
  'blk',
  'courtTime',
  'drb',
  'energy',
  'fg',
  'fgAtRim',
  'fgLowPost',
  'fgMidRange',
  'fga',
  'fgaAtRim',
  'fgaLowPost',
  'fgaMidRange',
  'ft',
  'fta',
  'gs',
  'min',
  'orb',
  'pf',
  'pts',
  'stl',
  'tov',
  'tp',
  'tpa',
  'pm',
  'ptsQtrs',
] as const;

export const AllGameStatsKeyWithPercentage = [...AllGameStatsKey, 'fgp', 'ftp', 'tpp'] as const;

export type GameStatKeys = typeof AllGameStatsKey[number];
export type GameStatsKeysWithPercentage = typeof AllGameStatsKeyWithPercentage[number];

export type GameStats = Record<Exclude<GameStatKeys, 'ptsQtrs'>, number> & {
  ptsQtrs: number[];
};

export type GameStatsWithPercentage = GameStats & {
  fgp: number;
  ftp: number;
  tpp: number;
};

export function createEmptyStats(): GameStats {
  return {
    ast: 0,
    ba: 0,
    benchTime: 0,
    blk: 0,
    courtTime: 0,
    drb: 0,
    energy: 1, // ! Initial energy!
    fg: 0,
    fgAtRim: 0,
    fgLowPost: 0,
    fgMidRange: 0,
    fga: 0,
    fgaAtRim: 0,
    fgaLowPost: 0,
    fgaMidRange: 0,
    ft: 0,
    fta: 0,
    gs: 0,
    min: 0,
    orb: 0,
    pf: 0,
    pts: 0,
    stl: 0,
    tov: 0,
    tp: 0,
    tpa: 0,
    pm: 0,
    ptsQtrs: [],
  };
}
