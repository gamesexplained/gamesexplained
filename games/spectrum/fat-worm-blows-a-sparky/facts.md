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

## The renderer and the perspective (`$80EB`, `$811E`)

- The screen is drawn from a 256&times;128 board bitmap at `$F000`
  (32 bytes a row), which the panel and line plotters share, then copied
  and masked onto the ULA screen. Verified live: the board bitmap in
  `work/play-1.sna` holds the dithered track pattern.
- Objects are drawn from four extent words. `$80EB`
  (`scale_object_extent`) reads a scale byte `B = curve[A >> 1]` from the
  64-byte curve at `$6300` and applies it to each word through `$811E`.
  `$811E` (`mul_scale`) is a shift-and-add that returns
  `extent * (128+B) / 128`; it doubles `DE`, shifts `B` right and adds on
  the carry, eight times, then folds the high byte back. Verified by
  reading `$811E`-`$8179` and the curve at `$6300`.
- `$811E` is also the game's only range test: a value whose low byte is
  `$C0`-`$FF`, or whose high byte is neither `$00` nor `$FF`, comes back
  unchanged. Coordinates outside the visible area pass through untouched.
- `$81DB` (`draw_object`) scales each object's extent twice, at the
  record's `+$0D` and `+$0C` bytes, adds `$0080` to the first two resulting
  words and `$0040` to the last two (which is what centres the worm), then
  dispatches on `type & 3` to one of four drawing arms.

## The draw list (`$AAF3`)

- Every frame `$AAF3` (`build_display_list`) rebuilds a list of
  depth-sorted 15-byte records: one per live board object, then the four
  board panels, each inserted by the sorted insert at `$B008`. Verified by
  reading `$AAF3`-`$AB10`.
- Its first two instructions are `LD HL,$EB8D` then `LD HL,$0000`. The
  second overwrites the first, so the list head is set to a null pointer
  and the following `LD (HL),A` writes to `$0000` in ROM. The list is built
  correctly from a load that never has any effect.

## The worm (`$9EB0`)

- `$9EB0` (`worm_steer`) chooses one of four legs from bits 7 of the
  overlap object's flags at `(IX+$09)`, `(IX+$05)`, `(IX+$03)` and
  `(IX+$07)`, each of which snaps the worm onto a track direction (0/128
  or 64/192). `($8001)` is the heading; `($8000)` is a 12-frame rate
  limiter. When the worm is already heading into the window a leg tests,
  `$9F37` reverses the heading and quarters the projection scale
  (`$8002`) - the worm bumping into an edge.
- `($8001)` heading, `($8002)` speed/scale, `($7FF4/$7FF6/$7FFE)` position,
  `($805D)` sparkies, `($805B)` score display. These addresses are the
  agents' reading of the code and are marked for live checking.

## The halt screen (`$D05E`)

- `H` runs a self-contained bouncing-ball screen at `$D05E`, reached only
  from `$779A`. It builds its own 1&nbsp;KB pattern at `$FC00-$FFFF` and
  moves five objects. It was not executed in either snapshot; its
  appearance is open. The `H` key's path is `$7C13` reading the controls
  into `($8057)` and the frame loop's bit 4 test at `$7790`.

## Open

- The difficulty ramp the author describes ("the monsters get tougher") is
  not yet tied to a table.
- The author describes a level/height progression the game *lacked*; no
  evidence of one yet.
