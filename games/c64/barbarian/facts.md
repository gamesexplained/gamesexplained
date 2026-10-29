# Barbarian — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.
Addresses are side 1's (`parts/practice`); side 2's are given where they
differ.

## Build

- Palace Software's disk, two sides, from the C64 Preservation Project's
  G64 images (`orientation.md` has the files and their SHA-256). Each side
  loads the whole of memory on its own: the boot loader `BARBARIAN`, a
  fast loader hidden as a deleted directory entry, then `V1`, `B1`, `B2`,
  `B3` and a second hidden file of tables at `$CB00`.
- The two sides run the same engine. Side 2's code is side 1's with 362
  bytes of ending code put in at `$849E`-`$8605`: side 1's `$80FD`-`$8496`
  sit 6 bytes on, `$8497`-`$92C3` 366 bytes on, and `$92C6` to the end of
  the table file 364 bytes on (`work/scripts/sidemap.py`). Every other
  difference in that range is an address that moved with it: the only
  changed instructions are the main loop's two extra calls, the jump in
  `walk_off` that starts the ending, and the F1 key, which on side 2 sets
  one player instead of switching between one and two (`read_keys`).
- Side 1 carries all of side 2's ending data unused: the messages YOUR
  END HAS COME and THANKS BIG BOY, the scene records, Drax's star and its
  dodges, and the thirteen shapes of Mariana, Drax and the star at
  `$FC40`. Only side 2's code reads them.
- The graphics at `$0840`-`$43FF` and `$4800`-`$5FFF`, the font, the
  snakes' pictures and the music at `$E800`-`$FC03` are the same on both
  sides. The two backdrops differ: side 1 has the volcano on screen and
  the forest stashed, side 2 Drax's throne room on screen and the hall of
  arches stashed.
- Side 2's file at `$E000` holds 32 bytes at `$FFD0`-`$FFEF` that side 1's
  has as filler: 6502 code that writes `$3E` to `$FF00` and `$B0` to
  `$D505` and jumps to `$1100`, then Z80 code that writes the same
  registers. `$FF00` and `$D505` are the Commodore 128's MMU registers.
  Nothing in the game runs them.

## Memory layout

