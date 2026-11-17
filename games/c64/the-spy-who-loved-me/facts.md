# The Spy Who Loved Me — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`. Two
parts: `main`, the game, and `overlay`, the 2 KB of code swapped in at
`$4000` for the shop, the messages and the high scores.

## Build

- One load. `S1` is a machine frozen with Trilogic's Expert cartridge,
  resumed at `$0A03`, the game's first instruction (`orientation.md`).
- `$0810-$09D1` is a development leftover: a stub that talks to another
  computer over a parallel cable on the user port (`dev_link`, `$0810`),
  with commands to receive and send blocks, call an address, set the
  banking and move the saved registers. `$0A00` held `JMP $0A00` when
  the disk was mastered (`park_loop`).
- The stub was started from BASIC: the frozen stack still holds BASIC's
  `SYS` return (`$E146`) under the stub's own `JSR $0A00` return
  (`$098C`), so the start was `SYS 2064` (`$0810`). The fifteen bytes
  where a BASIC line would sit, `$0801-$080F`, are zeros (`dev_gap`).

## Memory layout

| Thing | Where |
|---|---|
| Map of sections 0 and 1 (harbour road, then water) | `$0400-$07FB` (`map_harbour_and_sea`), read backwards |
| Development stub | `$0810-$09D9` |
| Game code | `$0A00-$3D03`, `$8400-$85CA`, `$E9E1-$F149` (sound) |
| Sprite frames `$00-$BF` | `$4000-$6FFF`, VIC bank 1 |
| Play character set | `$7000-$77FF` (master copy under the I/O area at `$D000`) |
| Play screens (double buffered) | `$7800` and `$7C00` |
| Panel: screen and its 64-character set | `$8000-$83FF`, VIC bank 2 |
| Tables, spawn lists, animation scripts | `$8600-$96E1` |
| Maps of sections 2 to 4 | `$94A2-$96E1` |
| 32 object slots of 26 bytes, 16 shots of 15 bytes | `$96E2-$9B11` |
| Map blocks (16 × 4 characters, 64 bytes each) | `$9B12-$CB51`, sea-bed blocks `$CB52-$CE51` |
| Message font | `$CE52-$CF79`, copied to characters `$DB-$FF` |
| Sprite lists, character and colour buffers | `$E000-$E781` |
| Music data | `$F14A-$F5C1`; sea-bed character set `$F610-$FE0F` |
| Overlay (shop, high scores, set-ups) | `$4000-$47FF` when swapped in; kept at `$D800-$DFFF` |

## Timing

- Four raster interrupts a frame (`$128C`, `$11BB`, `$11F4`, `$1B3E`):
  the panel switch at line `$CF`, the panel's top at `$D9` (which also
  runs the music player, `$E9E1`), the play area's set-up at `$F7`, and
  the sprite multiplexer from line `$32`.
- The play area is double buffered: `draw_play_area` (`$0FC3`) copies
  20 rows into the hidden screen and flips `$9B` at the next frame.
- RESTORE does nothing: the NMI vector points at an `RTI` (`$119E`).
- The random number at `$80` steps as ×5 + 1 every frame (`$119F`) and
  on every call to `$33A0`.

## Controls

- Joystick in port 2 (`$3774`). Up and down move the car up and down
  the screen (y speed down to -6, `$3C57`, `$3C6C`); left and right
  steer. Fire fires every weapon that has ammunition
  (`$39F2`).
- The car's height on the screen sets the scroll speed (`$341F`): speed
  6 near the top, down to 0 at the bottom, where the car is held.
- In sections 3 and 4 the stick moves the car freely in all directions
  (`$3840`).
- C= toggles the music (`$3724`, `$F4`); SPACE pauses until pressed
  again.

## Graphics

- The play area is multicolour characters, scrolled a pixel at a time
  vertically, built from 16 × 4-character blocks (`$0D0D`).
- The panel below it is plain text whose 64 characters are the unused
  top of its own screen, `$8000-$81FF` (`$44FA`). Between the two,
  lines `$CF` to `$DA` are blanked by turning on extended background
  mode and multicolour together, an invalid mode (`$128C`, `$11BB`).
- Sprites are multiplexed (`$1BD0`, `$1B3E`): objects are bucket-sorted
  by y, the first eight take the hardware sprites, and the rest reuse a
  sprite at least 38 lines below its last use (`$1D75`).
