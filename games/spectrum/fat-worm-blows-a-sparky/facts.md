# Fat Worm Blows a Sparky — facts

Current truth for this game. Every fact names its evidence: a routine, a
table, or a live observation (with the snapshot). Where the inlay and the
code disagree, the code wins and `features.md` says **differs**.

## Machine and layout

- 48K ZX Spectrum, ROM at `$0000-$3FFF`, screen at `$4000-$5AFF`, game at
  `$5B00-$EBCD`, hand-over and loader at `$EC00-$FFFF`
  (`work/layout.json`; strings and code read from `work/entry.sna`).
- The game runs with **interrupts disabled**: the hand-over stub executes
  `DI`, the snapshot header reads `IFF2=0`/`IM=1`, and the image contains
  no read of the ROM frame counter at `$5C78`. It times itself.
  (`work/entry.sna` header, `orientation.md`.)
- The only I/O the game touches: `IN A,($FE)` keyboard reads at `$7BFC`,
  `$7CA9`, `$D6AE`; `OUT ($FE),A` (border and speaker) at `$E755`,
  `$EA8A`, `$EAD3`, `$EAEC`; and the Kempston joystick `IN A,($1F)` at
  `$7C32`. No AY (a 48K machine).
- **No custom character set.** Text is the ROM font (`$3C00`-based), plain
  ZX codes. The forgery warning's text table is at `$7CE0`; the opening
  menu's at `$E7B1`-`$E930`.

## Boot and entry

- Tape: a BASIC wrapper (`POKE 23624,0`, `POKE 23693,0`, `CLEAR 65535`,
  `LOAD "WORM" CODE`, `RANDOMIZE USR 64242`) calls a 190-byte turbo loader
  at `$FAF2`, which loads 49001 bytes to `$4000` and returns to `$EFD8`.
- `$EFD8` hand-over stub: `DI`, `SP=$F000`, clear the bitmap
  `$4000-$57FF`, fill the attributes `$5800-$5AFF` with `$0E`, border `1`
  (blue), `JP $7C92`.
- `$7C92` reads the flag at `$FC00`; non-zero draws the anti-piracy
  forgery warning and waits for a key (`$7C90`-`$7CB0`), zero goes straight
  to the menu.
- `$7F30` copies a pre-rendered picture from `$F000-$F8FF` onto the screen
  and jumps to the menu handler at `$E508`.
- The menu handler draws the title `FAT WORM BLOWS A SPARKY` and the three
  choices; `0` starts play.

## Play

- The view is a smooth-scrolling top-down perspective of a circuit board;
  the worm sits at the centre, and blocks near the screen edge show their
  sides. The insert map and the four counters are drawn into the bottom
  band (`reference/13-play.png`).
- HUD counters: `SPARKIES`, `SPINDLES`, `MY-SCORE`, `HI-SCORE`
  (`reference/12-menu.png`, `reference/13-play.png`).
- Controls, from the inlay: `Q` faster, `A` slower, `O` rotate left,
  `P` rotate right, `1` burper sparky, `SPACE` blaster sparky, `H` halt
  (bouncing-ball routine), `G` game over. Kempston joystick optional.

## Open

- The difficulty ramp the author describes ("the monsters get tougher") is
  not yet tied to a table.
- The author describes a level/height progression the game *lacked*; no
  evidence of one yet.
