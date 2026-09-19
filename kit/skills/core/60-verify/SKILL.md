---
name: 60-verify
description: Turn traced claims into verified facts. Test cheaply testable claims live in the emulator, hunt down the negative results you are relying on, and write facts.md as current truth with evidence.
---

# Verify before publishing

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

## Measuring without fooling yourself

The emulator is a second opinion, not an oracle. Three ways a live test
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
  hardware register, a stopwatch quantised to the frame. Validate any
  instrument against a quantity you can compute independently before you
  quote a number from it.

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
