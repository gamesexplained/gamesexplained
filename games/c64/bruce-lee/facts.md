# Bruce Lee — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`
(`work/play-room1.vsf`, Bruce standing in room 0).

## Build

The disk is a crack by Remember (`orientation.md`): an intro, a text page,
the game's loading picture and two trainer questions, then a copy loop that
moves the game's start-up block to `$0400` and jumps there. The game's own
code reports itself as "REV.2" in a hidden line (`version_text`, `$4707`).
Everything below is the game as it runs after the hand-over, with the
trainers answered "no".

## Memory layout

| Thing | Where |
|---|---|
| Start-up code, run once | `$0400`-`$050E` (`game_entry`) |
| Menu, room drawing, actors, keyboard, interrupts | `$050F`-`$1A07` |
| Main loop, moves, fighting, exits, score, rooms | `$1A08`-`$4272` |
| Texts and their pointers | `$43BE`-`$4787` |
| Colour bands and raster lines per room | `$479B`-`$485A` |
| Play-screen interrupts | `$48C1`-`$49BC` |
| Menu lines, room tables, lantern lists | `$49BD`-`$4E94` |
| Work tables (step queues, touch tables, mines) | `$4EEC`-`$4FFF` |
| Shape building and the pixel terrain test | `$50DB`-`$572C` |
| Sprite frames: tables and one-bit rows | `$59A5`-`$68F8` |
| The twenty rooms' packed screens | `$68F9`-`$817F` |
| Sprite buffers | `$8180`-`$83FF` |
| Menu characters | `$8000`-`$87FF` |
| Score-band characters (a copy of the character ROM's first 512 bytes and their inverses) | `$8800`-`$8BFF` |
| Screen, sprite pointers | `$8C00`, `$8FF8` |
| Outline shapes for the terrain test, built at start-up | `$9000`-`$9FBF`, `$C000`-`$CA7F` |
| Room character sets | `$A000`, `$A800`, `$B000`, `$B800` |
| Protection block | `$CF00`-`$CFB1` |
| Micropearl Music Player and the menu tune | `$E000`-`$EAFF` |
| Sound effects, one player per voice | `$EB00`-`$F154` |
| Demo recording | from `$F300` (`demo_ptr`, `$1D`) |

Video bank 2 (`$DD00` = 1). The play screen has three parts, set by a
chain of raster interrupts through the word at `$0408` (`irq_entry`,
`$1103`): `irq_play_top` (`$48C1`, line `$FD`) switches to the score band's
character set at `$8800`; `irq_play_room` (`$491E`, line `$41`) switches to
the room's set (`$D018` from `$F2`); `irq_colour_band` (`$4982`) changes the
background and multicolours at each line of the room's list
(`room_raster_pointers`, `$4833`). Rooms 0-9 use the set at `$A000`, rooms
10-17 and 19 the set at `$A800`, room 18 the set at `$B000` (`$0A9B`).

## Timing

- `frame_work` (`$15A8`) runs once a frame, from the top interrupt: sound,
  sprites, timers, the joysticks. *live*: 300 calls in 300 frames.
- The main loop (`main_loop`, `$1BC2`) waits for `$48` to count three frames
  down. *live*: 100 passes in 300 frames.
- `step_actor` (`$1C5B`) ran 266 times in those 300 frames with only Bruce
  on screen: it is called once a pass for each actor present, and once more
  for queued steps.
- The room clock `$88` goes up every 256 frames in a room (`$1614`).
- A human Yamo who does not move for 7 x 256 frames, about 36 seconds, is
  handed to the computer (`yamo_idle`, `$173F`).
- With no stick or fire touched for 128 x 256 frames, about 11 minutes, the
  game pauses itself (`$1628`).

## Controls

- Bruce: joystick port 1 (`$DC01`) for player 1. In a two-player game,
  player 2's Bruce reads port 2 (`$DC00`). A human Yamo reads the other
  port (`$169D`, `$16CF`). *live*: Bruce walks on port 1 and does not
  move on port 2.
- Left-handed mode turns a stick a quarter turn: left becomes up, right
  becomes down, up becomes right, down becomes left (`lefthand_turn`,
  `$4A85`). It is on when `$1383` (joystick 1) or `$1384` (joystick 2) is
  0; both start at 1, right-handed.
  *live*: with `$1383` = 0, the stick pushed left reads `$0E` (up) in
  `$98`; with 1 it reads `$0B` (left).
- Moves (`choose_action`, `$1D77`): left or right walks; fire held while
  walking starts a flying kick once the walk's count `$CB,x` has fallen
  below 4, from the fifth pass of walking (`$1E70`, `$1EB1`); up
  jumps, up-left and up-right jump sideways; fire alone punches; down lies
  flat; up and down climb on a climbable surface.
- In the menu: F3 one or two players (`$092C`), F5 computer or human Yamo
  (`$0908`), F7 or fire starts (`$08FC`), L and R set joystick 1 left- or
  right-handed and SHIFT L and SHIFT R joystick 2 (`$0956`). A key's code is
  8 x row + column of the keyboard matrix (`read_key`, `$139E`).
- In play the game scans only four keys (`scan_play_keys`, `$1462`, with
  the pairs at `$1488`): F1 restarts at the menu, S turns the menu tune on
  or off, SPACE pauses, and V shows the hidden version line (`check_keys`,
  `$1B29`).

## Graphics

- Each actor is drawn from 210 frames of one-bit rows, 8 or 16 pixels
  wide (`frame_rows`, `$5D91`; heights `$5B61`, widths `$5CBF`, colours
  `$5C33`). Bruce's frames start at 0, Yamo's at `$46` and the Ninja's at
  `$8C` (`frame_offsets`, `$59A5`). Bruce and Yamo are two sprites each, the
  Ninja one. A two-sprite actor shows frame n and frame n + 1, one over
  the other, each in its own colour; the way an actor faces is a frame of
  its own, not a mirrored copy (`copy_shape`, `$26A0`). The sprites are
  drawn into two buffers that alternate (`build_sprites`, `$2584`).
- The rooms are packed screens of 440 cells, eleven rows of two lines
  (`room_screens`, `$68F9`, decoded at `$0AD5`): a byte with bit 7 set is
  followed by that many literal bytes, 0 ends; a byte without repeats the
  next byte that many times.
- The lanterns flicker: every 1-15 frames, at random, three lantern
  characters get new flame rows (`flicker_lanterns`, `$40BC`).

## Mechanics

- **Terrain by colour.** What an actor stands on, climbs or touches is found
  pixel by pixel: the outline of its frame is ANDed with the pixels of the
  characters under it, and the multicolour values it touches become its
  flags in `$B6,x` (`terrain_test`, `$5212`; `touch_flags`, `$5431`): bit 0
  colour %01, bit 1 %10, bit 3 %11 in a character whose colour RAM is
  black, bit 2 %11 in one whose colour RAM is any other colour. Bit 2 is
  the solid surface: the ground an actor stands on (`$1F7E`) and the net
  it climbs (`$1DEC`).
- **Screen cells.** Exits, lanterns and deadly cells are screen characters
  (`tile_action`, `$2E89`): 2-5 are the room's exits, `$13`, `$14` and `$31`
  are lanterns, and `$0F`, `$40`, `$54`-`$5A`, `$64` and `$71`-`$7C` kill.
- **Exits.** Each room has up to four exits, kinds 2 to 5, each with a
  destination room and an arrival position (`exit_2_room`-`exit_5_room`,
  `$4B5E`-`$4BAD`; `exit_2_x`-`exit_5_y`, `$4BFE`-`$4C9D`).
- **Lanterns.** Each room's lanterns are a list of four-byte records
  (present, character, column, row) through `item_pointers` (`$4CE2`).
  Taking all of a room's lanterns, or particular ones, makes the room's
  frame routine draw a passage open (`room_frame_table`, `$4EC4`).
- **Enemies.** Yamo (actor 1) and the Ninja (actor 2) come in after waiting
  times set per room (`$130B`-`$1380`). Eight rooms have no enemies
  (`room_no_enemies`, `$4C9E`): 3, 8, 9, 11, 13, 17, 18 and 19.
- **Enemy waits.** An enemy's waiting time comes from the room's byte
  (`$131F` + room for the Ninja, `$135B` + room for Yamo, `$30` for a human
  Yamo); it is halved once the room clock `$88` reaches `$19` and set to 3
  once it reaches `$20`, or in the second loop (`set_yamo_wait`, `$0D46`;
  `$10D0`).
- **Hits** (`apply_hits`, `$2B4E`): an enemy's strike costs 2 health, a
  punch 3, a kick 7, a landing on the head 5. Bruce's health starts each
  fall at `$24`, Yamo's at most `$14`, the Ninja's at most 7.
- **Score** (`score_points`, `$3175`): landing on an enemy 50, kick 75,
  punch 100, lantern 125, the Ninja beaten 200, Yamo beaten 450, each of
  three drops in room 13 500 (three times a player), a room entered for the
  first time 2,000 (`$0A0E`, per player), the Wizard 3,000 (`$3D04`).
- **Falls.** A game starts with 4 falls, or 9 with a human Yamo
  (`new_game`, `$0F72`). Room 16 has a bonus fall (`bonus_fall`, `$2FD6`).
- **The extra-fall test compares the score byte by byte.** The first extra
  fall is due at 40,000 and then every 30,000 (`$438B`, `$438E`), but
  `add_score` (`$312C`) gives it only when each of the score's three bytes
  is at least the matching byte of the threshold: *simulated* with the
  game's own routine, 39,900 + 100 = 40,000 and 40,150 + 125 = 40,275 earn
  the fall, while 40,100 + 100 = 40,200 (`$9D08`, low byte below `$40`)
  and 65,400 + 200 = 65,600 do not.
- **Idle Yamo.** A human Yamo idle for 7 x 256 frames is taken over by the
  computer, and both players lose five falls (`yamo_idle`, `$173F`).
- **The treasure room and the second loop.** Room 19 shows text 4 while a
  `$458`-frame timer runs, then sets `$40`, resets the rooms and sends
  Bruce back to room 0 (`room_19`, `$4272`).

## Data tables

- Room tables (`$4AA8`-`$4E94`): colour records, screen pointers, exits and
  arrival positions, Bruce's start, the enemies' entrances, rooms with no
  enemies, lantern counts and lists.
- Per-room routines: set-up (`room_setup_table`, `$4E9C`) and frame
  (`room_frame_table`, `$4EC4`).
- Action delays (`action_delays`, `$4A8C`).

## Sound

- The menu tune is played by the Micropearl Music Player ("COPYRIGHT 1983
  JOHN A. FITZPATRICK", `$E315`), from the menu's interrupt (`$152C` calls
  `music_frame`, `$E006`). The song list (`$E870`) holds song 0 and then
  `$FF`, so the tune loops. Song 1's entry in `song_table` (`$E8C0`) points
  into the sound-effect code, so it is not a tune.
- Sound effects: fifteen scripts (`sfx_scripts`, `$EBE5`), played by three
  copies of one player, one per SID voice (`$EB03`, `$EF73`, `$F073`);
  `play_sound` (`$2509`) puts a new effect in a free voice or the one
  playing the effect of lowest priority.

## Protection

- `check_cf8f` (`$512F`, at start-up) hangs unless `$CF8F` and `$CFAF` are
  both `$B9`; `$06DD` needs six bytes of the protection block to XOR to zero.
- `protect_fill` (`$1703`, every frame) fills memory unless `$02` holds
  `$32`, which the loader leaves there.
- A slow fuse in the jump sound (`jump_sound`, `$1FC4`): while `$1166` or
  `$2007` is zero, each jump moves the operands of the checks on, and after
  enough jumps a `TXS` is written into `random` or over a `CLC`, which
  wrecks the stack. In this copy neither is zero.
- `update_top_score` (`$3184`) compares three pairs of ranges of the
  protection block.

## The listing's error rate

Sample 2611: 60 of the listing's 782 comments, drawn at random with seed
2611 (`kit/scripts/sample.py`), checked by an agent on `claude-opus-5-5`
that wrote none of them. 16 of the 60 were wrong, 26.7 % (95 % interval
17.1 % to 39.0 %, Wilson): one wrong outright (`$0080`, a count that goes
up every 256 frames, described as frames counted while paused) and fifteen
wrong in a detail. The details were of five kinds: a role described too
narrowly (`$0006`, `$004B`, `$00B6`, `$136F`), the wrong routine named
(`$0763`, `$1F89`), a comparison read the wrong way round (`$29C3`, a hit
needs the target at least so far in front, and `$1E70`, the flying kick
comes from the fifth pass of walking), a byte or record misplaced
(`$26EE`, `$4752`, `$A433`, `$E130`, `$E871`), and an effect overstated
(`$3C90`, `$3CC0`). All 16 were corrected, with the other comments that
said the same things. Separately, the keys read in play were found to be
F1, S, SPACE and V rather than RUN/STOP and the function keys, and their
comments were corrected too. The sample is well over the mark, so a full
audit is recommended.

## Live tests

- Timing (`frame_work`, `main_loop`, `step_actor`): non-stopping
  checkpoints on `$15A8`, `$1BC2`, `$48C1` and `$1C5B`, 300 frames from
  `play-room1.vsf`, the top interrupt as the control: 300, 100, 300 and 266
  hits.
- Left-handed mode: `$1383` poked to 0 and to 1, joystick port 1 held left
  for six frames, `$98` read: `$0E` and `$0B`.
- Port: random input on port 2 never moved Bruce; on port 1 he walked,
  jumped and kicked (the code-map recording, `work/`).
- Extra fall: `add_score` (`$312C`) run in the kit's simulator from
  `play-room1.vsf` with the threshold set to 40,000, seven score and point
  pairs, falls before and after compared.
