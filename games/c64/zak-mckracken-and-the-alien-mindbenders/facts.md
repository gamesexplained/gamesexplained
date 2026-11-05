# Zak McKracken and the Alien Mindbenders — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

- Three disks of the original release: a boot disk and both sides of
  the game disk (`orientation.md` names the files and their SHA-256).
  The boot disk's `BOOT` loads `AA`, 39,938 bytes at `$0400`-`$9FFF`,
  which is the whole program: the script interpreter, the actors, the
  screen, the disk, the input and the sound.
- The game itself is the SCUMM scripts on the two sides: programs for
  the interpreter, read from the disk as they are needed. They are not
  in the listing, which covers the 6502 program (`game.json`,
  `coverage.virtual`). Measured from the two sides with the resource
  index the game reads (below): 151 global scripts of 50,590 bytes, 757
  object records of 56,498 bytes (each object's name, its verb table and
  its verb scripts), and the rooms' entry and exit scripts, 101 of them,
  about 9,800 bytes (their ends are not stored; each is counted to the
  next part of its room).
- Each side says which it is in the first byte of track 1, sector 0:
  `"1"` or `"2"`. `check_game_disk` ($0B44) treats `"0"`, `"1"` or `"2"` there
  as one of the game's own disks.

## Memory layout

| Thing | Where |
|---|---|
| zero page: the pointers, the message's state, the frame counters, the random number's shift register ($CA-$CC) | `$0000`-`$00FF` |
| the room picture's stream decoder, in the stack page for speed (decode_start) | `$0100`-`$019A` |
| the message being put together | `$0200` |
| the disk's sector buffer (disk_byte) | `$0300`-`$03FF` |
| start-up, restart and the main loop | `$0400`-`$0611` |
| the sentence, names and messages' numbers | `$0612`-`$0A52` |
| save and load | `$0A53`-`$0B65` |
| the raster interrupts: one above the picture, one where it starts, two for each of the actor sprites' bands, one below it, one at the bottom of the frame | `$0B9B`-`$1362` |
| walking, walk boxes, costumes and actor drawing | `$1479`-`$2189` |
| the keyboard and joystick | `$1BAF`-`$1D8B` |
| messages | `$21BA`-`$234C` |
| masking and the flashlight | `$2673`-`$28E9` |
| rooms: entering, loading, the objects | `$28EA`-`$3610` |
| drawing a room a column at a time, scrolling | `$3610`-`$3A5C` |
| the disk: seeking, reading, writing, the serial bus | `$3A5D`-`$3CDE` |
| the sound engine and the music's state | `$3CDF`-`$44F9` |
| the heap: allocation, compaction, throwing resources out | `$4502`-`$4BE5` |
| the interpreter: slots, operands, the opcodes' handlers | `$4C2F`-`$61F0` |
| the game's variables and tables, among them the inventory (`$679D`, 60 slots), the object table (`$6B47`, an owner and a state for each of 775 objects) and the resource index (`$6E4E`) | `$6214`-`$77D4` |
| the resource heap: rooms, scripts, costumes and sounds | `$77D5`-`$C7FF` |
| the music player, when opcode `$AB` has loaded it (op_music_memory) | `$C300`-`$C7FF`, the heap's top five pages |
| two screens for the room, drawn one while the other shows; the camera's code | `$C800`, `$CC00`; `$CAD0`-`$CBC8` |
| RAM under the I/O chips: the opcode tables, the mirror table, the sprite row tables, the heap's entry points, the resource loader, the iris, the random numbers | `$D000`-`$D7FF` |
| the room's character set, decoded from the room | `$D800`-`$DFFF` |
| the actors' sprites, two buffers of four sprite columns | `$E000`-`$EFFF` |
| the cursor's shapes, the interface's 28 slots and its code | `$F040`-`$F709` |
| the interface's character set | `$F800`-`$FBFF` |
| variables under the KERNAL: the script variables (low bytes at `$FE6E`, high bytes at `$FD6F`), the 13 actors' tables, the heap's list | `$FC00`-`$FFF9` |

All the ROMs are banked out in play; `$01` is `%100` and becomes `%101`
around each access to the chips (`orientation.md`). The hardware
vectors are the game's: IRQ `$0C1C`, NMI `$1479`, an RTI, so RESTORE
does nothing.

