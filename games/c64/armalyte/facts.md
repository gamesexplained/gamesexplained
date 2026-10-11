# Armalyte — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

The game is in eleven parts (`orientation.md`, "The parts"): the engine,
which stays in memory throughout, eight levels and the ending, each
loaded over it, and the music demo the disk's third menu entry loads,
which is not the game at all and holds a machine of its own. What is
true of one part is in that part's own `parts/<id>/facts.md`, with that
part's addresses: the engine's facts hold the play mechanics, the front
end, the sound and the loader. This file holds what spans the parts, and
names the part beside every address it gives: "engine `$B3CC`" is the
engine's routine at `$B3CC`.

## Build

- The Thalamus release of 1988 on one disk, both sides, PAL; the title
  reads "© THALAMUS MCMLXXXVIII" and "CYBERDYNE SYSTEMS" (engine
  `$B630`, `$B646`). Side 1 boots to a menu of three programs, "1
  Armalyte, 2 Loading picture, 3 Walker's Warbles"
  (`reference/disk-menu.png`). The first loads the engine and the third
  a music demo of Martin Walker's, a part of its own
  (`parts/warbles/facts.md`); the second, the loading picture on its
  own, was not followed.
- The credits are title strings 8-18 (engine `$90B9`): programming and
  game design Dan Phillips; system programming and game design John
  Kemp; graphics, level and game design Robin Levy; music and sound
  effects Martin Walker; produced by Paul Cooper and John Harries. The
  last pair is on no title page, so the game never shows it (engine
  `title_pages`, `$B953`).
- No version number or build date was found in any part. The six
  starting high scores carry the initials DAN, RJL, JHK, CYB and SYS and
  one more of an M and a W with a mark between (engine `$9029`).

## How the parts connect

- The boot files on side 1 load the packed engine, which unpacks itself
  and starts at engine `$A000` (`engine_start`). From then on the engine
  loads every other part itself, from side 2, with its own fast loader
  (engine `fast_loader`, `$B3FC`), by a one-letter name from the table at
  engine `$B3E1`: D E L H U N A R for levels 1-8, M for the ending. A
  name not found on the disk in the drive brings up "TURN DISK TO SIDE
  B PRESS FIRE" (engine `wrong_disk`, `$B5CC`), which is how the first
  load asks for side 2.
- The level number (engine `$B002`, 0-7, and 8 for the ending) picks the
  file; the front end loads it whenever it differs from the one in
  memory (engine `$B003`, `load_level_if_needed`, `$B388`).
- Every file is stored from `$0801`, unpacks itself to `$0801-$8000`
  with its own unpacker at `$0812`, and then the engine's mover (engine
  `move_level_into_place`, `$9680`) moves it into three ranges:
  `$0200-$6FFF`, the RAM under the I/O chips at `$D000-$D6FF`, and
  `$9700-$98FF`. Every load replaces the whole of all three
  (`orientation.md`, "The parts").
- The load ends at engine `after_level_load` (`$B3CC`). For a new game's
  load (engine `$B004` = 1, at power-on and after a game over) it goes to
  the title; otherwise it takes two batteries and two generators from
  each player, shows "PRESS FIRE TO START" and starts the level, or, for
  file M, runs the ending at ending `$0801`.
- Finishing a level moves the level number on (engine `level_complete`,
  `$AE25`); finishing level 8 also adds one to the count of completed
  games (engine `$B02D`), and the ending hands back to level 1 with the
  score and lives kept, one round faster (ending `ending_wait_runstop`,
  `$0923`). A game over sends the engine back to `$A000`, so level 1 is
  loaded again before the title when another level is in memory.
- What survives a load is the engine and its state block at engine
  `$B000-$B02F`: level number, lives, score, player states, batteries,
  generators and the settings. The zero page, which holds every other
  enhancement, is cleared at each level start (engine
  `level_setup_vars`, `$A1DE`).

## Memory layout

