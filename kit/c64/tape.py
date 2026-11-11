#!/usr/bin/env python3
"""A Commodore tape read as pulses: the TAP file, the KERNAL's own format and the turbo formats
the kit knows. kit/c64/media.py lists a C64's tape with tape_items(); kit/c16/media.py reads the
KERNAL's format with the functions here and its own machine's pulse lengths.

A TAP file signed C64-TAPE-RAW is the tape's pulses, one after another (kit/skills/c64/c64-reference,
"Tapes"). Each item tape_items() gives is a dict:

  label    how a person names it: a file's name as the tape gives it, without the spaces that pad
           it, printable PETSCII as it is and any other byte as {hex}; "NAME (header)" for what a
           header carries after the name; "turbo block 3" for a block in a turbo format, counted
           from the tape's start; "pulses 52187-60000" for a stretch the kit cannot decode
  place    where it is: {"file": label, "type": "program", "pulse": n}, n the first pulse of its
           first byte counted from the tape's start (for a turbo block, of its pilot), or
           {"pulses": [first, last]}
  load     the address it loads at: the one in a file's or a block's header, $033C for a header
  data     its bytes as they reach memory
  raw      its bytes on the tape, which the ledger hashes: a file's header and its bytes, a turbo
           block from its addresses to its last byte, a stretch's pulses
  problem  why what is listed may not be what loads, or absent

The KERNAL writes every block twice, a byte as a marker (a long pulse and a medium one) and nine
pairs, a short and a medium for a 0 and a medium and a short for a 1: eight bits from the lowest
and an odd parity. A block is a countdown ($89 to $81, then $09 to $01 on the copy), the bytes and
their exclusive or. A file is a header block of 192 bytes (the type, the start and end addresses,
a name of 16 characters, then 171 bytes the KERNAL fills with spaces) and a block of its bytes.
The header lands whole in the tape buffer, and a loader often keeps code in those 171 bytes: a
header that holds anything but spaces there is an item of its own. A data file's blocks (type 2)
follow its header (type 4) and are joined into one item.

A turbo format is a loader's own, faster than the KERNAL's: nearly always a bit a pulse, a pulse
longer than the loader's timer a 1. The kit reads the formats in TURBO, each read off a game's own
loader (kit/lessons/2026-11-11-c64-tape-media.md), and every one of them is a block of this shape:
a pilot, one byte repeated, which the loader finds bit by bit; a sync byte; the block's first
address and the address after its last, low byte first; and the bytes. A format with no checksum
its loader reads gives the reader none either: what proves such a block is the game's listing
holding the same bytes.

What is left over when both have been read is tones and silence (a leader, a trailer, a gap) when
hardly a pulse differs in length from the one before it, and is in no item. Any other stretch of
32 pulses or more is an item of no bytes with "problem" saying so: a turbo loader the kit does not
know, to be answered by hand.

  python3 kit/c64/tape.py <tape.tap>     the items, one a line (kit/c64/media.py prints the same)
"""
import sys
from collections import Counter
from functools import reduce

SHORT, MEDIUM, LONG = 376, 536, 696     # the C64 KERNAL's three pulses, in cycles (c64-reference, "Tapes")
BUFFER = 0x033C                         # the C64's tape buffer, where a header lands whole
KINDS = {1: "BASIC program", 3: "program", 4: "data file"}
TONE = 0.1                              # a stretch is tones when no more than this share of its pulses change length
SILENCE = 5000                          # a pulse this long is a gap in the recording, not a pulse
LEAST = 32                              # a stretch shorter than this is in no item

# The turbo formats: a pulse of "split" cycles or more is a 1, a byte's bits come lowest first when
# "lsb" is set, "pilot" is the byte the loader looks for bit by bit and "sync" the one that ends the
# pilot. "least" is how many pilot bytes a block needs to be taken for one.
TURBO = [
    # CIA 2's timer A at 384 cycles, restarted some 16 cycles after each pulse; no checksum
    {"name": "pilot $E3, sync $ED", "split": 400, "lsb": True, "pilot": 0xE3, "sync": 0xED, "least": 8},
]


