# The engine — verified technical facts

The program that stays in memory from the first load of `GAME` to the
last: start-up, the display, Clyde, the objects, the status panel, the
Get Ready and loading screens, the fast loader, the sound effects and the
music driver. Every address here is the engine's; a level's tables are
named by their place in a level file and belong to the level parts.
Unless marked *live*, a fact comes from the code in `work/entry.vsf`
(stopped at `$1000`). Live tests are listed in the game's own `facts.md`.

## Start-up

- `start` (`$1000`) installs the raster chain (`init_hardware`), banks the
  ROMs out (`$01` = `$35`), sets the KERNAL's NMI vector so that RESTORE
  ends at an RTI, points the VIC at bank 1 (`vic_bank_1`: screen `$4400`,
  characters `$5800`) and jumps to `game_restart` (`$14A9`), which sets
  the stage number `$12A2` to `$FF` and falls into `stage_next`: stage 0,
  the file `1@`, then stage 1, level 1.1.
- `stage_next` (`$14AF`) adds one to the stage number, silences the
  sound, fills the stack page with `$FF`, clears zero page and enters the
  loading screen (`loading_screen`, `$F7CB`), whatever the stage.
- `game_new` (`$1865`), entered from the attract sequence when fire
  starts a game, chooses Droopy, sets the stage to 1, clears the score,
  the potions and the weapons bought, gives Clyde 4 lives and runs on into
  `level_begin` (`$18A6`), which every later level also runs, from the
  shop: it clears the scroll position, counts the level in
  `route_progress`, clears the items-taken flags and the timer, and copies
  the level's five hook addresses into the engine's calls.

## The level's interface

A level file is read at fixed addresses (parts `level-1-1` and the
others name each table): tiles from `$8009`, the character colours at
`$8609`, the six map rows from `$8715`, the length at `$8B95`, the first
passable character at `$8B96`, the band colours and routines from
`$8B97`, the section tables from `$8C23`, the strings from `$8C7D`, the
time limit at `$8CE5`, the hooks at `$8CE8`, the tune addresses at
`$8D56`, the objects' script tables from `$8D5A` to `$8EEE`, the end
creature's slot at `$8F0C` and the spawn records from `$9000`. The five
hooks are calls the engine makes into the level's own code: every frame
(`level_frame_call`, `$1CB8`), for Clyde's movement (`level_player_call`,
`$2C31`), and, while the level's special state `$122B` is set, in place
of the jump, the animation and the fire button (`level_jump_call`,
`level_anim_call`, `level_hook_call`). Swimming in world 2 and the
broomstick in world 3 are made this way.

## Interrupts and the frame

- In play the IRQ is a chain of raster routines (`irq_entry`, `$10F2`):
  each returns the next interrupt's line in A and the next routine in X
  and Y. The lines: `raster_top` at 0, `raster_vsp_prepare` at `$2F`,
  `raster_vsp` at `$30`, the bands at `$51`, `$71`, `$91`, `$B1` and
  `$D1`, `raster_panel_low` at `$E3` and `raster_bottom` at `$F1`.
- The playfield scrolls sideways without copying the screen. The fine
  scroll is `$D016`; for the coarse scroll `raster_vsp_prepare` sets the
  next interrupt and runs a NOP slide so that `raster_vsp` starts on a
  known cycle, then enters the slide at `$1808` plus half the column
  `$0F`, one cycle more for an odd column, before writing `$D011`: the
  delay decides how many characters late the VIC starts fetching the
  screen (VSP). Every 40 columns the screen shown flips between `$4400`
  and `$4800` (`scroll_draw_column`).
- `raster_bottom` (`$F1`) draws Clyde's sprites (`sprites_player`), saves
  the objects' positions, and handles the pause: RUN/STOP with the
  joystick centred pauses, any movement resumes. `raster_open_border`
  keeps the borders open, so the status panel's sprites show below the
  playfield.
- The main loop (`game_frame`, `$1AFA`) waits for the frame flag the
  chain raises, then runs the coarse scroll, Clyde (or the weapons
  tablet), the objects' movement, animation and colours, the sound
  effects (`game_frame`), the music, the end tune, the collisions, the
  spawning and the timer (`game_frame_music`, `$1BD2`), and the pause's
  quit key, the stage-complete countdown and the lost life
  (`game_frame_end`, `$1C66`). `frame_divider` (`$1CE1`) steps four flags
  as the bits of a counter, so a routine can run every second, fourth or
  eighth frame.

## The playfield

- The map is six rows of tile numbers, one byte a column (`$8715` up,
  addresses at `$8709`); a tile is four rows of four characters, 16
  bytes. `scroll_column`
  (`$26ED`) moves a column on every fourth coarse step and draws the
  tiles a character column at a time, each character with its colour
  from the level's table at `$8609` (`scroll_draw_column`, `$2754`).
