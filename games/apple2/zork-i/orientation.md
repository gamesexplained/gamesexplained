# Zork I — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`Zork I r15-UG3AU5.woz`, 234,846 bytes, SHA-1
`f76f5449f512a51fd2ec9ecb101788a7f32d87a2`, from the zip
`Zork I r15-UG3AU5 (woz-a-day collection).zip` (SHA-1
`cbaf613220cd14c240ea7bc8a0740d674328c931`) in archive.org's A Woz A Day
collection, item `wozaday_Zork_I_r15`. It is a copy of Infocom's original
disk, release 15, serial number UG3AU5, as the game's own banner and
VERSION command print it. Copied into `work/` as `zork1-r15.woz`.

What the header says (`python3 kit/apple2/disk.py info work/zork1-r15.woz`):
WOZ 2, CRC good, made by Applesauce v1.84, write protected, a 16-sector
boot sector, 32K required, for every Apple II from the II to the IIgs. The
META chunk names the title, Infocom, "Dave Lebling|Marc Blank", 1980 and
`r15-UG3AU5`. 35 whole tracks, every address field D5 AA 96 with volume 1.
The data fields are not all DOS's:

| Tracks | Data field prologue | What they hold |
|---|---|---|
| 0 | D5 AA AD, as DOS writes | the boot sector and the second stage loader with its disk routines |
| 1 | D5 AA BC | the interpreter, $0800-$17FF |
| 2 | D5 AA BC for sectors 0-2, 4-6, 8-9, C-D; D5 AA AD (empty) for the rest | the interpreter, $1800-$21FF |
| 3-22 | D5 AA BC | the story file, 320 pages of 256 bytes, 81,920 bytes |
| 23-34 | D5 AA AD | formatted, every byte zero |

There is no DOS catalog: track 17 sector 0 is a page of the story.
`disk.py sectors work/zork1-r15.woz -o work/disk/bc-phys.dsk --order physical --data D5AABC`
reads tracks 1-22, and the same without `--data` reads tracks 0 and 23-34.

## From power-on to play

1. `python3 kit/scripts/tools.py apple2ts`, then put the WOZ in drive 1 and
   power on (`disk`, then `reset` with `hard`, or `boot`).
2. No menu, no trainer, nothing to choose. The IIe's boot ROM reads
   track 0 sector 0 to $0800; it reads nine more sectors of track 0 to
   $2200-$2BFF and jumps to $2300, which reads tracks 1 and 2 to
   $0800-$21FF and jumps to $0800 at cycle 5,320,126. Saved there, stopped
   before the instruction at $0800 runs: `work/entry.json`, the hand-over.
3. The interpreter at $0800 reads the story's first $48 pages to
   $2C00-$73FF and starts the Z-machine. The first time the 6502 reaches
   $09AB (the top of the loop that fetches each Z-machine instruction) is
   cycle 9,601,084. Saved there, stopped before $09AB runs:
   `work/zstart.json`. The screen still shows the IIe's own `Apple //e`.
   **This is the snapshot the listing is built from** (below, "Steady
   state", says why).
4. Running on from there with nothing pressed, the game clears the screen,
   prints the banner and West of House, and waits at the `>` prompt by
   cycle 30,832,228 (about 30 s of the machine's time from power-on):
   `work/play-west-of-house.json`, saved with the machine waiting for a key
   (PC in the IIe's firmware at $C28B).
5. From that snapshot, typing `north`, `east`, `open window`, `enter house`,
   `west`, `take lamp`, `take sword`, `move rug`, `open trap door`,
   `turn on lamp`, `down`, each with RETURN and 240 frames after it, gives
   `work/play-cellar.json` (score 35 in 11 moves).

## Steady state

- **No interrupts.** The interpreter has no `SEI`, `CLI` or `RTI` and
  leaves the IIe's vectors alone. Its one `BRK` is the fatal error at
  $21E7, which drops into the Monitor (`facts.md`).
- **Banking:** at the Z-machine start and at the prompt the language card
  is off for reading (`lcram` false), main memory is read and written
  (`ramrd`, `ramwrt` false), 40 columns, text page 1. Nothing in the
  interpreter switches the language card on (`facts.md`).
- **Where things are**, read from the snapshots and the disk:

  | Range | What | From |
  |---|---|---|
  | $007C | an `RTS` ($60) the dispatcher calls before every Z-machine instruction ($0A2E) | written by the loader at $232F |
  | $0080-$00FF | the interpreter's variables; $0800 clears them first | |
  | $0356-$03FF | the 6-and-2 decoding table the IIe's boot ROM builds | the ROM |
  | $0800-$21FF | the interpreter, 26 pages | tracks 1-2 |
  | $2200-$23FF | four tables of 128 bytes, the interpreter's record of which story page is in which buffer, built at $0833-$0868 | written by the interpreter over the loader's first pages |
  | $2400-$2BFF | the disk routines, from track 0; $2700-$28FF are their nibble buffers | track 0 |
  | $2C00-$73FF | the story's first $48 pages, read once at start-up and kept | tracks 3-7 |
  | $7400-$BFFF | 76 buffers for pages of the rest of the story, filled from $BF00 downwards as pages are needed | tracks 7-22 |

- **Why the Z-machine start and not play.** At West of House the
  buffers at $B200-$BFFF hold fourteen pages of the story that the first
  turn happened to need, and play would change which; at the Z-machine
  start every buffer is still empty ($FF from power-on) and the story's
  first $48 pages are exactly as on the disk except one byte of the
  header, which the interpreter changes as it loads (`facts.md`). The
  interpreter's code is the same in both, apart from five bytes at
  $1DB0-$1DBA that it keeps its own variables in. The code map recorded
  from the Z-machine start to the prompt ran 2,015 addresses, all in
  $0800-$1EFF, $2400-$2AFF, $007C and the ROM.
- **Reloaded per level?** There are no levels. The interpreter reads a
  page of the story from the disk whenever the Z-machine needs one that is
  not in memory, so the disk turns throughout play. Those pages are data
  the game fetches into buffers, not parts (`kit/skills/core/10-orient`),
  and the snapshot's buffers are left out of the count.

## The loader, in a paragraph

Track 0 sector 0 is DOS 3.3's boot sector, unchanged in its code: told by
its last two bytes to read ten sectors ($08FF = 9, counting down) to
$2200 and up, it does so with the boot ROM's own sector reader and then
jumps to $2300. The second stage there counts 26 sectors of tracks 1 and 2
through the disk routines at $2900, reading each with the data prologue
D5 AA BC, into $0800-$21FF, and jumps to $0800. The disk routines it uses
stay at $2400-$2BFF and are the interpreter's for the rest of the game: an
RWTS like DOS 3.3's whose reads and writes use D5 AA BC for the data
field, which is the copy protection.
