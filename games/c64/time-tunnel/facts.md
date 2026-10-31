# Time Tunnel — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

- One program, `T1`, `$0900`-`$C5FD`, the same bytes on both dumps of the
  disk (`orientation.md`). It carries no version or build string.
- It starts with a cartridge's start-up header (`cartridge_header`,
  `$0900`): cold and warm start both `$0CDA`, then `C3 C2 CD 38 30`
  ("CBM80"). The KERNAL looks for that header at `$8004`, so here it does
  nothing, and no instruction reads it.
- Two leftovers of the developers' own tools are in the file. After the
  last tune (`source_fragment`, `$C5A8`-`$C5FD`) are 52 bytes of ASCII
  text with CR-LF line ends, "ments if he will move outside entire
  screen", a line holding ";", and "whol", then bytes that decode as Z80
  instructions reading and rewriting the CP/M warm-boot and BDOS vectors
  at addresses 1 and 6. And characters 121-128 of the throne room's
  character set (`throne_charset`, `$9D1F`), which its screen never uses,
  hold stray bytes, among them the ASCII text "Bytes/sector:". The text
  fragment matches what `gnome_keep_inside` (`$3DD9`) does: it stops the
  gnome's move when it would take him outside the screen.

## Memory layout

| Thing | Where |
|---|---|
| Variables, zero page | `$0002`-`$00FF` |
| Sprite frames built at start-up: the gnome facing the other way (object 3), the horse facing left (object `$19`) | `$0400`-`$0675` (`sprites_build`, `$0ED3`) |
| The time machine's lights (objects `$17`, `$18`), Medusa's shot (object `$6C`), drawn at run time | `$0676`-`$069F` |
| Object arrays, one byte per object, objects 4-`$6C`: era, room (`$FF` nowhere, 0 carried), x, y, sprite slot | `$069C`, `$0705`, `$076E`, `$07D7`, `$0840` (+ object number) |
| Cartridge header, `obj_start_table`, `portal_table`, era records, `box_list`, era names | `$0900`-`$0CB1` |
| Start-up, credits, the engine, the eras' code | `$0CB2`-`$3E81` |
| Packed character sets and room screens | `$3E82`-`$A0D7` |
| Sprite engine | `$A0D8`-`$A21F` |
| Object tables (`obj_flags` ... `obj_gfx_hi`), `$6D` bytes each | `$A220`-`$A52A` |
| Sprite frames | `$A52B`-`$BB10` |
| Sound effects and music driver | `$BB11`-`$BD6B` |
| Note tables and the eight tunes | `$BD6C`-`$C5A7` |
| Copy of the character ROM (start-up) | `$E000`-`$EBFF` |
| Sprite buffers, eight of 64 bytes | `$EC00`-`$EDFF` |
| The era's character set, unpacked | `$F000`-`$F7FF` |
| Screen and sprite pointers | `$F800`-`$FBFF` |

`$01` is `$35` in play: no ROM is in, the I/O is. Video bank 3
(`$DD00`), `$D018` = `$EC`/`$ED`, multicolour characters
(`orientation.md`). The vectors at `$FFFA`-`$FFFF` point NMI at `start`
(`$0CDA`), so RESTORE starts the game again, and IRQ at `irq` (`$0F78`).

## Timing

- One pass of `main_loop` (`$38E7`) per frame: it waits for raster line
  `$F9` each pass. *Live*: over 500 frames from `work/play-mansion.vsf`,
  `main_loop`, `irq` and `music_play` each ran 499 times.
- `$23` counts passes 0-63; each time it wraps, `$BD` counts 0-59. So a
  count of `$BD` is 64 frames, 1.28 seconds on a PAL machine, and the
  game's slower clocks (the moon's air, the snake, the dynamite's fuse,
  the black hole's message) are in these counts.
- The gnome steps on even passes only (`play_joystick`, `$379D`).
- While paused (F7, `$AF` = 0) `main_loop` still counts `$23` and `$BD`
  and runs nothing else. *Live*: `$23` went from 8 to `$1C` in 20 paused
  frames.
- The music steps on the frames that the era's tempo mask allows
  (`music_play`, `$BCEE`): mask 1 plays every other frame, 3 three in
  four, 7 seven in eight, `$FF` all but one in 256.

## Controls

- Joystick in either port: `main_loop` ANDs `$DC00` with `$DC01`.
- Button, pressed (`play_button`, `$361D`): at a mansion door, opens it
  (`door_check`, `door_use`); carrying something, drops it; touching
  something that can be carried (`obj_anim` bit 7), picks it up; with
  nothing to pick up and facing left or right, fires a bolt (object
  `$11`). On the time machine's controls each press moves the lit year
  on (`controls_pass`, `$11C1`) and the stick pulled down leaves.
