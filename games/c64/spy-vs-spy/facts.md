# Spy vs Spy — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

First Star Software's North American disk, 1984: the image's directory is
`"spy vs spy" m4`, eight files (`orientation.md`). No version string is
stored. The program carries leftovers of its own making, which show how it
was built:

- **The assembler's symbol table.** `$BEC4`-`$BFEF` holds 28 entries of a
  symbol table, each a length byte (`$80` + length), the name and an
  address. They name the computer player's fighting and steering code:
  `ASWNGINT` `$A27B`, `AUTOSWNG` `$A29E`, `HOMECMBT` `$A2B6`, `UNHOMCMB`
  `$A30F` (moving away from the other spy) with `UNHOMIQ2` `$A323` and
  `UNHOMIQ1` `$A32A`, which are the IQ 2 and IQ 1 branches of that routine,
  and `MOVEHOME` `$A38D` (steering to the target). A second fragment at
  `$254D`-`$2561` (`ERASH` `$90C1`, `DGT0` `$90CB`, `DGT1`) has addresses
  from an earlier build. The routine at `$BFF0` overwrites the table's last
  entries: it was put into spare room at the end of the file later.
- **Stale code.** `$2DAC`-`$2DFF` is an old copy of `trail_step`
  (`$8AAC` onwards), saved with the file after the level tables.
- **A recording switch.** `$6603` (0 on the disk) is copied into the
  options screen's `lda #$00` at `$9FFF`, whose value becomes `demo_mode`
  `$CFF7`. At 1 every game would record both joysticks into the demo
  tables (`$67B0`), the way the attract demo's moves were presumably made.
- **A debug trace.** The computer player writes step numbers 2-$0E into
  `$D024` (`computer_player` `$9A67` and on), a colour register that
  multicolour bitmap mode does not show, and random numbers into two bitmap
  bytes of the white spy's monitor frame, `$4020` (`$A549`) and `$4030`
  (`$9CB1`).

## Memory layout

`$01` = `$35` in play (BASIC and KERNAL out, I/O in); video bank 1.

| Thing | Where |
|---|---|
| Zero page variables (per spy, X = 0 white, 1 black) | `$02`-`$FC` |
| Game variables | `$0200`-`$02C3` |
| Pre-shift tables (built) | `$0400`-`$05FF`, `$F200`-`$F5FF`, `$FC00`-`$FDFF` (`build_tables` `$8CAC`) |
| Room object maps, one per monitor (built) | `$0600`-`$07FF` |
| Tables, shapes, text, sound, level layouts (file `S6`) | `$0900`-`$2DFF` |
| Backdrop copies of the two room pictures (built) | `$2E00`-`$3FFF` |
| Play screen bitmap (file `S2`, rooms drawn into it) | `$4000`-`$5F3F` |
| Screen matrix (built by `draw_screen_colours` `$85F7`) | `$6000`-`$63E7` |
| Sprites `$90`-`$97` (built) | `$6400`-`$65FF` |
| Program (file `S4`) | `$6600`-`$AB75` |
| Spy shapes and tables (file `S4`) | `$AB76`-`$BFEF` |
| Late fix | `$BFF0`-`$BFF6` |
| Attract demo's recorded moves (file `S5`) | `$C000`-`$CFF4` |
| Demo counters | `$CFF5`-`$CFFF` |
| Room records, 41 bytes each (built per game) | `$E000`-`$E5C3` |
| Mirror, shape-facing, mask and line tables (built) | `$E800`-`$EEFF` |
| Trails, visited lists, route search, computer's task stack | `$EF00`-`$F1FF` |
| Airport picture, packed (file `S3`) | `$F700`-`$FBC3` |
| The 6510's vectors: NMI `$8FA5`, reset `$8F98`, IRQ `$8FA6` | `$FFFA`-`$FFFF` |

Code `$6600`-`$AB75` and `$BFF0`: 17,784 bytes; data 24,493 bytes tracked
(`coverage.py`, 100 % explained). The recorded code map (`codemap.json`)
found 16,555 bytes executed in play, every one inside a code block; what
did not run is untaken branches and start-up code that ran before the
record was cleared.

## Timing

