#!/usr/bin/env python3
"""kit/c64/disk.py on a made-up disk, written here as a .d64 and as a .g64 of the same sectors.

The disk holds a PRG of two sectors, a SEQ of one, a scratched entry, and a sector the BAM marks
used that no file holds (what a game reads with the drive's block commands). Both images must give
the same directory, files and unowned sectors; the .g64's data blocks are GCR-coded with the
1541's table, and one of them gets a bad checksum. Then pack writes both files and the sector for
kit/c64/c64run.js, and they read back as the same bytes. Then extract writes a disk whose
names hold $00, "*" and "/" as files the host can hold. Last, a disk with a decoy entry, whose
chain leaves the disk after one sector, is listed whole.

  python3 kit/c64/test_disk.py
"""
import base64, json, os, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import disk  # noqa: E402

failed = 0


def check(ok, what):
    global failed
    print(("ok   " if ok else "FAIL ") + what)
    failed += not ok


TO_GCR = {v: k for k, v in disk.GCR.items()}


def gcr(data):
    bits = "".join(format(TO_GCR[b >> 4], "05b") + format(TO_GCR[b & 15], "05b") for b in data)
    bits += "0" * (-len(bits) % 8)
    return bytes(int(bits[i:i + 8], 2) for i in range(0, len(bits), 8))


