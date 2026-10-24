# Shadowfire — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

The Beyond cassette of 1985, from the Ultimate Tape Archive
(`Shadowfire.tap`, SHA-1 `30554555c373cf3d59939377f138ddf9cbc0a721`). One
load: a ROM-format header and loader, then ten turbo blocks
(`orientation.md`, "What the tape holds"). The game is `$0900`-`$3FFE`,
`$4000`-`$CFFE` and `$E000`-`$FFF7` as loaded, plus the 19-byte stub at
`$081B` that jumps to `$4000`. Nothing is read from the tape after that
except a saved game.

## Memory layout

| Thing | Where |
|---|---|
| Zero page: drawing pointers, the cursor, the iris's arithmetic | `$2B`-`$4A`, `$73`-`$7D`, `$F7`-`$FE` |
| The view screen's canvas, four doubled sprites (blocks `$24`-`$27`) | `$0900`-`$09FF` |
| The cursor, sprite block `$28` | `$0A00`-`$0A3F` |
| Seven pictures: map icons, a figure, the cassette | `$0A80`-`$0BD0` |
| Colour matrix (rows 0-12 as loaded; rows 13-24 drawn) and sprite pointers | `$0C00`-`$0FFF` |
| Colour RAM source, copied to `$D800` by `start` | `$1000`-`$13FF` |
| Font, 43 six-row glyphs (glyph c at `$1402 + 6c`) | `$1402`-`$1503` |
| Bitmap row address tables, 25 high bytes then 25 low | `$1504`-`$1535` |
| The demonstration's script, 55 points | `$1571`-`$15DE` |
| Music driver, nine tunes and their note tables | `$1600`-`$1FC5` |
| Bitmap (rows 0-12 the command panel as loaded) | `$2000`-`$3F3F` |
| Code, with its variables and small tables between | `$4000`-`$789B` |
| The nine screens' icon records (11 bytes each) | `$789C`-`$7E21` |
| Messages and the 71 words they share | `$7E22`-`$84C6` |
| The ship's map: 32 x 32 tiles, then 32 x 32 colours | `$84C7`-`$8CCA` |
| Pictures: icons, figures, weapons, the eight portraits | `$8CCB`-`$B1E3`, `$E000`-`$FFF3` |
| 164 location records and their two pointer tables | `$B1E4`-`$BDBF` |
| 30 patrol scripts and 7 chains | `$BDC0`-`$BF93` |
| The map's tile set (188 tiles) and characters (235) | `$BF94`-`$C9DF` |
| The game state: clock, mission, 50 entities, 54 objects, door locks | `$CA00`-`$CFFE` |
| A copy of the game state for New game, made by `start` | `$D000`-`$D5FF` (RAM under I/O) |

Banking in play is `$01` = `$25`: RAM at `$A000` and `$E000`, I/O at
`$D000`. The KERNAL is switched in only by `start` and around LOAD and
SAVE (`start_file`, `$773E`). Interrupts come through the hardware
vectors at `$FFFA` and `$FFFE`.

## Timing

- The raster interrupt (`irq`, `$549B`) fires at line `$F8` every frame.
  It saves every zero-page and drawing variable the main program uses,
  runs the chosen input handler (the JMP at `$54EE`), then `irq_game`
  (`$5754`): a frame of music, the status bars, **one entity's second of
  simulation**, the rolling clock, the ticker, one cell of the view map,
  and the entity's reachable locations.
- The fifty entities take one frame each (`irq_entity`, `$66D1`), so each
  is simulated once a second. After the fiftieth (`$61B2`) the
  self-destruct and the mission clock each count one second, unless the
  time lock is set: then it alone counts down (`$61C6`). While it holds,
  every entity but the one in `$CF84` stands still (`$5841`), and so do
  the clock's roll and the ticker (`$5F79`). *Live*: the clock fell one
  second for every 50 frames in every test below.
- The mission clock starts at 99:58 (`$CA00`-`$CA03` = 08 05 09 09) and
  counts down. Past 00:00 it counts up (`clock_up`, `$CA04` = 1),
  Kryxix is executed and war is declared (`$629F`). Counting up past
  99:59 it sets the minutes' tens digit to 10 for a second, then counts
  down from 99:59 again (`clock_wraps`, `$6473`).
- The time lock (`time_lock`, `$CF83`) is 1 at the start, with
  `$CF84` = 0: in the first second of play only Syylk's record is run and
  the clock waits.
