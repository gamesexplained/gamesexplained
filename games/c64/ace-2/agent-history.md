# ACE 2 — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 25 October 2026, one session (Silver)

**Image and loading.** The C64 Preservation Project's G64 of the original
Cascade disk (v1.1L) decodes cleanly, but its directory is mostly
decoys: after the boot file, five entries whose chains leave the disk
after one sector. `kit/c64/disk.py` stopped at the first with an error
and printed nothing after it; `c1541 -list` showed the rest. `disk.py`
now lists every entry. The game itself is raw sectors read by block
number and EORed with `$FD`; rebuilding memory from the sectors that way
matched the hand-over snapshot byte for byte (`work/scripts/diskmap.py`).
The load took 234 seconds of warp.

**The colour code.** The security check asks for a square of the inlay's
grid, and the game keeps the answers itself (`$FA00`); the right answer
for the square on screen sits in `$E0`, which is how the automated run
got past it. A right answer overwrites the checking code with random
bytes, so the listing is built from the hand-over, `entry.vsf`, before
the check has run.

**Tools.** VICE v3.13.2's release zip needed its libraries unpacked into
`tools/vice-libs` (`kit/c64/INSTALL.md`). regenerator2000 0.9.20 was
installed with cargo into `tools/`.

**Annotation.** The code was read by hand in fourteen batches
(`work/ann/a01`-`a14`), the data in fourteen more. The title's character
set and the CASCADE logo's sprites live in the RAM under the I/O chips,
so `game.json` includes `$D000`-`$D1FF` and `$D800`-`$DFFF` with the
code that copies them out. The colour RAM comments and the music's
pattern comments were written by scripts from the bytes.

**Verify.** Live tests ran in the kit's machine from the snapshots: the
immortal flag, the NMI that mends the two broken bytes (and an RTI in its
place, which leaves them broken), the chaff bug, the security grid and
the pass rate (`work/verify/`). One checker on the run's own model took
a sample of 80 (60 hand-written, 20 generated): twelve hand-written
comments were wrong in a detail, none generated. The corrections went to
every comment that shared each belief (`facts.md`, "The listing's error
rate").

**A wrong turn on the registers.** The orientation notes and the page's
band captions first gave `$D018` and `$D01A` as the frame record shows
them (`$19`, `$1F`, `$13`, `$1D` and `$F1`), which are the values read
back with the unused bits set. The game stores `$18`, `$1E`, `$12`,
`$1C` and `$81`. The warning was already in `frame.py -h`, the C64
reference and a lesson; issue #559 asks for the record to carry the
stored value.

**Colour RAM.** The kit's machine started colour RAM at 0 when started
from a snapshot, so any colour read from it before the game rewrote the
cell came out black. The colour RAM is bytes 761-1784 of the snapshot's
`VIC-IISC` module (all 1,024 matched the frame record taken from the
emulator); `readSnapshot` now returns it and `Machine.fromSnapshot`
loads it.

**Pages.** One map serves both scenarios, so there is no Maps tab: the
map is a widget on How it works, with the read-out ported from `$14AF`
and held by `test_map.js` for every position. The music player runs the
game's driver, held by `test_sound.js`. The frame is drawn from one
recorded frame of play, 0 of 104,448 pixels different from VICE's
picture.
