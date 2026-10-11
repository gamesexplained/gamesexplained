# Skate or Die!: Downhill Jam — facts

The Downhill Jam program (side 2). Its main file `$28` loads to `$0880`,
and the program starts at `$0880`. The event manager's load stub at `$0800`
loads it, from row 4 of the manager's load tables. The Jam is a two-skater
race down an alley. In practice the second skater is LESTER, the computer.

"Traced" means read from the code. "Simulated" means seen when the
program ran from its snapshots (`work/entry.vsf`, `work/play.vsf`) in the
kit's 6502 machine (`kit/c64/machine.js`). The scripts are in
`GAME/work/agent-jam/` (`sim.js`, `sim2.js`, `inp_ud.js`, `sound.py`,
`phr.py`).

## Loads and memory

- `$0880` holds `JSR jam_load_files` (`$2140`). That routine loads files
  `$29`-`$30` from `load_table_files` `$353B` (low bytes `$3543`, all 0;
  high bytes `$354B`). It then writes three NOPs over `$0880`-`$0882`
  (`$2174`). A PRACTICE AGAIN restart (`JMP $0880`) therefore skips the
  disk and falls into `jam_init` `$1FEA`. (traced)

| File | Lands at | What |
|---|---|---|
| `$28` | `$0880`-`$400C` | code, tables and variables. `$33F1`-`$3458`, `$34F5`-`$353A` and `$3D96`-`$3FFF` are stale bytes that the code never reads |
| `$29` | `$8200`-`$A9D7` | course character map, 40 x 255 |
| `$2A` | `$5A00`-`$81D7` | course attribute map: low nibble the colour (bit 3 = multicolour cell), high nibble the terrain type |
| `$2B` | `$4800`-`$4FFF` | the playfield's 256 characters |
| `$2C` | `$AA00`, moved to `$BA1A`-`$DFFE` | the skaters' pose shapes and pose records, under the I/O area |
| `$2D` | `$4000` | a 2 KB font. Only `$4000`-`$43FF` survives; `$4400` is screen buffer A |
| `$2E` | `$E000`-`$EC69` | the sound driver and the effect scripts |
| `$2F` | `$5700`-`$5940` | nine sprites, blocks `$5C`-`$64` |
| `$30` | `$AA00`-`$B3A1` | the music: phrase table, voice scripts, phrase picker code, note streams |

- `move_shape_file` `$2189` copies 38 pages downwards with `$01 = $24`,
  from `$A9E5`-`$CFE4` to `$B9FF`-`$DFFE`. File `$2C`'s last byte (`$CFE5`)
  is never copied, so `$DFFF` keeps whatever was there. No pose record
  reaches that far: the shapes end at `$D933`. (traced)
- VIC bank 1 (`$DD00` bits = `%10`, `jam_init`). Two screens are used,
  `$4400` and `$5000`, with sprite pointers at `$47F8` and `$53F8`. The
  sprite shape buffers at `$5400`-`$56FF` (blocks `$50`-`$5B`) are built
  every frame. (traced)
