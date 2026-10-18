# Torture chamber 3 — verified technical facts

Side B's `TI`, stage 9, loaded to `$5800-$ABFF` after level 3.2 and
started at `$8051`: Chuck in front of a ram that pushes him off a ledge
towards a gunner. Every address here is this chamber's; routines named
with an address outside it are the engine's (`parts/engine`). Unless
marked *live*, a fact comes from the code in `work/entry.vsf`, stopped
at `$8051`. That snapshot was reached without chamber 2's exit, so eight
engine branches are flipped in it (`orientation.md`); the facts below
are from this chamber's own code.

## The chamber

- As in the other chambers, Clyde starts with Droopy at grade A and has
  no spare hit (`torture_begin`, `$A0EF`; `retry_screen`, `$A0F6`).
  `torture_start` (`$80CF`) places the objects (`objects_start_xy`,
  `$8009`): four little flyers hidden in the ball monster on the top
  ledge, the green monster hanging on a chain with its two hoppers, the
  operator at the ram's lever, a tub of green slime beside him, Chuck,
  the gunner and his gun.
- Touching the hanging monster, its hoppers, the ball monster or its
  flyers kills Clyde at once (`touch_tests`, `$9458`); the ball does
  not.

## The clock

Every 48 frames the operator pulls the lever (`lever_cycle`, `$8C82`) and
the ram pushes Chuck a pixel left (`ram_step`, `$8E2E`); when the shaft
has grown eleven columns, a column every eight pixels, about 88 pulls or
85 seconds, he falls to the floor (`chuck_fall`, `$8ED3`). The ram stands
still while the ball rolls and once the ball has left the top ledge. On
the floor the gunner turns, raises his gun, aims and fires two bursts
(`gunner_step`, `$8F88`; `gunner_script`, `$8F61`); the bullets cut Chuck
in two (`chuck_shot_start`, `$9196`) and the script's end takes the life,
about 18 seconds after he landed.

## The rescue

1. The hanging monster: a hit sends out its two hoppers, which must be
   shot in the order they came out, the first dying on its ninth hit and
   the second on its eleventh; after four such rounds the next hit kills
   it (`hanger_hit`, `$85A7`; `hopper_hit`,
   `$95AB`).
2. The ball monster: a hit sends out its four flyers, each needing eight
   hits, in order (`baller_hit`, `$870E`; `flyer_hit`, `$9667`); after
   three rounds the next hit kills it, and a ball drops onto the top
   ledge (`ball_monster_burst`, `ball_fall`, `$88E5`).
3. The ball moves only for the flame. Pushed from its left it swings out
   and back (`ball_swing`); pushed from its right, Clyde facing left, it
   rolls up the slope to the left, back down, along the ledge, over the
   rise and down onto the slime tub (`ball_roll`, `$8C20`;
   `ball_roll_dx`, `$89F4`).
4. The tub tips (`tub_tipped`, `$84BE`) and the slime spreads to the
   operator (`slime_flow`, `$850F`). He lets go of the lever
   (`operator_stop`, `$8D45`) and sinks into the slime in white fumes
   (`melt_fumes`, `$8D6F`); at the fourteenth round of fumes `rescued` is
   set.

Once the gunner has started, the flame no longer moves the ball
(`ball_hit`, `$9776`).

## The rescue screen

The same as the other chambers', with "CLYDE HAS SAVED CHUCK FROM BEING
SHOT TO PIECES ... WITH A SIGH OF RELIEF CLYDE ACCEPTS THEM, REALIZING HIS
QUEST IS COMPLETE" (`rescue_screen`, `$A271`). `torture_exit` (`$A3C4`)
then loads stage 10, the ending.

## The clues

Sold by the shop from level 3.1's and 3.2's files: "EARTH CREATURES
AREN'T ALWAYS AS HARMLESS AS THEY APPEAR TO BE.", "USE THE JAR OF ACID TO
PREVENT BLOODSHED." and "GIVE THE BALL A BIG RUN UP." (part `level-3-1`).

## Cheat

POKE 33505,173 (`$82E1`): unlimited lives here (`cheats.md`).
