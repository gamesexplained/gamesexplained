---
name: tool-plus4emu
description: How to drive plus4emu 1.2.11, the Commodore 16 and Plus/4 emulator the kit uses, through the kit's own server. Start it, the two models, connect, the commands, memory by space, runs and checkpoints, frames, keys and joysticks, tapes, disks and program files, snapshots, the screen, the text and the sound, what ran, and the traps measured on the build. What to do when a check fails is in workarounds.md, beside this file.
---

# plus4emu in the kit's server

plus4emu is István Varga's open-source emulator of the Commodore 16,
Plus/4 and C116, written in C++ (GPL v2, `github.com/istvan-v/plus4emu`).
The kit builds its machine from source as a library, without its window,
its sound or its menus (`kit/c16/INSTALL.md`), and runs it inside a
Python process of its own, `kit/c16/p4emu_server.py`, which holds the
machine and answers on a local socket; `kit/c16/plus4emu.py` is the
client. The protocol is the one the kit's BBC Micro and Apple II servers
speak, so a script written for one reads the others.

```
python3 kit/scripts/tools.py plus4emu                      # start it: a PAL C16, powered on with no tape or disk, on 127.0.0.1:7501
python3 kit/scripts/tools.py plus4emu --model plus4pal     # a PAL Plus/4 instead
python3 kit/scripts/tools.py --platform c16 status         # the build, the compiler, running or stopped, PC
python3 kit/scripts/tools.py --platform c16 stop           # stop it
```

`plus4emu` and `get-plus4emu` are the C16's alone; `status`, `stop`,
`snapshots`, `check-emulator` and `verify-footprint` need `--platform
c16` when another platform's launcher is there too. `--port N` starts
another machine beside the first, for a check that must not disturb a
game's (`kit/c16/tools.py`).

## The two models

| `--model` | Machine | RAM | ROMs |
|---|---|---|---|
| `c16pal` (the default) | a PAL Commodore 16 | 16 KB, seen four times over the 64 KB | BASIC 3.5 and the KERNAL (318006-01, 318004-05) |
| `plus4pal` | a PAL Plus/4 | 64 KB | the same two, and the function ROMs of the 3-plus-1 software |

