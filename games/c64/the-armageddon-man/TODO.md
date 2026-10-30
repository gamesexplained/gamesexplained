# The Armageddon Man — TODO

Current tier and what is missing for the next one.

## Silver (reached)

Coverage 100 %, `facts.md`, every feature in `features.md` confirmed,
traced, live or marked where the C64 version differs, the listing sampled
(80 comments, seed 20261030), and the minisite built with a player for
every tune. The run used one proven model, `claude-opus-5-5`, for every
step.

- **An audit is recommended.** The sample found 13 of 80 comments wrong,
  16.3 % (95 % interval 9.7 % to 25.8 %), over the mark. All 13 were
  corrected with the comments that said the same, but a rate that high
  says more are wrong elsewhere. An audit of the whole listing on another
  proven model, as `kit/CHECKING.md` describes, would find them.

## Gold

A human's pass through the How it works and Discoveries tabs, section by
section (`AGENTS.md`, "Definition of done").

## Platinum

A Play tab with the whole game ported to JavaScript and run in lockstep
with the game's own code. The mechanics already ported for the widgets
(the event search, the starting hostilities, satellite cover, the radio's
scrambling, the random numbers) and the game's own sound driver are a
start; the script engine, its 77 commands and the event, mail and letter
scripts are the bulk of what is left, with the windows, the menus and the
war.

## Open questions

- What the original versions did where the C64 version calls
  `do_nothing` (around RAMSAVE and RAMLOAD, as windows open, as a
  satellite moves, at the end of a war).
- Who wrote the C64 conversion: the C64 instruction booklet credits only
  the Spectrum's programmers, J Wilson, D Martin, B Notarianni and
  R France. A web search on 30 October 2026 found no named programmer for
  the C64 version (Lemon64 refused the request). The search's summary of
  Giant Bomb's Martech page gave the C64 music to David Whittaker, where
  the booklet says "Millers"; the page itself was not read, and the
  booklet's credit stands until someone checks.
- What the 17 sound effects and the alarm were for.
