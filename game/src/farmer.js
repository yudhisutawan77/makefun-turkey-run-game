// The farmer: a simple chase-and-search AI. He runs behind the turkey and
// the gap between them is his whole state. While the turkey runs clean the
// gap slowly opens; every stumble lets him close in. When the turkey hides,
// the farmer stops at the haystack and searches it — sniffing around, peering
// under the hay — and if the turkey stays hidden too long he finds it.
// Cornered means the gap hit zero: the farmer grabs the turkey.
import { FARMER } from './config.js';

export const FARMER_CHASE = 0;
export const FARMER_SEARCH = 1;
export const FARMER_SLIP = 2;

export function createFarmer() {
  const farmer = {
    gap: FARMER.startGap,
    mode: FARMER_CHASE,
    /** Search timer while sniffing a haystack. */
    searchTime: 0,
    /** Slip timer after the farmer trips over his own feet (comic relief). */
    slipTime: 0,
    /** Run-cycle phase, for the leg animation. */
    runPhase: 0,
    /** Where the farmer is looking while searching (-1 left, 1 right). */
    lookDir: 1,
  };

  function reset() {
    farmer.gap = FARMER.startGap;
    farmer.mode = FARMER_CHASE;
    farmer.searchTime = 0;
    farmer.slipTime = 0;
    farmer.runPhase = 0;
    farmer.lookDir = 1;
  }

  /** The turkey stumbled (oven burn, knife hit, fence trip): the farmer gains. */
  function stumble() {
    if (farmer.mode === FARMER_SLIP) return;
    farmer.gap = Math.max(0, farmer.gap - FARMER.stumbleLoss);
  }

  /** The turkey got away clean for a moment: the farmer trips and eats dirt. */
  function trip() {
    farmer.mode = FARMER_SLIP;
    farmer.slipTime = 1.1;
    farmer.gap = Math.min(FARMER.maxGap, farmer.gap + 70);
  }

  /**
   * One step. `turkeyHidden` tells him the turkey vanished into a haystack;
   * returns true when the farmer has caught the turkey (gap closed to zero).
   */
  function step(dt, turkeyHidden, turkeyDashing, scrollSpeed) {
    farmer.runPhase += dt * (scrollSpeed / 30);
    if (farmer.mode === FARMER_SLIP) {
      farmer.slipTime -= dt;
      if (farmer.slipTime <= 0) farmer.mode = FARMER_CHASE;
      return false;
    }
    if (turkeyHidden) {
      if (farmer.mode !== FARMER_SEARCH) {
        farmer.mode = FARMER_SEARCH;
        farmer.searchTime = 0;
      }
      farmer.searchTime += dt;
      // He creeps up to the haystack, then paces around it, sniffing.
      farmer.gap = Math.max(150, farmer.gap - 60 * dt);
      farmer.lookDir = Math.sin(farmer.searchTime * 2.2) > 0 ? 1 : -1;
      return farmer.searchTime >= FARMER.sniffTime;
    }
    // The turkey slipped out of the hay while he was searching it: he was
    // already right there, so he gains a little ground on the escape.
    if (farmer.mode === FARMER_SEARCH) farmer.gap = Math.max(0, farmer.gap - 25);
    farmer.mode = FARMER_CHASE;
    farmer.searchTime = 0;
    // Clean running opens the gap a little; dashing opens it a lot faster.
    const open = turkeyDashing ? FARMER.openRate * 2.4 : FARMER.openRate;
    farmer.gap = Math.min(FARMER.maxGap, farmer.gap + (open - FARMER.closeRate) * dt);
    return farmer.gap <= 0;
  }

  return { farmer, reset, stumble, trip, step };
}
