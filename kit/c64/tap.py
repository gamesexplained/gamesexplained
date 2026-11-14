#!/usr/bin/env python3
"""Read a C64 tape image (.tap): the files the KERNAL's own loader reads from it, and the blocks
in the turbo formats the kit knows, straight from the pulses, with no emulator.

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

Most games load a short program this way and that program reads the rest of the tape in a
faster format of its own, a turbo format: nearly always a bit a pulse, a pulse longer than the
loader's timer a 1. This reads the formats in TURBO, each read off a game's own loader
(kit/lessons/2026-11-11-c64-tape-media.md). A row of the first kind is a block of this shape: a
pilot, one byte repeated, which the loader finds bit by bit; a sync byte; the block's first
address and the address after its last, low byte first; and the bytes. A row of kind "pages" is
a stream of pages instead: a lead-in of 0 bits, the first 1 bit, then for each page a byte of
flags for the loader, the page's number and its 256 bytes, until a page numbered 0 ends the
stream. Each run of pages that follow one another in memory is a block, its raw bytes the pages
as the tape holds them, flags and number first. A row of the kind may also want a byte after the
1, other end marks and pages mostly in runs (page_blocks says how). A row of kind "novaload" is a file with a name:
a lead-in of 0 bits, a 1, $AA, the name, a header and pages, each checked by a checksum
(novaload_blocks says how). A row of kind "ocean84" is a stream of pages after a lead-in, a 1
and $AA, each page a header byte and 256 bytes (ocean84_blocks says how). A format with no checksum
its loader reads gives this none either: what proves such a block is the game's listing holding
the same bytes. A block is the item "turbo block 3", counted from the tape's start, or
'turbo block 3 "NAME"' when its format names it, its place
{"file": label, "type": "turbo, <the format's name>", "pulse": n}, n the first pulse of its
pilot, and its raw bytes run from its addresses to its last byte.

A stretch in any other format is not read: `list` says where on the tape it lies, how long it is
and which two pulse lengths are commonest in it.

  waves(blob, path)        the tape's pulses, each a length in cycles
  items(W)                 what the tape holds, as kit/c64/media.py's items (its docstring has
                           the fields): each file, a header that carries more than spaces, each
                           turbo block, and each stretch that is none of those nor a tone

Usage:
  tap.py <image>                  (or: tap.py list <image>) each file with its type, the
                                  addresses its header gives and its length, each block's
                                  checksum checked and its first good writing taken; each turbo
                                  block with its addresses; then the stretches in a format this
                                  does not read
  tap.py extract <image> <dir>    each program and each turbo block to <dir>/<name>.prg, its
                                  two-byte address first, and each header that carries code to
                                  <name>.header.prg, at $033C. A file is a part of the game:
                                  <dir> belongs in work/
"""
import os, sys
from collections import Counter
from functools import reduce

SHORT, MEDIUM, LONG = 376, 528, 700     # the KERNAL's three pulses, in cycles; told apart halfway between
KINDS = {1: "relocatable program", 3: "program", 4: "data file"}
BUFFER = 0x033C                         # where a header's 192 bytes land
TONE = 0.1                              # a stretch is tones when no more than this share of its pulses change length
LEAST = 32                              # a stretch shorter than this is in no item
SILENCE = 5000                          # a pulse this long is a gap in the recording
GAP = 20000                             # what a version 0 overflow byte is taken as


