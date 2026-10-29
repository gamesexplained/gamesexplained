# Barbarian — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 29 October 2026, the Silver run

Kit 0.0.267, VICE v3.13.2, regenerator2000 0.9.20, on a Linux cloud
container. The images came from the C64 Preservation Project's G64
collection on the Internet Archive.

**Orient and parts.** Both sides boot from their G64s in VICE with the
drive's own processor; the boot loader takes about 85 seconds of warp to
hand over at `$8009`. The two sides are separate loads of all of memory
with the same engine, side 2's shifted by its ending code (366 bytes from
`$8600`, 364 from `$9400`; `orientation.md`), so the run made two parts, `practice` and `tournament`, and
annotated side 1 first, then ported its names to side 2 by matching
16-byte pieces of code and annotated what side 2 adds. The C64-Wiki, the
Kixx re-release's instructions (Spectrum text) and Wikipedia gave the
features; no C64 manual scan was found.

**Sweep.** The strings sweep found `V 05 10 87`, `HELLO CLAIRE` and the
ending's messages, which led to the CTRL and V test in the key scan. The
disk has two files the directory lists as deleted with blank names: the
fast loader and 1.3 KB of the game's tables at `$CB00`, found by reading
the sectors the BAM marks used that no named file holds.

**Annotation.** Side 1 went routine by routine, then the data: moves,
frames, hit lists and records, the computer's tables, the music driver
and its 63 instruments. Side 2's port took its names from side 1 and
needed its own work only for the ending (Drax's stars, Mariana, the cell
and shape swaps) and the start-up differences. Two slips came from that
port and were caught later: side 2's `backdrop_colours` comment said
brown, copied from side 1, where side 2's bytes are dark grey; and the
irq comment missed that a nested timer A interrupt during the sequencer
skips its work but rewrites `$97`, so the effects run after it.

**Verify.** The live checks measured the main loop at 50 passes in 500
frames and saw every blow take exactly one point. A fresh agent on the
same model checked a sample of 60 comments (seed 2910) and found 6 wrong,
all hand-written; each was corrected, with every comment saying the same
thing on either side.

**The minisite.** The fighters are drawn into the bitmap, so the How it
works page runs the game's own drawing routines on the kit's 6502 over
the listing. Getting that to draw needed two things the restart routine
sets up: `bout_state` (`$B4`) at 0, or `read_stick` waits out a walk-on that never
comes, and the
mirror and mask tables built, or the right-hand fighter is invisible.
Writing the blows widget showed that lists naming a pose twice read the
second record from the wrong address; the first live attempt missed
because the computer started a new move, and holding the right-hand
fighter still until the blow's pass (`bug2.py`) caught it: a hit from
the music. `work/check_names.py` caught two wrong addresses in the page's
copy (`do_command` and `goblin_drags`), and checking a draft sentence
against the frames table showed that three frames the moves use have no
body piece. The Maps tab draws the four arenas with the game's own
`swap_backdrop`, and `test_levels.js` holds them to VICE's screenshots.
The copy pass caught two claims the code contradicts: the eighth bout
is already in the hall of arches (the live ending had set level 7 by
hand in the throne room, which is why it saw a swap), and a two-player
game changes arena whenever the clock runs out (`clock_out`). Pressing
F5 for the first time in VICE showed that the press that ends a pause,
if held past one pass, pauses the game again.
