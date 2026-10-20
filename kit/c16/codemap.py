#!/usr/bin/env python3
"""Which bytes of a Commodore 16 or Plus/4 game ran as code, from the kit's server's code map.

The kit's build of plus4emu counts every instruction it starts, by address, until the map is
cleared (kit/c16/codemap.patch; kit/skills/c16/tool-plus4emu, "What ran"). This turns that
record into the game's codemap.json, the file check_listing.py holds symbols.json against: code
typed as data has no cross-references and still reads as explained (#184).

  codemap.py <game dir> zap              clear the record and start it: then play
  codemap.py <game dir> dump [--merge]   read the record and write <game dir>/codemap.json:
                                         addresses only, no byte of the game, so it is
                                         committed beside symbols.json (#236). --merge adds
                                         what ran to the map already there, so a map can be
                                         built over several sessions, each from a snapshot

The record counts by the CPU's address, so on a C16, whose 16 KB of RAM is seen four times
over the 64 KB, code run at $5234 is the byte at $1234: the dump folds $4000-$7FFF onto
$0000-$3FFF, the address the listing holds it at. $8000-$FFFF is where the ROMs are paged in,
and the record cannot tell a ROM's code from a game's run from the RAM beneath with the ROMs
paged out, so the dump leaves those addresses out and says how many it left. On a C16 the RAM
there is the same 16 KB again; a Plus/4 game that runs code under the ROMs needs its own reading
of that (kit/skills/c16/tool-regen2000, "The RAM under the ROMs").

Each instruction is sized by decoding the RAM as it is at the dump, so code the game rewrote
after running it is sized from bytes that never ran; where two instructions then overlap
without ending together, only their opcodes are counted, and the dump names them.

The file has the C64's layout (kit/c64/codemap.py): `executed` and `starts` (the sorted
instruction addresses that ran), `ran` and `code` (their byte spans as runs).

Needs the kit's server, `tools.py plus4emu` (127.0.0.1:7501, or KIT_PLUS4EMU_PORT).
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.append(os.path.join(os.path.dirname(HERE), "cpu"))   # opcodes.py, the 6502's table
from opcodes import decode, LEN  # noqa: E402
from plus4emu import connect  # noqa: E402


def runs(addrs):
    out = []
    for a in sorted(addrs):
        if out and a == out[-1][1] + 1:
            out[-1][1] = a
        else:
            out.append([a, a])
    return out


def fold(addrs, ram_size):
    """(kept, left): the RAM addresses as the listing holds them, and how many lay at $8000 and above."""
    kept, left = set(), 0
    for a in addrs:
        if a >= 0x8000:
            left += 1
        else:
            kept.add(a % ram_size if ram_size < 0x8000 else a)
    return kept, left


def sizes(executed, ram):
    """{instruction address: bytes counted as ran}, and the addresses that overlap without rejoining."""
    executed = sorted(executed)
    starts, n = set(executed), {}
    for a in executed:
        d = decode(ram, a)
        n[a] = LEN[d[1]] if d else 1
    changed = set()
    for i, a in enumerate(executed):
        inner = [b for b in executed[i + 1:i + 3] if b < a + n[a]]
        if not inner:
            continue
        b = inner[0]
        while b in starts and b < a + n[a]:
            b += n[b]
        if b != a + n[a]:
            changed.update([a] + inner)
    return {a: 1 if a in changed else n[a] for a in executed}, sorted(changed)


def zap(m):
    m.codemap("zap")
    m.codemap("start")
    print("code map cleared and recording")


def dump(m, gdir, merge=False):
    record = m.codemap("read")
    if not record.get("instructions"):
        sys.exit("the code map is empty: zap, play, then dump")
    ram_size = 0x4000 if "16 KB" in m.status().get("model", "") else 0x10000
    executed, left = fold([a for a, _, _ in record["instructions"]], ram_size)
    if left:
        print(f"note: left out {left} instructions at $8000-$FFFF, where the ROMs are paged in "
              "(the KERNAL's interrupt entry runs there in every game)")
    path = os.path.join(gdir, "codemap.json")
    if merge and os.path.isfile(path):
        executed |= set(json.load(open(path)).get("executed", []))
    ram = bytes(m.read(0, 0x10000, space="ram"))
    size, changed = sizes(executed, ram)
    if changed:
        print(f"warning: {len(changed)} instructions overlap without rejoining, at "
              + ", ".join(f"${s:04X}" + (f"-${e:04X}" if e > s else "") for s, e in runs(changed))
              + ": most often the game rewrote those bytes after running them, so only their opcodes are "
              "counted as ran")
    ran = set()
    for a, k in size.items():
        ran.update((a + i) & 0xFFFF for i in range(k))
    starts, code = sorted(executed), runs(ran)
    with open(path, "w") as f:
        json.dump({"starts": starts, "code": code, "executed": starts, "ran": code}, f)
    print(f"code map: {len(ran)} bytes ran in {len(code)} runs ({len(starts)} instructions)")


if __name__ == "__main__":
    args = sys.argv[1:]
    merge = "--merge" in args
    args = [a for a in args if a != "--merge"]
    if len(args) != 2 or args[1] not in ("zap", "dump") or (merge and args[1] != "dump"):
        sys.exit("usage: codemap.py <game dir> zap|dump [--merge]")
    if not os.path.isdir(args[0]):
        sys.exit(f"no such game dir: {args[0]}")
    machine = connect()
    zap(machine) if args[1] == "zap" else dump(machine, args[0], merge)
