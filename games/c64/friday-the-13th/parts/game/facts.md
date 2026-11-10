# Friday the 13th, the game part — verified technical facts

Current truth for the main program and its data, loaded by TITLE2 and entered at `$9200`. Every
fact names the routine or table it comes from; unless marked *live*, it comes from reading the code
in `work/play-start.vsf`. The game's own `facts.md` has what spans the parts, the error rate and the
live tests.

## Hardware registers

The census (`python3 kit/cpu/census.py`) on `work/play-start.vsf` with the blocks of code that ran during play. 234 instructions name 52 registers.

| Chip | What the game does | First seen |
|---|---|---|
| VIC-II sprites | writes positions and colours of sprites 0 and 4 to 7, enable at `$D015`, multicolour for all (`$D01C` = `$FF`), priority at `$D01B` | `$92D3` onward |
| VIC-II bitmap | switches `$D011` and `$D016` for bitmap and multicolour, `$D018` for the memory layout | `$9316`, `$9387`, `$9367` |
| VIC-II raster | reads `$D012` and bit 7 of `$D011` | `$9A9B` |
| VIC-II collisions | reads `$D01E` and `$D01F` | `$9D8A`, `$9D84` |
| SID voices 1 to 3 | frequency and control writes from three note scripts; the filter and volume register at `$D418` | `$C58C`, `$360B` |
| CIA 1 | reads the joystick and keyboard matrix at `$DC00` and `$DC01` | `$A693` |
| CIA 2 | selects video bank 1 | `$935B` |

The sound routine at `$C604` runs three voices from note scripts, each with a tick counter (`$0800` to `$0802`) and a script pointer (`$FB`, `$FD`, and `$8B`). A script byte of `$FF` ends a voice and a byte of `$80` or more is a command handled at `$C78A`.

## Memory layout

| Thing | Where |
|---|---|
| Building backdrop: map, patterns, door covers (file RM) | `$0400`-`$0771` |
| Music state, keyboard table, room and tile work | `$0800`-`$0893` |
| People: places, positions, states, exposure, strength | `$08E2`-`$0990` |
| Room tile maps, 44 rooms of 32 bytes | `$0C00`-`$117F` |
| Cells, 8 bytes each | `$1180`-`$2D4F` |
| Fear heads, strength picture, panel letters | `$2D80`-`$334F` |
| The scream | `$3600`-`$3F9F` |
| Bitmap / screen / panel characters | `$4000` / `$5400` / `$5800` |
| Sprite blocks `$6D`-`$FF` | `$5B40`-`$7FFF` |
| Tiles, 32 bytes each | `$8000`-`$91FF` |
| Program | `$9200`-`$CA70` |
| Tunes, under the KERNAL | `$E000`-`$EF02` |
| Gore pictures, under the KERNAL | `$F000`-`$FE5F` |

## Timing

- `irq_play` (`$A71B`) runs twice a frame, at line `$B2` for the panel and at line 256 for the
  room; it counts frames in `$08C7` and sets `$09B7`.
- `frame_tail` (`$9CFF`) ends one pass when the frame count reaches 2 and the next when it reaches
  4, then clears it (`half_pass`, `$09EB`), so two passes of `main_loop` (`$9BE2`) take at least 4
  frames. On those passes `pass_count` (`$08D5`) counts and
  `update_actors` (`$AF49`) moves the ten others. *Live*: 4.48 frames a count in play.
- Every 128 counts `danger_clock` (`$0821`) rises by 2; at `$C0` the time is up, about 18 minutes.
  Every 256 counts `jason_reveal` (`$A24C`) is tried. Every 16 counts a sheltering friend's
  `shelter_time` (`$095A`) goes down by one and the score by one point.

## Controls

`read_keyboard` (`$A681`) fills `key_table` (`$082A`), one byte a key, every frame. `read_stick`
(`$A6C6`): A left, S right, ; up, / down, SPACE fire; the joystick in port 2 replaces the keys when
moved or fired. RETURN goes to `$0828`, which nothing reads. `game_start` points the STOP vector
`$0328` at `stop_vector` (`$940F`), which always answers "not pressed".

## Graphics

- Rooms: `draw_room` (`$A2A2`) draws 8 by 4 tiles from `$0C00` + 32 × room, each 4 by 4 cells from
  `$8000` + 32 × tile, cells from `$1180`, coloured by `tile_colour` (`$A5DA`), over a grey field
  outdoors or the one backdrop picture of RM indoors, recoloured from `room_colours` (`$AA5E`).
  `draw_area_edges` (`$C21A`) covers a doorway on a building's outer edge.
- People: sprites 0 to 3 multiplexed from four slots, nearest the bottom first (`main_loop`,
  `place_next_sprite` `$9C0F`). Looks from `actor_sprite_base` (`$AED6`): `$6D`, `$88`, `$B6`,
  `$A3`, and `$C9` for Jason; bodies from `$AEDB`; walk frames 0 1 2 1 (`$A677`), plus 5 for the
  other direction (`$AEDF`). Shared sprite colours 6 and 10.
