import { type PositionEnum, calculatePosition } from "./Position";
import {
  Ratings,
  CompositeRating,
  calculateOvr,
  calculateCompositeRating,
} from "./Ratings";
import { createEmptyStats, GameStats } from "./Stat";

export type PlayerData = {
  id: number;
  name: string;
  age: number;
  ratings: Ratings;
  previouslyInjured: boolean;
  stat: GameStats;

  sneakerz?: number;
  baller?: number;
};

export class Player {
  public readonly id: number;
  public readonly name: string;
  public readonly age: number;

  public get pos(): PositionEnum {
    return calculatePosition(this.ratings);
  }

  public get ovr(): number {
    return calculateOvr(this.ratings);
  }

  public stat: GameStats;
  public ratings: Ratings;
  public injured: boolean = false;
  public previouslyInjured: boolean;

  public compositeRating: CompositeRating;

  public skills: string[];

  /**
   * Creates an instance of player.
   * @param playerData.id The id of the player.
   * @param playerData.name The name of the player.
   * @param playerData.age The age of the player. Only important for injuries
   * @param playerData.ratings The ratings of the player.
   * @param playerData.previouslyInjured Whether the player was previously injured. Only used for calculating further injuries
   */
  constructor(playerData: Omit<PlayerData, "stat">) {
    this.id = playerData.id;
    this.name = playerData.name;
    this.age = playerData.age;
    this.ratings = playerData.ratings;
    this.previouslyInjured = playerData.previouslyInjured;
    const { compositeRating, skills } = calculateCompositeRating(this.ratings);
    this.compositeRating = compositeRating;
    this.skills = skills;
    this.stat = createEmptyStats();
  }

  public reset(): void {
    const { compositeRating, skills } = calculateCompositeRating(this.ratings);
    this.compositeRating = compositeRating;
    this.skills = skills;
    this.stat = createEmptyStats();
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
