import {
  AnimationData,
  AnimationEvent,
  EventKey,
  Report,
  TeamNum,
  TextOnlyEventKeys,
  textOnlyEvents,
} from "./AnimationData";
import { g as defaultG } from "./config";
import * as MathUtils from "./MathUtils";
import type { Player } from "./Player";
import * as Random from "./Random";
import type { CompositeRatingKeys } from "./Ratings";
import * as SimUtils from "./SimUtils";
import type { GameStatKeys } from "./Stat";
import type { Team } from "./Team";

type ShotType = "atRim" | "ft" | "lowPost" | "midRange" | "threePointer";
type PlayerNumOnCourt = number;

const teamNums: [TeamNum, TeamNum] = [0, 1];
export type OptionsOverride = {
  [key in keyof typeof defaultG]?: (typeof defaultG)[key];
};

class GameSim {
  private team: [Team, Team];

  private playersOnCourt: [number[], number[]];

  private startersRecorded: boolean;

  private subsEveryN: number;

  private overtimes: number;

  private t: number;

  private numPeriods: number;

  private foulsThisQuarter: [number, number];

  private foulsLastTwoMinutes: [number, number];

  private averagePossessionLength: number;

  private synergyFactor: number;

  private o: TeamNum;

  private d: TeamNum;

  private allStarGame: boolean;

  private elam: boolean;

  private elamActive: boolean;

  private elamDone: boolean;

  private elamTarget: number;

  private fatigueFactor: number;

  private numPlayersOnCourt: number;
  private baseInjuryRate: number;
  private shotClock: number;

  private animations: AnimationEvent[] = [];
  private reports: Report[] = [];
  private startTimestamp: number;

  private g: typeof defaultG;
  /**
   * Initialize the two teams that are playing this game.
   *
   * When an instance of this class is created, information about the two teams is passed to GameSim. Then GameSim.run will actually simulate a game and return the results (i.e. stats) of the simulation. Also see core.game where the inputs to this function are generated.
   */

  constructor({
    teams,
    allStarGame = false,
    timeStamp,
    options,
  }: {
    teams: [Team, Team];
    allStarGame?: boolean;
    timeStamp: number;
    options: OptionsOverride;
  }) {
    this.startTimestamp = timeStamp;
    Random.seed(timeStamp); // Games played on the same date have the same result?
    this.g = { ...defaultG, ...options };

    this.team = teams;
    this.baseInjuryRate = this.g.baseInjuryRate;

    // Starting lineups, which will be reset by updatePlayersOnCourt. This must be done because of injured players in the top 5.
    this.numPlayersOnCourt = this.g.numPlayersOnCourt;
    this.playersOnCourt = [
      [...Array(this.numPlayersOnCourt).keys()],
      [...Array(this.numPlayersOnCourt).keys()],
    ];
    this.startersRecorded = false; // Used to track whether the *real* starters have been recorded or not.

    this.updatePlayersOnCourt();
    this.updateSynergy();
    this.subsEveryN = 6; // How many possessions to wait before doing substitutions
    this.t = this.g.quarterLength; // Will be overwritten at the beginning of each quarter
    this.overtimes = 0; // Number of overtime periods that have taken place

    this.numPeriods = this.g.numPeriods;

    // Needed because relationship between averagePossessionLength and number of actual possessions is not perfect
    let paceFactor = this.g.pace / 100;
    paceFactor += 0.025 * MathUtils.bound((paceFactor - 1) / 0.2, -1, 1);

    this.foulsThisQuarter = [0, 0];
    this.foulsLastTwoMinutes = [0, 0];
    const numPossessions =
      ((this.team[0].pace + this.team[1].pace) / 2) * 1.1 * paceFactor;
    this.averagePossessionLength = 48 / (2 * numPossessions); // [min]

    // Parameters

    this.allStarGame = allStarGame;
    this.elam = this.g.elam;
    this.elamActive = false;
    this.elamDone = false;
    this.elamTarget = 0;

    this.fatigueFactor = 0.055;
    this.fatigueFactor /= 1.85;
    this.synergyFactor = this.g.synergyFactor; // How important is synergy?

    // this used to be determined by playoffs
    // this.synergyFactor = 0.1;
    // if (this.g.get("phase") === PHASE.PLAYOFFS) {
    // 	this.fatigueFactor /= 1.85;
    // 	this.synergyFactor *= 2.5;
    // }

    if (!this.allStarGame) {
      this.homeCourtAdvantage();
    }

    this.o = 0;
    this.d = 1;
    this.shotClock = this.g.shotClock;
  }

  /**
   * Home court advantage.
   *
   * Scales composite ratings, giving home players bonuses and away players penalties.
   *
   */
  private homeCourtAdvantage(): void {
    const homeCourtModifier = MathUtils.bound(
      1 + this.g.homeCourtAdvantage / 100,
      0.01,
      Infinity
    );

    for (const t of teamNums) {
      let factor;

      if (t === 0) {
        factor = homeCourtModifier; // Bonus for home team
      } else {
        factor = 1.0 / homeCourtModifier; // Penalty for away team
      }

      for (let p = 0; p < this.team[t].player.length; p++) {
        for (const r of Object.keys(this.team[t].player[p].compositeRating)) {
          if (r !== "endurance") {
            if (r === "turnovers" || r === "fouling") {
              // These are negative ratings, so the bonus or penalty should be inversed
              this.team[t].player[p].compositeRating[r] /= factor;
            } else {
              // Apply bonus or penalty
              this.team[t].player[p].compositeRating[
                r as CompositeRatingKeys
              ] *= factor;
            }
          }
        }
      }
    }
  }

  /**
   * Simulates the game and returns the results.
   *
   * Also see core.game where the outputs of this function are used.
   *
   * @return {Array.<Object>} Game result object, an array of two objects similar to the inputs to GameSim, but with both the team and player "stat" objects filled in and the extraneous data (pace, valueNoPot, compositeRating) removed. In other words...
   *     {
   *         "gid": 0,
   *         "overtimes": 0,
   *         "team": [
   *             {
   *                 "id": 0,
   *                 "stat": {},
   *                 "player": [
   *                     {
   *                         "id": 0,
   *                         "stat": {},
   *                         "skills": [],
   *                         "injured": false
   *                     },
   *                     ...
   *                 ]
   *             },
   *         ...
   *         ]
   *     }
   */

  public run(): AnimationData {
    // Simulate the game up to the end of regulation
    this.simRegulation();

    // Play overtime periods if necessary
    while (this.team[0].stat.pts === this.team[1].stat.pts) {
      this.simOvertime();
    }

    if (this.elamDone) {
      this.recordEvent("elamDone");
    } else {
      this.recordEvent("timeOver");
    }

    this.recordEvent("gameOver");

    return {
      events: this.animations,
      overtimes: this.overtimes,
      numPlayersOnCourt: this.numPlayersOnCourt,
      teams: this.team,
      elamTarget: this.elamTarget,
      startTimestamp: this.startTimestamp,
      reports: this.reports,
    };
  }

  private jumpBall(): TeamNum {
    const jumpers = ([0, 1] as const).map((t) => {
      const ratios = this.ratingArray("jumpBall", t);
      const maxRatio = Math.max(...ratios);
      let ind = ratios.findIndex((ratio) => ratio === maxRatio);
      if (ind === undefined) {
        ind = 0;
      }
      return this.playersOnCourt[t][ind];
    });
    const prob =
      0.5 *
      (this.team[0].player[jumpers[0]].compositeRating.jumpBall /
        this.team[1].player[jumpers[1]].compositeRating.jumpBall) **
        3;

    // Team assignments are the opposite of what you'd expect, cause in simPossession it swaps possession at top
    this.o = Random.random() < prob ? 1 : 0;
    this.d = this.o === 0 ? 1 : 0;
    this.recordEvent("jumpBall", { offensive: jumpers[this.d] }, this.d);
    return this.d;
  }
  private checkElamEnding(): void {
    if (
      this.elam &&
      !this.elamActive &&
      this.team[0].stat.ptsQtrs.length >= this.numPeriods &&
      this.t <= this.g.elamMinutes
    ) {
      const maxPts = Math.max(
        this.team[this.d].stat.pts,
        this.team[this.o].stat.pts
      );
      this.elamTarget = maxPts + this.g.elamPoints;
      this.elamActive = true;
      this.recordEvent("elamActive");
    }
  }

