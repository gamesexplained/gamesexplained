# The attract sequence — verified technical facts

The block at `$E000-$F1FF` of the `GAME` file, which the engine keeps at
`$E000` until the shop replaces it (stage 2), and reloads from side B's
file `1@` after a game over or the ending. It holds the title's opening
scene, the credits, the high-score page, the name entry and the cheat.
Every address here is this block's; routines named with an address
outside it are the engine's (`parts/engine`). Unless marked *live*, a
fact comes from the code in the engine's `work/entry.vsf`.

## Entries

| Address | Name | Reached from |
|---|---|---|
| `$E500` | `attract_start`, JMP engine `level_enter` | engine `loader_hand_over` once level 1.1 has loaded (`$BE5F`) |
| `$E503` | `attract_last_life`, JMP engine `$C91F` | after the last life and after the ending (end_flag 1), into the name entry |
| `$E506` | `attract_title`, JMP engine `$C957` | back to the title after the name entry |

The same `$E500` is the shop's entry once the shop has taken the block's
place, which is why the engine needs no test to tell them apart.

## The title loop

- `title_start` (`$E771`) swaps the title's characters and sprite shapes
  in (`title_swap`, `$E70B`), writes back the DEC `$B7BF` at engine
  `$1CA0` and the fuzzies' colour, so that a cheat lasts one game, arms
  engine `timing_check`, plays the attract tune (engine `title_tune`,
  `$CA2D`) and starts its raster chain.
- `title_loop` (`$E7CB`) alternates the opening scene and the high-score
  page when each scene's time runs out; fire starts a game through engine
  `game_new` and the Get Ready screen.
- The opening scene (`opening_scene_setup`, `$E94A`;
  `opening_scene_step`, `$ED94`): grass, a light blue sky and clouds that
  drift left (`clouds_raster`, `$EEAC`); two fuzzies walk in from either
  side, strike poses drawn in characters, and the Creatures logo, eight
  sprites, falls 14 lines a step and bounces, squashing them (pose 4).
  The credits print a line every 16 frames (`credit_step`, `$ECE9`).
- The high-score page (`hiscore_page`, `$EF42`): "TODAYS TOP HEROS" and
  the eight places in big letters, revealed by a wipe of shrinking
  diamonds in character `$4F` (`wipe_step`, `wipe_shapes` at `$F0C3`).

## The cheat

`title_cheat_input` (`$F119`) runs once a frame on the high-score page
after the attract tune has ended. `title_cheat_step` (`$F125`) reads
keyboard row 7, left selected by engine `keyboard_release`: bit 3 is the
2 key and bit 2 CTRL (also joystick 1's right and left). The keys must
come in turn, each within ten frames; after 30 pairs it writes three NOPs
over engine `$1CA0`, the DEC of the lives, and turns the fuzzies grey.
Holding CTRL and 2 together does it in about a second. *Live*, 14
October 2026: the tune ended about 20,500 frames after the snapshot, the
fuzzies turned grey (`reference/cheat-grey-fuzzies.png`) and engine
`$1CA0` read `EA EA EA` after the next Get Ready screen.

## The name entry

`name_entry` (`$E240`), from engine `level_enter` after the last life:
engine `hiscore_check` finds the place; with one, "YOU'RE IN THE TOP 8"
in big letters, the name started as "....", 40 symbols round a heart
that the cursor walks along (engine `heart_start`, `heart_step`), and the
name entry's tune (engine `hiscore_tune`, `$FC85`). About ten seconds in,
two black sprites slide apart to show a pool, then the fuzzy beside it
steps through its frames, with a splash in the pool while it shows frame
`$88` (`name_pool_step`, `$E535`). Fire on a symbol enters it;
the rub sign steps back; the end sign or a fourth letter finishes
(`name_fire`, `$E62E`), and the four characters go into engine
`hiscore_names`.
