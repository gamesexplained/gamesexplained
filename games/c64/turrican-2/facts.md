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

The sound viewer offers all seventeen stored song choices, including eight silent selectors. Seven intro headers have empty orders. The world-3-3/world-5-2 selector one loops pattern zero with instrument zero: targeted original-instruction hooks at `$6E47/$6ED3` confirmed the zero instrument assignment. Nine choices therefore supply populated music. The effects viewer offers 35 resident selectors and eight ending selectors, including their silent zero entries.

## Page verification

`test_pages.js` compares 379530 ordered SID writes from 28140 original driver calls, covering every music/effect button. It constructs each driver from its function source alone, as the AudioWorklet does. A second pass renders ten seconds per button through the site's actual worklet module and SID model; every populated choice sounds, and silent choices are named. The test uses the committed listings, including each part's inherited bytes, rather than private snapshots.

The same test checks all eleven map rectangles and terrain definitions, all 1902 stored sprite pieces, 63 graphics groups, the sixteen intro decompressions, and the generated scene-frame banks. It compares 1792 walking-divider cases with the original controller prefix. The graphical preview explicitly schedules one controller call per PAL frame; this is the isolated animation rule, rather than a recorded gameplay route.

## The listing's error rate

Sample seed 20261114 drew 80 comments from a population of 11668: 20 of 3609 generated data descriptions and 60 of 8059 other comments. Independent checker gpt-6-astra found seven wrong-detail comments, all in the second stratum, and 73 right. The plain error rate was 8.8%, with Wilson 95% interval 4.3–17.0%; weighting by stratum sizes gives 8.1%. The findings concerned an intro/resident alias, colour RAM terminology, a beam workspace, actor contact/expiry paths, a raster-delay table, music-effect order, and score-font bytes. All seven findings and affected repeated descriptions were corrected. The listing has not had a full audit; a later audit is recommended.
