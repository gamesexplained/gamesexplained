# Spindizzy — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

Electric Dreams' 1986 PAL disk (`orientation.md`): five files, the boot
file `SPINDIZZY`, the fast loader `SPIN1`, a loading-screen file `SPIN2`,
the program and graphics `SPIN3` ($6000-$CFFF) and the world `SPIN4`
(loaded at $1400, 14,593 bytes). The title reads "(c) Electric Dreams
1986" and "by Paul Shirley." (`title_text`, $8759). No version string.

## Memory layout

| Thing | Where |
|---|---|
| Shared structures, 127 records | $0400-$099B (`structure_01` on), copied from SPIN4 |
| Room directory, 386 records | $0A00-$3C26 (`room_63_64` on), copied from SPIN4 |
| Start-up and the cheat check | $6000-$6097 (`start_game_image`) |
| `$EA` filler in SPIN3, never run | $60A0-$6FFF |
| Title, interrupt, credits, help, map, burst | $7000-$74AE (jump table at $7000) |
| Leftovers of an earlier build | $750D-$77FF, $7B00-$7B3F |
| Spare shape sets (two of Gerald's three shapes) | $7800-$7AFF |
| Panel labels, the font, the logo map | $7B40-$7FFF |
| CBM80 header, then the text and menu module | $8000-$88E1 (jump table at $8010) |
| Physics, rooms, switches, main loop | $8900-$94FA (jump table at $8900) |
| Room renderer, BCD arithmetic, time | $9500-$9CBC (jump table at $9500) |
| Pieces, sprites, lifts, inhabitants | $9D00-$A89D (jump table at $9D00) |
| Tile lists of the block types and switches | $A900-$AA7F |
| Tile buffer: 25 rows of 16 places, 8 bytes each | $AA80-$B6FF (run time) |
| Room grid: 8 by 8 columns of 8 levels | $B700-$B8FF (run time) |
| Tile masks, tile pictures | $B900-$BFFF |
| Switch symbol pieces, the jewel's sprite | $C000-$C1AF |
| Jewels collected, one bit each | $C1C0-$C1DF (run time) |
| Piece table, sprite slots, work cells | $C200-$C37F (run time) |
| Colour matrix, sprite pointers | $C400-$C7FF (video bank 3) |
| Gerald's shape set in use | $C800-$C97F |
| The panel's large digits | $CA00-$CB3F |
| Sprite shapes built at run time | $CC00-$CFFF (pointers $30-$3F) |
| Bitmap | $E000-$FFFF, under the KERNAL |

Zero page: $44/$45 the map row and column of the room; Gerald's X
$46/$47, Y $48/$49 and height $4A/$4B, each with the cell or level (0-7)
in the high byte; speeds X $57:$56:$58 and Y $5A:$59:$5B (24-bit, the last
byte a fraction) and vertical $5C/$5D; the last safe position $4C-$53;
JEWELS $38/$39, TO MAP $3A/$3B, the time $5E/$5F and the room total
$72/$73, all BCD; the view turn $28; the two switches on $36/$37; the
surface bits $24 (7 standing on something solid, 6 on a lift, 5 bounced
on a trampoline); the colour mask $61; the speed option $76 and the
joystick option $77.

## Timing

- The main loop (`main_loop`, $8DA1) waits at the top of each pass for
  CIA 2's timer A, a one-shot it restarts at once ($8DC6), so a pass
  takes at least the timer's count: 16,000 cycles at the slow speed, 1
  cycle at the fast (`new_game`, $84D1, at $854D). *Live*: 1,838 passes in 1,504
  frames at the slow speed (1.22 a frame); 2,339 passes in 1,003 frames
  at the fast (2.33 a frame).
- The clock counts passes, not frames: $64 is counted down by $63 each
  pass and the time loses 1 on each borrow, so 1 every 64 passes, or
  every 256 in a room whose flags have bit 4 set (`room_header`, $8B57).
  *Live*: 29 ticks in 1,839 passes in an ordinary room (one per 63
  passes, about 1.0 seconds at the slow speed) and 7 in 1,838 in the
  start room (one per 263, about 4.3 seconds). At the fast speed the
  clock runs faster too: 37 ticks in 1,003 frames.
- With a lift or an inhabitant in the room ($31), the pieces are run
  and the sprites redrawn on every other pass only; Gerald's movement
  runs every pass.
- The raster interrupt (`raster_irq`, $7066) runs once a frame on line
  256; it plays the jingle and the voice-3 sounds and copies the
  sprites when the main loop has new ones ($78).

## Controls

- Joystick in port 2 (or port 1: with one joystick both ports are ANDed,
  `read_joystick`, $8028). While Gerald touches a surface, each
  direction adds 1 to his speed along that axis each pass, 2 with fire
  held ($8DD4).
- Two joysticks (option F3): up and down come from port 1, left and
  right from port 2; fire from either.
- Keys in play ($8EA0): Q back to the title; C colour or monochrome
  (flips $61 between $0F and 0, so every room takes scheme 0); I
  Gerald's shape; P pause; M map; S score; space brakes (only while
  standing, zeroes the X and Y speeds and costs 1 of the time each
  time it is read); F1, F3, F5, F7 turn the view to the start, a
  quarter, three quarters, a half (`view_keys`, $8F22). Space and the F
  keys are ignored for the rest of a pass in which Gerald changed room.
