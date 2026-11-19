# Turrican — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

- The original Rainbow Arts PAL release, 1990, two disk sides
  (`orientation.md`).
- Sixteen parts: the engine, the title, thirteen levels and the ending.
  Each level and the ending is one packed file on side 2; the game's
  own unpacker (engine `load_file`, $6960) turns each into exactly its
  part's bytes (checked by running it on the 6502 simulator,
  `orientation.md`).
- The title's credits are stored scrambled (title $7F91-$8159): each
  byte EOR $B2, then less a key that starts at $D3 and grows by $17 a
  byte; the title decodes them into $EDC0 at start ($7BAB).

## Memory layout

| Thing | Where |
|---|---|
| The panel's font, screen and layout, read by the video chip in bank 0 | engine $0400-$07FF |
| The engine: main loop, interrupts, hero, scroll, weapons, sound effects, sprite multiplexer, object spawner | engine $0800-$5FFF |
| Loading screen, message sprites (TIME OUT, GAME OVER, CONTINUE), the high-score table | engine $6000-$685F |
| The game's fast loader and unpacker | engine $6960-$6BFF |
| A level's code, charset, blocks, map, objects; or the title; or the ending | $6C00-$C7FF, by part |
| The two play screens, swapped for the scroll; their hidden rows hold object variables | $C800, $CC00 |
| The hero's sprites under the I/O chips (loaded from `FT` by the title) | $D000-$E5FF |
| A level's sprite shapes | $E600-$FEFF, by level |
| Work bytes, the interrupt vectors | $FF00-$FFFF |

A level's header sits at $8CA0: its map size in squares, its name
("1-1" at $8CA2-$8CA4), its own file name ($8CA5) and the next level's
($8CA7). Its object routines are reached through the jump table at
$8DD3, its hooks at $AE01-$AE0C.

## Register census

From `kit/cpu/census.py` on every part. The engine's uses hold in every
level; a part's own extras are named.

| Register | What the game does with it | Routines |
|---|---|---|
| $0000, $0001 | the processor port: BASIC and KERNAL out ($35) for play; all RAM ($34) to copy under the I/O chips | engine `engine_init` ($5523); title $6C48; ending `ending_picture` ($6E6A) |
| $D000-$D010 | sprite positions: the hero (0-2), the multiplexed objects (3-7); a boss level places its own | engine `hero_sprites` ($0D5C), `irq_multiplex` ($5A9A), `irq_top` ($0A15) |
| $D011, $D012 | the raster interrupts' lines, the vertical scroll, the screen blanked for loads; written through mirrors ($D0D1, $D1D1, $D2D2 and others) | engine `irq_top`, `irq_bottom`; every part's own interrupts |
| $D015, $D017, $D01B-$D01D | sprites on, stretched, behind, multicolour | engine; title; ending |
| $D016, $D018 | the horizontal scroll and multicolour; the screen and character set for the play area and the panel | engine `irq_top`, `irq_bottom` |
| $D019, $D01A | the raster interrupt, acknowledged by DEC or INC | engine `irq_entry` ($08CD) |
| $D020-$D023, $D025-$D02E | border, background and sprite colours; the grenade's flash fades the play area's three colours | engine `grenade_flash` ($2FA9) |
| $D400-$D406, $D416-$D418 | written through an index for all three voices: the effects player in the engine, the music players in the title, levels 3-1 and 3-3, and the ending | engine `sound_voices` ($4F3B) |
| $DC00, $DC01 | joystick port 2, the keyboard rows for SPACE, F7 and CTRL | engine `weapon_buttons` ($2CAA), `main_loop` ($08EA) |
| $DC04 | timer A's low byte as a random number, often mixed with bytes of the game's own code | engine `beam_in` ($4BD2), `explosion_sprite` ($4E21); many levels |
| $DC0D, $DD0D | the timer interrupts turned off once | engine `start_raster_irq` ($558B) |
| $DD00 | the video bank, and the serial bus for the fast loader | engine `irq_bottom`, `load_file` ($6960) |

Never named by any instruction: the sprite collision registers $D01E
and $D01F (every collision is worked out from positions and the
characters under them), the light pen, the paddles, CIA 1's and
CIA 2's other timers and their control registers.

## Strings

From `kit/cpu/strings.py` on every part, and the files on the disk:

