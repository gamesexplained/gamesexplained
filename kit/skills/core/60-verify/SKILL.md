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
every index that can reach it, with the platform's references search
(`kit/skills/<platform>/steps`, "references").

"Unreachable" is a negative result too. A search over a model of the
movement rules finds only what the model allows, and a model re-derived
from the code misses what the code does off the path you read. Search
with the game's own movement code instead: drive the player with input on
the kit's model of the machine (`kit/skills/<platform>/steps`,
"machine") and watch for the
item's pickup, or try it in a port that has been checked in lockstep.
Only then write that something cannot be reached.

## Retained bytes from earlier phases

A non-fill page in a play snapshot need not be play data. Trace its producer before assigning ownership: a boot decompressor may copy a whole page but consume only a short repair table within it. A play-only search misses that producer. Arm the watch before the relevant boot phase and stop at the write; separate startup RAM testing from the program’s own writes. Compare the whole copied extent with its source, then trace the consumer’s actual bound.

On a banked machine, distinguish physical RAM from the I/O or ROM that occupies the same CPU address. Condition RAM watches on the bank selector. Include both a read and a store that must trigger as positive controls before trusting an empty watch log, and report the observed trajectory rather than inferring absence in every phase.

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
are rarely all right. A run measures them once, with a sample, and goes
on to the end: 100 % coverage is most of what a page is worth, and the
sample tells the reader, and the next run, how far to trust the
comments. An audit of every comment, and a second sample after it, are
later work that the run recommends and does not do. A run audits only
when the contributor asked for an audit. A first sample is usually over
the mark, with about one comment in eight wrong, and correcting only the
comments it found does not bring a listing under it, because the
sample's rate holds across the rest.

Both the sample and the audit are done by checkers: agents that wrote
none of the comments, with `checker.md` beside this file as their brief.
A checker does one of two jobs. A sample check marks a random draw of
comments and changes nothing, so its count is a measurement. An audit
checks every comment in a range and corrects the wrong ones.

1. **Sample.** Draw about 60 comments at random, with a fixed seed,
   spread over every agent's range, and give them to a checker for a
   sample check. Read every comment it marks wrong or doubtful against
   the code yourself: count the ones that are wrong, and drop the false
   alarms.
2. **The mark.** A sample is within the mark when at most 2 of its 60
   are wrong (at most one in 30 in a larger sample). At that mark a
   listing with 3 % of its comments wrong comes within it three times in
   four, and one with 10 % one time in twenty.
3. **Correct what it found.** Correct every comment the sample found
   wrong, and every other comment that says the same thing (below), and
   record on the sample's row how many of its own wrong comments you
   corrected (`fixed`). Then go on to the end of the run.
4. **Recommend the audit.** In `TODO.md`, the pull request and the
   debrief (`kit/START.md`), say what the sample found and recommend an
   audit, even when the sample is within the mark: the page calls a
   listing checked only after one.

A run asked for an audit does two more steps, and repeats them until a
sample is within the mark:

5. **Audit.** Fresh checkers audit every comment, each in its own
   range, given the kinds of error the samples found, and correct what
   they find.
6. **Sample again.** Draw a new sample with a new seed and give it to a
   checker that took no part in writing or auditing any of it: a sample
   measures fairly only when its checker had no hand in what it
   measures.