def petscii(raw):
    """A name as text: printable PETSCII as it is, any other byte as {hex} (kit/c64/loads.py)."""
    return "".join(chr(b) if 0x20 <= b <= 0x5F else f"{{{b:02X}}}" for b in raw)


def xor(data):
    return reduce(lambda a, b: a ^ b, data, 0)


def waves(blob, path="tape"):
    """The tape's pulses, each a length in cycles of the machine's clock. A byte is a pulse in
    units of 8 cycles. A zero is a pulse too long for a byte: in version 1 the three bytes after
    it give its length in cycles, and in version 0 nothing does, so it is taken as a gap, SILENCE
    cycles long."""
    if blob[:12] != b"C64-TAPE-RAW" or len(blob) < 20:
        sys.exit(f"{path}: not a C64 TAP (expected C64-TAPE-RAW at the start)")
    version = blob[12]
    if version not in (0, 1):
        sys.exit(f"{path}: TAP version {version}; the kit reads a C64's versions 0 and 1")
    if blob[13] != 0:
        sys.exit(f"{path}: a tape for machine {blob[13]} of the TAP format's list, not a C64's (0)")
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
            out.append(SILENCE)
            p += 1
    return out


# --- the KERNAL's format -----------------------------------------------------------------------

def kernal_runs(W, short=SHORT, medium=MEDIUM, long=LONG):
    """[(first pulse, bytes)] of every run of bytes in the KERNAL's format, for a machine whose
    three pulses are short, medium and long cycles. A byte whose parity is wrong ends its run."""
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
    """[{"at", "data", "copies", "problem"}] of the blocks: a run that opens with the countdown
    $89 to $81 is a block's first writing and one with $09 to $01 its copy."""
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


def kernal_items(blocks, buffer=BUFFER, skip=0):
    """The files the blocks make. A header that holds more than spaces after its name is an item
    too, "NAME (header)": its bytes from the one numbered skip, at the address buffer, which is
    where the machine's tape buffer puts them."""
    out, k = [], 0
    while k < len(blocks):
        b = blocks[k]
        k += 1
        d = b["data"]
        if len(d) != 192 or d[0] not in KINDS:
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
        item = {"label": name, "place": {"file": name, "type": KINDS[d[0]], "pulse": b["at"]},
                "load": None if d[0] == 4 else start, "data": body, "raw": d + body}
        if wrong:
            item["problem"] = "; ".join(wrong)
        out.append(item)
        if d[21:].strip(b" "):
            label = f"{name} (header)"
            out.append({"label": label, "place": {"file": label, "type": "header", "pulse": b["at"]},
                        "load": buffer, "data": d[skip:], "raw": d[skip:]})
    return out


# --- the turbo formats ---------------------------------------------------------------------------

def free(taken, n):
    """[(first, end)] of the stretches of n pulses outside taken ([(first, end)], sorted)."""
    edges = [0] + [x for span in taken for x in span] + [n]
    return [(lo, hi) for lo, hi in zip(edges[0::2], edges[1::2]) if hi > lo]