- A map column whose top byte has bit 7 set is a command, not scenery:
  bit 6 set brings the next six sky colours (`level_colours_next`,
  `$269D`), clear the next four band routines (`level_band_routines`,
  `$26BE`).
- The scroll position `$1273` is the map column at the right edge. Clyde
  walking into the right edge (his limit `$2E5B`) scrolls the landscape
  one pixel a frame instead of moving him; the landscape never scrolls
  back.
- The screen is split into six horizontal bands, each with its own three
  colours (`$12BD-$12CE`, a band keeping the colour above it when bit 7
  is set) and its own sprite routine.

## Objects

- Fifteen object slots, three bands of five, each band shown on hardware
  sprites 3-7 (`sprites_band1-3`, `$C00D`, `$C061`, `$C0B0`); sprite 0 is
  Clyde and 1 and 2 his shots. The objects' tables are at `$C000-$C00C`
  and `$C0FF-$C45E`, either side of the bands' code.
- Objects come from the level's spawn records, 17 bytes each, read as the
  landscape scrolls: byte 16 is the scrolled distance to the next
  (`object_spawn`, `$1FC6`, which names every byte). A record gives the
  slot, the x and y movement scripts, the type (its animation script and
  speed), the colour or colour cycle, the position, what a hit does, the
  hit points, a wake delay, the score, the death type and death colours,
  and a linked group.
- Movement scripts are one byte a frame per axis: 0 holds still, `$01-$0F`
  move right or down, `$80-$BF` left or up, `$40-$7F` and `$C0-$FD` loop
  back, `$10` restarts, `$FE` stops and `$FF` plays a sound effect
  (`move_objects`, `$C45F`). Animation scripts list sprite frames, with 0
  to restart, 1 to remove the object and `$40-$7F` to loop
  (`animate_objects`, `$C764`, even slots one frame and odd the next).
  Colour cycles step the same way (`object_colours`, `$C826`).
- A shot's damage is the weapon's strength, or 1 after a full charge;
  hit points of `$FF` mean a hit only makes the object flash
  (`shot_hit_object`, `$3E5B`). A survivor can count hits towards a
  threshold that sets off one of its responses: a new movement, a new
  type, an animation that runs only when hit.
- A killed object takes its death type, death colours and death
  movements, and scores (`object_kill`, `$13D0`). Killing one of a linked
  group kills the rest of the group (`object_kill_linked`, `$3E26`).
- Objects of type `$37` show the blank sprite, are skipped by every
  collision test, and die only with their linked group, turning into
  their death type: this is how the levels hide potion creatures and
  extra lives (`object_collisions`, `$12D6`). Levels 1.1, 1.2, 2.2, 3.1
  and 3.2 have 21 such records between them, ten of them potion
  creatures and nine extra lives; level 2.1 has none.
- A wake delay of `$FE` keeps an object asleep until the scroll reaches
  the level's end (`scroll_column`); the end creatures wait this way.
  Killing the level's end creature (slot `$8F0C`) within three columns of
  the end starts the stage-complete countdown, 60 frames
  (`object_kill`).

## Clyde

- Left and right move him a pixel a frame unless a character below the
  level's first passable one (`$8B96`) is in the way; up jumps through
  the 29 steps of `jump_steps` (`$2AF6`); he falls when nothing solid is
  below his feet and lands on the height of his row (`player_control`,
  `$2BE0`).
- Fire held starts a charge (`$1236`, up to 36 frames, his colour
  cycling once it is full); released, a full charge with no shot in the
  air breathes the flame for 24 frames on both shot sprites, otherwise a
  shot leaves in the direction he faces, at most two at a time
  (`player_fire`, `$31CA`; `flame_draw`, `$2F75`).
- A weapon is two path scripts, x and y, a byte a frame, mirrored for a
  shot fired to the left; weapons 6 and 7 ignore theirs. Its grade sets
  the shot's colour and strength (`weapon_setup`, `$3102`; `shot_path`,
  `$3046`).
- Down with fire, on the ground, opens the weapons tablet: the scroll
  stops, left and right with fire held turn the three icons through the
  weapons bought (`owned_weapons`, `$2592`), and releasing fire picks the
  one in the middle (`weapons_tablet`, `$1E0E`).
- Touching an object (`player_hit_object`, `$3C59`) is told apart by the
  sprite frame it shows: frames `$B6-$BB` are the Magic Potion Creatures
  (1 to their kind's count, 5 when the sprite is double height); frame
  `$4E`, Clyde's face, is an extra life with a spell of invulnerability;
  in world 1 frames `$88-$8A` and `$CD` carry Clyde and `$E5-$E9` are
  harmless; worlds 2 and 3 hand some frames to the level's code (the
  bubbles, the broomstick). Anything else hurts him (`player_hurt`,
  `$3CDD`).
