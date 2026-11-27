// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between four screens: title,
// play, paused and game over (caught or escaped).
//
// ?seed=N fixes the run. ?shot=start|play|kitchen|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CAUGHT, EVENT_CORN, EVENT_ESCAPED, EVENT_HIDE, EVENT_HIT, EVENT_JUMP, EVENT_SPOTTED } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best distance then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, performance.now() / 1000);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let buttons = {};

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    audio.gobble();
    audio.startMusic();
    world.reset();
    input.takeClicks();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Run from the farmer, dodge the ovens, mind the knives.');
  }

  function endGame(escaped) {
    screen = SCREEN_OVER;
    audio.stopMusic();
    // Drain any press made to jump a moment before the catch, so it does
    // not instantly restart the game from the end screen.
    input.takeActions();
    input.takeClicks();
    if (escaped) audio.escapedSound();
    else audio.caughtSound();
    const distance = Math.floor(world.state.distance);
    if (distance > best) {
      best = distance;
      saveBest(best);
    }
    announce(escaped ? `Escaped! ${distance} metres. Best ${best}.` : `Caught after ${distance} metres. Best ${best}.`);
  }

  function clicked(button) {
    if (!button) return false;
    const clicks = input.takeClicks();
    return clicks.some((click) => click.x >= button.x && click.x <= button.x + button.w && click.y >= button.y && click.y <= button.y + button.h);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM || clicked(buttons.start)) startGame();
    } else if (screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM || clicked(buttons.restart)) startGame();
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM) || clicked(buttons.resume)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      audio.stopMusic();
      announce('Paused.');
    }
  }

  function react(events) {
    if (events & EVENT_JUMP) audio.jumpSound();
    if (events & EVENT_CORN) audio.cornSound();
    if (events & EVENT_HIDE) audio.hideSound();
    if (events & EVENT_SPOTTED) audio.spottedSound();
    if (events & EVENT_HIT) {
      audio.hitSound();
      announce(world.state.lives === 1 ? 'Hit. 1 life left.' : `Hit. ${world.state.lives} lives left.`);
    }
    if (events & EVENT_CAUGHT) endGame(false);
    else if (events & EVENT_ESCAPED) endGame(true);
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { jump: false, dash: false, hide: false }, true);
      return;
    }
    const events = world.step(STEP, input.controls(), false);
    audio.setDanger(world.state.spotted);
    react(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    const drawn = renderer.draw(world.state, screen, best, now / 1000);
    buttons = drawn.buttons;
  }

  // Leaving the tab pauses a running game rather than letting the farmer catch the turkey unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      audio.stopMusic();
      announce('Paused.');
    }
  });

  announce('Gobble Dash, turkey escape. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
