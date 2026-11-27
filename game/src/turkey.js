// The turkey: run, jump, hide and the gobble dash. Pure physics and state —
// no drawing and no browser in here. The turkey stays at a fixed screen x
// and the world scrolls past; `scroll` is how fast the world moves (px/s).
import { FIELD, TURKEY } from './config.js';

export function createTurkey() {
  const turkey = {
    x: TURKEY.x,
    y: FIELD.groundY - TURKEY.height,
    width: TURKEY.width,
    height: TURKEY.height,
    vy: 0,
    onGround: true,
    hidden: false,
    hiding: 0,
    stamina: TURKEY.staminaMax,
    dashing: false,
    invulnerable: 0,
    /** Run-cycle phase, for the leg animation. */
    runPhase: 0,
    /** Squash-and-stretch after landing, 0..1. */
    landSquash: 0,
  };

  function reset() {
    turkey.y = FIELD.groundY - TURKEY.height;
    turkey.vy = 0;
    turkey.onGround = true;
    turkey.hidden = false;
    turkey.hiding = 0;
    turkey.stamina = TURKEY.staminaMax;
    turkey.dashing = false;
    turkey.invulnerable = 0;
    turkey.runPhase = 0;
    turkey.landSquash = 0;
  }

  function jump() {
    if (!turkey.onGround || turkey.hidden) return false;
    turkey.vy = -TURKEY.jumpVelocity;
    turkey.onGround = false;
    return true;
  }

  /** Current scroll speed: the run speed, plus the dash burst while held. */
  function scrollSpeed(dashHeld) {
    const wantDash = dashHeld && turkey.stamina > 0 && !turkey.hidden;
    turkey.dashing = wantDash;
    return TURKEY.runSpeed + (wantDash ? TURKEY.dashSpeed : 0);
  }

  function step(dt, dashHeld) {
    const speed = scrollSpeed(dashHeld);
    if (turkey.dashing) {
      turkey.stamina = Math.max(0, turkey.stamina - TURKEY.dashDrain * dt);
    } else if (!turkey.hidden) {
      turkey.stamina = Math.min(TURKEY.staminaMax, turkey.stamina + TURKEY.staminaRegen * dt);
    }
    if (turkey.hidden) {
      turkey.hiding += dt;
      turkey.stamina = Math.min(TURKEY.staminaMax, turkey.stamina + TURKEY.staminaHideRegen * dt);
    }
    if (!turkey.onGround) {
      turkey.vy += TURKEY.gravity * dt;
      turkey.y += turkey.vy * dt;
      if (turkey.y >= FIELD.groundY - TURKEY.height) {
        turkey.y = FIELD.groundY - TURKEY.height;
        turkey.vy = 0;
        turkey.onGround = true;
        turkey.landSquash = 1;
      }
    }
    if (turkey.landSquash > 0) turkey.landSquash = Math.max(0, turkey.landSquash - dt * 4);
    if (turkey.onGround && !turkey.hidden) turkey.runPhase += dt * (speed / 28);
    if (turkey.invulnerable > 0) turkey.invulnerable = Math.max(0, turkey.invulnerable - dt);
    return speed;
  }

  return { turkey, reset, jump, step };
}
