# Wasteland — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

Four files, one per disk side, from the contributor's archives
`wasteland_s1ea_interplay_1988.zip` to `..._s4...`: `wasteland-s1.g64` to
`wasteland-s4.g64` in `work/`. Each header reads `GCR-1541`, version 0,
84 half-tracks: a GCR image, so the drive must be emulated (true drive
emulation on, virtual device traps off). Every sector of tracks 1-35 of
every side decodes with good checksums; track 36 is present on every side
and holds no sector headers.

- Sides 1 and 3 have a CBM directory with two files, `PRODOS` (72 bytes,
  loads to `$02BE`) and `2.0` (2032 bytes, loads to `$C000`), and a C128
  boot sector at track 1 sector 0. Side 1's boot sector is named
  `WASTELAND`; side 3's `A JERKVISION PRODUCTION` (with colour codes).
- Sides 2 and 4 have empty directories. Everything the game reads is in raw
  sectors, through its own fast loader.
- Disk IDs `ID` on sides 1-3 and `IP` on side 4.

This is the original Electronic Arts release (two double-sided disks, parts
139402 and 139406 by their labels), not a crack: the masters carry the
game's own side check (below) and the copy utility.

Emulator: VICE, `release v3.13.2, v3.13.2-linux-x86_64-gui.zip`, through
vice-mcp. `tools.py check-emulator` on 5 October 2026: every check passed,
none failed.

## The play disks

The game refuses its masters in play. Logical sector 8 of track 35 ends
with the side's identity: the masters hold `$D7 $CC <side>` in its last
three bytes, and the side check at `$1897` wants the byte before the side
number to be `$ED`'s value, which is 0 in play. The game's own Copy
utility (Utils, then Copy) writes copies whose identity is `$00 $CC
<side>`; those are the play disks. A copy has no CBM directory, so the
game always boots from the master, side 1, as the card says.

1. Copy each original to a writable file of its own: `master-s1.g64` to
   `master-s4.g64` (the source sides) and four blank formatted images for
   the destinations.
2. Boot the master (next section), press **U** at the title, then **C**.
3. For each side *n*: press *n*, **Y** to format, then attach the master
   side *n* or the destination image as each prompt asks ("Insert Wasteland
   Master disk side *n* in drive 1.", "Insert destination disk side *n* in
   drive 1.") and press RETURN, until the screen says the copy was
   successful. `work/copy.py <side>` does this; the copies are
   `copy-s1.g64` to `copy-s4.g64`.

## From power-on to play

1. Hard reset. Attach `wasteland-s1.g64` (or a writable copy of it) as
   drive 8 and autostart it: `LOAD"*",8,1` loads `PRODOS`, which loads
   `2.0` and jumps to it.
2. `2.0` sends drive code, installs the fast loader at `$FC00-$FFFF`,
   loads the font page (track 34, logical sector 14) to `$C600-$C9FF`, the
   engine (T34/L10, 47 pages) to `$0200-$30FF` and the start-up program
   (T4/L16, 16 pages) to `$7E00-$8DFF`, turns the raster interrupt on and
   jumps to `$7E00`. That instruction is the start-up's hand-over:
   `parts/startup/work/entry.vsf` and `parts/engine/work/entry.vsf`.
3. The start-up loads two more pages (T4/L1) to `$CA00`, unpacks the title
   picture and shows the title screen with **Start** and **Utils** on its
   bottom line: `parts/startup/work/play-title.vsf`.
4. **S**, then **Y** at "Use last saved game (Y/N)?", then attach
   `copy-s1.g64` at "Insert side 1. (RETURN)" and press RETURN. The game
   loads the item table (T26/L5, 3 pages) to `$3100` and the game program
   (T31/L9, 72 pages) to `$7E00-$C5FF`, whose first instruction is
   `parts/game/work/entry.vsf`, then the world map. The party stands
   outside the Ranger Center and the game asks "Enter new location
   (Y/N)?".
5. **Y** enters the Ranger Center (module 3, which loads the Ranger
   Center program, below). There, with the default party: **D**, **4**, **Y**
   deleted the fourth Ranger; **C** created a character (attributes
   accepted with RETURN, name KIT, sex F, nationality 1, skills bought
   with the number keys), kept with **Y**; **S** left. The game reloads
   and the party is on the world map outside the Ranger Center:
   `parts/game/work/play-map.vsf` and `parts/engine/work/play-map.vsf`,
   the steady state of play.

Throughout, wait about four seconds after attaching a disk before the game
reads it; a read straight after the attach fails with an I/O error.

## The parts

The engine stays in memory from boot to the end. Programs are loaded over
it at `$7E00` and at `$CA00`; each is a part with its own folder, symbol
map, listing and snapshots (`parts/<id>/work/`). Every program load goes
through the engine's `$2890`, which reads a header sector (load address at
+3/+4, pages at +5) and jumps to the load address; `work/drive.py` stops on
that jump (`$28BA`) and saves the hand-over.

