# Ghostbusters — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`. *Live*
means observed in the kit's simulator (`work/sim/gb.js`: the whole image
on the kit's 6502 with the raster IRQ, both CIAs' timers, the speech NMI,
control port 1 and the keyboard); the script is named in "Live tests".
Times in seconds assume PAL, 50.12 frames a second (312 lines of 63
cycles at 985,248 Hz, `kit/skills/c64/c64-reference`).

## Build

No version or build string was found in the image; the only dated text is
the title's `DESIGNED BY DAVID CRANE COPYRIGHT 1984` (`$3671`). The file is
a OneLoad64 one-file conversion of memory `$0314`-`$FFFF`
(`orientation.md`). What is not Activision's: the hand-over at `$C800`
(masks the CIA interrupts, copies `$C830`-`$C92F` to `$0300`, zeroes
`$0200`-`$02FF`, `JMP $6000`), and probably the machine's power-on RAM
pattern the dump carries in unused memory (below, "The conversion's
leftovers"). No trainer, intro or converter's credit was found.

### Compared with a second copy

A cracked disk image (one file, `GHOSTBUSTERS`, 128 blocks, loading at
`$0801`; its unpacker ends with `JMP $6000`) was autostarted in VICE and
stopped at `$6000` (`work/d64/boot.py`), and its 64 KB compared with this
image as the hand-over leaves it (30 September 2026). Every region
described in `game.json` matches, except:

- run-time values: `name_entered_flag` `$6328` (1 there, 0 here), the
  operand at `$8000`, and 19 bytes of the speech player's own variables
  and operands (`$F085`, `$F0A6`, `$F138`, `$F1BD`, `$F318`, `$F3AA`,
  `$F41B`, `$F41F`, `$F4DA`-`$F4E5`);
- `$0400`-`$07FF`: other bytes. Bought there, the compact and the hearse
  show as noise in the shop (VICE screenshots); here both are whole (the
  Play port, same moment);
- `$FD30`-`$FD4F`: the KERNAL's vector table ($EA31, $FE66, ...) in place
  of speech data. Played through the speech port, phrase 3 differs in 750
  of 17,768 writes; phrases 0, 1, 2 and 4 are identical.

The zero page, the conversion's own areas and the run-time buffers differ
as expected.

## Memory layout

`$01` = `$35` throughout play: RAM at `$A000` and `$E000`, I/O at `$D000`
(`cold_start` `$6022`). `$01` is written only at `$6022`, `$608E`/`$60B4`
(character ROM copy) and in the dead loader (`$CE07`); no code maps the
RAM under `$D000` in (`opcodes.py --refs 0x0001`).

| Range | Contents |
|---|---|
| `$0002`-`$00FF` | zero-page variables: game state `$3A`, money `$57`-`$59`, PK `$5A`/`$5B`, men `$3D`, backpack power `$3E`, equipment `$6D`, building states `$C8`-`$DB`, sprite positions `$A0`-`$AF` and targets `$B0`-`$BF`, music `$82`-`$96`, speech `$F5`-`$FF` |
| `$0200`-`$0DFF` | the four car pictures, left halves only, 768 bytes each; `build_car_charset` `$7667` mirrors them through `$E700` |
| `$0E00`-`$0F7F` | the small car parked on the building screens (`$8451`) |
| `$0F80`-`$1FA7` | Zuul: character set `$0F80`, street screen `$1580`, temple top `$18F0`, colours `$1C60` (two maps in the two nibbles) |
| `$1FA8`-`$2A4F` | ordinary building: character set, screen `$2398`, colours `$26E0` |
| `$2A50`-`$304F` | city map character set |
| `$3050`-`$32FF` | facade characters, three overlapping 512-byte windows |
| `$3300`-`$3623` | code: Zuul climb scroll `$3300`, road scroll `$34F9`/`$356F`, car picture layout `$35E6` |
| `$3624`-`$38DD` | scroller text, glyphs, VIC init table `$371D`, keyboard tables `$374B`/`$3753`/`$389E`, scene tables, state table `$381A` |
| `$38DE`-`$3BDB` | car options text, `CITY'S PK ENERGY:`, status-line messages |
| `$3BDC`-`$3EB9` | voice-3 sound-effect interpreter and its tables |
| `$3EBA`-`$3FFC` | map colour tables, block shapes, the status report text `$3FB9` |
| `$4000`-`$5FFF` | VIC bank 1, rebuilt at start-up: sprite shapes `$4000`-`$50FF`, screen `$5400`, sprite pointers `$57F8`, character set `$5800` |
| `$6000`-`$643A` | cold start, video-bank unpacker `$610B`, title and sing-along |
| `$643B`-`$6FE1` | lyric split lines, lyrics `$6443`, cue times `$68F0`, title character set and maps |
| `$6FE2`-`$8D8F` | the frame loop `$6FEC` and the 64 state handlers |
| `$8D90`-`$9001` | end-page set-up, speech call `$8DB9`, raster IRQ `$8E76`, CIA set-up `$8FD8` |
| `$9002`-`$9DB9` | shared routines: new-game set-up, account number, sing-along ball, music player, money, input, scroller, PK energy, Slimer and streams, the men, text engine, number printing |
| `$9DBA`-`$A1BF` | PK rate masks, GHQ sign, building-screen facade and front tables |
| `$A1C0`-`$A1F3` | building attributes, car and item prices, Slimer reward |
| `$A1F4`-`$A836` | music: note frequencies, three track lists, 71 patterns, pattern pointers, 9 instruments |
| `$A837`-`$AAFE` | map, Marshmallow Man, sprite colour, shop and equipment tables |
| `$AAFF`-`$B407` | car picture pointers, the 28 text pages and their pointers, status message pointers |
| `$B408`-`$BFF7` | the run-length packed sprite shapes |
| `$C800`-`$C92F` | the conversion's hand-over and page image |
| `$CE00`-`$CF8B` | a turbo tape loader and load chain, never run |
| `$E000`-`$EB78` | run-time buffers and variables: car picture save `$E000`, pixel tables `$E600`/`$E700`, ticker `$E900`, input `$EA00`, name `$EAB3`, account digits `$EAC7` |
| `$F000`-`$F07F` | speech waveform buffer |
| `$F080`-`$F4E9` | speech player |
| `$F4EA`-`$FF9B` | speech data: phrase table, pitch lists, frame lists, samples |

## Timing

- **Raster IRQ** (`raster_irq` `$8E76`, vector `$FFFE`), once a frame at
  raster `$B8`, re-armed at `$8FC5`. While speech plays (`$EB`) it only
  acknowledges. On the title (`$20` = 0) it busy-waits for raster `$C1`
  and writes `$D011` with the lyric window's fine scroll (`$9A`), then
  waits for the line in `lyric_split_lines` `$643B` to put `$1B` back
  (`$8EB7`). In the game (`irq_game` `$8ED4`) it steps the random byte
  `$06` (shift left, new bit 0 = bit 7 XOR bit 4), counts the tick `$08`,
  runs the bottom scroller (`$9756`), and in states `$12` and up busy-waits
  for raster `$DF` to colour the status band (colour 6; 0 in states
  `$2A`-`$2C`) and for raster `$EC` to turn it black again. It then writes
  all eight sprites (x stored halved in `$A0`-`$AF`, doubled plus one on
  the way out, the ninth bit collected into `$D010`), the shapes to
  `$57F8` with colours from `sprite_colour` `$A949`, the background from
  `$3B`, sets the frame flag `$E2`, and runs the music (`$93F0`) and the
  sound effects (`$3BE9`).
- **PAL tick adjustment.** The start-up measures the last raster line and
  sets `pal_flag` `$EA73` (`$629C`-`$62BD`; `$FF` in the simulator). On PAL
  the IRQ increments `$08` again whenever the new tick has `$08 AND 7` = 1
  (`$8EDE`-`$8EEB`): 8 ticks in 7 frames, about 57.3 ticks a second, near
  NTSC's 60 (checked by the music port, `work/port/music/`). The pitch
  table stays NTSC's: `note_freq` `$A1F4` is tuned for NTSC (entry 57,
  $1C31, is 440 Hz on the NTSC clock), so on PAL every note sounds 0.65 of
  a semitone flat.
