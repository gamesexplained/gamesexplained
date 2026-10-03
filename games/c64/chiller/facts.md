# Chiller — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

No build identifier was found in the image: the string sweep
(`work/sweep_strings.py`) turned up no version or date text. The loader's
`(ANTISOFT)` mark is a third party's (`orientation.md`). This copy is the first, withdrawn *Thriller* release. Its music player and all 4,238 bytes of tune data at `$61F2`-`$727F` match `Music/v1music.asm` in the steward's https://github.com/unorig/Chiller (branch Latest) byte for byte, and about 1,650 differ from `v2music.asm`; the steward confirmed on 29 September 2026 that V1 is the withdrawn release. The re-release changes the in-play tune and the gate-off compare at `$60B6` (3 to 1); its data is in `reference/music-v2.json` for the page's player.

## Memory layout

Where the CPU runs during play: non-stopping exec checkpoints over ranges,
3 s from `work/play-idle.vsf` with no input (`work/orient_cpu.py`, *live*):

| Range | Instructions in 3 s |
|---|---|
| `$0800`-`$2FFF` | 69,707 |
| `$3000`-`$4FFF` | 0 |
| `$5000`-`$5FFF` | 158,250 |
| `$6000`-`$6FFF` | 1,804 |
| `$7000`-`$7FFF` | 36,859 |
| `$8000`-`$BFFF` | 0 |
| `$C000`-`$CFFF` | 379,203 |
| `$E000`-`$FFFF` | 10,521 (the KERNAL's IRQ path, `$EA31` and on) |

This corrects `orientation.md`, which placed the engine's live code at
`$A000`-`$BFFF`: nothing ran there in 3 s of play.

| Thing | Where |
|---|---|
| Screen | `$0400` (`$D018 = $1D`, VIC bank 0) |
| Character set | `$3000`-`$37FF` (`$D018`) |
| Level records, one per screen, `$80` bytes each (`$100` between 4 and 5) | `$7000`-`$757F`; card pointer at `+$74` |
| Level cards | `$4100`-`$44E8` |
| Music player and tune | `$60A0`-`$61F7`, tune `$61F8`-`$6A15` |
| IRQ vector `$0314` | `music_irq` `$60F5`, set by `music_start` `$60CA` |

## Twin copies

`work/sweep_twins.py` compares every non-blank 256-byte page with every
other; `work/sweep_shadow.py` does the same for 32-byte windows above
`$E000`.

| Block | Twin | Bytes that differ | Which the code reads |
|---|---|---|---|
| `$3000`-`$33FF`, the first 128 glyphs | `$8000`-`$83FF` | 1 | Both: `$8000` is the forest's set, which `setup_screen` copies to `$3000` (records 0 and 9) |
| `$0500`-`$06FF`, screen rows 7-19 | `$8500`-`$86FF` | 2 | `$0400`. `$8450` is the forest's play area as loaded, copied in by record 0; `$8400` is the HUD template (`hud_template`) |
| `$0900`-`$09FF` | `$CE00`-`$CEFF` | 0 | The loader's copier put it there (`orientation.md`) |
| `$C001`-`$CDE0`, in pieces | `$F140`-`$FEDF`, at distances `$30FF`-`$313F` | not measured | `$C000`-`$CFFF`. The only bank switch, `copy_under_kernal` `$72A4` (`$01 = $34`), is given only the way-back records' descriptors, which read `$E028`-`$EFEF`, so nothing reads the copy (`work/under_io.py`); excluded in `game.json` |
| `$B600`-`$BEFF` | itself, shifted by `$100`-`$800` | 1-11 | Repeating fill (`$FF` with `$00` every few bytes), not data |

## Timing

The music is driven from the system IRQ: `music_irq` counts zp `$02` down
each interrupt and plays the next command when it reaches the tempo in
`$02AA`. The tune sets the tempo to 6 (`$61FE`). The IRQ is the KERNAL's
CIA timer, not a raster interrupt: `music_irq` ran 1,799 times in 30 s
(*live*, `work/verify7.py`), 60 a second on this PAL machine, and it exits
through `$EA31`, which runs SCNKEY (`$EA87`, 61 hits in 1 s, `work/verify5.py`).

Play itself is not timed. `main_loop` `$CA00` runs flat out, and the game
paces things by counting passes: `player_input` every 32nd pass
(`$CF03`), `joy_move` every 8th, the crosses' flash every 40th call
(`colour_cycle`), a jump step every `jump_speeds[n]` passes. The only
raster waits are `wait_line16` `$5BB0` (before swapping sprites and on the
poison flicker) and `scroll_wait` `$C46B` (in the scroller nothing uses).
So the game's speed depends on how much each pass does, and slows when
many enemies are on screen.

## Controls

The stick in control port 2 (`$DC00`) is the only CIA1 port read, and
the game never writes to CIA1. The keys come from the KERNAL's own scan,
still running in the IRQ: `read_controls` `$C84D` compares the key code
in `$C5` with the level's key table `$4512`-`$4515` and reads SHIFT from
the KERNAL's shift flag `$028D`.

| Control | Code | Result |
|---|---|---|
| Stick left, right | `read_stick` `$C9C4`, bits 2 and 3 → `$C1ED` | walks, *live* |
| Stick up, SHIFT | stick bit 0 or `$028D` → `$C1EE` → `fire_pressed` `$C19D` → `start_jump` `$5418` | jumps, *live* for the stick (Y 224 → 205 → 220) |
| Z, C | `$C5 = $0C`, `$14` against `$4514`, `$4515` | walk left and right, *live* (X 128 → 105, 128 → 148) |
| Fire, `?` | the stick's fire bit, or `$C5 = $37` (the `/` key; `?` is its shifted face) → `switch_request` `$58B3` → `switch_allowed` `$7280` | swaps the boy and the girl, only from level byte 10 on, *live* |
| SPACE | `$C5 = $3C`, in the table twice as up | nothing: up is not a direction on any screen (`$4500 = 0`) |
| RUN/STOP | the KERNAL | `end_game` `$2CB4` |

Up on the stick jumps, and he climbs by jumping from ledge to ledge. On all ten screens up and down are
switched off as directions (`$4500`-`$4503` = 0, 0, 1, 1, read from the
snapshots taken on arrival, `work/settings10.py`), so the only way up is
the jump; no ladder was tried live. He goes down by
falling or by sinking slowly through tiles `$62`-`$65` (`tile_touch_b`).
The same run shows gravity on (`$45FF = 1`), the scroll off
(`$4555 = $FF`) and no fall limit (`$457A = $FF`) everywhere.

The fire button does not jump. `fire_pressed` jumps where the level has
gravity (every screen) and would bring in the second character where it
has not (`switch_check` `$C7D4`), which no screen uses.

The live key tests needed the host-key path. `vice_keyboard_matrix`
held by row and column left `$C5` at `$40` for every key on this build;
`vice_keyboard_key_press` reached it (`work/verify4.py`, `work/verify6.py`).
It accepts no name for SHIFT, so SHIFT is traced, not tested.

## Graphics

Every screen is multicolour text over one character set, with eight
sprites. Nothing scrolls and nothing is drawn as a bitmap.

| Thing | Where | Notes |
|---|---|---|
| Play character set | `$3000`-`$37FF` (`$D018 = $1C`) | Glyphs `$00`-`$7F` (`$3000`-`$33FE`) are copied in per screen from the level record's `+6` descriptor by `setup_screen` `$5E19`; the text glyphs `$80`-`$BF` stay; `$3600` up is sprite data, so glyphs `$C0`-`$FF` are never shown. Glyph classes, by code: `$00`-`$29` open, `$2A`-`$4C` solid, `$4D`-`$53` a crumbling ledge in seven stages, `$54`-`$57` pick-ups, `$58`-`$7F` floors, `$80`-`$BF` the text |
| Per-screen sets, play areas, colour maps | `$8000`-`$B1FF`, `$A00` per outward screen | forest `$8000`, cinema `$8A00`, ghetto `$9400`, graveyard `$9E00`, house `$A800`: the 1 KB set, then at `+$450` the play area (screen rows 2-24, 928 bytes, copied to `$0450`), then at `+$800` the colour map, two cells per byte (`unpack_colours` `$5D20`). The way-back records reuse the outward set and colour map and take the play area from the store |
| Card and title font | `$B200`-`$B5FE` | copied to `$3000` by `show_level_card` `$5BC7`; holds the CHILLER logo pieces that `draw_logo` `$5C00` lays out five glyphs deep |
| Boy's sprites | `$3600`, pointers `$D8`-`$E7` | walking left `$D8`, right `$DC`, jumping `$E0`/`$E1`, standing `$E2`/`$E6` |
| Girl's sprites | `$3A00`, pointers `$E8`-`$F7` | the same order; `player_swap` `$576B` patches the frame numbers |
| Enemy sprites | `$2000`-`$29FF` (`$80`-`$A7`), `$0B00`-`$0FFE` (`$2C`-`$3F`) | four frames an animation, named per screen in the level record (`+$1D`, `+$22`); the low blocks are used by records 1, 2 and 5-9 (`work/sprites_used.py`) |
| Thrown enemy, dying frames | `$3E00`, `$F8`-`$FC` | `extra_enemy` on sprite 7; `enemy_dying` steps `$F9`-`$FC` |
| Stored screens for the way back | `$7800`, `$E000`, `$E400`, `$E800`, `$EC00` | `screen_store` `$7FE8`; see Mechanics |

The ten screens, reached live by playing through with crosses poked beside
the boy (`work/playthrough.py`), are in `reference/screen-00-forest.png` to
`reference/screen-09-forest-back.png`.

The border is the player indicator on every screen, not only on the way
back: `tick_border` `$75B0` puts it back each pass to 6 (blue) for the boy
or 10 (light red) for the girl, and `flash_border` `$72BA` toggles its
bit 3 while poison drains the bar.

## Hardware register census

`work/sweep_regs.py` over `$0800`-`$CFFF`: every absolute access to
`$D000`-`$DFFF` (`work/sweep-regs.txt`, 97 registers). It counts byte
patterns, so a hit in data is a false one: the ones at odd addresses
such as `$D053`, `$D112`, `$D74A` and `$DD99` all fall in graphics or
tables and are left out here.

| Registers | What the game does with them | Where |
|---|---|---|
| `$D000`-`$D00F`, `$D010` | Sprite positions. 0 is the character under control, 1 the other one (`swap_sprites` `$58E6`), 2-6 the five enemy slots, 7 the thrown enemy (`extra_enemy`) | many; `$C3E0`-`$C3F2` is seven `DEC`s of sprites 1-7's Y in a row |
| `$D015` | Sprite enable, 45 accesses: sprites switched on and off with the screens | `$0907`, `$2BF2`, `$2DA2`, … |
| `$D016` | Multicolour text on (`ORA #$10`); 40 columns on (`ORA #$08`) and off (`AND #$F7`) | multicolour at `show_card` `$5C62` and `$5D80`; `$2BF5` sets and `$C026` clears bit 3 |
| `$D018` | `$15` (the ROM font, screen `$0400`) before printing through the KERNAL, `$1C` (font at `$3000`) after | `$15` at `$2CD1` and `$55C4`; `$1C` at `$2EFB`, `show_card` `$5C6C` and `$C6B1` |
| `$D01B`, `$D01C`, `$D01D` | Sprite priority, multicolour, X expansion | `$2E97`, `$2D1C`, `$2D22`, … |
| `$D01E` | Sprite-sprite collision: `sprite_touch` `$CE87` takes energy when an enemy touches sprite 0 or 1; `restart_screen` reads it to clear it; `$0987` is in the loader's area | `$0987`, `$C6DA`, `$CE87` |
| `$D01F` | Sprite-background collision, read once | `$2D60` |
| `$D020`, `$D021` | Border and background. The manual says the border shows who is being controlled on the way back; these writes are where to look | `$2CC7`, `$515D`, `$57B7`, `$590E`, `$5A4B`; `game_over_wait` `$7720` reads the border |
| `$D022`-`$D024` | Multicolour background colours, set per screen | `$5BD5`, `$5D8A`, `$758E`, `$7623`, … |
| `$D025`-`$D02E` | Sprite colours | `$2B90`, `$2D10`, `$5554`, … |
| `$D011`, `$D012` | Read only, never written. Two copies of one wait loop spin until the raster is line 16 (`$D012 = $10` and `$D011` bit 7 clear); `$C46B` spins until line `$4B` | `$5BB0`, `$72C7`, `$C46B` |
| `$D400`-`$D40D` | Voices 1 and 2: the music (`music_*`, `mcmd_*`) | `$60BF`-`$61D6` |
| `$D40E`-`$D414` | Voice 3: the sound effects, all outside the music player | `$2BE3`, `$2F05`, `$5485`-`$552C` |
| `$D415`-`$D418` | Filter and volume, set once: `$D415 = $05`, `$D416 = $45` (an 11-bit cutoff of `$22D`), `$D417 = $F1` (resonance 15, voice 1 through the filter), `$D418 = $3F` (low-pass and band-pass, volume 15) | `music_init_filter` `$60A0` |
| `$DC00` | The joystick | `$2D97`, `$58BD`, `$C1C0`, `$C8C5`, `$C8D3`, `$C8E1`, `$C9C4`, `$C9DB` |
| `$D800`- | Colour RAM | many |

Never touched from the game's code: `$D013`, `$D017`, `$D019`, `$D01A`
(no raster interrupt), the CIA timers and interrupt control (`$DC04`-
`$DC0F`, `$DD04`-`$DD0F`), `$DD00` (the VIC bank stays at 0), and SID
voice 3's pulse width and oscillator read-back (`$D410`, `$D411`,
`$D41B`, `$D41C`).

