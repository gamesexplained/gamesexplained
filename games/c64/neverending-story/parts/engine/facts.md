# The engine — verified technical facts

The program that stays in memory from the opening to the end: the
opening and its tune, the play screen, the line editor, the text
printer, the parser, the script interpreter, the resident scripts and
the game's state. Every address here is the engine's, in its
`listing.json`; how the engine reads a part's tables, and how the parts
follow one another, is in the game's own `facts.md`. Unless marked
*live*, a fact comes from the code in `work/opening.vsf`, stopped in
the opening's wait for a key ($0552, inside the KERNAL's GETIN) with
the whole game unpacked and the title tune playing. Live tests are listed in the game's
own `facts.md`.

## The opening

- `OPENING_SETUP` ($069B) masks interrupts, sets $01 = $06, calls the
  KERNAL's IOINIT and SETMSG with 0 (no messages), stops CIA 1's timer
  A, copies zero page $02-$FF, as the KERNAL left it, to $A002-$A0FF for
  the loads to swap back in ($053C), points the
  IRQ vector at $A880, turns on the raster interrupt and selects VIC
  bank 3 and the text screen at $CC00. With $01 = $05 it stops and
  starts the tune ($96A1, $96DA).
- The screen at $CC00 already holds the title and the credits when the
  game is unpacked, the characters $1580 then prints again after
  `OPENING_SETUP` has cleared the screen ($06F8).
- $1580 prints the title, in large letters made of pairs of the game's
  own glyphs (from $B786), and the credits (from $B85D), with pointers at $B780/$B782 and
  lengths at $B784/$B785; waits for a key ($0552); stops the tune
  ($15CC) and calls $070F.
- $070F copies the loader from $C000-$C1FF to $9700-$98FF ($0730) and,
  with $01 = $05 to read the RAM under the KERNAL, the backdrop from
  $E000-$EF9F to $BC00-$CB9F ($0743),
  repaints the play screen from that copy ($07A2) and points the IRQ
  vector at the play screen's raster split, $A7E0.

## Graphics

- The top ten character rows are a multicolour bitmap at $E000 with
  screen bytes at $CC00 and colour at $D800 (VIC bank 3, `$D018` = $38);
  the rest of the screen is text in the game's own character set at
  $F800 (`$D018` = $3E). Both phases are set by the raster interrupt
  ($A7E3, $A80A).
- The band holds the backdrop, a sunset over the Ivory Tower, then the
  room's picture on the left and the carried objects' icons on the
  right. `RENDER_ROOM_GRAPHICS` ($0570) restores the backdrop from the
  copy at $BC00, draws each icon record at $2943 and then the room
  picture.
- A picture record ($0BF9) gives the row, column, source address,
  height and width in character cells; its data runs row by row, each
  row width×8 bitmap bytes, then width screen bytes, then width colour
  bytes, so a picture is height×width×10 bytes (`BLIT_ROOM_GRAPHIC`
  $05BF).
- An icon is 4×4 cells, 160 bytes, in the same layout, at $A560 + 160 ×
  its slot (`CALC_OBJECT_GRAPHIC_PTR` $0F70). Five icon records follow
  the carried objects ($0F3A) and the sixth is the scripts' own, for
  Artax or Falkor (`SCRIPT_SET_OBJECT_GRAPHIC` $113D).
- A room description starts with a drop capital two cells high, glyph
  $7B + 4 × (letter − 'A') and the three after it ($0957).

## Sound

The only sound is the title tune by Martin Galway, which plays from
the opening until a key is pressed ($15CC calls `MUSIC_STOP`). Play
is silent: nothing writes the SID after the opening.

- The driver ($9680-$9FEE) runs three voices from streams at $F250,
  $F5F3 and $F6BE (`MUSIC_INIT` $96DA). Each stream is notes, rests and
  commands; a command is three bytes (four for the transposed calls),
  through a handler table per voice ($9913, $9BEF, $9E31).
- Voice 1 has a four-phase vibrato and a pulse sweep, voice 2 a vibrato
  and no sweep, voice 3 a sweep and no vibrato ($9931, $99EF, $9C0D,
  $9E4D).
- The tune runs code of its own from its data through command $9C: it
  fades itself in at $F400 and out at $F406, and it flips a note
  between a rest and a pitch at $F495 and $F553 so that two voices
  alternate a harmony.
