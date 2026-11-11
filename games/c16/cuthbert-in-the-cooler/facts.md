# Cuthbert in the Cooler — verified technical facts

Evidence comes from the verified $1100 hand-over in `work/entry.p4emu`, the committed listing, and plus4emu 1.2.11. A forced counter or subroutine call proves a code boundary; it does not establish a played route to that state.

## Build

Microdeal, 1985, PAL C16/Plus4, 16 KB. The supplied packed PRG's SHA-256 and boot recipe are in `orientation.md`. The programmer and precise release identity are unknown. The C16 cassette's instructions are the primary rules source; the Dragon/CoCo game and Game Boy remake describe other programs.

## Memory layout

| Thing | Where |
|---|---|
| Generated attributes and characters | $0800-$0BE7 and $0C00-$0FE7 |
| Enemy shifting scratch buffer | $1000-$102F |
| Game entry, main loop and game over | $1100, $1172 and $118D |
| Inline printer | $125F, with character conversion at $127E |
| High score and score | Six ASCII digits at $12DD and $12F2 |
| Displayed lives | One inline character at $1A26 |
| Enemy spawn pointers and ten seven-position records | $1BA7-$1C46 |
| Sound flags and map base pointer | $200A-$2010 |
| Ten maze records | $2011-$2100, twenty-four bytes each |
| Source graphics directory | Five little-endian pointers at $3300-$3309 |
| Horizontal and vertical player frames | $330A-$3409 and $340A-$3589 |
| Four fire frames | $358A-$3609 |
| Two enemy source banks | $360A and $36AA, each containing five 32-byte images |
| Retained graphics tail | $374A-$3761; intended picture unknown |
| Static glyphs $00-$68 | $3800-$3B47 |
| Generated fire, guard and player glyphs | $3B48-$3B67; $3E70-$3FBF; $3FD0-$3FFF |

Coverage counts 6,059 bytes: 3,419 code and 2,640 data, including inline arguments. Runtime state and the retained non-engine memory are excluded with reasons in `game.json`. The source-graphics tail is retained and described, rather than assigned an invented meaning. The listing has no uncounted loaded-data ranges.

## Timing

`start_game` disables interrupts; the game neither installs a handler nor waits for a raster line. The KERNAL IRQ vector remains $CE0E with ROMs enabled. The main loop paces itself with `pace_loop` ($11E7) and `delay_busy` ($132C).

**Live:** 36 main-loop starts were counted over 3,523,436 TED double-clock cycles in a 100-frame advance from the first-maze boundary, approximately 1.987 seconds at 1,773,447 cycles/second. This is one idle four-guard sample, not a fixed game speed. The loop's work varies with enemies, movement and effects.

`reset_bonus` starts with 21 and immediately decrements it, showing 20 segments. Each later segment lasts 100 main-loop updates. The next decrement below zero invokes death. Completing a maze awards 40 points per remaining segment ($151F-$155D). `delay_long` decrements Y modulo 256; Y=0 gives 256 calls, rather than zero calls.

## Controls

`poll_inputs` ($1339) combines joystick 1 with these keyboard controls. Zero means pressed; the released keyboard masks are 128,32,32,4,16 in up/down/right/left/fire order.

| Action | Key | Result from the same observed starting boundary |
|---|---|---|
| Up | RUN/STOP | Flag $11 becomes zero; the exit is blocked while objects remain. |
| Down | COMMODORE | Flag $12 becomes zero; player_y changes 0→1 and vertical half-step 0→1. |
| Right | : | Flag $13 becomes zero; player_x changes 36→37 and horizontal half-step 0→1. |
| Left | L | Flag $14 becomes zero; a wall blocks the initial left move. |
| Bomb | SPACE / joystick fire | Flag $15 becomes zero. The bomb handler precedes this scan and consumes the previous loop's flag. |
| Pause / resume | P / R | **Live:** P parks in the $1345 polling loop or its $1363 helper; R returns play to $1172. |

