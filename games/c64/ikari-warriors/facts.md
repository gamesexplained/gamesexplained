# Ikari Warriors — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

- Elite Systems' 1988 conversion, PAL, one load: the loader (`AS`, `GM1`)
  reads six blocks of raw sectors and jumps to `cold_start` (`$0F80`).
  Nothing is loaded again (`orientation.md`).
- The credits in the game's own text (`credits_text`, `$21EE`): written by
  John Twiddy; graphics by Paul Walker, Rory Green, Karen Trueman and John
  Harrison; music by Jason Brooke; (C) Elite Systems Ltd 1988.
- The Data East USA version on the second image is a different program
  (Quicksilver Software); none of its files' bytes appear in this one.

## Memory layout

| Thing | Where |
|---|---|
| Zero-page variables | `$02-$FF`, zeroed by `cold_start` |
| Tables of tanks, bullets, grenades, soldiers | `$0200-$03ED` |
| Map window: characters, 64 rows of 32 | `$0400-$0BFF` (`map_row_ptrs`, `$C87F`) |
| Map window: colours | `$0C00-$13FF` (`colour_row_ptrs`, `$C8FF`), over the start-up code once play begins |
| Game code | `$0F80-$3F67`, `$7F80-$83FE`, `$B54B-$CF5E`, music driver `$E000-$E4AF` |
| Screen, sprite pointers | `$4000-$43FF` (`$43F8`) |
| Panel sprites | `$4400-$47FF`, frames `$10-$1F` |
| Character set | `$4800-$4FFF` |
| Sprite shapes | `$5040-$7A6F`, frames `$41-$E9` |
| Multiplexer and object tables | `$7A80-$7E2B` |
| Colour of each character | `char_colours`, `$7E80` |
| Map objects (pointers, streams) | `map_object_ptrs` `$83FF`; streams `$8561-$9084` and `$D000-$D7FF` |
| Tile sets (colours, shapes) | `$9085-$92E0`, `$97F7-$AA26` |
| Map script (the route) | `map_script`, `$92E1-$97F6` |
| Fonts | `title_font` `$AAD7`; `game_charset` `$FC48`; title lettering `$F500` |
| Soldiers and mines along the route | `route_list` `$ACA7`, `enemy_groups` `$B26F` |
| Ground pattern | `ground_pattern`, `$D800-$DFFF` (RAM under I/O) |
| Music: tunes, patterns, effects | `$E604-$ECFF` |
| Title picture | `title_map` `$F848`, `title_map_colours` `$FA48` |

`$01` stays at `$35` in play: RAM everywhere but the I/O block. Code that
reads the map objects and the ground pattern under the I/O chips lowers
`$01` around the read (`draw_map_row`).

## Timing

- The main loop (`main_loop`, `$14A1`) has no fixed rate. Each routine it
  calls keeps its own pace by comparing the frame counter `zpa_2F` with a
  stamp: the mines every 8 frames (`update_mines`), bullet hits every 4
  (`update_bullet_hits`), blasts and grenade hits every 3, fuel every 6
  (`update_fuel`), the item glint every 12 (`animate_items`).
- Raster interrupts chain through the hardware vector: `irq_top` (line 0),
  `irq_panel` (`$30`), `irq_play_on` (`$46`), the multiplexer's bands,
  `irq_bottom` (`$EE`) and `irq_lower_panel` (`$F9`), where the players
  move and the screen scrolls (`lower_panel_irq`, `$3D44`).
- The screen scrolls one pixel a frame when both players are above line
  `$BC` (`lower_panel_irq`).

## Controls

- Joystick in port 2 for player 1 in a two-player game, port 1 for
  player 2; in a one-player game both ports are read and ANDed, so either
  works (`lower_panel_irq`).
- Pressing fire shoots a bullet at once; holding it nine counts, taken
  every second frame, throws a grenade, or boards an empty tank beside the
  player, or climbs out of the tank (`player_fire`). *Live*: a hold of 16
  frames fired one bullet only; holds of 20 and 30 frames fired a bullet
  and threw a grenade (grenades 50 to 49).
