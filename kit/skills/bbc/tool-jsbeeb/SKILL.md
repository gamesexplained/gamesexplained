---
name: tool-jsbeeb
description: How to drive jsbeeb 2.4.0, the BBC Micro emulator the kit uses, through the kit's own server. Start it, connect, the commands, runs and checkpoints, frames, keys and the joystick, snapshots, discs and tapes, the screen, the text and the sound chip, and the traps measured on the release. What to do when a check fails is in workarounds.md, beside this file.
---

# jsbeeb in the kit's server

jsbeeb is Matt Godbolt's open-source BBC Micro emulator, written in
JavaScript (GPL-3.0-or-later, `github.com/mattgodbolt/jsbeeb`, published on
npm as `jsbeeb`). The kit runs its machine inside a Node process of its own,
`kit/bbc/jsbeeb_server.mjs`, which holds the machine and answers on a local
socket; `kit/bbc/jsbeeb.py` is the client. jsbeeb's web page and its MCP
server are not used. The protocol is the kit's, so another emulator can serve
it without a change to a script.

```
python3 kit/scripts/tools.py --platform bbc jsbeeb    # start it: it boots to BASIC and waits on 127.0.0.1:6845
python3 kit/scripts/tools.py --platform bbc status    # the build, the machine, running or stopped, PC
python3 kit/scripts/tools.py --platform bbc stop      # stop it
```

