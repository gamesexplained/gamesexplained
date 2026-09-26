# Mercenary — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`MERCENAR.D64` (174,848 bytes, 35 tracks, no error bytes, SHA-256
`9f276f0e3c4848ed7fbe65b541f40c48dabbfb34d51914e1ae50ef7b5bbb7cba`),
the contributor's own copy. Disk name `MERCENARY`, ID `00`, DOS type `2A`.
Two programs:

| File | Blocks | Loads | Length | What it is |
|---|---|---|---|---|
| `MERCENARY` | 194 | `$0801` | 49,201 | the game, packed into one file |
| `MERC 2ND CITY` | 156 | `$0801` | 39,485 | *The Second City*, the add-on with a different map, packed by a different tool (its BASIC line reads `SYS 2080 SCI 666`) |

**The analysed program is `MERCENARY`.** Every address in this folder is
from it. *The Second City* is not analysed.

The file is not Novagen's own disk layout. Its BASIC line reads
`10 SYS(2080) COMPACKER V2.0`: someone packed the game into one file with
a packer of that name, and it unpacks through two more stages (below)
before the game's own code runs. No intro, trainer or credit to a cracker
appears on the screen at any point, and none was found in the packer's
stages.

**Compared with the original.** The contributor also supplied their copy
of the original Novagen disk, a G64 file named for Novagen, 1985 and PAL (a
track-level image; SHA-256
`8bca12b725f6e635ccb2366327a638e667e3500586a63b1641561c2c640d5cf6`),
disk name `mercenary`, ID `mo`, three files: `mercenary` (2 blocks),
`m2` (7) and `m3` (202). Autostarted from a power-cycled machine, it shows
Novagen's loading screen ("LOADING: BLOCKS TO GO", counting down;
`reference/original-disk-loading-screen.png`) for about 144 seconds and
then reaches the same `$5000` (a stopping checkpoint there, `$01` =
`$36`; `work/orig-entry-5000.vsf`). Memory at that stop, compared byte for
byte with the packed build's `work/entry.vsf`, is identical over
`$0800`-`$CFFE` except for five places, all the cracker's:

| Where | Original | Packed build |
|---|---|---|
| `$7009`-`$7021`, the intro's first message | "NOVADRIVE COUNTDOWN" | "ABC UNLIMITED" |
| `$8004`-`$8008` | `CBM80` (C3 C2 CD 38 30): a reset jumps through `$8000` to `$2170` | zeros |
| `$2178`, the loop at `$2170` | branch offset `$F8`: the loop spins for ever | `$F9`: it lands on a `BRK` |
| `$5100`-`$52FF` | loader leftovers | `$AA` filler |
| `$BFFF` | `$00` | `$7D` |

