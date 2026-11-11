#!/usr/bin/env python3
"""Read a C64 tape image (.tap): the files the KERNAL's own loader reads from it, straight from
the pulses, with no emulator.

A TAP is "C64-TAPE-RAW", a version byte, three more bytes, the length of the data in four, and
the data: a byte for each pulse, its length in units of 8 cycles of the machine's clock. A zero
byte is a pulse too long for one byte: in version 1 the next three bytes give its length in
cycles, and in version 0 nothing does, so it is taken as a gap.

The KERNAL writes three pulses, near 376, 528 and 700 cycles: short, medium and long. A byte is
20 of them: a long and a medium to mark it, then nine pairs, a short and a medium for a 0 and a
medium and a short for a 1: the eight bits from the lowest, and a bit that makes the count of
ones odd. A block is a countdown ($89 to $81), its bytes and their exclusive or, and it is
written twice, the copy after the countdown $09 to $01. A file is a header block of 192 bytes
(the type, the start and end addresses, a name of 16 characters, then 171 bytes that are spaces
unless a loader keeps code there) and a block of its bytes. The header lands in the tape buffer
at $033C, so those 171 bytes are in memory from $0351 while the file loads. A data file is a
header of type 4 and blocks of type 2 after it.

That is all this reads. Most games load a short program this way and that program reads the
rest of the tape in a faster format of its own: `list` says where on the tape such a stretch
lies and how long it is, and reads none of it.

  waves(blob, path)        the tape's pulses, each a length in cycles
  items(W)                 what the tape holds, as kit/c64/media.py's items (its docstring has
                           the fields): each file, a header that carries more than spaces, and
                           each stretch that is neither a KERNAL block nor a tone

Usage:
  tap.py <image>                  (or: tap.py list <image>) each file with its type, the
                                  addresses its header gives and its length, each block's
                                  checksum checked and its first good writing taken; then the
                                  stretches in a format this does not read
  tap.py extract <image> <dir>    each program to <dir>/<name>.prg, its two-byte address first,
                                  and each header that carries code to <name>.header.prg, at
                                  $033C. A file is a part of the game: <dir> belongs in work/
"""
import os, sys
from functools import reduce

SHORT, MEDIUM, LONG = 376, 528, 700     # the KERNAL's three pulses, in cycles; told apart halfway between
KINDS = {1: "relocatable program", 3: "program", 4: "data file"}
BUFFER = 0x033C                         # where a header's 192 bytes land
TONE = 0.1                              # a stretch is tones when no more than this share of its pulses change length
SILENCE = 5000                          # a pulse this long is a gap in the recording
GAP = 20000                             # what a version 0 overflow byte is taken as


def petscii(raw):
    """A name as text: printable PETSCII as it is, any other byte as {hex} (kit/c64/media.py)."""
    return "".join(chr(b) if 0x20 <= b <= 0x5F else f"{{{b:02X}}}" for b in raw)


def xor(data):
    return reduce(lambda a, b: a ^ b, data, 0)


def waves(blob, path="tape"):
    """The tape's pulses, each a length in cycles."""
    if blob[:12] != b"C64-TAPE-RAW" or len(blob) < 20:
        sys.exit(f"{path}: not a C64 TAP (expected C64-TAPE-RAW at the start)")
    version = blob[12]
    if version not in (0, 1):
        sys.exit(f"{path}: TAP version {version}; this reads versions 0 and 1")
    data = blob[20:20 + int.from_bytes(blob[16:20], "little")]
    out, p = [], 0
    while p < len(data):
        if data[p]:
            out.append(data[p] * 8)
            p += 1
        elif version == 1 and p + 3 < len(data):
            out.append(int.from_bytes(data[p + 1:p + 4], "little"))
            p += 4
        else:
            out.append(GAP)
            p += 1
    return out


# --- the KERNAL's format, which the C16's tapes share with other pulse lengths (kit/c16/media.py) ---

