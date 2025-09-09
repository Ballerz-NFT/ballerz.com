export const g = {
  numPlayersOnCourt: 5,
  quarterLength: 12, // in minutes, basketball gm is 12
  numPeriods: 4,
  pace: 75, // Average number of possessions per 48 minutes.

  /**
   *  elam is a way of ending the game where when the clock is lower than elamMinutes
   *  we add elamPoints to the leading score and the first team to reach that score wins.
   */
  elam: false,
  elamMinutes: 4, // Time remaining in the last quarter to turn on elam. Canadian basketball is 4 minutes
  elamPoints: 9, // This will be added to the leading score to set the target score. Canadian basketball is 9 points

  homeCourtAdvantage: 0, // it's a %, benefits the home team. Basketball-gm is 1%.
  foulsNeededToFoulOut: 6, // nba is 6, ncaa is 5, basketball-gm is 6

  /**
   * This is the number of team fouls required for the opponent to get bonus FTs for a non-shooting foul.
   * This must be an array. 1st is for each regulation period, 2nd is for each overtime period, 3rd is for the last 2 minutes of each period.
   * The default is [5,4,2].
   */
  foulsUntilBonus: [5, 4, 2],

  foulRateFactor: 0.7, // The baseline rates for shooting and non-shooting fouls are multiplied by this number. Basketball-gm default is 1
  turnoverFactor: 0.8, // The baseline turnover percentage is multiplied by this number. Basketball-gm default is 1
  stealFactor: 1, // The baseline steal percentage is multiplied by this number.
  threePointTendencyFactor: 0.8, // The baseline rate for number of three pointers is multiplied by this number. Basketball-gm default is 1
  threePointAccuracyFactor: 1.15, // The baseline rate for number of three pointers is multiplied by this number. Basketball-gm default is 1
  twoPointAccuracyFactor: 1.2, // The baseline rate for two point percentage is multiplied by this number. Basketball-gm default is 1
  threePointers: true, // Enable or disable three pointers. Basketball-gm default is true
  blockFactor: 1.1, // The baseline block percentage is multiplied by this number. Basketball-gm default is 1
  orbFactor: 1, // The baseline offensive rebound percentage is multiplied by this number. Basketball-gm default is 1
  synergyFactor: 0.25, // Added by Milton, Used to be hadcoded into the game to 0.25
  baseInjuryRate: 0, // Added by Milton, For some reason this was on the constructor for the GameSim?

  useInjuries: false, // Added by Milton. Injuries force subtitutions and if no subtitution is available they do absolutely nothing.
  allowSubstitutions: false, // Added by Milton. I think we should approach this more as a Figthing Game without subs rather than real basketball.
  allowFouls: false, // Added by Milton. NBA Jam doesn't have fouls... should we?

  orbShotClock: 24, // Added by Milton. NBA has a shorter shot clock during offensive rebounds.
  shotClock: 24, // Added by Milton. NBA has a shorter shot clock during offensive rebounds.
};
