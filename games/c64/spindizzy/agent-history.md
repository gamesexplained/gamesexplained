# Spindizzy — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 31 October 2026: the Silver run

One agent did every step, with one checker for the sample.

**Orient.** The image is the C64 Preservation Project's G64 of Electric
Dreams' PAL disk. It loads with true drive emulation and no settings; the
snapshot `work/play-start.vsf` is the start room at the start of a game.
The Activision disk in the same collection is a different build and was
left alone.

**Features.** The manual (archive.org) and the C64-Wiki page gave the
documented list. The help screen (H on the title) names the world's
pieces and draws each one, which later settled which block is water and
which is ice.

**Coverage.** The code is five modules, each behind a jump table ($7000,
$8010, $8900, $9500, $9D00), annotated by hand in nine sessions
(`work/ann/01.txt` to `09.txt`). The world (386 room records at $0A00 and
127 structures at $0400) was annotated by a script from the record
format (`work/scripts/world_ann.py`, then `10-world.txt`), one comment a
record, so 518 of the listing's 821 comments are generated. The run-time
areas (the tile buffer, the room grid, the piece table, the colour
matrix, the sprites built at run time, the bitmap) are excluded in
`game.json` with a reason each; SPIN4's own bytes at $1400 are excluded
because only the copy at $0400 is read.

**A wrong turn: water and ice.** The first comments had them the wrong way
round: fill mode 2 ORs $20 into a type-0 cell and $60 into types 1-15,
and the first reading named $63 water. A live test (`live5.py`) pushed
Gerald onto each: in room (70, 59), whose floor is all $20, he fell
through; on $63 in room (68, 54) he slid on at a constant speed and, set
down at rest, was restarted. The help screen's labels sit beside the same
two blocks. `on_ice` ($9116) was renamed and every comment that said the
same was corrected (`14-ice.txt`).

**Verify.** Live tests (listed in `facts.md`) covered the cheat, the
clock at both speeds, RESTORE and Q, the inhabitants and I, a jewel,
survey complete, the time running out, water and ice, the inhabitants'
speeds (`live7.py`), the walls (`live10.py`) and the credits screen
(`live11.py`). Teleporting Gerald (`cheats.md`) into a cell with no floor
made him fall and restart over and over; `grid.py` dumps a room's grid so
that a cell with a floor can be chosen first.

**Sample.** 80 comments, seed 20261031, 60 from the 303 written by hand
and 20 from the 518 generated, checked by one checker that wrote none of
them; its brief and verdicts are in `work/reports/sample-1/`. 18 were
wrong. The checker's own tally of its hand stratum was off by two; every
verdict was read again against the code. The generated structure comments
counted block words as rooms and left out switched blocks, so the
template was fixed and all 127 were written again (`16-structs.txt`).

**The pages.** The room pictures are the game's own: `sp-room` runs
`new_game`'s start, `enter_room` and the sprite routines on the listing's
bytes in the kit's 6502. Four things went wrong on the way, each of which
showed itself:
- The listing has no bytes for zero page, so they read as 0. With $6F/$70
  at 0, `draw_picture` wrote through a pointer at $0000, changed the
  processor port and read the BASIC ROM; `sp-room` now sets $6F/$70 =
  $E040, $61 = $0F (the colour mask: at 0 every room takes scheme 0 and
  still looks right), the room and the view.
- The first emulator dumps of the bitmap read the KERNAL ROM: `read_mem`
  with no bank reads what the processor sees. `bank="ram"` reads the
  bitmap.
- Dumps after turning the view differed until the wait after the key
  went from 2 to 5 seconds: the redraw was not finished.
- `cpu.irq` with no handler jumps through $0314, which the listing does
  not hold; the sound driver passes $7066.
After that, 33 dumps (nine rooms, all four views) matched the page's
bitmap and colour matrix byte for byte, and `test_rooms.js` holds six of
them to screenshots. One empty place on the map (40, 40) keeps the last
room's colours in the emulator, so the pages draw only places with
records.

Writing the pages turned up two facts that read as right and were not:
the inhabitants' time drain and the lifts' speed were given per pass,
but with a lift or an inhabitant in the room the pieces run every other
pass ($8E2A). `facts.md` was corrected. The Discoveries widget for the
inhabitants showed that `steer_speed`'s comment named the carry where the
routine tests the sign, and it was corrected.

The contributor asked during the run for sound effect sections to sit
high on the page; with no music, the effects section follows the
opening section.
