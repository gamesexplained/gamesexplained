# Balloon Fight — facts

What is true about this image now. Each fact names the routine or table
it comes from, in the listing; the history of how it was found is in
`agent-history.md`.

## The program

- 16 KB of PRG ROM at `$C000-$FFFF` (mirrored at `$8000`), 8 KB of CHR
  ROM, NROM-128, horizontal mirroring. No cartridge RAM, no banking.
- Code: `$C000-$F4C4` is the game, `$F500-$FBC9` the sound driver.
  Data: the tables sit beside the routines that read them; the big
  blocks are the phase layouts and screens (`$DB2A-$E03C`), the sprite
  layouts (`$E03D-$E3A3`), the physics tables (`$E601-$E690`), the
  note tables (`$F600-$F682`) and the eleven tunes (`$FBCA-$FFF6`).
  Unused: `unused_fill` (59 bytes of `$FF` at `$F4C5`), `unused_rts`
  (`$CB1B`), nine bytes after `balloon_bottom_flips`, three `$FF` after
  `spark_hit_sfx`, five `$FF` before `nmi_sound_entry`.
- The vectors: NMI `nmi` (`$C094`), reset `reset` (`$C000`), IRQ
  `irq_hang` (`$C0F7`, a jump to itself; no interrupt source is ever
  enabled).
- One pass of the game a frame: every loop waits on `frame_flag`, which
  the NMI handler sets (`wait_frame`, `$F465`). The NMI handler sends the
  sprite table (page `$02`) with the sprite DMA, flushes `ppu_queue`
  (blocks of address, count, tiles at `$0300`), twinkles one star,
  redraws the status bar on request, counts `frame_counter` and runs the
  sound driver.
- **Balloon Trip's split screen** is timed, not triggered: after the
  NMI's work the handler waits for the end of vertical blank, spins a
  delay loop of about 35 scanlines (`$C0D6`), and then writes the scroll
  (`trip_scroll_x`) and the nametable bit (`trip_nametable`), so the
  status bar stays put and the play area drifts. There is no sprite-zero
  hit and no timer (`nmi`, `$C0CD-$C0EE`).

## Memory map (RAM)

| Range | What |
|---|---|
| `$00-$01` | PPUCTRL and PPUMASK shadows |
| `$02` | `frame_flag` |
| `$03-$07`, `$08-$0C`, `$0D-$11` | the scores: player 1, player 2, the top score shown, five digits each with the tens digit first (the units digit is never stored) |
| `$16` | `game_mode`: 0 Balloon Fight, 1 Balloon Trip |
| `$17-$18` | Balloon Trip's scroll and nametable bit |
| `$19` | `frame_counter` |
| `$1B-$1C` | `random`, a 16-bit shift register (`next_random`, `$F1B3`) |
| `$23-$2A` | the four platform table pointers (left, right, top, bottom) |
| `$31-$32` | `buttons`, each player's input or a bird's steering |
| `$3A` | `demo_flag` |
| `$3B`, `$3C` | `phase_index` (the layout, 0 to 15, wrapping to 4) and `phase_counter` (the number shown) |
| `$3F`, `$40` | `title_option`, `two_players` |
| `$41-$42` | `lives` (`$FF` is no player or game over) |
| `$46` | `status_request` |
| `$52-$53` | `ppu_queue` read and write indexes |
| `$57-$6B` | `text_buf` |
| `$7F-$86` | `actor_action` (8 actors) |
| `$87` | `fish_state` |
| `$88-$8F` | `actor_balloons` |
| `$91-$98`, `$99` | `actor_x`, `fish_x` |
| `$9A-$A1`, `$A2` | `actor_y`, `fish_y` |
| `$A3-$B7` | the clouds: count, the lightning cloud, attribute addresses, positions |
| `$B8`, `$BA` | `lightning_timer`, `spark_speed_level` |
| `$BB-$BC` | the splash |
| `$BD-$C4` | the players' invulnerability, spark stun, respawn timers |
| `$C5-$CD` | the phase's flags: scroll pause, difficulty, `no_enemies`, Balloon Trip counters, `platform_count` |
| `$D0-$FF` | the sound driver: counters, pointers, requests (`sfx_request_a`, `sfx_request_b`, `music_request`, `sfx_request_c` at `$F0-$F3`) |
| `$0200-$02FF` | `sprite_table` |
| `$0300-$03FF` | `ppu_queue` |
| `$0400-$0487` | the actors' arrays, nine each (the fish last): position fractions, velocities, animation, facing, `actor_type`, timers |
| `$0488-$048F` | the Balloon Trip start platform and the fish's state |
| `$0490-$0557` | the sparks (20 slots) |
| `$0558-$05C1` | the bonus round's values and the balloons (10 slots) |
| `$05CB-$05CE` | balloons to launch, the spawn timer, `balloons_popped` |
| `$05D1-$0617` | the propellers (up to 10) |
| `$0618-$061B` | the score popups |
| `$061C-$0621` | the controllers and the flap latches |
| `$0629-$0637` | `top_scores`, one per mode |
| `$0700-$07F9` | `trip_ranking`, 50 entries of 5 digits |
| `$07E0-$07FE` | the sound driver's variables, inside the ranking table's last entries (below) |
| `$07FA-$07FC` | `ram_signature`, HAL |

