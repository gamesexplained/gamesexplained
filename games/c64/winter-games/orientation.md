# Winter Games — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

Two disk sides, Epyx's original release, as the C64 Preservation Project
dumped it (`winter_games_s1[epyx_1985](pal)(!).g64` and
`winter_games_s2[epyx_1985](pal)(!).g64`, the "(!)" marking a verified
dump), copied into `work/` as `side1.g64` and `side2.g64`:

| Side | SHA-256 | Header | Disk name, id |
|---|---|---|---|
| 1 | `e6cda035…7b259688` | `GCR-1541`, version 0, 84 half-tracks, tracks 1 to 36 present | `SIDE1"…AMES`, id `85` |
| 2 | `22397683…b366f361` | `GCR-1541`, version 0, 84 half-tracks, tracks 1 to 36 and every half-track from 36.5 to 41 present | `SIDE2"…AMES`, id `XX` |

Both are GCR images of the original disks, so the drive's own processor
runs (VICE's default true drive emulation; no `vicerc` was needed).
`kit/c64/disk.py` reads every sector of both with a good checksum.

The directories:

| Side | File | Blocks | Loads at | What it is |
|---|---|---|---|---|
| 1 | `WINTER GAMES II` | 1 | `$02A7`-`$030B` | the boot file: over the BASIC vectors, so it starts itself, and loads `CO*` |
| 1 | `COPYRIGHT 1985` | 7 | `$C000`-`$C636` | the fast loader, which copies itself to `$0900`-`$0DFF` |
| 1 | `M` | 50 | `$0F00`-`$3FE5` | the menu, the players' names and countries, the results |
| 1 | `O` | 81 | `$6400`-`$B420` | the opening ceremony |
| 1 | `T` | 42 | `$3F00`-`$67D0` | the title screen |
| 1 | `S` | 99 | `$4C00`-`$ADC8` | Speed Skating |
| 1 | `H` | 94 | `$1000`-`$6CFE` | Hot Dog Aerials |
| 1 | `I` | 146 | `$1000`-`$9FFE` | Biathlon |
| 2 | `J` | 108 | `$1000`-`$7AFE` | Ski Jump |
| 2 | `B` | 153 | `$1000`-`$A6FE` | Bobsled |
| 2 | `F` | 107 | `$1000`-`$79FE` | Figure Skating and Free Skating |

Side 1 also has 47 sectors that the BAM marks used and no file holds, from
track 20 sector 0 to track 24 sector 11, chained to each other by their
link bytes like a file's. Nothing in this run was seen to read them; what
they hold is open.

## From power-on to play

1. Hard-reset the emulator, attach `work/side1.g64` and autostart it
   (`autostart()` in `kit/c64/vice.py`). The KERNAL loads the boot file,
   which loads `COPYRIGHT 1985`, and the fast loader takes over.
2. About 40 seconds after the autostart the title screen appears (`T`,
   "EPYX presents WINTER GAMES by Action Graphics"), and a few seconds
   later the loader reads `O`.
3. The opening ceremony (`O`) follows by itself: the torch bearer runs up
   the steps, lights the flame and the doves fly. It ends on the lit flame
   and waits.
4. Press fire on the joystick in port 2. The screen goes black for about
   twelve seconds while `M` loads, and the menu appears: seven numbered
   options.
5. To reach an event, press `4` (practice one event), then the event's
   letter, `A` to `G` (Hot Dog, Biathlon, Speed Skating, Figure Skating,
   Ski Jump, Free Skating, Bobsled). The last four are on side 2: the
   loader shows "INSERT WINTER GAMES SIDE 2 THEN PRESS JOYSTICK BUTTON";
   attach `work/side2.g64` and press fire.
6. RUN/STOP held with RESTORE (`vice_keyboard_restore`) goes back to the
   menu from anywhere: the loader's NMI handler reloads `M`, asking for
   side 1 if side 2 is in.

## The parts

Every load is a part, `parts/<id>/`, each with its hand-over snapshot as
`work/entry.vsf`, saved with a stopping checkpoint on the part's first
instruction (the address the loader's file table gives it, below):

| Part | File | Entry | Route to `work/entry.vsf` |
|---|---|---|---|
| `resident` | the loader | — | in every snapshot; its listing is built from the menu's |
| `title` | `T` | `$3F00` | power-on, step 1; the loader's first load |
| `opening` | `O` | `$8200` | the loader's second load, straight after the title |
| `menu` | `M` | `$0F00` | step 4, or RUN/STOP and RESTORE from any event |
| `hot-dog` | `H` | `$1000` | menu, `4`, `A` |
| `biathlon` | `I` | `$1000` | menu, `4`, `B` |
| `speed-skating` | `S` | `$9400` | menu, `4`, `C` |
| `skating` | `F` | `$1000` (Figure), `$1005` (Free) | menu, `4`, `D` or `F`, side 2; `work/entry-free.vsf` is the Free Skating entry |
| `ski-jump` | `J` | `$1000` | menu, `4`, `E`, side 2 |
| `bobsled` | `B` | `$1000` | menu, `4`, `G`, side 2 |

Speed Skating loads at `$4C00` and leaves the menu's `$0F00`-`$3FE5` in
place; every other event loads at `$1000` over the menu.

## Steady state

The loader stays at `$0800`-`$0EFF` under every part. It sets the NMI
vector at `$0318` and in the RAM at `$FFFA` to `$0906` (RUN/STOP and
RESTORE), and the STOP vector at `$0328` to `$0B15`. Each part sets its
own interrupt: during the opening ceremony `$01` was `$15` (KERNAL and
BASIC banked out, I/O in) with the IRQ vector in RAM at `$FFFE` pointing
to `$ABBC`; at the menu `$01` was `$36` and the KERNAL's own IRQ
(`$0314` = `$EA31`) ran. `$C800`-`$FFF9` holds the emulator's power-on
fill in every snapshot.

## The loader, in a paragraph

`COPYRIGHT 1985` silences the SID, copies its second half to `$0900`-`$0DFF`,
adjusts its own timing for a PAL or an NTSC machine (`$02A6`), sends the
drive a `B-E` command to run the code in track 18 sector 5, reads track 18
sector 13 into `$0E00` (nine 20-byte records, zero but for one byte each
on this disk; what they are is open), and loads the title and then the opening ceremony. Every load goes
through one entry, `$0ADD` (`$0903` in the jump table at `$0900`), with the
file's number in X: twelve-byte records at `$0CC3` give each file's name,
load address, end, entry point and disk side, and the loader asks for the
other side when the record's side differs from the one in the drive. File
2's record is named `?` and no load of it was seen.