Silver needs the measure, not the mark: at least one sample, checked and
recorded. The game's About tab shows every step in a table, with the
models that did it, and the reader judges from the work how far to trust
the listing. The page calls the listing checked ("Audited & low error
rate") only when the last sample came after a full audit and is within
the mark. Until then the Source tab says, under its title, that the
listing has not had a full audit or that its last sample was over the
mark. So a run publishes without the audit, and the page is honest
about it. Any order of steps is recorded as it happened: two samples
with only their own comments corrected between them are two rows, an
audit of some of the comments says how many of how many, and a second
model is a row of its own.

Start the sample check without asking: one checker is not a fan-out
(`kit/START.md`), and by this step the run is meant to be unattended. An
audit, in a run asked for one, gives its ranges to fresh checkers one at
a time, unless whoever asked for it allowed several at once.

Any proven model may check (`models.py`), but a checker finds only what
its model can see: on the weakest model tried, a listing with 10 % of
its comments wrong would pass the mark three times in four. So use the
strongest model the contributor has. When the contributor has a model
from a second provider, a second checker on it is worth its cost, since
it finds errors that every model of the first provider passes; a
comment is wrong when either checker's finding holds. A second pass on
a weaker model from the same provider is not worth its cost.

When the contributor named a model for checking as the run started
(`kit/START.md`), every checker runs on it, for samples and audits
alike, and its id goes in that step's `models`. Start it the way the
session can: as a subagent on that model, or through the command-line
tool the contributor named for it, with `checker.md` and the five
things it asks for. When the session can reach the model neither way,
write each checker's brief to `work/handoff/<step>/BRIEF.md`, tell the
contributor to run it with that model in this clone and have the
verdicts written beside it, and go on with whatever does not need them.
That is the one wait in the run, and the contributor chose it by naming
the model. Settle its verdicts against the code as for any checker.
With no model named, use the strongest model the session has.

The rate is what the checker found, and a checker misses some: in one
run, a full audit that re-read the first sample's 60 comments found six
more wrong among the 53 the checker had passed. Report it as a lower
bound on the true rate.

A wrong comment is usually one belief written down more than once: one
run's "runs every frame" was in 16 comments, and another's wrong unit
for a drawing routine's runs was in 16 too. For each wrong comment,
whether the sample is bad or not, say what it believed, search the
listing for every comment that says the same, and correct them together.

Comments a program wrote, a decoder describing every record of a format
from templates, are a few claims each made hundreds of times. Give them
a stratum of their own, draw about 20 from it, and beside the plain rate
give the rate weighted by each stratum's size: three drawn from a
stratum of thousands would stand for all of it. When they are bad,
correct them by template in this run, as one claim made many times, and
not one by one: test every sentence a template writes
against the code on every path (a reader cited for a field it reads only
for some values of a flag, a condition such as "when empty" or "nothing
reads this"), then the records whose values change what the sentence
means, and make the corrections with a script from the records' bytes,
in the decoder too, or its next run puts the errors back.

If the checking agent cannot run (its provider is out of credit, say:
`50-coverage`, "Splitting the work across subagents"), run it on another
proven model, or through another provider. If none can run it, the
listing is unmeasured, and that is a gap, not a pass: draw the sample
anyway, write in `facts.md`, where the error rate would go, the seed and
the size and that the sample is not checked yet, say so in the pull
request, and leave `tier` where it was before this step.

What the repository keeps is the result. In `facts.md`, under the
template's heading `## The listing's error rate`, one paragraph for each
sample and each audit, in order: for a sample, the seed, the population
and the sample's size, the checker's model, how many comments were
wrong, what was wrong with them and what was corrected, and the
interval; for an audit, how many comments it checked and how many it
corrected. In `game.json`, `accuracy` is the ledger of every step that
measured the listing's comments or made them more accurate, in the order
it happened, each with the model ids that did it (`"unknown"` where
nobody recorded them): whether the run looked the game up online,
`{"step": "research", "web": true, "models": [...]}`; the annotation,
`{"step": "annotate", "models": [...]}`; each sample, `{"step":
"sample", "size": 60, "wrong": 2, "fixed": 2, "seed": ..., "models":
[...]}`, where `fixed` is how many of the wrong ones were then
corrected; each audit, `{"step": "audit", "checked": 640, "of": 640, "fixed": 90,
"models": [...]}`; a Play tab's port, `{"step": "play", "fixed": 16, "models": [...]}`
(`70-minisite`, `play.md`); and any other port or widget on a page that
was checked against the game's code or the game running and showed
comments wrong, `{"step": "port", "fixed": 15, "models": [...], "note":
"the stage maps"}`, its note naming what was checked. A sample or audit a maintainer makes for a
run on an unproven model adds their GitHub login as `"by"`
(`kit/CHECKING.md`), and so does an audit on proven models on the run of
a contributor listed in `kit/contributors.json`, and games checked before 12 October 2026 keep that
older check as a `check` row. Any row may carry a short `note` about
its own step: each row says what its step did without the others, and
the table's order says what came before it. `check_docs.py` fails a
Silver game without a research row, an annotate row and a sample, and a
sample that found comments wrong without its `fixed`, and the About
tab's table is made from the list
(`kit/scripts/accuracy.py`). That section is the one place in `facts.md` where a correction
is the fact being reported, so `check_docs.py` lets it use the plain
words ("corrected", "misread", "was wrong") that it fails anywhere else
in the file; keep the story of how the listing got there in
`agent-history.md`. The draw, the verdict on each comment and the
checker's notes are the working record, and stay in `work/reports/`.

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

A value the player sets at the start, a password or a difficulty, is
the same kind of test at a distance: find every reader of it
(the references search), not only the routine that sets it. The one reader
may be at the end of the level, and decide whether it can be won at all.
So is a value the start of a new game leaves alone. List the variables
play changes that the new-game routine does not set, and read every
test of each with what the last game can leave there: a counter that
carries over can pass, or fail for good, a test written for the counts
one game reaches. One door opened only on exactly three of a
collectable that carried over from game to game, so a second game that
took the three again could never be won.

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
  in 250 frames and lasted up to 40 seconds. A rate read from the code
  ("each frame", "for 20 frames") needs the same count, or every branch
  between the loop's top and the call: one main loop ran its path and
  animation routines only on alternate passes, by a byte its interrupt
  flipped, and the listing's comments and the decoder that described
  every path said "frames" where each was two; another run read a
  counter as falling every 64 frames from its `AND #$3F` and missed the
  two branches before it, which made it 65,536. A counter compared with
  `CMP`/`BCS` against a table value ticks every value + 1 frames, and a
  measurement that comes out "about" the prediction is a failed test
  until the gap is explained.
- **Prove reachability with inputs, not pokes.** Poking a state and
  watching the routine accept it proves what the *code* does. It does not
  prove a player can get there: the way the loop orders its tests may make
  the state unreachable from any legal one, and that is a fact worth more
  than the poke. Search for an input sequence from a state the player can
  plainly reach with the game's own movement code ("Negative results",
  above), then record it, replay it in the emulator and publish it with
  the result, as `kit/skills/core/65-inputs` says.

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

In a game of several parts (`15-parts`), an address means nothing
without its part. What is true of one part goes in that part's
`parts/<id>/facts.md`, where every address is that part's and links into
its listing. The game's own `facts.md` holds what spans the parts (how
one leads to the next, what they share), and names the part beside every
address it gives.

## Outputs

`facts.md` complete for the tier; `features.md` with no row left at
"open" without a description of the search; a list of live tests.
