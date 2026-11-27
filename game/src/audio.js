// Original sound, synthesized live with WebAudio — no audio files at all.
// A gobble is a fast burst of low square-wave blips; the music is a cheerful
// little banjo-ish loop (triangle wave + a walking bass) that speeds up when
// the farmer gets close. Everything is guarded: no AudioContext exists until
// the player first presses a key or clicks, so the title screen stays silent
// and the screenshot scenes never need audio.

const MUSIC = [
  // [midi note, beats] — a bouncy farmyard tune in C major.
  [72, 0.5], [76, 0.5], [79, 0.5], [76, 0.5], [74, 0.5], [72, 0.5],
  [69, 1], [67, 1], [72, 0.5], [76, 0.5], [79, 1], [81, 0.5],
  [79, 0.5], [76, 0.5], [74, 0.5], [72, 1], [74, 0.5], [76, 0.5],
  [77, 1], [76, 0.5], [74, 0.5], [72, 1], [67, 1.5], [0, 0.5],
];
const BASS = [48, 55, 48, 55, 45, 55, 48, 55, 48, 55, 45, 55];

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function createAudio() {
  let context = null;
  let master = null;
  let musicGain = null;
  let musicTimer = null;
  let beat = 0;
  let musicOn = false;
  let danger = false;

  function ensure() {
    if (context !== null) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
      musicGain = context.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
      return true;
    } catch {
      return false;
    }
  }

  function unlock() {
    if (ensure() && context.state === 'suspended') context.resume().catch(() => {});
  }

  function blip(freq, duration, type, volume, when = 0, slideTo = null) {
    if (!ensure()) return;
    const start = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function gobble() {
    if (!ensure()) return;
    // Gobble-gobble: five quick falling blips, like a turkey clearing its throat.
    for (let index = 0; index < 5; index += 1) {
      blip(320 - index * 28, 0.09, 'square', 0.22, index * 0.07, 180 - index * 20);
    }
  }

  function jumpSound() {
    blip(300, 0.16, 'sine', 0.2, 0, 620);
  }

  function cornSound() {
    blip(880, 0.08, 'triangle', 0.25);
    blip(1318, 0.12, 'triangle', 0.22, 0.07);
  }

  function hitSound() {
    blip(180, 0.3, 'sawtooth', 0.3, 0, 60);
    blip(90, 0.25, 'square', 0.2, 0.02, 50);
  }

  function caughtSound() {
    // A sad little descending trombone for the end of the escape.
    blip(392, 0.35, 'sawtooth', 0.25, 0, 370);
    blip(330, 0.35, 'sawtooth', 0.25, 0.3, 300);
    blip(262, 0.6, 'sawtooth', 0.25, 0.6, 196);
  }

  function escapedSound() {
    // A happy little fanfare for getting away.
    [72, 76, 79, 84].forEach((note, index) => {
      blip(midiToFreq(note), 0.22, 'triangle', 0.28, index * 0.12);
    });
  }

  function spottedSound() {
    blip(1100, 0.09, 'square', 0.18);
    blip(1100, 0.09, 'square', 0.18, 0.12);
  }

  function hideSound() {
    blip(500, 0.12, 'sine', 0.15, 0, 260);
  }

  function dashSound() {
    blip(220, 0.25, 'sawtooth', 0.12, 0, 880);
  }

  function scheduleBeat() {
    if (!musicOn || context === null) return;
    const tempo = danger ? 0.16 : 0.21;
    const step = MUSIC[beat % MUSIC.length];
    const bass = BASS[beat % BASS.length];
    if (step[0] > 0) blip(midiToFreq(step[0]), step[1] * tempo * 0.9, 'triangle', 0.5);
    blip(midiToFreq(bass), 0.18, 'sine', 0.5);
    beat += 1;
    musicTimer = window.setTimeout(scheduleBeat, step[1] * tempo * 1000);
  }

  function startMusic() {
    if (!ensure()) return;
    if (musicOn) return;
    musicOn = true;
    beat = 0;
    scheduleBeat();
  }

  function stopMusic() {
    musicOn = false;
    if (musicTimer !== null) {
      window.clearTimeout(musicTimer);
      musicTimer = null;
    }
  }

  /** The farmer is close: the music hurries up. */
  function setDanger(close) {
    danger = close;
  }

  return {
    unlock, gobble, jumpSound, cornSound, hitSound, caughtSound, escapedSound,
    spottedSound, hideSound, dashSound, startMusic, stopMusic, setDanger,
  };
}