  private simRegulation(): void {
    let quarter = 1;
    let wonJump: TeamNum | undefined = undefined;

    while (!this.elamDone && quarter <= this.numPeriods) {
      this.team[0].stat.ptsQtrs.push(0);
      this.team[1].stat.ptsQtrs.push(0);
      this.foulsThisQuarter = [0, 0];
      this.foulsLastTwoMinutes = [0, 0];
      this.t = this.g.quarterLength;
      this.recordEvent("quarterStart");

      wonJump = wonJump ?? this.jumpBall();

      // Team assignments are the opposite of what you'd expect, cause in simPossession it swaps possession at top
      if (
        SimUtils.jumpBallWinnerStartsThisPeriodWithPossession(
          quarter,
          this.numPeriods
        )
      ) {
        this.o = wonJump === 0 ? 1 : 0;
      } else {
        this.o = wonJump === 0 ? 0 : 1;
      }
      this.d = this.o === 0 ? 1 : 0;

      this.checkElamEnding(); // Before loop, in case it's at 0
      while ((this.t > 0.5 / 60 || this.elamActive) && !this.elamDone) {
        this.simPossession();
        this.checkElamEnding();
      }

      if (!this.elamDone) {
        this.recordEvent("quarterEnd");
      }

      quarter += 1;
    }
  }

  private simOvertime(): void {
    this.t = Math.ceil(0.4 * this.g.quarterLength); // 5 minutes by default, but scales

    if (this.t === 0) {
      this.t = 5;
    }

    this.overtimes += 1;
    this.team[0].stat.ptsQtrs.push(0);
    this.team[1].stat.ptsQtrs.push(0);
    this.foulsThisQuarter = [0, 0];
    this.foulsLastTwoMinutes = [0, 0];
    this.recordEvent("overtime");
    this.jumpBall();

    while (this.t > 0.5 / 60) {
      this.simPossession();
    }
  }

  private getPossessionLength(intentionalFoul: boolean): number {
    const quarter = this.team[this.o].stat.ptsQtrs.length;
    const pointDifferential =
      this.team[this.o].stat.pts - this.team[this.d].stat.pts;

    // Run out the clock if winning
    if (
      quarter >= this.numPeriods &&
      !this.elamActive &&
      this.t <= this.shotClock / 60 &&
      pointDifferential > 0 &&
      !intentionalFoul
    ) {
      return this.t;
    }

    // Booleans that can influence possession length strategy
    const holdForLastShot =
      !this.elamActive &&
      this.t <= 26 / 60 &&
      (quarter < this.numPeriods || pointDifferential >= 0);
    const catchUp =
      !this.elamActive &&
      quarter >= this.numPeriods &&
      ((this.t <= 3 && pointDifferential <= -10) ||
        (this.t <= 2 && pointDifferential <= -5) ||
        (this.t <= 1 && pointDifferential < 0));
    const maintainLead =
      !this.elamActive &&
      quarter >= this.numPeriods &&
      ((this.t <= 3 && pointDifferential > 10) ||
        (this.t <= 2 && pointDifferential > 5) ||
        (this.t <= 1 && pointDifferential > 0));
    const twoForOne =
      !this.elamActive && this.t >= 32 / 60 && this.t <= 52 / 60;
    let lowerBound = 4 / 60;
    let upperBound = this.shotClock / 60;

    if (lowerBound > this.t) {
      lowerBound = this.t;
    }

    if (upperBound > this.t) {
      upperBound = this.t;
    }

    let possessionLength; // [min]

    if (intentionalFoul) {
      possessionLength = (Random.random() * 3) / 60;
      lowerBound = 0;
      upperBound = this.t;
    } else if (holdForLastShot) {
      possessionLength = Random.gauss(this.t, 5 / 60);
    } else if (catchUp) {
      possessionLength = Random.gauss(
        this.averagePossessionLength - 3 / 60,
        5 / 60
      );
      if (this.t < 48 / 60 && this.t > 4 / 60) {
        upperBound = this.t / 2;
      }
    } else if (maintainLead) {
      possessionLength = Random.gauss(
        this.averagePossessionLength + 3 / 60,
        5 / 60
      );
    } else {
      possessionLength = Random.gauss(this.averagePossessionLength, 5 / 60);
    }

    if (twoForOne && !catchUp && !maintainLead) {
      if (Random.random() < 0.6) {
        // There are between 32 and 52 seconds remaining, and we'd like to get the shot up somewhere between 29 and 35 seconds
        lowerBound = this.t - 35 / 60;
        upperBound = this.t - 29 / 60;
      }
    }

    if (upperBound < lowerBound) {
      lowerBound = upperBound;
    }

    if (lowerBound < 0) {
      lowerBound = 0;
    }
    if (upperBound < 1 / 60) {
      upperBound = 1 / 60;
    }

    upperBound = this.elamActive ? Infinity : upperBound;

    const bounded1 = MathUtils.bound(possessionLength, lowerBound, upperBound);

    const finalUpperBound = this.elamActive ? Infinity : this.t;

    return MathUtils.bound(bounded1, 0, finalUpperBound);
  }

  // Call this before running clock for possession
  private shouldIntentionalFoul(): boolean {
    if (!this.g.allowFouls) {
      return false;
    }

    const diff = this.team[this.o].stat.pts - this.team[this.d].stat.pts;
    const offenseWinningByABit = diff > 0 && diff <= 6;
    const intentionalFoul =
      offenseWinningByABit &&
      this.team[0].stat.ptsQtrs.length >= this.numPeriods &&
      this.t < 27 / 60 &&
      !this.elamActive &&
      this.getNumFoulsUntilBonus() <= 10;

    return intentionalFoul;
  }

  private simPossession(): void {
    // Possession change
    this.o = this.o === 1 ? 0 : 1;
    this.d = this.o === 1 ? 0 : 1;
    this.updateTeamCompositeRatings();

    // Clock
    const intentionalFoul = this.shouldIntentionalFoul();
    const possessionLength = this.getPossessionLength(intentionalFoul);
    this.t -= possessionLength;
    const outcome = this.getPossessionOutcome(
      possessionLength,
      intentionalFoul
    );

    // Swap o and d so that o will get another possession when they are swapped again at the beginning of the loop.
    if (outcome === "orb" || outcome === "nonShootingFoul") {
      this.o = this.o === 1 ? 0 : 1;
      this.d = this.o === 1 ? 0 : 1;
    }

    if (outcome === "orb") {
      this.shotClock = this.g.orbShotClock;
    } else {
      this.shotClock = this.g.shotClock;
    }

    this.updatePlayingTime(possessionLength);
    this.injuries();

    let gameOver = false;
    if (this.elam) {
      gameOver = this.elamDone;
    } else {
      gameOver =
        this.t <= 0 &&
        this.team[this.o].stat.ptsQtrs.length >= this.numPeriods &&
        this.team[this.d].stat.pts != this.team[this.o].stat.pts;
    }

    if (!gameOver && Random.randInt(1, this.subsEveryN) === 1) {
      const substitutions = this.updatePlayersOnCourt();

      if (substitutions) {
        this.updateSynergy();
      }
    }
  }

  private isLateGame(): boolean {
    const quarter = this.team[0].stat.ptsQtrs.length;
    let lateGame;
    if (this.elamActive) {
      const ptsToTarget =
        this.elamTarget -
        Math.max(this.team[this.d].stat.pts, this.team[this.o].stat.pts);
      lateGame = ptsToTarget <= 15;
    } else {
      lateGame =
        quarter >= this.numPeriods && this.t < this.g.quarterLength / 2;
    }

    return lateGame;
  }

  /**
   * Convert energy into fatigue, which can be multiplied by a rating to get a fatigue-adjusted value.
   *
   * @param {number} energy A player's energy level, from 0 to 1 (0 = lots of energy, 1 = none).
   * @return {number} Fatigue, from 0 to 1 (0 = lots of fatigue, 1 = none).
   */
  private fatigue(energy: number, skip?: boolean): number {
    energy += 0.016;

    if (energy > 1) {
      energy = 1;
    }
    if (skip) {
      return energy;
    }

    // Late in games, or in OT, fatigue matters less
    if (this.isLateGame()) {
      const factor = 6 - this.t;
      return (energy + factor) / (1 + factor);
    }

    return energy;
  }

  private getFoulTroubleLimit(): number {
    const foulsNeededToFoulOut = this.g.foulsNeededToFoulOut;

    // No foul trouble in overtime or late in 4th quarter
    const quarter = this.team[0].stat.ptsQtrs.length;
    if (
      this.overtimes > 0 ||
      this.elamActive ||
      (quarter === this.numPeriods && this.t < 8)
    ) {
      return foulsNeededToFoulOut;
    }

    const quarterLength = this.g.quarterLength;

    const gameCompletionFraction =
      (quarter - this.t / quarterLength) / this.numPeriods;

    // For default settings, the limit by quarter is 2/3/5/5. (Last quarter is 5 because of that Math.min)
    let foulLimit = Math.ceil(gameCompletionFraction * foulsNeededToFoulOut);
    if (foulLimit < 2) {
      // Don't worry about 1 foul
      foulLimit = 2;
    } else if (foulLimit >= foulsNeededToFoulOut) {
      // Worry about actually fouling out, otherwise this does nothing
      foulLimit = foulsNeededToFoulOut - 1;
    }

    return foulLimit;
  }

