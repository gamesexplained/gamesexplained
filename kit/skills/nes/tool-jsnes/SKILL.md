---
name: tool-jsnes
description: How to drive jsnes 2.1.0, the NES emulator the kit uses, through the kit's own server. Start it, put in a cartridge, connect, the commands, runs and checkpoints, frames, the controllers, snapshots, the PPU's memory and the cartridge's banks, the screen and the APU, where the server differs from jsnes, and the traps measured on the release. What to do when a check fails is in workarounds.md, beside this file.
---

# jsnes in the kit's server

jsnes is Ben Firshman's open-source NES emulator, written in JavaScript
(Apache-2.0, `github.com/bfirsh/jsnes`, published on npm as `jsnes`). The
kit runs its machine inside a Node process of its own,
`kit/nes/jsnes_server.mjs`, which holds the machine and answers on a local
socket; `kit/nes/jsnes.py` is the client. jsnes's web page is not used. The
protocol is the BBC Micro's server's (`kit/skills/bbc/tool-jsbeeb`), with
the NES's own commands for the cartridge and the controllers.

```
python3 kit/scripts/tools.py jsnes                    # start it, with no cartridge, on 127.0.0.1:6855
python3 kit/scripts/tools.py --platform nes status    # the build, the cartridge, running or stopped, PC
python3 kit/scripts/tools.py --platform nes stop      # stop it
```

`--platform nes` is needed when another platform's launcher is there too;
`jsnes` and `get-jsnes` are the NES's alone. The machine is an NTSC NES.
`--port N` starts another machine beside the first, for a check that must
not disturb a game's (`kit/nes/tools.py`).

There is no window and no sound. The screen is saved as a PNG and the APU as
a log of the writes to its registers. The machine runs only when asked, and
then as fast as the host goes: 600 frames, ten seconds of the machine's
time, took 0.55 to 0.60 s with nothing hooked, 17 to 18 times real time
(macOS on Apple silicon, Node 24.18.0, 17 October 2026).

## Connecting, and the cartridge

```python
import sys; sys.path.insert(0, "kit/nes")
from jsnes import connect
m = connect()                                        # 127.0.0.1:6855, or KIT_JSNES_PORT
c = m.cartridge("games/nes/<slug>/work/<game>.nes")  # put it in and power on
print(c["cartridge"])                                # mapper, PRG and CHR sizes, mirroring, SHA-1, CRC32
m.frames(120)                                        # two seconds of the machine's time
```

The server starts with no cartridge, and every command that needs the
machine says so until one is in. `cartridge` reads an iNES file from a path
(the contributor's image, in the game's gitignored `work/`) or takes its
bytes, base64, as `data`. Its reply's `crc32_body` is the CRC32 of the PRG
and CHR without the header, the figure NesCartDB lists for each release
(`nes-reference`, "Where to read about a game first"). `reset` with
`hard: false` is the console's reset button; the default is power off and
on again, which puts the cartridge in afresh.

One JSON object a line, both ways: `{"id": 7, "cmd": "read", "address":
768}` and back `{"id": 7, "ok": true, ...}`, or `"ok": false` with
`"error"`. A connection is answered in order, one call at a time, so a run
holds its connection until it stops. A second connection is answered
meanwhile: the machine runs in slices of 30,000 cycles, about a frame, and
every call that arrives during a run is served between two slices, between
two instructions. That is how `stop` reaches a run, and how a script reads
counts and memory while the game plays; the client's `stop()` opens the
second connection itself.

From the shell, one call each, which is the agent's own transport:

```
python3 kit/nes/jsnes.py --list
python3 kit/nes/jsnes.py cartridge '{"path": "games/nes/<slug>/work/<game>.nes"}'
python3 kit/nes/jsnes.py read '{"address": "$0300", "length": 64}'
python3 kit/nes/jsnes.py run '{"frames": 60}'
```

## The commands

