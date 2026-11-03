# Lords of Chaos — TODO

Tier: Silver. Coverage 100 % in all five parts; every feature traced;
the minisite built (How it works, Discoveries, Maps, Source code).

## The listing's sample

The verify sample (seed 7061) found 12 wrong comments in 80, 15 % plain
and 18.7 % weighted by its strata, which is over the mark. All 12 were
corrected, with every comment that said the same. An audit of the whole
listing on a proven model is recommended (`kit/CHECKING.md`): with that
rate in the sample, more wrong comments are likely among the 1,049 the
checker did not read.

## For Platinum

- A Play tab that is the whole game: every routine of the engine and of
  the three scenarios' hooks ported to JavaScript and run in lockstep
  with the game's code (`kit/skills/core/70-minisite/play.md`), with
  `test_play.js` beside the page.

## For Gold

- A human pass over each page's copy, section by section (`copy` in
  `game.json`).

## Ideas

- A live check of the rock waypoint: a game of scenario 2 against the
  computer, watching a creature on route 0, 2 or 6 stop beside row 8,
  column 7.
- The sound pads on How it works could be named by what plays each sound.
