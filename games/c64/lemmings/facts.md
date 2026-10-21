# Lemmings — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from, and every address its part. Unless
marked *live*, a fact comes from reading the code in the part's snapshot
named in `orientation.md`. What is true of one part is in that part's
`parts/<id>/facts.md`; this file holds what spans the parts, the error
rate and the live tests.

## Build

The Psygnosis disk release, three disks (`orientation.md`). No version
string was found. The title scroller says "Copyright 1993 Psygnosis", the
manual "Copyright © 1993 by Psygnosis Ltd."; the disks are printed 1994.

## Memory layout

| Thing | Where |
|---|---|
| The loader, its unpacker and the file tables | resident `$CB20`-`$CFFF`, from the boot to the end |
| The game's state that outlives a part: level number `$CB48`, the expected access code `$CB49`, sound mode `$CB47`, cheat flag `$CB61` | resident |
| A packed copy of the briefing's code, restored before each load | resident `$D100`-`$DFFF`, under the I/O area (`restore_briefing`, `$CBD2`) |
| The intro | intro part, `$0F00`-`$CB37` and `$E000`-`$FFF7` |
| The play engine | game part, `$0801`-`$3651` |
| A level's tune | game part, `$3652`-`$3B79` for SA (each S file to `$3652`) |
| The briefing and end-screen code | game part, `$5000`-`$64AF` |
| The terrain as sprite shapes | game part, `$8000`-`$B3FF` |
| The level's file: header, terrain unpacker, objects | game part, `$E000`-`$FA2C` for level 1 |
| The menu, code sheet and access codes | menu part, over the game's memory |
| The end sequence | ending part, `$0801`-`$C4C9`, entered at `$C400` |

## How the parts connect

The resident loader (`$CC00`-`$CFFF`) loads files by a code byte: the top
three bits pick the first letter (F, T, X, M, P, I, C, S, from `$CDDE`) and
the disk side (`$CDE6`), the low five bits the second letter. Every byte on
the disk is stored EOR the byte before it: the loader undoes the chain at
`$CEAA`, rewriting the operand of its own EOR at `$CEAB` with each byte.
Each file then unpacks (`$CC8D`): bytes below `$E0` are copied, codes
`$E0`-`$EF` repeat a byte, `$F0`-`$FF` fill to an address or set a long
literal count. The boot runs ID, IE, IA, IB, the intro at `$4750` (resident
`$CD2D`), then PA, CC, CA, CB and the menu at `$9150` (`$CD53`). Option 1
loads PB, the level's file (code from the table at `$0400`) and its tune
(code from `$0700`), then the briefing (game `$5000`) and play. After the
hundredth level the loader brings IC and jumps to `$C400` (`$CD5B`); the
end sequence ends in the resident's fresh start (`$CB71`), which loads PA
and the menu again.

## Timing

PAL. The play interrupt runs 17 raster bands a frame (game `band_lines`,
`$09F3`); band 0 at line 251 does the frame's work. The main loop of play
waits for a screen swap (game `$0E5F`), and the interrupt swaps the screens
no sooner than five frames after the last (game `irq_band`, `$08EA`): ten
passes a second at most. The level's clock takes a second off every 50
frames (game `clock_tick`, `$0EE9`). The intro's actors step every fourth
frame (intro `step_divider`, `$5722`). The end sequence lasts 2,592 frames
(ending `end_length`, `$C459`).

## Controls

| Where | What reads it |
|---|---|
| Code sheet (menu) | GETIN: digits, DEL, RETURN (`$A128`) |
| Title (menu) | GETIN: 1, 2, 3, 4 and the cursor keys (`title_screen`, `$9195`); a 1351 mouse is detected through `$D419`/`$D41A` (`mouse_test`, `$A279`) |
| Play (game) | 13 keys by row and column (`read_keys`, `$0A5A`): 1-8 a skill, + and - the release rate, SHIFT pause, the back arrow (while paused) the end of the level, DEL twice the nuke (`key_action`, `$0AB4`); joystick port 2 (`$0B3C`); the mouse (`$1704`) |
| Intro | fire on port 2 ends it (intro `$48F4`) |
| End sequence | fire on port 2 ends it (ending `end_loop`, `$C415`) |

## Graphics