- **Frame loop** `game_frame_loop` `$6FEC` waits for `$E2`, then once a frame:
  timers and steering `$7003`, input `$7061`, idle timer `$708C`, pause
  `$70BA`, building colours `$7106`, status report `$7175`, ticker
  `$71F6`, PK and balance line `$726D`, typewriter `$72BD`, line input
  `$7347`, shop credit `$7399`, building timers `$73BD`, PK rise `$73F3`,
  new hauntings `$740C`, and the state handler through `$381A`
  (`$746D`). While a text page is typing or a line is being typed the
  loop returns before the timers.
- **Title loop** `$6305` waits for raster `$28` each frame; on PAL it runs
  the tune and lyric tick twice in one frame of eight (`$6338`-`$6348`).
- **Speech NMI.** The speech player points the NMI vector at `$F0C3` and
  runs CIA 2 timer B with latch `$0065` (`$F47E`-`$F48F`): an NMI every
  102 cycles, 9,659 samples a second on PAL (10,027 on NTSC). The game
  waits for a phrase to end (`$8DB9` polls the player).
- **Game clocks** in frames: PK +1 every 64 frames below 1000, every 32 in
  the 1000s, every 16 from 2000 (`frame_pk_rise` `$73F3`); building timers
  every 256 frames (`$73BD`); map sprites move 2 pixels on frames where
  `$09 AND $3C` is 0, with `$3C` from `pk_rate_masks` `$9DBA` by the PK's
  thousands digit (`$3F`, `$1F`, `$0F`, `$07`, `$03`, then `$01`): every
  64th frame below 1000, every other frame from 5000 (`map_move_sprites`
  `$7C85`).

## Controls

Joystick in **control port 1** only (`read_joystick_port1` `$96CA`, `$DC01`
bits 0-4 into `$33`); the keyboard scan `$96E8` (row selects `$3753`,
column masks `$374B`) gives a key code (column × 8 + row) in `$19` and a
PETSCII character in `$17`, and gives up while either port reads other
than `$FF`. These two are the only readers of CIA 1's ports.

| Control | Where | What the test accepts | Result |
|---|---|---|---|
| F1 on the title | `$6399` | `$19` = `$20` exactly | the interview, *live* |
| F3 on the title | `$63A8`, `$747E` | `$19` = `$28`; the skip needs `$EAB2` = `$28` and `name_entered_flag` `$6328` ≠ 0 | with no name typed since power-on, the interview as F1; with one, the stored account is decoded and play goes straight to the vehicle page, `$10000` if it fails the check, *live* |
| F5, F7, SPACE, RETURN on the title | `$6399` | | nothing starts, *live*; SPACE (`$17` = `$20`, no lyric scroll running) speaks phrase 1 (`$6385`-`$6393`), *live* |
| RUN/STOP | `frame_pause_key` `$70BA` | `$19` = `$3F`, states `$12`-`$29` | toggles pause `$47` bit 7 once per press (bit 6 latches the held key), SID volume 0; nothing below `$70EE` runs, the stick and PK freeze, *live*; no effect in the shop or the end pages, *live* |
| RUN/STOP + RESTORE | `nmi_restore_handler` `$6425` | `$19` = `$3F` when the NMI comes | blank, clear `$EAB2`, cold start `$6000`, *live*; RESTORE alone returns, *live* |
| SPACE in play | `frame_status_report` `$7175` | `$17` = `$20`, states `$12`-`$29`, no report scrolling (`$4C` = 0) | `BACKPACK POWER AT XX% OF MAXIMUM... X EMPTY TRAPS... X MEN LEFT...` on the ticker, *live* |
| B on the map | `map_bait_key` `$7F70` | `$17` = `$42`, states `$12` and `$24` (`$8925` runs the map code) | one dollop of bait (see Marshmallow Man) |
| Stick and fire on the map | `$7CAD`, `map_fire_select` `$7E55` | down held with fire picks the building below the street (`$6E` + 4) | route, set off, *live* |
| 1-3, E in the shop | `shop_keys` `$7A5B` | E only once a trap is owned (`$6A`) | pages, leave, *live* |
| Typed lines | `frame_line_input` `$7347` | any key; DEL backs up; RETURN ends | stored at `$EA00`; only the cursor column (below `$25`) limits the length |

