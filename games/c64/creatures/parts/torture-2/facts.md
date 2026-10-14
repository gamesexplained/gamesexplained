# Torture chamber 2 — verified technical facts

Side B's `TF`, stage 6, loaded to `$5800-$ABFF` after level 2.2 and
started at `$8051`: Chaz on a conveyor belt that runs into a saw mill.
Every address here is this chamber's; routines named with an address
outside it are the engine's (`parts/engine`). Unless marked *live*, a
fact comes from the code in `work/entry.vsf`, stopped at `$8051`.

## The chamber

- As in the other chambers, Clyde starts with Droopy at grade A and has
  no spare hit (`torture_begin`, `$A52E`; `retry_screen`, `$A535`). `torture_start`
  (`$80F9`) draws the room, places the objects (`objects_start_xy`,
  `$8009`): the green monster on the top ledge, its fireballs, a box of
  popcorn behind it, three rats on the right-hand ledge, the 10-ton weight
  hanging from a rope, Chaz on the belt and the saw blade. It also turns
  round the engine's eight tests of solid characters, so that in this
  room Clyde treats the other characters as solid (`solid_test_bcs`,
  `solid_test_bcc`, `$93BD`), and `torture_leave` turns them back.
- Touching the green monster or its fire kills Clyde at once
  (`clyde_tests`, `$9999`).

## The clock

The belt (`belt_step`, `$8665`) moves Chaz two pixels every 120 frames.
Left alone it carries him from x 208 to the saw at x 252 in 22 steps,
about 54 seconds, and he is sawn (`chaz_sawn`, `$87D0`); a life is lost.
The lever at the bottom right flips the belt's direction each time Clyde
arrives at it (`lever`, `$860F`), but carried off the belt's left end
below x 178 Chaz falls to the floor and that costs a life too
(`chaz_falling`, `$876E`). The lever only buys time. While the belt runs,
Chaz calls out with a bubble at intervals (`chaz_call`, `$8859`).

## The rescue

1. Water drips into a tank, thirteen drops (`water_drip`, `$88BB`). A
   shot on the full tank tips it over the sleeping monster beside it
   (`tank_hit`, `tank_tip`, `$91B5`).
2. The splash wakes the monster, which winds a platform up in 40 steps
   (`monster_wind`, `$928D`).
3. Clyde steps onto the platform and rides it up to the top ledge
   (`ride_step`, `$8BB7`).
4. Up there the green monster walks its rounds, spitting fireballs to the
   right of x 120 and a flame to the left (`gm_walk`, `$9513`; `gm_spit`,
   `$9675`). Each shot does the weapon's grade plus one in damage; at 200
   it bursts (`gm_hit`, `$9ABF`).
5. With the monster dying, shots push the popcorn box a pixel right each
   until it falls onto the rats' ledge and spills (`box_hit`, `$9AAE`;
   `box_fall`, `$9B24`).
6. The rats go for it: one eats and two gnaw the rope (`rat_move`,
   `$9793`; `rat_target`). Every ten rounds of gnawing the rope runs a
   stage and the weight drops; at the third it falls
   (`rope_snap`, `$98E5`; `weight_fall`, `$990F`), lands on the purple
   demon working the mill and sets `rescued`, with a screen shake.

The rescue screen is chamber 1's, with "CLYDE HAS SAVED CHAZ FROM BEING
SLICED IN TWO" (`rescue_screen`, `$A66A`; `potion_award`, `$A7E4`).

## The clues

Sold by the shop from level 2.1's and 2.2's files: "USE THE SWITCH TO
CHANGE THE DIRECTION OF THE CONVEYOR BELT.", "SLEEPY EARTH CREATURES MUST
BE WOKEN UP." and "RATS CAN'T RESIST BOXES OF NUTS." (part `level-2-1`).

## Cheat

POKE 33952,173 (`$84A0`): unlimited lives here (`cheats.md`).
