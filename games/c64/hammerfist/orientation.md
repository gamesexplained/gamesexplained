# Hammerfist: orientation

## Image and tools

The Fairlight release from https://csdb.dk/release/?id=28464 contains
`HammerfistA.d64` and `HammerfistB.d64`. Both are 174,848-byte sector
images; the disk reader reports 683 sectors, no bad checksums and no
allocated sectors outside files. The archive and images stay in `work/`.
Side A contains `HAMMERFIST! /FLT`; side B contains `LD` and
`1-HAMMERFIST` through `4-HAMMERFIST`. `media.json` records their hashes.

The run uses the installed headless VICE v 3.14.0 build through the kit
launcher, with dummy audio, as the contributor requested. The launcher
identifies its source as `github.com/64kramsystem/gamesexplained`, branch
`game/c64/count-duckula`, commit `cfc184e9`. The disassembler is
regenerator2000 0.9.20. The machine is PAL, VIC 6569 and SID 6581.

On 14 November 2026, two emulator checks each passed 56 checks and failed
`keys-host` and `no-exception`. Host F1 did not arrive; keyboard matrix
F1 did. The second failure was a missing `checkpoints` key in the
checkpoint-list reply during the server-quirks phase. Stop, single-step,
load/store watchpoints, frame advance, instruction-boundary pause and
snapshot determinism checks passed. The failing phase's remaining monitor
quirks were not measured by that check. Use matrix input and inspect
checkpoint replies before relying on them.

## From power-on to play

1. Start VICE with `python3 kit/scripts/tools.py vice`. Autostart side A
   through `vice_autostart`, using its absolute `path`.
2. The Fairlight introduction appears. Hold SPACE through
   `vice_keyboard_matrix` to leave it, then release SPACE. No trainer
   options were selected. The following portrait screen waits at
   `$2AD3`: `LDA $DC00 / AND #$10 / BNE $2AD3`.
3. Attach side B as unit 8 and press joystick-port-2 fire. The boot code
   loads `LD`, then streams `1-HAMMERFIST`. Autostart can turn warp off
   after its own file finishes, so enable warp again for this serial
   load. Release fire once the portrait wait has ended.
4. Stop at `$2800`, the target of LD's hand-over jump at `$2A70`, before
   the game's first instruction. Save without ROMs. This is
   `parts/complex-7/work/entry.vsf`; the shared part's `work/entry.vsf`
   holds the same capture. The processor port reads `$37` at this stop.
5. Run startup. Its jump at `$296B` enters `$64FE`, then the high-score
   and credit sequence. Release and press port-2 fire again after that
   sequence has started; a held input can have its press edge consumed
   by the earlier title wait. Gameplay begins in Complex 7. A stopping
   checkpoint at `$6580` catches room entry. `reference/play-start.png`
   shows the first room. Turn warp off before measuring time.

The listing uses the hand-over image: startup at `$2800-$296D` is
overwritten by sprite-cache graphics during play. The play snapshot is
the comparison image, rather than the source of those lost startup bytes.

## Interrupts and banking

Startup installs hardware IRQ `$196A` at `$FFFE/$FFFF`, NMI `$339E`
at `$FFFA/$FFFB`, and an interrupt-body pointer at `$0028/$0029`.
`$196A` saves A and the processor port, makes I/O visible and jumps
through that pointer. The common exit at `$1975` schedules the next
body and raster line and restores the saved state. The first load's
bodies include `$66F7`, `$686D` and `$7CD7`; the frame capture records
their display changes. The KERNAL RAM vectors at `$0314` are actor
workspace during play and do not identify this game's IRQ.

The CPU switches between I/O-visible and all-RAM configurations. A live
sample in the drawing code read `$00=$2F`, `$01=$34`; instructions in
the interrupt bank I/O in before accessing the chips. Use the `ram` bank
for data beneath I/O and ROMs, and the `io` bank for chip registers.

## Reaching the other loads

The numbered files are replacements above shared low-memory routines,
with a small jump at `$3200` choosing each replacement's entry. To avoid
a full playthrough, this run used the game's load trampoline at `$339F`.
From the first load's stopped room-entry state, set the processor port
to `$35`, SP to `$FF`, A to the requested ASCII digit (`$32`, `$33`,
`$34`) and PC to `$339F`. Stop at `$3200` after each load and save
without ROMs. The trampoline loads LD and the original unpacker writes
the replacement. These are forced load routes, not evidence that a
normal playthrough reaches an ending.

For this capture, the loads were chained in one process from a fresh
boot. The port matters: `$33D8` masks CIA interrupts before its own
bank-switch instruction, so entering that loader with I/O hidden does
not reproduce the game's transition precondition. Earlier attempts from
arbitrary restored drawing states stalled in the KERNAL serial reader;
they are not the source of any listing.

| Load | Hand-over | Jump at $3200 | Opening picture |
|---|---|---|---|
| 1 | `$2800` | `$64E1` | Complex 7 |
| 2 | `$3200` | `$5F15` | Docking area |
| 3 | `$3200` | `$61B7` | Rocky landscape |
| 4 | `$3200` | `$6671` | Industrial shoreline |

The part folders hold each hand-over as `work/entry.vsf` and a gameplay
capture as `work/play.vsf`. The later gameplay captures were made by
loading those hand-overs, advancing 200 frames, pressing fire for 50,
releasing for 20, pressing for 50, releasing and advancing 100. No disk
load was attempted from a restored later gameplay state.

## What the files write

The file headers are part of the packed stream: LD opens a file as a
serial stream, so its nominal PRG load address is read as the first two
bytes of the unpacker's five-byte header. Stripping those bytes before
unpacking produces a different image.

The original unpacker was run in the kit's CPU simulator with the file
bytes supplied at its KERNAL serial-input call. Every payload byte it
wrote matched the live hand-over snapshot. Stack, zero-page scratch and
the unpacker's modified operand are separate from these payload ranges.

| File | Payload ranges | Bytes checked against live snapshot |
|---|---|---:|
| 1-HAMMERFIST | `$0400-$29FF`, `$3200-$FFF9` | 62,458 |
| 2-HAMMERFIST | `$0800-$0FFF`, `$3200-$3202`, `$348F-$FFF9` | 54,126 |
| 3-HAMMERFIST | `$0800-$0FFF`, `$3200-$3202`, `$348F-$FFF9` | 54,126 |
| 4-HAMMERFIST | `$0800-$0FFF`, `$3200-$3202`, `$339F-$FFF9` | 54,366 |

The common low-memory code and the identical score-display and sound
blocks belong to `resident`. Complex 7 owns the first replacement and
the load trampoline that the next two parts retain. The fourth load
replaces that trampoline too. Exact equality across all four unpacked
payloads establishes the shared blocks at `$3203-$339E`, `$FBA2-$FBEF`
and `$FC0C-$FFF9`; their consumers still determine their descriptions.
