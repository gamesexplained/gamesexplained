---
name: tool-zesarux
description: How to drive ZEsarUX 13.0 over ZRCP, the ZX Spectrum emulator the kit uses. Start it, connect, the commands the kit runs, stepping and checkpoints, frames, input, snapshots, and the traps measured on the release. What to do when a check fails is in workarounds.md, beside this file.
---

# ZEsarUX over ZRCP

ZEsarUX is the open-source ZX Spectrum emulator (GPLv3,
`github.com/chernandezba/zesarux`). The kit drives it over **ZRCP**, its
line-based TCP protocol on loopback; nothing else about it is used.

```
python3 kit/scripts/tools.py --platform spectrum zesarux   # start it, ZRCP on 127.0.0.1:10000
python3 kit/scripts/tools.py --platform spectrum status    # which build, which machine, up or down
python3 kit/scripts/tools.py --platform spectrum stop      # stop it
```

A run that needs several machines at once (a window to watch, a frame-stepped
test, an independent checker) starts each with `--port N`, and points its
script at one with `KIT_ZESARUX_PORT=N`: `kit/spectrum/INSTALL.md`, "More than
one machine at once".

The emulator runs with `--vo null --ao null`: no window and no sound, the
screen is saved to a file when needed. It runs at real speed — measured
3.50 MHz of emulated clock in 3.53 MHz of wall clock on a 48K machine
(29 September 2026) — which is what a tape loader wants.

## Connecting

```
from zesarux import connect                    # kit/spectrum/zesarux.py
rpc = connect()                                # 127.0.0.1:10000, or KIT_ZESARUX_PORT
```

A connection greets you with a two-line banner and then the prompt:

```
Welcome to ZEsarUX remote command protocol (ZRCP)
Write help for available commands

command> 
```

Every reply ends with a prompt line: `command> ` normally, and
`command@cpu-step> ` while the machine is stopped in cpu-step mode. Read a
reply by accumulating until a line ending in `> ` appears — the prompt has
no trailing newline, and a reply may arrive in pieces or in one piece with
the next one. `zesarux._read_reply` does exactly this.

One thread per connection, and several connections at once are allowed —
but only one of them should drive: a `run` loop belongs to the connection
that sent it and **dies with the connection**, and a second connection's
commands wait for it anyway (see `workarounds.md`).

## The commands the kit uses

Measured syntax on 13.0. `help <command>` gives the full text; `help` alone
lists all 129.

