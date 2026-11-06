# Tools for SCUMM

Read `kit/INSTALL.md` first: the footprint principle is the same here.
SCUMM is not a platform. It is the system Lucasfilm Games wrote its
adventures in: each game is scripts in SCUMM's own bytecode, with rooms,
costumes and sounds, and every machine the games were sold for ran them
through an interpreter of its own. The scripts run the same under any
faithful interpreter, whatever the platform. The platform's kit explains
the machine's interpreter; this one reads the game's resources and
checks the scripts, for every platform, and needs no `--platform`. How
to use it is `kit/skills/cpu/scumm`.

| Need | Capability | Recommended tool |
|---|---|---|
| An interpreter that traces | run a game from a file of clicks and keys, the same each run, and write every instruction it runs with the script it is in, its parameters and where the script went on | ScummVM 2026.4.0 (https://www.scummvm.org), its SCUMM engine alone, built from its release with the kit's trace, `kit/scumm/scummvm_kit.cpp` |
| A reader and a decoder | the game's index, rooms, objects and scripts from its disks, and SCUMM versions 1 and 2's instructions | the kit's own `kit/scumm/game.py` and `scode.py`, Python alone |

ScummVM was chosen because it runs every SCUMM game on every machine
they were sold for from the game's own files, with nothing beyond
standard C++, and it is maintained (2026.4.0 came out on 10 October
2026). Its script disassembler, descumm (scummvm-tools), is not the
check: at commit 16f178f it reads opcode $AB of versions 1 and 2 with no
parameter, where the engine reads one on the C64 and the NES, and every
instruction after it in a script comes out wrong. The kit checks against
what the engine runs.

## What you need first

**GNU make and a C++ compiler**, which the kit does not install: g++ or
clang++. `make --version` and `c++ --version` say whether they are there.
On Linux they are the distribution's build tools; on macOS, Apple's
command line tools. **Python 3**, which runs the kit.

## Start, check

```
python3 kit/scripts/tools.py get-scummvm                   # download ScummVM 2026.4.0, check its SHA-256, add the trace, build
python3 kit/scripts/tools.py scummvm status                # which build is there
python3 kit/scripts/tools.py scummvm run <game folder> --input <file> --trace <file> --seed 1
python3 kit/scripts/tools.py scummvm verify-footprint      # what a traced run writes outside the repository
python3 kit/scumm/test_scummvm.py                          # the kit's decoder against ScummVM, on the kit's test game
```

The build runs in the terminal and opens nothing: it is ScummVM's null
backend, with no window and no sound device. It reads clicks and keys
from the input file and stops when the game's clock passes `--stop` or
the input says `quit`. There is nothing to stop.

**Which build: 2026.4.0, and only after measuring a newer one.**
`get-scummvm` downloads the release tarball from ScummVM's own site and
refuses it if its SHA-256 is not the one in `kit/scumm/scummvm.py`. The
kit adds two files and twelve edits to ScummVM's source, each of which
must match exactly once, so a release that has moved what the kit edits
stops the build with a message instead of tracing wrong. To move on,
change `VERSION` and `SHA256` in `kit/scumm/scummvm.py`, run
`get-scummvm`, `test_scummvm.py` and `verify-footprint`, and change the
row here.

| Build | Machine | Measured | Checks passed |
|---|---|---|---|
| ScummVM 2026.4.0 from its release tarball, SCUMM engine only on the null backend, with the kit's trace, g++ 13.3.0, GNU make 4.3 | Linux x86_64 (Ubuntu 24.04, no display) | 5 November 2026 | `test_scummvm.py` 5 of 5: the opcode table, and the test game, 1,316 instructions at 272 places, every handler but the two that need a sound resource, and 61 conditional jumps where their text says; built in 1 min 40 s on four cores; `verify-footprint` clean |

## What goes where, and what is left behind

Tell the contributor this before installing anything:

| What | Where | Size |
|---|---|---|
| ScummVM 2026.4.0's release tarball | `tools/scumm/scummvm-2026.4.0.tar.xz` | 223 MB |
| The parts of its source the SCUMM engine needs, with the kit's additions, and the program built from it | `tools/scumm/scummvm-2026.4.0/` | 56 MB, the program 8.4 MB of it |
| The home directory it runs with, each run's settings and saved games in a folder of their own, deleted when the run ends | `tools/scumm-home/` | four empty folders |

What it is, and say so when you ask: ScummVM is the ScummVM team's
open-source reimplementation of the engines of many adventure games,
SCUMM first among them, GPLv3 licence. `get-scummvm` downloads its
release from the project's own site, checks it, unpacks into
`tools/scumm/` only what the SCUMM engine needs (the other engines,
packaging, documentation and translations are skipped), and builds it
there with the computer's own make and compiler, every optional library
off; the object files are deleted after the build. The tarball stays, so
that a change to the kit's trace rebuilds without downloading it again.

The kit runs ScummVM with `HOME` and the XDG folders pointed at
`tools/scumm-home/`, a configuration file of its own for each run,
saved games in that run's folder, ScummVM's improvements to the games
off and the games' copy protection on, so that what runs is the scripts
as they shipped.

**Uninstall:** delete the repository folder, or `tools/scumm/` and
`tools/scumm-home/` alone. The compiler and make, if they were installed
for this, are the only things left outside it.

## Linux

Run on Linux x86_64 (Ubuntu 24.04 in a cloud container, no display,
g++ 13.3.0, GNU make 4.3, Python 3.13) on 5 November 2026: `get-scummvm`
built in 1 min 40 s on four cores from the downloaded tarball,
`test_scummvm.py` passed, and `verify-footprint` was clean, with nothing
written outside the repository by the install or by a traced run that
saves a game.

## Untried systems

No run is recorded on macOS or Windows. The build needs nothing but GNU
make and a C++ compiler, so `get-scummvm` should work on macOS with
Apple's command line tools; on Windows it needs GNU make, a shell and a
compiler such as MinGW's, and the program is `scummvm.exe`. Run
`get-scummvm`, `test_scummvm.py` and `verify-footprint` there and write
the section here, as `kit/INSTALL.md` says.
