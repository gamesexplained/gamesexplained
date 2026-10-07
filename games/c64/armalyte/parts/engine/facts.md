# The engine — verified technical facts

The program that stays in memory from the first load to the last: the
front end (title, high scores, loading screen and fast loader), the
play engine, the sound effects and the music. Every address here is the
engine's; a level's tables are named by their place in a level file and
belong to `parts/level-<n>`. Unless marked *live*, a fact comes from the
code in `work/entry.vsf` (stopped at `$A000`). Live tests are listed in
the game's own `facts.md`.

## Memory and start-up

| Range | What |
|---|---|
| `$8800-$8FFF` | the front end's font (`front_end_font`), also the scoreboard's glyphs |
| `$9000-$94D5` | the title's 41 strings and their address tables (`title_strings`) |
| `$9680-$96FF` | in a load, the mover (`move_level_into_place`), copied from `$DA80` |
| `$9900-$9F75` | the scoreboard and player-collision module, entered through a jump table at `$9900` |
| `$A000-$BFFF` | play: start, interrupts, main loop, hits, bosses, script, score; the front end from `$B030` |
| `$C000-$CF81` | the music driver and its four tunes |
| `$D700-$DFFF` | RAM under the I/O chips: the logo screen, the balls' curve, the drive code, the colour bars, the mover's source and the title sprites |
| `$E000-$F7B8` | the second module (scroll, objects, ships, weapons, stars), entered through a jump table at `$E000` |
| `$F800-$FC43` | the sound effects |
| `$FD00-$FFF7` | the object tables, cleared at every level start |
| `$B000-$B02F` | the game's state that survives a level: level number, lives, score, player states, batteries, generators, settings |

`engine_start` (`$A000`) is entered once from the loader and again after
every game over and every quit (through the vector at `$66`). It sets
level 1 as the next (`$B002` = 0) and marks the next load as a new
game's (`$B004` = 1), then enters the front end (`$B030`). The front end
loads the level in `$B002` whenever it is not the one in memory (`$B003`)
(`load_level_if_needed`, `$B388`), so a game over beyond level 1 reloads
level 1 from disk before the title comes back.

## Interrupts and the frame

The KERNAL is banked out (`$01` = `$35`), so the processor's own vectors
at `$FFFA-$FFFF` are used. In play the IRQ is `play_irq` (`$A05F`), which
jumps through its own operand at `$A06B`: to `frame_irq` (`$A07C`) at
lines `$FA` and 0, or to the next slot of the sprite multiplexer
(`$A319`). The NMI is an RTI (`$A075` in play, `$B1BF` in the front end),
so RESTORE does nothing.

- At line `$FA`, `frame_irq` opens the lower border, lays out the eight
  hardware sprites as the scoreboard (`panel_sprites_setup`, `$9D6C`)
  and, unless paused, reads the keys and sticks, steps the stars, tests
  the ships against the scenery and moves the enemy shots.
- At line 0 it shows the screen the scroll has just drawn (`$24` into
  `$D018`), sets the fine scroll and starts the multiplexer
  (`multiplexer_start`, `$A305`).
- The multiplexer places up to 20 objects (`$FD00-$FFF7`, sorted by y)
  on hardware sprites 2-7, each slot waiting until the sprite it reuses
  has been drawn. The ships use sprites 0 and 1 (`ships_to_sprites`,
  `$E4D6`). With the eight scoreboard sprites, at most 30 sprites are on
  the screen in a frame: 22 in the playfield and 8 in the border.
- `objects_sort` (`$F4C8`) sorts the objects by y with the stack page as
  a bucket table: the page is all `$FF`, PHA puts an object's number in
  the first free byte at its y, and the read-back restores `$FF`.

The main loop (`main_loop`, `$A12A`) runs once a frame, waiting on the
multiplexer's start (`$1D`). *Live:* in a run of all of level 1 with no
input it made 25,299 passes in 25,298.5 frames (`frame_irq` hits halved),
so it never fell behind.

