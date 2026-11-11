# Tools for the Game & Watch

Read `kit/INSTALL.md` first: the footprint principle and the launcher are
the same for every platform. This file is what the Game & Watch needs on
top. Only the capabilities matter; the named tools are the ones we
recommend because they are known to work. What an emulator has to be able
to do, phase by phase, is `kit/EMULATOR.md`.

| Need | Capability | Recommended tool |
|---|---|---|
| Emulator with an agent interface | load a ROM, run, stop on an instruction, read and write the data memory, count checkpoints without stopping, step, hold the buttons, save and load a snapshot, give the lit segments | the kit's own Sharp SM5A, `kit/gnw/sm5a.js`, inside the kit's server, `kit/gnw/gnw_server.mjs` |
| A second emulator, for accuracy and to play | the same chip from people who decapped it, with the screen and the sound, scriptable | MAME 0.289 (https://github.com/mamedev/mame), built from source with only its Game & Watch driver |
| A JavaScript runtime | run the server | Node |
| A C++ compiler | build MAME | Xcode's command line tools on macOS |
| Disassembler | none knows the SM5A: the kit's own, `kit/cpu/sm5a.py`, and a control file the agent writes (`kit/skills/gnw/steps`, "disassembler") | |

## Why the kit's own machine, and MAME beside it

On 8 November 2026 MAME was the only emulator of the Game & Watch's chips
that a script can drive; its Lua scripting reaches the debugger, the
inputs and the memory, but it has no socket a client can call between
two instructions, and a script inside it runs only on its own callbacks.
The chip is small, 50 instructions and no interrupt, so the
kit models it, `kit/gnw/sm5a.js`, after MAME's source, and holds the
model to MAME instruction by instruction: `kit/gnw/check_machine.js`
runs 64 seeded random programs in both, with the buttons pressed at the
same cycles, and compares A, BL, BM, C and the program counter before
every instruction and the data memory at the end. All 64 agreed on 8
November 2026, 636,142 instructions, every opcode among them;
`kit/gnw/test_machine.js` holds the model to that record in CI, with no
MAME. Before that, on the same day, the model and MAME agreed on all
176,589 instructions of eleven seconds of a game with its buttons
pressed. The page's Play tab runs the same file.

MAME is the second machine: the one the model is held to, and the one to
play a game on with its screen and its sound (`kit/skills/gnw/tool-mame`).

## What you need first

**Node.** If the contributor has
no `node`, tell them, and let them choose: their own install
(https://nodejs.org, the project's own installers; npm comes with it), or
`python3 kit/scripts/tools.py get-node`, which keeps Node inside `tools/`
(`kit/INSTALL.md`, "Node for a machine without it").
Measured on Node 24.18.0.

**A C++ compiler and Python 3**, for MAME's build: on macOS, Xcode's
command line tools (`xcode-select --install`, Apple's own, outside the
repository: ask first). Measured with Apple clang 21.0.0 and Python 3.9.6.
A run that never needs MAME, because the model is enough for the step at
hand, needs neither; the platform's tests need neither.

**On Linux, SDL3's development package**, which MAME links against and
which the kit does not install there (on macOS the kit keeps SDL3's own
framework in `tools/`). It is outside the repository: ask first.

## Where the emulator stands, by phase

`python3 kit/scripts/tools.py --platform gnw check-emulator` measures this
with a test program of its own (`kit/gnw/check_emulator.py`, assembled by
`kit/gnw/asm.py`: a loop that reads the buttons and counts its passes and
the seconds; no game, about two seconds). It starts its own server on
port 6898. On 8 November 2026 it passed all nine:

| Phase | Check | Result |
|---|---|---|
| 1 | the data memory read through the server and out of the snapshot match | pass |
| 1 | every register by name | pass |
| 2 | a counting checkpoint counts on after a load | pass |
| 2 | the stop after an ignore count of 100 is the same after a load, another, and a restart of the server | pass |
| 3 | a checkpoint on the loop counts, one on code that never runs stays at 0 | pass |
| 3 | the 1 Hz flag gives a second a second | pass |
| 3 | a call during a run is answered, and `stop` ends the run | pass |
| 4 | a stop is exact, a button pressed while stopped is seen at once, each pass moves one step | pass |
| 4 | ten steps with a button in under a second | pass, 4 ms |

## Start, check, stop

```
python3 kit/scripts/tools.py --platform gnw gnw              # the server, on 127.0.0.1:6858
python3 kit/scripts/tools.py --platform gnw status
python3 kit/scripts/tools.py --platform gnw check-emulator
python3 kit/scripts/tools.py --platform gnw stop
python3 kit/scripts/tools.py --platform gnw get-mame         # MAME, once
python3 kit/scripts/tools.py --platform gnw mame games/gnw/<slug>/work/<set>.zip
node kit/gnw/check_machine.js                                # the model against MAME
```

## What goes where, and what is left behind

Tell the contributor this before installing anything:

| What | Where | Size |
|---|---|---|
| MAME 0.289's source, downloaded as GitHub's archive of the tag `mame0289` | `tools/downloads/mame0289.tar.gz` | 213 MB |
| MAME, unpacked and built with only the Game & Watch driver; the program is `gnw` | `tools/gnw/mame-src/` | 1.3 GB with the build's objects; the program 73 MB |
| SDL3 3.4.18's disk image, from its GitHub release (macOS only) | `tools/downloads/SDL3-3.4.18.dmg` | 28.5 MB |
| SDL3's macOS framework, copied out of the disk image, with its licence | `tools/gnw/Frameworks/` | 8.6 MB |
| MAME's working folder: its `cfg/`, `nvram/` and `snap/` | `tools/gnw/home/` | small |
| The server's home directory and snapshots | `tools/gnw-home/` | small; a snapshot is about 3 KB |
| Logs, MAME's build log among them | `tools/logs/` | small |

What it is, and say so when you ask: MAME is the MAME team's open-source
emulator of many machines, GPL-2.0-or-later as a whole (its SM5xx and
Game & Watch code, by hap, is BSD-3-Clause), from its own repository on
GitHub. SDL3 is Sam Lantinga's and the SDL contributors' library, zlib
licence, from its own GitHub releases. `get-mame` downloads both, checks
each against the SHA-256 in `kit/gnw/tools.py`, unpacks them into
`tools/gnw` and builds MAME with `make SUBTARGET=gnw
SOURCES=src/mame/handheld/hh_sm510.cpp`, the build's `HOME` pointed into
`tools/gnw/home`. The macOS disk image is mounted read-only inside
`tools/gnw` while the framework is copied out, and unmounted. mamedev.org
publishes no macOS build, and the macOS builds others publish need SDL3
installed in `/Library/Frameworks`, so the kit builds its own.

**No game comes with it.** A Game & Watch's program is inside its chip;
MAME's ROM set for a unit is a zip of that program, read out of a
decapped chip, and an SVG of its screen. The contributor's set stays in
the game's `work/`, which is gitignored, and `check_binaries.py` refuses
an SM5A's ROM (1,856 bytes, not text) and the kit's snapshot anywhere
else.

MAME runs from `tools/gnw/home`, with `HOME` and the XDG folders pointed
there, so its files land inside the repository.

**Uninstall:** delete the repository folder. Node and Xcode's command line
tools, if they were installed for this, are the only things left outside
it, and SDL3's development package on Linux.

## macOS

Run on macOS 27.0.1 on an Apple M4 Mac mini (arm64, ten cores), Node
24.18.0, Apple clang 21.0.0, on 8 November 2026. MAME's Game & Watch
driver built in two minutes (21:29:26 to 21:31:24 by its log).
`check-emulator` passed nine of nine; `check_machine.js` found the model
and MAME in agreement on all 64 programs; `verify-footprint` was clean,
for the server and for MAME, with nothing written outside the
repository. A unit's ROM set made for an older MAME ran with a warning
that its SVG is not the revision 0.289 expects; its program matched
MAME's checksum.

## Untried systems

No run is recorded on Linux or Windows. The server is plain JavaScript;
MAME's build on Linux needs SDL3's development package, and `get-mame`
then runs `make` without the macOS framework. Run `check-emulator`,
`check_machine.js` and `verify-footprint` there and write the section
here, as `kit/INSTALL.md` says.
