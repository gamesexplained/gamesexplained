# Green Beret — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "Green Beret", https://www.c64-wiki.com/wiki/Green_Beret
  (last edited 22 May 2022), read 28 October 2026: credits, controls,
  weapons, enemy colours, the four stages and their end bosses, hints,
  the "hold 1 in a jump" cheat. Its two animations and its cover scan are
  in `reference/` as `ext-c64wiki-*`.
- The game's own screens: the loading picture, the title page ("PRESS FIRE
  TO START", "PROGRAMMED BY D C", "SOUND BY M G", "GRAPHICS BY S W",
  "1986 LICENCED BY IMAGINE 84"), the "RESCUE THE CAPTIVES" opening, and
  the status line ("LIVES", "SCORE", "HI SCORE", "STAGE").

## Features

| Feature | Status | Where |
|---|---|---|
| Loading picture with music, waiting for a key or the stick before the game unpacks | live | the loader at `$CE8C` (not annotated) |
| Title page, "PRESS FIRE TO START", fire on port 2 starts a game | live | `title_wait`, `text_credits` |
| Opening scene "RESCUE THE CAPTIVES": four captives tied to posts, guards walking | live | `new_game`, `captives_place`, `guards_send`, `captives_struggle` |
| Four stages: Missile, Harbour, Bridge, Prison Camp | live | `stage`, `map`, `stage_end_lo`; the intermission's map names the first three (`picture_map`) |
| Joystick in port 2: left and right walk, up jumps or climbs a ladder, down lies down or climbs down, diagonals jump left and right | confirmed | `read_joystick`, `player_move`, `player_action`, `player_ladder`; a jump keeps the stick's direction (`jump_joy`) and needs up pressed again (`jump_used`) |
| Fire stabs with the knife | live | `player_stab`, `knife_hit_test`: standing or crouching, once per press |
| Space fires the extra weapon (flame thrower 3 shots, bazooka 4, hand grenades 3) | confirmed | `weapon_trigger`, `weapon_fire`, `pickup_ammo` (4, 3, 3). Port 1's fire button is on the same line and fires it too |
| Run/Stop pauses, fire continues; Q in pause ends the game | differs | this version has no pause: the code reads CIA 1 port B only for key 1 (`irq_player`) and SPACE (`weapon_trigger`) |
| Weapons dropped by the white enemies, picked up by walking over them | confirmed | `enemy_deaths`, `spawn_pickups`, `pickup_update`: only the white soldiers the scripted spawn table names carry one: flame throwers on the Missile Base, bazookas on the Harbour, grenades and bazookas on the Bridge and the Prison Camp |
| Enemy types told apart by colour: white (stands, drops a weapon, climbs ladders), blue (shoots, climbs), brown (runs; later crawls or carries a bazooka), green (jumps at you; skydivers on the Harbour), green-black (mortar), dogs (Harbour boss), grey-blue (grenades, Prison Camp boss) | confirmed | `behaviour_table`, `type_top_colours`: ten types. Brown soldiers and kickers never climb (`enemies_ladders`); paratroopers come on the Harbour, the Bridge and the Prison Camp (`spawn_types`); the grenade thrower is light green; the grey and blue officer throws grenades and is one of the Prison Camp fight's four types (`prison_wave_types`) |
| End boss announced by a siren after reaching the end of a stage; Missile: a truck letting out waves; Harbour: green soldiers with dogs; Bridge: helicopters; Prison Camp: waves from both sides | live | `stage_end_reached` plays the alarm (tune 11); `missile_fight` (the lorry crosses, then 18 soldiers and kickers), `harbour_fight` (a green handler and 18 dogs), `bridge_fight` (three helicopters), `prison_fight` (18 from both sides) |
| A jet bombs the player who stays in one place too long | live | `jet_update`: when `idle_time` reaches 7, 1,792 frames standing still; its bomb follows the hero (`eshot_jet_bomb`) |
| Mines on the ground hurt only the player | confirmed | `mine_check` tests only the hero's character; his projectiles destroy mines (`shots_vs_mines`) |
| Checkpoints within a stage: a life lost restarts from the last one passed | confirmed | `lose_life`, `checkpoints`: six a stage, play restarts 40 columns before the last one reached |
| 2 lives at the start ("LIVES 2"); an extra life every 25,000 points | differs | 2 lives (`new_game`); the extra lives come at 30,000, 100,000, 170,000 and every 70,000 after (`next_life_check`), live; none above 9 lives |
| Points for each enemy hit | confirmed | `enemy_points`: 200 to 850, and 2,500 for a white soldier |
| Between stages, the hero climbs over a fence into the next stage | live | `hero_walk_map` on the intermission's map |
| End: "CONGRATULATIONS", "MISSION ACCOMPLISHED", "NOW PROCEED TO NEXT CAMP", and the game starts again | live | `rescue_walk`, text 3 at `$FD90`; `stage_complete` starts the Missile Base again, with enemies firing twice as often |
| "GAME OVER" | confirmed | `draw_game_over`, `game_over_text` |
| "WELL DONE", "TARGET OVERCOME" between stages | live | text 2 (`text_rescue`), drawn by `stage_complete` |
| Siren at the start of a stage, drum roll during play, loading tune and end tune by Martin Galway | confirmed | the siren is the alarm at a stage's end (tune 11); the drums under play are voice 3 of the tunes that start play and resume it after a death (tunes 1 and 10), which goes round for ever with the driver's three-voice crash (`v3_crash`) once voices 1 and 2 have played their opening note; 13 tunes in `tune_table` |
| High score kept between games ("HI SCORE") | confirmed | `hi_score_check` is its only writer; `new_game` leaves it; as loaded it is 3,560 (live) |
| Cheat: hold 1 during a jump and the player hangs in the air until it is released | live | `irq_player` skips `player_move` while key 1 is held |

## Beyond the documentation

Found in the code, not in the manual.

| Feature | Status | Where |
|---|---|---|
| The second time round, every enemy that shoots fires twice as often; a third rise was planned but never happens | confirmed | `fire_frame_b`, `fire_frame_c`, `loop_count` |
| The difficulty creeps up every 256 frames, faster on later stages, and drops to 0 at each death | confirmed | `irq_status`, `difficulty_rates`, `difficulty_caps` |
| A death during an end-of-stage fight, or winning the Bridge, leaves two bytes on the stack, for the rest of the session | live | `player_killed`, `helis_launch` |
| A copy-protection check runs every frame: CIA 2's serial port must keep shifting, or the machine stops | confirmed | `startup`, `cia2_serial_check` |
| The hi score on a fresh load is 3,560, left in the saved image | live | `hi_score` |
| Twelve sprite shapes nobody uses: kneeling and leaping soldiers | confirmed | `shapes_unused` |
| The stage number was once drawn on the playfield's top row | confirmed | `stage_digits`, unreached |
| Voice 3 sets the music's tempo by writing past its own settings | confirmed | `durations`, `tempo_3` |

## Open questions

- The loader and its unpacker are not annotated, by policy: the listing
  starts at the unpacked game.