Some of its work runs only every second frame. `frame_irq` flips `$68`
every frame (`$A0A3`), and the main loop moves the enemies along their
paths and starts waves when it is 0 (`enemies_follow_paths`, `$EE8D`;
`waves_spawn`, `$E3FF`), and animates the objects and checks one ship
against the pods when it is 1 (`objects_animate`, `$F022`;
`p1_collect_pod`, `$9A94`, and `p2_collect_pod`, `$9B92`, taking turns
by `$76`, so each ship's check runs every fourth frame). The anti-cheat
check runs at the end of `objects_animate`, every second frame. Movement
by the objects' speeds, the delays before objects appear, the ships, the
shots and the generators run every frame, and the script once a scroll
step of eight.

## The scroll and the map

- The playfield scrolls left one pixel a frame. `scroll_fine_step`
  (`$E33E`) steps the fine scroll `$18` from 7 to 0; at 0 the two
  screens (`$7000`, `$7400`) swap and the map's ring position `$1B`
  moves on. Each frame's share of the copy into the hidden screen is
  done by `scroll_draw_phase` (`$E19E`), so the whole screen is redrawn
  one column on over the eight frames of a step.
- A map is five rows of 256 tiles, each tile five by five characters
  (`map_column_build`, `$E1D4`): `$21` is the tile column, `$20` the
  character column in the tile. A tile column passes in 40 frames, and a
  level's 256 columns in 10,240 frames, about 204 seconds (*live*: level
  1 went from column 7 to column `$D6` in 8,287 frames). The scroll
  position runs ahead of the screen: in the recorded frame of level 1,
  with `$21` = 36 and `$20` = 0, the rightmost character column shown
  was tile 35's fourth (*live*).
- Character `$20` in a tile is a gap; the column builder puts the star
  character of that screen row there, so the starfield shows through the
  scenery. Characters `$21-$F5` are solid; `$F6-$FF` are the players'
  shots.
- While the scroll is stopped (`$52`), `scroll_stopped_redraw` (`$E36B`)
  redraws the hidden screen five columns a frame without moving it, and
  still steps `$18` through 7 to 0.
- The stars: F3 on the title picks one of three settings (`$B02F`),
  run by `stars_animate` (`$F72F`). Far stars are a double pixel moving
  every two frames in characters 1-15, near stars a single pixel moving
  every second frame in characters `$10-$1F`, a character every 16
  frames: `stars_animate` runs the near stars only when `$68` is 1.
- Space is drawn, not left as background: the star characters are solid
  in their own colour, black (colour RAM 8, multicolour), and a star is
  one pair of bits, `$D023` in a far star and `$D022` in a near one.
  `$D021`, the VIC's background colour, only colours scenery (*live*, in
  level 1: colour RAM 8, `$D021` white, `$D022` light blue, `$D023`
  blue, the values of the script's first event).

## The level script

`level_script` (`$A93E`) runs when `$18` is 7, once a scroll step of
eight frames, whether or not the scroll is moving. It compares the scroll
position with the next event's tile column and character column (a
level's `$9700` and `$9748`). Events 0 to 10 can happen; the script stops
at 11 (`cpx #$0B`). An event sets:

- the enemy speed `$6A` from the level's `$9760`; a speed below 3 has the
  number of games completed (`$B02D`) added, to at most 3;
- what a kill scores, patched into the instruction at `$A5D6`: by speed
  (`kill_points_by_speed`, `$A9DE`: 100, 300, 300, 400, 500, 500, 500,
  500 points) plus 300 in a two-player game (`$A9E6`);
- the boss to start, `$6D`, from `$9754`: 1 the boss at the end of the
  level, 2 the mid-level boss;
- the number of enemy shots allowed, `$6B`, from `$976C` (events 0-9);
- with flag bit 0 (`$973C`), the background and shared multicolours from
  `$970C`, `$9718` and `$9724`;
