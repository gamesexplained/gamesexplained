# Tools for the Apple II

Read `kit/INSTALL.md` first: the footprint principle and the launcher are
the same for every platform. This file is what the Apple II needs on top.
Only the capabilities matter; the named tools are the ones we recommend
because they are known to work. What an emulator has to be able to do,
phase by phase, is `kit/EMULATOR.md`.

| Need | Capability | Recommended tool |
|---|---|---|
| Emulator with an agent interface | run, stop on an instruction, read and write every bank of memory and the soft switches, count checkpoints without stopping, advance a frame, hold keys, buttons and paddles, change disks, save and load a snapshot, log the speaker and the Mockingboard | Apple2TS 3.7.0 (https://github.com/ct6502/apple2ts), its machine run inside the kit's own server, `kit/apple2/apple2ts_server.mjs` |
| Disassembler with an agent interface | read the kit's snapshot, disassemble, label, comment, type data, export a symbol map | regenerator2000 0.9.20 from crates.io, in its Apple II mode: the C64's disassembler, installed once for every machine |
| A JavaScript runtime | run Apple2TS's machine, bundle it, and run the site's screen drawing for `kit/apple2/test_frame.py` | Node, with npm |

The kit's server holds Apple2TS's machine in a Node process and answers on
a local socket, one JSON object a line; `kit/apple2/apple2ts.py` is its
client, and `kit/skills/apple2/tool-apple2ts` says how to drive it.
Apple2TS's own web page, and its own server for agents (apple2ts-server,
which runs the web page in a browser), are not used.

The machine is a 128K enhanced Apple IIe, NTSC: the extended 80-column card
(64K more), a Mockingboard in slot 4 and a Disk II with two drives in slot
6.

## What you need first