- The title's hidden message to crackers (title $94A6-$97EF, 842
  characters, read by no code), MR. RETURN ($7CE3), DANN EBEN NICHT !!
  ($923C), and "DTE+DTZ+ACU+MWS+AV IN 1990" ($C610, read by no code).
- The ending's text ($707E-$75B6), in ASCII with lines of 24.
- Level 4-2's file ends with "TUSL.4-2" and "4-2", read by no code.
- The loading tune's player carries "ROMUZAK V6.3 BY OLIVER BLASNIK"
  (boot, $D208); the boot program carries "TRALALA !!"; the spoken
  sample's memory holds the disk command "S:THEMARKUSMONSTER" twice
  ($A0FA, $A30C), played as part of the sample.

## Text and its alphabets

The game uses five alphabets; none needs a substitution table beyond
these rules.

| Alphabet | Codes | Where |
|---|---|---|
| The title's double-width letters | each letter two characters: its left half at its screen code ($00-$3F), its right half 64 further on | title `title_font` ($C000-$C3FF), `title_decode_pages` ($79AF) |
| The title's small font | screen code + $80: letters, digits and signs a cell wide | title `title_font_small` ($C400), the hall of fame's names and scores |
| The loading text's big letters | two characters wide and two high, drawn as pairs of codes one row above the other | engine `loading_font` ($6501), `level_text_codes` ($67D9) |
| The panel's digits | small digits $A7-$B0, big digits two characters high (tops $B1-$BA, bottoms $BB-$C4) | engine `panel_font_b` ($0448) |
| The ending's text | ASCII; a small letter ($61-$7A) is drawn with the font's character 96 lower, as in the machine's lower-case set; carriage return $0D; end $D3 | ending `ending_draw_line` ($6CE1), `ending_font` ($75B7) |

The title's credits are scrambled as well (`title_unscramble`, $7BAB).
The high-score table keeps each name's letters as screen codes, of
which the title takes the low six bits (`title_fame_page`, $7384).

## Timing

- PAL, 50 frames a second. All play runs in the raster interrupts:
  `irq_top` ($0A15) at the top of the play area, the sprite
  multiplexer (`irq_multiplex`, $5A9A), and `irq_bottom` ($0C65) at line
  $DD, which shows the panel and runs the second half of the frame. The
  main program only reads CTRL and runs the main-loop state
  (`main_loop`, $08EA).
- The level's time counts down once every 50 frames (`frame_logic`,
  $0B48): one unit is one second.
- The scroll moves 4 lines or pixels a frame up and down, and by the
  hero's speed sideways, twice as fast as the wheel (`scroll_up`,
  $1306; `scroll_left`, $13BE).

## Controls

- Joystick in port 2: left and right walk, up jumps on a new press, down
  crouches (`hero_move`, $0E94).
- Fire: a new press shoots or fires the laser (`weapon_buttons`,
  $2CAA); held 20 frames standing still brings out the whip
  (`whip_update`, $391B); held 35 frames while crouching lays a mine.
- Down with SPACE: the wheel, three a life (`hero_move`,
  `life_start` $567C). SPACE standing still: the energy lines
  (`energy_lines_start`, $302B). F7: a grenade. CTRL held: pause; fire
  ends it (`frame_logic`).

## Graphics

- Two play screens at $C800 and $CC00 in bank 3: one is shown while the
  other is drawn a third at a time, then they swap (`shift_left_c800`,
  $1AE0). Colour RAM is shifted by code the engine builds into the
  screens' hidden rows (`fill_colour_left`, $CB69).
- The panel is drawn from bank 0 with its own font, switched in by the
  bottom interrupt.
- The hero is two multicolour sprites stacked and a hi-res sprite
  stretched over them (`hero_sprites`, $0D5C). Sprites 3 to 7 are
  multiplexed down the screen for the objects (`irq_multiplex`, $5A9A).
- Bosses are built from five columns of sprites repeated down the
  screen by the level's own raster interrupts.
- A sprite's mode is set per object: bit 0 of `$0259,x` set draws it
  in one colour, clear in multicolour (the multiplexer, `$5AC2`). The
  engine's objects are multicolour; the single-colour ones are level
  1-2's orb and bolt, 2-1's splash, and the bars of 3-2 and 5-1. The
  shared colours are light grey and dark grey (`$576B`; level 1-2
  changes them at `$85C2`).