def kernal_runs(W, short=SHORT, medium=MEDIUM, long=LONG):
    """[(first pulse, bytes)] of every run of bytes in the KERNAL's format. A byte whose marker,
    pairs or parity are wrong ends its run."""
    S = lambda x: x < (short + medium) // 2
    M = lambda x: (short + medium) // 2 <= x < (medium + long) // 2
    L = lambda x: (medium + long) // 2 <= x < long * 3 // 2
    runs, i = [], 0
    while i + 19 < len(W):
        byte = None
        if L(W[i]) and M(W[i + 1]):
            bits = []
            for k in range(9):
                a, b = W[i + 2 + 2 * k], W[i + 3 + 2 * k]
                if S(a) and M(b):
                    bits.append(0)
                elif M(a) and S(b):
                    bits.append(1)
                else:
                    break
            if len(bits) == 9 and sum(bits) & 1:
                byte = sum(bit << n for n, bit in enumerate(bits[:8]))
        if byte is None:
            i += 1
            continue
        if runs and runs[-1][0] + 20 * len(runs[-1][1]) == i:
            runs[-1][1].append(byte)
        else:
            runs.append((i, bytearray([byte])))
        i += 20
    return [(at, bytes(b)) for at, b in runs]


def kernal_blocks(runs):
    """[{"at", "end", "data", "copies", "bad", "problem"}] of the blocks: a run that opens with
    the countdown $89 to $81 is a block's first writing and one with $09 to $01 its copy. The
    first writing is the one listed, unless its checksum is wrong and the copy's is right."""
    first, copy = bytes(range(0x89, 0x80, -1)), bytes(range(0x09, 0x00, -1))
    out = []
    for at, run in runs:
        if len(run) < 11 or run[:9] not in (first, copy):
            continue
        body, wrong = run[9:-1], xor(run[9:]) != 0
        last = out[-1] if out else None
        if run[:9] == copy and last and last["copies"] == 1 and len(last["data"]) == len(body):
            last["copies"] = 2
            if last["data"] != body:
                if last["bad"] and not wrong:
                    last.update(data=body, bad=False, problem="its first writing's checksum is wrong; the copy is listed")
                elif not wrong:
                    last["problem"] = "its two writings differ; the first is listed"
            continue
        out.append({"at": at + 180, "end": at + 20 * len(run), "data": body, "copies": 1, "bad": wrong,
                    "problem": "its checksum is wrong" if wrong else None})
    for b in out:
        if b["copies"] == 1 and not b["problem"]:
            b["problem"] = "written once, where the KERNAL writes every block twice"
    return out


def kernal_items(blocks, kinds=KINDS, buffer=(BUFFER, 0)):
    """The blocks as files. kinds names the header types that start a file; buffer is where a
    header lands, and how many of its bytes are left out there (the C16 keeps the type apart)."""
    out, k = [], 0
    while k < len(blocks):
        b = blocks[k]
        k += 1
        d = b["data"]
        if len(d) != 192 or d[0] not in kinds:
            if len(d) == 192 and d[0] == 5:
                continue                                    # the end of the tape: nothing to load
            out.append({"label": f"block at pulse {b['at']}", "place": {"file": f"block at pulse {b['at']}",
                        "type": "block with no header", "pulse": b["at"]}, "load": None, "data": d, "raw": d,
                        **({"problem": b["problem"]} if b["problem"] else {})})
            continue
        start, end = d[1] | d[2] << 8, d[3] | d[4] << 8
        name = petscii(d[5:21].rstrip(b" ")) or f"file at pulse {b['at']}"
        wrong = [b["problem"]] if b["problem"] else []
        body = b""
        if d[0] == 4:
            while k < len(blocks) and len(blocks[k]["data"]) == 192 and blocks[k]["data"][0] == 2:
                body += blocks[k]["data"][1:]
                wrong += [blocks[k]["problem"]] if blocks[k]["problem"] else []
                k += 1
        elif k < len(blocks) and not (len(blocks[k]["data"]) == 192 and blocks[k]["data"][0] in (1, 3, 4, 5)):
            body = blocks[k]["data"]
            wrong += [blocks[k]["problem"]] if blocks[k]["problem"] else []
            k += 1
            if len(body) != (end - start) & 0xFFFF:
                wrong.append(f"its header says {(end - start) & 0xFFFF:,} bytes and the block holds {len(body):,}")
        else:
            wrong.append("a header with no block after it")
        item = {"label": name, "place": {"file": name, "type": kinds[d[0]], "pulse": b["at"]},
                "load": None if d[0] == 4 else start, "data": body, "raw": d + body}
        if wrong:
            item["problem"] = "; ".join(wrong)
        out.append(item)
        if d[21:].strip(b" "):
            label = f"{name} (header)"
            out.append({"label": label, "place": {"file": label, "type": "header", "pulse": b["at"]},
                        "load": buffer[0], "data": d[buffer[1]:], "raw": d[buffer[1]:]})
    return out


