# Stop the Express — orientation

## The image

The contributor supplied `stop_the_express.prg`, 26,182 bytes including
its two-byte load address, $1001. SHA-256:
`509c033d986aabe0cb6ff2b42a3d450f6bed7426528e7647060a96205aeb1669`.
The BASIC line is `2021 SYS4109`. The game's scroller credits the original
to Itasan and the Plus/4 conversion to Csabo, 2021. No trainer was selected.
This is the 64 KB Plus/4 conversion, not a program for an unexpanded C16.

## From power-on to play

Use the kit's plus4emu server as a PAL Plus/4 (`--model plus4pal`). This
run uses port 7504, leaving other checkouts' emulators alone. Its client
is `kit/c16/plus4emu.py`; paths below are relative to the repository.

1. Delete checkpoints, release all inputs, hard-reset, and advance 150 frames.
2. Load the contributor's PRG with `program`, queue `RUN\n`, and run until
   PC reaches $1011, allowing 100 frames. The initial SYS target is $100D.
3. Continue until $01B3, allowing 1,000 frames. This is the unpacker's
   completion loop, whose jump is changed by the title interrupt. Save
   `work/title-ready.p4emu` if the illustrated loading title is wanted.
4. Hold Space and run until $1E00, allowing 500 frames. Release all keys
   at this exact stop and save `work/entry.p4emu`. This is the final
   hand-over into the game, and the snapshot used to build the listing.
5. Advance 180 frames without inputs for the game's roof-side attract
   display and control scroller (`work/menu.p4emu`). Hold Space for ten
   frames, release it, and advance 180 frames to reach the roof stage
   (`work/play-roof.p4emu`).

The run's local reproduction script is `work/orient_final.py`. The program
file and every snapshot remain in ignored `work/`; the committed listing
is always made by `kit/scripts/listing.py` from the entry snapshot.

## Steady state

The ROMs are paged out at the hand-over and in play (`chips.rom` is false).
The game has its own RAM IRQ vector at $FFFE: $1F0A for music and $1F27
for the shorter handler. $0314 retains the system's $CE0E vector but is
not the active interrupt vector with ROMs paged out. The entry and vector
targets were checked against live disassembly. $1EAA and $1ED0 switch
between the game's handlers.

TED draws 256-character text from a generated character set at $0800,
with colour attributes at $D800 and screen characters at $DC00.
$1000-$13FF is the game's working character screen. Code begins at
$1E00; the music driver has entries at $9D32, $9D35 and $9D38. Shape and
train data also occupy RAM above $3FFF. Those ranges are declared under
`coverage.include` as they are attributed.

The supplied medium is one PRG and loading it reads no disk or tape.
The media ledger has one item. There are no independently loaded parts
in this supplied version.

## The loader, in a paragraph

The SYS stub enters an optional DigiMuz detection/setup program, builds
the illustrated loading picture, and installs title code at $F000. It
then returns to the unpacker at $1011. The unpacker runs from the stack
page while the title interrupt handles the picture and music. When
unpacking and the title transitions finish, Space or joystick fire
releases the wait and the title path jumps to $1E00. The loading picture,
calibration and unpacker are described as the loader, rather than
annotated instruction by instruction. The illustrated title is saved as
`reference/boot-title.png`.

## Tool checks

On 11 November 2026, plus4emu 1.2.11 (git 939e652), compiled with the kit's
code-map patch and without libsndfile, passed all 46 emulator checks on
both the PAL C16 and PAL Plus/4. The Plus/4 check took 191 seconds on this
host. No workaround was needed. A complete launch/use/exit footprint
check found no unexpected files outside this repository. regenerator2000
0.9.20 runs on port 3039 and answers the kit's client and symbol exporter.