- Not read: `$0400`-`$07FF` (the event manager's screen), `$081C`-`$087F`,
  `$5941`-`$59FF`, `$81D8`-`$81FF` and `$A9D8`-`$A9FF` (left by High Jump),
  `$B3A2`-`$BA19` (left by the move), and `$EC6A`-`$EFFF` (the shop's
  bytes). (traced)

## How it plays

- **Start.** The status rows show a name and PRESS YOUR BUTTON for the
  next player to press (`wait_button_handler` `$31D4`). Whoever presses fire first
  becomes player 0, the left status block. That player's port is stored
  in `$3D50` and the other port in `$3D51` (`press_button_handler`
  `$325B`). Both then pick REGULAR or GOOFY: each new direction flips the
  choice (`$1434`). Fire confirms it (`$14BA`). When both have confirmed,
  the race starts with a hop at speed 1, and both clocks start
  (`start_race_check` `$14F0`). (traced)
- **Controls** (`dispatch_controls` `$2DC7`, handler rows from `$364D`).
  The handler index is the stick's low nibble x 2, plus `$16` with fire,
  plus `$36` for GOOFY. (traced)

  | Input | Effect |
  |---|---|
  | down | push: +1 speed every 8 frames, up to 8 (`$2F09`) |
  | up | brake (`$306C`) |
  | left / right | lean, which turns the board (`$2E51`, `$2E91`, `turn_one_step` `$1D41`) |
  | fire+up | jump, with spin from fire+left or fire+right while in the air (`$2F23`) |
  | fire+down | duck, only while held (`$3092`) |
  | fire+left, fire+right and the four fire diagonals | twelve attacks, chosen by stick and facing (`$30E3`-`$313D`) |

  GOOFY swaps up with down and left with right, but only for inputs
  without fire: the fire rows are the REGULAR ones. (traced)
- **Attacks.** An attack starts only when the heading points straight
  down or straight up the hill (`attack_handler` `$315C`). It costs one
  step of speed (`$314C`). It hits on its third frame of five
  (`anim_hit_frame` `$3947`), and only when the skaters are within 16
  pixels both across and down (`fight_check` `$0BCF`). Attacks 3, 6, 9
  and `$0C` are high: a ducking skater is missed. Attacks 1, 4, 7 and `$0A`
  are low: a skater in the air is missed (`hit_blocked` `$0D98`). A hit
  knocks the victim down for a 200-frame fall, during which it cannot be
  hit again. The attacker gets 5 points (`$0C6F`). When both skaters are
  in a hitting frame together, `hit_outcome` `$3BC9` decides the result:
  both shoved, one falls, or both fall (`resolve_double_attack` `$0CCC`).
  A shove gives the other skater 2 points (`$0D5E`). (traced)
- **Body contact without attacks** (`bump_check` `$0DD6`, kinds from
  `collision_check` `$24C9`). The contact is one of four kinds:
  - Head-on (`$0E26`): the skater with the lower score of reach plus
    screen row falls, and the other gets 5 points. If both are in the air,
    both duck, or their scores are equal, both fall.
  - Side by side: the skaters swap speeds and headings (`$0EE9`).
  - From behind: also a swap (`$0EE1`).
  - Crossing paths: both fall (`$0EBE`).

  (traced)
- **Objects** (`smash_object_cell` `$17AA`, `behaviour_roll_over`
  `$1C87`). A can is worth 2 points, a bottle 1, the bins 3, and the
  two-character object `$6F`/`$8F` 7. Attacking an object scores it, and
  so does riding over a can or a bottle. `end_event` puts every object
  back up (`restore_course_objects` `$1651`). (traced)
- **Police car** (rows 248-252, `behaviour_rough` `$1AAE` from y `$0700`).
  Hitting it below height 8 is a crash. At height 8 or more the skater
  lands on its roof and `$0D` is added to the pending points. In decimal
  mode that is 13 when nothing else is pending. The siren (sound 9)
  plays. (traced)
- **Time bonus.** Each player starts with 9996 (`$20CB`). Every 6 frames
  it loses 6, and the race clock gains a tenth of a second
  (`update_race_clocks` `$23F8`). That makes 1666 tenths, so the bonus
  runs out at 2:46.6 on the race clock. After that, nothing scores:
  `add_points` `$0AD2` throws points away when the bonus is empty. At the
  finish, what is left of the bonus is added to the score
  (`state6_handler` `$1569`). (traced)
- **Clock.** The clock counts a tenth every 6 frames, which is right at
  60 Hz. On a 50 Hz (PAL) machine a clock second is 1.2 real seconds. The
  clock stops at 9:59.9 (`$2465`). (traced)
- **Left behind.** When the gap between the skaters reaches 120 pixels,
  the one behind is put into state 8 (`camera_follow` `$28D4`). It slides
  back into play and pays a penalty (`add_penalty` `$2476`): 5 seconds on
  its clock and 300 off its time bonus. (traced)
- **Terrain** (`behaviour_table` `$3873`, by the attribute map's high
  nibble). The handlers react to the skater's centre cell only;
  `behaviour_table_right` `$3893` is sixteen RTSs.

  | Type | Handler |
  |---|---|
  | 0, 5, 14 | none |
  | 1 | walls: a fall or a bounce |
  | 2, 4 | crash into a solid object |
  | 3, 7 | falls |
  | 6 | roll over a can or bottle |
  | 8 | hazards: `$AB` jolts the heading, `$97` throws the skater down |
  | 9 | the striped ramps, which raise the ground 2 per two pixels |
  | 10 | kerb, ground +7 |
  | 11 | the clotheslines in the yard (duck or fall), and the finish when the camera row is `$E0` or more |
  | 12 | the moving object's lanes |
  | 13 | a shadow |
  | 15 | rough ground, slowing; at the bottom, the police car |

  (traced)
- **End.** A skater reaching the finish goes to state 6. When both are
  in state 6 and all points have been counted, `end_event` `$15F8` stores
  player 0's score `$3C94`/`$3C92`/`$3C90` in `$FE03`-`$FE05` and player
  1's `$3C95`/`$3C93`/`$3C91` in `$FE0C`-`$FE0E`. Each is six BCD digits,
  low byte first. It then jumps to `$FE06`. RUN/STOP sets `$FE12 = $FF`
  and leaves through `$FE06` (`check_keys` `$1532`). (traced)
- **The score** is the sum of points (attacks, shoves, bumps, objects,
  the police car) and the time bonus left at the finish. (traced)
- **LESTER** (`lester_ai` `$32BA`). LESTER steers by 11 waypoints of row,
  column and heading (`lester_waypoints` `$3BED`). It holds its speed
  against player 0's position (`$3397`). When player 0 is within 16 pixels
  and not down, it attacks with fire+right (`$33BD`). It presses its
  button for itself at the control choice (`$1453`). (traced)
- **Music on/off.** The Commodore key flips `$FE10` (0 = music on, `$FF` =
  off). Effects keep playing (`check_keys` `$1549`, band 1 `$2386`).
  (traced)

## Graphics

- **Screen.** A raster interrupt in four bands (`band_lines` `$3563`):
  - Band 0, at raster line `$F6`, sets up the status rows: hires text,
    `$D018 = $40` (screen `$5000`, font `$4000`). It also does the frame's
    work.
  - Band 1, at `$45`, switches on multicolour and ECM together, an
    invalid mode that shows black and blanks the lines between status and
    playfield. It selects `$D018 = $12` or `$42` (screen `$4400` or
    `$5000`, characters `$4800`).
  - Band 2, at `$4D`, sets the background `$0B` and the multicolours
    `$0C`/`$00`, and turns ECM off.
  - Band 3, at `$64`, copies the map to the back buffer and colour RAM.

  (traced)
- **Course.** 255 rows x 40. The character map at `$8200` and the
  attribute map at `$5A00` both use `row*40 + column`. A cell's colour
  is the attribute's low nibble. With bit 3 set the cell is multicolour,
  with colours `$0B`, `$0C`, `$00` and the cell's colour 0-7.
  `copy_map_chars` `$25FF` and `copy_map_colours` `$2742` copy 22 rows
  from text row 3. (traced)
- **Animated characters.** Every 8 frames `animate_charset` `$0BA6`
  swaps characters `$40`-`$42` with `$80`-`$82` and `$60`-`$62` with
  `$A0`-`$A2`. The moving object (character `$52`) is drawn into the map
  at rows 49-52 from column 26 and rows 73-76 from column 30
  (`$0AF7`). The police car's lights are colour RAM `$DA9D`/`$DAED` (rows
  16 and 18, column 29), flashed while the camera is at the bottom
  (`$29AC`). (traced)
