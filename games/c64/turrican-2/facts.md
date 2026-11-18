# Turrican II: The Final Fight — verified technical facts

What is true of the game as a whole: how its parts follow one another, and what they share.
Each part's own facts are in `parts/<id>/facts.md`.

## Loads and shared engine

The disk progression loads `11`, `12`, `21`, `22`, `31`, `32`, `33`,
`41`, `42`, `51`, `52`, then `EX`. Each level stores its successor's
filename at `$8FEC/$8FED`. The resident transition at `$544A` increments
`$03EF`, calls the fast loader and selects the ending entry at index
eleven. Its dispatch was traced instruction by instruction from `$0A49`.

All eleven level snapshots share code at `$0C00-$5FFF` and
`$6400-$67FF`, byte for byte. Upper memory changes meaning between
loads: `$6C00` begins an actor behavior in level 1-1, while levels
3-1 through 3-3 have music-driver JMP entries there. The flying levels
replace the controller target at `$06DB` and set `$03EE` to one.

## Interrupts and scrolling

Processor port `$35` exposes the game's RAM and I/O. The IRQ vector is
`$0A2F`, the NMI return `$0A3F`. The IRQ preserves registers,
acknowledges the VIC and jumps through `$06D1`. The main thread waits
at `$0A49` with stage zero while the interrupt chain runs gameplay.

The captured frame in `work/frame-level11.json` records handler-pointer
changes and the separate playfield/panel modes. Its reconstruction
matches 104417 of 104448 screenshot pixels, with 31 differences.

The terrain screens are `$C800` and `$CC00`. The scheduler at `$1924`
exchanges them and selects sixteen character-copy routines and eight
colour-RAM routines. Vertical/diagonal shifts retain twenty rows;
horizontal shifts retain twenty-one. Vertical shifts copy forty
columns, the others thirty-nine. Exposed edges are drawn separately.
`work/scroll_copies.py` checks the load/store pairs and displacement of
all 24 routines.

## Loading text and panel font

The font at `$5DC8-$5FFF` holds 71 multicolour components. Four form
each letter in a two-by-two cell square. The two-row tables are
`$6000/$6022` for `LOADING LEVEL 1-1`, `$6044/$6062` for
`TURN THE DISK !`, and `$6080/$6090` for a space followed by `THE END`.
`$61F3` patches the digits. Rendering the font and tables produces these
readable messages.

Tuples give top-left, top-right, bottom-left, bottom-right component
indices. Space is four zeroes.

| Character | Components | Character | Components |
|---|---|---|---|
| A | 1,2,3,4 | D | 5,6,7,8 |
| E | 9,10,11,12 | G | 13,14,15,42 |
| H | 16,17,18,19 | I | 20,21,22,23 |
| K | 24,25,18,26 | L | 27,28,29,30 |
| N | 31,32,33,19 | O | 13,6,34,8 |
| R | 35,36,37,38 | S | 39,40,41,42 |
| T | 43,44,22,23 | U | 27,27,34,8 |
| V | 45,46,47,48 | ! | 20,21,65,66 |
| 1 | 49,50,51,52 | - | 67,68,69,70 |
| 2 | 53,54,55,56 | 3 | 57,58,59,60 |
| 4 | 16,61,62,63 | 5 | 9,10,64,42 |

The panel font occupies `$0400-$0647`, reached as glyphs `$80-$C8`
with character base zero. Compact timer digits begin at `$A2`; BCD
digit tops begin at `$AC` and bottoms at `$B6`. Energy fill states use
`$C4-$C8`. Its colour lookup is `$0648-$0690`, indexed through base
`$05C8` plus the screen code. Both fonts were rendered and read.

## Power lines

The activation path at `$2F95` reads Space through CIA1 port B bit four,
checks state and vertical position, consumes one BCD unit from `$0738`
and writes `$D3` to `$017E`. A 71-instruction trace from `$2F9D`
through the flag store records ammunition changing from three to two.
`work/trace_power_lines.json` holds each instruction and its registers.

The wave updater at `$306F` saves/restores terrain characters and
colours behind two outward-moving fronts. Two 21-row arrays remember
obstructions. It clears its flag after both fronts leave the screen.
The wave patterns are `$C778/$C780`, glyphs `$EF/$F0` of the playfield
character set.

## Actor dispatch and packed loads

