// Gobble Dash — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size. The turkey runs
// right and the world scrolls left; distance is measured in metres.
export const FIELD = { width: 1280, height: 720, groundY: 606 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** Metres the turkey must cover to escape Thanksgiving for good. */
export const ESCAPE_DISTANCE = 1000;

export const TURKEY = {
  x: 300,
  width: 64,
  height: 58,
  /** Base scroll speed in px/s while running clean. */
  runSpeed: 330,
  /** Extra scroll speed while the gobble dash is burning. */
  dashSpeed: 260,
  jumpVelocity: 1000,
  gravity: 2100,
  /** Stamina (0..100) spent by dashing, refilled by corn and hiding. */
  staminaMax: 100,
  dashDrain: 42,
  staminaRegen: 9,
  /** Stamina per second regained while hiding in a haystack. */
  staminaHideRegen: 22,
  cornStamina: 16,
  invulnerable: 2.0,
};

export const FARMER = {
  /** Gap (px behind the turkey) the farmer starts at. */
  startGap: 300,
  /** Widest the gap may grow while the turkey runs clean. */
  maxGap: 340,
  /** How fast the farmer closes in while the turkey runs clean (px/s). */
  closeRate: 26,
  /** How fast the gap opens again once the turkey is running clean. */
  openRate: 34,
  /** Gap lost on a stumble (oven burn, knife hit, fence trip). */
  stumbleLoss: 95,
  /** Gap under which the farmer is "right behind you". */
  dangerGap: 130,
  /** Seconds hidden before the farmer sniffs the turkey out. */
  sniffTime: 4.5,
};

export const LIVES = 3;

/** Stage borders, in metres: farmyard -> barn -> kitchen. */
export const STAGES = [
  { name: 'FARMYARD', until: 300 },
  { name: 'THE BARN', until: 650 },
  { name: 'THE KITCHEN', until: Infinity },
];

export const OVEN = {
  width: 96,
  height: 96,
  /** How far an oven slides back and forth along the ground. */
  slide: 70,
  slideSpeed: 55,
  interval: 4.0,
  intervalScale: 0.9,
  minInterval: 1.7,
};

export const KNIFE = {
  width: 26,
  height: 74,
  fallSpeed: 520,
  fallSpeedPerStage: 90,
  interval: 2.6,
  intervalScale: 0.88,
  minInterval: 0.9,
  /** Seconds a stuck knife stays in the ground as a hazard. */
  stuckTime: 1.6,
};

export const CORN = {
  size: 30,
  interval: 1.5,
  intervalJitter: 0.9,
  points: 25,
};

export const HAY = {
  width: 96,
  height: 74,
  interval: 6.5,
  intervalJitter: 3.0,
};

export const FENCE = {
  width: 54,
  height: 46,
  interval: 4.2,
  intervalJitter: 2.2,
};

/** Distance points: 1 point per metre, plus corn and dodge bonuses. */
export const SCORE = { perMetre: 1, dodgeOven: 15, dodgeKnife: 5 };

export const PALETTE = {
  skyFarm: ['#f7c873', '#f2a65a'],
  skyBarn: ['#8a5a34', '#5d3a22'],
  skyKitchen: ['#e8b04b', '#c97e2e'],
  groundFarm: '#7fae4e',
  groundBarn: '#6b4a2a',
  groundKitchen: '#b98a5a',
  dirt: '#8a5a2e',
  turkeyBody: '#8a5230',
  turkeyWing: '#6e3f22',
  tail: ['#a0522d', '#d2691e', '#e8a33c', '#c96a2e'],
  head: '#e8e2d4',
  beak: '#e8a33c',
  wattle: '#e5534b',
  farmerShirt: '#4a7fb5',
  farmerOveralls: '#3a5a8c',
  farmerHat: '#d9b36a',
  farmerSkin: '#e8b98a',
  ovenBody: '#5a5a66',
  ovenGlow: '#ff7a1a',
  knifeBlade: '#d7dce3',
  knifeHandle: '#7a4a26',
  corn: '#f2c94c',
  cornHusk: '#5da24a',
  hay: '#e8c95a',
  hayDark: '#c9a83c',
  panel: '#2b2118',
  text: '#fff6e0',
  muted: '#d9c9a8',
  danger: '#ff5340',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best escape distance is kept between visits (this browser only). */
export const BEST_KEY = 'gobble-dash.best-distance';
