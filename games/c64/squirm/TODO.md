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

## Gold

A human's pass through the How it works and Discoveries tabs, section by
section (`AGENTS.md`, "Definition of done").

## Platinum

A Play tab with the whole game ported to JavaScript and run in lockstep
with the game's own code. The game is small and the pages already run
most of it: the worms' moves, the player's step, the level cycle, the
treasure, the death and every sound. A port would write those routines
again in JavaScript and check each against the page's machine, which
`test_frame.js` and `test_sound.js` already hold to the game.

## Open questions

- Who wrote the title tune and the sound effects. The Mastertronic
  Collectors Archive's review of this version, read on 30 October 2026,
  names Tony Kelly as the programmer and Mr Chip Software as the house
  that brought the game to Mastertronic, and credits nobody for the
  sound; a web search the same day found no other credit. The High
  Voltage SID Collection was not searched.
