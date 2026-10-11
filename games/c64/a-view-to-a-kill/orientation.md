# A View to a Kill — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`a_view_to_a_killdomark_1985pal.g64`, Domark's uncracked PAL disk as a
1541 GCR image (278,234 bytes, 42 tracks, SHA-256 `d14ef739…9297`). The
disk name is "THRILLER PACK", ID "PD 2A", and the directory holds:

| File | Blocks | Loads at | What it is |
|---|---:|---|---|
| `BOOT` | 1 | `$02A7` | a one-block loader |
| `MENU` | 21 | `$2000` | the menu program, started at `$28C0` |
| `1` to `4` | 1 each | | one-block files, not studied |
| `FINISH` | 1 | `$02A7` | a one-block loader, not studied |
| `A` | 44 | `$0801` | the intro |
| `B` | 83 | `$0801` | Paris |
| `C` | 97 | `$0801` | City Hall |
| `D` | 79 | `$0801` | the mine |
| `F` | 48 | `$0801` | the ending |

`A` to `F` each start with machine code at `$0801` (two NOPs, then a
depacker that banks everything to RAM and unpacks the part over memory)
and end by jumping into the part. The menu offers the four missions; it
has no entry for the ending.

A cracked copy (`VIEWKILL.D64`, "BOMBJACK LTD. presents A VIEW TO A
KILL") was studied first and compared with this one; the About tab lists
the differences. Every address and fact in these pages is from this disk.

## From power-on to play

1. For each part: hard reset, wait for BASIC's READY, write the file's
   bytes after its load address to `$0801` (`vice_memory_write`; a
   LOAD with autostart relinks the BASIC lines and corrupts `$0801`), type
   `SYS2049` and press RETURN through the keyboard matrix.
2. A stopping checkpoint on the depacker's jump target stops on the
   part's first instruction: `$C5A0` (intro), `$43B0` (Paris), `$1000`
   (City Hall), `$5660` (mine), `$8000` (finale). That stop is saved as
   the part's `work/entry.vsf`.
3. Then, per part:
   - intro: let it run 20 seconds.
   - Paris: tap fire (a press of about 0.3 s) on the instruction page.
   - City Hall: type `CCPHJ` and hold RETURN for a second at "PLEASE
     ENTER CODE", then fire on the memos page.
   - mine: `DB4CT`, RETURN held for a second, fire.
   - finale: `ILVCT`, RETURN held for a second; the ending runs by itself.
   A RETURN shorter than a second was missed at the prompts. A snapshot
   saved a few seconds into each is the part's `work/play.vsf`.

## Steady state

| Part | Interrupt vector in play | `$01` in play |
|---|---|---|
| intro | `$0314` = `$CC00` | `$37` |
| Paris | `$0314` = `$5026` | `$36` |
| City Hall | `$0314` = `$4022` | `$36` |
| mine | `$0314` = `$1022` | `$36` |
| finale | the KERNAL's own (`$EA31`) | `$37` |

Every part leaves the KERNAL in and hooks its handler into the KERNAL's
vector at `$0314`. Each part is one whole program, and the analysis
treats each as its own image (`parts/<id>/`).

The emulator was the vice-mcp release v3.13.1
(`v3.13.1-linux-x86_64-gui.zip`) on Linux x86_64 in a container with no
display. `check-emulator` passed 57 of 57 checks; no workarounds were
needed.

## The loader, in a paragraph

Each file's depacker banks everything to RAM (`$01` = `$34`), unpacks the
part and ends by setting `$01` back and jumping to the part. None of this
is the game's; it was run to its jump and not annotated, and neither were
`BOOT`, `MENU`, `FINISH` or the files `1` to `4`.
