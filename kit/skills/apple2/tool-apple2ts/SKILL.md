---
name: tool-apple2ts
description: How to drive Apple2TS 3.7.0, the Apple II emulator the kit uses, through the kit's own server. Start it, connect, the commands, memory by space, runs and checkpoints, frames, keys and the game port, disks, snapshots, the screen, the text and the sound, what ran, and the traps measured on the release. What to do when a check fails is in workarounds.md, beside this file.
---

# Apple2TS in the kit's server

Apple2TS is Chris Torrence's open-source Apple II emulator, written in
TypeScript (MIT, `github.com/ct6502/apple2ts`). Its machine, the part
that runs in a web worker on its own page, runs here inside a Node
process of the kit's, `kit/apple2/apple2ts_server.mjs`, which holds the
machine and answers on a local socket; `kit/apple2/apple2ts.py` is the
client. Apple2TS's web page is not used. The protocol is the one the
kit's BBC Micro server speaks, so a script written for one reads the
other.

```
python3 kit/scripts/tools.py apple2ts                    # start it: powered on with no disk, waiting on 127.0.0.1:6502
python3 kit/scripts/tools.py --platform apple2 status    # the build, Node, running or stopped, PC
python3 kit/scripts/tools.py --platform apple2 stop      # stop it
```

`apple2ts` and `get-apple2ts` are the Apple II's alone; `status`, `stop`,
`snapshots`, `check-emulator` and `verify-footprint` need `--platform
apple2` when another platform's launcher is there too. `--port N` starts
another machine beside the first, for a check that must not disturb a
game's (`kit/apple2/tools.py`).

The machine is a 128K enhanced Apple IIe (its 65C02, NTSC): the extended
80-column card in the auxiliary slot (64K more), a Mockingboard in slot
4, a Disk II with two drives in slot 6, and nothing else: no hard disk,
no clock card, no mouse card. `kit/skills/apple2/apple2-reference` has its
facts. It can be a II Plus instead, for a game that needs one ("Models"). `hello` lists what the server changes in Apple2TS, as
`workarounds`, and `kit/apple2/INSTALL.md` says why.

There is no window and no sound. The screen is drawn from memory as a PNG,
the text page is read as text, and the sound is a log of the speaker's
clicks and the Mockingboard's register writes. The machine runs only when
asked, and then as fast as the host goes: 600 frames, ten seconds of the
machine's time, took 0.55 s with nothing hooked, 18.3 times real time (a
four-core cloud container, Node 22.22.0, 19 October 2026).

## Connecting

```python
import sys; sys.path.insert(0, "kit/apple2")
from apple2ts import connect
m = connect()                                    # 127.0.0.1:6502, or KIT_APPLE2TS_PORT
m.disk("games/apple2/<slug>/work/disk1.woz")     # into drive 1
m.boot(seconds=10)                               # power on, and the disk in drive 1 boots
print("\n".join(m.text()["lines"]))              # the text page
m.screenshot("games/apple2/<slug>/work/screen.png")
```

One JSON object a line, both ways: `{"id": 7, "cmd": "read", "address":
8192}` and back `{"id": 7, "ok": true, ...}`, or `"ok": false` with
`"error"`. A connection is answered in order, one call at a time, so a run
holds its connection until it stops. A second connection is answered
meanwhile: the machine runs in slices of 50,000 cycles (about 50 ms of its
time), and every call that arrives during a run is served between two
slices, between two instructions. That is how `stop` reaches a run, and
how a script reads counts and memory while the game plays
(`count-while-running`, `stop-while-running`); the client's `stop()` opens
the second connection itself.

From the shell, one call each, which is the agent's own transport:

```
python3 kit/apple2/apple2ts.py --list
python3 kit/apple2/apple2ts.py read '{"address": "$2000", "length": 64}'
python3 kit/apple2/apple2ts.py read '{"address": "$2000", "length": 64, "space": "aux"}'
python3 kit/apple2/apple2ts.py run '{"frames": 60}'
python3 kit/apple2/apple2ts.py text
python3 kit/apple2/apple2ts.py screenshot '{"path": "games/apple2/<slug>/work/screen.png"}'
```

