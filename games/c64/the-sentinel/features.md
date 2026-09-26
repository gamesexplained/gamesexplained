# The Sentinel — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The Firebird manual (Commodore 64 and BBC Micro, one booklet), full text
  at https://archive.org/details/Sentinel_The_1984_Firebird_Software, read
  25 September 2026. It outranks the others.
- C64-Wiki, https://www.c64-wiki.com/wiki/The_Sentinel, read 25 September
  2026: infobox, description, key list, energy values, screenshots.
- Wikipedia, https://en.wikipedia.org/wiki/The_Sentinel_(video_game), read
  25 September 2026: the C64 conversion is by Geoff Crammond himself.
- Zzap!64 issue 20, December 1986, the C64 review (Gold Medal), as indexed
  at https://amr.abime.net/review_53120, read 25 September 2026.
- Simon Owen's secret-code generator, https://github.com/simonowen/sentcode,
  read 25 September 2026: the random number generator and how the code is
  made, for every version; it says the BBC and C64 versions make their
  digits the same way.
- Mark Moxon's documented reconstruction of the **BBC Micro** original,
  https://thesentinel.bbcelite.com/, read 25 September 2026. It describes
  the BBC code, not this one; anything taken from it is a guess about the
  C64 code until the C64 code shows it.

## Features

