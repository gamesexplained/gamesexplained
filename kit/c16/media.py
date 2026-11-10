#!/usr/bin/env python3
"""What a C16 or Plus/4 game's media hold, item by item: the reader kit/scripts/media.py asks.

  items(path) -> {"what": ..., "items": [item, ...]}

A tape, as a TAP file signed C16-TAPE-RAW (kit/skills/c16/c16-reference, "Tapes"), is read as
pulses and decoded twice over: the KERNAL's own format, and Novaload's, the turbo loader most
of these machines' tapes carry. Each item is a dict:

  label    how a person names it: a file's name as the tape gives it, without the spaces that
           pad it, printable PETSCII as it is and any other byte as {hex}; "NAME (header)" for
           what a header carries after the name; "Novaload file 2" for a turbo file with no
           name; "pulses 52187-60000" for a stretch the kit cannot decode
  place    where it is: {"file": label, "type": "program", "pulse": n}, n the first pulse of
           its first byte counted from the tape's start, or {"pulses": [first, last]}
  load     the address it loads at: the one in a file's header, $0333 for a header
  data     its bytes as they reach memory
  raw      its bytes on the tape, which the ledger hashes: a file's header and its bytes, a
           Novaload file from its name's length to its last checksum, a stretch's pulses
  problem  why what is listed may not be what loads, or absent

The KERNAL writes every block twice, a byte as a word marker and 8 bits with a parity bit, and
a block as a countdown ($89 to $81, then $09 to $01 on the copy), the bytes and their exclusive
or. A file is a header block of 192 bytes (the type, the start and end addresses, a name of 16
characters, then 171 bytes the KERNAL fills with spaces) and a block of its bytes. A loader
often keeps code in those 171 bytes, which land in the tape buffer at $0333 with the header: a
header that holds anything but spaces there is an item of its own. A data file's blocks (type
2) follow its header (type 4) and are joined into one item.

A Novaload file is a leader of 0 bits, a 1 bit, $AA, the length of its name, the name, six bytes
(the address less $100, the end address, the size of the last block and one more than the count of
whole blocks) and a checksum, then blocks of 256 bytes, each with a checksum after it: the sum, in a
byte, of every byte before it from the name's length on. A bit is one wave and a byte's bits come
lowest first. The format is read off the loader itself, which times a wave with TED's timer 2 loaded
with $018F and takes one the timer runs out on as a 1: the tapes' two waves are near 296 and 536
cycles of the single clock, and the reader splits them at 416
(kit/lessons/2026-11-10-c16-tape-media.md).

What is left over when both have been read is tones and silence (a leader, a trailer, a gap) when
hardly a wave differs in length from the one before it, and is in no item. Any other stretch of 32
pulses or more is an item of no bytes with "problem" saying so: a turbo loader the kit does not
know, to be answered by hand. A D64, a PRG and a P00 are the C64's formats, and kit/c64/media.py
lists them.

  python3 kit/c16/media.py <image>     the items, one a line
"""
import importlib.util, os, sys
from functools import reduce

HERE = os.path.dirname(os.path.abspath(__file__))

SHORT, LONG, MARK = 424, 848, 1696      # the KERNAL's three waves, in cycles of the single clock
TURBO = 416                             # Novaload: a wave shorter than this is a 0
KINDS = {1: "BASIC program", 3: "program", 4: "data file"}
LEADER = 64                             # 0 bits a Novaload leader has at the least
TONE = 0.1                              # a stretch is tones when no more than this share of its waves change length
SILENCE = 5000                          # a wave this long is a gap in the recording, not a wave


def petscii(raw):
    """A name as text: printable PETSCII as it is, any other byte as {hex} (kit/c64/media.py)."""
    return "".join(chr(b) if 0x20 <= b <= 0x5F else f"{{{b:02X}}}" for b in raw)


def xor(data):
    return reduce(lambda a, b: a ^ b, data, 0)


def waves(blob, path="tape"):
    """The tape's waves, each a length in cycles of the single clock. A byte is a wave in units
    of 8 cycles (half a wave in version 2, where two make one here); a zero is followed by three
    bytes giving the length in cycles."""
    if blob[:12] != b"C16-TAPE-RAW" or len(blob) < 20:
        sys.exit(f"{path}: not a C16 TAP (expected C16-TAPE-RAW at the start)")
    version = blob[12]
    if version not in (1, 2):
        sys.exit(f"{path}: TAP version {version}; the kit reads versions 1 and 2, as plus4emu does")
    data = blob[20:20 + int.from_bytes(blob[16:20], "little")]
    out, p = [], 0
    while p < len(data):
        if data[p] == 0 and p + 3 < len(data):
            out.append(int.from_bytes(data[p + 1:p + 4], "little"))
            p += 4
        else:
            out.append(data[p] * 8)
            p += 1
    if version == 2:
        out = [a + b for a, b in zip(out[0::2], out[1::2])]
    return out


# --- the KERNAL's format ---------------------------------------------------------------------

def kernal_runs(W):
    """[(first wave, bytes)] of every run of bytes in the KERNAL's format: a byte is a word
    marker and a long, then nine pairs, a short and a long for a 0 and a long and a short for a
    1: eight bits from the lowest and an odd parity. A byte whose parity is wrong ends its run."""
    S = lambda x: x < (SHORT + LONG) // 2
    M = lambda x: (SHORT + LONG) // 2 <= x < (LONG + MARK) // 2
    L = lambda x: (LONG + MARK) // 2 <= x < MARK * 3 // 2
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