## Timing

- The frame interrupt (frame_irq, `$117C`) runs at raster line `$FB`,
  once a frame, at the end of a chain of raster interrupts that starts
  at line `$29` (arm_raster_chain, `$0B9B`). It counts the frame counters
  `$C6` and `$1F`, shows the frame the main loop has finished, counts the
  timers and the scripts' delays down, reads the joystick and keys,
  moves the cursor and plays the sound.
- The main loop (`$0524`) makes one pass, then waits until variable 25's
  number of frames have passed since the pass began (`$C6`): that is the
  game's speed. In Zak's bedroom variable 25 is 6, and the loop made 100
  passes in 600 frames (*live*).
- While the disk is read, busy_cursor (`$13DA`) sets bit 0 of `$116F`,
  which stops the timers and the cursor's colours. While a room is
  entered, video_off (`$13F3`) turns the picture and the interrupts off
  until video_on (`$142F`), so the frame interrupt stops too: it ran
  6,354 times in 7,780 frames of the opening (*live*). video_off does
  nothing while the music plays, so the music goes on through a change
  of room, with the picture left on.
- The idle count (`$FC20`/`$FC21`) is set to 18,000 frames by read_keys
  (`$1BAF`) on any joystick move or press, and while a cut-scene runs. Keys
  do not set it (*live*). When it reaches 0 read_keys files a space, and
  the game pauses with "Game paused, press SPACE to continue." (*live*).
  18,000 frames is 6 minutes on a PAL machine and 5 on an NTSC one; the
  manual says 5.
- A message stays for a base time of 30 frames (`$BA`/`$BB`, init_game)
  plus the speed (`$BC`) for every letter. The speed starts at 6; `+`
  takes one off, to 0, and `-` adds one, to 10 (change_message_speed,
  `$23D0`; three presses of `+` took it from 6 to 3, *live*).
- The cursor's colour steps through six greys at `$1167`, one step every
  seventh frame (`$1163`, reloaded with 6).

## Controls

- A joystick in port 1 moves the cursor and its button clicks (read_joystick,
  `$1CE0`); port 2 is not read (*live*).
- The cursor has weight: each frame its speed dies away by its own value
  shifted right by `$F1A1`, the joystick pushes it, and it moves by the
  speed (move_cursor, `$F5F5`). The push and the dying away depend on the
  kind of slot under it (set_cursor_feel, `$F5AE`, from `$F1B4`). It runs
  from X 0 to 159 and Y 16 to 191, and stops with its speed cleared at
  the edges, except at the top, where it is held at 16 with its speed
  kept.
- The keyboard is read through the key table at `$1CF8`: the space bar
  pauses (handle_key, `$234D`), `+` and `-` change the message speed, the
  cut-scene key, whatever variable 40 holds (13, RETURN, in the bedroom),
  skips a cut-scene that has an override, and every other key goes to the
  scripts as variable 39. F1, F3, F5 and F7 give 1 to 4; the scripts,
  not the program, choose what each does. Two keys at once are read only
  when one is a shift key, so a shifted function key reaches the scripts
  too (read_keys).

## Graphics

- The picture is multicolour text: the room's own character set, 256
  characters decoded from the room into `$D800`, and 40 columns by 16
  rows of the screen being shown (raster_room, `$0D15`). Below it, from
  line `$C3`, the interface is hires text from the screen at `$CC00` and
  the character set at `$F800` (raster_interface, `$1102`).
- A room is stored as four streams, its characters, its colours, its
  mask and the mask's characters, each packed in runs (decode_byte,
  `$0122`: below `$40` a count of bytes as they are, `$40`-`$7F` a byte
  repeated, `$80` and over one of the stream's four commonest bytes
  repeated). build_column_index (`$38D9`) decodes all of it once and keeps
  where each column starts, so that when the room scrolls by a column
  only the new column is decoded (draw_room, `$3610`).
- The room is drawn on the screen that is not showing, and the frame
  interrupt swaps the screens when the drawing is done (swap_screens,
  `$063A`).