An address is a number or a string: `"$2000"`, `"0x2000"` and `"2000"` are
all hexadecimal. A `path` is made absolute by the client.

## The commands

| What | Command and arguments | Notes |
|---|---|---|
| Who answers | `hello` | the server, its protocol, Apple2TS's version, the model, Node's version, the clock and the frame in cycles, the memory spaces, the commands, and `workarounds` |
| State | `status` | running or not, typing or not, PC, the cycle and frame counts, how many checkpoints, whether the code map and the sound are recording, the disks in the drives, the keys and the game port as held |
| Reset | `reset` (`hard`, true; `model`) | `hard` is a power-on, below; `"hard": false` is CONTROL-RESET. Neither runs the machine. A power-on with `model` makes it that machine ("Models") |
| Boot | `boot` (`until`, `seconds`, `max_cycles`, `frames`, `model`) | a power-on with the disks in, as `model` when given, then a run: `until` an address (for at most `seconds`, 30), or for `seconds`, or for `frames` (300). Returns the run's reply and the text page |
| Disks | `disk` (`drive` 1 or 2, `path`, or `eject`) | below |
| Run | `run` (`cycles`, `frames`, `seconds`, `until`, `max_cycles`) | returns `reason` (`cycles`, `frames`, `until`, `checkpoint`, `stopped`, `timeout`), `pc`, `ran`, `frames`, `cycles`, `hit` and the registers |
| Step | `step` (`count`, 1) | the same, with `next`, the instruction at the new PC |
| Stop a run | `stop` | from a second connection; the run's own reply then says `stopped` |
| Memory | `read` (`address`, `length` up to 65536, `space`) | by space, below; the client's `read()` returns bytes |
| Memory | `write` (`address`, `data` base64 or `bytes`, `space`, `io`) | RAM only, as the space says; an address in $C000-$C0FF needs `"io": true` |
| Registers | `registers`, `set-registers` (`pc`, `a`, `x`, `y`, `s`, `p`) | `cycles` is the machine's cycle count, which a load or `back` puts back too |
| Chips | `chips` | the soft switches by name, whether the beam is in the vertical blank, the keyboard, the game port, the disk drive, and both 6522s of the Mockingboard with each sound chip's sixteen registers |
| Text | `text` | the text page as 24 lines, which page, 40 or 80 columns, and whether graphics cover it |
| Disassemble | `disassemble` (`address`, `count`) | Apple2TS's own disassembler, which knows the 65C02 |
| Checkpoints | `checkpoint` (`address`, `end`, `kind`, `stop`, `ignore`, `temporary`, `when`, `bank`) | returns `{"checkpoint": n}`; below |
| | `checkpoints`, `delete` (`checkpoint`, or `"all": true`), `zero` (`checkpoint`, or all) | each with `hits` and `last`, the instruction that hit it |
| Keys | `key` (`key`, `down`), `keys`, `release-keys` | below |
| Typing | `type` (`text`, `max_cycles`) | below |
| Game port | `joystick` (`paddles`, `buttons`) | below |
| Snapshots | `save` (`path`), `load` (`path`), `keep` and `back` (`name`) | below |
| Sound | `sound` (`action` start or stop, `path`) | the speaker's clicks and the Mockingboard's writes, each with its cycle |
| What ran | `codemap` (`action` start, read, zap or stop) | `[address, length, count]` for each address an instruction started at |
| Quit | `quit` | the server exits |

The client adds `screenshot` (`path`, `mode`), which draws the screen
itself (below); the server draws nothing.

## Models

