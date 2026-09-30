# Fat Worm Blows a Sparky — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- Inlay text and instructions, transcribed by David Corbett for World of
  Spectrum, `https://worldofspectrum.net/pub/sinclair/games-info/f/FatWormBlowsASparky.txt`, read 29 September 2026. Dated 1985 on the inlay,
  released 20 October 1986.
- CRASH issue 34, November 1986, review at `http://www.crashonline.org.uk/34/fatworm.htm`, read 29 September 2026.
- Wikipedia, `https://en.wikipedia.org/wiki/Fat_Worm_Blows_a_Sparky`, read
  29 September 2026.
- Julian Todd's own page (archived), `https://web.archive.org/web/20070928094115/http://www.goatchurch.org.uk/progs/fatworm/fatworm.html`, read 29 September 2026.
- Spectrum Computing entry 1736, `https://spectrumcomputing.co.uk/entry/1736/ZX-Spectrum/Fat_Worm_Blows_a_Sparky`, read 29 September 2026.

## Features

| Feature | Status | Where |
|---|---|---|
| Collect 50 spindles, then find the disk drive and clone the worm to finish | open | manual; HUD counts `SPINDLES` |
| Four bugs on the worm is a fatal error (death) | open | manual; CRASH |
| Blaster sparkies: horizontal shots from the nose | open | manual, fired with SPACE |
| Burper sparkies: mines laid with `1`, rise to a Sputnik overhead | open | manual |
| A very high Sputnik passes above a burper and survives | open | manual |
| Burpers also destroy Crawlies that touch them, and change the worm's direction | open | CRASH |
| A misfired burper on the PCB can be eaten and fired again | open | manual |
| Extra sparkies are awarded for spindles, and picked up on the data buses | open | manual |
| Ramps let the worm climb onto the data buses | open | manual |
| De-bugger: a black-and-white striped block; crawl under it to shed all bugs | open | manual |
| Sputniks: creeper bugs that fly low over the board | open | manual, CRASH |
| Crawlies: erupt from the board surface and chase, or attach | open | manual, CRASH |
| Insert map, bottom left: nearby spindles (white dots) and rough position | open | manual; HUD |
| Solid 3D perspective: flat at the centre, sides visible at the edge | open | Wikipedia, CRASH, dev page |
| `Q` faster, `A` slower, `O` rotate left, `P` rotate right | open | manual |
| Redefinable keys; Kempston, Protek, Interface 2 and others | open | manual, CRASH |
| `H` halts play and runs a "bouncing ball routine" | open | manual |
| `G` ends the game | open | manual |
| Score for killing bugs and collecting spindles; separate hi-score | open | manual; HUD |
| HUD shows sparkies left, spindles still to collect, score, hi-score | open | manual; live |
| Title-screen tune | open | CRASH |
| "£100 REWARD" anti-piracy forgery warning before the menu | open | live |
| Opening menu: `1` redefine keys, `2` Kempston joystick, `0` start | open | live |
| The whole world is a circuit board seen from above | open | all sources |

## Beyond the documentation

Found in the code, not in the manual.

- The tape's own turbo loader, and the BASIC wrapper that calls it
  (`orientation.md`).

## Open questions

- Whether the difficulty ramps with progress ("the monsters get tougher"),
  and by what table (the author says it does; the manual does not).
- Whether a level/height system exists ("floors above the starting point
  which you don't fall below once you have reached them" — the author
  describes this as what the game *lacked*, so it may not be here).
