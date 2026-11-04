# I, Ball — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`. The live
tests are listed at the end.

## Build

- The contributor's copy comes from the OneLoad64 games collection,
  version 5 (the contributor, 26 October 2026).
- One program file, `I_Ball.prg`, loading at `$0314` and running to
  `$FFFF`: a memory image of the game, not the tape. Its own hook
  (`start_hook`, `$033C`) starts it; `orientation.md` says why it cannot be
  loaded with the KERNAL and how the run places it in memory.
- The listing is built from `work/entry.vsf`, stopped on the game's first
  instruction, `game_start` (`$6D1D`), with `$01` = `$36`.
- The title page credits "COMMODORE VERSION BY ANDREW BETTS"
  (`txt_credit`, `$6FEA`).
- No version string or crack marker was found in screen codes or PETSCII.
- **Leftovers.** The image holds code and data the game never runs or
  reads: older versions of the panel routines (`old_panel_top`,
  `old_panel_bottom`, `$41E5`-`$426A`), an older dot scroller
  (`old_dot_scroll`, `$4CEE`-`$4D3F`), six unreached fragments (`$4708`,
  `$5077`, `$55D4`, `$5733`, `$5BD1`, `$64AF`), a speech test program
  (`sample_test`, `$C209`), a stale copy of `$4246`-`$42FF` at
  `$C246`-`$C2FF`, a loader's code and text at `$8CD0`-`$8DFF`, the
  text "SEARCHING LOADING BLOCK? REWIND TO" at `$1FB3`, and from `$F21A`
  to `$FFF9` graphics, four-bit data and the text "**LOADING 12". At the
  hand-over `$4000`-`$40AF` and `$41B0`-`$41DC` also hold leftover code,
  which `new_game` and `reset_level` clear before use.

## Memory layout

`$01` is `$35` in play: RAM everywhere but the I/O chips. The video chip
uses bank 0 (`$DD00` is never written).

| Thing | Where |
|---|---|
| Entry | `game_start` `$6D1D` |
| Title interrupt | `title_irq` `$6DD7`, once a frame |
| Game interrupts | `irq_top` `$4432` (line 0), `irq_panel_end` `$4506` (line `$36`), `irq_logic` `$456D` (line `$92`), `irq_bottom` `$4672` (line `$F8`); the message band's `msg_irq_top` `$5F53` and `msg_irq_charset` `$5FB6` |
| Speech NMI | `sample_nmi` `$C199`, on CIA 2's timer A |
| Zero page | the play sprites' pointers, colours and positions `$02`-`$22`, directions `$26`/`$27`, speeds `$29`-`$38`, the score `$41`-`$46`, the timer `$47`/`$48`, screen-row addresses `$B9`/`$D2` |
| Screen | `$0400`; the playfield is columns 8-31 |
| Map buffer | `$097E`-`$1FFD`: 240 rows of 24 characters, built for each level |
| Sprites | `$2000`-`$2FFF` (`$80`-`$BF`) and `$3940`-`$3D3F` (`$E5`-`$F4`) |
| Playfield character set | `$3000`-`$37FF` |
| Text character set | `$3800`-`$393F` (letters 1-26, digits `$1B`-`$24`) |
| Shots | `$4000`-`$40AF`: 24 slots, a table per field |
| Random numbers | `random_table` `$40B0`-`$41AF`, read in turn |
| Extras flags | `$41BD`-`$41CD` |
| Game code | `$426B`-`$707E` |
| Animated characters | `anim_char_frames` `$7200`-`$737F`: three frames |
| Tiles | `tiles` `$7380`-`$75FF`: 40 tiles of 4 x 4 characters |
| Levels | `$7600`-`$8C7F`: 16 tile lists of 60 rows of six tiles |
| Speech samples | `$A000`-`$BFFF`: three, four bits a sample |
| Speech player | `$C001`-`$C205` |
| Music driver and music | `$E000`-`$ED4F` |
| Sound effects player and effects | `$ED50`-`$F219` |

## Timing

- The frame is cut in four by raster interrupts, each setting the next
  (`orientation.md`). The panels are the bands above line `$36` and below
  line `$F8`, in extended colour mode with their own sprites.
- **The logic does not run every frame.** `irq_logic`'s work, which runs
  the aliens, the shots, the scroll, the timer and the spawning, can take
  longer than a frame, and `in_logic` makes an interrupt that finds it
  still running return at once (`$466C`). *Live:* with only Iball on
  the screen it ran in all 1,500 of 1,500 frames; with seven aliens about
  it ran in 695 of 1,350 frames, counted in 25-frame stretches in which
  Iball was alive and no sample played. Everything it calls counts in
  these passes.