def is_tone(stretch):
    """True when a stretch is tones and silence: leaving out the gaps where the tape stood still,
    hardly a pulse differs from the one before it by more than an eighth. Bytes in any format
    change length from pulse to pulse."""
    waves = [x for x in stretch if x < SILENCE]
    changes = sum(1 for a, b in zip(waves, waves[1:]) if abs(a - b) > max(a, b) / 8)
    return changes <= TONE * max(len(waves) - 1, 0)


def undecoded(W, taken):
    """[(first pulse, item)] of each stretch of 32 pulses or more outside taken ([(first, end)])
    that is not tones: a format this does not read, to be answered by hand."""
    out, pos = [], 0
    for a, b in sorted(taken) + [(len(W), len(W))]:
        stretch = W[pos:a]
        if len(stretch) >= 32 and not is_tone(stretch):
            label = f"pulses {pos}-{a - 1}"
            out.append((pos, {"label": label, "place": {"pulses": [pos, a - 1]}, "load": None, "data": b"",
                              "raw": b"".join(x.to_bytes(4, "little") for x in stretch),
                              "problem": f"{len(stretch):,} pulses in a format the kit does not decode"}))
        pos = max(pos, b)
    return out


def items(W):
    runs = kernal_runs(W)
    out = [(i["place"]["pulse"], i) for i in kernal_items(kernal_blocks(runs))]
    out += undecoded(W, [(at, at + 20 * len(run)) for at, run in runs])
    return [item for _, item in sorted(out, key=lambda x: x[0])]


def read(path):
    with open(path, "rb") as f:
        return items(waves(f.read(), path))


def file_name(label):
    """A label as a file name: a character a file name cannot hold written $hh."""
    return "".join(c if c.isalnum() or c in " ._-()+!#&',;=@[]{}" else f"${ord(c):02X}" for c in label).strip() or "unnamed"


def main(argv):
    if len(argv) == 3 and argv[0] == "extract":
        os.makedirs(argv[2], exist_ok=True)
        written = 0
        for it in read(argv[1]):
            if it["load"] is None or not it["data"]:
                continue
            name = file_name(it["label"][:-len(" (header)")] + ".header" if it["place"]["type"] == "header" else it["label"])
            path = os.path.join(argv[2], name + ".prg")
            with open(path, "wb") as f:
                f.write(bytes([it["load"] & 255, it["load"] >> 8]) + it["data"])
            written += 1
            print(f"{path}: ${it['load']:04X}, {len(it['data']):,} bytes" + (f"  ({it['problem']})" if it.get("problem") else ""))
        if not written:
            print(f"{argv[1]}: no file in the KERNAL's format")
        return 0
    if len(argv) == 2 and argv[0] == "list":
        argv = argv[1:]
    if len(argv) != 1 or argv[0].startswith("-"):
        print(__doc__)
        return 0 if argv and argv[0] in ("-h", "--help") else 2
    with open(argv[0], "rb") as f:
        W = waves(f.read(), argv[0])
    its = items(W)
    print(f"{argv[0]}: {len(W):,} pulses, {sum(1 for i in its if 'pulses' not in i['place'])} items in the KERNAL's format")
    for it in its:
        if "pulses" in it["place"]:
            a, b = it["place"]["pulses"]
            print(f"  pulses {a:,}-{b:,}: {it['problem']} ({sum(W[a:b + 1]) / 985248:.0f} seconds of tape)")
            continue
        at = f"${it['load']:04X}-${(it['load'] + len(it['data'])) & 0xFFFF:04X}" if it["load"] is not None else ""
        print(f"  {it['label']:<24} {it['place']['type']:<20} {at:<12} {len(it['data']):6,} bytes  at pulse {it['place']['pulse']:,}"
              + (f"  ({it['problem']})" if it.get("problem") else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
