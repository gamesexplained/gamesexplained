---
name: 60-verify
description: Turn traced claims into verified facts. Test cheaply testable claims live in the emulator, hunt down the negative results you are relying on, and write facts.md as current truth with evidence.
---

# Verify before publishing

Record your model id in `game.json` under `step_models`, as `"60-verify": ["<your model id>"]`, the same way as for `50-coverage`.

Most serious errors come from trusting an absence, or from a claim that
sounded right and was never tested.

## Negative results

| Claimed absence | What was actually true |
|---|---|
| "no writes to that register" | the search pattern did not match |
| "that string isn't in the image" | it used a private alphabet |
| "there is no level data" | there was a small bitmap |
| "nothing reads that byte" | two checks did, in undocumented opcodes the disassembler showed as data, one through an indexed address that wrapped past `$FFFF` |
| "the player can never reach that item" | the movement routine tests a cell a row or two below the player's own, and the search modelled only the player's row |

Before reporting that something is missing, ask what encoding, indirection
or aliasing could hide it. A negative result is a claim about your search,
not about the binary. Prefer "unknown" to a plausible guess. Before saying
that nothing reads or writes an address, search with every opcode and
every index that can reach it: on the C64,
`python3 kit/c64/opcodes.py games/<platform>/<slug> --refs <address>`; on
the ZX Spectrum, `python3 kit/spectrum/codemap.py <game> <snapshot> --refs
<address>`, which also lists where the address is stored as a word.

"Unreachable" is a negative result too. A search over a model of the
movement rules finds only what the model allows, and a model re-derived
from the code misses what the code does off the path you read. Search
with the game's own movement code instead: drive the player with input on
the 6502 simulator (on the C64, `kit/c64/machine.js`) and watch for the
item's pickup, or try it in a port that has been checked in lockstep.
Only then write that something cannot be reached.

## Claims about the whole game