Joystick reads select port 1 with $FB at $FF08 and use bit 6 for fire. Keyboard row and mask tables are at $136D and $1372. A control snapshot must be taken after the startup fade and before a verified loop pass.

## Graphics

TED draws a 40×25 character screen in multicolour text with 256 glyphs and a RAM font at $3800. `draw_player` ($1621) replaces glyphs $FA-$FF from eight 32-byte horizontal frames and eight 48-byte vertical frames. Horizontal frames use two rows of two glyphs; vertical half-steps can use three rows.

`draw_enemy` ($1CA6) gives each normal active slot six glyphs, from $CE plus six times its index. It copies a 16×16 source image into $1000, shifts the image horizontally by four single-width pixels or vertically by four scan lines for a half-step, and writes 48 bytes into the slot's private glyphs. Normal levels activate at most six of seven allocated slots. The address helper ($1EF4) returns $3E70,$3EA0,$3ED0,$3F00,$3F30,$3F60 for slots 0-5. Slot 6 returns $3E91 through an overflow, rather than the expected $3F90; this dormant-slot case is not a demonstrated normal-play fault.

`update_enemy` ($1DCC) decrements one shared animation divider per active enemy update. At zero it reloads 21 and switches between source banks. Shapes cycle 1,2,3,4 with the level; colours repeat every eight levels. Each source bank has a fifth retained image outside the normal 1-4 selectors. The intended use of the additional 24-byte graphics tail is unknown.

The font keeps the ordinary letter/digit ordering used by the inline printer: PETSCII A-Z becomes glyphs $01-$1A, ASCII digits stay $30-$39, and parameters below $20 become glyphs $40-$5F. Glyphs $44-$47 form keys, $48-$4B rings, $50-$53 apples and $5C-$5F wall tiles. The printed BONUS label is at $198D; most other inline strings are shape selectors or mutable digits. The standard string sweep's candidates at $213E and $3407 lie in retained memory or graphics, not instruction text.

## Mechanics

- **Lives:** the image displays spare-life character `4`, and five forced timeouts reach game over, with characters $33,$32,$31,$30,$2F. The manual's three-Cuthbert statement differs from this image.
- **Movement:** `move_player` ($145A) prioritises right, left, up, then down. Two half-steps move the screen pointer one character horizontally or one row vertically. Right movement tests neighbours when the horizontal half-step is one and skips at zero; left tests at zero and skips at one. `sample_player_neighbours` normalises codes at least $60 to spaces; player death is tested separately.
- **Pickups:** `collect_object` ($187F) searches eight edge cells while the player is vertically aligned. Keys, rings and apples pass nominal hundreds values 1,2,3 to the adder. Overflow remainder can be lost, as below. One object-bearing map packet contributes one to `objects_left`. A successful upward move at the top exit needs player_y=0 and objects_left=0.
- **Bombs:** inventory starts at three. Placement decrements it; a later fire flag can detonate the one active bomb after its six-update rearm delay. A button edge is not required. The explosion occupies the same 2×2 character footprint as the bomb, with four source images. Completing a level adds one bomb, capped at nine; `draw_bomb_inventory` ($1F49) draws at most five icons. **Live:** inventory 9 draws five icons.
- **Collision:** `check_contact_cell` ($1A34) accepts glyphs $69-$F9 as lethal. The four explosion glyphs $69-$6C kill Cuthbert and guards; a destroyed guard passes 1 to the hundreds adder. The player's own $FA-$FF glyphs pass the test. A guard kill discards two return addresses at $1F44-$1F47, ending the entire $1C47 enemy scan and leaving lower slots unvisited in that pass.
- **Enemy decisions:** `choose_enemy_direction` ($1E64) reads TED timer 2's low byte. Values below 220 retain the previous state; otherwise a fresh reading is taken. A fresh reading below 45 stores state 5-49, producing an idle update. Other states/readings are masked to four directions and tested against two leading cells and the top/bottom bounds. Blocked choices retry. The code does not calculate a direction toward the player.
- **Progression:** units select one of ten layouts and its spawn addresses; tens select four, five or six active guards. Thus 0-9,100-109 and 200-209 have four, 10-19,110-119 and 210-219 five, and higher tens within each hundred six. **Live:** completing forced level 255 enters level 0 and adds a bomb.
- **Game over:** $118D compares the score with its six-digit high score, clears the score and shows random nonzero level layouts selected from the timer until fire starts a new game. The high score remains in RAM between games.

