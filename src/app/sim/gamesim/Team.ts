import { g } from "./config";
import * as MathUtils from "./MathUtils";
import { Player, PlayerData } from "./Player";
import {
  CompositeRating,
  CompositeRatingKeys,
  createEmptyCompositeRating,
} from "./Ratings";
import { createEmptyStats, GameStats } from "./Stat";

export type TeamData = {
  name: string;
  id: number;
  pace: number;
  player: Omit<PlayerData, "stat">[];
  abbrev: string;
  primaryColor: string;
  secondaryColor: string;
  stat: GameStats;
  firstName?: string;
  region?: string;
  logo?: string;
};

export class Team {
  public readonly id: number;
  public readonly pace: number; // mean number of possessions the team likes to have in a game
  public stat: GameStats;
  public compositeRating: CompositeRating;
  public readonly abbrev: string;
  public readonly player: Player[];
  public synergy: {
    def: number;
    off: number;
    reb: number;
  };
  public secondaryColor: string;
  public primaryColor: string;
  public name: string;

  /**
   * Creates an instance of team.
   * @param teamData.id The id of the team.
   * @param teamData.pace The mean number of possessions the team likes to have in 48 minutes (100 is the NBA average)
   * @param teamData.player The players on the team.
   */
  constructor(teamData: Omit<TeamData, "stat">) {
    this.id = teamData.id;
    this.pace = teamData.pace;
    this.stat = createEmptyStats();
    this.abbrev = teamData.abbrev;
    this.player = teamData.player.map((p) => new Player(p));
    this.synergy = this.calculateInitialSynergy(); // synergy before composite
    this.compositeRating = this.calculateInitialCompositeRating(); // finally composite

    this.name = teamData.name;

    this.primaryColor = teamData.primaryColor;
    this.secondaryColor = teamData.secondaryColor;
  }

  public reset(): void {
    this.stat = createEmptyStats();
    this.player.forEach((p) => p.reset());
    this.synergy = this.calculateInitialSynergy(); // synergy before composite
    this.compositeRating = this.calculateInitialCompositeRating(); // finally composite
  }

