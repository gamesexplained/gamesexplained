# Torture chamber 1 — verified technical facts

Side B's `TC`, stage 3, loaded to `$5800-$ABFF` after level 1.2 and
started at `$8051`: Chip tied to the top of a jack. Every address here is
this chamber's; routines named with an address outside it are the
engine's (`parts/engine`). Unless marked *live*, a fact comes from the
code in `work/entry.vsf`, stopped at `$8051`.

## The chamber

- `torture_begin` (`$9CE8`) sets up weapon 0, Droopy, at grade A, as
  the panel's icon shows (the weapons tablet still offers what was
  bought), and shows the Get Ready screen
  (`retry_screen`, `$9CEF`, "RESCUE CHIP AS SOON AS POSSIBLE"), which
  also clears the spare hit. `torture_start` (`$80B8`), run before every
  try, draws the room from `screen_map` and places fifteen objects from
  `objects_start_xy` (`$8009`): the rock under the top ledge, the boulder,
  the big worm and the small worm, Chip on the jack, the bomb on the
  seesaw, the chainsaw demon and his chainsaw, the cannon's fuse, the
  green ball creature, the purple demon at the jack's pump and the pump
  handle.
- `torture_loop` (`$824F`) runs once a frame: Clyde through the engine,
  then the puzzle's routines, the collision tests and the end. Only one
  object at a time goes through engine `object_collisions`: each test puts
  it in the spare slot 15 (`test_setup`, `$951A`).
- Touching the big worm, the small worm, the bomb or the green ball kills
  Clyde at once (`clyde_touch`, `$9416`).

## The clock

The purple demon pumps the jack (`demon_pump`, `$8BBC`): every 56 frames
Chip rises a pixel and the column grows (`jack_rise`, `$86FE`), 41 steps
from line `$A0` to `$77`, about 46 seconds. When Chip passes line `$78`
the chainsaw demon fetches his chainsaw, walks to Chip and saws him in
two (`sawdemon_rev`, `sawing`, `$905D`; smoke after 205 frames and then
blood, `smoke_and_blood`), and `chip_sawn` takes a life. *Live*, 14
October 2026: with the jack at the top, the sawing followed and cost a
life.

## The rescue

The chain of events the code allows, in order:

1. Shots push the boulder on the top ledge a pixel left each
   (`boulder_hit`, `$8D1B`); past x `$53` it falls onto the seesaw. The
   green ball can be shot only until then.
2. The seesaw tips and throws the bomb (`seesaw_and_bomb`, `$893C`): it
   flies up, breaks the rock under the top ledge (`overhang_crumble`) and
   bounces down into the cannon.
3. The cannon turns, three frames, every sixth frame (`cannon_turn`,
   `$8802`). If its fuse is not lit by then, the bomb rolls back out and
   the chamber starts again 100 frames later without taking a life
   (`bomb_roll`, `$8CD3`; `restart_count`).
4. Only a full-charge flame lights the fuse (`fuse_touch`, `$9499`). A lit
   fuse burns down six steps of 31 frames once the bomb is in the cannon
   (`fuse_burn`, `$8865`), and the demon stops pumping.
5. The cannon fires: the bomb flies right six pixels a frame
   (`fuse_sparks`, `$8D68`), and if the chainsaw demon has not yet
   started it carries the purple demon off the screen and sets `rescued`.
   Once the saw has started, the bomb stops short and the chamber cannot
   be won.

*Live*, 14 October 2026: with the boulder made to fall and the fuse lit,
the cannon fired, the demon was carried off and the WELL DONE screen
followed, paying six potions.

The big worm bursts on its 36th hit and the green ball on its 51st,
for a score: each counts down from 35 or 50 and bursts when the count
would go below zero (`worm_hit`, `ball_hit`); the first hit sets the ball
rolling to the right and back (`ball_roll`, `$923E`).

## The rescue screen

`rescue_screen` (`$9E69`): WELL DONE on a dot-matrix sign whose dots are
little pictures of Clyde's face, the story in flowing colours ("CLYDE HAS
SAVED CHIP FROM BEING SLICED IN TWO ..."), and the reward:
`potion_award` (`$9FE0`) counts a digit from 6 down to 0, and at each of
the six steps adds the worth of Clyde's last pickup (1, or 5 for a
double-height creature) to one kind (`award_kinds`: 1, 1, 2, 2, 3, 3) and
to the total, through engine `potion_add`. `torture_exit` (`$9FBC`) loads the next stage.

## The clues

Sold by the shop from level 1.2's file: "USE THE CANNON TO STOP THE JACK
AND SAVE YOUR BUDDY CHIP.", "BE CAREFUL WHEN ATTACKING INNOCENT LITTLE
EARTH CREATURES." and "REMEMBER THAT THE CANNON WILL NOT FIRE UNLESS IT
HAS BEEN LIT." (part `level-1-2`).

## Cheat

POKE 33734,173 (`$83C6`) makes the chamber's DEC of the lives an LDA:
unlimited lives here (`cheats.md`).