## Mechanics

**The journey.** `level_records` `$7290` lists ten records by level byte
(0, 2 … `$12`): forest, cinema, ghetto, graveyard, haunted house going out
(`$7000`-`$7200`), then the house, graveyard, ghetto, cinema and forest
coming back (`$7300`-`$7500`). A screen ends when its crosses are all
taken: `crosses_left` `$7F00` counts `$5A15` down from the record's
`+$72` (5 going out, 10 coming back, *live*), then `next_screen` `$7680`
shows the next card and builds the next screen. After level byte `$12`
it passes `$FE`, which ends the game in a win. There is no car: the last
screen is the forest.

**The way back reuses the screens as they were left.** Going out,
`next_screen` copies the finished screen (rows 1-24) into a store before
moving on (`screen_store` `$7FE8`: `$7800`, `$E000`, `$E400`, `$E800`,
`$EC00`), and the way-back records read their play areas from there, the
four under the KERNAL through `copy_under_kernal` `$72A4`. So a mushroom
eaten going out is gone coming back. *Live*: played through, the way-back
screens show the outward screens with the poked crosses taken
(`reference/screen-05-house-back.png` onwards); started directly on a
way-back screen by poking `start_game`'s operand `$C661`, the unwritten
store shows as garbage.

**Two characters, two colours of cross.** Each record's `+$5E`-`+$71`
holds ten cross positions, five blue and five red (`place_crosses`
`$5FC0`; `colour_cycle` `$7F80` flashes them by toggling the multicolour
bit every 40th call). `cross_touch` `$7F50` reads the colour: the boy
(`$5A08 = 0`) takes only blue, the girl only red. *Live*: blue crosses
poked beside the boy were taken and counted, red ones were left. Going
out only the boy plays and each screen needs five; coming back both play
and all ten are needed.