- The actors are sprites: four sprite columns, each made of the sprites
  0 to 3 moved down the screen by the raster interrupts, seven bands of
  21 lines, with each band's sprite pointer changed as it passes
  (`$0C1C` to `$10AE`). The column is 137 rows tall and three bytes,
  twelve multicolour pixels, wide. Four actors at most can be on the
  screen; a fifth is fatal error 13 (assign_sprites, `$3491`). The
  sprites are sorted so that the actor nearest the front gets the lowest
  hardware sprite, which the video chip draws in front.
- An actor is drawn limb by limb, eight limbs, each a picture packed in
  runs a column at a time; facing left, every byte goes through the
  mirror table at `$D200`, which reverses its four pixels (draw_limb_picture,
  `$1946`). Colour 0 lets what is behind show (the mask table at `$1AA4`).
- An actor standing behind something in the room is masked with the
  room's mask, character by character (mask_actor_sprite, `$2673`).
- The cursor is a sprite of its own: a cross of four arrows (`$F040`),
  or a snail (`$F080`) while the disk is read or the game is paused.
- A room changes behind an iris: a rectangle closing to black from the
  edges in eight steps (`$D60C`), and opening from the middle (`$D615`).
- With the lights out and the flashlight on (bit 2 of variable 12),
  only a patch around the cursor is copied from the hidden screen, where
  the room is drawn in full, to the one shown (flashlight_patch, `$2815`).

## Mechanics

- **The interpreter.** run_script_loop (`$4C58`) fetches each opcode of the
  current script and calls its handler from the tables under the I/O
  chips (`$D100` low bytes, `$D000` high). The 256 opcodes have 110
  handlers between them, most taking their operands as a byte or a
  variable by bits 7, 6 and 5 of the opcode. Scripts run in 20 slots,
  1 to 19 free for scripts (find_free_slot, `$4DD5`), each until it yields;
  run_all_scripts (`$4C2F`) runs every running slot once a pass. A slot
  runs a global script, a room's entry or exit script, or an object's
  verb script (find_script_base, `$4CCA`).
- **Variables.** Script variables are 16 bits, the low bytes at `$FE6E` and
  the high bytes at `$FD6F`; variables 14, 15 and 16 are indirect (read_var,
  `$4EE5`). Bit variables are sixteen to a variable (decode_bit_var, `$5555`).
  Variable 0 is the actor the player controls, 4 the room, 12 the lights,
  13 the disk side in the drive, 25 the speed, 39 the key pressed, 40 the
  cut-scene key.
- **Sentences.** A sentence is a verb and up to two objects. A click on an
  object runs the verb script the object's record holds for the verb;
  sentences can wait in a queue (op_do_sentence, `$5923`; run_verb_script,
  `$59CD`).
- **Objects.** Each of the 775 objects has an owner and a state in the
  table at `$6B47`, read from the disk at start-up. An object owned by an
  actor is looked for in the 60-slot inventory at `$679D`, one whose owner
  is 15 among the shown room's objects (find_object, `$0767`). find_object
  returns 0 in A for an inventory object, 1 for a room object and `$FF`
  when it finds neither, with the slot or index in Y.
- **Rooms and the heap.** Rooms, costumes, scripts and sounds are loaded
  into the heap (`$77D5`-`$C7FF`) when they are needed, with a best-fit
  allocator (find_free_block, `$4699`). When nothing fits, the heap is
  compacted and resources are thrown out, a kind at a time: the room
  longest unshown, a costume, every sound, every script that is not in
  use or locked (free_some_resource, `$497D`). Each room keeps a count
  (`$7344`): 0 while it is shown, then one more every time a room is
  entered (load_room, `$2A96`). In Zak's bedroom only room 1 is in memory,
  with 16 global scripts, 3 costumes and 20 sounds.
- **The disk.** The game sends the 1541 a program of its own at start-up
  (send_drive_program, `$7C59`) and then reads whole sectors through it,
  two bits at a time on the serial bus (`$3BF8`-`$3CDE`). Every resource
  lives inside a room's file, which runs on from the room's first track
  and sector over the sectors that follow (find_room_on_disk, `$2FCF`;
  next_sector, `$3B38`). A wrong side in the drive brings up "Put in side
  N and push joystick button." (ask_for_side, `$300B`).
