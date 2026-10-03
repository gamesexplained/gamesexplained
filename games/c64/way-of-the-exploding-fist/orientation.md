# Way of the Exploding Fist — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The emulator

`release v3.13.1, v3.13.1-linux-x86_64-gui.zip` (vice-mcp), on Linux
x86_64 with no display (run under `xvfb-run` by the launcher), 2 October
2026. `check-emulator`: 56 of 57 passed; the one failure is
`pause-at-instruction`, so every stop is made with `pause()` in
`kit/c64/vice.py`, never `vice_execution_pause` alone. PAL (6569 VIC-II),
6581 SID. VICE's default drive settings (true drive emulation) load the
image; no `vicerc` was written.

## The image

`way_of_the_exploding_fistmelbourne_house_1985pal.g64`, 317,884 bytes. The
header reads `GCR-1541`, version 0, 84 half-track slots (42 tracks), so it
is a GCR image of a disk, not a sector image. Disk name `melbourne  house`,
id `disk!`. The directory, as `c1541` (from the emulator build) lists it:

| Entry | Blocks | Loads at | What it is |
|---|---|---|---|
| `menu` | 2 | `$02BC` | the boot file: autostart loads it first. It lands over the BASIC vectors at `$0300`, so it runs itself, and carries the text `WELCOME.` / `SEARCHING` / `LOADING` / `PLEASE WAIT...` |
| `fist` | 1 | (BASIC) | one line: `POKE198,1:POKE631,13:PRINT"{CLR}...LOAD"+CHR$(34)+"MENU"+CHR$(34)+",8,8"`, a stub that loads `menu` for anyone who types `LOAD"FIST",8` |
| (empty name) | 14 | | not read |
| `!!` | 1 | | USR file, not read |
| `data c` | 8 | | USR file, not read |
| `m.prog` | 125 | `$0400` | 31,744 bytes of program |
| `game` | 4 | `$C500` | 885 bytes |
| `m.shapes` | 84 | `$1000` | 21,248 bytes |
| `m.chset` | 7 | `$6300` | 1,536 bytes |
| `m.prerun` | 3 | `$C700` | 512 bytes |
| `m.picture` | 40 | `$6000` | 10,000 bytes |
| `loader` | 2 | `$9000` | 272 bytes |
| `m.spchtbl` | 4 | `$9800` | 768 bytes |
| `m.tsound` | 23 | `$2000` | 5,632 bytes |
| `m.xsprites` | 11 | `$1000` | 2,736 bytes |

The load addresses in the files' headers overlap, so the loader places
them itself. Searching the snapshots for each file's bytes says where
they end up (16-byte pieces, then a byte-for-byte count at the best
offset):

| File | In memory | Bytes equal |
|---|---|---|
| `m.prog` | `$0400`-`$7FFF` | 31,744 of 31,744 at the hand-over |
| `m.shapes` | from `$8000` | 16,851 of 21,248; the shape cells `$8000`-`$BFFF` match, the rest was not followed |
| `m.chset` | `$E000`-`$E5FF` | all |
| `m.xsprites` | `$F540`-`$FFEF` | all: the speech samples |
| `m.prerun` | `$C700`-`$C8FF` at the hand-over, copied by the game to `$0200`-`$03FF` | all: the speech period table |
| `m.picture` | `$E000` on | 3,943 of 10,000; not followed |
| `m.spchtbl`, `m.tsound`, `game`, `loader` | not found as they stand | | The disk
is the Melbourne House release: the menu reads `Melbourne House presents`
and offers one game, with no trainer or crack text anywhere on it.

## From power-on to play

1. Hard reset (`vice_machine_reset`, `mode: "hard"`), make sure the
   machine is running, and autostart the image (`vice_autostart` with the
   path; VICE loads `*`, which is `menu`). Turn warp on to save time.
2. The Melbourne House menu appears within about four minutes of warp on
   this host: `1. --> exploding fist` / `press the appropriate key`
   (`reference/menu.png`). Saved as `work/menu_clean.vsf`.
