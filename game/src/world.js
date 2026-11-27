// The game's rules and state, with no drawing and no browser in it: the
// scrolling farmyard, barn and kitchen, the ovens that slide, the carving
// knives that drop from the sky, the corn, haystacks and fences, the farmer's
// chase, the score, the lives and the escape. step() advances one fixed step
// and returns what happened as bit flags, so the caller can react (sound,
// announcements) without the world knowing about screens or audio.
import {
  CORN, ESCAPE_DISTANCE, FARMER, FENCE, FIELD, HAY, KNIFE, LIVES,
  OVEN, SCORE, STAGES, TURKEY,
} from './config.js';
import { range, pick } from './random.js';
import { createTurkey } from './turkey.js';
import { createFarmer } from './farmer.js';

export const KIND_OVEN = 0;
export const KIND_KNIFE = 1;
export const KIND_CORN = 2;
export const KIND_HAY = 3;
export const KIND_FENCE = 4;

export const EVENT_CORN = 1;
export const EVENT_HIT = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_ESCAPED = 8;
export const EVENT_SPOTTED = 16;
export const EVENT_JUMP = 32;
export const EVENT_DASH = 64;
export const EVENT_HIDE = 128;

const POOL_SIZE = 96;

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * A forgiving hitbox: feathers and hazard edges do not count, so a narrow
 * escape stays an escape and a jump that clips a corner by a pixel is not
 * a hit. Pickups keep the full box (generous is good there).
 */
function shrinkBox(box, dx, dy) {
  return { x: box.x + dx, y: box.y + dy, width: box.width - dx * 2, height: box.height - dy * 2 };
}

