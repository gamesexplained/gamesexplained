# Arkanoid — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`
(`work/entry.vsf`, the hand-over); *live* facts were measured in VICE
(x64sc, vice-mcp v3.13.2, PAL) on 5 and 6 October 2026, and *sim* facts in
the kit's simulator (`kit/c64/machine.js`) run from the same image.

## Build

Imagine's disk, PAL, as a G64 (`orientation.md`). The game is one file,
`arkaniod`, loaded to `$0400`-`$FFF9` by a fast loader and started at
`$9400`; the hand-over image is that file byte for byte. No build string
or version number was found (string sweep in PETSCII and screen codes).

The file carries a good deal of an earlier build alongside the live one:
an earlier assembly of `$A971`-`$B5FF` at `$096B` onward, of `$0600`-`$0959`
at `$1800`, of the `$F7xx`-`$FFxx` interrupt and input code at `$BA6B`-`$BFFF`
(a 30-sprite multiplexer, an IRQ at `$B971`, a joystick reader for port 2
only), and of the sound driver at `$3B8B`-`$3EFF` and `$3F96`-`$3FFE`
(assembled `$1000` higher). Nothing runs or reads any of them.

## Start-up and protection

- `$9400`: `LDA #$35 / STA $01`, an undocumented `NOP #$AD` (`$80 $AD`),
  `JMP $095A`.
- `$095A`: an undocumented `NOP $03AD,X` (`$FC $AD $03`), then
  `JSR $B9C3`. The bytes after it (`$0960`: `LAX $F004`, `STX $FCF7`,
  `NOP $AD`, `JMP $F000`) never run: `$B9C3` ends in `JMP $F000` and does
  not return (*sim*: nothing at `$0960`-`$096A` executed).
- `startup` `$B9C3`: stops CIA 1 timer A, sets up CIA 2, calls `$5F42`,
  `mux_init` `$F7FE`, `nmi_timer_init` `$F0C3` and `irq_init` `$F831`,
  overwrites its own first 40 bytes with `$20`, `CLI`, `JMP $F000`.
- `$5F42`: calls `$A949`, which XORs `$BA0A`-`$BA6A` with `$A71A`-`$A77A`;
  then sends a byte out through CIA 1's serial port (`$DC0C`, timer A,
  control `$D9`) and waits for the serial-port interrupt bit (`$DC0D`
  bit 3), keeping the interrupt register in `$BA65` (`$09` on VICE,
  *live*); then fills `$5F40`-`$5F86`, itself, with `$01`.
- `$BA0A`-`$BA6A` is plain code in the loaded file and noise in play: the
  XOR at start-up scrambles it, it does not decrypt it (`play-ram` equals
  the image XOR the key at every byte but `$BA65`). In plain form it is a
  longer serial-port check that, on failure, sets `$0944` and `$BA65` to 1;
  every exit is `JMP $A949`. Nothing calls it in this build; `$B9F8` is an
  unused entry that would XOR it back and fall into it. The key
  `$A71A`-`$A77A` is live code (`vaus_vs_enemies` and the start of
  `fire_laser`).
- `$0944` (`tamper_flag`) enables `wipe_memory` `$A523` (tested at
  `$A2CB`), which copies a memory-trashing loop to `$01C0` and runs it.
  The only writers of `$0944` are the scrambled check above and a
  checksum over `$9500`-`$A5FF` at `$F9BC`-`$FA05`, which nothing calls.
  The wipe never runs.

## Memory layout

