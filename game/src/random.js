// A small seeded random number generator (mulberry32): the same seed gives
// the same run, which is what makes the screenshot scenes repeatable and the
// ?shot= scenes deterministic.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick a value in [min, max) from a seeded random function. */
export function range(random, min, max) {
  return min + random() * (max - min);
}

/** Pick one item from a list, using a seeded random function. */
export function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}