**Every cross can be taken, and the game has no ending.** The three
lowest crosses, all blue and all on the way back, sit in the play area's
bottom two rows: graveyard-back (record `$7380`) at screen address
`$079A`, ghetto-back (`$7400`) at `$07C5`, cinema-back (`$7480`) at
`$07CC`. *Live* (29 September 2026, the game's own code in
`kit/c64/machine.js`, the energy bar kept full): from each level's start
the boy takes his cross by walking left along the ground (`port/jump.js`
to reach the level). His own Y stops at `$E3`, row 22 (see "The boy's
own position is capped at row 22", below), but `try_move` looks for a
tile in the cell `probe_offset` picks, two rows down or one row down and
to the side, so from row 22 it reads rows 23 and 24. When a level's last
cross is taken, `crosses_left` `$7F00` passes the level byte at `+$73`
to `next_screen` `$7680`; after the last level (`$12`) it passes `$FE`,
and the game loads the forest going out, with its five crosses and the
score kept. *Live*: finishing the forest on the way back with
`crosses_left` on the machine loads record `$7000` with five crosses
needed. There is no ending. `$7F06`-`$7F08` are three `NOP`s, the length
of a `JSR`: something may have been removed there (inferred; the image
does not say what).

**Switching.** `switch_request` `$58B3` takes fire or `?` (key code
`$37`); `switch_allowed` `$7280` refuses before level byte 10.
`player_swap` `$576B` swaps sprites 0 and 1, so the character under
control is always sprite 0, patches the frame numbers, and sets the
border. *Live*: `/` in the forest changed nothing; on the way back fire
and `/` each gave the girl and the light red border (`$5A08` 0 → 1,
border 6 → 10). The character left standing loses energy when an enemy
touches it (`girl_touch` `$CD9D`).

**Jumping.** `start_jump` `$5418` lifts the boy for up to 24 steps, each
waiting `jump_speeds` `$544A` passes (5 rising to 45): a slowing rise, then
the same table backwards for a quickening fall. The direction held at
take-off is kept; the controls are switched off in the air by writing RTS
over the first byte of `read_controls` and `frame_step` (`jump_lockout`
`$5880`). A fall is counted, but the compare with the limit at `$457A` is
followed only by NOPs, so **no fall hurts** (`land` `$53EF`).

**The ground.** `try_move` `$2A04` probes the cell the boy would enter,
turning his sprite position into a screen cell: row `(Y-$2C)>>3`,
column `(X-$0C)>>3` with the VIC's X MSB folded in, then `probe_offset`
`$5145` picks the cell to look at (his own row for up, two rows down,
the next row over for left or right). Tiles `$2A`-`$4C` are solid.
Tiles `$4D`-`$53` are a crumbling ledge: every 8th step on one advances
it a stage, and `$53` becomes a space (`tile_touch_a` `$5A9A`). Tiles
`$58`-`$61` and `$70`-`$7F` (`tile_touch_b` `$5AC7`, `$5B89`, `$7673`)
are solid only when the probe is straight down, so they can be walked
into from the side but not fallen onto from above; `$62`-`$65` let him
sink the same way, one try in three (`$5A14`); `$66`-`$6F` are solid
from every direction, with no test of which probe it was.

**The boy's own position is capped at row 22.** `move_sprite` `$C900`
clamps sprite 0's Y at `$E3` unconditionally, before any tile is
checked (`$C930`, `cmp #$E3`), and that is row 22 by `try_move`'s own
formula. *Live* (`work/verify_reach4.py`): falling through a column
cleared to open space, with nothing to land on, the boy's Y still stops
at `$E3` after 128 frames. The play area is drawn 23 rows deep (screen
rows 2-24), and his own sprite position is never computed as row 23 or
24. The tiles there are still read, through `probe_offset`: see "Every
cross can be taken", above.

**Energy.** One bar of 33 cells, 8 steps each, from `$042E`
(`find_bar_end` `$5998`), and no lives: `new_life` and `lose_life` exist
but only unused code reaches them, so an empty bar ends the game
(`out_of_energy` `$5A70`, `screen_done` `$5D98`).

| What | Effect | Where |
|---|---|---|
| Walking | a step off per about 765 passes with a direction held | `walk_drain` `$5A20` |
| Jumping | a step off each time `$5A09` runs out in the air | `drain_step` `$59E6` |
| Standing still | nothing | `drain_step` |
| An enemy touching the one under control | two steps of poison | `sprite_touch` `$CE87`, `poison_add` `$5B44` |
| A toadstool, tile `$55` | 24 steps of poison, each with a border flash | `tile_touch_b` `$5AC7`, `poison_tick` `$5B2C`, `flash_border` `$72BA` |
| A mushroom, tile `$54` | 23 steps back, one every 16 calls; on a full bar 10 points each instead | `energy_add_slow` `$5B18`, `energy_tick` `$5B00`, `energy_up` `$59C3` |
| A bonus, tile `$56` | 100 points | `tile_touch_b` |

*Live*: a mushroom poked under the boy grew the bar from 119 to 142
eighths in six seconds, against 119 → 119 in the control run
(`work/verify2.py`); the toadstool changed the bar (`work/verify.py`).
Standing still with no input the bar held at 119 for 16 s, then lost 69
steps at once, with 69 hits each on `energy_down` and `poison_add`: an
enemy reached him and stayed on him (`work/verify7.py`). The drain with
no input seen at Bronze is that, not a drain of its own.

As the bar goes the boy slows (`bar_speed` `$5961`): once its seventh
cell is no longer full, input is read every `$80` passes instead of every
`$20`. The manual's running is not in the code; there is one walking
speed.

**Enemies.** Five slots, each with a path script in the record
(`+$45`-`+$5D`), animation frames, lives (`$45E7`: 200, 200, 21, 1, 200)
and a respawn chance out of 128 (`$45E2`: 16, 16, 16, 13, 13;
`respawn_timer` `$2FB2`). A sixth on sprite 7 is thrown now and then from
a random slot (`extra_enemy` `$CCF5`). When every slot's lives are used
up, `level_up` `$2C19` counts the LEVEL counter on, shows "LEVEL nnn"
over the play area, and `speed_up` `$5681` halves each slot's move and
frame delays, down to a floor read from `$34E8`.

**Enemy paths, decoded.** Each slot's `+$3B`-`+$3F` (low bytes) and
`+$40`-`+$44` (high bytes) point into `path_scripts` `$4A00`-`$4A8F`
(`setup_screen`, into `$575E`/`enemy_script_hi` `$CF24`); `path_step`
`$CC12` steps one enemy a pixel with `move_sprite` every
`enemy_move_timer` passes and, every 8th step, reads the next byte of
its script: 0 up, 1 down, 2 left, 3 right, `$FF` loops back to the
script's start. Nine scripts serve the ten screens' fifty slots (some
repeat between screens): three walk down then back up
(`$4A00`, `$4A26`, `$4A46`), four hold one direction for ever
(`$4A1E` right, `$4A20` up, `$4A22` left, `$4A24` down), and three are
long runs down with a single stray `$50` partway through
(`$4A6B`, `$4A70`, `$4A73`) that `move_sprite` (`$C900`) does not
recognise as a direction and so does nothing on that one step — not a
fifth direction, just a byte that fails every `cmp` in the dispatch and
falls through to `rts`. When `$453D` is set for a slot (no screen uses
it), `path_step` picks a random one of the script's first 64 bytes
instead of stepping through it in order. At an edge, a slot leaves the
screen unless its `$4538` byte (per slot, part of the level settings)
allows it to stay (`enemy_gone`).

**Score.** Six digits on screen (`$0406`-`$040B`), stepped a point at a
time (`score_inc` `$CE11`, `add_score` `$CE42`). Points come only from
bonus tiles and from mushrooms eaten on a full bar. The high score is
compared digit by digit when a game ends (`$7700`).

## Data tables

| Table | Where | Layout |
|---|---|---|
| Level records | `$7000`-`$757F`, `$80` each (none at `$7280`) | `+0` play-area descriptor, `+6` set descriptor, `+$0C` colour map, `+$0E`/`+$0F` multicolours, `+$10`-`+$17` start positions, `+$18`-`+$44` enemy tables, `+$45`-`+$5D` enemy paths, `+$5E`-`+$71` cross addresses, `+$72` crosses needed, `+$73` level byte, `+$74` card |
| Record index | `level_records` `$7290` | ten addresses by level byte |
| Level settings | `$4500`-`$45FF` | directions `$4500`-`$4503`, keys `$4512`-`$4515`, enemy lives `$45E7`, respawn chances `$45E2`, gravity `$45FF` and more; the flags checked are the same on all ten screens |
| Screen store | `screen_store` `$7FE8` | five destinations by level byte, then 0 |
| Jump timing | `jump_speeds` `$544A` | 25 bytes, 5 … 45 |
| Row offsets | `row_offsets` `$5100` | 25 words, 0, 40 … 960 |
| Copy descriptors | six bytes: source, end (exclusive), destination | read by `copy_block` `$2A80` |
| Random numbers | `$C000`-`$C0FF` | `random` `$C9F1` takes the next byte and EORs it with the jiffy clock's low byte `$A2`; the bytes are code (`unused_screen_tools`) read as data |
| Frequencies | `freq_lo` `$C300`, `freq_hi` `$C340` | 56 notes, read only by the silenced players |

## Text

The game has its own character set but keeps the system's glyph order, so
nothing needs a private alphabet table. Read from `work/play-idle.vsf`
(`work/text_vic.py`, `work/sweep_strings.py`):

- **The font during play and on the cards.** `$D018 = $1D` in play and
  `$1C` on the cards (`show_card` `$5C6A`). Either way it points at
  `$3000` in VIC bank 0 (`$DD00 = $C7`), with the screen at `$0400`.
  Glyphs `$80`-`$BF` are the letters, digits and punctuation in
  screen-code order: A at `$81`, 0 at `$B0`, space at `$A0`. So the game's
  own on-screen strings are **screen codes plus `$80`**. `$00`-`$7F` hold
  the scenery tiles. Rendered in `work/charset-play.png`.
- **The card text is plain PETSCII**, printed through the KERNAL's CHROUT
  by `print_card` `$5CD8`. Colour codes (red for a title, blue for the
  verse, white and yellow on the title card) and cursor codes lay it out,
  and `$01` ends it. The first two bytes of a card are the cursor row and
  column, set through PLOT (`$FFF0`).

| Text | Where | Encoding | Printed by |
|---|---|---|---|
| Ten level cards, forest to haunted house and back | `$4100`-`$44E8` | PETSCII, row/column first, `$01` end | `print_card` via `show_card` `$5C4F`, from `$5BE4`; each level's record at `$7000 + $80·n` holds its card's address at `+$74` |
| "THE FOREST", the first level's heading | `$5D0D` | PETSCII card | `show_forest_card` `$5E00` |
| "MASTERTRONIC'S" | `$5D00` | screen codes + `$80` | `show_card` `$5C71`, to `$04D6` |
| The title card: welcome, the goal and the controls | `$7C00` | PETSCII card | `$7760`, after a game ends (`game_over_wait` `$7720`) |
| "PROGRAMMED BY DAVID AND RICHARD DARLING." | `$77C0` | screen codes + `$80` | `show_programmed_by` `$72ED`, to screen row 0 |
| HUD, "SCORE … MAGIC CROSSES … HI" and "ENERGY" | screen `$0400`; copies at `$8400`, and with SILVER CROSSES at `$8E00`, `$9800`, `$A200`, `$AC00` | screen codes + `$80` | `hud_template` `$8400`, copied by `start_game` through `hud_descriptor` `$56C0`; the SILVER CROSSES copies are never copied (see Unused) |
| "LEVEL 001", "GAME OVER" | `$CFA1`, `$CFAA`; a copy at `$0AA1` nothing reads | screen codes + `$80` | `level_banner` `$2C44`, `show_game_over` `$CFC0` |
| "PRESS CTRL FOR MENU" | `$574A` | screen codes + `$80` | `show_press_ctrl` `$5736`, reached after GAME OVER, but it only loads and never stores, so the text never appears (see Bugs) |
| "ANTISOFT", repeated | `$0806`, `$0836`-`$08CF` | PETSCII | the loader (`orientation.md`) |

The ten cards, in the order of the records at `$7000`-`$7574`:

| n | Record | Card | Heading | Verse |
|---|---|---|---|---|
| 0 | `$7000` | `$4100` | THE FOREST | MOVE THE BOY AROUND THE FOREST / COLLECTING THE BLUE MAGIC CROSSES. |
| 1 | `$7080` | `$4178` | THE CINEMA | THERE'S A MESSAGE SCRAWLED IN BLOOD... |
| 2 | `$7100` | `$41B8` | THE GHETTO | SAVE YOUR ENERGY, YOU'LL NEED IT. |
| 3 | `$7180` | `$4208` | THE GRAVEYARD | THE MIDNIGHT HOUR IS CLOSE AT HAND, / YOUR DEATH AWAITS IN THIS EVIL LAND. |
| 4 | `$7200` | `$4288` | THE HAUNTED HOUSE | YOUR GIRLFRIEND YOU ARE SEARCHING FOR, / WHEN YOU HAVE THE CROSSES SHE'LL APPEAR / BY THE DOOR. |
| 5 | `$7300` | `$4318` | THE HAUNTED HOUSE | BOTH BOY AND GIRL MUST TURN AROUND, / BECAUSE YOUR QUEST IS HOMEWARD BOUND. |
| 6 | `$7380` | `$4388` | THE GRAVEYARD | BY NOW YOUR ENERGY MUST BE LOW, / SO FIND A MUSHROOM BEFORE YOU SLOW. |
| 7 | `$7400` | `$43F0` | THE GHETTO | THE GHETTO IS A LONELY PLACE, / SO GET YOUR CROSSES WITH GREAT HASTE. |
| 8 | `$7480` | `$4458` | THE CINEMA | THE FINAL MINUTES ARE WITH YOU, / USE THEM WELL. |
| 9 | `$7500` | `$44B0` | THE FOREST | THE END IS NIGH, YOU'RE GOING TO DIE. |

The records are `$80` bytes apart except between 4 and 5, which are
`$100` apart: `$7280`-`$72FF` is not a record, and `$72E0`-`$72FF` in it
is code (`switch_allowed`, `level_records`, `show_programmed_by`). The
fields of a record are under Data tables.

The font has no apostrophe. The cards fake one with cursor codes: up, a
comma, down (`THERE{up},{down}S`), which prints the comma a row higher.
After the cinema card's `$01` end marker come the bytes "N." and another
`$01` (`$41B5`-`$41B7`); no code was found that points at them.

## Sound

The music is a small interpreter on voices 1 and 2, run from the IRQ.
`music_start` `$60CA` silences the SID, points zp `$B7/$B8` (the play
position) and `$B9/$BA` (the loop point) at `$61F8`, sets the filter
(`music_init_filter`) and puts `music_irq` `$60F5` in `$0314`.
`music_stop` `$61D2` gives `$0314` back to the KERNAL's `$EA31`.

Each tick, `music_irq` counts zp `$02` down. At zero, `music_next_command`
`$6100` reads the next byte of the tune and stores it into the low byte
of the `JMP` at `$610B` (`music_dispatch`), so **each command byte is the
low byte of its handler's address in page `$61`**. Operands follow the
command and are read by `music_fetch` `$61E9`. The handlers, read in the
code:

| Byte | Handler | Operands | What it does |
|---|---|---|---|
| `$0E` | `mcmd_note_v1` | freq hi, lo | voice 1 frequency, gate off then on with the stored waveform |
| `$26` | `mcmd_note_v2` | freq hi, lo | the same on voice 2 |
| `$3E` | `mcmd_note_both` | 2 × (hi, lo) | both voices, then falls into `$56` |
| `$56` | `mcmd_retrigger_both` | none | gate both voices off and on again |
| `$6B` | `mcmd_set_tempo` | 1 | ticks per step into `$02AA`, then ends the step |
| `$74` | `mcmd_rest` | none | reloads the counter from `$02AA`: the step ends with nothing new played |
| `$7C` | `mcmd_count` | none | `INC $02FF`, then ends the step |
| `$82` | `mcmd_set_waveforms` | 2 | control bytes for voices 1 and 2 into `$02AC`/`$02AD` |
| `$91` | `mcmd_set_envelopes` | 4 | attack/decay for voices 1 and 2, then sustain/release for 1 and 2 |
| `$AC` | `mcmd_set_pulse` | 4 | pulse width lo/hi for voice 1, then voice 2 |
| `$C7` | `mcmd_loop` | none | play position back to the loop point |
| `$00` | `$6100` itself | none | fetch the next byte at once: a no-op |

The tune runs from `$61F9` to the loop command at `$6A15`: 341 notes and
592 rests over 998 commands, at tempo 6, starting with pulse and
sawtooth (`$41`, `$21`) (`work/sweep_tune.py`, `work/sweep-tune.txt`).

**The tune's pitches are computed for the NTSC clock.** Of its 478
frequency values, 464 come within 2 cents of equal temperament taken at
the NTSC clock (1,022,727 Hz); taken at PAL (985,248 Hz) none do, and the
same 464 sit 33 to 36 cents off, which is 65 cents flat of the note above
(`work/sweep-tune-ntsc.txt`, `work/sweep-tune.txt`). That is the 0.65 of
a semitone the platform reference gives for an NTSC table played on PAL,
the machine this image was run on. Named at the NTSC clock, voice 1
opens C2, D2, F2, G2, D2, F3. The other 14 values are open.

`$02FF` counts `mcmd_count` commands (cleared by `music_start`). Two
places poll it: `$5DAD` waits for it to leave zero and then calls
`music_stop`, and `$7614` branches on it. So the tune can signal the
game: `card_wait` `$7610` holds a card until the card tune's count
command, and `$5DA9` holds GAME OVER until the jingle's (`tune_jingle`
`$6B10`). Voice 3 carries the two sound effects: the jump, a triangle
wave from `$0800` (`jump_sound` `$5483`), and the fall, a whistle from
`$8080` down by `$80` a step (`fall_sound` `$54AC`). A third player,
`unused_sound_player` `$CA80`, has every SID store aimed at `$FFFF`
(see Unused).