| Feature | Status | Where |
|---|---|---|
| Title screen, `THE SENTINEL`, `PRESS ANY KEY` | live | `reference/title.png`; the letters are 3D blocks (`$3282`, `$32C6`) |
| `LANDSCAPE NUMBER?`: four digits, 0000 to 9999 (manual) | live (eight landscapes typed) | `reference/landscape-number-prompt.png`; `$32D5` with A = 4 from `$103C`; RETURN alone gives 0000 (`$32EC`) |
| Landscape 0000 needs no code; every other landscape asks `SECRET ENTRY CODE?`, eight digits (manual, wiki) | live (0001: a wrong code refused, the published code accepted) | `reference/secret-entry-code-prompt.png`, `reference/wrong-secret-code.png`; `$104D`-`$106B`, check `$14AA` |
| Before play, the landscape is shown from above with the Sentinel and any sentries on it, but not the player (wiki) | live; it shows no trees either: it is drawn before the player and the trees are placed (`$8858`) | `reference/landscape-0000-overview.png`, `reference/landscape-0001-overview.png` |
| 10,000 landscapes, generated rather than stored (wiki, Wikipedia) | confirmed: the port of `$2ACC` and the placement routines reproduces eight recorded landscapes and all 10,000 codes | `facts.md` "Landscape generation" |
| First-person view of the landscape from the player's robot (the Synthoid) | live | `reference/play-l0000-first-view.png` |
| Pan left and right: S and D (manual, wiki) | traced; live only with a test patch, because the code that scrolls the picture (`$B000`-`$B5FF`) is missing from this copy | `$10B7`, `$96A6`, `$367C` |
| Look up and down: L and `,` (wiki) | live (with the test patch), pitch limited to `$35`-`$CD` | `reference/play-looking-down-at-the-chequerboard.png`; `$114B`/`$114C` |
| U-turn, 180 degrees at once: U (manual, wiki) | live | `$1B2B`-`$1B39`; once per press, re-armed at `$11EA` |
| Sights on and off: SPACE; the pan keys then move the sights (manual, wiki) | live | sprite 0, `$11AE`-`$11FE`, `$9958` |
| Absorb: A, aimed at the square an object stands on; the square must be visible, except for a boulder, which can be absorbed by its side (wiki) | live (a tree: 9 → 10 units); the boulder's side traced | `$1B8E`; `$1E48`-`$1E68` |
| Energy values: tree 1, boulder 2, robot 3, Sentinel and sentry 4, meanie 1 (wiki) | differs: a sentry is worth 3, as on the BBC; the rest as the wiki says (tree, boulder and robot live) | `$214F` |
| Create a tree (T, 1 unit), a boulder (B, 2 units), a robot (R, 3 units), on an empty visible square below eye height or on top of a boulder (manual, wiki) | live (T 10 → 9, B 10 → 8, R 8 → 5, the robot on the boulder); eye height not tested | `reference/play-tree-created.png`, `reference/play-robot-on-a-boulder.png`; `$1BBA`, `$1F16` |
| Boulders stack; an object can stand on a boulder (manual) | live (a robot on a boulder); traced: anything can stand on a boulder or on the tower | `$1F16` |
| Transfer: Q moves the player into a robot they have made; the view then faces the old robot (manual, wiki) | live (transfer); traced: a new robot is made facing back along its maker's line of sight (`$1BDB`-`$1BE7`) | `reference/play-after-transfer-scanner-full.png`; `$1B64`-`$1B6C` |
| Hyperspace: H, costs 3 units, makes a robot at a random place at the same height or lower and moves the player into it; with fewer than 3 units the player is destroyed (manual) | live (10 → 7; with 2 units, game over) | `reference/play-after-hyperspace.png`; `$2156` |
| Starting energy 10 units (wiki) | live | `$1457` |
| Energy shown as icons at the top left: tree 1, boulder 2, robot 3, gold robot 15 (manual, wiki) | live for tree, boulder and robot (10, 9, 8, 5 units); the gold robot traced | characters 240-249, `$9508`, `$ABB0` |
| The total energy on a landscape stays the same: energy the enemies take reappears as trees (manual, wiki) | traced | each enemy counts what it takes (`$0C88`+n, `$1A4F`) and turns it into trees (`$1A5D`) |
| The Sentinel and sentries stay still until the player first spends or absorbs energy (manual); the wiki says a U-turn wakes them and a plain pan does not | live (20 s idle, no turn; turning after a U-turn); traced: any action key wakes them, even one that fails; pans do not. The wiki is right | `$12E1`, `$0CE5` |
| The Sentinel turns in steps, 30 degrees every ten seconds (wiki) | differs: 28.1° (20/256) about every 15 s (live) | `$1813`, `$9D37` |
| An enemy that sees a square holding more than 1 unit absorbs it down to 1 and a tree appears somewhere else (manual) | traced: one unit at a time, boulder to tree, a tree taken off a stack, an empty robot to a boulder | `$1AB0`, `$1A08`-`$1A4B`, `$1A5D` |
| Scanner at the top right: it fills with specks while an enemy sees the player; when full, the player loses one unit about every five seconds; half-filled means the enemy sees the robot but not its square (manual, wiki) | live (the scanner fills; one unit every 2.6 s, not 5); half-filled traced | sprites 1-3, `$163F`; drain `$1835`, `$1848` |
| Meanie: when an enemy sees the robot but not its square, a tree near the player turns into a meanie, which turns quickly and forces a hyperspace when it sees the player (manual, wiki) | traced | `$19B5`-`$19E0`, `$1728`, `$171D` |
| Energy below zero destroys the player, and a picture shows which enemy did it (wiki) | live (the Sentinel, drawn in dots) | `reference/death-seen-by-the-sentinel.png`; `$0C1C`, `$87DA` |
| Winning a landscape: absorb the Sentinel, make a robot on its pedestal, transfer, then hyperspace; the game shows the next landscape's number and its eight-digit code (manual, wiki) | traced | `$2184`-`$219D`, `$1A87`-`$1AA8`, `$33B7` |
| The next landscape number is the current one plus the energy left after the final hyperspace (manual) | traced; past 9999 the carry is dropped | `$1A87`-`$1A95` |
| After the Sentinel is absorbed, nothing more can be absorbed, but creating and transferring still work (manual) | traced | `$1B8E`-`$1B91` |
| Later landscapes: rougher ground, and sentries as well as the Sentinel, several at a time above landscape 1000 (wiki) | differs in part: the enemy count grows with the thousands digit (`$3426`) and is at most the tens digit + 1 below 0100; the steepness is drawn at random for every landscape, 14 to 36 (`$3451`), and does not grow | `facts.md` "Landscape generation" |
| Pause and continue: the cursor keys (manual; the wiki says → and ↓) | live: CRSR ←→ pauses, CRSR ↑↓ continues (the C64's two cursor keys) | `reference/paused-scanner-solid.png`; `$34BA` |
| Sound volume: 8 and 7 (wiki) | live (7 down, 8 up; 16 levels) | `$347D`-`$34A8` |
| Abort the game: F1 (wiki) | live | `$11A3`, `$0C64` |
| Sound: creaks, hums and hisses; a meanie makes a scratching sound (wiki, manual) | traced: seven SID sounds, one of them a meanie turning, and five tunes; the page's port of the driver matches the game's own code run in a 6502 simulator, frame by frame (not heard in the emulator: this run had no audio output) | `$AC00`, `$1750`, `$AB50` |

## Beyond the documentation

Found in the code, not in the manual.

- The program is the BBC Micro original recompiled, most of it at the same
  addresses, with a C64 layer that answers the BBC's operating-system
  calls (`facts.md` "The BBC operating system, rebuilt").
- The view is drawn into a hidden bitmap and copied into five character
  sets, switched by a raster interrupt every 40 lines (`facts.md`
  "Graphics").
- The enemies' clock runs at 13.4 ticks a second on the C64, against the
  BBC's 16.7 (`$130C`).
- A U-turn plays the last notes of the transfer tune (`$1B3C`).
- Zero is printed as the letter O, in the number entry too (`$31F6`).
- The anti-cracker traps of the BBC version survive (`facts.md`).
- BBC BASIC's own code fills the gaps between the tables (`facts.md`
  "Leftovers").

## Open questions

- What the missing `$B000`-`$B5FF` does beyond scrolling the picture.
- Whether a square above the player's eye can be targeted: not tested.
- Why the drain measured 2.6 s a unit when the timer read gives 2.2 s.
