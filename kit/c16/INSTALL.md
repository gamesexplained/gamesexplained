# Tools for the Commodore 16 and Plus/4

Read `kit/INSTALL.md` first: the footprint principle and the launcher are
the same for every platform. This file is what the Commodore 16 and the
Plus/4 need on top. Only the capabilities matter; the named tools are the
ones we recommend because they are known to work. What an emulator has to
be able to do, phase by phase, is `kit/EMULATOR.md`.

| Need | Capability | Recommended tool |
|---|---|---|
| Emulator with an agent interface | run, stop on an instruction, read and write the RAM, the ROMs and TED's registers, count checkpoints without stopping, advance a frame, hold keys and joysticks, load a tape, a disk or a program file, save and load a snapshot, log TED's sound | plus4emu 1.2.11 (https://github.com/istvan-v/plus4emu, git 939e652), its machine built as a library and run inside the kit's own server, `kit/c16/p4emu_server.py` |
| Disassembler with an agent interface | read the kit's snapshot, disassemble, label, comment, type data, export a symbol map | regenerator2000 0.9.20 from crates.io, in its Plus/4 mode: the C64's disassembler, installed once for every machine |
| A C++ compiler | build plus4emu's machine as a library | the computer's own g++ or clang |

The kit's server loads plus4emu's machine into a Python process (the
standard library's `ctypes`) and answers on a local socket, one JSON
object a line; `kit/c16/plus4emu.py` is its client, and
`kit/skills/c16/tool-plus4emu` says how to drive it. plus4emu's own
program, with its window, its sound and its menus, is not built.

The machine is a PAL Commodore 16 with 16 KB of RAM, or, started with
`--model plus4pal`, a PAL Plus/4 with 64 KB and its built-in 3-plus-1
programs, each with a tape player and, once a disk goes in, a 1541 disk
drive as unit 8.

## What you need first

**A C++ compiler**, with the C compiler beside it (plus4emu has one C
file), which the kit does not install. On Ubuntu it is the package
`build-essential`; on a Mac, Apple's command line tools
(`xcode-select --install`) bring clang. If the contributor has none,
tell them, and let them decide whether to install one. Everything in
this file was measured with g++ 13.3.0.

**git**, which fetches plus4emu's source. A contributor who cloned this
repository has it.

**libsndfile, only for a tape kept as a WAV recording.** plus4emu reads
such a tape through libsndfile. When the compiler finds libsndfile's
header and library, the kit's build uses it; when it does not, the build
goes on against `kit/c16/sndfile/sndfile.h`, which opens no sound file,
and the server reads every other tape as before, a C16 TAP included, and
refuses a WAV, naming the reason. `KIT_PLUS4EMU_NO_SNDFILE=1` builds
without it on purpose. On Ubuntu it is the package `libsndfile1-dev`,
which lands outside the repository, so ask first. Of ten tapes taken from
TOSEC's set on 19 October 2026, nine were C16 TAP files, which need no
libsndfile.

**Rust's `cargo`**, for the disassembler, as `kit/c64/INSTALL.md` says. A
clone that has run a C64, BBC Micro or Apple II game has it already.

## Where the emulator stands, by phase

`python3 kit/scripts/tools.py --platform c16 check-emulator` measures
this on whatever build answers, with a test program, a test tape and a
test disk of its own (`kit/c16/check_emulator.py`: no game, about a
minute). It powers the machine on, restarts the server once, for the
check that a new process gives the same machine, and leaves it running,
powered on with no tape or disk, so run it before a game is loaded or on
a server of its own (`--port`). It checks the model the server runs, so
check the Plus/4 too (`plus4emu --model plus4pal`) before a game written
for it. It names every check, and
`kit/skills/c16/tool-plus4emu/workarounds.md` says what to do about each
one that fails. Run it after installing, and again after any change to
the build.

**Which build: git 939e652, and only after measuring another.** The kit
compiles plus4emu's machine itself, 48 of its source files with the
flags of plus4emu's own build, and leaves out the window, the sound and
the menus. plus4emu's own build (SCons) stops on SCons 4 at its check
for FLTK (the project's issue 5), and even past that, the library it
builds leaves out four source files the library calls, so it does not
load. On 19 October 2026 the newest release was 1.2.10.1, of 22 February
2017, and the newest commit 939e652, of 2 April 2020, whose NEWS file
names it 1.2.11. `get-plus4emu` fetches that commit alone and refuses
anything else. The kit adds one patch, `kit/c16/codemap.patch`: the
machine counts each instruction it runs, so `codemap` returns every
address that ran, with its count, in one call. 300 frames of the check's
test program ran and were mapped in 0.32 seconds; with a callback for
each instruction, 300 frames took 4.5 seconds when the emulators were
compared. To move to another commit, change `PLUS4EMU_COMMIT` and
`PLUS4EMU_VERSION` in `kit/c16/tools.py`, run `get-plus4emu`,
`check-emulator` on both models, `frame.py test` and `sound.py test`, and
change the rows here together.

| Build | Machine | Measured | Checks passed |
|---|---|---|---|
| plus4emu 1.2.11 (git 939e652), from source, with `kit/c16/codemap.patch`, in the kit's server, g++ 13.3.0, Python 3.13.16 | Linux x86_64 (Ubuntu 24.04, no display, 4 cores) | 19 October 2026 | 46 of 46 as a C16 in each of two runs (53 and 57 s), and as a Plus/4 (67 s); built without libsndfile, 46 of 46 as a C16 (56 s); `verify-footprint` clean |

| Phase | Passes | Fails | Workaround |
|---|---|---|---|
| 1 static inspection | all 64 KB as the CPU sees it in one call (113 ms on the C16); the RAM under the ROMs, BASIC and the KERNAL each by name, without paging them in; the registers and the cycle count; TED's registers, its raster line and the ROM paging, read without side effects; a snapshot read by `kit/c16/snapshot.py` matches the live machine; a screenshot drawn from TED's own output with no display, 384 by 294 | | |
| 2 state management | a save from a second connection while a run is in progress; a load leaves the machine stopped at the saved state; twelve saves at stops a few thousand cycles to three frames apart, each loading back to its stop; writes made at a stop made again by the replay a save runs; a counting checkpoint goes on counting after a load; three loads give the same machine, from a stopped save, from a running one, and after a restart of the server; a load continues exactly as the machine that saved; the KERNAL loads the check's own tape and its own disk, and a snapshot saved part way through each loads on to the same machine 40 seconds later; warp: 1,500 frames, thirty seconds of the machine's time, in 1.40 s on the C16 (21.6 times real time) and 1.76 s on the Plus/4 (17.1 times) | | |
| 3 live measurement | counting checkpoints agree with the program's own counter to one pass (249 hits in 250 passes); one on a routine nothing calls stays at zero; one raster interrupt a frame, counted by the program and by a checkpoint; write and read checkpoints, 250 stores and 250 reads of TED's timer; the cycle counter, 35,568 a frame; every address an instruction started at, with its count, in one call (300 frames run and mapped in 0.32 s); reads from a second connection while the machine runs; `stop` from a second connection; every write to TED's sound registers, with its cycle | | |
| 4 frame stepping | a stopping checkpoint stops before its instruction runs; a step returns with the new PC; a key pressed while stopped is in the keyboard matrix at the program's next scan; ten one-frame advances with a key held, one pass a frame, 1.4 ms a step; the key released when the script says; joysticks 1 and 2 held left with fire read $BB and $7B at $FF08, and $FF let go; a joystick pushed while stopped seen by the next read; a hundred runs back to back, 721 a second on the C16 and 563 on the Plus/4; thirty stops from a second connection, each between two instructions; keep and go back in 55 ms a pair on the C16 and 191 ms on the Plus/4; `PRINT 6*7` typed, and BASIC answers 42 | | |

**The screen.** `python3 kit/c16/frame.py test` fills TED's memory with
patterns of its own in every mode TED has, the scroll and the narrower
windows included, and compares plus4emu's picture with the site's drawing
(`site/lib/c16.js`) at every pixel of the display window but one strip:
the pixels a scroll uncovers in 40 columns or 25 rows, which TED fills
with whatever it last held and the site leaves in the background colour.
On 19 October 2026 nothing differed in any of its 18 cases. It needs a
server, so CI runs only `kit/c16/test_frame.py`, the parts that need none.

**The sound.** `python3 kit/c16/sound.py test` plays eleven short programs
of its own that write TED's sound registers (each voice's square, both
together, the noise at two pitches, the values 1022 and 1023, every
volume, and D/A) and compares plus4emu's own output, kept by the server's
`sound` with `audio`, with the site's model of TED (`site/lib/ted-sound.js`)
sample by sample. On 19 October 2026 every case was within 0.65 % of
plus4emu's level. It needs a server of its own, since it resets the
machine; `--record` writes the cases to `kit/c16/fixtures/ted-sound.json`,
which `kit/c16/test_ted_sound.js` holds the model to in CI.

## Why plus4emu, and VICE beside it

When the emulators were compared, on 19 October 2026, the three that a
script can stop on an instruction, plus4emu, VICE's `xplus4` and MAME,
were measured on 45 checks drawn from `kit/EMULATOR.md`, the checks this
file's table grew from. plus4emu passed all 45, as a C16 and as a Plus/4.
Built as a library it needs no display and no sound device, and its
machine runs inside a process the kit owns, so the kit decides its
protocol. A snapshot saved part way through a game's own tape or disk
loader loaded back into the same machine. Python reads its snapshot file
with the standard library. Its ROMs come with its source.

It costs the kit work. On 19 October 2026 its newest commit was from 2
April 2020. The library has no cycle counter, stops only between two of
its calls, which can fall part way through an instruction, and its
snapshot keeps neither the tape's place nor the disk drive. So the kit's
server counts the cycles itself, and saves by replaying from snapshots of
its own (`kit/skills/c16/tool-plus4emu`, "Snapshots"): a save made during
a load takes longer the further the load has gone.

VICE's `xplus4`, from the vice-mcp 3.13.2 release the C64 kit installs,
passed 36 of the 45 as a C16 and 37 as a Plus/4. Its snapshot keeps none
of TED's timers (VICE's bug 87, filed on 13 October 2009 and open on 19
October 2026), so no loaded snapshot runs on as the machine that saved it
did, and each call through its monitor takes about a tenth of a second.
It is the cross-check for a game that behaves oddly in plus4emu: the 13
game files that loaded in both showed the same screens in each.

MAME 0.289 passed 32 of the 45 as a C16. Its PAL TED's frame is 261 lines
and 24.17 ms long, where a real one is 312 lines and 20.06 ms, so a game
that keeps time by the raster runs at 83% of its speed. MAME's
development branch at commit 7e7a99f (18 October 2026), whose TED was
rewritten, passed 42 of 45 as a C16, with keys and joysticks set from a
script reaching the machine only at its next frame; the first release
made from it is worth measuring. YapeSDL has no way in for a script
beyond a console monitor without breakpoints, Clock Signal has none at
all, and RetroArch's VICE core has no breakpoints and no registers.

## Start, check, stop

```
python3 kit/scripts/tools.py --platform c16 status
python3 kit/scripts/tools.py get-plus4emu                         # fetch plus4emu's source into tools/c16, patch it, build its library
python3 kit/scripts/tools.py plus4emu                             # a PAL C16, powered on with no tape or disk, waiting on 127.0.0.1:7501
python3 kit/scripts/tools.py plus4emu --port 7502 --model plus4pal    # a PAL Plus/4 beside it
python3 kit/scripts/tools.py --platform c16 check-emulator        # 46 named checks, about a minute
python3 kit/scripts/tools.py --platform c16 stop                  # this clone's servers
python3 kit/scripts/tools.py --platform c16 verify-footprint      # what it writes outside the repository
python3 kit/scripts/tools.py r2000 games/c16/<slug>/work/<state>.p4emu    # the disassembler, on a snapshot
```

`plus4emu` and `get-plus4emu` are the C16's alone, so they need no
`--platform`; `r2000` is the C64 launcher's, and on a `.p4emu` snapshot it
builds the project with the Plus/4's system (`kit/c16/project.py`) and
starts on that (`kit/skills/c16/tool-regen2000`). The server opens no
window and makes no sound. It rebuilds the library when the patch, or the
commit `kit/c16/tools.py` names, changes. `--port N` (or
`KIT_PLUS4EMU_PORT=N`) starts another machine beside the first; every
command takes it, `stop --port N` stops only that one, and `status` lists
the ports in use. A server started from another clone is never touched:
`stop` matches this clone's own server script.

## What goes where, and what is left behind

Tell the contributor this before installing anything:

| What | Where | Size |
|---|---|---|
| plus4emu's source at git 939e652, one commit deep, with the kit's patch | `tools/c16/plus4emu/` | 5.9 MB on disk, git's own files included |
| The compiled sources and the library built from them | `tools/c16/build/` and `tools/c16/lib/` | 1.4 MB and 0.8 MB |
| The server's home directory, its rolling snapshots, and the kit's scratch snapshots | `tools/c16-home/` | small; a snapshot is 50 KB on the C16 and 132 KB on the Plus/4 |
| Disassembler binary, shared with the C64 | `tools/cargo/` | about 24 MB |
| Disassembler settings, and the kit's system file for the Plus/4 | `tools/r2000-home/` | small |
| Logs | `tools/logs/` | small |

What it is, and say so when you ask: plus4emu is István Varga's
open-source emulator of the Commodore 16, Plus/4 and their disk drives,
under the GPL, version 2 or later. `get-plus4emu` fetches one commit from
the project's own repository on GitHub with git, applies the kit's
patch, and compiles the library with the computer's compiler, as many
files at once as it has cores. On 19 October 2026 a fresh install took
12 seconds on four cores, 11 of them compiling, and wrote nothing outside
the repository. **The ROMs come with it:** plus4emu keeps the machines'
ROMs, Commodore's, in its source's `roms/` folder, and the server loads
them from there. They stay in `tools/`, which is gitignored, and they are
never committed.

The launcher points `HOME`, the XDG folders and `TMPDIR` at
`tools/c16-home/` before starting the server. plus4emu's library wrote
nothing to a home directory when measured, and this keeps a later build
from doing so unnoticed.

**Uninstall:** delete the repository folder. A C++ compiler and
libsndfile, if they were installed for this, and Rust, if it was
installed for the disassembler (`rustup self uninstall`), are the only
things left outside it.

## Linux

Run on Linux x86_64 (Ubuntu 24.04 in a cloud container, no display, g++
13.3.0, four cores) on 19 October 2026, with plus4emu at git 939e652:
`check-emulator` passed 46 of 46 as a C16 in each of two runs and as a
Plus/4, and again as a C16 on a library built without libsndfile;
`frame.py test` found no pixel different; and `verify-footprint` was clean,
with nothing written outside the repository either by the server or by
`get-plus4emu`'s install. Nothing in the kit's server is particular to
Linux.

## Untried systems

No run is recorded on macOS or Windows. On macOS the launcher builds a
`.dylib` in place of the `.so`, with the command line tools' compiler,
which nobody has run; run `get-plus4emu`, `check-emulator` and
`verify-footprint` there and write the section here, as `kit/INSTALL.md`
says. On Windows nobody has tried the build, and the launcher's
pseudo-terminal wrapper (`script`) does not exist, which every platform's
launcher shares.