- **NTSC only.** `wait_ntsc_sync` (`$8E38`) waits for eleven raster
  interrupts in a row with interrupts off, giving up after 1,536 polls of
  `$D019` (about 18,400 cycles). An NTSC frame (17,095 cycles) fits, a PAL
  frame (19,656) does not, so on PAL the routine restarts for ever. *Live*:
  a PAL boot hangs there; an NTSC boot plays. The game never reads the
  KERNAL's PAL flag `$02A6`.
- Two raster interrupts per frame, at lines `$32` and `$96`
  (`raster_lines` `$1C5C`); `irq_half` `$35` says which half is being
  drawn. *Live*: a recorded frame showed the background colour written at
  lines 51 and 151 (`frame.py capture`).
- **The clocks.** `tick_clock` (`$9362`) counts each spy's clock down
  once a frame, in BCD: `$8F` hundredths from 99 to 0, `$91` seconds,
  `$93` minutes (white; `$90`, `$92`, `$94` black). A clock second is
  100 frames, 1.67 s on a 60 Hz machine, so level 1's "7 minutes" last
  11 min 40 s of real time. *Live*: in 600 frames with no penalty a clock
  lost 6 seconds; `tick_clock` ran 1,200 times and the interrupt 1,200
  times.
- The main loop serves one spy per pass (`next_spy` `$674E`), alternating;
  *live*: 342 passes in 600 frames. A pass with nothing drawn waits about
  9,000 cycles (`end_of_turn` `$70FC`).
- Time penalties go into `$95,x` and are paid one second every ten frames
  with a beep (effect `$11`).

## Controls

- Joystick port 2 drives the white spy, port 1 the black (`read_controls`
  `$94A1`, into `$0285`/`$0286`). Control byte: bits 0-3 up, down, left,
  right (0 = pressed), bit 4 fire.
- F5 restarts at the options screen; RUN/STOP pauses, stopping both clocks,
  until it is pressed again; S toggles the music (`music_off` `$0263`).
  *Live*: S flipped `$0263` 0 → 1 → 0; RUN/STOP set `$025D`/`$025E` to 0
  and back to 1.
- Fire pressed twice with nothing in reach opens the trapulator (`$81,x`
  counts the presses, `$68E7`); the stick moves its arrow, fire chooses.
- In a shared room, fire with a change of stick direction swings the club
  (`spy_move` `$6BEA`, `club_in_reach` `$6CF1`).
- Options screen: up and down choose the line, left and right change the
  value, fire starts (`options_loop` `$A00B`).

## Graphics

- Multicolour bitmap at `$4000`, screen matrix `$6000` (`setup_video`
  `$8548`). The bitmap file `S2` holds the monitors, trapulators and
  panels; the game draws the two room views (nine character rows of 200
  bytes each) into it.
- A room is drawn into a backdrop copy (`draw_room` `$8199`): the walls and
  floor unpacked from a run-length stream (`unpack_rows` `$8476`: a zero
  byte is followed by a count of zeros), then each door and piece of
  furniture as an object shape (`draw_shape` `$7C7E`, 52 shapes at
  `$09B3`-`$0AEA`). The backdrop is copied to the screen, and the spies are
  drawn over it.
- The spies are not sprites: they are drawn into the bitmap from 65 shape
  strips (`$AB76`, `$B9E8`/`$BA2A`) through 69 frame headers (`$B710`/
  `$B755`), shifted to any pixel by pre-shift tables and masked so the room
  shows through (`draw_strip_line` `$794C`). Shapes face one way and are
  mirrored in place when a spy turns (`mirror_shape` `$865B`); every new
  game turns them back (`new_game` `$6627`, `$BAF0`). Erasing a spy copies
  the backdrop back over its old box (`restore_box` `$7A03`).
- Perspective: a point across the room appears at column `$39` plus or
  minus a value that shrinks with depth (26 tables of 25 bytes,
  `$1E41`-`$20CA`).
- Sprites are used for the trapulator arrow (`place_arrow` `$9142`), the
  small object in a spy's hand (`place_spy_sprite` `$90A4`), and the
  aeroplane at the airport (`place_plane_sprites` `$91BC`, seven sprites).