  // 1 -> no foul trouble
  // less than 1 -> decreases
  private getFoulTroubleFactor(p: Player, foulLimit: number): number {
    if (p.stat.pf === foulLimit) {
      // More likely to sub off at limit
      return 0.75;
    } else if (p.stat.pf > foulLimit) {
      // Very likely to sub off beyond limit
      return 0.1;
    }

    return 1;
  }

  /**
   * Perform appropriate substitutions.
   *
   * Can this be sped up?
   *
   * @return {boolean} true if a substitution occurred, false otherwise.
   */
  private updatePlayersOnCourt(shooter?: PlayerNumOnCourt): boolean {
    if (!this.g.allowSubstitutions && !this.startersRecorded) {
      // Allow pre-game substitutions since they aren't really substitutions
      return false;
    }

    let substitutions = false;
    let blowout = false;
    const lateGame = this.isLateGame();

    const foulsNeededToFoulOut = this.g.foulsNeededToFoulOut;

    if (this.o !== undefined && this.d !== undefined) {
      const diff = Math.abs(
        this.team[this.d].stat.pts - this.team[this.o].stat.pts
      );
      const quarter = this.team[this.o].stat.ptsQtrs.length;
      if (this.elamActive) {
        const ptsToTarget =
          this.elamTarget -
          Math.max(this.team[this.d].stat.pts, this.team[this.o].stat.pts);
        blowout = diff >= 20 && ptsToTarget < diff;
      } else {
        blowout =
          quarter === this.numPeriods &&
          ((diff >= 30 && this.t < 12) ||
            (diff >= 25 && this.t < 9) ||
            (diff >= 20 && this.t < 7) ||
            (diff >= 15 && this.t < 3) ||
            (diff >= 10 && this.t < 1));
      }
    }

    const foulLimit = this.getFoulTroubleLimit();

    for (const t of teamNums) {
      const getOvrs = (includeFouledOut: boolean): number[] => {
        // Overall values scaled by fatigue, etc
        const ovrs: number[] = [];

        for (let p = 0; p < this.team[t].player.length; p++) {
          // Injured or fouled out players can't play
          if (
            this.team[t].player[p].injured ||
            (!includeFouledOut &&
              foulsNeededToFoulOut > 0 &&
              this.team[t].player[p].stat.pf >= foulsNeededToFoulOut)
          ) {
            ovrs[p] = -Infinity;
          } else {
            ovrs[p] =
              this.team[t].player[p].ovr *
              this.fatigue(this.team[t].player[p].stat.energy) *
              (!lateGame ? Random.uniform(0.9, 1.1) : 1);

            // playing time is not a thing as ballerz don't ever learn new tricks.
            // if (!this.allStarGame) {
            // 	ovrs[p] *= this.team[t].player[p].ptModifier;
            // }

            // Also scale based on margin late in games, so stars play less in blowouts (this doesn't really work that well, but better than nothing)
            if (blowout) {
              ovrs[p] *= (p + 1) / 10;
            } else {
              // If it's not a blowout, worry about foul trouble
              const foulTroubleFactor = this.getFoulTroubleFactor(
                this.team[t].player[p],
                foulLimit
              );
              ovrs[p] *= foulTroubleFactor;
            }
          }
        }

        return ovrs;
      };

      const numEligiblePlayers = (ovrs: number[]): number => {
        let count = 0;
        for (const ovr of ovrs) {
          if (ovr > -Infinity) {
            count += 1;
          }
        }

        return count;
      };

      let ovrs = getOvrs(false);

      // What if too many players fouled out? Play them. Ideally would force non fouled out players to play first, but whatever. Without this, it would only play bottom of the roster guys (tied at -Infinity)
      if (numEligiblePlayers(ovrs) < this.numPlayersOnCourt) {
        ovrs = getOvrs(true);
      }

      const ovrsOnCourt = this.playersOnCourt[t].map((p) => ovrs[p]);

      // Sub off the lowest ovr guy first
      for (const pp of SimUtils.getSortedIndexes(ovrsOnCourt)) {
        const p = this.playersOnCourt[t][pp];
        const onCourtIsIneligible = ovrs[p] === -Infinity;
        this.playersOnCourt[t][pp] = p; // Don't sub out guy shooting FTs!

        if (t === this.o && pp === shooter) {
          continue;
        }

        // Loop through bench players (in order of current roster position) to see if any should be subbed in)
        for (let b = 0; b < this.team[t].player.length; b++) {
          if (this.playersOnCourt[t].includes(b)) {
            continue;
          }

          const benchIsValidAndBetter =
            this.team[t].player[p].stat.courtTime > 2 &&
            this.team[t].player[b].stat.benchTime > 2 &&
            ovrs[b] > ovrs[p];
          const benchIsEligible = ovrs[b] !== -Infinity;

          if (
            benchIsValidAndBetter ||
            (onCourtIsIneligible && benchIsEligible)
          ) {
            // Check if position of substitute makes for a valid lineup
            const pos: string[] = [];

            for (let j = 0; j < this.playersOnCourt[t].length; j++) {
              if (j !== pp) {
                pos.push(this.team[t].player[this.playersOnCourt[t][j]].pos);
              }
            }

            pos.push(this.team[t].player[b].pos);

            // Requre 2 Gs (or 1 PG) and 2 Fs (or 1 C)
            let numG = 0;
            let numPG = 0;
            let numF = 0;
            let numC = 0;

            for (let j = 0; j < pos.length; j++) {
              if (pos[j].includes("G")) {
                numG += 1;
              }

              if (pos[j] === "PG") {
                numPG += 1;
              }

              if (pos[j].includes("F")) {
                numF += 1;
              }

              if (pos[j] === "C") {
                numC += 1;
              }
            }

            const cutoff =
              this.numPlayersOnCourt >= 5
                ? 2
                : this.numPlayersOnCourt >= 3
                ? 1
                : 0;
            if (
              (numG < cutoff && numPG === 0) ||
              (numF < cutoff && numC === 0)
            ) {
              if (
                this.fatigue(this.team[t].player[p].stat.energy) > 0.728 &&
                !onCourtIsIneligible
              ) {
                // Exception for ridiculously tired players, so really unbalanced teams won't play starters whole game
                continue;
              }
            }

            substitutions = true;

            // Substitute player
            this.playersOnCourt[t][pp] = b;
            this.team[t].player[b].stat.courtTime = Random.uniform(-2, 2);
            this.team[t].player[b].stat.benchTime = Random.uniform(-2, 2);
            this.team[t].player[p].stat.courtTime = Random.uniform(-2, 2);
            this.team[t].player[p].stat.benchTime = Random.uniform(-2, 2);

            this.recordEvent("sub", { offensive: b, assist: p }, t);

            break;
          }
        }
      }
    }

    // Record starters if that hasn't been done yet. This should run the first time this function is called, and never again.
    if (!this.startersRecorded) {
      for (const t of teamNums) {
        for (let p = 0; p < this.team[t].player.length; p++) {
          if (this.playersOnCourt[t].includes(p)) {
            this.recordStat(t, p, "gs");
          }
        }
      }

      this.startersRecorded = true;
    }

    return substitutions;
  }

