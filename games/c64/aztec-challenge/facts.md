# Aztec Challenge — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

- The U.S. Gold release of Cosmi's cassette: a BASIC boot `AC`
  (`$0801`-`$0A65`) and the game `AZTEC`, one file of 28,671 bytes at
  `$1000`-`$7FFE`, both in the KERNAL's own tape format
  (`orientation.md`). Both are in memory at the hand-over byte for byte.
- No build identifier is stored; the boot's title card says
  "COPYRIGHT(C)1983,COSMI,INC.", "BY PAUL NORMAN" and "BASED ON A GAME BY
  ROBERT T.BONIFACIO".
- The program never writes inside its own `$1000`-`$7FFE` except the
  list of trapped tiles at `$5C28` (`$74C2`), and uses nothing above
  `$7FFF` (compared between the hand-over and every level's snapshot).

## Memory layout

| Thing | Where |
|---|---|
| The boot program, BASIC | `$0801`-`$0A65` |
| Start-up and Cosmi logo | `$1000`-`$115A` |
| New game, scorecard, level dispatch | `$115B`-`$12CE` |
| End of a level, scoring | `$1300`-`$147B` |
| Instructions, menu, scorecard labels | `$1480`-`$15B1` |
| The seven levels' instructions | `$1600`-`$1A5F`, 160 screen codes each |
| Routines for Hopaztec and the Piranha, the menu and previews, the music interrupt | `$1A70`-`$1FFD` |
| Sprite shapes `$80`-`$BF` | `$2000`-`$2FFF` |
| Character set A (logo, title, Temple, Hopaztec, Piranha, Bridge) | `$3000`-`$37FF` |
| Character set B (Gauntlet, Stairs, Vermin) | `$3800`-`$3FFF` |
| Logo spiral, SID start values, Piranha's start positions | `$4000`-`$41EF` |
| Sun stone, Temple pillars, room flash colours | `$4200`-`$44BF` |
| Title letters, Stairs' steps | `$4600`-`$4877` |
| Tune C | `$4900`-`$4BFE` |
| Bridge picture, water characters | `$4C00`-`$4FF7` |
| Gauntlet's spear throwers, five frames | `$5000`-`$54AF` |
| Gauntlet's temple | `$5500`-`$56F7` |
| Tune B | `$5700`-`$57FA` |
| Hopaztec's room and edge tables | `$5800`-`$5C20` |
| Trapped tiles (written in play) | `$5C28`-`$5C47` |
| Phase settings, four of 16 bytes | `$5C50`-`$5C8F` |
| Menu and scorecard words | `$5D40`-`$5DB3` |
| Tune A, the pulse and the melody | `$5F00`-`$5FEF` |
| Level 1, the Gauntlet; the music stage changer | `$6000`-`$658A` |
| Level 4, the Vermin | `$6595`-`$6CEB` |
| Level 2, the Stairs | `$6CF5`-`$71FB` |
| Level 5, Hopaztec | `$7200`-`$75DA` |
| Level 3, the Temple | `$75DB`-`$7AFB` |
| Level 7, the Bridge | `$7B00`-`$7E96` |
| Level 6, the Piranha | `$7E98`-`$7FE4` |

Zero page (excluded from the count as runtime): `$02` lives lost, `$03`/`$04`
each player's level and `$05`/`$06` phase as digit characters, `$07` the
preview, `$08` players, `$09` whose turn, `$30`-`$36` the tune's pointers
and tempo, `$45` the progress stage, `$50`-`$5F` the phase's settings,
`$60`-`$67` the two BCD scores, `$68` achievements.

Video: bank 0 throughout; screen `$0400`; `$D018` `$15` (ROM set) for the
menu and scorecard, `$1D` (set A) for levels 3, 5, 6 and 7 and the logo,
`$1F` (set B) for levels 1, 2 and 4.

## Timing

- The game has no frame loop. Each level runs as fast as its delay
  loops let it; nothing waits for the raster except the Stairs' redraw
  (line `$F5`, `$6E90`) and the Vermin's coarse scroll (line 0, `$6643`).
- The interrupt is the KERNAL's own timer interrupt (CIA 1 timer A,
  left as the KERNAL sets it), redirected through `$0314` to `$1C00`,
  which plays the tune and goes on to `$EA31`.

