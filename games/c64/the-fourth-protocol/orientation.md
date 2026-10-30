# The Fourth Protocol — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`the_fourth_protocol[bantam_1985](!).g64` from the C64 Preservation
Project's G64 collection: Bantam Software's US release of 1985, marked
as a verified good dump. The header reads `GCR-1541`, version 0, 84
half-tracks, longest track 7,928 bytes: a GCR image of the protected
original, so the drive's own processor has to be emulated (VICE's
defaults do this; no `vicerc` was needed). SHA-256
`be6a3701a1b684e9461af771ca59db215ae277ea2f0421b7e3fe56841c736359`.

The disk is named `TFP`, ID `39`, and `kit/c64/disk.py` lists fifteen
files and 43 sectors in use that no file holds, from track 1 sector 0 to
track 24 sector 0:

| File | Loads at | Bytes | What it is | Part |
|---|---|---|---|---|
| `GAME` | `$0801`-`$11FF` | 2,559 | a BASIC line, `SYS 3584`, and the first boot stage at `$0E00` | loader |
| `XXXMYOS1` | `$8000`-`$95FF` | 5,632 | the disk operating system, copied to `$EB00`-`$FFFF` by its own code at `$8000` | resident |
| `XXXMYOS2` | `$8000`-`$95FF` | 5,632 | the same, two bytes apart (`$FA68` and `$FA6C`: the top of a memory range, `$D000` for `$C810`); loaded for episode two | resident |
| `XXXCOPY` | `$4000`-`$42FF` | 768 | runs at `$4000` before the title; the copy protection check, by its name | loader |
| `XXXTPAGE` | `$4000`-`$41FF` | 512 | the title program: loads the three files below, plays the tune, asks for the episode | title |
| `XXXTITLE` | `$6000`-`$7FFF` | 8,192 | the title picture's bitmap | title |
| `XXXCOLMAP` | `$4C00`-`$4FFF` | 1,024 | the title picture's colours (screen memory) | title |
| `XXXMUSIC` | `$C000`-`$CFFF` | 4,096 | the title tune and its player | title |
| `XXXPART1` | `$4000`-`$C80F` | 34,832 | episode one, found whole at `$4000` at its hand-over | nato-documents |
| `XXXICONS` | `$1000`-`$1FFF` | 4,096 | episode two's icon pictures, found whole at `$1000` in play | the-bomb |
| `XXXPART2` | `$4000`-`$CFFE` | 36,863 | episode two, found whole at `$4000` at its hand-over | the-bomb |
| `XXXF0` | `$6000`-`$CFFF` | 28,672 | episode three | sas-assault |
| `XXXF1` | `$4000`-`$4FFF` | 4,096 | episode three | sas-assault |
| `XXXF2` | `$1000`-`$3FFF` | 12,288 | episode three | sas-assault |
| `KIE` | `$1000`-`$1FFF` | 4,096 | no loader names it; 2,852 of its bytes match what episode one holds at `$1000` in play | none |

The episode loader's table of names (`$0884`) also holds `XXXPART3`,
which is not on the disk.

## From power-on to play

1. Hard reset, attach the G64 and autostart it (`vice_autostart` with the
   image's path). The screen says `LOADING, PLEASE WAIT...` for about 30
   seconds, then shows Bantam's copyright card, then the title picture
   with the tune playing and `PRESS <SPACE> TO CONTINUE`: about 70
   seconds from the reset, in VICE v3.14.0 at normal speed.
2. Press SPACE. A white panel lists `THE EPISODES` and asks
   `SELECT NUMBER:`.
3. Type `1`, `2` or `3` and press RETURN. Each episode loads in 80 to 120
   seconds, behind the title picture.
4. Episode one opens on the Cencom screen (nine icons, a pointing hand);
   episode two on "Gordon's / Your office" with its icons; episode three
   asks `WHAT IS THE CODENAME FOR THIS MISSION?`.

No trainer, menu of cheats or cracker's intro: this is the publisher's
disk.

## The parts

Every part was reached from the snapshot `work/menu.vsf` (the episode
menu, saved after step 2), with a stopping execute checkpoint on the
part's first instruction armed before the choice was typed.

| Part | Files | Hand-over | Snapshots |
|---|---|---|---|
| `resident` | `XXXMYOS1` (and `XXXMYOS2` for episode two); the episode loader at `$0800` from the hidden sectors | none of its own: listed from episode one's hand-over, where both are in place | `parts/resident/work/entry.vsf` (a copy of episode one's) |
| `title` | `XXXTPAGE`, then `XXXTITLE`, `XXXCOLMAP`, `XXXMUSIC` | `$401B`, the first instruction after the title program's three loads, from a hard reset and autostart (the copy protection also runs at `$4000`, so the stop is past it) | `parts/title/work/entry.vsf`; `title.vsf` (title screen), `menu.vsf` (the episode menu) |
| `nato-documents` | `XXXPART1` | `$4005`: the episode loader ends `JMP $4005`, so `$4000`-`$4004` never run from there | `parts/nato-documents/work/entry.vsf`; `cencom.vsf` (the Cencom screen in play) |
| `the-bomb` | `XXXMYOS2` (run at `$8000`), `XXXICONS`, `XXXPART2` | `$4077`, the episode loader's `JMP $4077` | `parts/the-bomb/work/entry.vsf`; `office.vsf` (Gordon's, your office, in play) |
| `sas-assault` | `XXXF0`, `XXXF1`, `XXXF2`, loaded through the KERNAL | `$C000`, the episode loader's `JMP $C000`, with `$01` = `$37` | `parts/sas-assault/work/entry.vsf` |

## Steady state

The title and episodes one and two run with `$01` = `$15` (`$05` as
written): RAM at `$A000`-`$BFFF` and `$E000`-`$FFFF`, the chips at
`$D000`. The KERNAL is banked out for good; the game's own disk
operating system lives in the RAM under it at `$EB00`-`$FFFF` and is
called through `$EC00` with a function number in A (some functions read
arguments from the bytes after the call). The interrupt vector at
`$FFFE` is `$413F` on the title (the tune's raster interrupt), `$5C15`
in episode one and `$413F` in episode two. The NMI vector points at an
`RTI` (`$090D`) on the title and at the episode's own code in play
(`$68B8` in one, `$40B5` in two).

Episode three is a separate program, written by another programmer: the
episode loader restarts the KERNAL (`$0850`: `$01` = `$37`, IOINIT,
RAMTAS, RESTOR, CINT), loads its three files with the KERNAL's LOAD and
jumps to `$C000`.

Nothing is reloaded during an episode ("An entire episode, once loaded,
requires no further disk access", the manual); the disk is read again
only to save or load a game.

## The loader, in a paragraph

`GAME` is a BASIC line, `SYS 3584`. Its code at `$0E00` opens the
drive's command channel and reads track 1, sectors 0 to 4, with the
drive's block commands into `$C000`-`$C4FF`, retrying each three times
(`DISK ERROR - PLEASE START OVER` on failure), and jumps to `$C000`.
That second stage inverts everything from `$C071` up (`EOR #$FF`), and
the decoded code fetches the episode loader into `$0800` and jumps to
`$080E` with `$99` = `$2C` as a first-time flag. The episode loader
(`$080E`) loads `XXXMYOS1` and runs it at `$8000`, which installs the
disk operating system at `$EB00`, banks the KERNAL out, then loads and
runs `XXXCOPY` at `$4000` and `XXXTPAGE` at `$4000`. The title program
returns the episode chosen in A, and the episode loader loads that
episode's files and jumps into it. The loader's own sectors (the 43 no
file holds) were not decoded further.
