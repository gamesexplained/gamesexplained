# R-Type — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`R-Type.d64`, 174,848 bytes: a plain 35-track D64 (683 sectors, none with
a bad checksum), disk name `WWW.C64HQ.COM`. It is not the original: it is
a crack by Oneway of the **tape** release, put on disk. The directory:

| File | Blocks | Loads at | What it is |
|---|---|---|---|
| `R-TYPE++ /ONEWAY` | 99 | `$0801` | Oneway's intro, then the packed game |
| `R-TYPE PICTURE` | 30 | `$0801` | a picture; never loaded by the game |
| `+` | 2 | `$CD00` | the depacker the loader calls after each stage file |
| `A` to `X` | 4 to 36 each | `$6370`, `$86AC`, `$E000` | eight stages, three packed files each |
| `Y` | 19 | `$6800` | the ninth load, run at `$8000` after stage 8 |

Signs that it is the tape version 1: the game says "PLEASE REWIND TAPE
THEN PRESS F1 TO START" after GAME OVER, and the collision check the
C64-Wiki gives for "tape v1" (`$319C`, `LDA $1190`) is where it says; the
disk version's address (`$3257`) holds other code here.

The crackers' changes found so far: the intro; the message "PLEASE
CONTACT ONEWAY CAUSE WE RULES THEN PRESS SPACE" in place of the tape
prompt; a loader at `$6200` that loads the stage files by name with the
KERNAL's LOAD from drive 8; and a level-skip key, `←`, checked on the
raster interrupt at `$6290` (the game's handler at `$0F69` jumps there
instead of returning).

## From power-on to play

1. Hard reset, attach the image and autostart the second directory entry,
   `R-TYPE++ /ONEWAY` (the first is a `DEL` separator). About 30 seconds.
2. Oneway's intro scroller: press space. The game unpacks and shows the
   R-Type logo, then the title screen (about 30 seconds).
3. Title screen: press F1 ("F1 1 PLAYER").
4. "PLEASE CONTACT ONEWAY ... THEN PRESS SPACE": press space. The loader
   at `$6200` loads `+`, `A`, `B` and `C` (stage 1).
5. "READY": press fire on the joystick in port 2. Play begins.

## The parts

| Part | Files | Ranges its load writes (unpacked) |
|---|---|---|
| `game` | the main program | everything else |
| `level-1` | `A`, `B`, `C` | `$6370-$86A0`, `$86AC-$99FE`, `$E000-$FD3F` |
| `level-2` | `D`, `E`, `F` | `$6370-$8696`, `$86AC-$9772`, `$E000-$F9FF` |
| `level-3` | `G`, `H`, `I` | `$6370-$8051`, `$86AC-$95B6`, `$E000-$EE7F` |
| `level-4` | `J`, `K`, `L` | `$6370-$8569`, `$86AC-$954F`, `$E000-$EF7F` |
| `level-5` | `M`, `N`, `O` | `$6370-$8468`, `$86AC-$90A8`, `$E000-$ECFF` |
| `level-6` | `P`, `Q`, `R` | `$6370-$82CE`, `$86AC-$9329`, `$E000-$E4FF` |
| `level-7` | `S`, `T`, `U` | `$6370-$867D`, `$86AC-$961B`, `$E000-$F0FF` |
| `level-8` | `V`, `W`, `X` | `$6370-$867D`, `$86AC-$961B`, `$E000-$F27F` |
| `ending` | `Y` | `$6800-$8701` |

The ranges were measured by running the depacker (`+`, entry `$CE60`) on
the kit's 6502 simulator over each file, twice, in memory filled with
`$00` and then with `$FF`: a byte the load writes reads the same both
times. `P` and `V` are stored unpacked (the loader skips the depacker for
them).

Route to every part, from step 5 above, as `/tmp` scripts drove it on 10
November 2026:

1. Poke `$319C` with `$60` (`RTS`) so that the ship cannot be hit, and
   put it back to `$AD` around every snapshot.
2. Stopping checkpoints on `$6276` (the loader's `RTS`) and `$8000`.
3. Stage 1's hand-over: the stop at `$6276` after step 4 above is
   `parts/level-1/work/entry.vsf`. Run, wait 7 seconds, press fire at
   READY, wait 5 seconds, stop and save `parts/level-1/work/play.vsf`.
4. Each later stage: hold `←` (keyboard matrix row 7, column 1) until the
   checkpoint at `$6276` stops the machine: the loader has loaded the next
   three files. Save `entry.vsf`, run, fire at READY, save `play.vsf`.
5. After stage 8, `←` makes the loader load `Y` and jump to `$8000`: that
   stop is `parts/ending/work/entry.vsf`.

`parts/game/work/` holds copies of stage 1's two snapshots.

## Steady state

- `$01` = `$35`: the KERNAL and BASIC ROMs are out, I/O in. The IRQ
  vector at `$FFFE` points to `$0CF4`, which jumps through `$0314`; the
  game changes `$0314` to chain its raster handlers. NMI at `$FFFA` is
  `$0D03`, an `RTI`.
- The main loop waits on raster lines `$42` and `$82` around `$0BF8` and
  calls `$6370`, the stage's own code, once a pass.
- The stage number is `$0200` (0 to 8), read throughout the game.

## The loader, in a paragraph

The crackers' loader at `$6200` loads `+` to `$CD00`, then, from the
letter table at `$6300` ("ADGJMPSVY") indexed by the stage number at
`$0200`, three consecutive files, each through the KERNAL's SETNAM,
SETLFS and LOAD. After each it calls the depacker at `$CE60`, except for
`P` and `V`, which are stored unpacked. The depacker reads its header from
the end of the loaded file (the KERNAL leaves the end address in
`$AE`/`$AF`). `$0310` says whether to start over at stage 1 (zero) or
move on to the next (non-zero). Stage 9 is `Y` alone, followed by a jump
to `$8000`.