- Button held for 128 passes (2.56 seconds): the gnome goes to the
  closet, era 2 room 9 (`play_state`, `$34B0`). There, held for 60 passes,
  it takes him back to where he was (`closet_pass`, `$116A`;
  `closet_leave`, `$11A3`).
- F7 pauses and resumes (`keys_read`, `$38FF`); pausing silences the
  SID. *Live*: F7 set `$AF` from `$FF` to 0 and back.

## Graphics

- Each era has its own character set, packed, unpacked to `$F000` on
  arrival (`era_load_charset`, `$3456`); the gold rush and Salem have two
  each, one for the street and one for the caves or houses.
- A room is one packed screen of 960 cells, 24 rows, with a five-byte
  header of three background colours and two colour-RAM values; bit 7 of
  a cell picks the second colour (`room_draw`, `$39A1`; `unpack`,
  `$3B2C`). The screen is in 24-row mode (`$D011` = `$17`), so row 24 is
  never seen. Four rooms of Persia's cave share one screen, as do three
  of the stone age's caves and three of the spaceship's corridors.
- The controls (mansion room 4) are text in the character ROM's letters,
  single colour. Their packed screen has no end marker at 960 cells and
  runs 11 cells on into row 24, which the border hides. *Live*: the
  screen showed rows 0-23 and row 24 held `0E 7F 00 0B 02 06 03 7B 19 19
  7F`.
- An empty room (`empty_screen`, `$41A5`, a header byte with bit 7 set)
  fills the screen with character 0 on black. The black hole's first
  room is one, so it is black but for its sprites. *Live*: entered from
  the play snapshot, the screen held `$00` throughout and the background
  was black.
- Sprites: slot 0 is the gnome, slots 1-7 the world objects of the room
  (`sprite_alloc`, `$A0FE`). A frame is copied into the slot's buffer at
  `$EC00` + 64 × slot (`sprite_draw`, `$A185`), in rows of 1, 2 or 3
  bytes as `obj_flags` says. The gnome facing the other way and the horse
  facing left are mirror images built by the start-up (`sprites_build`).
- The machine's lights, the portal's colour, the sword, the staff and the
  spaceship's background and lights change colour every pass or two, from
  random numbers (`rnd`, `$3D78`).

## Mechanics

- **Eras.** The era is `$2A` (1 the mansion, 2 the gold rush, 3 the black
  hole, 4 Persia, 5 the stone age, 6 Greece, 7 the spaceship, 8 Salem, 9
  the throne room), the room `$19`. Each era's record (`era1_record` ...
  `era9_record`) names its per-pass routine, its room-entry routine, its
  character set, its tune and tempo, where the gnome starts and its rooms'
  screens. `switch_room` (`$387D`) jumps through the table after each of
  its nine calls.
- **Travel.** The time machine (mansion room 3) works once the missing
  part (object `$15`) sits at x `$6F`, y `$4B` (`machine_button`,
  `$1311`). The part appears on the living room's table when a bolt
  lights the log in the fireplace (`living_room_pass`, `$11F3`). The year
  chosen on the controls (`$8C`, 0-6) plus 2 is the era
  (`machine_countdown_over`, `$10E4`). Every era has a way home: a door,
  an edge or a ladder that jumps to `go_home` (`$1102`) or
  `drop_and_go_home` (`$10FF`).
- **Portals.** In the nine rooms of `portal_table` a portal (object
  `$1B`) opens for 16 counts of `$91`, which counts every 64 passes,
  closes for 60 and opens again. Touching it sends the gnome to the
  table's era (`$35B5`, `portal_show`).
- **Hazards** send the gnome home, not to his death: the bat
  (`gnome_hurt`, `$3378`), the snake, Medusa's shot, Persia's cave pit,
  the moon's air running out (which puts him back in the spaceship).
  There is no count of lives anywhere.
- **The closet.** Era 2 room 9 (`closet_pass`). The gnome cannot leave
  while five or more objects lie there, counting each piece of the
  scripture (objects `$04`-`$0A`, `obj_anim` bit 6) as five; so it holds
  four objects, and never a piece.
- **The pieces and the end.** Each era but the mansion holds one piece of
  the scripture. All seven brought to the black hole (`hole_pass`,
  `$184E`) drift into place and the gnome is shown the message, "The
  Daimyo Carries The Staff" in mirror writing (`hole_message_screen`), for
  6 counts of `$BD` the first time, one more each time after, up to 15
  (`hole_room_entry`, `$181C`). After that the flute raises the snake in
  Persia for good (`$1BE6`), the risen snake carried becomes the staff
  (`snake_to_staff`, `$1CF3`), and carrying the staff into room 8 of the
  cave ends the game in the throne room, era 9 (`persia_cave`, `$1E9E`;
  `throne_room_entry`, `$1F99`).