## Actors

Eight actors share one set of arrays: 0 and 1 the players, 2 to 7 the
birds; the fish is actor 8 in the same arrays (`fish_x`, `fish_y`,
`fish_type`). Each has `actor_balloons` (2 flying, 1 a bird on its
parachute or a player with one balloon, 0 none, `$FF` out of play, `$80`
a sunk bird's bubble), `actor_action` (0 idle in the air, 1 flapping, 2
running, 3 standing, 4 skidding, 5 turning, 6 up a bird pumping its
balloon or a player's balloon bursting) and `actor_type`: 0 to 2 a bird
with its balloon (pink, green, white), 3 a player, 4 to 7 the same on the
parachute, 8 to 11 falling with nothing (`hit_next_type`, `$F05E`).

- Positions and velocities are 8.8 fixed point (`actor_x_frac`,
  `actor_vx_lo` and so on). Gravity, flap strength, run and air
  acceleration and the speed limits are per type in the tables at
  `$E601-$E690`: a player's flap takes 0.47 pixels a frame off the
  vertical speed (`flap_strength`), a pink bird's 0.16; a player tops
  out at 1.25 pixels a frame sideways and down, a pink bird at 0.44 and
  0.31; falling with nothing is 2 pixels a frame (`max_vy_lo`).
- The pad is read every third frame: each actor's frame timer
  (`actor_frame_timer`) reloads with 3, and only on the frame it reaches 0
  do the animation, the steering and the controls run (`actors_update`,
  `$E6B8`); the physics runs every frame. A press of A shorter than three
  frames can go unseen.
- A flap is one per press of A, through `flap_latch`; B held flaps on
  every control pass (`actor_controls`, `$EC49`). After a flap the actor
  is idle (action 0) with its frame at 1, and a flap is not taken again
  until the frame has come round to 0 and the action back to flapping:
  three passes later. So B gives a flap every 9 frames at most; 14 flaps
  in 120 frames when measured (below). Left and right move the actor on
  the ground and accelerate it in the air; up and down are never read.
- A bird on its parachute sways from side to side on a spring
  (`actor_sway`, `$E7B1`): the displacement gains a sixteenth of the
  speed and the speed loses a sixteenth of the displacement each frame,
  which never decays. A sunk bird's bubble drifts the same way.
- Platforms: `actor_platforms` (`$ED28`) tests every platform from the
  phase's four tables against the actor's 16 by 24 box: landing within 3
  pixels of a top edge, a head bump under a bottom edge (the vertical
  speed reversed and cut to 80 per cent, `scale_vy_80pct`), a side
  collision reversing the horizontal speed and the facing. A bounce
  keeps 80 per cent of the speed (`$CD/256`).
- Flying off one side brings the actor on at the other: X simply wraps,
  and the sprites draw at the new X (`actor_move_x`). In Balloon Trip
  X is held between `$10` and `$E0` (`actor_physics`, `$EB4E`).
- Collisions: `actors_collide` (`$EE25`) tests every pair's 16 by 24
  boxes; which edges met sets `collision_bits`; velocities swap or
  reverse; then `resolve_hit` (`$EF37`) runs both ways round: the actor
  underneath loses a balloon when the other is more than 4 pixels
  higher. Two birds never hurt each other. After a hit there is a
  20-frame cooldown (`actor_hit_cooldown`).
- Falling into the water (Y `$E8` to `$F7`): a player loses a life
  (`actor_physics`, `$EADC`); a bird becomes a bubble that rises 0.375
  pixels a frame and drifts (`actor_bubble_update`, `$ECBA`), worth 500
  to the player who pops it. In the bonus round and Balloon Trip a
  player who falls bounces back up at Y `$C8` and gets both balloons
  back (`$EB62`).
- A new player is invulnerable for 200 counts of three frames (10
  seconds) or until he presses anything (`actor_controls`, `$EC45`):
  birds and sparks pass through him, and he is drawn with the flashing
  layouts (`player_flash_ptrs`).
- Birds: steered by `steer_actor` (`$E6E9`). A bird decides every 32 to
  63 frames (pink), 16 to 31 (green) or 8 to 15 (white)
  (`bird_decision_masks`, `bird_decision_bases`): it looks at one player
  (alternating), flaps when the player is higher and heads for the
  player's X; below Y `$A0` it always flaps. A bird on the ground pumps a
  balloon in steps of `enemy_inflate_rate` frames (`$58` from phase 3,
  `$28` by phase 33) for `enemy_launch_delay` steps (4, 3, then 2), and
  takes off one colour faster if it had been hit before
  (`relaunch_types`, `$ECAE`); white stays white.

## Scoring

`add_score` (`$D6DE`) adds tens of points to `scoring_player`'s score
and keeps the mode's top score (`top_scores`). The points for a hit come
from the victim's new type (`hit_scores`, `$F06A`; `hit_scores_kicked`,
`$F076`; the popups `hit_popups`):

