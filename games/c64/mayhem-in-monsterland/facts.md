# Mayhem in Monsterland — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

This file holds what is true of the game as a whole and of the engine.
Each part's own facts are in `parts/<id>/facts.md`.

## Build

The Apex disk release, two sides; no version string was found.

## Memory layout

| Thing | Where |
|---|---|
| The engine (`game`) | `$0200`-`$59FF` and `$B100`-`$FFFF`, the RAM under the I/O chips included; its `$5A00`-`$A8FF` as loaded is copied to `$B100`-`$FFFF` before `$1800` runs (orientation) |
| The current land, or the ending | `$5A00`-`$B0FF`, loaded from side 2 by name (`$CC00`-`$CC17`, `$CF10`) |
| The land's character set | `$7800`-`$7FFF`, inside the land's file; VIC bank 1, `$D018` = `$1F` or `$2F` (`$19AA`, `$19AE`) |
| The two screens | `$4400` and `$4800` (`$1A1C` fills both; `$19AA`/`$19AE` choose one) |
| VIC bank | 1, `$4000`-`$7FFF`: CIA 2 port A bits 0-1 = `%10` (`$198A`-`$1991`) |
| Level index | `$CF89`: 0-4 the lands in order, 5 the ending (`$CBB0`, `$CC00`) |
| Lives | `$CF81`-`$CF82`, decimal digits (`$BDC7`-`$BDD3`); *live*: 03 at the start |
| Magic still needed | `$CF83`-`$CF85`, decimal digits; *live*: 0 1 0 at the start of Jellyland |
| Time | `$CF86`-`$CF88`, decimal digits, set from the land's table at `$9044` (`$BD3E`) |
| Continues | `$CF8A` (`DEC` at `$3EAF`) |
| Joystick, decoded | `$1BDE`-`$1BE2`: up, down, left, right, fire, 0 when pressed (`$1AB7`) |
| Frame flag | `$1B3B`, set by the raster interrupt, consumed by the play loop (`$2088`, `$1E9B`) |
| Pause flag | `$1BC5` (`$2222`) |
| Raster-chain register save | zero page `$0C`-`$0E` (`$206B`, `$2081`) |
| Scroll position | coarse column `$0F` (0-39) and fine scroll `$10` (0-7) (`$2088`, `$2162`) |

## Timing

The play loop runs once per frame at most: it waits for `$1B3B`, which the
raster chain sets in `$2088` (unless `$1BC9` holds it off).

The play-time raster chain, from one recorded frame of Jellyland
(`work/frame-jelly.json`) and the handlers' own writes: `$20F8` sets
`$213D` for line `$2F`; `$213D` sets `$2162` for line `$30` and waits in
the NOP slide `$B17A` for it; `$2162` sets `$21EE` (line `$52`), then
`$2210` (`$72`), `$2222` (`$92`), `$229C` (`$B2`), `$22BA` (`$D2`),
`$18C1` (`$EE`), `$22E9` (`$FA`), and `$22E9` sets `$20F8`. Each handler
writes the hardware vector `$FFFE`/`$FFFF` directly (`$2077`).

## Controls

Joystick in port 2, read once a pass by `$1AB7`. Pause is read in the
raster handler `$2222`: RUN/STOP with the stick centred pauses; RUN/STOP
released with the stick moved resumes. While paused the play loop reads
Q (keyboard row 7, column 6) to quit (`$1EAB`-`$1EBC`).

## Graphics

VSP scrolling: the playfield scrolls sideways by delaying the video
chip's fetch, not by copying characters. `$2162` enters the NOP slide at
`$B182` + column/2 and then writes `$12` and `$1B` to `$D011` on line
`$30` (*live*: one recorded frame shows the two writes five cycles apart
on line 50). `$213D` and the NOP slide make that interrupt land on an
exact cycle.

The score panel at the bottom uses extended colour mode (`$18C1` →
`$18D3` → `$19C2`; the frame shows `$D011` = `$5B` on line 242).

## Mechanics

## Data tables

