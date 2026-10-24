# Karateka — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`Karateka.woz`, 233,451 bytes, SHA-1
`426b10497d927ad8704f252b1f948aa259d1f608`, from the zip
`Karateka (woz-a-day collection).zip` (168,174 bytes, SHA-1
`19a22a7575d45c34ef7b082e2125ba627a5caee1`) in archive.org's A Woz A Day
collection, item `wozaday_Karateka`. It is a copy of Brøderbund's original
disk, side A, made by 4am with Passport.py on 14 August 2018. Copied into
`work/` as `karateka.woz`. The same zip holds side B
(`Karateka side B.woz`, SHA-1 `58c3cf8c66c48eac9d0602a3a5437b03577edbe9`),
the copy of the game with every picture upside down; it is kept in `work/`
as `karateka-side-b.woz` and was not analysed.

What the header says (`python3 kit/apple2/disk.py info work/karateka.woz`):
WOZ 1, CRC good, write protected, cross-track synchronized, "fake bits
cleaned". The META chunk names Karateka, Brøderbund Software, Jordan
Mechner, 1984, 48K, every Apple II from the II to the IIgs, "Disk 1, Side
A". 33 whole tracks (0-32) and two quarter tracks, 2.25 and 2.50. Only
track 0 has a standard address field: one 16-sector field (D5 AA 96), the
boot sector, and 13-sector-style fields (D5 AA B5) ending EF FF instead of
DE AA. No other track has a field DOS could read, so there is no catalog
and no file to extract: the game reads its own format (below).

## From power-on to play

1. `python3 kit/scripts/tools.py apple2ts` (the enhanced IIe, the kit's
   default; the disk also runs on a II Plus), then put the WOZ in drive 1
   and power on (`disk`, then `reset` with `hard`).
2. Nothing to choose. The boot ROM reads the boot sector and the loader
   (below) brings in the engine; the game's first instruction, $0200, is
   reached at cycle 5,649,360 (5.54 s). Saved there, stopped before the
   instruction at $0200 runs: `parts/engine/work/entry.json`.
3. $0200 loads stage 0, the title and demo, and enters it through $BFFA at
   cycle 7,714,886: `parts/title/work/entry.json`. The motor stops at 7.55 s.
4. The KARATEKA title is up by 20 s (`parts/title/work/play.json`, saved at
   cycle 20,409,682), then the prologue scrolls up, Akuma's chamber, and a
   self-running demo on the cliff.
5. **SPACE** at the title (any key but the special ones; `kit/apple2/apple2ts.py
   key " "`, held until $B7DE runs) starts the game: the game loads the
   castle picture and then stage 1, and enters stage 1 through $BFFA 7.6 s
   later (`parts/cliff/work/entry.json`, cycle 28,188,775, from the title's
   play snapshot with SPACE pressed at once and taken at cycle
   20,409,845). The castle picture shows, then the hero
   climbs onto the cliff while the opening tune plays. Keys pressed while the
   tune plays are read by the tune's loop and dropped.
6. **K** selects keyboard control (the game starts on the joystick, which
   reads as centred). Wait for the tune to end (about 15 s after the cliff
   appears; the code at $0D10-$0DFF stops running), then **RIGHT arrow**
   once: the hero runs. Two seconds later, **SPACE**: he takes a fighting
   stance as the first guard does. Saved 6 s later:
   `parts/engine/work/play.json` and `parts/cliff/work/play.json`, the same
   file, both fighters in stance on the cliff.
