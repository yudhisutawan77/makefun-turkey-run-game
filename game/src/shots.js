// The screenshot scenes behind ?shot=start|play|kitchen|end. Each one plays
// the real rules forward from a fresh world for a fixed number of steps,
// steered by a simple autopilot (jump when an oven, fence or falling knife is
// just ahead; dash on open road; grab corn when it is in reach), so the frame
// is what a short game really looks like and the same seed always gives the
// same frame. The kitchen scene fast-forwards the distance into the kitchen
// stage first; the end scene's pilot is deliberately clumsy, so the turkey
// gets caught and the end screen shows.
import { FIELD, STEP, TURKEY } from './config.js';
import { EVENT_CAUGHT, EVENT_ESCAPED, KIND_FENCE, KIND_KNIFE, KIND_OVEN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 6;
const KITCHEN_DISTANCE = 720;
const END_LIMIT_SECONDS = 600;
/** How many fresh attempts the pilot gets before a scene falls back to a harmless run. */
const MAX_ATTEMPTS = 4;

/** How fast the world scrolls right now (px/s), from the turkey's dash state. */
function scrollSpeed(state) {
  return state.turkey.dashing ? TURKEY.runSpeed + TURKEY.dashSpeed : TURKEY.runSpeed;
}

/**
 * True when a hazard is close enough that a jump started now clears it:
 * the turkey is above an oven's top for roughly the middle of its jump, so
 * the jump starts when the hazard is about half a jump's travel away.
 * `reach` is how far ahead the pilot looks, in pixels.
 */
function dangerAhead(state, reach) {
  const turkey = state.turkey;
  const speed = scrollSpeed(state);
  for (const item of state.obstacles) {
    if (!item.active) continue;
    if (item.kind === KIND_KNIFE) {
      if (item.stuck > 0) {
        // A knife stuck in the ground in the turkey's path: jump it.
        const ahead = item.x - (turkey.x + turkey.width);
        if (ahead > -30 && ahead < reach) return true;
        continue;
      }
      // Predict where the falling knife will land and jump just before it does.
      const timeToGround = Math.max(0, (FIELD.groundY - item.height - item.y) / item.speed);
      const landingX = item.x - speed * timeToGround;
      if (timeToGround < 0.7 && landingX > turkey.x - 50 && landingX < turkey.x + turkey.width + 50) return true;
      continue;
    }
    if (item.kind !== KIND_OVEN && item.kind !== KIND_FENCE) continue;
    const ahead = item.x - (turkey.x + turkey.width);
    if (ahead > -20 && ahead < reach) return true;
  }
  return false;
}

/** True when the road is clear enough to dash: no hazard within 650 px. */
function clearRoad(state) {
  return !dangerAhead(state, 650);
}

/** Jump when danger is close, dash only when the road ahead is clear. */
function autopilot(state, clumsy) {
  const turkey = state.turkey;
  const speed = scrollSpeed(state);
  // The latest a jump can start and still clear the hazard: the turkey is
  // above an oven's top for ~0.84 s of its jump, minus the hazard's width.
  const reach = Math.max(60, speed * 0.85 - 160);
  const jump = !clumsy && turkey.onGround && dangerAhead(state, reach);
  const dash = !clumsy && clearRoad(state) && turkey.stamina > 40;
  return { jump, dash, hide: false, left: false, right: false };
}

/**
 * Set `world` to the named scene (start, play, kitchen or end; any other
 * name is start) and return the screen to draw over it and the best score.
 * The play and kitchen scenes retry a fresh run when the pilot gets caught
 * (the shared random stream moves on, so each attempt plays differently);
 * if every attempt is caught, the scene is staged harmlessly so the frame
 * still shows the right stage.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'kitchen' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { jump: false, dash: false, hide: false }, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'kitchen') {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      world.reset();
      let reached = false;
      for (let index = 0; index < 12000; index += 1) {
        const events = world.step(STEP, autopilot(world.state, false), false);
        if (world.state.distance >= KITCHEN_DISTANCE) {
          reached = true;
          break;
        }
        if (events & (EVENT_CAUGHT | EVENT_ESCAPED)) break;
      }
      if (reached) return { screen: SCREEN_PLAY, best: Math.floor(world.state.distance) };
    }
    // Fallback: stroll to the kitchen with nothing able to hurt the turkey.
    world.reset();
    for (let index = 0; index < 12000; index += 1) {
      world.step(STEP, autopilot(world.state, false), true);
      if (world.state.distance >= KITCHEN_DISTANCE) break;
    }
    return { screen: SCREEN_PLAY, best: Math.floor(world.state.distance) };
  }
  if (name === 'play') {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      world.reset();
      let survived = true;
      for (let index = 0; index < PLAY_SECONDS / STEP; index += 1) {
        const events = world.step(STEP, autopilot(world.state, false), false);
        if (events & (EVENT_CAUGHT | EVENT_ESCAPED)) {
          survived = false;
          break;
        }
      }
      if (survived) return { screen: SCREEN_PLAY, best: Math.floor(world.state.distance) };
    }
    world.reset();
    for (let index = 0; index < PLAY_SECONDS / STEP; index += 1) {
      world.step(STEP, autopilot(world.state, false), true);
    }
    return { screen: SCREEN_PLAY, best: Math.floor(world.state.distance) };
  }
  const limit = END_LIMIT_SECONDS;
  const clumsy = true;
  for (let index = 0; index < limit / STEP; index += 1) {
    const events = world.step(STEP, autopilot(world.state, clumsy), false);
    if (events & (EVENT_CAUGHT | EVENT_ESCAPED)) break;
  }
  const over = world.state.caught || world.state.escaped;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: Math.floor(world.state.distance) };
}
