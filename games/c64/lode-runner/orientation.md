# Lode Runner — orientation

## Analysed image

The canonical image is the supplied **Lode Runner (Black Label).g64**, SHA-256 `7b42d319e107bc4228da582eec12dfc62b68b1b6869c51e56299ed735293919f`. Its directory contains LR (3 blocks), DB (12), and IT (89). IT loads 22,528 payload bytes at $6000–$B7FF. DB loads 2,815 bytes at $1400–$1EFE. The resident `engine` part includes all 25,343 bytes of those two payloads. The 150 board sectors are independent room loads, with one standard overlay part per board.

| Part | Original source | Authored bytes |
|---|---|---:|
| Resident engine | IT and DB, behind one initial load | 25,343 |
| Rooms 1–150 | One sector each, tracks 3–12 | 255 each |

The supplied files remain private in `work/`. No disk, cartridge, emulator snapshot, ROM, or disassembler project is part of the contribution.

## From power-on to the listing

1. Start VICE through `python3 kit/scripts/tools.py --platform c64 vice`. This run used vice-mcp v3.13.2, PAL C64SC, 6581 SID, and true-drive emulation. All 57 emulator qualification checks passed.
2. Hard-reset. Arm an execution checkpoint at $6000, then autostart the Black Label G64. Allow the original loader to finish its disk reads; its screen warns that loading can take about 1.5 minutes. The checkpoint must report PC=$6000 before the first engine instruction.
3. Save `work/black-entry.vsf` with disk state included and ROMs omitted. This is the canonical listing image. Its entire IT and DB payloads compare byte-for-byte with read-only extraction from the original disk.
4. Delete the checkpoint and run through initialization and the original disk probe. Wait for the complete LODE RUNNER logo, rather than saving the temporary blank loading display. This run saved `work/black-title-ready.vsf` and `reference/black-title.png`.
5. Press port-2 fire to start. Allow the first board's disk read and reveal to finish. The runner flashes while waiting for input; moving right starts the main loop. `work/play-round1.vsf` holds room-one play after a short rightward movement, with inputs released. `reference/black-playing.png` shows this state.
6. Start regenerator2000 through the launcher with `work/black-entry.vsf`. Import the committed symbols if recreating the project. Seed engine $6000, IRQ $648A, NMI $65CF, and the explicitly resolved editor/control/guard RTS targets. Inline strings and sound events must remain data.
7. Export symbols, then build: `python3 kit/scripts/listing.py games/c64/lode-runner/parts/engine games/c64/lode-runner/parts/engine/work/entry.vsf`.

Tool ports in this run were VICE 6512 and disassembler 3003; other local instances occupied the default ports. The launcher records the chosen ports under `tools/`.

## Steady state

In the captured play state, $01 is $36. Its low three banking bits are %110: BASIC is out, KERNAL and I/O remain visible. The IRQ vector at $0314 is $648A, which chains to KERNAL $EA31. The NMI vector at $0318 is $65CF, a single RTI. Engine code and authored tables remain at $6000–$B7FF; room sectors are loaded into $1000. High scores use $1100. The display bitmap is $2000; the preserved work bitmap is $4000. Startup generates their row lookup tables and the actor sprite buffers.

The Source listing contains hand-over bytes. Separate entry/play comparisons identify live self-modification and generated state; the private play snapshot supplies runtime tests and the captured frame. The title RLE is present at hand-over; the expanded bitmap is generated output. Retained copies, assembler records, lookup pages, music streams, and embedded demonstration sectors remain in the coverage denominator.

## Other supplied copies

The Gray Label image boots natively. Its DB payload is identical, and its IT differs in ten bytes: the entry selects $8E32 rather than $8E11, earlier probe result bytes are supplied in advance, and one probe comparison byte changes. The Yellow Label image also boots natively and reaches the same room-one/room-two attract screens; its IT differs from Black in 275 bytes, including startup. The 150 room sectors compare identically across the three disks; their score sector differs.

The supplied CRT is labelled **Official Cartridge Image**. It is a generic 16 KB cartridge with a CBM80 header and entry $8009. It boots natively and shows a separate cartridge engine, with routines at different addresses from the disk engine. The disk listing must not be used as its disassembly. Its 17-board directory and selected engine differences are independently verified in `facts.md`; complete cartridge controls/editor comparison remains open.

## Loader boundary

LR is the original BASIC/machine-code loader; it loads DB and IT before the engine hand-over. The Yellow disk has additional loader/protection files. Loader internals and disk-protection implementation outside IT are outside this engine analysis. The disk probe inside IT is annotated. Read-only `c1541` extraction and all editor-write experiments use private working copies, preserving the supplied originals.

## Native room loading and standard parts

LR loads DB and IT before one engine hand-over, so these two files form the resident `engine` part. They are not independent phases. Every authored disk board then loads independently into $1000–$10FF and is represented by `room-001` through `room-150`, each `over: engine`. Each part's `ranges` records the actual 256-byte write range; its authored ledger counts the 255 retained sector-source bytes at $1000–$10FE. The extra final CHRIN result at $10FF is $0D in every capture and remains excluded. The aggregate denominator is 63,593 bytes. High-score sector transfers are mutable player records, not authored level parts. The separate cartridge is an alternative edition, not a later disk load.

To reproduce a room capture, restore the native room-one play snapshot with disk state. Release inputs and checkpoints. Set physical index $1310 to room minus one, displayed level $1305 to room, disk mode $1306 to two, and joystick input selector $130F to $CA. Enter the original new-game routine at $605E. This is a forced selection route, not ordinary progress through preceding boards. Arm execution checkpoints at $6FE5 (after original sector read, before unpacking) and $611C (after native room setup, before the first loop instruction); non-stopping checkpoints at reader $71F5 and stores $1000–$10FF measure one reader execution and 256 stores. Hold port-two Right to finish the original start-input wait, then release it at $611C. Save each part's real entry/play snapshots with disk state included and ROMs omitted.

The first captured boards use the animated reveal. Subsequent captures set the existing Ctrl-Z reveal option $1321 to zero and use the original direct-copy path at $7393, avoiding the iris animation. Warp mode affects host execution speed. Neither change substitutes extracted cells or bypasses the original disk read, decode, render or actor extraction. Each capture's exact option and native RAM are retained privately.

The original reader discards raw byte zero. Compare each entry snapshot's $1000–$10FE against raw sector offsets 1–255 at track `3 + floor(index/16)`, sector `index mod 16`. Build its listing from that native snapshot, rather than a PRG constructed from sector extraction. Recreate the private project with `symbols_import.py` on the part folder; export with `symbols_export.py --project`; run `listing.py` on the same folder and snapshot. The room decoder consumes $1000–$10DF only, low nibble first. Retained tail bytes stay annotated and counted.

The room snapshots retain the engine's runtime self-modified operands. The engine listing retains its verified initial hand-over bytes. These are runtime changes within the resident program, not code loaded by the room sector. Source overlays combine those original engine bytes with the selected room's independently verified authored data.
