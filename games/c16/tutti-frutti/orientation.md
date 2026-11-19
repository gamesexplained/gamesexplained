# Tutti Frutti — orientation

## Image

The contributor supplied `tutti_frutti.prg`, a 7,340-byte Commodore program file.
SHA-256 `7f1d9a55bd78a4a7f2d5332f864809ea4a3c858cb7af52527170513b073721e7`.
Its header is `01 10`, so the 7,338 payload bytes load at $1001–$2CAA.
The first tokenized line is `311 SYS 4109`, which enters the packer's
machine code at $100D. The Mastertronic publisher screen and Shaun
Southern credit appear on boot. The precise release provenance is open.

## Rebuild the snapshots

On Linux x86_64 with Python 3.12.3, plus4emu 1.2.11 at git 939e652 passed
46 checks as a PAL C16 and 46 as a PAL Plus/4. The launcher footprint
check found no writes outside the clone. The library was built without
libsndfile. The disassembler answered as regenerator2000 0.9.20 in
Commodore Plus4 mode.

Start `python3 kit/scripts/tools.py plus4emu` and connect through
`kit/c16/plus4emu.py`. If the default port belongs to another clone, use
`--port` and pass the same port to `connect`.

1. Clear checkpoints and held inputs, power-cycle, then advance 150
   frames. Use `program` on `work/tutti_frutti.prg` and type `RUN\n`.
2. Run until $1500. This is the SYS stub reached by the unpacked BASIC
   publisher program. Save `work/publisher-entry.p4emu` if comparing
   the two loading stages. Advance 310 frames and capture the
   Mastertronic screen as `work/publisher-screen.p4emu`.
3. Hold Space and run until $2000, then release Space. Save
   `work/entry.p4emu` before executing the instruction at $2000. This
   is the resident game's hand-over and the source for the listing.
4. Advance 140 frames to the title with the fruit border, then hold fire
   on plus4emu joystick 1 for 55 frames. Release it and advance 105
   frames. The strawberry is in orchard 1 and the READY panel has gone.
   Save `work/play-round1.p4emu`. The same route on `--model plus4pal`
   gives identical $1000–$3FFF bytes at hand-over and an identical first
   orchard image.

## Steady state

The engine keeps the KERNAL ROM mapped. It replaces the IRQ pointer at
$0314–$0315 from $CE0E to $20A0. The ROM CPU IRQ vector remains $FCB3.
The handler at $20A0 tests and acknowledges the raster source at $FF09.
After startup's compare line 224, the handler requests line 200 at
$20B9. The foreground loops at $2080–$2085.

TED reads attributes at $0800, characters at $0C00, and character
patterns at $3800. The engine uses 256-character multicolour text.
Every byte at $1000–$3FFF agrees between the hand-over and the first
orchard. The packed maps stay resident at $3500–$379F and each round
copies one into the 96-byte working board at $0600. This PRG needs
one load.

## Packed stages and media

| Supplied item | Direct load | At the publisher screen | In the resident game |
|---|---|---|---|
| `tutti_frutti.prg` | $1001–$2CAA | Several stretches of the relocated compressed stream still match the PRG in 16-byte windows. The largest common alignment gives 208 matching windows. | The packed form has been replaced by the engine and its data. Only 49 of 7,338 bytes at the original load address match by position. |

The first SYS copies a small unpacker to low RAM and expands a BASIC
publisher program, a character set at $2000 and the second compressed
payload. BASIC prints the title and rotates one glyph through its call
at $1A50. Space or the end of the wait reaches BASIC line 250's
`SYS 9256`. That second unpack reuses RAM and leaves the engine at
$2000, which BASIC can also start directly on a subsequent RUN. The
publisher screen is preserved as a reference image because the engine
overwrites its glyphs and animation code.

`media.json` answers the single PRG as packed into the listed game.
The startup routines that exist only before the hand-over are described
here. The analysis follows the resident engine from $2000.
