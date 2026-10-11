# Skate or Die!: Shop and town — facts

The shop program: file `$03`, loaded at `$0880` and entered at `$0880`. It
holds the town square you skate around, Rodney's skate shop with its menu,
the sign-up and records screens, and the code that merges each event's
results into the high-score table and saves it. The same program installs
the resident event manager on first load.

"Traced" means read from the code. "Simulated" means observed by running the
program from its snapshot (`work/play.vsf`) in the kit's 6502 machine
(`kit/c64/machine.js`). In that run, `load_file` at `$F230` was served from the
disk's own files (`GAME/work/files/<nn>.bin`), `save_file` at `$F233` was
recorded, and the run stopped at `goto_event` `$F99C`. The scripts are in
`GAME/work/agent-shop/` (`sim.js`, `drive.js`, `d1.js`-`d7.js`, `v1.js`).

## Layout

- Code `$0880`-`$206E`, data `$206F`-`$26A4`; `$26A5`-`$26FF` is file tail
  that nothing references. (traced)
- There is no sound: the program never writes to the SID (`$D400`-`$D41C`).
  (traced: every store in `$0880`-`$206E`; simulated: no SID writes in any
  run)
- The main loop at `$0887` services redraw requests `$41`-`$45` and `$48`,
  then calls `leave_town_check` `$08A2` and `update_speech` `$0C1D`.
  Everything else runs in `raster_irq` `$11AD`, which has two bands: line
  `$FA` (`$11EA`) and line `$2F` (`$12EC`). The handler for the current mode
  comes from the table at `$2096`, patched into the JSR at `$11DE`. (traced)

## Loads

`load_files` `$0F46` loads from the table at `$20F2` (file numbers), with
addresses at `$20F9`/`$2100`, in this order (traced; simulated):

| File | To | What |
|---|---|---|
| `$04` | `$6184` | packed town pictures, unpacked to `$4000`-`$6BE7` |
| `$05` | `$7800` | font |
| `$06` | `$8800` | SIGN-UP screen template, frame table, skater shapes |
| `$07` | `$E5F4` | packed colour maps, unpacked to `$E000`-`$EFEF` |
| `$08` | `$9900` | high-score table |
| `$09` | `$AB1D` | packed shop picture, unpacked to `$9C00`-`$BF3F` |
| `$0A` | `$8000` | shop screen matrix |

- On first load (`$FDFF` is not `$55`), the program blanks the screen,
  loads file `$0B` to `$C000`, copies it to `$F730` (`$0FD2`), steps the
  border colour once (`inc $D020`) and starts in the shop. `$FDFF`=`$55`
  marks the event manager as installed. (traced)
- The unpacker at `$0FEA` uses the same run-length format as High Jump's
  `$1B6A`: a control byte `$00`-`$7F` copies n+1 literal bytes, and `$80`-`$FF`
  repeats the next byte n-`$7F` times. (traced)

## Pictures and screens

- Town: bitmap `$4000`, screen matrix `$6000`, colour RAM image `$E000`.
  (traced: VIC setup for mode 0)
- Shop: bitmap `$A000`, screen matrix `$8000`, colour RAM image `$9C00`.
  (traced)
- The menu screens are built in the buffer `$7000` from templates, each with
  its own colour map, and use the font at `$7800` (`$D018`=`$CE`). SIGN-UP
  (`$8800`, colours `$E400`) and records (`$6800`, colours `$E800`) are
  multicolour text; SELECT YOUR BOARD COLOR (`$6400`, colours `$EC00`) is
  hires text. The blank screen between menus and the MUST REGISTER message
  are hires text from `$6C00` (`$D018`=`$BE`). (traced: `$11EA`, `$127C`,
  `$12EC`)
- Frame table `$8C00`-`$8DDF`: 80 records of 6 bytes. Byte +5 is never read.
  72 trimmed sprite shapes are stored at `$8DE0`-`$98EC`. (traced)
- The shop pointer is a sprite showing the "SKATE / OR / DIE!" logo, copied
  from `$2641` to `$8400`. (traced)

## Modes

`$26A4` holds the mode: 0 town, 1 entering the shop, 2 shop pointer, 3 board
list, 4 waiting, 5 board colour, 6 name entry, 7 sign-in, 8 MUST REGISTER,
9 records. (traced)

- `joy_dispatch` `$18F1` reads both joystick ports ANDed together and uses
  joy&`$0F` as an index into `$2507`. That selects one of 10 tables of 10
  words at `$2527`-`$25EE`, and the handler is patched into the JMP at
  `$1920`. Either port works. (traced)

## Town

- The heading `$31` runs from -31 to +32; 0 faces down the screen. (traced)
- Stick right turns clockwise one step every 2 frames, so a full circle
  takes 128 frames. (simulated)
