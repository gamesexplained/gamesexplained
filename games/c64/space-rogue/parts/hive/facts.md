# HIVE!: facts

The arcade game in the cantinas: `HCODE` at `$5700` over `TALK`, its
tiles `H.TIL` at `$4000` and its island `H.MAP` at `$5100`. Every address
is in this part's listing, built from `work/play.vsf` (combat drop 1).
Every fact names the routine or table it comes from. The game runs on
the bases' own code: the chart drawer, `try_step`, `move_chase` and the
map entries are the station part's and the engine's.

## Starting and leaving

- `act_hive` (station `$AAD6`) loads `HCODE` to `$5700` and calls it;
  afterwards it reloads `TALK` and `LAND.TIL` over it.
- `hive_start` (`$5700`) saves the base map's entries at `$6200`, shows
  `H.PAC`, the cabinet's picture, and loads `H.TIL`.
- `hive_menu` (`$572F`) loads `H.MAP` again before every game, so each
  starts on an untouched island, and offers INSERT CREDIT and QUIT
  GAME. A game costs 1 credit.
- `hive_quit` (`$5782`) reloads the base's map file and copies the saved
  entries back over it, so its people and items stand where they were.

## A game

- `hive_game` (`$57BE`): drop n has 3 × n mounds to destroy. A drop won
  says "Drop successful!" and the next begins; there is no last drop.
- `hive_game_over` (`$57F8`): caught on drop n, from drop 5 on, the
  trooper wins (n - 4) × 8 credits: 8 for being caught on drop 5, 16 on
  drop 6. Caught earlier: "A pair of Manchi grab hold of your battle
  suit and rip you in half. You lose."
- `hive_drop` (`$5900`) runs a drop: the Manchi and the trooper move,
  the shot flies, a mound may rise, every 32nd pass each mound breeds,
  and the trooper's fate is checked.

## Rules

- `hive_caught` (`$5947`): the trooper is caught when two Manchi stand
  next to him at once, diagonals included. One alone does nothing.
- `hive_raise_mound` (`$59BA`): at most five mounds. A new one rises
  when a timer runs out, counted down once a pass and twice while there
  are none; a mound needs a free square of plain ground, not the ship's
  hatch. The timer is set from the level: 150 - 8 × level, worked out in
  one byte, is kept only when the subtraction goes below zero (the BCC
  at `$59E4`), otherwise 1, and a random 0-90 is added with
  `random_upto`'s carry, set only when that number is 90. Every level up
  to 18 so waits 1 to 90 passes, or 92, where the code meant
  150 - 8 × level more; from level 19 the wrapped result is kept, and at
  level 32 (8 × 32 is 256) the pattern starts again.
- `hive_breed` (`$5A74`): a mound keeps up to four Manchi, each with the
  mound's number in its action byte; a Manchi shot frees a place.
- `hive_mood` (`$5976`): when any Manchi can see the trooper, all of
  them chase him and turn angry (picture 8); otherwise all wander.
  `hive_sees` (`$5BF8`): a line of sight of five steps; rock and the
  ship hide him, brush costs two more steps.
- `hive_moves` (`$5D00`): a Manchi moves on a pass (level + 2) times in
  level + 11.
- `hive_shoot` (`$5ADC`): the shot flies up to five squares along the
  last direction. It burns brush and flies on, kills the first Manchi it
  meets, and destroys a mound only from the square next to it. ESC (F1)
  pauses.
- `hive_recall` (`$5BCD`): with no mound left ("! RECALL !"), the drop
  is won when the trooper stands on the drop ship's hatch, the square
  18, 14.

## Data

- `hive_tile_pixels` (`$4000`): tiles 0-15 the Manchi (8-15 angry),
  16-27 brush and 28-39 the same burnt, 40-56 rock, water, bare ground,
  85-92 the trooper, 93 the shot, 95-98 a mound rising, 100-112 the drop
  ship.
- `hive_grid` (`$5100`): water round the island, brush and rock across
  it, the drop ship at columns 16-19, rows 12-15.
