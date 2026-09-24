---
name: 60-verify
description: Turn traced claims into verified facts. Test cheaply testable claims live in the emulator, hunt down the negative results you are relying on, and write facts.md as current truth with evidence.
---

# Verify before publishing

Start the clock: `python3 kit/scripts/clock.py start 60-verify --model <your model id> games/<platform>/<slug>`. No figure yet. Both retros to 19 September 2026 name single features that ate more time here than whole steps did; when one does, say which in the stop note.

Most serious errors come from trusting an absence, or from a claim that
sounded right and was never tested.

## Negative results

| Claimed absence | What was actually true |
|---|---|
| "no writes to that register" | the search pattern did not match |
| "that string isn't in the image" | it used a private alphabet |
| "there is no level data" | there was a small bitmap |

Before reporting that something is missing, ask what encoding, indirection
or aliasing could hide it. A negative result is a claim about your search,
not about the binary. Prefer "unknown" to a plausible guess.

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

## Live verification

Any claim that can be tested in the emulator in under a few minutes gets
tested. Typical tests:

- **Poke the variable, watch the screen.** Set the lives counter, the
  level number, the timer, and confirm the effect matches the claimed
  meaning.
- **Break on the routine.** A breakpoint at the entry with a hit count
  proves when it runs (once at start, every frame, only on collision).
- **Watch the address.** A watchpoint on a table entry shows who reads it
  and when.
- **Force the rare state.** Screenshots are slow; put the game into the
  state just before the event (empty the collectables, set the round
  counter) and poll, or read the state variables that prove it happened.
- **Time it.** Read the timer latch and compute the tick rate from the
  platform's clock; count in the unit of the loop that decrements the
  counter before converting anything to seconds.
- **Prove reachability with inputs, not pokes.** Poking a state and
  watching the routine accept it proves what the *code* does. It does not
  prove a player can get there: the way the loop orders its tests may make
  the state unreachable from any legal one, and that is a fact worth more
  than the poke. When a corner case turns on a state the player has to fly
  into, write an exact model of the movement routine, search it for an
  input sequence from a state the player can plainly reach, then replay
  that sequence in the emulator with the game's control read redirected to
  a table (see the platform's tool notes) and compare every pass against
  the model. Publish the sequence with the result; a route someone else can
  replay is the evidence.

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

## Writing facts.md

`facts.md` is current truth for this game: memory layout, timing,
mechanics, tables, sound, controls. Every fact names the routine or table
it comes from. It never narrates how understanding developed; that goes in
`agent-history.md`. Where the code disagrees with documentation, the code
wins and `features.md` says **differs**.

## Outputs

`facts.md` complete for the tier; `features.md` with no row left at
"open" without a description of the search; a list of live tests.