## The extra-life boundary

`check_extra_life` ($1952) awards a life when the score's ten-thousands character changes. It increments the ASCII life character, then compares it with raw $08. That comparison fails to constrain normal ASCII digits.

After 203 awards from the initial $34, the byte is $FF, permitting 208 attempts. Award 204 wraps it to $00. `draw_lives` calls `print_inline` with that byte as the first character of a two-byte string; the printer sees the zero immediately and returns to the second zero, $1A27, which executes `BRK`.

**Live, forced boundary:** starting at $FF and invoking the unchanged award code stops on $1A27 with life byte 0 and opcode 0. Continuing enters the C16 monitor, which prints `BREAK` and a PC of $1A29. `reference/life-overflow.png` records it. This proves the counter failure, not a played route to two million points. The original-code tests reproduce all 204 awards and count all 208 attempts from $FF.

## Score carry and the bomb route

The adder at $1301 replaces a digit at or above ASCII colon ($3A) with ASCII zero and increments the next digit. It does not preserve remainder above ten. **Live, controlled case:** score `000800`, A=3 at `add_hundreds` ($12FA), produces `001000`. In original-code tests, 900+200 and 900+300 also produce 1000. Seven apples from zero produce the sequence 300,600,900,1000,1300,1600,1900. Therefore the maze table's sums are nominal face values; collection order and the prior score can affect the actual gain.

**Live, ordinary input route:** from the verified first-play boundary, hold SPACE without moving. At each entry to `poll_inputs` ($1339) the same key remains held. Deaths occur before the life decrement at input polls 8,9,10,11,12, with life bytes $34,$33,$32,$31,$30. The game reaches $118D with $2F, two bombs left, and five contacts with explosion glyph $69. `reference/bomb-route.json` records these milestones. `test_sound.js` replays the unchanged engine from its entry on the kit's C16 model and matches every poll/death milestone. Death resets the player and timer but retains the active bomb at the starting exit.

## Data tables

Each maze is four rows of six bytes. A byte's six low bits draw a 3×2 block of wall/floor tiles, each tile two characters wide and high. Its high two bits select no object, a key, a ring or an apple. An object occupies the first zero wall bit when scanning bits 0-5. The game's six position offsets are 84,82,80,4,2,0 at $1846. The border is drawn separately, giving a 20×10 tile maze with an opening at top column 9.

`test_cooler.js` compares the published decoder's complete 800 character and 800 attribute cells with `build_level` for every level byte 0-255. The first blank cells inherit the level-number printer's $61 attribute until a wall or object restores the wall attribute; the port preserves this too.

| Layout units | Keys | Rings | Apples | Nominal pickup value |
|---|---:|---:|---:|---:|
| 1 | 3 | 3 | 2 | 1500 |
| 2 | 3 | 3 | 2 | 1500 |
| 3 | 2 | 1 | 2 | 1000 |
| 4 | 1 | 3 | 0 | 700 |
| 5 | 0 | 0 | 7 | 2100 |
| 6 | 0 | 7 | 0 | 1400 |
| 7 | 3 | 1 | 0 | 500 |
| 8 | 1 | 2 | 1 | 800 |
| 9 | 3 | 2 | 1 | 1000 |
| 0 | 1 | 4 | 0 | 900 |