export function createWorld(random) {
  const turkeyApi = createTurkey();
  const farmerApi = createFarmer();
  const turkey = turkeyApi.turkey;
  const farmer = farmerApi.farmer;
  const obstacles = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    obstacles.push({ active: false, kind: KIND_CORN, x: 0, y: 0, width: 0, height: 0, speed: 0, baseX: 0, slidePhase: 0, stuck: 0, scored: false });
  }
  const state = {
    turkey, farmer, obstacles,
    score: 0, distance: 0, lives: LIVES, stage: 0, stageName: STAGES[0].name,
    elapsed: 0, ovenTimer: 1.6, knifeTimer: 1.2, cornTimer: 0.7, hayTimer: 3.5, fenceTimer: 2.4,
    caught: false, escaped: false, spotted: false, hideSpot: null,
    /** Dust puffs and feather bursts, for the renderer. */
    particles: [],
  };

  function stageFor(distance) {
    for (let index = 0; index < STAGES.length; index += 1) {
      if (distance < STAGES[index].until) return index;
    }
    return STAGES.length - 1;
  }

  function reset() {
    turkeyApi.reset();
    farmerApi.reset();
    for (const item of obstacles) item.active = false;
    state.particles.length = 0;
    state.score = 0;
    state.distance = 0;
    state.lives = LIVES;
    state.stage = 0;
    state.stageName = STAGES[0].name;
    state.elapsed = 0;
    state.ovenTimer = 1.8;
    state.knifeTimer = 1.4;
    state.cornTimer = 0.8;
    state.hayTimer = 3.0;
    state.fenceTimer = 2.6;
    state.caught = false;
    state.escaped = false;
    state.spotted = false;
    state.hideSpot = null;
  }

  function freeSlot() {
    for (let index = 0; index < obstacles.length; index += 1) {
      if (!obstacles[index].active) return obstacles[index];
    }
    return null;
  }

  function spawnAt(kind, x) {
    const item = freeSlot();
    if (item === null) return null;
    item.active = true;
    item.kind = kind;
    item.scored = false;
    item.stuck = 0;
    item.slidePhase = random() * Math.PI * 2;
    if (kind === KIND_OVEN) {
      item.width = OVEN.width;
      item.height = OVEN.height;
      item.x = x;
      item.baseX = x;
      item.y = FIELD.groundY - item.height;
    } else if (kind === KIND_KNIFE) {
      item.width = KNIFE.width;
      item.height = KNIFE.height;
      item.x = x;
      item.y = -item.height;
      item.speed = KNIFE.fallSpeed + KNIFE.fallSpeedPerStage * state.stage;
    } else if (kind === KIND_CORN) {
      item.width = CORN.size;
      item.height = CORN.size;
      item.x = x;
      item.y = FIELD.groundY - 96 - random() * 120;
    } else if (kind === KIND_HAY) {
      item.width = HAY.width;
      item.height = HAY.height;
      item.x = x;
      item.y = FIELD.groundY - item.height;
    } else {
      item.width = FENCE.width;
      item.height = FENCE.height;
      item.x = x;
      item.y = FIELD.groundY - item.height;
    }
    return item;
  }

  function spawnAhead(kind, minGap) {
    // Spread spawns along the road ahead so two hazards never overlap.
    let x = FIELD.width + range(random, 40, 260);
    for (const item of obstacles) {
      if (item.active && Math.abs(item.x - x) < minGap) x = item.x + minGap + range(random, 0, 80);
    }
    return spawnAt(kind, x);
  }

  function burst(x, y, count, colours) {
    for (let index = 0; index < count; index += 1) {
      state.particles.push({
        x, y, vx: range(random, -160, 160), vy: range(random, -260, -40),
        life: range(random, 0.4, 0.9), maxLife: 0.9, size: range(random, 3, 8),
        colour: pick(random, colours),
      });
    }
  }

  function hurt(events) {
    state.lives -= 1;
    turkey.invulnerable = TURKEY.invulnerable;
    farmerApi.stumble();
    burst(turkey.x + turkey.width / 2, turkey.y + 20, 14, ['#e8a33c', '#a0522d', '#d2691e']);
    if (state.lives <= 0) {
      state.caught = true;
      return events | EVENT_HIT | EVENT_CAUGHT;
    }
    return events | EVENT_HIT;
  }

  /**
   * One fixed step. `controls` carries the held keys for this step:
   * { left, right, jump, hide, dash }. With `harmless` set (the title
   * screen's backdrop) the world scrolls and things spawn, but nothing can
   * hurt the turkey and nothing scores.
   */
  function step(dt, controls, harmless) {
    let events = 0;
    state.elapsed += dt;

    if (controls.jump) {
      if (turkeyApi.jump()) events |= EVENT_JUMP;
    }

    // Hiding: only inside a haystack, and only while standing still on it.
    let nearHay = null;
    for (const item of obstacles) {
      if (item.active && item.kind === KIND_HAY && Math.abs((item.x + item.width / 2) - (turkey.x + turkey.width / 2)) < 70) {
        nearHay = item;
        break;
      }
    }
    if (controls.hide && nearHay !== null && turkey.onGround && !turkey.hidden) {
      turkey.hidden = true;
      turkey.hiding = 0;
      state.hideSpot = nearHay;
      events |= EVENT_HIDE;
    } else if (turkey.hidden && (!controls.hide || nearHay === null)) {
      turkey.hidden = false;
      state.hideSpot = null;
    }

    const speed = turkeyApi.step(dt, controls.dash);
    const metres = (speed * dt) / 10;
    state.distance += metres;
    if (!harmless) state.score += Math.round(metres * SCORE.perMetre);
    const nextStage = stageFor(state.distance);
    if (nextStage !== state.stage) {
      state.stage = nextStage;
      state.stageName = STAGES[nextStage].name;
    }

    // The farmer chases; while hidden he searches the haystack instead.
    if (!harmless) {
      const found = farmerApi.step(dt, turkey.hidden, turkey.dashing, speed);
      if (found) {
        state.caught = true;
        return events | EVENT_CAUGHT;
      }
    }
    // Spotted: the farmer is close enough that the turkey should run.
    const wasSpotted = state.spotted;
    state.spotted = !harmless && farmer.gap < FARMER.dangerGap && !turkey.hidden;
    if (state.spotted && !wasSpotted) events |= EVENT_SPOTTED;

    // Spawning, paced by stage: later stages throw more at the turkey.
    const stageScale = 1 + state.stage * 0.25;
    state.ovenTimer -= dt;
    if (state.ovenTimer <= 0) {
      spawnAhead(KIND_OVEN, 300);
      state.ovenTimer += Math.max(OVEN.minInterval, OVEN.interval / stageScale) + random() * 0.8;
    }
    state.knifeTimer -= dt;
    if (state.knifeTimer <= 0) {
      const knife = spawnAhead(KIND_KNIFE, 260);
      if (knife !== null) {
        // Aim the knife to land ahead of the turkey, never on it: it falls
        // for fallTime seconds while the world scrolls, so it is spawned
        // that far further ahead. A knife stuck ahead is a jump to make;
        // one landing on the turkey's head would be no jump at all.
        const fallTime = (FIELD.groundY - KNIFE.height - knife.y) / knife.speed;
        let aimX = turkey.x + range(random, 150, 350) + speed * fallTime;
        for (const item of obstacles) {
          if (item.active && item !== knife && Math.abs(item.x - aimX) < 260) aimX = item.x + 300;
        }
        knife.x = aimX;
      }
      state.knifeTimer += Math.max(KNIFE.minInterval, KNIFE.interval / stageScale) + random() * 0.7;
    }
    state.cornTimer -= dt;
    if (state.cornTimer <= 0) {
      spawnAhead(KIND_CORN, 160);
      state.cornTimer += CORN.interval + random() * CORN.intervalJitter;
    }
    state.hayTimer -= dt;
    if (state.hayTimer <= 0) {
      spawnAhead(KIND_HAY, 300);
      state.hayTimer += HAY.interval + random() * HAY.intervalJitter;
    }
    state.fenceTimer -= dt;
    if (state.fenceTimer <= 0) {
      spawnAhead(KIND_FENCE, 300);
      state.fenceTimer += FENCE.interval + random() * FENCE.intervalJitter;
    }

    // Move everything with the scroll; knives fall, ovens slide.
    for (const item of obstacles) {
      if (!item.active) continue;
      item.x -= speed * dt;
      if (item.kind === KIND_OVEN) {
        item.x = item.baseX + Math.sin(state.elapsed * 0.9 + item.slidePhase) * OVEN.slide * 0.4;
        item.baseX -= speed * dt;
      }
      if (item.kind === KIND_KNIFE) {
        if (item.stuck > 0) {
          item.stuck -= dt;
          if (item.stuck <= 0) item.active = false;
        } else {
          item.y += item.speed * dt;
          if (item.y >= FIELD.groundY - item.height) {
            item.y = FIELD.groundY - item.height;
            item.stuck = KNIFE.stuckTime;
          }
        }
      }
      if (item.x + item.width < -40) {
        if (item.kind === KIND_OVEN && !item.scored && !harmless) {
          state.score += SCORE.dodgeOven;
          item.scored = true;
        }
        if (item.kind === KIND_KNIFE && !item.scored && !harmless) {
          state.score += SCORE.dodgeKnife;
          item.scored = true;
        }
        item.active = false;
      }
    }

    // Particles drift and fade.
    for (let index = state.particles.length - 1; index >= 0; index -= 1) {
      const p = state.particles[index];
      p.life -= dt;
      if (p.life <= 0) {
        state.particles.splice(index, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 500 * dt;
    }

    if (harmless || turkey.hidden) return events;

    // Collisions, only while the turkey is touchable.
    const touchable = turkey.invulnerable === 0;
    if (touchable) {
      for (const item of obstacles) {
        if (!item.active) continue;
        if (item.kind === KIND_CORN) {
          if (overlaps(item, turkey)) {
            item.active = false;
            state.score += CORN.points;
            turkey.stamina = Math.min(TURKEY.staminaMax, turkey.stamina + TURKEY.cornStamina);
            burst(item.x + 15, item.y + 15, 8, ['#f2c94c', '#ffe98a', '#d9a92e']);
            events |= EVENT_CORN;
          }
          continue;
        }
        if (item.kind === KIND_HAY) continue;
        if (overlaps(shrinkBox(item, 8, 6), shrinkBox(turkey, 10, 8))) {
          item.active = false;
          events = hurt(events);
          if (state.caught) return events;
          break;
        }
      }
    }

    // The turkey is caught if the farmer reaches it — handled above — and
    // escapes by covering the whole distance.
    if (state.distance >= ESCAPE_DISTANCE) {
      state.escaped = true;
      return events | EVENT_ESCAPED;
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
