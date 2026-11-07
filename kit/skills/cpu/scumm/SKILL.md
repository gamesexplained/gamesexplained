---
name: scumm
description: Lucasfilm Games' SCUMM, the system its adventures were written in, on every machine they were sold for - reading a game's index, rooms, objects and scripts from its disks, the kit's decoder for SCUMM versions 1 and 2, ScummVM with the kit's trace, and checking the decoder against what ran. For any game whose code is SCUMM scripts, whatever its platform.
---

# SCUMM

Lucasfilm Games wrote its adventures in a system of its own, SCUMM, and
sold each with an interpreter for the buyer's machine. The game is its
resources: rooms, the objects in them, costumes, sounds, and scripts in
SCUMM's bytecode, the same program on every machine, packed on each
machine's disks its own way. So the platform's tools explain the
interpreter, which is ordinary machine code with a listing of its own,
and `kit/scumm/` explains the scripts, for every platform. The disk
images are binaries, the game whole: they stay in the game's `work/` and
are never committed.

| File | What it does |
|---|---|
| `kit/scumm/game.py` | the game's resources from its disks: the index, rooms, objects with their names and verbs, global scripts, and the script a trace names |
| `kit/scumm/scode.py` | the instructions of versions 1 and 2: the opcode table, what each handler reads, decoding, the text of an instruction, a script's listing |
| `kit/scumm/scummvm.py` | ScummVM, the interpreter: installs its SCUMM engine into `tools/` with the kit's trace and runs a game from a file of clicks and keys |
| `kit/scumm/strace.py` | reads ScummVM's trace: shows it with the instructions' text, checks the decoder against it, sums it up script by script |
| `kit/scumm/world.py` | what every script holds, for a reader: the verbs, the actors, the rooms and the ways between them, each object's verbs and what they do, every line of text, the sounds, and where a variable or an object is used |
| `kit/scumm/testgame.py` | a small game the kit writes itself, and an assembler for its scripts: the test runs ScummVM on it without anyone's disks |
| [reference.md](reference.md) | the disk layout, the resources' headers, the parameters, and what the interpreter does without being asked |
| [explore.md](explore.md) | how to explore a game for its page: its characters, places, puzzles, the solution played from the start, its secrets, names for its numbers, and what came in its box |

What each handler reads is ScummVM's (`engines/scumm/script_v2.cpp` and
the version 5, 4 and 3 handlers it shares), and the test checks the kit's
table against ScummVM's, opcode by opcode. Consult
[reference.md](reference.md) and ScummVM's source; do not recall them.

## The disks

ScummVM reads a game from the files the machine's disks were imaged to,
under the names it looks for: for a C64 game, two 35-track `.d64` files
(`game.py -h` lists the names for each game the kit knows). An image
kept as a `.g64`, the bits the drive reads, is written as a `.d64` with
`python3 kit/c64/disk.py d64 work/side1.g64 work/scummvm/zak1.d64`; a
sector the image lacks is reported, and a game whose resources sit on
one cannot be read whole from that image. Keep the pair in a folder of
their own under `work/`: ScummVM takes the folder.

```
python3 kit/scumm/game.py work/scummvm                 # the index: how many objects, rooms, costumes, scripts, sounds
python3 kit/scumm/game.py work/scummvm rooms           # each room: side, first sector, size, objects, entry and exit
python3 kit/scumm/game.py work/scummvm objects 1       # room 1's objects: number, name, verbs and their offsets
python3 kit/scumm/scode.py work/scummvm script 1       # global script 1, decoded
python3 kit/scumm/scode.py work/scummvm all            # every script of the game
```

An index entry the game never uses can point at bytes that are not a
resource, in another room's file: `game.py scripts` names each one it
cannot read, and the listing leaves it out. A script whose index entry
is good but that nothing in the game starts is not dead on that account:
the interpreter starts some scripts itself ([reference.md](reference.md),
"What the interpreter starts").

## Reading an instruction

`scode.py` writes a conditional jump as `unless (condition) goto XXXX`:
the script goes on to the next instruction when the condition holds and
jumps when it does not, which is how ScummVM's `jumpRelative` reads it.
The comparisons put the variable first: `isGreater` goes on when the
variable is less than the value (`Var[117] < 5`), and an `ifState`
handler goes on when the object's state is the other way from the
handler's name ([reference.md](reference.md), "States"). Each was run in
ScummVM both ways by the test, so the text is what the engine does.

A variable the interpreter itself reads or writes has ScummVM's name
(`VAR_EGO`, `VAR_ROOM`); the others are `Var[n]` until the run names
them in `symbols.json`.

## Running it

```
python3 kit/scripts/tools.py get-scummvm               # once: download, check, build (kit/scumm/INSTALL.md)
python3 kit/scripts/tools.py scummvm run work/scummvm --input work/walk.txt \
    --trace work/walk.trace --seed 1
python3 kit/scumm/strace.py check work/scummvm work/walk.trace
python3 kit/scumm/strace.py scripts work/scummvm work/walk.trace
python3 kit/scumm/strace.py show work/scummvm work/walk.trace --from 1000 --count 200
```

The input file says what to click and type, and when, on the game's
clock (`scummvm.py -h`). The clock moves only when the game waits for
it, so a run is as fast as the computer allows and the same every time
with the same input and seed; a `shot` line saves the screen as a PNG,
which is how to find where a verb or an object is before clicking it.
A game may carry out a sentence only on a second click of its object
(its verb script, 4, decides): when a click seems to do nothing, look at
what the trace ran. ScummVM's
own improvements to the games are off and the copy protection on, so
what runs is the scripts as they shipped; `--no-copy-protection` lets a
replay of the solution past the codes printed in the box. Keep the input file in
`work/` with the trace: it is the recording a page's claim rests on.

**Check before you read.** `strace.py check` decodes again, from the
disks, every place that ran and compares it with what ScummVM did: the
opcode, how many parameters it read, each from a variable or a constant
and the constants' values, and where the script went on. A listing rests
on the decoder only when it reports none where they disagree. It checks
only what ran: play through the scenes a page talks about before its
claims rest on the listing.

Once the decoder is checked, [explore.md](explore.md) is how to go
through the game for the reader: what each step finds and which tool
finds it.

## Checking the decoder

Another disassembler is not the check: at the commit the kit measured,
descumm (scummvm-tools) read opcode $AB of versions 1 and 2 with no
parameter, where the engine reads a byte on the C64 and the NES, and
every instruction after one came out wrong. The check is the engine:
`kit/scumm/test_scummvm.py` runs the kit's test game, which uses every
handler but the two that need a sound resource, and compares the trace
with the decoder, and the opcode table with ScummVM's. Run it after any
change to `scode.py`, and run `strace.py check` on a game's traces after
a change that game could feel.

## Where the kit stops

`scode.py` decodes versions 1 and 2. Version 0, which the C64 and Apple
II releases of the first SCUMM game use, has its own opcode table and
object numbering, which nothing in the kit decodes; `game.py` has its
disks' counts from ScummVM, and no test has read such a disk.
Versions 3 and later, and the disk layouts of machines other than the
C64, are not read either: the next game that needs one adds it, with
its test.