- **The broom.** Salem's flying broom (`salem_broom`, `$3111`) rests at
  height `$61`. Up starts a hop and down a dip that slow and return
  (`broom_height`, `$320F`, with the pulls in `broom_pull`); with the
  stick at rest it wanders by itself (`broom_wander`, `$30CA`).
- Each era's puzzle is described in its routines' comments: the gold rush
  `$138D`-`$1800`, the black hole `$1801`-`$1926`, Persia
  `$1927`-`$1FED`, the stone age `$1FEE`-`$22EC`, Greece `$22ED`-`$27D7`,
  the spaceship `$27D8`-`$2C79`, Salem `$2C7A`-`$328E`.

## Data tables

- `obj_start_table` (`$0909`): era, room, x, y of each object at the
  start, three bytes for objects 4-`$6C`.
- `portal_table` (`$0A44`): nine portals, five bytes each.
- Era records `$0A76`-`$0B39`, found through `era_offsets` (`$0BA8`).
- `box_list` (`$0B3A`): 27 rectangles; `trapezoid_table` (`$3CDE`): 21
  floors.
- Object tables at `$A220`: colour and flags, animation, frame size,
  height, width, frame address.
- Overlaps the program relies on: `era_offsets`' first byte is also room
  3's entry in `mansion_door_index`; its last two are era 0's entry in
  `era_name_ptrs`. `go_home` (`$1102`) is the last two bytes of the
  `jsr` at `$10FF`.

## Sound

Register census (`kit/cpu/census.py`, 124 instructions, 39 registers):

| Register | What the game does with it | Where |
|---|---|---|
| `$0001` | banks the ROMs out (`$35`) | `start` |
| `$D000`-`$D001`, `$D010` | sprite positions, through slot 0's registers indexed | `sprite_set_x`, `sprite_set_y` |
| `$D011` | screen on and off, 24 rows | `screen_off`, `start` |
| `$D012` | raster interrupt line `$6E`; waits for lines | `start`, `wait_raster`, `irq` |
| `$D015` | sprites on and off | `sprite_alloc`, `sprite_free`, the throne |
| `$D016` | multicolour on, off on the controls | `start`, `controls_entry` |
| `$D017` | double height: the ladder, the staff | `machine_room_entry`, `room_enter`, `play_state` |
| `$D018` | the era's character set, or the ROM copy for text | `start`, the credits, `controls_entry`, `travel_state`, `room_enter` |
| `$D019`, `$D01A` | raster interrupt | `start`, `irq` |
| `$D01B` | sprite priority | `room_enter` |
| `$D01C`, `$D01D` | multicolour and double width per object | `sprite_object` |
| `$D01E` | sprite collisions: read once a pass, and once on entering a room to clear it | `main_loop` (`$397A`), `room_enter` (`$3AD0`) |
| `$D020`-`$D023` | border and backgrounds: room headers, black screens, the flashing while the time machine runs, the spaceship's twinkles | `room_draw`, `screen_black`, `mansion_pass`, `ship_common`, `travel_state` |
| `$D025`, `$D026` | sprite multicolours, orange and white | `sprites_build` |
| `$D027`+ | sprite colours, indexed | `sprite_object`, `play_state` |
| `$D400`-`$D406` (voice 1) | sound effects | `sfx_play` |
| `$D407`-`$D414` (voices 2, 3) | music, indexed from `$D400` | `music_next_note` |
| `$D40E`, `$D40F`, `$D412` | voice 3 set to noise at full frequency at start-up; nothing reads its output (`$D41B`) | `sprites_build` |
| `$D418` | volume 15 | `start`, `sid_clear` |
| `$DC00`-`$DC03` | joysticks and the keyboard | `main_loop`, `keys_read` |
| `$DC0D`, `$DD0D` | CIA interrupts masked | `start` |
| `$DD00` | video bank 3 | `start` |

No instruction touches the filter, pulse widths, the CIA timers, the
light pen or the paddles.

- **Effects** (`sfx_play`, `$BB51`, once a pass): one channel, on SID
  voice 1, so a new effect is dropped while one plays (`sfx_start`). Seven
  effects, scripts of one-byte commands (`sfx_script`, `sfx_handlers`):
  pitch, waveform, fade, wait, slide, loop, warble. Commands 9 and `$A`
  do the same thing: the amount each loads is overwritten before use,
  because the routine subtracts the frequency's low byte from itself
  (`sfx_cmd_warble`, `$BB82`).
