# Thrust — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

Emulator: vice-mcp release v3.13.2, `v3.13.2-macos-arm64-gui.dmg`, on
macOS arm64. `check-emulator` on 17 October 2026: 57 of 57 passed, so no
check failed and no workaround applies.

## The image

`Thrust (1988)(Firebird)[cr TCI][a].d64`, 174,848 bytes: a plain 35-track
D64 (no error bytes), not a GCR image. It is **not the original**: it is
a crack by TCI. The disk is named `THRUST` with ID `TCI` and holds one
file, `THRUST` (PRG, 100 blocks, 25,146 bytes, loads at `$0801`-`$6A3B`).
The file starts with a BASIC line, `SYS 2082 THE SYNDICATE 1986`, and
everything after the stub is packed. The game itself was published by
Firebird in 1986 (`features.md`); the 1988 in the file name is the
collector's label, not something the image shows.

## From power-on to play

1. Hard reset, then autostart the D64 (`autostart()` in `kit/c64/vice.py`,
   first file). It loads `THRUST` and runs it: `SYS 2082` (`$0822`).
2. First depacker: `$0822` copies a stub to `$0100` and jumps to `$010C`,
   which unpacks and ends `JMP $D000` with `$01` = `$34` (RAM under the
   I/O). That shows TCI's loading picture ("THRUST TCI", a ship towing the
   pod) and waits at `$037E`-`$0383` for bit 4 of `$DC01` to go low:
   **fire on joystick port 1**.
   About 30 seconds from autostart to the picture.
3. On fire, `$0385` sets `$DD00` = `$97`, calls `CINT` (`JSR $FF81`),
   `CLI`, and jumps to `$0822` again, where a second, different depacker
   now sits: it copies itself to `$0100`, unpacks (EOR key `$F6`), writes
   `JMP $6C16` at `$0105`, sets `$01` = `$37` and jumps there.
4. `$6C16` sets `$01` = `$36` (BASIC out, KERNAL and I/O in), copies
   61 pages from `$3000` up to `$8280`, and jumps to **`$B675`, the
   game's first instruction** (the hand-over).
5. `$B675` copies 13 pages from `$6C47` to `$4000`-`$4CFF`, resets the
   stack and zero page and builds its tables. The game then runs its
   attract mode: level 1, a demo pilot flying the ship and pod, with no
   title screen in this crack.
6. **Space** starts a game: the lives counter reads 3, the ship
   materialises out of a yellow cross at the top of level 1, and the
   lives counter then reads 2 (it shows the ships in reserve). Play is
   confirmed: `S` rotated the ship clockwise.

Snapshots, all in `work/`:

- `entry.vsf`: stopped on `$B675` by an execute checkpoint, after step 4.
- `play-materialise.vsf`: about 2.5 seconds after Space, ship not yet
  drawn.
- `play.vsf`: 150 frames later, the ship hovering at the start of level
  1, fuel 1035, score 0, 2 in reserve. **The image everything downstream
  is read from.** It was taken after `pause()`, on a frame boundary.

Why `play.vsf` and not `entry.vsf`: compared byte for byte, the two agree
over the program (`$1000`-`$3FFF` identical; `$8200`-`$BEFF` differ in only
93 bytes, in pages the game writes while it runs). The 13 pages the game copies to `$4000` equal
their source at `$6C47` in `entry.vsf` exactly. What `entry.vsf` alone
holds is the depackers' leftovers (the source of the relocated copy at
`$3000`-`$6CFF`, and `$6C47`-`$7946`), which play overwrites with the
screen and bitmap at `$5400`-`$7FFF`. No code exists only at the
hand-over.

The contributor's image was not to hand on 22 October 2026, so the
listing was built again from a capture of the Internet Archive's
`Thrust_1988_Firebird_cr_TCI.d64`: a blank disk name, ID `00`, and one
file, `THRUST (TCI)`, of the same 100 blocks and length, whose BASIC line
also reads `SYS 2082 THE SYNDICATE 1986`. Before the loading picture it
shows a text screen, "THE SYNDICATE (TCI) PRESENTS THRUST", that waits
for **Space**; the rest of the route is the same. Its play capture
matched every byte the listing held, code included, except 101 bytes the
game changes as it runs, which were written back, so the listing kept its bytes
and gained the 64 at `$9516`.

## Steady state

- **Interrupts.** `$0314` = `$8943`, steady over 25 reads; the hardware
  vectors at `$FFFA` read through the KERNAL (RAM there is `$BC` fill), so
  the KERNAL's handler passes every IRQ on to `$8943`. The handler takes
  about 350 interrupts a second. It tells a raster interrupt from a CIA 1
  timer one (`DEC $B46B` on the timer). A raster interrupt reads a list
  at `$0E01`+`$AD` (handler number, next raster line in `$0E03`, `$FF`
  ending the list), and jumps through a table of handler addresses at
  `$89BA` (low) and `$89BF` (high), five entries. One vector, no chain.
- **Banking.** `$01` = `$36`: BASIC out, KERNAL and I/O in. `$DD00` =
  `$3E`: the video chip sees bank 1, `$4000`-`$7FFF`.
- **Screen splits.** One frame (`work/frame-play.json`, 43 writes): the
  status bar at the top switches `$D018` and `$D011` near line 65, sprite
  writes multiplex around lines 195-218, and line 277 switches back for
  the bar.
- **Where things sit.** Game code at `$8200`-`$BEFF` (program-counter samples
  during play fell in `$8300`-`$8C00`); data copied to `$4000`-`$4CFF` at start-up; the
  video chip's bank at `$4000`-`$7FFF`; tables at `$0B00`-`$0FFF`; more at
  `$1000`-`$3FFF`, not yet attributed.
- **Reloading.** None: everything is in memory after the one load. One
  part.

## Files on the disk, in memory

| File | Blocks | Loads at | Found in `entry.vsf` | Found in `play.vsf` |
|---|---|---|---|---|
| `THRUST` | 100 | `$0801`-`$6A3B` | 15 of 1,571 16-byte pieces | 8 of 1,571 |

The file is packed, so its bytes land nowhere: the few pieces found are
the BASIC stub at `$0801` and runs of repeated bytes. Everything the game
holds is built by the two depackers.

## The loader, in a paragraph

There is no disk loader beyond the KERNAL's: one file loads, then two
depackers run in turn. The first is TCI's and shows TCI's loading picture
until fire on port 1. The second unpacks the game and hands over to a
relocator at `$6C16`, which moves the program into place and jumps to
`$B675`. Whether the relocator was Firebird's or the cracker's is not
known. None of it is annotated, by policy.