## Unused code and data

Unreached means no call, jump, pointer or absolute access names it, and no
run of the kit's simulator (`work/sim_all.sh`, all ten screens from their
start) executed or read it; each is described in `symbols.json`.

- **Enemies that could be killed.** `unused_shot_hit` `$CDC7` would handle
  an enemy being hit, `unused_kill_enemy` `$2F7B` switches the enemy off and
  pays out through `add_score_for` `$CE6B`, whose points table is at
  `$4560`. Nothing reaches these. The shot in the name is our guess, not the
  code's: `unused_kill_enemy` takes the enemy from the boy's last collision
  (`$CF5E`, `$CF5F`, written by `sprite_touch`), and no code for a shot
  survives beyond what `switch_check` does with sprite 1 (below). How an
  enemy was hit is unknown.
- **Lives.** `new_life` `$CAED` and `lose_life` `$CEDA`, and the start count
  `$45ED`, are reached only from other unused code. The game has one bar
  and no lives.
- **A silenced sound player.** `unused_sound_player` `$CA80` and
  `unused_note_step` `$C380` play note lists through the 56-note table at
  `$C300`/`$C340`, but every SID store in them has the operand `$FFFF`, in
  the PRG as loaded. The sound was cut before release; the code stayed.
- **A scroller.** `scroll_timer` `$C011`, `scroll_left` `$C412` and
  `scroll_rows` `$C47F` scroll the whole play area a cell, wrapping. Every
  level sets the period to `$FF`, which turns it off.
