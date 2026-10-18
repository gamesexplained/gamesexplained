# Tools for the NES

Read `kit/INSTALL.md` first: the footprint principle and the launcher are
the same for every platform. This file is what the NES needs on top.
Only the capabilities matter; the named tools are the ones we recommend
because they are known to work. What an emulator has to be able to do,
phase by phase, is `kit/EMULATOR.md`.

| Need | Capability | Recommended tool |
|---|---|---|
| Emulator with an agent interface | put in a cartridge, run, stop on an instruction, read and write the CPU's memory, the PPU's memory and the sprite table, read the cartridge's every bank, count checkpoints without stopping, advance a frame, hold the controllers' buttons, save and load a snapshot, save the screen, log the APU's writes | jsnes 2.1.0 (https://github.com/bfirsh/jsnes), run inside the kit's own server, `kit/nes/jsnes_server.mjs` |
| A JavaScript runtime | run jsnes | Node, with npm |
| Disassembler with an agent interface | read the kit's snapshot, disassemble, label, comment, type data, export a symbol map | regenerator2000 0.9.20 from crates.io, in its NES mode: the C64's disassembler, installed once for every machine |

The kit's server holds jsnes's machine in a Node process and answers on a
local socket, one JSON object a line, in the BBC Micro's server's protocol;
`kit/nes/jsnes.py` is its client, and `kit/skills/nes/tool-jsnes` says how
to drive it. jsnes's own web page is not used.

## What you need first