## Graphics

- **VIC bank 1** (`$DD00` bits 0-1 = `%10`, `$6033`). Screen `$5400`,
  character set `$5800` (`$D018` = `$56`), sprite pointers `$57F8`. The
  start-up clears `$4000`-`$5FFF` (`$6048`-`$6058`) and rebuilds it:
  sprite shapes from the packed stream, the upper-case character ROM
  copied to `$5808`-`$5BFF`, 128 bytes of glyphs from `$36A4` over
  characters `$1B`-`$2A` (the ACTIVISION logo, TM, `$`, `%`, `'`, `!`),
  and the letter O's shape copied over the digit 0 (`$60C1`-`$60CA`).
  In the lyrics and end texts `(` is drawn as `!` (character `$28` from
  `$370C`).
- **Packed sprites.** `rle_unpack` `$610B` expands `$B408`-`$BFF7` into
  `$4000`-`$4ED7`, sprite shapes 0-59: the byte `$11` followed by n writes
  n zeros (0 means 256), any other byte is copied; it stops when the
  source reaches `$BFF8`, so shape 59 gets only its first 8 rows and the
  8 bytes at `$BFF8` are never read. `build_mirrored_sprites` `$6151`
  makes left-right mirror images of the 8 shapes at `$4640`-`$483F` into
  `$4F00`-`$50FF` through `pixel_mirror_table` `$E700` (a 256-byte table
  that reverses the four 2-bit pixels of a byte, built at `$605A`).
- **Cars.** Each car picture is 12 × 16 multicolour characters of which
  the image stores the left 6 columns (`$0200`, `$0500`, `$0800`, `$0B00`);
  `build_car_charset` `$7667` writes them to `$5A00` and their mirror to
  `$5D00`. Bought equipment is painted into the car picture
  (`shop_paint_item_in_car` `$793E`, through the mask table `$E600`), and
  the picture is kept at `$E000` for the drives (`$7AC8`, `$8007`).
- **Scenes.** The title copies its own character set (`$6960`-`$6F5F`) to
  `$5A00`; the map copies `$2A50`; a building copies six pages from
  `$1FA8` (Zuul: `$0F80`) (`st17_draw_building` `$82AF`), with the
  front layout chosen by `bldg_attr` `$A1C0` bits 6-7. Zuul's climb
  scrolls the screen down a row per step (`$3300`): 176 steps of three
  repeating tower rows, then the 21 rows of the temple top, 197 in all
  (*live*, agent 2).
- **Map colours.** `frame_colour_buildings` `$7106` recolours five of the
  twenty buildings a frame from `$3EE2` by the state's colour bits: 0
  green (`$0D`), 1 purple (`$0C`), 2 white (`$09`), 3 red (`$0A`); red
  alternates with green every 16 frames (*live*: `adddd…` in the colour
  RAM, 16 frames each).
- **Bottom row.** Row 24 carries the scroller (`$3624`, 128 characters) and
  the Activision logo as sprite 7 recoloured per raster line from `$3714`
  (`$9756`, `$97A1`), or in play the ticker and `CITY'S PK ENERGY:` line.

## Mechanics

### The game state

`$3A` indexes the 64-entry word table `state_handlers` `$381A`
(`frame_dispatch_state` `$746D`); a handler ends at `next_state` `$8D86`
(`$3A` + 1) or `stay_in_state` `$8D8D`.