In play (`$01` = `$35`, both ROMs out, I/O in; video bank 1,
`$4000-$7FFF`):

| Range | What | Part |
|---|---|---|
| `$0002-$00FF` | play variables, cleared at every level start and front-end visit | engine |
| `$0100-$01FF` | stack, filled with `$FF`: the object sort's bucket table and a protection check | engine |
| `$0200-$6FFF` | object types, paths, attack waves, map, tiles, sprite frames (frame n at `$4000` + 64n) | each level |
| `$7000-$77FF` | the two play screens, `$7000` and `$7400` | built by the engine |
| `$7800-$7FFF` | play characters: the stars (0-`$1F`) and the level's set copied from its `$D000` to `$7900` | engine and level |
| `$8000-$87FF` | the loading screen, and during a load the drive code (`$8600`) and its decoding table (`$8700`) | engine |
| `$8800-$96FF` | the font, the title's strings, and in the front end the colour bars and the mover at `$9600` | engine |
| `$9700-$98FF` | the level's script and its two boss tables | each level |
| `$9900-$FFF9` | the engine's code, music, effects and object tables | engine |
| `$D000-$D6FF` | RAM under the I/O chips: the level's character set | each level |
| `$D700-$DFFF` | RAM under the I/O chips: the logo screen, the title's curve and sprites, the drive code, the mover's source | engine |

The ending, once running, uses the same three ranges for its own code,
pictures and font, and moves its frame picture up into `$6000-$7EF8`
(ending `frame_move_up`, `$0859`).

## Timing

- PAL only: the front end's timing check (engine `timing_check`,
  `$BDC8`) expects one PAL frame, 19,656 cycles, between title frames,
  and wipes memory otherwise. The frame rate is 50.125 Hz.
- In play the main loop (engine `$A12A`) runs once a frame and the scroll
  moves one pixel a frame: 40 frames a tile column, 10,240 frames, about
  204 seconds, for a 256-column level. Level 7 starts halfway along,
  at column `$7F` (level-7 `facts.md`).
- Every boss fight has a time limit, a scroll stop in units of 48 frames
  set by the level's script; at the end of it the boss blows up by
  itself and pays as if destroyed (engine `level_script`, `$A93E`). The
  limits per level:

  | Level | Mid-level boss: column, time | End boss time |
  |---|---|---|
  | 1 | 214, 2,880 frames (57 s) | 12,288 frames (245 s) |
  | 2 | 175, 3,840 frames (77 s) | 7,680 frames (153 s) |
  | 3 | 182, 4,320 frames (86 s) | 7,680 frames (153 s) |
  | 4 | 49, 5,760 frames (115 s) | 12,288 frames (245 s) |
  | 5 | none | 12,240 frames (244 s) |
  | 6 | 180, 2,880 frames (57 s) | 12,240 frames (244 s) |
  | 7 | none | 12,288 frames (245 s) |
  | 8 | 167, 1,440 frames (29 s), and again at 242, 4,800 frames (96 s) | 12,240 frames (244 s) |

  (each level's `$9700` tables; the parts' `facts.md`.) *Live*: level 1
  played with no input from five seconds in reached `level_complete`
  after 25,299 passes of the main loop in 25,298.5 frames, its two boss
  stops taking 2,880 and 12,288 frames.

## Controls

Player 1 uses joystick port 2, player 2 port 1 (engine `joysticks_read`,
`$ABD9`). In play: RUN/STOP pauses, Q quits while paused, the Commodore
key and `/` change each player's super weapon, SPACE detaches and recalls
the drone (engine `keys_play`, `$AB53`). On the title: fire starts, left
and right or F1 choose one player with the drone or two players, F3 the
starfield, F7 the demo (engine `title_start_keys`, `$B58A`;
`title_function_keys`, `$BC55`). In the ending: fire moves on a picture
and RUN/STOP skips to the last, then continues the game (ending
`$08D1`, `$0923`). All of these were tried *live* except the ending's.

