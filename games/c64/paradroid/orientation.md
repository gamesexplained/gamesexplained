# Paradroid — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

Hewson Consultants' original UK disk of 1985, as the C64 Preservation
Project dumped it: `paradroid[hewson_1985](pal)(patched).g64` from the
G64 zip of the C64 Preservation Project 10th Anniversary Collection on
the Internet Archive (309,954-byte unpatched G64 SHA-256
`219ab954…bbeb`; patched G64, 333,744 bytes, SHA-256
`8002eded…0498`). The header of both reads `GCR-1541`, version 0, 84
half-tracks: a track-level image of a protected original, which needs
the drive's own processor.

The directory holds one file, `PARADROID`, one block, 200 bytes, loading
at `$02EA`. Tracks 1-8 and 36-39 are in a format of the loader's own and
hold no DOS sectors; tracks 9-35 read as ordinary sectors, and only the
directory and the BAM track are used. The disk name is `\r\x91\x05\x12
DIRECTORY\x92` and its id `\x14\x14`.

The plain dump does not load in VICE 3.10 (vice-mcp v3.13.2): after the
first stage the drive steps to track 38, and its processor waits for ever
for a byte at `$07C1` while the C64 waits on the serial bus at `$0382`.
The collection's "patched" dump of the same disk loads. Its DOS sectors
are byte for byte those of the plain dump, and so are the data blocks on
tracks 1-8, where the loader reads the game: only the gaps between the
blocks are longer (sync marks of 4-5 bytes where the plain dump has 2-4).
What changes is the protection: tracks 37-39 are rewritten and 40-42
added. So the game that arrives in memory is the one on the original
disk, and this is the image the analysis uses.

Hewson's 1986 UK disk (`paradroid[hewson_1986](pal).g64`, named
`HEWSON (UK DISK)`, a standard DOS file layout) is a different build: in
play its memory agrees with the 1985 game's everywhere but the working
areas and a handful of code bytes, such as `$1830` and `$1841`, a `BNE`
in 1985 and a `BEQ` in 1986. It is not analysed here.

## From power-on to play

1. Attach the patched G64 to drive 8 (`vice_disk_attach`), hard reset
   the machine (`vice_machine_reset` `hard`), wait four seconds for
   `READY.`, then type `LOAD"*",8,1` and RETURN with `vice_keyboard_type`.
   Do not autostart it: VICE's autostart loads the boot file through the
   virtual drive, so the drive's RAM never holds the BAM sector whose
   bytes from `$07B0` the boot file runs (`M-E` to `$07B0`), and the drive
   jams at `$07CE`. The script is `work/s/boot.py` in this run.
2. The boot file overwrites the BASIC idle vector at `$0302` with `$0334`,
   so the load starts the loader with no `RUN`. The screen blanks to
   light blue for about 28 seconds.
3. The title screen (the PARADROID logo, "BY ANDREW BRAYBROOK") then
   plays its tune. Press fire on joystick port 2: the briefing for the
   001 shows ("Game on!"), and about six seconds later the 001 is on the
   first deck and the status bar reads "Mobile".
4. Snapshots in `work/`: `start-1000.vsf` is the hand-over, a stopping
   checkpoint on `$1000` armed once the loader is in its byte loop at
   `$036B` (`work/s/which_start.py`); `entry.vsf` stops on `$1078`, after
   the game's start-up has put its blocks in place (`work/s/handover3.py`),
   and is the image the listing is built from; `title.vsf` the title
   screen; `play-deck-start.vsf` the first deck, a second after boarding.

## Steady state

In play the processor port `$01` reads `$35`: the game writes `$25`, and
bit 4 reads back as the cassette sense line. The KERNAL and BASIC are
switched out and the I/O is in. The game owns the hardware vectors in
RAM: IRQ `$FFFE` changes through the frame, NMI `$FFFA` is `$6FE9`,
RESET `$FFFC` is `$1078`, the cold start, so the reset button restarts
the game. The KERNAL's `$0314` still holds `$EA31` and is not used.

The raster interrupt is a chain. One frame of play recorded with
`kit/c64/frame.py capture` (`work/frame-play.json`) shows the handler at
line 254 setting `$FFFE` to `$6F04`, a handler at line 93 setting it to
`$6F4C` (`$4C` written at line 93) and one at line 120 to `$6EC0`, with
the high byte `$6E` written at line 246. The video bank is 1 (`$DD00`
= `$96`, `$4000`-`$7FFF`); `$D018` changes between `$21`, `$2F` and
`$2D` down the frame, so the screen and character set change at the
splits.

The loader starts the game at `$1000` with the processor port at `$37`.
The game's start-up there clears zero page, switches every ROM and the
I/O out (`$01` = `$24`) and copies five staged blocks to their places:
`$4000`-`$4BFF` to the RAM under the I/O at `$D000`-`$DBFF`,
`$5100`-`$53FF` to `$DC00`-`$DEFF`, `$8000`-`$9FFF` to `$E000`-`$FFFF`,
`$A000`-`$AFFF` to `$C000`-`$CFFF` and `$B000`-`$B2FF` to
`$0500`-`$07FF`. Comparing `start-1000.vsf` with `entry.vsf` shows
exactly those destinations changed, with zero page and the stack. It then
runs on into `$1078`, the cold start, where `$FFFC` points too, so a
reset skips the copying. At `$1078` the code and data are all in place
and the staged copies are still there; the game later overwrites them
with its working areas (decks are built at `$8000`-`$BFFF`). The page at
`$0800` holds a table that play changes. The listing is built from
`entry.vsf`.

The game is one load: once the title shows, the drive sits in its ROM's
idle loop and nothing is read again.

## The loader, in a paragraph

The boot file, loaded over the BASIC vectors at `$02EA`, blanks the
screen, sends `M-E` to `$07B0` and starts a receive loop at `$036B` that
takes bytes two bits at a time from `$DD00`. The drive code it starts is
in the BAM sector (track 18, sector 0, from byte `$B0`): it reads track
18 sector 11 (which ends with the name GEORGE HEYWARD) into `$0300` and
runs it from `$0700`. That code steps the head to track 38, checks the
protection there, then reads tracks 1-8 in its own encoding. The stream
it sends is triples of address low, address high and byte, which the
C64's loop stores where they say: it writes its own code too, first a
block-copy helper at `$07B0`, then a jump to `$0540` that clears memory
with SID noise and copies blocks, and in the end it starts the game at
`$1000`. Not annotated further, by policy.