- Title keys (`title_screen`, $8669): fire or space starts, S scores, O
  options (F1 speed, F3 joysticks, F7 back), H help, RUN/STOP the credits
  and hints screen (`credits_screen`, $70F0), which the title does not
  mention.
- RESTORE, alone or with RUN/STOP, brings back the title at any time:
  the start-up writes a CBM80 header at $8000 whose warm-start vector is
  $7000, and the KERNAL's NMI routine jumps through it. *Live*.

## Graphics

- Multicolour bitmap in video bank 3, the bitmap at $E000 and the colour
  matrix at $C400. The room picture is 16 places (32 cells) wide from
  column 8 (`draw_picture`, $9A0D, from $6F/$70 = $E040); the panel is
  columns 0-7 (`draw_hud`, $8151).
- A room is drawn from its grid in three steps: `build_picture` ($9A98)
  walks the 512 cells and queues each one's tile list (`block_tiles`,
  $A900) into the tile buffer at the place it projects to, keeping up to
  four tiles per place with their depth (`add_tile`, $9907); then
  `draw_picture` composes each place from its tiles, each ANDed with its
  class's mask (`tile_masks`, $B900) and ORed with its picture
  (`tile_pictures`, $BA00), and copies it to the bitmap.
- Projection: one row down and one place right per step in X, one row
  down and one place left per step in Y, one row up per level
  (`build_picture`; `project_piece`, $A347).
- Gerald, jewels, lifts and inhabitants are sprites built at run time in
  $CC00-$CFFF. Each is masked by the scenery in front of it
  (`build_sprite_mask`, $9D18), so blocks nearer the viewer hide it, and
  the slots are sorted by depth each pass (`sort_sprites`, $A2F2).
- Gerald and each inhabitant are two sprites, a multicolour one and a
  hires one, from a 384-byte set of four 48-byte frames each
  (`draw_object`, $A535). Three sets exist: the one in use at $C800 and
  two spares at $7800 and $7980. I rotates the three (`change_shape`,
  $7223), and inhabitants are drawn from the spares, kind 0 from $7800
  and kind 1 from $7980, so they change shape when Gerald does. *Live*
  in room (65, 66).
- The view can be turned in quarter turns: the room grid is rebuilt with
  every block's position and slope direction turned (`decode_block`,
  $95D4; `turn_view`, $8CFF).

## Mechanics

- The world is 386 rooms (`count_rooms`, $92BC, counts the directory at
  each new game), on map rows 41-78 and columns 49-87. Rooms join at
  their edges: leaving a room's 8 by 8 cells moves the map row or column
  by one, turned for the view (`cross_room_edge`, $8A22); a place with no
  record is drawn as an empty room ($8B3F).
- A first visit marks the room, takes 1 from TO MAP and adds 8 to the
  time (`mark_room_visited`, $8BB8). A jewel adds 10 and 1 to JEWELS
  (`jewel_piece`, $A12C). The time never goes above 150
  (`add_time_capped`, $9C8E). A new game starts the time at 100
  (`new_game`, $84D1), so it shows 108 after the start room's bonus.
- Time is lost through one routine, `add_to_time` ($9533), always as a
  BCD complement: 1 per clock tick, 5 for each restart at the safe point
  (`restart_at_safe_point`, $89E7), 1 per brake (`brake`, $8F0A), 2 each
  time the pieces run while an inhabitant shares Gerald's cell and level
  (`inhabitant_piece`, $A622), which in a room with an inhabitant is
  every other pass ($8E2A). When the time goes below zero, $6C ends
  the game: "Mission Aborted", then the score (`game_end`, $856D).
  *Live*.
- Gravity takes 8 from the vertical speed each pass (`apply_gravity`,
  $8951); friction takes a 64th of each horizontal speed each pass while
  Gerald touches a surface (`apply_friction`, $898D).