## Text

Four alphabets, one to each kind of text:

| Text | Where | Codes |
|---|---|---|
| Title, loading screen, "GAME OVER", "TURN DISK…" | engine `$9000-$94D5`, `$B5FA`, `$B630`, `$B6CB`, `$BBD0` | the front-end font at engine `$8800`: A-Z at `$40-$59`, 0-9 at `$36-$3F`, space `$FE`, © `$35`, the Commodore key's sign `$2A` (a C with a bar), and punctuation that does not follow ASCII: `'` `$29`, `/` `$2B`, `.` `$2C`, `,` `$2D`, `:` `$2E`, `;` `$2F`, `?` `$30`, `!` `$31`, `-` `$32`, `(` `$33`, `)` `$34`; strings end with `$FF` |
| Scoreboard | drawn into sprite frames by engine `panel_draw_glyph` (`$99A4`) | glyphs from the same font's first pages: digits 0-9 at 0-9, super weapons A, B, C at 10-12, battery and generator glyphs from 16, weapon bars from `$20` |
| Levels' hidden messages | each level's `$98F0` | screen codes, A = 1, space `$20` |
| The ending's messages | ending `$0C8C-$0E7A` | ASCII codes into the ending's own font (ending `$6800`); `$11` new row, `$10` end |

## Strings

Found by decoding every part in each alphabet above, and as ASCII and
screen codes:

- Engine, title strings 0-40 (engine `title_strings`, `$9000`): the six
  high-score rows; "HIGH  SCORES"; "CREDITS:" and the credits; the ship
  enhancements' names (munitions pod, forward fire, tail gun, vertical
  fire, trident, converge, generator, battery); "KEYBOARD CONTROLS" and
  its eight keys; "SHIP ENHANCEMENTS".
- Engine, other texts: "© THALAMUS MCMLXXXVIII", "CYBERDYNE SYSTEMS",
  "PRESS FIRE TO START" (`$B630`); "TURN DISK TO SIDE B PRESS FIRE"
  (`$B5FA`); "LOADING" and the nine files' block counts, 67, 63, 67,
  44, 60, 62, 48, 69 and 48 (`$B6CB`); "GAME  OVER" (`$BBD0`).
- Engine, `$F9C7-$F9FA`: the effects' voice state, which in the loaded
  image holds three fragments of ASCII text, "ECIAL,X", "DCTRLSR,Y" and
  " CTRLSR,X", left in memory by the authors' tools. They are overwritten
  piece by piece as the effects use those bytes; five seconds into level
  1 (`parts/level-1/work/play.vsf`) " CTRL" and ",X" were still there.
- Each level, `$98F0`: a message no code uses. Levels 1 and 2 "DISHONEST
  JOHN", 3 "BASTARD JOHN", 4 "FVCKHEAD JOHN", 5 "JOHN H IS A", 6
  "HARRIES FVCKER", 7 "HAWKEYE'S SHIT", 8 "BASTARD J.W.H.". Levels 5 and
  6 read on as one sentence.
- The ending: five messages, one to a picture (ending `facts.md`).
- Side 1's boot menu, seen on screen: "1 Armalyte, 2 Loading picture, 3
  Walker's Warbles". The boot files are not in any part. The third
  entry's own text, and the one string left in its memory above it, are
  in `parts/warbles/facts.md`.

## Hardware registers

Every access to `$D000-$DFFF` outside colour RAM in the engine's and the
ending's code, read from the listings. Accesses to `$D000-$DFFF` made
with the I/O chips banked out (engine `level_setup_vars` copying a
level's characters, `title_screen_build` copying the title's data, the
mover) reach RAM and are left out. The levels hold no code.

| Register | What the game does with it | Where |
|---|---|---|
| `$D000-$D00F`, `$D010` | sprite positions: the scoreboard, the ships, the multiplexed objects; the title's balls | engine `panel_sprites_setup`, `ships_to_sprites`, `multiplexer_start`, `title_balls_multiplex` |
| `$D011` | screen on and off, row-24 mode to open the lower border, bitmap and text modes in the ending | engine `frame_irq`, `screen_on`, `screen_off`; ending `$09D3`, `$0A06` |
| `$D012` | raster lines for every interrupt and the multiplexer's waits; the loader keeps off bad lines | engine `frame_irq`, `multiplexer_start`, `fast_loader_get_byte`; ending `$09AF` |
| `$D015` | sprites on and off | engine `frame_irq`, `title_frame_irq`, `title_balls_start` |
| `$D016` | fine scroll and multicolour | engine `frame_irq`, `video_setup_play`; ending `$088C` |
| `$D017`, `$D01B`, `$D01C`, `$D01D` | sprite expansion, priority and multicolour, set once per screen | engine `video_setup_play`, `video_setup_title` |
| `$D018` | which screen is shown; the play, title, loading and ending screens | engine `frame_irq`, `video_setup_play`, `loading_screen`; ending `$088C` |
| `$D019`, `$D01A` | raster interrupt acknowledge and enable | every interrupt handler |
| `$D01E`, `$D01F` | written once at a level start, never read: collisions come from the screen and the objects' boxes | engine `video_setup_play` |
| `$D020` | border black | engine `front_end`, `video_setup_play`; ending `$0801` |
| `$D021-$D023` | the script's scenery and star colours, the end-of-level fade, the logo's colour bars, the title's fades, the ending's text colours | engine `level_script`, `level_end_sequence`, `logo_colour_bars`, `title_loop`; ending `$0A06` |
| `$D025`, `$D026`, `$D027-$D02E` | sprite colours | engine `video_setup_play`, `panel_sprites_setup`, `multiplexer_start` |
| `$D400-$D406` + 7n | the three voices: frequency, pulse, control, envelope | engine `music_play`, `music_init`, the effects at `$FA3C-$FC43` |
| `$D417` | written only with 0: the filter is never used | engine `music_init`, `music_play` |
| `$D418` | volume, faded by the music | engine `music_init`, `music_play`, `sfx_silence` |
| `$D41B` | voice 3's oscillator read as noise for one kind of effect | engine `sfx_special_step` |
| `$DC00`, `$DC01` | keyboard and joysticks | engine `keys_play`, `joysticks_read`, `title_start_keys`, `title_function_keys`, `pause_and_fire`; ending `$08D1`, `$0923` |
| `$DC02`, `$DC03` | port directions | engine `engine_start`; ending `$0923` |
| `$DC06`, `$DC07`, `$DC0F` | timer B, the PAL timing check | engine `front_end`, `timing_check` |
| `$DC0D` | CIA 1's interrupts off | engine `front_end`, `level_setup_vars`; ending `$0801`, `$0923` |
| `$DD0D` | CIA 2's interrupts off, when the ending hands back | ending `$0923` |
| `$DD00`, `$DD02` | video bank, and the fast loader's clock and data lines | engine `fast_loader_get_byte`, `level_setup_vars`, `loading_screen`; ending `$088C` |

Never touched: `$D013`/`$D014` (light pen), `$D024` (no extended colour
mode), `$D415`/`$D416` (filter cutoff), `$D419`/`$D41A` (paddles), CIA
1's timer A and both time-of-day clocks, CIA 2's timers, port B and its
direction register.

## The listing's comments

Two samples of the listing's comments, each checked against the bytes by
an agent (on `claude-opus-5-5[1m]`) that wrote none of them. Comments
are counted in two strata: written by hand (engine and ending) and
written by the level decoder from each level's tables.

- **First sample**, seed 20261007, 80 comments: 60 of the 640 written by
  hand and 20 of the 1,944 written by the decoder. 13 were wrong, 16.2 %
  (Wilson 95 % interval 9.7-25.8 %); 5 of the 60 by hand (8.3 %) and 8
  of the 20 by the decoder (40 %), so 32 % weighted by the strata's
  sizes. All eight from the decoder, and two of the hand-written ones,
  gave rates in frames where the routine runs every second frame: the
  main loop runs the paths and the animation on alternate frames
  (`$68`). The rest were details: what objects 16-19 are (the four
  enemy shots), the NMI vector in play, and the state the boss's
  break-up starts its pieces in. The decoder's path sentence and its 640 comments were
  rewritten, and every reader of `$68` and the comments of every routine
  it gates were checked and 16 rewritten.
- **Second sample**, seed 20261008, drawn after those corrections from
  the comments the first did not draw: 60 of 643 by hand and 20 of 1,944
  by the decoder. 5 were wrong, 6.2 % (Wilson 2.7-13.8 %), all by hand:
  5 of 60 (8.3 %, Wilson 3.6-18.1 %), and 0 of 20 by the decoder (0-16.1
  %), so 2.1 % weighted. The wrong ones: the title font's punctuation
  read as ASCII (`$2E` is a colon, so "CREDITS:" and "PRODUCED BY:"), the
  high-score row's default name, which is three full stops, a table of
  colour-RAM places called screen places, the near stars' rate (every
  second frame), the pages the protection's wipe clears, and one gap in
  the scoreboard sprites' spacing. All five were rewritten, with the
  places in the notes and on the page that decoded the font the same
  way.

## Live tests

Run in VICE 3.13.2 (x64sc, PAL), from the snapshots in `orientation.md`:

- Boot from side 1 to the menu, the engine's load, the turn-disk prompt,
  side 2 and level 1's load; every later level and the ending reached
  through the engine's own loader (`orientation.md`).
- Level 1 played through with no input: the main loop kept pace (25,299
  passes in 25,298.5 frames); the mid-level boss went after 2,880 frames
  and paid 50,000; the end boss went after 12,288 frames and the level
  was completed; level 1's scroll went from column 7 to column `$D6`
  in 8,287 frames.
- Level 7 starts at column `$7F` (`$85` five seconds in).
- The title's keys: F1 two players and back, F3 the starfield 2, 0, 1,
  F7 the demo; fire starts.
- In play: the Commodore key steps player 1's super weapon A, B, C and
  round, `/` player 2's; RUN/STOP pauses at the end of a scroll step and
  fire ends the pause; Q quits only while paused; S in the pause does
  nothing.
- Super weapons: held fire tries one at the fifteenth frame; A, B and C
  each fired from a full generator, which dropped by 2, 2 and 1.
- The drone stays opposite the stick's direction, stays put with the
  stick released, and SPACE detaches it where it is and calls it back.
- Two players: ship 1 moving into ship 2 pushes it a cell.
- Invulnerability at a level start: 103 frames for ship 1 and 205 for
  ship 2, counted from the main loop's first pass.
- An extra life when the score passes a multiple of 100,000.
- The generator, from an empty charge and no batteries: the rebuild
  count stepped every 61 frames with no generator and every 19 with
  four, and the charge reached 6 after 488 and 152 frames.
- `POKE 59891,173` (a `LDA` over the `DEC` of a life): the machine froze
  within five frames.
- Poking `$B005` to 9 in play gave nine lives and the game went on;
  poking the three super-weapon costs at `$F486-$F488` to 0 let held
  fire send super weapon A across the screen with no charge, which
  without the poke it did not (`cheats.md`).
- `$D220` in play, with the I/O chips in: reads as the border colour,
  and a 5 written there turned the border green, so the wiki's `POKE
  53792,96` only writes black into a black border.
- The play screen's colours: colour RAM 8, `$D021` white, `$D022` light
  blue, `$D023` blue, so space is black characters and stars are
  `$D022`/`$D023` pixels.
- The ending's first four pictures appeared in turn in the frame, each
  with its message typed beneath.
