# The Goonies — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

The Datasoft disk (`goonies-original.g64`), version line "V 1 BY SES"
(`messages`, `$84E8`, shown by the V key). One load: the code of every
scene, its collision map and its shapes are in memory from the hand-over
at `$0800`; only each scene's background picture is read from disk when
the scene starts (`load_scene_graphics`, `$6F7A`).

## Memory layout

| Thing | Where |
|---|---|
| Object table, eleven slots of thirteen fields | zero page `$1D`-`$A0` |
| Start-up check (wiped before play) | `$0800`-`$083B` |
| Main program: attract mode, main loop, interrupt, object behaviours, movement and collision | `$083C`-`$1105` |
| Scene set-up, scene tables, game variables | `$1098`-`$12DD` |
| Sprite-restore lists | `$131E`-`$151D` |
| Keyboard, game over, joystick | `$151E`-`$175C` |
| Scene 4 (rolling rocks) | `$175D`-`$1FFF` |
| Scene loader, kept under the I/O area at `$D800` between loads | `$2000`-`$21AB` |
| Screen 0 / bitmap 0 (bank 0) | `$0400` / `$2000`-`$3FFF` |
| Bitmap 1 / screen 1 (bank 1) | `$4000`-`$5FFF` / `$6000`-`$63FF` |
| Mask table, random table, demo scripts | `$6400`, `$6500`, `$6600`-`$67FF` |
| Drawing: row tables, shape drawing, sprite save and restore, picture unpacking | `$6800`-`$70BD` |
| Shape table: shapes 0-15 per scene, 16-57 shared | `$70BE`-`$728D` |
| Scene 2 (the lake) | `$728E`-`$7A36` |
| Scene 1 (the hideout) | `$7A37`-`$8282` |
| Text: font, messages, score | `$8283`-`$85BA` |
| Fliers, random table, bird | `$85BB`-`$8A3E` |
| Scene 3 (the pipes) | `$8A3F`-`$92C6` |
| Sound requests, title scene | `$92C7`-`$9411` |
| Scene 7 (the octopus) | `$9412`-`$9D32` |
| Scene 8 (the ship) and the ending | `$9D33`-`$B796` |
| Scene shape blocks | `$B797`-`$B996` |
| Music driver and tunes | `$BA00`-`$C8ED` |
| Sound effects | `$C8F0`-`$CF78` |
| Scene 5 (eggs and lava) | `$E000`-`$F061` |
| Scene 6 (the cage) | `$F063`-`$F69A` |
| Demo playback, leftover source text | `$F69B`-`$F8FF` |
| Background saved under each buffer's sprites | `$F900`-`$FEFF` |

## Timing

- The raster interrupt runs once a frame at line `$FB` (`irq`, `$0A03`):
  it counts frames, flips the displayed buffer when asked and plays the
  music and effects.
- The main loop makes one pass every four frames (`main_loop`, `$08D6`,
  waits until four frames have passed since the pass began). *Live*: in
  400 frames from `work/play-scene1.vsf` the interrupt ran 400 times,
  `main_loop` and `run_objects` 100 each. Every speed below is per pass,
  so about 12.5 passes a second on a PAL machine.
- Five countdown timers at `$12D8`, reloaded with 1 to 5 (`timer_reloads`,
  `$0AAD`), pace animations that run slower than the pass.

## Controls

- Joystick in port 1. Up is copied onto the fire bit, so up jumps
  (straight up, or diagonally with left or right) as well as climbing a
  ladder; down climbs down; fire, as a one-shot press, swaps which Goonie
  the stick moves (`goonie_active`, `$0AF9`; `goonie_waiting`, `$0B62`).
- Two players at once: F3 on the title sets the option (`$12B0`); a game
  then gives the second Goonie to the joystick in port 2 (`$08D0`,
  `read_stick` `$172B`). There is no turn-taking mode.