  /**
   * Update synergy.
   *
   * This should be called after this.updatePlayersOnCourt as it only produces different output when the players on the court change.
   */
  private updateSynergy(): void {
    for (const t of teamNums) {
      // Count all the *fractional* skills of the active players on a team (including duplicates)
      const skillsCount = {
        "3": 0,
        A: 0,
        B: 0,
        Di: 0,
        Dp: 0,
        Po: 0,
        Ps: 0,
        R: 0,
      };

      for (let i = 0; i < this.numPlayersOnCourt; i++) {
        const p = this.playersOnCourt[t][i];

        // 1 / (1 + e^-(15 * (x - 0.61))) from 0 to 1
        // 0.61 is not always used - keep in sync with skills.js!

        skillsCount["3"] += MathUtils.sigmoid(
          this.team[t].player[p].compositeRating.shootingThreePointer,
          15,
          0.59
        );
        skillsCount.A += MathUtils.sigmoid(
          this.team[t].player[p].compositeRating.athleticism,
          15,
          0.63
        );
        skillsCount.B += MathUtils.sigmoid(
          this.team[t].player[p].compositeRating.dribbling,
          15,
          0.68
        );
        skillsCount.Di += MathUtils.sigmoid(
          this.team[t].player[p].compositeRating.defenseInterior,
          15,
          0.57
        );
        skillsCount.Dp += MathUtils.sigmoid(
          this.team[t].player[p].compositeRating.defensePerimeter,
          15,
          0.61
        );
        skillsCount.Po += MathUtils.sigmoid(
          this.team[t].player[p].compositeRating.shootingLowPost,
          15,
          0.61
        );
        skillsCount.Ps += MathUtils.sigmoid(
          this.team[t].player[p].compositeRating.passing,
          15,
          0.63
        );
        skillsCount.R += MathUtils.sigmoid(
          this.team[t].player[p].compositeRating.rebounding,
          15,
          0.61
        );
      }

      // Base offensive synergy
      this.team[t].synergy.off = 0;
      this.team[t].synergy.off += 5 * MathUtils.sigmoid(skillsCount["3"], 3, 2); // 5 / (1 + e^-(3 * (x - 2))) from 0 to 5

      this.team[t].synergy.off +=
        3 * MathUtils.sigmoid(skillsCount.B, 15, 0.75) +
        MathUtils.sigmoid(skillsCount.B, 5, 1.75); // 3 / (1 + e^-(15 * (x - 0.75))) + 1 / (1 + e^-(5 * (x - 1.75))) from 0 to 5

      this.team[t].synergy.off +=
        3 * MathUtils.sigmoid(skillsCount.Ps, 15, 0.75) +
        MathUtils.sigmoid(skillsCount.Ps, 5, 1.75) +
        MathUtils.sigmoid(skillsCount.Ps, 5, 2.75); // 3 / (1 + e^-(15 * (x - 0.75))) + 1 / (1 + e^-(5 * (x - 1.75))) + 1 / (1 + e^-(5 * (x - 2.75))) from 0 to 5

      this.team[t].synergy.off += MathUtils.sigmoid(skillsCount.Po, 15, 0.75); // 1 / (1 + e^-(15 * (x - 0.75))) from 0 to 5

      this.team[t].synergy.off +=
        MathUtils.sigmoid(skillsCount.A, 15, 1.75) +
        MathUtils.sigmoid(skillsCount.A, 5, 2.75); // 1 / (1 + e^-(15 * (x - 1.75))) + 1 / (1 + e^-(5 * (x - 2.75))) from 0 to 5

      this.team[t].synergy.off /= 17; // Punish teams for not having multiple perimeter skills

      const perimFactor =
        MathUtils.bound(
          Math.sqrt(1 + skillsCount.B + skillsCount.Ps + skillsCount["3"]) - 1,
          0,
          2
        ) / 2; // Between 0 and 1, representing the perimeter skills

      this.team[t].synergy.off *= 0.5 + 0.5 * perimFactor; // Defensive synergy

      this.team[t].synergy.def = 0;
      this.team[t].synergy.def += MathUtils.sigmoid(skillsCount.Dp, 15, 0.75); // 1 / (1 + e^-(15 * (x - 0.75))) from 0 to 5

      this.team[t].synergy.def +=
        2 * MathUtils.sigmoid(skillsCount.Di, 15, 0.75); // 2 / (1 + e^-(15 * (x - 0.75))) from 0 to 5

      this.team[t].synergy.def +=
        MathUtils.sigmoid(skillsCount.A, 5, 2) +
        MathUtils.sigmoid(skillsCount.A, 5, 3.25); // 1 / (1 + e^-(5 * (x - 2))) + 1 / (1 + e^-(5 * (x - 3.25))) from 0 to 5

      this.team[t].synergy.def /= 6; // Rebounding synergy

      this.team[t].synergy.reb = 0;
      this.team[t].synergy.reb +=
        MathUtils.sigmoid(skillsCount.R, 15, 0.75) +
        MathUtils.sigmoid(skillsCount.R, 5, 1.75); // 1 / (1 + e^-(15 * (x - 0.75))) + 1 / (1 + e^-(5 * (x - 1.75))) from 0 to 5

      this.team[t].synergy.reb /= 4;
    }
  }

  /**
   * Update team composite ratings.
   *
   * This should be called once every possession, after this.updatePlayersOnCourt and this.updateSynergy as they influence output, to update the team composite ratings based on the players currently on the court.
   */
  private updateTeamCompositeRatings(): void {
    // Only update ones that are actually used
    const toUpdate: CompositeRatingKeys[] = [
      "dribbling",
      "passing",
      "rebounding",
      "defense",
      "defensePerimeter",
      "blocking",
    ];

    const foulLimit = this.getFoulTroubleLimit();

    // Scale composite ratings
    for (let k = 0; k < teamNums.length; k++) {
      const t = teamNums[k];
      const oppT = teamNums[1 - k];
      const diff = this.team[t].stat.pts - this.team[oppT].stat.pts;

      const perfFactor = 1 - 0.2 * Math.tanh(diff / 60);

      for (let j = 0; j < toUpdate.length; j++) {
        const rating = toUpdate[j];
        this.team[t].compositeRating[rating] = 0;

        for (let i = 0; i < this.numPlayersOnCourt; i++) {
          const p = this.playersOnCourt[t][i];

          let foulLimitFactor = 1;
          if (
            rating === "defense" ||
            rating === "defensePerimeter" ||
            rating === "blocking"
          ) {
            const pf = this.team[t].player[p].stat.pf;
            if (pf === foulLimit) {
              foulLimitFactor *= 0.9;
            } else if (pf > foulLimit) {
              foulLimitFactor *= 0.75;
            }
          }

          this.team[t].compositeRating[rating] +=
            this.team[t].player[p].compositeRating[rating] *
            this.fatigue(this.team[t].player[p].stat.energy) *
            perfFactor *
            foulLimitFactor;
        }

        this.team[t].compositeRating[rating] /= this.numPlayersOnCourt;
      }

      this.team[t].compositeRating.dribbling +=
        this.synergyFactor * this.team[t].synergy.off;
      this.team[t].compositeRating.passing +=
        this.synergyFactor * this.team[t].synergy.off;
      this.team[t].compositeRating.rebounding +=
        this.synergyFactor * this.team[t].synergy.reb;
      this.team[t].compositeRating.defense +=
        this.synergyFactor * this.team[t].synergy.def;
      this.team[t].compositeRating.defensePerimeter +=
        this.synergyFactor * this.team[t].synergy.def;
      this.team[t].compositeRating.blocking +=
        this.synergyFactor * this.team[t].synergy.def;
    }
  }

  /**
   * Update playing time stats.
   *
   * This should be called once every possession, at the end, to record playing time and bench time for players.
   */
  private updatePlayingTime(possessionLength: number): void {
    for (const t of teamNums) {
      // Update minutes (overall, court, and bench)
      for (let p = 0; p < this.team[t].player.length; p++) {
        if (this.playersOnCourt[t].includes(p)) {
          this.recordStat(t, p, "min", possessionLength);
          this.recordStat(t, p, "courtTime", possessionLength);

          // This used to be 0.04. Increase more to lower PT
          this.recordStat(
            t,
            p,
            "energy",
            -possessionLength *
              this.fatigueFactor *
              (1 - this.team[t].player[p].compositeRating.endurance)
          );

          if (this.team[t].player[p].stat.energy < 0) {
            this.team[t].player[p].stat.energy = 0;
          }
        } else {
          this.recordStat(t, p, "benchTime", possessionLength);
          this.recordStat(t, p, "energy", possessionLength * 0.094);

          if (this.team[t].player[p].stat.energy > 1) {
            this.team[t].player[p].stat.energy = 1;
          }
        }
      }
    }
  }

  /**
   * See if any injuries occurred this possession, and handle the consequences.
   *
   * This doesn't actually compute the type of injury, it just determines if a player is injured bad enough to miss the rest of the game.
   */
  private injuries(): void {
    if (!this.g.useInjuries) {
      return;
    }

    let newInjury = false;
    let baseRate = this.baseInjuryRate;

    // Modulate by pace - since injuries are evaluated per possession, but really probably happen per minute played
    baseRate *= 100 / this.g.pace;

    for (const t of teamNums) {
      for (let p = 0; p < this.team[t].player.length; p++) {
        // Only players on the court can be injured
        if (this.playersOnCourt[t].includes(p)) {
          const injuryRate = SimUtils.getInjuryRate(
            baseRate,
            this.team[t].player[p].age,
            this.team[t].player[p].previouslyInjured
          );

          if (Random.random() < injuryRate) {
            this.team[t].player[p].injured = true;
            newInjury = true;
            this.recordEvent("injury", { offensive: p }, t);
          }
        }
      }
    }

    // Sub out injured player
    if (newInjury) {
      this.updatePlayersOnCourt();
    }
  }

