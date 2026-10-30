# Squirm — TODO

Current tier and what is missing for the next one.

## Silver (reached)

Coverage 100 %, `facts.md`, every feature in `features.md` live,
confirmed or marked where this version differs from the descriptions,
the listing sampled (60 comments, seed 20261030), and the minisite built:
How it works, Discoveries and Maps, with a player for every tune and
sound effect. The run used one proven model, `claude-opus-5-5[1m]`, for
every step.

- **An audit is recommended.** The sample found 6 of 60 comments wrong,
  10 % (95 % interval 3.8 % to 20.5 %), over the mark of 2. All six were
  wrong in a detail rather than the main claim, and all were corrected
  with the comments that said the same, but a rate like that says more
  are wrong elsewhere. An audit of the whole listing (337 comments) on a
  proven model, as `kit/CHECKING.md` describes, would find them.

## Platinum (reached)

The Play tab is the whole game: every routine of the listing ported to
JavaScript (`reference/sq-port.js`) and run on the game's own 64 KB by
the page's own clock and chips (`reference/sq-play.js`). `test_play.js`
holds it in CI: three lockstep sessions against the game's code from the
hand-over, every pass compared, every routine of the main program run;
the page's pace against the C64's, waiting levels and the levels with no
wait; and the page alone for 20,000 frames. No bug in the port is known.

## Gold

A human's pass through the How it works and Discoveries tabs, section by
section (`AGENTS.md`, "Definition of done"). With Platinum reached, that
pass makes the game Diamond.

## Open questions

- Who wrote the title tune and the sound effects. The Mastertronic
  Collectors Archive's review of this version, read on 30 October 2026,
  names Tony Kelly as the programmer and Mr Chip Software as the house
  that brought the game to Mastertronic, and credits nobody for the
  sound; a web search the same day found no other credit. The High
  Voltage SID Collection was not searched.