| Command | Arguments | What it does |
|---|---|---|
| `hello` | | the server, its protocol, jsnes's version, Node's, the commands |
| `status` | | running or not, the cartridge, PC, cycles, frames, checkpoints, the buttons held |
| `cartridge` | `path` or `data`, `name` | put in a cartridge and power on |
| `reset` | `hard` | power on again (the default), or the reset button |
| `run` | `cycles`, `frames`, `until`, `seconds`, `max_cycles` | run to the limit, a stopping checkpoint, or `stop` |
| `step` | `count` | carry out that many instructions; the reply has the next one |
| `stop` | | end a run, from a second connection |
| `read` | `address`, `length`, `space` | bytes from `cpu` (the default), `ppu`, `oam`, `prg` or `chr` |
| `write` | `address`, `data`, `space`, `io`, `rom` | bytes into the same spaces |
| `registers`, `set-registers` | `pc`, `a`, `x`, `y`, `s`, `p` | the CPU's registers and the cycle count |
| `disassemble` | `address`, `count` | instructions, with the kit's names for the 256 opcodes |
| `chips` | | the PPU's control, mask and status, scanline and dot, VRAM address, palette; the controllers; the mapper |
| `checkpoint` | `address`, `end`, `kind`, `stop`, `ignore`, `temporary`, `when`, `fetch` | a checkpoint; returns its number |
| `checkpoints`, `delete`, `zero` | `checkpoint`, `all` | list them with their hits, delete, zero the counts |
| `button` | `button` (a name or a list), `down`, `controller` | press or release: `a`, `b`, `select`, `start`, `up`, `down`, `left`, `right` |
| `buttons`, `release-buttons` | | what is held; let go of everything |
| `save`, `load` | `path`, `cartridge` | a snapshot to a file and back |
| `keep`, `back` | `name` | a snapshot in the server's memory, for rollback |
| `screenshot` | `path` | the last whole frame, 256 by 240, as a PNG |
| `sound` | `action` (`start`, `stop`), `path` | record every write to the APU's registers |
| `codemap` | `action` (`start`, `read`, `zap`, `stop`) | every address an instruction started at, its length and count |
| `quit` | | end the server's process; `tools.py --platform nes stop` is the usual way |

## Running, and where a run stops

- A run's reply gives `reason`: `cycles`, `frames`, `until`, `checkpoint`,
  `step`, `stopped` (a `stop` from another connection) or `timeout`, when a
  run with no limit of its own reached its backstop, a minute of the
  machine's time.
- **The first instruction of a run or a step is counted but never stopped
  on**, so a machine stopped at a checkpoint goes on past it. An instruction
  a checkpoint stopped before was counted then, and is not counted again
  when the run goes on.
- An exec checkpoint stops **before** its instruction runs. A read or write
  checkpoint stops **after** the instruction that made the access, with
  `hit.pc` naming it.
- `stop` and the end of a slice always land between two instructions, so a
  register set after a stop holds (`pause-at-instruction`).

## Frames

