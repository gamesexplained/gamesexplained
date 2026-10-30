# Squirm — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`work/Squirm.tap`, the original Mastertronic cassette (catalogue number
1C 0003, 1984) as the Ultimate Tape Archive preserved it: a TAP of version
1, 607,382 bytes, MD5 `3c85ddc4f4c605755f15d552e3e53457`. Its pulses fall
into three lengths (47, 67 and 87 units), which is the KERNAL's own tape
format: there is no turbo loader and no protection. The tape holds one
program, `SQUIRM`, a BASIC file that loads at `$0801` and ends before
`$3F48` (the KERNAL's tape header at `$033C` after the load: type 1, start
`$0801`, end `$3F48`).

A second copy was compared with it: `Squirm_1984_Mastertronic.d64`, a disk
transfer (MD5 `ded553e3f31fcc3b7fb34d15e5371bc0`), whose only file is the
same `SQUIRM`, 56 blocks, loading at `$0801`. Its bytes equal the tape's
everywhere but 49 bytes in `$2A01`-`$2AAF` and one byte at `$3F48`. The 49
are the six character shapes the game's interrupt rotates while it runs
(see "Steady state"), so the disk copy was saved from a machine that had
already run the game; `$3F48` lies one byte past the end the tape's
header gives. Neither difference is code. The tape is the image analysed.

## From power-on to play

1. Power-cycle the emulator (a hard reset), then autostart
   `work/Squirm.tap`. VICE types `LOAD`, presses PLAY, finds `SQUIRM` and
   loads it with the KERNAL's routines; with warp on the load took 56 to
   62 seconds of host time on 30 October 2026. VICE then types `RUN`.
2. There is no loader, trainer or menu. The BASIC line `10 SYS 15133`
   starts the game at `$3B1D`.
3. The title screen comes up at once and plays its tune. Fire on the
   joystick in **control port 1** starts play (the title says so: "PLUG
   JOYSTICK IN PORT 1"). The game waits for `$DC01` to read exactly
   `$EF`, fire alone, so a key held on the keyboard at the same time stops
   the press counting.
4. Snapshots, all in `work/`:
   - `entry.vsf`: the hand-over. A stopping checkpoint on `$3B1D` armed
     before the autostart, saved where it stopped (PC `$3B1D`, `$01` =
     `$27`). This is the image the listing is built from.
   - `play-level1.vsf`: from `entry.vsf`, run 3 seconds on the title,
     fire held 0.4 seconds, then 3 seconds of level 1 with the stick
     still. Saved with the machine stopped by `pause()`.
   - `hiscore.vsf`: the high-score table after a game ended with no
     input at all.

## Steady state

The game keeps the KERNAL and BASIC ROMs in (`$01` = `$27` throughout)
and the KERNAL's own interrupt: CIA 1's timer A, as the KERNAL left it.
It changes only the RAM vector at `$0314`/`$0315` to `$3CB3` (written by
`$3D0B`, called from the start-up at `$3B1D` and again from `$3862`). That
handler counts calls in `$2683`; on every seventh it rotates the rows of
six character shapes at `$2A00`-`$2A57` (the queen's and the worms'
wriggle) and calls `$2508`, then always leaves through the KERNAL's
handler at `$EA31`, which keeps the jiffy clock and the keyboard scan
going. The raster interrupt is off (`$D01A` = `$F0`). No sprites are used
(`$D015` = 0): everything on screen is characters.

Video: screen at `$0400`, the game's character set at `$2800` (`$D018` =
`$1A`), video bank 0. The main loop paces itself by the jiffy clock `$A2`,
which the KERNAL's handler advances 60 times a second.

Memory: the whole game is the loaded file, `$0801`-`$3F47`. Between the
hand-over and play only variables (`$2664`-`$2687`), zero page, the stack,
the screen and the rotating shapes change; nothing above `$3F48` is
written. Nothing is loaded after the start. A code map recorded over a
session that ran the start-up, the title, play on levels 1 and 2, a
death, the pause, a bonus run, game over and name entry found every
instruction that ran inside the blocks the disassembler traces from
`$3B1D` and `$3CB3`.

The emulator: `release v3.14.0, v3.14.0-linux-x86_64-gui.zip`, which
passed all 57 of `check-emulator`'s checks on 30 October 2026. No check
failed.

## The files on the tape

| File | Loads at | Found in the hand-over |
|---|---|---|
| `SQUIRM` | `$0801`-`$3F47` | whole, at `$0801`: the KERNAL loads it there itself |

## The loader, in a paragraph

There is none of the game's own. The KERNAL's LOAD reads the one program
off the tape into BASIC memory, and its BASIC stub is a single line,
`10 SYS 15133`. The file is a straight save of memory from `$0801` to
`$3F47`, and the bytes after that line, up to `$0F9F`, are not the game's:
they hold most of a BASIC program, the menu of an assembler titled "CBM
64 ASSEMBLER", that was in memory when the file was saved.