| What | Pink | Green | White | The other player |
|---|---|---|---|---|
| Its balloon popped | 500 | 750 | 1,000 | 1,000 |
| Its parachute torn in the air | 1,000 | 1,500 | 2,000 | |
| Kicked while on the ground | 750 | 1,000 | 1,500 | 1,000 |

A bubble is 500 (`actor_bubble_update`). A bonus round balloon is 300,
500 or 700 by round (`bonus_values`), paid at the end 100 points a tick
(`count_down_into_score`); all 20 popped adds the perfect bonus, 10,000,
15,000, 20,000, 25,000 then 30,000 (`perfect_tens_table`,
`perfect_units_table`). The popups show 500, 750, 1000, 1500 and 2000
(`popup_tiles`). There is no extra life for points: nothing reads the
score but the display, the top score and the ranking.

## Phases

`phase_start` (`$F213`) builds the phase from `phase_layouts` by
`phase_index`: block lists for the screen, clouds, propellers, a bird
list and the platform tables. Every fourth index is the bonus round
(`bonus_layout`: an empty bird list), so the order is phases 1, 2, 3,
bonus, 4, 5, 6, bonus, 7, 8, 9, bonus, 10, 11, 12, bonus, and then the
index goes back to 4: from phase 13 on, the layouts of phases 4 to 12
repeat with their bonus rounds. `phase_counter` keeps counting and the
birds get faster with it (`enemy_inflate_rates`, `enemy_launch_delays`,
indexed by the counter divided by 4, up to index 8 at phase 33).