| Thing | Where |
|---|---|
| zero page variables | `$02`-`$EE` (the sprite shadow `$02`-`$51`, the fighters `$5B`-`$96`, the game's flags `$AF`-`$CE`, the sound driver `$CF`-`$EE`) |
| sound driver variables | `$0200`-`$0259` |
| the eight sprite slots | `$025A`-`$02A9` |
| mirror and mask tables, built at the start | `$02AA`-`$04A9` |
| cell stashes for the ending's arches | `$04AA`-`$05C9` |
| compose buffer, 9 bytes by 63 lines | `$05CA`-`$0800` |
| fighter graphics, 239 blocks of 63 bytes | `$0840`-`$43FF` |
| screen colours, sprite pointers | `$4400`-`$47F7`, `$47F8`-`$47FF` |
| 96 sprite shapes | `$4800`-`$5FFF` |
| multicolour bitmap, then tables | `$6000`-`$7F3F`, `$7F40`-`$7FFF` |
| CBM80 reset vectors | `$8000`-`$8008` |
| code | `$8009`-`$9D93` (side 2 `$8009`-`$9EFF`) |
| sound driver data | `$9D94`-`$A550` |
| arena buffer, the strip's clean copy | `$A551`-`$B950`, zeros in the load |
| messages, the font's character list | `$B951`-`$BB2B` |
| snakes, moves, frames, hits, the computer, sprite pictures and motion | `$BB2C`-`$CE1F` |
| the stashed backdrop's arena, under the I/O chips | `$D000`-`$DFFF` |
| its screen colours and colour RAM | `$E000`-`$E7FF` |
| font, snake pictures, sound sequences `$80`-`$D6`, ending shapes | `$E800`-`$FF7F` |

## Timing

- A raster interrupt at line `$72` sets the arena's background colour
  and one at line `$FA` sets the border band's, then does the frame's
  work: the sprite registers, the sprites' motion, the goblin, the
  motion scripts, the picture sequences and the counters (`raster_irq`).
  The work is skipped for a frame while the last frame's is still
  running (`irq_busy`, `$CE`).
- CIA 1's timer A, latch `$2710`, interrupts 98.5 times a second on a PAL
  machine and runs the sound effects (`effects_tick`); timer B, latch
  `$5161`, 47.3 times a second, runs the sequencer (`sound_tick`). A
  tune's tempo command reloads timer B from `tempo_latches`: tempo 10,
  `$6B50`, the title tune's, is 35.9 ticks a second.
- The main loop runs a pass every few frames, not once a frame: the
  fighters move one frame of their animation a pass (`main_loop`). Nothing
  in it waits for the screen, so the pace is the time its work takes.
  *Live*: 50 passes in 500 frames of a one-player fight, a pass every 10
  frames, 5 a second ("Live tests").
- The two-player clock counts one second each 50 frames (`tick_counters`)
  from 90 (`reset_clock`).

## Controls

- Player 1 on joystick port 2, player 2 on port 1 (`read_stick`). F1
  enters the select mode (side 1 switches between one and two players
  while it is held, side 2 sets one player), F3 switches between the
  title tune and the sound effects, F5 pauses until F5 again (a press still held at the next pass pauses again), F7 starts the game from
  the select mode, Q goes back to the demo (`read_keys`). CTRL and V
  together print `V 05 10 87` and `HELLO CLAIRE` in the arena while V is
  held (`read_keys`, message `$81`).
- A move is picked from a row of nine (`move_rows`) by the stick's
  direction, the row chosen by the move under way and by the fire button
  (`stick_row`, `move_rows_free`, `move_rows_fire`). Every move but
  standing and the two walks holds the stick until its list of frames
  reaches its command: the row's entry, with bit 7, goes into `next_move`,
  which `stick_to_move` tests and `animate_fighter` clears at the list's
  end. Standing and walking give way at once.
- Move `$95` (frame `$3E`) is in `move_frames`, but no stick row, hit
  record or routine on either side starts it.
- Frames `$27` (between the roll forward's `$26` and `$28`) and `$2A`
  (between the roll back's `$29` and `$2B`) have descriptors and pictures
  of their own and are in no move's list. Frames `$15` and `$47` are in
  no list either and share descriptor `$BE94`. Of the frames the moves
  show, only `$14` (the headless body's last) and `$21` and `$59` (the
  fall to death's last two) name no body piece.
- Body pieces `$44` and `$4D` (sprite pointers `$64` and `$6D`) hold
  pictures and are named by none of the 71 frame descriptors.
- Scene record 3 (the fourth pointer in `scene_records`, to `$CD35`:
  `00 8B 8E 8D` for sprites 3 to 0) shows Mariana with
  picture sequence `$8E`, shape `$36`, in place of `$8C`, shape `$34`:
  the same figure without the top of her costume. Nothing sets
  `scene_number` to 3.

## Graphics

- The screen is a multicolour bitmap. The fighters are drawn into it, not
  made of sprites: each frame is three rows of three blocks of 63 bytes,
  stored as sprites are, put together in a compose buffer
  (`compose_frame`), mirrored through a table for a fighter facing left
  (`mirror_compose`), and drawn into a copy of the arena's strip through
  a mask table so the background shows through (`draw_fighter`), which
  is then copied into the bitmap (`show_strip`).
- Sprites draw what rises above the strip (the head, a fist, the sword),
  the blood, the rolling head, the goblin, and fighter 1's coloured body
  pieces, in the skill level's colour (`place_overlays`, `level_colours`).
- Each side has two backdrops, called arenas on the pages: side 1 the
  volcano (backdrop 0) and the forest (1), side 2 Drax's throne room (0)
  and the hall of arches (1). At the load backdrop 0 is in the bitmap and
  backdrop 1's arena (cell rows 7 to 22, columns 4 to 35, 4,096 bytes) is
  stashed under the I/O chips at `$D000`-`$DFFF` in the same layout, its
  screen colours and colour RAM at `$E11C` and `$E51C` (rows of 40).
  `swap_backdrop` exchanges them: `lift_arena`, `swap_arena_colours`,
  `colour_strip`, `drop_arena`, `save_strip`. The pillars and the panel
  stay; side 2's pillars have skulls on top.
- The strip the fighters walk in, cell rows 14 to 21, has the same colours
  in every backdrop: screen bytes `$C0` (grey, black) and colour RAM `$0A`
  (light red) (`colour_strip`), on the arena background from
  `backdrop_colours`: brown `$09` on side 1 and dark grey `$0B` on side 2,
  for both backdrops.

## Mechanics

- A fighter has 12 points of strength, shown as six half circles in two
  rows (`show_strength`). A blow that hurts takes one point, whatever the
  record says (`hit_effect`), and every record that hurts says 1, so each
  is one half circle. At 0 the fighter falls dead.
- A blow lands when the attacker's pose is one of the twelve in
  `attack_poses`, the victim's pose is in that blow's list and the
  distance is one the hit record reaches (`hit_test`, `hit_records`).
- When a blow's list names the victim's pose twice and the first record
  does not reach, the second is read from the wrong address:
  `hit_record_at` builds the record's high byte in `$88`, which `hit_test`
  clears only before its loop, so the second call starts from the `$C6`
  or `$C7` the first left there. Lists 0, 1, 4, 6 and 11 name a pose
  twice, 14 cases in all. Record 13, the flying neck chop (list 4) against
  the kick (frames `$1B` and `$1C`), is read at `$E2D1` in the music,
  bytes `B3 3E 8E 5C`: reach 0, 1, 4, 5 and 7, where the real record at
  `$C6D0` reaches 2 and 3, and victim move `$BE`, past the 30 moves. The
  others' second records are read at `$DEC9`, `$DED1` and `$DEDD`, I/O 2,
  which reads as open bus with no cartridge. *Live* ("Live tests").
- Only the flying neck chop (back with fire, move `$87`, its blow in
  frame `$1A`) takes a head: its list (`hit_lists` entry 4) gives hit
  record 4 or 5 for 29 of the victim's poses, standing, walking, the guard
  and the ends of other blows among them. It works at any strength: the
  two records give the victim move `$88`, the headless body, and take no
  point of strength (`decapitate` records the death). The head flies off
  and bounces, blood spurts from the neck, and the goblin comes on, kicks
  the head away and drags the body off (`decapitate`, `goblin_kicks_head`,
  `goblin_drags`).
- Points for a hit come from `hit_points`: 500, 200, 100 or 50, by the
  record. *Live*: 200, 100 and 50 were each seen added; 500 belongs to
  hit records 4 and 5, the decapitation, which was not timed in that
  test. A two-player win adds 10 points for each second left on the
  clock (`time_bonus`).
- The computer's fighter reads its opponent's pose and the distance, which
  together give a list of eight stick values (`ai_pose_rows`,
  `distance_class`, `ai_choices`); the skill level's list of 32 picks
  chooses one (`ai_level_picks`). In a game the pick counter only goes up
  by one each call, so the computer works through its 32 picks in order;
  in the demo it is taken from CIA 1's timers (`computer_moves`).
- A fighter left idle long enough taunts (move `$9A`, `idle_taunt`).
- A one-player win goes up a skill level, to 7 on side 1, and changes the
  backdrop (`walk_off`, `swap_backdrop`). F1 starts a game in backdrop 0
  at level 0, so levels 0, 2, 4 and 6 are fought in backdrop 0 and 1, 3,
  5 and 7 in backdrop 1; on side 1 the backdrops go on alternating at
  level 7. A loss restarts in the demo, which changes backdrop after every
  bout, and `restart_game` puts backdrop 0 back.
- In a two-player game (side 1) the clock running out with both fighters
  alive walks them back, restores both strengths and changes the backdrop
  (`clock_out`); the first death ends the game (`walk_off`).
- On side 2 the win at level 7 starts the ending (`start_ending`) in the
  hall of arches, where level 7 is fought. `start_ending` calls
  `swap_backdrop` only when backdrop 0 is up, which a game won bout by
  bout never has; a level set to 7 by hand in the throne room reaches it.
  Drax steps out of his arch and throws stars from the right, picked at
  random high or low (`drax_throws`). A crouch, a leg chop or a roll
  passes under a high star, a jump over a low one (`star_strikes`,
  `dodge_lists`); anything else and the barbarian falls dead and YOUR END
  HAS COME is printed. At column 28 he has reached Drax, who vanishes;
  Mariana comes down from her arch, the barbarian walks to her, raises
  his sword and THANKS BIG BOY is printed (`reach_drax`). *Live*.

## Data tables

- `move_frames`: the frame list of each of the 30 moves `$80`-`$9D`.
- `frames`: 91 frame numbers, sharing descriptors of three by three
  block numbers, a step and the overlay sprites.
- `hit_lists`, `hit_records`: 39 records of reach, the victim's move,
  sound, damage, blood and points.
- `ai_level_picks`, `ai_pose_rows`, `ai_choices`, `distance_class`: the
  computer.
- `picture_sequences` and `motion_script_table`: 22 sprite picture
  sequences and 12 motion scripts for the head, blood, goblin and ending.
- `message_pointers`: 24 messages for the bitmap font.

## Sound

- One driver plays the music and the effects, three voices of sequences
  (`sound_tick`): notes, lengths, and commands for waiting, repeating,
  going to or calling another sequence, the instrument, the tempo and the
  filter (`do_command`, `command_handlers`). 63 instruments carry
  pitch, pulse-width and frequency effects stepped 98.5 times a second
  (`voice_effects`); 16 filter settings carry cutoff sweeps.
- The title tune, Richard Joseph's, is sequences `$80`-`$82` on the three
  voices, asked for by F3; the walk-on tune `$89`-`$8B`.
- `pitch_step` wraps a pitch slide past the top of the note table to its
  bottom, and one below the bottom to one entry above where a wrap would
  land (2 less 4 gives 191, 0 less 1 gives 192, past the table's end).
- The title tune is one loop of five parts, each three sequences that go
  on to the next with `$F5`: `$80`-`$82`, `$83`-`$85`, `$86`-`$88`,
  `$89`-`$8B` (the walk-on tune, which `walk_on` asks for) and `$D4`-`$D6`
  (the goblin's drag, which `goblin_drags` asks for), then `$80` again.
  On the kit's 6502, with timer B at the tune's own tempo, the loop is
  375.8 seconds, 6 minutes 16 seconds (`work/js/explore-music.js`).
- The note table (`note_freqs`, 192 quarter tones) is tuned for an NTSC
  machine's clock: at 1,022,727 Hz each of its 96 semitones is within 10
  cents of equal temperament at A = 440 Hz, at a PAL machine's 985,248 Hz
  none is. A PAL machine plays it 65 cents flat: middle C, entry 96, is
  4,291, 261.6 Hz on NTSC and 252.0 Hz on PAL.

## The listing's error rate

- Sample, seed 2910: 60 of the 801 line comments, drawn from both sides
  (every comment of side 1, and each of side 2's that is not side 1's
  carried over), in two strata: 20 of the 455 a script wrote from
  templates and 40 of the 346 written by hand (`work/scripts/sample.py`).
  The checker, on claude-opus-5-5, found 6 wrong, all of them hand
  comments: `main_loop` misnamed three of its calls; `stick_to_move` and
  `next_move` called `next_move` a queued move; `hit_test` said a second
  record for the same pose is tried, which it is, from the wrong address;
  `pitch_step` said the wrap downward stays inside the table;
  `shapes_raised` said the raised parts are always drawn in pairs; and
  `shapes_body` said fighter 1 wears all 45 body pieces. All six were
  corrected, with every comment on either side that said the same.
  The plain rate is 6 in 60, 10 % (95 % interval 4.7 % to 20.1 %); the
  hand comments' is 6 in 40 (7.1 % to 29.1 %) and the templates' 0 in 20
  (0 % to 16.1 %), so the rate weighted by the strata's sizes is 6.5 %.
  A checker misses some, so these are lower bounds.

## Live tests

- Both sides boot from their G64 images to the demo (`orientation.md`).
- The main loop's pace, from side 1's one-player play snapshot: over 500
  frames `main_loop` (`$80BB`) ran 50 times, `sprite_registers` (once a
  frame, at line `$FA`) 500 times and `irq` 2,469 times, the raster's two
  and CIA 1's two timers together (`work/verify.py`, 29 October 2026,
  VICE v3.13.2).
- Damage and points, from the same snapshot with random stick moves for
  player 1 against the computer until a death at frame 2,935: 16 drops of
  strength, every one of 1 point, and 16 scores: 100 points 8 times
  (`hit_points` entry 3), 50 points 4 times (entry 4) and 200 points 4
  times (entry 2) (`work/verify.py`).
- Side 2's ending, from a win at level 7 (the level set to 7 before the
  last fight): left alone, the barbarian is struck by the first star,
  falls, YOUR END HAS COME is printed and the game goes back to the demo.
  Dodging each star (down for a high one, up for a low one) he survived
  to column 20; with his column then set to 28 during a dodge, Drax
  vanished, the barbarian walked back to column 3, Mariana came down, he
  walked to column 23 and raised his sword, and THANKS BIG BOY was printed
  (`work/ending4.py`, 29 October 2026, VICE v3.13.2). A crouch counted
  only once the fighter was down (move `$86`): a star that arrived during
  move `$97`, going down, struck him.
- The stray hit record, side 1, from the one-player play snapshot with
  both moves started by hand on the pass before the blow: the flying neck
  chop against the kick at distance 4 took the victim's strength from 12
  to 11 and put him in move `$BE`, then `$F8`, before the computer took
  him back, and the score did not change (`work/bug2.py`). The flying
  neck chop against protect body (frame `$3F`) at distance 4, a pair
  whose second record is read from I/O 2, landed: move `$FE`, strength
  down one (`work/bug4.py`). Both 29 October 2026, VICE v3.13.2;
  screenshots `reference/practice-bug-before.png` and `-after.png`.
- CTRL and V held in a one-player game on side 1 printed `V 05 10 87` and
  `HELLO CLAIRE` in the arena and set `pause` (`$C1`) to `$80` until V was
  let go (`work/claire.py`, 29 October 2026, VICE v3.13.2;
  `reference/practice-ctrl-v.png`).
- One frame of side 1's demo, the goblin dragging the loser off, recorded
  with `kit/c64/frame.py` and drawn by `C64.renderFrame`, matches VICE's
  own screenshot of it in all 104,448 pixels (`work/frame-goblin.json`).
- The four backdrops drawn by `bbBackdrops` (the game's restart colouring
  and `swap_backdrop` on the kit's 6502 over each side's listing) match
  VICE screenshots of each, in cell rows 7 to 22 and all 40 columns, in
  every one of 143,360 pixels outside the cells the screenshots' fighters
  stand in (`test_levels.js`; screenshots `reference/practice-demo-volcano.png`,
  `practice-demo-forest.png`, `tournament-demo.png`,
  `tournament-ending-arches.png`, VICE v3.13.2).
- F3 and F5 in a one-player game on side 1: F3 set `sound_mode` (`$B8`)
  to `$80` and a second press back to 0. F5 stopped the main loop (no
  pass in 150 frames, against 15 before). A second press held for 15
  frames resumed it for one pass and paused it again, because F5 was
  still down when the next pass read the keys; a tap of 4 frames resumed
  it (15 passes in the next 150 frames) (`work/keys.py`, `work/keys2.py`,
  29 October 2026, VICE v3.13.2).
