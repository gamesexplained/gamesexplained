# Time Tunnel — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

The original US Gold disk, as the C64 Preservation Project dumped it:
`time_tunnel[us_gold_1985](!).g64` (286,164 bytes, SHA-256
`6bfb0bb1ba94b9fee01cb4af97ff6328f1eb383613905904e690a2a43e2d2fc9`),
fetched from the project's collection on archive.org on 31 October 2026
and kept as `work/time-tunnel.g64`. The header reads `GCR-1541`, so it is
a bit-level image of the disk, not a sector image. The disk's name is
`ASE` with ID `01`, and `kit/c64/disk.py` lists four files:

| File | Blocks | Bytes | Loads at |
|---|---|---|---|
| `+` | 1 | 95 | `$02A7` |
| `TT` | 1 | 86 | `$033C` |
| `T1` | 191 | 48,384 | `$0900`-`$C5FD` |
| `FL` | 5 | 1,146 | `$0845` |

One sector, track 22 sector 10, fails its data checksum. Every sector the
BAM marks as used belongs to a file.

The same collection's alternate dump, `time_tunnel[us_gold_1985](alt).g64`
(SHA-256 `49cf591a189f560fc469dbd55ddbac8504e50ecace4af1ea1a81d284d0192a26`,
kept as `work/time-tunnel-alt.g64`), is a different release: one file,
`TIME TUNNEL`, 202 blocks, loading at `$0801` as a BASIC line
`10 SYS3290` followed by the game. Its bytes at `$0900`-`$C5FD` equal
`T1` byte for byte, all 48,382 of them, and `SYS3290` is `$0CDA`, the
same entry. So both releases carry one program, and this run analyses it
from the original disk.

## From power-on to play

1. Start the emulator (`python3 kit/scripts/tools.py vice`) and hard-reset
   it. VICE's defaults (true drive emulation) load the G64 as it is; no
   `vicerc` is needed.
2. Autostart `work/time-tunnel.g64` (the first file, `+`). With warp on,
   the load takes about 28 seconds of host time in a four-core container.
3. To keep the hand-over, set a stopping execute checkpoint on `$0CDA`
   before the autostart. It fires once `T1` is in memory, with `$01` at
   `$37`. Saved there as `work/entry.vsf`.
4. Release the checkpoint and run. The credits screen ("U.S. GOLD, LTD.
   PRESENTS TIME TUNNEL BY APPLIED SYSTEMS ENGINEERING, INC.") prints
   itself a letter at a time and holds; after about ten seconds the game
   starts by itself, in the Gnome Mansion's living room, with the gnome
   standing by the right-hand door. No key is needed.
5. Saved after a few seconds of play, with the gnome walked a little to
   the left, as `work/play-mansion.vsf`. The listing is built from this
   snapshot.

## Steady state

- `$01` is `$35` in play: the BASIC and KERNAL ROMs are banked out and the
  I/O area is in. The game keeps no KERNAL routine.
- Hardware vectors in RAM: IRQ `$FFFE` → `$0F78`, NMI `$FFFA` → `$0CDA`
  (RESTORE restarts the game from its entry), RESET `$FFFC` → `$0CD8`.
  The KERNAL-style vector `$0314` holds `$0F85` and `$0318` holds `$0CDA`,
  written by the start-up, though nothing jumps through them while the
  KERNAL is banked out.
- One raster interrupt, on line `$6E` (110). A recorded frame
  (`kit/c64/frame.py capture`) had no write to the video chip at all, so
  the screen is not split.
- Video: bank 3 (`$DD00` = `$94`), multicolour character mode
  (`$D011` = `$17`, `$D016` = `$D8`), `$D018` = `$EC`/`$ED`: screen at
  `$F800`, character set at `$F000`.
- The game's code and data are `T1`, `$0900`-`$C5FD`. In play every one of
  those bytes still equals the file: the game keeps all of its variables
  in zero page and in `$0400`-`$08AC`, and builds its screen, its
  character sets and its sprites above `$E000`.
- Nothing is loaded after `T1`: the disk holds no other game file.

Emulator: release v3.14.0, `v3.14.0-linux-x86_64-gui.zip`, passed
`check-emulator` 57 of 57; nothing failed.

## The loader, in a paragraph

`+` loads over the BASIC idle vector at `$0302`, so it runs as soon as the
load ends: it blacks the screen, loads `TT` and jumps to it. `TT` loads
`FL` at `$0845`, calls it, then loads `T1` with the KERNAL's own LOAD and
jumps to `$0CDA`. `FL` copies the KERNAL ROM into the RAM beneath it,
patches its LOAD vector (`$0330`) and its serial routines, and installs a
two-bit fast loader that reads `$DD00` four times per byte; `T1` loads
through it. The game's start-up then copies the character ROM to
`$E000`-`$EFFF`, clears `$EC00`-`$FEFF` and banks the KERNAL out, which
overwrites the patched copy.

## Files on disk, mapped onto memory

| File | Where in the play snapshot | Bytes equal |
|---|---|---|
| `T1` | `$0900`-`$C5FD` | 48,382 of 48,382 |
| `FL` | not in play; `$0845`-`$08FF` is overwritten by game variables, and its copy in KERNAL RAM is cleared | — |
| `+`, `TT` | not in play (the start-up clears `$0002`-`$07FF`) | — |