- RUN/STOP or C= toggles player 1's aim lock, = or up-arrow player 2's
  (`check_lock_keys`): with the lock on, the player walks without turning.
- Q pauses, fire carries on, @ ends the game (`check_pause`). F5 steps the
  sound through music and effects (`check_f5`). On the title, F1 chooses
  one player and F3 two (`check_start_keys`).

## Graphics

- The play area is 32 columns by 22 rows of multicolour characters,
  copied from the map window to the screen at `$4054` by
  `copy_play_area` whenever the scroll crosses a character row.
- Bullets are drawn into the characters, not as sprites (`update_shots`).
- 36 moving objects share the eight sprites through a multiplexer that
  sorts them by Y in buckets (`sort_sprites`, `sprite_bands`).
- The score panel and status bar are sprites in the opened borders
  (`upper_panel_sprites`, `lower_panel_sprites`), with digits drawn in
  (`draw_panel_digit`).

## Mechanics

### The route

- The whole map is one map script (`map_script`) run a row at a time by
  `draw_map_row`: tile sets loaded into the character set as the route
  reaches them, objects started at columns (118 objects, some built from
  others with a repeat count), the ground laid under them from a 64-row
  pattern, guns, breakable scenery, helicopters and the soldiers' fire
  rate. The route is 1,891 rows long: row 1,878 starts the ending's
  figures (`ending_setup`) and row 1,890 ends the game
  (`route_finished`). *Live*: the 49 rows the game had drawn in
  `play-area1.vsf` match a Python port of `draw_map_row` exactly,
  characters and colours, row for row.
- Soldiers come from `route_list` as the scroll passes each entry's
  position; an entry whose pointer is below `$100` is a land mine at that
  column (`spawn_from_route`). Twelve empty tanks are placed along the
  route from `tank_list`.

### Score and lives

- Scores are BCD in hundreds of points (`add_score`). A soldier shot or
  run over is worth 100, an item picked up 200, a helicopter 1,000, and
  breakable scenery what its entry gives.
- An extra life comes at 20,000 points, at 50,000 and at every 50,000
  after (`add_score`). *Live*, on the simulator running `add_score`:
  crossing 20,000, 50,000, 100,000, 150,000 and 200,000 added a life;
  crossing 10,000, 30,000 and 110,000 did not.
- Finishing the route gives each player with lives left 100,000 points,
  twenty additions of 5,000 (`route_finished`). *Live*: with the map
  script pointed at its last commands, the game printed the ending text
  and player 1's score went to 100,000.

### Items

- Every so many soldiers carry an item, given in turn from `item_cycle`:
  kinds 0, 7, 5, 1, 2, 6 and 4. A killed carrier leaves it on the ground
  (`drop_item`), drawn in its kind's colour (`item_colours`, multicolour
  so only the low three bits show).
- `pick_up_item`: purple (0) 50 bullets; white (1) 50 grenades; black (2)
  bullets, grenades and shells to 99 and a full tank; purple (3) 800
  points, never given; yellow (4) longer shots; cyan (5) shots through
  walls; red (6) grenades that leave a big explosion; green (7) every
  soldier on screen killed, scoring nothing, and a helicopter brought
  down for 1,000.
- The power-ups are cleared with a life (`init_player`).

### Mines, tanks and water

- A mine is invisible until a player comes within 16 pixels across and 32
  down; it then flashes and beeps, and goes off when the player is within
  5 by 12 (`update_mines`).
- A player in a tank is not hit by bullets (`update_bullet_hits`) and runs
  soldiers over (`check_trampling`). A hit by a grenade, or running out of
  fuel, starts a countdown of 100 frames before the tank blows up
  (`kill_player`, `update_fuel`): time to climb out.