| What | Command | Notes |
|---|---|---|
| Any memory read | `read-memory <addr> <len>` | one line of hex, no spaces; address as `8000H` (the `$8000` form is **not** parsed: it reads address 0) |
| Memory write | `write-memory <addr> b b b ...` | decimal bytes. Only takes effect on a machine that is not running |
| Registers | `get-registers` | one line, `KEY=VALUE` pairs in hex; `IM1`, `VPS: 0` and `MMU=...` are extra words without a useful `=` |
| One register | `set-register PC=8000H` | echoes the whole register set back |
| Stop / start | `enter-cpu-step` / `exit-cpu-step` | `run` is refused ("You must first enter cpu-step mode") unless in cpu-step |
| One instruction | `cpu-step` / `cpu-step-over` | replies with the registers **after** the instruction and its disassembly |
| Run | `run [verbose] [limit] [no-stop-on-data] [update-immediately]` | returns on a checkpoint, after `limit` opcodes, or for its own reasons; see below |
| T-states | `get-tstates-partial` / `reset-tstates-partial` | a monotonic counter: use it for deltas |
| T-states in the frame | `get-tstates` | read-only, and not the frame position; not used by the kit |
| Arm a checkpoint | `enable-breakpoints`, then `set-breakpoint <1..100> <condition>` | refused while breakpoints are off |
| Skip N matches | `set-breakpointpasscount <index> <n>` | fire on the n-th match; `0` fires on every match |
| Read the counts | `get-breakpointspasscount` | `N: matches limit`, 100 lines; a limit that can never be reached makes a non-stopping counter |
| Take it back | `disable-breakpoint <index>`, `disable-breakpoints`, `enable-breakpoints` | |
| What a hit does | `set-breakpointaction <index> <action>` | no action = break; `let var0=var0+1`, `putv <expr>`, `prints <text>` do not stop |
| Input | `set-ui-io-ports <9 concatenated hex bytes>` | 8 keyboard rows then the joystick; keyboard `0` = pressed, joystick `1` = pressed |
| Input, read back | `get-ui-io-ports` | same 18 hex characters |
| Keys | `send-keys-event <key> <1\|0>` | pumped by the running machine only; see below |
| Snapshots | `snapshot-save <file>`, `snapshot-load <file>` | a `.sna` for a 48K machine is 49179 bytes |
| Load a game | `smartload <file>` | from the extension: `.tzx`/`.tap` plays the tape, `.sna`/`.z80` loads a snapshot; the loader then runs by itself. A tape plays at real speed, so wait for the game (poll the PC or save the screen) |
| Screen | `save-screen <file>` | `.scr` is 6912 bytes, `.bmp` and `.pbm` too |
| Expressions | `evaluate <expr>` | `PEEK`, `IN`, registers, `TSTATESP`, arithmetic and comparisons |
| Machine | `get-current-machine` | `ZX Spectrum 48k` |
| Memory pages | `get-memory-pages` | `ROM RAM` on a 48K machine |
| Code coverage | `cpu-code-coverage clear\|enabled yes\|enabled no\|get` | enable it with `enabled yes`, play the game, then `get` returns every address the CPU executed (instruction starts, space separated hex). It must be enabled while the machine is **running**: issued in cpu-step mode it answers `Error. Can not enter cpu step mode. You can try closing the menu`, and a `snapshot-load` afterwards can switch it off, so `get` then answers `Error. It's not enabled`. Clear and re-enable after a load. This is how a game's code is separated from its data without a flow-following disassembler; see "From the map to a control file" below, and iterate that sweep - one pass under-reports |

ZRCP has more than the kit uses. Worth knowing for finding data tables:
`get-visualmem-read-dump` and `get-visualmem-written-dump` (the memory a
range was read from and written to), `cpu-transaction-log` and
`cpu-history` (an instruction trace, for the run-up to a stop), the
`snapshot-inram-*` commands (save and restore a snapshot in memory, no
file), `get-ocr` (text off the screen), and for a windowed run
`get-text-overlay` and `close-all-menus` (what an open menu or dialog
says, and shutting it). None is wired into the client;
`help <command>` gives their syntax. `close-all-menus` is not neutral:
with the emulator's send-statistics question pending it answers "yes"
(`kit/spectrum/INSTALL.md`). The launcher's flags keep that question from
being asked, so use it only on an emulator the launcher started.

ZEsarUX's own expressions are worth knowing: `IN(<port>)` reads a port
(sixteen bits, so the keyboard rows decode as `IN(65278)` for `$FEFE`),
`PEEK(<addr>)` a byte, `MWA`/`MRV` the last write's address and the last
read's value, and `TSTATESP` the partial T-state counter — the frame
breakpoint in the client is `TSTATESP>69888`.

## The client

```
python3 kit/spectrum/zesarux.py --list                      # the commands below
python3 kit/spectrum/zesarux.py read-memory '{"addr":"8000H","len":16}'
python3 kit/spectrum/zesarux.py smartload '{"path":"games/spectrum/<slug>/work/<image>.tzx"}'
python3 kit/spectrum/zesarux.py snapshot-save '{"path":"tools/zesarux-home/snapshots/x.sna"}'
```