- with flag bit 1, a stop of the scroll for `$9730` units (0 counts as
  256). Each unit is six script runs, 48 frames, about a second (*live*:
  level 1's mid-level stop of 60 units took 2,880 frames, its end stop
  of 256 units 12,288).

When a stop runs out, `level_end` (`$AC20`) runs as if the boss's core
had been destroyed: every live object explodes. With the scroll at its
end (`$21` = 0) that starts the end of the level; anywhere else it
scores 50,000 points and the main loop restarts the scroll. So a boss
that is not destroyed blows itself up when its time is over, and pays
the same as if it had been shot (*live*: in level 1, with nothing fired,
the mid-level boss went at the end of its 2,880 frames and the score
went from 0 to 50,000; the end boss went after 12,288 frames and the
level was completed).

## Bosses

`boss_start` (`$AC95`) fills the 16 enemy objects from a level's boss
table (`$9778` for the boss at the end, `$97D8` for the mid-level boss,
by `boss_table_addresses`, `$AD57`). In the boss stage (`$6F`) only
objects `$86` down to 0 can be hit (`enemies_hit_by_fire`, `$A54C`):
object 0 is the core, objects 1 to `$86` its guards, and the rest are
scenery of the boss that cannot be hurt. The core takes no hits while a
guard is alive (`shots_offscreen`, `$A7E2`, clears `$86` when they are
gone). A part takes `h` hits, plus 256 for each unit of its reserve
(`boss_part_hit`, `$AC07`). A boss can release enemies from a spawn list
(`boss_spawn`, `$AD89`). The core's end calls `level_end` (above). The
end of a level then plays out over 148 frames (`level_end_sequence`,
`$AE62`: `$AD` from `$94`), four explosions flying apart from the core
(`boss_burst`, `$AEEC`, which starts the four enemy-shot objects in the
burst state), and `level_complete` (`$AE25`) scores one
million, gives each player an extra life, and moves to the next level.

## Enemies, waves and paths

- An attack wave starts when the scroll's tile column changes to one
  the level marks (`waves_spawn`, `$E3FF`). Each entry is five bytes: x
  (the object's x is 256 plus it, off the right edge), y, type, path,
  and the frames before it appears. A wave takes free objects 0-15; one
  that finds none places no more.
- An entry of type 6 gets no delay when the second ship is the drone,
  and an object with no delay never comes to life, so those pods are
  only in a two-player game.
- `objects_init_new` (`$E3AA`) gives a new object its colour and group,
  first and last frame, firing mode, frame delay and hit points from
  the level's five type tables.
- A path step is three bytes: x speed (bits 0-2, bit 7 the direction,
  bit 3 half speed, bit 4 firing, bit 5 animation), y speed, and how
  many path updates the step lasts, less one (`enemies_follow_paths`,
  `$EE8D`). Paths move on every second frame, so a third byte of b
  holds a step for 2 × (b + 1) frames, while the speeds are applied
  every frame (`objects_move`, `$F64F`). Paths 0-`$41` have 16 steps and repeat; paths from `$42`
  run 32 steps, into the next path's bytes. An exploding enemy keeps
  following its path.
- Enemies fire when a shot of the stage's allowance is free and no live
  shot is within 45 lines (`enemies_fire`, `$A664`), aimed at player 1,
  or at the second ship on alternate shots (`choose_target`, `$A79E`).
  An enemy moving vertically that comes close above or below another
  object in its path removes it if it has not appeared yet, and
  otherwise turns round and bursts (`enemies_space_out`, `$AA64`).
- An enemy dies when a players' shot character (`$F6` or higher) is in
  the screen cells it covers (`enemies_hit_by_fire`): a normal shot is
  used up, a super weapon's (`$FB` and up) goes on. Hits are read from
  the screen, not from who fired, so the drone's shots kill as well. A
  kill scores the script's points; an enemy with a group takes the
  whole group with it for 5,000 points (`group_destroyed`, `$A62F`).

## The ships

- Ships move cell to cell on an 8-pixel grid, gliding 8 pixels a cell
  (`ships_move`, `$E59C`; `ships_glide`, `$E90B`). In a two-player game
  a ship that moves into the other pushes it a cell the same way
  (`ships_relative`, `$E531`; *live*).
- A ship touching a solid character (`$21-$F5`) is hit
  (`players_hit_scenery`, `$9E05`), as is one inside an enemy's box or
  an enemy shot's (`p1_collect_pod`, `$9A94`; `p1_hit_by_shot`,
  `$9C97`). A hit ship explodes, loses a life with
  `DEC $B005` at `$E9F3`, and comes back where it was, invulnerable,
  keeping its enhancements (`ship1_hit_sequence`, `$E9BD`).