def kernal_items(blocks):
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
                        "load": 0x0333, "data": d[1:], "raw": d[1:]})
    return out


# --- Novaload ----------------------------------------------------------------------------------

def novaload_files(W, taken):
    """[{"at", "end", "name", "load", "data", "raw", "problem"}] of the Novaload files outside
    the stretches the KERNAL's blocks took ([(first, end)], sorted)."""
    bit = lambda k: W[k] >= TURBO
    byte = lambda k: sum(bit(k + j) << j for j in range(8))
    out, n = [], len(W)
    edges = [0] + [x for span in taken for x in span] + [n]
    for lo, hi in zip(edges[0::2], edges[1::2]):
        i = lo
        while i < hi - 8 * 9:
            if bit(i):
                i += 1
                continue
            j = i
            while j < hi and not bit(j):
                j += 1
            if j - i < LEADER or j + 8 * 9 >= hi or byte(j + 1) != 0xAA:
                i = j + 1
                continue
            k = j + 9
            size = byte(k)
            if size > 16 or k + 8 * (size + 8) > hi:
                i = j + 1
                continue
            head = bytes(byte(k + 8 * t) for t in range(size + 8))
            if sum(head[:-1]) & 0xFF != head[-1]:
                i = j + 1                                   # not a header: the stretch stays undecoded
                continue
            k += 8 * len(head)
            f = {"at": i, "name": head[1:1 + size], "load": ((head[size + 1] | head[size + 2] << 8) + 0x100) & 0xFFFF,
                 "problem": None}
            raw, data = bytearray(head), bytearray()
            last, count = head[size + 5], head[size + 6]
            while count:
                count -= 1
                want = 256 if count else last
                if not want:
                    break
                if k + 8 * (want + 1) > hi:
                    f["problem"] = f"the tape ends {len(data):,} bytes into it"
                    break
                block = bytes(byte(k + 8 * t) for t in range(want + 1))
                k += 8 * len(block)
                raw += block
                if sum(raw[:-1]) & 0xFF != block[-1]:
                    f["problem"] = (f"the checksum after its first {len(data) + want:,} bytes is wrong; "
                                    "what came before is listed")
                    k = min(hi, k + 8 * (257 * max(count - 1, 0) + (last + 1 if count and last else 0)))   # its end
                    break
                data += block[:-1]
            f.update(end=k, data=bytes(data), raw=bytes(raw))
            out.append(f)
            i = k
    return out


# --- the tape ----------------------------------------------------------------------------------

def is_tone(stretch):
    """True when a stretch is tones and silence: leaving out the gaps where the tape stood still,
    hardly a wave differs from the one before it by more than an eighth. Bytes in any format
    change length from wave to wave."""
    waves = [x for x in stretch if x < SILENCE]
    changes = sum(1 for a, b in zip(waves, waves[1:]) if abs(a - b) > max(a, b) / 8)
    return changes <= TONE * max(len(waves) - 1, 0)


def tape_items(W):
    runs = kernal_runs(W)
    taken = [(at, at + 20 * len(run)) for at, run in runs]
    files = novaload_files(W, taken)
    out = [(i["place"]["pulse"], i) for i in kernal_items(kernal_blocks(runs))]
    for n, f in enumerate(files, 1):
        label = petscii(f["name"].rstrip(b" ")) or f"Novaload file {n}"
        item = {"label": label, "place": {"file": label, "type": "Novaload", "pulse": f["at"]}, "load": f["load"],
                "data": f["data"], "raw": f["raw"]}
        if f["problem"]:
            item["problem"] = f["problem"]
        out.append((f["at"], item))
    pos = 0
    for a, b in sorted(taken + [(f["at"], f["end"]) for f in files]) + [(len(W), len(W))]:
        stretch = W[pos:a]
        if len(stretch) >= 32 and not is_tone(stretch):
            label = f"pulses {pos}-{a - 1}"
            out.append((pos, {"label": label, "place": {"pulses": [pos, a - 1]}, "load": None, "data": b"",
                              "raw": b"".join(x.to_bytes(4, "little") for x in stretch),
                              "problem": f"{len(stretch):,} pulses in a format the kit does not decode"}))
        pos = max(pos, b)
    return [item for _, item in sorted(out, key=lambda x: x[0])]


def c64_reader():
    spec = importlib.util.spec_from_file_location("c64_media", os.path.join(HERE, "..", "c64", "media.py"))
    mod = importlib.util.module_from_spec(spec)
    keep = list(sys.path)
    try:
        spec.loader.exec_module(mod)
    finally:
        sys.path[:] = keep
    return mod


def items(path):
    """What one image holds; for an image the kit cannot read yet, no items and "unread", why."""
    low = path.lower()
    if low.endswith(".tap"):
        with open(path, "rb") as f:
            return {"what": "tape", "items": tape_items(waves(f.read(), path))}
    if low.endswith((".d64", ".g64", ".prg", ".p00")):
        return c64_reader().items(path)
    return {"what": "image", "items": None,
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
        at = f" at ${it['load']:04X}" if it.get("load") is not None else ""
        print(f"  {it['label']:<24} {len(it['data']):6} bytes{at}  {it['place'].get('type', '')}"
              + (f"  ({it['problem']})" if it.get("problem") else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