- The hero walking: sprites 0 and 1 multicolour in the colour at `$0870`
  (red), sprite 2 single colour, stretched to double height, in the
  colour at `$0871` (white). As the wheel: sprites 0 and 1 single colour
  at the same place, white and light blue (`$0DEC`), one shape further
  every frame. With the shield (`$BFFD`) the routine draws the hero on
  every other frame and three shield sprites on the frames between,
  their shapes from `$5BA2` read backwards, each held for three calls,
  white while the timer at `$BFFE` is `$30` or more, then picked at
  random from light blue, white, blue and white (`$5B9E`).
- The hero's last 24 shapes, `$80`-`$97`, lie in the RAM under the
  KERNAL ROM at `$E000`-`$E5FF`: the wheel's last frames, the explosion,
  the bonus symbols, the container, the enemies' bullet and the shield.
  The title's file writes its logo there while the title shows, and
  `FT` puts the shapes back for play.
- Only the first level of each world (1-1, 2-1, 3-1, 4-1, 5-1) loads
  characters (`$C000`), their colours (`$AE10`) and blocks (`$B000`).
  The other levels load a map and objects and keep the first level's
  scenery: in each level's `entry.vsf` the blocks and colours are the
  first level's byte for byte, and the characters differ in at most 65
  bytes, the animated ones.
- The ending: a multicolour bitmap of the tower (`$788F`, screen colours
  `$97CF`, colour RAM `$9BB7`) with eight explosion sprites over it
  (interrupt `$6D7D`, set up at `$6F2D`). All eight step together, one
  of ten shapes every nine frames, then each waits a random time and
  steps every five; after 50 explosions they stop. The first time sprite
  0 shows `$84`, `$6C25` copies five runs of 344 bytes in all over the
  top of the picture.
- The title's logo: 18 runs of bitmap, 2,384 bytes for 11 rows of 40
  cells, built at `$E000` by `$7921`; at line `$88` the title sets
  `$D011` to `$7B`, which the chip draws black, to hide the change from
  bitmap to text (`$6D29`).

## Mechanics

- Energy: seven cells; a touch takes one step every other frame
  (`hurt_hero`, $3FB5). A death takes away a red symbol, 5 from the
  laser and 4 from the whip (`weapons_down`, $5647), and gives back
  three grenades, mines and energy lines (`refill_stock`, $5602).
- Diamonds: 50 points each, a continue for every 300 (`irq_bottom`).
- Bonus symbols: 250 points; red spread, green laser, blue whip, light
  blue shield, yellow P energy, G grenade, M mine, L energy line, 1UP,
  diamond (`bonus_symbol`, $5D6C).
- A grenade makes every object on the screen explode, except in a
  boss's level, where it does 99 damage (`grenade_update`, $2E6C;
  `weapon_damage`, $0720).
- Only a mine's blast sets $0305 negative; the levels' walkers and
  gunners leap off the screen when it does.
- Objects: each level's map is cut into squares of 32 by 32
  characters, each with a list of six-byte records (type, state, X and
  Y in characters) ending with $D3 ($8CAA, $8CCF, $8D51). Each frame the
  spawner reads one of the four squares around the view; an object less
  than 44 columns right of the view's top left corner and less than 23
  rows below it goes into a free one of eleven slots ($03C8-$03D2), and
  its record's type is set to 0, so it never starts again
  (`spawn_objects`, $5923: the store at $5A2C, the skip at $59D9). An
  object scrolled off the screen is removed (`objects_scroll`, $5A53).
  Hardware sprites 3 to 7 serve the eleven slots (`irq_multiplex`,
  $5A9A).
- Object type 1 is the floating container and type 2 a symbol lying
  free, its state less $80 the symbol's number; the other types are
  each level's own. Level 1-1's lists hold six 1UPs: at character (58,
  23) among four other symbols, four in a row at (313-336, 18) near the
  top of the map, and one at (6, 78) (level 1-1, squares 1, 9 and 48).
