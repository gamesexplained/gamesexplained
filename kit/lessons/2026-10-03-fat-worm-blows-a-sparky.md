## next · 3 October 2026 · Fat Worm Blows a Sparky, the first ZX Spectrum game · yozlet with Pi (DeepSeek 4.1 Flash), over two passes, and a third by air with Claude Code (Claude Opus 5.5)

**A control file is not a flow tracer, and coverage cannot see the
difference.** The kit's first Spectrum game was annotated through a
SkoolKit control file, and `sna2skool.py` disassembles only the bytes a
`c` block tells it to. The first pass split code from data by hand and
reached 100 % coverage with 6,092 bytes of code typed as data: code typed
as data has no cross-references, reads as a table and is described as
one. `kit/spectrum/codemap.py` now builds the code map from the
emulator's executed-address maps and a static trace from the entries
those cannot contain (code that ran before the snapshot, a handler named
only by a word in data, an operand another instruction writes), and exits
1 while `symbols.json` types any of it as data. `50-coverage` has the
step and says to run it after every merge of the annotators' work.

**A code/data sweep has to be repeated until a pass adds nothing, because
a wrong type hides what it calls.** The contributor's own rework measured
why one sweep cannot find the mistyped code: a walk decodes only what its
input says is code, so a stretch filed as data is skipped and so is every
routine that stretch calls. One `sna2ctl.py -m` pass over this image
reported 3,320 mistyped bytes; a recursive trace re-run after each retype
reported 5,934. The clearest case was 13 bytes at `$7790` holding a `CALL`
to the 611-byte halt screen, which neither the map nor the walk could see
while those 13 bytes were data. `50-coverage` says to repeat the sweep,
`tool-skoolkit` has the command and the trap in its output, and
`codemap.py`'s trace is the repeated sweep in one run.

**When the game overwrites its own start-up code, the hand-over snapshot
is the disassembly base.** This game's play snapshot differed from its
entry snapshot in 10,424 bytes: over the entry stub and the first screen
the game had written its objects and its picture, so the play image
disassembled as data. Where the two disagree, build the listing from the
hand-over image, with the play image passed as the second (`--entry`).

**A claim about what a routine computes is run, not read.** The first
pass's descriptions were read from the bytes, and a maintainer's sample
found 18 of 39 contradicted by them, while the run's own spot-checks of
three claims had passed. `kit/spectrum/simulate.py` runs one routine from
a snapshot in SkoolKit's Z80 simulator with the registers and memory the
claim is about. In the second pass each annotator wrote a model of what
it was about to claim (a fill, a comparison, a multiply, a list
insertion) and compared it with the code over hundreds or thousands of
inputs before writing the comment, and the page's widgets were held
against the same runs. A fixed-seed sample of 60 of those comments,
checked clause by clause by agents on another model, is the measure
`60-verify` asks for.

Two cases from the contributor's rework show what reading misses. The
extent of a fill was in dispute (1 KB in the first notes, 4 KB in the
review), and counting the pushes from the loop's immediates gave a third
answer; running the routine and reading the lowest stack pointer settled
it at 4 KB in one call. And the page's port of the perspective multiply
returned 29 where the routine returns 285, because it masked its
accumulator before taking the carry out of the top: reading the two side
by side did not show it, and running both over every boundary value and
600 random pairs did. `70-minisite` now says to sweep a port's whole
input space.

**Let the emulator say what the data is for.** ZEsarUX keeps a map of
every byte read and every byte written (`get-visualmem-read-dump`,
`get-visualmem-written-dump`). Recorded over the same sessions as the
executed map, they put a flag on each data byte of the decoded listing
the annotators work from: read, written, both, or neither. A "table"
that play writes is a variable, a "variable" nothing writes is a
constant, and "nothing reads it" becomes a statement someone can check.
`tool-zesarux` has the commands.

**A game that does not wait for the display is stepped by its own loop.**
This game runs with interrupts off and a frame takes six to nine display
frames, so input held for a number of display frames lands on a
different number of game frames each time. A stopping checkpoint on the
frame loop's first instruction, with the keys held across each run to
it, steps the game one of its own frames at a time and makes every live
test repeat exactly. Bound each run: the game leaves the loop when the
player dies, halts or finishes, and an unbounded run to the checkpoint
never returns.

**Compare code the game never runs with the ROM before annotating it.**
1,245 bytes at the top of this image are the 48K ROM's cassette routines
moved up by a constant with 71 bytes changed: the tape utility the game
was saved with, and the source of its loader. The first pass listed them
as the game's own. `kit/spectrum/romcopy.py` finds such a stretch with
its offset; it stays out of the listing, and what the copy changes goes
in `facts.md`.