The server is the enhanced IIe unless it is told otherwise. A game whose
disk needs a II or II Plus (a WOZ image's `META` says `requires_machine
2|2+`; `kit/apple2/disk.py info` prints it), or that stops on the IIe in
its loader, runs on Apple2TS's II Plus:

```
python3 kit/scripts/tools.py apple2ts --model iiplus     # started as a II Plus
python3 kit/apple2/apple2ts.py boot '{"model": "iiplus", "seconds": 20}'
```

`model` on `reset` (a power-on) or `boot` changes the machine, and it
stays that one until changed again; `hello`, `status` and `chips` name it,
`hello` lists both (`models`), and a snapshot records it, so a `load`
makes the server the machine that saved. On the II Plus, `chips` has only
the switches it has (no 80STORE, RAMRD, RAMWRT, INTCXROM, ALTZP,
SLOTC3ROM, 80COL, ALTCHAR or DHIRES), `vbl` is null and the keyboard has
no `akd`; the `aux` spaces are refused and `rom` starts at $D000.
`apple2-reference`, "The II Plus in the kit", says what else differs, and
the processor is the trap: it still runs the 65C02's opcodes.

Record the model in the game's `orientation.md` and in `game.json`'s
`tools.emulator`. `check-emulator` measures the IIe in its four phases
and the II Plus in phase 5, whatever the server was started as, and
leaves it as it was started.

## Running, and where a run stops

The machine runs only inside `run`, `step`, `boot` and `type`. Between them
it is stopped, and nothing moves while you read or write.

- **A frame** is 17,030 cycles, 65 cycles a line and 262 lines, about 59.92
  a second; the frame count is the cycle count divided by it, so `run
  {"frames": 1}` stops at the next multiple. The vertical blank is the
  first 4,550 cycles of each frame, when $C019 reads with bit 7 low
  (`vbl-count`, `cycle-counter`). Ten one-frame advances with a key held
  moved the test program one step a frame (`frame-step`), 2 ms a step with
  its reads.
- **The first instruction** of a run or a step is counted by every
  checkpoint on it but never stopped on. A machine stopped at a checkpoint
  therefore goes on past it with a plain `run`, as VICE's does on the C64;
  a `step` from there carries out exactly the instruction it stopped on.
- **`until`** stops when PC reaches the address, the first instruction
  aside.
- **Limits.** `max_cycles` ends any run with `timeout`; a run with no limit
  of its own ends after a minute of the machine's time, and a `step` after
  two seconds of it.
- **`set-registers` with `pc`** makes the next run start at that address,
  and the instruction there runs; it is not skipped as if it had been seen.
- **A power-on** (`reset`, `boot`) is the same every time: the random
  numbers Apple2TS draws for the floating bus and empty slots start again
  from the kit's seed, the disk controller starts as it does at power-on,
  and each disk is put in again from its file. A file that has gone is
  named in `missing`, and that drive is empty. `boot` twice gives the same
  machine at the same cycle (`disk-boots`).

Set up, then run, then read: the stop is exact. `exact-stop` checks that a
stopping checkpoint stops before its own instruction runs, and
`unpaced-calls` ran a hundred runs back to back, each stopping on its
checkpoint, at 1,888 calls a second.

## Spaces

`read` and `write` take a `space`, so that every bank of memory can be
read whatever the soft switches say, and none of them is changed:

| Space | Addresses | What |
|---|---|---|
| `cpu` (the default) | $0000-$FFFF | what the CPU would read now, through the switches: main or auxiliary memory, the language card's RAM or the ROM. A write lands where a store would, and is refused where a store does nothing (the ROM, or the language card with writing off) |
| `main`, `aux` | $0000-$BFFF | the main 64K and the 80-column card's, whatever RAMRD, RAMWRT, ALTZP and 80STORE say |
| `mainlc1`, `mainlc2`, `auxlc1`, `auxlc2` | $D000-$FFFF | each 64K's language-card RAM with bank 1 or bank 2 at $D000-$DFFF; $E000-$FFFF is the same in both banks of one 64K |
| `rom` | $C100-$FFFF | the IIe's own ROM: at $C100-$CFFF the firmware INTCXROM switches in, at $D000-$FFFF Applesoft and the Monitor. Read only |

An address the space has none of is refused, naming the space. `read-banked`
reads a marker in each of the ten banks the test program wrote, and the
reset vector at $FFFC in the `rom` space, and checks that the switches did
not move.

**The I/O page, $C000-$C0FF, reads as $00** in the `cpu` space, and the
reply says `io`: a read through the bus works a soft switch ($C030 clicks
the speaker, $C010 clears the keyboard's strobe, $C08x changes the language
card), and the program would then see a machine the agent changed. `chips`
reads the switches from Apple2TS's own state instead, touching nothing. A
`write` with `"io": true` goes through the bus on purpose, its effects and
all.

## Checkpoints

A checkpoint has a `kind`, `exec`, `read` or `write`, and an address or a
range (`end`). It stops the run unless `"stop": false`, in which case it
only counts. `ignore: n` lets the first n matches count without stopping,
`temporary` deletes it once it has stopped the machine, and `when` adds
conditions: register values for any kind (`{"a": 5}`, `{"x": 0}`,
`{"pc": 24576}`), and for a read or a write `{"value": n}`, the byte moved.
`bank` (`main`, `aux` or `rom`) matches only when the byte is in that
bank: code at $D000 run from the ROM and not from the language card's RAM,
or a store that went to auxiliary memory.

- Checkpoints are the server's, not the machine's, so a `load` or `back`
  leaves them as they are and they go on counting
  (`checkpoints-survive-load`).
- An `exec` checkpoint is looked at before its instruction runs, a `read` or
  `write` checkpoint after the instruction that made the access. `last` says
  which instruction hit it, and for a read or a write the address and the
  value.
- A read checkpoint counts the bytes an instruction reads as data. The
  fetch of an instruction's own bytes is never counted: watch code with an
  `exec` checkpoint.
- An `exec` checkpoint costs little. A `read` or a `write` checkpoint has
  every data access the CPU makes looked at while one exists, so delete
  them when the measurement is done.

## Keys

`key` presses a key and leaves it down, through stops and runs, until the
same call with `"down": false` or `release-keys`. It goes in as the IIe's
keyboard puts it: its code in $C000 with the strobe, bit 7, set, and bit 7
of $C010 set while it is held. The strobe stays set until the program
clears it, by reading or writing $C010, as on the machine. A key pressed
while the machine is stopped is waiting at the program's next read
(`input-lands`).

A key is its character (`"A"`, `"a"`, `"1"`, `" "`), its ASCII code as a
number, `CTRL-X` for a control key, or a name: `RETURN` (`ENTER`), `ESC`
(`ESCAPE`), `TAB`, `DELETE`, `SPACE`, and the arrows `LEFT`, `RIGHT`, `UP`
and `DOWN` (codes 8, 21, 11 and 10). A letter goes in as given: `"a"` is
lower case, as with CAPS LOCK up, and a program written for the II+ often
wants capitals. `OPEN-APPLE` and `SOLID-APPLE` (`CLOSED-APPLE`, `OPTION`)
are the game port's buttons 0 and 1, which the two keys are wired to.
There is one key at a time, as the IIe's keyboard latch holds one code, and
no auto-repeat.

`type` is for text: it presses each key when the program has read the one
before (the strobe is clear), and lets it go once the program has read it.
`"\n"` is RETURN. It runs the machine until the last key is read, waiting
at most `max_cycles` (ten seconds of the machine's time) for each; it
replies with how many keys were read, and why it stopped early. `key` is
refused while `type` is still typing. A program that reads $C000 and never
clears the strobe never takes a second key from `type`: press and release
with `key` and a frame between, as a person would.

## The game port

`joystick` sets the four paddles, a list of up to four values from 0 to 255
(`null` puts one back to the centre, 128), and buttons 0 and 1. They hold
until changed, and a snapshot keeps them. A paddle's value is what the
Monitor's PREAD returns for it, the count its loop makes before the paddle
timer runs out: set to 20, 100 and 200, paddle 0 read 20, 100 and 197
through the test program's copy of that loop (`paddle`). A game that times
the paddle with a loop of its own counts in its own units. Apple2TS has no
button 2. A joystick is two of the paddles and the buttons: read which
paddles a game polls from its code (`apple2-reference`, "Keyboard,
paddles and buttons").

## Disks

`disk` puts an image in drive 1 or 2, or takes it out (`"eject": true`).
Apple2TS reads a WOZ image (WOZ 1 or 2), which keeps a protected original's
bits, and a 16-sector image of 143,360 bytes: `.dsk` and `.do` in DOS
order, `.po` in ProDOS order. It does not read `.nib`, `.d13` or `.2mg`;
`kit/apple2/disk.py sectors <image> -o <file.dsk>` writes the sectors of a
16-sector one as a `.dsk`, which loses whatever protection the original
had, so a WOZ of the original is better when there is one. The disk is the
contributor's own file, in the game's `work/` folder.

- **A disk changed between two runs** stays where a person's swap leaves
  it: the drive's head, its motor and the drive selected are kept. A power-on
  then starts every drive afresh.
- **The file is never written.** What the game writes to a disk lives in
  the machine and in its snapshots.
- **Boot** with `boot`: a power-on with the disks in, so the Disk II's ROM
  boots drive 1, as the IIe does. `boot` with `until` the game's first
  address, or `frames`, and read the text or the screen to see where it
  got to.

## Snapshots

```python
m.save("games/apple2/<slug>/work/play.json")    # anywhere inside the repository
m.load("games/apple2/<slug>/work/play.json")
m.keep(); ...; m.back()                          # a whole state in memory, 2.8 ms a pair
```

- **The format** is the kit's: JSON that begins
  `{"format":"apple2ts-kit-snapshot"`, holding Apple2TS's own save state
  (both 64Ks, the switches, the CPU, the cards, and each disk in a drive)
  with what that leaves out: the random generator's state, the inputs held,
  the disk controller's bit position and latch, the motor's pending
  spin-down, and the paddle timer. `kit/apple2/snapshot.py` reads it for
  `listing.py`: main memory, with the language card's RAM at $D000-$FFFF,
  or another bank by name (`kit/scripts/parts.py`, a part's `bank`). The
  ROM, the I/O page and the cards are not in its image. The hand-over is
  `work/entry.json`.
- **A save** can be taken while a run is in progress, between two slices
  (`save-running`), and **a load** leaves the machine stopped at the saved
  state, cycle count included (`load-paused`). A load continues exactly as
  the machine that saved would have, whether it was saved stopped or
  running, and three loads of the same file come out the same, in this
  server and after a restart (`determinism-*`, `load-continues-exactly`).
  A snapshot taken while a disk was being read loads and reads on to the
  same memory at the same cycle (`disk-in-snapshot`).
- **A snapshot holds its disks whole**, with what the game wrote to them, so
  a load needs no disk file. Measured on 19 October 2026: 5,392 bytes with
  no disk in, 305,072 with a WOZ of 221,436 bytes in drive 1, and 322,363
  with a 143,360-byte `.dsk`, which Apple2TS turns into a WOZ when it goes
  in. A snapshot therefore holds the game, and
  stays in the game's `work/` folder, which is gitignored, or in
  `tools/apple2-home/snapshots` for scratch, and is never committed
  (`kit/scripts/check_binaries.py` refuses one, whatever its name).
- **Every path is inside the repository.** The server refuses to write
  anywhere else.
- **Other emulators' states are refused**, by `load` and by `snapshot.py`,
  naming what they are: Apple2TS's web page's own save files, AppleWin's
  and MAME's. Boot the disk here instead and play to the same point.

## The screen, the text and the sound

- `screenshot` (the client's) draws the screen with `kit/apple2/screen.py`
  from both 64Ks and the switches as they stand, 560 by 384, each hi-res
  dot two by two: text in 40 or 80 columns in the kit's own letters (the
  IIe's character ROM is Apple's), lo-res, hi-res in the usual
  approximation of NTSC colour, double hi-res and double lo-res in
  monochrome, and mixed mode. `"mode"` forces one of `text`, `lores`,
  `hires` or `dhires`. `python3 kit/apple2/screen.py <snapshot> <out.png>`
  draws one from a snapshot. The site draws the graphics the same way
  (`site/lib/apple2.js`), and `kit/apple2/test_frame.py` holds the two to
  each other at every pixel.
- `text` reads the text page as the IIe shows it: 24 lines, page 1 or 2,
  40 or 80 columns (in 80 columns each pair of characters is auxiliary
  memory's, then main's). Inverse and flashing characters come out as plain
  letters, and MouseText as spaces. A game that prints through the Monitor
  or DOS leaves its text here, and so does a crash into the Monitor (its
  `*` prompt).
- `sound` with `start`, then `stop`, records the cycle of every click of
  the speaker and every change to a Mockingboard sound chip's registers,
  `[cycle, chip, register, value]`, in the format `kit-apple2-sound`
  (`clock` is 1,020,484 cycles a second), written to `path` when one is
  given. That log is what a page's player replays (`speaker-log`,
  `mockingboard-log`).

## What ran

`codemap` with `start` counts every address an instruction starts at, until
`stop`; `read` returns `[address, length, count]` for each, and `zap` clears
the counts. It separates code from data the way a flow-following
disassembler cannot, for code reached through a table or a vector. The
address is the CPU's: code run from auxiliary memory or from the language
card is counted at the address it ran at, with the bank it was in not
recorded, so check the switches (`chips`) when a game keeps code in more
than one bank. Measured on 19 October 2026: 100 frames took 0.08 s, and
0.09 s recording. Clear and restart it after a `load`, since a load
changes what ran.

## Traps

- **The speaker answers only at $C030.** On the IIe any address from $C030
  to $C03F clicks it; Apple2TS acts on $C030 alone, logs "Unknown
  softswitch" for the rest, and leaves those clicks out of the sound log;
  it knows nothing at $C021-$C02F or $C041-$C04E either, and $C04F reads $CD. A game that clicks
  at $C033 records silence: find its speaker accesses with the register
  census (`kit/cpu/census.py`) before trusting a sound log.
- **The Mockingboard answers only at $C400-$C40E**, the first 6522, and
  **$C480-$C48E**, the second: Apple2TS acts on those addresses alone. $C40F
  and $C48F, port A without the handshake, and the rest of $C400-$C4FF do
  nothing there (`src/worker/devices/mockingboard.ts`).
- **The No-Slot Clock tells the computer's time.** Apple2TS keeps one under
  the internal ROM at $C300-$C3FF, which answers a program that unlocks it
  with the date and time of the computer the server runs on
  (`src/worker/nsc.ts`), not the machine's cycle count, so a run that
  reads it does not repeat.
- **A store the machine ignores is not counted.** A write checkpoint misses
  a store to the ROM, or to the language card with writing off, because
  Apple2TS discards it before its debugger sees it.
- **A read-modify-write instruction reads its address twice, or once.** A
  read checkpoint counts `ASL`, `LSR`, `ROL` and `ROR` on memory, and `INC`
  and `DEC` with `abs,X`, as two reads: Apple2TS makes the 65C02's extra
  read of the address, citing Sather's *Understanding the Apple IIe*, page
  4-27. `INC` and `DEC` in their other modes, `TSB` and `TRB` read it once,
  where a real 65C02 reads twice (`src/worker/instructions.ts`;
  `apple2-reference`, "Where Apple2TS differs from a real IIe").
- **`boot` and a hard `reset` are a power-on.** Use them to start over, never
  to get back to a game: `load` or `back` does that.
- **A run with no limit ends after a minute of the machine's time**, with
  `timeout`. Give `frames` or `cycles`, or a checkpoint, for a longer one.
- **The I/O page reads as $00.** That is the server not touching the
  switches; `chips` has them.
- **A Mockingboard has no ROM.** In the `cpu` space, $C400-$C4FF shows
  Apple2TS's copy of the card's registers while slot 4's ROM is switched
  in; read them with `chips`.
- **The screenshot is memory as it stands** when it is drawn, not as the
  beam drew it: a game that changes modes or pages partway down the screen
  shows one of them.
- **Node.** Everything here was measured on Node 22.22.0
  (`kit/apple2/INSTALL.md`).