- Voices 2 and 3 play their broken chords and bass as short patterns
  called at many pitches (`V2_CMD_CALL_TRANSPOSED` $9BE4,
  `V3_CMD_CALL_TRANSPOSED` $9E26).
- The fade-out starts near the end of each pass (frame 10,176 of the
  first) and reaches volume 0 by frame 10,919; the next pass fades back
  in from frame 11,328.

### Register census

From `kit/cpu/census.py` on the engine's opening snapshot. The parts
hold no code.

| Register | What the game does with it | Where |
|---|---|---|
| $0000 | named only by the self-modified JSR operands, $0000 until written | $1641, $1699 |
| $0001 | $06 in play (I/O and KERNAL in), $05 to read the RAM under the KERNAL (the tune, the backdrop); bit 5 clear in both | $069E-$070B, $0741, $075C, $15CA, $15D1, $A882, $A889, $A895 |
| $D011 | bitmap or text mode per band; display off and on around a load | $06E0, $A7EF, $A81A, $04FE-$052A |
| $D012 | raster compare for the three bands; read as the random number | $06CE, $A7F9, $A824, $A837, $0695 |
| $D016 | multicolour on for the picture, off for text | $06E5, $A7F4, $A81F |
| $D018 | $38 picture (bitmap $E000), $3E text (charset $F800) | $06DB, $A7EA, $A815 |
| $D019 | raster interrupt acknowledged | $A801-$A842, $A88D |
| $D01A | raster interrupt on, $F1; $F0 around a load | $06C9, $0508, $0537 |
| $D020, $D021 | border and background colours | $072B, $1587; $0728, $1582, $A7E5, $A810 |
| $D400-$D418 | the title tune's three voices, filter and volume; ADSR through indexed stores | $9680-$9FEE |
| $DC0D | $10 written only by `INSTALL_GAME_IRQ`, which nothing calls ("Code and data nothing reaches") | $A8D8 |
| $DC0E | CIA 1 timer A stopped after IOINIT and again after each load; nothing in the game starts it | $06A8-$06AD, $052D-$0532 |
| $DD00 | VIC bank 3 selected | $06D1 |

No sprite register, no paddle or joystick port and no CIA 2 timer is
named by any instruction. The staged loader's tape remnant (engine
$C022-$C175) names CIA 2's timer B and CIA 1's FLAG interrupt, but it
never runs.


## Code and data nothing reaches

- **Save and load.** `DISK_SAVE_GAME` ($0494) and `DISK_LOAD_GAME`
  ($0461) are whole routines, with a filename prompt ($04C8, sentence
  $43 "Please enter the filename"), that no instruction calls: the SAVE
  and LOAD actions jump to one-byte returns ($1189 to $0491, $118C to
  $045F). They name device 1, the cassette ($050C).
- **Restoring a game at the start.** `ASK_RESTORE_GAME` ($14D9) asks
  "Restore a saved game?" (sentence $2E) and on Y calls the LOAD stub
  ($14F3); `INIT_GAME` ($14D6) jumps over it and nothing else names it.
- **Return to BASIC.** `RESTORE_SYSTEM_TO_BASIC` ($A893) and
  `INSTALL_GAME_IRQ` ($A8CC), in icon slot 5 ($A880-$A91F) beside the
  raster code, are named by no instruction and no pointer.
- **Crucifix.** Icon slot 27 ($B640) is a gold cross on black, and the
  vocabulary has the stem "cru" (noun $5A, object 40, $1C36). The
  noun-to-icon map holds object 0, Auryn, at position 27 ($22BF), and
  `RESOLVE_NOUN` ($15E3) returns the first position that matches, so no
  noun reaches the slot; the scripts' own icon action names only slots
  23 and 24.
- **Picture 49.** Atreyu buried to the waist in rubble (Part 3's set) is
  in no room's entry of `OBJ_ROOM_TABLE` and no script of the engine or
  the three parts shows it.
- **Leftovers.** $9600-$967F and $EFA0-$EFFF hold bytes nothing reads;
  $9FEF-$9FFF hold $0A, six zeros, $44 $0D and the text "/MONITOR". The
  tape loader's remnant at $C022-$C175 is described in the game's
  `facts.md` ("Build").