| State | Handler | What |
|---|---|---|
| `$00` | `st00_interview_start` `$747E` | F3 skip, or the franchise form and name prompt |
| `$01` | `st01_name_entered` `$74BB` | name to `$EAB3`, `$6328` = 1, DO YOU HAVE AN ACCOUNT? |
| `$02` | `st02_account_answer` `$74D8` | Y: ask for the number; N: `$10000`; other: re-ask |
| `$03` | `st03_account_number` `$7505` | parse, decode; 0 = INVALID ACCOUNT NUMBER. |
| `$04` | `st04_invalid_wait` `$7544` | pause, erase |
| `$05` | `st05_reask_account` `$755F` | back to the question |
| `$06` | `st06_vehicle_clear` `$7572` | clear for the vehicle page |
| `$07` | `st07_vehicle_list` `$757E` | the four cars and prices |
| `$08` | `st08_you_have` `$758A` | YOU HAVE; the balance saved as the starting balance `$51`-`$53` |
| `$09` | `st09_show_balance` `$75A2` | the balance |
| `$0A` | `st0A_vehicle_prompt` `$75B0` | instructions, input |
| `$0B` | `st0B_vehicle_choice` `$7625` | SPACE: next car's options (`$75C2`); 1-4: buy if affordable |
| `$0C` | `st0C_build_car` `$7661` | build the car picture |
| `$0D` | `st0D_draw_car` `$76BF` | draw it |
| `$0E` | `st0E_shop_page` `$76C5` | shop page set-up |
| `$0F` | `st0F_shop_forklift` `$7749` | the shop each frame |
| `$10` | `st10_map_setup` `$7A9C` | map sprites, save the car picture |
| `$11` | `st11_draw_map` `$7AD5` | draw the city |
| `$12` | `st12_city_map` `$7BAB` | the map each frame |
| `$13` | `st13_drive_setup` `$7FC9` | drive set-up, length = route + 5 |
| `$14` | `st14_drive_screen` `$8036` | the road |
| `$15` | `st15_driving` `$8073` | the drive, Roamers, vacuum |
| `$16` | `st16_arrive_clear` `$8279` | arrival |
| `$17` | `st17_draw_building` `$82AF` | the scene; GHQ to `$22`, Zuul to `$28` |
| `$18` | `st18_carry_trap` `$84F2` | man 1 carries the trap |
| `$19` | `st19_place_man1` `$852B` | man 1 into position |
| `$1A` | `st1A_place_man2` `$8562` | man 2; fire turns the streams on |
| `$1B` | `st1B_streams_on` `$859B` | the streams, crossing test, power drain |
| `$1C` | `st1C_trap_open` `$86A0` | the trap's light rises |
| `$1D` | `st1D_slimer_escapes` `$8704` | a miss: a man slimed, +300 PK |
| `$1E` | `st1E_slimer_caught` `$875B` | the Slimer drawn down |
| `$1F` | `st1F_trap_closes` `$8794` | trap closed, reward, phrase 1 |
| `$20` | `st20_men_to_trap` `$8875` | men walk to the trap |
| `$21` | `st21_men_to_car` `$8896` | back to the car, to the map |
| `$22` | `st22_ghq_restock` `$88B6` | GHQ refills |
| `$23` | `st23_ghq_men_out` `$88DC` | three men walk out |
| `$24` | `st24_mm_gathering` `$8925` | MARSHMALLOW ALERT, Roamers gather |
| `$25` | `st25_mm_stomps` `$8970` | he stomps a building, -$4000 |
| `$26` | `st26_mm_baited` `$89DC` | bait: +$2000 |
| `$27` | `st27_roamers_return` `$8A03` | Roamers go back |
| `$28` | `st28_zuul_street_setup` `$8A2C` | the street outside Zuul |
| `$29` | `st29_zuul_street` `$8B07` | sneaking past the Marshmallow Man |
| `$2A` | `st2A_zuul_pause` `$8BBF` | pause |
| `$2B` | `st2B_zuul_climb` `$8BD5` | the climb |
| `$2C` | `st2C_close_portal` `$8C1F` | the portal closed, +$5000 |
| `$2D` | `st2D_end_foreclosed` `$8C74` | THE KEYMASTER AND GATEKEEPER ARRIVED… FORECLOSED |
| `$2E` | `st2E_end_good_try` `$8C86` | GOOD TRY |
| `$2F` | `st2F_print_name` `$8C96` | the name as FIRST LAST |
| `$30` | `st30_end_zuul_took_city` `$8C9C` | …ZUUL HAS TAKEN OVER YOUR CITY |
| `$31` | `st31_end_credit_text` `$8CA4` | YOU MADE MORE MONEY… CREDIT LIMIT TO |
| `$32` | `st32_end_credit_limit` `$8CAC` | the balance in whole hundreds |
| `$33` | `st33_end_account_text` `$8CBE` | YOUR NEW ACCOUNT NUMBER IS |
| `$34` | `st34_end_account_number` `$8CC6` | encode (`$90EE`) and print |
| `$35` | `st35_end_write_down` `$8CEA` | WRITE THIS NUMBER DOWN… |
| `$36` | `st36_end_congratulations` `$8CF6` | CONGRATULATIONS! THANKS TO YOU, |
| `$37` | `st37_print_name` `$8D06` | the name |
| `$38` | `st38_end_portal_closed` `$8D0C` | THE PORTAL… CLOSED… $5000 REWARD |
| `$39` | `st39_end_speech` `$8D18` | phrase 3 after a foreclosure; stick ignored |
| `$3A` | `st3A_wait_restart` `$8D29` | F1/F3: cold start |
| `$3B` | `st3B_start_balance_text` `$8D3A` | STARTING BALANCE: |
| `$3C` | `st3C_show_start_balance` `$8D42` | its figure |
| `$3D` | `st3D_end_balance_text` `$8D5D` | ENDING BALANCE: |
| `$3E` | `st3E_show_end_balance` `$8D65` | its figure |
| `$3F` | `st3F_to_end_speech` `$8D7F` | to `$39` |

The three endings, *live*: foreclosure `$2D` → `$3B`-`$3F` → `$39` →
`$3A` (phrase 3); win `$2C` → `$36` → `$37` → `$38` → `$31`-`$35` → `$39`
→ `$3A`; GOOD TRY `$2E` → `$2F` → `$30` → `$31`-`$35` → `$39` → `$3A`.

### Money

Six BCD digits `$57` (high)-`$59`. `money_add` `$9664` saturates `$57`/`$58`
at `$99` (*live*: `$999900` + `$2000` stays `$999900`); `money_subtract`
`$9636` stops at 0 (*live*: `$2500` − `$4000` = 0); `money_compare` `$9654`
tests affordability. A new franchise starts at `$10000` (`st02`, `$57` =
`$01`). Prices: cars `car_price_mid`/`_high` `$A1D4`/`$A1D8` ($2,000,
$4,800, $6,000, $15,000); equipment `item_price` `$A1DC` in hundreds
($400, $800, $800, $400, $600, $600, $500, $8,000 for items 0-7). Item 4
(shape `$37`, $600, no flag) is on no shelf (`shelf_shapes` `$AAB3`), so it
cannot be bought. `POKE 38454,96` makes `money_subtract` an `RTS`: every
purchase and the Marshmallow Man's charge become free (*live*: the hearse
for nothing, agent 6; $10,000 kept through a stomp, `t20-poke-mm.js`).

### Equipment

`$6D` holds a bit per item from `item_flag` `$A9A8`: detector `$01`, image
intensifier `$02`, marshmallow sensor `$04`, bait `$08`, vacuum `$20`,
laser confinement `$40`; traps are counted (`$6A` owned, `$6B` empty),
bait in dollops (`$69`, 5 per purchase). `shop_fire_at_car` `$78D8` refuses
at the capacity `car_capacity` `$AA9A` (5, 9, 11, 7) with message 7, YOUR
CAR IS LOADED TO CAPACITY. (*live*: load 9 in the hearse refused, 8
accepted). A trap's shelf refills, so traps can be bought up to the
capacity; the status report prints `$6B` as one digit, so 10 and 11 empty
traps read `:` and `;` (*live* by poking; a wagon and a balance of at
least $12,000 would reach 10). The image intensifier's flag `$02` is read
by `slimer_update` `$9AA6` in every bust state: without it the Slimer
(sprite 4) gets background priority (`$D01B` bit 4) and disappears behind
the building's foreground colours; with it he is drawn in front (*live*:
`$D01B` `$10` without, `$00` with, and the pictures show the Slimer cut
by a window without it). The six readers of `$6D` are `$76F5` (the
shelves), `$7923` (the purchase), `$7D79` (the warnings), `$81C7` (the
vacuum), `$87C9` (the laser confinement system) and `$9AAC`
(`opcodes.py --refs 0x6D`).

### PK energy

