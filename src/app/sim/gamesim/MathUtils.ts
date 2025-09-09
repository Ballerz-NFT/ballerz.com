export function sigmoid(x: number, a: number, b: number): number {
  return 1 / (1 + Math.exp(-(a * (x - b))));
}

export function bound(x: number, min: number, max: number): number {
  if (x < min) {
    return min;
  }

  if (x > max) {
    return max;
  }

  return x;
}
// Use if denominator of prob might be 0
export function boundProb(prob: number): number {
  return bound(prob, 0.001, 0.999);
}