- Keys (`game_key_matrix`, `$160C`): F1 to the attract mode, F3 the
  two-player option (title only), F7 a new game, space pause, S music off
  and on, V the version line, L (shift L for player 2) turns that player's
  joystick a quarter turn: up and down then come from left and right
  (`read_stick`).
- In the attract mode fire on port 1 starts a game (`handle_keys`,
  `$1634`).

## Graphics

- Multicolour bitmap, double-buffered: the game draws into one bitmap
  while the other is shown, and the interrupt flips them (`irq`). Bank 0
  shows `$0400`/`$2000`, bank 1 `$6000`/`$4000`.
- No hardware sprites. Everything that moves is a shape drawn into the
  bitmap (`draw_shape`, `$6D4E`), masked through a 256-byte table so the
  background shows through its empty pixels (`build_mask_table`, `$6F51`).
  Before drawing, the bytes it covers are saved in the buffer's save area
  (`$F900` or `$FC00`) and listed in its restore list; the next time that
  buffer is drawn, `erase_sprites` (`$6E23`) puts them back.
- A shape is a width in bytes, a height in lines, then the bytes. The
  shape table gives each shape four pointers, one for each value of the
  low two bits of x, and `draw_object` (`$0C8A`) picks one; the shape is
  drawn at column x / 4, so a byte (eight pixels) is the coarsest step.
  How many different copies the four pointers name differs by shape
  (counted by comparing the copies' pixels). Of the 42 shared shapes,
  15 have four copies two pixels apart (shapes 30-42, 48 and 57, among
  them the bird's six frames, 32-37), 4 have two copies four pixels
  apart (26, 28, 29 and 55), and 23 have one, moving eight pixels at a
  time. Of each Goonie's eight frames only the standing frame (6) has
  two copies. A walking Goonie
  alternates two frames by bit 1 of x (`goonie_frame`, `$0C36`), and the
  second frame is drawn four pixels to the right of the first, so the
  walk cycle doubles as the half-byte step.
- The whole game uses four colours. `fill_screens` (`$691E`) fills both
  screen matrices with `$26` and `fill_colour_ram` (`$6905`) the colour
  RAM with 1, so every cell of every scene shows black, red, blue and
  white; only the score rows use `$3C` (cyan and grey). The shape
  table at `$70BE` holds eight bytes a shape: shapes 0-15 are copied in
  per scene from two of seven blocks at `$B797`-`$B996`
  (`scene_shape_blocks`, `$7049`). Each block is one Goonie's eight
  frames (`goonie_frame` adds the frame, 0-7, to the Goonie's base shape
  in `$8B`): walking right (0, 2), walking left (1, 3), climbing (4, 5),
  standing (6), and swimming (5 and 7). The seven blocks draw
  seven different children, so the pair of Goonies on screen changes
  from scene to scene; scene index 7 (scene 8), the ending and the title
  name block `$B917` for both halves. Every scene's start routine sets
  the second Goonie's base (`$8C`) to 8 except scene 8's, which sets it
  to `$31` (`s8_start`, `$9D63`): there the second Goonie is drawn from
  shared shapes 49-56, a figure of 21 and 22 lines against the
  children's 18 and 19. Shapes 16-57 are shared
  (`shared_shapes`, `$713E`).
- Each scene's background is a picture packed with run-length codes
  (`unpack_picture`, `$7071`: bit 7 set repeats the next byte, below `$80`
  copies, zero ends), loaded from disk into `$4140`, unpacked into
  `$2140` and copied to the second bitmap.
- Text uses the game's own font of 37 characters, 0-9, A-Z and a space,
  stored inverted (`font`, `$8350`), printed into both bitmaps
  (`print_message`, `$82DA`).

## Mechanics

- **Objects.** Eleven slots, each with a type (`$1D`), speeds across and
  down, x (in two-pixel units), line, shape, two flags, an animation step,
  this pass's stick bits, a path step and stick bits forced for one pass.
  Slot 0 and 1 are the Goonies, slot 2 usually the scene's creature.
  `run_objects` (`$0A80`) calls each type's routine from
  `object_handlers` (`$0AD9`): 1 the controlled Goonie, 2 the other, 3 a
  dying Goonie, 4 a flier, 5 Mama Fratelli in scene 1, 6 a rolling rock, 7
  the gunman, 8 an egg, 9 the bird, 10 a hatchling, 11 an egg burning in
  the lava, 12 a drip, 13 scene 7's crate, 14 Mama Fratelli in scene 8, 15
  Mama sinking.
- **Collision** is against a list of rectangles per scene, each with one
  of eight kinds (`load_scene_tables`, `$1189`; counts at `$11F7`: 24,
  33, 30, 22, 32, 38, 37 and 53 by scene index). `move_object` (`$0CFD`)
  moves an object by its speeds and settles it against them: kinds 0 and
  1 stop it moving left and right, ladders hold it, a ceiling stops a
  rise, a floor ends a fall, kind 6 is water and slows a fall, kind 7
  also stops sideways movement at a ceiling. A kind with bit 7 set is out
  of use, which is how scenes open and close doors, floors and platforms.
  Gravity adds one line a pass to the fall up to four; a jump starts at
  5 lines a pass upwards (`$FB`), 2 across.
- **Pushing.** The crate (scene 1), the float (scene 2), the eggs (scene
  5), the chest (scene 8) and scene 7's crate move at the speed of the
  Goonie walking into them; with two players at once either Goonie can
  push, otherwise only the selected one (`s1_crate`, `s2_float`,
  `egg_type8`, `s8_chest`, `crate_type13`).
- **Death.** A Goonie that dies becomes type 3 for sixteen passes, then a
  life goes and the scene restarts (`goonie_dying`, `$0BD3`); only one
  dies at a time (`$12CF`). A restart keeps progress that the scene's
  start routine chooses to keep: scene 1's tipped tank, scene 2's key, scene 3's
  vents, scene 4's planks and bell, scene 5's egg pile, scene 7's fallen
  crate and drained pond (the six start routines that read `$12BA`; scenes 6 and 8 do not).
- **Lives.** Five at the start (`new_game`, `$0868`); three more for
  finishing scene 4, up to nine (`s4_exit`, `$181B`). Out of lives:
  GAME OVER and back to the attract mode (`game_over`, `$16E8`).
- **Scene order.** Exits lead 1 → 2 → 3 → … → 8 → the ending, by scene
  index 0, 2, 1, 3, 4, 5, 6, 7, 8 (each exit stores the next index in
  `$12B9`). The ending sails the ship across and then enters scene 1
  again (`s_A4F8`, `$A4F8`, stores index 0 and jumps to `enter_scene`),
  which keeps the score and the lives: the game goes round again, and
  each round's ending pays its bonus again.

## Scoring

The score is six decimal digits (`$12A7`, units at `$12AC`), shown as they
are (`format_scores`, `$8572`). `add_score` (`$852C`) does nothing in the
attract mode. Every award in the game:

| Points | For | Where |
|---|---|---|
| 1,000 | both Goonies at a scene's exit, each of the eight | `s1_exit` `$8013`, `s2_exit` `$763F`, `s3_exit` `$8C89`, `s4_exit` `$181B`, `s5_exit` `$E05D`, `s6_exit` `$F141`, `s7_exit` `$95FD`, `s8_exit` `$9DBE` |
| 5,000 × (lives + 1) | reaching the ending | `ending_start` `$A4E1` |
| 500 | scene 7: pulling the pond's plug | `s7_flipper` `$96EE` |
| 200 | scene 1: the crate's first push; scene 2: the key; scene 3: bursting the pipe | `s1_crate` `$7C05`, `s2_key` `$774E`, `s3_vents` `$8E53` |
| 100 | scene 1: the press's first use; each step a Goonie tips the tank; scene 8: Mama Fratelli in the water | `s1_press` `$7D41`, `s1_tank` `$7E6C` (two calls), `s8_water` `$9DEB` |
| 50 | scene 5: an egg onto the pile; scene 7: knocking the crate off its ledge | `s5_egg_at_pile` `$E33C`, `s7_crate_rect` `$97D6` |
| 35 | scene 4: a rock on the plank lever, while planks remain | `s4_rock_steer` `$1A41` |

## Data tables

- Per scene index (0-9), eight tables of words from `$1201` to `$12A0`:
  rectangle kinds, left, top, right and bottom edges, and the start,
  per-pass and late routines (`scene_rect_kind_ptrs`, `$1201`).
- Scene 4 and scene 5 keep a second rectangle set for their rocks and
  eggs and swap it in while those move (`$1B34`; `$E427`); scene 7 does
  the same for its crate (`$98DA`).
- Fliers follow ten paths of points (`flier_path_x`, `$8737`); the bird
  four (`bird_paths_x`, `$898D`); the hatchlings four (`$E573`).
- The attract mode's demonstrations are recorded stick input: per scene
  index, 31 pairs of (stick value, passes) (`demo_scripts`, `$F7CF`), with
  the random table replaced by a fixed one (`demo_random`, `$F69B`) so
  they replay identically (`make_random_table`, `$880D`).

## Sound

- Twenty-five sounds (`sound_table`, `$9384`): each is either one of four
  tunes for the music driver or one of twenty-one effects, with a priority
  that decides which of three effect slots it takes (`start_sound`,
  `$92C7`).
- The music driver (`$BA00`-`$C028`) reads three streams of notes and
  commands per tune (`f_C02E`), with eight command numbers
  (`command_table`, `$BD34`; 7 runs the same routine as 0), a tempo, 84
  note frequencies and instruments. *Machine*: run through each of the
  four tunes on the kit's 6502 machine, the driver reaches only command
  0, the note length (418, 292, 252 and 204 times); the other six
  routines are never entered (8 October 2026).
- A tune is started at priority `$7F` on voices 1 and 2, which no effect
  can displace; tune 0 takes voice 3 as well, the other three leave it
  to the effects (`start_sound`, `$9325`).
- Each pass, once the tune has ended, the main loop starts it again
  (`$092C`): tune 0 in the attract mode, otherwise the scene's tune, so
  the music loops. With the music switched off, the ending's tune still
  plays (`$0905`).
- Each scene index has a tune that starts when the music is due to
  restart (`scene_jingles`, `$09F9`): none for scene 6.
- S stops the music (`$12B6`); pause stops both music and effects
  (`irq`).

## Protection

- `game_start` (`$0800`), run once at the hand-over, copies sixteen bytes
  of `object_handlers` under the video chip at `$D000`, then compares the
  eleven bytes at `$CF79` with those at `$CF99` sixteen times, jumping to
  `$0000` (a crash) if they ever agree. They differ in an untouched load.
  What the check is meant to catch is not known.
- Every pass, `goonie_active` reads the CPU port's direction register
  `$00` through a zero-page index that wraps (`LDX $A14F`, which holds
  `$E3`, then `LDA $1D,X`, `$0B2F`) and adds `$11` from `$A150`; both
  values are kept among scene 8's tables: unless `$00` holds `$EF`, it moves the Goonie a
  second time and calls into the tail of the interrupt handler (`$0A49`),
  whose pulls and `RTI` wreck the stack. *Live*: `$00` reads `$EF` at the
  hand-over and in play; with it set to `$2F`, the KERNAL's own value,
  `$0B3D` ran 4 times in 200 frames and the screen was corrupted. The
  loader sets `$EF`; no instruction in the game writes `$00`.

## Leftovers

- `dev_source` (`$F84D`-`$F8FF`): a stretch of the developers' assembler
  source in ASCII with bit 7 stripped. It is the source of scene 6's
  tables at `$F405`-`$F412` and the start of `s6_platforms` (`$F413`),
  in the order they are assembled: DOORX `568C`, DOORY `A33A`, DOORXOFF
  `36C8`, DOORYOFF `9769`, DOORMASK `0808`, MKDRX `408F` and MKDRY `5F8C`
  are the bytes at `$F405`, `$F407`, `$F409`, `$F40B`, `$F40D`, `$F40F`
  and `$F411`, and "DOFLRS LDX #$02 / DFL31 LDA PLAY,X / BEQ DFL32" is
  `$F413`-`$F418`, with PLAY where the game has `$F481`. The names give
  the developers' words for the passage's mouths (DOOR) and the levers
  (MKDR).
- Code nothing calls: `unused_handler` (`$0BF5`), `unused_near_goonie`
  (`$0C04`), `unused_clear_buffer` (`$68D9`), `effect_stop_voice`
  (`$C912`), and an older copy of some game code after effect 20's script
  (`$CF08`-`$CF78`).
- 166 bytes nothing reaches (`unused_7F63`). As loaded, the table's
  first sixteen entries point at shapes 49-56 twice (`$1DA8`); every
  scene overwrites them before it draws.
- After each score's six digits the message holds one more `0`, never
  printed (`$84CD`, `$84D4`).
- `$C08E`, where command 5 would take its eight filter settings, is
  inside a tune's note stream. No tune uses command 5 (below), so the
  overlap does no harm.

## Live tests

All from `work/play-scene1.vsf` or the scene snapshots, in VICE `x64sc`
through the kit's MCP client, 8 October 2026 unless noted.

- Pass rate: checkpoints on `irq`, `main_loop` and `run_objects` for 400
  frames: 400, 100, 100.
- The direction-register check: `$00` read through the CPU (`$EF`, at the
  hand-over and in play); checkpoints on `$0B3C` (return) and `$0B3D`
  (second move) for 200 frames: 50 and 0; after poking `$2F` into `$00`:
  0 and 4, then a corrupted screen.
- Lives: every scene snapshot, entered through `$12BC` and F7, shows
  LIVES 5 and holds 5 in `$12B7` (7 October 2026).
- Ending bonus: the ending entered the same way with 5 lives and no score
  shows SCORE 30000 (`reference/ending.png`, 7 October 2026), 6 × 5,000.
- The second round: the ending entered that way, with the ship's x poked
  to `$7E`, leads to scene 1 with SCORE 30000 and LIVES 5
  (`reference/second-round.png`, from a fresh boot, 8 October 2026).
- The jump, on the kit's 6502 machine (`kit/c64/machine.js`) from
  `work/play-scene1.vsf` with up held for one pass: the Goonie's line goes
  102, 98, 95, 93, 92, 92, 93, 95, 98, 102, a rise of ten lines in four
  passes, two passes at the top and four down (8 October 2026).

## Listing error rate

Measured on 8 October 2026. Seed 20261008; population the 1,303 line
comments in `symbols.json`, in two strata: 984 written by hand and 319
written by a script from templates (the shapes, the effect scripts, the
rectangle tables and the entries of pointer tables). Sample: 40 hand and
20 generated comments, checked against the bytes by an agent that wrote
none of them. Three were wrong: 1 of 40 hand (the flier paths' markers,
which the mover reads from the line list, not the x list) and 2 of 20
generated (both from one template that copied a pointer table's comment
onto each entry it points at: the chest's shapes and the hatchling
paths, where one table of eight words is two tables of four). Plain
rate 5 % (3 of 60, 95 % interval 1.7 % to 13.7 %); weighted by stratum
size, 4.3 %. The listing states each of these as it is now: the
ten flier paths' comments, the 58 entries that template wrote (each with
its own role), and the tables they hang from. The rocks' rectangle set in
scene 4 (`$1B34`) has 23 rectangles.