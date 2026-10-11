# Platoon — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

Six G64 images, two sides in three dumps. Each header reads `GCR-1541`,
42 tracks: GCR images of the original disks, not plain sector images.

| Image | Directory | Files |
|---|---|---|
| `platoon_s1ocean_1987pal.g64` | no disk name, the header shows the load command | LOADER, F, PICCY, OVL1 |
| `platoon_s2ocean_1987pal.g64` | no disk name | LAY1, LAY2, LAY3, O1, O2, O3 |
| `platoon_s1ocean_1987palalt.g64` | disk name `rouven ross` | as the PAL side 1, byte for byte |
| `platoon_s2ocean_1987palalt.g64` | disk name `rouven ross` | as the PAL side 2, byte for byte |
| `platoon_s1ocean_1987v1_1ntsc.g64` | `platoon`, one file PLATOON of 321 bytes at `$010A` | a different build |
| `platoon_s2ocean_1987v1_1ntsc.g64` | `platoon-sd 2` | O1, O2, O3 of other sizes; LAY1 to LAY3 differ |

The PAL side 1 and side 2 are the images analysed.

## The three versions

Compared on 7 October 2026, sector by sector (GCR decoded from the G64
files) and, for side 1's program, memory at the hand-over to `$0400`.

**PAL and PAL alt are the same disks.** All 683 sectors of each side hold
the same data, except the directory header (18/0), which names the alt
disk `rouven ross`. Both side 1 images carry the same deliberate error,
a data checksum error on 22/10, the sector the fast loader F tests. The
two differ only in how the dump was written: the alt image's tracks are
a uniform length for each speed zone (7,692 bytes in zone 3), the PAL
image's lengths vary track by track as a raw read does, and the PAL
side 1 image keeps a track 41.

**NTSC v1.1 is the US release, rebuilt.** Its loading picture carries the
Data East logo in place of the RCA/Columbia video advert. Side 1 holds
one 321-byte file that loads into the stack page and pulls the program in
with a two-bit serial loader: there is no PICCY wait for SPACE, no OVL1
in the directory, and 22/10 reads cleanly. The program reaches `$0400`
like the PAL one, with `$01` = `$35`, and is the same source assembled
again: matching blocks sit at the same addresses from `$4400` to `$B224`
and from `$CE38` up, and the code below `$4000` sits 208 bytes later
from `$0868` and 225 bytes later from `$17DC`. What changed:

| Change | PAL | NTSC v1.1 |
|---|---|---|
| Music tempo | `$17CC` calls the music driver `$E395` every frame | `$189C` counts frames in `$18BA` and skips the call every sixth one, so the driver runs 50 times a second on a 60 Hz machine |
| Test keys | none | `$0832`: keys 0, 9, 8 and 7 each put the soldier at a fixed place in the jungle (`$20`/`$21` = `$0001`, `$014E`, `$003C`, `$0467`) and redraw; 8 also sets `$2B52` (live: the scene jumped on each key) |
| Wording | TORCH | FLASHLIGHT, in four messages |
| Title credits | PROGRAMMED BY ZACH TOWNSEND, GRAPHICS BY ANDREW SLEIGH and MARTIN MACDONALD, MUSIC & FX BY JONATHAN DUNN | only the Hemdale and Ocean copyright lines |
| High scores | PLATOON on all ten, top score 199998 | the team's names: Z A C H 199990, TOWNSEND, ANDREW, SLEIGH, MARTIN, MACDONALD, JONATHON, DUNN, GARY, BRACEY |
| Scroll redraw | `$B238`-`$B2B0` | the tests of `$0303` changed (6 to 5, 0 to 6, 0 to 2) and `$031E` set to 1 after each redraw; what this fixes is open |
| Title interrupt | raster line 0 at `$1D8A` | line 20 at `$1E6B` |
| ZACH1 cheat | `$07B5`, patches `$2BC8` | `$07BF`, patches `$2CA9`, the same routine moved |

On side 2 the NTSC LAY files skip straight to their loader with `jmp
$4100`, and the O files are packed with the same Dynamic Duo packer to
other sizes (O1 55,928 bytes against 56,673). The PAL LAY files still
hold the 22/10 check, but jump over it at `$4022`. The NTSC O files were
not unpacked or compared.

## From power-on to play

1. Hard reset, attach `platoon_s1ocean_1987pal.g64` and autostart it
   (VICE types `LOAD"*",8,1`). LOADER lands at `$0316`, over the
   CHROUT vector, and runs itself.
2. The loading screen, a picture of a soldier with raised arms, appears
   after about 15 seconds and waits. Press SPACE.