- **A second sprite on fire, on a flat screen.** `switch_check` `$C7D4`
  brings sprite 1 in on top of the boy with fire on a screen without
  gravity, framed for his facing (`$4508`), with a sound on voice 3;
  every screen has gravity. `sprite1_hit_scenery` `$C4FB` switches sprite 1
  off when it hits the scenery, and waits on `$45FE`, which is 0. Together
  they look like the start of a shot, but no code found moves sprite 1
  along (inferred, not run).
- **Screen-editor tools.** `unused_editor_tools` `$5198` (a box drawer, a
  character plotter) and `unused_screen_tools` `$C038` (fills, a glyph
  mirror) call only each other.
- **An older forest card.** `card_forest_title` `$5D0D`, printed by
  `show_forest_card` `$5E00`, which nothing calls.
- **SILVER CROSSES.** The cinema, ghetto and house blocks each carry HUD
  rows (`hud_cinema` `$8E00`, `hud_ghetto` `$9800`, `hud_house` `$AC00`)
  that say SILVER CROSSES where the real HUD says MAGIC CROSSES. Their
  play areas are copied from `+$50`, so these rows are never shown: a
  trace of an earlier name for the crosses.
- **Loaded, unread.** `$1000`-`$1FFF` (pages of near-identical rows),
  `$4040`-`$40FF` (after the note list at `$4000` that `unused_note_step`
  would read), `$4A90`-`$50FD`, `$6BCD`-`$6FFD`; what they held is not
  established. Looked into further for Gold:
  - `$1000`-`$1FFF`: not sprite data. Read as 64-byte multicolour sprites
    (`work/render_1000.py`, printed and checked by eye), every block is
    visual noise, no recognisable shape; the "near-identical rows"
    description holds (64-byte periods differ by only a few bytes) but
    what repeats at that period is not established.
  - `$4A90`-`$4AFF`: shaped exactly like `path_scripts` (`$4A00`-`$4A8F`,
    immediately before it) — bytes `$00`-`$03` ended by `$FF`, several
    scripts' worth back to back — but no level record's `+$3B`-`+$44`
    names any address in it. Very likely more enemy paths that no
    screen's enemy table points at, cut along with a design that did not
    ship. `$4B00` on no longer fits that pattern.
  - `$4B00`-`$50FD`, `$6BCD`-`$6FFD`: no pattern as clear as the above was
    found; still open.

