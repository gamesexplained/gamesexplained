# Pool of Radiance — TODO

## For Gold

- A human's pass over every section of the pages (`copy` is `agent-draft`).

## For Platinum

- A Play tab: the whole game ported to JavaScript and held to the
  game's code in lockstep (`kit/skills/core/70-minisite/play.md`).

## The listing

- An audit of every comment, then a second sample with a new seed. The
  first sample (seed 20261025) found 3 of 80 wrong, over the mark, all
  in a detail and all corrected with the 15 comments that shared their
  belief; at that rate a few hundred of the 4,157 comments are still
  wrong somewhere (`facts.md`, "The listing's error rate").

## Discoveries still to try live

Each is traced in the code; what a player sees is not settled yet.

- The long-shot penalty (combat-set `range_penalty`, `$695D`) is added
  to the target's armour figure, which makes a long shot easier to hit.
  `missile_leg` (`$6652`) sets the range it reads, `$0364`, to 128
  before the flight is drawn: find whether any shot reaches the penalty.
- The monsters' start squares (com-prep `$15C2`) are stored by X, so for
  three of the four facings they keep square 0. Watch where monsters
  start in a fight begun facing north.
- POOL (post-com `$1AB7`) adds a carry from a coin kind that reaches
  65,535 to the next kind.
- SHARE (post-com `$21CD`) loses the coin it has just taken when nobody
  has room for it.
- The camp's spell list heads level 4 "7TH LEVEL" (camp `$2AC1`).
- 16 of the 29 maps have walls on one side only, which the step check
  (dungeon `$10EC`) lets the party through from the other side. Find one
  in a place a party can reach and walk it.

## Script findings to watch live

The Maps, Solution and Discoveries tabs read these from the area
scripts (`facts.md`, Mechanics); none has been played through in the
emulator.

- The council's special meeting never offered after Yarash dies first
  (ECL1A `$AF2B`, ECL08 `$AE97`).
- Restal's reseal paying 200 platinum again on a second visit (ECL02
  `$AE5B`).
- The murdered fortune teller at her table on the next visit, and the
  slums' patrols back (ECL14 `$A63A`, `$9B32`).
- The crypt's vampire with 15 hit points and no wolves after a sanctify
  (ECL0A `$B12C`).
- The runes as the game draws them, against the Discoveries widget.
- The shortest way: a party that walks from New Phlan to the audience
  hall with no commission done.

## Open questions

- The third page of a map file holds a byte for each square, which the
  3D view reads (view `$C3D2`); what the values mean is not worked out.