  private getNumFoulsUntilBonus(): number {
    const foulsUntilBonus = this.g.foulsUntilBonus;
    if (this.t <= 2) {
      return foulsUntilBonus[2] - this.foulsLastTwoMinutes[this.d];
    }
    if (this.overtimes >= 1) {
      return foulsUntilBonus[1] - this.foulsThisQuarter[this.d];
    }
    return foulsUntilBonus[0] - this.foulsThisQuarter[this.d];
  }

  /**
   * Simulate a single possession.
   *
   * @return {string} Outcome of the possession, such as "tov", "drb", "orb", "fg", etc.
   */
  private getPossessionOutcome(
    possessionLength: number,
    intentionalFoul: boolean
  ): string {
    // If winning at end of game, just run out the clock
    if (
      this.t <= 0 &&
      this.team[this.o].stat.ptsQtrs.length >= this.numPeriods &&
      this.team[this.o].stat.pts > this.team[this.d].stat.pts &&
      !this.elamActive
    ) {
      return "endOfQuarter";
    }

    // With not much time on the clock at the end of a quarter, possession might end with the clock running out
    if (this.t <= 0 && possessionLength < 6 / 60 && !this.elamActive) {
      if (Random.random() > (possessionLength / (8 / 60)) ** (1 / 4)) {
        return "endOfQuarter";
      }
    }

    // Turnover?
    if (Random.random() < this.probTov()) {
      return this.doTov(); // tov
    }

    const ratios = this.ratingArray("usage", this.o, 1.25);
    const shooter = SimUtils.pickPlayer(ratios);

    // Non-shooting foul?
    if (
      this.g.allowFouls &&
      (Random.random() < 0.08 * this.g.foulRateFactor || intentionalFoul)
    ) {
      // In the bonus? Checks offset by 1, because the foul counter won't increment until doPf is called below
      const numFoulsUntilBonus = this.getNumFoulsUntilBonus();
      const inBonus = numFoulsUntilBonus <= 1;

      if (inBonus) {
        this.doPf(this.d, "pfBonus", shooter);
      } else {
        this.doPf(this.d, "pfNonShooting");
      }

      if (inBonus) {
        return this.doFt(shooter, 2); // fg, orb, or drb
      }

      return "nonShootingFoul";
    }

    // Shot!
    return this.doShot(shooter, possessionLength); // fg, orb, or drb
  }

  /**
   * Probability of the current possession ending in a turnover.
   *
   * @return {number} Probability from 0 to 1.
   */
  private probTov(): number {
    return MathUtils.boundProb(
      (this.g.turnoverFactor *
        (0.14 * this.team[this.d].compositeRating.defense)) /
        (0.5 *
          (this.team[this.o].compositeRating.dribbling +
            this.team[this.o].compositeRating.passing))
    );
  }

  /**
   * Turnover.
   *
   * @return {string} Either "tov" or "stl" depending on whether the turnover was caused by a steal or not.
   */
  private doTov(): string {
    const ratios = this.ratingArray("turnovers", this.o, 2);
    const p = this.playersOnCourt[this.o][SimUtils.pickPlayer(ratios)];
    this.recordStat(this.o, p, "tov");

    if (this.probStl() > Random.random()) {
      return this.doStl(p); // "stl"
    }

    this.recordEvent("tov", { offensive: p });
    return "tov";
  }

  /**
   * Probability that a turnover occurring in this possession is a steal.
   *
   * @return {number} Probability from 0 to 1.
   */
  private probStl(): number {
    return MathUtils.boundProb(
      this.g.stealFactor *
        ((0.45 * this.team[this.d].compositeRating.defensePerimeter) /
          (0.5 *
            (this.team[this.o].compositeRating.dribbling +
              this.team[this.o].compositeRating.passing)))
    );
  }

  /**
   * Steal.
   *
   * @return {string} Currently always returns "stl".
   */
  private doStl(pStoleFrom: number): string {
    const ratios = this.ratingArray("stealing", this.d, 4);
    const p = this.playersOnCourt[this.d][SimUtils.pickPlayer(ratios)];
    this.recordStat(this.d, p, "stl");
    this.recordEvent("stl", { offensive: pStoleFrom, defensive: p });
    return "stl";
  }

  /**
   * Shot.
   *
   * @param {number} shooter Integer from 0 to 4 representing the index of this.playersOnCourt[this.o] for the shooting player.
   * @return {string} Either "fg" or output of this.doReb, depending on make or miss and free throws.
   */
  private doShot(shooter: PlayerNumOnCourt, possessionLength: number): string {
    const p = this.playersOnCourt[this.o][shooter];
    const currentFatigue = this.fatigue(
      this.team[this.o].player[p].stat.energy
    );

    // Is this an "assisted" attempt (i.e. an assist will be recorded if it's made)
    let passer: PlayerNumOnCourt | undefined = undefined;
    if (this.probAst() > Random.random() && this.numPlayersOnCourt > 1) {
      const ratios = this.ratingArray("passing", this.o, 10);
      passer = SimUtils.pickPlayer(ratios, shooter);
    }

    let shootingThreePointerScaled =
      this.team[this.o].player[p].compositeRating.shootingThreePointer;

    // Too many players shooting 3s at the high end - scale 0.55-1.0 to 0.55-0.85
    if (shootingThreePointerScaled > 0.55) {
      shootingThreePointerScaled =
        0.55 + (shootingThreePointerScaled - 0.55) * (0.3 / 0.45);
    }

    // Too many players shooting 3s at the low end - scale 0.35-0.45 to 0.1-0.45, and 0-0.35 to 0-0.1
    let shootingThreePointerScaled2 = shootingThreePointerScaled;
    if (shootingThreePointerScaled2 < 0.35) {
      shootingThreePointerScaled2 =
        0 + shootingThreePointerScaled2 * (0.1 / 0.35);
    } else if (shootingThreePointerScaled2 < 0.45) {
      shootingThreePointerScaled2 =
        0.1 + (shootingThreePointerScaled2 - 0.35) * (0.35 / 0.1);
    }

    // In some situations (4th quarter late game situations depending on score, and last second heaves in other quarters) players shoot more 3s
    const diff = this.team[this.d].stat.pts - this.team[this.o].stat.pts;
    const quarter = this.team[this.o].stat.ptsQtrs.length;
    const forceThreePointer =
      (!this.elamActive &&
        diff >= 3 &&
        diff <= 10 &&
        this.t <= 10 / 60 &&
        quarter >= this.numPeriods &&
        Random.random() > this.t) ||
      (quarter < this.numPeriods &&
        this.t === 0 &&
        possessionLength <= 2.5 / 60);

    // Pick the type of shot and store the success rate (with no defense) in probMake and the probability of an and one in probAndOne
    let probAndOne;
    let probMake;
    let probMissAndFoul;
    let type: ShotType;

    if (
      forceThreePointer ||
      Random.random() <
        0.67 * shootingThreePointerScaled2 * this.g.threePointTendencyFactor
    ) {
      // Three pointer
      type = "threePointer";
      probMissAndFoul = 0.02;
      probMake = shootingThreePointerScaled * 0.3 + 0.36;
      probAndOne = 0.01;

      // Better shooting in the ASG, why not?
      if (this.allStarGame) {
        probMake += 0.02;
      }
      probMake *= this.g.threePointAccuracyFactor;

      this.recordEvent(
        "fgaTp",
        {
          offensive: p,
        },
        this.o
      );
    } else {
      const r1 =
        0.8 *
        Random.random() *
        this.team[this.o].player[p].compositeRating.shootingMidRange;
      const r2 =
        Random.random() *
        (this.team[this.o].player[p].compositeRating.shootingAtRim +
          this.synergyFactor *
            (this.team[this.o].synergy.off - this.team[this.d].synergy.def)); // Synergy makes easy shots either more likely or less likely

      const r3 =
        Random.random() *
        (this.team[this.o].player[p].compositeRating.shootingLowPost +
          this.synergyFactor *
            (this.team[this.o].synergy.off - this.team[this.d].synergy.def)); // Synergy makes easy shots either more likely or less likely

      if (r1 > r2 && r1 > r3) {
        // Two point jumper
        type = "midRange";
        probMissAndFoul = 0.07;
        probMake =
          this.team[this.o].player[p].compositeRating.shootingMidRange * 0.32 +
          0.42;
        probAndOne = 0.05;

        this.recordEvent("fgaMidRange", { offensive: p }, this.o);
      } else if (r2 > r3) {
        // Dunk, fast break or half court
        type = "atRim";
        probMissAndFoul = 0.37;
        probMake =
          this.team[this.o].player[p].compositeRating.shootingAtRim * 0.41 +
          0.54;
        probAndOne = 0.25;

        this.recordEvent("fgaAtRim", { offensive: p }, this.o);
      } else {
        // Post up
        type = "lowPost";
        probMissAndFoul = 0.33;
        probMake =
          this.team[this.o].player[p].compositeRating.shootingLowPost * 0.32 +
          0.34;
        probAndOne = 0.15;

        this.recordEvent("fgaLowPost", { offensive: p }, this.o);
      }

      // Better shooting in the ASG, why not?
      if (this.allStarGame) {
        probMake += 0.1;
      }

      probMake *= this.g.twoPointAccuracyFactor;
    }

    let foulFactor =
      0.65 *
      (this.team[this.o].player[p].compositeRating.drawingFouls / 0.5) ** 2 *
      this.g.foulRateFactor;

    if (this.allStarGame) {
      foulFactor *= 0.4;
    }

    if (!this.g.allowFouls) {
      foulFactor = 0;
    }

    probMissAndFoul *= foulFactor;
    probAndOne *= foulFactor;

    probMake =
      (probMake -
        0.25 * this.team[this.d].compositeRating.defense +
        this.synergyFactor *
          (this.team[this.o].synergy.off - this.team[this.d].synergy.def)) *
      currentFatigue;

    // Adjust probMake for end of quarter situations, where shot quality will be lower without much time

    if (this.t === 0 && possessionLength < 6 / 60) {
      probMake *= Math.sqrt(possessionLength / (8 / 60));
    }

    // Assisted shots are easier
    if (passer !== undefined) {
      probMake += 0.025;
    }

    const ratios = this.ratingArray("blocking", this.d, 10);
    const blocker = this.playersOnCourt[this.d][SimUtils.pickPlayer(ratios)];
    if (this.probBlk() > Random.random()) {
      return this.doBlk(shooter, blocker, passer, type); // orb or drb
    }

    // Make
    if (probMake > Random.random()) {
      let retval;
      let andOne = false;
      if (probAndOne > Random.random()) {
        retval = this.doFg(shooter, passer, type, true); // fg, orb, or drb
        andOne = true;
      } else {
        retval = this.doFg(shooter, passer, type); // fg
      }

      // And 1
      if (type === "atRim") {
        this.recordEvent(andOne ? "fgAtRimAndOne" : "fgAtRim", {
          offensive: p,
          assist: passer,
          defensive: blocker,
        });
      } else if (type === "lowPost") {
        this.recordEvent(andOne ? "fgLowPostAndOne" : "fgLowPost", {
          offensive: p,
          assist: passer,
          defensive: blocker,
        });
      } else if (type === "midRange") {
        this.recordEvent(andOne ? "fgMidRangeAndOne" : "fgMidRange", {
          offensive: p,
          assist: passer,
          defensive: blocker,
        });
      } else if (type === "threePointer") {
        this.recordEvent(andOne ? "tpAndOne" : "tp", {
          offensive: p,
          assist: passer,
          defensive: blocker,
        });
      }

      return retval;
    }

    // Miss, but fouled
    if (probMissAndFoul > Random.random()) {
      const threePointer = type === "threePointer" && this.g.threePointers;

      this.doPf(this.d, threePointer ? "pfTP" : "pfFG", shooter);

      if (threePointer) {
        return this.doFt(shooter, 3); // fg, orb, or drb
      }

      return this.doFt(shooter, 2); // fg, orb, or drb
    }

    // Miss
    this.recordStat(this.o, p, "fga");

    if (type === "atRim") {
      this.recordStat(this.o, p, "fgaAtRim");
      this.recordEvent("missAtRim", {
        offensive: p,
        assist: passer,
        defensive: blocker,
      });
    } else if (type === "lowPost") {
      this.recordStat(this.o, p, "fgaLowPost");
      this.recordEvent("missLowPost", {
        offensive: p,
        assist: passer,
        defensive: blocker,
      });
    } else if (type === "midRange") {
      this.recordStat(this.o, p, "fgaMidRange");
      this.recordEvent("missMidRange", {
        offensive: p,
        assist: passer,
        defensive: blocker,
      });
    } else if (type === "threePointer") {
      this.recordStat(this.o, p, "tpa");
      this.recordEvent("missTp", {
        offensive: p,
        assist: passer,
        defensive: blocker,
      });
    }

    if (this.t > 0.5 / 60 || this.elamActive) {
      return this.doReb(); // orb or drb
    }

    return "endOfQuarter";
  }

