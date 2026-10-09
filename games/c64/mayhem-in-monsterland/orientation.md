# Mayhem in Monsterland — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

Two G64 images, one for each side of the disk: `side1.g64` (sha256
`3dd4270f0b0f09bb44357ea3eaace6ec22f22c5da3d3f18d269319a18032eeeb`) and
`side2.g64` (sha256
`8b8c68a1d1786413361475dadec2c444dfb327298c93e514bc5209c8f5c46e01`), the
contributor's own copy. Both headers read `GCR-1541` with 42 tracks, so
these are GCR images of a protected original, not sector images. Both
directories are headed `"  m a y h e m   " acp93`.

The disk asks for a code from the printed protection sheet (below), and
its title reads `© APEX 1993`. Nothing on either side is a cracker's
intro or trainer. `game` holds the text `DOWNLOAD BY JAZ ` at `$47F0`,
in the protection's memory; what it refers to is unknown.

| Side | File | Bytes | Loads at | What it is |
|---|---|---|---|---|
| 1 | `boot` | 352 | `$0100`-`$025F` | the autostart: it fills the stack page, so `LOAD` returns into its own code |
| 1 | `2` | 1,280 | `$C000`-`$C4FF` | the fast loader for side 1 |
| 1 | `menu` | 25,856 | `$4B00`-`$AFFF` | the intro: the Apex credits, the dinosaur roll call and "Mayhem TV" |
| 1 | `game` | 42,752 | `$0200`-`$A8FF` | the game: engine, title, protection check; its top 20,224 bytes are copied to `$B100`-`$FFFF` before it starts |
| 1 | `load1`, `1`, `3`, `protect1`, `load2`, `protect2` | 762 each | `$0041` | one filler six times (`41 00 00 FF FF 1F 00 ...`); found nowhere in memory |
| 2 | `la`, `lb`, `lc`, `ld`, `le` | 22,272 each | `$5A00`-`$B0FF` | Jellyland, Pipeland, Spottyland, Cherryland, Rockland |
| 2 | `cf` | 22,272 | `$5A00`-`$B0FF` | the ending |
| 2 | `a1 l1 b1 l2 c1 l3 d1 l4 e1 l5 f1 c6` | 1,016 each | `$0041` | one filler twelve times; found nowhere in memory |

Each file was extracted with the build's `c1541` and searched for in the
snapshots in 16-byte pieces (`work/mapfiles.py`, `work/cmpfile.py`). Every
file above that is not filler lands whole at its load address in the
hand-over of its part, byte for byte.

## From power-on to play

The emulator was VICE as built by `tools.py get-vice build` (vice-mcp
release v3.13.2), PAL, with its default true drive emulation; no `vicerc`
was needed. Snapshots are saved without ROMs and without disks, and a
snapshot taken with a disk attached still loads from that disk once the
same image is attached again before the snapshot is loaded.

1. Hard reset, attach `side1.g64` and autostart the first file (`boot`).
   Turn warp on.
2. The intro runs: "APEX COMPUTER PRODUCTIONS", the credits, then a page
   for each dinosaur ("stegosaurus (spikius chargicus)" and so on). About
   two and a half minutes of warp in, one press of fire on port 2 (held a
   second) leaves the intro and loads `game`. Pressing fire every second
   from the start did not leave it.
3. "MAYHEM PROTECTION SEQUENCE" asks for the five-digit code at a square
   of the protection sheet ("F27" on every boot here), typed as the digits
   1 to 5 for blue, red, green, cyan and yellow. Without the sheet, the
   answer is in memory: the five bytes from `$017B` + the byte at `$44B6`,
   each exclusive-ORed with `$45`, are the expected keys' character codes
   (`$4594`-`$45A2` compares them). With `$44B6` = 0 they read `34521`.
   Snapshot `work/protection.vsf`.
4. "insert side b and press fire": attach `side2.g64` to drive 8 and press
   fire. Snapshot `work/insert-side-b.vsf`, taken before the fire.
5. The title loads Jellyland (`la`) and shows the logo over the scrolling
   levels. Snapshot `work/title.vsf`. Fire.
6. The stage card: "stage 1 : jellyland / mayhem go!! / status : sad".
   Fire. Play starts. Snapshot `work/play-jelly-sad.vsf`.

## The parts

| Order | Part | Load | Hand-over (`parts/<id>/work/entry.vsf`) | Play |
|---|---|---|---|---|
| 1 | `intro` | `boot`, `2`, `menu` | stopped on `menu`'s first instruction, `$52ED` | |
| 2 | `engine` | `game` | stopped on `$1800`, the jump from the copier | `play.vsf` = `work/play-jelly-sad.vsf` |
| 3 | `jellyland` | `la` over the engine, `$5A00`-`$B0FF` | the loader's store to `$B0FF` | `play.vsf` |
| 4 | `pipeland` | `lb` | as above | `play.vsf` |
| 5 | `spottyland` | `lc` | as above | `play.vsf` |
| 6 | `cherryland` | `ld` | as above | `play.vsf` |
| 7 | `rockland` | `le` | as above | `play.vsf` |
| 8 | `ending` | `cf` | as above | `play.vsf`, on its credits |

