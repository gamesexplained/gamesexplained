# Licence To Kill — orientation

How to get from the contributor's own copy to the analysed state.

## The images

The contributor supplied two G64 disk images (the header reads
`GCR-1541`, version 0, 84 half-tracks). Neither is the publisher's own
disk: both hold a **freezer-cartridge backup** of the game, packed by the
Trilogic Expert cartridge (its unpacker carries the text `TRILOGIC V3.2`
and starts with `JMP $081B`), and both were frozen at the same moment, in
the delay loop the game runs straight after it starts.

| Image | Directory | Loader | What it holds |
|---|---|---|---|
| `licence.g64` (disk name `LICENSE TO KILL`, id `NT`) | one file, `BOND 31-08-89`, 315 bytes at `$0110` | `BOND` sends the drive a program of its own (`M-E`) and receives the rest of the disk through a two-bit fast loader in the stack page (`$0140`-`$01B7`). It calls the received code twice: `$3F00`, which copies `$4000`-`$5BFF` to `$C000`-`$DBFF` under the I/O area, and `$0800`, the Expert unpacker | **the analysed image** |
| `license.g64` (disk name `LTK`, id `DD`) | `BOOT`, `2`, `PROT!`, `HELLO`, `LO` (47,103 bytes at `$0801`), `HI` (8,960 bytes at `$0F00`), and a fake `BLOCKS FREE.` entry | the KERNAL's slow load, behind a cracker's obfuscated boot (`BOOT` jumps through `($01FF)` with the page-wrap bug into `2` at `$C240`); about two and a half minutes | another backup of a **different build**: the same program assembled again with 16 bytes added at `$0800`, so almost every address in `$0800`-`$3FFF` is 16 higher and the code at `$8000` and up is 1 higher. The graphics at `$5000`-`$7FFF` and `$C000`-`$DFFF` are byte for byte the same |

What the second build changes, beyond the moved addresses, is open
(`facts.md`).

Both title screens read "COPYRIGHT 1989 DOMARK".

## From power-on to play

1. Hard reset, attach `licence.g64` to drive 8 with true drive
   emulation, and autostart it (`LOAD"*",8,1`). The disk loads in about
   eleven seconds; there is no loading picture.
2. The title shows the tagline "His bad side is a dangerous place to
   be.", the logo, and the credits, alternating with the table of "ALL
   TIME TOP SECRET AGENTS".
3. Fire on **joystick port 1** starts the game at level 1. Port 2 does
   nothing at the title.
4. Snapshots:
   - `work/entry.vsf`, the hand-over (below).
   - `work/play-l1.vsf` to `work/play-l5.vsf`, eight seconds into each
     of the five levels. Levels 2 to 5 were reached by setting the
     operand of `LDA #$00` at `$19FB` (the start of a new game, which
     zeroes the level number `$0398`) to the level's number less one,
     from the entry snapshot, before pressing fire, and setting it back
     before the snapshot was saved.

## The hand-over

The program's own first instructions are at `$07F8`: `CLI`, `JSR $14C6`
(sprite pointers, black border and background), `JMP $14DE`. The other
build has the same three instructions at `$0808`, sixteen bytes into its
program, which is how the two builds line up. `$14DE` calls `$9192`
(clear the screen, then a delay loop of about 65,000 passes), `$144C`,
`$0D62` (the VIC bank, and the game's own vectors at `$FFFA`/`$FFFE`),
and jumps to the title at `$1983`.

The freezer resumes the game with an `RTI` inside the delay loop of
`$9192`, with the return address `$14E0` (the call at `$14DE`) above it on
the stack: the backup was made in the first second after the game
started, so almost nothing had run yet.

`work/entry.vsf` is made by booting `licence.g64`, stopping at the
loader's call to `$0800` (an execute checkpoint on `$0128`, the second
time it is reached), running on until the first instruction in
`$9100`-`$91FF` (the resume), then setting PC to `$07F8` and SP to `$F3`.
Run from there, it reaches the same title screen and plays.

## Steady state

The game is one load: the code for all five levels is in memory at once,
and nothing is read from disk after the loader. Compared with the entry
snapshot, the five play snapshots differ only in zero page, the
variables at `$033C`-`$03AF`, the screens at `$0400` and `$4000`-`$4FFF`,
and small working areas.

- Interrupts go through the KERNAL's vector: the game keeps the KERNAL
  banked in (`$01` = `$37` or `$35`) and sets `$0314` to its own
  handler, `$1AB2` on the title and `$1663` in play. Its handlers at
  `$0DAE` (IRQ) and `$0DAD` (NMI, a bare `RTI`) are installed in
  `$FFFE`/`$FFFA` for when the KERNAL is switched out.
- The main loop of a level waits on the flag `$0358`, which the
  interrupt sets, and then calls the level's routines (`$14EA`).
- The level number is `$0398` (0 to 4); after the fifth level it wraps to
  0. Each level's settings are a 25-byte record from `$9A63`, read at
  `$0C47`.
- Lives are `$108E`.

## The loader, in a paragraph

`BOND` is a BASIC-less program loaded at `$0110` in the stack page. It
opens the command channel with an `M-E` command (the text at `$0220`), which starts code in the drive, and then reads bytes two
bits at a time from the serial port (`$DD00`), timed against the raster
so that the screen's bad lines do not break the transfer. Each block it
receives carries a flag, a load address and the data; a block whose flag
has bit 7 set is called as a subroutine at its address (`JMP ($00C3)`),
and loading carries on when it returns. It is not annotated further.
