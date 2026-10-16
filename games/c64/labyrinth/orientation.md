# Labyrinth — orientation

## Images and setup

The contributor supplied `labyrinth_s1[activision_1986](!).g64` and `labyrinth_s2[activision_1986](!).g64`. Both begin with `GCR-1541` (G64 version 0, 84 track entries). The ignored working copies are `work/side1.g64` and `work/side2.g64`. The supplied files were read, never modified; gameplay used the working copies, which may acquire save data.

| Side | SHA-256 before play |
|---|---|
| 1 | `a75e2590a6ca9ad3afe612f6209bf57574c47299dbea9f8455d1f6ae0ddbc8d0` |
| 2 | `ea8b2e81058a241e75e8fd889e7273e3bbce3c94260b433c07346cc921445797` |

VICE MCP release v3.13.2, macOS arm64 GUI build, PAL, SID 6581. The emulator passed all 57 `check-emulator` checks on 17 October 2026; no failed checks need workarounds. Use the kit launcher, with the emulator’s default full 1541 drive emulation. No drive-resource override was needed. regenerator2000 0.9.20 answered on the opening snapshot.

## Rebuild the analysed snapshot

1. Make fresh copies of both supplied images inside `work/`. Hard-reset the emulator to discard old RAM, clear checkpoints, and autostart side 1, its first directory file (`copyright`). Warp can accelerate disk reads. The screen is initially black, then shows the Lucasfilm Games logo, then the game-slot menu. Loading took roughly two minutes with warp enabled during this run; wait for the menu rather than relying on the timing.
2. At the menu (`reference/title.png`), press and release F1 to choose the empty first slot. Another load leads to the name prompt. Allow roughly a minute with warp; the prompt is the reliable cue.
3. Turn warp off. Enter `EUAN`, Return; `M`, Return; `BLUE`, Return. Keyboard-matrix inputs held for 0.4 seconds and released for 0.3 seconds worked. No trainer or cheats were selected.
4. Wait for the description of the east sidewalk and cigar store, with `go` and `dollar bill` in the word wheels (`reference/opening.png`). This is playable: `GO HOME` changes the location to the player’s home, as `reference/home.png` records.
5. At the initial sidewalk, pause on an instruction boundary and save without ROMs. The listing’s exact image is `parts/opening/work/play.vsf`, SHA-256 recorded by `parts/opening/listing.json`. An ignored duplicate is `work/opening.vsf`. The saved image includes drive state and the working disk, so it must never be uploaded.
6. Start the disassembler on that snapshot through `tools.py r2000`; on a resumed session import `parts/opening/symbols.json` rather than trusting a cached project. The snapshot’s code at `$127C` is `84 33 A0 25`; its NMI target `$11C1` is `40` (RTI). These checks agree with the live disassembler and independently anchor the snapshot’s RAM offset of 209.

The hand-over into the text overlay was not captured. Whether its startup overwrites additional authored bytes remains open. The Bronze listing describes the saved playable state, not every byte ever loaded.

## Parts and route beyond the snapshot

The opening has the partial symbol map and listing. The following graphical loads have saved states but no exported analysis. Their resident/overlay ranges are deliberately left undecided; a Silver pass must compare the loaded bytes before giving the shared engine an owner. Slots that reuse a resource are not assigned separate folders merely for a changed scene variable.

| Scene | Captured load | Capture route |
|---|---|---|
| `01` | The entrance gate | ordinary input |
| `02` | The Labyrinth | ordinary input |
| `03` | The Brick Hallway | forced scene request |
| `04` | Alph and Ralph | forced scene request |
| `05` | The Wall of Hands | forced scene request |
| `06` | The Stone Corridor | forced scene request |
| `07` | The Hedge Maze | forced scene request |
| `08` | The Persecution of Ludo | forced scene request |
| `09` | The Wise Man's Garden | forced scene request |
| `10` | The Hedge Maze | forced scene request |
| `11` | The Door Knockers | forced scene request |
| `12` | The Forest | forced scene request |
| `14` | The Forest | forced scene request |
| `15` | The Stone Faces | forced scene request |
| `16` | The Bog of Eternal Stench | forced scene request |
| `18` | The Goblin Village | forced scene request |
| `20` | The Underground | forced scene request |
| `21` | The Castle of the Goblin King | forced scene request |
| `24` | The Secret Corridor | forced scene request |
| `25` | The Upside-Down Room | forced scene request |
| `26` | The Final Confrontation | forced scene request |

The gate and first corridor were reached normally. The saved gate/corridor states in the scene folders were then reproduced with the capture driver; `work/gate-steady.vsf` and `work/corridor-play.vsf` retain the natural route. For later loads, the driver restores that natural corridor snapshot, sets pending scene `$0530` to the requested index, and runs the game's loader at `$5098`. It stops at the first room hook (`$8C8F`, `$8C92`, `$8C95`) or loader return `$59DC`, saves an entry state, then saves play after 60 frames. These are loader-generated states, not assembled memory images, and do not prove puzzle reachability. An entry stopped at loader return is after room initialization; it does not settle whether initialization overwrote authored data. Scene 04 also has a female-state capture, made by setting `$052C=1` and `$052F='F'` before loading; its screenshot is explicitly named `room-04-female.png`.

When the requested side changes, the game saves to the previously attached working disk first. The capture driver reads the requested side at `$56C4`, attaches that working image, and presses Space for the modal disk prompt. Attaching side 2 before that save caused a side-1 prompt; Space, rather than fire, dismisses that prompt because `$5DE5` waits for a new keyboard-queue byte. The source images remain untouched.