`--platform bbc` is needed when another platform's launcher is there too;
`jsbeeb` and `get-jsbeeb` are the BBC's alone. The machine is a Model B with
the 8271 disc controller and DFS 1.2 (jsbeeb's `B-DFS1.2`); `--model Master`
starts a Master 128. `--port N` starts another machine beside the first, for
a check that must not disturb a game's (`kit/bbc/tools.py`).

There is no window and no sound. The screen is saved as a PNG, the text the
MOS printed is read as text, and the sound chip as a log of the bytes written
to it. The machine runs only when asked, and then as fast as the host goes:
500 frames, ten seconds of the machine's time, took 1.18 s with nothing
hooked, 8.5 times real time (a four-core cloud container, Node 22.22.0, 13
October 2026).

## Connecting

```python
import sys; sys.path.insert(0, "kit/bbc")
from jsbeeb import connect
m = connect()                       # 127.0.0.1:6845, or KIT_JSBEEB_PORT
m.boot()                            # a hard reset, run to the BASIC prompt
m.type('PRINT "HELLO"\n')           # typed as a person would: "\n" is RETURN
print(m.output()["text"])           # what the MOS printed since the last call
```

One JSON object a line, both ways: `{"id": 7, "cmd": "read", "address":
8192}` and back `{"id": 7, "ok": true, ...}`, or `"ok": false` with
`"error"`. A connection is answered in order, one call at a time, so a run
holds its connection until it stops. A second connection is answered
meanwhile: the machine runs in slices of 100,000 cycles (50 ms of its time)
and every call that arrives during a run is served between two slices,
between two instructions. That is how `stop` reaches a run, and how a
script reads counts and memory while the game plays (`count-while-running`,
`stop-while-running`); the client's `stop()` opens the second connection
itself.

From the shell, one call each, which is the agent's own transport:

```
python3 kit/bbc/jsbeeb.py --list
python3 kit/bbc/jsbeeb.py read '{"address": "&2000", "length": 64}'
python3 kit/bbc/jsbeeb.py run '{"frames": 50}'
python3 kit/bbc/jsbeeb.py chips
```

An address is a number or a string: `"&2000"`, `"$2000"`, `"0x2000"` and
`"2000"` are all hexadecimal.

## The commands

| What | Command and arguments | Notes |
|---|---|---|
| Who answers | `hello` | the server, its protocol, jsbeeb's version, the model, Node's version, the commands |
| State | `status` | running or not, PC, the cycle and frame counts, checkpoints, the media in the drives, the keys held |
| To BASIC | `boot` (`seconds`, 30) | a hard reset, then run until the MOS waits for a key at the prompt; returns what it printed |
| Boot the disc | `autoboot` (`frames`, 100) | SHIFT held through a hard reset, as SHIFT and BREAK: the disc in drive 0 runs its `!BOOT`. SHIFT is let go after `frames` |
| Reset | `reset` (`hard`, true) | does not run the machine |
| Run | `run` (`cycles`, `frames`, `seconds`, `until`, `max_cycles`) | returns `reason` (`checkpoint`, `until`, `frames`, `cycles`, `stopped`, `timeout`), `pc`, `ran`, `frames`, `cycles`, `hit` and the registers |
| Step | `step` (`count`, 1) | the same, with `next`, the instruction at the new PC |
| Stop a run | `stop` | from a second connection; the run's own reply then says `stopped` |
| Memory | `read` (`address`, `length` up to 65536, `bank`, `shadow`) | the client's `read()` returns bytes. `bank` reads sideways bank 0 to 15 at &8000-&BFFF and puts the paging back; `shadow` is the Master's shadow RAM |
| Memory | `write` (`address`, `data` base64 or `bytes`, `bank`, `shadow`, `io`) | RAM only: a page of ROM is refused, and an I/O address needs `"io": true`, which writes to the chip as a store would |
| Registers | `registers`, `set-registers` (`pc`, `a`, `x`, `y`, `s`, `p`) | `cycles` is the machine's cycle count, which a load or `back` puts back too |
| Chips | `chips` | both VIAs (the System VIA with `latch`, the addressable latch), the CRTC's R0-R17, the video ULA's control and palette, the sound chip's registers and volumes, ROMSEL, and ACCCON on a Master |
| Disassemble | `disassemble` (`address`, `count`) | jsbeeb's own disassembler |
| Checkpoints | `checkpoint` (`address`, `end`, `kind`, `stop`, `ignore`, `temporary`, `when`, `fetch`) | returns `{"checkpoint": n}`; below |
| | `checkpoints`, `delete` (`checkpoint` or `all`), `zero` (`checkpoint`, or all) | each with `hits` and `last`, the instruction that hit it |
| Keys | `key` (`key`, `down`), `keys`, `release-keys` | below |
| Text | `type` (`text`) | runs the machine until the last key is up |
| Joystick | `joystick` (`channels`, `fire1`, `fire2`) | below |
| Discs, tapes | `disc` (`path` or `ref`, `drive`), `tape` (`path`) | below |
| Snapshots | `save` (`path`), `load` (`path`), `keep` and `back` (`name`) | below |
| Screen | `screenshot` (`path`, `full`) | the last whole frame as a PNG, without the border; `full` is all 1024 by 625 of jsbeeb's frame |
| Text out | `output` | the characters sent through the MOS's write vector since the last call, the screen's text pieced together from them, and every byte sent as `codes` |
| Sound | `sound` (`action` start or stop, `path`) | every write to the SN76489 with the cycle it landed on |
| What ran | `codemap` (`action` start, read, zap or stop) | `[address, length, count]` for each address an instruction started at |
| Quit | `quit` | the server exits |

## Running, and where a run stops

The machine runs only inside `run`, `step`, `boot`, `autoboot` and `type`.
Between them it is stopped, and nothing moves while you read or write.

- **A frame** is jsbeeb's frame count, which steps once a vertical sync:
  `run {"frames": 1}` returns at the next one. Ten one-frame advances with a
  key held moved the test program one step a frame (`frame-step`), about 5
  ms a step with its reads.
- **The first instruction** of a run or a step is counted by every
  checkpoint on it but never stopped on. A machine stopped at a checkpoint
  therefore goes on past it with a plain `run`, as VICE's does on the C64;
  a `step` from there carries out exactly the instruction it stopped on.
- **`until`** stops when PC reaches the address, the first instruction
  aside.
- **Limits.** A `frames` run gives up after 200,000 cycles a frame (a frame
  is 40,000), and a run with no limit of its own after a minute of the
  machine's time; both return `timeout`.
- **`set-registers` with `pc`** makes the next run start at that address,
  and the instruction there runs; it is not skipped as if it had been seen.

Set up, then run, then read: the stop is exact. `exact-stop` checks that a
stopping checkpoint stops before its own instruction runs, and
`unpaced-calls` ran a hundred runs back to back, each stopping on its
checkpoint, at 716 calls a second.

## Checkpoints

A checkpoint has a `kind`, `exec`, `read` or `write`, and an address or a
range (`end`). It stops the run unless `"stop": false`, in which case it
only counts. `ignore: n` lets the first n matches count without stopping,
`temporary` deletes it once it has stopped the machine, and `when` adds
conditions: register values for any kind (`{"a": 5}`, `{"x": 0}`), and for a
read or a write `{"value": n}`, the byte moved.

- Checkpoints are the server's, not the machine's, so a `load` or `back`
  leaves them as they are and they go on counting
  (`checkpoints-survive-load`).
- A read checkpoint counts the bytes an instruction reads as data, not the
  fetch of its own opcode and operand; `"fetch": true` counts those too.
  `last` says which instruction hit it, and for a read or a write the
  address and the value.
- An `exec` checkpoint costs little. A `read` or a `write` checkpoint slows
  every access the CPU makes while one exists, so delete them when the
  measurement is done.

## The I/O pages

A `read` of &FC00-&FEFF gives &FF for every byte and sets `io` in the reply:
it reads memory without touching the bus, because a read through it has
effects. Reading a VIA's port or its timer clears interrupt flags, and the
program would then miss an interrupt the agent caused. `chips` reads the
registers from the chips' own fields instead, with no effect on them. A
VIA's timer counters there are as of the chip's last update, `stale`
cycles ago. A write with `"io": true` goes through the bus on purpose, side
effects and all.

## Keys

`key` presses a key and leaves it down, through stops and runs, until the
same call with `"down": false` or `release-keys`. A key is jsbeeb's name for
it (`Z`, `SHIFT`, `RETURN`, `SPACE`, `CTRL`, `F0`, `K1` for the 1 key), the
character on it, its place in the keyboard matrix as `[column, row]`, or
the MOS's internal key number (&61 is Z). A key pressed while the machine
is stopped is down when the program next reads the matrix (`input-lands`).

`type` is for text: it presses each key in turn, with SHIFT and CAPS LOCK as
needed, running the machine until the last is up. `"\n"` is RETURN; `"\r"`
is no key and is left out. `key` is refused while `type` is still typing.

## The joystick

`joystick` sets what each of the ADC's four channels converts to, a list
of up to four values from 0 to 65535 (`null` puts a channel back to
jsbeeb's own, the centre, &8000), and the two fire buttons, which the
System VIA reads on port B. They hold until changed, and a snapshot does
not keep them. Measured on 13 October 2026 with BASIC: channel 0 set to
&1230 read as `ADVAL(1)` = 4656, an unset channel read 32768, and fire
button 1 set bit 0 of `ADVAL(0)`. Which way a channel runs for left, right,
up and down is in `kit/skills/bbc/bbc-reference`.

## Discs and tapes

`disc` puts an image in drive 0 or 1. jsbeeb picks the format by the file's
extension: `.ssd`, `.dsd`, `.adl`, `.adf` and `.adm`, and `.hfe` for a flux
image of a protected original; anything else is read as `.ssd`. A
40-track image in the 80-track drive is laid out for it, and the reply says
so (`tracks40`). The disc is the contributor's own file, in the game's
`work/` folder.

`ref` instead of `path` makes jsbeeb fetch the image itself: a name in one
of the archives it knows (`sth:` for Stairway to Hell, `bitshifters:`, `hfe:`),
`github:owner/repo/path`, or a URL. That is a download, so it needs the
yes that `kit/START.md` asks for, as any download does.

`autoboot` boots drive 0's disc. A tape (`.uef`) goes in with `tape`; then
`type('*TAPE\n')` and `type('CHAIN""\n')` or `*RUN`, as on the machine. The
tape plays at the machine's own speed, so it takes as many frames as on a
real BBC, which the server runs faster than real time.

## Snapshots

```python
m.save("games/bbc/<slug>/work/play.json.gz")     # anywhere inside the repository
m.load("games/bbc/<slug>/work/play.json.gz")
m.keep(); ...; m.back()                          # a whole state in memory, 1.2 ms a pair
```

- **The format** is jsbeeb's own, gzipped JSON, with two additions: the
  sideways RAM banks, which jsbeeb's save leaves out and its load reads,
  and, under `kit`, where each disc and tape came from. A snapshot names
  its discs rather than holding them, except for the tracks the game has
  written since the disc went in, which jsbeeb keeps in the snapshot and
  lays back over the disc on a load. `kit/bbc/snapshot.py` reads it for
  `listing.py`: main RAM, and at &8000-&BFFF the selected bank when it is
  sideways RAM. The MOS and the paged ROMs are not in it.
- **A save** can be taken while a run is in progress, between two slices
  (`save-running`), and **a load** leaves the machine stopped at the saved
  state, cycle count included (`load-paused`). A load continues exactly as
  the machine that saved would have, whether it was saved stopped or
  running, and three loads of the same file come out the same, in this
  server and after a restart (`determinism-*`, `load-continues-exactly`).
- **The discs** come back from where the snapshot says they were, so a
  snapshot whose disc has moved fails to load, naming the path. The file
  itself is never written: what the game wrote lives in the snapshot.
- **The model** must match: a Master's snapshot needs a server started with
  `--model Master`, and the error says so.
- **Other emulators' saves** load too: B-em's and beebjit's (`BEMSNAP`)
  and BeebEm's. `kit/bbc/snapshot.py` reads only jsbeeb's format, so save
  one again from the server before the listing reads it.
- **Every path is inside the repository.** The server refuses to write
  anywhere else. A snapshot holds the game's memory whole, so it stays in
  the game's `work/` folder, which is gitignored, or in
  `tools/bbc-home/snapshots` for scratch, and is never committed
  (`kit/scripts/check_binaries.py` refuses one).

## The screen, the text and the sound

- `screenshot` writes the last whole frame, the picture without the
  border, as an RGB PNG. The kit writes the PNG itself, so jsbeeb's own
  `screenshot()` and the native package it needs are not used. The site
  draws a screen from memory with `site/lib/bbc.js` (`BBC.render`, modes
  0 to 6), and `python3 kit/bbc/frame.py test` compares the two at every
  pixel: on 13 October 2026 nothing differed, in any mode or on a screen
  the CRTC had scrolled. Run it, on a server of its own, after a change
  to `bbc.js`.
- `output` returns each character the program sent through WRCHV, the
  MOS's write vector, since the last call (jsbeeb watches for the routine
  the vector points to), with where on the screen it went, and the text
  pieced together from them, and `codes`, every byte as it went to the
  vector, control codes and top-bit bytes included, which the text
  leaves out. A game that writes to the screen memory itself prints
  nothing here: read its screen with `screenshot`.
- `sound` with `start`, then `stop`, records every byte written to the
  SN76489 with the CPU cycle it landed on, in the format
  `kit-sn76489-writes` (`clock` is the CPU's 2,000,000 cycles a second). That
  log is what a page's tune player replays. A game that leaves the sound to
  the MOS writes the chip from the MOS's interrupt code, and the log has
  those writes as well.

## What ran

`codemap` with `start` counts every address an instruction starts at, until
`stop`; `read` returns `[address, length, count]` for each, and `zap` clears
the counts. It separates code from data the way a flow-following
disassembler cannot, for code reached through a table or a vector.
Measured on 13 October 2026: 100 frames took 0.27 s, and 0.34 s recording.
Clear and restart it after a `load`, since a load changes what ran.

## Traps

- **Node.** jsbeeb 2.4.0's package asks for Node 24.15 or later, and npm
  warns `EBADENGINE` on an older one. Everything the kit uses passed on Node
  22.22.0 (`kit/bbc/INSTALL.md`); the warning is not a failure.
- **`boot` resets the machine.** Use it to start over, never to get back to
  a game: `load` or `back` does that.
- **A run with no limit ends after a minute of the machine's time**, with
  `timeout`. Give `frames` or `cycles`, or a checkpoint, for a longer one.
- **The I/O pages read as &FF.** That is the server not touching the chips;
  `chips` has their registers.
- **Counting frames in a test program.** A handler on IRQ1V that reads the
  System VIA's flags itself misses a vertical sync about once in a hundred:
  when one arrives while the handler is passing another interrupt to the
  MOS, the MOS deals with both. Count the MOS's vertical sync event
  instead, as `kit/bbc/check_emulator.py` does.