- **Saving.** save_game (`$0A53`) refuses one of the game's own disks, then
  writes the mark `$5A` at track 1, sector 0, the script variables at
  track 5, seven bytes of zero page at track 6, the verbs at track 7 and
  everything from `$679D` to the top of the heap, 97 sectors, from track
  8 on. Writes go a whole sector at a time, so each piece is rounded up
  to 256 bytes from its address.
- **Cut-scenes.** op_cutscene (`$5AE3`) hides the verbs, the inventory and
  the cursor and freezes the other scripts; the cut-scene key sends the
  script that began it to its override, if it set one (handle_key).
- **Fatal errors.** A fatal error keeps its code in `$C9` and changes the
  border colour for ever (fatal_error_stop, `$4D20`). The codes found in
  the program: 1 a fifth actor in a room, 2 a costume without its `$57`
  mark, 3 a bad read from the right side, 4 the heap full, 6 a room with
  no place on the disk, 7 a costume picture too wide, 8 a slot of an
  unknown kind, 9 no free slot, 10 no free inventory slot, 11 an object
  that loadRoomWithEgo cannot find, 12 opcode `$6B` or `$EB`, 13 a fifth
  actor sprite on the screen.

### Bugs in the program

- **walkActorToObject, putActorAtObject and loadRoomWithEgo** (`$57F1`,
  `$580D`, `$548D`) test find_object's Y for `$FF` instead of its A. An
  object in an inventory is found with Y its inventory slot, and the
  walk-to point is then read from the room's object tables at that index
  (`$08D8`): the actor walks to whichever room object sits at that index.
  In a room with no objects find_object leaves Y at 0, so the walk goes
  to room object 0's point.
- **getActorX and getActorY** (`$5C99`, `$5CB2`) take an actor with no
  walk slot's position from its own tables, `actor_x` (`$FFB7`) and
  `$FFAA`, indexed by Y, which holds the slot, `$FF`, instead of by X,
  the actor: the addresses wrap round to `$00B6`, the message flag, and
  `$00A9`.
- **disk_write** (`$3AD1`) has a "Disk Error" and a retry for a sector the
  drive will not take, but bus_write_sector (`$3BCB`) always returns with
  the carry clear, so a failed write is never noticed.
- **setup_sprites** (`$8132`) writes 0 to the sprite collision registers
  `$D01E` and `$D01F`, which can only be read: the writes do nothing.
- **The inventory's scroll** (redraw_inventory, `$F380`) is held at the
  count less four rounded up to an even number, so with an odd number of
  items the last scroll shows three items and a blank.

## Data tables

| Table | Where | What |
|---|---|---|
| resource index | `$6E4E`-`$72BE`, 1,137 bytes read from side 1, track 1, sector 0, byte 2 on (restart, `$0418`) | the 59 rooms' sides (`$6E4E`, `"1"` or `"2"`) and first sectors (`$6E89`, a sector and a track for each); for the 38 costumes (`$6EFF`), 155 global scripts (`$6F71`) and 127 sounds (`$7142`) the room each lives in, and its offset in that room's file (`$6F25`, `$700C`, `$71C1`, a sector count and a byte) |
| object table | `$6B47`, 775 bytes | each object's owner (the low four bits, 15 a room) and state |
| sectors per track | `$3B51` | the last sector of each track, as on a 1541 disk |
| key table | `$1CF8`, two halves of 64 | the key each position of the keyboard matrix gives, unshifted and shifted |
| cursor colours | `$1167` | white, light grey, grey, dark grey, grey, light grey |
| iris | `$D60C`, `$D615` | the closing and opening rectangles, their steps and how many |
| mirror table | `$D200` | each multicolour byte with its four pixels reversed |
| mask table | `$1AA4` | each multicolour byte's mask, `%11` where a pixel is colour 0 |
| sprite rows | `$D310`, `$D3B0` | where each of the 144 rows of a sprite column lies in the bands' sprite blocks |
| interface slots | `$F0D9`-`$F1AB` | the 28 slots' rows, columns, numbers and kinds: 20 verbs, the room, the sentence line, four inventory items and two arrows |

On the disk (counted from the two sides through the index, `$6E4E`):
58 rooms in 223,836 bytes, their objects and room scripts among them;
151 global scripts; 37 costumes; 122 sounds and tunes. The entries for
scripts 56, 57 and 154 and for sounds 0, 3, 4, 5 and 125 point inside
other resources or at bytes that are no resource's header; sounds 3, 4
and 5 are built into the program at `$4406` instead.