- Pushing the stick gives +1 speed every 8 frames, up to 3. There is no
  friction: speed is kept with the stick centred, and only pulling back
  brakes. (simulated; traced at the speed handlers)
- The step table is a diamond (|dx|+|dy|=16), so diagonals cover about 70 %
  of the straight-line distance: 30 lines in 60 frames against 60. (traced
  table; simulated)
- Walls are hard-coded compares at `$1793`, `$17E2`, `$1839` and `$1888`.
  (traced)
- Exits (traced; RAMP, JAM and practice simulated):
  - right edge above y `$28`: FREESTYLE RAMP (event 1); below it: HIGH JUMP
    (2).
  - left edge from y `$28`: POOL JOUST (5). Above it: COMPETE ALL
    (comp_flag=1, starting with the ramp) when not practising; in practice
    the skater just stops.
  - bottom edge with x < `$2A`: DOWNHILL RACE (3); otherwise DOWNHILL JAM
    (4).
  - the shop door: x `$47`-`$4F` with y < `$53`.
- In a competition with no skaters signed in, the town shows MUST REGISTER
  AT SKATESHOP (mode 8). In practice the event runs anyway. (simulated)
- `go_to_event` `$08F9` clears archive_scores, archive_ids and
  overall_points, resets skater_ids, sets cur_event, then jumps to `$F99C`.
  It does not use `$FE03`-`$FE05`. (traced)

## Shop

- The shop has 13 hotspots at `$2113`, 5 bytes each; bit 7 marks a talk-only
  spot. Menu actions are at `$2107`/`$210D`: sign in `$1CEC`, board colour
  `$1A7E`, records `$1DC8`, practice `$2067` (sets `$FE11`), compete `$1A65`.
  (traced)
- The hotspot loop scans 14 entries, but the last (catch-all) entry always
  matches before the loop runs out. (traced)
- Rodney has 21 speech lines of 36 characters at `$217E`, with pointers at
  `$2154`/`$2169`. Hotspot `$0B` picks a random line from `$0B`-`$12` through
  `random_step` `$F90F`. Line `$14` is CONGRATS followed by the top skater's
  name (first 9 characters; on a tie the later skater wins), copied to
  `$2457`. (traced)
- The speech balloon is drawn into 6 sprites by `$0EA9`, at offsets from
  `$0F0B`. (traced)
- The fire guard `$74` counts down only while fire is released, so holding
  fire does not repeat. (traced)
- Name entry: up to 15 characters, read through the keyboard table at
  `$2490` with no auto-repeat. RETURN (`$FF`) acts as fire; DEL and
  cursor-right (`$FE`) rub out. The first key wipes the old name, and
  accepting an empty name after that deletes the skater (`$1D5B`). There are
  at most 8 skaters. (traced)
- Board colours run 1-15 (black is excluded). The choice is stored in
  skater_attr `$FCD2` and shown live on a preview skater. (traced)

## Records

- The table at `$9900` holds 12 records of 16 bytes: a 9-character name, the
  score at +`$0A`-+`$0C` and a colour at +`$0F`. (traced)
- `merge_event` `$0ACA` merges each event's archived top 3. On a tie the
  old holder keeps the record. An unknown skater id hangs the machine in a
  border-flashing loop at `$0B43`. (traced)
- `save_records` `$0BB4` calls `save_file` `$F233`; it is the only disk
  write in this program. (traced)
- The records screen is shown automatically (`$18F5`) after a single-event
  competition. After COMPETE ALL it is skipped, because shop_init clears
  `$49` when comp_flag is set. (simulated, both cases)
- High jump records print as feet'inches". (traced)
- `reset_record_colours` `$1089` writes 2 bytes past the table, at `$99CF`
  and `$99DF`. (traced)

## Oddities

- `$0935` stores the value read from `$D019` into `$47` where 0 was
  presumably meant. It is harmless. (traced)
- Dead routines: `$135B` and `$136A` (the `$3E`/`$3F` flags), and `$1DFA` and
  `$1E21` (single-spaced cursor variants). Dead bytes: `$0BAB`-`$0BB3`.
  (traced: no reference)
- Unreferenced strings: "@0:HSCOREINTER" `$206F`, "+++" `$209E`, "WHO NEEDS
  A BOARD" `$20A9`, "SKATE AGAIN" `$20D6`. (traced)
- A branch to the next instruction at `$1A38`, and duplicate stores at
  `$1BE3`. `$34` is never written; `$7C`-`$7E` are saved but never read.
  (traced)
- With 8 skaters, two cursor positions both show on the CANCEL row of the
  sign-in list. (traced)
- `go_to_event` writes 0 to `$7FFF`, the VIC idle byte for bank 1. (traced)
- The shop sets the NMI vector to `$0A3A` (an RTI), and the events inherit
  it. (traced)