# The turbo formats: a pulse of "split" cycles or more is a 1, a byte's bits come lowest first when
# "lsb" is set, "pilot" is the byte the loader looks for bit by bit and "sync" the one that ends the
# pilot. "least" is how many pilot bytes a block needs to be taken for one, or for kind "pages"
# how many 0 bits must lead in to the 1 that starts the stream.
TURBO = [
    # The formats are tried in this order, each on the stretches the ones before left, so a format
    # with a checksum comes before those without (kit/lessons/2026-11-14-mike-reads-computer-pop-quiz.md).
    # Novaload: CIA 1's timer A restarted at each pulse, a pulse over 500 cycles a 1; a checksum
    # after the header and after each page (games/c64/mike-reads-computer-pop-quiz/orientation.md,
    # "The loader"). Before "pages", which has no checksum and would take a Novaload file for pages
    {"name": "Novaload", "kind": "novaload", "split": 500, "lsb": True, "least": 500},
    # Ocean's loader of 1984 (Roland's Rat Race's boot file, its interrupt at $04B9): CIA 2's timer B
    # restarted at $0380 by each pulse, so a pulse over 384 cycles is a 1. No checksum, so before
    # "pages", which reads the same pulses with nothing to tell the two apart
    {"name": "Ocean 1984, pages after $AA", "kind": "ocean84", "split": 384, "lsb": True, "least": 1000},
    # CIA 2's timer A at 384 cycles, restarted some 16 cycles after each pulse; no checksum
    {"name": "pilot $E3, sync $ED", "split": 400, "lsb": True, "pilot": 0xE3, "sync": 0xED, "least": 8},
    # Ocean-Imagine types 2 and 3 (Yie Ar Kung-Fu, Hyper Sports; Imagine, 1985): "pages" with $AA
    # after the 1, ending with page $00 and $00 after it (type 2) or page $02 and $02 (type 3, whose
    # trailer is $02 bytes), as FT Console 2.76's notes describe them and these tapes hold them.
    # No checksum; before "pages", which would take the $AA for a block's flags
    {"name": "Ocean-Imagine, pages after $AA", "kind": "pages", "split": 480, "lsb": True, "least": 1000,
     "flag": 0xAA, "ends": {0x00: 0x00, 0x02: 0x02}, "runs": True},
    # Ocean-Imagine type 1: CIA 2's timer B restarted at $03E0 by each pulse's NMI, which reads its
    # high byte first: a pulse of 480 cycles or more leaves it below 2 and is a 1; no checksum
    # (games/c64/short-circuit/orientation.md, "The loader")
    {"name": "pages after a 1 bit", "kind": "pages", "split": 480, "lsb": True, "least": 500},
]


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


# --- the turbo formats ---------------------------------------------------------------------------

def free(taken, n):
    """[(first, end)] of the stretches of n pulses outside taken ([(first, end)], sorted, apart)."""
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


def page_blocks(W, taken, fmt):
    """The blocks of a format of kind "pages" outside the stretches already read, as turbo_blocks
    gives them. A stream is taken only when its page 0 comes before the stretch ends and no gap in
    the recording falls inside it: a lead-in and a 1 are on every tape, a stream that ends as its
    loader ends it is not. "at" is the lead-in's first pulse for a stream's first block and the
    page's own for the others. A row may add: "flag", a byte that must follow the 1 (and is not
    part of a block); "ends", {page: next byte}, the page bytes that end the stream when the byte
    after them is the one given, in place of page 0; "runs", a stream taken only when it has 4
    pages or more and at least half of them follow the page before (random bytes do that 1 time
    in 256)."""
    bit = lambda k: W[k] >= fmt["split"]
    byte = lambda k: sum(bit(k + j) << (j if fmt["lsb"] else 7 - j) for j in range(8))
    flag, ends = fmt.get("flag"), fmt.get("ends")
    out = []
    for lo, hi in free(taken, len(W)):
        i, zeros = lo, 0
        while i < hi:
            if not bit(i):
                zeros, i = zeros + 1, i + 1
                continue
            if zeros < fmt["least"] or (flag is not None and (i + 9 > hi or byte(i + 1) != flag)):
                zeros, i = 0, i + 1
                continue
            k, pages, ended = i + 1 if flag is None else i + 9, [], False
            while k + 16 <= hi:
                flags, page = byte(k), byte(k + 8)
                if (page == 0) if ends is None else (page in ends and k + 24 <= hi and byte(k + 16) == ends[page]):
                    ended = True
                    break
                if k + 16 + 2048 > hi:
                    break
                pages.append((k, flags, page, bytes(byte(k + 16 + 8 * t) for t in range(256))))
                k += 16 + 2048
            following = sum(1 for a, b in zip(pages, pages[1:]) if b[2] == a[2] + 1)
            if (not ended or not pages or any(x >= SILENCE for x in W[i:k + 16])
                    or (fmt.get("runs") and (len(pages) < 4 or following * 2 < len(pages) - 1))):
                zeros, i = 0, i + 1
                continue
            runs = []
            for p in pages:
                if runs and p[2] == runs[-1][-1][2] + 1:
                    runs[-1].append(p)
                else:
                    runs.append([p])
            for n, run in enumerate(runs):
                out.append({"at": i - zeros if n == 0 else run[0][0],
                            "end": runs[n + 1][0][0] if n + 1 < len(runs) else k + 16,
                            "load": run[0][2] << 8, "data": b"".join(p[3] for p in run),
                            "raw": b"".join(bytes(p[1:3]) + p[3] for p in run), "problem": None})
            i, zeros = k + 16, 0
    return out