Each land's file carries a parameter block the engine reads byte by byte
at `$9000`-`$917x` (more than sixty engine instructions read single
bytes there), larger tables at `$8900`-`$8FFF`, and its character set at
`$7800`-`$7FFF`. Their meanings are being worked out.

## Sound

## Live tests

- Controls, from `parts/engine/work/play.vsf` with each input held 40
  frames (`work/controls.py`, `work/ramdiff.py`): up jumps (sprites 6 and
  7 rise 66 lines and fall back); right and left change `$1BD9`/`$1BDA`
  by +2 and -2 and set `$1B5E` to `$01` and `$FF`; down sets
  `$1B62`/`$1B63`; fire alone changes nothing tracked; right+fire, without
  the charge power-up, gives exactly what right does.
- The clock (`work/verify`, from `parts/engine/work/play.vsf`): over 750
  frames, with non-stopping checkpoints on the time routine `$37E9`, the
  last raster handler `$20F8` (control) and the play loop, `$37E9` ran
  750 times and `$20F8` 749, and TIME fell from 206 to 196. One unit of
  TIME is 75 frames, 1.5 seconds on PAL: Jellyland's 250 units are 6
  minutes 15 seconds.
- The title's lives cheat (Jellyland `$9EF9`, `work/verify/cheat2.py`),
  two runs from `work/title.vsf`. Control: a game started, TIME poked to
  001, the clock ran out, and lives went from 03 to 02. Test: with the
  cheat's position (the operand at `$9F18`) set to 24, the 25th key of the
  sequence (1) wrote `$60` over `$BDC1`; the same clock run-out left lives
  at 03. Typing all 25 keys through the emulator's key matrix registered
  too unreliably to finish the sequence, so the first 24 steps were taken
  from the code, not typed.
- The missed extra life (`work/verify/million.js`, the engine's
  `score_add` `$350B` run in `kit/c64/cpu6502.js` on
  `parts/engine/work/play.vsf`): from 900,000 points, event 14 (100,000)
  makes 1,000,000 and the lives stay 03; from 990,000, event 10 (10,000)
  makes 1,000,000 and the lives go to 04; event 15 (1,000,000) from
  900,000 gives a life too.

## Text

The engine stores its text as ASCII capitals (`$20`-`$5F`) and draws it
in a big font of 2×2 characters: `$B817` turns each letter into an
index (digits + `$2B`, punctuation through `$B80D`/`$B812`, M and W wide)
and takes the letter's four character codes from the glyph map at
`$B6D5`. No screen-code copy of a string was found by the
letter-difference search (`30-text`). The same glyph map is in the intro
at `$7500` (read by `$8964`-`$897B`) and in the ending; the 47 bytes the
string sweep first noticed (`$B705`, `$7530`, `$B080`) are its letters m
to x.

The intro has two fonts of its own, both drawn as holes in hires cells
over black colour RAM, so the raster colour bars colour the letters: the
big font (characters `$00`-`$68`, glyph map `$7500`, printed by `$88D8`,
proportional) and a small one (characters `$90`-`$AB`, `$888F`). Its
strings are screen codes, with `1` and `2` drawn as brackets.

String sweep, engine: `$B93B` "STATUS : HAPPY!", `$B94B` "STATUS : SAD",
`$B95B` "GAME OVER", `$B965` "CONTINUES : *", `$B973`/`$B982` "CONTINUE :
YES"/"NO", `$B990` "STAGE  COMPLETE", `$B9A0` "TIME BONUS : *** X 100",
`$B9B7` "SUPER TIME BONUS", `$B9C8` "STAR BONUS : *** X 500", `$B9DF`
"SUPER STAR BONUS", `$B9F0` "SKID BONUS  : ** X 1000", `$CB90` "LOADING :
JELLYLAND", `$CEFD` "LOADING . . . ", `$D77D` "MAGIC DUST QUOTA : 10",
`$D793` "STAR QUOTA : 113", `$3FE3` "BONUSDUST ", and the protection's
text at `$46C1`-`$475B`. Each land's file has its own quotas at `$916F`
and `$9185`, the stage card's name at `$913C`-`$913F`, the next land's
"LOADING :" line at `$9151`, and Theo's speech at `$974C`, hyphenated
into syllables.
