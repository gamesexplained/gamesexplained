# Green Beret — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

- Ocean's original disk, 1986: `green_beret[ocean_1986](!).zip` from the
  C64 Preservation Project's collection on the Internet Archive, a G64
  with SHA-1 `eb688ed6cb3f23072c6e09671c82dd3e92da5558`.
- The directory's program, `GREEN BERET 6428` (368 bytes at `$0101`),
  reads the game from 409 sectors no file holds with its own drive code,
  shows the loading picture with a tune, and on a key or fire unpacks the
  game backwards into `$0400`-`$FFFF` and jumps to `startup` (`$4000`).
  Nothing is loaded after that: the whole game, four stages, title, intro
  and ending, is one load.
- Programming D C, sound M G, graphics S W (the title's credits,
  `text_credits`, `$7A00`); C64-Wiki names them David Collier, Martin
  Galway and Steve Wahid.

## Memory layout

| Thing | Where |
|---|---|
| Zero page: pointers, the multiplexer's lists (`mux_order`, `sprite_order`, `mux_y`, `mux_xhi`, `mux_xlo`), the 21 virtual sprites' Y (`spr_y`), the map's row pointers (`col_ptrs`, `colour_ptrs`) and the music driver's voice state | `$0000`-`$00FF` |
| `cia2_serial_check`, copied from `$4030` by `startup` | `$0100`-`$010B` |
| The virtual sprites' X low, X high, colour and shape | `$0180`-`$01D3` |
| The game's variables | `$0200`-`$03BC` |
| The hi score, three decimal bytes, `$56 $03 $00` as loaded | `$03BD`-`$03BF` |
| The title's logo, the intermission's map and a blank screen, as run-length pictures | `$03C0`-`$06DF` |
| Code: main loop, jet, weapons, enemies, the four end-of-stage fights, spawning, ladders, the hero, scrolling, title and intro | `$06E0`-`$3FA2` |
| The title tune's sounds, `swap_flags` | `$3FA3`-`$3FFF` |
| The playfield's screen (`startup` runs here first); sprite pointers at `$43F8` | `$4000`-`$43FF` |
| Sprite shapes `$10`-`$DF` | `$4400`-`$77FF` |
| The playfield's character set, with the texts in its spare characters | `$7800`-`$7FFF` |
| The Bridge's and the Prison Camp's tiles and tile colours, swapped in by `block_swap` | `$8000`-`$9FFF` |
| The tiles in use (`tiles_a`) and their colours (`tile_colours_a`) | `$A000`-`$BFFF` |
| The map of all four stages | `$C000`-`$C256` |
| Status line code, the captives' picture, the status band's screen | `$C257`-`$C443` |
| Multiplexer, sorting, interrupt, text and picture drawing | `$C444`-`$CFFF` |
| The dogs' shapes for the Harbour's fight | `$C580`-`$C7FF` |
| The title's character set, which the status band shows in play | `$C800`-`$CE87` |
| RAM under the I/O area: the Harbour's, the Prison Camp's and the Bridge's characters | `$D000`-`$DFFF` |
| The music driver (Martin Galway's): code, tables, 17 effects, 13 tunes | `$E000`-`$FEB9` |
| Score and status routines, `block_swap` and its tables, `draw_ammo` | `$FEBA`-`$FFE4` |
| Vectors: NMI to the `RTI` at `$FFFC`, IRQ to `irq` | `$FFFA`-`$FFFF` |

The game runs with `$01` = `$35`: the I/O area in, BASIC and the KERNAL
out. Code that reads the RAM under the I/O area sets `$01` to `$30` with
interrupts off (`block_swap`, `text_draw`, `anim_chars_restore`).

## Timing

- PAL, 50 frames a second. The only interrupt is the VIC's raster
  interrupt, through the hardware vector at `$FFFE` to `irq` (`$CEA9`),
  which runs three phases in turn from `irq_phases`: the multiplexer
  (`$C474`), `irq_status` (raster `$F6`) and `irq_playfield` (raster
  `$46`). The multiplexer runs again every 14 lines down the playfield,
  and leaves the phase as it is until every sprite is placed.
- `irq_status` raises `frame_flag` once a frame; `frame_wait` waits for it,
  so `main_loop` is one pass a frame. The hero is moved from the
  interrupt (`irq_player`), the enemies from the main loop.
- `idle_time` rises by one every 256 frames (`idle_lo` wraps in
  `irq_status`) and falls by one at each character the screen scrolls
  (`scroll_right`). *Live*: with the hero standing still from
  `idle_time` 0, the jet came at 1,800 frames, sampled every 8, against
  7 × 256 = 1,792 (36 seconds).
- The difficulty (`difficulty`) rises every 256 frames by the stage's rate
  in `difficulty_rates` into `difficulty_frac`: a step every 512 frames on
  the Missile Base, nearly every 256 on the Prison Camp, up to 3, 6, 9 and
  14 (`difficulty_caps`). A death sets it back to 0 (`lose_life`).

## Controls

- Joystick in port 2 (`read_joystick`): left and right walk, up jumps
  (pressed again for each jump: `jump_used`), up or down on a ladder
  climbs, down crouches, fire stabs (once per press).
- SPACE fires the extra weapon (`weapon_trigger`, CIA 1 port B bit 4 with
  port A left at row 7). Port 1's fire button is on the same line, so it
  fires the weapon too.
- Key 1 (`irq_player`, CIA 1 port B bit 0) freezes the hero where he is,
  in the air too, while it is held. *Live*: held during a jump, his Y
  stayed at 194 for 50 frames, and the jump went on when it was let go.
- There is no pause and no key that ends a game: the code reads CIA 1
  port B only at `$077B` (key 1) and `$185D` (SPACE), and never writes
  port A.

## Graphics

- The playfield is character graphics in multicolour, VIC bank 1: screen
  `$4000`, characters `$7800`. The status band at the top shows bank 3
  (screen `$C400`, characters `$C800`), switched by `irq_status` and
  back by `irq_playfield`.
- The screen scrolls one way, right to left: `scroll_right` moves the
  fine scroll (`fine_scroll`, 7 to 0) by the hero's walking speed, and
  `coarse_scroll` shifts rows 8-23 one character left when it wraps;
  `column_draw` then draws the new column 39 from the map.
- The map (`map`, `$C000`) holds two bytes for every 8 columns: a lower
  and an upper tile. A tile is 8 × 8 characters (`tiles_a`, `$A000`,
  64 tiles of 64 bytes, stored bottom row first) with a colour for each
  character (`tile_colours_a`, `$B000`). Rows 3-7 are sky (character
  `$21`), rows 8-23 the 16 rows of tiles, row 24 the floor `$FB`.
- 21 virtual sprites share the 8 hardware sprites (`multiplexer`): 0 and
  1 the hero's top and legs, 2-7 the six enemies' tops, 8-13 their legs,
  14-19 the projectiles (0-2 the hero's, 3-5 the enemies'), 20 the
  dropped weapon. `sprites_sort` keeps them in order of Y by insertion
  sort.
- Each stage's graphics are exchanged in memory by `block_swap` (`$FEEC`),
  nine swaps in `swap_a_addrs`/`swap_b_addrs`/`swap_lengths`: the Harbour
  swap 0; the Bridge swaps 1, 3 and 2; the Prison Camp 4, 6 and 5
  (`stage_swaps`); the title's characters swap 8; the dogs swap 7.
- Two characters of each stage, the mine, blink (`chars_animate`): 16
  bytes from `anim_frames` by bit 2 of the frame counter.

## Mechanics

- Four stages (`stage`, `$03B1`): 0 the Missile Base, 1 the Harbour, 2 the
  Bridge, 3 the Prison Camp. Each ends where the scroll reaches
  `stage_end_lo`/`stage_end_hi`; the alarm (tune 11) sounds and the
  end-of-stage fight follows (`stage_end_handlers`): 18 soldiers and
  kickers after a lorry crosses (`missile_fight`), 18 dogs sent in threes
  by a handler (`harbour_fight`), three helicopters (`bridge_fight`),
  18 enemies from both sides (`prison_fight`).
- After the Prison Camp the captives are freed (`rescue_walk`), and the
  game goes round again from the Missile Base with `fire_frame_b` at
  `$82`: every enemy that shoots gets a second chance in its 256-frame
  count, so shoots twice as often. `loop_count` was meant to add a third
  on the third round, but `stage_complete` decrements and increments it
  back, so it stays 0.
- Enemy types 0-9 (`behaviour_table`, `type_top_colours`): 0 brown soldier,
  1 white soldier (drops a weapon), 2 blue soldier who kneels and shoots,
  3 blue soldier, 4 green grenade thrower, 5 green kicker, 6 bazooka man
  lying down, 7 crawler, 8 officer (throws grenades), 9 paratrooper.
- Points (`enemy_points`, shown with a 0 after them): 200, 2,500, 350,
  250, 500, 750, 850, 350 and 550 for types 0-8.
- Lives: 2 at the start (`new_game`). An extra life at 30,000, then every
  70,000 (`next_life_check`): 100,000, 170,000 and so on; at 9 lives it is
  lost. *Live*: score 29,990 plus 10 gave a third life and moved the next
  to 100,000; at 9 lives, 99,990 plus 10 left 9 and moved it to 170,000.
- The hero dies on touching an enemy (`enemy_contact`), an enemy
  projectile (`shot_contact`), a dog (`dog_contact`) or a mine
  (`mine_check`). A death restarts play 40 columns before the last of the
  stage's six checkpoints passed (`lose_life`, `checkpoints`).
- Weapons (`spawn_pickups`, `pickup_ammo`): white soldiers named in the
  spawn table drop a bazooka (4 shots), hand grenades (3) or a flame
  thrower (3).
- The jet (`jet_update`) comes when `idle_time` reaches 7 and drops a bomb
  that follows the hero's X (`eshot_jet_bomb`).
- The knife (`knife_hit_test`) hits enemies within 6 units of its point
  across and `$10` lines in height; contact (`enemy_contact`) is within
  3 units.
- Enemies come from five random lanes (`spawn_timers`, `lane_types`,
  `lane_reload`, read at the lane plus the difficulty) and from 60
  scripted map positions (`scripted_spawn`), at most 3 to a floor and 5
  (random) or 6 (scripted) at once.
- `player_killed` drops one return address; in an end-of-stage fight the
  call is one level deeper, so each death there leaves two bytes on the
  stack. *Live*: the stack pointer at `main_loop` was `$FC` before a
  death in the Missile Base fight and `$FA` after it, and stayed `$FA`
  after later deaths. Nothing in the code resets the stack (no `TXS`).
  *Live*: on the Missile Base with the hero standing, the stack went down
  to `$01EB` in 1,500 frames, 17 bytes below the main loop's. With the
  stack pointer at `main_loop` moved down by 2 × N, where N such deaths
  would leave it, and the hero walking and stabbing, the game played on
  at N = 8, 12 and 16 (1,500 frames) and 18, 20, 21 and 22 (3,000
  frames), and stopped at N = 23
  (within 1,200 frames, with the processor in the character set at
  `$7AD0`) and at every N tried from 24 to 90 (within 650 frames). From
  N = 12 the stack, 17 bytes below `$01FC` - 2 × N, can reach the
  virtual sprites' tables at `$0180`-`$01D3`, which the game writes as
  it plays.
- `bridge_fight` calls `helis_launch` each frame, and when the last
  helicopter is down `helis_launch` jumps to `stage_complete` instead of
  returning, so each Bridge won leaves two bytes on the stack as well;
  the other fights jump to `stage_complete` from the main loop's level.
  *Live*: on the kit's C64, the hero kept alive, the stack pointer at
  `main_loop` was `$FF` before the Bridge's fight and `$FD` after it was
  won. Through every stage over 37,500 frames, the port's count of
  these bytes (deaths in the fights and Bridges won) matched the C64's
  stack pointer at 15 moments (`test_play.js`).
- `cia2_serial_check` (`$0100`), run every frame of play, stops the
  machine with a `JAM` when CIA 2's serial flag is not set: the
  start-up keeps CIA 2's serial port shifting at timer A's rate.

## Data tables

- `checkpoints` (`$159B`): 24 map columns, six to a stage.
- The scripted spawn table: `spawn_col_lo`, `spawn_col_hi`, `spawn_types`,
  `spawn_pickups`, `spawn_floors`, 60 entries, `stage_spawn_first` 0, 5,
  21, 43.
- Mines: `mine_col_hi`, `mine_col_lo`, 34 mines in 68 halves,
  `stage_mine_first` 0, 6, `$1A`, `$2E`.
- `floor_y` (`$22BD`): the three floors' top Y, `$CD`, `$9D`, `$6D`.
- `jump_arc` (`$2C20`): 32 heights shared by the hero, enemies, dogs and
  grenades.
- `char_attrs` (`$292D`): characters `$C8`-`$FF` are the only ones a
  figure stands on or climbs; bit 0 ladder up, bit 1 ladder down, bits 2
  and 3 floor.

## Sound

- Martin Galway's driver at `$E000`: three note readers (`v1_tick`,
  `v2_tick`, `v3_tick`) run once a frame from `frame_wait`, and three
  effects routines (`v1_effects`, `v2_effects`, `v3_effects`: the gate,
  pulse sweeps, slides and arpeggios) once a frame from `irq_player`. A
  pattern byte below `$C0` is a note and a duration; `$C0` and up are
  commands (calls, jumps and repeats with an eight-deep stack per voice,
  transposition, instruments, frequency effects, pulse sweeps).