| Phase | Clouds | Propellers | Birds | Platforms |
|---|---|---|---|---|
| 1 | 1 | 0 | 3 pink | 3 |
| 2 | 2 | 0 | 2 green, 3 pink | 5 |
| 3 | 2 | 0 | 2 white, 2 green, 1 pink | 10 |
| 4 | 2 | 0 | 1 white, 1 green, 3 pink | 7 |
| 5 | 2 | 0 | 1 white, 3 green, 2 pink | 8 |
| 6 | 2 | 0 | 4 white, 1 pink | 7 |
| 7 | 2 | 1 | 2 white, 3 green, 1 pink | 10 |
| 8 | 2 | 1 | 2 white, 2 green, 2 pink | 8 |
| 9 | 2 | 2 | phase 4's birds and platforms | 7 |
| 10 | 2 | 4 | 3 white, 2 green | 4 |
| 11 | 2 | 1 | 2 white, 2 green, 2 pink | 8 |
| 12 | 2 | 0 | phase 6's layout | 7 |

The platforms' colours change every four phases (`phase_bg_palettes`).
The fanfare plays on phases 1, 4, 7 and 10 (`phase_index` a multiple
of 4). PHASE-NN is shown for 32 frames (`phase_text`). A phase is
cleared when every bird is out of play or falling (`phase_loop`,
`$F327`); the jingle, 150 frames, then the next.

- Lives: `lives` starts at 2 spare (the two balloons under the score);
  a player out of play comes back after `respawn_timer` with one fewer
  (`phase_loop`, `$F2E4`); at `$FF` he is out, and the game ends when
  both are (`game_over`, `$F366`; GAME OVER shows until Start, Select or
  256 frames). Lives are never gained.
- Lightning: `lightning_timer` counts down every 128 frames from
  `lightning_delays` (15 in phase 1: 32 seconds; 5 by phase 25); at 0 a
  spark is thrown from a random cloud (`lightning_countdown`, `$C790`)
  with a speed from `spark_base_speeds` plus a random 0 to 31, and the
  level rises for the next one (6 minus the level counts of 128 frames
  later). Two sparks at most (`spark_state` slots 0 and 1). A spark
  bounces off the screen's top and sides and the platforms
  (`spark_platforms`) and is lost off the bottom; it hits a player
  within 8 by 12 pixels (`spark_hit_players`): both balloons gone, a
  stunned tumble, the fall.
- Propellers: a touch starts 50 quarter turns (`propeller_touch`,
  `$CC3A`); while spinning, anything within 18 pixels is thrown 2 pixels
  a frame away (`propeller_push`). An upright propeller's top can be
  stood on. They are redrawn as 3 by 3 background tiles every quarter
  turn (`propeller_draw`).
- The fish: asleep, it swims right a pixel a frame under the water and
  wraps (`fish_swim`); it rises for an actor at exactly its X with Y
  `$B4` or lower (`fish_find_target`), bites at `fish_timer` `$18` when
  the victim's bottom edge is at or below it (`fish_rise`), and the
  victim becomes a falling type held in its mouth (`fish_draw`) with the
  fish fanfare. A target that moves away makes it sink back.
- Pause: Start during play hides the sprites (PPUMASK bit 4 off) and
  plays the pause tone; Start again resumes (`wait_frame_pause`).
- The demonstration: on the title screen `frame_counter` wraps after
  256 frames and `start_game` plays a two-player game with both players
  steered by a random byte every 16 frames (`steer_actor`, `$E6ED`), no
  scoring and the APU off, until a life is lost or Start or Select.

## The bonus round

`bonus_round_play` (`$CF13`): 20 balloons rise one at a time from the
four chimneys (`chimney_x`), 40 to 103 frames apart (`balloon_spawn`),
swaying on a spring (`balloons_update`) at `balloon_rise_speeds`; a
balloon within 24 by 16 of a player is popped. The results screen shows
each player's count times the value and counts it into the score; 20
popped between the players is PERFECT!!! and the super bonus. A player
cannot die here (`no_enemies`).

## Balloon Trip

