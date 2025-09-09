import * as MathUtils from "./MathUtils";

/**
 * Player ratings
 * from 0 to 100 how good you are
 */
export enum PlayerRatingsEnum {
  DEFFENSIVE_IQ = "diq",
  DUNK = "dnk",
  DRIBLE = "drb",
  ENDURANCE = "endu",
  TWO_POINT = "fg",
  FREE_THROW = "ft",

  /**
   * height, which factors into pretty much everything
   * this is meant to also reflect things like standing reach and wingspan,
   * and it is used in game simulations rather than the player's "true" height in feet/inches.
   * For a realistic professional basketball league, take the player's height in inches,
   * subtract 66, and multiply by 3.70. Then maybe add or subtract a little based on wingspan.
   * This means 0 is 5'6" and 100 is 7'9" (with a little wiggle room for wingspan).
   */
  HEIGHT = "hgt",
  LOW_POST_SCORING = "ins",
  JUMP_BALL = "jmp",
  OFFENSIVE_IQ = "oiq",
  PASSING = "pss",
  REBOUNDING = "reb",
  SPEED = "spd",
  STRENGHT = "stre",
  THREE_POINTS = "tp",
}

// Object that determines how to convert the base stats into the actually used stats.
export const COMPOSITE_WEIGHTS: {
  [key in CompositeRatingKeys]: {
    ratings: (string | number)[];
    weights?: number[];
    skill?: { label: string; cutoff: number };
  };
} = {
  pace: {
    ratings: ["spd", "jmp", "dnk", "tp", "drb", "pss"],
  },
  usage: {
    ratings: ["ins", "dnk", "fg", "tp", "spd", "hgt", "drb", "oiq"],
    weights: [1.5, 1, 1, 1, 0.5, 0.5, 0.5, 0.5],
    skill: {
      label: "Volume Scorer",
      cutoff: 0.61,
    },
  },
  dribbling: {
    ratings: ["drb", "spd"],
    weights: [1, 1],
    skill: {
      label: "Ball Handler",
      cutoff: 0.68,
    },
  },
  passing: {
    ratings: ["drb", "pss", "oiq"],
    weights: [0.4, 1, 0.5],
    skill: {
      label: "Passer",
      cutoff: 0.63,
    },
  },
  turnovers: {
    ratings: [50, "ins", "pss", "oiq"],
    weights: [0.5, 1, 1, -1],
  },
  shootingAtRim: {
    ratings: ["hgt", "stre", "dnk", "oiq"],
    weights: [2, 0.3, 0.3, 0.2],
  },
  shootingLowPost: {
    ratings: ["hgt", "stre", "spd", "ins", "oiq"],
    weights: [1, 0.6, 0.2, 1, 0.4],
    skill: {
      label: "Post Scorer",
      cutoff: 0.61,
    },
  },
  shootingMidRange: {
    ratings: ["oiq", "fg", "stre"],
    weights: [-0.5, 1, 0.2],
  },
  shootingThreePointer: {
    ratings: ["oiq", "tp"],
    weights: [0.1, 1],
    skill: {
      label: "Three Point Shooter",
      cutoff: 0.59,
    },
  },
  shootingFT: {
    ratings: ["ft"],
  },
  rebounding: {
    ratings: ["hgt", "stre", "jmp", "reb", "oiq", "diq"],
    weights: [2, 0.1, 0.1, 2, 0.5, 0.5],
    skill: {
      label: "Rebounder",
      cutoff: 0.61,
    },
  },
  stealing: {
    ratings: [50, "spd", "diq"],
    weights: [1, 1, 2],
  },
  blocking: {
    ratings: ["hgt", "jmp", "diq"],
    weights: [2.5, 1.5, 0.5],
  },
  fouling: {
    ratings: [50, "hgt", "diq", "spd"],
    weights: [3, 1, -1, -1],
  },
  drawingFouls: {
    ratings: ["hgt", "spd", "drb", "dnk", "oiq"],
    weights: [1, 1, 1, 1, 1],
  },
  defense: {
    ratings: ["hgt", "stre", "spd", "jmp", "diq"],
    weights: [1, 1, 1, 0.5, 2],
  },
  defenseInterior: {
    ratings: ["hgt", "stre", "spd", "jmp", "diq"],
    weights: [2.5, 1, 0.5, 0.5, 2],
    skill: {
      label: "Interior Defender",
      cutoff: 0.57,
    },
  },
  defensePerimeter: {
    ratings: ["hgt", "stre", "spd", "jmp", "diq"],
    weights: [0.5, 0.5, 2, 0.5, 1],
    skill: {
      label: "Permieter Defender",
      cutoff: 0.61,
    },
  },
  endurance: {
    ratings: [50, "endu"],
    weights: [1, 1],
  },
  athleticism: {
    ratings: ["stre", "spd", "jmp", "hgt"],
    weights: [1, 1, 1, 0.75],
    skill: {
      label: "Athlete",
      cutoff: 0.63,
    },
  },
  jumpBall: {
    ratings: ["hgt", "jmp"],
    weights: [1, 0.25],
  },
};