- `irq_top`'s player logic (controls, Iball's move, bounces, friction,
  materialising, dying) ran 519 times in 600 frames of play from
  `play.vsf` (*live*):
  `irq_bottom` skips it when it has not finished.
- **The timer's seconds are 50 logic passes** (`timer_tick`, `$5594`),
  not 50 frames. With only Iball on the screen the logic runs every frame
  and the timer keeps time (*live*: 30 timer seconds in 1,500 frames).
  With seven aliens about it runs at about half speed (*live*: 695 passes
  in 1,350 frames), so the level's 50 seconds would last about 97 real
  ones. The timer also stands still while Iball materialises or dies, in
  hyperspace (`irq_logic` skips `timer_tick` then), and while a sample
  plays.
- While a speech sample plays, `irq_panel_end` does not move the
  interrupt chain on, so nothing else runs until it ends.

## Controls

The stick is read in port 2 (`$DC00`). *Live:* fire in port 1 did not
start a game. Each keyboard test drives seven of the eight rows at once,
so a group of keys does each job:

| Job | Stick | Keys (the documented key in bold) |
|---|---|---|
| Up | up | E, T, U, **O**, @, up-arrow, Q |
| Down | down | S, F, H, **K**, colon, =, C= |
| Left | left | **Z**, B, right SHIFT |
| Right | right | cursor down, left SHIFT, **X**, V, N, comma, / |
| Fire, start a game | fire | W, R, Y, I, **P**, *, left-arrow |
| Smart Missile | | full stop, right SHIFT, **SPACE** |
| Molecule Bomb | | F1, **M**, right SHIFT |
| Pause (toggle) | | **RUN/STOP**, cursor down, left SHIFT, V, N, comma, / |
| Title: music / effects | | **1** / **2** |
| Title: say a sample | | right-group keys sample 0, left-group keys sample 1, SPACE group sample 2 |
| Title: pitch | up raises, down lowers | |

*Live:* Z, X, O and K move Iball exactly as the stick does; V pauses
(and moves right); X moves right without pausing; on the title, I and P
start a game, O and G do nothing, X says sample 0, Z sample 1 and SPACE
sample 2.

## Graphics

- The playfield is 24 characters wide, multicolour text, scrolled
  vertically by the fine scroll (`set_fine_scroll`) and redrawn whole
  from the map buffer every time it moves a row (`draw_playfield`).
- Multicolour register 1 (`$D022`) is stepped every frame
  (`irq_panel_end`); with the Faulty Disc register 2 (`$D023`) steps with
  it.
- `animate_chars` copies one of three 128-byte frames into characters
  `$DE`-`$ED` each logic pass; tiles 28-32 are those 16 characters.
- Sprite multiplexing is by band only: the top panel, the play area and
  the bottom panel each set all eight sprites.
- The score is drawn into two sprites (`$9A`, `$9B`) from the text set's
  digit glyphs (`draw_score`).