Four BCD digits `$5B`/`$5A`, capped at 9999 (`pk_add_hundreds` `$9895`,
`$98E3`). It rises by itself (Timing) unless the Zuul phase has begun
(`$81`); +100 for each Roamer that reaches its target on the map
(`st12_city_map` `$7BB7`-`$7BCB`, *live*: 0007 → 0108); +300 for a Slimer
that escapes, by the timer (`$73D9`, *live*: 0007 → 0311 in 255 frames,
control without it 0007 → 0011) or after a missed trap (`$8704`, *live*,
agent 5). Every time the thousands digit changes to 5 or more, by any
addition, `$98AD`-`$98DB` picks a building (`$EA74` low nibble, at least
4, skipping Zuul `$0A` and flattened blocks) as the Marshmallow Man's,
`$80`, state `$C8` (*live*: a Roamer taking 4950 to 5050 marked building
6). The thousands digit also sets `$3C`, which speeds up the map sprites,
the PK rise and the number of new hauntings.

### Buildings

Twenty buildings, index `$6E` 0-19 (GHQ `$11`, Zuul `$0A`), each a state
byte `$C8`+x: high nibble a timer, bits 2-3 the stage, bits 0-1 the
colour shown.

- **New hauntings** (`frame_spawn_haunts` `$740C`): when no building is in
  stage 0 with its timer running, 1 to 3 (more as PK rises) free buildings
  are picked from the random byte and set to `$10`.
- **Ageing** (`frame_building_timers` `$73BD`, every 256 frames in states
  `$12` and up, so also while driving and busting): +`$10`; a timer that
  wraps moves the building on by `bldg_next_stage` `$A9B4`: stage 0 →
  `$14`, stage 1 → `$1C`, stage 2 → `$F8`, stage 3 → `$1F`; a state of
  exactly `$xF` → `$FF` + 1 is the escape (+300 PK, state 0). The `CMP #$0F`
  admits only the haunted state; `$xD`/`$xE` are never produced. *Live*
  life of one haunting from `$10`, no input: stage 1 after 3,839 frames,
  stage 3 after 7,679, haunted (`$1F`) after 11,519, escaped after
  15,359 (5 min 6 s); 15 ticks of 256 frames (76.6 s) a stage.
- **Warnings** (`map_building_under_logo` `$7D23`, every frame on the map):
  only buildings whose rectangle (`$37D3` columns, `$37DD` rows, each
  including the streets around the block) holds the logo keep a colour.
  For each of those the colour becomes its stage when `warn_needs`
  `$A9B0[stage]` is owned in `$6D`: stage 1 purple with the PK energy
  detector, stage 2 white with the marshmallow sensor, stage 3 with the
  detector turns the building haunted at once (`$1F`, its timer restarted
  at 1); otherwise 0. Every other building loses colours 1 and 2 (a low
  nibble of `$0C` or more is kept, so haunted buildings stay red
  everywhere). *Live*: stage 1 building 15 turned purple (`$35`, colour
  RAM `$0C`) with the detector and the logo on its street, stayed green
  without the detector or with only the sensor, and went back to `$34`
  when the logo left; the Marshmallow Man's building `$C8` turned white
  (`$CA`, `$09`) only with the sensor and only near the logo; stage-3
  building 8 (`$3C`) became `$1F` with the detector near it.
- **Where a Slimer is.** The bust tests stage bits `%11`
  (`st18_carry_trap` `$8505`, `bust_check_slimer_present` `$9A8A`), which
  accepts `$xC` to `$xF`: a stage-3 building that has not turned red yet
  already holds a Slimer. *Live*: at the bust set-up `$8C`, `$8D`, `$8F`
  kept the Slimer; `$84`, `$88`, `$00` sent the men home. The map lets the
  player drive to any building (`map_fire_select` `$7E55` does not look at
  the state) if there are empty traps (message 0), at least two men
  (message 1) and backpack power (message 3) (*live*, each refusal).
- **Reward** (`st1F_trap_closes` `$87DB`-`$8801`): `slimer_reward`
  `$A1E4[state >> 4]` hundreds when bits 2-3 are `%11` (the building is
  then cleared), else index 15, $300, and the building is left alone. The
  table is $1,000, $1,000, $900, $900 … $300, $300, so the fee falls $100
  every two timer ticks (10.2 s) the building waits. *Live*, the state
  poked just before the trap closed: `$1F` $1,000, `$2F` $900, `$5F` $800,
  `$AF` $500, `$FF` $300, `$1C` $1,000, `$6C` $700, `$00` $300, `$34` $300
  (building left at its state). The timer restarts at 1 when a stage-3
  building turns haunted, so a hidden stage-3 Slimer is paid by the time
  since stage 3 began.

### The busting

From agent 5's reading and runs (states `$18`-`$21`): fire sets the trap
down only at a Slimer's building; man 1 then man 2 are placed; with the
streams on and the men 12 or more apart the stick only closes the gap
(`$85B9`-`$85D2`, `auto_joystick` `$B3AD`, *live*); men facing each other
closer than `$2A` − |dy|/4 cross the streams (`$85D4`-`$8615`): a 64-frame
freeze, backpacks 0, two men lost, message 8, the Slimer escapes (*live*:
men 3 → 1). Power drops 1 (BCD) every 16 frames with the streams on
(*live*: 85 → 28 in 900 frames); at 0 the trap springs. The trap catches
the Slimer within x −8…+7, y −12…+3 of its light before the light timer
`$7A` reaches `$9C` (`$86B3`-`$86F7`, `trap_hitbox` `$A9A0`); a miss slimes
a random man (men − 1, phrase 2, +300 PK, *live*). With the laser
confinement system a catch goes to storage `$6C` (up to 10) instead of an
empty trap (`$87C9`-`$87D9`; *live*, `t18-laser.js`: stored 0 → 1 and
9 → 10 with the traps untouched, at 10 an empty trap used). A building without a Slimer: the men leave
when the delay `$7C` (`$7F`) runs out (`$9A8A` → `$8823`).

### GHQ

`st22_ghq_restock` `$88B6`: stored ghosts 0, empty traps = traps owned,
men 3, backpack power 99 (*live*, agent 5).

### Roamers and the drive