Below `$0800` the two differ as the loaders leave them; above `$CFFE` the
original has nothing loaded at that moment (VICE's power-on pattern), so
the packed build's `$D000`-`$DFFF` is the packer's. The copy at `$5000`
and its NTSC test are the same in both: they are Novagen's. Every address
in this folder holds for the original too, apart from those five places.

## From power-on to play

1. Power-cycle the emulator (`vice_machine_reset` with `mode: hard`), so
   the RAM holds VICE's power-on pattern and not a previous run's
   leftovers. A soft reset or an autostart keeps RAM; one run here found
   the first boot's data still under the KERNAL after a second autostart.
2. Autostart `MERCENAR.D64`, first program (`MERCENARY`). The emulator
   types `LOAD"*",8,1` and `RUN` and turns warp on; turn it off (`WarpMode`
   0). If the machine was left paused (after `check-emulator` it is),
   `vice_execution_run` first, or nothing happens.
3. About 22 seconds of warp later the unpacking is done and the game starts
   by itself: no title screen and no key to press. It shows a starfield
   with the status panel and a scrolling message line ("GUIDANCE SYSTEM
   FAULT" and others), approaches the green planet, flies over the city of
   Targ seen from above in wire frame, crash-lands, and leaves the player
   standing on the ground at location `08-08` with the messages "CRASH
   LANDED ON TARG", "STATE OF WAR BETWEEN", "LOCATION NEAR AIRBASE", "TYPE
   - DOMINION DART", "CRAFT FOR SALE", "PRICE 5000 CREDITS". From the
   game's first instruction to standing on the ground takes about 75
   seconds at normal speed.
4. Snapshots in `work/`, each saved without ROMs from a stopped machine:
   - `entry.vsf`: a stopping checkpoint on `$5000`, the first instruction
     after the two unpacking stages, from a power-cycled machine.
   - `handover-7200.vsf`: the same boot, stopped at `$7200` after the
     routine at `$5000` has run (below). **The disassembler and the listing
     are built from this one**, because the start-up code at `$7200`-`$75FF`
     and the two blocks at `$4000`-`$4FFF` and `$6000`-`$6FFF` are
     overwritten by the double-buffered bitmap as soon as play draws, and
     exist in no later state.
   - `play-ground-0808.vsf`: standing on the ground at `08-08` after the
     landing messages, about 85 seconds after `$5000`.
   - `depacked-b98b.vsf`: the first unpacker finished, stopped at `$B98B`
     with `$01` = `$36` (for the loader paragraph only).

   A stopping checkpoint on `$B98B` taken during the boot fires early: at
   that moment `$01` is `$37` and BASIC's ROM at `$B98B` is running (the
   `SYS` line's number is being converted). Stop on `$0811`, the `SYS`
   target, and step five instructions instead.

## Steady state

Measured on `play-ground-0808.vsf`, standing on the ground.

- **Banking.** `$01` = `$35` in play: RAM at `$A000` and `$E000`, I/O at
  `$D000`. The game owns the hardware vectors in the RAM at
  `$FFFA`-`$FFFF`: NMI `$8009`, which is a bare `RTI` (RESTORE does
  nothing), reset `$0000`, IRQ `$B9BB` or `$BA1E` (below). The KERNAL's
  `$0314`-`$0319` keep their power-on values and are not used in play.
  The setup is the routine at `$8135`: `$01` = `$36` while it runs, VIC
  bank 1 (`$DD00` = `$96`), both CIAs' interrupts off, raster interrupt
  on, sprite 0 expanded and placed at (160, 116), border black, then `$01`
  = `$35` and `CLI`.
- **The IRQ** is a raster interrupt in two halves that rewrite `$FFFE`
  for each other. `$B9BB` at line 0 sets `$D018` from `$C7`, multicolour
  bitmap mode (`$D011` = `$3B`, `$D016` = `$18`) and the background from
  `$A3`, and arms line `$BA` (186). `$BA1E` there sets text mode for the
  panel (`$D011` = `$1B`, `$D016` = `$08`, `$D018` = `$7E`, background
  white), calls the per-frame routines `$B809` and `$B67B` (and `$8DC3`
  when `$E6` is set, and sound code when `$CA` is non-zero), and counts
  time: `$E2` counts frames to 50, then `$E3`-`$E4` count seconds. `$B9BB`
  ran 100 times in 100 frames.
- **The main loop** is `$855C`, closed by `JMP $855C` at `$859E` and at
  `$85EF`; `$A8` chooses the branch (0 on the ground here, the `$85A1`
  path). Standing still on the ground it ran 10 passes in 100 frames,
  5 a second.
- **Double buffering.** `$AF84` flips `$24` each pass and alternates
  between drawing into the bitmap at `$4000` (`$25` = `$40`) while `$C7` =
  `$78` shows the one at `$6000`, and the reverse (`$25` = `$60`, `$C7` =
  `$70`). The screen matrix is at `$5C00` in both; the panel's text screen
  and character set are also in bank 1 (`$D018` = `$7E`: screen `$5C00`,
  characters `$7800`).
- **Video.** CIA 2 port A reads `$96`: VIC bank 1, `$4000`-`$7FFF`.
- **Nothing is reloaded** during the game: the disk is not read after the
  load. A routine at `$819E` hands the machine back to the KERNAL
  (`IOINIT`, `CINT`), probably for saving or loading a position; see
  `features.md`.
- **RAM under the I/O area.** `$D000`-`$DFFF` holds 4 KB from the file
  (the first unpacker writes it with 0 in `$01`, all RAM), including bytes that
  decode as code writing `$DC0D` and `$FFFE`. Whether the game ever reads
  it is not known yet.

Emulator: VICE 3.10 through vice-mcp, `release v3.13.1,
v3.13.1-linux-x86_64-gui.zip` (Linux x86_64, run under Xvfb).
`check-emulator` on it, 25 September 2026: **56 of 56**, so no workaround
in `kit/skills/c64/tool-vice-mcp/workarounds.md` applies.
`kit/c64/frame.py test` passed. PAL (the game refuses NTSC, below).

## The loader, in a paragraph

`MERCENARY` loads at `$0801` to `$C831`, a BASIC line `SYS(2080)` in
front of 48 KB of packed data. The code at `$0820` copies a depacker into
`$0100`-`$01E8`, writes 0 to `$01` (all RAM) and runs it: it unpacks the
program, with `$4B` and `$6F` as its two escape bytes, then moves two
blocks into place, one ending at `$FFFF`, and finishes by setting `$01` to
`$37` and running the unpacked BASIC program through BASIC's own `RUN`.
That program is `1999 SYS 2065`; the code at `$0811` stores `$6C` at
`$0800`, sets `$01` to `$36` and jumps to `$B98B`. That is a second
stage: it copies a run-length decoder to `$0334`-`$03EA`, which writes
downward from `$CFFF` (`$B3` marks a run), puts back the byte `$B3` at 20
places where the data held it literally, sets `$01` to `$37` and jumps to
`$5000`. The code at `$5000` copies `$4000`-`$4FFF` to `$E000`-`$EFFF` and
`$6000`-`$6FFF` to `$F000`-`$FFFF` (into the RAM under the KERNAL),
calls the KERNAL's `SETMSG`, then reads the PAL flag `$02A6`: on an NTSC
machine it jumps back to `$5000` and repeats for ever, on PAL it jumps to
the game's start-up at `$7200`. That start-up (`$7290`) calls the
hardware setup at `$8135`, builds tables, and enters the main loop.