- Hidden blocks: 101 in eleven levels' object lists, each level's type
  with its own routine: 1-1 3 (type 11, $85EC), 1-2 7 (type 6, $76B4,
  seen before it is shot), 1-3 3 (type 6, $7CC7), 2-1 4 (type 7, $7C78),
  2-2 3 (type 5, $7C57), 3-2 21 (type 3, $7460), 4-1 14 (type 7, $7ED9),
  4-2 10 (type 5, $82AC), 4-3 10 (type 5, $7DAC), 5-1 22 (type 5, $790A),
  5-2 4 (type 3, $A53C). The four-sprite blocks of 2-1, 2-2, 3-2 and 4-3
  burst after twenty more hits and turn every object slot into a prize;
  the others throw out a symbol every so many hits for 500 points and
  break for 5,000 (4-1's for 200). 3-1 and 3-3 have prize drones (type 4,
  $75CF and $7DDF) in their place. The counts are held by
  `test_pages.js`.
- Writing in the maps: level 1-1's blocks spell 1989 at block columns
  54-68, rows 44-48, inside the rock; level 1-3's spell DTE on its side,
  reading upwards, at block columns 89-93, rows 40-50, the map's last
  row. Both are drawn from the maps as they load (the Levels tab).
- Pause is CTRL held; the main program sets the pause flag ($0203)
  again every time round its loop, and fire clears it only for the
  first half of the frame. With CTRL and fire held, the hero moves, the
  time runs and the view scrolls, while the objects are neither made
  nor moved (`main_loop`, $08EA; `frame_logic`, $0B48; `irq_bottom`,
  $0CAB; *live*).
- The whip is 16 steps long at the start, two longer for each blue
  symbol up to 40, and four shorter for a lost life down to 16
  (`whip_update`, $391B; `bonus_symbol`, $5E69; `weapons_down`, $5647).
  Level 2-1's fish keeps the length in $BE9E to give back only when it
  is 22 or more; below that $BE9E is not written, and the whip comes
  back as whatever that byte held, which lies outside every part's load
  (level 2-1 $6D31, $704F). A length of 0 is met by the step count only
  after 256 steps, so such a whip runs to the screen's edge until a blue
  symbol makes it 2 (*live* for the lengths 0 and 2, poked). What the
  byte holds in normal play is not known.

## Data tables

- The world and stage digits of the loading text: engine
  `level_text_codes` ($67D9).
- Bonus symbol sprites and colours: engine `symbol_shapes` ($5EF3),
  `symbol_colours` ($5EFD).
- The default high-score table: engine `high_scores` ($6860), loaded
  from `IH`.

## Sound

- Sound effects: one player for the whole game in the engine
  (`sound_voices`, $4F3B; programs from $50F2).
- Music: the title, the hall of fame, level 3-1's flight, level 3-3's
  dive and the ending. The title's, the hall of fame's, level 3-3's and
  the ending's tunes share one module player (level 3-3 $6C00, title
  $9BD0, ending $A400), the same code moved; level 3-1 has a smaller
  player of its own.
- The ending's tune runs a sound program for each note, one byte a
  frame. Program 18 ends with `$E8` `$15`, go on with program 21, but
  the ending's file holds programs 0 to 20 only: the 22nd place of the
  table at `$B732`, `$B75C`, holds `$1808`, inside the engine's screen
  copy (`shift_up_cc00`, `$17C0`) and colour copy (`$1866`). A voice
  then plays the engine's code from `$1808` up to `$18C6` as notes and
  commands. From the tune's start, voice 1 reads it at frames 14 to 199
  and 298 to 481, voice 3 at 395 to 576 (the page test). *live*: in
  VICE, from the ending's `work/play.vsf`, a load watch on
  `$1808`-`$18C6` counted 413 reads in 1,500 frames, and twelve stops
  out of twelve were the player's read at `$A8EE` with `$F4` = `$1808`;
  the snapshot holds the engine's bytes there unchanged.
- The loading tune's player (Romuzak V6.3) EORs its credit line,
  `$8209`-`$8255` in its own copy, and compares the result with `$56`
  (boot `$D9EE`); on a mismatch it keeps the wrong value at `$808F` and
  adds it every 1,024 frames to two bytes of each voice's state
  (`$D9D5`, `$802C,x` and `$802F,x`). With one letter changed (ROMUZAK
  to SOMUZAK), the tune first differs at frame 769 and starts about a
  quarter of the notes over the next 3,000 frames (simulator). *live*:
  a byte of the line changed in VICE while the tune played set `$808F`.