def make_sectors():
    S = {}
    for t in range(1, 36):
        for s in range(disk.SPT[t]):
            S[(t, s)] = bytearray(256)
    bam = S[(18, 0)]
    bam[0:4] = bytes([18, 1, 0x41, 0])
    for t in range(1, 36):                                     # everything free
        n = disk.SPT[t]
        bits = (1 << n) - 1
        bam[4 * t:4 * t + 4] = bytes([n, bits & 255, bits >> 8 & 255, bits >> 16 & 255])
    used = [(18, 0), (18, 1), (17, 0), (17, 1), (16, 0), (20, 5)]
    for t, s in used:
        bam[4 * t] -= 1
        bam[4 * t + 1 + s // 8] &= ~(1 << (s % 8)) & 255
    bam[0x90:0xA0] = b"TEST DISK".ljust(16, b"\xa0")
    bam[0xA2:0xA4] = b"ID"
    d = S[(18, 1)]
    d[0:2] = bytes([0, 255])

    def entry(i, kind, t, s, name, blocks):
        e = bytearray(32)
        e[2], e[3], e[4] = kind, t, s
        e[5:21] = name.ljust(16, b"\xa0")
        e[30], e[31] = blocks & 255, blocks >> 8
        d[i * 32:i * 32 + 32] = e
    entry(0, 0x82, 17, 0, b"PROG", 2)
    entry(1, 0x81, 16, 0, b"TEXT", 1)
    entry(2, 0x00, 15, 0, b"GONE", 1)                           # scratched
    prog = bytes([0x00, 0x20]) + bytes(range(256)) + bytes(range(40))
    S[(17, 0)][0:2] = bytes([17, 1]); S[(17, 0)][2:256] = prog[:254]
    rest = prog[254:]
    S[(17, 1)][0:2] = bytes([0, len(rest) + 1]); S[(17, 1)][2:2 + len(rest)] = rest
    text = b"HELLO"
    S[(16, 0)][0:2] = bytes([0, len(text) + 1]); S[(16, 0)][2:2 + len(text)] = text
    S[(20, 5)][:] = bytes((i * 7) & 255 for i in range(256))   # read by block, held by no file
    return S, prog, text


S, prog, text = make_sectors()
tmp = tempfile.mkdtemp()
d64 = os.path.join(tmp, "t.d64")
with open(d64, "wb") as f:
    for t in range(1, 36):
        for s in range(disk.SPT[t]):
            f.write(S[(t, s)])

g64 = os.path.join(tmp, "t.g64")
tracks = []
for t in range(1, 36):
    raw = bytearray()
    for s in range(disk.SPT[t]):
        hdr = [0x08, 0, s, t, ord("D"), ord("I"), 0x0F, 0x0F]
        hdr[1] = s ^ t ^ hdr[4] ^ hdr[5]
        data = bytes(S[(t, s)])
        ck = 0
        for b in data:
            ck ^= b
        if (t, s) == (20, 5):
            ck ^= 1                                            # a bad checksum, kept and reported
        raw += b"\xff" * 5 + gcr(hdr) + b"\x55" * 9 + b"\xff" * 5 + gcr(bytes([0x07]) + data + bytes([ck, 0, 0])) + b"\x55" * 8
    tracks.append(bytes(raw))
size = max(len(r) for r in tracks)
head = bytearray(b"GCR-1541\x00" + bytes([84]) + size.to_bytes(2, "little"))
offs, speeds, body = [], [], bytearray()
base = 12 + 84 * 8
for ht in range(84):
    if ht % 2 == 0 and ht // 2 < 35:
        r = tracks[ht // 2]
        offs.append(base + len(body)); body += len(r).to_bytes(2, "little") + r
    else:
        offs.append(0)
with open(g64, "wb") as f:
    f.write(head + b"".join(o.to_bytes(4, "little") for o in offs) + bytes(84 * 4) + body)

for path, kind in ((d64, ".d64"), (g64, ".g64")):
    D = disk.Disk(path)
    names = [(e["name"], e["type"]) for e in D.directory()]
    check(names == [("PROG", 0x82), ("TEXT", 0x81)] and D.name == "TEST DISK" and D.id == "ID",
          f"{kind}: the directory without the scratched entry, the disk's name and ID")
    F = D.files()
    check(F == {"PROG": prog, "TEXT": text}, f"{kind}: the PRG over two sectors and the SEQ read whole")
    check(D.unowned() == [(20, 5)], f"{kind}: the one sector the BAM marks used that no file holds")
check(disk.Disk(g64).bad == {(20, 5)} and not disk.Disk(d64).bad, ".g64: the data block with a bad checksum is reported")

out = os.path.join(tmp, "disk.json")
disk.main(["pack", out, d64, "--sectors", d64])
j = json.load(open(out))
back = {k: base64.b64decode(v) for k, v in j["files"].items()}
check(back == {"PROG": prog, "TEXT": text} and list(j["sectors"]) == ["20,5"] and
      base64.b64decode(j["sectors"]["20,5"]) == bytes(S[(20, 5)]), "pack: the files and the sector, as C64Run.read reads them")

# names a host cannot use as they are: extract writes each with the character as $hh
odd = os.path.join(tmp, "odd.d64")
d = bytearray(S[(18, 1)])
for i, name in ((0, b"\x00"), (1, b"*"), (2, b"A/B")):
    d[i * 32 + 2], d[i * 32 + 3], d[i * 32 + 4] = 0x81, 16, 0
    d[i * 32 + 5:i * 32 + 21] = name.ljust(16, b"\xa0")
with open(odd, "wb") as f:
    for t in range(1, 36):
        for s in range(disk.SPT[t]):
            f.write(d if (t, s) == (18, 1) else S[(t, s)])
out = os.path.join(tmp, "odd")
disk.main(["extract", odd, out])
check(sorted(os.listdir(out)) == ["$00", "$2A", "A$2FB"] and
      all(open(os.path.join(out, n), "rb").read() == text for n in os.listdir(out)),
      "extract: names with $00, * and / written as $00, $2A and A$2FB")

# a decoy: a directory entry whose first sector links off the disk. The listing names it and goes
# on to the next entry, files() leaves it out, and the other files and the unowned sector stand.
decoy = os.path.join(tmp, "decoy.d64")
d = bytearray(S[(18, 1)])
d[0:32], d[32:64], d[64:96] = d[64:96], d[0:32], d[32:64]       # the decoy first, then PROG, TEXT
d[2], d[3], d[4] = 0x82, 15, 3
d[5:21] = b"DECOY".ljust(16, b"\xa0")
link = bytearray(256); link[0:2] = bytes([75, 1])
with open(decoy, "wb") as f:
    for t in range(1, 36):
        for s in range(disk.SPT[t]):
            f.write(d if (t, s) == (18, 1) else link if (t, s) == (15, 3) else S[(t, s)])
D = disk.Disk(decoy)
check(D.follow(15, 3) == ([(15, 3)], "the chain from (75, 1) loops or leaves the disk"),
      "follow: the decoy's one sector, and where its chain leaves the disk")
check(D.files() == {"PROG": prog, "TEXT": text} and D.unowned() == [(20, 5)],
      "a decoy entry: files() leaves it out, and the others and the unowned sector stand")
import io, contextlib
listing = io.StringIO()
with contextlib.redirect_stdout(listing):
    disk.main([decoy])
lines = listing.getvalue().splitlines()
check(len(lines) == 5 and "DECOY" in lines[1] and "not a file" in lines[1] and "PROG" in lines[2] and "TEXT" in lines[3],
      "the listing names the decoy and goes on to every entry after it")

sys.exit(1 if failed else 0)