*Live*, from one frame of level 1 recorded with `kit/c64/frame.py` and
redrawn with no pixel different (game part): the terrain is eight
multicolour sprites side by side, X 78 to 246 (24 apart), sprites 0-3 the
left half and 4-7 the right, moved down 21 lines at a time by the raster
bands, the right half 8 lines below the left. The level is kept as sprite
shapes at `$8000`-`$B3FF` (78 byte-columns by 168 lines, laid out by the
level file's `unpack_terrain`, `$E094`); the sprites show 64 shapes at
`$6000`-`$6FFF`, into which `scroll_view` (`$0C90`) copies columns. The
lemmings are ORed into characters taken afresh each pass from code 2 up
(`draw_lemming`, `$1AA2`; resident `next_char`, `$0422`) on the screen not
shown, `$4000` or `$4400`; the cursor uses characters `$FC`-`$FF`, water
`$F4`-`$FB`. Each screen has its own character set for the lemmings: `$4000` with
`$5000`, `$4400` with `$5800` (`screen_d018`, `$1349`). At line 217
`$D018` = `$0C` selects the screen at `$4000` with the panel's character
set at `$7000`, and four sprites are set over the panel (`panel_setup`,
`$0A04`).
The intro's lemmings are pairs of sprites, a black hires outline over a
multicolour body (intro `show_image`, `$4EAA`); the end sequence is a
multicolour bitmap in bank 2 (ending `end_picture`, `$C45B`).

A lemming's frame in play is two bytes a line, 16 lines, from the
addresses in `frame_lo`/`frame_hi` (`$3C00`/`$3D2C`) and
`frame2_lo`/`frame_ptr_hi` (`$3E58`/`$2EA0`) plus 16 (game
`or_frame_rows`, `$1D48`). The 300 entries point at 217 different
images. Stepped as `$1FB1`-`$1FF2` steps them from 0, the 21 actions show
267 of the entries; 33 entries, 31 images, are never drawn: the odd frames
of the basher (117-147, 177) and the miner (247-267), 189-195, the
floater's first frame 196, and 49 (`graphics.html`, `test_graphics.js`).
Level objects are ORed into the sprite shapes the play area shows (game
`animate_objects`, `$2A48`): entry i of the level's tables at `$E080`
(kind and frame), `$E084`/`$E086` (target), `$E088`/`$E08A` (graphics)
and `$E08C` (count), drawn when the object's frame equals the kind's low
three bits; `setup_level` first replaces kinds `$B8`, `$BB`-`$BE` by
`$A8`-`$AC` (`$0FF6`, `$0FFB`). Water is characters `$F4`-`$FB` along
each character column whose surface the tables at `($E090)`/`($E092)`
give (game `animate_water`, `$2B96`). Every other 48-pixel block of the
terrain is kept 8 lines higher, as the right-hand sprites stand 8 lines
lower; `terrain_at` adds the difference through `$4A00`.

## Mechanics

- A lemming is an action (0-20, the low five bits of resident `$0424`;
  bit 7 its direction), flags (`$0456`: bit 0 the ninth bit of X, 1
  climber, 2 floater), X (`$0488`, the level's pixel plus 8) and Y
  (`$04BA`, its line); up to 50. The handlers are at game `$1E6A`/`$1E7F`.
- Terrain is tested a pixel at a time by game `terrain_at` (`$28E8`);
  steel and one-way walls are a separate map, two bits a cell (`cell_kind`,
  `$2E07`).
- The number to save is stored in each header already rounded up from the
  percentage (`$E040`); in all 100 levels it is the percentage of the
  lemmings rounded up. The end screen chooses its message by the lemmings
  saved against it (game `choose_message`, `$53CF`).
- The access code: the menu keeps the chosen level's code at resident
  `$CB49` and the briefing stops the machine when the loaded file's own
  code differs (game `show_briefing`, `$526E`). *Live*.
- The cheat: the access code WANNABFREE, level 1's own, sets resident
  `$CB61` bit 7 (menu `find_access_code`, `$9BC4`); a level ended with the
  flag set counts 100 % saved (game `$0ED3`). *Live*.
- The code sheet's numbers: page p's first (menu `$A070`/`$A080`) plus
  23,171 per line, less 56,831 whenever the sum reaches it (menu
  `choose_question`, `$9EF6`); 320 numbers in all, the manual's tables.

## Data tables

| Table | Where | Contents |
|---|---|---|
| File kinds | resident `$CDDE` | F, T, X, M, P, I, C, S |
| Level file codes | resident `$CF83`, copied to `$0400` | one per level |
| Tune file codes | resident `$CFF1`-`$D0F0`, copied to `$0700` | one per level: SA to SI, 8 to 13 levels each |
| Access codes | menu `$9701` | 100 codes, ten letters, each EOR the one before |
| Code sheet page starts | menu `$A070`/`$A080` | 16 numbers, 14773 to 37349 |
| Level header | game `$E000`-`$E09F` | `parts/game/facts.md` |
| Release rate digits | game `$4FB8` (units), `$4FD0` (tens) | 24 steps, 01 to 99 |

## Sound

Three players. The play engine's driver (game `$3000` init, `$3003` start
sequence A on voice X, `$3006` one frame) plays the level's S file from
`$3652`: 64 sequence pointers, tune parts and effects together. A level's
music starts at the first release in music mode (game `$1DEF`-`$1DFA`:
sequences 1 and 2 on voices 0 and 1). The intro's driver (intro `$4000`)
plays sequences 1-3 on the three voices. The ending's (`$0810`, `$0813`)
adds a sample channel: an NMI from CIA 2's timer A writes four-bit steps
into `$D418` (`sample_nmi`, `$0938`), from `$1500`-`$886E`, at 1.8 to
9.8 kHz by the note (`$10CD`). The ending's frame routine never writes the
volume, and `end_silence` (`$0D01`) leaves it at 0, so without the NMI the
tune is silent; over the end sequence the NMI writes `$D418` 132,288
times, values `$34`-`$3B`. Six sound effects, sequences `$1A`-`$1F` of every
tune file, the same in all nine: explosion (`$23CD`), a lemming saved
(`$1FA0`), the builder's last bricks (`$2570`), a skill given (`$1562`),
death (`$1ED8`, `$1F72`, `$2002`, `$2148`, `$222E`) and the trap door
(`$2AB2`). `play_sound` (`$29F8`) plays them on voices 0 and 2 by turns in
effects mode only; the trap door's plays in both. *Live* on the
simulator: `test_music.js` plays the ten tunes, the six effects and the
end tune with its NMI and matches every SID write with the page's
players.

## The listing's error rate

Seed 20261020, population 1,964 comments over all five parts, all written
by hand. A sample of 60 (game 32, resident 12, intro 11, menu 3, ending 2)
was checked against the bytes by an agent that wrote none of them, on
claude-opus-5-5 (`work/reports/`): 7 were wrong in a detail and none in
its main claim, 11.7 % (Wilson 95 % interval 5.8 % to 22.2 %), a lower
bound on the true rate. What was wrong: an action table's entries called
frame offsets where they are the pixel row a frame is drawn at; a sound
driver byte said to be set by the `$FC` command, which only reads it; the
panel's rows copied as two where the loop copies three; the scroll target
said to be set only by the cursor, where the level's start sets it too;
the release rate's units digit called the tens, and both rate digits
called characters where they hold digit values; `time_up` said to be set
only when the clock runs out, where the back arrow while paused sets it
too. All seven were corrected, with nine comments that said the same
things or that the checker reported outside the sample: the exits' byte
order, the two rate tables' swapped labels, the briefing's colour table
base, the fuse frames' table, the icon rows' 60 bytes in three comments,
and two of the sound driver's per-voice bytes. No full audit has been
made.

## Live tests

| Test | Result |
|---|---|
| The code sheet, answered from menu `$A092` | accepted on every boot tried |
| The keys 4 and 3 at the title (`work/menurun.py`) | 4 turns the note icon into FX; 3 opens "Enter the access code". Cursor down, as VICE's keyboard was driven, left the rating at Fun: not settled |
| WANNABFREE at the access code prompt, then level 1 ended at once (SHIFT, back arrow) | "Cheatmode Activated"; the end screen shows 100 % rescued and level 2's code (`reference/cheat-*.png`) |
| One letter of resident `$CB49` changed at level 1's briefing (game `$500C`) | border red, the program counter fixed at game `$5286`; unchanged, the briefing goes on (`work/codecheck.py`) |
| One frame of play recorded and redrawn (`kit/c64/frame.py compare`) | 104,448 of 104,448 pixels match |
| Level 1's file unpacked on the kit's 6502 (`work/levels.js`, `work/maps.js`) | header and terrain equal the game's memory at the briefing, byte for byte |
| The end sequence reached with `$CB48` = 99 at level 1 (`work/toend.py`) | IC loads and runs at `$C400`; the picture in `reference/ending.png` |
| All eleven tunes on the game's own players (`test_music.js`) | every SID write of 6,000 frames matches the page |
| The 320 code sheet numbers (`test_code_sheet.js`) | all match the menu's own code; five checked against the manual's page 18 |
| The end tune with its NMI, rendered through `site/lib/sid.js` (`work/endlevel.js`) | rms 0.062 with the 6581's DC level, 0.048 without, no clipping |
| The frame step for the 21 actions and the intro's 148 images (`test_graphics.js`) | the page's ports match the game's code |