- Movement: the time per unit of distance is (127 - (agility + base) / 4)
  / 8, made odd, from 15 seconds at the lowest agility to 1 at the
  highest (`move_by_exit`, `$6E65`). An attack takes the exit's distance x
  4 seconds (`attack`, `$71D2`).
- The self-destruct counts from 0, so its first second takes it to 255:
  the blast comes 256 seconds after arming (`activate_destruct_unit`,
  `$747F`). The manual says four minutes.
- Lock picking: the door's counter falls by 8 a second from `$FF`, about
  32 seconds (`$5A08`).

## Controls

- The control menu (`$41BD`) takes F1 keyboard, F3 digital joystick, F5
  analog joystick (paddles), F7 light pen (`fkey_codes`, `$42CE`; the
  handlers at `input_handlers`, `$42C6`). Any key on the same row line as
  an F key chooses it too (`$4209`).
- The joystick is read in **control port 1**, through `$DC01`
  (`input_joystick`, `$562C`); the keyboard handler is the same code with
  other masks (`input_masks`, `$6825`). A held direction speeds up from 2
  to 6. The paddles read `$D419`/`$D41A`; the light pen `$D013`/`$D014`.
- RESTORE with RUN/STOP held restarts the game at the control menu
  (`nmi`, `$427D`).
- Every screen is icons tested against the cursor's cell
  (`icon_loop`, `$4B64`; `icon_test`, `$4BC4`). Two-step commands (Pick-up,
  Drop, Ready, Activate, Attack, Location scan, the transporter) set a
  group, and only icons carrying that group's bit can be chosen next
  (`group_masks`, `$545F`).

## Graphics

- One multicolour bitmap screen from top to bottom: bitmap `$2000`, matrix
  `$0C00`, colour RAM from `$1000` (`restart`, `$40A3`). A frame captured
  on the team screen had no raster splits and rebuilt pixel for pixel
  (`orientation.md`).
- The upper thirteen cell rows are the command panel, loaded as a
  picture. In play the game draws only into its windows: the view screen
  (columns 15-24, rows 1-10), the portrait monitor (28-37, 2-9), the
  clock (row 7, columns 7-11), the ticker (row 9, columns 1-12), and the
  six status icons' colours. Rows 13-24 are cleared and drawn by each
  screen (`clear_panels`, `$47BD`; `draw_screen`, `$4A63`).
- Pictures are width and height in cells, the bitmap cell by cell, then
  colours packed three bytes to two cells (`draw_picture`, `$42D9`).
- The view screen's iris is four doubled grey sprites over the map
  window. `iris_open` (`$45E2`) clears circles of growing radius out of
  them, drawn by shift-and-add rotation, so the map in the bitmap shows
  through; `iris_close` (`$4646`) fills them back in.
- The view map is 5 x 5 tiles of 2 x 2 cells around the character, from
  the 32 x 32 tile map, the tile set and the map's own 235 characters
  (`draw_view_map`, `$6A50`). It looks for locations in only sixteen of
  its seventeen cells: the one two right and two down is left out
  (`find_view_locations`, `$6BB7`).
- The portrait rolls onto the monitor a line at a time, like a television
  (`show_portrait`, `$48B1`; `roll_monitor`, `$49A3`): seven passes copy
  pixel lines 7 to 1 of every cell into the cell's top line and roll the
  rows down. **Line 0 of a cell is never copied**: the monitor shows
  line 1 twice, and 80 of each portrait's 640 bitmap bytes are never
  seen. *Live*: in a frame recorded with Syylk's portrait on the monitor,
  line 0 equalled line 1 in all 80 cells, lines 1-7 matched the
  portrait's bytes, and line 0 differed from its own byte in 35. The clock's digits roll in over eight frames
  (`$5F81`). The ticker scrolls two bits every fourth frame
  (`$5FEF`), and the red light beside the clock flashes while a message
  runs.
- When Zoff V explodes, the screen shakes for 256 frames with the bytes
  of the code at `$4000` and `$5000` as its random numbers
  (`shake_screen`, `$4AD7`).

## Mechanics

- **Entities.** 50 records of 18 bytes from `$CA0E`: +0 status, +1 step
  countdown, +2 location, +3 destination, +4 strength, +5 agility, +6
  stamina, +7 load, +8 the object held ready, +10 to +17 the locations it
  can reach. Enemies use +5 to +8 for their patrols. 0-5 are the team, 6
  Kryxix, 7 Zoff, 8-`$31` the enemy.