Every layout also has seven spawn addresses. The normal game selects at most the first six; all seven are preserved in the source record and level viewer's inactive-position overlay.

## Sound

The engine writes TED frequencies and enable bits directly; its sound routine is $1F9A. Movement changes trigger short voice-1 square pulses, with an alternating skipped pulse. An idle bomb drives voice-2 noise; detonation replaces it with a ten-update noise effect. `silence_sound` clears sound enables while retaining the volume nibble with its low three bits set. The additional byte at $77 is cleared there; its further purpose is unknown. No tune table is identified in the engine; the full hardware census and decoded code expose sound effects rather than a sequenced music driver.

`reference/sound-data.js` holds three original-code write logs: walking, a bomb followed by detonation while moving away, and the held-fire-at-exit route. `test_sound.js` regenerates each from the committed listing on the kit's C16 model and renders it through TEDSound, requiring nonzero audio. Only the write logs are published; the engine executes in the tests. The held-fire milestones are additionally checked against plus4emu.

| Registers | Engine use |
|---|---|
| $FD30, $FF08 | Matrix keyboard and joystick selection/input ($1363,$1378). |
| $FF02 | Timer-derived enemy choices and attract layouts ($11BE,$1E64). |
| $FF07,$FF12,$FF13 | Multicolour mode and RAM font selection ($1100). |
| $FF0E,$FF12 | Voice 1 pitch ($1400). |
| $FF0F,$FF10 | Voice 2/noise pitch ($140E). |
| $FF11 | Sound enable bits and volume ($13C7-$13FC). |
| $FF15-$FF17,$FF19 | Background, shared multicolours and black border ($1100,$141C). |

The census found 34 decoded instructions naming these 14 registers. Register access is a census of the engine's decoded instructions, not a claim about the earlier loader.

## The listing's error rate

Seed 20261111 drew 80 of 249 comments: all 20 generated maze/spawn descriptions and 60 of 229 written comments. The independent checker, `gpt-6-astra`, found 16 wrong details, all confirmed against the code and corrected. Ten were one repeated wording error: nominal pickup sums presented as actual gains despite the adder's lost remainder. The other six concerned horizontal half-step tests, score overflow, the BONUS parameter versus its screen glyph, a guard kill leaving the entire scan, and the dormant seventh slot's address arithmetic. One additional sound-byte purpose was unverifiable and is recorded as unknown.

The plain measured error rate was 16/80, 20.0%, with Wilson 95% interval 12.7%–30.0%. The strata were 10/20 generated and 6/60 written; weighting by their populations gives 13.2%. This measures the comments before those corrections and is a lower bound on the true error rate because a checker can miss errors. The listing has not had a full audit. A later audit of every comment, followed by a new independent sample, is recommended.

## Live tests

All 46 emulator self-checks passed; a separate launch/use/exit footprint check found no unexpected files outside the repository. Live controlled checks covered keyboard flags and blocked/allowed movement, five initial deaths, P/R pause/resume, ten rendered layouts, nine stored bombs versus five icons, level 255→0, and the $FF→$00 life-character failure entering the monitor.

`test_cooler.js` runs 489,540 comparisons against original routines from the committed listing: all 256 level bytes, every pickup record in ten layouts, all 204 extra-life increments through the failure, initial/maximal death counts, all 256 collision glyph values, 30,000 score/pickup combinations, blocked horizontal half-steps, seven glyph-address inputs, a guard kill that ends the scan, and 458,752 direction-selector cases. The selector tests all pairs of timer bytes for previous states 0,1,2,3,4,5,49, stopping before the separate wall checks. The mechanic ports come from the same `reference/cooler.js` used by the pages.

`test_frame.py` compares the published reconstruction with the frozen plus4emu reference: zero of 64,000 display pixels differ. `test_sound.js` checks three audible original-code excerpts and replays the legal bomb route on a second machine model. Game-code execution is confined to tests; the published widgets use JavaScript ports and extracted data.
