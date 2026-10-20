#!/usr/bin/env python3
"""Which bytes of an Apple II game ran as code, from the kit's server's code map.

The kit's Apple2TS server counts every instruction it starts, by address, with the length of
the instruction it ran there, until the map is cleared (kit/skills/apple2/tool-apple2ts, "What
ran"). This turns that record into the game's codemap.json, the file check_listing.py holds
symbols.json against: code typed as data has no cross-references and still reads as explained
(#184).

  codemap.py <game dir> zap              clear the record and start it: then play
  codemap.py <game dir> dump [--merge]   read the record and write <game dir>/codemap.json:
                                         addresses only, no byte of the game, so it is
                                         committed beside symbols.json (#236). --merge adds
                                         what ran to the map already there, so a map can be
                                         built over several sessions, each from a snapshot

The record counts by the CPU's address, whatever bank the byte was in. $C000-$FFFF is left
out, and the dump says how many instructions it left: the Monitor's routines, the Disk II's
boot ROM and the cards' firmware run there, and the record cannot tell those from a game's
own code in the language card's RAM. A game that runs code there, or in auxiliary memory,
needs that part's own reading (kit/skills/apple2/tool-regen2000, "The language card").

Each instruction is sized as the server ran it. Where the game rewrote an instruction after
running it, two lengths can then overlap without ending together; only their opcodes are
counted, and the dump names them.

The file has the C64's layout (kit/c64/codemap.py): `executed` and `starts` (the sorted
instruction addresses that ran), `ran` and `code` (their byte spans as runs).

Needs the kit's server, `tools.py apple2ts` (127.0.0.1:6502, or KIT_APPLE2TS_PORT).
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

TOP = 0xC000     # the I/O page, the cards' ROM, and the ROM or the language card above it


def runs(addrs):
    out = []
    for a in sorted(addrs):
        if out and a == out[-1][1] + 1:
            out[-1][1] = a
        else:
            out.append([a, a])
    return out


def keep(record):
    """({address: length}, left): the instructions below $C000, and how many lay at or above it."""
    kept, left = {}, 0
    for a, n, _count in record:
        if a >= TOP:
            left += 1
        else:
            kept[a] = max(1, n)
    return kept, left


def sizes(lengths):
    """{instruction address: bytes counted as ran}, and the addresses that overlap without rejoining."""
    executed = sorted(lengths)
    starts, changed = set(executed), set()
    for i, a in enumerate(executed):
        end = a + lengths[a]
        inner = [b for b in executed[i + 1:i + 3] if b < end]
        if not inner:
            continue
        b = inner[0]
        while b in starts and b < end:
            b += lengths[b]
        if b != end:
            changed.update([a] + inner)
    return {a: 1 if a in changed else lengths[a] for a in executed}, sorted(changed)


def zap(m):
    m.codemap("zap")
    m.codemap("start")
    print("code map cleared and recording")


def dump(m, gdir, merge=False):
    record = m.codemap("read")
    if not record.get("instructions"):
        sys.exit("the code map is empty: zap, play, then dump")
    lengths, left = keep(record["instructions"])
    if left:
        print(f"note: left out {left} instructions at $C000-$FFFF, the ROMs' and the cards' "
              "(the Monitor's routines the game calls run there)")
    path = os.path.join(gdir, "codemap.json")
    size, changed = sizes(lengths)
    if changed:
        print(f"warning: {len(changed)} instructions overlap without rejoining, at "
              + ", ".join(f"${s:04X}" + (f"-${e:04X}" if e > s else "") for s, e in runs(changed))
              + ": most often the game rewrote those bytes after running them, so only their opcodes are "
              "counted as ran")
    ran, starts = set(), set(size)
    for a, k in size.items():
        ran.update(a + i for i in range(k) if a + i < TOP)
    if merge and os.path.isfile(path):
        old = json.load(open(path))
        starts.update(old.get("executed", []))
        ran.update(a for s, e in old.get("ran", []) for a in range(s, e + 1))
    starts, code = sorted(starts), runs(ran)
    with open(path, "w") as f:
        json.dump({"starts": starts, "code": code, "executed": starts, "ran": code}, f)
    print(f"code map: {len(ran)} bytes ran in {len(code)} runs ({len(starts)} instructions)")


if __name__ == "__main__":
    args = sys.argv[1:]
    if args and args[0] in ("-h", "--help"):
        print(__doc__)
        sys.exit(0)
    merge = "--merge" in args
    args = [a for a in args if a != "--merge"]
    if len(args) != 2 or args[1] not in ("zap", "dump") or (merge and args[1] != "dump"):
        sys.exit("usage: codemap.py <game dir> zap|dump [--merge]")
    if not os.path.isdir(args[0]):
        sys.exit(f"no such game dir: {args[0]}")
    from apple2ts import connect
    machine = connect()
    zap(machine) if args[1] == "zap" else dump(machine, args[0], merge)
