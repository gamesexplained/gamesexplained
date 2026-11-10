#!/usr/bin/env python3
"""What a Spectrum game's tape holds, item by item: the reader kit/scripts/media.py asks.

  items(path) -> {"what": "tape", "items": [item, ...]}

A .tzx or a .tap. Every block that carries bytes is in one item, and blocks are numbered from 1
through the whole file, as SkoolKit's tapinfo.py numbers them. Each item is a dict:

  label    how a person names it: a file's name as its header gives it, without the spaces
           that pad it, printable ASCII as it is and any other byte as {hex}; "block 7" for a
           block with no header
  place    where it is: {"file": label, "type": "code", "blocks": [4, 5]} for a header and
           the block it describes, or {"block": 7}; "flag" is a block's first byte when the
           block keeps the ROM's form (below), and "timing" says how a block that is not at
           the ROM's speed was recorded ("turbo", "pure data")
  load     the address a code file's header says it was saved from (a BASIC line may load it
           elsewhere); None for a program, an array and a block with no header
  data     its bytes as they reach memory: the block without its flag and parity bytes
  raw      its bytes on the tape, header included, which the ledger hashes
  problem  why what is listed may not be what loads, or absent

The ROM's form of a block is a flag byte, the bytes, and a parity byte that makes the exclusive
or of the whole block zero. A header is a block of 19 bytes in that form whose flag is 0 and
whose type is 0 to 3 (program, number array, character array, code); the next block with bytes,
when its flag is $FF, is its file. Every other block is an item of its own. A loader of the
game's own that is the ROM's routine at another speed keeps the ROM's form, so a standard or
turbo block whose bytes come to zero is taken to have it, and its flag and parity are left out
of "data" as they are for a file. One whose bytes do not come to zero is listed whole. So is
every pure data block ($14), which is how a tape image records a loader with a pilot tone of
its own: such a loader rarely keeps the ROM's form, and one block in 256 comes to zero by chance.

Three kinds of TZX block hold a recording of the signal, not bytes: a direct recording ($15),
a CSW recording ($18) and generalized data ($19). Each is an item of no bytes with "problem"
saying so, to be answered by hand. Tones, pulses, pauses, text and the blocks that steer a
player hold nothing a game loads, and are in no item. A disk image and a snapshot have no reader
yet: each is listed with "unread" and no items.

  python3 kit/spectrum/media.py <image>     the items, one a line
"""
import os, sys
from functools import reduce

TYPES = {0: "program", 1: "number array", 2: "character array", 3: "code"}
RECORDINGS = {0x15: "direct recording", 0x18: "CSW recording", 0x19: "generalized data"}
SNAPSHOTS = (".z80", ".sna", ".szx", ".slt")


def le(b, p, n):
    return int.from_bytes(b[p:p + n], "little")


def tzx_blocks(blob, path="tape"):
    """[(number, id, bytes)] of every block of a TZX, numbered from 1; bytes is None for a block
    that carries none, and the recording itself for one of RECORDINGS."""
    if blob[:8] != b"ZXTape!\x1a" or len(blob) < 10:
        sys.exit(f"{path}: not a TZX (expected ZXTape! at the start)")
    out, p, n = [], 10, 0
    while p < len(blob):
        n += 1
        i, p = blob[p], p + 1
        data = None
        if i == 0x10:
            size = le(blob, p + 2, 2); data = blob[p + 4:p + 4 + size]; step = 4 + size
        elif i == 0x11:
            size = le(blob, p + 15, 3); data = blob[p + 18:p + 18 + size]; step = 18 + size
        elif i == 0x14:
            size = le(blob, p + 7, 3); data = blob[p + 10:p + 10 + size]; step = 10 + size
        elif i == 0x15:
            size = le(blob, p + 5, 3); data = blob[p + 8:p + 8 + size]; step = 8 + size
        elif i in (0x18, 0x19):
            size = le(blob, p, 4); data = blob[p + 4:p + 4 + size]; step = 4 + size
        elif i == 0x12:
            step = 4
        elif i == 0x13:
            step = 1 + 2 * blob[p]
        elif i in (0x20, 0x23, 0x24):
            step = 2
        elif i in (0x22, 0x25, 0x27):
            step = 0
        elif i == 0x21 or i == 0x30:
            step = 1 + blob[p]
        elif i == 0x26:
            step = 2 + 2 * le(blob, p, 2)
        elif i == 0x28 or i == 0x32:
            step = 2 + le(blob, p, 2)
        elif i == 0x2A:
            step = 4
        elif i == 0x2B:
            step = 5
        elif i == 0x31:
            step = 2 + blob[p + 1]
        elif i == 0x33:
            step = 1 + 3 * blob[p]
        elif i == 0x34:
            step = 8
        elif i == 0x35:
            step = 20 + le(blob, p + 16, 4)
        elif i == 0x40:
            step = 4 + le(blob, p + 1, 3)
        elif i == 0x5A:
            step = 9
        else:                       # $16, $17 and any later kind: four bytes of length, then the block
            step = 4 + le(blob, p, 4)
        if p + step > len(blob):
            sys.exit(f"{path}: block {n} (${i:02X}) runs past the end of the file")
        out.append((n, i, bytes(data) if data is not None else None))
        p += step
    return out