One call per invocation for the agent, and the same calls from a script
(import it, do not shell out): `connect()`, then `read_memory`,
`write_memory`, `registers`, `set_register`, `tstates`, `tstates_in_frame`,
`enter_step`, `exit_step`, `step`, `run`, `frames`, `bp_set`,
`bp_passcount`, `bp_counts`, `bp_count`, `bp_conditions`, `bp_action`,
`bp_disable`, `bp_enable_all`, `bp_clear`, `set_input`, `get_input`,
`release_input`, `key_event`, `type_ascii`, `evaluate`, `snapshot_save`,
`snapshot_load`, `smartload`, `save_screen`, `machine`, `version`.

Anything with a loop in it belongs in a script: a round trip is about
0.13 ms, and 800 unpaced calls take 0.1 s (measured), but an agent
thinking between two calls takes seconds. On Linux the client sets
`TCP_QUICKACK` before every read (Linux clears it after use); without it the
server's Nagle waits for a delayed ACK and a round trip is about 40 ms there.
A client of your own on Linux must do the same.

## Steps, checkpoints and frames

The loop the kit uses for a live measurement:

```python
rpc.enter_step()                       # stop on an instruction boundary
rpc.write_memory(0x9000, b"\0\0")      # writes need the machine stopped
rpc.set_register("PC", 0x8000)
rpc.bp_set(1, "PC=800FH")              # a stopping checkpoint, slot 1
rpc.bp_passcount(1, 100)               # skip the first 99: stop on the 100th
rpc.run(timeout=10)                    # blocks; the reply says "Breakpoint fired: PC=800FH"
rpc.registers()["PC"]                  # exactly 0x800F: the stop is on the instruction
```

- **The stop is exact.** A checkpoint stops on its own instruction, not at
  the end of a frame (`stop-exact`), and thirty stops at varied moments
  each left a register set while stopped intact a frame later
  (`stop-at-instruction`, 0 of 30 lost).
- **A run returns for its own reasons.** The reply's first line enumerates
  them ("data sent", "menu opening"); without `Breakpoint fired` it was not
  a checkpoint. Pass `no-stop-on-data` (the client does) so a stray key
  event cannot end a run early, and always give `run` a timeout: an
  unanswered run is indistinguishable from a hung emulator.
- **Frames come from a checkpoint, not from a counter.** `rpc.frames(n)`
  arms slot 100 (reserved for this) with `TSTATESP>n*69888` after
  `reset-tstates-partial`, runs, and checks the counter. One frame is one
  round trip: measured 69890 T-states for a 69888-T-state frame, 20 ms a
  step, 50 a second (`frame-advance`, `frames-ten`, `cheap-loop`). **Any
  other armed stopping checkpoint will end that run first** — the client
  says which one did, and the fix is `bp_disable` (or `bp_clear`) before a
  frame advance.
- **A load used to turn every checkpoint off.** The launcher passes
  `--snap-no-change-machine`, so it no longer does;
  `snapshot_load(..., rearm=True)` (the default) still re-arms as
  belt-and-braces.
- **A load does not restore where in the frame the machine was.** It lands
  at the start of a frame, so start every experiment from a load and never
  compare a live run with a loaded one (`load-keeps-frame-phase`).
- **A memory watchpoint counts only the last byte it touches.**
  `MWA=<addr>H` and `MRA=<addr>H` fire on the address line at the end of
  the instruction, so a 16-bit access is seen at its second byte, and
  watching the first byte counts nothing (`watch-store`, `watch-load`).
- **A load resumes the machine** unless it was already in cpu-step:
  `snapshot-load` enters cpu-step, loads, and exits it again. Stop first
  (`enter_step`) to come back to the state you saved and stay there.

## Finding a game's code, and what its data is for

