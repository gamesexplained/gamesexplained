# Tools for the NES

Read `kit/INSTALL.md` first: the footprint principle and the launcher are
the same for every platform. This file is what the NES needs on top.
Only the capabilities matter; the named tools are the ones we recommend
because they are known to work. What an emulator has to be able to do,
phase by phase, is `kit/EMULATOR.md`.

| Need | Capability | Recommended tool |
|---|---|---|
| Emulator with an agent interface | put in a cartridge, run, stop on an instruction, read and write the CPU's memory, the PPU's memory and the sprite table, read the cartridge's every bank, count checkpoints without stopping, advance a frame, hold the controllers' buttons, save and load a snapshot, save the screen, log the APU's writes | jsnes 2.1.0 (https://github.com/bfirsh/jsnes), run inside the kit's own server, `kit/nes/jsnes_server.mjs` |
| A second emulator, for accuracy | the same capabilities, from an emulator the NESdev community keeps close to the console, to settle a question jsnes may get wrong | MesenCE 2.2.1 (https://github.com/nesdev-org/MesenCE), headless, inside the kit's `kit/nes/mesen_server.py` |
| A JavaScript runtime | run jsnes | Node, with npm |
| Disassembler with an agent interface | read the kit's snapshot, disassemble, label, comment, type data, export a symbol map | regenerator2000 0.9.20 from crates.io, in its NES mode: the C64's disassembler, installed once for every machine |

The kit's server holds jsnes's machine in a Node process and answers on a
local socket, one JSON object a line, in the BBC Micro's server's protocol;
`kit/nes/jsnes.py` is its client, and `kit/skills/nes/tool-jsnes` says how
to drive it. jsnes's own web page is not used.

MesenCE is the second emulator. `kit/nes/mesen_server.py` speaks the same
protocol on 127.0.0.1:6857, so `jsnes.py` drives it with `connect(port=6857)`
and every script written for jsnes runs on it. It starts Mesen's own program
in its headless test runner with `kit/nes/mesen_bridge.lua` inside, which
holds the machine between instructions and answers the server.
`kit/skills/nes/tool-mesen` says how it differs. jsnes stays the one a run
uses: it is small, starts with no cartridge, runs at 17 times real time
through its server against MesenCE's 2, and the kit's NES machine
(`kit/nes/machine.js`) is checked against it. Reach for MesenCE when a
result rests on the picture's or the sound's exact timing, where jsnes is
known to be wrong in places (`tool-jsnes`, "Traps"), or when the two
should be compared.

## What you need first

**Node and npm**, which the kit does not install. If the contributor has
no `node`, tell them, and let them decide whether to install it
(https://nodejs.org, the project's own installers; npm comes with it).
jsnes 2.1.0 names no Node version. Everything in this file was measured on
Node 24.18.0.

**Rust's `cargo`**, for the disassembler, as `kit/c64/INSTALL.md` says. A
clone that has run a C64 or a BBC Micro game has it already.

**SDL2, for MesenCE on macOS and Linux**, which the kit does not install:
MesenCE's release notes say it must be installed first. On macOS it comes
from Homebrew (`brew install sdl2`, the formula Homebrew builds from
libsdl.org's source, zlib licence), into `/opt/homebrew`, outside the
repository, so ask the contributor first and say so. Check before asking:
`sdl2-config --version` answers when it is there already, as it did on the
Mac below, where Homebrew had installed it for ffmpeg. A run that needs
only jsnes needs no SDL2.

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
| MesenCE 2.2.1, its GitHub release for Apple silicon, in `kit/nes/mesen_server.py`, Python 3.9.6, SDL2 2.32.10 | macOS 27.0.1, Apple silicon (arm64) | 26 October 2026 | 36 of 36, 23 to 24 s, three runs; `verify-footprint` clean |

| Phase | Passes | Fails | Workaround |
|---|---|---|---|
| 1 static inspection | all 64 KB in one call (1 ms), RAM's mirrors filled from the 2 KB, the registers at `$2000-$401F` read as 0 and flagged without touching the chips; the cartridge's PRG and CHR by their offset in the image, whichever bank is selected; the PPU's 16 KB and the sprite table; the registers and the cycle count; the PPU's control, mask and status, its scanline and dot, the palette, and both controllers by name; a snapshot read by `kit/nes/snapshot.py` matches the live machine; the last frame as a 256 by 240 PNG | | |
| 2 state management | a save from a second connection while a run is in progress; a load leaves the machine stopped at the saved state; a counting checkpoint goes on counting after a load; three loads give the same machine, from a stopped save, from a running one, and after a restart of the server; a load continues exactly as the machine that saved; warp: 600 frames, ten seconds of the machine's time, in 0.55 to 0.60 s, 17 to 18 times real time | | |
| 3 live measurement | counting checkpoints agree with the program's own counter (300 of 300); one on a routine nothing calls stays at zero; the NMI counted once a frame and the APU's frame interrupt once every 29,830 cycles; write and read checkpoints, a read-modify-write counted once; the cycle counter, 29,780.7 a frame against the 29,780.5 of an NTSC frame; every address an instruction started at, with its count, in one call; reads from a second connection while the machine runs; `stop` from a second connection | | |
| 4 frame stepping | a stopping checkpoint stops before its instruction runs, an interrupt handler's first instruction included; a button pressed while stopped is down at the program's next read of `$4016`; a step returns with the new PC; ten one-frame advances with Left held, one pass a frame, 3 ms a frame with its reads; the button released when the script says; a hundred runs back to back, about 1,000 calls a second; thirty stops from a second connection, each between two instructions; keep and go back in 34 ms a pair, a save and load through a file in 15 to 18 ms | | |

The table is jsnes's. MesenCE passed the same checks with these
differences in the figures: the whole 64 KB in 11 ms; warp at 2.0 to 2.1
times real time, since the bridge calls into Lua before every instruction;
the cycle counter at exactly 29,780.5 a frame; about 350 calls a second
for the hundred runs back to back; keep and go back in 0.7 ms a pair, a
save and load through a file in 13 ms.

Two of the jsnes checks pass because the server does what jsnes's own frame loop does
not, and the checks failed before it did: a write checkpoint once counted a
read-modify-write instruction twice, and the cycle counter ran two cycles a
frame fast on a program with one IRQ a frame. Both are in
`kit/skills/nes/tool-jsnes`, "Where the server differs from jsnes".

## Why jsnes, and MesenCE beside it

Three emulators were looked at on 17 October 2026, and jsnes was installed
and measured; MesenCE was added and measured on 26 October 2026, after a
maintainer asked about it on the platform's pull request.

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
- **MesenCE** is Mesen 2 as its community keeps it: the original
  repository (github.com/SourMesen/Mesen2) was archived around version
  2.1.1 in mid 2025 and points to github.com/nesdev-org/MesenCE, whose
  2.2.1 was released on 5 June 2026, GPL-3.0. It is known for accuracy:
  its release notes for 2.2.0 count AccuracyCoin tests it passes. It runs
  without a window (`--testRunner`, a Lua script and a cartridge), and its
  Lua reaches memory, every access, the CPU's registers, save states, the
  controllers and the screen, and can open a socket. What it costs is size
  and setup: 73 MB to download for Apple silicon and 104 MB installed,
  SDL2 on macOS and Linux, and a cartridge fixed for the life of its
  process. The first Mesen notes here read its 0.9.9 documentation, which
  did not say whether it ran without its window.
- **mesen2-oos** (github.com/scawful/mesen2-oos), a fork of Mesen 2 with a
  socket API and a headless mode, was looked at the same day and left
  aside: it is made for one SNES game's romhacking, has no releases, and
  says it puts instrumentation ahead of accuracy.

## Start, check, stop

```
python3 kit/scripts/tools.py --platform nes status
python3 kit/scripts/tools.py get-jsnes                             # install jsnes into tools/nes
python3 kit/scripts/tools.py jsnes                                 # no cartridge; waits on 127.0.0.1:6855
python3 kit/scripts/tools.py --platform nes check-emulator         # 36 named checks, about ten seconds
python3 kit/scripts/tools.py --platform nes stop                   # this clone's servers
python3 kit/scripts/tools.py --platform nes verify-footprint       # what it writes outside the repository
python3 kit/scripts/tools.py get-mesen                             # install MesenCE into tools/mesen
python3 kit/scripts/tools.py mesen                                 # the MesenCE server, on 127.0.0.1:6857
python3 kit/scripts/tools.py --platform nes check-emulator --emulator mesen     # the same 36 checks, about 25 seconds
python3 kit/scripts/tools.py --platform nes verify-footprint --emulator mesen
python3 kit/scripts/tools.py --platform nes stop mesen
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
| MesenCE 2.2.1, its GitHub release for this computer, with its settings beside the program | `tools/mesen/` | 104 MB on Apple silicon, after a 73 MB download |
| The MesenCE server's home directory, the cartridges sent to it as bytes, and its snapshots | `tools/mesen-home/` | small; a snapshot of the test cartridge measured 4 KB |
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

MesenCE is installed only when the contributor agrees to it, with what it
is said the same way: Mesen, by Sour, kept by the NESdev community as
MesenCE, open source under GPL-3.0. `get-mesen` downloads the project's own
release from GitHub for this computer, checks its SHA-256 against the one
GitHub published (in `kit/nes/tools.py`), unpacks it into `tools/mesen` and
deletes the download. It deletes the macOS bundle's debugging symbols
(`Mesen.dsym`, 290 MB), which serve only to read a crash report, and writes
Mesen's `settings.json` beside its program, which puts Mesen in its portable
mode: its settings, saves and the core library it unpacks on start stay
there. The settings let its Lua open files and a socket, raise its
one-second limit on a script's callback, plug in both controllers and set
the region to NTSC. A program fetched by a script carries no quarantine
flag on macOS, so Gatekeeper did not ask about the self-signed app. The
Mesen server sets `HOME` and the XDG folders to `tools/mesen-home` for
Mesen, as the jsnes server does for Node.

The launcher points `HOME` and the XDG folders at `tools/nes-home/` before
starting the server. Node and jsnes wrote nothing to a home directory when
measured, and this keeps a later release from doing so unnoticed.

**Uninstall:** delete the repository folder. Node, if it was installed for
this, is the only thing left outside it, with Rust if it was installed for
the disassembler (`kit/c64/INSTALL.md`) and SDL2 if it was installed for
MesenCE (`brew uninstall sdl2`).

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

MesenCE 2.2.1 on the same Mac on 26 October 2026, with the SDL2 2.32.10
Homebrew had installed for ffmpeg: after `get-mesen`,
`check-emulator --emulator mesen` passed 36 of 36
in each of three runs; `verify-footprint --emulator mesen` was clean.

## Untried systems

No run is recorded on Linux or Windows. jsnes is plain JavaScript with no
native code, so the install and the server should behave the same; run
`check-emulator` and `verify-footprint` there and write the section here,
as `kit/INSTALL.md` says. `get-mesen` knows MesenCE's releases for Linux on
x86-64 and ARM64 and for Windows, but nobody has unpacked them, so where it
looks for the program in them is a guess that the first run there checks. On Windows the launcher's pseudo-terminal
wrapper (`script`) does not exist, which every platform's launcher shares.