- The timer's digits and the level number are digit sprites `$8A`-`$93`.
- **Sprite animation.** Iball's roll (`animate_iball`): eight pointers
  a facing, three pictures and back, each two passes, stepped every logic
  pass but those that draw a map row, moving or not; turning keeps the
  count. Aliens: 49 passes single-colour in `forming_colours` (the 50th
  is replaced in the same pass by `end_forming`'s colour), then
  multicolour; each kind's count (`anim_counts`) is shared by every alien
  of that kind. `alien_shot` clears the alien's multicolour bit
  (`$5C49`), so the explosion is single-colour: `explode_frames` `$E9`-`$F0`,
  each two passes, 15 passes shown (the 16th is never seen), fewer when it
  leaves the screen first. The meter (`$9C`) changes colour every logic
  pass (`$45D4`). Block `$BF` is pointed at by nothing.
- **Losing a life on screen.** After the speech (40 frames for "OH NO!"
  at pitch `$8C`), `death_step` runs once a frame: 1 frame breaking up,
  13 of flash with the sprites keeping their pictures (only sprite 7
  gets `$9E`), then the pieces fly at 10 pixels a frame, slowing one
  every two frames because `materialise_wait` leaves `death_delay` at 2
  when the start is clear at once (50 steps from 4). *Kit model:* every
  frame of 74 deaths and their materialising ran exactly one step.
- **Glow Ball glows.** The title's interrupt adds one to sprite 4's colour
  every frame (`$6E6D`); after level 12 `show_friend` shows Glow Ball in
  white.

## Mechanics

- **Movement.** Iball has a horizontal and a vertical speed and a
  direction for each (`$29`, `$2A`; bit 0 of `$26`, `$27`). A push in
  the direction of motion adds one, against it takes one off, and below
  zero turns him (`push_up` to `push_right`, `limit_speeds`). The speed
  stops at one below its limit (3 at the start, so 2). `friction` takes
  one off every speed every 20 runs of `irq_top`.
- **Scrolling.** Iball stays between Y `$6C` and `$AA`; pushing past the
  top hands his vertical speed to the scroll (`move_iball`). The scroll
  moves the map forward; past the bottom limit it moves it back.
- **Walls.** Characters `$06` and up are solid; `$EE` and up are
  electrified and kill (`hit_wall`), unless the Electro Shield is on.
  With the Faulty Disc every wall kills, until the map pointer is below
  `$0B00`.
- **The goal.** A wall hit on Iball's top row while the map pointer is in
  the top two rows of the map ends the level (`bounce_iball`).
- **Aliens.** Up to seven, in sprites 1-7. A new one forms at a random
  place away from walls and from Iball (`spawn_alien`) and flickers
  through 50 colours (`forming_step`); while forming it cannot harm
  Iball. Sprites 1 and 2 home in on him vertically, 3 and 4 both ways,
  5-7 across (`steer_aliens`), at speeds from `alien_speed_x` and
  `alien_accel_y` by level. They ride the scroll (`ride_scroll`).
- **Shots.** Characters 1-3 in the playfield, 24 at most, moving a row
  each logic pass up or down: down when the last vertical push was down
  (`fire`, `move_shots`). A shot or laser character among the 12 round an
  alien kills it, 10 points (`alien_shot`).
- **Laser heat.** Each logic pass with fire held adds one to
  `laser_heat`; every fourth run of `irq_top` takes one off. At 250 the
  laser overheats: the message LASER OVERHEATED and 100 runs of
  `irq_top` with no fire. *Live:* held from a cold start with no aliens,
  it overheated after 700 frames.
- **Discs.** The first alien to form in a game is a disc; after that one
  in every 21 kills (`disc_countdown`). Touching a disc gives the next
  extra in `disc_order` (32 places, then the last four again) and shows
  its name; shooting one destroys it. Dying moves the sequence back to
  the last checkpoint in `disc_checkpoints` and takes away the extra
  given there (`disc_rollback`).
- **Extras** (`apply_extra`): Turbo Boost (vertical limit 4), Single
  Lazer, Smart Missile, Extra Score (the level number from 0, halved, plus one, in hundreds), Bullet
  Spray, Electro Shield (a meter that empties a byte every seventh
  logic pass, about 441 passes in all), Extended Play (+20 timer seconds), Twin Laser Set,
  Hyperspace (scroll to the goal at 6 pixels a pass), Molecule Bomb (255
  passes with no new aliens), Faulty Disc, Fuel Injection (vertical limit
  5), Bonus Ball (+1 life), Hyper Brakes (controls read every run of
  `irq_top`), Timer Rewind (+40), Lazer Cooler (no overheating), Rainbow
  Ripple. The Electro Shield and Hyper Brakes cancel each other.
- **Lives.** Three. A death: hitting an electrified wall, an alien's
  touch, or the timer reaching 00 (`kill_iball`). Iball breaks into eight
  pieces, the background flashes, and he materialises again at X `$AE`,
  Y `$A0` once the place is clear of walls.
- **Level end.** Each timer second left is worth 10 points
  (`level_end`). Every fourth level a friend is rescued: Lover Ball after
  level 4, Eddy Ball after 8, Glow Ball after 12, No Ball after 16; after
  level 16 the game ends with THAT WAS INCREDIBALL and returns to the
  title.
- **No high-score table**: nothing keeps the score past GAME OVER.

## Data tables

- **Levels.** `level_ptr_lo`/`level_ptr_hi` point at 16 tile lists from
  `$7600`, 360 bytes apart: 60 rows of six tile numbers, the top of the
  level first. `build_level_map` turns them into 240 rows of 24 characters
  through `tiles` (`$7380`, 16 bytes a tile).
- **Level colours** repeat every five levels (`level_colour3`,
  `level_char_colour`).
- **Alien kinds.** Seven animations (`alien_frames`, `anim_limits`); new
  aliens take kinds from `kind_choices` (0, 1, 2, 3, 4, 5, 3, 2), and
  discs are kind 6.
- **Alien speeds by level.** `alien_speed_x`: 1 on levels 1-4, 2 on
  5-13, 3 on 14-16. `alien_accel_y`: 1 on 1-8, 2 on 9-15, 3 on 16.
- **Text** is in screen codes, the text set's own: letters 1-26, digits
  `$1B`-`$24`.

## Sound

- **Music** (`music_play`, `$E009`): three voices, each a track of
  pattern numbers with transposes (`track_ptrs`), 35 patterns
  (`pattern_ptrs`) and 18 instruments of 16 bytes in two tables
  (`instruments`, `instruments_b`) with vibrato, pulse sweep, arpeggio,
  filter sweep and drum tables. It plays on the title, and in play when
  the title chose music (`music_flag`); with effects chosen,
  `effects_play` runs instead.
- **Sound effects** (`effects_play`, `$ED56`): 22 effects of 16 bytes
  (`effect_defs_a`, `effect_defs_b`), a slide on each voice driven by one
  of eight scripts, requested by writing `$40` plus the number to
  `effect_req`.
- **Speech** (`say`, `$C1F3`): three samples of four-bit volumes, two to
  a byte, played through the SID's volume register on CIA 2 timer NMIs,
  at a rate set by `sample_pitch` (`$C021`, `$5A`-`$FA` cycles). Sample
  0 (`$A000`, title) "IBALL!", 1 (`$AC00`, a death) "OH NO!", 2
  (`$B700`, game over) "GAME OVER!": the names are C64-Wiki's, matched
  to the samples by where the game plays them.

## Hardware register census

From `kit/cpu/census.py` over every decoded instruction.

| Register | Use | Routine |
|---|---|---|
| `$01` | `$35` in play, `$36` at the start | `new_game`, `init_title_irq`, `init_game_irq` |
| `$D000`-`$D010` | sprite positions, for each band | `sprites_out`, `panel_sprites_top`, `panel_sprites_bottom`, `msg_irq_top`, `title_sprites` |
| `$D011` | fine scroll, extended colour per band, 25 rows, blanking | `set_fine_scroll`, the interrupts |
| `$D012`, `$D019`, `$D01A` | the raster interrupt chain | the interrupts |
| `$D015`, `$D01C`, `$D01D`, `$D017` | sprites on, multicolour, no expansion | `sprites_out` and the panels |
| `$D016` | multicolour text on in play, off on the title | `reset_level`, `title_irq`, `msg_irq_top` |
| `$D018` | character set `$3000` in play, `$3800` for text | `irq_top`, `msg_irq_charset`, `title_irq` |
| `$D020`, `$D021` | black; `$D021` flashes when Iball dies | the interrupts, `death_flash` |
| `$D022`, `$D023` | stepped every frame (walls flash); `$D023` the level's colour | `irq_panel_end`, `build_level_map` |
| `$D025`-`$D02E` | sprite colours | `sprites_out` and the panels |
| `$D400`-`$D418` | three voices, filter, volume | `music_play`, `effects_play` |
| `$D418` | the speech: a four-bit volume each NMI | `sample_nmi` |
| `$DC00`/`$DC01` | stick in port 2 and the key groups | `read_controls`, `fire`, `check_pause`, `molecule_key`, `smart_key`, `title_irq` |
| `$DC0D`, `$DC0E` | CIA 1's interrupts off, its timer stopped | `init_game_irq`, `init_title_irq` |
| `$DD04`, `$DD05`, `$DD0D`, `$DD0E` | CIA 2 timer A for the speech NMI | `sample_start`, `sample_stop`, `sample_nmi` |

Never named: the sprite collision registers `$D01E`/`$D01F` (collisions
are tested on positions, `alien_near_iball`, and on screen characters,
`probe_background`), the sprite priority `$D01B`, `$DD00` (the video bank
stays 0), and CIA timers other than CIA 2's A.

## Behaviour worth knowing

- **The title's sample keys are not I, O and G.** The keys C64-Wiki
  gives for the three samples start a game (I) or do nothing (O, G);
  `title_irq` tests the key groups of right, left and the Smart Missile
  (*live*).
- **The Smart Missile scores for empty slots.** `smart_missile` sets
  sprites 1-7 exploding, all but discs and those already exploding,
  without testing `sprite_enable`, and scores 10 for each. *Live:* fired
  with no alien on the screen it gave 70 points and took 7 off the disc
  countdown.
- **A laser hit clears the wrong shot.** In `alien_shot`, for a laser or
  ripple character X holds the character's place in the probe (0-3),
  not a shot's slot, so `clear_shot` frees shot slot 0-3 (traced, not
  exercised).