def novaload_blocks(W, taken, fmt):
    """The files of a format of kind "novaload" outside the stretches already read, as turbo_blocks
    gives them, each with its "name". A file is a lead-in of 0 bits, a 1, $AA, the name's length,
    the name, six bytes (the load address's low byte, the page before its first, the end address,
    the bytes of the last page and the count of pages, the last one included), a checksum, then
    each page and a checksum after it; the last page has the fifth byte's count, and none when that
    is 0. A checksum is the sum, carries dropped, of every byte from the length on, the checksums
    before it included, as the loader adds them. A $AA that does not follow the lead-in sends the
    loader back to look for one, and this too.

    Novaload Special is $AA $55 after the 1, then blocks of a page byte, 256 bytes and a checksum,
    the sum of the page byte and the 256 bytes, until a page byte of $00 (FT Console 2.76's notes
    and nova_f2.c; on Summer Games II all 64 of a stream's checksums hold). A stream is taken when
    its first block's checksum holds; each run of pages that follow one another in memory is a
    block, its raw bytes the pages as the tape holds them, and a block with a wrong checksum says
    so."""
    bit = lambda k: W[k] >= fmt["split"]
    byte = lambda k: sum(bit(k + j) << (j if fmt["lsb"] else 7 - j) for j in range(8))
    out = []
    for lo, hi in free(taken, len(W)):
        i, zeros = lo, 0
        while i < hi:
            if not bit(i):
                zeros, i = zeros + 1, i + 1
                continue
            if zeros < fmt["least"] or i + 1 + 8 * 9 > hi or byte(i + 1) != 0xAA:
                zeros, i = 0, i + 1
                continue
            if byte(i + 9) == 0x55:
                k, pages = i + 17, []
                while k + 8 * 258 <= hi and byte(k) != 0 and not any(x >= SILENCE for x in W[k:k + 8 * 258]):
                    head, data = byte(k), bytes(byte(k + 8 + 8 * t) for t in range(256))
                    cs = byte(k + 8 + 2048)
                    pages.append((k, head, data, cs, cs == (head + sum(data)) & 255))
                    k += 8 * 258
                if not pages or not pages[0][4]:
                    zeros, i = 0, i + 1
                    continue
                groups = []
                for p in pages:
                    if groups and p[1] == groups[-1][-1][1] + 1:
                        groups[-1].append(p)
                    else:
                        groups.append([p])
                for n, g in enumerate(groups):
                    wrong = sum(1 for p in g if not p[4])
                    out.append({"at": i - zeros if n == 0 else g[0][0],
                                "end": groups[n + 1][0][0] if n + 1 < len(groups) else k,
                                "load": g[0][1] << 8, "data": b"".join(p[2] for p in g),
                                "raw": b"".join(bytes([p[1]]) + p[2] + bytes([p[3]]) for p in g),
                                "problem": f"the checksums of {wrong} of its {len(g)} pages are wrong" if wrong else None})
                i, zeros = k, 0
                continue
            k, raw, problem = i + 9, bytearray(), []

            def take():
                nonlocal k
                if k + 8 > hi:
                    raise EOFError
                raw.append(byte(k))
                k += 8
                return raw[-1]

            data, name, head, header = bytearray(), b"", [0] * 6, False
            try:
                name = bytes(take() for _ in range(take()))
                head = [take() for _ in range(6)]
                pages, last = head[5], head[4]
                while True:
                    want = sum(raw) & 255
                    if take() != want:
                        problem.append(f"its checksum is wrong after {len(data):,} bytes")
                        break
                    header = True
                    if not pages:
                        break
                    pages -= 1
                    n = 256 if pages else last
                    if not n:
                        break
                    data += bytes(take() for _ in range(n))
            except EOFError:
                problem.append(f"the tape ends {len(data):,} bytes into it")
            if not header:                                  # a header whose checksum is wrong is no file
                zeros, i = 0, i + 1
                continue
            load = ((head[1] + 1) & 255) << 8 | head[0]
            end = head[2] | head[3] << 8
            if not problem and (load + len(data)) & 0xFFFF != end:
                problem.append(f"its header says it ends at ${end:04X} and its bytes end at ${(load + len(data)) & 0xFFFF:04X}")
            if any(x >= SILENCE for x in W[i:k]):
                problem.append("a gap in the recording falls inside it")
            out.append({"at": i - zeros, "end": k, "load": load, "data": bytes(data), "raw": bytes(raw),
                        "name": name, "problem": "; ".join(problem) or None})
            i, zeros = k, 0
    return out