| Thing | Where |
|---|---|
| Zero page: multiplexer and pointers; music driver call stacks and state; drum sequencer | `$02`-`$13`; `$30`-`$47`, `$60`-`$77`, `$A8`-`$BF`, `$E0`-`$FF`; `$78`-`$8F`, `$DA`-`$DF` |
| Game variables | `$0200`-`$02AF` |
| Silver and gold brick tables (flag, hits, screen address) | `$0300`, `$0355`, `$03AA` |
| Bricks left, special bricks, background colour and character | `$0455`-`$0458` |
| Each player's saved wall, 160 bytes in the round-map layout | `$0459`, `$04F9` |
| Title intro animation, keyboard helper | `$0600`-`$0926` |
| Scores, thresholds, lives, players, rounds, menu choices, high score | `$0927`-`$0959` |
| Unused earlier builds, power-on fill | `$096B`-`$1BFF` |
| Play characters `$80`-`$FF` for round 33 | `$1C00`-`$1FFF` |
| Sound-effect patches | `$2000`-`$245B` |
| Music driver tables and state | `$245C`-`$2614` |
| Sound driver | `$2615`-`$3429` |
| Tunes: table, sequences, instruments | `$342A`-`$3B8A` |
| Sequence command vectors | `$3F00`-`$3F95` |
| Title picture: bitmap, colour matrix (video bank 1) | `$4000`-`$5F3F`, `$6000`-`$63E7` |
| Intro sprite frames `$A0`-`$D5` (bank 1) | `$6800`-`$757F` |
| Panel template, 25 rows of 13 screen codes | `$7800`-`$7944` |
| Doh screen, 26 × 24 screen codes | `$7B90`-`$7DFF` |
| Round brick maps, 32 × 160 bytes | `$8000`-`$93FF` |
| Hand-over; sprite object tables | `$9400`; `$9409`-`$9450` |
| Game code | `$9500`-`$B711`, `$B983`-`$B9F7`, `$F000`-`$FF39` |
| Menu, story and ending text (PETSCII) | `$B712`-`$B982` |
| Screen, sprite pointers (video bank 3) | `$C000`, `$C3F8` |
| Character set: font, background tiles (copied in per round), bricks, walls, panel | `$C800`-`$CFFF` |
| Sprite shapes `$40`-`$A7` (under the I/O area from `$D000`) | `$D000`-`$E9FF` |
| Background tile sets: round 33, set A, set B | `$EA00`, `$EC00`, `$EE00` |

## Timing

- Interrupts (*live*, `work/frame-play.json`): a raster chain through
  `$FFFE`. `irq_frame_bottom` `$F720` runs at line `$F7`, counts the frame
  in `$0201`/`$0241` and sorts the twelve virtual sprites; it points the
  vector at `irq_frame_top` `$F75E` for line `$14`, which places the first
  six and points it at `irq_mux` `$FBEE`, which places the rest down the
  screen.
- NMIs come from CIA 2 timer B, one-shot, in a pair a frame
  (`nmi_frame_a` `$F855`, `nmi_frame_end` `$F903`, `nmi_phase` `$F958`).
  The first call runs the sound tick `$F889`; the second counts the tick
  `$0200` and runs the sound again during play. `$DD0D` = `$8A` enables
  timer B and serial-port NMIs (`$F0D5`); a serial-port NMI would jump to
  `$0107` in the stack page (`$F90B`), which never happens in play.
- The main loop waits on `$0200` at `wait_tick` `$B472`: one pass a
  frame. The sound driver runs twice a frame in play, once on the title.

## Controls

- Title: any key in keyboard row 7 or any joystick line ends it
  (`$B4E3`); if the title tune ends first, the attract mode starts
  (`$B4F7`). *Live*: fire on port 2 brings up the menu.
- Menu (`input_menu` `$B557`): keys N J K P 1 2 D (KERNAL numbers
  `$27 $22 $25 $29 $38 $3B $12`, `$B5BD`). The game starts when fire is
  released after a press (`$B5AC`-`$B5BA`). *Live*: J, then fire on port 1.
- In play `read_input_device` `$FC9F` dispatches on `$093F`:
  - Neos mouse `$FE43`: strobes bit 4 through the port's direction
    register and reads four nibbles; the button is `$D419` = `$FF`.
  - Joystick `$FDA2`: `$DC01` (port 1), or `$DC00` (port 2) for player 2
    when two devices are chosen. A step of 2 × (`$023A` + 1), or 4 when
    `$023A` is 0 (`$FDBF`): the Vaus moves faster as the ball does.
  - Keyboard `$FD7B`: left SHIFT left, right SHIFT right, SPACE fire.
  - Paddles `$FE09`: POTX `$D419` (player 1) or POTY `$D41A` (player 2);
    the new centre is (255 − pot + old centre) / 2; fire on `$DC01` bit 2
    or 3.
- `place_vaus` `$FCEE` keeps the Vaus between X `$20` and `$DB`.

## Graphics

- Title: multicolour bitmap, bank 1 (`$D018` = `$81`, `$DD00` = `$C2`).
  Menu, story and play: bank 3, screen `$C000`, characters `$C800`
  (`$D018` = `$02`/`$03`, `$DD00` = `$90`). *Live*: both frames redraw
  from memory with 0 pixels different (`kit/c64/frame.py compare`).
- The playfield background is a 4 × 4 tile of characters `$40`-`$7F`,
  copied each round from `$EC00` or `$EE00` by bit 1 of the round index
  (`$F552`: set A for rounds 1, 2, 5, 6…, set B for 3, 4, 7, 8…), and
  from `$EA00` for round 33 (`doh_setup` `$9C59`, which also copies
  `$1C00` over characters `$80`-`$FF`).