- **Music** (`music_play`, `$BCEE`, from the raster interrupt): two voices
  on SID voices 2 and 3, triangle wave, each note starting at sustain 7
  and fading a level every fourth step. Eight tunes (`tune_table`),
  pairs of note and length. A voice's first pair is skipped when the tune
  starts and played when it repeats: in most tunes a rest, so the pause
  falls between repeats. Tunes: 0 Salem, 1 the gold rush, 2 Persia and
  the flute put down, 3 the mansion, the black hole and the throne, 4 the
  spaceship, 5 the stone age, 6 the flute played, 7 Greece.

## Strings

`kit/cpu/strings.py`: the credits (`credits_text`, `$0FA9`), the era
names (`era1_name` ... `era8_name`, `$0BC2`), the controls' screen
(`controls_screen`, `$40AA`, packed, so it reads in pieces) and the two
leftovers under Build. "GRATULARI!!!!!" on the throne room's screen and
the black hole's message are drawn in each room's own characters, so they
are not text.

## The listing's error rate

One sample, seed 20261031: 80 of the listing's 570 comments, in two
strata, 60 of the 391 written by hand and 20 of the 179 a script wrote
from the object tables (the sprite frames and the packed screens). A
checker, a fresh agent on claude-opus-5-5 that wrote none of them, marked
14 wrong in a detail, and each was read again against the code and
upheld: 12 of the 60 hand-written (20 %, Wilson 95 % interval 11.8 % to
31.8 %) and 2 of the 20 generated (10 %, 2.8 % to 30.1 %); weighted by
the strata's sizes, about 17 % of the comments, well over the mark of 2
in 60. The hand comments had a band of movement one line short at each
end (`gold_pass`, `$14EB`, keeps the gnome to y `$89`-`$99`;
`salem_street_band`, `$2DDE`, to `$8F`-`$94`); counts of callers that left
out the jmps (`sprite_alloc`, 69, not 66) or a caller
(`gnome_keep_inside`, `$3DD9`, runs in the gold rush's closet too;
`salem_land`, `$2C8B`, in room 3 too); what four pla take off the stack
(`gold_change_room`, `$1623`: one return address and the two bytes
`gold_pass` pushed, not two return addresses); a condition taken for
always (`gold_room_entry`, `$138D`, sets the horse to `$19` only on the
first arrival; `snake_shown`, `$1BE6`, leaves `$B7` bit 2 set unless `$BD`
is 0; `greece_pedestals`, `$24B6`, lights a candelabra the bolt hits while
the pedestal holds one, whichever it hits); the keyboard rows `keys_read`
(`$38FF`) selects; the state `jump_state` (`$399E`) is in during a trip in
time; and the routines that build frames below `$0700` (`obj_gfx_hi`,
`$A4BE`). The two generated comments gave a frame's height as
`obj_height`, the size `sprites_touch` tests, where `sprite_draw` copies
`obj_size` bytes in rows of the width, so 21 rows for the ladder, not 24,
and 17 for the woman, not 18. All 14 are corrected, the template's 89
comments with them, rewritten from the tables by the script that wrote
them, and with them the comments that held the same beliefs:
`gold_doors` (`$1574`), `gnome_hurt` (`$3378`) and `salem_change_room`
(`$2E6D`) on what they pull off the stack, and `object_pick_up` (`$3BC8`),
five callers, not four. The rate is a lower bound: a checker misses some
of what is wrong. The run made no audit of every comment.

## Live tests

- Pace: from `work/play-mansion.vsf`, non-stopping checkpoints on
  `main_loop`, `irq` and `music_play` over 500 frames: 499 hits each.
- Pause: F7 held for 10 frames toggled `$AF` from `$FF` to 0; `$23` kept
  counting while paused; F7 again set it back to `$FF`.
- The controls: era 1, room 4 entered through `era_enter` from the play
  snapshot; screenshot shows the text screen with rows 0-23; `$FBC0`
  held 11 cells of other data.
- The black hole: era 3, room 1 entered the same way; the screen RAM held
  character 0 everywhere and the background was black.
- The closet: from the play snapshot, the gnome in mansion room 5 with the
  torch and three other objects held the button 60 frames and left; with a
  fourth object he stayed; with the torch and one piece of the scripture he
  stayed too, as a piece puts `closet_pass`'s count at five.
- The lid: with the lid (object `$35`) in sprite slot 7, as at the start,
  putting it back against the basket moved the scorpion (object `$0B`)
  from x 50, y 156 to 30, 107; with the lamp in the room the lid had slot
  6, and Salem's piece of the scripture (object `$0A`) moved from 44, 110
  to 30, 107. The lid as it lies at the start, on the basket, never
  touches it (`sprites_touch` at `$1CBD`, no hits): only a lid taken off
  and put back runs `persia_lid`.