def ocean84_blocks(W, taken, fmt):
    """The blocks of a format of kind "ocean84" outside the stretches already read, as turbo_blocks
    gives them. After a lead-in of 0 bits and a 1, the loader skips a byte ($AA on the tape), then
    reads blocks of a header byte and 256 bytes: a header of $05 or more is the page's high byte,
    $00-$03 puts the page in colour RAM ($D8-$DB), $04 ends the stream. There is no checksum, so a
    stream is taken only when it starts with $AA, ends with $04 before any gap in the recording,
    has 4 pages or more, and loads at least half of them straight after the page before: random
    bytes do that 1 time in 256. Each run of pages that follow one another in memory is a block,
    its raw bytes the pages as the tape holds them, header first."""
    bit = lambda k: W[k] >= fmt["split"]
    byte = lambda k: sum(bit(k + j) << (j if fmt["lsb"] else 7 - j) for j in range(8))
    out = []
    for lo, hi in free(taken, len(W)):
        i, zeros = lo, 0
        while i < hi:
            if not bit(i):
                zeros, i = zeros + 1, i + 1
                continue
            if zeros < fmt["least"] or i + 9 + 8 > hi or byte(i + 1) != 0xAA:
                zeros, i = 0, i + 1
                continue
            k, pages, ended = i + 9, [], False
            while k + 8 <= hi:
                head = byte(k)
                if head == 4:
                    ended, k = True, k + 8
                    break
                if k + 8 + 2048 > hi or any(x >= SILENCE for x in W[k:k + 8 + 2048]):
                    break
                pages.append((k, head, 0xD8 + head if head < 4 else head, bytes(byte(k + 8 + 8 * t) for t in range(256))))
                k += 8 + 2048
            runs = sum(1 for a, b in zip(pages, pages[1:]) if b[2] == a[2] + 1)
            if not ended or len(pages) < 4 or runs * 2 < len(pages) - 1:
                zeros, i = 0, i + 1
                continue
            groups = []
            for p in pages:
                if groups and p[2] == groups[-1][-1][2] + 1:
                    groups[-1].append(p)
                else:
                    groups.append([p])
            for n, g in enumerate(groups):
                out.append({"at": i - zeros if n == 0 else g[0][0],
                            "end": groups[n + 1][0][0] if n + 1 < len(groups) else k,
                            "load": g[0][2] << 8, "data": b"".join(p[3] for p in g),
                            "raw": b"".join(bytes([p[1]]) + p[3] for p in g), "problem": None})
            i, zeros = k, 0
    return out


READERS = {"pages": page_blocks, "novaload": novaload_blocks, "ocean84": ocean84_blocks}