3. The screen flickers with noise while OVL1 loads, about 25 seconds,
   then the title shows (PLATOON over a row of silhouettes, the credits),
   followed by the ten best scores. `work/title.vsf` in
   `parts/load1/` was saved on the title.
4. Press fire on joystick port 2. The jungle appears after a black
   screen of about two seconds. A panel headed CHOOSE YOUR MAN can appear
   over the jungle; fire closes it. `parts/load1/work/play-jungle.vsf`
   was saved with the soldier standing in the jungle and the panel
   closed.
5. The hand-over, `parts/load1/work/entry.vsf`: a stopping checkpoint on
   `$0400`, armed before SPACE in step 2. The machine stops there with
   `$01` = `$35`. It is the image the listing is built from (below).

## The parts

The game is four loads. Each has a folder under `parts/`.

| Part | Files | Route |
|---|---|---|
| `load1` Jungle and village | OVL1 (side 1) | steps 1 to 4 above |
| `load2` | LAY1 then O1 (side 2) | not reached in this run |
| `load3` | LAY2 then O2 (side 2) | not reached in this run |
| `load4` | LAY3 then O3 (side 2) | not reached in this run |

OVL1 holds the message TURN THE DISK OVER TO SIDE B and a KERNAL load of
a file named LAY2 at `$3DDE`, run with `jmp $4000`; the digit is probably
set before the call (open). Each LAY file is a 1 KB program at `$4000`
whose strings name its O file. Each O file loads at `$0801` as a BASIC
line, `SYS 2088 BY THE DYNAMIC-DUO IN 1986`, and unpacks itself. Which of
the film's later sections (the tunnels, the bunker, a second jungle,
the foxhole) each O file holds is open. Whether anything of load 1 stays
resident under the later loads is open too, so none of the later parts
is marked `over` another.

## Steady state

- `$01` = `$35` throughout play: the KERNAL and BASIC ROMs are out and I/O
  is in. The interrupt vectors are the hardware ones at `$FFFA`/`$FFFE`.
- NMI: `$17DA`, written by `$0400`.
- IRQ in play: ten raster handlers that chain through `$FFFE`, each
  naming the next: `$17FE`, `$18C1`, `$1916`, `$1966`, `$1A12`, `$1A8A`,
  `$1ACA`, `$1B12`, `$1B63`, `$1C2E`. Recorded with `kit/c64/frame.py
  capture` from `play-jungle.vsf` (55 writes in the frame,
  `parts/load1/work/frame-jungle.json`). On the title the vector held
  `$1CCC`.
- Video: bank 1 (`$DD00` = `$92`), screen `$4000`, character set `$4800`
  at the top of the frame (`$D018` = 3); the panel's interrupts switch
  `$D018` to 1 and back to 3. Sprite pointers are written at both `$43F8`
  and `$47F8`.
- Joystick: control port 2 (`$DC00`).

## Files on disk and in memory

Each file's bytes compared with the hand-over (`entry.vsf`) and the play
snapshot at the file's load address.

| File | Load address | Equal at hand-over | Equal in play | What it is |
|---|---|---|---|---|
| LOADER | `$0316`-`$03FE` | 231 of 233 | 201 of 233 | autostart stub: KERNAL load of F, `jmp $1000` |
| F | `$1000`-`$13FE` | 11 of 1023 | 11 of 1023 | the fast loader; overwritten by OVL1 |
| PICCY | `$4000`-`$7FFF` | 1194 of 16384 | 1121 of 16384 | the loading screen; overwritten by OVL1 |
| OVL1 | `$0400`-`$FFF9` | 64506 of 64506 | 59124 of 64506 | the whole of load 1 |

OVL1 lands whole, including `$D000`-`$DFFF` under the I/O chips. Play
then rewrites `$D000`-`$D7FF` and `$4000`-`$4FFF` (screens and sprite
data) among smaller variables, so the hand-over holds bytes that play has
lost and is the image for the listing.

## The loader, in a paragraph

LOADER replaces the CHROUT vector so that it runs as soon as it is
loaded, sets the KERNAL's file name to F and loads it to `$1000`. F asks
the drive's command channel to read block 22/10 (`U1:2,0,22,10`) and
reads back the drive's status: an answer starting with 2 lets the load go
on, any other goes to `$0150` instead. F then sends its drive code with
M-W and starts it with M-E, loads PICCY into bank 1 and shows it as a
multicolour bitmap, waits for SPACE, blanks the screen, loads OVL1 over
almost all of memory with code it copied into the stack page, and
reaches the game with `jmp $0400`. Each LAY file on side 2 carries the
same check and jumps over it. Not annotated further, by policy.

## Emulator

`release v3.13.2, v3.13.2-linux-x86_64-gui.zip`; `check-emulator` passed
57 of 57 on 7 October 2026, nothing failed.