The RAM under the I/O chips (`$D000`-`$DFFF`) and under the KERNAL above
the stores (`$F000`-`$FFFF`) is loaded and never read; `game.json`
excludes both with the reason.

## Bugs

- **PRESS CTRL FOR MENU never appears.** `show_press_ctrl` `$5736` runs
  after GAME OVER and loads the text and colour bytes for row 23, but
  every access is an `LDA`: nothing is stored.
- **The jump sound falls on the way down too.** `jump_pitch_fall` `$5518`
  adds 5 to the low byte and should carry into the high byte; its `BCS`
  at `$5524` branches to the next instruction, so the high byte is
  decremented every step and the pitch drops about 256 a step instead of
  rising.
- **The title flicker misses a register.** `title_flicker` `$7580`
  should flicker `$D022` and `$D023`; its second store goes to `$7523`, so
  only `$D022` flickers. `$7523` is record 9's last frame for enemy slot 1
  (`+$23`): it holds `$F2`, where the outward forest's slot 1 ends at `$8B`,
  so on the way home that enemy steps `$88`-`$F2` (107 frames) through the
  other enemies' shapes, the code at `$2A00`, the character set at `$3000`
  and the players' frames (`enemy_move` `$CCAB`). Checked on the port: over
  3,000 frames of the way-home forest, slot 1's pointer took every value
  from `$88` to `$F2`. The byte is already `$F2` in the analysed image, taken
  before any game over; what the flicker writes is `$D023` read back (top
  nibble set) with bit 1 flipped, so it is always `$F0` or more.