- Every tune and effect on the pages was held, call for call, to the
  game's own player run on the listings' bytes (`test_pages.js`):
  16,154 calls and 264,098 SID writes for 40 buttons.

## The listing's error rate

Sample `sample-20261118`, seed 20261118: 80 of the listings' 8,059
comments, in two strata, 60 from the 5,519 written one by one and 20
from the 2,540 a decoder wrote from templates (the rows of the maps,
squares and blocks, and the tunes' patterns, sound programs,
instruments, order lists and songs). The checker ran on
claude-fable-5-2 and wrote none of the comments. It marked 8 of the 80
wrong in a detail, and each finding held when read against the code:
10.0 %, with a 95 % interval of 5.2 % to 18.5 % (Wilson), and 10.0 %
weighted by the strata's sizes. These are estimates, and the checker
may have missed errors; the sure minimum is 8 of 8,059 (0.1 %). What
was wrong: two of the ending tune's patterns were said to end at a $FF
they do not hold (the song's pattern length ends them, and of the four
tunes the module player plays, only the title tune's pattern 10 holds
an end byte); the engine's routine that moves what is drawn in
characters with the scroll called the mine, the grenade and the debris
of broken walls shots; a prize block's burst lasts 3 to 10 frames, not
3 to 11, because the carry is clear at the addition; the module
player's vibrato step grows halfway through each run up or down, not at
its turns; level 4-1's boss places the hero's sprites only on a frame
when it lent top lines; level 5-1's table of row starts holds one start
more than its comment said; and level 5-2's sprite-pointer bytes have a
second writer, the routine that sets up the ship's picture in the
walk to the ending. Each belief was searched for in every part and
corrected wherever it appeared: 178 comments and 8 labels in 14 parts,
among them every pattern comment of the four tunes, the row-start
tables of ten levels, the four prize-block bursts, the three copies of
the module player and the engine's eight scroll routines for what is
drawn in characters. The sample is over the mark, and the listing has
not had a full audit.

Building the Graphics tab found nine more comments wrong, outside the
sample: eight read a sprite's mode backwards (bit 0 of `$0259,x` set is
single colour) in levels 1-2, 2-1, 3-2 and 5-1, and the engine's
`$0D5C` gave the wheel's sprites as multicolour and the shield's
colours wrongly. All nine are corrected. Reading the ending's tune
corrected one more: the table at `$B732` said that no row names its
22nd place, which program 18 does.

## Live tests

Run in VICE 3.10 (vice-mcp), driven frame by frame from the snapshots
named in `orientation.md`.

- *live* Booting both disk sides to play, and every level and the
  ending loaded by the route in `orientation.md`.
- *live* The ending, from the ending's `work/entry.vsf`: the tower
  picture, the ship leaving it, the explosions over the top, the top
  drawn broken from then on, and the text rising in sprites, with
  "Now enjoy the music or Press Space" at the end (about 6,000 frames).
- *live* After SPACE: TURN THE DISK !, then, with side 1 in the drive,
  YOUR RESULT with LEVEL : !-! (the score poked to 200,000 at $0216
  first). RETURN with no name puts ♥ MR. RETURN ♥ at the top of the hall
  of fame, with the level !-!.
- *live* S on the hall of fame shows INSERT SIDE 1 OF YOUR GAMEDISK, AND
  PRESS FIRE, RUN-STOP => CANCEL. RUN/STOP goes back to the title; fire
  with no disk in the drive shows SAVING HALL OF FAME, then DANN EBEN
  NICHT !! in light red, then the title.
- *live* In level 1-1, from `work/play-w1l1.vsf`: walking right for six
  seconds fills up to ten of the eleven object slots; CTRL, fire and right
  held together for the same six seconds scroll the view to exactly the
  same places and count the time down, and no object is made.
- *live* The whip with its length ($036F) poked: at 40 and at 0 it
  reaches the screen's edge from the same place (20 steps), at 16 it
  stops at 16 and at 2 it is a stub of 2.
- *live* The recorded frames: level 1-1's frame drawn from its memory
  and video-chip writes matches VICE's screenshot in 104,447 of 104,448
  pixels; the loading picture in all 104,448.
