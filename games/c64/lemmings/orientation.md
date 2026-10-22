# Lemmings — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

The analysed image is the Psygnosis disk release: five D64 files, sides of
three disks, from an archive by Mark Knibbs dated 1997 whose notes copy the
printing on the disks ("© PSYGNOSIS 1994 · COMMODORE C64 · DISK 1 · LOAD
"LEMMINGS",8,1"). Each file is a plain sector image (174,848 bytes, no
error bytes); `kit/c64/disk.py` read every sector of each with no bad
checksum.

| File | Disk | SHA-1 |
|---|---|---|
| `Disk 1 - LEMMINGS.d64` | 1, boot disk, id `PS` | `a63e3d23f82dc3b9652306b640c67aeb1f096d32` |
| `Disk 2 Side A - FUN.d64` | 2 side A, the Fun levels | `80f2b50737170da7c0cf41c8732cc35a7be28770` |
| `Disk 2 Side B - TRICKY.d64` | 2 side B, the Tricky levels | `b7949a1c3852ec79d26139637f152e58b859986d` |
| `Disk 3 Side A - TAXING.d64` | 3 side A, the Taxing levels | `698f1f378dabc9392208e1e133a3b6c2818c217b` |
| `Disk 3 Side B - MAYHEM.d64` | 3 side B, the Mayhem levels | `bc36a0cd999c5191b571ea10f52370caeaceaea1` |

Disk 1 holds `LEMMINGS` and `THE SHORTCUT` (both load at `$0326`, 6,897
and 6,900 bytes), then `ID`, `IE`, `IA`, `IB`, `CC`, `CB`, `CA`, `PA`,
`PB` and `IC`, and four `DEL` entries that spell "(C) 1994 BY PSYGNOSIS".
Each level side holds 25 level files named by its rating's letter (`FA`
to `FY`, `TA` to `TY`, `XA` to `XY`, `MA` to `MY`) and the same nine tune
files `SA` to `SI`.

The C64 Preservation Project's G64s of disk 1 and disk 2 side A
(`lemmings_s1_boot[psygnosis_1994](manual)(pal)(!).g64` and
`lemmings_s2_fun[psygnosis_1994](manual)(pal)(!).g64`), read sector by
sector with `kit/c64/disk.py`, give D64 files with the same SHA-1s.

The same archive carries `Disk 1 - LEMMINGS patched.d64`, which differs
from the original in two bytes (offsets 144,234 and 144,235) and, by the
archive's notes, skips the code sheet. It is a crack and was not used.
The cassette release was tried first and set aside (`agent-history.md`);
everything here is the disk release.

## From power-on to play

1. Power-cycle (`reset(rpc, "hard")` in `kit/c64/vice.py`) and autostart
   `Disk 1 - LEMMINGS.d64`. `LEMMINGS` loads over the KERNAL's vectors at
   `$0326` and starts itself; it puts the loader at `$CC00`.
2. The loader brings in `ID` and `IE`, the pictures shown while the
   rest loads, then `IA`
   and `IB`, and jumps to the intro at `$4750` (resident `$CD2D`). Fire
   skips the intro.
3. Then `PA` (the play engine), `CC`, `CA` and `CB` (the menu), and the
   menu at `$9150`. The first time, the code sheet asks for "the Nth number
   on the page featuring the lemming" (`reference/code-sheet.png`). The
   answer is the word at `$A092`, low byte first, as five decimal digits;
   `work/dboot.py` reads and types it. The question changes on every boot.
4. The title menu follows (`reference/title.png`). Press 1. The screen
   asks for disk 2 side A (`reference/insert-disk-2a.png`): attach
   `Disk 2 Side A - FUN.d64` to drive 8 and press fire on port 2.
5. The loader brings in `PB`, the level's file and its tune file, and the
   level's briefing appears (`reference/briefing-fun1.png`). Fire starts
   play (`reference/play-fun1.png`).

With warp on, the code sheet was up 40 seconds after power-on on
19 October 2026. `work/bootlog.py` logs every file the loader asks for,
in order, from power-on to the menu.

## The parts

| Part | Folder | What it is | Ranges | Hand-over snapshot |
|---|---|---|---|---|
| 0 | `parts/resident` | what stays in memory from the boot to the end: zero page, the variables at `$0200`-`$07FF`, the loader `$CB20`-`$DFFF` (and the RAM under the I/O area) and the vectors | zero page, `$0200`-`$07FF`, `$CB20`-`$DFFF`, `$FFFA`-`$FFFF` | `work/entry.vsf`, the game's |
| 1 | `parts/intro` | the intro: five pictures, the actors and a tune (`IA`, `IB`) | `$0F00`-`$CB37`, `$E000`-`$FFF7` | `work/entry.vsf`, stopped on `$4750` |
| 2 | `parts/menu` | the code sheet, the title menu and the access codes (`CA`, `CB`, `CC`), over the play engine | `$4000`-`$6CAF`, `$8000`-`$A2B0`, `$A400`-`$B3FF` | `work/entry.vsf`, stopped on `$9150` |
| 3 | `parts/game` | the play engine and the briefing (`PA`, `PB`), with level 1 of Fun loaded (`FA`, `SA`) | `$0801`-`$CB1F`, `$E000`-`$FFF9` | `work/entry.vsf`, level 1's briefing on screen |
| 4 | `parts/ending` | the end sequence (`IC`) | `$0801`-`$C4C9` | `work/entry.vsf`, stopped on `$C400` |

The game part's hand-over was saved on the briefing screen, after all the
loading, because the first stop after pressing 1 (`$5006`, the loader's
failed-load call) held only part of the load. Its other snapshots:
`briefing-fun1.vsf` and `play-fun1.vsf`, thirty seconds into level 1. The
ending was reached by setting `$CB48` (the level number) to 99 at level 1's
briefing and winning the level with diggers in warp (`work/toend.py`). A
shorter way to the same stop: at the briefing, attach disk 1 and set the
PC to `$CD56`, the loader's call that brings `IC`; press fire when it asks
for disk 1 side A, and it stops on `$C400`.

Every file is stored with each byte EOR the byte before it and packed; the
loader unpacks it to the extents above. `work/levels.js` and `work/maps.js`
load every level file the way the game does, on the kit's 6502, and match
level 1 byte for byte with the game's memory at the briefing.

The emulator was an own build of github.com/barryw/vice-mcp, release
v3.13.2, commit 1e83aab134, PAL, which passed all 57 of `check-emulator`'s
checks on 19 October 2026.

## Steady state

In play `$01` reads `$35`: RAM at `$A000`-`$BFFF` and `$E000`-`$FFFF`, I/O
at `$D000`. The game owns the hardware vectors: NMI `$FFFA` = `$0B56` (an
`RTI`, so RESTORE does nothing), IRQ `$FFFE` = `$09C7`. CIA 2 selects video
bank 1 (`$4000`-`$7FFF`). One frame of play, recorded with
`kit/c64/frame.py capture` (`parts/game/work/frame-play.json`), redraws
with no pixel different from the emulator's picture; `facts.md` and the
page describe it.
