# Choplifter — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources: the C64 manual scanned at
`https://archive.org/details/Choplifter_1982_Broderbund` (text only; no
images were taken from it), the C64 entry on c64-wiki
(`https://www.c64-wiki.com/wiki/Choplifter`), the game's own title screen,
and play in the emulator. Every screenshot in `reference/` was taken from
the emulator during this run.

## Features

| Feature | Status | Where |
|---|---|---|
| Helicopter flown with a joystick in control port 1 | live | read at `$DC01` from `$976A`, `$97AD`, `$A71A`, `$A741` |
| A short press of the fire button shoots | live | `$9774` compares the hold counter `$96` with 15; under 15 it calls `$97D2` |
| A longer press turns the helicopter | live | 15 or more calls `$97F1`; the turn continues while the button is held |
| Direction of the turn follows the stick | differs | the stick is read only when `$59` is 0 or ±1. At a full facing the hold simply flips the machine to the other side, whatever the stick does (`$9816`) |
| 64 hostages in total | confirmed | `$0CEE + $0CEF` is compared with `#$40` at `$9683` |
| Hostages are held in sheds that have to be blown open | live | `$B652` sets `$0CF4,x`; the shed body switches from shape 71 to 72 |
| Eighteen hostages per barracks | differs | `$BE52` puts 16 in each of sheds 1 to 3 and 8 in shed 4, which starts open |
| At most 16 hostages ride at once | confirmed | `$9D18` refuses to board when `$0CF1` holds 16 |
| Hostages walk to the helicopter and climb in | live | `$9B7D`; boarding at a signed distance of +8/+9 or −11/−10 |
| The helicopter can run its own people over | confirmed | a hostage at −9 to +7 with the machine down and still is killed (`$9E14`) |
| Status bar counts killed, aboard and delivered | live | three BCD counters written by `$A978`; `$0CFC`, `$0CFE`, `$0CFD` |
| Tanks attack from the far side of the border | live | actor type 3, handler `$A0BB`, five gun elevations |
| Jets appear after the first sortie | confirmed | the type-9 cap at `$A3B6` is 0 at difficulty 0 and rises to 1 and 2 |
| Drones appear on the third sortie | traced | actor type 10, handler `$B73D`, released from sortie 2 on, one at a time, homing on the helicopter. The shared emulator stayed on sortie 0 for the whole watch, so this rests on the code and the shape, not on seeing one |
| Three helicopters per game | open | the life count was not located; `$61` marks the machine destroyed and `$96E4`/`$96E8` end the game, but the counter itself was not identified |
| No points are scored, only hostages counted | confirmed | there is no score variable; the only counters are the three on the bar |
| Sorties are announced as FIRST / SECOND / THIRD SORTIE | live | message table at `$8AD7`, drawn into a raster text window by `$8A8B` |
| THE END and MAGNIFICENT! end messages | confirmed | same table, shown from `$96E4` and `$96E8` |
| RUN/STOP pauses | live | `$98BC` reads the KERNAL scan code `$3F` from `$C5` |
| Q ends the game | open | no read of the Q key was found. The game's only keyboard input is the RUN/STOP poll at `$98BC`, reached through `$C5`, and the only other keyboard code is the KERNAL scan the raster handler calls. Searched: every `$DC00`/`$DC01`/`$C5`/`$CB`/`$0277` access in `$8000`-`$BFFF`, and every immediate comparison against the matrix code for Q (`$3E`) and its PETSCII (`$51`) |

## Beyond the documentation

- The program is a 16 KB cartridge image with a `CBM80` autostart header at
  `$8000` and a loader bolted on the front.
- No hardware sprites at all. Everything is software-plotted into a
  multicolour bitmap, double buffered across the two VIC banks.
- 4 KB of pre-shifted byte tables at `$1000`-`$1FFF`, hidden under the
  character ROM's shadow, so the blitter never shifts at run time.
- The ground is the background colour register, not drawn pixels.
- The NMI vector points at the `rti` that ends the raster interrupt handler.
- The main loop runs about 21 times a second against a 51 Hz raster.
- A shot fired anywhere but fully side-on can never hit anything.
- The right-hand tank spawn puts the tank outside the world, where it is
  deleted on its first update.
- The actor free list is built four links too long.
- Both engine voices are the SID's noise waveform.

## Open questions

- The life count. Three helicopters per game is documented and the game
  plainly ends, but the variable holding the count was not identified.
- The Q key. Documented as "ends the game" and not found; the search is
  described in the table above.
- What the parallax blob, shape 70, is meant to depict.
- Whether the right-hand tank spawn is a slip or deliberate.
