# Fat Worm Blows a Sparky — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## Boot and the entry-point detour

The tape is a protected MakeTZX image. The first reading of the loader was
wrong: the 190-byte turbo loader's header says it loads at `$FAF2` and it
loads 49001 bytes to `$4000`, but the loaded image covers `$FAF2` too, so
it overwrites itself. A first reading of memory at `$FB40` showed what
looked like the loader; it was in fact the image's own bytes, which happen
to include a routine identical to the loader's second half.

The bigger detour was the game's entry. The loader leaves `$EFD8` on the
stack and returns there, so `$EFD8` looked like the game. It decoded as
`DI`, `LD SP,$F000`, a screen clear and then data. It is a hand-over stub
that ends in `JP $7C92`, but the play snapshot had already overwritten the
stub's tail with variables, so the jump was invisible there. The entry
snapshot, taken at the forgery screen before play begins, still had it.
**The lesson: when a game overwrites its own start-up code, the entry
snapshot is the disassembly base, not the play snapshot.**

## Finding the code without a flow tracer

The first tracer run found 31 bytes. SkoolKit's `sna2skool.py` disassembles
linearly, and the kit's Z80 decoder is a decoder, not a flow follower, so
there was no automatic code map. Two sources fixed it:

- ZEsarUX's `cpu-code-coverage`, enabled while the machine ran, with the
  game driven through the intro and several minutes of play. It returns
  every executed address (instruction starts). A `snapshot-load` can switch
  it off and `get` then fails, so the run had to avoid loads between
  enabling and reading.
- A hand-written recursive tracer (`work/tracer.py`) from the entry points,
  which marks everything a static walk of `call`/`jp` reaches.

Union of the two: ~18 KB of code and ~24 KB of data. The rest is described
from how the code reads it.

## The annotation pass