## Sound

- The sound engine (`$3CDF`-`$4460`) plays sound resources on the SID's
  three voices. A sound's first byte is its priority (bit 7: it may wait
  for a voice) and its second the parts it has: one to three voices, a
  part for each voice's pulse width and one for the filter. A sound that
  finds no free voice stops the playing sound of lowest priority if its
  own is as high; otherwise it waits, if it may, or is refused
  (begin_sound, `$3CDF`).
- Every frame, sound_frame (`$3FE0`, from the frame interrupt) writes
  every channel's values to the chip, calls the music's code at `$C395`
  while music plays (`$43E8`), starts the sounds waiting and steps each
  channel through its commands (step_channel, `$414E`; next_command, `$419B`).
- The music is a program of its own: sound 1, 1,078 bytes of 6502 code
  and tables, which opcode `$AB` loads to `$C300` at the top of the heap
  (op_music_memory, `$6183`). startMusic (`$57A5`) loads the tune's sound
  and calls `$C304` with its number; from then on `$C395` runs each frame.
  The music plays its three voices as sounds 3, 4 and 5, built into the
  program (`$4406`, `$4433`, `$4460`), rewriting each one's instrument
  and pitch for every note and starting it through the engine. With all
  three voices taken by the music, no sound effect can start (begin_sound).
  Live: tune 95 started at frame 7,780 of the opening, the channels'
  sounds read 3, 4, 5, 0, 3, 4, 5, 16 (`$4375`-`$437C`), and the music
  stored 283 times into the three sounds in 300 frames, with a stop on
  one of those stores at `$C506`, in the music's code (*live*).
- There are four tunes, sounds 95, 102, 103 and 104, of 2,843, 1,769,
  1,442 and 1,118 bytes, all in room 47's file beside the player. A
  search of the scripts' bytes for startMusic (`$02`) with each tune's
  number finds 95 in global scripts 1 and 48, 102 in 48 and 149, 103 in
  78 and 135, and 104 in script 128 and an object of room 25; that is a
  search of the bytes, not a decoding of the scripts.

## The listing's error rate

A sample of 60 of the listing's 947 comments, drawn with seed 1105
(`kit/scripts/sample.py`), was checked by gpt-6-astra at medium effort
through Codex. It found 11 wrong in a detail, and each was read against
the code and held: 18 %, with a 95 % interval of 10.6 % to 29.9 %
(Wilson). The kinds: a count that was off by one (a search starting at
slot 21 instead of 20, a step every sixth frame instead of every
seventh); a disk's places named as blocks where they are tracks; a
claim made for every case that held for most (the registers kept by
"each raster interrupt", a routine run "once a pass" that is skipped in
room 0, a scroll limit "at most four fewer"); a condition read as
stronger than the code tests (an object "in the room" where the code
only checks it was found anywhere); a retry the code can never reach; a
write to read-only registers described as doing something; and an edge
of the screen where the cursor keeps its speed. All 11 were corrected,
with 25 other comments that said the same things (the routines skipped
in room 0, the save disk's tracks, the two other object opcodes with
the same test). The rest of the listing has not been audited.

## Live tests

Each in VICE 3.14 (x64sc), from `work/play-bedroom.vsf` unless named,
with the scripts in `work/verify/`:

- The idle count fell by 300 in 300 frames, as frame_irq ran 300 times;
  three presses of `+` took the message speed from 6 to 3 and the count
  kept falling; at 0 the game paused with "Game paused, press SPACE to
  continue." on row 18; space brought back "Walk to", with the count at
  18,000 less 64 (`t_idle.py`).
- From the side 1 prompt through the opening: tune 95 started at frame
  7,780, its channels and stores as under "Sound", and frame_irq ran
  6,354 times in those 7,780 frames (`t_music4.py`).
- The main loop made 100 passes in 600 frames in the bedroom, with
  variable 25 at 6 (`t_speed.py`).
- The cursor moves with a joystick in port 1 and not in port 2; the
  sentence line names each object as the cursor passes over it
  (`work/scripts/t_joy.py`, `t_cur*.py`).
