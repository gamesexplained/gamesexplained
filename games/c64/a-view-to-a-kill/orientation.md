# A View to a Kill — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`VIEWKILL.D64`, a single-sided 1541 disk image (174,848 bytes, SHA-256
`cd34f0a3…e600`). It is a crack, not the original: the disk name is
"ASS PRESENTS:", and the directory holds a BASIC menu and five packed
programs, plus a zero-block entry that is only a note:

| File | Blocks | Loads at | What it is |
|---|---:|---|---|
| `A VIEW TO A KILL` | 8 | `$0801` | a packed BASIC program: the crackers' title page and the menu |
| `1` | 61 | `$0801` | the intro |
| `2` | 90 | `$0801` | Paris |
| `3` | 85 | `$0801` | City Hall |
| `4` | 83 | `$0801` | the mine |
| `5` | 66 | `$0801` | the ending |
| `END CODE = ILVCT` | 0 | | a deleted entry used as a label |

The title page reads "BOMBJACK LTD. presents A VIEW TO A KILL / Originally
cracked by MAGIC... levelcrunched and modified by BJK". "Levelcrunched"
is the crackers' word for packing each loaded part into a file of its own.

## From power-on to play

1. Attach the image and autostart the first file (`LOAD"*",8,1`, `RUN`).
2. The menu's BASIC program shows the title page and waits for SPACE, then
   lists "1 - OPENING, 2 - PARIS CHASE, 3 - CITY HALL, 4 - MINE, 5 -
   FINALE" and loads the file for the key pressed with `LOAD"n",8,1`. The
   run loaded each file by name instead (`vice_autostart` with `program`
   set to `1` … `5`), after a hard reset each time.
3. Each file is a BASIC `SYS 2072` (`SYS 2087` for file 5) into a packer
   (a "BOMBJACK!!" depacker in files 1 to 4, "THE-A-TEAM" in file 5) that
   unpacks the part over all of memory and jumps into it. A stopping
   checkpoint on that jump's target stops on the part's first instruction:
   `$8020` (intro), `$43B0` (Paris), `$1000` (City Hall), `$5660` (mine),
   `$8000` (finale). That stop is saved as the part's `work/entry.vsf`.
4. Then, per part:
   - intro: let it run; it ends by itself after about a minute.
   - Paris: tap fire (a press of about 0.3 s) on the instruction page.
     Once, holding fire for a second started the car in a state it did
     not leave; a second try, holding it for 1.2 s, started normally.
   - City Hall: type `CCPHJ` and RETURN at "PLEASE ENTER CODE", then fire
     on the memos page.
   - mine: `DB4CT`, RETURN, fire.
   - finale: `ILVCT`, RETURN; the ending runs by itself.
   A snapshot saved a few seconds into each is the part's `work/play.vsf`.

Files 1 to 4's packers write every byte from `$07E8` to `$FFFF`, so their
hand-overs hold nothing from an earlier load. File 5's writes only
`$0800`-`$80FF`, and the rest of its image is whatever was in memory
before (checked by running each packer in `kit/c64/cpu6502.js` over memory
filled with `$00` and then `$AA`).

## Steady state

| Part | Interrupt vector in play | `$01` in play |
|---|---|---|
| intro | `$0314` = `$CC00` | `$37` |
| Paris | `$0314` = `$5026` | `$36` |
| City Hall | `$0314` = `$4022` | `$36` |
| mine | `$0314` = `$1022` | `$36` |
| finale | the KERNAL's own (`$EA31`) | `$37` |

Every part leaves the KERNAL in and hooks its handler into the KERNAL's
vector at `$0314`. Nothing is loaded once a part is running: each part is
one whole program, and the analysis treats each as its own image
(`parts/<id>/`).

The emulator was the vice-mcp release v3.13.1
(`v3.13.1-linux-x86_64-gui.zip`) on Linux x86_64 in a container with no
display. `check-emulator` passed 57 of 57 checks; no workarounds were
needed.

## The loader, in a paragraph

The menu is BASIC. The BOMBJACK packers bank everything to RAM (`$01` =
`$34`), copy their depacker into the stack page and `$0334` and run it
from there; file 5's copies its packed stream to `$BF89`-`$FFFF` first.
Each ends by setting `$01` back and jumping to the part. None of
this is the game's; it was run to its jump and not annotated. The
original disk's own loader is not on this copy.