- **Skaters.** Three sprites each: body, legs, board. Player 0 uses
  sprites 5-7 and player 1 uses 2-4, swapped so that the skater further
  down is in front (`set_sprite_order` `$1004`).
  - Colours: body yellow / light green (`$38C5`), legs red / light red
    (`$38C9`), board from the manager's skater byte `$FE02`/`$FE0B`
    (`$38C7`).
  - Shapes are trimmed multicolour sprites under the I/O area. A pose
    record is 6 bytes: a word offset from `$BA1A`, the byte count − 1, an
    X offset, a Y offset, and a sixth byte that is never read.
    `unpack_shape` `$135C` copies the bytes, with `$01 = $24`, into
    double-buffered blocks `$50`-`$5B`.
  - Riding poses are records 0-127 at `$D940`. Standing and fall poses
    are records 128-287 at `$DC40`.
  - Animations 1-`$16` (twelve attacks, falls, start, wall falls) are
    tabled at `$38EB`-`$3AE9`.

  (traced)
- **Other sprites** (file `$2F`):
  - `$5C`: the clothesline shadow.
  - `$5D`: a solid block for the type-13 shadow.
  - `$5E`-`$60`: the small sparkle over a can or bottle.
  - `$61`-`$64`: the tumbling bins.

  Sprites 0 and 1 are the shadows (`$2BE9`). (traced)
- **Status rows.** Font at `$4000`, characters 0-127. Names are in
  yellow / light green (`$3602`). PRESS YOUR BUTTON blinks white / light
  blue (`$3604`). The `*nn*` points popup blinks yellow / red (`$3606`).
  Strings are ASCII capitals turned into screen codes by `print_string`
  `$2244`. (traced)

## Sound

- The driver is High Jump's, moved: code from `$22B7` to `$E000`
  (`+$BD49`), variables from `$221B` to `$3459` (`+$123E`). (traced)
  - `init_sound_driver` `$E000`
  - `queue_sound_id` `$E03E`
  - `update_sid_voices` `$E075`, one tick per frame from band 1
    (`$239B`)