- **Losing a life costs an extra.** `disc_rollback` takes the sequence
  back to a checkpoint and, when the sequence had passed it, removes the
  extra given there; the next disc offers it again. A death on a
  checkpoint's own place, or before the first disc, takes nothing.
- **CIA 1's interrupts are switched off with zero page `$7F`.**
  `init_game_irq` and `init_title_irq` load `$7F`, not `#$7F`; nothing in
  the game writes it.
- **`death_explode`'s loop runs once.** It ends with `DEX` and `BEQ`, so
  only sprite 7 gets its colour and pointer there; `death_flash` sets all
  the pointers afterwards.
- **Speech stops the game.** While a sample plays, the interrupt chain
  stands at `irq_panel_end` (*live*: the title's samples hold the screen).
- **Fuel Injection's flag is never set.** `disc_rollback` clears
  `fuel_on` (`$41C8`) when it takes Fuel Injection away; the extra itself
  only sets `vertical_limit`. Turbo Boost and Extended Play set flags
  (`$41BE`, `$41C3`) that nothing reads.

## Open questions

- Which release the image was saved from. The contributor's copy came
  from the OneLoad64 games collection, version 5, which loads each game
  as one file; whether the code inside is the original release's or
  another crack's, unknown: no second copy was compared.

## The listing's error rate

Sample 1, seed 20261026: 80 comments drawn from the listing, 60 from the
647 written by hand and 20 from the 166 generated by script, checked
against the code by a fresh agent (claude-opus-5-5) that wrote none of
them. 74 were right and 6 were wrong in a detail, none in its main
claim: two music patterns' lengths counted only the notes, not the
rests; an instrument byte was placed between the wrong two patterns; the
sprite shapes at `$3940` were put in the upper half of the text set when
they start in the lower; a leftover table was put inside `start_level`
when it is inside `next_level`; and `ride_scroll` said all aliens' own
steering adds to the scroll's speed when only sprites 1-4 steer up and
down, and that steering can take speed off too. All six were corrected,
and with them the comments that said the same things: 12 more pattern
lengths recounted with the driver's own rule (a byte with bit 6 set is a
rest), two more leftover tables, five score bytes written with a doubled
`$`, and the Rainbow Ripple's width (seven characters, not five), which
the checker found outside the sample by running `ripple_fire` and
`ripple_step`. 6 wrong in 80 is 7.5 %, a 95 % range of 3.5 % to 15.4 %
(Wilson score), over the mark of one in 30. No audit has been made.