The intro's hand-over: a cold boot, a stopping store checkpoint on `$A8FF`
(it fires when the fast loader at `$C304` writes `menu`'s byte there, 16
seconds of warp in), then a stopping execute checkpoint over
`$0200`-`$A8FF`, which stops on `$52ED`. `menu`, `2` and `boot` are then
in memory whole (`boot` but for one byte of the stack).

The engine's hand-over (`work/handover.py`): a cold boot with a stopping
execute checkpoint on `$1800` and fire pressed once every 30 seconds; it
stops after 82 seconds of warp. At that moment `$0200`-`$A8FF` equals
`game` byte for byte and `$B100`-`$FFFF` equals `game`'s `$5A00`-`$A8FF`.

Each land and the ending (`work/levels.py <index>`): load
`work/insert-side-b.vsf` with `side2.g64` attached, put a stopping execute
checkpoint on `$CBB3`, run and press fire. At the stop (just after
`INC $CF89`) poke the level index into `$CF89`, 0 to 4 for the lands in
order and 5 for the ending, put a stopping store checkpoint on `$B0FF`
and run in warp: the loader's last store, at `$CDC3`, stops it with the
whole file in place. Saved there as `entry`; then fire twice and save
`play`. The file name the loader asks for is `$CF10`,X (`L` four times,
then `C`) followed by `'A'` + X, which is why the lands are `LA`-`LE` and
the ending `CF`. Poking `$CF89` before the title instead does nothing:
`$CBA5` runs `$D76E`, which resets it, and then increments it to 0.

## Steady state

In play (`work/play-jelly-sad.vsf`): `$01` = `$35`, the KERNAL and BASIC
switched out and the I/O in. The game owns the hardware vectors: IRQ
`$FFFE` → `$20F8`, NMI `$FFFA` → `$2087`; `$0314` holds `$1862`, set by
the start-up beside `$FFFE` (`$182D`-`$1830`). CIA 2 port A reads `$C6`,
so the VIC is in bank 1, `$4000`-`$7FFF`. Video registers are rewritten by
the raster interrupt, so a sample is not a reading.

One frame of Jellyland play, recorded with `kit/c64/frame.py capture`
(`work/frame-jelly.json`), writes `$FFFE`/`$FFFF` ten times, naming the
handler chain in order: `$213D` (written on line 0), `$2162` (47), `$21EE`
(48), `$2210` (83), `$2222` (114), `$229C` (147), `$22BA` (179), `$18C1`
(210), `$22E9` (239) and `$20F8` (250), which writes `$213D` again. The
line beside each is where the handler before it wrote the vector, not
the line it runs on. `$D011` is written three times: `$12` and then `$1B`
five cycles apart on line 50, and `$5B` on line 242. The frame's drawing
by `site/lib/c64.js` matched 89,942 of 104,448 pixels, the misses
concentrated on lines 120-185.

Memory as the game runs: the engine at `$0200`-`$59FF` and `$B100`-`$FFFF`
(the RAM under the I/O area included), the current level at
`$5A00`-`$B0FF`. Each level is loaded from side 2 when it starts. The
title swaps pages of the level area with another buffer and swaps them
back for play (`$3F6F`-`$3F77` exchanges bytes through `($7E)` and
`($80)`). Whether turning a land happy loads anything is not yet known.

## The loader, in a paragraph

`boot` loads over the stack page, so the KERNAL's `LOAD` returns into it.
It brings in a fast loader at `$C000` (`2`), which loads `menu`, the
intro, to `$4B00`. The intro runs from there and from a copy of part of
itself at `$0300`-`$0BFF`, and while it plays the loader brings `game` in
over the rest. A small routine on the stack page (from `$0180`, beside the
protection's answer bytes) copies `game`'s `$5A00`-`$A8FF` to
`$B100`-`$FFFF` with all RAM switched in, sets `$01` to `$35` and jumps to
`$1800`. The game's protection screen runs from `$4400`-`$47FF` and, given
the right code, waits for side 2 and enters the title at `$CBA5`. The
engine's own loader (around `$CD00`-`$CF0F`) then loads each level by name.

## The emulator

`check-emulator` on the source build: 57 of 57, no workarounds needed.
Build line: own build of github.com/barryw/vice-mcp, release v3.13.2,
commit 1e83aab134. Twice the emulator fell to about 4 % of real time
(the log full of "Sync is 1250 ms behind", the process at 7 % of a core)
and a cold boot then hung at `LOADING`; stopping and starting it with
`tools.py` cured both, and the cause was not found.