3. Press `1` (`vice_keyboard_matrix`, key `1`, held a second). The game
   files load; about 16 seconds in warp (two minutes at normal speed) later the
   loader enters the game through BASIC's `SYS` (the return address on
   the stack is `$E146`, inside BASIC's `SYS` handler), at **`$1AED`**:
   `JSR $18E8` (machine set-up) / `JMP $1EE1`. A stopping checkpoint at
   `$1AED` armed before the key press catches it: `work/entry.vsf`, the
   hand-over, `$01` = `$36` there.
4. Turn warp off and run. The attract mode starts: the fighters spar on
   their own under `DEMO` / `JOYSTICK 1 PLAYER` (`reference/demo.png`).
5. Press fire on joystick port 2 (`vice_joystick_set`, port 2, held 0.6 s).
   `NOVICE` / `1 PLAYER` replaces `DEMO` and the bout begins, timer at
   30. Wait 1.2 s and save on the running machine: **`work/play_round1.vsf`**,
   the start of the first bout, both fighters standing
   (`reference/play-novice-bout1.png`). This is the snapshot the
   disassembler and the listing are built from.

Left idle, the computer opponent wins the bout in a few seconds and the
game returns to the attract mode, so a play snapshot has to be taken
straight after the fire press.

## Hand-over or play snapshot

`work/entry.vsf` and `work/play_round1.vsf` agree byte for byte except in
these ranges: zero page, the stack, `$0200`-`$03FF`, a few bytes in
`$0A00`-`$3EFF` (variables), `$C000`-`$C9FF`, `$CC00`-`$CFFF`,
`$E600`-`$E7FF` (55 bytes) and `$FF00`. At the hand-over `$C000`-`$C7FF`
holds the menu's own code (it begins `JSR $C386 / JSR $C4D2` and carries
`DEL - SOUND EFFECTS ON/OFF`), `$0200` holds leftover text
(`1`, `C`, `NG FIST`) and `$0300` the vectors; in play the game has
replaced the first two with its own data and zeroed the third. None of the
game's code exists only at the hand-over, so the play snapshot is the
image: it holds the data the game builds for itself.

## Steady state

Recorded with `kit/c64/frame.py capture` (`work/frame-play.json`) a few
seconds after `play_round1.vsf` was saved, and by reading the vectors in
the attract mode:

- `$01` = `$15` (bits 0-2 `%101`: RAM at `$A000` and `$E000`, I/O at
  `$D000`), set at `$1956`. The KERNAL is banked out and the game owns the
  hardware vectors: NMI `$2FF2`, RESET `$1990`, IRQ chained (below). The
  RAM vectors at `$0314` are zero in play.
- **Seven raster interrupts per frame**, each writing the next one's
  address into `$FFFE`: `$2FB0` (line 0), `$2D62` (line 90), `$2F02`
  (160), `$2E11` (181), `$2FFF` (202), `$30E5` (218), `$31F2` (255). The
  ones from line 160 on move sprites down the screen and change their
  pointers (sprite multiplexing). Line 90 sets `$D011` to `$3B` (bitmap
  mode) and `$D021`; line 255 sets it back to `$1B` (text) for the score
  panel at the top.
- VIC bank 3 (`$C000`-`$FFFF`): screen at `$CC00`, sprite pointers at
  `$CFF8`, `$D018` = `$39` in the text band.
- Nothing has yet been seen to load from disk after the hand-over; whether
  the game reads the disk again (for another backdrop, say) is open and is
  checked in `20-features`.

## The loader, in a paragraph

`menu` is a short boot file that loads over the BASIC vectors so that it
starts itself as soon as autostart has loaded it, prints its welcome text
and loads the Melbourne House menu program, which sits at `$C000`-`$C7FF`
at the hand-over. The menu offers the one game, and on `1` loads the
`m.*` files and starts the game through BASIC with `SYS 6893` (`$1AED`).
The disk is a GCR image, but no loading failure or protection check was
seen under VICE's true drive emulation; the loader's code was not read
further, by policy.