**Node and npm**, which the kit does not install. If the contributor has
no `node`, tell them, and let them decide whether to install it
(https://nodejs.org, the project's own installers; npm comes with it).
jsnes 2.1.0 names no Node version. Everything in this file was measured on
Node 24.18.0.

**Rust's `cargo`**, for the disassembler, as `kit/c64/INSTALL.md` says. A
clone that has run a C64 or a BBC Micro game has it already.

## Where the emulator stands, by phase

`python3 kit/scripts/tools.py --platform nes check-emulator` measures this
on whatever build answers, with a test cartridge of its own
(`kit/nes/check_emulator.py`: an NROM-128 board assembled from source and
sent to the server as bytes; no game, about ten seconds). It replaces the
cartridge in the machine, restarts the server once, for the check that a
new process gives the same machine, and leaves it running with the test
cartridge in, so run it before a game is put in or on a server of its own
(`--port`). It names every check, and
`kit/skills/nes/tool-jsnes/workarounds.md` says what to do about each one
that fails. Run it after installing, and again after a new release.

**Which build: 2.1.0, and only after measuring a newer one.** The kit's
server runs jsnes's frame loop itself and reaches inside its CPU, PPU, APU
and mapper objects, which a release can change, so `get-jsnes` installs the
version measured here. To move on, install the new version, run
`check-emulator`, and change `JSNES_VERSION` in `kit/nes/tools.py` and the
rows here together.

| Build | Machine | Measured | Checks passed |
|---|---|---|---|
| jsnes 2.1.0 from npm, in the kit's server, Node 24.18.0 | macOS 27.0.1, Apple silicon (arm64) | 17 and 18 October 2026 | 36 of 36, 7 to 8 s, four runs; `verify-footprint` clean |

| Phase | Passes | Fails | Workaround |
|---|---|---|---|
| 1 static inspection | all 64 KB in one call (1 ms), RAM's mirrors filled from the 2 KB, the registers at `$2000-$401F` read as 0 and flagged without touching the chips; the cartridge's PRG and CHR by their offset in the image, whichever bank is selected; the PPU's 16 KB and the sprite table; the registers and the cycle count; the PPU's control, mask and status, its scanline and dot, the palette, and both controllers by name; a snapshot read by `kit/nes/snapshot.py` matches the live machine; the last frame as a 256 by 240 PNG | | |
| 2 state management | a save from a second connection while a run is in progress; a load leaves the machine stopped at the saved state; a counting checkpoint goes on counting after a load; three loads give the same machine, from a stopped save, from a running one, and after a restart of the server; a load continues exactly as the machine that saved; warp: 600 frames, ten seconds of the machine's time, in 0.55 to 0.60 s, 17 to 18 times real time | | |
| 3 live measurement | counting checkpoints agree with the program's own counter (300 of 300); one on a routine nothing calls stays at zero; the NMI counted once a frame and the APU's frame interrupt once every 29,830 cycles; write and read checkpoints, a read-modify-write counted once; the cycle counter, 29,780.7 a frame against the 29,780.5 of an NTSC frame; every address an instruction started at, with its count, in one call; reads from a second connection while the machine runs; `stop` from a second connection | | |
| 4 frame stepping | a stopping checkpoint stops before its instruction runs, an interrupt handler's first instruction included; a button pressed while stopped is down at the program's next read of `$4016`; a step returns with the new PC; ten one-frame advances with Left held, one pass a frame, 3 ms a frame with its reads; the button released when the script says; a hundred runs back to back, about 1,000 calls a second; thirty stops from a second connection, each between two instructions; keep and go back in 34 ms a pair, a save and load through a file in 15 to 18 ms | | |

Two of these pass because the server does what jsnes's own frame loop does
not, and the checks failed before it did: a write checkpoint once counted a
read-modify-write instruction twice, and the cycle counter ran two cycles a
frame fast on a program with one IRQ a frame. Both are in
`kit/skills/nes/tool-jsnes`, "Where the server differs from jsnes".

## Why jsnes

Three emulators were looked at on 17 October 2026; only jsnes was installed
and measured.

- **jsnes** (Ben Firshman's, Apache-2.0) is plain JavaScript with no
  dependencies, needs no display or sound device, and its whole state is
  plain JSON, the CPU's 64 KB included, which Python reads with the
  standard library. Its frame loop is about fifty lines the kit's server
  runs itself, one instruction at a time, which is what makes its stops
  exact. Its source steps the PPU inside every bus access of the CPU, and
  cites the NESdev wiki for its NMI timing.
- **cynes** (MIT, 0.1.2 on PyPI) is a Python binding to an emulator in C++.
  Its page shows reading and writing memory, saving and loading state, and
  advancing frames with a controller state, and does not mention
  breakpoints or memory watches, which phases 3 and 4 need.
- **Mesen** has a debugger and a Lua API; its documentation (version
  0.9.9) does not say whether it runs without its window or how its save
  states are stored. It is the one to measure if jsnes and a game ever
  disagree about the hardware, as `kit/EMULATOR.md` says.

## Start, check, stop

```
python3 kit/scripts/tools.py --platform nes status
python3 kit/scripts/tools.py get-jsnes                             # install jsnes into tools/nes
python3 kit/scripts/tools.py jsnes                                 # no cartridge; waits on 127.0.0.1:6855
python3 kit/scripts/tools.py --platform nes check-emulator         # 36 named checks, about ten seconds
python3 kit/scripts/tools.py --platform nes stop                   # this clone's servers
python3 kit/scripts/tools.py --platform nes verify-footprint       # what it writes outside the repository
python3 kit/scripts/tools.py r2000 games/nes/<slug>/work/<state>.json.gz   # the disassembler, on a snapshot
KIT_JSNES_PORT=6856 python3 kit/nes/frame.py test                  # site/lib/nes.js against jsnes's picture
```

`frame.py test` changes the machine it runs on, so give it a server of its
own on another port, as its header says.

`jsnes` and `get-jsnes` are the NES's alone, so they need no `--platform`.
The server opens no window and makes no sound. `--port N` (or
`KIT_JSNES_PORT=N`) starts another machine beside the first; every command
takes it, `stop --port N` stops only that one, and `status` lists the ports
in use. A server started from another clone is never touched: `stop`
matches this clone's own server script.

## What goes where, and what is left behind

Tell the contributor this before installing anything:

| What | Where | Size |
|---|---|---|
| jsnes 2.1.0, from npm, one package with no dependencies | `tools/nes/` | 2 MB, 56 files |
| The server's home directory and the kit's scratch snapshots | `tools/nes-home/` | small; a snapshot of the test cartridge measured 70 KB |
| Logs | `tools/logs/` | small |
| regenerator2000 0.9.20, when no other platform has installed it, and Rust's `cargo` to build it | `tools/cargo/`, `tools/cargo-home/`, `tools/rustup/` | as `kit/c64/INSTALL.md` gives them |

What it is, and say so when you ask: jsnes is Ben Firshman's open-source NES
emulator, Apache-2.0, published on npm by its author. `get-jsnes` runs `npm
install` from the npm registry into `tools/nes`, with npm's cache pointed
into `tools/nes` and deleted afterwards. It took under a second on 17
October 2026. **No game comes with it**, and no ROM of the console's: the
NES has none. The contributor's cartridge image stays in the game's
`work/`, which is gitignored, and `check_binaries.py` refuses an iNES
image anywhere else.

The launcher points `HOME` and the XDG folders at `tools/nes-home/` before
starting the server. Node and jsnes wrote nothing to a home directory when
measured, and this keeps a later release from doing so unnoticed.

**Uninstall:** delete the repository folder. Node, if it was installed for
this, is the only thing left outside it, with Rust if it was installed for
the disassembler (`kit/c64/INSTALL.md`).

## macOS

Run on macOS 27.0.1 on Apple silicon (arm64), Node 24.18.0 from Homebrew,
on 17 and 18 October 2026, with jsnes 2.1.0 from npm: `check-emulator`
passed 36 of 36 in each of four runs on the first server, and in each of
three runs on 18 October after the last change to it (the full-frame
picture), and `verify-footprint` was clean after that change, with nothing
written outside the repository either by the server or by `get-jsnes`'s
install. `frame.py test` passed its four cases the same day, with the four
differences in jsnes's picture its header gives left out. The disassembler
was the regenerator2000 0.9.20 a C64 run had installed in `tools/cargo/`.

## Untried systems

No run is recorded on Linux or Windows. jsnes is plain JavaScript with no
native code, so the install and the server should behave the same; run
`check-emulator` and `verify-footprint` there and write the section here,
as `kit/INSTALL.md` says. On Windows the launcher's pseudo-terminal
wrapper (`script`) does not exist, which every platform's launcher shares.