`trip_start` and `trip_loop` (`$C1C5`, `$C209`). One life, no
platforms (`platform_count` `$FF`), the fish active. On odd frames the
scene scrolls one pixel (`trip_scroll_x`) and every object moves right
by one; every 8 scroll steps a generator runs: the fixed opening
(`trip_layout`, 122 bytes, the same every game) twice, then random ones
chosen by `trip_handler_order` as `trip_difficulty` rises every 32
generator runs. A balloon is 300 points, then 500 and 700 after each
run of 20 popped without a miss (`balloons_popped_p2` counts the run; a
balloon that drifts off the right edge resets it), with 10,000 points
and the perfect jingle at each 20 (`$C348`). Popping a bubble (a rare
one from `trip_gen_rare_bubble`) stops the scroll for 120 frames
(`trip_scroll_pause`). The rank shown is the score's place in
`trip_ranking`, 50 entries filled at power-on with 25,000 down to 500
(`find_trip_rank`); at the end the score is inserted
(`insert_trip_rank`). The eighth difficulty step's generator is an RTS
(`trip_gen_nothing`): a quiet stretch.

## Screens and text

Text is tiles in the game's own order (below); a block in `ppu_queue` is
an address, a count and the tiles. The status bar is rewritten by
`status_bar_update` in the NMI. The title screen is `title_blocks`; the
phase pictures are `common_blocks` plus the phase's own ledges
(`phase_blocks`), the clouds as 4 by 4 tiles and the propellers as 3
by 3; 64 stars twinkle one a frame (`twinkle_stars`, `star_addresses`).
The palette is `base_palette` with the platforms' colours by phase group.

### The alphabet

The font is the game's own order, in the background pattern table at
PPU `$1000` (PPUCTRL bit 4 is set in play). Read from the tiles on
19 October 2026 and matched to Data Crystal's text table:

| Tile | Character |
|---|---|
| `$00-$09` | `0` to `9` |
| `$0A-$23` | `A` to `Z` |
| `$24` | space (an empty tile) |
| `$25` | `-` |
| `$26` | `.` |
| `$27` | `,` |
| `$28` | `.,` in one tile |
| `$29` | `=` |
| `$2A` | the spare-life balloon under the score |
| `$2B` | `x` (a multiplication sign) |
| `$2C` | `!` |
| `$2D` | `?` |
| `$2E` | `*` |
| `$2F` | `_` |

Of these `$27`, `$28`, `$2D`, `$2E` and `$2F` appear in no string. The
strings: the title's three menu lines and ©1984 NINTENDO
(`title_blocks`), PHASE-NN (`phase_text_block`), GAME  OVER
(`gameover_block`), GAME OVER backwards for the two-player status bar
(`gameover_text_rev`), RANK- backwards (`rank_text_rev`), =00000 PTS.
(`bonus_result_text`), P E R F E C T !!! (`perfect_text`) and SUPER BONUS
NN000PTS! (`super_bonus_text`). I-, II- and TOP- are tiles `$8E`, `$8F`,
`$8C-$8D`.

## Sound

`sound_frame` (`$F758`) runs from the NMI: the music (`music_update`,
`music_play`) and three groups of effects, driven by request bytes the
game sets (`sfx_request_a`, `sfx_request_b`, `music_request`,
`sfx_request_c`) and cleared each frame. The four channels are the two
squares, the triangle and noise; the DMC is only zeroed.

- A tune is a header in `tune_headers` (a tempo and four stream
  addresses) and a stream per channel: `$C0-$FE` sets a repeat count,
  `$FF` loops back while repeats remain, `$80-$BF` sets the note length
  (its low nibble plus the tempo indexes `note_lengths`), other bytes
  are notes, an even index into `note_periods` (0 a rest). The eleven:
  phase cleared, game over, pause, the phase fanfare, a parachute torn,
  the perfect bonus, the bonus round and Balloon Trip music (the only
  one that loops), the fish, a bird pumping, a life lost, a bubble
  burst. The phases themselves have no music.
- The effects write register blocks of four bytes (`sfx_set_registers`)
  and step them by frame: the flap (`flap_sfx`), a hit, the fall, a
  spark hit (a random pitch on both squares), lightning and thunder,
  the footstep, a bounce, the bonus tick, a bird landing or taking off,
  a spark bounce.