- **Dead reads in GAME OVER.** `show_game_over` `$CFC0` reads `$CFA1`,
  `$0617` and `$D81A` and throws them away, left from a copy of
  `level_banner`.

## Live tests

All from `work/play-idle.vsf` (the forest, outward, standing) or the
snapshots saved from it, with the stick on port 2; each script names its
control.

| Test | Script | Result |
|---|---|---|
| The machine runs: jiffy clock and stick | `verify.py` | jiffy +61 in 1 s; X 128 → 151 with the stick right |
| Blue crosses poked beside the boy | `verify.py`, `verify3.py` | taken: needed 5 → 0, the card for the next screen clears the HUD, which comes back reading `05` |
| Red crosses beside the boy | `verify.py` | left, counter unchanged |
| Five blue crosses end the screen | `verify3.py` | the cinema follows (record `$7080`) |
| A mushroom under him | `verify2.py` | bar 119 → 142 eighths in 6 s; control 119 → 119 |
| A toadstool under him | `verify.py` | the bar changes |
| Jump with stick up | `verify2.py` | in-air flag 1, Y 224 → 205 → 220 |
| Jump with SHIFT (host-key path has no name for it) | `verify_shift.py` | `$028D` held at 1, re-poked every frame against `SCNKEY`'s own overwrite; in-air flag 1, Y 224 → 205 within 30 frames |
| Z, C, SPACE, `/` by the host-key path | `verify6.py` | Z, C walk; SPACE nothing; `/` nothing going out |
| `/` and fire on the way back | `verify3.py`, `verify6.py` | the girl, border 6 → 10 |
| All ten screens by play | `playthrough.py` | records `$7000` … `$7500` in order, needed 5 then 10, `reference/screen-*.png` |
| Starting on a way-back screen | `verify3.py`, `shots10.py` | the unwritten store shows as garbage |
| Level settings on every screen | `settings10.py` | directions 0 0 1 1, gravity 1, scroll `$FF`, fall limit `$FF` |
| What drains the bar standing still | `verify7.py` | an enemy: 69 hits each on `energy_down` and `poison_add`; control `music_irq` 1,799 in 30 s |
| The keyboard scan runs | `verify5.py` | SCNKEY `$EA87` 61 in 1 s; the matrix tool left `$C5` at `$40`, the host-key path reached it |