Both have the cassette player and a 1541 disk drive as unit 8, which is
switched on when the first disk goes in ("Tapes, disks and program
files"). There is no NTSC model. A game written for the C16 runs on
either; one that needs more than 16 KB runs only on the Plus/4, and its
16 KB mirror makes some C16 games behave differently there
(`c16-reference`, "Memory map"). Start the model the game was sold for,
and say which in `orientation.md`. A snapshot names its model, and a
server of the other model refuses it.

There is no window and nothing comes out of a speaker. The screen is
drawn from TED's own output as a PNG, and the sound is a log of TED's
sound registers, with plus4emu's own output beside it when asked. The
machine runs only when asked, and then as fast as the host goes: 1,500
frames, thirty seconds of the machine's time, took 1.40 s on the C16,
21.6 times real time, and 1.76 s on the Plus/4, 17.1 times (a four-core
cloud container, Python 3.13.16, 19 October 2026). `hello` lists what the
server does around plus4emu's library, as `workarounds`, and the
sections below say what each means for a script.

## Connecting

```python
import sys; sys.path.insert(0, "kit/c16")
from plus4emu import connect
m = connect()                                     # 127.0.0.1:7501, or KIT_PLUS4EMU_PORT
m.frames(150)                                     # three seconds: BASIC is READY
m.tape("games/c16/<slug>/work/game.tap")          # in the player, PLAY held down
m.type("LOAD\n")
m.run(seconds=120)                                # the KERNAL loads it
print("\n".join(m.text()["lines"]))               # the text screen
m.screenshot("games/c16/<slug>/work/screen.png")
```

One JSON object a line, both ways: `{"id": 7, "cmd": "read", "address":
4096}` and back `{"id": 7, "ok": true, ...}`, or `"ok": false` with
`"error"`. A connection is answered in order, one call at a time, so a run
holds its connection until it stops. A second connection is answered
meanwhile: the machine runs in calls into the library of about a frame of
its time each, and every call that arrives during a run is answered
between two of them. That is how `stop` reaches a run, and how a script
reads counts and memory while the game plays (`count-while-running`,
`stop-while-running`); the client's `stop()` opens the second connection
itself. Most commands are answered during a run, the keys, the
joysticks and the checkpoints among them; `set-registers`, `keep`,
`back`, `load`, `reset`, `screenshot`, `run`, `step`, `tape`, `disk`,
`program` and `type` are refused until it stops.

From the shell, one call each, which is the agent's own transport:

```
python3 kit/c16/plus4emu.py --list
python3 kit/c16/plus4emu.py read '{"address": "$1000", "length": 64}'
python3 kit/c16/plus4emu.py read '{"address": "$C000", "length": 64, "space": "kernal"}'
python3 kit/c16/plus4emu.py run '{"frames": 50}'
python3 kit/c16/plus4emu.py text
python3 kit/c16/plus4emu.py screenshot '{"path": "games/c16/<slug>/work/screen.png"}'
```

An address is a number or a string: `"$1000"`, `"0x1000"` and `"1000"` are
all hexadecimal. A `path` is made absolute by the client.

## The commands

| What | Command and arguments | Notes |
|---|---|---|
| Who answers | `hello` | the server, its protocol, plus4emu's version, the model, Python's version, the clock and the frame in cycles, the memory spaces, the commands, the keys' names, how the code map counts, and `workarounds` |
| State | `status` | running or not, the model, PC, the cycle and frame counts, typing or not, how many checkpoints, whether the code map and the sound are recording, the tape and the disk in, whether the drive is on, the keys and joysticks held, whether the CPU is jammed, and the server's last notes |
| Reset | `reset` (`hard`, true) | `hard` is a power-on, below; `"hard": false` is the reset button. Neither runs the machine |
| Tape | `tape` (`path`, or `eject`) | into the player with PLAY held down; below |
| Disk | `disk` (`path`, or `eject`) | into drive 8; below |
| Program file | `program` (`path`) | a program file's bytes put into memory; below |
| Typing | `type` (`text`) | into the KERNAL's keyboard buffer as the machine runs; below |
| Keys | `key` (`key`, or `row` and `column`; `down`), `keys`, `release-keys` | below |
| Joysticks | `joystick` (`port`, `up`, `down`, `left`, `right`, `fire`, or `bits`) | below |
| Run | `run` (`cycles`, `frames`, `seconds`, `until`, `max_cycles`) | returns `reason` (`cycles`, `frames`, `seconds`, `until`, `checkpoint`, `stopped`, `jam`, `timeout`), `hit`, and the registers with `cycles` and `frames` |
| Step | `step` (`count`, 1) | the same, with `next`, the instruction at the new PC |
| Stop a run | `stop` | from a second connection; the run's own reply then says `stopped` |
| Memory | `read` (`address`, `length`, 256 by default, `space`) | by space, below; the client's `read()` returns bytes |
| Memory | `write` (`address`, `data` base64 or `bytes`, `space`) | `cpu` or `ram`: the ROMs are read only |
| Registers | `registers`, `set-registers` (`pc`, `a`, `x`, `y`, `s`, `p`) | `cycles` is the machine's cycle count, which a load or `back` puts back too |
| Disassemble | `disassemble` (`address`, `count`) | the kit's own 6502 decoder (`kit/cpu/m6502.py`), the chips' registers by name |
| Chips | `chips` | TED's registers by name and decoded: the mode, where the screen, the characters and the bitmap are, the colours, the cursor, the timers, the interrupts, the raster, the sound; the keyboard latch, the CPU's port, and the ROM bank |
| Text | `text` | the text screen as 25 lines of 40, below |
| Checkpoints | `checkpoint` (`address`, `end`, `kind`, `stop`, `ignore`, `temporary`, `when`) | returns `{"checkpoint": n}`; below |
| | `checkpoints`, `delete` (`checkpoint`, or `"all": true`), `zero` (`checkpoint`, or all) | each with `hits` and `last`, below |
| Snapshots | `save` (`path`), `load` (`path`), `keep` and `back` (`name`) | below |
| Screen | `screenshot` (`path`) | a PNG of TED's picture, below |
| Sound | `sound` (`action` start or stop, `path`, `audio`) | every write to TED's sound registers, each with its cycle; with `audio`, plus4emu's own output too |
| What ran | `codemap` (`action` start, read, zap or stop) | `[address, length, count]` for each address an instruction started at |
| Quit | `quit` | the server exits |

## Running, and where a run stops

The machine runs only inside `run` and `step`. Between them it is
stopped, and nothing moves while you read or write.

- **A frame** is 35,568 cycles, 114 a line and 312 lines, about 49.86 a
  second (`c16-reference`, "Timing"). The cycles are TED's double-clock
  cycles, 1,773,447 a second, the count `cycles` and every `cycles`
  argument use; TED's own timers count at half that rate. The frame
  count goes up as TED starts line 0, so `run {"frames": 1}` stops at the
  first instruction of the next frame. Ten one-frame advances with a key
  held moved the test program one step a frame, 1.4 ms a step with its
  reads (`frame-step`, 19 October 2026).
- **The first instruction** of a run or a step is counted by every
  checkpoint on it but never stopped on. A machine stopped at a
  checkpoint therefore goes on past it with a plain `run`; a `step` from
  there carries out exactly the instruction it stopped on.
- **`until`** stops when PC reaches the address, the first instruction
  aside.
- **Limits.** `max_cycles` ends any run with `timeout`; a run with no
  limit of its own ends after a minute of the machine's time, and a `step`
  after two seconds of it.
- **`set-registers` with `pc`** makes the next run start at that address,
  and the instruction there runs; it is not skipped as if it had been
  seen. With a tape or a disk in, the new PC takes effect only after the
  instruction already under way, and the reply says so ("Traps").
- **A jammed CPU.** One of the twelve opcodes that stop an NMOS 6502
  ($02, $12, ... $F2) ends the run with `jam`, PC on the opcode, and the
  machine stays there until a `set-registers` with a new `pc`, a load or a
  reset.
- **A power-on** (`reset`) is the same every time: plus4emu fills the RAM
  with the same pattern and starts TED at the same point, so the same
  calls give the same machine at the same cycle (`determinism-*`). The
  keys and joysticks held stay held through it; `type` is forgotten.

Set up, then run, then read: the stop is exact. `exact-stop` checks that a
stopping checkpoint stops before its own instruction runs, and
`unpaced-calls` ran a hundred runs back to back, each stopping on its
checkpoint, at 721 runs a second on the C16 (19 October 2026).

## Spaces

`read` and `write` take a `space`, so that the RAM and every ROM can be
read whatever is paged in, and nothing is paged:

| Space | Addresses | What |
|---|---|---|
| `cpu` (the default) | $0000-$FFFF | what the CPU would read now: the ROMs at $8000-$FCFF and $FF40-$FFFF while they are paged in, the RAM when it is, and the chips at $FD00-$FF3F always. A write lands where a store would: into the RAM beneath a ROM, and into a chip at $FD00-$FF3F, with what the chip then does |
| `ram` | $0000-$FFFF | the RAM, whatever is paged in. On a C16 the 16 KB comes round four times: $5234 reads $1234 |
| `basic`, `kernal` | $8000-$BFFF, $C000-$FFFF | BASIC's ROM and the KERNAL's, the character ROM at $D000-$D7FF among it. Read only |
| `funclo`, `funchi` | $8000-$BFFF, $C000-$FFFF | the Plus/4's function ROMs, on a Plus/4 only. Read only |

An address the space has none of is refused, naming the space.
`read-banked` reads the RAM under the ROMs and the ROMs by name, and checks
that the ROMs stayed paged in.

**The chips read as the CPU would read them,** with the bits each
register reads back set (`c16-reference`, "TED's registers"); a read
there changes nothing in plus4emu but the value its model keeps as the
last on the data bus. An address no device answers reads $FF through the
server, where a program would see that last value (`c16-reference`,
"Where plus4emu differs from a real machine"). `chips` reads TED's
registers the same way and decodes them.

## Checkpoints

A checkpoint has a `kind`, `exec`, `read` or `write`, and an address or a
range (`end`). It stops the run unless `"stop": false`, in which case it
only counts. `ignore: n` lets the first n matches count without stopping,
`temporary` deletes it once it has stopped the machine, and `when` adds
conditions: register values for any kind (`{"a": 5}`, `{"x": 0}`,
`{"pc": 4096}`), and for a read or a write `{"value": n}`, the byte moved.

- Checkpoints are the server's, not the machine's, so a `load`, a `back`
  or a `reset` leaves them as they are and they go on counting
  (`checkpoints-survive-load`; the reset seen on 19 October 2026, when a
  second boot stopped at the first boot's checkpoint). A script that
  starts again from a reset deletes them first (`delete`, `"all": true`).
- An `exec` checkpoint is looked at before its instruction runs. A `read`
  or `write` checkpoint is looked at as the access is made, and stops the
  machine at the next instruction, after the one that made it. `last`
  says where the exec checkpoint was hit (`pc`, `cycles`), or which
  address a read or a write touched, the value and the cycle; the PC of
  the stop is the instruction after.
- **A read checkpoint counts the bytes of an instruction's operand** as
  reads, and never its opcode: a read checkpoint on $2002, the operand of
  an `LDA $2010` at $2001, counted once each time the `LDA` ran (19
  October 2026). Watch code with an `exec` checkpoint, and keep a read
  checkpoint off code.
- **A read-modify-write instruction is counted once each way.** `INC`,
  `DEC`, `ASL`, `LSR`, `ROL` and `ROR` on memory, and the undocumented ones
  that do the same, store twice, as the 6502 does, the unchanged value and
  then the new one, and plus4emu makes both stores; a write checkpoint
  counts only the second (plus4emu, cpuoptbl.cpp, whose first store is
  `CPU_OP_LD_MEM_TMP_NODEBUG`).
- An `exec` checkpoint costs little. A `read` or a `write` checkpoint has
  every access to its addresses called back, so delete them when the
  measurement is done.

## Keys

`key` presses a key and leaves it down, through stops and runs, until the
same call with `"down": false` or `release-keys`. It goes into the
keyboard's matrix, where the program reads it as the machine does: the
row through the latch at $FD30, the column at $FF08 (`c16-reference`,
"Keyboard and joysticks"). A key pressed while the machine is stopped is
there at the program's next scan (`input-lands`).

A key is its name on the keyboard: a letter or a digit, `RETURN`,
`SPACE`, `SHIFT`, `CTRL`, `C=`, `RUN/STOP`, `ESC`, `INST/DEL`,
`CLR/HOME`, `HELP`, `F1`, `F2`, `F3`, the cursor keys `UP`, `DOWN`,
`LEFT` and `RIGHT`, and the signs `@ £ * + - = : ; , . /`. Some names
have others: `DEL`, `ENTER`, `STOP`, `HOME`, `COMMODORE`, `CONTROL`,
`ESCAPE`, `POUND`. `F4`, `F5`, `F6` and `F7` name the key that carries
them, which gives them with SHIFT, so hold SHIFT too. `row` and `column`
(0 to 7) press a key by its place in the matrix instead. `hello` lists
the names, and a name it does not know is refused with the list. Any
number of keys can be held at once, and the machine reads them as its
matrix does.

`type` is for text: the server puts the characters into the KERNAL's
keyboard buffer ($0527, its count at $EF) whenever the buffer is empty,
ten at a time or up to a RETURN, while the machine runs. It runs nothing
itself: the text goes in during the next `run`. Letters go in as
capitals, which is what BASIC wants, `"\n"` is RETURN, and characters the
buffer cannot take are left out. The reply says how many characters were
queued. A program that reads the keyboard through the KERNAL (`GETIN`,
BASIC's `INPUT` and `GET`) takes them; a game that scans the matrix itself
never sees them, so press and release with `key` and a frame between, as
a person would. `status` says while the typing goes on, and the server
gives up after 250 frames with the buffer unread, noting it in `status`.

## Joysticks

`joystick` with a `port`, 1 or 2, sets the directions and fire it holds:
`up`, `down`, `left`, `right` and `fire` as true or false, or `bits` (1
up, 2 down, 4 left, 8 right, 16 fire). They hold until changed, through
stops and runs, and a snapshot keeps them. The program reads them through
$FF08 with the port's select line low, as the machine does: held left
with fire, port 1 read $BB and port 2 $7B (`joy-port-1`, `joy-port-2`).
Which port a game reads is in its code (`c16-reference`, "Keyboard and
joysticks"). `release-keys` lets go of both joysticks too.

## Tapes, disks and program files

The tape, the disk and the program file are the contributor's own files,
in the game's `work/` folder.

- **A tape.** `tape` puts a tape image in the player and holds PLAY down,
  so `LOAD` goes straight to `SEARCHING` with no `PRESS PLAY ON TAPE`. plus4emu
  reads a C16 TAP, the format the C16's tapes are kept in, signed
  `C16-TAPE-RAW` in version 1 or 2, its own tape files, and, when the
  library was built with libsndfile, a tape kept as a WAV recording
  (`kit/c16/INSTALL.md`, "What you need first"). A library built without
  it refuses a WAV, naming the reason. `eject` takes the tape out. Type
  `LOAD` and run; the check's own tape, written in the KERNAL's format,
  loaded so (`tape-in-snapshot`).
- **A disk.** `disk` puts a D64 image (35 to 42 tracks, with or without
  the error bytes) in drive 8, a 1541. plus4emu makes the drive when the
  first disk goes in, so the drive is switched on then and runs its
  self-test for about 1.1 seconds, 55 frames, before it answers: the reply
  says so. Run that long, then type `LOAD"*",8,1` (or the file's name) and
  run (`disk-in-snapshot`).
  plus4emu reads no G64, so a protected original kept as a G64 cannot be
  loaded here. `python3 kit/c64/disk.py <image>` lists a D64's files and
  `disk.py extract` writes them out: the 1541's format is the same on
  every Commodore machine.
- **Changing disks.** Put the next disk in without ejecting the first: an
  `eject` switches the drive off, and the next disk then waits out the
  self-test again.
- **A program file.** `program` puts a PRG file's bytes into memory at the
  address its first two bytes give, as `LOAD` would, sets BASIC's pointers
  to the end of the program and the KERNAL's end-of-load address, and runs
  nothing (plus4emu, ted_api.cpp, loadProgram). Type `RUN`, or set PC to
  the program's start. A PRG made from a tape or a disk loads the way the
  original did only when the original is a single file the KERNAL loads;
  a game whose loader reads the tape or the disk itself needs the original.

## Snapshots

```python
m.save("games/c16/<slug>/work/play.p4emu")      # anywhere inside the repository
m.load("games/c16/<slug>/work/play.p4emu")
m.keep(); ...; m.back()                         # a whole state, 55 ms a pair on the C16
```

- **The format** is plus4emu's own snapshot file, with one or two chunks of
  the kit's before its end, which plus4emu's own program passes over
  (src/fileio.cpp). The first holds what plus4emu's file does not: where
  the stop is, the registers and the cycle and frame counts there, the
  keys and joysticks held, the typing still to do, and the bytes of RAM
  the instruction before the stop had still to write. `kit/c16/snapshot.py`
  reads it for `listing.py`: the RAM as the program addresses it, a C16's
  16 KB once at $0000-$3FFF, a Plus/4's whole 64 KB with the RAM under the
  ROMs. The ROMs, which the file also holds, are not in its image. The
  hand-over is `work/entry.p4emu`.
- **A save is exact.** plus4emu can save only between two calls into its
  library, which can lie part way through an instruction; so `save` at a
  stop goes back to the last clean snapshot the server keeps (one every
  half second of the machine's time), replays to the boundary just before
  the stop, saves there, and runs on to the same instruction. A load comes
  back to the stop, cycle count included (`load-paused`), and runs on
  exactly as the machine that saved would have, whether it was saved
  stopped or running, in this server and after a restart
  (`determinism-*`, `load-continues-exactly`, `save-anywhere`). Writes and
  keys made at the stop are made again by the replay (`writes-replayed`).
- **A save can be taken while a run is in progress**, between two of its
  calls into the library (`save-running`).
- **A snapshot holds the game.** 50,012 bytes on the C16 and 131,930 on the
  Plus/4 (`snapshot-python`, 19 October 2026), the RAM in it. It stays in
  the game's `work/` folder, which is gitignored, or in
  `tools/c16-home/snapshots` for scratch, and is never committed
  (`kit/scripts/check_binaries.py` refuses one, whatever its name).
- **A snapshot saved with a tape or a disk in** needs that image again, at
  the same path, to load: plus4emu's file holds neither the tape's place
  nor the drive, so the kit's second chunk carries the clean snapshot
  taken before the tape or disk went in and everything done since, and a
  load replays it all, the image read again. Such a load takes as long as
  the replay. Saved mid-load, it loads on to the same machine
  (`tape-in-snapshot`, `disk-in-snapshot`). Eject the tape or the disk
  once the game has loaded, and save after that. When the stop to keep
  comes while the tape still runs, as a loader's hand-over does, eject at
  the stop and save there: the server has no clean snapshot since the
  eject to replay from, and says so with `exact: false`. On 19 October
  2026 such a save of a C16 tape's hand-over loaded back to the same PC,
  registers, cycle count and RAM.
- **Every path is inside the repository.** The server refuses to write
  anywhere else.
- **Other programs' snapshots.** `load` takes a snapshot plus4emu's own
  program saved, compressed or not, and says that it has none of the
  kit's notes: the machine stops at the next instruction, not at a known
  one, so save it again here before anything reads it. `snapshot.py`
  refuses VICE's and MAME's files, a compressed plus4emu file, and a
  tape, a disk or a program file, naming what each is. Another
  emulator's snapshot does not load: load the game here instead and play
  to the same point.

## The screen, the text and the sound

- `screenshot` saves the screen as TED drew it, from TED's own output, in
  plus4emu's palette: 384 by 294 on PAL, the border included, the display
  window's 320 by 200 at 32,47 (`kit/c16/frame.py`, 19 October 2026). The
  server goes back to the stop, runs a little over two frames with the
  display on, keeps the last whole frame, and loads the stop back, so the
  picture is the screen one or two frames after the stop, with the keys
  and joysticks held. With a tape or a disk in, it is the last whole
  frame before the stop instead. The site draws the screen from memory
  the same way (`site/lib/c16.js`), and `python3 kit/c16/frame.py test`
  holds the two to each other at every pixel of the window, in every mode
  TED has.
- `text` reads the text screen where TED's registers put it: 25 lines of
  40 characters, read as the character ROM's set shows them (`upper`,
  capitals and graphics, or `lower`), with reversed characters as plain
  ones and graphics as `.`. With the characters taken from RAM, the reply
  says `the game's own` and the letters are a guess. A game that prints
  through the KERNAL leaves its text here, and so does BASIC.
- `sound` with `start`, then `stop`, records every write to TED's sound
  registers, $FF0E-$FF12, as `[cycle, address, value]`, in the format
  `kit-c16-sound` (`clock` 1,773,447 cycles a second, `frame` 35,568),
  written to `path` when one is given (`sound-log`). The site plays that
  log (`kit/skills/c16/steps`, `sound`); what the registers mean is
  `c16-reference`, "Sound". `audio`, a sample rate from 11,025 to
  96,000 given with `start`, also keeps what plus4emu itself played
  across the same run, returned with `stop` as `audio` (`rate`, and
  `samples`, base64 of 16-bit signed little-endian mono): its
  low-quality converter and its DC filters at 5 and 15 Hz, its 15 kHz
  high shelf off, its volume at 1.0. What the server runs for itself (a
  screenshot, a save's replay) is left out. `kit/c16/sound.py` compares
  it with the site's model.

## What ran

`codemap` with `start` counts every address an instruction starts at,
until `stop`; `read` returns `[address, length, count]` for each, and `zap`
clears the counts. It separates code from data the way a flow-following
disassembler cannot, for code reached through a table or a vector. The
kit's build of the library counts in plus4emu itself (`kit/c16/codemap.patch`),
which cost nothing measurable; `hello` says so as `codemap`. The address
is the CPU's: code run from the RAM under a ROM and the ROM's own code at
the same address are counted together, and on a C16 the same RAM run at
$1000 and at $5000 is counted at each. Measured on 19 October 2026: 67
addresses read in 0.32 s (`code-map`). Clear and restart it after a
`load`, since a load changes what ran.

`python3 kit/c16/codemap.py <game> zap` clears the record and starts it;
play the game through, then `dump` writes the game's `codemap.json`, the
file `check_listing.py` holds `symbols.json` to (`--merge` adds a
session's record to the map already there, so it can be built from
several snapshots). The dump folds a C16's repeats of its 16 KB onto
$0000-$3FFF and leaves out $8000-$FFFF, where the ROMs are paged in.

## Traps

- **The cycle count is TED's position.** plus4emu has no cycle counter, so
  the server counts from where TED's beam is, plus 35,568 a frame. A
  program that writes TED's line counter ($FF1C-$FF1D) or its position on
  the line ($FF1E) moves the beam, and the count jumps with it.
- **A tape or a disk in makes the server slower and less exact.** While
  one is in, no clean snapshot is taken, so a save carries the whole log
  since the last one, a `pc` set at a stop takes effect only after the
  instruction under way, and a screenshot shows the frame before the
  stop. Take the tape or the disk out once the game has loaded.
- **`type` feeds the KERNAL's buffer only**, so a game that scans the
  keyboard itself never sees it: use `key`.
- **`reset` is a power-on**, or the reset button with `"hard": false`.
  Use it to start over, never to get back to a game: `load` or `back` does
  that.
- **A run with no limit ends after a minute of the machine's time**, with
  `timeout`. Give `frames` or `cycles`, or a checkpoint, for a longer one.
- **The SID card.** plus4emu answers at $FD40-$FD5F and $FE80-$FE9F with
  the SID card some owners fitted, and switches it on at the first write
  there; a stock machine has nothing at those addresses (`c16-reference`,
  "Where plus4emu differs from a real machine"). A game that writes there
  is playing to a SID: say so, since the C16 has none.
- **The ACIA is off**, on the Plus/4 too: $FD00-$FD0F reads the data bus.
- **The screenshot is after the stop**, not at it: a game that changes the
  screen every frame shows the next frame's.
- **A WAV tape needs libsndfile.** A library built without it refuses a
  tape kept as a sound file (`kit/c16/INSTALL.md`).
- **Python.** Everything here was measured on Python 3.13.16 and the
  library built with g++ 13.3.0 (`kit/c16/INSTALL.md`).