Seven agents took disjoint address ranges and wrote one record per routine
entry and per data block. Spot-checks against the image found their claims
sound: the perspective multiplier at `$811E` really is `x * (128+B) / 128`,
the curve at `$6300` really indexes by `A >> 1`, and the draw-list quirk at
`$AAF3` is real (`LD HL,$EB8D` overwritten by `LD HL,$0000`). Two of the
agents' variable claims were confirmed live in the emulator: `$805D` is the
sparkie count (20, matching the HUD's `SPARKIES:00020`), and firing with
`SPACE` or `1` decrements it and adds an entity. A cleanup pass covered the
code the first partition left unowned (two range gaps at `$8EF9-$91F0` and
`$B4DF-$B7CC`), and a data pass described the board block at `$5B00-$757E`.

## Tooling notes that cost time

- `cpu-code-coverage` must be enabled while the machine is **running**;
  issued in cpu-step mode it answers "Can not enter cpu step mode".
- A timed-out `run` leaves the emulator's run loop going and no other
  command answers; restart the emulator with `tools.py --platform spectrum
  stop` and start it again.
- `listing.py` and `symbols_import.py` default to `work/entry.vsf`; the
  Spectrum file is a `.sna`, so `--entry` has to be passed.
- `coverage.py` and `kit/c64/opcodes.py` crashed on every platform because
  the seam lift renamed `symbols_export.from_live` to `read_live` and they
  still imported the old name. Fixed in this run.

## The rasteriser pass

A later session (Claude Sonnet 5.5) went after the filled graphics the
period reviews praise. It stopped the play snapshot at each drawing
routine for one frame, single-stepped a whole frame for a cost profile,
and forced `$8055` to count the speaker clicks. The first attempt at the
click test and at the argument capture gave nonsense: ZEsarUX keeps its
breakpoint table between scripts, so slots armed by an earlier script
stopped the run at the wrong place. Every script now disables all 100
slots first (`work/fill/common.py`). A first reading of mode `$80B4`
bit 7 as "outline only" was wrong; the `$8F8A` path draws solid first and
last rows with the pattern between them. `facts.md` has the result.

## The comparison on the page

The same session added the "Building the same scene twice" section to
`index.html`: five steps, a usual flat-shaded engine beside this game.
The right-hand picture is the left-hand projection with the rotation left
out, which is the shape the game's rectangle and trapezoid primitives
draw. The curve multiply itself stays in the caption and in section 02.

## The check that failed (1 October 2026)

A maintainer's check under `kit/CHECKING.md` sampled 39 claims from the
first run and found 18 contradicted by the bytes. The run's own
spot-checks, described above as finding the agents' claims sound, had
tested three claims that happened to be right. What was wrong was of a
few kinds: code typed as data (the control file had 18,094 bytes as code;
there are 24,147), names taken from what a routine looked like (a "board
outline command table" that fills the hand of the ending, a "level byte"
that is the frame counter, a "view offset" that is the ending's counter),
tables cut at round addresses (`$5B00-$63FF` described as board data; it
is seven sprite shift tables, a bit-reversal table, the perspective curve
(128 bytes, not 64), a slope table and a sine), and record sizes off by
one (board items are 7 bytes; 8 is the cell's header).

Several statements earlier in this file went the same way. The tape is
not protected: it is a BASIC program, a loader and one turbo block. The
loader loads 49,000 bytes, not 49,001. The "routine identical to the
loader's second half" at `$FB40` is not a coincidence: the image contains
the tape utility the game was saved with, and the loader block is that
utility's loading half.

## The second pass (3 October 2026, Claude Opus 5.5, the maintainer's session)

The maintainer's session redid coverage and verify on the pull request's
branch, which allows maintainers to push. The contributor's own session
was reworking the review's 18 findings on the same day, and the two met
only when the branch was fetched again before pushing: its four commits
were merged in, the game's files taken from the redo, and the kit's
lessons and skill text from both.

**The code map first.** A static trace from `$EFD8` reached 23,132 bytes.
Four recorded sessions' executed-address maps and eight entries the trace
cannot see (the five board handlers, the tape-making routine, its jump,
the ROM copy) took it to 24,147. `kit/spectrum/codemap.py` now does this
and holds `symbols.json` against the result; SkoolKit's own `sna2ctl.py
-m`, given the same map, found 22,910.

**Ground truth before names.** The emulator's read and write maps
(`get-visualmem-*-dump`) marked which data bytes play reads and writes,
and a decoded listing of the whole image with those flags went to every
annotator. Ten ranges, nine cold-briefed agents and the lead's own, each
told that the old names were suspect and to test arithmetic in the
simulator (`kit/spectrum/simulate.py`) against a model. Their nine
reports list 199 entries of old names and descriptions that the bytes
contradict (rows counted in `work/verify/reports/`).

**Wrong turns of this pass.**

- The lead's brief said `$EB8D` upward was the display list. The list is
  linked from a head at `$EB7E` and its records start at `$EB9C`; `$EB8D`
  is a leftover record that two dead loads name. Three agents corrected
  it independently.
- The brief listed the word at `$B7B4` as a patched jump. It is a
  variable between two routines.
- A session script loaded a snapshot path that did not exist. ZEsarUX
  answers nothing and loads nothing, so twenty minutes of "play" were
  measured on the menu. The client now checks the file.
- Menu key presses timed by the wall clock were missed. Everything live
  after that was stepped in whole frames, and then in whole passes of the
  game's own loop by a stopping checkpoint at `$7638`.
- The first Kempston test read `$4F` for every direction: the second
  emulator had been started without Kempston emulation, and the port
  floated. Restarted with `--joystickemulated Kempston`, with the
  no-joystick game as the control.
- "A spindle is taken by a body joint only" came from reading the code.
  Live, a spindle under a stopped head was taken within 20 passes, because
  the joints keep closing up. `facts.md` says where the code is and no
  more.
- The four-bugs test hung the emulator the first time: the dying worm
  leaves the frame loop, so a run to the loop's checkpoint never stopped.
  The stepper now bounds each run and reports when the loop is left.
- A file named `play-frame.png` among the lead's reference shots was the
  halt screen. The page's view was compared with a picture rendered from
  `play-1.sna` itself, which is one pass behind the snapshot's variables:
  the picture on screen was drawn before the worm's last move.
- The first draft of `facts.md` said a wall shows on the side away from
  the middle of the view. It is the side facing the middle; the page's
  widget, which draws it, showed the slip.

**The ending was found by poking, not by play.** No session collected 50
spindles. The type `$F6` item was written into the worm's path, with the
same run without it as the control. That proves what the code does when
the head touches the disk. It does not prove whether a player can reach
the disk with fewer than 50 spindles; `features.md` leaves that open.