- When the spies share a room, the monitor of the spy who arrived goes off:
  its picture is wiped in widening steps and its background turns red
  (`monitor_off` `$7D6A`).
- Text uses a five-line font one character cell wide (`$1A2E`), screen
  codes with two of the game's own: `"` draws a colon and `&` the letter F.

## Mechanics

### The embassy

- Eight levels (`option_max` `$16FF`), each a fixed layout of rooms with
  six door links each, left, right, back, front and the two openings
  between floors (`$29BC`-`$2DAB`, `$BCE1`-`$BEC3`): 6, 13, 20, 33, 35,
  36, 34 and 36 rooms (`level_rooms` `$BC91`). What is random each game
  (`build_embassy` `$7EF8`): the exit room, one of four per level
  (`exit_choices` `$BCC1`); each room's colour (`room_colours` `$BBF8`);
  where each door sits on its wall; the furniture, up to one piece per wall
  from that wall's types, with a remedy in some types (`furniture_contents`
  `$0900`); and where the five items go.
- The five items, briefcase, passport, money, key and plans, each go into a
  random empty piece of furniture, one item per room, with the level's
  chance (`item_chance` `$BCA9`: 8 in 32 on level 1, falling to 2). *Live*:
  at the start of a level 1 game the items were in rooms 0, 1, 3, 4 and 5,
  the exit in room 2.
- Remedies are placed by furniture type: the fire bucket in types 2 and 4
  (left wall), the wire cutters in 6 and 8 (right wall), the scissors in
  `$0B` and the umbrella in `$0E` (back wall). No item goes into a piece
  holding a remedy.
- Rooms are records of 41 bytes at `$E000` (`room_rec_lo`/`hi` `$BC18`/
  `$BC3C`); the layout is documented at `rec_furn_count` `$BBAB`.
- With "hide airport till end" set (the default, shown as Y), the exit door
  is a wall (`$FF`) until a briefcase holds all four items; then
  `check_full_briefcase` (`$7494`) writes the exit room's number into the
  door slot.

### Searching, traps and remedies

- A spy within reach of an object flashes its room white and hears effect 6
  (`search_target` `$70B7`, `flash_room` `$906C`). Fire searches it
  (`look_ahead` `$7111`, `search_furniture` `$7310`, `search_door`
  `$725A`).
- Trap objects: 4 bomb and 5 spring (hidden in furniture), 6 water bucket
  and 8 gun with string (set on a door), 7 the gun before its string is
  tied (`button_objects` `$14C2`; `tie_string` `$97F5`). The time bomb is no
  object: choosing it lights a 200-pass fuse in the spy's room
  (`trapulator` `$98E6`, `$0228`/`$022A`).
- A trap's remedy is the trap number less 4 for furniture (bomb → fire
  bucket 0, spring → wire cutters 1) and 2 or 3 for doors (bucket →
  umbrella, gun → scissors).
- **Trap limit.** A spy is refused a trap once its count `$85,x` exceeds
  twice the level's rooms less one (`$9949`): 11 traps on level 1. The
  options screen shows twice the room count, 12 (`options_loop` `$A0DD`).
  *Live*: with the count poked to 10 the trapulator handed over the bomb;
  with 11 it refused. Time bombs are not counted, but are refused too once
  the count is past the limit.

### Scoring

`score_event` (`$8937`), causes and their tables (`$1D23`, `$1D2B`,
`$1D33`):

| Cause | Event | Points | Time |
|---|---|---|---|
| 0 | win a fight | +80 | |
| 1 | set a trap | +30 | −10 s |
| 2 | take the other spy's item | +60 | |
| 3 | use a remedy | +40 | −10 s |
| 4 | caught by a trap or the airport guard | −80 | −20 s |
| 5 | lose a fight | −20 | −10 s |
| 6 | look at the map | −70 | −15 s |
| 7 | take a club hit | | −3 s |

The points match the manual. *Live*: choosing the map took 70 off the
white spy's score (BCD `$80` → `$10`) and queued 15 seconds. The score is
four BCD digits (`$02BB`/`$02BD`), held at 9999 and shown as 0 below zero.
At the airport the winner gets 7 points per second left (`final_score`
`$89AE`), and the rank is the thousands digit: 0-999 A KNEE HIGH SPY up to
9000 and more GRAND MASTER SPY (`airport_scene` `$8722`, strings 20-29).
*Live*: the computer's spy escaped with 2045 and was ranked AVERAGE GUY SPY.

