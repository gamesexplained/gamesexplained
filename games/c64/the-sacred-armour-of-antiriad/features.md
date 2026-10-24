# The Sacred Armour of Antiriad — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "The Sacred Armour of Antiriad",
  https://www.c64-wiki.com/wiki/The_Sacred_Armour_of_Antiriad (reached as
  `/wiki/Antiriad`), read 24 October 2026: credits, controls, the status
  panel, the four add-ons and their rooms, enemy energy costs and points,
  radiation levels, a room-number grid, a list of the rooms with recharge
  cells, a table of variables, and a world map. Its screenshots are in
  `reference/` as `web-*.{gif,jpg,png}`.
- Wikipedia, "The Sacred Armour of Antiriad",
  https://en.wikipedia.org/wiki/The_Sacred_Armour_of_Antiriad, read 24
  October 2026: the plot and the credits.
- The game's own text: the status panel's messages and the title's credits,
  stored as ASCII at `$C1D6`-`$C5CA` (`facts.md`).
- No C64 manual scan was found (archive.org search for "antiriad", 24
  October 2026, lists only program images and demos); a Spectrum
  instructions page (`rk.nvg.ntnu.no`) did not answer.

## Features

| Feature | Status | Where |
|---|---|---|
| Joystick in control port 2 (wiki infobox); fire at the title starts play | live | fire on port 2 started play from the title, 24 October 2026; `read_fire`, `foot_control` read `$DC00` |
| Flip-screen world of 69 rooms, numbered `$00`-`$44`, current room in `$5B` (wiki) | confirmed | `room_links` has 69 entries; `zp_room` (`$5B`) changed with each room built in the live tests |
| Rooms on one level share their left and right 64-pixel columns with the next room (wiki, Graphics) | confirmed | `build_room` draws one tile column (32 pixels) of each neighbour at each side (`draw_edge_column`), so two neighbouring screens have 64 pixels in common; the room renderer built from this matched the live first screen |
| Some rows of rooms wrap round into an endless corridor (wiki, Trivia, given as a likely explanation) | confirmed | `room_links`: the rows `$06`-`$09`, `$0D`-`$12`, `$1A`-`$23` and `$29`-`$37` link their last room's right back to the first |
| Playfield in character mode, 320 × 128 pixels, characters at `$7800`; status panel with characters at `$7000`; both share the screen at `$4000` (wiki) | live | one recorded frame: `$D018` reads `$0F` from line 251 and `$0D` from line 180 (`orientation.md`); the game writes `$0E` and `$0C` (`raster_bands`), and the unused bit 0 reads as 1 |
| Status panel monochrome until the armour is first worn, multicolour after (wiki) | live | `draw_panel` draws it in dark grey; `colour_panel` and `panel_power_up` colour it after the first activation; driven into the armour live, the panel came on 150 frames later and flickered through its seven stages |
| Tal is sprites 0 and 1 (multicolour, one above the other; side by side when he has died); the empty armour sprites 3 and 4; stones and shots sprite 2; items and most enemies sprites 4 to 7 (wiki) | confirmed | `place_room_sprites` fills slots 7 down to 3, so items and creatures use 3 to 7; `place_armour` puts the armour on 3 and 4; `tal_lives` lays Tal's halves side by side; live, the armour was on slots 3 and 4 in room `$3F` |
| The hanging monkeys, the fire-breathing dragons and the machine gunners are drawn in characters, not sprites (wiki) | confirmed | animated-tile scripts `$80` (monkey), `$83`-`$88` (dragons and fire), `$89` (gunner), copied into the playfield set by `animate_tile` |
| On foot, facing left or right: fire throws a stone, left or right walks, left or right with fire jumps that way, up jumps straight up, down crouches and picks up (wiki) | confirmed | `foot_fire`, `foot_left`, `foot_right`, `foot_up` (sets the direction to up alone), `foot_down`; pickups need the crouch (`tal_touches`). Left and right first turn Tal through the front view. From the first screen, where Tal faces the player, only left and right moved him (sprite 0 X 96 to 74, and to 172 walking off the ledge) |
| Facing the player, Tal can put on the armour or use the teleporter (wiki) | live | `tal_touches` takes both only for animation `$88`/`$89`; live, Tal placed at the armour facing the player dissolved into it. The teleporter also needs the panel on, so it works only after the first activation |
| In the armour Tal floats in any direction; with the Pulsar Beam, fire shoots; landed, left or right takes the armour off (wiki) | confirmed | `suit_control`, `suit_fire` (needs `$067E`), `suit_left`/`suit_right` call `leave_armour` when landed |
| Q starts a new game (wiki) | live | `check_quit_key`; Q held for 20 frames brought the title and its tune back, 24 October 2026 |
| Tal's energy, 0 to 31, in `$51`, the shown value in `$52` (wiki) | live | `zp_tal_energy`, `zp_tal_shown`; `clear_game_state` sets 31; radiation drained it live |
| The armour's energy, 0 to 63, in `$4F`, the shown value in `$50`; wearing it, Tal cannot die and is recharged from it (wiki) | differs | `zp_suit_energy` is charged to 32 at the first activation (live) and set to 31 by a recharge cell (`suit_drift`); the bar is 32 pixels. Tal cannot die in it (`check_death`) and gains a point every 100 frames (`energy_tick`), but the suit's energy does not pay for it |
| Five lives: when Tal's energy runs out he falls and rises again, four times ("rejuvenation"), count in `$AC` (wiki); the panel says "YOU HAVE THREE / TWO / ONE REJUVENATION REMAINING", "THIS IS YOUR FINAL REJUVENATION" | live | `check_death`, `tal_lives`; live, a death gave message `$8C` and a refill, and the fifth death (`zp_rejuv` 4 to 5) set `zp_game_over` |
| Armour state in `$7B`: `$00` not yet activated, `$02` active and not worn, `$B2` worn (wiki) | live | `zp_armour_state`; live, `$00` became `$B2` as Tal dissolved into the armour; `leave_armour` sets `$02` |
| First wearing activates the suit ("ANTI-RAD SUIT ACTIVE"); without the Gravity Displacer it cannot fly ("GRAVITY PREVENTS TAKEOFF") (wiki, game text) | live | `dissolve_step` (first activation), `panel_power_up` (message `$84`, seen live), `suit_up` (message `$85` without `$0680`) |
| Four add-ons, each worth 50 points: Gravity Displacer (room C13, lets the suit fly), Pulsar Beam (K11, shots), Implosion Mine (H8, behind an energy barrier, destroys the power centre), Particle Negator (K5, protects in rooms H1 and H2) (wiki); found flags `$067A`-`$067D`, owned flags `$067E`-`$0681` | confirmed | `enemy_points` 50 each; the sprite lists put them in rooms `$2B` (C13), `$21` (K11), `$14` (H8) and `$06` (K5); `addon_new`, `addon_fitted`; `room_change` empties the suit in rooms `$00`/`$01` without the Negator |
| A message for each add-on when the suit is next worn: "PULSAR BEAM ENERGISED FIRING ENABLED" and three more (game text) | confirmed | `addon_message`, messages `$80`-`$83` |
| "PULSAR BEAM NOT FITTED" when fire is pressed in the suit without it (game text; the trigger is a guess) | confirmed | `suit_fire`, facing left or right, without `$067E` bit 7 |
| Recharge cells in 18 rooms (H3, I5, G6, J6, H7, H8, G9, D11, L11, I12, O12, B13, D13, F13, J13, D14, G14, L14) refill the suit to its maximum and score 25 points; carried flag in bit 7 of `$A7`; a cell taken is remembered per room in a 69-bit map at `$0661`-`$0669`; "ALREADY CARRYING RECHARGE CELL" (wiki, game text) | differs | the sprite lists hold 19: the wiki's 18 and one in J14 (room `$40`), which appears only if the round striped creature listed before it is still alive (live). A cell sets the suit to 31 (`suit_drift`), one short of the 32 the activation gives. `zp_cell`, `cells_taken`, message `$89` in `tal_touches` |
| "SUIT INOPERATIVE RECHARGE CELL DEPLETED": a suit out of energy sinks and cannot move; "DANGER SUIT ENERGY LOW" (wiki, game text) | live | `suit_drift`: at 0 off the ground it sinks with message `$88`; 1 to 7 queues `$8A`, seen live while the suit charged at its first activation |
| Radiation by height: harmless in rows 14-11, Tal off the suit loses 1 energy a second in rows 10-8 and 2 in rows 7-6, rows 5-3 lock the suit on ("HIGH RADIATION SAFETY INTERLOCK OPERATIVE"), rows 2-1 need the Particle Negator ("EXTREME RADIATION SHIELD FAILURE IMMINENT") (wiki, game text); a meter and a warning lamp on the panel | live | `room_radiation` gives level 0 to rows 11-14, 1 to rows 8-10, 2 to rows 6-7, 3 to rows 1-5; `energy_tick` takes the level every 50 frames (live: 1, 2 and 3); `leave_armour` refuses in rooms `$00`-`$09` (rows 1-5); `room_change` for `$00`/`$01` (rows 1-2). Meter pictures `$70`-`$73` and the lamp (`$C0`, level 3 only) live |
| Energy barrier: crossed only without the armour (wiki) | confirmed | `barrier_left`, `barrier_right` stop the suit at character `$FF`; on foot the walls are found by colour only (`wall_left`) |
| Teleporter in the bottom jungle takes Tal back to his armour, "BEAM ME UP SCOTTY" (wiki, game text) | confirmed | the teleporter (`$D3`) is in room `$27` (N12); `tal_touches` (message `$91`), `teleport_to_armour` |
| Enemies that die from one or two hits (stones or shots), cost 4, 8 or 32 energy on contact, and score 20 to 60 points, half when killed by contact (wiki, eight kinds) | confirmed | `enemy_damage` 4, 8 or 32; hit points a quarter of that (`set_enemy_stats`); a shot takes two (`sprite_hits`). `enemy_points` 10-30 are scored twice for a stone kill and once for a shot or contact (`score_kill`): a shot kill also scores half |
| Hazards that cannot be killed and drain energy while touched: acid drop (4 a frame), thrusting thorn, monkey, dragon; a "bullseye" that takes all of Tal's energy; a bomb-thrower that is safe to touch (wiki) | confirmed | the drops are in `unkillable_anims` with damage 4, taken on every frame they touch; thorns (4 a touch), the monkey and the dragons' fire (8) hurt by their colour, with 25 frames between touches (`scenery_hits`, `hazard_colours`, the character lists' colours); a dragon's head is harmless, and the machine gunner hurts too; the bomb-thrower's damage is 0. The only 32-damage creature is the bomb (`$D2`) |
| Score in five decimal digits at `$0687`-`$068B` and binary at `$0697`-`$069A`, each with a shown copy that counts up to it (wiki) | differs | `$0697`-`$0699` is the score; `$0682`-`$0686` are digits counted up to it a unit every four frames (`score_digits`), and `$0687`-`$068B` the digits shown, which roll after them (`roll_score`). Live, the shown digits stayed one roll behind `$0682`. The wiki names `$0682` the shown copy and `$0687` the score |
| Ending: pushing the upper pole of the force field in room H1 with the mine primed starts "IMPLOSION MINE DETONATION SEQUENCE INITIALIZED", a countdown FIVE to ZERO, then "THE OPPRESSORS ARE DEFEATED YOUR RACE IS FREE PRESS FIRE TO PLAY AGAIN" (wiki, game text) | live | `check_detonation`: the landed suit over characters `$C9`-`$CB` at row 12, columns 18-20 of room `$00`, the cap of the pole below the force field, with `$0681` set; `victory_sequence`. Live, the suit placed there with the add-ons set started the countdown, the dissolve and message `$95` |
| Game over: "YOU HAVE DIED YOUR RACE IS DOOMED PRESS FIRE TO PLAY AGAIN" (game text) | live | `check_death` at the fifth death, message `$90` queued live; `foot_fire` restarts after the 200-frame wait |
| Title screen: the logo between two statues, credits for Stanley Schembri (programming), Daniel Malone (plot and graphics) and Richard Joseph (sound design), "PRESS FIRE TO PLAY", "© PALACE SOFTWARE MCMLXXXVI" (game text, live) | live | `title_sequence`, `title_attract`, `title_credits`, `credits_text`; screenshot `reference/live-title.png` |
| Title music in three voices, by Richard Joseph; only short effects in play (wiki) | confirmed | three parts of three tracks each (`title_tune_part1`-`3`, tracks `$80`-`$88`); live, tracks `$80`-`$82` were playing after Q brought the title back. In play the panel's power-up tune (`$8F`-`$91`), the rejuvenation's and the ending's are short tunes too |
| No time limit (wiki) | confirmed | `restart_game` is reached only from `victory_sequence`, `foot_fire` after the fifth death and `check_quit_key`; the only countdown is the mine's (`zp_countdown`) |

## Beyond the documentation

Found in the code, not in the manual.

| Finding | Status | Where |
|---|---|---|
| The title picture holds the words THE SACRED ARMOUR OF in large letters, one row above what is drawn; they never appear | confirmed | `title_picture_top` (`$F514`); `draw_title_screen` starts at `title_picture`; the live title shows only the logo |
| The music is tuned for an NTSC machine: on a PAL C64 every note is about two thirds of a semitone flat | traced | `note_freqs` entry 114 (note 57) is 7217, 440 Hz at 1.023 MHz, about 424 Hz at 0.985 MHz |
| Room `$32`'s link below names a room `$45` that has no map, behind a floor that is solid along its whole width | live | `room_links`; colour RAM row 15 of room `$32` all solid |
| A drop that splashes on the floor falls again from where it started | traced | `step_animation` calls `spawn_enemy` when a splash (`land_anims`) ends, and every drop is the first entry of its room's list, whose place and animation `spawn_enemy` gives it again |
| A round striped creature holds back the creatures listed after it, and they never come if it is killed first, a recharge cell among them | live | `hold_back_group`, `materialise_step`; room `$40` |
| The bomb-thrower in room `$1E` never throws, because its halves are listed the other way round | live | `place_bomber` looks for `$C9` on sprite 7 |
| The bomb dies to the first stone, whatever its damage, because it is placed with no hit points | live | `place_bomb` does not set `$0285`; `reset_sprite_slots` cleared it; live, one stone on the bomb in room `$03` started its dissolve |
| A stone kill scores twice a creature's points | live | `score_kill` adds the points again when sprite 2 is the stone (`$BC`); live, the bomb (20 points) scored 40 to a stone and 20 to a shot |
| The panel's text alphabet has A, O and U with umlauts, unused in this text | traced | `text_punct`, `text_punct_chars` |
| Scenery is solid or harmful by its colour in colour RAM, not by its shape | live | `open_colours_floor`, `open_colours_wall`, `hazard_colours`; room `$32`'s floor read live |
| The multicolour creatures change two of their colours when Tal puts the armour on, because every sprite shares the two multicolours the suit sets | live | `dissolve_step` sets `$D025`/`$D026` to 14 and 11, `leave_armour` and `start_new_game` to 8 and 9; the frame recorded with the suit worn reads 14 and 11 |
| The radiation lamp lights only at level 3 | live | `radiation_lamps` indexed by 3 minus the level |
| The first game after power-on always starts at the jungle's left end (room `$38`) | live | `zp_pass_count` is 0 until the main loop runs; `start_new_game` |
| The teleporter does nothing until the suit has been activated once | traced | `tal_touches` tests `zp_panel_on` |
| Add-ons and recharge cells cannot be picked up before the first activation either | traced | `tal_touches` tests `zp_panel_on` for both |

## Open questions

- Whether the "bullseye" the wiki names is the bomb. The bomb (`$D2`) is
  the only creature whose damage (32) is more than Tal's energy (31), and
  the wiki's enemy table has one enemy at "1 shot / 32 energy units / 40
  points", which is the bomb's 20 points scored twice; but the wiki's
  word is not tied to a picture we could match.