- 13 tunes in `tune_table` (`$3E6E`), started by `tune_start` with the last
  of their six bytes: the intro, the start of a game, the rescue, three
  intermissions, game over, a death, the helicopters, the title, play
  resuming, the alarm and the lorry.
- 17 sound effects of 31 bytes (`$EE4C`-`$F05A`), started on a voice by
  `sfx_start`, which takes the voice from the music (`v1_free` and on)
  until the effect's sound time runs out.
- The drums under play: in tunes 1 and 10, which start play and resume it
  after a death, voices 1 and 2 play one note and end, and voice 3 goes
  round for ever (`start_v3_5`) with command `$DC` (`v3_crash`), a hit on
  all three voices at once, noise on voice 1 and triangles on 2 and 3. It
  plays until the next tune replaces it, and not while a sound effect
  holds any voice.
- Voice 3 sets the tune's tempo: its command `$D0` with index `$44` writes
  past the voice's own settings into `durations` (`$ECA6`), the table of
  note lengths every voice reads.
- Martin Galway's source of the sound, `greenberet.asm`
  (github.com/MartinGalway/C64_music, commit `a458a36`, published April
  2026, headed 5 April 1986), compared with the game by assembling its
  data section (`DS` to `DE`) and searching `$E000`-`$FFFF` for each
  labelled block, with the bytes that hold addresses left open: the 11
  effect blocks of its `DS` list are the game's `$EE4C`-`$EF82` byte for
  byte, in the same order (`DOG0`, `FLAME1`, `FLAME2`, `EXPL0`-`EXPL2`,
  `JET0`, `JET1`, `KILL0`, `GUN0`, `GUN1`); the game's six after them
  (`pickup_fx1`-`3`, `bazooka_fx1`-`3`) are not in the source. Its
  `TUNETAB` has 14 tunes; the game's `tune_table` has the same ones in the
  same order with `HIGH0`-`HIGH2` ("HIGH-SCORE TABLE MUSIC") left out and
  `AUTO0` (the helicopters, the source's last) in their place, entry 7.
  None of `HIGH0L`, `HIGH1L` or `HIGH2L`'s note runs is in the game's
  memory; the blocks the tune loads are (`LD00` at `$F494`, `HD00` at
  `$F689`, `TIME` at `$F05B`, `AD20` at `$F3E3`). Some tunes' note data
  differ from the source's (`STRT`, `OVER`, `COL1`-`COL3`, `TITL`), so the
  game's are a later revision.

## The listing's error rate

A sample of 80 of the listing's 850 comments, drawn with seed 20261028,
was checked one by one by a fresh agent on `claude-opus-5-5[1m]` that had
written none of them: 60 from the 732 written by hand and 20 from the 118
a decoder wrote for the music's patterns, instruments and sound effects.
It found 14 wrong, 13 of them in a detail: the reader of the fine scroll's
copy (`scroll_copy`), which finds the characters under each enemy and does
no hit test; the dog handler's pause, about 13 frames since the Harbour's
fight counts the hold timers down twice a frame; the intermission's texts;
`stage_swaps` returning before `play_reset` on the Missile Base; the
grenade throwers left out of `spawn_types`; which enemies `enemies_anim`
skips; the hero's left limit; `bark_voice` holding the last voice, not the
next; the Bridge's character set at `$D800` (256 characters, half of them
at `$DC00`); a return with nothing to return to, which ends a voice; the
writers of `v2_freq_fx`; two notes tuned apart from the rest; and the gate
rule's frame count. One was wrong outright: the jet's sound and the sound
of taking a weapon had each other's labels. All 14 were corrected, with 14
other comments that held the same beliefs (the other two voices' command
JMPs and live effect flags, the decoder's other two gate rules, `sfx_bark`,
`chars_bridge_b`, and the two sounds' routines and effect blocks). The
sample's rate is 17.5 %, with a 95 % interval of 11 % to 27 %; by stratum,
12 of 60 hand-written (20 %) and 2 of 20 generated (10 %), 19 % weighted
by the strata's sizes. It is a lower bound, since a checker misses some.

## Live tests

- The hi score as loaded: the status line shows `0003560` (`hi_score`,
  `$56 $03 $00`), in VICE from `work/play-stage1.vsf`.
- Extra lives: score and `points_due` poked in play, five frames run
  (Mechanics, above).
- Key 1 held during a jump (Controls, above).
- The jet's timing: `idle_time` and `idle_lo` set to 0, the hero kept
  alive by an `RTS` poked at `player_killed` and `mine_check` for the
  test, frames advanced 8 at a time until `jet_slot` was set (Timing,
  above). `idle_time` rose by 2 in 512 frames.
- The stack after a death in an end-of-stage fight: a checkpoint on
  `main_loop` from a snapshot of the Missile Base fight, the stack
  pointer read at each pass (Mechanics, above).
- A jump: the hero's legs (`hero_bot_y`) read each frame from a standing
  jump on the Missile Base's bottom floor went from line 226 to 196 and
  back in 42 frames, four of them at the top (Controls, above).