- Shots are not sprites: each of the 16 is a character, `$F0-$FF`,
  drawn into the screen over what was there (`$34C0`, `$363F`).
- The large ship of section 3 is drawn in characters into the map
  buffer, so it scrolls with the scenery (`$1821`).
- Three groups of four water characters cycle their pictures every
  other frame to make ripples (`$27EE`).
- Every new section and every death clears the screen with a dissolve:
  four AND masks over the character set (`$1944`, `$8685`).

## Mechanics

- Five lives (`$0A03`), shown up to 9. An extra life each time the
  score's hundred-thousands digit changes (`$2981`).
- Score: every scrolled row adds the speed's points from `$8603`, so
  faster driving scores more (`$0D0D`). Destroying an object adds its
  value (`$2C9F`); the signs that float up show a tenth of it.
  Running over a person (collision kind 5) takes 500 off (`$2F85`).
- Armour (`$96F0`, the DAM bar) starts full at `$FF`. Collisions take 5
  or 10 off (`$2EE0`, `$2F2C`, `$33AC`); smoke costs one per puff
  (`$391D`). At 0 the car crashes.
- Q tokens (`$6A/$6B`, BCD) are collected as pickups (`$308C`) and
  spent in the Q-truck, which the car drives into from behind
  (`$310D`, `$1422`).
- The shop's stock (`$4000`): sub capability 75, miniature lasers 25,
  pursuit missiles 10, smoke refill 5, side rear bolts 10, armour
  replacement (priced from the damage, `$447C`), intercept missiles
  15, torpedoes 15, exit 0.
- Without the sub capability (`$65`) the ramp at the end of section 2
  only sparks; with it the car takes the ramp into the sea and section 3
  (`$3237`, script `$907A`, `$26DB`).
- Sections: 0 the harbour road, 1 the water (the car becomes a boat,
  `$33C5`), 2 the coast road, 3 the sea bed, 4 the last stage. The last
  stop in section 4 ends the game with "congratulations" and starts
  again from section 0 (`$26E4`).
- Enemies come from spawn lists keyed to the scroll distance (`$0C17`,
  `$88A4`): 32 spawn routines by the low five bits of each entry
  (`$8EB3`).
- Losing a life shows "bad show james" and restarts the section; the
  last shows "game over" and the high-score table (`$3979`, `$4187`).

## Data tables

- `$8EB3`: 32 spawn routine addresses. `$8EF3`/`$8F13`: hit handlers by
  collision kind (low, high). `$8F33`/`$8F53`: collision handlers.
- `$8F73`: eight weaving paths, picked at random (`$151E`, `$22D5`).
- `$8F83-$94A1`: animation scripts (`$84C3`): frames, and commands that
  set speeds, colour, size, any field, jumps and calls.
- `$40E9`: the high-score table, nine entries of three letters and a
  four-byte BCD score.

## Sound

- A three-voice player (`$E9E1`) with order lists, 28 patterns
  (`$F407`), instruments (`$F582`), vibrato, pulse sweeps, wave tables
  and arpeggios. Each tune is six bytes at `$F43F`; every sound effect
  is a tune started by `$F087` (2 the shot, 4 an explosion, 9 a Q
  token, 13 the ramp).
- Instruments start nine bytes apart and each reads ten, so one's last
  byte is the next one's first (`$ECC4`).

## The listing's error rate

- Sample, seed 2617: 60 of the 466 comments of both parts, checked by an
  agent on claude-fable-5-2 that wrote none of them. 14 were wrong in a
  detail, none in the main claim: off-by-one ranges and a direction
  ($14B8, $178D, $8400), a register misread ($1A6A: `$D01B` is sprite
  priority, not multicolour), the template's +`$0E` called damage where
  it is hit points ($1FD2 and twelve other spawn comments), the panel
  called extended-colour text ($8000, and $11BB, $8859, this file), a
  caller that is never called ($8601, $8600), a spawn list's routines
  ($8CD3), the music data credited with commands only the player knows
  ($EC2D, $F27B, $F49F, $F5C2), and the shop's pointer slots ($40CA).
  All 14 and their siblings were corrected. Estimate 23 % (95 %
  interval 14 % to 35 %, Wilson); the checker may have missed some.
  An audit of the whole listing is recommended.

## Live tests

- *live* The game boots from the disk image to the harbour, the car
  parked, waiting for the stick (`work/spy-start.vsf`).
- *live* Driving into the Q-truck opens the shop with the items and
  prices listed above (`work/spy-shop.vsf`).