The actor directory has seventeen entries, with overlapping low/high
arrays at `$08AE` and `$08BE`. The byte at `$08BE` is both the last low
byte and the first high byte. Type sixteen combines `$27` there with
`$5B` at `$08CE` and enters the resident projectile handler `$5B27`.
A six-instruction live trace from `$0E95` with Y sixteen follows the
two indexed loads, operand stores and indirect dispatch to `$5B27`.
Type zero is skipped before lookup.

The custom loader reads a five-byte compressed-section header, then
uses the original backwards decruncher at `$69C4`. The output store is
`$6B29: STA ($FC),Y`. A live stop during file `11` loading found A `$E0`,
Y `$4D` and destination `$C7FF`; one instruction wrote `$E0` there. The
loader was then allowed to return before level initialization, producing
`parts/level-1-1/work/loaded.vsf`. Running those original decruncher
instructions with the disk bytes supplied at its byte-reader entry
reproduces every byte in `$6C00-$C7FF` of that live image: 23552/23552.
This establishes the compressed output extent without treating a PRG
reader's first two bytes as a runtime load address.

File `11` supplies the level code, map, block definitions and character
set. The auxiliary file `SA` unpacks to `$9000-$BF7F`; the engine copies
that buffer under I/O and onward, so it also supplies the callback code
at `$FD00-$FF7F`, alongside the sprite graphics. Auxiliary files cannot
be classified as graphics alone.

## Presentation and media

The story intro is an independent image captured at its `$7B3D` entry, before the resident engine exists. It contains sixteen compressed pictures, a rolling-key story stream, a separate ROMUZAK music driver, and eight loading-display sprite pieces. The title and ending have their own facts and source listings. Their encrypted text readers were resolved through stopping read watchpoints and original-instruction stepping.

The media inventory answers all 27 items: 21 part attributions, two side markers, one saved score sector, and three retained files outside the load selections. The raw high-score sector is side one, track 18/sector 18, marked free in the allocation map. Its block matches the bytes loaded at `$67FF`. The fixed load calls and constructed auxiliary names are listed in `media.json`.

The story intro's player has eight song headers, of which seven have empty orders. The world-3-3/world-5-2 selector one loops pattern zero with instrument zero: targeted original-instruction hooks at `$6E47/$6ED3` confirmed the zero instrument assignment. That leaves nine populated tunes: the story, the title, the score entry (title song one), world 3-1 and its boss (song one, started by `three_part_flight_boss` at `$802E`), world 3-2 and its boss (song one, started at route index 29 by `$EA9A`), world 3-3, which level 5-2 plays again, and the ending. The levels on foot load no music player. The intro's loading display keeps the story tune going while the resident file loads, then fades it before the title file.

The resident effects player takes its request at `$FFC0` as `$80` plus the number. The numbers the How it works tab names come from their request sites: 1 spread shot, 2 laser, 4 bouncing shot, 5 the held-fire beam (`process_held_fire`), 7 the palette flash, 8 world 4-1's lowering gates (`lower_gate_columns`), 9 power line, 16 explosion, 18 level 2-1 boss destroyed, 19 level 1-2 boss destroyed, 26 the world 4 bosses destroyed and 27 wheel bomb. Number 32 is world 4-1's scripted gate sequence, and level 2-2's departure picks one of 12 to 27 at random.

## Page verification

`test_pages.js` runs every music and effect button's original driver against the listing bytes and compares each SID write with the page's driver, then renders ten seconds of each through the site's AudioWorklet module; every button sounds. It checks all eleven map rectangles and terrain definitions, all 1902 stored sprite pieces, the 63 graphics groups, the sixteen intro decompressions, the generated scene-frame banks and 1792 walking-divider cases against the original controller prefix.

It also holds the level 1-1 boss viewer to the pose tables at `$8616/$8634` and the shapes at `$C000` plus 64 times each number, the Discoveries bridge window to the level 1-2 map and its strip tables, and the four farewell rows to the ending's bytes and program-byte key.

## Files the game never loads

The disks carry three files outside every load path (`media.json`). All three are byte-identical on the original Rainbow Arts disks (TOSEC `turrican_ii_s1/s2[rainbow_arts_1991](!).g64`), so they shipped with the game rather than arriving with the crack.

`23` (side one) is a memory save of level 1-2 in mid-game, `$6C00-$A89E`. Against the level's own load it differs in 34 bytes. Sixteen are map cells in rows four and five (columns 6-7, 9, 12, 13, 15 and 17-18), set to zero exactly as `update_collapsing_terrain_strips` (`$7CED`) clears them when each of the six bridge strips finishes falling; the strip tables are `$AF67` (X) and `$AF73` (width), both in units of four pixels. Eight are the actor records at `$8AA8-$8AC5`, the cells (1,0) and (2,0), with their type nibbles cleared as spawning does. Ten are map row 40, columns 86-95 (`$9FF6-$9FFF`), which hold the ASCII text `SMON $C000`: the start command of the SMON machine-code monitor.