  /**
   * Probability that a shot taken this possession is blocked.
   *
   * @return {number} Probability from 0 to 1.
   */
  private probBlk(): number {
    return (
      this.g.blockFactor * 0.2 * this.team[this.d].compositeRating.blocking ** 2
    );
  }

  /**
   * Blocked shot.
   *
   * @param {number} shooter Integer from 0 to 4 representing the index of this.playersOnCourt[this.o] for the shooting player.
   * @return {string} Output of this.doReb.
   */
  private doBlk(
    shooter: PlayerNumOnCourt,
    blocker: PlayerNumOnCourt,
    passer: PlayerNumOnCourt | undefined,
    type: ShotType
  ): string {
    const p = this.playersOnCourt[this.o][shooter];
    this.recordStat(this.o, p, "ba");
    this.recordStat(this.o, p, "fga");

    if (type === "atRim") {
      this.recordStat(this.o, p, "fgaAtRim");
    } else if (type === "lowPost") {
      this.recordStat(this.o, p, "fgaLowPost");
    } else if (type === "midRange") {
      this.recordStat(this.o, p, "fgaMidRange");
    } else if (type === "threePointer") {
      this.recordStat(this.o, p, "tpa");
    }

    this.recordStat(this.d, blocker, "blk");

    if (type === "atRim") {
      this.recordEvent("blkAtRim", {
        offensive: p,
        defensive: blocker,
        assist: passer,
      });
    } else if (type === "lowPost") {
      this.recordEvent("blkLowPost", {
        offensive: p,
        defensive: blocker,
        assist: passer,
      });
    } else if (type === "midRange") {
      this.recordEvent("blkMidRange", {
        offensive: p,
        defensive: blocker,
        assist: passer,
      });
    } else if (type === "threePointer") {
      this.recordEvent("blkTp", {
        offensive: p,
        defensive: blocker,
        assist: passer,
      });
    }

    return this.doReb(); // orb or drb
  }

  /**
   * Field goal.
   *
   * Simulate a successful made field goal.
   *
   * @param {number} shooter Integer from 0 to 4 representing the index of this.playersOnCourt[this.o] for the shooting player.
   * @param {number} shooter Integer from 0 to 4 representing the index of this.playersOnCourt[this.o] for the passing player, who will get an assist. -1 if no assist.
   * @param {number} type 2 for a two pointer, 3 for a three pointer.
   * @return {string} fg, orb, or drb (latter two are for and ones)
   */
  private doFg(
    shooter: PlayerNumOnCourt,
    passer: PlayerNumOnCourt | undefined,
    type: ShotType,
    andOne: boolean = false
  ): string {
    const p = this.playersOnCourt[this.o][shooter];
    this.recordStat(this.o, p, "fga");
    this.recordStat(this.o, p, "fg");
    this.recordStat(this.o, p, "pts", 2); // 2 points for 2's

    let fouler: number | undefined = undefined;
    if (andOne) {
      fouler = SimUtils.pickPlayer(this.ratingArray("fouling", this.d));
    }

    const names = [this.team[this.o].player[p].name];
    if (fouler !== undefined) {
      const p2 = this.playersOnCourt[this.d][fouler];
      names.push(this.team[this.d].player[p2].name);
    }

    if (type === "atRim") {
      this.recordStat(this.o, p, "fgaAtRim");
      this.recordStat(this.o, p, "fgAtRim");
    } else if (type === "lowPost") {
      this.recordStat(this.o, p, "fgaLowPost");
      this.recordStat(this.o, p, "fgLowPost");
    } else if (type === "midRange") {
      this.recordStat(this.o, p, "fgaMidRange");
      this.recordStat(this.o, p, "fgMidRange");
    } else if (type === "threePointer") {
      if (this.g.threePointers) {
        this.recordStat(this.o, p, "pts"); // Extra point for 3's
      }

      this.recordStat(this.o, p, "tpa");
      this.recordStat(this.o, p, "tp");
    }

    if (passer !== undefined) {
      const p2 = this.playersOnCourt[this.o][passer];
      this.recordStat(this.o, p2, "ast");
    }

    if (andOne && !this.elamDone) {
      this.doPf(this.d, "pfAndOne", shooter, fouler);
      return this.doFt(shooter, 1); // fg, orb, or drb
    }

    return "fg";
  }
  /**
   * Probability that a shot taken this possession is assisted.
   *
   * @return {number} Probability from 0 to 1.
   */

  private probAst(): number {
    return (
      (0.6 * (2 + this.team[this.o].compositeRating.passing)) /
      (2 + this.team[this.d].compositeRating.defense)
    );
  }

