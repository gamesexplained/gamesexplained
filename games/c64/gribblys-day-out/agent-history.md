# Gribbly's Day Out — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 9 October 2026: the Silver run

One cloud session (Linux, no display), one agent plus one checking agent
for `60-verify`, from Hewson's tape image to the pages.

**Tools and the tape.** VICE (vice-mcp v3.13.2) and regenerator2000
0.9.20 installed under `tools/`. `check-emulator` printed its usage until
it was given `--platform c64`. The tape is a raw TAP v1 with one
turbo-loaded block. To check the load I decoded the turbo block myself:
the loader times each pulse with CIA 2's timer B, restarted at `$0107`
(263 cycles), and a pulse longer than that is a 1. My first decoder put
the turbo pulses below `$100` and read nothing; with short pulses near
216 cycles and long near 312, a threshold of 260 decoded the block, and
it matched memory at the hand-over. The snapshot for the listing is
`play-level1.vsf`, taken in play, because `start_game` moves the load
into place (`$8000`-`$9FFF` to `$E000`, `$A200`-`$AFFF` to `$C200`)
before anything runs.

**Coverage.** The annotation went in as Python files under `work/ann/`,
each a list of (address, label, comment) applied through the
disassembler's API, so a correction is an edit and a re-run. The lister
first started mid-instruction at `$42C2`; the code ranges had to be split
round the editor's text and row tables at `$4273`-`$42BF`. The level
parser first treated a zero ground word as consumed and produced shapes
like `$0704`+1496: a zero word fills the rest of the columns with the
plain shape at `$1100` and the template list follows it. Partway through,
the session's worker restarted and took the disassembler with it
("Connection refused"); `tools.py` restarted it and replaying
`annotations.jsonl` (792 lines) restored the project without duplicates.

**Timing.** Many comments said "each frame" where `main_loop` does the
work on alternate passes. Counting live (`work/py/live_loop.py`: 512
passes in 512 frames, the movers and physics on every other one) showed
it, and 27 comments were rewritten, among them every speed and the hop
timer. The title's "frames" are steps of `title_frame`, about nine a
second, which the live title counts settled. A first live script read
every count as 0 because `hit_counts` is keyed by address, not by
checkpoint number.

**The checker.** 80 comments, seed 60, by an agent that wrote none of
them: 5 wrong, all rewritten (`facts.md`). One of its own corrections was
wrong: it said an ended effect always chains on voice 1. The port's test
against the driver failed on voice 2, and the code shows why: the chain
is read as `$CE`,Y after `gate_off`, which leaves Y at the voice's
register offset, so voice 2 reads its repeat count at `$D5`. The comment,
the port and the page were corrected from the test.

**The pages.** The sound driver and `level_result` were ported and
tested against the game's code in the kit's simulator. The tests first
read the snapshot in `work/`; they were rewritten to read
`listing.json` and moved beside the page as `test_sound.js` and
`test_level.js`, so the kit's tests run them. Looking at the built pages
in headless Chromium found four things: the line labels of the frame
drawing overlapped; the tile grid sat ten lines high because it took
the fine scroll from the video chip's state at the end of the frame
instead of the `$D011` write at line 44; the creature strip's names ran
into each other; and the effects player sounded voice 3's noise, which
the game silences, because `site/lib/sid.js` ignored voice 3 off with its
filter off (fixed in the kit, `kit-feedback.md`). The levels page's
"first view" box ran past the map's right edge on levels 0 and 1, which
led to `draw_view` reading on into the next map row: the snapshots of
those two levels show every wrapped cell equal to the next row's left
wall. Level 4's name holds two glyphs, `$7E` and `$7F`, that the text
decoder printed as codes; the page draws them from the panel font.

**A cheat.** Psi that never falls (`cheats.md`) was tested live against
a control run.

**After the debrief.** Aaron identified the picture at each end of
level 4's name as Chad, whose caption "Wot, no ...?" the name is, and
read ABMON as the author's monitor; the title tune he took to be
original. The first two went into the pages.

Aaron then asked for an introduction ahead of the interrupts, the
creatures animated, and the sound higher up the page, as 70-minisite's
"The order" already asks. The page now opens with what the game is,
the music and the effects are its second and third sections, and the
creature strip steps each sprite through its frames at its mover's rate.

**Gribbly's face.** Aaron asked how Gribbly's animation plays out,
likening it to Wasteland's portraits, whose pieces move independently.
`animate_face` had been annotated in the coverage pass; this time the
port was written and held against the routine (`test_face.js`), and
the timing was read live every frame (`work/py/live_face.py`).
Rendering the tables showed that the eye bytes the listing calls
`eyes_open` are lids two rows down, with no pupil: the eyes are wide
only during a look. Reading `$D025`/`$D026` for the widget showed the
creature strip had drawn every multicolour sprite with cyan and white
for the shared colours; the game sets white and black once, in
`new_game`, and the strip now uses them.
