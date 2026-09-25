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
| Title screen, `THE SENTINEL`, `PRESS ANY KEY` | live | `reference/title.png` |
| `LANDSCAPE NUMBER?`: four digits, 0000 to 9999 (manual) | live (0000 typed and accepted) | `reference/landscape-number-prompt.png` |
| Landscape 0000 needs no code; every other landscape asks `SECRET ENTRY CODE?`, eight digits (manual, wiki) | open (0000 seen live) | |
| Before play, the landscape is shown from above with the Sentinel and any sentries on it, but not the player (wiki) | live (0000) | `reference/landscape-0000-overview.png` |
| 10,000 landscapes, generated rather than stored (wiki, Wikipedia) | open | |
| First-person view of the landscape from the player's robot (the Synthoid) | live | `reference/play-l0000-first-view.png` |
| Pan left and right: S and D (manual, wiki) | open | |
| Look up and down: L and `,` (wiki) | open | |
| U-turn, 180 degrees at once: U (manual, wiki) | open | |
| Sights on and off: SPACE; the pan keys then move the sights (manual, wiki) | open | |
| Absorb: A, aimed at the square an object stands on; the square must be visible, except for a boulder, which can be absorbed by its side (wiki) | open | |
| Energy values: tree 1, boulder 2, robot 3, Sentinel and sentry 4, meanie 1 (wiki) | open | |
| Create a tree (T, 1 unit), a boulder (B, 2 units), a robot (R, 3 units), on an empty visible square below eye height or on top of a boulder (manual, wiki) | open | |
| Boulders stack; an object can stand on a boulder (manual) | open | |
| Transfer: Q moves the player into a robot they have made; the view then faces the old robot (manual, wiki) | open | |
| Hyperspace: H, costs 3 units, makes a robot at a random place at the same height or lower and moves the player into it; with fewer than 3 units the player is destroyed (manual) | open | |
| Starting energy 10 units (wiki) | open | |
| Energy shown as icons at the top left: tree 1, boulder 2, robot 3, gold robot 15 (manual, wiki) | open (icons seen live) | |
| The total energy on a landscape stays the same: energy the enemies take reappears as trees (manual, wiki) | open | |
| The Sentinel and sentries stay still until the player first spends or absorbs energy (manual); the wiki says a U-turn wakes them and a plain pan does not | open | |
| The Sentinel turns in steps, 30 degrees every ten seconds (wiki) | open | |
| An enemy that sees a square holding more than 1 unit absorbs it down to 1 and a tree appears somewhere else (manual) | open | |
| Scanner at the top right: it fills with specks while an enemy sees the player; when full, the player loses one unit about every five seconds; half-filled means the enemy sees the robot but not its square (manual, wiki) | open | |
| Meanie: when an enemy sees the robot but not its square, a tree near the player turns into a meanie, which turns quickly and forces a hyperspace when it sees the player (manual, wiki) | open | |
| Energy below zero destroys the player, and a picture shows which enemy did it (wiki) | open | |
| Winning a landscape: absorb the Sentinel, make a robot on its pedestal, transfer, then hyperspace; the game shows the next landscape's number and its eight-digit code (manual, wiki) | open | |
| The next landscape number is the current one plus the energy left after the final hyperspace (manual) | open | |
| After the Sentinel is absorbed, nothing more can be absorbed, but creating and transferring still work (manual) | open | |
| Later landscapes: rougher ground, and sentries as well as the Sentinel, several at a time above landscape 1000 (wiki) | open | |
| Pause and continue: the cursor keys (manual; the wiki says → and ↓) | open | |
| Sound volume: 8 and 7 (wiki) | open | |
| Abort the game: F1 (wiki) | open | |
| Sound: creaks, hums and hisses; a meanie makes a scratching sound (wiki, manual) | open | |

## Beyond the documentation

Found in the code, not in the manual.

- The game builds a table of `JMP` instructions at `$FFC2`-`$FFF6` when it
  starts (`$8900`). The addresses are those of the BBC Micro operating
  system's entry points (`$FFE0` OSRDCH, `$FFEE` OSWRCH, `$FFF1` OSWORD,
  `$FFF4` OSBYTE, `$FFC2` and `$FFC5` GSINIT and GSREAD on the BBC). Whether
  the C64 code calls them in the BBC way is open.
- The play screen is multicolour text mode with five character sets swapped
  by a raster interrupt every 40 lines (`orientation.md`).

## Open questions