  /**
   * Free throw.
   *
   * Fatigue has no affect: https://doi.org/10.2478/v10078-010-0019-0
   *
   * @param {number} shooter Integer from 0 to 4 representing the index of this.playersOnCourt[this.o] for the shooting player.
   * @param {number} amount Integer representing the number of free throws to shoot
   * @return {string} "fg" if the last free throw is made; otherwise, this.doReb is called and its output is returned.
   */
  private doFt(shooter: PlayerNumOnCourt, amount: number): string {
    const p = this.playersOnCourt[this.o][shooter]; // 95% max, a 75 FT rating gets you 90%, and a 25 FT rating gets you 60%

    const ftp = MathUtils.bound(
      this.team[this.o].player[p].compositeRating.shootingFT * 0.6 + 0.45,
      0,
      0.95
    );
    let outcome: string | null = null;

    for (let i = 0; i < amount; i++) {
      this.recordStat(this.o, p, "fta");

      if (Random.random() < ftp) {
        // Between 60% and 90%
        this.recordStat(this.o, p, "ft");
        this.recordStat(this.o, p, "pts");
        this.recordEvent("ft", { offensive: p });
        outcome = "fg";

        if (this.elamDone) {
          break;
        }
      } else {
        this.recordEvent("missFt", { offensive: p });
        outcome = null;
      }
    }

    if (outcome !== "fg") {
      outcome = this.doReb(); // orb or drb
    }

    return outcome;
  }

  /**
   * Personal foul.
   * Fun fact: Basketball-gm never had charge fouls. Only deffense can make a foul.
   *
   * @param {number} t Team (0 or 1, this.o or this.d).
   */
  private doPf(
    t: TeamNum,
    type: "pfNonShooting" | "pfBonus" | "pfFG" | "pfTP" | "pfAndOne",
    shooter?: PlayerNumOnCourt,
    fouler?: PlayerNumOnCourt
  ): void {
    if (fouler === undefined) {
      fouler = SimUtils.pickPlayer(this.ratingArray("fouling", t));
    }
    const p = this.playersOnCourt[t][fouler];
    this.recordStat(this.d, p, "pf");

    const names = [this.team[this.d].player[p].name];
    if (shooter !== undefined) {
      names.push(
        this.team[this.o].player[this.playersOnCourt[this.o][shooter]].name
      );
    }

    this.recordEvent(type, { offensive: shooter, defensive: fouler });

    // Foul out
    const foulsNeededToFoulOut = this.g.foulsNeededToFoulOut;
    if (
      foulsNeededToFoulOut > 0 &&
      this.team[this.d].player[p].stat.pf >= foulsNeededToFoulOut
    ) {
      // self.foulOut = (self.foulOut ?? 0) + 1;
      this.recordEvent("foulOut", { defensive: p });

      // Force substitutions now
      this.updatePlayersOnCourt(shooter);
      this.updateSynergy();
    }

    this.foulsThisQuarter[t] += 1;

    if (this.t <= 2) {
      this.foulsLastTwoMinutes[t] += 1;
    }
  }

  /**
   * Rebound.
   *
   * Simulates a rebound opportunity (e.g. after a missed shot).
   *
   * @return {string} "drb" for a defensive rebound, "orb" for an offensive rebound, "oob" for out of bounds (no rebound).
   */
  private doReb(): string {
    let p;
    let ratios;

    if (Random.random() < 0.15) {
      // pick the best passer to turn the ball in.
      ratios = this.ratingArray("passing", this.d);
      p = this.playersOnCourt[this.d][SimUtils.pickPlayer(ratios)];
      this.recordEvent("oob", { defensive: p });
      return "oob";
    }

    if (
      (0.75 * (2 + this.team[this.d].compositeRating.rebounding)) /
        (this.g.orbFactor *
          (2 + this.team[this.o].compositeRating.rebounding)) >
      Random.random()
    ) {
      ratios = this.ratingArray("rebounding", this.d, 3);
      p = this.playersOnCourt[this.d][SimUtils.pickPlayer(ratios)];
      this.recordStat(this.d, p, "drb");
      this.recordEvent("drb", { defensive: p });
      return "drb";
    }

    ratios = this.ratingArray("rebounding", this.o, 5);
    p = this.playersOnCourt[this.o][SimUtils.pickPlayer(ratios)];
    this.recordStat(this.o, p, "orb");
    this.recordEvent("orb", { offensive: p });
    return "orb";
  }

  /**
   * Generate an array of composite ratings.
   *
   * @param {string} rating Key of this.team[t].player[p].compositeRating to use.
   * @param {number} t Team (0 or 1, this.or or this.d).
   * @param {number=} power Power that the composite rating is raised to after the components are linearly combined by  the weights and scaled from 0 to 1. This can be used to introduce nonlinearities, like making a certain stat more uniform (power < 1) or more unevenly distributed (power > 1) or making a composite rating an inverse (power = -1). Default value is 1.
   * @return {Array.<number>} Array of composite ratings of the players on the court for the given rating and team.
   */
  private ratingArray(
    rating: CompositeRatingKeys,
    t: TeamNum,
    power: number = 1
  ): number[] {
    const array = Array(this.numPlayersOnCourt).fill(0);
    let total = 0;

    const foulLimit = rating === "fouling" ? this.getFoulTroubleLimit() : 0;

    // Scale composite ratings
    for (let i = 0; i < this.numPlayersOnCourt; i++) {
      const p = this.playersOnCourt[t][i];

      let compositeRating = this.team[t].player[p].compositeRating[rating];

      if (rating === "fouling") {
        const pf = this.team[t].player[p].stat.pf;
        if (pf === foulLimit - 1) {
          compositeRating *= 0.8;
        } else if (pf === foulLimit) {
          compositeRating *= 0.5;
        } else if (pf > foulLimit) {
          compositeRating *= 0.25;
        }
      }

      array[i] =
        (compositeRating * this.fatigue(this.team[t].player[p].stat.energy)) **
        power;

      total += array[i];
    }

    // Set floor (5% of total)
    const floor = 0.05 * total;

    for (let i = 0; i < this.numPlayersOnCourt; i++) {
      if (array[i] < floor) {
        array[i] = floor;
      }
    }

    return array;
  }

