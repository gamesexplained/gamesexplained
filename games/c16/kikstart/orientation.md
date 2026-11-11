# Kikstart — orientation

## The image

The contributor supplied `kikstart.prg`, 6,359 bytes including its load
address. SHA-256:
`a97f98269b2500f4ce551242895d3b08cf0471f3ad40da722b4a3a49b8bf004b`.
It loads at $1001. BASIC line 20 is `SYS 4109`, entering $100D.
The packed single-file release's provenance and packer are unknown.
No trainer menu appears on this route. The original loading cassette is
not supplied; `media.json` inventories this PRG alone.

## Tools

On Linux x86_64, Python 3.12.3 and g++ 13.3.0, plus4emu 1.2.11 at commit
939e652 with the kit's code-map patch, built without libsndfile, passed
all 46 checks as a PAL C16 and all 46 as a PAL Plus/4 on
11 November 2026. There were no failed-check workarounds. The footprint
check reported no unexpected files outside the repository.
regenerator2000 0.9.20 runs in the kit's corrected Plus/4 mode.

## From power-on to play

Start `python3 kit/scripts/tools.py plus4emu`, then use `connect` from
`kit/c16/plus4emu.py`, from the repository root:

1. Delete checkpoints, release inputs, and `reset(hard=True)`.
2. Advance 150 frames to BASIC. Call `program` with
   `games/c16/kikstart/work/kikstart.prg`.
3. Set an execution checkpoint at $2000, queue `RUN\n` with `type`, and
   run up to 300 frames. It stops before engine initialisation. This run
   stopped at cycle 7,894,909, frame 222.
4. Delete the checkpoint and save `work/entry.p4emu`, the canonical
   listing snapshot. PC=$2000, A/X/Y=$00/$00/$11, S=$F6, P=$37. Loaded
   title attributes and characters remain at $0800-$0FFF.
5. Advance 150 frames and save `work/title.p4emu`. This is attract mode,
   with a scrolling course.
6. Hold physical `T` for ten frames, release, and advance thirty frames.
   Save `work/play-round1.p4emu`; its screenshot shows the bike and five
   bikes remaining.
7. Advance another 140 frames and stop at $20D8 within three frames.
   Save `work/riding.p4emu`: state 2, speed $80, bike coordinate $4B,
   five bikes. Its screenshot is `reference/riding.png`.

Entry and play agree at every byte of $1000-$3FFF. Variables, queues,
and the runtime screen below $1000 differ. The loaded title remains in
the listing because it is authored data even though engine start clears it.

## Course selector

From attract mode hold 3 and 4 together for at least 100 game-loop
passes, then release. LEVEL appears. Use 3 for the previous course,
4 for the next, and T to start. Changes are sampled every eighth tick.
Course 1 wraps backwards to 16. This input-only route produced
`reference/selector-course16.png` and `reference/course16.png`; the
latter started with course index 15 and five bikes.

## Steady state

The analysis runs on a PAL C16 with 16 KB and ROMs paged in. Play vectors
at $0312-$0317 are $CE42,$2118,$F44C. $2118 is the game's raster handler,
installed by $2060/$2065. Engine entry $2000 is the second checked anchor.
The character/attribute planes are $0C00/$0800; the handler selects
character banks $1000 and $1800 and two horizontal-scroll values.

The engine, its graphics, tune, tables, and sixteen course starts are
resident together. No tape or disk is attached during play. This is one
part. The supplied PRG was also booted on the PAL Plus/4: its entry bytes
at $1000-$3FFF matched the C16, and it reached riding state 2 with five bikes. The terrain base pointer wraps at $3FD8, while its forty-column
window can read the loaded tail through $3FFF.

## File-to-memory mapping

| Supplied file | On-disk load | Captured result |
|---|---|---|
| kikstart.prg | $1001-$28D5, packed | Expands into the resident image; the observed hand-over is $2000. Entry/play equality at $1000-$3FFF establishes its stable engine and data. The title occupies $0800-$0FFF before engine start. |

Packed file bytes are not expected to match expanded memory in 16-byte
windows. Its observed BASIC entry and execution hand-over establish the
mapping. `media.json` marks the file as a packed part.

## The loader, in a paragraph

The BASIC stub enters $100D, runs its unpacking/copying code, writes the
resident image and title screen, and reaches $2000 with interrupts off.
Engine start resets the stack, replaces the title, installs the raster
handler, and enters attract mode. The unpacker is outside the engine's
annotation scope. Its format and the file's original distribution are unknown.