- Invulnerable (state 3), a ship flashes through six colours and counts
  `$56` (ship 2 `$57`) down (`ship1_invulnerable`, `$EA77`): 192 frames
  after a hit, 255 after an unchanged pod. At a level's start
  `level_setup_vars` means to give 255 frames by a DEC of the cleared
  timers at `$A260`, but `music_init` has just left its track pointer in
  `$56`/`$57` (`$CD67`), so ship 1 gets 102 frames and ship 2 204
  (*live*: 103 and 205 frames counted from the first pass of the main
  loop).
- Lives: three each at the start, at most 15; one more for each player
  every 100,000 points (a carry out of the ten-thousands digit,
  `score_add_hundreds`, `$A9EF`; *live*) and at each completed level.
  The game ends when player 1 is out and the second ship is out or is
  the drone.

## Weapons

The players' shots are characters drawn into the screen being shown, in
20 slots (`char_shots_step`, `$EB78`): 0-9 player 1, 10-19 player 2 or
the drone. They stop at the screen's edge or a solid character.

| Weapon | Variable (player 1) | Shots | Slots | Character |
|---|---|---|---|---|
| forward fire | `$4B` | `$4B` + 1 in flight: 2 at a level's start, 4 at most, 6 with converge | 0-3 | `$F6` |
| tail gun | `$4D` | a pair, a row above and below, backwards | 4-5 | `$F9` |
| trident | `$47` | a pair one column behind, a row above and below, forwards | 6-7 | `$FA` |
| vertical cannon | `$4F` | a pair, up and down | 8-9 | `$F7`, `$F8` |
| converge | `$B2` | two more forward shots, in the tail gun's slots | 4-5 | `$F6` |

(`ship1_normal_fire`, `$F1C3`.) Pressing fire fires them, and so does
letting go.

Held for 15 frames, fire tries the super weapon chosen in `$49`
(`ship1_fire`, `$EC87`; *live*: the charge fell at the fifteenth frame).
It needs free shot slots and charges, taken from the generator's own
charge `$62` when that is enough, otherwise from a battery holding more
than the cost; held on, it fires again about eight frames later (`$45` = 8).

| Super weapon | Pattern | Slots needed | Charges |
|---|---|---|---|
| A (0) | ten shots of `$FE` across the ship's row, three columns apart, starting beyond any wall | 10 | 2 |
| B (1) | five shots of `$FC`/`$FD`: two ahead above and below, one back, two from behind | 5 | 2 |
| C (2) | two shots of `$FF` side by side | 2 | 1 |

(`super_weapon_patterns`, `$F07D`; `super_weapon_slots`, `$EE73`; costs
at `$F486`; *live*: each fired from a full generator, which dropped by
2, 2 and 1.) With the drone, a super weapon also fires the drone's line
of five `$FB` shots. The Commodore key steps player 1's choice A, B, C
and round (*live*), the `/` key (marked `?`) player 2's (*live*); the
choice is kept from level to level (`$B020`).