- **Statuses.** 0 idle, 1 moving, 2 dead (bit 1), 4-7 retreating, 8
  defending, `$0C` attacking, `$10` picking a lock (`$5851` onwards).
- **Strength, agility, stamina.** Strength recovers by (255 - strength)
  x stamina / 256 a second, slower in combat, and recovery costs stamina
  (`$58F8`). The load limit is strength x the character's factor
  (`strength_factor`, `$CF85`) / 256; at or over it agility falls by (the
  excess + 4) / 16 a second, under it agility recovers (`$5950`, `$59AE`). Nothing
  compares the load with strength when an object is picked up; Pick-up is
  refused only when the total weight would pass 255 (`pick_up`, `$6FD9`).
- **Combat** (`$5BE6`): damage is strength x factor / 256. An enemy hits
  the six team members, in its own location and each adjacent one. A team
  member hits entities 8-`$31` with the weapon held ready: its strength at
  `weapon_strength` (`$CF15`), `$20` for bare hands. The high nibble is
  worked into the damage for the same location and the low nibble into
  the damage for adjacent ones (`damage`, `$68D7`), but the loop reads
  only the first with X held at 0 (`$5CB3`), so **every weapon hits the
  adjacent locations as hard as its own, and the low nibble is never
  used**. Simulated: a weapon byte of `$F1` took 3 strength from targets
  in both locations. Damage is multiplied by 4, or 8 when attacking into
  the destination. **Kryxix and Zoff are on
  neither side's list: nothing can harm them** (`$5BFF`). Anyone hit who
  was idle or moving turns to defend; an attacker with nobody left
  advances (`$5D18`, `$5D54`).
- **Patrols.** An enemy with +7 bit 7 set walks a script from
  `patrol_scripts` (`$BDC0`): a length, a start location, then pairs of a
  time and a location. Forwards each step takes the pair's time x 4
  seconds; walking back, the time as it stands, so **patrols walk back
  four times as fast as they walk out** (`$5E22`). Six guards walk chains
  of scripts (`next_patrol`, `$5ED0`).
- **Guard `$27` never moves**: its +7 is `$50`, bit 7 clear, so it
  never walks its script and stands at location `$40` all game. *Live*.
- **Triggers** (`trigger_locations`; routines `$6662`-`$669E`): a team
  member reaching location `$4E` starts Zoff's escape walk; `$41` starts a
  squad of eight; `$2E`, `$4C`, `$4F` and `$2F` send entities 8 and 9.
  Zoff at the end of his walk has escaped (`$5E47`).
- **Kryxix** follows only Zark, once Zark has walked into his location
  (`$5B9A`, `$5D93`).