def tap_blocks(blob, path="tape"):
    """[(number, $10, bytes)] of every block of a .tap: two bytes of length, then the block."""
    out, p, n = [], 0, 0
    while p < len(blob):
        n += 1
        size = le(blob, p, 2)
        if p + 2 + size > len(blob):
            sys.exit(f"{path}: block {n} runs past the end of the file")
        out.append((n, 0x10, bytes(blob[p + 2:p + 2 + size])))
        p += 2 + size
    return out


def rom_form(block):
    """True when the block's bytes come to zero under exclusive or: a flag, bytes, a parity."""
    return len(block) >= 2 and reduce(lambda a, b: a ^ b, block, 0) == 0


def name_of(raw):
    return "".join(chr(b) if 0x20 <= b <= 0x7E else f"{{{b:02X}}}" for b in raw.rstrip(b" "))


def timing(i):
    return {0x11: "turbo", 0x14: "pure data"}.get(i)


def tape_items(blocks):
    with_bytes = [b for b in blocks if b[2] is not None]
    out, k = [], 0
    while k < len(with_bytes):
        n, i, block = with_bytes[k]
        k += 1
        if i in RECORDINGS:
            out.append({"label": f"block {n}", "place": {"block": n, "timing": RECORDINGS[i]}, "load": None,
                        "data": b"", "raw": block,
                        "problem": f"a {RECORDINGS[i]} of the signal, which the kit does not turn into bytes"})
            continue
        head = len(block) == 19 and block[0] == 0 and block[1] in TYPES and rom_form(block)
        follows = with_bytes[k] if k < len(with_bytes) else None
        if head and follows and follows[1] not in RECORDINGS and follows[2][:1] == b"\xff":
            n2, i2, body = follows
            k += 1
            said = le(block, 12, 2)
            label = name_of(block[2:12]) or f"block {n}"
            item = {"label": label,
                    "place": {"file": label, "type": TYPES[block[1]], "blocks": [n, n2]},
                    "load": le(block, 14, 2) if block[1] == 3 else None,
                    "data": body[1:-1] if rom_form(body) else body[1:], "raw": block + body}
            if timing(i2):
                item["place"]["timing"] = timing(i2)
            wrong = []
            if not rom_form(body):
                wrong.append("its parity byte does not match, so the ROM would report a loading error")
            if len(item["data"]) != said:
                wrong.append(f"its header says {said:,} bytes and the block holds {len(item['data']):,}")
            if wrong:
                item["problem"] = "; ".join(wrong)
            out.append(item)
            continue
        item = {"label": f"block {n}", "place": {"block": n}, "load": None, "data": block, "raw": block}
        if i in (0x10, 0x11) and rom_form(block):
            item["place"]["flag"] = f"${block[0]:02X}"
            item["data"] = block[1:-1]
        if timing(i):
            item["place"]["timing"] = timing(i)
        if head:
            item["problem"] = f"a header for {name_of(block[2:12]) or 'a file with no name'} with no block after it"
        out.append(item)
    return out


def items(path):
    """What one image holds; for an image the kit cannot read yet, no items and "unread", why."""
    low = path.lower()
    if low.endswith((".tzx", ".tap")):
        with open(path, "rb") as f:
            blob = f.read()
        return {"what": "tape", "items": tape_items(tzx_blocks(blob, path) if low.endswith(".tzx")
                                                    else tap_blocks(blob, path))}
    if low.endswith(SNAPSHOTS):
        return {"what": "snapshot", "items": None,
                "unread": "a snapshot holds the machine's memory, not the tape or disk the game came on"}
    kind = "disk" if low.endswith((".dsk", ".trd", ".scl", ".mgt", ".img")) else "image"
    return {"what": kind, "items": None,
            "unread": f"the kit has no reader for a {os.path.splitext(low)[1] or 'file'} yet"}


def main():
    if len(sys.argv) != 2 or sys.argv[1] in ("-h", "--help"):
        print(__doc__)
        return 0
    got = items(sys.argv[1])
    if got.get("unread"):
        print(f"{sys.argv[1]}: {got['unread']}")
        return 0
    its = got["items"]
    print(f"{sys.argv[1]}: a {got['what']}, {len(its)} items")
    for it in its:
        p = it["place"]
        where = f"blocks {p['blocks'][0]}-{p['blocks'][1]}, {p['type']}" if "blocks" in p else \
            ", ".join(x for x in (p.get("timing"), f"flag {p['flag']}" if "flag" in p else None) if x)
        at = f" from ${it['load']:04X}" if it.get("load") is not None else ""
        print(f"  {it['label']:<12} {len(it['data']):6} bytes{at}  {where}"
              + (f"  ({it['problem']})" if it.get("problem") else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