The opening was played with the game’s own word wheels. Each command starts on the left wheel: type the verb, Space, type the object, Return. A one-word command needs only the verb and Return. Matrix holds of 0.16 seconds per letter, releases of 0.12 seconds, and a pause between commands worked.

Route exercised after the saved sidewalk state: `GO HOME`, `TAKE CAMCORDER`, `GO OUTSIDE`, `GO NORTH`, `GIVE NICKEL`, `GO WEST`, `GO THEATRE`, `GIVE DOLLAR`, `GO THEATRE`, `GO NORTH`, `LOOK`, `GIVE DOLLAR`, `TAKE`, `COMPLAIN`, `COMPLAIN`, `TAKE`, `TAKE`, `GIVE NICKEL`, `GO SOUTH`, `GO SOUTH`, `GIVE POPCORN`, `COMPLAIN`. Screenshots show the home, street, theater lobby, popcorn counter, auditorium, and movie-start text. The route came from the [Zzap!64 solution transcribed at c64.tin.at](https://c64.tin.at/labyrinth/labyrinth.sol.htm), read on 17 October 2026, and was checked by observing these responses.

After the movie-start text the display loaded the character before an arched gate (`reference/maze-intro.png`). Black-screen intervals followed. `$0F10-$0F1C` is a ten-frame pacing loop using the IRQ counter at `$0353`, not a loader wait. A continuation dismissed the movie card with joystick-port-1 fire, saved `work/gate-steady.vsf`, and demonstrated movement with 100 frames of right input. From the initial gate position, 150 then 600 frames of up input entered the doorway and brought up The Labyrinth title card. Fire dismissed the card; with warp for the disk load, this reached the playable brick corridor in `work/corridor-play.vsf`. Side 2 was attached for the forced later-room captures described above. The graphical part folders are placeholders for those captured loads; their source partitions remain open.

## Steady-state memory

In the opening snapshot, the RAM IRQ vector `$FFFE/$FFFF` is `$127C`; the NMI vector `$FFFA/$FFFB` is `$11C1`. RAM vectors `$0314` and `$0318` are zero. The captured CPU port reads `$00=$07`, `$01=$15`, leaving ROMs hidden and I/O visible. Interrupt code explicitly uses `$25` for I/O and restores the main program’s saved port value from `$61`.

The frame capture records the IRQ vector changing through `$136F`, `$13E8`, `$1430`, `$1499`, `$14D7`, `$1540`, `$157E`, `$15E7`, `$1625`, `$168E`, `$16CC`, `$1735`, `$1773`, `$179C`, `$17E9`, `$113A`, and `$127C`. `$113A` schedules the first sprite band through `$1267`; `$127C` then schedules the next handler. A single IRQ-vector read therefore does not name the entire chain.

At the frame start, CIA2 port A is `$8C`, its DDR `$3F`, and VIC `$D018=$35`, `$D011=$1B`. This selects bank `$C000`, screen `$CC00`, and character data `$D000`. The video chip reads the RAM font underneath I/O. The frame held 106 register/vector/pointer writes, with the ending registers accounted for by the capture. The raw frame includes the machine and stays in `work/`.

## Disk-to-memory map

Both sides were extracted with the bundled `c1541`: 46 files on side 1 and 68 on side 2. Files’ two-byte load headers were removed, then distinct nonuniform 16-byte pieces were searched in the opening snapshot. The offset supported by the most pieces was counted byte for byte. A few isolated matching pieces in other files are candidates only.

| Side / file | Payload bytes | Candidate base | Matching pieces | Equal payload bytes | Interpretation |
|---|---:|---|---:|---:|---|
| 1 / `activision` | 33,942 | `$0800` | 1,107 | 19,557 | Substantial initial-image match; replaced or changed ranges remain unclassified |
| 1 / `ds` | 2,259 | `$BC00` | 93 | 2,193 | Strong contiguous match; menu code/text candidate; not fully traced |
| 1 / `tx` | 13,258 | `$7900` | 740 | 13,251 | Text-adventure overlay, including executable jumps, messages, and tables |

The text-opening snapshot has no convincing whole-payload match for the later art and room files. This does not show that they are unused: packing, relocation, and later scene loads can hide their relationship. The seven differing bytes in `tx` have not been assigned writers. The `activision` match overlaps the later overlay, so its matches must not be counted as a second independent copy of the engine.

## Loader

The first directory entry boots a publisher loader through the emulated 1541. It presents the logo and slot selector, then loads the text-adventure state. The `tx` payload accounts for almost all bytes at `$7900-$ACC9`. The cinema transition loads further graphical material. The loader selects scene resources through `$592A`; `U` overlays load at `$8B00`, with room callbacks at `$8C8F/$8C92/$8C95`. Male `AV` and female `AF` costume files load at `$7900`, and NPC costume files at `$A000`. Packed `M`, `P`, and `C` files expand to `$0600`, `$BC00`, and `$E000`. The four-byte packed header holds packed and expanded lengths; the unpacker is `$5C55-$5D35`. A standalone decoder reproduced every byte of the natural first corridor’s M2 (510 bytes), P2 (3328 bytes), and C2 (2008 bytes). These placements establish resource families, not the final listing ownership ranges. Loader internals were not annotated for this Bronze contribution.

## Graphical frame check

A PAL frame captured from the natural corridor snapshot contains 133 register/vector/pointer writes, accounts for the ending register state, and changes seven RAM bytes and no colour cells during the frame. `$D018` changes from `$35` to `$39` at raster line 80, selecting the room font at `$E000` for the picture; the text uses the `$D000` font. The raw frame and its emulator image remain in ignored `work/corridor-frame.*`. This records the split; a browser rendering comparison was not performed for Bronze.