- Requests go through `request_sound` `$093F`, which keeps the
  highest-priority request of the frame. `deliver_pending_sound` `$0917`
  passes it to the driver. Tables: script lo `$E74A` and hi `$E761`,
  priorities `$E778`, 23 IDs. (traced)
- IDs and their uses:

  | ID | Use |
  |---|---|
  | 0 | bottle |
  | 1 | can |
  | 2 | music voice B |
  | 3 | hazard throw |
  | 4 | fall on types 3 and 7 |
  | 5 | rough ground |
  | 6 | the moving object |
  | 9 | police siren |
  | `$0A` | wall bounce |
  | `$0B` | brushing past |
  | `$0C` | hard crash |
  | `$0D` | crash into an object |
  | `$0E` | shove |
  | `$0F` | knocked down |
  | `$10` | the `$6F` object |
  | `$11` | in-air crash and clothesline |
  | `$13` | wall crash |
  | `$14` | landing |
  | `$15` | music voice A |
  | `$16` | bins |

  IDs 7, 8 and `$12` are a lone end byte (`$E78F`) that nothing requests.
  (traced)
- **Music** (file `$30`). Sound `$15` (`$AA72`) and sound 2 (`$AA98`)
  play the two voices, both at priority 9.
  - The phrase table at `$AA00` holds 16 phrases, each a pair of note
    stream pointers.
  - After each phrase, op `$0A` calls `pick_phrase_a` `$AAAA` or
    `pick_phrase_b` `$AAC3`.
  - `choose_next_phrase` `$AADC` draws a successor at random from
    `phrase_successors` `$B311` (9-byte rows), never going straight back
    to the phrase before.
  - Phrase 0 is only the opening.
  - The two voices of a phrase are equally long: 288, 576 or 864 ticks.
  - The random generator is `$AB11`, with its own state at `$AB3E`-`$AB40`.

  (traced)

## Oddities

- **Impossible joystick combinations** select `null_row` `$3821`.
  - The row is only 16 bytes long. Its state-8 and state-9 entries are
    therefore the first bytes of `print_row_lo`: jumps to `$2800` and
    `$7850`.
  - The player on port 1 shares keyboard row 7, because `check_keys`
    leaves `$DC00 = $7F`. Keys 1+← or CTRL+2 produce up+down or
    left+right.
  - (traced) (simulated: up+down held on port 1 at PRESS YOUR BUTTON ran
    into a BRK at `$82A9`)
- **The port-1 player can also steer** with 1, ←, CTRL, 2 and SPACE, for
  the same reason. (traced)
- **`bump_check` `$0DD6` uses X without setting it.** The 30-frame bump
  timer lands on whichever player the routines before it left in X.
  (traced) (simulated: X = `$FF`, a write to `$3E53`)
- **Attack `$0C`** (fire+up-left while facing right) never lands: its
  hitting frame is `$63` (`$3953`). (traced)
- **The police-car bonus** adds `$0D` in decimal mode (`$1B3A`). It is 13
  only when the pending points end in 0. (traced)
- **The siren's stop flag** `$E9A6` is set to `$FE` and tested for 1, and
  nothing ever writes 1. The siren's early endings `$E986`-`$E9A5` are
  dead. (traced)
- **Unused code and data:**
  - `stop_sound`, `pause_sound_slot` and `resume_sound_slot` in the driver
    have no callers.
  - The handlers `$30A1`, `$30AD`, `$30BF` and `$30D1` are in no handler
    row.
  - `$333D` is unreachable.
  - `unused_kernal_setlfs` `$2180` and `unused_height_offset` `$287E`.
  - `unused_3639`: 20 bytes that nothing reads.
  - `landing_check` `$3023` compares the facing and the speed, but both
    branches go to the same place.
  - `$3C7A` is written and never read.
  - `$3C3C`-`$3C3E` (saved VIC registers) are never read back.

  (traced)
- **Unshown credits:** "DAVID BUNCH" `$356B`, "STEVE LANDRUM" `$3579` and
  "BUTTON" `$3587` have no references. (traced)
- **`sideways_share`** `$3618` has `$0A` at `$10` where the pattern gives
  `$10`. The Downhill Race's `speed_split` has the same value. (traced)
- **The NMI vector** `$FFFA` points at `$0A3A`, in the middle of an
  instruction in `score_counter`. RESTORE would crash the game. (traced)
- **PRACTICE AGAIN** keeps the REGULAR/GOOFY choices: `$088D` skips
  clearing `$3D94`/`$3D95` when `$FE11` is set. (traced)
