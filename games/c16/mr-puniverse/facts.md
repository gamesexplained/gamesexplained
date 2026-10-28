# Mr Puniverse — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

The Mastertronic cassette (Mr. Chip Software, code by Tony Kelly), from
the TOSEC raw tape file named in `orientation.md`, loaded on a 16 KB PAL
Commodore 16 in plus4emu. Novaload's turbo loader reads a block that
shows the loading screen, then the game into `$1001`-`$3FFE`, and runs
the BASIC line `0 SYS6900` it leaves at `$1001` (`basic_line`), which
calls `$1AF4` (`entry`). Nothing is loaded after that. *(live)*

The title says © MR CHIP SOFTWARE 1985 (`txt_copyright`), the loading
screen (C)1986 MR. CHIP SOFTWARE (`screen_chars` as loaded).

The game keeps the ROMs paged in and uses the KERNAL for two things: its
interrupt entry, which reaches `irq` through the vector at `$0314`
(`setup_machine`), and its keyboard scan, `SCNKEY` at `$FF9F`, which
`irq` calls at the end of each interrupt so that the key code is in
`$C6` and the SHIFT flag in `$0543` (`read_input`, `player_pass`,
`pause_check`). `$FF3E` and `$FF3F` are never written.

Nothing in the game sets the title's colours: `irq` copies them to TED
from `room_colours` (`$0339`-`$033B`), which lies in the KERNAL's
cassette buffer, and the load leaves `$4C`, `$4A` and `$F0` there, a
blue-green, a yellow-green and black, until `draw_room` writes a room's. The
load also leaves `$A1` in `$034B` (`player`), which the first interrupts
read to flip a TIME label before `new_game` clears it. *(live: the
bytes at the hand-over, and the title's picture, against plus4emu)*

## Memory layout

| Thing | Where |
|---|---|
| Variables | zero page (the player's block address `$3F`/`$40`, `player_x` `$41`, `player_y` `$42`, the tune's counters `$D0`-`$D3`) and page 3 (`$0333`-`$0385`: `under_player`, the exits, the two players' lives, rooms, clocks, vitamin counts and `vitamins_got`), cleared from `$0345` by `new_game` |
| Colour memory | `$0800`-`$0BE7` (`screen_colours`) |
| Screen | `$0C00`-`$0FE7` (`screen_chars`): the play area is rows 0-17 (`$0C00`-`$0ECF`), row 18 is blank or PAUSED, and the panel is rows 19-24 |
| Object tables | `$0FE8`-`$108F`: `switch_state` (8), then `obj_type`, `obj_lo`, `obj_colour`, `obj_param`, `obj_timer`, `obj_reload`, `shot_hi` and `shot_lo`, 20 slots each, cleared by `draw_room` for every room |
| Room pointers | `$1090` and `$10AE` (`room_ptr_lo`, `room_ptr_hi`), 25 entries each |
| Room records | `$10CC`-`$1965`, rooms 0 to 24 in order except room 21, which lies between rooms 8 and 9 at `$13EE` |
| The tune | `$196E`-`$1AA6`: `tune_voice1`, `note_freq_lo`, `note_freq_hi`, `tune_voice2` |
| Code | `$1AF4`-`$340C`, with the title's text at `$1B71`-`$1BE9` |
| The title's dot path | `$340D`-`$3470` (`title_path`) |
| The game's text | `$37BC`-`$37FF`: GAME OVER, GET READY and the menu's two lines |
| The character set | `$3800`-`$3FFF`, 256 multicolour characters (`font` to `vitamin_chars`); `$3A68`-`$3B67`, where characters `$4D`-`$6C` would be, holds the player's eight frames instead (`player_frames`), `$3EE0`-`$3FCF` the panel's layout (`panel_layout`), and `$3FD0`-`$3FFF` `merge_player`'s buffer |

`$1AA7`-`$1AF3` and `$3471`-`$37BB` are not read by anything and hold,
apart from a stray byte, the pattern plus4emu leaves in memory nothing
wrote; they are left out of the coverage count.

## Timing

A PAL frame is 49.86 a second (`kit/skills/c16/c16-reference`,
"Timing"). `irq` runs twice a frame, at lines 146 and 250; the tune and
the keyboard scan run there. Everything else runs in `main_loop`, which
does not wait for the frame: a pass takes as long as its six routines
take, with TED taking cycles on every line it draws.

| What | How often | Source |
|---|---|---|
| A pass of `main_loop` | 0.39 to 0.42 passes a frame, about 20 a second, in the seven rooms timed (0, 1, 6, 8, 14, 16 and 23); slower in rooms with more objects | `main_loop`; *live*: a counting checkpoint on the loop over 500 frames, with one on `irq` as the control (1,000 hits) |
| A step of the walk | one multicolour pixel a pass; a column every 4 passes, about 5 columns a second | `move_right`, `move_left` |
| A fall | two lines a pass, a row every 4 passes | `move_down` |
| A jump | 16 passes up, two lines each (four rows), then down until he lands | `player_move` |
| The TIME clock | a step every 71 passes, about 3.5 seconds; 4.00 is 400 steps, about 23 minutes | `clock_tick` (`$0354` counts down from 70 to `$FF`); *live*: 3 steps in 204 passes, 500 frames, in room 0 |
| The EGY bar | a step every `energy_rate` passes (1 to 20, by room); four steps a cell and 34 cells, so 136 steps from full to empty: 408 passes, about 20 seconds, in room 10, the fastest to drain, and 2,720, more than two minutes, at rate 20 | `energy_tick`, the room records |
| A cannon's shot | a cell every 1, 2 or 3 passes, by the cannon's record | `object_timer`, `update_cannon` |
| A crusher | a stage every pass in every room (the records all give it rate 1), four stages a cell | `update_crusher` |
| Spinning heads, conveyors, lifts and fields | each on every third pass | `animate_chars`, `anim_phase` |
| The vitamin's turn | every pass | `rotate_vitamin_chars` |
| The tune | six frames a step and 128 steps: 768 frames, about 15.4 seconds | `music_tick`, from `irq` |

## Controls

`read_input` builds one byte in `$03`, a bit for each control, 0 when
pressed: bit 0 up, 1 down, 2 left, 3 right and 7 fire. With the joystick
it reads port 2 at `$FF08` (TED's keyboard latch, written `$FD` first);
port 1 is never read. With the keys it reads the KERNAL's key code: X
right, Z left, K up, M down, one at a time, and SHIFT (`$0543`) for
fire. Nothing reads the up and down bits. *(live: port 2, Z, X, SHIFT;
port 1, K and M did nothing)*

`player_pass` reads D (`$C6` = `$12`), which costs a life at once, and
`pause_check` reads P: PAUSED in red on row 18, the volume to 0 and a
wait until P is let go, pressed and let go again. *(live)*

On the title, RETURN brings the menu; the menu takes F1 (one player,
joystick), F2 (one player, keys), F3 (two players, joysticks) and HELP
(two players, keys) (`new_game`). In a game for two the players share
the control setting, `keyboard`, and the joystick is port 2 for both.

## Graphics

Multicolour text mode, 40 by 25, with the character set at `$3800` in
RAM (`setup_machine`: `$FF12` bit 2 clear, `$FF13` = `$38`, `$FF07` bits 7
and 4). A colour byte with bit 3 set makes its cell multicolour.
`irq` gives the play area and the panel each their own three background
colours: on line 146 the panel's (`$06`, `$77`, `$F0`), on line 250 the
room's, from its record (`$0339`-`$033B`). Every room's are `$00`, `$31`
and `$32`. The border is dark blue (`$FF19`).

**Walls** are drawn from a bitmap of 45 bytes in each room record, a bit
for two cells: a set bit is the room's wall character beside the same
plus 4, a clear one two blanks (`$D6`). Each blank cell above the left
half of a wall then gets a wall top, `$7E` beside `$7F`, in the room's
top colour (`draw_room`). Wall characters are `$88`-`$8F`, four pairs.
Room 18's walls spell REST ROOM in letters five rows high, each stroke
two cells wide: REST on rows 2-6 and ROOM on rows 8-12, the two Rs
alike, with no bar across their feet. *(live: plus4emu's screen of
room 18)*

**The player** is two columns of three rows on the screen, but drawn in
six characters of his own, `$78`-`$7D` (`draw_player`). Each pass
`copy_under_glyphs` copies the glyphs of the six characters behind him
into a buffer of two columns of 24 lines at `$3FD0`, and `merge_player`
draws his 16-line figure over them from line `player_y`, a multicolour
pixel at a time, a pixel of 0 letting the scenery show. The figure is
one of eight frames of 32 bytes (`player_frames`): four facing right at
`player_x` 0, 4, 8 and 12, each a pixel further right, and four facing
left at `$10`-`$1C`. He takes the colours of the cells he stands in.

**Animation** is done by rewriting glyphs, never the screen:
`animate_chars` spins the random cannon's head (`$98`-`$9F`), rolls the
conveyors (`$B8`-`$BB`) a pixel, and scrolls the lift (`$BC`) and the
force field (`$C6`, `$C7`) up a line, one job a pass;
`rotate_vitamin_chars` turns the vitamin's four frames (`$D7`-`$DA`).

**The title** draws MR PUNIVERSE as a path of vitamins, a dot every
255th call of `title_dot_step` with a wait of `delay` (42) on each, from
`title_path`: strokes of up to 15 dots in eight directions. When the
path ends it starts again with the colour flipped from yellow (`$D7`)
to blue (`$D6`), so the letters are drawn and rubbed out in turn.

## Mechanics

### The rooms

25 rooms, a map five by five: room *n* is row *n* div 5 and column *n*
mod 5 of the map. A room record (`draw_room`, `draw_room_objects`):

| Bytes | What |
|---|---|
| 0-3 | the rooms reached through the exits on the top, bottom, left and right edges |
| 4 | the vitamin's number, an index into `vitamins_got` (every room's is its own room number) |
| 5-6 | the vitamin's screen address |
| 7 | the vitamin's colour |
| 8 | the wall character (the left half; the right is it plus 4) |
| 9 | the colour of every cell of the play area |
| 10-12 | the three background colours, for `irq` |
| 13 | the wall tops' colour |
| 14-58 | the walls, 45 bytes |
| 59 on | the objects, each starting with a byte whose high four bits are the high byte of its screen address and low four its type, until `$FF` |
| after `$FF` | `energy_rate`, then the energy mode: 1 drains the EGY bar, 0 refills it |

Object records: a bridge (type 1) is 5 bytes, a force field (2) 6, a
cannon (3 one way, 4 at random) 6, a crusher (5) 8, a piece of scenery
(7) 6 and a switch (8) 4. Over the 25 rooms there are 38 crushers, 20
cannons that fire one way and 5 at random, 7 force fields, 7 switches,
1 bridge and 18 pieces of scenery (crumbling floor, conveyors, deadly
floor, ladders). 14 rooms drain the bar and 11 refill it.

**Exits.** `draw_room_objects` turns every blank cell on an edge of the
play area into an exit character, `$C3` on the left, `$C4` on the
right, `$C1` on the top and `$C2` on the bottom, so a room's openings
are wherever its walls leave a gap at the edge. `leave_room` takes him
to the room the record names for that edge and moves his block to the
opposite edge, keeping the row (or column). An exit byte of 0 means room
0, so an edge with a gap and an exit byte of 0 leads to room 0. Four
rooms lead away from the grid: room 2's floor and room 24's left edge to
room 0, room 24's top to room 14, and rooms 18's and 19's floors to room
0. *(live: room 2, room 24's left and top)* Exits also lie under walls
where a room's bottom row has gaps: room 18's nine and room 19's one
are each under a wall or a ladder.

**Switches** (`make_switch`, `switch_off`, `switch_on`): touching the
lit half of a switch turns it off and the unlit half on. Its number is
the low three bits of its colour; `switch_state` holds the eight states,
set from each switch's record whenever the room is drawn, so switches go
back to their starting states every time he comes into a room. Force
fields and bridges follow their switch; cannons and crushers have one
too, and every one in the records gives switch 8, which `object_timer`
reads as `switch_state` + 8, the first object's type, never 0: always
on. *(live: room 2's switch 1 took away its field)*

### The player

His block is two columns by three rows, at the screen address in
`$3F`/`$40`; `under_player` (`$0333`-`$0338`) keeps the six cells of
scenery behind it. `is_solid` decides what stops him: everything below
`$7E`, `$88`-`$9F` (walls, cannon parts), `$A8`-`$B7` (crumbling
floor), `$BA`-`$BB` (a conveyor's body) and `$CA`-`$CB` (deadly floor).
Walking checks only the middle and bottom cells of the column ahead, so
his head can pass through a wall a row above a corridor two rows high.

At the bottom of his block, the character under his feet decides
(`player_move`): solid ground and ladders (`$80`-`$9F`) hold him and let
fire start a jump; crumbling floor crumbles a stage a pass and holds
him, eight stages from `$A8` to `$B6`, then both its cells go blank
*(live)*; a conveyor carries him left a step a pass *(live)*; a lift
(`$BC`) raises him; the deadly floor kills him; anything else lets him
fall. Because a ladder holds him as ground does, he cannot climb down
one; he climbs it by jumping, since a jump ends early on a ladder rung.

**What kills him** (`player_pass`, `player_move`): a shot (`$C5`) or a
force field (`$C6`-`$C7`) or a crusher (`$CC`-`$D5`) in the middle cell
of the column he stands in (the left one facing right, the right one
facing left), or in that column's bottom cell when the figure is low in
the block (`player_y` 3 or more); standing on the deadly floor; D; the
EGY bar running out (`energy_tick` returns the carry set); and the clock
reaching 4.00 (`clock_tick` sets his lives to 1 first, so his game
ends). Exits are found in the same cells, the bottom one only when the
figure is low; switches and the vitamin only in the bottom one, and
only then.

### Lives, turns and the end

Each player starts with 8 lives (`new_game`). A death (`death`) runs
the death sequence, takes a life and gives the turn to the other active
player, if there is one; a player with no lives is out, and with both
out GAME OVER shows and the title comes back (`new_game`). Each turn
starts in the room the player was in, at the place he entered it
(`start_turn`, `room_start`), with the EGY bar refilled
(`refill_energy`); the clock and the vitamins carry on. *(live: two
players, D, F3)*

The 25th vitamin (`collect_vitamin`, `CMP #$19` at `$281E`) ends the
player's game: his lives become 1, the tune starts, the game waits for
a key, and the death sequence finds no lives left. *(live)* There is no
other ending; in a game for two the other player goes on.

**The EGY bar** (`energy_tick`): `bar_pos` is the cell being worked, 33
at the right end at the start of a turn. Draining, the cell steps from
`$6D` (full) to `$71` (empty) and then `bar_pos` moves left; when the
leftmost cell empties he dies. Refilling, the cell steps back to `$6D`
and `bar_pos` moves right, but it stops when `bar_pos` reaches 33
without filling that cell, so after any drain the bar's last cell stays
empty until the next turn. *(live: cells 30-33 at full, full, one step
down and empty went to full, full, full and empty in room 6)*

## Data tables

| Table | Where | Contents |
|---|---|---|
| `room_ptr_lo`, `room_ptr_hi` | `$1090`, `$10AE` | the 25 room records' addresses; five unused bytes after each |
| Room records | `$10CC`-`$1965` | 25 records, from 62 to 128 bytes; room 0's last byte is room 1's first (`$111F`); four gaps of 1 to 12 bytes lie between others and 8 bytes after the last (`room_gap_11C1` and on), read by nothing |
| `tune_voice1`, `tune_voice2` | `$196E`, `$1A27` | 128 steps each |
| `note_freq_lo`, `note_freq_hi` | `$19EE`, `$1A0A` | 28 and 29 entries: TED's 10-bit frequency value for notes 0 to 27 |
| `wimpo_path` | `$1B77` | a second dot path, read by nothing (`features.md`) |
| `title_path` | `$340D` | the MR PUNIVERSE path |
| `player_frames` | `$3A68` | eight frames, 32 bytes each, the left column's 16 lines then the right's |
| `panel_layout` | `$3EE0` | the panel's six rows of 40 characters, which `setup_machine` copies to rows 19-24 and colours by character |

## Sound

TED's two voices. `$FF11` holds the volume (bits 0-3), voice 1 on (bit
4), voice 2 on (bit 5) and voice 2's noise (bit 6).

**The tune** (`music_tick`, called from `irq` on line 250 while
`music_on` is 1: on the title and menu, and after the 25th vitamin).
Every six frames a step, 128 steps. In each voice's table 0 keeps the
voice on, a value with bit 7 set turns it off, and any other value is a
note, setting the frequency from `note_freq_lo` and `note_freq_hi`.
A voice-1 note sets the volume to 8, and each frame takes one off, so
it dies away over eight frames. On every eighth step voice 2 is turned
off and for that step's first three frames its noise is turned on: a
drum.

- `setup_machine` sets the frame and step counters to `$FF`, so the
  tune's first six frames play step 255: voice 1 reads `$1A6D`, inside
  `tune_voice2` (note 17), and voice 2 reads `$1B26`, a byte of
  `music_tick`'s own code (note 14).
- `tune_voice2` has three notes, 84, 85 and 87, far past the 28 in the
  tables; their frequencies come from bytes of `tune_voice2` itself.
- Notes 20 and 21 have the frequencies of 16 and 17.
- `old_music_tick` (`$317F`) is a player of the same shape that nothing
  calls, reading its tables at `$1800`-`$18D8`, where room records lie.

**Effects**, on voice 2 with the tune off (`death_sound` turns
`music_on` to 0): a jump's note rises (`player_move`), a fall has its
own note, held until he lands, the EGY bar's refill at each turn plays
a warble that jumps between a low tone and a high one at every step of
the bar, both creeping up (`refill_energy`), and the death sequence turns on the
noise and raises the pitch while the room's colours step round
(`death`). `voice1_on_unused` and `voice1_off_unused` are never called.
Taking a vitamin makes no sound: `collect_vitamin` writes no sound
register except at the 25th, when it starts the tune. *(live: walking
into room 22's vitamin, the only sound writes were `$FF11` = `$0F`,
both voices off)*

## Register census

`kit/cpu/census.py` on `entry.p4emu`: 75 instructions name 16 TED
registers, and no other I/O.

| Register | What the game does with it | Routines |
|---|---|---|
| `$FF07` | 256 characters and multicolour | `setup_machine` |
| `$FF08` | the joystick in port 2 | `read_input` |
| `$FF09`, `$FF0A`, `$FF0B` | the raster interrupt: acknowledged, enabled, and set to lines 146 and 250 in turn | `setup_machine`, `irq` |
| `$FF0E`, `$FF12` bits 0-1 | voice 1's frequency | `music_tick`, and `old_music_tick`, which nothing calls |
| `$FF0F`, `$FF10` | voice 2's frequency | `music_tick`, `player_move`, `refill_energy`, `death`, `old_music_tick` |
| `$FF11` | volume, voices on and off, noise | `music_tick`, `voice2_on`, `voice2_off`, `player_move`, `pause_check`, `collect_vitamin`, `start_turn`, `death`, `death_sound`, `setup_machine`; `voice1_on_unused`, `voice1_off_unused` and `old_music_tick`, which nothing calls |
| `$FF12` bit 2, `$FF13` | the character set from RAM at `$3800` | `setup_machine` |
| `$FF15`-`$FF17` | the background colours of the play area and the panel | `irq` |
| `$FF19` | the border | `setup_machine` |
| `$FF1F` | the line within a character row, read as a random bit | `update_random_cannon` |

TED's timers, its cursor and screen address registers, `$FF18`, the
ACIA, the user port, the disk drives' ports and the ROM switches are
never named.

## The listing's error rate

One sample of the listing's comments, seed 20261027, checked against
the bytes and in the kit's simulator by an agent (on
`claude-opus-5-5[1m]`) with `kit/skills/core/60-verify/checker.md`,
that wrote none of them. The 269 comments fell in two strata: 244
written by hand on the code, the variables and the tables, and the 25
room records' comments, written by a script from the records' bytes.
The sample drew 60 from the first and 20 from the second.

4 of the 80 were wrong, 5.0 % (Wilson 95 % interval 2.0-12.2 %): 4 of
the 60 by hand (6.7 %, 2.6-15.9 %) and none of the 20 by the script
(0-16.1 %), so 6.0 % weighted by the strata's sizes. That is over the
mark of one in 30, and a lower bound on the true rate, since a checker
misses some. Each was wrong in a detail. `$0800` said the game draws
over the loading screen's colours at once, where only the panel's are
recoloured at once and the play area's wait for the first room.
`$0FC4` left `setup_machine`, which writes the whole EGY bar empty,
out of the routines that change it. `$32D0` had the clock stepping on
the first pass after a death, where `clock_count` = 1 makes it the
second. `$3E30` said touching a force field kills, where only the middle
cell of the column he stands in counts, and the bottom cell when he is
low in his block. All four were corrected, and with them the same
belief in two more comments, the crusher's characters (`$3E60`) and
`player_pass` (`$2581`), which counted the bottom cell for exits and
deaths whatever his height, and in this file's "What kills him".

## Live tests

All from `work/play-room1.p4emu` unless named, in plus4emu with the
kit's server, 27 October 2026.

- Port 2 right moved him; port 1 did nothing. X, Z and SHIFT in keyboard
  mode moved and jumped him; K and M did nothing.
- D cost a life. P printed PAUSED and stopped the program in a loop at
  `$27BF`-`$27C3`; P again went on.
- TIME1 poked to 3.99 ticked to 4.00; his lives became 1 and he died.
- The EGY bar poked one step from empty ran out and he died.
- The vitamin count poked to 24 and a vitamin under him: lives 1, the
  tune, a wait at `$2838`, then a key, GAME OVER and the title.
- In room 0, put in the shaft above the vitamin, he took it (VITAM1 01,
  `vitamins_got` bit 0) and fell through into room 5.
- In room 2, touching switch 1 set its state to 0 and the force field
  at column 36 went; put above the pit, he fell into room 0.
- In room 1, in the line of the cannon, he died twice in 800 frames; on
  the crumbling floor the cells under him went `$A8`, `$AC`, `$AE`,
  `$B2`, `$B6` and blank.
- In room 3, on the conveyor, he went six columns left in 60 frames.
- In room 24, on the ladder, jumping took him into room 14; in its
  bottom corridor, walking left took him into room 0. From room 22's
  bottom corridor, walking right took room 22's vitamin and went on
  through room 23 into room 24; from room 23's top right he came into
  room 24 at its left.
- A game for two (F3 from `entry.p4emu`): D cost player 1 a life and
  player 2's turn began.
- Refill in room 6 with the bar's last cell empty filled the cell
  before it and left the last empty.
- The main loop counted over 500 frames in seven rooms (Timing).
- With `title_dot_step`'s four operands at `$1C64`, `$1C6C`, `$1C72`
  and `$1C91` changed from `$340D` to `$1B77`, the title drew WIMPO.
- Plus/4 World's cheats, each poked in play (`cheats.md`).