**Node and npm**, which the kit does not install. If the contributor has
no `node`, tell them, and let them decide whether to install it
(https://nodejs.org, the project's own installers; npm comes with it).
Everything in this file was measured on Node 22.22.0; no run is recorded
on another version.

**git**, which clones Apple2TS's source. A contributor who cloned this
repository has it.

**Rust's `cargo`**, for the disassembler, as `kit/c64/INSTALL.md` says. A
clone that has run a C64 or BBC Micro game has it already.

## Where the emulator stands, by phase

`python3 kit/scripts/tools.py --platform apple2 check-emulator` measures
this on whatever build answers, with a test program and a test disk of its
own (`kit/apple2/check_emulator.py`: no game, about nine seconds). It powers
the machine on, restarts the server once, for the check that a new process
gives the same machine, and leaves it running, powered on with no disk, so
run it before a game is loaded or on a server of its own (`--port`). It
names every check, and `kit/skills/apple2/tool-apple2ts/workarounds.md`
says what to do about each one that fails. Run it after installing, and
again after a new release.

**Which build: 3.7.0, and only after measuring a newer one.** The kit's
server reaches inside Apple2TS's machine, and the build changes it in five
ways (`kit/apple2/apple2ts_build.mjs`): the timers run on the machine's
cycles, the speaker and the Mockingboard report to the server, the game
patches are off, the disk controller's and the paddle timer's private
state is saved and restored, and every data read and write reaches the
server's checkpoints. Each change is checked as the build makes it, so a
release that has moved what it changes stops the build with a message
instead of running wrong. `get-apple2ts` clones the tag v3.7.0 (commit
c900979, tagged 7 October 2026) and refuses it if the tag has moved. To
move on, change `APPLE2TS_VERSION` and `APPLE2TS_COMMIT` in
`kit/apple2/tools.py`, run `get-apple2ts`, `check-emulator`,
`monitor.py --check` and `opcodes.py --check apple2`, and change the rows
here together.

| Build | Machine | Measured | Checks passed |
|---|---|---|---|
| Apple2TS 3.7.0 (tag v3.7.0), bundled with esbuild 0.25.12 into the kit's server, Node 22.22.0 | Linux x86_64 (Ubuntu 24.04, no display) | 19 October 2026 | 42 of 42, 8 to 9 s, two runs; `verify-footprint` clean |

| Phase | Passes | Fails | Workaround |
|---|---|---|---|
| 1 static inspection | all 64 KB as the CPU sees it in one call (5 ms), the I/O page read as $00 and flagged without touching a switch; main memory, auxiliary memory, the language card's four banks and the ROM, each by name, the switches left as they were; the registers and the cycle count; the soft switches by name, the keyboard, the game port, the disk drive and the Mockingboard's 6522s; a snapshot read by `kit/apple2/snapshot.py` matches the live machine bank by bank; a screenshot drawn with no display, its text the same as the server's | | |
| 2 state management | a save from a second connection while a run is in progress; a load leaves the machine stopped at the saved state; a counting checkpoint goes on counting after a load; three loads give the same machine, from a stopped save, from a running one, and after a restart of the server; a load continues exactly as the machine that saved; a 16-sector disk boots to the same memory at the same cycle twice, and a snapshot saved while the disk was being read reads on to the same memory at the same cycle; warp: 600 frames, ten seconds of the machine's time, in 0.55 s, 18.3 times real time | | |
| 3 live measurement | counting checkpoints agree with the program's own counter to one pass (249 hits in 250 passes); one on a routine nothing calls stays at zero; the vertical blank seen once a frame; the Mockingboard timer's interrupts counted, 260 of 260; write and read checkpoints, 250 stores and 250 reads of the keyboard; the cycle counter, 17,030 a frame; every address an instruction started at, with its count, in one call (100 frames in 0.08 s, 0.09 s recording); reads from a second connection while the machine runs; `stop` from a second connection; every click of the speaker and every change to a sound chip's registers, with its cycle | | |
| 4 frame stepping | a stopping checkpoint stops before its instruction runs; a step returns with the new PC; a key pressed while stopped is waiting in $C000 at the program's next read; ten one-frame advances with a key held, one pass a frame; the key released when the script says; button 0 held and let go; paddle 0 set to 20, 100 and 200 read 20, 100 and 197; a hundred runs back to back, 1,888 calls a second; thirty stops from a second connection, each between two instructions; keep and go back in 2.8 ms a pair | | |

**The screen.** Apple2TS draws its screen in its web page, so the server
draws nothing and the kit has no emulator's picture to hold its own
drawing to. `kit/apple2/screen.py` draws the screenshots from memory and
the switches, and `kit/apple2/test_frame.py` holds the site's drawing
(`site/lib/apple2.js`) to it at every pixel, in eight modes and pages, with
Node alone: on 19 October 2026 nothing differed. The hi-res colours are an
approximation of what a TV shows. When a page's colours matter, compare
them with a screenshot from MAME or AppleWin (below), and say in the page
which was used.

**The Monitor's names and the 65C02.** `python3 kit/apple2/monitor.py
--check` runs each Monitor routine the kit names, and makes the ROM go
through each of page 3's Monitor vectors, on the running machine: on 19
October 2026 all 66 passed. DOS 3.3's vectors on page 3 are checked only
when a DOS 3.3 disk is given (`monitor.py --check <disk>`), and none was:
their names are as Beneath Apple DOS gives them. `python3 kit/cpu/opcodes.py
--check apple2` compares the kit's 65C02 table (`kit/cpu/m65c02.py`) with
Apple2TS's own disassembler: 256 of 256 opcodes agreed in name, size and
mode on 19 October 2026.

## Why Apple2TS, and MAME beside it

Seven emulators were looked at on 18 and 19 October 2026, and the three
that a script can drive and that can save a state, Apple2TS, MAME and
AppleWin, were measured on 39 checks drawn from `kit/EMULATOR.md`. Apple2TS
passed every one but the screenshot, which its machine leaves to its web
page; the kit draws the screen from memory instead. It needs no display,
sound device or native code, and its machine runs inside a process the kit
owns, so the kit decides its protocol. Its save state is JSON that Python
reads with the standard library. It booted 20 of the 21 disks of a test
suite of WOZ images chosen to break a weak disk emulation (the 21st, a
13-sector disk, does not boot through a 16-sector controller on a real IIe
either), and passed the automatic tests of a2audit, a test suite of the
IIe's memory and soft switches. It needed one change for the checks: its
save state leaves out the disk controller's private state, so a snapshot
saved while a disk turned loaded into a different machine, until the kit's
build added it.

MAME 0.289, driven from a Lua script inside its debugger, passed 38 of
the 39 and makes its own screenshots, in the colours a TV shows. It is the
independent check: over the first 90 seconds of a commercial game, MAME and
Apple2TS executed the same 7,408 addresses. It is not the first choice: it
needs Apple's ROMs from MAME's ROM set, which the kit cannot ship; it ran at
1.0 to 1.2 times real time while recording what ran; and a key pressed
while the machine is stopped reaches $C000 only at the keyboard's next
scan. Ubuntu 24.04's package is MAME 0.264, whose Lua interface differs:
16 of 39.

AppleWin's Linux port, driven through its libretro core and a C++ shim,
passed all 39 with a nine-line patch to its keyboard and was the fastest of
the three, but the shim reaches into the core's internal symbols and must
be built against the same source, every run writes `/tmp/AppleWin.log`,
and no two cold boots are the same. izapple2 booted all 21 test disks, the
13-sector one included, but has no saved state, so it is a cross-check for
a disk that will not boot. apple2js ran a WOZ disk at four times real time,
booted 16 of the 21, and its saved state did not load back into the same
machine without a fix. Clock Signal has no way in for a script, MII only a
shell made for a person, and neither has a saved state.

## Start, check, stop

```
python3 kit/scripts/tools.py --platform apple2 status
python3 kit/scripts/tools.py get-apple2ts                             # clone Apple2TS and install esbuild into tools/apple2, then build the server
python3 kit/scripts/tools.py apple2ts                                 # powered on with no disk, waiting on 127.0.0.1:6502
python3 kit/scripts/tools.py --platform apple2 check-emulator         # 42 named checks, about nine seconds
python3 kit/scripts/tools.py --platform apple2 stop                   # this clone's servers
python3 kit/scripts/tools.py --platform apple2 verify-footprint       # what it writes outside the repository
python3 kit/scripts/tools.py r2000 games/apple2/<slug>/work/<state>.json    # the disassembler, on a snapshot
```

`apple2ts` and `get-apple2ts` are the Apple II's alone, so they need no
`--platform`; `r2000` is the C64 launcher's, and on an Apple II snapshot it
builds the project with the Apple II's system (`kit/apple2/project.py`) and
starts on that (`kit/skills/apple2/tool-regen2000`). The server opens no
window and makes no sound. It builds itself again when the kit's server
files change, which takes about a second. `--port N` (or
`KIT_APPLE2TS_PORT=N`) starts another machine beside the first; every
command takes it, `stop --port N` stops only that one, and `status` lists
the ports in use. A server started from another clone is never touched:
`stop` matches this clone's own server script.

## What goes where, and what is left behind

Tell the contributor this before installing anything:

| What | Where | Size |
|---|---|---|
| Apple2TS 3.7.0's source, its `src/` folder only | `tools/apple2/apple2ts/` | 9.3 MB on disk, git's own files included |
| esbuild 0.25.12, from npm | `tools/apple2/esbuild/` | 11 MB |
| The server, bundled from both | `tools/apple2/apple2ts-server.cjs` | 556 KB |
| The server's home directory and the kit's scratch snapshots | `tools/apple2-home/` | small; a snapshot measured 5 KB with no disk in and about 300 KB with one |
| Disassembler binary, shared with the C64 | `tools/cargo/` | about 20 MB |
| Disassembler settings | `tools/r2000-home/` | small |
| Logs | `tools/logs/` | small |

What it is, and say so when you ask: Apple2TS is Chris Torrence's
open-source Apple II emulator, MIT licence. `get-apple2ts` clones its
release tag from the project's own repository on GitHub, shallow and
sparse, so that only the source comes down and none of the web page's disks
and pictures. It installs esbuild, Evan Wallace's open-source bundler (MIT),
from npm, with npm's cache pointed into `tools/apple2` and deleted
afterwards, and then bundles the server. On 19 October 2026 a fresh install
took 4 s and wrote nothing outside the repository. **The ROMs come with
it:** Apple2TS keeps the Apple IIe's ROMs in its source, so the server
bundle holds them too. They are Apple's, they stay in `tools/`, which is
gitignored, and they are never committed.

The launcher points `HOME` and the XDG folders at `tools/apple2-home/`
before starting the server. Node and Apple2TS's machine wrote nothing to a
home directory when measured, and this keeps a later release from doing so
unnoticed.

**Uninstall:** delete the repository folder. Node, if it was installed for
this, and Rust, if it was installed for the disassembler (`rustup self
uninstall`), are the only things left outside it.

## Linux

Run on Linux x86_64 (Ubuntu 24.04 in a cloud container, no display, Node
22.22.0) on 19 October 2026, with Apple2TS 3.7.0: `check-emulator` passed
42 of 42 in each of two runs, `test_frame.py` found no pixel different,
and `verify-footprint` was clean, with nothing written outside the
repository either by the server or by `get-apple2ts`'s install. Nothing in
the kit's server is particular to Linux.

## Untried systems

No run is recorded on macOS or Windows. Apple2TS's machine is plain
TypeScript, and npm installs the esbuild binary built for the computer it
runs on, so the install and the server should behave the same; run
`check-emulator` and `verify-footprint` there and write the section here,
as `kit/INSTALL.md` says. On Windows the launcher's pseudo-terminal wrapper
(`script`) does not exist, which every platform's launcher shares.
