# Summer Games II — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

The US Gold release for PAL machines on two disk sides, from the
contributor's set of ten images:
`summer_games_ii_s1[us_gold_1985](xx-2disk)(pal)(!).g64` (side 1) and
`summer_games_ii_s2[us_gold_1985](xx-2disk)(pal)(!).g64` (side 2), copied
to `work/side1.g64` and `work/side2.g64`.

Side 1's directory shows `SUMMER GAMES II`, `COPYRIGHT 1985`, `EPYX` and
the modules `0` to `7`; side 2's shows the same three names and `0`, `2`,
`8`, `9`, `X`, `Y` and `Z`. `media.json` answers every one of them. Each
module is a packed file that the game's own loader reads by its
one-letter name and unpacks (the loader's file table at `$0C47`, listed in
part `resident`).

How the other sets differ:

- The two Epyx sets (the NTSC original and `alt1`) show only the boot
  file, `COPYRIGHT 1985` and `EPYX` in their directories; the modules are
  on the disks outside the directory, where `disk.py` cannot read them.
  Their boot file is byte for byte the one in the US Gold two-disk set,
  and so is side 2's `COPYRIGHT 1985`; side 1's `COPYRIGHT 1985`, the fast
  loader, differs.
- The US Gold three-disk set (`gs-3disk`, with an `alt` of side 1) is a
  different arrangement: its own `LOAD` and `OLDLOADER` files, and the
  modules stored unpacked as memory images under other letters (its
  Kayaking is file `B` on side 3, loading at `$4000` and ending at
  `$CFFF`, so it carries no flow map at `$E000` at all).

The Summer Games II disks do not hold the first game's events, except its
two swimming events (file `Z`). The loader's table names six more files
on a third disk (side mask 4), which is the first Summer Games disk; this
run had none.

## From power-on to play

1. Attach `work/side1.g64` to drive 8 and autostart it
   (`kit/skills/c64/tool-vice-mcp`). The boot file, a BASIC line, loads
   `COPYRIGHT 1985` to `$C000`, which installs the resident loader at
   `$0800-$0FFF` and its drive code.
2. The loader loads file `3`, the title picture, which waits about 25
   seconds or until a joystick moves or fires.
3. The loader loads file `0`, the menu, at `$0F00`. Its numbered options
   offer competition in all events, in some or in one, practice, the
   ceremonies, the world records, the number of joysticks (option 5) and
   the first Summer Games' events (option 6).
4. Choosing an event loads it. Events 4 to 7 (Triple Jump, Rowing, Javelin,
   Equestrian) are on side 1; High Jump, Fencing, Cycling and Kayaking,
   the closing ceremony and the swimming events are on side 2, and the
   loader asks for the side it needs.

The loader hands over to every module with a jump at `$0AF3`. Every
part's `work/entry.vsf` was saved with an execution checkpoint there,
after one step, so the snapshot's PC is the module's entry: boot to the
title and menu, then from a menu snapshot pick the event in PRACTICE
(competition for the ceremonies), and swap the disk to side 2 when the
loader asks.

## The parts

In the order they are met (`order` in each `part.json`):

| Part | File | Unpacked to | Entry | Snapshot |
|---|---|---|---|---|
| resident | `COPYRIGHT 1985` | `$0800-$0FFF` | | `work/menu.vsf`, at the menu's entry |
| title | `3` | `$4000-$A7E7` | `$9F40` | entry |
| opening | `1` | `$4000-$7F82` | `$7600` | entry, COMPETE IN ALL EVENTS |
| menu | `0` | `$0F00-$3FFF` | `$0F00` | entry |
| triple-jump | `4` | `$4000-$F7FF` | `$9E00` | entry |
| rowing | `5` | `$4C00-$A81C` | `$9400` | entry |
| javelin | `6` | `$4000-$CFF7` | `$7B00` | entry |
| equestrian | `7` | `$1C00-$CD68` | `$1C00` | entry |
| high-jump | `8` | `$4000-$BFFF` | `$6500` | entry |
| fencing | `9` | `$1000-$B3FF` | `$1000` | entry |
| cycling | `X` | `$4C00-$CFFF` | `$9400` | entry |
| kayaking | `Y` | `$4000-$FB57` | `$7000` | entry |
| closing | `2` | `$1000-$D00F` | `$1000` | entry |
| swimming | `Z` | `$1000-$BEFF` | `$17D0`, `$17D3` | `work/play.vsf`, during a relay race |

Swimming is reached from the menu's event list once option 6 offers the
first game's events; its listing is built from a snapshot taken during a
race, because the part copies `$6000-$7EAE` to `$E000-$FEAE` before it
runs, and builds its pictures over the source.

## Steady state

Each part takes the machine over: it turns the CIA's timer interrupt off,
points `$FFFE` or `$0314` at its own raster interrupt handler, and banks
out BASIC, and most parts the KERNAL too. The loader at `$0800-$0FFF`
and the players' records at `$0800-$08FF` stay put for the whole game;
the swimming events save them to `$C000` while they run and put them
back. The loader's NMI handler takes RUN/STOP with RESTORE back to the
menu; the swimming events point the NMI at a handler of their own that
does the same.
