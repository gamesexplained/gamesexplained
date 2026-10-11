# Jumpman: orientation

## Image and machine

The contributor supplied `jumpman.g64`, a GCR image (`GCR-1541`, format version 0, 84 half-track slots), 282,168 bytes. The disk directory names it `JUMPMAN REV 1.0`. The original remains outside the repository; the run uses a copy in `work/`.

Image SHA-256:

```text
de3ae72cb2ce3c7a34924ad03db3640c8b70e3663fa0d9d705cc971e8ac4c9b5
```

Machine: PAL C64SC, standard 64 KB, VICE-MCP release v3.13.2 (`v3.13.2-linux-x86_64-gui.zip`), Linux x86_64 without a display. The release's GTK build runs under Xvfb. The emulator capability suite passed 56 of 57 checks on 2 October 2026. Only `warp` failed: the test measured 46 loop passes per second with warp and 45 without. Exact stopping, frame stepping, input and snapshot determinism passed. All timings must use emulated frames or cycles, not host elapsed time. After upstream integration on 4 October, the same build passes all 57 capability checks; host-speed measurements are now informational.

This machine was already running tools for another checkout. This clone uses its own `tools/ports.json`; the emulator and disassembler clients read the same settings. regenerator2000 0.9.20 runs through its stdio interface with a local HTTP bridge. It answers on a full 65,536-byte snapshot image. Tool settings and logs stay in `tools/`.

## Reproduce first-level play

1. Start the emulator with `python3 kit/scripts/tools.py vice`.
2. Hard-reset it, resume execution, and autostart the working G64 image. VICE selects the first file, `JUMPMAN`. There is no trainer menu.
3. Wait through the coloured loading illustration. Loading `INTRO.SYS` takes minutes on this host; a static loading picture alone is not a failure. The first completed screen is an animated structure with the Epyx copyright and address.
4. Press and release RETURN. The five-option menu appears. Press and release `1`, then RETURN, then `1` for one player. In this run each key was held for 12 emulated frames and released for three frames; the first RETURN was held for 15.
5. Wait through `NEXT LEVEL / EASY DOES IT`, disk access and the level introduction. The completed first level has a bitmap playfield, ladders, bombs and the status panel.
6. Turn warp off before measurements. Stop between instructions and save without ROMs, with disk state. `work/play-level01.vsf` is a saved state in first-level play; `reference/level01.png` shows it.

Saved states also include `work/title-attract.vsf` and `work/options.vsf`. A snapshot load must use the local VICE snapshot name, and the working disk must remain available. Input held through a load must be released explicitly.

## Loader and loaded files

`JUMPMAN` is a 1,024-byte program loaded at `$0800`; its BASIC line enters `$0811`. It draws the loading picture, opens `INTRO.SYS` on device 8, and calls KERNAL LOAD at `$08D7`. `INTRO.SYS` carries 32,768 bytes for `$2000`–`$9FFF`. The loader checks `$9FFF` and, on success, jumps from `$08FB` to `$2F03`. The hand-over snapshot `work/entry.vsf` stops at `$2F03`, before its first instruction. Its complete `$2000`–`$9FFF` region matches the file byte for byte. The resident listing uses that original image; self-modified operands are described in their comments. The already-executed boot loader at `$0800-$0BFF` differs from its disk file in exactly two bytes: destination high bytes `$082F` and `$0834` have changed from `$FF/$FF` to `$08/$DC` after its screen/color clearing loop. Executing the original loop reproduces both changes; the other 1,022 loader bytes match.