### Fights and deaths

- Ten club hits (`$020E,x`) knock a spy out (`spy_walk` `$6B3D`: causes 5
  and 0). A knocked-out or trapped spy lies stunned for `$90` passes
  (`$0246`), then gets up in room 0 (room 1 if the other spy is there)
  (`spy_state_checks` `$6822`).
- A spy whose clock runs out shows OUT OF TIME..ITS ALL OVER and plays no
  further (`spy_falling` `$6959`, `$0261`); the game ends when both have
  finished (`main_loop` `$66DC`).

### The computer player

`computer_player` (`$9A67`) plays the black spy in a one-player game by
writing a joystick byte. It keeps a stack of tasks, chooses goals from what
each spy holds and how many items the briefcase has (`cpu_choose_goal`
`$A847`), and plans routes through the embassy with a breadth-first search
over the rooms (`route_search` `$A9EF`, `route_to_waypoints` `$AB03`). It
reads the item tables `$0210`/`$0215` and the trap bytes in the room
records directly: it knows where every item and trap is. The IQ setting
decides how far ahead it checks its route for traps (`cpu_check_route`
`$9D01`, IQ − 1 waypoints, skipped three times in four below IQ 3), how
often it thinks of fleeing a fight (`cpu_flee` `$A30F`) and how fast it
swings (`iq_swing_rate` `$1B1E`). The attract demo does not use it: both
demo spies replay recorded moves (`$C000`-`$CFF4`).

### The attract demo

Left alone, the options screen gives way to a demo (`options_loop`
`$A00B`) at level 5, two spies, IQ 2, airport shown (`options_done`
`$A123`), with the random numbers seeded with a constant (`seed_random`
`$8DD6`) so the embassy matches the recording. Fire or F5 ends it. *Live*:
the demo started with level 4 (level 5), two players, IQ 2, hide flag 1.

### The airport

At the exit door with the full briefcase (`door_or_ladder` `$6F40`) the
spy escapes (`escape_to_airport` `$86BB`): both clocks stop, the winner's
monitor shows the airport picture (`$F700`), the spy walks to the plane by
itself and the plane takes off to a rising engine note on voice 1
(`plane_takeoff` `$885D`). *Live*: seen at the end of a level 1 game.

## Data tables

The tables are labelled and described in the listing; the main ones:
level layouts and map lists (`$BC61`-`$BCB9`), room record offsets
(`$BBAB`-`$BBF2`), furniture types (`$0914`, `$0936`), object shapes
(`$09B3`-`$0AB7`), spy frames (`$B710`), animation sequences (`$B602`),
scoring (`$1D23`), text (`$170D`), sound effects (`$20CB`), music
(`$23DA`-`$241A`).

## Sound

- **Effects** on voice 1 (`play_sfx` `$9226`): 19 eight-byte records
  (`$2127`), each the voice's seven registers and a timing byte, with a
  priority (`$20F3`): a lower-priority effect is dropped, an equal or
  higher one cuts off the one playing.
- **Music** on voices 2 and 3 (`play_music` `$954E`), on the lower half's
  interrupt: three bytes per note (pitch and octave, length, instrument),
  16 instruments of eight bytes (`$240A`), slides and vibrato, the two tunes
  looping (`$245A`, `$24D2`). Credited to Nick Scarim.
- The filter is never used (`$D417` = 0); the volume fades at take-off.

### Hardware register census

Every absolute access in the code (`work/scripts/census.py` over the code
blocks). The music driver reaches voices 2 and 3 through pointers
(`$2402`/`$2404`), so they do not appear by address.