- Landing with a vertical speed below -108 bursts Gerald
  (`check_hard_landing`, $89CF); so does a piece of type 2. A burst plays
  the animation (`burst_animation`, $7360) and restarts him at the last
  place he stood on something solid, which the main loop saves every pass
  he stands ($8E7E). Falling 16 levels below a room's floor restarts him
  the same way (`apply_velocity`, $8920).
- The surface under Gerald (`surface_response`, $8F46): 1 floor; 2
  deadly; 3 trampoline, which reverses a fall; slopes in steps of 4 from
  type 4 to $1F (gentle, steep, outer and inner corners, steep corners,
  ridges and valleys), which turn his horizontal speed into vertical
  speed so he rides up and down them; switches.
- Water and ice are blocks placed with fill mode 2 (`place_block`,
  $960F), which the help screen names: type 0 so placed is water ($20 in
  the grid) and type 3 is ice ($63). `find_floor_at` ($9B57) counts
  water as nothing, so Gerald falls through it and, 16 levels down, is
  restarted. Ice stops his fall but leaves bit 7 of $24 clear, so the
  main loop neither steers him nor applies friction: he slides on in a
  straight line, and if he comes to a stop on it (not on a lift) he is
  restarted, since he could never move again (`on_ice`, $9116). *Live*:
  in room (68, 54) Gerald pushed onto ice kept a speed of 4 for over a
  second, where the floor beside it slowed him from 6 to 4 in 0.45
  seconds; set down on ice at rest, he was restarted at once; in room
  (70, 59), whose whole floor is water, he fell through it.
- Walls: a step that would put Gerald inside a piece is undone and the
  speed along that axis reversed and halved (`wall_collisions`, $9311;
  `bounce_speed`, $9421). `bounce_speed` then calls `noise_sound` with
  half the high byte of the new speed, which is 0 at any speed Gerald
  reaches, below the 7 that `noise_sound` needs to play: walls are
  silent. *Live*: 18 bounces in the start room started no noise.
- Switches: pads numbered 0-11 in the world data. Pad 0 turns both
  switches off; pads 1-7 leave only themselves on; pads 8-11 take one of
  the two slots in turn, so two can be on together (`press_switch`,
  $916A). The panel's box shows the symbols of the two on
  (`draw_switch_box`, $91FA). No lift or switched block uses switch 6,
  though two pads carry it (counted from the world data).
- Lifts (64 in the world): each on a switch or, for 20 of them, on none,
  moving 8 each time the pieces run (every other pass, $8E2A) between
  two levels, with an optional pause of 64 or 128 runs at each end; they carry Gerald when he is in their cell
  (`lift_piece`, $A37F).
- Inhabitants (14): kind 0 (8 of them) keep to the floor of their level;
  kind 1 (6) cross gaps. They steer towards Gerald, 4 at a time
  (`inhabitant_piece`, $A622, `steer_speed`, $A818). Each has a top speed
  of its own, 16 to 64, which holds its speed in the positive direction
  of X or Y. In the negative direction `steer_speed` compares with CMP
  and BMI, so the speed keeps growing until it falls below -128 plus the
  top speed and only then snaps back to minus the top speed: an
  inhabitant with a top speed of 16 runs out to -112. Only the three with
  a top speed of 64 are held both ways.
- Switched blocks (70): a structure placed while its switch is on; when
  the switch changes, the room is rebuilt (`switched_block_piece`,
  $A0FF; `pieces_done`, $A0F4). A room whose switched block is off shows
  that switch's symbol in its bottom left corner as a clue
  (`add_switched_block`, $A052; `build_picture`).