| Order | Part | Lies over | Owns | Loaded from | Route to its snapshots |
|---|---|---|---|---|---|
| 1 | engine | | everything no other part owns | T34/L10 and T34/L14, by `2.0` | step 2 (`entry.vsf`), step 5 (`play-map.vsf`) |
| 2 | startup | engine | `$7E00-$8DFF`, `$CA00-$CBFF` | T4/L16 by `2.0`; T4/L1 by itself | steps 2 and 3 |
| 3 | utils | engine | `$7E00-$8BFF` | T8/L20 | title, **U**: `entry.vsf` at the jump, `play-utils.vsf` at "Copy Restart" |
| 4 | game | engine | `$3100-$33FF`, `$7E00-$C5FF` | T26/L5 and T31/L9 | step 4 (`entry.vsf`), step 5 (`play-map.vsf`) |
| 5 | ranger | engine | `$7E00-$C5FF` | T27/L7 | step 5: `entry.vsf` at the jump, `play-ranger.vsf` at "Create Delete Start", `play-create.vsf` with attributes rolled, `play-skills.vsf` buying skills |
| 6 | order | game | `$CA00-$CAFF` | T34/L15, by the game's Order command | from `play-map`: **O**, **Y**; `entry.vsf` at the game's `JMP $CA00` (`$BF5C`), `play-order.vsf` at "Pick a player" |
| 7-11 | module-0 to module-4 | game | `$CA00` up to the module's end | packed, entries 0-4 of the directory at T34/L16 | the game's loader called (below) |
| 12 | radio | game | `$7E00-$87FF` | T26/L17 | the Radio command run (below) |
| 13 | death | game | `$7E00-$7EFF` | T4/L2 | the death branch run (below) |
| 14-64 | tiles-0 to tiles-8, map-00 to map-49 | game (tile sets); the map's tile set (maps) | `$D000-$DD7F`; the map's pages from `$3400` and its stream from `$DE00` | T35/L12; T35/L14 and T35/L13 | the game's `enter_map` called (below, "The maps") |

Three routes are not played but use the game's own code from a stop at
the top of its main loop (`$7E63`) in `play-map`, with `copy-s1.g64`
attached:

- **Modules.** The game loads module *n* when a map square's action byte
  is `$80 + n` (`$8845`): `JSR $03BF` with A = *n*, then `JSR $CA00`.
  Instead, `$26BC` (the module in memory) is set to `$FF`, the stub
  `LDA #n / JSR $03BF / JMP $5905` is poked at `$5900` and run from there;
  the stop at `$5905` is the module's `entry.vsf`. Modules 0, 1 and 3 come
  from side 1, module 2 from side 2 and module 4 from side 4 (each
  directory entry names its side), so that side's copy is attached first.
  Each part's range is where the load wrote over `$CA00-$CFFF` filled
  first with `$55`, then with `$AA`: module 0 `$CA00-$CE53`, 1
  `$CA00-$CE78`, 2 `$CA00-$CF3E`, 3 `$CA00-$CB7C`, 4 `$CA00-$CFFF` (its
  load stops at the `$D000` limit). That is the unpacker's read window,
  not the module: a stream's directory entry gives the sectors to read,
  and the unpacker decodes them all, so the window also decodes the
  bytes after the stream on the disk. The modules' own bytes, where the
  sides that carry them agree or the packed bytes end, are module 0
  `$CA00-$CDE6`, 1 `$CA00-$CE24`, 2 `$CA00-$CDA5`, 3 `$CA00-$CA24`; the
  rest of each window is in its `coverage.exclude`, with what it is.
