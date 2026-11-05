# SCUMM versions 1 and 2: reference

What `kit/scumm/` reads, and where each fact comes from: ScummVM 2026.4.0's
SCUMM engine (`engines/scumm/`, file named with each section), checked by
`kit/scumm/test_scummvm.py` where a run can show it. Consult this and the
source; do not recall them.

## The C64 disks (`file.cpp`, `resource_v2.cpp`)

| What | Where | Layout |
|---|---|---|
| Side 1's tag and index | track 1 sector 0 on | `$0A31`, then the index below |
| Side 2's tag | track 1 sector 0 | `$0132` |
| The index | after side 1's tag | a byte for each object (owner in the low four bits, state in the high four); for each room its side, the character `1` or `2`; for each room its first sector and track, a byte each; then for costumes, scripts and sounds in turn a byte for each (the room it is stored with) and a word for each (its offset in that room's file) |
| A room's file | from its first sector, on through the sectors in their order on the disk | the room, then the resources stored with it, each starting with its length, a word that counts itself; ScummVM reads a fixed number of resources for each room, its own table (`zakResourcesPerFile`), and a length of `$FFFF` is padding |

A resource keeps its length word in memory, and a script's code starts
four bytes in: offsets in a trace and in `scode.py` count from the
resource's first byte. The C64 interpreter keeps an object's state four
bits higher than ScummVM does, as the index holds it: Pickupable is `$10`
in the interpreter's memory and 1 in ScummVM's.

## A room's header, versions 1 and 2 (`room.cpp`, `gfx.cpp`, `object.cpp`)

| Offset | What |
|---|---|
| +0 | the resource's length |
| +4, +5 | width and height, in 8-pixel cells (version 1) |
| +6 to +9 | the room's four colours (version 1) |
| +10 to +19 | offsets of the character set, the picture, its colours, its mask map and the mask characters (version 1), each packed as `GdiV1::decodeV1Gfx` unpacks it |
| +20 | how many objects |
| +21 | offset of the walk boxes, a byte, so they sit in the first 256 bytes |
| +22, +23 | how many sounds and scripts the room loads with it, listed after the object table |
| +24, +26 | offsets of the exit and entry scripts |
| +28 | the object table: each object's image offset, then each object's code block offset |

An object's code block: its length; its number at +4; its class bits at
+6; x, y and width in cells at +7 to +9 (bit 7 of y the parent's state);
the parent at +10; where an actor walks to at +11 and +12, the high three
bits of +12 its preposition; its height and the direction an actor faces
it at +13; the offset of its name at +14; from +15 its verbs, a verb and
an offset a pair, to a 0. Verb `$FF` is the one any other falls back on.
The offsets are a byte from the block's start, so an object's scripts
sit in its first 256 bytes. Carried in the inventory, the block is
copied whole, and its scripts run in the copy.

## Parameters (`script_v5.cpp`, `getVarOrDirectByte`, `getVarOrDirectWord`)

The opcode's bits `$80`, `$40` and `$20` say, for the handler's first,
second and third parameter, whether it is a variable's number (a byte)
or the value itself (a byte, or a signed word where the handler reads a
word). That is why most handlers have up to eight opcodes. What else a
handler reads (a result variable, a raw byte, a jump, a message) it
reads as it is; `scode.READS` lists each handler's reads in order.

A jump is a signed word counted from the end of the instruction. A
message runs to a 0 byte; a character with bit 7 set has a space after
it, and codes 4 to 7 take a byte after them (a variable's number, a
verb, a name, a string). A name (an actor's, an object's new name) runs
to a 0 byte, an `$FF` and the byte after it read together, and two more
bytes after codes other than 1, 2, 3 and 8.

## States (`script_v2.cpp`)

| Bit | Name in ScummVM |
|---|---|
| 1 | Pickupable |
| 2 | Untouchable |
| 4 | Locked |
| 8 | Intrinsic |

`setStateX` sets the bit and `setStateUnX` (or `Off`, `Touchable`)
clears it. ScummVM names each test for when it jumps: `ifStatePickupable`
jumps when the bit is set and goes on when it is clear, and
`ifStateUnpickupable` the other way round, as do the other six. The
comparisons are named the other way, for when they go on: `isEqual` goes
on when the two are equal. `scode.py` writes the condition under which
the script goes on (`state of 100 lacks Pickupable`), not the name.

## What the interpreter starts (`scumm.cpp`, `script.cpp`, `room.cpp`, `script_v2.cpp`)

| Script | When |
|---|---|
| 1 | at the start, and again after `restart` |
| 2 | for a sentence queued (`doSentence` with 0, or the player's clicks), with its verb and objects in variables 8, 9 and 10, and in 18 whether the object has a script for that verb |
| 4 | for a click on a verb or in the inventory, with where the click was in variable 32 and what was clicked in 33 (a verb) or 35 (an object) |
| 5 | after every room the game enters, and after `loadRoomWithEgo` |
| a room's exit and entry scripts | when the game leaves and enters the room; the trace names them 10001 and 10002 |

So a global script nothing else starts can still run: look in the trace
before calling one dead.

## The trace (`kit/scumm/scummvm_kit.cpp`, `kit/scumm/strace.py`)

One line for each instruction, written when it has finished, with the
script it ran in (g, r or i and a number), the room loaded, its offset
and opcode, where the script went on, and each parameter, a `v` before
one read from a variable. `strace.py -h` gives the format in full. What
runs in a script's place after an instruction that always stops it
(`restart`, `chainScript`) is another script's, and the check leaves it
alone.
