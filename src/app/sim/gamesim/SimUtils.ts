import * as Random from "./Random";

export function getInjuryRate(
  baseRate: number,
  age: number,
  playingThroughInjury?: boolean
): number {
  // Modulate injuryRate by age - assume default is 26 yo, and increase/decrease by 3%
  let injuryRate = baseRate * 1.03 ** (Math.min(50, age) - 26);

  // 50% higher if playing through an injury
  if (playingThroughInjury) {
    injuryRate *= 1.5;
  }

  return injuryRate;
}

/**
 * Pick a player to do something.
 *
 * @param {Array.<number>} ratios output of this.ratingArray.
 * @param {number} exempt An integer representing a player that can't be picked (i.e. you can't assist your own shot, which is the only current use of exempt). The value of exempt ranges from 0 to 4, corresponding to the index of the player in this.playersOnCourt. This is *NOT* the same value as the player ID *or* the index of the this.team[t].player list. Yes, that's confusing.
 */
export function pickPlayer(ratios: number[], exempt?: number): number {
  if (exempt !== undefined) {
    ratios[exempt] = 0;
  }

  let sum = 0;
  for (const ratio of ratios) {
    sum += ratio;
  }

  // Special case for all 0 rated players - randomly pick one
  if (sum === 0) {
    const candidates = [...Array(ratios.length).keys()].filter(
      (i) => i !== exempt
    );
    return Random.choice(candidates);
  }

  const rand = Random.random() * sum;

  let runningSum = 0;

  for (let i = 0; i < ratios.length; i++) {
    runningSum += ratios[i];
    if (rand < runningSum) {
      return i;
    }
  }

  return 0;
}

// Return the indexes of the elements in ovrs, sorted from smallest to largest.
// So [50, 70, 10, 20, 60] => [2, 3, 0, 4, 1]
// The set is to handle ties.
// The descending sort and reverse is so ties are handled with the later entry in ovrs getting the lower index, like:
// [0, 0, 0, 0, 0] => [4, 3, 2, 1, 0]
export function getSortedIndexes(ovrs: number[]): number[] {
  const ovrsSortedDesc = [...ovrs].sort((a, b) => b - a);
  const usedIndexes = new Set();
  const sortedIndexes = ovrsSortedDesc
    .map((ovr) => {
      let index = ovrs.indexOf(ovr);
      while (usedIndexes.has(index)) {
        index += 1;
      }
      usedIndexes.add(index);
      return index;
    })
    .reverse();

  return sortedIndexes;
}

export function jumpBallWinnerStartsThisPeriodWithPossession(
  period: number,
  numPeriods: number
): boolean {
  // Overtime: doesn't matter, always starts with a jump ball
  if (period > numPeriods) {
    return true;
  }

  const periodRemainder = period % 2;

  // If numPeriods is odd, alternate
  if (numPeriods % 2 === 1) {
    return periodRemainder === 1;
  }

  // Special case for 2 periods
  if (period === 2 && numPeriods === 2) {
    return false;
  }

  // If numPeriods is even, alternate except for the one right after halftime, then repeat the one before halftime
  const firstPeriodAfterHalftime = numPeriods / 2 + 1;
  if (period < firstPeriodAfterHalftime) {
    return periodRemainder === 1;
  }
  return periodRemainder === 0;
}

export function getPeriodName(numPeriods: number): string {
  if (numPeriods === 2) {
    return "half";
  }

  if (numPeriods === 4) {
    return "quarter";
  }

  return "period";
}

export function ordinal(x?: number | null): string {
  if (x === undefined || x === null) {
    return "";
  }

  let suffix;

  if (x % 100 >= 11 && x % 100 <= 13) {
    suffix = "th";
  } else if (x % 10 === 1) {
    suffix = "st";
  } else if (x % 10 === 2) {
    suffix = "nd";
  } else if (x % 10 === 3) {
    suffix = "rd";
  } else {
    suffix = "th";
  }

  return x.toString() + suffix;
}

/**
 * Choose a random element from a non-empty array.
 *
 * @memberOf util.random
 * @param {number} x Array to choose a random value from.
 */
export function choice<T>(
  x: readonly T[],
  weightInput?: ((a: T, index: number) => number) | number[],
  seed?: number
): T {
  // https://stackoverflow.com/a/19303725/786644
  const uniformSeed = (seed?: number): number => {
    if (seed === undefined) {
      return Math.random();
    }

    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  let seed2 = seed ?? 0;
  const getSeed = (): number | undefined => {
    if (seed === undefined) {
      return undefined;
    }
    seed2 += 1;
    return seed2;
  };

  if (weightInput === undefined) {
    return x[Math.floor(uniformSeed(getSeed()) * x.length)];
  }

  let weights;
  if (Array.isArray(weightInput)) {
    weights = weightInput;
  } else {
    weights = x.map(weightInput);
  }
  weights = weights.map((weight) =>
    weight < 0 || Number.isNaN(weight) ? Number.MIN_VALUE : weight
  );

  const cumsums = weights.reduce<number[]>((array, weight, i) => {
    if (i === 0) {
      array[0] = weight;
    } else {
      array[i] = array[i - 1] + weight;
    }

    return array;
  }, []);
  const max = cumsums.at(-1)!;
  const rand = uniformSeed(getSeed()) * max;
  const ind = cumsums.findIndex((cumsum) => cumsum >= rand);
  return x[ind];
}