## Munitions pods

Objects of types 5 and 6 are pods (state below 7). A pod that is shot
enough times changes to the next of seven enhancements (`pod_next_type`,
`$A5F4`): its frame from `$A64C` (`$23 $24 $25 $28 $29 $26 $27`), the hits
before it changes again from `$A654` (11, 11, 11, 11, 17, 17, 32; five
fewer in a two-player game) and its colour from `$A65C`. After the
seventh, the battery, the type goes to 0, an unshot pod's, while the
frame, colour and hits are taken from forward fire's entries (`$A5FE`):
the pod looks like forward fire and, collected, does what an unshot pod
does, until its next change makes it type 1 with the same look
(traced). Collected (`p1_collect_pod`, `$9A94`):

| Pod | Gives |
|---|---|
| 0, not yet shot | invulnerability, 255 frames |
| 1 | forward fire, to 3 (four shots) |
| 2 | the tail gun |
| 3 | the vertical cannon |
| 4 | the trident |
| 5 | converge: with the tail gun and forward fire 3, forward fire 5 |
| 6 | a generator, to 4 |
| 7 | a battery in the first empty slot of four |

Types 1-4 when there is room add the enhancement and play only a sound;
everything else (a full enhancement, 5, 6, 7 and an unshot pod) also
makes the ship invulnerable for 255 frames.

## Energy: generators and batteries

`generators_recharge` (`$EB00`) runs each frame. A counter runs from 0
up to the table's value for the number of generators (0-4: 60, 50, 40,
30, 18 at `$EB73`) and then ticks, so a tick comes every 61, 51, 41, 31
or 19 frames. Each tick moves the rebuild count `$60` up by one, to 7.
At 7 each further tick fills one battery to its six charges (value 7)
and starts the rebuild again; when no battery is left to fill the
generator's own charge `$62` is set to 6. So eight ticks fill a battery
or the generator (*live*: from an empty generator and no batteries, the
charge reached 6 after 488 frames with no generator and 152 with four,
the rebuild count stepping every 61 and every 19 frames). A super weapon fired
from the generator's charge restarts the rebuild. Batteries
(`$B010-$B013`, player 2 `$B014-$B017`) and generators (`$B018`,
`$B019`) are outside the zero page, so they survive a level; every other
enhancement is in the zero page and is cleared at each level's start.
After each load `next_level_losses` (`$B723`) runs twice, each time
taking each player's last battery from slots 3, 2 or 1 and one
generator: two of each go, and the first battery slot is never taken.

## The drone

In a one-player game the second ship is the drone (`$B00E` = 4).
`drone_follow` (`$9E78`) keeps it on the side opposite the way the stick
is pushed, at the offsets from `$9EF8`/`$9F03`, stepping one cell toward
that place when its own movement is idle; with the stick released it
stays where it is. SPACE (`keys_play`, `$AB53`) detaches it (`$74` = 1):
it then stays where it is on the screen, and SPACE again calls it back
(*live*, all of this). It is never hit by an object, absorbs enemy shots
(`p2_hit_by_shot`, `$9CD3`), collects nothing, and fires a copy of player
1's normal weapons from its own place, except the vertical cannon, which
starts behind player 1's ship (`drone_fire`, `$F0C4`).

## Score and scoreboard

The score is shared by both players: six decimal digits, one a byte, at
`$B007-$B00C`, ten millions down to hundreds, shown with two fixed zeros
after (`score_add_hundreds`, `$A9EF`, with entries for thousands `$A9FE`,
ten thousands `$AA0D` and millions `$AA2E`). The scoreboard is the eight
hardware sprites in the lower border, frames `$16-$1D` of each level's
sprites, drawn into at run time: `panel_update` (`$99FA`) redraws at
most one changed item a frame, from glyphs in the engine's font
(`panel_draw_glyph`, `$99A4`).

## Keys in play