  private calculateInitialSynergy(): { def: number; off: number; reb: number } {
    // ! This is only used at the beginning so we have something to show the user.
    // ! The actual synergy is calculated during the game
    const retval = { def: 0, off: 0, reb: 0 };
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

    for (const p of this.player) {
      // 1 / (1 + e^-(15 * (x - 0.61))) from 0 to 1
      // 0.61 is not always used - keep in sync with skills.js!

      skillsCount["3"] += MathUtils.sigmoid(
        p.compositeRating.shootingThreePointer,
        15,
        0.59
      );
      skillsCount.A += MathUtils.sigmoid(
        p.compositeRating.athleticism,
        15,
        0.63
      );
      skillsCount.B += MathUtils.sigmoid(p.compositeRating.dribbling, 15, 0.68);
      skillsCount.Di += MathUtils.sigmoid(
        p.compositeRating.defenseInterior,
        15,
        0.57
      );
      skillsCount.Dp += MathUtils.sigmoid(
        p.compositeRating.defensePerimeter,
        15,
        0.61
      );
      skillsCount.Po += MathUtils.sigmoid(
        p.compositeRating.shootingLowPost,
        15,
        0.61
      );
      skillsCount.Ps += MathUtils.sigmoid(p.compositeRating.passing, 15, 0.63);
      skillsCount.R += MathUtils.sigmoid(
        p.compositeRating.rebounding,
        15,
        0.61
      );
    }

    // Base offensive synergy
    retval.off = 0;
    retval.off += 5 * MathUtils.sigmoid(skillsCount["3"], 3, 2); // 5 / (1 + e^-(3 * (x - 2))) from 0 to 5

    retval.off +=
      3 * MathUtils.sigmoid(skillsCount.B, 15, 0.75) +
      MathUtils.sigmoid(skillsCount.B, 5, 1.75); // 3 / (1 + e^-(15 * (x - 0.75))) + 1 / (1 + e^-(5 * (x - 1.75))) from 0 to 5

    retval.off +=
      3 * MathUtils.sigmoid(skillsCount.Ps, 15, 0.75) +
      MathUtils.sigmoid(skillsCount.Ps, 5, 1.75) +
      MathUtils.sigmoid(skillsCount.Ps, 5, 2.75); // 3 / (1 + e^-(15 * (x - 0.75))) + 1 / (1 + e^-(5 * (x - 1.75))) + 1 / (1 + e^-(5 * (x - 2.75))) from 0 to 5

    retval.off += MathUtils.sigmoid(skillsCount.Po, 15, 0.75); // 1 / (1 + e^-(15 * (x - 0.75))) from 0 to 5

    retval.off +=
      MathUtils.sigmoid(skillsCount.A, 15, 1.75) +
      MathUtils.sigmoid(skillsCount.A, 5, 2.75); // 1 / (1 + e^-(15 * (x - 1.75))) + 1 / (1 + e^-(5 * (x - 2.75))) from 0 to 5

    retval.off /= 17; // Punish teams for not having multiple perimeter skills

    const perimFactor =
      MathUtils.bound(
        Math.sqrt(1 + skillsCount.B + skillsCount.Ps + skillsCount["3"]) - 1,
        0,
        2
      ) / 2; // Between 0 and 1, representing the perimeter skills

    retval.off *= 0.5 + 0.5 * perimFactor; // Defensive synergy

    retval.def = 0;
    retval.def += MathUtils.sigmoid(skillsCount.Dp, 15, 0.75); // 1 / (1 + e^-(15 * (x - 0.75))) from 0 to 5

    retval.def += 2 * MathUtils.sigmoid(skillsCount.Di, 15, 0.75); // 2 / (1 + e^-(15 * (x - 0.75))) from 0 to 5

    retval.def +=
      MathUtils.sigmoid(skillsCount.A, 5, 2) +
      MathUtils.sigmoid(skillsCount.A, 5, 3.25); // 1 / (1 + e^-(5 * (x - 2))) + 1 / (1 + e^-(5 * (x - 3.25))) from 0 to 5

    retval.def /= 6; // Rebounding synergy

    retval.reb = 0;
    retval.reb +=
      MathUtils.sigmoid(skillsCount.R, 15, 0.75) +
      MathUtils.sigmoid(skillsCount.R, 5, 1.75); // 1 / (1 + e^-(15 * (x - 0.75))) + 1 / (1 + e^-(5 * (x - 1.75))) from 0 to 5

    retval.reb /= 4;

    return retval;
  }

  private calculateInitialCompositeRating(): CompositeRating {
    // ! This is only used at the beginning so we have something to show the user.
    // ! The actual composite rating is calculated during the game to simulate stuff like exhaustion.
    const retval = createEmptyCompositeRating();
    let rating: CompositeRatingKeys;
    for (rating in retval) {
      retval[rating] = 0;

      for (const p of this.player) {
        retval[rating] += p.compositeRating[rating];
      }

      retval[rating] /= this.player.length;
    }

    retval.dribbling += g.synergyFactor * this.synergy.off;
    retval.passing += g.synergyFactor * this.synergy.off;
    retval.rebounding += g.synergyFactor * this.synergy.reb;
    retval.defense += g.synergyFactor * this.synergy.def;
    retval.defensePerimeter += g.synergyFactor * this.synergy.def;
    retval.blocking += g.synergyFactor * this.synergy.def;

    return retval;
  }

  // public toJSON(): any {
  //   const jsonObj: any = Object.assign({}, this);
  //   const proto: any = Object.getPrototypeOf(this);
  //   for (const key of Object.getOwnPropertyNames(proto)) {
  //     const desc = Object.getOwnPropertyDescriptor(proto, key);
  //     const hasGetter = desc && typeof desc.get === "function";
  //     if (hasGetter) {
  //       jsonObj[key] = (this as any)[key];
  //     }
  //   }
  //   return jsonObj;
  // }
}