"Every room", "the only routine", "never", "the test" in the singular:
each is a claim about all the instances, and the commonest wrong claim
on a page is one read off a single instance. Before writing one, list
them all: every caller of the routine, every reader of the variable,
every copy of the test (a byte search for the call and for the
operand, not the tracer's cross-references alone), and say how many
there are. A live test in one room tests one room. One run's maintainer
found five such claims in a sample of twelve: a collision list that was
one test's of four, a tune called one room's that played in all of them,
a bug whose effect was worked out from counts without reading the
callers.

## Measure the listing before calling it done

The comments in the listing are claims too, and an annotation agent's
are rarely all right. Draw a random sample of about 60 (a fixed seed,
spread over every agent's range) and have an agent that wrote none of
them check each against the bytes; the error rate with its interval goes
in `facts.md`. One run measured 25 % of its comments
with a wrong detail (callers, rooms and counts, almost never what a
routine does); a full pass by fresh agents, each correcting its own range
and listing callers from the decoded listing rather than from a byte
search, brought a second, independent sample to 3 %. If the first sample
is bad, audit the whole listing before the page is published.

What the repository keeps is the result: one paragraph in `facts.md`
naming the seed, the population and the sample's size, how many comments
were wrong, what was wrong with them and what was changed, and the
interval. The draw, the verdict on each comment and the checker's notes
are the working record, and stay in `work/reports/`.

## What a test lets through

For every compare that sorts a value into a class (is this tile a door,
is this object a weapon, is this creature one of these), write down
every value the test actually accepts, not the ones it was written for.
A signed branch after a compare (`CMP #$F0` / `BMI`) admits half the
byte range on the other side; two compares with the same register in a
row admit nothing at all. Then look for the unintended values in the
data: a tile code a player can stand on, an object a player can carry.
One that is reachable is a secret for the article; one that is not is a
corner case for `facts.md`.

Two more shapes of the same thing. A lookup keyed on fewer coordinates
than the place it stands for: a lift table matched on the map square and
the spot within it, but not the height, answers at ground level for a lift
that was meant to be in the sky. And deferred work behind a condition: an
event that sets a countdown and leaves the rest (the score, the message,
the reprisal) to a routine that returns early unless the player is still
in the right place loses the rest whenever the player is not. For each,
list what the test ignores, or what the deferred part requires, and try it.

## Live verification

Any claim that can be tested in the emulator in under a few minutes gets
tested. Typical tests:

- **Poke the variable, watch the screen.** Set the lives counter, the
  level number, the timer, and confirm the effect matches the claimed
  meaning. Poke it before the code that reads it has run: a level
  number poked after the level was set up changes only what is read
  later, and the screen then mixes two levels. Where the game has its own
  way in (a level-select key, a continue feature), use it and poke only
  its limit.
- **Break on the routine.** A breakpoint at the entry with a hit count
  proves when it runs (once at start, every frame, only on collision).
- **Watch the address.** A watchpoint on a table entry shows who reads it
  and when.
- **Force the rare state.** Screenshots are slow; put the game into the
  state just before the event (empty the collectables, set the round
  counter) and poll, or read the state variables that prove it happened.
- **Time it.** Read the timer latch and compute the tick rate from the
  platform's clock; count in the unit of the loop that decrements the
  counter before converting anything to seconds. A clock decremented
  from the main loop is only as regular as the loop: put a non-stopping
  checkpoint on a routine that certainly runs once a frame (the last
  raster handler) and one on the counter's routine, advance a few hundred
  frames, and compare the counts. One game's "30 seconds" ran 195 passes
  in 250 frames and lasted up to 40 seconds.
- **Prove reachability with inputs, not pokes.** Poking a state and
  watching the routine accept it proves what the *code* does. It does not
  prove a player can get there: the way the loop orders its tests may make
  the state unreachable from any legal one, and that is a fact worth more
  than the poke. Search for an input sequence from a state the player can
  plainly reach with the game's own movement code ("Negative results",
  above), then replay it in the emulator with the game's control read
  redirected to a table (see the platform's tool notes). Publish the
  sequence with the result; a route someone else can replay is the
  evidence.

## Measuring without fooling yourself

The emulator is a second opinion, not an oracle. Four ways a live test
lies, all of which have cost real time:

- **The machine never stopped.** If the pause did not take, every poke is
  a value the game immediately overwrites and every read is a sample of a
  different moment. Prove the machine is stopped before believing anything
  you write: read the program counter twice and see that it is the same,
  and ask the emulator for its execution state.
- **Something ran between the poke and the read.** Set a variable and read
  back a value derived from it, and the game's own per-frame update may have
  been applied in between. A measurement that is consistently one step away
  from the arithmetic is this, not a flaw in your reading of the code.
  Break after the update, or subtract it and check the whole series again.
- **The tool did not do what it said.** An input tool that changes no
  hardware register, a stopwatch quantised to the frame, a breakpoint that
  has quietly stopped counting. Validate any instrument against a quantity
  you can compute independently before you quote a number from it.
  **Carry a control.** When you measure with breakpoints, put one on a
  routine you know runs — the interrupt handler will do — in the same
  batch as the one you are measuring. A control reading zero means the
  instrument is dead, and it costs nothing to have. Without it, a dead
  instrument and a routine that genuinely never runs look identical, and
  the wrong one of those is a publishable claim.
- **It was going to happen anyway.** A game that acts on its own (a
  character who chooses what to do next, an enemy on a timer) does things
  whether or not you asked. Run the same snapshot twice, with the input
  and without it. An emulator that passes the determinism test in
  `kit/EMULATOR.md` replays a snapshot exactly, the game's random numbers
  included, so the control run shows what would have happened and any
  difference is the input's doing. The same exactness
  cuts the other way: every run from one snapshot makes the same "random"
  choice, so one result from it is one sample. To see the spread, start
  from several snapshots, or wait a different number of frames before the
  input.

**A test must contain cases that have to succeed.** A port of a code
checker (a password, an account number, a checksum) tested on random
inputs agrees with the game on almost every one, because both reject
almost everything. One such port read four bytes in the wrong order and
passed 20,000 random cases. Put in the codes the game itself hands out,
read off the screen, and require that each one is accepted and decodes
to what the game then does; a round trip through the game's own encoder
catches the same class of error.

**A figure close to a published one is not a match.** A top speed worked
out in exact arithmetic came to within 1 % of a magazine's table, and was
written down as consistent; computed with a port of the game's own
arithmetic (floats that truncate, a key that refuses its last step) it was
the magazine's figure to the digit. When the game's own numbers are
within reach, compute them the game's way before calling a gap small.

**When the code and a measurement disagree, neither wins automatically.**
Work out what would have to be true for both, and test that. A model that
reproduces every point of a series once one known effect is accounted for
is verified; a model that matches half the points is not.

Mark what was verified this way as **live** in `features.md` and in the
comment on the routine. Keep a short list of what was tested and how in
`facts.md`; it is evidence for the article.

## A documented counter you cannot find

When the manual promises a number (three lives, five levels, a timer) and
no variable holds it, look for what the game *does* count. A life counter
is often another counter under another name: a sortie, round, attempt or
wave number that only advances when the player is destroyed, compared
against the documented number at the point where the game ends. Trace the
path from the destruction flag to the next start of play before declaring
the counter absent; the answer is usually one `inc` on that path.

## A number handed through a request byte

When one routine leaves a number in a variable for another to act on (a
tune to start, a sound to play, a screen to show), the number's meaning
is decided by the routine that takes it. Read that routine before
writing what the values mean: it may subtract one, use the value as an
offset, or treat one value as a different command. The callers alone
read as the answer and can be off by one throughout.

## What the repository keeps

A check is done to change what the page and `facts.md` say, and that
change is what a reader and the next agent need. Commit the corrections,
and a line in `facts.md`'s list of live tests naming what was run and
what it showed. The scripts and what they print stay in `work/`, with the
snapshots they read. Code is committed when a page depends on it, such as
a port behind a Play tab and its tests, or a solver behind a solution,
each with a README naming the private inputs it needs.

Never commit a copy of what the repository already holds (the listing's
comments or bytes), an inventory of every routine or every input value, a
file of verdicts, or an audit report beside `facts.md`; `check_docs.py`
fails a game folder with Markdown the template does not have. A second
audit of the same game is a correction to `facts.md`, `symbols.json` and
the page, not a new file. `reference/` is published as it stands, so it
holds only what a page shows or loads, and a caption points at the
listing or at `facts.md`, not at a JSON file.

## Writing facts.md

`facts.md` is current truth for this game: memory layout, timing,
mechanics, tables, sound, controls. Every fact names the routine or table
it comes from. It never narrates how understanding developed; that goes in
`agent-history.md`. Where the code disagrees with documentation, the code
wins and `features.md` says **differs**.

In a game of several parts (`10-orient`), an address means nothing
without its part. What is true of one part goes in that part's
`parts/<id>/facts.md`, where every address is that part's and links into
its listing. The game's own `facts.md` holds what spans the parts (how
one leads to the next, what they share), and names the part beside every
address it gives.

## Outputs

`facts.md` complete for the tier; `features.md` with no row left at
"open" without a description of the search; a list of live tests.