- **Radio.** The program counter set to the Radio command (`$8802`),
  **Y** at its prompt: the engine loads T26/L17; `entry.vsf` at the jump,
  `play-radio.vsf` after the promotion check.
- **Death.** The program counter set to `$7EFE`, the branch the main loop
  takes when every member is dead (`$7ED5-$7F09` tests each member's byte
  `+$28`): it loads T4/L2; `entry.vsf` at the jump, `play-death.vsf` on
  the Grim Reaper screen.

### The maps

Forty-two maps, each loaded at `$3400` when the party enters it and written
back to its own sectors when it leaves (the world is persistent):

- The map directory is T35/L14: entry *n* is (track, logical sector, pages,
  side). Seven maps are on side 1 (0, 8, 9, 10, 29, 43, 49), thirteen on
  side 2 (1-6, 26-28, 31-34), eleven on side 3 (11, 12, 24, 25, 35, 36,
  38-42) and eleven on side 4 (7, 13, 15-23). Numbers 14, 30, 37 and 44-48
  have no map. The world map is entry 0: T20/L9, 35 pages, to
  `$3400-$56FF`.
- With each map come two packed streams: entry *n* of the directory at
  T35/L13, unpacked to `$DE00`, and one of nine tile sets, entry *t* of
  T35/L12 where *t* is byte `$30` of the map's record, unpacked to
  `$D000-$DDFF` (the code saves and restores `$DD80-$DDFF` around it). A
  map's stream and its tile set are always on the map's own side.
- The tile set is unpacked only when it differs from the one in memory
  (`$25F1`), so a tile set stays while the party walks between the maps
  that share it: each tile set is a part of its own (`tiles-0` to
  `tiles-8`, over the game, range `$D000-$DD7F`), and each map lies over
  its tile set (`map-00` to `map-49`, ranges the pages and the stream its
  load writes).

Every map part was reached the same way, with the game's own loader:

1. Make a fresh play disk of side 1 with the game's Copy (as in "The play
   disks"): `fresh-s1.g64`, copied to `maps-s1.g64`. The other sides'
   play copies, never entered in play, are copied to `maps-s2.g64` to
   `maps-s4.g64`. (`copy-s1.g64` holds the party's own world map, changed
   by play.)
2. Load `play-map.vsf`, stop at the top of the game's main loop (`$7E63`)
   and attach `maps-s<side>.g64` for the map's side.