- **`enemy_at`** (`$7250`), which attack and retreat call, scans fifty
  records from entity 8, so its last eight are the bytes after the
  entity table. The first begins with the unused pointers at `$CD92`
  (`$D0`, `$CB`, `$80`): alive, in location `$80` (MILITARY ACCESS BY
  PASS). As loaded, object records' bytes add living "enemies" in `$0C`,
  `$A2`, `$08` and `$54`. Retreat into any of them is refused ("CANNOT
  RUN IN THAT DIRECTION ENEMY IN THAT LOCATION"), and an attack into one
  is always accepted.
- **Doors.** 32 door numbers, locks at `door_locks` (`$CFC9`), all
  locked at the start. A key card opens the first door of its colour
  among the location's exits, the master key any (`open_door`, `$72B1`);
  the tool kit lets only Sevrina pick one (`activate_tool_kit`, `$7301`).
- **Objects.** 54 records of 7 bytes from `$CD98`. Objects 18-53 are
  weapons; none can be activated, and 49 and 50 cannot be picked up. The
  routines of object 4 and of every weapon, which nothing can run, change
  the border colour (`$74AD`, `$74B3`).
- **The mission** (`mission`, `$CA05`): bit 0 the team alive, bit 1
  Kryxix rescued, bits 2-3 Zoff V destroyed (%01) or captured (%11), bit
  4 Zoff captured; `$1F` is success. Beaming someone to the attack craft
  (`$A3`) rescues or captures them (`$5A68`). The 44th enemy killed or
  captured, entities 6 to `$31`, captures the ship (`$6542`). *Live*: the
  start menu's summary read SUCCEEDED with `$CA05` = `$1F`, and FAILED,
  ENIGMA FORCE DEFEATED with the team dead.
- **The self-destruct** kills the first eight entities unless they are on
  the attack craft, sets the kill count to 42 (Kryxix and Zoff then make
  it 44), and leaves the ship destroyed rather than captured (`$61D1`).
  *Live*: 256 seconds after arming, with the team still aboard the craft,
  the summary read 6 survivors, 44 enemies, INCOMPLETE, KRYXIX NOT RESCUED.
- **The demonstration** starts when the title music reaches tune 2 with
  no F key pressed (`$4216`). It walks the cursor through 55 points
  (`demo_script`, `$1571`) and ends by clicking its way out: Quit on the
  team screen, then Quit on the start menu (`$41EA`), which goes back to
  the control menu. No point carries the end mark the code tests for
  (`input_demo`, `$5570`). *Live*.

## Data tables

| Table | Where | Notes |
|---|---|---|
| Locations | `$B1E4` (`$00`-`$7F`), `$B2E4` (`$80`-`$A3`) | map column, row, exits mask (bit 7 up, then clockwise), two bytes per exit (destination; distance bits 0-2, door bits 3-7), description |
| Patrol scripts | `$BDC0`, 30 pointers | length, start, (time, location) pairs |
| Patrol chains | `$BF54`, 7 pointers | length, script numbers, bit 6 backwards; chain 0 is used by nobody |
| Entities | `$CA0E`, 50 x 18 | |
| Entity pictures | `$6CFE`, 50 x 4 | map icon, then figure |
| Objects | `$CD98`, 54 x 7 | flags, location or carrier, weight, picture, routine |
| Weapon strengths | `$CF15`, 54 | objects sharing a picture differ: 20 is `$83`, 21-24 `$63`; 25 `$63`, 26-29 `$F1`; 35 `$8E`, 36-37 `$EC` |
| Strength factors | `$CF85`, 50 | the team's C8 6E B4 FF BE 8C |
| Words | `$81B1`, 71 pointers | `$80`-`$C6` in text |
| Screens | `$789C`, 9 pointers | 11-byte icon records; screen 3's are never drawn |
| Portraits | `$4A21`, 8 x 2 pointers | 6 and 7 are the same "nobody" picture |
| Tile map, colour map | `$84CB`, `$88CB` | 32 x 32 each |

## Sound

- The music driver (`play_music`, `$1606`) runs every frame from the
  interrupt. `tune_request` (`$1600`) holds the tune, 0-9; a tune that
  ends writes the next. The title music runs 7, 4, 5, 6, 2, 3, 8 and round;
  tune 1 plays in the game; tune 9 is never requested (`$176A`).
- Voice 1 plays the sound effects (`voice1_effect`, `$1F6B`): the icon
  click, a sound repeated on every beat of the tune that changes while a
  message scrolls, and a heartbeat for a weak character (`sfx_loop`,
  `$1602`).
- The in-game tune's voices 2 and 3 are pulse waves whose width is
  `pulse_width` (`$1603`) x 8. It is 0 when the game starts, so the tune
  is silent; the team screen's up and down arrows raise and lower it
  between 0 and `$40`, and holding fire on an arrow keeps stepping it.
  *Live*: one 0.3-second press on the up arrow took it from 0 to `$11`.
- Each note is gated on with `INC` on the voice's control register
  straight after a `STA` of its waveform (`$1662`, `$1683`). The SID's
  registers cannot be read: a read returns the data bus, which still holds
  the value just written, so the `INC` writes the waveform with the gate
  bit added. On the kit's simulator with the bus modelled, every write of
  every tune matches; with the register read as 0 the waveform is lost.
- No filter (`$D417` = 0, cutoff never written), and voice 3's
  oscillator is never read.

## Register census

From `kit/cpu/census.py`, every decoded instruction: 218 name 65
registers.

| Register | What the game does with it | Where |
|---|---|---|
| `$00`, `$01` | the processor port: all RAM to copy the state under I/O, the KERNAL in for LOAD and SAVE, the cassette sense | `start`, `new_game`, `start_file` |
| `$D000`-`$D009`, `$D010` | sprite positions: the cursor every frame, the canvas once | the input handlers, `restart` |
| `$D011`, `$D016`, `$D018` | bitmap mode on, the screen blanked for LOAD and SAVE, the shake's fine scroll | `restart`, `start_file`, `shake_screen` |
| `$D012`, `$D019`, `$D01A` | the raster interrupt at `$F8`; waits for a line before drawing | `restart`, `irq_exit`, `roll_monitor` |
| `$D013`, `$D014` | the light pen | `input_lightpen` |
| `$D015`, `$D017`, `$D01C`, `$D01D` | five sprites, 1-4 doubled, 0 multicolour | `restart` |
| `$D020`, `$D021` | black border and background; the shake's flashes; the unused object routines step the border | `start`, `shake_screen`, `$74AD` |
| `$D025`, `$D027`-`$D02B` | sprite colours | `restart` |
| `$D400`-`$D414` | three voices: frequencies, pulse widths, waveforms, envelopes | the music driver |
| `$D417`, `$D418` | no filter, volume 15 | `music_frame` |
| `$D419`, `$D41A` | the paddles | `input_paddles` |
| `$DC00`-`$DC03` | the keyboard matrix and control port 1 | `restart`, the input handlers |
| `$DC05` | CIA 1's timer for a KERNAL-driven music hook nothing calls | `hook_kernal_irq` |
| `$DC0D`, `$DD0D` | interrupts off, pending ones cleared | the stub, `restart`, `nmi` |
| `$DD00`, `$DD02` | VIC bank 0 | `restart` |

Named by no instruction: sprites 5-7, sprite priority (`$D01B`), both
sprite collision registers, the extra background colours, the second
sprite multicolour, voice 1's pulse width, the filter cutoff, voice 3's
oscillator and envelope readouts, CIA 1's timer B, CIA 2's timers and
port B. The game tests no collisions: what is where is all in its tables.

## The listing's error rate

One sample, seed 20261023, drawn from 1,610 comments in two strata: 555
written by hand and 1,055 written by the generators in `work/gen/` from
the records' bytes. 80 were drawn, 60 from the first and 20 from the
second, and checked by one checker on claude-opus-5-5[1m] with
`kit/skills/core/60-verify/checker.md`. Every verdict of wrong was read
against the code: all fourteen held, 13 of the 60 written by hand and 1
of the 20 generated. The plain rate is 14 of 80, 17.5 % (95 % interval
10.7 % to 27.3 %); weighted by the strata's sizes, about 10.7 %. Both are
over the mark and are a lower bound on the true rate. One was wrong
outright: `$FB` was called the iris's starting angle, and is the
fraction of its across coordinate. The rest were wrong in a detail:
readers or callers left out (`$31`, `$3F`, `$1F60`, `$463F`, `$54EF`,
`$5754`), a sign misread (`$46ED`, which negates, and with it the
rotation's direction at `$4698`), a fraction misread (`$59AE`), two
counts that ignored a path (`$61D1`, `$6542`), the combat table read
past its first byte (`$68D7`, with `$5BFF`, `$5C87` and `$CF15`),
`enemy_at`'s first extra record taken for an object (`$7250`), and
show_portrait's copy (`$EAA1`, a template line in all seven portrait
comments). All fourteen were corrected, with the 15 other comments that
said the same.

## Live tests

Each from `work/play-team.vsf` or `work/entry.vsf` on VICE 3.13.2,
advanced by whole frames, on 23 October 2026.

- Clock at 00:02, four seconds: 00:01, 00:00, then 00:01 and 00:02
  counting up, `$CA04` = 1, Kryxix's status 2, "AMBASSADOR KRYXIX..."
  scrolling.
- Clock at 99:58 counting up: 99:59, then a second with the digits 0, 0,
  0, 10 and `$CA04` = 0, then 99:59, 99:58 counting down.
- Two minutes of play from the team screen: every patrolling enemy moved
  except entity `$27`, which stayed at location `$40`; entities 8-`$13`,
  which wait for triggers, stayed too.
- The demonstration, left to run from the hand-over four times: the
  script index reached `$6E` and the demonstration flag `$42D8` fell to 0,
  written by the control menu's entry at `$41FC`, each time.
- Self-destruct armed (`$CA06` = 1): the countdown read `$C4` after 60
  seconds, and the ship blew at 256 seconds (`$CA05` = 5, clock 99:43 to
  95:27).
- `$CA05` = `$1F`, and the team dead with `$CA05` = 0: the start menu
  showed SUCCEEDED and FAILED / ENIGMA FORCE DEFEATED.
- The team screen's arrows, clicked with the joystick: the down arrow
  left `$1603` at 0; one press on the up arrow raised it to `$11`.
