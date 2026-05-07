export function hashSeed(seed: string) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function nextRandom(value: number) {
  return (Math.imul(value, 1664525) + 1013904223) >>> 0;
}

export function shuffle<T>(items: T[], seed: number) {
  const result = [...items];
  let rng = seed;

  for (let index = result.length - 1; index > 0; index -= 1) {
    rng = nextRandom(rng);
    const swapIndex = rng % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return { items: result, rng };
}
