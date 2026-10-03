# Tools for the ZX Spectrum

Read `kit/INSTALL.md` first: the footprint principle and the launcher are
the same for every platform. This file is what the Spectrum needs on top.
Only the capabilities matter; the named tools are the ones we recommend
because they are known to work. What an emulator has to be able to do,
phase by phase, is `kit/EMULATOR.md`.

| Need | Capability | Recommended tool |
|---|---|---|
| Emulator with an agent interface | run, stop on an instruction, read and write memory, count breakpoints without stopping, advance a frame, hold the keyboard and the joystick, save and load a snapshot, save the screen | ZEsarUX 13.0 over ZRCP (https://github.com/chernandezba/zesarux) |
| Disassembler with an agent interface | read a 48K snapshot, disassemble, label, comment, type data, round-trip a control file | SkoolKit (`sna2skool.py`, `skool2ctl.py`; https://skoolkit.ca) |

SkoolKit is installed under `tools/skoolkit/` by the launcher
(`python3 kit/scripts/tools.py --platform spectrum get-skoolkit`). It is
open source under the GNU General Public License v3
(`https://github.com/skoolkit/skoolkit`), published on PyPI, and it is a
virtual environment there: it needs nothing outside `tools/`. The version
this file describes is SkoolKit 10.1, read from PyPI on 29 September 2026.

## Where the emulator stands, by phase

`python3 kit/scripts/tools.py --platform spectrum check-emulator` measures
this on whatever build answers, with a Z80 test program of its own
(`kit/spectrum/check_emulator.py`: no game, about twenty seconds). It names
every check, and `kit/skills/spectrum/tool-zesarux/workarounds.md` says
what to do about each one that fails. Run it after installing, and again
after any new release or build.

**Which build: the newest, always.** The kit pins no version.
`tools.py get-zesarux` finds the newest release and says what this machine
can have of it. The measurements, each dated:

| Build | Machine | Measured | Checks passed |
|---|---|---|---|
| ZEsarUX-13.0 release, `ZEsarUX_macos-silicon-13.0.dmg` | macOS arm64 | 3 October 2026 | 41 of 45, 21 s |
| ZEsarUX-13.0 release, `ZEsarUX_linux-13.0-ubuntu24_x86_64.tar.gz` | Linux x86_64 (Ubuntu 24.04, no display) | 3 October 2026 | 41 of 45, 20 s, three runs (the same four failures as macOS); `verify-footprint` clean |

The four failures on macOS are `count-while-running`, `input-type-ascii`,
`load-keeps-frame-phase` and `warp`; the Linux run had the first two, and
`checkpoints-survive-load`, which the launcher's `--snap-no-change-machine` then
fixed. Each has a section in `workarounds.md`. `counting-checkpoint` failed once
in six runs before it was changed: it required the checkpoint's count and the
program's own counter to agree to within two passes, and a run loop's opcode
limit can fall inside a pass at either end of the window, so it now allows a pass
per boundary. None of the failures costs a phase.

| Phase | Passes | Fails | Workaround |
|---|---|---|---|
| 1 static inspection | all: reads of any size in one call; the ROM and RAM named as pages; the full register set; a 48K `.sna` whose RAM, SP, pushed PC and interrupt mode match the live machine, which `kit/spectrum/snapshot.py` reads | | |
| 2 state management | save from a running or a stopped machine; load and stay stopped at the loaded state; deterministic at a stop and across a restart of the emulator; the checkpoint table and its counts survive a load; a load with the machine running resumes it and says so | a load lands at the start of a frame, not at the frame position it was saved at (`load-keeps-frame-phase`); warp is a launch option, with no ZRCP command to change it (`warp`) | start every experiment from a load, never comparing a live run with a loaded one; pass `--emulatorspeed N` to the launcher for warp |
| 3 live measurement | non-stopping checkpoints that count and agree with the program's own counter; a checkpoint on a routine that never runs stays at zero; the T-state counter, validated against the ROM's frame interrupt (69888 T-states each); store and load watchpoints count | a second connection's read waits for the run loop to finish (1.12 s of a 1.28 s run) | run in bounded chunks (`run <limit>`) and read the counts between them; the machine never stops while a chunk runs. Watch the **last** byte of a multi-byte variable: `MWA`/`MRA` on the first byte counts nothing |
| 4 frame stepping | the exact stop, on the checkpoint's own instruction; N frames in one call, on the boundary (one frame is 69888 T-states); input that lands before the next instruction, is seen by the program, and is released on request; the joystick byte; a step that returns with its PC; thirty stops at varied moments with nothing lost | `send-keys-ascii` (and `send-keys-string`) presses no key the machine can see, and releases the joystick when it ends | `set_input` for anything held, and `key_event` per character for typing; key events only land while the machine is running |
| transport | a call made as a checkpoint stops the machine answers; 800 unpaced calls, 7 000 to 8 400 a second across runs, leave ZRCP up and the machine running | | |

## Why ZEsarUX, and the MAME alternative

MAME was measured as an alternative on macOS arm64 on 29 September 2026, with
MAME 0.289 and the 48K ROM, driven through its debugger's GDB stub (`mame
spectrum -debug -debugger gdbstub`) plus a small Lua script for input. It is a
real candidate: the stub's register maps already cover 29 CPUs (z80, m6502,
m6510, m68000, m6809, arm7, i486, r4600, ppc601 and more), and its `monitor`
command runs any debugger command over the same protocol, so one client would
serve many platforms. It passes all four phases of `kit/EMULATOR.md`, and it is
**better** than ZEsarUX at two of them: whole-machine save states that land
paused and leave the checkpoints' counters alone, where ZEsarUX switches the
checkpoint table off on every load unless the launcher's
`--snap-no-change-machine` is passed; and a non-stopping counting checkpoint that
can be read while the machine runs, where ZEsarUX's `run` blocks every other
connection until it returns.

ZEsarUX is the one this platform uses, for four reasons:

1. **The snapshot.** `kit/scripts/listing.py` reads a snapshot from Python at
   zero round trips, and ZEsarUX writes the `.sna` the kit's whole listing
   design rests on and reads it back. MAME has no `.sna` at all: the kit would
   write one from six memory reads, could not fill the header's border byte
   because no ULA state is exposed, and could not load it back.
2. **Input lands when it is set.** `set-ui-io-ports` puts a key or the joystick
   in the port before the next instruction, which is what phase 4 asks for.
   MAME's input is Lua-only, so it needs a shim the kit owns, a free RAM address
   inside the game, and per-platform port names — and even then the value
   reaches the port **two frame boundaries** late.
3. **The install is contained.** One `.dmg` from the project's own release, and
   it bundles the ROMs the machine needs. MAME publishes no macOS binary (the
   Homebrew bottle is 495 MB outside this repository, against the footprint
   rule) and no ROMs at all, so a contributor must find each platform's ROM set.
4. **The transport is honest and forgiving.** ZRCP answers several clients, its
   replies are text, and a call during a run does not wait. MAME's stub takes
   **one connection for the life of the process** (a crashed script means
   restarting the emulator), answers `?` with a stop packet even while the
   machine runs, and takes hex numbers everywhere in its debugger commands.

What MAME would share, and what it would not: it shares the protocol — the RSP
client, the CPU register maps, breakpoints, stepping, `gtime`/`gvblank` and
save states are CPU-independent. It does **not** share the integration. No MAME
platform can write a snapshot the kit reads; the input shim is rewritten per
machine; each platform still needs its own ROM set, memory map, CPU decoder and
machine reference. So it removes the emulator *protocol* work, not the emulator
*integration* work, which is most of a platform.

When a later platform has no good emulator of its own, MAME is the obvious
backing: the stub's register maps and the `monitor` channel would carry it, and
the per-platform work (a snapshot writer, a port-name map for the input shim) is
a day's.

## Start, check, stop

```
python3 kit/scripts/tools.py --platform spectrum status
python3 kit/scripts/tools.py --platform spectrum zesarux            # ZRCP on 127.0.0.1:10000
python3 kit/scripts/tools.py --platform spectrum snapshots          # where snapshots land
python3 kit/scripts/tools.py --platform spectrum check-emulator     # 45 named checks, about 20 s
python3 kit/scripts/tools.py --platform spectrum stop               # the emulator only
python3 kit/scripts/tools.py --platform spectrum verify-footprint   # what it writes outside the repository
```

The emulator runs with `--vo null --ao null`: no window, no sound, and no
menu (a null video driver cannot open one). Add video options after
`zesarux` to watch it instead — `tools.py --platform spectrum zesarux --vo
cocoa` on macOS, `--vo stdout` elsewhere — and remember that a menu opened
under a run loop stops it. A second clone's emulator is never touched:
`stop` matches this clone's path only, and says so when something else
answers on the port.

`--joystickemulated` is not pinned by the launcher: the ZEsarUX default,
`Cursor&Shift`, presses keys on the keyboard matrix, which is what
`check-emulator` measures; pass `--joystickemulated Kempston` to a run
whose game reads port `$1F`.

## What goes where, and what is left behind

Tell the contributor this before installing anything:

| What | Where | Size |
|---|---|---|
| Emulator, unpacked from the release | `tools/zesarux/` | about 100 MB (the macOS bundle; the Linux build is about 43 MB compressed) |
| Everything the emulator would put in a home directory: `.zesaruxrc`, any XDG folder it uses, and the kit's snapshots | `tools/zesarux-home/` | small; a 48K snapshot is 49 KB |
| Disassembler, a Python virtual environment with SkoolKit 10.1 | `tools/skoolkit/` | about 15 MB |
| Downloads on the way in | `tools/downloads/` | the release file, until it is unpacked and deleted |
| Logs | `tools/logs/` | small |

The launcher points `HOME` (and the XDG variables) at
`tools/zesarux-home/` before starting the emulator, because ZEsarUX reads
and writes `.zesaruxrc` in the home directory on every run.

One thing can be installed outside the repository, on Linux only: the
`ubuntu24` build is dynamically linked against SDL 1.2, which Ubuntu 24.04
does not install by default. `apt-get install libsdl1.2debian` puts
`libSDL-1.2.so.0` in the system library path, where deleting this repository
does not remove it. `get-zesarux download` and `tools.py zesarux` name the
missing library, as the C64 launcher does for VICE's.

**Uninstall:** delete the repository folder. Nothing else is left behind.

Verified with `tools.py --platform spectrum verify-footprint` on macOS
arm64, 29 September 2026: it started the emulator, had it write a
snapshot, read memory through ZRCP and stopped it, and found nothing
written outside the repository — no `.zesaruxrc` and nothing in the real
home directory. No run is recorded on Linux or Windows; the launcher keeps
the emulator's home inside `tools/zesarux-home/` on every system, and
`verify-footprint` is how that is checked on the next one.

## Get the emulator

Always the newest release of `github.com/chernandezba/zesarux`, from the
project's own GitHub releases page, never a mirror. ZEsarUX is open
source under the GNU General Public License v3.

```
python3 kit/scripts/tools.py --platform spectrum get-zesarux
```

That names the newest release, this machine and the build installed now,
and changes nothing. **Show the contributor what it printed and ask**
before the next line, giving the file name and size:

```
python3 kit/scripts/tools.py --platform spectrum get-zesarux download
```

It downloads this machine's file and unpacks it into `tools/zesarux/`, and
records the release and file name so `status` can name them. The files the
13.0 release published, 9 June 2026:

| Operating system | File | Notes |
|---|---|---|
| macOS, Apple silicon | `ZEsarUX_macos-silicon-13.0.dmg` | what the checks above were measured on |
| macOS, Intel | `ZEsarUX_macos-intel-13.0.dmg` | no run recorded |
| Linux x86_64 | `ZEsarUX_linux-13.0-ubuntu24_x86_64.tar.gz` (also debian13, fedora42, i686) | no run recorded |
| Windows x86_64 | `ZEsarUX_windows-13.0.zip` (and a `-legacy` build) | no run recorded |
| Source | `ZEsarUX_src-13.0.tar.gz` | for anything else |

**macOS and Gatekeeper.** The bundle is ad-hoc signed and macOS rejects it
(`spctl` reports it as rejected). Never launch it through Finder or
`open`; the launcher runs the binary inside the bundle
(`tools/zesarux/zesarux.app/Contents/MacOS/zesarux`), which macOS allows.
The download step clears the quarantine flag on that copy
(`xattr -dr com.apple.quarantine tools/zesarux`) and changes nothing
system-wide. Its Homebrew cask is disabled for the same reason.

A build fetched by hand is unpacked so that `tools/zesarux/zesarux.app`
exists, and its release and file name go into `tools/zesarux/.kit-release`
by hand — one line, `<tag> <asset>` — so `game.json` can record what the
work was measured with.

## Get the disassembler

SkoolKit is the Z80 disassembler, from its own project on PyPI
(`skoolkit.ca`, `https://github.com/skoolkit/skoolkit`), open source under
GPLv3. The launcher creates `tools/skoolkit/` as a virtual environment and
installs unconditionally, so the same command upgrades it:

```
python3 kit/scripts/tools.py --platform spectrum get-skoolkit
```

It installs nothing outside `tools/` (the pip cache is pointed there too),
and writes the version it got into `tools/skoolkit/.kit-version`, which
`status` prints. `kit/spectrum/skoolkit.py` drives `sna2skool.py` from that
environment; without it, the kit's own Z80 decoder and snapshot reader
still build a listing, and only the control-file render is missing.

SkoolKit 10.1 publishes wheels for Python 3.10 to 3.14. On an older Python
pip takes the source distribution instead (`skoolkit-10.1.tar.gz`, 1.3 MB)
and builds it, which needs a C compiler: measured on 3 October 2026 with
the Python 3.9.6 that macOS's command line tools provide, where it built
and installed (10 MB in `tools/skoolkit/`). The build runs in the system's
temporary folder and left nothing there.

## macOS — known to work

Run on macOS arm64 on 3 October 2026 with the ZEsarUX-13.0 release and the
build above. `check-emulator` passes 41 of 45 in 21 seconds, `verify-footprint`
is clean, and the emulator serves ZRCP on `127.0.0.1:10000`. The four failures
and their workarounds are in `kit/skills/spectrum/tool-zesarux/workarounds.md`.

Record what a run used in `game.json` under `tools.emulator`: the line
`tools.py status` prints (`release ZEsarUX-13.0,
ZEsarUX_macos-silicon-13.0.dmg`), which names the release and the file and
carries no path on this computer.

## Linux

`check-emulator` and `verify-footprint` were run on Linux x86_64 (Ubuntu
24.04, no display) on 3 October 2026, from a fresh `get-zesarux download`:
41 of 45 in each of three runs, about 20 s a run, the same four failures as
the macOS row. `verify-footprint` was clean: `.zesaruxrc` lands in
`tools/zesarux-home/` and nothing in `$HOME`, and with the launcher's flags
the emulator opens no network connection. The `ubuntu24` build needs SDL
1.2, which Ubuntu does not install by default; see "What goes where".

ZRCP is about 40 ms a call on Linux without `TCP_QUICKACK`: each reply comes
in two pieces, the server's Nagle holds the second until the client ACKs,
and Linux delays the ACK. `kit/spectrum/zesarux.py` sets it before **every**
read, because Linux clears it after use; set once at connect it lasted one
reply. Measured: 23 calls a second without it, 4 600 to 5 300 with it, frame
steps 8 a second against 50, and the suite 78 s against 20 s.

## Untried systems

No run is recorded on Windows or on an Intel Mac. Two things to know before
the first one: `get-zesarux` picks the project's own file for the machine it
is run on, and the launcher keeps every path the emulator writes inside
`tools/zesarux-home/` on any system. Run `verify-footprint` on a new system
and write the section here, as `kit/INSTALL.md` says.
