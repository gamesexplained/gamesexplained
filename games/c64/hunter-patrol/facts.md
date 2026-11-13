# Hunter Patrol: verified technical facts

Current truth for this game. Unless marked *live*, a fact comes from reading the code in `work/play-start.vsf` (see `orientation.md`).

## Build

A Remember crack: `HUNTER PATROL+`, a packed program loaded at `$0801`, and the highscore file `H.PATROL HI /REM` at `$0C00`. The game's own code is `$1170-$2FA8`; the cracker's code is `$0C55-$0CEF` (highscore load), the menu in RAM under the KERNAL (`$F142` was where it waited, *live*) and the documents at `$C000`.

## Memory layout

| Thing | Where |
|---|---|
| Engine: title, input, scroll, objects, hits, sound effects | `$1170-$2FA8` |
| Title and status screen text, screen matrix `$4400`, character set `$4800` (video bank 1) | `$4000-$4FFF` |
| Sprite shapes (pointer x 64 + `$4000`) | `$5000-$7FFF` |
| Sprite register tables for the two bands | `$8060`, `$8090` (47 bytes each); pointers `$8520`, `$8528` |
| Shot records, sixteen bytes each | `$80C0` |
| Second object family, four records of sixteen bytes | `$8530` |
| Templates for it | `$8570` |
| Third family | `$8670` |
| Ground installations: twelve records of three bytes | `$87A0` |
| Enemy planes and their template table | `$8880`, `$88A0` |
| Music driver and tune data | `$A000-$AE40` |

## Timing

- The raster interrupt `$13AB` runs three times a frame; `$20` counts the band (0, 1, 2).
- `$1E` counts passes of the main loop at `$1466`. The stick is acted on every 8th pass (`$193C`), the ground scrolls every 8th (`$1720`), a ground installation starts every 32nd (`$2900`).
- The music's timer period is 18,433 cycles (`$DC04` and `$DC05` set to `$4800` by `$ADD0`), 53.45 calls a second on a PAL machine.

## Controls

The stick is read at `$DC01` (port one), `$0D14` returns it, `$1F` holds it. Up sets the climb rate `$37` to `$FF`, down to `1`, left sets the scroll speed `$22` to `$FE`, right to `2`. *live*, 13 November 2026, from `work/play-start.vsf`, 24 frames each. The plane's x position `$8060` stays `$A0`.

## Mechanics

| Variable | Meaning |
|---|---|
| `$13-$17` | score, five decimal digits |
| `$40` | lives, 4 at the start, at most 9 |
| `$41` | kinds of defence destroyed, 0 to 3; `$80` for the target run |
| `$42` | hits still needed for this kind of defence (5, 10, 20, 20 by level) |
| `$43` | planes left for the strafing runs |
| `$44` | level, 0 to 3, then round to 0 |
| `$45` | hits on the target |
| `$3F` | crash state; non-zero while the plane explodes |
| `$3D`, `$3E` | sprite collision latches written by the interrupt |

## Sound

Voice 3 runs as a noise source for random numbers (`$1900`, `$1920`). The engine note on voice 1 follows the plane's height (`$25A0`). The music driver installs itself when called at `$A000` and is replaced at the start of play.

## The listing's error rate

Not sampled. This run was on a model the kit does not list as proven, and the comments have not been checked by another model (`kit/CHECKING.md`).

## Live tests

- Controls, 13 November 2026: as above.
- Interrupt vector `$0314`: `$AE03` on the title screen, `$13AB` in play.
- Strafing run: the prompt "STRAFING RUN AIRCRAFT NO.3" appeared with 3 lives, then NO.2 and NO.1 as lives fell (`reference/strafing-prompt.png`).
