# Tools for the BBC Micro

Read `kit/INSTALL.md` first: the footprint principle and the launcher are
the same for every platform. This file is what the BBC Micro needs on top.
Only the capabilities matter; the named tools are the ones we recommend
because they are known to work. What an emulator has to be able to do,
phase by phase, is `kit/EMULATOR.md`.

| Need | Capability | Recommended tool |
|---|---|---|
| Emulator with an agent interface | run, stop on an instruction, read and write memory and the chips, count checkpoints without stopping, advance a frame, hold keys and the joystick, save and load a snapshot, save the screen, log the sound chip | jsbeeb 2.4.0 (https://github.com/mattgodbolt/jsbeeb), run inside the kit's own server, `kit/bbc/jsbeeb_server.mjs` |
| Disassembler with an agent interface | read the kit's snapshot, disassemble, label, comment, type data, export a symbol map | regenerator2000 0.9.20 from crates.io, in its BBC Micro mode: the C64's disassembler, installed once for both |
| A JavaScript runtime | run jsbeeb, and the site's screen drawing for `kit/bbc/frame.py` | Node, with npm |

The kit's server holds jsbeeb's machine in a Node process and answers on a
local socket, one JSON object a line; `kit/bbc/jsbeeb.py` is its client, and
`kit/skills/bbc/tool-jsbeeb` says how to drive it. jsbeeb's own web page and
MCP server are not used.

## What you need first

**Node and npm**, which the kit does not install. If the contributor has
no `node`, tell them, and let them decide whether to install it
(https://nodejs.org, the project's own installers; npm comes with it).
jsbeeb 2.4.0 says it wants Node 24.15.0 or later. Everything in this file
was measured on Node 22.22.0, where npm warns `EBADENGINE` while
installing and every check passes; no run is recorded on Node 24.

**Rust's `cargo`**, for the disassembler, as `kit/c64/INSTALL.md` says. A
clone that has run a C64 game has it already.

## Where the emulator stands, by phase

`python3 kit/scripts/tools.py --platform bbc check-emulator` measures this
on whatever build answers, with a 6502 test program of its own
(`kit/bbc/check_emulator.py`: no game, about ten seconds). It resets the
machine, restarts the server once, for the check that a new process gives
the same machine, and leaves it running at the BASIC prompt, so run it
before a game is loaded or on a server of its own (`--port`). It names
every check, and
`kit/skills/bbc/tool-jsbeeb/workarounds.md` says what to do about each one
that fails. Run it after installing, and again after a new release.

**Which build: 2.4.0, and only after measuring a newer one.** The kit's
server reaches inside jsbeeb (its machine session, snapshot, disc and tape
modules), which a release can change, so `get-jsbeeb` installs the version
measured here. jsbeeb releases often: 2.3.0 on 22 September 2026, 2.3.2 on
2 October, 2.4.0 on 11 October. To move on, install the new version,
run `check-emulator` and `frame.py test`, and change `JSBEEB_VERSION` in
`kit/bbc/tools.py` and the rows here together.

| Build | Machine | Measured | Checks passed |
|---|---|---|---|
| jsbeeb 2.4.0 from npm, in the kit's server, Node 22.22.0 | Linux x86_64 (Ubuntu 24.04, no display) | 13 October 2026 | 33 of 33, 10 to 11 s, two runs; `verify-footprint` clean |

| Phase | Passes | Fails | Workaround |
|---|---|---|---|
| 1 static inspection | all 64 KB in one call (4 ms), the I/O pages read as &FF and flagged without touching the chips; each sideways bank by its number, the paging put back; the registers and the cycle count; both VIAs, the CRTC, the video ULA and the sound chip by name; a snapshot read by `kit/bbc/snapshot.py` matches the live machine | | |
| 2 state management | a save from a second connection while a run is in progress; a load leaves the machine stopped at the saved state; a counting checkpoint goes on counting after a load; three loads give the same machine, from a stopped save, from a running one, and after a restart of the server; a load continues exactly as the machine that saved; warp: 500 frames, ten seconds of the machine's time, in 1.18 s, 8.5 times real time | | |
| 3 live measurement | counting checkpoints agree with the program's own counter (250 of 250); one on a routine nothing calls stays at zero; the vertical sync's interrupt counted once a frame; write and read checkpoints; the cycle counter, 40,000 a frame; every address an instruction started at, with its count, in one call; reads from a second connection while the machine runs; `stop` from a second connection | | |
| 4 frame stepping | a stopping checkpoint stops before its instruction runs; a key pressed while stopped is down at the program's next read of the keyboard; a step returns with the new PC; ten one-frame advances with a key held, one pass a frame; the key released when the script says; a hundred runs back to back, 716 calls a second; thirty stops from a second connection, each between two instructions; keep and go back in 1.2 ms a pair | | |

**The screen.** `python3 kit/bbc/frame.py test` paints a test pattern in
modes 0 to 6, and on a screen scrolled by the CRTC, and compares jsbeeb's
picture with the site's drawing of the same memory (`site/lib/bbc.js`) at
every pixel. On 13 October 2026, on the build above, nothing differed in
any of the nine pictures, about 8 s in all. Mode 7, teletext, is drawn
by the site with its letters in the page's own font; the same check fills
three screens with random control codes and characters and compares every
mosaic, space and blank cell with jsbeeb's at a point inside each block,
and the colours of every letter. On 14 October 2026 none of the 3,000
cells differed. The check resets the machine, so run it on a server of
its own (`tools.py --platform bbc jsbeeb --port 6848`).

## Why jsbeeb, and beebjit beside it

Five emulators were measured on 12 October 2026. jsbeeb passed every check drawn
from `kit/EMULATOR.md`, on the Model B and on the Master 128, needs no
display, sound device or native code, and runs inside a process the kit
owns, so the kit decides its protocol. Its snapshot is gzipped JSON that
Python reads with the standard library, and a load of it continues exactly
as the machine that saved.

beebjit (https://github.com/scarybeasts/beebjit, GPL-3.0) ran about 46 times
real speed against jsbeeb's 6 to 8.5, and failed five of the 28 checks
there: `savemem` stops one byte short of 64 KB, a load starts a new process
with no checkpoints, a load is not the machine that saved (the raster and
the timers' phase are lost), its record of what ran keeps only the hottest
256 addresses, and a key pressed while stopped can be missed. Its state
files (`BEMSNAP1`) load into jsbeeb, which runs on from them, so a long
load or a climb to a late level can be run there and handed over: save in
beebjit, `load` the file in the kit's server, `save` it again in jsbeeb's
format. That was measured on 12 October 2026 through jsbeeb's own loader,
which the server's `load` calls; on 13 October 2026 the server loaded a
B-em state (`BEMSNAP3`), ran it fifty frames and saved it as its own.
B-em's debugger cannot save state, pause or hold a key from a script; b2's
HTTP interface has no registers, stop or state; MAME needs two ROM dumps
the other emulators do not ship and the kit cannot commit.

## Start, check, stop

```
python3 kit/scripts/tools.py --platform bbc status
python3 kit/scripts/tools.py get-jsbeeb                            # install jsbeeb into tools/bbc
python3 kit/scripts/tools.py jsbeeb                                # boots to BASIC, then waits on 127.0.0.1:6845
python3 kit/scripts/tools.py --platform bbc check-emulator         # 33 named checks, about ten seconds
python3 kit/scripts/tools.py --platform bbc stop                   # this clone's servers
python3 kit/scripts/tools.py --platform bbc verify-footprint       # what it writes outside the repository
python3 kit/scripts/tools.py r2000 games/bbc/<slug>/work/<state>.json.gz   # the disassembler, on a snapshot
```

`jsbeeb` and `get-jsbeeb` are the BBC's alone, so they need no
`--platform`; `r2000` is the C64 launcher's, and on a BBC snapshot it builds
the project with the BBC Micro's system (`kit/bbc/project.py`) and starts on
that (`kit/skills/bbc/tool-regen2000`). The server opens no window and
makes no sound. `--model Master` starts a Master 128 instead of the Model B
with DFS 1.2. `--port N` (or `KIT_JSBEEB_PORT=N`) starts another machine
beside the first; every command takes it, `stop --port N` stops only that
one, and `status` lists the ports in use. A server started from another
clone is never touched: `stop` matches this clone's own server script.

## What goes where, and what is left behind

Tell the contributor this before installing anything:

| What | Where | Size |
|---|---|---|
| jsbeeb 2.4.0 and the eight packages it lists, from npm | `tools/bbc/` | 53 MB of files (61 MB on disk); most of it is the styles of jsbeeb's web page, which the server never loads |
| The server's home directory and the kit's scratch snapshots | `tools/bbc-home/` | small; a snapshot measured 3 to 15 KB, the larger a Master's with its sideways RAM |
| Disassembler binary, shared with the C64 | `tools/cargo/` | about 20 MB |
| Disassembler settings | `tools/r2000-home/` | small |
| Logs | `tools/logs/` | small |

What it is, and say so when you ask: jsbeeb is Matt Godbolt's open-source
BBC Micro emulator, GPL-3.0-or-later, published on npm by its author.
`get-jsbeeb` runs `npm install` from the npm registry into `tools/bbc`,
with `--omit=optional`, which leaves out the desktop app's Electron and
the native image library jsbeeb lists as optional, and with npm's cache
pointed into `tools/bbc` and deleted afterwards. It took 11 to 14 s on 13
October 2026. **The ROMs come with it:** jsbeeb ships the MOS, BASIC and
the filing systems' ROMs in `public/roms`, and its own note there says they
are not under its licence: they are still copyright, offered on the
understanding that you own the machine. They stay in `tools/`, which is
gitignored, and are never committed.

The launcher points `HOME` and the XDG folders at `tools/bbc-home/` before
starting the server. Node and jsbeeb wrote nothing to a home directory
when measured, and this keeps a later release from doing so unnoticed.

**Uninstall:** delete the repository folder. Node, if it was installed for
this, and Rust, if it was installed for the disassembler (`rustup self
uninstall`), are the only things left outside it.

## Linux

Run on Linux x86_64 (Ubuntu 24.04 in a cloud container, no display, Node
22.22.0) on 13 October 2026, with jsbeeb 2.4.0 from npm: `check-emulator`
passed 33 of 33 in each of two runs, `frame.py test` found no pixel
different in any mode, and `verify-footprint` was clean, with nothing
written outside the repository either by the server or by `get-jsbeeb`'s
install. Nothing in the kit's server is particular to Linux.

## Untried systems

No run is recorded on macOS or Windows. jsbeeb is plain JavaScript with no
native code once the optional packages are left out, so the install and the
server should behave the same; run `check-emulator` and `verify-footprint`
there and write the section here, as `kit/INSTALL.md` says. On Windows the
launcher's pseudo-terminal wrapper (`script`) does not exist, which every
platform's launcher shares.
