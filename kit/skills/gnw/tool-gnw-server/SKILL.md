---
name: tool-gnw-server
description: How to drive the kit's Game & Watch server, kit/gnw/gnw_server.mjs, the kit's own Sharp SM5A behind a local socket - loading a ROM or MAME's ROM set, wiring the buttons, running and stepping exactly, checkpoints that count or stop, reading and writing the data memory, the screen's lit segments, snapshots, and the traps. Read it before the first command to the machine.
---

# The kit's Game & Watch server

The machine is the kit's model of the Sharp SM5A, `kit/gnw/sm5a.js`,
held to MAME 0.289's instruction for instruction by
`kit/gnw/test_machine.js`. The server holds one machine and answers on
127.0.0.1:6858: start it with `python3 kit/scripts/tools.py gnw`, stop it
with `tools.py stop`. `kit/gnw/gnw.py` is the client, a method per command:

```python
import sys; sys.path.insert(0, "kit/gnw")
from gnw import connect
m = connect()
m.rom("games/gnw/<slug>/work/<set>.zip")
```

The machine runs only inside `run` and `step`, in slices of a quarter of
a second of its time; between two slices it answers every other call, so
a second connection can read it, save it or `stop` it, and the stop
falls between two instructions. A minute of the machine's time takes the
server about 50 ms.

## The commands

Each is `{"id": n, "cmd": ..., arguments}`; the reply carries the id and
`"ok"`. Addresses of the program are the **physical** program counter,
CB, page and PL as MAME writes them (`0:F:00` is $3C0), not the listing's
logical address; `kit/cpu/sm5a.py` converts (`physical`, `logical`).

| Command | Arguments | What it does |
|---|---|---|
| `hello` | | the protocol, the machine, the ROM loaded |
| `rom` | `path` | loads the chip's ROM: a file of 1,856 bytes, or MAME's ROM set (a zip), from which it takes the one file of that size. The machine is powered on |
| `wiring` | `buttons`, `low` | names the buttons: `{"game_a": "R4.K3", "left": "beta", "right": "alpha", "acl": "acl"}`. A pin is `R2.K1` to `R4.K4` (K of the row an R pin selects), `GND.K1` to `GND.K4` (a row wired to ground, read always), `alpha`, `beta` or `acl` (the reset button). `low` lists `alpha` and `beta` when the unit wires them active low. Take it from the unit's MAME driver block (`gnw-reference`, "The buttons") |
| `power`, `reset` | | power on (the data memory cleared, the divider at 0), or ACL |
| `status` | | running or not, the program counter, the cycles and clocks since power on, asleep or not |
| `registers` | | every register by name: `acc`, `bl`, `bm`, `c`, `cb`, `su`, `stack`, `rsub`, `div`, `gamma`, `bp`, `r`, `r_out`, `mx`, `w`, `w_prime`, `alpha`, `beta`, `k` |
| `read` | `space`, `start`, `length` | `data`: the cells, one a byte, mirrors resolved; `rom`: the ROM in its own order |
| `write` | `start`, `bytes` | data cells, hex, a cell a byte |
| `press` | `button`, `down` | holds a button (`down: false` lets it go); held until let go. `acl` resets at once |
| `release` | | lets every button go |
| `run` | `cycles` or `seconds` | runs until the limit, a stopping checkpoint, or `stop`; with neither, an hour of the machine's time |
| `step` | `count` | that many instructions (a cycle asleep counts as one) |
| `stop` | | ends a run, between two instructions |
| `checkpoint` | `pc`, `stop`, `ignore` | on a physical program counter: counts every time the instruction there runs, and with `stop` (the default) stops before it once it has been passed `ignore` times. Its number is `checkpoint` in the reply |
| `delete` | `checkpoint` | removes one |
| `checkpoints` | | each with its `hits` |
| `save`, `load` | `name` or `path` | a snapshot: a bare name lands in `tools/gnw-home/snapshots/<name>.gnw.json.gz`. A load leaves the machine stopped, at the state saved |
| `screen` | | `bp` and `lit`, the segments lit, as `o.b.h` names (`gnw-reference`, "The LCD") |

## Snapshots

A snapshot is gzipped JSON, `{"format": "kit-gnw-snapshot", "rom": {...},
"wiring": ..., "held": ..., "state": ...}`, `state` being the machine's
whole state (`sm5a.js`, `save`). It holds the ROM, so it is a binary:
save it into the game's `work/`, which `check_binaries.py` leaves alone
and nothing commits. `kit/gnw/snapshot.py` reads it for the listing.

## Traps

- **A checkpoint on a skipped instruction does not count.** The chip
  runs a skipped instruction as a no-operation, and MAME's debugger does
  not stop there either; to see the skip, put the checkpoint on the test
  before it.
- **Time is cycles, not frames.** There is no frame. `run(seconds=...)` is
  16,384 cycles a second; a game's loop is timed by its own instructions
  and the 1 Hz flag.
- **The first instruction of a run is never stopped on**, so a run from a
  checkpoint goes on past it, as on the other platforms.
- **A press reaches `KTA` only through the row R selects.** A press shows
  in `k` of `registers` only while the game has that row selected; read
  `r_out` to see which. Left and right (`alpha`, `beta`) are read always.