A control file is traced by nothing, so the split between code and data is
yours to build (`kit/skills/core/50-coverage`, "When the disassembler does
not follow control flow"). The emulator gives three records of what the
game did, and `kit/spectrum/codemap.py` turns the first into a check.

- **What executed.** `cpu-code-coverage enabled yes` while the machine
  runs, play, then `cpu-code-coverage get`: every address returned is the
  first byte of an instruction that ran, in hex with no prefix. Save it to
  a file in `work/`.
- **What was read and what was written.** `get-visualmem-read-dump compact`
  and `get-visualmem-written-dump compact` list every address read and
  written since the last dump (the dump clears the record, so call each
  once before the session to empty it; `get-visualmem-opcode-dump` is the
  same for fetched opcodes). A reply line is `7C74H 12 3 255 ...`, an
  address and the values for it and the addresses after it. Use the
  values as flags only: they are not counts. Reads include the bytes of
  the instructions themselves, so subtract every executed instruction's
  bytes; what is left of the read record is data the game consulted, and
  the written record is its variables and buffers. Data that play neither
  read nor wrote is unused, or the session did not reach it: say which you
  can show.
- **The check.** `python3 kit/spectrum/codemap.py <game> work/entry.sna
  --entry <hand-over address> --map work/executed.txt` joins a static trace
  with the executed list and reports every byte of code that `symbols.json`
  types as data, and every `Code` block neither source reached. Run it
  before the annotation starts and after every merge. On the first game the
  executed list alone gave 21,551 bytes of code and the trace from the
  hand-over 23,132; the two together, 23,672; the last 475 bytes were two
  handlers named only by words stored in data, and a routine nothing calls
  with the code it jumps into, given as `--entry` once the code that reads
  those words had been read (3 October 2026).

**Record sessions that replay.** A session timed by the wall clock presses
its keys at different moments on each run. Stop the machine and count in
frames: `set_input`, `frames(n)`, `release_input`, `frames(n)`. Every run
from the same snapshot then does the same thing, a menu that ignored a
short press ignores it every time, and the session is a route someone else
can replay. A key held for 10 frames and released for 20 was read by every
menu of the first game; 6 frames was not always enough. `--emulatorspeed
800` at launch makes frame stepping about five times real speed
(measured: 250 frames in 0.94 s).

**Step a game that ignores the display by its own loop.** A game that
runs with interrupts off takes as long over a frame as the frame needs,
so a key held for ten display frames lands on a different number of the
game's frames each time. Put a stopping checkpoint on the first
instruction of the game's frame loop (`bp_set(1, "PC=<addr>H")`), and
step one game frame with `set_input(...)` then `run(limit=N)`, N a few
times the instructions a frame takes. Check `PC` after each run: the game
leaves its loop when the player dies, halts or finishes, the run then
stops on the limit somewhere else, and a run with no limit would never
come back. Poke and read variables only while stopped at the checkpoint,
which is the same point of every frame.

Save these records to the game's `work/` and treat them as a cache: the
committed `symbols.json` is what counts.

### The map, as this emulator writes it

`cpu-code-coverage get` returns space-separated hex addresses - instruction
starts - and the control-file tools want **one address per line**, so a
one-liner converts it:

```sh
tr ' ' '\n' < work/executed.txt | sed 's/^/\$/' > work/executed.map
```

What to do with the map is in `kit/skills/spectrum/tool-skoolkit`, "The
first control file, from an execution map": `sna2ctl.py -m`, the traps in
its output, and why one sweep is not enough. `kit/spectrum/codemap.py`
("The check", above) reads `cpu-code-coverage get`'s output as it is.

## Input

Two paths, and they are not interchangeable:

- **`set_input("efffffffffffffff00")`** — the nine hex bytes. Row 0 is
  `$FEFE` (`V C X Z CapsShift`), row 1 `$FDFE` (`G F D S A`), and so on down
  to row 7 `$7FFE` (`B N M Sym Space`); a `0` bit is a pressed key. The
  ninth byte is the joystick, `1` bits pressed, and it means whatever
  `--joystickemulated` says: the default `Cursor&Shift` presses those keys
  on the matrix (right = `8` + Caps Shift), `Kempston` puts it on port
  `$1F` instead. This path lands **immediately**, while the machine is
  stopped, and it is the one to use for frame stepping.
- **`key_event(<number>, press)`** / `type_ascii` — host keys, pumped by
  the running machine. Numbers are ZEsarUX's own: letters and digits are
  their lowercase ASCII codes (`v` = 118, `c` = 99, `space` = 32,
  `0` = 48), measured; Enter, Escape and the rest are other numbers the
  kit has not measured — do not guess one, use `set_input` instead.
  Sent while the machine is stopped, they are queued and never processed.
  `type_ascii` (`send-keys-ascii`) did not reach the machine at all on the
  13.0 release with `--vo null` — see `workarounds.md`.

Verify input the way `check-emulator` does, in the game's own terms: read
the port with `evaluate IN(...)` to see it before any instruction runs, and
read a variable the game writes to see the game itself react
(`input-lands`, `input-seen`, `input-released`, `input-joystick`).

## Snapshots

`snapshot-save` decides the format from the file name. `work/<slug>.sna`
for a 48K machine is **49179 bytes**: the 27-byte header then
`$4000-$FFFF`. There is no PC in the header — the PC is pushed on the
stack, so the word at the header's SP is the PC and the SP is two less
than the live one (verified; `snapshot-header`). `kit/spectrum/snapshot.py`
reads it, and refuses the sizes it does not understand.

The kit saves to `tools/zesarux-home/snapshots/` and copies the file into
the game's `work/`. A `.sna` is not committed anywhere: it holds the game.

## What costs a run time

- **Writes on a running machine do not take.** `write-memory` against a
  running machine answers `command> ` and changes nothing; enter cpu-step
  (or stop at a checkpoint) first. The client reads the bytes back and
  raises rather than letting a poke silently fail.
- **`$8000` is not an address, `8000H` is.** The expression parser takes
  `H`, `%` and decimal, not `$`.
- **`get-tstates` is not the frame position.** Read the partial counter
  for anything measured over time.
- **`run` is refused outside cpu-step mode** — including right after a
  `snapshot-load` that resumed the machine.
- **Stopping can be refused, and the refusal is a line of text.** For a
  moment after the machine leaves cpu-step (measured: up to 0.7 s on 13.0,
  3 October 2026), `enter-cpu-step`, `snapshot-load` and `smartload`
  answer `Error. Can not enter cpu step mode. You can try closing the
  menu`, with no menu anywhere, and the load then loads nothing. The
  client asks again and raises if it is still refused (`Rpc.entering`),
  and `enter_step` checks the prompt says `cpu-step` before it returns. A
  client of your own must do both: a poke into a machine that never
  stopped is overwritten by the game, and reads as a failed experiment.
- **A file that is not there gets no error.** `snapshot-load` and
  `smartload` of a missing file, and `save-screen` into a missing folder,
  answer an empty reply and do nothing. The client checks the path first
  (and after a save), so a wrong path raises instead of leaving the
  previous state running under a script that thinks it loaded.
- **Menus cannot open** with `--vo null` ("this video driver does not
  support menu"), which is a reason the kit never arms a stopping
  checkpoint and then leaves the machine running: with nothing driving the
  run loop, the machine only stops at its own next opportunity.
- **Warp cannot be switched over ZRCP.** It is `--emulatorspeed` at
  launch; ZRCP reads it (`get-cpu-turbo-speed`) and has no setter, so it
  takes a restart (`warp`).
- **Gatekeeper rejects the macOS bundle** (it is ad-hoc signed, `spctl`
  says rejected). Never launch it with Finder or `open`; the launcher
  execs the binary inside `tools/zesarux/zesarux.app/Contents/MacOS/`.

## After any new release

```
python3 kit/scripts/tools.py --platform spectrum stop
python3 kit/scripts/tools.py --platform spectrum get-zesarux     # what this machine can have
python3 kit/scripts/tools.py --platform spectrum check-emulator  # 45 named checks, about 20 s
```

`check-emulator`'s names are the ones `workarounds.md` is indexed by, and
`kit/spectrum/INSTALL.md` carries the measured table per release.