- Sprite 4 is the player's weapon, 5 Jason's blow, 6 the held weapon in the panel's box (moved by
  `irq_play`), 7 the object lying in the room.
- Panel: multicolour text, background 0 and colours 10 and 6, drawn by `draw_panel` (`$BFFB`) and
  `refresh_panel` (`$C14C`).
- Bodies: `show_gore` (`$C93B`) draws the map at `$F000` or `$F930`, chosen with `random(40) < 20`.

## Mechanics

| Mechanic | Rule | Where |
|---|---|---|
| Jason | one of the ten others, `random(10)`, each round | `pick_jason` `$9B5F` |
| Reveal | tried every 256 counts; reveals when `random(clock + 20) < clock` | `jason_reveal` `$A24C` |
| Victim | highest exposure among the ten, leaving out Jason and the sheltering, not the dead; the player if fear is higher than all | `jason_reveal` |
| Hunt | walks to the victim; gives up if the victim shelters, or, for a friend, unless `random(60) <` its exposure; each attack: victim panics, everyone's exposure +2, fear + the player counsellor's fear value | `jason_hunt` `$B7B4` |
| Jason's blow | 8 + rounds won off the victim's strength; below 0 the victim dies | `jason_blow_lands` `$BD9D` |
| Giving up | back to its start place, wandering, strength +3 (at most 80) | `jason_give_up` `$B864` |
| Weapons | damage `$BC57`, points `$BC61`; types 0-2 thrown, 3-6 swung, 7-9 swung long | `weapon_hits` `$BBAF` |
| Hitting Jason | he unmasks (state `$47`) and turns on the player | `weapon_hits` |
| Hitting a friend | danger clock +2 | `weapon_hits` |
| Scare | first time in a room with a body, 1 in 5: fear + 2 × fear value (at most 80), a gore picture and the scream | `scare_check` `$C8E9` |
| Safe room | object 10 (the cross) in a random room 24-43; after one visit, touching a friend sends them to shelter for 90 − exposure; carrying the cross ends every shelter | `pick_safe_room` `$9B6B`, `send_to_shelter` `$BE18`, `shelter_end` `$BEB1` |
| Round won | 100 points a survivor (2,560 with none); next counsellor; rounds won +1 | `round_won` `$925E` |
| Game over | player dead or clock at `$C0`; back to Gerry | `new_game` `$921E` |

## Data tables

| Table | Values | Where |
|---|---|---|
| Counsellor strength | Gerry 75, Wendy 35, Amanda 45, Bryan 50, Stuart 70 | `$941E` |
| Counsellor fear value | 4, 7, 9, 5, 7 | `$9419` |
| Counsellor colour | 7, 2, 7, 2, 7 | `$9423` |
| Weapons per counsellor | Gerry all; Wendy finds object 6 as 0; Amanda 5, 6 as 0, 1; Bryan 4-6 as 0-2; Stuart 3-6 as 0, 1, 2, 8 | `$9A41` |
| Weapon damage, types 0-9 | 6, 6, 6, 2, 2, 3, 2, 8, 8, 8 | `$BC57` |
| Points for Jason, types 0-9 | 60, 60, 60, 10, 10, 15, 10, 120, 120, 120 (shown × 10) | `$BC61` |
| Area base rooms and sizes | 0, 24, 36, 40; 4×6, 3×4, 2×2, 2×2 | `$A5B5`, `$A58C` |
| Doors | outdoor tiles `$2C`, `$20`, `$36` in rooms 17, 11, 9 lead into buildings 1-3 | `door_check` `$A4CE` |
| Start places of the ten | rooms 5, 3, 14, 16, 27, 34, 26, 36, 39, 43; the player room 38 | `$BB7E`, `$9B85` |

## Sound

- Seven tunes at `tune_addresses` (`$C8CD`), under the KERNAL; tempos at `$C8DB` (3, 3, 3, 3, 6, 1,
  2 frames a step); only tune 0 repeats (`$C8E2`). `play_tune` (`$C4D8`), `irq_music` (`$C604`),
  `music_tick` (`$C614`); commands 0 repeat, 1 waveform, 2 attack/decay, 3 sustain/release.
- Tune places at `$CA6B`: room 37 tune 1, 38 tune 2, 2 tune 3, none (`$FF`) tune 4, 40 tune 5, 14
  tune 6; `place_tune` (`$CA51`) starts one only when tune 0 was the last started. Tune 4 also
  plays when Jason reveals himself.
- The scream: `play_scream` (`$3600`), 1-bit samples from `$36A2`, `$08FE` bytes, interrupts off,
  about 107 cycles a bit.
- The footstep (`$C1F2`) begins with an `RTS` and never plays.