3. Poke a stub at `$CF00` that sets `$91` = `$FF` (no map in memory, so
   nothing is written back), `$25F1` = `$FF` (no tile set in memory, so
   the map's own is unpacked) and `$09` = the map's number, calls
   `enter_map` (`JSR $03B6`) and parks in a `JMP` to itself. Run it to the
   park: that moment is the map part's `entry.vsf`, and the tile set
   part's for the first map that uses the set.
4. The map's extent: the same run twice more, with `$3400-$59FF`,
   `$D000-$DD7F` and `$DE00-$EDFF` filled first with `$55` and then with
   `$AA`; a byte is the load's where both runs agree. Every load wrote all
   its pages, its whole tile set and its stream to a length of its own
   (`$DE00-$E202` for map 15 up to `$DE00-$EDFF` for the 64x64 maps), and
   the run without a fill wrote the same bytes.

`work/mapsnap.py all` does steps 2-4 for every map and writes the extents
to `work/maps.json`.

Not parts: the sixty portrait entries of T35/L10, pictures unpacked into a
window buffer at `$CA00` or `$E000` while play goes on, and the game state
at T35/L7-L0 (`$F400-$FBFF`), read and written as the party saves.

## Steady state

- Hardware vectors in RAM (`$01` = `$35`: I/O visible, both ROMs out): NMI
  `$FFFA` → `$04F6` → `JMP $2966` (an `RTI`), IRQ `$FFFE` → `$04F9` →
  `JMP $2947`.
- `$2947` is the only interrupt handler: a raster interrupt that scans the
  keyboard (`$2967`) and acknowledges CIA 1.
- Video (live, `play-map`): VIC bank `$4000` (`$DD00` = `$86`), `$D018` =
  `$79` (screen matrix `$5C00`, bitmap `$6000`), `$D011` = `$B7`
  (bitmap mode, 24 rows; written as `$37`, bit 7 reads back as the raster
  line's high bit), `$D016` = `$D8` (multicolour).
- What sits where in play is in `facts.md`, "Memory layout".

## The loader, in a paragraph

`2.0` uploads drive code (the `B-E` command runs track 18 sector 11 in the
drive) and installs the computer's half at `$FC00-$FFFF`. A call to `$FF00`
reads or writes whole sectors with no link bytes: a file is a starting
track and logical sector and a page count, logical sectors run down to 0
and on to the track below (track 18 is skipped), and per-zone interleave
tables map logical to physical sectors. The track below is entered at the
logical sector the table at `$C930` gives (`$FD0B`), and the table is read
one entry off: track 17 is entered at L0, track 24 at L17 and track 30 at
L16, not at their top sectors. The disks were laid out by the same rule:
maps 0, 2, 5, 11 and 19 cross one of those tracks, and each loads the
sectors the rule names (`work/rawfs.py` reads them from the image the
same way), not the ones a full track would give. The game writes through
the same routine, so it always agrees with itself. Bytes cross
the serial bus two bits at a time on `$DD00`, timed against the raster.
Not annotated further than one description per routine, by policy.

## Files on the disk and where they land

| Load (track/logical sector, pages) | To | Part |
|---|---|---|
| `PRODOS`, `2.0` (CBM files, side 1) | `$02BE`, `$C000-$C7EF` | in front of the game |
| T34/L14, 4 | `$C600-$C9FF` | engine |
| T34/L10, 47 | `$0200-$30FF` | engine |
| T4/L16, 16 | `$7E00-$8DFF` | startup |
| T4/L1, 2 | `$CA00-$CBFF` | startup |
| T5/L16, packed | `$8A00-$A2FF` (title picture, unpacked) | startup's output |
| T8/L20, 14 | `$7E00-$8BFF` | utils |
| T26/L5, 3 | `$3100-$33FF` | game |
| T31/L9, 72 | `$7E00-$C5FF` | game |
| T27/L7, 72 | `$7E00-$C5FF` | ranger |
| T34/L15, 1 | `$CA00-$CAFF` | order |
| T34/L16 entries 0-4, packed | `$CA00-$CFFF` | module-0 to module-4 |
| T26/L17, 10 | `$7E00-$87FF` | radio |
| T4/L2, 1 | `$7E00-$7EFF` | death |
| T35/L14 entry *n* | `$3400` up | map-*nn* |
| T35/L13 entry *n*, packed | `$DE00` up | map-*nn* |
| T35/L12 entries 0-8, packed | `$D000-$DD7F` | tiles-0 to tiles-8 |
| T35/L10 entries, packed | `$CA00` or `$E000` | portraits (data) |
| T35/L16, T35/L11, 1 each | `$C800-$C8FF` | engine (swapped in and out by the unpacker) |
| T35/L8, 1 | `$5A00` | the disk's per-map flags and its identity (read only) |
| T35/L7 to L0, 1 each | `$F400-$FBFF` | the saved game (read and written) |