7. The later stages, played through. The route needs every fight won. A
   script that fights in stance (RIGHT, A, RIGHT, S, RIGHT, Q, W, one key
   every 12 frames) while it writes 14 to $B6 (the hero's arrows) and 1 to
   $B7 (the opponent's) after each key won every fight of stage 1 and went
   on into stage 2: its snapshot at the moment $D0 read $AA (the loader's
   own zero page, swapped in while it reads) ran on to $BFFA with stage 2
   loaded, `parts/palace/work/entry.json`. Its play snapshot,
   `parts/palace/work/play.json`, is the same script 50 s into stage 2.
   - **The last portcullis of stage 2** falls on the hero whenever he
     reaches it standing, running or in stance ($B93D-$B965 drops it when
     his position, $62, is $1E-$21). Taken in stance to $1D, one step
     short, a punch or kick there drops it harmlessly; it rests on the
     floor for 20 of the game's frames and rises one step a frame, and
     the hero, standing and running at it (SPACE, then RIGHT) as it rises,
     passes under it to stage 3. From `work/bot-d-f020400.json`: RIGHT
     taps in stance to $1D, A, wait for $A8 to read $FF, SPACE, RIGHT.
     Stage 3 entered through $BFFA at cycle 788,172,200:
     `parts/dungeon/work/entry.json`.
   - **Stage 3** was played by a second script: in stance (SPACE whenever
     $6F, the hero's standing flag, reads $FF) while $5E says an opponent
     is alive, standing and running (SPACE then RIGHT, each held ten
     frames) when none is, the same arrow writes. At each doorway it had
     not passed before the hero bounces back; a kick there opens it (W,
     in stance at $62 = $1D, $1E or $1F; $73E4-$7418). The script kicked
     each doorway open, killed the hawk and went through to stage 4, entered
     through $BFFA at cycle 1,051,729,966: `parts/akuma/work/entry.json`.
     `parts/dungeon/work/play.json` is that script fighting a guard in
     stage 3 (cycle 849,779,971).
   - **Stage 4**: the same script without the write to $B7 fought Akuma;
     `parts/akuma/work/play.json` (cycle 1,133,755,220) has both in stance
     at the chamber's right doorway. With the write to $B7 left in, Akuma
     fell to one blow and the script ran to Mariko and the closing text.

   A stage loaded by play matches the same stage loaded by the game's own
   loader from any snapshot ($D0 set to the stage, PC to $020C) at all
   12,288 addresses: checked for stages 2, 3 and 4.

## The parts

The engine stays in memory from the boot to the end. Each stage is loaded
over it, always at the same addresses, $1000-$1FFF and $A000-$BFFF
(12 KB, 48 pages), and the stage that was there is gone. $D0 holds the
stage number; $0200-$02C8 in the engine sets it and calls the loader at
$0300 (the cliff and the palace keep an earlier copy of those routines at
$111B, which nothing calls), then checks the three bytes at
$BFFD-$BFFF, which each stage ends with: $BFFD is the stage number,
$BFFE is it EOR $3B, $BFFF is it EOR $49.

| Part | Stage | Tracks | Loaded to | Entry | What the player sees |
|---|---|---|---|---|---|
| engine | | 27-32, and track 0 | $0200-$0FFF, $6000-$9FFF | $0200 | |
| title | 0 | 7-10 | $1000-$1FFF, $A000-$BFFF | $BFFA, `jmp $B760` | the KARATEKA title, the prologue, Akuma's chamber and the demo |
| cliff | 1 | 11-14 | the same | $BFFA, `jmp $B700` | the castle picture, the cliff, the fence, the guards and gates up to the palace door |
| palace | 2 | 15-18 | the same | $BFFA, `jmp $B700` | Mariko in her cell, Akuma sending the hawk, the palace hall with its sliding doors, guards, the hawk, the portcullises |
| dungeon | 3 | 19-22 | the same | $BFFA, `jmp $B700` | Mariko in her cell, the stairs down, guards in rooms with two doorways, the hawk |
| akuma | 4 | 23-26 | the same | $BFFA, `jmp $B700` | the shut door, Akuma, Mariko, the closing text |

The castle picture, tracks 4-6, is not a part: the game reads it into
$A000-$BFFF (over the stage that was there, with its last four sectors
thrown into $4000), copies it to the screen and then loads stage 1 over it.

| Tracks | Sectors | Memory | From the loader's table at $5400 |
|---|---|---|---|
| 4-6 | 36 | $A000-$BFFF, then 4 sectors to $4000 | row $00 |
| 7+4n to 10+4n, n = 0-4 | 48 | $1000-$1FFF, $A000-$BFFF | row $30 |
| 27-32 | 72 | $0800-$0FFF, $6000-$9FFF | row $70 |

All five stages were loaded with the game's own loader (`lda #n; jsr
$0300` from a stub at $0400, on `parts/title/work/play.json`) and each
ended with its own stage number at $BFFD-$BFFF.

## Steady state

- **No interrupts.** The processor runs with I set throughout; nothing
  installs a handler. The game is one loop that draws on one hi-res page
  while the other is shown: $07 holds the page being drawn, $20 or $40,
  and $7609 flips them ($C054, $C055).
- **The language card** is switched in for reading (`lcram` true, bank
  2, `lcwrite` false) and holds a copy of the ROM, made by $03DC, with one
  change: the reset vector at $FFFC points to $0309, as does page 3's
  soft-reset vector ($03F2), and the break vector ($03F0) points to
  $030C. Both clear $0800-$BFFF and boot the disk again ($030C-$0335).
  Auxiliary memory and the language card's other bank hold nothing.
- **The keyboard** is read by $7697 (the special keys), by $0D10 inside
  the music loop and by $6E6C in a fight; the joystick by $6D09 (the
  stick) and $6D6A (the buttons).
- **The disk** is read only between stages, by $0300.

## The loader, in a paragraph

The boot ROM reads track 0's 16-sector boot sector to $0800. From there
the rest of track 0's own sectors (D5 AA B5 address fields) come in, and
the code they bring to $1000 writes pages $02-$07 (its last store there is
at $1083). Every later read goes through
$0338: it swaps zero page with $4F00, turns the motor on, reads two pages
from the track the head is on into $4000 (marks F5 D5 DA, each byte from
two disk bytes: a `rol` and an `and`), and calls $4000 with A holding what
to load. That stage steps the head in half tracks and reads $5000-$57FF,
whose routine at $5500 reads twelve 256-byte sectors a track, each found
by its own mark (the table at $414C), into the pages its table at $5400
gives; $5000 picks the table's row and first track from A ($80 for the
boot, $10 for the castle picture, n for stage n). The boot ($5300) then
clears zero page, sets $D0 to 0, $D2 to $FF and the sound on, and jumps to
$0200. The engine's listing describes the loader in full: $0300-$03FF,
$4000-$41FF and $5000-$57FF. After every load $5000 clears the bytes
$78-$7F and $F8-$FF of each page of $4000-$5FFF, hi-res page 2's
unseen bytes, which in three places ($4078, $40F8, $5778) are the
loader's own code: harmless, since $0338 reads $4000-$41FF from the disk
again for every load, and $4000 reads $5000-$57FF.