- Jewels: 220 in 198 rooms, numbered 0-219; the collected ones are
  remembered in a 256-bit set at $C1C0 so they stay gone when a room is
  rebuilt. The map shows a visited room that still holds a jewel in the
  jewel colour (bit 7 of the record's column byte, `end_pieces`, $9EA6).
- Survey complete: TO MAP at 0 and JEWELS at 220 (`check_all_jewels`,
  $8BED) shows the score and asks "explore more" (`survey_complete`,
  $85DB); Y sets the time to 150 and play goes on, N ends the game.
  *Live* (with TO MAP and JEWELS poked).
- The beginners' area: the start room (64, 64) and the seven rooms
  (64, 65), (64, 66), (64, 67), (63, 66), (63, 67), (65, 66) and (65, 67)
  have bit 4 of their flags set, so the clock there runs at a quarter of
  its speed.
- The score screen (`score_screen`, $83B0): screens = 100 * rooms
  visited / 386, jewels = 100 * JEWELS / 220, game = their average,
  rounded down (`bcd_percent`, $9BEE).

## Hidden cheat

`check_cheat_password` ($6076), once, at the game's first start: if the
seven bytes of RAM at $DF00-$DF06 (under the I/O chips) hold "I LIED!"
(`cheat_password`, $6098), it writes RTS over `add_to_time`'s JMP, and
the time never goes down again. Time is still gained, through
`add_time_capped`. Nothing in the game writes $DF00: the bytes must be
put there before the game starts, with a cartridge or a monitor. The
credits screen's hints say "there is no cheat mode". *Live*: with the
password written into the RAM at $DF00 before $6000 ran, $9533 read $60
and the time stayed at 108 for 20 seconds; without it, the time went
from 107 to 103.

## Data tables

- Room record (`room_directory`, $0A00): its length; the map row (bit 7
  visited); the map column (bit 7 a jewel left in a visited room); a
  flags byte (low nibble the colour scheme, bit 4 the slow clock); the
  floor's block word; block words to $0000; moving pieces, three bytes
  each, to a 0. Records run 9-86 bytes.
- Block word: the first byte holds the type (bits 0-4), the fill mode
  (bits 5-6) and the top bit of the position; the second, the rest of the
  position, X, Y and level packed (`decode_block`, $95D4). Type 2 is a
  reference: the next byte names a structure (`place_structure`,
  $96E3).
- Structure (`structure_list`, $0400): a number, a length, block words
  to $0000. Structures $20 and $40 have two records each; only the first
  of each is ever found. Structures $3B and $4F are named by no room,
  structure or switched block, so they are never placed; four more
  ($3F, $51, $7C, $82) appear only as switched blocks.
- Moving piece: a type byte (1 a jewel; low 3 bits 2 a lift, 3 an
  inhabitant, 4-7 a switched block; bits 3-6 the switch or kind), the
  position (X bits 2-4, Y bits 5-7, level bits 0-1 with bit 7 of the
  type), and a third byte (`build_pieces`, $9E85).
- Colour schemes: 16 pairs in `room_colours_6A` ($8B98) and
  `room_colours_6B` ($8BA8).

## Text

The game's own font at $7C00 is laid out in ASCII order with the cases
swapped (`font`). Text in `print_text`'s format ($81BD) is plain bytes:

| Codes | Meaning |
|---|---|
| $00-$07 | the frame's corners and edges (`draw_frame`, $80E2) |
| $16-$24 | the logo's pieces (`draw_logo`, $8611) |
| $20-$3F | space, punctuation and digits, as in ASCII |
| $41-$5A | small letters a-z |
| $61-$7A | capitals A-Z |
| $0C | control: clear the window |
| $0D | control: new line |
| $0E n | control: colour matrix colour n * 16 |
| $0F n | control: colour RAM colour n |
| $1A l r t b | control: set the window |
| $1F c r | control: move the cursor |
| $FF | end |

## Hardware registers

From the register census (`kit/cpu/census.py`):

| Register | What the game does with it | Where |
|---|---|---|
| $D000-$D010, $D015, $D01C, $D027-$D02E | sprite positions, enable, multicolour and colours from the shadow registers | `apply_sprites`, $A2BE |
| $D011, $D012, $D019, $D01A | raster interrupt on line 256 | `init_and_title`, `raster_irq` |
| $D016, $D018, $DD00, $DD02 | bitmap, multicolour, bank 3 | `start_game_image`, `bitmap_mode` |
| $D017, $D01B, $D01D | expansion and priority off | `start_game_image` |
| $D020, $D021 | border flashes, colour schemes | `raster_irq`, `redraw_screen`, `pause_loop` |
| $D025, $D026 | sprite multicolours 4 and 7 | `init_and_title` |
| $D400-$D406 | voice 1: the jingle | `raster_irq` |
| $D407-$D40D | voice 2: switch beeps, the inhabitant buzz | `press_switch`, `inhabitant_piece` |
| $D40F, $D412-$D414 | voice 3: trampoline bounces, landings, bursts, lift ticks, its pitch flipped every frame | `raster_irq`, `noise_sound`, `lift_piece` |
| $D418 | volume 15, no filter | `start_game_image` |
| $DC00, $DC01 | joysticks | `read_joystick` |
| $DC0E | CIA 1's timer stopped | `init_and_title` |
| $DD04-$DD05, $DD0D, $DD0E | the speed limiter; $DD04 also read as a random border colour | `new_game`, `main_loop`, `inhabitant_piece` |
| $DF00 | RAM under I/O read for the cheat password | `check_cheat_password` |

The sprite collision registers, the filter, the pulse widths and CIA 1's
other registers are named by no instruction: collisions are worked out
from positions.

## Sound

No music. Voice 1 plays the jingle when a jewel is taken: 80 frames of a
triangle whose pitch steps through eight values, one a frame,
(`jingle_pitches`, $721B). Voice 2 beeps at a switch's own pitch
(`switch_pitches`, $8912) and buzzes in noise when an inhabitant touches
Gerald. Voice 3 carries a sawtooth for a trampoline bounce and a lift's
tick and a noise burst for a hard landing or a burst (`noise_sound`,
$88BE), and every frame `raster_irq` moves its pitch between two
values, which gives each of them a buzz.

## The listing's error rate

Sample 1, seed 20261031: 80 comments drawn from 821, in two strata: 60
from the 303 written by hand and 20 from the 518 a script wrote for the
world's structures and rooms (`work/scripts/world_ann.py`). A checker on
claude-opus-5-5, which wrote none of them, checked each against the
code; its verdicts were then read against the code here. 18 of the 80
were wrong (22.5 %, 95 % interval 14.7 % to 32.8 %): 14 of the 60 written
by hand and 4 of the 20 generated, 21.2 % weighted by the strata's sizes.
The checker found 17; the 18th, `on_ice` ($9116), which called ice
water, was found by a live test while the sample was being checked. What
was wrong: frame sizes given as draw_frame's parameters, one cell short
each way (`draw_frame`, `draw_hud`, `title_screen`); a thud called louder
where only its decay grows (`landing_sound`); where `cross_room_edge`
puts Gerald and what its height test compares; `enter_room` said to draw
an empty room through `end_pieces`; the pointer `room_header` leaves; the
range of `tile_classes`; the exception in `turn_block_type`; a second
caller of `apply_sprites`; when `jewel_piece` runs the survey check, and
its mask shift; where `inhabitant_piece` looks ahead, and a top speed
that holds only one way; two leftover blocks given formats they do not
have; and the generated structure comments, which counted block words as
rooms and left out switched blocks. All 18 were corrected, with the
comments that said the same: `draw_frame`, `map_screen`, `apply_sprites`,
`check_all_jewels`, `steer_speed`, `room_colours_6B`, every structure
comment (rewritten by template), and three the checker found outside the
sample (`raster_irq`'s border, `unpack_piece`'s fields and `fill_floor`). The rate is what one checker found, so a lower
bound; an audit of every comment is recommended. Building the pages'
widgets on the game's own code corrected one more: `steer_speed` said a
carry picks the direction, where the routine tests the sign the caller's
PLP restores.

## Live tests

- The cheat: written "I LIED!" into the RAM at $DF00 at the hand-over;
  $9533 became $60 and the time stayed at 108 for 20 seconds, against a
  control run that lost 4 (`work/scripts/live1.py`).
- The clock: counted raster interrupts, passes and ticks with
  non-stopping checkpoints for 30 seconds in the start room and in room
  (63, 64), and 20 seconds at the fast speed (`live2.py`, `live3.py`).
- RESTORE alone and RUN/STOP with RESTORE in play: the title came back;
  Q in play: the title (`live3b.py`, `live3c.py`).
- Inhabitants and I: in room (65, 66) both inhabitants changed shape
  with each press, and the time fell from 99 to 27 in under two seconds
  while they touched Gerald (`live4.py inhab`).
- A jewel: Gerald dropped onto jewel 1 in the start room; JEWELS went to
  001, bit 1 of $C1C0 was set and the time went from 105 to 109 (5 for
  the restart, 10 for the jewel, 1 tick) (`live4.py jewel`).
- An inhabitant's speed: in room (55, 73), with a top speed of 24, its
  X speed went 0, -20, -44, -64 in 0.6 seconds as it chased Gerald
  towards lower X (`live7.py`); in room (58, 85), with a top speed of
  16 and a short chase, it stayed within 16.
- Walls: Gerald driven at the start room's walls with fire held for 14
  seconds; checkpoints counted 18 calls of `bounce_speed`, 46 of
  `noise_sound` and none of its gate (`live10.py`).
- Water and ice: Gerald set down and pushed in rooms (70, 59), (68, 54)
  and (64, 64), his speed, height and `$24` read every 0.15 seconds
  (`live5.py`, `grid.py`).
- Survey complete with TO MAP 1 and JEWELS 220 poked, and the time
  poked to 1: the screens in `work/shots/live-survey.png` and
  `live-timeout-*.png` (`live4.py`).