  /**
   * Increments a stat (s) for a player (p) on a team (t) by amount (default is 1).
   *
   * @param {number} t Team (0 or 1, this.or or this.d).
   * @param {number} p Integer index of this.team[t].player for the player of interest.
   * @param {string} s Key for the property of this.team[t].player[p].stat to increment.
   * @param {number} amt Amount to increment (default is 1).
   */
  private recordStat(
    t: TeamNum,
    p: number,
    s: GameStatKeys,
    amt: number = 1
  ): void {
    if (s === "ptsQtrs") return;

    this.team[t].player[p].stat[s] += amt;

    if (
      s !== "gs" &&
      s !== "courtTime" &&
      s !== "benchTime" &&
      s !== "energy"
    ) {
      this.team[t].stat[s] += amt; // Record quarter-by-quarter scoring too

      if (s === "pts") {
        this.team[t].stat.ptsQtrs[this.team[t].stat.ptsQtrs.length - 1] += amt;

        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < this.numPlayersOnCourt; j++) {
            const k = this.playersOnCourt[i][j];
            this.team[i].player[k].stat.pm += i === t ? amt : -amt;
          }
        }

        if (
          this.elamActive &&
          (this.team[this.d].stat.pts >= this.elamTarget ||
            this.team[this.o].stat.pts >= this.elamTarget)
        ) {
          this.elamDone = true;
        }
      }
    }
  }

  private saveReport(
    event: EventKey | TextOnlyEventKeys,
    t: TeamNum,
    names: string[],
    animation: AnimationEvent | null,
    players?: { offensive?: number; defensive?: number; assist?: number }
  ): void {
    let texts;
    let weights;

    let showScore = false;

    if (event === "injury") {
      texts = ["{0} was injured!"];
    } else if (event === "tov") {
      texts = ["{0} turned the ball over"];
    } else if (event === "stl") {
      texts = ["{0} stole the ball from {1}"];
    } else if (event === "fgaAtRim") {
      texts = ["{0} elevates for a shot at the rim"];
    } else if (event === "fgaLowPost") {
      texts = ["{0} attempts a low post shot"];
    } else if (event === "fgaMidRange") {
      texts = ["{0} attempts a mid-range shot"];
    } else if (event === "fgaTp") {
      texts = [`{0} attempts a three pointer`];
    } else if (event === "fgAtRim") {
      // Need to sync report and movie
      // Randomly pick a name to be dunked on

      const ratios = this.ratingArray("blocking", this.d, 5);
      const p = this.playersOnCourt[this.d][SimUtils.pickPlayer(ratios)];
      const dunkedOnName = this.team[this.d].player[p].name;

      texts = [
        `{0} throws it down on ${dunkedOnName}!`,
        `{0} slams it home`,
        "The layup is good",
      ];
      weights = [1, 2, 2];
      showScore = true;
    } else if (event === "fgAtRimAndOne") {
      texts = [
        `{0} throws it down on {1}, and a foul!`,
        `{0} slams it home, and a foul!`,
        "The layup is good, and a foul!",
      ];
      weights = [1, 2, 2];
      showScore = true;
    } else if (
      event === "fgLowPost" ||
      event === "fgMidRange" ||
      event === "tp"
    ) {
      texts = ["It's good!"];
      showScore = true;
    } else if (
      event === "fgLowPostAndOne" ||
      event === "fgMidRangeAndOne" ||
      event === "tpAndOne"
    ) {
      texts = ["It's good, and a foul!"];
      showScore = true;
    } else if (event === "blkAtRim") {
      texts = ["{1} blocked the layup attempt", "{1} blocked the dunk attempt"];
    } else if (
      event === "blkLowPost" ||
      event === "blkMidRange" ||
      event === "blkTp"
    ) {
      texts = ["Blocked by {1}!"];
    } else if (event === "missAtRim") {
      texts = [
        `{0} missed the layup`,
        "The layup attempt rolls out",
        "No good",
      ];
      weights = [1, 1, 3];
    } else if (
      event === "missLowPost" ||
      event === "missMidRange" ||
      event === "missTp"
    ) {
      texts = ["The shot rims out", "No good", `{0} bricks it`];
      weights = [1, 4, 1];
    } else if (event === "orb") {
      texts = ["{0} grabbed the offensive rebound"];
    } else if (event === "oob") {
      texts = ["no rebound"];
    } else if (event === "drb") {
      texts = ["{0} grabbed the defensive rebound"];
    } else if (event === "ast") {
      texts = ["(assist: {0})"];
    } else if (event === "quarterStart") {
      const period = this.team[0].stat.ptsQtrs.length;
      texts = [
        `Start of ${SimUtils.ordinal(period)} ${SimUtils.getPeriodName(
          this.numPeriods
        )}`,
      ];
    } else if (event === "overtime") {
      const count = this.team[0].stat.ptsQtrs.length - this.numPeriods;
      texts = [
        `Start of ${count === 1 ? "" : `${SimUtils.ordinal(count)} `} overtime`,
      ];
    } else if (event === "gameOver") {
      texts = ["End of game"];
    } else if (event === "timeOver") {
      texts = ["Time Over"];
    } else if (event === "quarterEnd") {
      const period = this.team[0].stat.ptsQtrs.length;
      texts = [
        `End of ${SimUtils.ordinal(period)} ${SimUtils.getPeriodName(
          this.numPeriods
        )}`,
      ];
    } else if (event === "ft") {
      texts = ["{0} made a free throw"];
      showScore = true;
    } else if (event === "missFt") {
      texts = ["{0} missed a free throw"];
    } else if (event === "pfNonShooting") {
      texts = ["Non-shooting foul on {0}"];
    } else if (event === "pfBonus") {
      texts = [
        "Non-shooting foul on {0}. They are in the penalty, so two FTs for {1}",
      ];
    } else if (event === "pfFG") {
      texts = ["Shooting foul on {0}, two FTs for {1}"];
    } else if (event === "pfTP") {
      texts = ["Shooting foul on {0}, three FTs for {1}"];
    } else if (event === "pfAndOne") {
      // More description is already in the shot text
      texts = ["Foul on {0}"];
    } else if (event === "foulOut") {
      texts = ["{0} fouled out"];
    } else if (event === "sub") {
      texts = ["Substitution: {0} for {1}"];
    } else if (event === "jumpBall") {
      texts = ["{0} won the jump ball"];
    }

    const period = this.team[0].stat.ptsQtrs.length;

    if (texts) {
      let text = SimUtils.choice(texts, weights);

      if (names) {
        for (let i = 0; i < names.length; i++) {
          text = text.replace(`{${i}}`, names[i]);
        }
      }

      if (event === "ast") {
        // Find most recent made shot, count assist for it
        for (let i = this.reports.length - 1; i >= 0; i--) {
          if (this.reports[i].event === "text") {
            this.reports[i].text += ` ${text}`;
            break;
          }
        }
      } else {
        const sec = Math.floor((this.t % 1) * 60);
        const secString = sec < 10 ? `0${sec}` : `${sec}`;

        // Show score after scoring plays
        if (showScore) {
          text += ` (${this.team[0].stat.pts}-${this.team[1].stat.pts})`;
        }

        const minutes = this.t;
        const overtimeDuration = Math.ceil(this.g.quarterLength * 0.4);
        const periodDuration = this.overtimes
          ? overtimeDuration
          : this.g.quarterLength;

        const secondsFromPeriodStart = (periodDuration - minutes) * 60;

        const secondsFromPreviousQuarters =
          (period - 1) * 60 * this.g.quarterLength;
        const secondsFromPreviousOvertimes =
          this.overtimes - 1 > 0
            ? (this.overtimes - 1) * 60 * overtimeDuration
            : 0;

        const secondsElapsedFromStart =
          secondsFromPeriodStart +
          secondsFromPreviousQuarters +
          secondsFromPreviousOvertimes;

        this.reports.push({
          event,
          currentScore: [this.team[0].stat.pts, this.team[1].stat.pts],
          teams: this.team,
          text,
          t,
          secondsElapsedFromStart,
          time: `${Math.floor(this.t)}:${secString}`,
          animation,
          players,
        });
      }
    } else {
      const sec = Math.floor((this.t % 1) * 60);
      const secString = sec < 10 ? `0${sec}` : `${sec}`;

      const minutes = this.t;
      const overtimeDuration = Math.ceil(this.g.quarterLength * 0.4);
      const periodDuration = this.overtimes
        ? overtimeDuration
        : this.g.quarterLength;

      const secondsFromPeriodStart = (periodDuration - minutes) * 60;

      const secondsFromPreviousQuarters =
        (period - 1) * 60 * this.g.quarterLength;
      const secondsFromPreviousOvertimes =
        this.overtimes - 1 > 0
          ? (this.overtimes - 1) * 60 * overtimeDuration
          : 0;

      const secondsElapsedFromStart =
        secondsFromPeriodStart +
        secondsFromPreviousQuarters +
        secondsFromPreviousOvertimes;

      this.reports.push({
        event,
        teams: this.team,
        currentScore: [this.team[0].stat.pts, this.team[1].stat.pts],
        secondsElapsedFromStart,
        text: "No text for " + event,
        t,
        seconds: this.t,
        time: `${Math.floor(this.t)}:${secString}`,
        animation,
        players,
      });
      // throw new Error(`No text for ${event}`);
    }
  }

  private recordAnimation(
    event: EventKey,
    players?: { offensive?: number; defensive?: number; assist?: number },
    overrideOffensive?: TeamNum
  ): void {
    const oTeam = overrideOffensive !== undefined ? overrideOffensive : this.o;
    const teamZero = this.team[0];
    const teamOne = this.team[1];
    this.animations.push({
      event,
      t: this.t * 60,
      random: Random.random(),
      players: {
        offensive: players?.offensive,
        defensive: players?.defensive,
        assist: players?.assist,
      },
      playersOnCourt: this.playersOnCourt,
      offensiveTeam: oTeam,
      score: [
        teamZero.stat.ptsQtrs.reduce((a, b) => a + b, 0),
        teamOne.stat.ptsQtrs.reduce((a, b) => a + b, 0),
      ],
    });
  }

  private recordEvent(
    event: EventKey | TextOnlyEventKeys,
    players?: { offensive?: number; defensive?: number; assist?: number },
    overrideOffensive?: TeamNum
  ): void {
    const oTeam = overrideOffensive !== undefined ? overrideOffensive : this.o;
    const offensiveTeam = this.team[oTeam];
    const defensiveTeam = this.team[oTeam === 0 ? 1 : 0];

    const names = players
      ? ([
          players.offensive !== undefined
            ? offensiveTeam.player[players.offensive ?? 0].name
            : undefined,
          players.defensive !== undefined
            ? defensiveTeam.player[players.defensive ?? 0].name
            : undefined,
        ].filter(Boolean) as string[])
      : [];

    // if (event in ignoreEvents) {
    //   return;
    // }

    if (textOnlyEvents.includes(event as any)) {
      this.saveReport(event, oTeam, names, null, players);
      return;
    }

    this.recordAnimation(event as EventKey, players, overrideOffensive);
    const animation = this.animations.at(-1);

    this.saveReport(event, oTeam, names, animation || null, players);
  }
}

export default GameSim;
