# Fat Worm Blows a Sparky — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`work/fat-worm-blows-a-sparky.tzx`: a 48K ZX Spectrum tape image, 49,407
bytes, a `ZXTape!` file whose first block says `Created with Ramsoft
MakeTZX`. The original Durell Software release of 1986, with no trainer
and no crack intro. SkoolKit's `tapinfo.py` lists six blocks:

| Block | What |
|---|---|
| 1 | text: `Created with Ramsoft MakeTZX` |
| 2, 3 | the header and 96 bytes of the BASIC program `FAT`, auto-run from line 10 |
| 4, 5 | the header and 192 bytes of `WORM`: 190 bytes of code for `$FAF2` (64242) |
| 6 | a turbo block of 49,002 bytes: a flag byte, 49,000 bytes for `$4000-$FF67`, a parity byte |

Two copies of this tape image were compared and are byte for byte the
same.

## From power-on to play

1. Start the emulator and load the tape:

   ```
   python3 kit/scripts/tools.py --platform spectrum zesarux
   python3 kit/spectrum/zesarux.py smartload '{"path": "games/spectrum/fat-worm-blows-a-sparky/work/fat-worm-blows-a-sparky.tzx"}'
   ```

   The tape plays at real speed. Measured: 140 seconds from the command
   to the first screen.
2. The BASIC runs: `10 POKE 23624,0: POKE 23693,0`, `15 CLEAR 65535`,
   `20 LOAD "WORM"CODE`, `30 RANDOMIZE USR 64242`.
3. The loader at `$FAF2` is the ROM's own loading routine with turbo
   timing. It sets `IX=$4000` and `DE=$BF68`, pushes `$EFD8`, and reads
   the turbo block over the whole of RAM from `$4000`, itself included;
   the image holds the same code where the loader is running. It returns
   to `$EFD8` when the block ends.
4. `$EFD8`, the entry: `DI`, the stack to `$F000`, the screen cleared,
   the attributes set to yellow on blue, the border blue, `JP $7C92`.
   Interrupts stay off from here on.
5. `$7C92` prints the "£100 REWARD" forgery warning and waits at
   `$7CA8` for any key, then goes to `$7F30`.
6. `$7F30` copies the bottom panel's picture from `$F000` to the screen
   and jumps to the menu at `$E508`: `1 REDEFINE KEYS`, `2 KEMPSTON
   JOYSTICK`, `0 START GAME`.
7. `0` starts a game at `$757F`, and the frame loop at `$7638` runs until
   the worm dies or the player gives up.

## Snapshots

All are 48K `.sna` files in `work/`, which is not committed.

| File | State | How to take it |
|---|---|---|
| `entry.sna` | the first screen, waiting for a key; PC in `$7CA8-$7CAE` | load the tape as above; when the warning is on screen, `enter-step`, then `snapshot-save` |
| `menu.sna` | the menu | from `entry.sna`: 25 frames, SPACE held 10 frames, 110 frames |
| `play-1.sna` | play, nine seconds into a game | from `menu.sna`: `0` held 10 frames, 100 frames, `Q` 100 frames, `Q`+`P` 40 frames, `Q` 60 frames, two frames between presses |

A "frame" here is 69,888 T-states of machine time with the emulator
stopped between steps (`Rpc.frames`), so each snapshot is reproduced
exactly by the same presses.

**The listing is built from `entry.sna`**, with `play-1.sna` as the second
image (`listing.py ... --entry work/play-1.sna`). The first screen has
already run by then, and it changes six bytes: its print position at
`$7CCB-$7CCC`, and four bytes of stack at `$EFFC-$EFFF`. Everywhere else
from `$5B00` up, `entry.sna` is identical to the 49,000 bytes on the tape
(compared byte for byte). Play overwrites code that has finished its work
(the first screen at `$7C92-$7CDF`, the tape-making routine at `$EB9C`)
and uses `$F000-$FFFF` as its frame buffer, so a snapshot taken in play
shows data where the tape has code.

## Steady state

- **A plain 48K machine.** The ROM is at `$0000-$3FFF` and the game calls
  nothing in it. No paging, and no sound chip.
- **Interrupts are off for the whole game.** The entry stub's `DI` is
  never undone: the game's code has no `EI`, no `HALT` and no `IM`, and
  the sessions recorded for the analysis executed none. The game counts
  its own frames (`$8059`) and is not locked to the display.
- **One load.** Nothing is read from tape after the turbo block.
- **The screen** is `$4000-$5AFF`. The game draws the top two thirds of
  it in a buffer at `$F000-$FFFF` and copies that to the screen each
  frame; the bottom third is the panel.
- **Input**: the keyboard through port `$FE`, and a Kempston joystick
  through port `$1F` when the menu's option 2 is chosen.

## Where things are, at load

| Range | What |
|---|---|
| `$4000-$5AFF` | the loading screen, as loaded; the entry stub clears it |
| `$5B00-$62FF` | eight pages of tables, built before the tape was made |
| `$6300-$63FF` | the perspective curve, a slope table and a quarter sine |
| `$6400-$757B` | the starting grid of cells, the live grid, and the board |
| `$757C-$EB7D` | the game: code, with its tables, text and variables between |
| `$EB7E-$EC6A` | the display list's head, a leftover record, then the routine that made the tape; the display list's records overwrite the routine in play |
| `$EC6B-$EFD7` | empty; the display list and the stack grow into it |
| `$EFD8-$EFFF` | the entry stub, then seven bytes of stack |
| `$F000-$F8FF` | the bottom panel's picture, copied to the screen once |
| `$F900-$FA23` | empty |
| `$FA24-$FF67` | a tape utility the game was saved with, never run by the game |

`facts.md` gives the evidence for each row.