`61` (side two) is the same save, identical to `23` below `$A000`, but shorter (`$6C00-$A20C`). Its last 525 bytes are the C64 BASIC ROM, from the `CBMBASIC` signature through the start of the keyword table and error messages such as `TOO MANY FILES`, so it was saved with BASIC banked in.

`ST` (side two) is packed. The game's own loader unpacks it to `$9FBB-$CFFF`. The output is engine code from another build: long runs of it equal resident code in `$1D96-$45xx` at constant displacements ($8225, $853C and $8528), more than 4,800 bytes in all. It is not a level, graphics or sound.

The original side one starts with a 218-byte boot file `##` at `$0326`, which loads the loader file `HE`. Its last bytes are the text `ICH HASSE ALLE SCHLUEMPFE !!!`, which the game never displays. The Triangle copy has neither file; it starts from its own.

The original disk's score sector (track 18, sector 18) holds the team as the default table: MANFRED TRENZ 100000 at 5-1, ANDREAS ESCHER 90000 at 4-2, MARKUS SIEBOLD 80000 at 4-1, STEFAN ALBES 70000 at 3-3, ALEXANDER ERNST 60000 at 3-2, JOERG PRENZING 50000 at 3-1, HOLGER SCHMIDT 40000 at 2-2, THOMAS ENGEL 30000 at 2-1, JULIAN E 20000 at 2-2 and MARC A. ULLRICH 10000 at 2-1. The Triangle copy's sector holds its crackers' scores instead.

## The ending's key

Each of the 2053 bytes of the ending's text stream (`$F600-$FE04`) is keyed by one program byte, `$8206` down to `$7A02`, so the byte at `$F600+n` uses `$8206-n`. The L of `! LAST !` at `$FB25` is keyed by `$7CE1`, the `STA $E0` opcode ($85) in `initialize_ending_counter_display` that sets the font copy's destination page. Changing it to `$EA` (NOP) decodes that letter as `$B1`, which the row decoder (`$875D`: below `$60` masked to six bits, otherwise less `$20`) turns into glyph `$91` of the second font, eight bytes at `$9864` outside it.

## The listing's error rate

Sample seed 20261114 drew 80 comments from a population of 11668: 20 of 3609 generated data descriptions and 60 of 8059 other comments. Independent checker gpt-6-astra found seven wrong-detail comments, all in the second stratum, and 73 right. The plain error rate was 8.8%, with Wilson 95% interval 4.3–17.0%; weighting by stratum sizes gives 8.1%. The findings concerned an intro/resident alias, colour RAM terminology, a beam workspace, actor contact/expiry paths, a raster-delay table, music-effect order, and score-font bytes. All seven findings and affected repeated descriptions were corrected.

On 18 November 2026 a maintainer's sample on a Claude model (seed 51119: 60 written comments and five from each of the seven largest template families, 95 in all) found four wrong. Level 2-2's sprite slots at `$FC00` were numbered `$F0`-`$FD`, where the last 64 bytes hold the frames of the two flowing-terrain characters. In two comments the ten bytes after the third vibrato record of a music part were called the start of the pulse and filter records; they are the vibrato stream that `update_music_vibrato` reads. The title's eight bytes at `$9082` were described only by where they are copied; they are the delay-loop counts that line up the panel split with the raster. The four were corrected with every note that said the same thing. The notes that repeated a structure's note at each of its bytes were then folded into one note per structure, 11,502 notes to 10,347. One checker at a time then audited all 10,347 comments and every claim in the sixteen facts files, in twenty-four batches: 1,625 comments and 25 claims were corrected, 219 more per-byte notes were folded into the notes of their structures, and 59 labels were renamed. Most errors were repeated across parts, because levels 3-3 and 5-2 hold the same music driver and the levels share much of their actor code. A new sample after the audit (seed 51127, 85 comments drawn the same way) found two wrong, with a 95% Wilson interval of 0.6% to 8.2%. Three flying-stage respawn routines were said to restore the saved player hook; with no lives left they install the death-message handler. Two attached effects in levels 1-1 and 1-2 were said to switch on multicolour; they set their sprites to single colour. Both were corrected with their copies.
