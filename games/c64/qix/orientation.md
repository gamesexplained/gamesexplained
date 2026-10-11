# Qix — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`qix.d64`, 174,848 bytes, a plain 35-track sector image (no error bytes,
no header: the size of a standard D64). It is a crack by North East
Crackers (NEC), distributed by c64.com: the disk name is `C64.COM`, ID
`2A`. The directory lists ten entries:

| Entry | Type | Blocks shown | What it really is |
|---|---|---|---|
| `----------------` ×3 | DEL | 0 | separators |
| `QIX/NEC` | PRG | 37 | the crackers' intro, packed; `SYS 2087` |
| `-` | PRG | 75 | first sector at 18/6: a 426-byte stub loaded at `$02D0`; the real file starts at 17/1 |
| `SCENE` | PRG | 27 | same stub; real file at 19/0 |
| `TAITO` | PRG | 1 | same stub; real file at 20/4 |
| `TITLE1` | PRG | 32 | same stub; real file at 20/5 |
| `TITLE2` | PRG | 33 | same stub; real file at 14/2 |
| `ALIEN` | PRG | 163 | same stub; real file at 22/0 |

Every entry but `QIX/NEC` points its first track and sector at the same
two-sector stub. The real start of each file is kept in the entry's
side-sector field (bytes `$15`-`$16` of the entry), and the block count
is the real file's. `c1541 -extract` therefore writes six copies of the
stub; the real files are read by following the chains from those
side-sector fields. Their contents are the fast loader's own stream
format, not plain programs.

The game itself is Taito America's Qix for the C64 (the title screen
reads `COPYRIGHT 1981,89 TAITO AMERICA CORP.`, and the loading screen
names Alien Technology Group).

## From power-on to play

The crack's fast loader works only on an NTSC machine. On PAL the
transfer stalls in the loader's wait loop at `$0181`-`$0184`, or the CPU
jams at `$0154`. The analysis was done on NTSC throughout.

1. Emulator: VICE x64sc with the drive's own processor emulated. In
   `tools/vice-home/config/vice/vicerc`, under `[C64SC]`:
   `Drive8Type=1541`, `Drive8TrueEmulation=1`, `TrapDevice8=0`. Without
   these, the loader's `M-E` lands on a drive with nothing in it.
2. Set the machine to NTSC (`MachineVideoStandard` = 2), then do a hard
   reset.
3. Autostart `qix.d64`, file `QIX/NEC`. The NEC intro appears ("HERE
   PRESENTS ... NORTH-EAST CRACKERS") after about 20 seconds.
4. Tap SPACE. Fire does nothing here, and holding SPACE for 0.6 s was
   followed by the jam described above (on PAL; not retried on NTSC).
5. The loader loads four files in turn, about 75 seconds in all at
   normal speed: `-` (the Alien Technology Group screen is shown while
   loading), `TITLE1`, `TITLE2`, then `ALIEN`. The joystick fire pressed
   during the title picture is taken; the game reaches its own title
   screen once `ALIEN` is in.
6. The hand-over: the loader ends with `JMP $8000` (its operand and the
   value it puts in `$01`, `$36`, are the first two bytes of the file's
   stream). A stopping checkpoint on `$8000` after the fourth end-of-file
   marker gives `work/entry.vsf`.
7. From `work/entry.vsf`, run 8 seconds: the start-up shows the title
   picture and waits in its title loop at `$805E`. Snapshot:
   `work/title.vsf`. **This is the image analysed and listed.**
8. Fire on port 2 at the title gives the menu (1 PLAYER, 2 PLAYER,
   PRACTICE). Fire again with 1 PLAYER highlighted starts a game.
   Snapshot in play: `work/play-round1.vsf` (taken on another boot by
   the same route, a few seconds into the first round).

Other snapshots in `work/`: `intro-ntsc.vsf` (the NEC intro, before
SPACE), `menu.vsf` (the menu).

## Steady state

| | Hand-over (`entry.vsf`) | Title (`title.vsf`) | Play (`play-round1.vsf`) |
|---|---|---|---|
| `$01` | `$36` | `$35` | `$35` |
| IRQ `$FFFE` | (ROM) | `$820A`, a chain of raster handlers | `$8392` |
| NMI `$FFFA` | (ROM) | `$1180`, an `RTI`: RESTORE does nothing | `$1180` |
| `$0314` / `$0318` | `$EA31` / `$FE47` | `$8397` / `$1180` | `$8397` / `$1180` |

The game runs with BASIC and the KERNAL banked out (`$01` = `$35`),
except the start-up, which runs at `$36`. The screen is a hires bitmap
at `$2000` with its colour matrix at `$0400`, in VIC bank 0 (`$D011` =
`$3B`, `$D018` = `$19`, `$DD00` bits 0-1 = `%11`). The emulator's
check found no failed checks on vice-mcp v3.13.2 (57 of 57).

Where the code runs (sampled program counters, play): `$8000`-`$B7FF`
and a little at `$1E00`. The start-up and the title shell live at
`$8000`-`$8300` and `$C000`-`$DFFF`; the start-up's routine at `$884C`
copies 8,000 bytes from `$4000`-`$5F3F` to `$E000`-`$FF3F` and calls
`$E000` and `$E003` there. During play the game reuses `$C000`-`$FFFF`
and `$5D00`-`$7FFF` as working memory, so `title.vsf` is the one image
that holds the whole program at once: it differs from the hand-over
only in the screen, the bitmap and the copy at `$E000`.

Whether anything is loaded after `ALIEN` (the `SCENE` and `TAITO`
files are not loaded on the way to play; the game keeps the drive
number at `$1550` and the names `SCENE` at `$C316` and `TAITO` at
`$1ABB`) is answered under "The loader" below once traced.

## The loader, in a paragraph

`QIX/NEC` unpacks the crackers' intro into `$0801` and runs it. On SPACE,
the intro calls the KERNAL's LOAD for the file `-`. The stub that loads
at `$02D0` overwrites the KERNAL's STOP vector (`$0328`) with `$02ED`, so
the LOAD's first call to STOP runs the stub. It copies itself into the
stack page and `$0200`, then sends `M-E $07C0` to the drive. The drive
code at `$07C0` sits in the disk's BAM sector, which the drive already
holds in its buffer at `$0700`. It reads three more sectors of drive code
from track 18 (sectors 12, 15 and 18). The drive then sends each file to
the C64 two bits at a time on the serial bus's clock and data lines. The
C64's side, at `$0100`-`$02FF`, writes the stream as segments: an
address, a byte count, then the data, with `$D7` marking a run. An
address of 2 ends the file, and the file's first two bytes set the
address it jumps to and the value it leaves in `$01`. The loader is not
annotated further.
