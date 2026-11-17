# Ikari Warriors — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

Two images were supplied; the analysis is of the first.

- **Elite Systems, 1988, PAL** (`work/ikari-elite-pal.g64`). The header
  reads `GCR-1541`: a G64 of 42 tracks, 683 sectors with good checksums.
  The directory is titled `IKARI  GMA88` and lists two real files, `AS`
  (103 bytes at `$02A7`) and `GM1` (1,267 bytes at `$0334`), and six
  entries named `................` that point at track 1 sector 1 and lead
  nowhere. The game itself is in 657 sectors that no file holds. No
  trainer or cracker's intro appears: the boot runs straight into Elite's
  loading picture, then the game.
- **Data East USA, 1987, NTSC** (`work/ikari-dataeast-ntsc.g64`). A
  different conversion, by Quicksilver Software, with its own engine,
  graphics and screen layout. It hangs at `$7107` in its `BOOT1` loader on
  a PAL machine and starts on an NTSC one (VICE `MachineVideoStandard` 2).
  Its directory names its pieces (`IKARI`, `MAP1`-`MAP4`, `BRICK1`-`BRICK4`,
  `MONS1`-`MONS4`, `SPRITES`, `MUSIC` and more); none of their bytes appear
  anywhere in the Elite game's memory. It is used only for the comparison
  on the pages (`reference/data-east-*.png`).

## Emulator

`release v4.0.0, v4.0.0-linux-x86_64-gui.zip`, Linux x86_64 in a cloud
container. `check-emulator` passed 57 of 57 once `kit/c64/snapshot.py` read
the RAM from the snapshot's `C64MEM` module (v4.0.0 adds a 23-byte
`C64MEMHACKS` module ahead of it, so the RAM moved from byte 209 to 232).
Before that fix it failed `snapshot-ram-offset` and
`checkpoints-survive-load`, both from the offset.

The snapshots here were saved with the VIC-II model `check-emulator`
leaves set (8565, `VICIIModel` 1). After a switch to NTSC and back the
model reads 0 and every one of them refuses to load; set `VICIIModel` to 1
again first.

## From power-on to play

1. Hard reset, then autostart `work/ikari-elite-pal.g64` (it runs `AS`,
   the first file).
2. `AS` copies itself to `$02A7`, loads `GM1` with the KERNAL and jumps to
   `$0334`. `GM1` loads the rest from raw sectors with its own fast loader
   (about 30 seconds at warp, two minutes at real speed). The loading
   picture (`reference/loading-screen.png`) is on screen from `$03C0` until
   `$03E1`.
3. The hand-over is `JMP $0F80` at `$040C`. A stopping checkpoint on
   `$0F80` (RAM only, the loader never runs there) gives
   `work/entry.vsf`.
4. The title sequence then cycles: high-score table, the island map with
   "Warriors" written across it, a demo. Fire on joystick port 2 starts a
   one-player game; play starts beside the crashed plane
   (`reference/play-start.png`). `work/play-area1.vsf` was saved there,
   about four seconds after fire.

`work/loadpic.vsf` is the machine stopped at `$03D9`, with the loading
picture on screen.

## Steady state

`$01` = `$35`: RAM everywhere but the I/O block, the KERNAL and BASIC
banked out for good. The game runs its own interrupt handlers through the
hardware vector at `$FFFE`; `$0314` still holds the KERNAL's `$EA31` and is
never used. The NMI vector at `$FFFA` points at `$3473`.

A frame captured in play (`work/frame-play.json`) shows the handlers
chaining, each writing the next one's address into `$FFFE`/`$FFFF`:
`$3085` (set on line 308), `$31B9` (line 53), `$3182` (line 74), `$319B`
(line 78), `$324F` (line 240) and `$2F65` (line 254). The `$D011` writes at
lines 249 and 308 open the upper and lower borders, where the score panel
and the status bars are drawn.

Memory in use at the hand-over: `$0001-$0209`, `$0259-$0BFF`,
`$0F80-$3F67`, `$440D-$4DD7`, `$5044-$7A6E`, `$7E80-$CF6E`, `$D000-$E55B`
(RAM under I/O), `$E604-$ECFF` and `$F505-$FEFF`. Nothing is loaded again
once the game runs: the loader is overwritten, and no code in the game
touches the serial port. It is one load.

The hand-over and play snapshots differ wholesale in `$0400-$13FF` (the
start-up code at `$0F80` is overwritten by buffers once play begins),
`$4000-$4FFF` and `$7A00-$7FFF`, and in scattered variables. The listing is
built from `work/entry.vsf`, which still holds the start-up code.

## The loader, in a paragraph

`AS` is a BASIC line (`SYS 2061`) that moves itself to `$02A7` and loads
`GM1`. `GM1` runs a set of start-up routines (`$062F` to `$06A3`, the
drive's side of the fast loader among them), points the NMI vector at
`$03A4`, starts CIA 2's timer and waits in a loop at `$03A2` until the
timer's NMI carries it on to `$03A4`. It then loads six blocks by number
through `$0410`.
After block 0 it calls `$C800` and keeps the value it returns (it is handed
to `$06DB` at the end, the shape of a protection check). Blocks 1 and 2
are the loading picture, shown in multicolour bitmap mode with `$D018` =
`$39`; `$7000` is called after block 3, then blocks 4 and 5 load over the
picture's memory. It clears the SID, copies the KERNAL's own table of
vectors (32 bytes at `$FD30`, with the ROM banked in) back to `$0314`,
closes the files and jumps to `$0F80`. Not annotated further, by
policy.
