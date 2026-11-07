# Alter Ego — kit feedback

## Findings

Fresh boot and the final hand-over reproduce the imported native code exactly. The supplied VM decoder is reusable tooling: rerunning it reproduces 82 procedures and 7,071 operation records. Native code and compiled bytecode need separate descriptions across typed boundaries; inline argument bytes also interrupt otherwise continuous routines.

A hidden VM mirror begins 449 bytes before the imported note: $D800-$DFFF matches $ABEB-$B3EA exactly. Hardware names on this physical RAM obscured its meaning. The shared importer corrections are in kit PR #125.

## Independent checks and kit change

Independent MAP1 decompression corrected the imported dictionary labels. Native tests checked the bit reader, width transition, cache boundary, all custom/ROM glyph copies, 60 questionnaire profiles, heap wraparound, division and primitive zero. The fresh Source export includes the recovered division helpers and bounded state/table descriptions. The page widgets match those native outputs.

The twin-copy sweep now requires producer/consumer tracing before calling a matching region unread, and complete independent format reconstruction before accepting a compressed token/projection description. Runtime state can match its stored seed. This is the change that would have saved the most time: prove the compression structures from disk before extending plausible buffer labels.

## Scope and timing

One fresh male name-prompt state, with final hand-over comparison. Original models are unknown. Tier remains Bronze pending coverage, verification and a maintainer check. Timings record fresh boot, decoder sweeps and annotation sessions; the original publishing windows are distinct from the original reverse engineering.

## Maintainer asks

Existing #113 import policy and #124 multiple-state RFC; no new ask or relaxed rule.

## The Platinum run (5 and 6 November 2026)

### What the kit's text changed

- `kit/skills/core/15-parts` made the life object a part of its own, so
  the seven phases are listed once, from a snapshot taken as Infancy
  begins, rather than as data in the resident program's listing.
- `kit/skills/core/70-minisite/play.md`, "Pace it by the machine's
  clock", and the lockstep's `entry` option: the page starts the port
  at the hand-over, and the stretch to the first GETIN has a cost.
- `kit/CHECKING.md` set the order of the maintainer's check: a sample of
  90 found 18 wrong, so every comment was audited, then the facts, then
  a second sample.

### Where the kit fell short

- **The lockstep lost a key read straight after an interrupt.** Fixed
  in `kit/c64/lockstep.js`, with `kit/c64/test_lockstep_kernal_exit.js`
  (`kit/lessons/2026-11-06-alter-ego.md`).
- **A least-squares fit could not pace a p-code game.** The skill fits
  each routine's own cycles from the lockstep's stretches. Here most
  stretches run the same few dozen procedures together, and the fit
  shared their cycles among them in any proportion: the page ran
  Infancy four times too slow. A profile on the machine did what the fit
  could not (`port/scripts/profile.js`): each instruction's cycles go to
  the routine whose code it is, a routine round a wait for a key is
  costed by the call, the turn of its loop and the wait, and fills,
  copies and loads by the bytes they are given. A gateway that every
  6502 routine is entered through (`$7059`) has to be charged to itself:
  given to the last label passed, 1.5 million cycles of Infancy went to
  a routine that never ran. Two more cost a page 88 frames: the
  interpreter's instruction pointer has moved past the byte it read, so
  a procedure's return went to the procedure stored after it, until
  the profile placed the time by the byte before the pointer; and the
  points a native routine resumes at, and tails several routines jump
  into, are labels the port never calls, so their cycles (1.8 % of the
  game's) were never charged until they went to the routine the port
  does call that the processor entered last. This is an ask below,
  since the profiler is this game's and the skill names none.
- **The kit's C64 reads the SID's noise as 0.** A game whose dice are
  the SID's third voice plays the same life every time on it, so every
  session here hands the game and the port the same bytes from a seed.
  The kit could model the noise oscillator instead.

### Asks for a maintainer

Filed as issues labelled `kit-ask`, #785 and #786:

1. **kit: Add a cycle profiler for pacing a Play tab by routine.** Each
   instruction's cycles given to the routine whose code it is, from the
   listing's labels, with the interrupts left out; a routine round a
   wait for a key split into its call, its loop's turns and the wait; a
   routine that fills, copies or loads charged by its size argument; a
   shared entry gateway charged to itself; an interpreter's time placed
   by the byte before its instruction pointer; and the cycles of a label
   the port never calls given to the routine it does call that ran
   last before it, each routine charged by the port's count of its
   calls. This game's
   `port/scripts/profile.js` does all of these for one game and would be
   the start of it.
2. **kit/c64: Model the SID's third voice so `$D41B` reads as on a C64.**
   The kit's machine reads `$D41B` as 0 (`kit/c64/machine.js`, its
   header). A game that takes its dice from voice 3's noise then plays
   one life only, and a lockstep has to hand both sides dice of its own.