- Bricks are character pairs: normal `$80 $81` (colour = type + 8),
  silver `$85 $89`, gold `$8D $91` (`$F40E`). Silver bricks shine
  (`silver_shine` `$AB55`).
- Twelve virtual sprite objects (`$942D` Y, `$9445` X): 0-1 the Vaus
  halves, 2-3 laser shots, 4-6 balls, 7 the capsule, 8-10 enemies or
  Doh's shots. Hardware sprites 2-7 are multiplexed; hardware sprites 0
  and 1 stay at Y `$EC` with shapes `$96`/`$97` from `$E580`, restored
  from `$E600` each round (`$F09E`).
- The capsule's letter is rebuilt each call:
  `$E541,x = ($E501,x AND $A850,y) OR $A80F,y` (`$A7E9`).
- The Break exit is characters `$E8`-`$EA` at column 27, rows 22-24
  (`$F6B1`), opened by `$A428` and animated by `$A45A`.
- Enemies come in through one gate in the top wall at X `$47`; the
  second gate path needs `$0246`, which nothing writes (`$9F9E`).

## Mechanics

- **Main loop** `game_loop` `$957F` (entered from `$F09B` after
  `new_game_init` `$F1B7`), per frame: `$AB55`, `$AA71`, `$FC99`, `$ADB3`,
  `$A995`, `$A5F3`, `$A7DC`, `$9CD5`, `$9E13`, `$A71A`, `$9F5E`, `$98B4`,
  `$AD85`, `$AD4B`, `$A41F`, `$9AE9`, `$FAFE`, `$B472`. Round 33 has its
  own loop, `doh_loop` `$95F9`.
- **Rounds**: 32 brick maps at `$8000` + 160 × index (`draw_round_wall`
  `$F3C2`). Each map is 16 rows of 10 bytes: a 16-bit column mask (14
  columns drawn) and 16 type nibbles. Below 8 is a normal brick; 8 or more
  with type AND 3 = 1 is silver; any other is gold, never counted or
  removed. Round index `$20` is Doh and has no map. *Live*: rounds 2, 3,
  4, 10, 18 and 33 reached by setting `$093D` and `$0455`
  (`reference/round*.png`).
- **Silver bricks** need 2 hits in rounds 1-8, 3 in 9-16, 4 in 17-24 and
  5 in 25-32 (`$F52A`, `$F4DF`).
- **Brick points** by colour 1-7: 100, 80, 120, 90, 110, 70, 130
  (`brick_points` `$B2C4`). An enemy is worth 100 (`$9F45`), a capsule
  1000 (`$A9DD`). Scores are BCD in units of 10, the panel's last 0
  fixed (`$0927`-`$092C`, `add_score` `$FBBD`).
- **Lives**: 4 at the start (`$F1D2`), BCD in `$0936`,X. A lost life at
  `$9B6F`-`$9B79`; `$99` after the decrement is game over (`$9B7D`).
  *Live*: three lost balls took the lives from 3 to 0.