## Live tests

- Boot: the file placed in RAM and its hook armed (`orientation.md`); the
  game reached its title and play.
- Controls: 25 frames of each stick direction and of each of Z, X, O, K
  and P from `play.vsf`, compared with a run with no input: Iball's X
  (`$12`) and Y (`$13`) changed the same way for the stick and the keys.
- Title keys: I, O, G, X, Z, SPACE, P, 1 and 2 held for six frames on
  `title.vsf`; read `sample_busy`, `sample_first`, the IRQ vector and
  `music_flag` (results under Controls).
- Pause: RUN/STOP and V set `paused`; X did not.
- Rates: non-stopping checkpoints on the four interrupts, `irq_logic`'s
  work (`$45D1`), its early exit, `timer_tick` and its second (`$559B`)
  over 600 frames, from `play.vsf` as it stands and with no aliens.
- Overheat: fire held with no aliens, `laser_heat` read every 20 frames:
  15 a step at first, then slower; freeze at 700 frames, with
  `overheat_lock` 100 and LASER OVERHEATED in row 23.
- Smart Missile with no aliens: +70 points, disc countdown 20 to 13.
- Level end with 25 on the timer: +250 points.
- Rescue: level 3 ended: YOU HAVE RESCUED LOVER BALL, sprite 3's pointer
  `$F1`.
- Timer out: dying set, sample 1 (page `$AC`) playing, a life lost, the
  timer back at 50.
- Discs: a disc put on Iball with `disc_index` 0 gave TURBO BOOST and
  vertical limit 4; at 12, FAULTY DISC and `faulty_disc` set; at 14,
  BONUS BALL and a life; at 31, EXTRA SCORE and the sequence back to
  place 28.
- Game over: lives 0 and the timer out: GAME OVER, then the title.