Roamers are map sprites 4-7, aimed at Zuul (`$62`,`$7A`) from `$37C3`
(`st10_map_setup`). One within about 8 pixels across and 13-17 down of the
logo is marked with the route length so far (`map_roamer_contact`
`$7DAA`) and is met on the road at that distance (`st15_driving`
`$8117`-`$817A`), two at a time at most. The drive's length is the route's
dots + 5 road lengths (`$67`, `$8001`); the car accelerates 1 a frame to
`car_top_speed` `$AA9E` (`$60`, `$70`, `$80`, `$A0`; the options text says
75, 90, 110, 160 mph) and brakes on arrival. The vacuum (`$818C`-`$8274`)
needs `$6D` bit 5 and a new press of fire with the Roamer within x
−32…+15 of it; the Roamer is pulled in, a 32-frame countdown runs, and
it restarts on the map (`$9851`). No money, no PK change. *Live*: owned,
fire at x 31 against 63: countdown from frame 5199, sent home at 5230;
not owned, the same fire does nothing.

Every drive leaves two bytes on the stack: state `$14` enters
`next_state` by `JSR` (`$8070`), and nothing pulls them (*live*, agent 5).

### The Marshmallow Man

When the building in `$80` has aged to `$F8`-`$FB` (`map_marshmallow_check`
`$7ED8`; the pick sets `$C8`, so 769 to 1,024 frames, 15 to 20 s, later)
the alert starts: the
state is cleared, the Roamers are sent to four points around it, **the
bait flag `$68` is cleared**, `-MARSHMALLOW ALERT-` (message 4), state
`$24`. During the gathering the map code keeps running, B included
(`$8925` → `$7F29` → `$7F70`); B takes a dollop and, if none is down,
draws bait under the logo and sends the Roamers to it instead. When all
four stand on their targets: bait down → state `$26`, MAYOR AWARDS YOU
$2000… (+$2000); none → state `$25`, the building is flattened in four
steps (`$EA28`[x] = 0) and $4000 deducted (message 5). *Live*
(`t7-marshmallow.js`): no B, $10,000 → $6,000 and the block flattened;
B 20 frames after the alert, $2,500 → $4,500, dollops 5 → 4, the block
kept; B with no dollops, SORRY, NO BAIT. and the stomp; bait dropped
before the alert only, the stomp (the flag is cleared at the alert).

`$80` holds one building. If the next thousand is crossed before the
alert, the new pick replaces it and the old building stays at `$F8` for
good: stage 2 ages into `$F8` again (`bldg_next_stage`), it is never
haunted, never stomped, and shows white near the logo to a sensor owner
(*live*, `t17-mm-orphan.js`: `$F8` held for 3,000 frames). In the eight
runs from PK 5000 above no alert came at all, the picks replacing each
other as Roamers pushed PK up by thousands.

### The Keymaster, the Gatekeeper and the end of the game

Map sprites 2 and 3 wander the street grid, choosing the next crossing
from the random byte (`map_gatekeepers_wander` `$7DFF`). From PK 5000
(`$5B` ≥ `$50`) each is sent to Zuul (`$3802`) when it passes its own
crossing `$37FE`; from 9500 (`$5B` ≥ `$95`) both are sent at once
(`st12_city_map` `$7BF8`-`$7C2C`). When both stand on Zuul
(`map_zuul_meeting` `$7C2E`), once: a balance below the starting balance
`$51`-`$53` (a byte-by-byte `CMP`, so an equal one passes) → the
foreclosure pages; otherwise the Zuul phase (`$81` = 1): GO TO ZUUL!…
(message 9), the logo drives itself to Zuul, every building state 1 each
frame and Zuul `$0F` (red); the steady PK rise and new hauntings stop
(`$73F3`, `$740C`), Roamers still add 100 on arrival (PK 9999 on the
status line in `t14-endings.js`). *Live* (`t6-keymaster.js`,
`t6b-keymaster-spread.js`, `t14-endings.js`): from 9500 they met 188
frames later at 9711 (two Roamers arrived meanwhile); from 5000, eight
runs met at PK 8495, 9511, 9519, 9524, 9718, 9724, 9725 and 9999, within
1,526-1,999 frames, most of the rise being Roamers reaching Zuul; $2,500
against $10,000 foreclosed (phrase 3, STARTING BALANCE: $10000, ENDING
BALANCE: $2500); an equal balance opened the Zuul phase. PK 9999 is the
cap, not the trigger.

A non-decimal starting balance can never be matched: a blank name with
`458` decodes to `$57` = `$A0` (YOU HAVE $:00000, *live*); buying the
high-performance car leaves `$985000` (the 6502's decimal subtract treats
`$A0` as 100), and `money_add` saturates at `$99`, so the meeting always
forecloses (*live* with `$999900` against a start of `$A00000`).

### Zuul

`st28_zuul_street_setup` `$8A2C` / `st29_zuul_street` `$8B07` (agent 5):
men reset to 3; `$EA78` = 2 men must reach the door (x `$5B`-`$5E` at the
pavement line, `$8ACC`-`$8AD4`); `$EA79` = 2 catches end the attempt
(GOOD TRY). A catch is a hardware sprite collision (`$D01E` AND `$2F`,
sprites 0-3 and 5) tested every 4th tick; the Marshmallow Man walks a
32-step path to and fro (`mm_path_y`/`_x`/`_frame` `$A8A5`/`$A8C5`/`$A8E5`).
Two men in: the climb (197 steps), then `st2C_close_portal` cannot fail
and pays $5,000 (*live*: $2,500 → $7,500).

### Endings and the account number

GOOD TRY is shown when the Marshmallow Man catches two men on the Zuul
street (`$8B10`); it and the win both go on to the credit limit (the
balance with `$59` zeroed, `$8CAC`) and a new account number (`$8CC6`).
Both print YOU MADE MORE MONEY THAN YOU STARTED WITH, true only as "not
less" (see the meeting test). After F1/F3 at the end the game cold-starts
(`$8D36`), which keeps `$6328` and `$EAC7`-`$EACA`, so F3 then starts with
the account just shown (*live*, agent 5: $7,500).

**The account number** (encode `account_encode` `$90EE`, decode
`account_decode` `$9155`, parse `account_parse_digits` `$9CFC`; *live*,
agent 6 and `t11-account.js`):

1. Balance in hundreds: `hi` = `$57`, `lo` = `$58` (BCD); `$59` is dropped.
2. Name sum `s` = the 20 bytes at `$EAB3` (the name as typed, PETSCII,
   zero-padded) added modulo 256 (`account_name_sum` `$91B6`).