- A character's colour value in `char_colours` (`$7E80`) also gives its
  behaviour: either of bits 7 and 6 makes it solid to walkers
  (`map_cell_at`), bit 6 also stops bullets and grenades (`update_shots`,
  `update_grenade_hits`), bit 7 keeps tokens off it (`drop_item`), and a
  low nibble of `$E` is water.
- Water slows a player on foot (`move_player`, `zpa_6A`), stops a tank,
  and hides a soldier (frame `$6F`, not hit by bullets).

### Slips in the code

- `player_shot` (`$2527`) reads the long-range power-up as `zpa_E2`, player
  1's, without the player index. *Live*, on the simulator running
  `player_shot` for player 2: range 72 with player 1's power-up and not
  their own, 48 with their own and not player 1's.
- `throw_grenade` reads `grenade_range_long` by slot number instead of
  facing, so a tank's long-range shells fly $40 for player 1 and $2E or
  $32 for player 2 in every direction. *Live*, on the simulator: player 1's
  shell got $40 facing up, right, down and left; player 2's $2E.
- `update_grenade_hits` (`$B935`) tests `zpf_E4`, player 1's shoot-through
  power-up, without the player index, for both players' grenades.
- The ending's text spells "RESCVED" (`ending_text`).

## Data tables

| Table | Where | What |
|---|---|---|
| `map_object_ptrs`, `map_object_tiles` | `$83FF`, `$84EB` | 118 objects: stream address, tile slot |
| `route_list` | `$ACA7` | 369 entries: scroll position, group or mine column |
| `enemy_groups` | `$B26F` | 41 groups, four bytes a soldier |
| `tank_list` | `$2A28` | 12 tanks: X, scroll position |
| `item_cycle`, `item_colours` | `$B53C`, `$C36E` | the items in turn; their colours |
| `grenade_range`, `grenade_range_long` | `$24F3`, `$24FB` | flight times by facing |
| `hiscore_text` | `$2108` | ten entries of 23 bytes, "IKARI" from 100,000 to 10,000 |

## Sound

- Three tunes (`tune_table`, `$E681`): 0 on the title pages, 1 at game
  over, 2 in the intro and in play. 23 patterns (`patterns`), 23 sound
  effects of 20 bytes (`effect_table`, `$EB34`).
- Each voice's chip registers come from `voice_regs` (`$E5B9`: 0, 7 and
  14), loaded with the game and never written. *Live*, on the simulator:
  each tune writes a frequency to all three voices (`test_music.js`).
- The driver (`music_tick`) steps each voice's pattern every 4, 5 or 6
  frames (the tune's tempo) and updates pitch, vibrato, arpeggio, slides
  and pulse sweep every frame. An effect takes a voice from the music
  until it ends (`start_effect_voice`, `effect_update`). F5 chooses music
  or effects (`check_f5`).

## The listing's error rate

- Sample 1117: 80 comments drawn with `kit/scripts/sample.py`, 20 from the
  182 comments generated from the map script and 60 from the 385 written
  by hand, checked by an agent that wrote none of them. 16 were wrong, all
  in the written ones: 20 % of the sample (95 % interval 12.7 % to 30.0 %),
  18.1 % weighted by the two groups' sizes. Most were a detail wrong in
  an otherwise right comment: which text a routine prints, the direction
  a search runs, a table's base one byte off. All 16 were corrected. The
  sample is over the mark, so a full audit and a second sample are
  recommended (`TODO.md`).

## Live tests

- Map port against the game: `play-area1.vsf`, every drawn window row
  compared with the port's row at the same window position: 49 of 49
  match in characters and colours.
- Fire: holds of 4, 12, 16, 20 and 30 frames from `play-area1.vsf`;
  grenade thrown from 20 frames.
- Extra lives: `add_score` on `kit/cpu/cpu6502.js` with scores just below
  each threshold.
- Ending: map script pointer set to `$97EF` in `play-area1.vsf`, joystick
  up; `ending_text` shown, score 100,000, `zpa_AD` set.
- Power-up slips: `player_shot` and `throw_grenade` on the simulator with
  each player's power-up set in turn.
