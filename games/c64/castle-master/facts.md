# Castle Master — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

The original Domark disk of 1990, `castle_master[domark_1990](!).g64`.
Ten files load in a fixed order: the autostart loads `CASTLE`, `CASTLE`
loads `LOADER` (`$C200`) through the KERNAL, and `LOADER` loads the
other eight from its file table at `$C203`; the file table and the boot
recipe are in `orientation.md`. The listing is built from
`work/menu.vsf`, the language menu reached from a hard reset, with
`work/entry.vsf` (the loader's jump to `$473B`) as the hand-over.

## Memory layout

| Thing | Where |
|---|---|
| Autostart stub `CASTLE` (not counted: system workspace) | `$02A7-$0303` |
| Tape and disk save and load, with their counters | `$0410-$0659` |
| Music data: frequency tables, 53 phrase pointers, 51 phrases, 17 tunes' order roots, order streams, instrument windows | `$065A-$1046` |
| Engine and frame state | `$1047-$123B` |
| Trig table, 72 sine/cosine pairs in 5° steps | `$123C-$12CB` |
| Face templates, the last the one-face template at `$136B-$1373` | `$12CC-$1373` |
| Control map (22 pairs) | `$1382-$13AD` |
| Script token lengths, opcodes 0-48 | `$13AE-$13DE` |
| Object base size by type | `$13DF-$13ED` |
| Messages and area names, 61 slots of 16 bytes | `$1410-$17DF` |
| Panel labels, save prompts, the nine riddle panels | `$17E0-$1C63` |
| Row pointers into the linear view buffer, 120 words | `$1C75-$1D64` |
| Packed font, 59 glyphs | `$231A-$2405` |
| Game state saved to tape or disk, 106 bytes | `$2406-$246F` |
| Arithmetic, 3D, collision, scripts, HUD, menus | `$2470-$9CEB` |
| Linear view buffer, 120 rows of 30 bytes | `$87CC-$95DB` |
| Castle database: 34 areas, 546 objects, their scripts | `$9D00-$BF8F` |
| Loader and its file table | `$C200-$C3A7` |
| Screen matrix (colours of the bitmap) | `$C400-$C7E7` |
| Music driver: entry jumps, state, code | `$C800-$CFEE` |
| Saved zero page while the KERNAL runs | `$DF02-$DFFF` |
| Bitmap (panel and view) | `$E000-$FF3F` |
| The KERNAL's last 192 bytes, the end of `CNBMAP`, with the game's own NMI and reset vectors; the game's interrupt entry is the copy at `$FF48-$FF5A` | `$FF40-$FFFF` |

## Timing

- Two interrupt sources share the handler at `$737F`. The VIC raster
  interrupt fires once per frame at line `$28` (`$73B3-$73B5` set it
  again) and ticks the music driver. Everything else runs from CIA 1
  timer A, which the game never reprograms: its latch holds the KERNAL's
  `$4025` (16,421) in `work/play.vsf`, so it interrupts every 16,422
  cycles, 60.0 times a second on a PAL machine.
- `LIGHTNING_DIVIDER` (`$2468`, decremented at `$7527`) counts 60 CIA
  interrupts, so the code at `$7531-$756B` runs once a second while a
  game is on. In it, `$7358` counts 10 seconds before a sensor takes a
  point of strength, `$7359` counts 120 seconds before the
  spirit meter's clock `$246A` goes up by one, and
  `PERIODIC_TICK_DIVIDER` (`$2469`) counts 10 seconds before
  `CURRENT_TIMER_TICK` (`$246D`) goes up. `$48A8-$48B5` sees the tick
  change and raises the scripts' timer event, mask `$08`. *Live*
  (`work/scripts/drain.py`): in the Magister, with its one sensor,
  `$7358` fell by one every 50 frames and strength fell from 16 to 13 in
  1,500 frames.
- Script delays (`FCL_DELAY_COUNTDOWN`) count CIA interrupts, decremented
  at `$73C8`.

## Controls

`READ_CONTROL_INPUT` (`$75C3`) scans the keyboard through the eight
groups at `$757A` and joystick port 2, and keeps up to six codes
(`$137A-$137F`); the Commodore key sets `$1380`.
`UPDATE_FRAME_INPUT_EVENTS` (`$48C1-$48E2`) turns each code into an
action through the 22 pairs at `$1382`:

| Code | Action |
|---|---|
| `↑` `*`, joystick up | 3 |
| `=`, joystick down | 4 |
| `Z`, joystick left | 5 |
| `X`, joystick right | 6 |
| `P` | 7 |
| `L` | 8 |
| `C` | 9 |
| `W` | 10 |
| `R` | 11 |
| `F` | 12 |
| `U` | 13 |
| `+` | 21 |
| either Shift, fire | 22 |
| `A` | 27 |
| Space | 30 |
| `I` | 41 |

A turn steps the heading `VIEW_YAW` (`$2411`) in 5° units; X, action 6, adds
to it and turns right (*live*, `work/scripts/turn.py`). Actions 1-20 go to `DISPATCH_PLAYER_MOVEMENT` (`$5DD8`), 21-30 to
`DISPATCH_AIM_FIRE_ACTIVATE` (`$62E8`), and 41 opens the information
menu (`$77FE`). With the aiming cursor on, actions 3-6 become 26-23
(`$4901-$490C`), so the direction keys move the cursor instead of the
player. In the information menu, `S` saves, `L` loads, `F` switches
between music and effects, `K` cycles the keys collected and `Q` quits.

## Graphics

- The VIC sees bank 3. The screen matrix is at `$C400` and a
  multicolour bitmap at `$E000`; `LOADER` sets both and the game never
  moves them.
- The 3D view is drawn into a linear buffer, 120 rows of 30 bytes at
  `$87CC-$95DB` (the row pointers at `$1C75`), then
  `BLIT_LINEAR_BUFFER_FORWARD_TO_VIC_BITMAP` (`$65E7`) copies it into
  the 30 by 15 cells of the bitmap that start at `$E528`.
  `UPDATE_VIEWPORT_COLOR_CELLS` (`$61A8`) colours the view: each of its
  screen-matrix cells gets `$C0` ORed with the area's attribute byte,
  colour RAM gets 1, and the border and background (`$D020`, `$D021`)
  get 0, all from `$2435-$2438`, which `SELECT_AREA` sets at
  `$7784-$7797`. The attribute so sets one of the view's four colours;
  the others are grey (12), white (1) and black (0).
- Objects are drawn whole, farthest first, from a sorted queue: one
  builder per shape (`$2D20` cuboids, `$2F21` pyramids, `$32E1` lines
  and polygons, `$33A3` rectangles), the projection at `$3C05` with the
  screen's centre at (60, 60), clipping against the view's edges, and
  span filling into the buffer.
- Text is drawn into the bitmap, not the screen matrix.
  `DRAW_TEXT_TO_BITMAP` (`$8590`) expands each character of a message
  from the packed font at `$231A` (four bytes a glyph, characters `$20`
  to `$5A`) and blits it. A message slot is a flag byte and 15
  characters. With flag 0 all 15 are drawn. With flag 1 (`$85AA`) the
  two end cells are blanked, 14 characters are drawn, and the whole is
  moved 3 units right, where each character takes 5 (`$8649-$864E`): a
  little over half a character, which centres a message of even length.
- The aiming cursor is two overlapping hardware sprites placed by
  `$65A6`.

## Mechanics

- **Strength** (`$2455`) starts at 16, the database's byte `$9D05`
  (`$4E3C`). Script opcode `$13` adds a signed amount and caps it at 24
  (`$6982-$69A2`). Every 10 seconds spent in an area with a sensor that
  is not hidden costs a point (`$7545-$754F`): the sensors are counted,
  type 2 without the hidden bit `$40`, each time the scene is rebuilt
  (`$27C6-$27D7`), and `$367E` publishes the count as
  `ACTIVE_SENSOR_COUNT` (`$109A`). A fall takes 5 through
  `APPLY_FALL_DAMAGE` (`$8142`), called from `$81F4` when the drop is at
  least `$2414`, and from `$53BC` when the high byte of four times the
  clearance `$4F9B/$4F9C` is more than `$2414` (a signed compare).
  `$2414` is set per area as its scale times `$9D4A` (2) at `$7758`.
- **The spirit meter.** `$246A` starts at 32 (`$4E14`) and goes up one
  step every two minutes; `$7258-$725E` copies it to `$7026` when it
  changes. `$7286-$72AF` multiplies that copy by 21 − spirits destroyed
  (`MUL_S8_S8_TO_S16`, `$2643`, signed), divides the 16-bit product by
  21 (`DIV_S24_BY_S16`, `$259F`, with a high byte of 0, so as an
  unsigned number), and ends the game with reason 1 when the low byte of
  the quotient is `$40` or more. 21 is `$9D49`, and the spirits
  destroyed are script variable 28 (`$2454`). Up to 127 the clock is
  positive and the meter is clock × (21 − destroyed) / 21: with none
  destroyed the game ends at 64, 64 minutes after the start, and with
  10 destroyed at 123, 182 minutes in. At 128 the signed multiply reads
  the clock as −128, and the unsigned divide turns the negative product
  into a large quotient whose low byte is `$F3` for 11 destroyed and
  `$F9` for 12, both over `$40`, so those two games end at 192 minutes;
  done without the overflow, the sum would reach 64 at clocks 135 and
  150, 206 and 236 minutes in. With 13 destroyed the product at 128 is
  `$FC00` and the quotient `$0C00`, low byte 0, and with 13 or more no
  value of the clock, 0 to 255, ends the game, where the sum without the
  overflow would end it for 13, 14 and 15 (clocks 168, 192 and 224). The sweep of all 256
  clock values for each of 0 to 21 spirits through the game's own
  multiply and divide is `test_meter.js`. *Live*
  (`work/scripts/meter.py`): with 11 and with 12 destroyed the game
  ended as the clock went from 127 to 128; with 13 and with 20 it did
  not, and with 11 the step from 126 to 127 did not end it.
- **The potion of revitalisation**, object 1 of cavern 22. Its action
  script sets flag 29, prints A POTION FOR... REVITALISATION, hides the
  potion and adds 400,000; a shot destroys it instead (SMASH!!). Global
  script 4 then runs on every 10-second timer event: while flag 29 is
  set and variable 24 (`$2450`, 0 at a new session, `$4E27-$4E2D`) is
  below 64, it adds 1 to variable 24 and a point of strength, so the
  potion gives up to 64 points over 640 seconds, each capped at 24.
  *Live* (`work/scripts/potion.py`): after the action, back in the
  Wilderness, strength rose from 11 to 16 in 2,500 frames, one point
  every 500, with variable 24 counting with it.
- **The potion of strength**, object 4 of the Stores (area 25; object 5
  runs its script). Its action script, while variable 25 (`$2451`) is
  below 64, adds a point of strength and 1 to variable 25, prints A
  POTION FOR... STRENGTH and adds 6,250; it never hides itself, so it
  can be drunk 64 times, 400,000 points in all. No other script token
  reads or writes variable 25. *Live* (`work/scripts/stores.py`): 70
  actions 150 frames apart; strength went 16 to 24 and stayed (the cap),
  and the score and variable 25 rose with each of the first 64 and not
  after.
- **Other strength.** 13 objects in nine areas (six in the Kitchen and
  the Larder) hide themselves and run shared object 214's script:
  strength + 4 and 22,500. Shared object 206 (from the Smithy's object
  9, the Carpenter's object 46 and shared object 208) prints AAAAAARRRGH!
  and takes 1. The Hospital's own condition script adds 1 on each timer
  event while strength is below 12. The Wilderness's object 3 and the
  Hot Baths' object 17 print GLUG GLUG GLUG, move the player to the
  Wilderness and take 128, which ends the game.
- **The spirits.** 19 of the 21 sensors have the id 125, 126 or 127, and
  global scripts 1-3 show shared spirits 142-144, 145/165/166 and
  170/172/173 while a sensor with that id is visible in the area. A shot
  spirit destroys the sensor (looked up shared-first, and the shared
  objects have no id below 128, so the area's own) and runs shared
  object 215's script: variable 28 + 1, 75,000 and effect 1. The
  Courtyard's sensor 51 is hidden until its object 30 is shot, which
  shows it and the spirit 49. The Dragon's Lair's object 9 counts shots
  in variable 23 once variable 28 is over 19, and the 21st hides 14 of
  the lair's objects, sensor 7 among them, and runs object 215. Shared
  object 216 (six callers) prints TREASURE FOUND and adds 37,500.
- **Score**, 24 bits at `$2442-$2444`, added only through
  `ADD_SCORE_U24` (`$6FBD`). Each key collected adds 125,000 (`$70EE`).
  The first visit to each area adds 17,500, through script opcode `$12`
  (GOTO), which marks the area in `VISITED_AREA_BITS` (`$243D`) at
  `$6D1B-$6D24`.
- **How a game ends.** `SESSION_END_REASON` (`$109B`) picks the
  message shown by `$4955-$4984`:

  | Reason | Set at | Message |
  |---|---|---|
  | 1 | `$72AF`, the spirit meter reaches 64 | OVERPOWERED |
  | 2 | `$699D` and `$71E8`, strength reaches 0 | YOU COLLAPSE |
  | 4 | `$8152`, a fall with less than 5 strength left | FATAL FALL |
  | 5 | `$4885`, the escape | YOU DID IT ! |
  | 6 | `$7808`, Q in the information menu | CASTLE MASTER |
  | 7 | `$8117`, geometry appears around the player | CRUSHED |

- **The escape.** *Live* (`work/scripts/ending.py`): entering the
  Magister paid 17,500. Its object 5, a rectangle hidden (flags `$C0`)
  until object 11 shows it when ten keys are held (THE DOOR OPENS), and
  then drawn in fill pattern 1 (`$9D06`, all bit pairs 00), the black of
  the background, holds the script that adds 3,000,000, prints YOU DID
  IT ! and starts tune 1 with the sound switch forced to music
  (`$6C74`). The ending then sends the player through the areas in turn
  (18, 8, 15, 3, 6, 17, 19, 14, 2 and 1), each paying 17,500 as a first
  visit, including the Wilderness, which the start never marks as
  visited. The score ended at 3,192,500, reason 5. Each GOTO but the
  Hospital's and the last, to the Wilderness, is followed by a redraw
  token, so the Hospital is entered and left without being drawn, and
  the Wilderness is drawn once the script has ended
  (`work/scripts/tour.py` pictured the other nine).
- **Crushed.** `CHECK_NEWLY_VISIBLE_CRUSH` (`$803D`) tests objects that
  a script has just made visible against the player's position and
  height; one that encloses the player sets reason 7.

## Data tables

- **The castle database** (`$9D00-$BF8F`). Byte 0 is the number of
  areas, 34. Words at `$9D4F` are each area's offset from `$9D00`, in
  file order, not sorted by id; `$9D44` points at the five global
  scripts. `$9D46-$9D48` are the crawl, walk and run step lengths (30,
  60, 240), `$9D49` the spirits to destroy (21), `$9D4A` the fall
  multiplier (2), `$9D4C` the turning step (3).
- **An area** is a header of 8 bytes (the sky's fill in the high nibble
  and the floor's in the low, each a four-byte pattern at `$9D06`, drawn
  by `$4B9F-$4CB5`; object count; id; the offset of its condition list;
  scale, which `$76D0` multiplies into the step, the fall threshold, the
  floor step and the player's height; attribute; name index), its
  objects, then its condition list. Its name is the message slot at
  `$1500 + 16 × name index`. Area 255 holds the 100 objects shared by
  every area.
- **An object** is a type in the low nibble of byte 0 with flags above
  it, a position (bytes 1-3), a size (4-6), an id (7) and its total
  length (8). Any bytes past the type's base size in
  `OBJECT_BASE_SIZE_BY_TYPE` (`$13DF`) are its script. The 546 objects
  are 82 of type 0, 224 cuboids (1), 21 sensors (2), 134 rectangles (3),
  4 of type 4, 39 of type 6, 13 of type 7, 4 of type 8, 2 of type 9, 10
  of type 10, 8 of type 11, 2 of type 12 and 3 of type 13. A sensor's
  record is 9 bytes, shorter than its type's base size of 14 (`$13E1`).
- **Scripts.** 177 object scripts, 11 condition scripts in the condition
  lists of 8 areas (two each in areas 6, 13 and 32, one each in 8, 11,
  14, 16 and 21; the other 26 lists are empty) and 5 global scripts hold
  809 tokens, each exactly filling its declared length. A token's low
  six bits are the opcode, its length in `FCL_TOKEN_LENGTHS` (`$13AE`);
  its top two bits say which event lets it run (`$690C-$693D`): 0 needs
  mask bit `$01`, which actions 3-8, 12 and 13 set (`$616F-$6174`) and
  the speed keys, actions 9-11, do not; 1 needs `$08`, the 10-second
  timer (`$48B5`); 2 needs `$04`, which a shot sets (`$646D`); 3 needs
  `$02`, set at `$6598` in the aim, fire and activate dispatcher.
- **Which shared objects an area shows.** 31 areas hold a type-0 object
  with id 255 that is not a script; only the Wilderness and the
  Stairwell have none. When an area is entered, `$7C5A` hides every
  object of area 255, then reads that record's bytes +1 to +6 and +9 up
  to its length as object ids, skipping zeros, and clears the hidden bit
  of each object named (`FIND_OBJECT_BY_ID` with A=0, which searches the
  shared objects before the area's own).
- **The script opcodes**, from `EXECUTE_FCL_STREAM` (`$68F5-$6FBC`). A
  test that fails sets the skip flag (`$6F8F`), and every later token is
  skipped until ELSE (`$2C`) flips the flag or ENDIF (`$2D`) clears it;
  there is no nesting. A token whose event does not match is skipped
  too, ELSE and ENDIF included. An object named by id alone is searched
  for in the shared objects, then the area's own, and a test or action
  on one that is not found fails, except `$30`, which then ends the
  script (`$6F5E`); one named with an area is searched for in that area
  only, and if it is not found the script goes on.

  | Opcode | Arguments | What it does |
  |---|---|---|
  | `$01` | n (24 bits) | adds n to the score (`$6978`) |
  | `$03`, `$04`, `$05` | object | toggles, clears or sets its hidden bit `$40`; nothing if it is destroyed (bit `$20`) |
  | `$06`, `$07`, `$08` | area, object | the same in another area |
  | `$09`, `$0A` | v | adds 1 to, or takes 1 from, the variable at `$2438 + v` |
  | `$0B` | v, n | tests that variable v equals n |
  | `$0C`, `$0D`, `$1D` | b | sets, clears or flips flag b, bit (b − 1) mod 8 of `$2439 + (b − 1) div 8`; setting flag 31 also turns the sound switch to music and starts tune 1 (`$6C70`) |
  | `$0E` | b, n | tests that flag b is n (0 or 1) |
  | `$0F` | n | requests sound effect n now (`$6CCE`) |
  | `$10`, `$11` | object; area, object | destroys it: sets bit `$20` and hides it |
  | `$12` | area, entrance | goes to that area and entrance (`$6CD4`) |
  | `$13` | n (signed) | adds n to strength, at most 24 (`$6982`) |
  | `$14` | v, n | sets variable v to n |
  | `$1A` | | redraws the view now (`$6F1E`) |
  | `$1B` | n | waits n interrupts of the game clock, 60 to the second (`$6F3A`) |
  | `$1C` | n | requests sound effect n, or leaves it in `$105E` for a redraw that is pending (`$6CB2`) |
  | `$1E`, `$1F` | object | tests that it is visible, or hidden |
  | `$20`, `$21` | area, object | the same in another area |
  | `$22` | n | prints message n, or with the high bit set riddle panel n − 128, 0 to 8 (`$6D4D`) |
  | `$23` | n | does nothing (`$6F45`) |
  | `$2E`, `$2F` | v, n | tests that variable v is above, or below, n |
  | `$30` | object | runs that object's script and ends this one (`$6F4C`) |

  The variables the scripts use include 28, spirits destroyed (`$2454`),
  29, strength (`$2455`), 31, keys collected (`$2457`) and 32, the key
  being collected (`$2458`). Variables and flags share bytes: variable
  1 is flags 1-8, and variable 5 is the first byte of the visited-area
  bits (`$243D`).
- **Messages.** 61 slots of 16 bytes at `$1410`. Script opcode `$22`
  (PRINT) with argument n shows slot `$1410 + 16 × (n − 1)`; with the
  high bit set it shows a riddle panel instead. The scripts print
  messages 5, 10, 16, 20, 21, 27, 34, 36, 37, 42, 43 and 45-61, and the
  code names 1-8 and 11-15 directly. It reaches the area names, 24
  (BALLROOM) among them, through `$1500 + 16 × name index`
  (`$77AE-$77C7`), and the key names through the slot numbers at
  `$77EF-$77F8` (`$7A0A-$7A24`). Message 9, CHOMP CHOMP AHH, is named by
  no script token and no instruction.
- **Riddle panels.** Nine panels (`$18AE-$1B76`, pointers at `$13EE`)
  of counted records: a horizontal step, a row, a length, then the
  text. The row is a step from the previous record's, through the
  pointer `$7C/$7D` into the row table `$1C75`, which `$6DBB` sets once
  as a panel starts. Length `$FF` inserts the caption at `$1C4D`.

## Sound

- The driver is at `$C800-$CFFF` with its tables at `$065A-$1046`.
  `SID_PLAYER_INITIALIZE` (`$CF1B`) takes a tune number in A and stores
  six times it in `$C813`; `SID_PLAYER_TICK` (`$C885`) runs once per
  frame from the raster interrupt at `$73B0`. There are 17 tunes, 0 to
  16, of 8,833, 4,033, 67, 61, 13, 19, 13, 31, 13, 61, 13, 67, 37, 13,
  67, 67 and 49 frames. Tune 0 is the title music and tune 1 the
  escape's.
- Each voice reads an order stream (`$0D71`, three roots per tune) of
  phrase numbers and five commands: `$E8` sets the volume and
  filter-mode byte `$C82C`, which goes to `$D418` (`$CA74-$CA83`), and
  for the others bits 5-6 pick (`$CA86-$CAA5`) `$CF88` transpose
  (`$C80D`), `$CFB4` repeat the next phrase (`$C82D`, used at
  `$CA43-$CA50`), `$CF79` fine-tune (`$C83F`) and `$CF97` remap
  instruments. The tunes' streams use transpose, repeat and remap only.
  A note lasts as many ticks as the byte after its pitch (`$C830`, set
  at `$CC7C` and counted down at `$CC9F`). An instrument's waveform
  sequence (`$100E` plus its offset in `$C84B`) is a list of steps: the
  high nibble is the step's length in ticks, plus one on a note's first
  step (`$CC27-$CC30`) and the plain nibble on later steps (`$CE3E`),
  and the low three bits pick the control byte from `$100A`.
- `$123A` is the sound switch: 1 music, 0 effects. In effects mode
  `SID_INITIALIZE_IF_ENABLED` (`$CFD8`) plays effect A as tune A + 1;
  in music mode it plays nothing, and the raster interrupt restarts tune
  `$1239` whenever the driver stops (`$7393`).
- Effects come from the code (`$484F` lightning 8; `$4A2B`, `$5F46`,
  `$634B`, `$79DD` and `$834B` 3; `$63B5` 5; `$8306` and `$8363` 2),
  through the deferred request `$105E` (`$53D1` and `$54A1` 12, GOTO 7
  at `$6CE0`, `$6D3D` 13, a fall 8 at `$8164`), and from script opcodes
  `$0F` (13, 10, 8, 2, 4), played at once by `$6CCE`, and `$1C` (2, 8,
  11, 4, 1, 3, 14, 5), which `$6CB2-$6CC4` leave in `$105E` when a new
  picture is pending, so the sound starts with it. Every request passes
  its number straight to `$CFD8`. Effects 6 and 9, tunes 7 and 10, are
  requested by nothing.
- **The sensors' alarm.** In effects mode, while `ACTIVE_SENSOR_COUNT`
  (`$109A`) is nonzero and the game is running, the raster interrupt
  calls the driver's start with tune 16 on every frame, before the tick.
  *Live* (`work/scripts/alarm.py`): each frame the start wrote control
  `$00`, `$FF` and `$FE` to the three voices, and the tick then wrote
  the tune's first frame, frequency `$45A0` on voices 1 and 3 and
  `$8B40` on voice 2. The tune is never heard past its first frame,
  which is retriggered 50 times a second. With music on, tune 0 played
  on and no alarm sounded.
- The start (`$CF1B`) writes `$01` to each voice's control register and
  then decrements it in place; the SID's registers are write-only, so
  the decrement reads back whatever the bus last held. *Live*: the
  controls were left at `$00`, `$FF` and `$FE`: voice 1 cleared, and the
  test bit set on voices 2 and 3.
- `test_music.js` runs the page's copy of the driver against the kit's
  6502 core on all 17 tunes, 16,457 frames, and every SID write matches.

## The listing's error rate

The first sample drew 60 of 758 comments with seed 7351, in two strata:
338 written by hand and 420 written from templates. A checker on
a proven model (named in `game.json`), run by `air`, found 14 wrong (23 % plain, 23.9 % weighted by
stratum): two named the wrong variable (`$1C73` and `$1C74` were placed
inside a filename they are not part of), and twelve had a wrong detail
(a note's length, the centring of even-length messages, riddle rows
read as absolute, the fall threshold called the player's height, a
routine said to read the score, the music's repeat command called a
wait). All 14 were corrected, with 83 more comments that said the same
things. The 95 % interval is 14 % to 35 %, over the mark, so the whole
listing was then audited.

The audit checked all 779 comments in four address ranges, each by a
fresh checker on a proven model, run by `air`. It found 14 wrong and
168 wrong in a detail, and corrected all 182, renaming 18 labels with
them. Two were template errors, in every one of the 34 area headers:
the first byte holds the sky's and the floor's fill patterns, and the
scale multiplies every vertical distance, not only the step. A checker
then tested the 177 claims in this file and found 21 wrong in a detail,
among them the note length (the byte after the pitch), one of the two
fall tests (more than the threshold, not at least) and voice 2's
frequency in the alarm; all 21 were corrected.

The second sample drew 60 of the 779 comments with seed 9157, from those
the first did not draw: 40 of 385 written by hand and 20 of 394 written
from templates. A fresh checker on a proven model, run by `air`, found
2 wrong (3.3 % plain, 2.5 % weighted by stratum), both hand-written and
both wrong in a detail: the lightning countdown's count of 1 reseeds it
in the 32 areas with no sky, and the decimal formatter divides signed,
so it is wrong for four-byte values of `$80000000` or more, which its
one caller never passes. Both were corrected. The 95 % interval is
0.9 % to 11.4 %, and 2 of 60 is within the mark.

## Live tests

All in VICE MCP release v3.13.2, PAL, from the snapshots in
`orientation.md`; the scripts are in `work/scripts/`.

- `boot2.py`: a hard reset and autostart of the original disk stop at
  `$473B` with `$01=$34`; `CASTLE`, `CMPRT1`, `CMPRT2`, `CNCOL1` and
  `CNBMAP` are in RAM byte for byte, and `LOADER` but for five bytes of
  its own counters (`$C255-$C259`); the loading picture's files are
  overwritten by the control panel's, and `BOOT` is never loaded.
- `play.py`: 1, Return, 1, Return reaches the Wilderness.
- `ending.py`: the escape in the Magister, with its score, tune and
  tour (Mechanics).
- `alarm.py`: the sensors' alarm in effects mode and its absence with
  music on (Sound).
- `drain.py`: strength lost to a sensor in the area, one point every 10
  seconds (Timing).
- `meter.py`: the spirit meter's end at chosen clocks and counts of
  spirits destroyed (Mechanics).
- `potion.py` and `stores.py`: the potions of revitalisation and of
  strength (Mechanics).
- `tour.py`: a picture of each area of the escape's tour but the
  Hospital, which is never drawn (Mechanics).
- `turn.py`: X raised the heading `$2411` from 28 to 31 and swung the
  castle to the left of the view, so X turns right (Controls).
- `kit/c64/frame.py capture` and `compare` on the first frame of play:
  `work/frame-trim.json`, drawn by `site/lib/c64.js`, matches the
  emulator's picture in all 104,448 pixels (Graphics).