| Register | Use | Routines |
|---|---|---|
| `$D000`-`$D010` | sprite positions | `reset_play_state`, `place_spy_sprite`, `place_arrow`, `place_plane_sprites` |
| `$D011` | bitmap mode on, raster bit 8, frame sync | `setup_video`, `setup_vectors` |
| `$D012` | raster line; read once to seed the random numbers | `setup_vectors`, `irq_handler`, `seed_random` |
| `$D015` | sprite enable | `reset_play_state`, `irq_handler`, `place_*` |
| `$D016` | multicolour; scroll bit 0 shakes the screen | `setup_video`, `shake_screen` |
| `$D017`, `$D01B`, `$D01C`, `$D01D` | no expansion, sprites in front, multicolour | `reset_play_state` |
| `$D018` | screen `$6000`, bitmap `$4000` | `setup_video` |
| `$D019`, `$D01A` | raster interrupt acknowledge and enable | `irq_handler`, `setup_vectors`, `wait_ntsc_sync` |
| `$D020` | border blue; bumped by the PAL hang loop | `setup_video`, `wait_ntsc_sync` |
| `$D021` | background per half, white flash | `irq_handler`, `flash_room` |
| `$D024` | the computer player's debug trace, invisible | `computer_player` and its helpers |
| `$D025`, `$D026`, `$D027`-`$D02B` | sprite colours | `reset_play_state`, `airport_scene`, `place_*` |
| `$D400`-`$D406` | voice 1: effects, the plane's engine | `play_sfx`, `plane_takeoff` |
| `$D415`-`$D418` | filter off, volume (fade) | `reset_play_state`, `silence`, `plane_takeoff` |
| `$D800`-`$DBFF` | colour RAM | `draw_screen_colours`, `options_screen` |
| `$DC00`, `$DC01` | joysticks and keyboard rows | `read_controls` |
| `$DC0E` | CIA 1 timer A stopped | `setup_vectors` |
| `$DD00`, `$DD02` | video bank 1 | `setup_video` |

Never touched: the sprite collision registers `$D01E`/`$D01F` (the game
works out who is where itself) and the CIA timers beyond stopping one.

## Live tests

Run on VICE v3.13.2 (NTSC), 9 October 2026, scripts in `work/scripts/`.

- PAL hang and NTSC boot (`orientation.md`).
- Clock rate: 600 frames from `start.vsf`, checkpoints on `irq_handler`,
  `tick_clock` and `next_spy` (1,200, 1,200, 342 hits); a clock lost 6
  seconds (`t1.py`).
- Item and exit placement read at the start of a game (`t1.py`).
- S and RUN/STOP (`t1.py`).
- Trap limit, count poked to 10 and 11, stop on the hand-over at `$995F`
  and a checkpoint on the refusal (`t4.py`).
- Map penalty (`t5.py`).
- Attract demo settings after the options timeout (`t6.py`).
- Airport and ranking seen in play (`reference/airport-ranking.png`).

## Listing error rate

Two independent samples of the listing's comments, each checked comment by
comment against the code by an agent that wrote none of them
(`60-verify`); the population each time was every commented record, 617.

- **First sample**, seed 20261009, 60 comments: 12 wrong (20 %; 95 %
  Wilson interval 12-32 %). The errors were details, not what routines do:
  ten minor (a wrong caller, a block's size, ten interrupts where the code
  waits for eleven), and two major: the weight tables `$1B26`/`$1B29`
  swapped, and `$5D`/`$5F` read as climbing states where they are the
  clip edges of a side door's frame. All
  twelve were rewritten, and the whole listing was then audited by a fresh
  agent, which rewrote 83 more comments before it stopped at a usage
  limit; its changes were spot-checked against the code.
- **Second sample**, seed 20261010, 60 comments, drawn after those
  corrections: 2 wrong (3.3 %; 95 % Wilson interval 0.9-11.4 %).
  `furniture_rec_lo` `$0914` said the high bytes at `$0925` are all `$09`
  (type 0's is `$00`), and `plane_takeoff` `$885D` said the engine rises
  for 60 of 160 steps where it is 61. Both were rewritten, with the same
  error in the `$0925` record and a wrong note size in `play_music`
  `$954E` (three bytes, not two) found alongside.

## Open questions

- Slots 4 and 5 are the openings between floors (the "down" and "up"
  links pair them, `rec_door_opposite` `$BBD4`); which is the hole under a
  rug and which the ladder was not tested in a two-floor embassy.
- The bytes `$1BBF`-`$1BCE`, `$1430`-`$148A`, `$24B1`-`$24D1` and
  `$FBC4`-`$FBFF` are read by nothing found.