- The APU's channels are enabled when a game starts (`main`, `$F1E9`)
  and disabled for the demonstration; at the title screen the driver
  runs with the APU silent.

## Register census

Every instruction that names a PPU, APU or I/O register, from the traced
code on the play snapshot (`kit/cpu/census.py`, 19 October 2026).

| Register | What the game does with it | Routine |
|---|---|---|
| `$2000` PPUCTRL | off at reset; NMI off and on (`nmi_off`, `nmi_on`); in the NMI handler the Balloon Trip nametable bit; in `draw_block_lists` the increment-by-32 bit | `reset`, `nmi_off`, `nmi_on`, `nmi`, `draw_block_lists` |
| `$2001` PPUMASK | off at reset and for screen builds; the shadow written back; bit 4 cleared to hide sprites while paused | `reset`, `screen_off`, `screen_on`, `wait_frame_pause` |
| `$2002` PPUSTATUS | three vertical blanks waited for at reset; the end of vertical blank waited for in the Balloon Trip split | `reset`, `nmi` |
| `$2003` OAMADDR | zeroed before the sprite DMA | `nmi` |
| `$2004` OAMDATA | never written; the DMA does it | |
| `$2005` PPUSCROLL | 0,0 each frame; the Balloon Trip scroll after the split | `nmi` |
| `$2006` PPUADDR | every queue flush and screen build; set to `$3F00` then `$0000` after a palette write | `flush_ppu_queue_loop`, the builders |
| `$2007` PPUDATA | the writes, and reads to find blank cells for the stars and the propellers' attributes | the builders, `draw_star_if_blank`, `twinkle_stars`, `set_attr_quadrant_palette1` |
| `$4000-$4003` square 1 | music notes and effects | the sound driver |
| `$4004-$4007` square 2 | music notes and effects (`$4007` only through `SQ1_HI,X`) | the sound driver |
| `$4008`, `$400A-$400B` triangle | the linear counter from the note length; the period through `SQ1_LO,X` and `SQ1_HI,X` | `music_play` |
| `$400C`, `$400E`, `$400F` noise | the noise notes and effects | the sound driver |
| `$4011` DMC_RAW | zeroed with everything else; the DMC is never used | `silence_all` |
| `$4014` OAMDMA | page `$02` once a frame | `nmi` |
| `$4015` SND_CHN | `$0F` when a game starts, 0 for the demonstration | `main`, `title_loop` |
| `$4016` JOY1 | strobe and the eight reads (`JOY1,X` for controller 2) | `read_joypads` |
| `$4017` JOY2_FRAME | `$C0` once a frame: the APU frame counter in 5-step mode with its interrupt off | `sound_frame` |

## Quirks and bugs

- **The reset button never keeps the scores.** `reset` compares
  `ram_signature` with HAL and keeps RAM when it matches; but
  `silence_all` (`$F7B8`) zeroes `$07FA`, the signature's first byte,
  whenever a tune starts or the sound stops, which happens on the title
  screen's first frame. Checked live on 19 October 2026: a top score
  poked to 99,990 came back as 10,000 after a reset from the title and
  from play, and the signature read `00 41 4C` in every snapshot after
  power-on.
- **The sound driver lives in the ranking table.** Its variables at
  `$07E0-$07FE` are the last entries of `trip_ranking` (ranks 46 to
  50) and the signature. `snd_music_loop` (`$07E8`) is rank 47's
  thousands digit: a fresh table holds 2 there, so on the title's first
  frame `music_update` starts the Balloon Trip tune (silently, the APU
  off) and clears it, and rank 47 reads 0 from then on. After a
  Balloon Trip the entries for ranks 47 and 50 hold the effects'
  counters (digits above 9).
- **The ranking table's last entry spills over.** `insert_trip_rank`
  moves 5-byte entries down from the rank found, and the fiftieth moves
  into `$07FA-$07FE`: the signature and the driver's bytes.
- **An IRQ would hang the game**: `irq_hang`. None is ever enabled.
- **The invulnerability is cancelled by any input**, not by time alone
  (`actor_controls`, `$EC45`).