The disk contains 32 level files, `PLF01`–`PLF24`, `PLF2A`–`PLF2C`, and `PLF26`–`PLF30`. Each is 2,048 bytes loaded at `$3800`. These are overlays: one first-level snapshot cannot contain them all. For every file, a separate emulator snapshot stops at `$7514`, after the real loader has copied all 2,048 bytes into [$3000](source-plf01.html#3000)–[$37FF](source-plf01.html#37FF) and before drawing or initialization. Each active overlay was compared byte for byte with its disk file and matched. `SCORES` is 1,024 bytes loaded at `$2000`. File sizes, load addresses and chains were read from this same disk through the emulator; extracted files remain under `work/disk/`.

## Parts and capture route

The standard `parts/` layout records one resident/startup image and 32 level programs. Each level uses `over: resident` and owns $3000–$3FFF: the loader writes its file to $3800–$3FFF, then copies it to the active $3000–$37FF. Coverage counts the active copy once. The resident map owns everything outside that changing workspace. Its original five sprite slots at $3000–$313F are documented in the [resident facts](source-resident.html#facts), but are not counted again. This changes aggregate coverage from the earlier 90,583 bytes to 90,263, still 100% explained.

Reproduce each controlled level capture as follows:

1. Follow the ordinary first-level start above, with an execution breakpoint at $74DD. Save this stop as `work/level-loader-ready.vsf`; the filename is already prepared, before KERNAL LOAD.
2. Restore that stop and write the five ASCII filename bytes, `PLF` plus the two-character suffix below, to $40D0–$40D4. Remove the $74DD breakpoint. Set an execution breakpoint at $7514 and resume. This changes the requested file; it does not inject level bytes or establish a normal campaign route.
3. At $7514, compare all 2,048 active bytes at $3000–$37FF against that disk file. Save the native snapshot, without ROMs and with disk state, as the part's ignored `work/entry.vsf`.
4. Remove the $7514 breakpoint, stop at $759C and save the part's `work/play.vsf` and its screenshot. This permits the real drawing and private initialization to run, but stops before the life-start animation. Release held input and restore the loader-ready stop for the next file.

The resident `work/entry.vsf` is the $2F03 hand-over described above; its `work/play.vsf` is the first-level play capture. Each path in this paragraph is relative to its part folder. The original annotated native project is retained beside each part's captures as `work/entry.regen2000proj`. To regenerate a listing, replace `<id>` with the part folder name:

```sh
python3 kit/scripts/listing.py games/c64/jumpman/parts/<id> \
  games/c64/jumpman/parts/<id>/work/entry.vsf \
  --entry games/c64/jumpman/parts/<id>/work/entry.vsf
```

The layered Source view combines the original resident/startup listing with the selected pre-initialization level. It does not represent one frozen machine state. In all 32 native level entries, 244 bytes classified as resident code differ from the startup image: 224 are cleared boot-loader bytes, and 20 are operands changed by identifiable original stores/increments. Startup at [$9000](source-resident.html#9000) clears $0800–$0FFF; no level replaces the shared engine's opcodes outside that cleared loader. The listing tool reports these differences. Retaining the startup source preserves its original instructions and documents self-modification rather than treating those runtime changes as another program.

| Disk file | Part | Source |
| --- | --- | --- |
| `JUMPMAN`, `INTRO.SYS` | `resident` | [Resident engine and startup](source-resident.html) |
| `PLF01` | `plf01` | [01 · EASY DOES IT](source-plf01.html) |
| `PLF02` | `plf02` | [02 · ROBOTS I](source-plf02.html) |
| `PLF03` | `plf03` | [03 · BOMBS AWAY](source-plf03.html) |
| `PLF04` | `plf04` | [04 · JUMPING BLOCKS](source-plf04.html) |
| `PLF05` | `plf05` | [05 · VAMPIRE.](source-plf05.html) |
| `PLF06` | `plf06` | [06 · INVASION](source-plf06.html) |
| `PLF07` | `plf07` | [07 · GRAND PUZZLE I](source-plf07.html) |
| `PLF08` | `plf08` | [08 · BUILDER.](source-plf08.html) |
| `PLF09` | `plf09` | [09 · LOOK OUT BELOW](source-plf09.html) |
| `PLF10` | `plf10` | [10 · HOT FOOT](source-plf10.html) |
| `PLF11` | `plf11` | [11 · RUNAWAY.](source-plf11.html) |
| `PLF12` | `plf12` | [12 · ROBOTS II.](source-plf12.html) |
| `PLF13` | `plf13` | [13 · HAILSTONES](source-plf13.html) |
| `PLF14` | `plf14` | [14 · DRAGON SLAYER.](source-plf14.html) |
| `PLF15` | `plf15` | [15 · GRAND PUZZLE II.](source-plf15.html) |
| `PLF16` | `plf16` | [16 · RIDE AROUND.](source-plf16.html) |
| `PLF17` | `plf17` | [17 · THE ROOST.](source-plf17.html) |
| `PLF18` | `plf18` | [18 · ROLL ME OVER](source-plf18.html) |
| `PLF19` | `plf19` | [19 · LADDER CHALLENGE](source-plf19.html) |
| `PLF20` | `plf20` | [20 · FIGURIT.](source-plf20.html) |
| `PLF21` | `plf21` | [21 · JUMP-N-RUN](source-plf21.html) |
| `PLF22` | `plf22` | [22 · FREEZE](source-plf22.html) |
| `PLF23` | `plf23` | [23 · FOLLOW THE LEADER.](source-plf23.html) |
| `PLF24` | `plf24` | [24 · JUNGLE](source-plf24.html) |
| `PLF2A` | `plf2a` | [2A · MYSTERY MAZE](source-plf2a.html) |
| `PLF2B` | `plf2b` | [2B · MYSTERY MAZE](source-plf2b.html) |
| `PLF2C` | `plf2c` | [2C · MYSTERY MAZE](source-plf2c.html) |
| `PLF26` | `plf26` | [26 · GUNFIGHTER](source-plf26.html) |
| `PLF27` | `plf27` | [27 · ROBOTS III](source-plf27.html) |
| `PLF28` | `plf28` | [28 · NOW YOU SEE IT....](source-plf28.html) |
| `PLF29` | `plf29` | [29 · GOING DOWN ?](source-plf29.html) |
| `PLF30` | `plf30` | [30 · GRAND PUZZLE III](source-plf30.html) |

`SCORES` is a persistent copy of the $2000–$23FF score screen, represented in the resident part rather than counted as another program. All 35 extracted disk files are hash-identified in the private input manifest.

## First-level observations

- Processor port: `$00=$2F`, `$01=$37`; BASIC and KERNAL ROM and I/O are visible to the CPU.
- IRQ vector `$0314/$0315` is `$4100`. Reading that entry shows a handler that examines `$D019` and `$D011`; this is not the default KERNAL handler.
- BRK and NMI RAM vectors are `$FE66` and `$FE47`. Hardware vectors read through the CPU view are the KERNAL vectors.
- At the observed raster position, `$D011=$3B`, `$D018=$09`, `$DD00=$C1`: bitmap mode in VIC bank `$8000`, screen matrix `$8000`, bitmap `$A000`. This is a sampled band, not a claim that the whole frame uses one mode.

## Stable measurements and level captures

The earlier `play-level01` capture occurs near the end of spawn while the live divider still reads9. `work/stable-01.vsf`, saved after20 additional no-input frames, has completed that transition and is the baseline for input/control comparisons. Input tests always restore the same snapshot and release controls between cases.

Each `reference/level-xx.png` comes from that file's real native load and private initialization, stopped at `$759C` before the main life-start animation. These images demonstrate initialized scenery; they do not demonstrate successful play or completion. `reference/frame.png` is the exact gameplay frame paired with the reconstructed memory excerpt.