- The spare hit: `stage_start` (`$1902`), which runs after every Get
  Ready screen, sets `$12A0` to 1 and the countdown `$12A1` to `$27`.
  While the spare hit is set, a touch knocks Clyde instead of killing him:
  `player_dead` skips the death leap and calls `player_dying_wait` each
  frame, which destroys the attacker for the first frames and after 40
  frames uses the spare hit up and starts 127 frames of invulnerability
  (`invulnerable_start`, `$CEEB`, Clyde flashing light red and black).
  The next touch kills. In water (`$1271` cleared by the level's code)
  `player_hurt` skips the invulnerability and `player_dead` the spare
  hit. *Live*: on level 1.1 the first touch took `$12A0` to 0 and left the
  lives at 4, the second cost a life.
- Death: Clyde leaps and falls (`player_dead`, `$ACB6`), a speech bubble
  says "GULP!" in water, otherwise "EEEK!" or "OUCH!" by the frame
  counter (`death_bubble`, `$AD6B`), the death tune plays, and when the
  wait `$1288` runs out `game_frame_end` takes a life and restarts at the
  section the scroll had reached (`level_section_from_scroll`, `$1D7A`).
- Lives (`$B7BF`): 4 at a new game, one more at each new stage
  (`loader_hand_over`, `$BE36`) and for each extra life, one fewer at
  each death; taking one at 0 ends the game (`game_end`, `$1CBE`).

## The timer and the panel

- The stage timer counts down once a second, every 50 frames
  (`timer_tick`, `$B71E`; *live*: 40 counts in 2,000 frames). At 15
  seconds left the hurry-up tune starts, switching the music on if it was
  off. At 0 Clyde dies whatever: the spare hit is cleared and
  `player_hurt` runs past the invulnerability.
- The status panel is sprites in the lower border: lives, potions, score,
  the weapon's icon, the timer and, in world 2, the oxygen bar, each drawn
  into sprite data (`lives_draw`, `potions_draw`, `score_draw`,
  `timer_draw`, `weapon_icon_draw`). The score is four decimal digits,
  one to a byte (`score_digits`, `$B7E4`).
- Clyde's face on the panel (sprite block `$4E`, which is also the lives
  icon and the front-facing Clyde) animates at random intervals, and every
  60 of its animations another part of the picture changes, up to three
  times, with sound effect 1 (`panel_anim`, `$2A14`; `panel_anim_stage`).

## Screens between stages

- The Get Ready screen (`get_ready`, `$3663`) shows GET READY, the
  stage's name and lines, the three potion creatures to collect and a
  miniature of the landscape that scrolls to where Clyde restarts. Left
  and right turn the music off and on; fire fades it out and starts the
  level (`get_ready_loop`, `$3809`).
- The loading screen (`loading_screen`, `$F7CB`; `loading_setup`,
  `$F889`) draws a map of the route and paints in the levels reached
  (`route_progress`, `load_route_colour`), with "LOADING" and the stage,
  or "GAME OVER" when the lives have run out, and a progress bar the fast
  loader advances.

## The loader

`kernal_open_file` (`$14D3`) opens the stage's two-letter file on drive 8
through the KERNAL and reads one byte; a missing file asks for side B
(`insert_side_prompt`). `fast_loader` (`$BD00`, run at `$4800`) uploads
256 bytes of drive code with eight M-W commands, starts it with M-E at
`$07AB` and receives the file two bits at a time through `$DD00`.
`loader_hand_over` (`$BDF3`) then swaps the blocks the stage needs into
place and starts it (the game's `facts.md`, "How the parts connect").
The drive code itself was not followed.

## Protection

- `timing_check` (`$CF4C`) runs from the Get Ready screen's and the
  title's interrupts: CIA 2's timer B must read `$B340-$B34F` between two
  frames, or `memory_wipe` (`$AF6A`) clears memory upward without end.
- Every level and chamber file puts `memory_wipe` in the KERNAL's
  cartridge vectors at `$8000` with the signature CBM80, so a reset while
  one is loaded erases the game. *Live*: a VICE reset from chamber 1
  stopped at `$AF6A`.

## Sound

- The music driver (`music_update`, `$0335`; `music_frame`, `$0873`)
  plays three voices of two-byte commands, with portamento, vibrato,
  arpeggio, pulse sweeps and a filter sweep, through 25 shadow registers
  copied to the SID each frame. `music_play` (`$0804`) starts the tune
  whose header it is given.
- The engine's own tunes: the Get Ready screen's (`$B97F`), a lost
  life's (`$BC2B`) and the hurry-up tune (`$AE80`).
- Sound effects: 29, each with a channel and a priority; a request takes
  its channel when its priority is at least the one playing
  (`sfx_request`, `$1054`). With the music on, the effects keep to two
  voices (`sound_set_music_mode`, `$18EC`).

## High scores

`hiscore_check` (`$FABD`) compares the score digit by digit with each of
the eight entries (`hiscore_scores`, `$FB1E`) and makes room for it;
name entry is the attract block's (part `attract`). Nothing saves the
table.