`keys_play` (`$AB53`) reads the keyboard's bottom row once a frame, and
only changes count: RUN/STOP pauses (taking effect at the end of a scroll
step); Q quits to the front end, only while paused; the Commodore key and
`/` change the super weapons; SPACE detaches or recalls the drone. Fire on
either stick ends a pause (`pause_and_fire`, `$AF7E`). Nothing else is
read: S in the pause does nothing (*live*).

## The front end

- `front_end` (`$B030`) builds the title (`title_screen_build`, `$B770`):
  the logo with raster colour bars (`logo_colour_bars`, `$BCD8`, a colour
  change on each of 40 lines), up to 24 spinning balls multiplexed on
  eight sprites along a curve (`title_balls_multiplex`, `$B165`;
  `title_balls_move`, `$B1ED`), and seven pages of text that fade in and
  out (`title_text`, `$B85B`; `title_pages`, `$B953`).
- The title's colour set changes at each visit, one of six
  (`title_colour_sets`, `$B361`). Every visit to the title also clears
  the count of completed games (`$B02D`), so the faster rounds after the
  ending last until the game ends.
- Fire starts a game; left and right on the stick, or F1, choose one
  player with the drone or two players (`$B026`); F3 steps the starfield
  (`$B02F`: 2, 0, 1); F7 starts the demo (`$B01A`) (`title_start_keys`,
  `$B58A`; `title_function_keys`, `$BC55`; *live*, all of them).
- After a game the score goes into the six-row high-score table if it
  qualifies, and three letters are entered with the stick
  (`high_score_check`, `$BA72`; `high_score_name_entry`, `$BB3C`).
- Strings 17 and 18, "PRODUCED BY:" and "PAUL COOPER AND JOHN HARRIES",
  are in the string table but on no page, so the title never shows them
  (`title_pages`, `$B953`).

## Protection

- **Stack check.** At each level start the stack page is filled with
  `$FF`, and `objects_sort` leaves it so; if any of `$0138-$013F` is
  anything else, as after a freezer cartridge has used the stack, the
  game wipes `$B000-$FFFF` and resets (`stack_check`, `$AFAE`; in the
  front end `stack_check_title`, `$B838`, wipes and halts on a JAM).
- **Timing check.** Every title frame, CIA 1's timer B, started at the
  last check with `$4D07` cycles (one PAL frame and a line), must read
  0-`$7F` (`timing_check`, `$BDC8`): checks more than about 60 cycles
  off a PAL frame apart, as on a stopped or NTSC machine, wipe memory
  and halt. A copy at `$AFD5` is never called.
- **Anti-cheat.** Every second frame, at the end of `objects_animate`,
  `anti_cheat_check` (`$F77D`) compares the
  two `DEC` instructions that take a life (`$E9F3`, `$EA57`) and the
  `BMI` after each. Changed, as by the infinite-lives poke
  `POKE 59891,173`, it switches the KERNAL ROM in over the game; its
  own `JMP` is then never fetched, and the machine runs on into the ROM
  and a loop through the zero page with interrupts off (*live*: frozen
  within five frames).

## Sound

