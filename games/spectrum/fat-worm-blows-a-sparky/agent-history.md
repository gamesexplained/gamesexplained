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