def turbo_items(W, taken):
    """([(first pulse, item)], [(first, end)]) of the blocks in every format of TURBO outside taken,
    numbered along the tape, and the stretches they take. A block whose format names its files is
    labelled with the name too: turbo block 7 "FX"."""
    taken, blocks = sorted(taken), []
    for fmt in TURBO:
        for b in READERS.get(fmt.get("kind"), turbo_blocks)(W, taken, fmt):
            taken = sorted(taken + [(b["at"], b["end"])])
            blocks.append((b, fmt))
    out = []
    for n, (b, fmt) in enumerate(sorted(blocks, key=lambda x: x[0]["at"]), 1):
        label = f"turbo block {n}" + (f' "{petscii(b["name"])}"' if "name" in b else "")
        item = {"label": label, "place": {"file": label, "type": f"turbo, {fmt['name']}", "pulse": b["at"]},
                "load": b["load"], "data": b["data"], "raw": b["raw"]}
        if b["problem"]:
            item["problem"] = b["problem"]
        out.append((b["at"], item))
    return out, [(b["at"], b["end"]) for b, _ in blocks]


# --- the rest of the tape ------------------------------------------------------------------------

def is_tone(stretch):
    """True when a stretch is tones and silence: leaving out the gaps where the tape stood still,
    hardly a pulse differs from the one before it by more than an eighth. Bytes in any format
    change length from pulse to pulse."""
    waves = [x for x in stretch if x < SILENCE]
    changes = sum(1 for a, b in zip(waves, waves[1:]) if abs(a - b) > max(a, b) / 8)
    return changes <= TONE * max(len(waves) - 1, 0)


def undecoded(W, taken):
    """[(first pulse, item)] of each stretch of LEAST pulses or more outside taken ([(first, end)])
    that is not tones: a format this does not read, to be answered by hand."""
    out, pos = [], 0
    for a, b in sorted(taken) + [(len(W), len(W))]:
        stretch = W[pos:a]
        if len(stretch) >= LEAST and not is_tone(stretch):
            label = f"pulses {pos}-{a - 1}"
            out.append((pos, {"label": label, "place": {"pulses": [pos, a - 1]}, "load": None, "data": b"",
                              "raw": b"".join(x.to_bytes(4, "little") for x in stretch),
                              "problem": f"{len(stretch):,} pulses in a format the kit does not decode"}))
        pos = max(pos, b)
    return out


def lengths(stretch, most=2):
    """The commonest pulse lengths of a stretch, in cycles, shortest first: what to tell a person
    about one this cannot decode."""
    return sorted(x for x, _ in Counter(x for x in stretch if x < SILENCE).most_common(most))


def items(W):
    runs = kernal_runs(W)
    taken = [(at, at + 20 * len(run)) for at, run in runs]
    out = [(i["place"]["pulse"], i) for i in kernal_items(kernal_blocks(runs))]
    blocks, spans = turbo_items(W, taken)
    out += blocks
    for at, item in undecoded(W, taken + spans):
        a, b = item["place"]["pulses"]
        common = lengths(W[a:b + 1])
        if len(common) == 2:
            item["problem"] += f", most of them {common[0]} or {common[1]} cycles long"
        out.append((at, item))
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
            print(f"{argv[1]}: no file in a format this reads")
        return 0
    if len(argv) == 2 and argv[0] == "list":
        argv = argv[1:]
    if len(argv) != 1 or argv[0].startswith("-"):
        print(__doc__)
        return 0 if argv and argv[0] in ("-h", "--help") else 2
    with open(argv[0], "rb") as f:
        W = waves(f.read(), argv[0])
    its = items(W)
    turbo = sum(1 for i in its if i["place"].get("type", "").startswith("turbo"))
    print(f"{argv[0]}: {len(W):,} pulses, {sum(1 for i in its if 'pulses' not in i['place']) - turbo} items in the KERNAL's format"
          + (f" and {turbo} turbo blocks" if turbo else ""))
    for it in its:
        if "pulses" in it["place"]:
            a, b = it["place"]["pulses"]
            print(f"  pulses {a:,}-{b:,}: {it['problem']} ({sum(W[a:b + 1]) / 985248:.0f} seconds of tape)")
            continue
        at = f"${it['load']:04X}-${(it['load'] + len(it['data'])) & 0xFFFF:04X}" if it["load"] is not None else ""
        print(f"  {it['label']:<24} {it['place']['type']:<27} {at:<12} {len(it['data']):6,} bytes  at pulse {it['place']['pulse']:,}"
              + (f"  ({it['problem']})" if it.get("problem") else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
