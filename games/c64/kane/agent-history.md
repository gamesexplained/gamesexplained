# Kane — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 25 October 2026, one session (Silver)

**Image and loading.** The Ultimate Tape Archive's item for the
Mastertronic tape holds two raw tape images and a scan of the inlay. The
first image, `Kane.tap`, autostarted in VICE and reached the game after
about 331 seconds of emulated time. A boot file `KANE` sets the vectors
for a fast loader, which reads `DATA1`, `DATA2` and `DATA3` and jumps to
`$0C00`. A stopping checkpoint there gave `work/entry.vsf`, the listing's
snapshot; snapshots taken around each file showed where each one loads,
and that the loader copies `DATA1`'s graphics from `$4000`-`$9FFF` up to
`$A000`-`$FFFF`, leaving a twin at `$4100`-`$7FFF` that play overwrites.

**Tools.** The VICE v3.13.2 release zip lacked nine libraries in this
container; `apt-get download` and unpacking into `tools/vice-libs`, as
`kit/c64/INSTALL.md` says, fixed it, and `check-emulator` passed 57 of
57.

**Wrong turns at the start.** The IRQ vector's bytes `4c 1f` were first
read as `$4C1F`; little-endian, they are `$1F4C`. Traces from the
vectors at `$8000` and from the loader's copy routine at `$3FD0` landed
in code that `DATA2` had already overwritten, and KERNAL calls
(`SCNKEY`, `IOINIT`, `CINT`, `GETIN`) made the disassembler trace into
the RAM under the KERNAL. Each was set back to undefined. A scan for
stores to `$0314` found two handler addresses (`$39D5`, `$3B01`) that
only the stale copy of an older build at `$8010` sets; they were left
out.

**Features.** From the inlay, C64-Wiki, Wikipedia, a Mastertronic fan
site's review and the game's own screens. Two points differ from the
sources: the train starts 3 coaches ahead at level 1, where the wiki
says 2, and the train ride plays hoofbeats rather than the tune.

**Annotation.** Read by hand in sixteen batches applied with
`r2000.py --apply`. A code map recorded while every practice stage and a
real game ran at all three levels (11,033 bytes executed) checked the
traced code. Each picture and sprite set is packed; running the unpackers
over their streams in a simulator gave each stream's end, and the bytes
between streams were checked one by one. Large packed blocks needed a
user label at least every 1024 bytes before `coverage.py` counted them.

**Verify.** One checker, a fresh agent on the run's own model, took a
sample of 60 of 643 comments (seed 20261025). Each finding was settled
against the code: 14 were wrong in a detail and one doubtful. Four of the
fourteen had taken a main loop for once a frame. Counting checkpoints
then gave the real paces (`facts.md`, "Timing"), and every comment that
held one of the fourteen beliefs was corrected, about sixty in all.

**Live tests.** Ride 1's bonus at five clock readings, the score's count
from 594 points waiting, walking against standing in the shoot-out, two
gunmen in one place, the first shot's silence, F1 on a ride, a reset in
the canyon and after the train got away, and the coach count past 19.
Short joystick taps went unread in the shoot-out; holding the stick, or
poking the state a shot sets (`$23` bit 7, `$25` = 9), worked.

**Pages.** How it works, Discoveries and Maps / levels share ports built
from scratch files: the picture unpacking and the rides' courses
(`test_pictures.js`, every byte of four pictures and two courses), the
two samples' player (`test_samples.js`), the music and effects player
run on the kit's 6502 (`test_music.js`) and `count_score` with the
bonuses (`test_score.js`, 2,900 amounts frame by frame). Writing them
found four more wrong comments: `irq_top`'s background by stage, in two
comments, `tune_slowdowns` and the ending's loop. The first draft of the
page said the ending plays a second tune; it is the same tune slowed, at
two of the nine places the table names. The effects player first started
the shots' counter at 0, where every shot after the first starts at 9.
The canyon's and the shoot-out's frames each differ from VICE's picture
in one pixel at line 225, so the page draws the ride's frame, which
matches in every pixel.

**Open.** The older build at `$8010` and `$3F3A` was not compared with
the code that runs, and one arrow taking two ducks was not seen live.