- **Effects.** 32 effects, each a column of 14 tables of 32 bytes at
  `$F800-$F9BF` (`sfx_tables`): envelope, gate and release frames, two
  waveforms, frequency, a frequency sweep of eight kinds, pulse width
  and sweep, and a special kind (a trill, bit flips, or noise from
  voice 3's oscillator, `$D41B`). The game asks for an effect by storing
  its number in a voice's request byte (`$F9C0`, `$F9C7`, `$F9CE`); a
  lower number overrides a higher one (`sfx_voice_step`, `$FA3C`). Effects
  play in every frame of play except in the demo.
- **Music.** Four tunes (`tune_headers`, `$C765`): 0 the title's (and the
  ending's last screen), 1 the demo's, 2 the high-score page's (and the
  ending's pictures), 3 the loading screen's (`front_end`, `$B030`;
  `load_level_if_needed`, `$B388`). Each voice has a track
  of patterns with repeats, loops and fade commands; a pattern is notes
  with lengths, rests, ties, instrument changes and slides; 21
  instruments of 16 bytes give the envelope, waveform, pulse sweep,
  vibrato, arpeggio and attack effects (`music_play`, `$C059`). The
  filter is never used: `$D417` is written only with 0, and `$D415`/
  `$D416` never.
- **Timing.** `music_play` runs once a frame wherever music plays: from
  the title's frame interrupt (`$B1D6`), `loading_irq` (`$B70D`),
  `high_score_irq` (`$BA66`), `joysticks_read` in the demo's pass of the
  main loop (`$ABF9`), and the ending's interrupt (its part's
  `facts.md`). Note
  lengths count steps of the beat counter `$C4B4`, reloaded from the
  tempo `$C4ED` when it runs out, and early whenever the second counter
  `$C4B5` runs out of `$C4EE`. All four tunes have a tempo of 1, so a
  step is two frames; with `$C4EE` = 8 (tunes 0 and 3) every fourth step
  is three frames, four steps in nine frames.
- **Lengths** (the port, below, run from `music_init`). Tune 0 starts
  again after 10,656 frames; tune 1 sets a fade of speed 5 (`$FD $05`
  in its first voice's track) at frame 8,974 and stops at 9,066; tune 2
  sets one of speed 120 (`$FD $78` at `$CE8C`, also in its first
  voice's track) at frame 6,376 and stops at 8,193; tune 3's
  voices each restart on their own, every 576, 1,296 and 720 frames,
  which line up every 25,920 frames.
- **Per frame.** A new note that is not tied, or that changes
  instrument, writes its control register twice in the same frame, gate
  off and then on, or off twice for a rest (`$C3F1`, `$C3FA`). An
  arpeggio (effect 2) alternates the note with the instrument's second
  note frame by frame: 7 to 12 semitones up in instruments 10, 11, 13,
  18 and 19, a fixed note in 1, 2 and 4. Effect 1 alternates two waveforms the same way (instruments
  1 and 2, triangle and noise). Effect 4 holds the gate off after the
  note's first step and lowers the frequency's high byte by one every
  frame, which falls in pitch only where no arpeggio resets the
  frequency each frame (instrument 5). Vibrato waits 0 to 75 frames
  (`$C4DF`).
- **The port.** The How it works page plays the four tunes through a
  JavaScript port of `music_init`, `music_play` and `music_track_next`.
  `tests/music.js` runs it beside the driver in `kit/c64/cpu6502.js` on
  the engine's listing: every SID write of every frame, in order, and
  the driver's variables `$C4B2-$C554`, for each tune and for 200 random
  tunes, which with the four execute every instruction of
  `$C000-$C4B1`.
- In play only the effects sound; tune 1 is set up at every level start
  but played only in the demo.

## The loader

`fast_loader` (`$B3FC`) opens the level's one-letter file (table
`$B3E1`) through the KERNAL's serial routines with the ROM switched in,
sends the drive code (`$D900`, copied to `$8600`) to the 1541's `$0700`
with M-W in 32-byte blocks and starts it at `$07AB` with M-E, then reads
the file two bits at a time from CIA 2's port A (`fast_loader_get_byte`,
`$B4E1`), four reads a byte, keeping off the bad lines. The data is
stored from `$0801`, the loading screen's block counter counts down, and
the file's own unpacker at `$0812` runs. A file not found shows "TURN
DISK TO SIDE B PRESS FIRE" (`wrong_disk`, `$B5CC`). While a game's ROM
routines run, the RAM under them is still the engine's code: `$ED09`,
`$EDC7`, `$EDDD`, `$F3D5` and others are KERNAL entry points that fall
inside the engine's own routines in RAM.