export type Ratings = {
  [key in PlayerRatingsEnum]: number;
};

export function createEmptyCompositeRating(): CompositeRating {
  return {
    pace: 0,
    usage: 0,
    dribbling: 0,
    passing: 0,
    turnovers: 0,
    shootingAtRim: 0,
    shootingLowPost: 0,
    shootingMidRange: 0,
    shootingThreePointer: 0,
    shootingFT: 0,
    rebounding: 0,
    stealing: 0,
    blocking: 0,
    fouling: 0,
    drawingFouls: 0,
    defense: 0,
    defenseInterior: 0,
    defensePerimeter: 0,
    endurance: 0,
    athleticism: 0,
    jumpBall: 0,
  };
}

export function calculateCompositeRating(ratings: Ratings): {
  compositeRating: CompositeRating;
  skills: string[];
} {
  const compositeRating = createEmptyCompositeRating();
  const skills: string[] = [];
  for (const key in COMPOSITE_WEIGHTS) {
    const compositeKey = key as CompositeRatingKeys;
    const componentRatings = COMPOSITE_WEIGHTS[compositeKey].ratings as (
      | PlayerRatingsEnum
      | number
    )[];
    const compositeWeights = COMPOSITE_WEIGHTS[compositeKey].weights;
    compositeRating[compositeKey] = calculateSingleCompositeRating(
      ratings,
      componentRatings,
      compositeWeights
    );

    // check for skills
    const skill = COMPOSITE_WEIGHTS[compositeKey].skill;
    if (skill) {
      if (compositeRating[compositeKey] >= skill.cutoff) {
        skills.push(skill.label);
      }
    }
  }

  return { compositeRating, skills };
}

function calculateSingleCompositeRating(
  ratings: Ratings,
  components: (PlayerRatingsEnum | number)[],
  weights: number[] | undefined
): number {
  if (weights === undefined) {
    // Default: array of ones with same size as components
    weights = Array(components.length).fill(1);
  }

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < components.length; i++) {
    const component = components[i];

    let factor: number;
    if (typeof component === "number") {
      factor = component;
    } else {
      const rating: number | undefined = ratings[component];

      if (rating === undefined) {
        throw new Error(`Undefined value for rating "${component}"`);
      }

      factor = rating;
    }

    numerator += factor * weights[i];
    denominator += 100 * weights[i];
  }

  return MathUtils.bound(numerator / denominator, 0, 1);
}

export type CompositeRatingKeys =
  | "pace"
  | "blocking"
  | "fouling"
  | "passing"
  | "rebounding"
  | "stealing"
  | "turnovers"
  | "usage"
  | "jumpBall"
  | "shootingThreePointer"
  | "athleticism"
  | "dribbling"
  | "defenseInterior"
  | "defensePerimeter"
  | "shootingLowPost"
  | "defense"
  | "endurance"
  | "shootingMidRange"
  | "shootingAtRim"
  | "shootingMidRange"
  | "shootingAtRim"
  | "drawingFouls"
  | "shootingFT";

export type CompositeRating = {
  [key in CompositeRatingKeys]: number;
};

export function calculateOvr(ratings: Ratings): number {
  const r =
    0.159 * (ratings.hgt - 47.5) +
    0.0777 * (ratings.stre - 50.2) +
    0.123 * (ratings.spd - 50.8) +
    0.051 * (ratings.jmp - 48.7) +
    0.0632 * (ratings.endu - 39.9) +
    0.0126 * (ratings.ins - 42.4) +
    0.0286 * (ratings.dnk - 49.5) +
    0.0202 * (ratings.ft - 47.0) +
    0.0726 * (ratings.tp - 47.1) +
    0.133 * (ratings.oiq - 46.8) +
    0.159 * (ratings.diq - 46.7) +
    0.059 * (ratings.drb - 54.8) +
    0.062 * (ratings.pss - 51.3) +
    0.01 * (ratings.fg - 47.0) +
    0.01 * (ratings.reb - 51.4) +
    48.5;

  // Fudge factor to keep ovr ratings the same as they used to be (back before 2018 ratings rescaling)
  // +8 at 68
  // +4 at 50
  // -5 at 42
  // -10 at 31
  let fudgeFactor = 0;
  if (r >= 68) {
    fudgeFactor = 8;
  } else if (r >= 50) {
    fudgeFactor = 4 + (r - 50) * (4 / 18);
  } else if (r >= 42) {
    fudgeFactor = -5 + (r - 42) * (9 / 8);
  } else if (r >= 31) {
    fudgeFactor = -5 - (42 - r) * (5 / 11);
  } else {
    fudgeFactor = -10;
  }

  const val = Math.round(r + fudgeFactor);

  if (val > 100) {
    return 100;
  }
  if (val < 0) {
    return 0;
  }

  return val;
}