## Controls

- Joystick in port 2 only: every read is `$DC00` (14 in the census) and
  nothing reads `$DC01`. F1 and F3 are read through the KERNAL's GETIN
  (`$1B1A`), RUN/STOP through `$FFE1` on the scorecard and in the
  Stairs, the Vermin and the Temple.
- On the scorecard any stick direction or fire starts the level
  (`$121A`), but only between two delays of about a third of a second.
- Per level (the code): Gauntlet up jumps, down ducks, and any input held
  for 8 passes of the main loop makes the runner fall (`$614F`); Stairs
  input below 7 moves left (left, its diagonals, and up and down alone),
  7 and above right (right, its diagonals, and anything with fire)
  (`$71A0`); Temple right or anything of 8 and more jumps, any other
  input stops (`$7700`); Vermin up high jump, down low jump (`$6B10`);
  Hopaztec up forward, down back, left and right sideways, diagonals and
  fire nothing (`$732A`); Piranha eight directions a pixel at a time,
  fire alone dives, fire with a direction nothing (`$1DE0`); Bridge down
  low, left middle, up high jump (`$7D10`).

## Graphics

- Every moving thing is a sprite, the runner always two (an upper and a
  lower half). The 64 shapes are listed in the listing at `$2000`,
  `$2400`, `$2800` and `$2C00`; `$B2` and `$BA` are never set by any
  routine (no immediate `$B2` or `$BA` in the code).
- The Bridge's gorge (`$4C00`) is drawn with characters 1-127 of set A,
  the same characters as Cosmi's spiral (`$4000`).
- The Gauntlet's approach is three tricks at once: five frames of the
  throwers cycled (`$5000`), the sand scrolled down and a trapezoid of
  ground copied a row down each step (`$616B`), and the temple drawn a
  stage bigger every 88 steps (`$62E0`).

## Mechanics

- A level ends at `$1300` whether won or lost; `$02` = 5 means lost.
  Won: bonus by lives lost (1000, 800, 600, 400, 200; `$1400`), then
  10 points per achievement plus 10 (`$1456`), next level; after the
  seventh, the next phase; after phase 4, the start (`$1390` jumps to
  `$1000`). Lost: only the achievements' points; the same level again.
- Two players alternate after every attempt, won or lost (`$1360`-`$13D5`).
- Every level counts progress in stages `$45`, 0 to 9, and the music
  changes with it (`$6530`); reaching the end of the stages wins:
  Gauntlet when the temple is complete (stage 8, `$62E0`), Stairs 8
  counts of 128 (`$6E45`), Temple 9 stages of 1, 2, 4 or 6 rooms
  (`$75DB`), Vermin 9 stages of 112 scrolled characters (`$6AF1`),
  Piranha 9 stages of two passages off the edge (`$1AB8`), Bridge 9
  stages of 1024 passes (`$7C6B`). Hopaztec wins at tile 44 (`$7320`).
- Phase settings (`$5C50`): see the listing; phase 4 changes the colours
  to night ones (`$5E`/`$5F`).
- Hopaztec's trapped tiles are picked again at the start of every
  attempt from voice 3's noise (`$74C2`): 10, 16, 24 or 32 numbers below
  `$3C` or from `$3F` to `$42`, repeats allowed.
- The Vermin's creature E is placed but never marked as out, because
  the spawner's check for it ORs `#$00` into `$2A` (`$6772`) where the
  others OR in their own bit, so it never moves and is never shown (the
  unused copy at `$6860` has the same, at `$68C7`).
- Creatures A, B, E and F are placed at X 256 plus a random byte, so
  about a third of the time they appear already on the screen's right
  edge rather than walking in (`$67A0`).
- The Temple's collision test (`$79F0`) counts only a touch by the
  runner's lower half alone (latch bits 0-1 equal to 2).