def turbo_blocks(W, taken, fmt):
    """[{"at", "end", "load", "data", "raw", "problem"}] of the blocks in one turbo format outside
    the stretches already read. A block is found as its loader finds it: the pilot's byte at any
    pulse, then pilot bytes, then the sync byte. "at" is the pilot's first pulse and "end" the
    pulse after the last byte's."""
    bit = lambda k: W[k] >= fmt["split"]
    if fmt["lsb"]:
        byte = lambda k: sum(bit(k + j) << j for j in range(8))
    else:
        byte = lambda k: sum(bit(k + j) << (7 - j) for j in range(8))
    out = []
    for lo, hi in free(taken, len(W)):
        i = lo
        while i + 8 * (fmt["least"] + 5) <= hi:
            if byte(i) != fmt["pilot"]:
                i += 1
                continue
            j = i
            while j + 8 <= hi and byte(j) == fmt["pilot"]:
                j += 8
            if (j - i) // 8 < fmt["least"] or j + 8 * 5 > hi or byte(j) != fmt["sync"]:
                i += 1
                continue
            k = j + 8
            head = bytes(byte(k + 8 * t) for t in range(4))
            start, end = head[0] | head[1] << 8, head[2] | head[3] << 8
            k += 32
            size = end - start if end > start else 1        # the loader stores a byte before it compares
            got = min(size, (hi - k) // 8)
            data = bytes(byte(k + 8 * t) for t in range(got))
            problem = []
            if got < size:
                problem.append(f"the tape ends {got:,} bytes into it")
            if any(x >= SILENCE for x in W[k:k + 8 * got]):
                problem.append("a gap in the recording falls inside it")
            k += 8 * got
            out.append({"at": i, "end": k, "load": start, "data": data, "raw": head + data,
                        "problem": "; ".join(problem) or None})
            i = k
    return out


# --- the tape --------------------------------------------------------------------------------------

def is_tone(stretch):
    """True when a stretch is tones and silence: leaving out the gaps where the tape stood still,
    hardly a pulse differs from the one before it by more than an eighth. Bytes in any format
    change length from pulse to pulse."""
    pulses = [x for x in stretch if x < SILENCE]
    changes = sum(1 for a, b in zip(pulses, pulses[1:]) if abs(a - b) > max(a, b) / 8)
    return changes <= TONE * max(len(pulses) - 1, 0)


def leftovers(W, taken):
    """[(first pulse, item)] of the stretches outside taken that are neither tones nor short."""
    out = []
    for lo, hi in free(sorted(taken), len(W)):
        stretch = W[lo:hi]
        if len(stretch) >= LEAST and not is_tone(stretch):
            label = f"pulses {lo}-{hi - 1}"
            out.append((lo, {"label": label, "place": {"pulses": [lo, hi - 1]}, "load": None, "data": b"",
                             "raw": b"".join(x.to_bytes(4, "little") for x in stretch),
                             "problem": f"{len(stretch):,} pulses in a format the kit does not decode"}))
    return out


def lengths(stretch, most=2):
    """The commonest pulse lengths of a stretch, in cycles, shortest first: what to tell a person
    about one the kit cannot decode."""
    return sorted(x for x, _ in Counter(x for x in stretch if x < SILENCE).most_common(most))


def tape_items(W):
    """What a C64 tape's pulses hold: the KERNAL's files, the blocks of every turbo format in
    TURBO, and the stretches neither took."""
    runs = kernal_runs(W)
    taken = [(at, at + 20 * len(run)) for at, run in runs]
    out = [(i["place"]["pulse"], i) for i in kernal_items(kernal_blocks(runs))]
    blocks = []
    for fmt in TURBO:
        for b in turbo_blocks(W, sorted(taken), fmt):
            taken.append((b["at"], b["end"]))
            blocks.append((b, fmt))
    for n, (b, fmt) in enumerate(sorted(blocks, key=lambda x: x[0]["at"]), 1):
        label = f"turbo block {n}"
        item = {"label": label, "place": {"file": label, "type": f"turbo, {fmt['name']}", "pulse": b["at"]},
                "load": b["load"], "data": b["data"], "raw": b["raw"]}
        if b["problem"]:
            item["problem"] = b["problem"]
        out.append((b["at"], item))
    for at, item in leftovers(W, taken):
        a, b = item["place"]["pulses"]
        common = lengths(W[a:b + 1])
        if len(common) == 2:
            item["problem"] += f", most of them {common[0]} or {common[1]} cycles long"
        out.append((at, item))
    return [item for _, item in sorted(out, key=lambda x: x[0])]


def main():
    if len(sys.argv) != 2 or sys.argv[1] in ("-h", "--help"):
        print(__doc__)
        return 0
    with open(sys.argv[1], "rb") as f:
        its = tape_items(waves(f.read(), sys.argv[1]))
    print(f"{sys.argv[1]}: a tape, {len(its)} items")
    for it in its:
        at = f" at ${it['load']:04X}" if it.get("load") is not None else ""
        print(f"  {it['label']:<24} {len(it['data']):6} bytes{at}  {it['place'].get('type', '')}"
              + (f"  ({it['problem']})" if it.get("problem") else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
