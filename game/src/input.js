// Keyboard and pointer input. Held keys give the running state each frame
// (jump is edge-triggered, dash and hide are held); one-shot presses (start,
// restart, pause) are queued as bit flags and taken once by the loop, so a
// press between two frames is never lost and never counted twice. Pointer
// clicks are reported with canvas coordinates so the loop can hit-test the
// menu buttons drawn on the canvas.
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const JUMP = new Set(['Space', 'ArrowUp', 'KeyW', 'KeyJ']);
const DASH = new Set(['ShiftLeft', 'ShiftRight']);
const HIDE = new Set(['KeyH', 'ArrowDown', 'KeyS']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(canvas) {
  let jumpHeld = false;
  let jumpQueued = false;
  let dashHeld = false;
  let hideHeld = false;
  let actions = 0;
  let clicks = [];

  window.addEventListener('keydown', (event) => {
    if (JUMP.has(event.code)) {
      if (!event.repeat) jumpQueued = true;
      jumpHeld = true;
    } else if (DASH.has(event.code)) {
      dashHeld = true;
    } else if (HIDE.has(event.code)) {
      hideHeld = true;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else {
      return;
    }
    // Space and Enter both jump and confirm: the same press starts the game
    // on the title screen and jumps during play.
    if (CONFIRM.has(event.code) && !event.repeat) actions |= ACTION_CONFIRM;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (JUMP.has(event.code)) jumpHeld = false;
    else if (DASH.has(event.code)) dashHeld = false;
    else if (HIDE.has(event.code)) hideHeld = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of all.
  window.addEventListener('blur', () => {
    jumpHeld = false;
    dashHeld = false;
    hideHeld = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = FIELD.width / rect.width;
    const scaleY = FIELD.height / rect.height;
    clicks.push({
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    });
    actions |= ACTION_CONFIRM;
  });

  return {
    /** The held-key state for this frame's world step. */
    controls() {
      const jump = jumpQueued;
      jumpQueued = false;
      return { jump, dash: dashHeld, hide: hideHeld, left: false, right: false };
    },
    /** One-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Click positions (logical canvas coordinates) since the last call. */
    takeClicks() {
      const taken = clicks;
      clicks = [];
      return taken;
    },
  };
}