- The Piranha's bite test is skipped whenever fire is held (`$1EA0`),
  but diving, and the drowning count, needs fire alone (`$1DE9`).
- The Bridge counts an achievement on every pass the stick is held in a
  direction that is not fire alone, on the bridge (`$7D4C`).

## Data tables

- Phase settings: `$5C50` + 16 x (phase - 1), copied to `$50`-`$5F` by
  `$1256` (and phase 1's by `$1B09` for the previews).
- Level instructions: `$1600` + 160 x (level - 1), by `$1480`.

## Sound

- The tune is pitches only: six bytes a step, voices 1-3, high byte
  then low, written to `$D401`/`$D400`, `$D408`/`$D407`,
  `$D40F`/`$D40E` every `$36` interrupts (`$1C00`); `$FF` ends it and
  it starts again from `$30`/`$31`. Waveforms and gates are set by the
  levels and `$6530`; no envelope register is ever written after the
  start-up values from `$41C0`.
- Three tunes: A at `$5F00` (a low pulse; from stage 2 the melody at
  `$5F30`), B at `$5700` (the title, and stage 3), C at `$4900` (stage 4).
- Sound effects borrow voice 1: the spears' whoosh (noise, falling
  pitch, `$634E`/`$63D0`, `$7502`), the falls (`$6470`, `$7DD0`); the
  eaten swimmer puts all three voices on noise (`$1B80`).

## The listing's error rate

Sample `sample-20261108`: seed 20261108, 60 of the listing's 313 comments
drawn at random, checked by a checker on claude-fable-5-1 that wrote none
of them. 11 were wrong in a detail and none in its main claim: 18 %, with
a 95 % interval of 10.6 % to 29.9 % (Wilson), a lower bound since a
checker misses some. The kinds: incomplete lists of callers or readers
(`$1000`, `$4300`), a mistake of what a step does (two characters a pass,
not one, in the logo's reveal; `$D40E` is the low byte of a frequency),
positions on the screen worked out wrong (`$6CD0`, `$7600`, `$7808`),
a condition at an edge (`$62E0` after stage 7, `$7000` at line `$F0`,
`$785B`'s first trapdoor), and two of one belief: the `ORA #$00` that keeps
the Vermin's creature E hidden was put in the creature's routine instead
of the spawner's check (`$6700`), and the creatures that start "past the
right edge" are on screen a third of the time (`$67C0`). All 11 were
corrected, with the comments that shared those two beliefs (`$67A0`,
`$681A`, `$683A`, `$6860`). The listing has had no full audit.

## Live tests

All on VICE (vice-mcp v3.13.2), from the snapshots in `orientation.md`,
8 November 2026, at normal speed.

- Every level reached by setting `$03` on the scorecard and pressing fire;
  in phase 1 and phase 4 (`work/levels.py`). Phase 4's colours change
  four of them (above).
- The interrupt at `$1C00` ran 3,601 times in 60 seconds: 60 a second.
- Losing five lives on the Gauntlet with the stick still: back to the
  scorecard on level 1, score 10 (no achievements, plus the extra 10).
- The Gauntlet won by setting the stage `$45` to 8 and its step counter
  `$46` to 1 in the main loop: `$1300` with `$02` = 0, score 1,010, level
  2 on the scorecard.
- Two players: the turn passed after every attempt, won or lost.
- The Vermin, 60 seconds with a jump now and then: `$D015` showed sprites
  0-5 and 7 but never 6, and bit 4 of `$2A` was never set.
- The Piranha, 60 seconds each from the same snapshot: stick centred,
  four lives lost; fire alone, 18 lost (drowned, about 3 seconds each);
  fire with up and fire with left, one bite in the first moments and
  none after.
- The Piranha swimming up: each passage off the top counted one
  achievement and every second one a stage; a lost life set the stage
  back to 0.
- The Bridge, right held 10 seconds on the ground: achievements 0 to 72,
  no jump.
- RUN/STOP on the scorecard: back to the spiral at `$1000`.