- **The eighth Balloon Trip difficulty step makes nothing**
  (`trip_gen_nothing`, an RTS).
- **A player with no balloons can still be hit by the fish** and by
  sparks; a bird on its parachute cannot be hit by a spark
  (`spark_hit_players` tests players only).
- Unused: the font's `, .,  ? * _` tiles; `fish_flags` is set and never
  read; `balloon_unused` rows; the sprite layouts the actions never
  reach are not checked.

## Live tests

- 19 October 2026: the storm. Phase 1 left alone: `lightning_timer`
  read 8 at 10 s and 3 at 20 s, and a spark (`spark_state` 6) was flying
  at 30 s, inside the 32 seconds `lightning_delays` gives
  (`reference/lightning.png`).
- The bonus round: `phase_index` set to 2 and every bird's
  `actor_balloons` to `$FF` cleared the phase into the bonus round
  (`no_enemies` 1, 20 balloons to launch) with the four chimneys
  (`reference/bonus-round.png`) and the results line 300 x 00 = 0 PTS.
- Game over: `lives` set to 0 and `actor_balloons` to 0 for player 1
  gave GAME OVER after the fall (`reference/game-over.png`).
- Phases 3, 4, 5, 6, 10 and 11 reached by setting `phase_index`; their
  clouds, propellers and platforms match `phase_layouts`.
- Bird types in phase 1: `actor_type` 0 (pink, flying) for the three
  birds after take-off, 3 for the player; `actor_balloons` 2.
- The reset test and the signature, under "Quirks and bugs".
- Balloon Trip: `bonus_value` 30 (300 points a balloon) from the
  start; a 20-second trip ended with the rank in the status bar and the
  score inserted at its rank.
- The flaps: with the player in the air and a counting checkpoint on the
  flap at `$EC7E` for actor 0, B held for 120 frames gave 14 flaps, A held
  gave 1, A tapped every 12 frames gave 10 of 10, every 18 frames 6 of
  6, and 60 two-frame taps gave 10: the once-per-press latch, the 9-frame
  limit and the three-frame sampling, as the code reads.
- The page's flight port (the flap and the vertical physics) was run
  against `actor_animate`, `actor_controls` and `actor_physics` on the
  kit's 6502 over 35,358 frames of random taps and holds, 1,641 flaps,
  with no difference in Y, velocity, action or frame.
- The page's sound driver, the game's own code run on the kit's 6502,
  was run against the emulator's recording of each of the 11 tunes and
  14 effects, started by the same request bit from the same paused
  state: every write to the APU matched, in order, frame by frame
  (`work/sound/compare.js`).
- The page's phase renderer, from the layout tables, was held to the
  emulator's screen for all 16 layout indexes: every cell below the
  status bar matches, and the palettes.

## The listing's error rate

Sample 1, seed 1985, 60 comments drawn from the 713 (30 on code, 30 on
data and variables), checked by a fresh claude-fable-5-1 agent on
19 October 2026: 13 were wrong, 3 in their main claim and 10 in a
detail. The three: `actor_sway` was described as easing a velocity where
it is an undamped spring; the fish's rising sound was called a bird's
take-off and its five stepped frames six; the balloon pop's and the
fall's register blocks were labelled the other way round. The details: a
flap bit swapped (A is bit 7, B bit 6, and B flaps on every pass); "a
note of 0 is a rest" where a 0 ends a channel's stream and the rest is
note 2; sprite and spark arrays said to hold Balloon Trip's balloons,
which `balloon_x` holds; `balloon_draw` said to draw bubbles; a flag's
low bits said to be cleared; a jump misread as a fall-through; a high
byte said to span four pairs. All 13 were corrected, and every other
comment that said the same thing (the request bits in `buttons`, the
spark arrays, `lightning_set_phase`). At 13 of 60 the sample is over the
mark of 2, so the listing's comments should be taken as about one in
five wrong in a detail until an audit: the rate is a lower bound on what
a checker finds. An audit of every comment is recommended for a later
run.