- **Extra life** every 20,000 points (`check_extra_life` `$FAA5`: the
  threshold's middle byte starts at `$20` and gains `$20` per award);
  none if the lives would reach `$88`. *Live*: a score set to 199,900
  gave ten lives in a row, 3 to 13, as the threshold climbed to 220,000.
- **Ball speed**: steps a frame = `$023A` + the carry of `$0248` +=
  `$023B`, at most `$0B` (`move_balls` `$ADB3`); each brick hit adds 4 to
  `$023B` (`$AF5F`); a floor of frames-since-life / 1024 raises `$023A`
  too (`$ADE7`). A life starts at 2 (`$9ADB`); the attract mode at 4.
- **The bat** (`bat_collision` `$ABB3`): a hit when the ball's Y is the
  Vaus's + `$0A`..`$0C`; the distance from the centre picks one of three
  zones a side, each a pair of angle ratios. The inner two zones are
  swapped between the left side (`$AC12`-`$AC3A`) and the right
  (`$AD0F`-`$AD38`).
- **Capsules**: the type comes from the frame counter `$0201` when a brick
  breaks (`choose_capsule` `$B2E6`): frames `$20`-`$9F` give 1 or 2;
  `$00`-`$09` give 6, 5, 4 or 3 by four conditions (bit 1 of the lives,
  `$0241` ≥ `$12`, four or more special bricks, ball Y < `$80`); the rest
  give none. A type equal to the last is bumped by one, so 7 only comes
  from a repeated 6. A capsule falls only when none is falling and one
  ball is in play (`$B1E5`-`$B204`). Effects (`capsule_actions` `$A858`):

  | Type | Letter | Colour | Effect |
  |---|---|---|---|
  | 1 | S | `$08` | ball speed − 1, at least 1 (`$A8BA`) |
  | 2 | C | `$05` | catch: the ball sticks to the Vaus (`$A8AC`); fire or frame `$80` releases it (`$AA76`) |
  | 3 | E | `$06` | enlarge: width 4 to `$0C` (`$AA44`, `$AD4B`) |
  | 4 | D | `$03` | three balls, speed + 1 (`$A8CD`) |
  | 5 | L | `$02` | laser, two shots (`$A870`, `$A5F3`) |
  | 6 | B | `$0A` | the exit opens on the right (`$A868`, `$A41F`) |
  | 7 | P | `$0B` | a life, capped at 99 (`$A882`) |

  Catching any capsule first cancels catch, laser, break and enlargement
  (`cancel_powers` `$AA17`).
- **Break**: leaving through the exit ends the round (`$A41F` to
  `round_cleared` `$95CF`). No bonus is added on that path.
- **Enemies**: three slots; a spawn timer (`$0229`) of 192 updates;
  updated on 161 frames in 256 (`$9F5E`); type by round index AND 3
  (`$A3E8`). Destroyed by a ball (`$9E13`), a laser (`$A674`) or the Vaus
  (`$A71A`).
- **Doh** (round 33): the counter `$0455` starts at `$16` (`$95F4`); a ball
  hit on a Doh character `$80`-`$E7` takes one off (`$B11E`), and the
  ending starts when it goes below zero (`$9637`): 23 hits. Doh fires one
  shot per mouth cycle, aimed at the Vaus (`$9819`-`$987B`).
- **Ending** (`doh_defeated` `$9646`): Doh dissolves (`$970B`), the ending
  tune and drum track play, the title picture and the ending text
  (`$B8B0`) follow, then the player's lives are set to `$99` and
  `game_over` runs.
- **Attract mode** `$9500`: rounds 5, 14, 21 and 24 in turn (`$945B`); the
  Vaus follows ball 0 (`$9527`).
- **Two players** alternate on a lost life and on game over
  (`$9BE0`-`$9C31`), each with a saved wall (`$0459`/`$04F9`).

## Data tables

- Round maps `$8000`-`$93FF`; silver hits by round `$F52A`; brick points
  `$B2C4`; capsule colours `$B2BC`; capsule letters `$A817`; capsule
  effects `$A858`; attract rounds `$945B`; animation lists `$A376`.

## Sound

- The driver (`$2615`-`$3429`): `sound_reset` `$2690`;
  `music_start_tune` `$262B` with Y = 7n + 5 for tune n;
  `sound_effect_start` `$272F` with X = voice, A/Y = a 31-byte patch;
  `sound_busy` `$3417`. One tick is seven calls: the filter `$2B5D`, a
  sequencer per voice (`$2C15`, `$2D6C`, `$2EC5`) and an effects routine
  per voice (`$3022`, `$3160`, `$32D2`).
- Tunes: a table of 9 records of 7 bytes at `$342A` (three voice
  pointers, a tempo byte); tune 3 is empty. Sequences use two-byte notes
  and commands `$C0`-`$F0` dispatched through `$3F00`, `$3F32`, `$3F64`.
  Notes from an 81-entry table (`$2573`/`$25C4`), C0 to G6 and silence.
  Callers: tune 0 `$F03C`, 1 `$96E9`, 2 `$96F1`, 4 `$9B8D`, 5 `$967E`,
  6 `$A8A6`/`$FAF6`, 8 `$B4D4` (title); no caller of tune 7 was found.
- Twelve sound effects at `$2000`-`$245B`, three voice patches each.
- **Drums on the volume register**: a bytecode sequencer
  (`drum_script_step` `$FEF4`, run from the NMI while `$0209` bit 7 is set)
  reads scripts (title `$9960`, ending `$AB10`, idle `$9A71`); bytes `$80`
  and above choose a drum routine through the self-modified `JSR $DDDD` at
  `$FEE8`, commands below `$80` go through the one at `$FF12`. Each drum
  routine patches its own `STA $9418` into `STA $D418` and writes a noise
  nibble from `$DE` to the volume register in timed loops (`$F604`,
  `$F345`, `$AEEF`, `$B500`, `$B290`, `$ACD6`).

## Hardware register census

Every absolute access to `$D000`-`$DFFF` in the traced code, from the
hand-over image. Indexed accesses with a base outside a chip
(`$D3FE,X`, `$D7FF,Y`) reach the next chip.

| Register | Accesses | Use |
|---|---|---|
| `$D000`-`$D005` | `$F74F`, `$F755`, `$F80A`, `$F97D`, `$FC1E`, `$F223`, `$F226`, `$F982`, `$FC23`, `$F8CF` | multiplexer and the two fixed sprites |
| `$D010` | `$08DE`, `$F1E6` | sprite X high bits |
| `$D011` | `$B482`, `$B4C0`, `$B548`, `$B9AC`, `$B9B8`, `$B9BF` | bitmap/text mode, screen off/on |
| `$D012` | `$AF87`, `$F737`, `$F851`, `$F9A0`, `$F9AE`, `$FC4D`, `$FC69`, `$F8EB`, `$FC72`, `$FC05`, `$FC60` | raster chain, multiplexer timing |
| `$D015` | `$08D6`, `$9683`, `$96B4`, `$96FC`, `$9B07`, `$9C2B`, `$F08A` and others | sprites on/off |
| `$D016`, `$D018` | `$F01D`; `$B48C`, `$B543` | multicolour; screen and character bases |
| `$D019`, `$D01A` | `$F728`, `$F765`, `$FBF6`; `$F83E` | raster interrupt |
| `$D01C`, `$D01D` | `$08D9`, `$F27E`, `$F087`; `$F1E3` | sprite multicolour, X expansion |
| `$D020`-`$D029` | `$B491`, `$B550`, `$B496`, `$9CD1`, `$F600`, `$08EB`, `$08F0`, `$F24C`, `$F24F`, `$F96E`, `$FC0F` | colours |
| `$D400`-`$D418` | `$2694`-`$33FA`, `$3756`, `$AF0C`, `$B2AD`, `$F028`, `$FEF0`, drum routines | sound driver; volume samples |
| `$D419`, `$D41A` | `$FE20`, `$FEBC` | paddles, mouse button |
| `$DC00`-`$DC03` | `$083D`-`$0868`, `$956B`, `$B4E3`, `$B573`, `$F002`-`$F00F`, `$FDB5`-`$FEB9` | keyboard, joysticks, mouse |
| `$DC04`-`$DC0E` | `$5F46`-`$5F83`, `$B9C6`-`$B9DB`, `$F841`, `$F844` | protection serial check; interrupt mask |
| `$DD00` | `$B487`, `$B53E` | video bank |
| `$DD04`-`$DD0F` | `$B9CE`-`$B9D6`, `$F0C3`-`$F0D7`, `$F76A`-`$F774`, `$F856`-`$F87C`, `$F904`-`$F94A` | NMI timers |
| `$DD18` | `$F621` | a mirror of `$DD08` |

## Open questions and corner cases

- **Ball against an enemy, moving left** (`$9E9B`-`$9EAB`): the test uses
  `SBC #$18` where an add is needed, so it cannot hit; only the vertical
  test catches such a ball. Traced, not tried live.
- **Neos mouse on port 1** (`$FE86`): `TAX` replaces the port index with
  the X movement, so the later `$DC00,X` accesses reach a CIA 1 register
  chosen by the movement. Not tried: VICE's Neos mouse was not used.
- **The slow capsule** can be undone on the next frame by the time floor
  (`$A8BA` against `$ADE7`).
- **Disruption** clears `$0228`-`$022A` with one loop, which also clears
  the enemy spawn timer and the catch flag (`$A8CD`).
- `$F6C2` copies 25 bytes where 24 are meant; the extra lands on gate
  character `$EB`, `$FC` either way.
- `STX $150C` at `$FCF6` (patched to `$1515` at `$FD50`/`$FD6F`) writes
  into unused code; purpose unknown.
- The ending's dissolve walks 61 character codes over 60 saved (`$970B`).

## Live tests

| Test | Result |
|---|---|
| Boot, loader, hand-over at `$9400` | `orientation.md` |
| Title and play frames redrawn from memory (`frame.py compare`) | 0 pixels differ in each |
| Round index `$093D` and bricks left `$0455` set from round 1; rounds 2, 3, 4, 10, 18 and 33 | each drawn as expected; round 33 shows Doh |
| `POKE 39801,189` (`$9B79` `STA` → `LDA`) | three lost balls: lives 3 → 0 without it, 3 → 3 with it; the lost-life path ran 3 times in each |
| Score set to 199,900 against the 20,000 threshold | ten extra lives, threshold 220,000 |
| Protection serial check | `$BA65` = `$09` after it |