3. Check byte: `c` = (`hi` + `lo`) mod 256, 1 if 0; step `s` times (256
   when `s` is 0) the LFSR `account_lfsr_step` `$91A6`: `c` shifted left,
   new bit 0 = bit 3 XOR bit 4 XOR bit 5 XOR bit 7 of the old `c`.
4. N = `hi` × 65536 + `c` × 256 + `lo`, 24 bits, as eight octal digits
   o7…o0; the four bytes `$EAC7`-`$EACA` each hold two of them and are
   printed in order, so the number reads o1 o0 o3 o2 o5 o4 o7 o6.
5. Typing: the low nibble of each of up to 8 characters is packed into
   `$EAC7`-`$EACA`; decode keeps the low 3 bits of each, so 8 reads as 0,
   9 as 1, and letters count by their PETSCII low nibble (the line input
lets them through: `LEFTY` for the name `LEFTY` gave $860,000, *live*,
`t19-letters-trap.js`); a wrong check
   byte gives 0, and 0 is INVALID ACCOUNT NUMBER. (`$7523`). The decoded
   balance is not checked for decimal digits.

*Live*: `STANTZ,RAY` (sum `$FC`) with `03452601`, computed from the model
above for $54,300, gave YOU HAVE $54300; `03452602` was refused;
`VENKMAN,PETER` with `64405104` gave $123,400 and `64485184` the same
(agent 6); a blank name with `614` gave $300,000. With an 8-bit check,
about one number in 256 passes for any name, and names with the same byte
sum share every account.

## Data tables

| Table | Address | Contents |
|---|---|---|
| `state_handlers` | `$381A` | 64 handler addresses |
| `bldg_next_stage` | `$A9B4` | `$14`, `$1C`, `$F8`, `$1F` |
| `warn_needs` | `$A9B0` | 0, `$01`, `$04`, `$01` by stage |
| `item_flag` | `$A9A8` | `$01`, `$02`, `$04`, `$08`, 0, 0, `$20`, `$40` |
| `item_price` | `$A1DC` | 4, 8, 8, 4, 6, 6, 5, `$80` hundreds |
| `slimer_reward` | `$A1E4` | `$10 $10 $09 $09 … $03 $03` hundreds |
| `car_capacity`, `car_top_speed` | `$AA9A`, `$AA9E` | 5, 9, 11, 7; `$60`, `$70`, `$80`, `$A0` |
| `pk_rate_masks` | `$9DBA` | `$3F $1F $0F $07 $03 $01 $01 $01 $01 $01` by thousands |
| building colours | `$3EE2` | `$0D`, `$0C`, `$09`, `$0A` |
| building rectangles | `$37D3`, `$37DD` | x bounds by column, y bounds by row, overlapping by the street |
| Zuul points, wander checkpoints | `$3802`, `$37FE` | where sprites 2 and 3 meet; where each is sent from PK 5000 |
| `text_page_ptrs` | `$B36D` | 28 text pages (0 at `$EA14`, 12 at `$EB00`, 20-23 the car options) |
| `status_msg_lo`/`_hi` | `$B3F4`/`$B3FE` | the ten status-line messages |
| `note_freq` | `$A1F4` | 96 SID frequencies, C0-B7, tuned for the NTSC clock |

## Sound

- **Music** (`music_play` `$93F0`, `music_restart` `$93E2`), Russell
  Lieblich's arrangement: three track lists (`$A2BD` melody, `$A32B` bass,
  `$A399` percussion, 109 pattern numbers each), 71 patterns at `$A407`
  (control byte: length in ticks, rest, tie, note, optional instrument and
  master volume), pattern pointers `$A75B`, 9 instruments `$A7EF` (pulse
  width, waveform, ADSR, vibrato depth). New events every fourth tick
  (`$08 AND 3`). Patterns 51 and 52 are valid and never played. Called from
  the IRQ each frame; `$47` bit 7 (pause) stops it. `music_voice3_busy`
  `$9593` keeps it off voice 3 while a sound effect plays (`$98`).
  `music_skip_ahead` `$63D7` keeps the tune and lyrics in step, silently,
  while the title speaks.
- **Sound effects** on voice 3 (`sfx_tick` `$3BE9`, `sfx_start` `$3D24`):
  a bytecode, low nibble the command (wait, gate + note, sub-commands,
  note, trill, loop count, pulse width, waveform, bend, end); five scripts
  (`$3DB4`/`$3DB9`). Effect 0 is the vacuum (`$8218`), 2 the forklift
  (`$7867`), 3 started at `$867C`; effects 1 and 4 are never started. The
  typewriter clicks voice 3 directly (`$72BD`).
