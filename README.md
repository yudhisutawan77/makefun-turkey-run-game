![make.fun](https://make.fun/badge/turkey-run-game-01.svg)
![rank](https://make.fun/badge/turkey-run-game-01/yudhisutawan77/makefun-turkey-run-game/rank.svg)
![reward](https://make.fun/badge/turkey-run-game-01/yudhisutawan77/makefun-turkey-run-game/reward.svg)

# Gobble Dash — Turkey Escape

Thanksgiving is coming, and you are the turkey. Run the farmyard, the barn
and the kitchen, outrun the farmer, dodge the ovens and the falling carving
knives — and do not end up on the table. Cover 1,000 metres and you escape.

An entry for the [turkey escape game bounty](https://make.fun/bounty/turkey-run-game-01)
on make.fun.

## How to play

- **Run** — the turkey runs on its own; the world scrolls past.
- **Jump** — `Space`, `↑` or `W`: clear ovens, fences and stuck knives.
- **Gobble dash** — hold `Shift`: a burst of speed that burns stamina.
  Corn refills it.
- **Hide** — press `H` (or `↓` / `S`) next to a haystack: the turkey ducks
  into the hay and the farmer searches the stack. Stay too long and he
  sniffs you out.
- **Pause** — `P` or `Esc`. Click the on-screen buttons to start, resume
  and run again.

## The chase

The farmer is always behind you. Run clean and the gap opens; stumble into
an oven, a knife or a fence and he closes in fast. When he is right behind
you the screen warns you — and the music hurries up. Get caught three times
and dinner is served. Grab corn for points and stamina; every oven and knife
you leave behind is bonus points.

Three stages, each harder than the last: the **farmyard** (0–300 m), **the
barn** (300–650 m) and **the kitchen** (650 m and on), where the ovens slide
faster and the knives fall quicker. Escape at 1,000 m.

## Sound

All sound is synthesized live with WebAudio — a gobble, a jump blip, corn
chimes, a danger sting, a sad trombone when you are caught, a fanfare when
you escape, and a cheerful banjo-ish loop that speeds up when the farmer
gets close. No audio files, no network requests.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Screenshot scenes (deterministic, seeded): `?shot=start|play|kitchen|end&seed=1`.

## Screenshots

1. `1-title.jpg` — the title screen, with the turkey idling in the farmyard.
2. `2-play.jpg` — mid-run in the farmyard: HUD, corn, a sliding oven, the farmer closing in.
3. `3-kitchen.jpg` — the kitchen stage: chequered tiles, the roast on the table, faster knives.
4. `4-end.jpg` — the end screen after the farmer finally catches the turkey.

## File layout

```
main.ts                  hand-in program: copies game/ + screenshots/ to /output,
                         writes /output/dossier.json
serve.ts                 tiny static server for local play
game/
  index.html             the page: one canvas, one module script
  src/
    config.js            all tuning numbers, stages and the palette
    random.js            seeded RNG (mulberry32) for repeatable runs
    turkey.js            the turkey: run, jump, hide, gobble dash, stamina
    farmer.js            the farmer AI: chase, search the haystack, slip
    world.js             rules: scrolling, spawning, collisions, score, lives
    render.js            all canvas art: turkey, farmer, farm, barn, kitchen, HUD
    audio.js             WebAudio synth: gobble, music, stings, fanfares
    input.js             keyboard + pointer input, one-shot action flags
    shots.js             deterministic screenshot scenes (?shot=…)
    main.js              boot, the fixed-step loop, screens, best distance
screenshots/            4 renders of the game itself (title, play, kitchen, end)
vendor/
  makefun-game.ts        the kit's dossier library, unchanged
```

## License

MIT — see LICENSE.
