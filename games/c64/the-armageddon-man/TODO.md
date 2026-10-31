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

## Platinum (reached)

The Play tab is the whole game, ported to JavaScript routine by routine
(`port/src`) and held in lockstep with the game's own code
(`port/test/lockstep.js`): from the hand-over, from 50 saved moments of
play for 600 passes each with the test player opening the icons, on the
keyboard, and with a war, SDI satellites firing in a war, a limited
strike, the year's end and the fallout forced. `test_play.js` holds the
published page beside the game on the kit's C64 in CI. The game's own
race on zero page `$04` (facts.md, Controls) is the one place the page
plays differently, and the Play tab's Differences section says so.

`port/scripts/coverage.js` lists the routines the sessions ran: 336 of
the 357 ported. Eleven more are checked alone against the game's code
(`port/test/routines.js`), and four run only inside those or inside
routines the sessions ran (`minus_10` and the three `point_` helpers of
the script commands). Six no session reaches, and a forced session for
each would close the gap:

- `halt_with_border` and `border_until_fire`, the game's stop for a
  country number of 16 or more, which play never produces;
- `script_tech_report` and `script_resources_report`, script commands no
  event in the sessions reached;
- `satellite_carry`, carrying a satellite across the map, which the test
  player never picks up;
- `followup_run`, the follow-up of mail left unread at a week's end.

## Gold, then Diamond

A human's pass through the How it works, Play and Discoveries tabs,
section by section (`AGENTS.md`, "Definition of done"); with the Play tab
already Platinum, that makes the game Diamond.

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
