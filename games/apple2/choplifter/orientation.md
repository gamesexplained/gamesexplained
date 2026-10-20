# Choplifter — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`Choplifter.woz`, 360,719 bytes, SHA-1
`1c4983656937762ae71646480396cf50541efc94`, from the zip
`Choplifter (woz-a-day collection).zip` in archive.org's A Woz A Day
collection, item `wozaday_Choplifter`, downloaded on 20 October 2026.
It is a flux-level copy of Broderbund's original 1982 disk, not a crack.
Copied into `work/` as `choplifter.woz`. The printed matter is read as
archive.org's OCR text, kept in `work/`: the instruction card
(`manual.txt`, item `ChoplifterManualAppleII`), and the instructions and
the folder from the boxed copy in item `broderbund-choplifter-a2-ph`
(`instr.txt`, `folder.txt`). The 4am crack's notes (`crack.txt`, item
`Choplifter4amCrack`) are read only for what they say about the disk.

What the header says (`python3 kit/apple2/disk.py info work/choplifter.woz`):
WOZ 2, CRC good, made by Applesauce v1.61.3, cross-track synchronised,
fake bits cleaned, a 16-sector boot sector, for the Apple ][ and Apple ][
Plus with 48K. The META chunk names Choplifter, Broderbund Software, Dan
Gorlin, 1982, `requires_machine 2|2+`, contributor ianoid, imaged
2019-09-08. 54 track images: every whole track 0-34, and the half tracks
12.50 to 30.50. No track reads as DOS 3.2 or 3.3 sectors: track 0 has one
16-sector address field (the boot sector) and two 13-sector ones with bad
checksums and epilogues, and the rest have no address fields DOS would
know. There is no catalog and no file to extract; `disk.py catalog` and
`extract` have nothing to read.

## From power-on to play

1. `python3 kit/scripts/tools.py apple2ts --model iiplus`: the kit's
   Apple2TS server as an Apple II Plus. **The disk stops on the enhanced
   IIe** with a lone `M` on the text screen (below, "The loader"), so the
   kit's default IIe will not do.
2. Put the WOZ in drive 1 and power on (`disk`, then `reset` with
   `"hard": true, "model": "iiplus"`). Nothing to choose: no menu, no
   trainer. The title picture builds up on hi-res page 1 from about
   2.8 million cycles while the disk loads.
3. The loader jumps through `($0020)` to `$0800` at cycle 10,635,872
   (about 10.4 s of the machine's time). Saved there, stopped before the
   instruction at `$0800` runs: `work/entry.json`, the hand-over. Find it
   by running to frame 602, then a stopping exec checkpoint over
   `$0800-$BFFF`: the loader runs entirely below `$0800`, so the first
   stop is the hand-over. **This is the snapshot the listing is built
   from** ("Steady state" says why).
4. Run on 600 frames with nothing pressed: the title stays a few seconds,
   then the attract mode plays ("your mission: RESCUE HOSTAGES", a
   helicopter flying a demonstration sortie).
5. Press SPACE (any key starts play, the manual says), hold it 3 frames,
   release, and run 360 frames: `work/o6-after-key.json`, the helicopter
   on its pad at the post office.
6. From there, push the stick up (paddle 0 at 128, paddle 1 at 0) for 50
   frames, centre it (128, 128) for 10: `work/play-sortie1.json`, the
   helicopter airborne above the base, the first sortie. The game reads
   the joystick through the Monitor's `PREAD` ($FB1E): paddle 0 is left
   and right, paddle 1 up and down, button 0 fires and button 1 turns
   the helicopter.

The model is recorded in `game.json` (`tools.emulator`) and in each
snapshot (`"model": "APPLE2P"`).

## Steady state

- **No interrupts.** The game's first two instructions are `CLD` and
  `SEI`, nothing on a II Plus raises an interrupt, and the game runs as
  one main loop. Page 3's vectors at hand-over and in play: BRK
  (`$03F0`) at `$0326`, RESET (`$03F2`) at `$0320` with a valid power-up
  byte, both into the loader's error printer, which stays resident: a
  RESET during play blanks the screen to a lone `R`, beeps and erases
  memory upwards from `$5BB0` (seen with a CONTROL-RESET from
  `play-sortie1.json`).
- **Two hi-res pages, flipped.** Play shows page 1 and page 2 in turn
  (`$C054`/`$C055`, 33 and 32 reads in 330 frames from `play-sortie1`),
  drawing on the page not shown. Text is off, mixed mode off.
- **The ROM stays in.** The language card is never switched in to be
  read; the game calls the Monitor's `PREAD` for the paddles and nothing
  else of the ROM was seen in play (code map, 330 frames).
- **Where things are**, from the code map of 330 frames of play from
  `play-sortie1.json`: code at `$0C00-$1C01` and `$6000-$9EA7`, with a
  jump table of 33 entries at `$1000-$1062` whose routines take inline
  arguments after the `JSR`. `$2000-$5FFF` are the two hi-res pages.
  Input is read at `$0D92`-`$0E3B` (`$C000`, `$C010`, `$C061`, `$C062`),
  the speaker is clicked at `$76E9`-`$76FA` and `$78BB`-`$78DE` (each
  click of `$C030` is followed by one of `$C020`, the cassette output, as
  the manual's "routed through the cassette port" says).
- **Nothing is reloaded.** The drive's motor stops before the hand-over
  and the game never touches slot 6 again.
- **Which image.** The hand-over and play agree on the program except a
  few variables and self-modified operands. At the hand-over both hi-res
  pages hold the loaded title picture (identical, 8 KB each: the score
  bar, the stars, the planet, the ground and the Broderbund, Choplifter
  and Dan Gorlin lettering), which play draws over. The picture is
  authored data that only the hand-over holds, so the listing is built
  from `work/entry.json`, with `--entry work/play-sortie1.json` for the
  check of untracked data.

The emulator's check before the run (`check-emulator`, 20 October 2026):
49 passed, 0 failed. No workaround was needed.

## The loader, in a paragraph

The II Plus's boot ROM reads the one 16-sector sector on track 0 to
`$0800`, and the stages after it live at `$0200-$07FF`. Measured from
power-on as II Plus (the head's stepper phases on `$C0E0-$C0E7`, and the
cycle at which each page of memory reached its hand-over contents): from
about 2.6 million cycles the head moves out a whole track at a time from
track 1 to track 11, and the title picture arrives in `$2000-$3FFF` while
the head is on tracks 1 to 4; from 4.9 million it steps half a track at
a time from 11.5 to 31, and `$0800-$1FFF` (head on 12 to 15) and then
`$4000-$BFFF` (15 to 31) arrive, the second copy of the title in
`$4000-$5FFF` among them. Then it moves a quarter track at a time to
track 32, reads a field marked `D5 FF DD` into `$0400` with a 4-and-4
read at `$0620-$066D`, sums `$0800-$1FFF` and `$4000-$BFFF` at
`$0674-$06A1` (an exclusive-or that must come to `$29` and an add that
must come to `$31`) and jumps through `($0020)` to `$0800`, or to its
error printer with `L`. The printer at `$0320` has six entries, each
loading one letter (`R`, `!`, `P`, `L`, `D`, `M`): it clears the text
screen, shows the letter, beeps and erases memory. Earlier, while the
head is on track 11, a check at `$62A0-$62FA` compares stretches of the
Monitor ROM (`$FB2F`, `$FB4B`, `$FBC1`, `$FBFD`) with copies the loader
carries, one set for the original Apple II's Monitor and one for the
Autostart ROM, chosen by the byte at `$FFFD`, and stops with `M` on a
difference. The enhanced IIe's Monitor differs at `$FB51` (its window
setup makes room for 80 columns), which is why the disk stops there at
cycle 4,586,141. The code at `$6000` that does it is overwritten by the
game's own later in the load. Not annotated further, by policy.