A frame ends where jsnes ends one: at the **start of vertical blank**,
scanline 241, the moment the PPU raises its NMI (`nes-reference`, "The
frame"). `frames(1)` stops after the instruction during which that
happened, so the next run begins with the game's NMI handler, and a game
that runs its logic once an NMI does one pass per `frames(1)`
(`frame-step`). The server counts frames from the moment the cartridge went
in; a snapshot keeps the count.

## Checkpoints

- `kind`: `exec` on the instruction's first byte, `read` and `write` on any
  access by the CPU. `end` makes it a range.
- `stop: false` counts without stopping; the hit count is the measurement
  (`counting-checkpoint`). `ignore: n` lets n hits pass before a stop.
- `when` narrows a checkpoint to exact values: `{"a": 16}`, `{"x": 0}`, or
  `{"value": 3}` for the byte read or written.
- A read checkpoint leaves out the CPU fetching its own instruction's bytes
  unless `fetch: true`.
- **A read-modify-write is one write.** `INC`, `DEC`, `ASL`, `LSR`, `ROL`,
  `ROR` and the undocumented ones write their operand twice on the bus, the
  old value and then the new, as the 6502 does; jsnes makes both writes. A
  write checkpoint counts the instruction once, with the value it left
  (`watch-store`).
- An interrupt's three pushes are writes to the stack page and are seen by a
  write checkpoint there.
- **The sprite DMA is not seen.** A write to `$4014` copies a page to OAM
  inside the PPU (jsnes, src/ppu/index.js, sramDMA), not through the CPU's
  reads, so a read checkpoint on `$0200-$02FF` misses it. Put a write
  checkpoint on `$4014` instead: the value is the page.
- Checkpoints are the server's: a load or `back` never touches them.

## Memory: the five spaces

| `space` | What | Range |
|---|---|---|
| `cpu` | the CPU's view: RAM and its mirrors, the cartridge's RAM, the PRG banks the mapper has selected | `$0000-$FFFF` |
| `ppu` | the PPU's view: pattern tables, the four nametables through the mirroring, the palettes | `$0000-$3FFF` |
| `oam` | the sprite table inside the PPU | `$00-$FF` |
| `prg` | the cartridge's PRG ROM by its offset in the image after the header, every bank | the PRG's size |
| `chr` | the cartridge's CHR ROM the same way | the CHR's size |

- In `cpu`, **`$2000-$401F` read as 0 and the reply is flagged `io`**: a
  read through the bus would clear the PPU's vertical blank flag, move the
  `$2006` toggle on, or shift a controller's report. `chips` gives the
  state without touching it.
- A write to `$2000-$401F` needs `"io": true`, and is a real write to the
  chip, with its effects. A write to `$8000-$FFFF` needs `"rom": true`: it
  patches jsnes's copy of the bank in memory, and the next bank switch, or
  a load, undoes it.
- In `ppu`, a write goes through jsnes's own path, so its tile and
  nametable caches stay in step with what is drawn.
- An offset in `prg` is a byte's place in the image, `0x10 + offset` in the
  file when there is no trainer; its CPU address depends on the mapper
  (`nes-reference`, "Mappers").

## Snapshots

`save` writes gzipped JSON, `{"format": "kit-nes-snapshot", "kit": {...},
"state": ...}`, where `state` is jsnes's own `toJSON()` and `kit` holds the
cartridge's description, the frame count and what the server needs to go on
exactly. `kit/nes/snapshot.py` reads it: `read()` the CPU's 64 KB,
`ppu()` and `oam()` the PPU's.

- **jsnes leaves the image out** of its state; the snapshot names the
  cartridge, by path and SHA-1. A load puts that cartridge in first when
  another is in the machine, from the path saved, or from `cartridge` when
  the image has moved. A cartridge sent as bytes has no path: put it in
  again before loading.
- The CPU's array in the state still holds the selected PRG banks, so a
  snapshot embeds part of the game. It is a binary: it stays in `work/`.
- A load leaves the machine stopped at the loaded state
  (`load-paused`), and a load of a snapshot continues exactly as the
  machine that saved it (`load-continues-exactly`, three
  `determinism` checks, one across a restart of the server).
- `keep` and `back` do the same in the server's memory, 34 ms a pair on
  the measuring machine; a save and a load through a file took 15 to 18 ms.

## The screen and the APU

- `screenshot` is the last whole frame, drawn by jsnes in its own palette of
  the 64 colours. Name it as jsnes's palette on a page; no palette is the
  console's (`nes-reference`, "Palettes").
- `sound` with `start` and then `stop` records every write to `$4000-$4013`,
  `$4015` and `$4017` as `[cycle, address, value]`, with the clock, 1,789,773
  Hz. It is what the APU was sent, not a recording of its output.

## Where the server differs from jsnes

The server runs jsnes's frame loop itself, one instruction at a time,
rather than calling jsnes's `frame()`. That is what makes a stop exact, and
in three places it does what jsnes's own loop does not. Each was found by
`check-emulator` failing before the change.

- **An IRQ is taken before the instruction, not with it.** jsnes's
  `emulate()` takes a pending IRQ and carries out the handler's first
  instruction in the same call; the server takes the IRQ itself, so a
  checkpoint on the handler's first instruction stops before it
  (`exact-stop-interrupt`).
- **An IRQ's entry steps the PPU for seven cycles.** jsnes 2.1.0 counts
  seven cycles for it but steps the PPU for five, leaving out the two
  internal cycles its NMI entry does step; its own loop so runs each IRQ
  two cycles short of the picture. A program with one IRQ a frame measured
  29,782.7 cycles a frame before the change and 29,780.7 after
  (`cycle-counter`). Its reset entry steps two of seven; the server steps
  the other five.
- **A read-modify-write counts as one write**, above.

A snapshot saved by the server and run by jsnes's own `frame()` would drift
from the server's run by those two cycles an IRQ. The kit never does that.

## Traps

- **jsnes keeps the PC one less than the next instruction** (its `REG_PC`);
  the server's replies and `set-registers` use the real address.
- **RAM is the first 2 KB of jsnes's array.** It masks every access with
  `& 0x7ff` and leaves stale bytes at `$0800-$1FFF` of the array, which
  `read` and `snapshot.py` replace with the mirrors.
- A write to `$4017` from a script is the APU's frame counter, not
  controller 2: the same address is two things (`nes-reference`, "Sound").
- The buttons are held until released, through stops and runs. A load or
  `back` is the exception: the controllers are part of jsnes's state, so
  they come back as the snapshot held them, and the reply's `held` says
  which buttons that is.