- **Speech** (`speech_call` `$F080` → `$F42E`; A = phrase, `$FF` status,
  `$FE` stop): 4-bit samples written to `$D418` by the NMI (Timing).
  Speech is built from pitch periods: a waveform chunk played forward,
  then backward, then a silent gap whose length sets the pitch (`$F083`,
  `$F0A4`, `$F0C3`). Frame records (4 bytes) choose voiced frames (4-bit
  samples, the waveform moving halfway to each new chunk, `$F3FC`) or
  unvoiced ones (1-bit noise, `$F372`). Five phrases (`$F4EA`); lengths
  0.938, 1.568, 1.315, 2.681 and 2.223 s (the speech port, `work/port/speech/`, which matches the game's 311,368 `$D418` writes);
  8.73 s of speech from 2,738 bytes, about 15 times smaller than the same
  speech as raw 4-bit samples. The game plays phrase 1 (start-up,
  title SPACE, a catch), 2 (a man slimed), 3 (start-up, a man caught at
  Zuul, the foreclosure) and 4 (the portal); phrase 0 is never asked for.
  Which words each phrase says is not settled from the code: phrase 1 is
  "Ghostbusters!" (the title speaks it on SPACE, as the manual says); 2
  as "He slimed me!" and 3 as the laugh are inferred from where the game
  plays them and their sound pattern (nine voiced syllables in 3); 4 is
  unknown. A pitch record's period count is 32 - (bit 0 of byte 0 x 16 +
  byte 1's high nibble) (`$F33B`-`$F344`). The player
  refuses to start with the KERNAL ROM banked in (`$F45F`).

## The conversion's leftovers

- The hand-over `$C800` and the page image `$C830` (orientation.md).
- A turbo tape loader at `$CE00`-`$CED9`, never run, whose RESTORE handler
  (`$CEC1`) would fill memory with `$02` (a JAM opcode) from `$0202`; a
  call chain at `$CF80` (`JSR $CE00`, `$0A00`, `$CE00`, `$0E00`) that
  nothing reaches. In this image `$0A00` and `$0E00` are car graphics.
  That these are the original tape's loading sequence is an inference.
- The power-on RAM pattern at `$C000`-`$C7FF`, `$C930`-`$CDFF`,
  `$D000`-`$DFFF` (RAM under I/O) and `$EB79`-`$EFFF`.
- The image's bytes at `$4000`-`$5FFF`, overwritten at start-up.
- Unused in the game's own code: `sprite_y_distance` `$9C76` and
  `set_balance_10000` `$9CF1` (never called); three-NOP runs at `$90D1`,
  `$90DB` and in `map_roamer_contact` for sprites 2-3; `$8D90`-`$8D95`;
  `$EA88` read at `$8832` by a branch to the next instruction; the
  dormant restart timer `$14` (`$70F8`); the unreachable `$02` = `$C0`
  branch (`$7094`); sound effects 1 and 4; speech phrase 0 and the 2-bit
  speech decoders `$F267`/`$F3E2`; item 4 (`$37`) with a price and no
  shelf; `unused_aadd` `$AADD`, `unused_flags_copy` `$AACB`.
- `POKE 22014,9` (`$55FE`, "unlimited lives" in cheat lists) lands in the
  screen at `$5400`, which the start-up clears; nothing reads it (agent 2,
  seven states for 900 frames each).

## Live tests

All in the simulator (`work/sim/gb.js`) from its saved states; the
scripts are in `work/verify/` unless another folder is named.

| Test | Script | Result |
|---|---|---|
| SPACE status report on the map, three sets of values | `t1-status-pause.js` | `99%`, 3, 3; ` 5%`, 2, 1; `40%`, 0, 2 printed and scrolled; then the PK line returns |
| RUN/STOP pause | `t1-status-pause.js` | `$47` = `$80`, PK 0011 held for 600 frames, stick ignored; second press resumes (0016 after 300); held key toggles once; no effect in the shop |
| 10 and 11 empty traps in the report | `t15-traps10.js` | `:` and `;` |
| PK detector and marshmallow sensor warnings | `t2-warnings.js` | purple only with the detector and the logo by the building; white only with the sensor, likewise; stage 3 with the detector became haunted |
| Haunted building flashing | `t2b-flash.js` | colour RAM `$A` / `$D`, 16 frames each |
| Roamer reaching Zuul | `t3-roamer-zuul.js` | +100 PK (control: +0 in 60 frames); from 4950 it marked a Marshmallow building |
| Escaped Slimer by the timer; a haunting's life | `t4-escape.js` | +300 at the next 256-frame tick (control `$EF`: +4 only); stages at 3,839 / 7,679 / 11,519 frames, escape at 15,359 |
| F1, F3, other keys on the title; RUN/STOP + RESTORE; F3 after a named game | `t5-f1f3.js` | F1 and F3 (no name) the interview; F5, F7, SPACE, RETURN nothing; the NMI with STOP held restarts to the title, alone it returns; F3 then skips to the vehicle page with $10000 |
| Keymaster and Gatekeeper meeting | `t6-keymaster.js`, `t6b-keymaster-spread.js`, `t14-endings.js` | met at PK 8495-9999; below start: foreclosure pages and phrase 3; equal or above: the Zuul phase, message 9 |
| Marshmallow Man, bait | `t7-marshmallow.js` | −$4000 (to 0 from $2,500 and $3,000; $10,000 → $6,000), block flattened; bait after the alert +$2000; bait before the alert wasted; no dollops: SORRY, NO BAIT. |
| Slimer reward by building state | `t8-reward.js` | $1,000 … $300 as the table; hidden stage 3 pays; a cleared building pays $300 |
| Slimer present by stage bits | `t8-reward.js` | `$8C`, `$8D`, `$8F` kept; `$84`, `$88`, `$00` men leave |
| Car options on SPACE | `t9-misc.js` | 5/75, 9/90, 11/110, 7/160 |
| Map refusals | `t9-misc.js` | messages 0, 1, 3; control sets off |
| Car loaded to capacity | `t10-capacity.js` | load 9 of 9: message 7, nothing paid; 8: bought |
| Account numbers | `t11-account.js` | STANTZ,RAY `03452601` $54,300; `…02` refused; blank + `458` `$A0` shown `$:00000`; blank + `614` $300,000; car 4 then leaves `$985000` |
| A non-decimal start can never be matched | `t12-458-end.js` | `$999900` against `$A00000`: foreclosure |
| Image intensifier | `t16-intensifier.js` | `$D01B` `$10` without, `$00` with; frame pictures `work/verify/intensifier-28.png`, `-2a.png` |
| An orphaned Marshmallow building | `t17-mm-orphan.js` | `$F8` for 3,000 frames, no alert |
| Laser confinement system | `t18-laser.js` | stored 0 → 1, 9 → 10, traps untouched; at 10 a trap used; control without it: a trap used |
| Letters as an account number | `t19-letters-trap.js` | LEFTY / LEFTY: `$EAC7` = `000C5649`, $860,000 |
| The trap's light sprites | `t19-letters-trap.js` | `trap_beam_sprites` `$9A35` 129 times in 300 frames after a catch; control IRQ 527 |
| `POKE 38454,96` and the Marshmallow Man | `t20-poke-mm.js` | $10,000 kept through a stomp; control $10,000 → $6,000 |
| Ghost vacuum | `t13-vacuum.js` | owned: captured, 32 frames, sent home, no money or PK; not owned: nothing |
| Earlier agents' runs | `work/reports/agent2.md` … `agent8.md`, `work/sim/agent5-*.js` | the bust, crossed streams, a miss, GHQ, the Zuul street, the win (+$5,000), GOOD TRY, the climb, speech phrases, account numbers |
