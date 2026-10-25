#!/usr/bin/env python3
"""Read a 1541 disk image (.d64 or .g64): its directory, its files, and the sectors a game reads
directly; and write a disk's files for kit/c64/c64run.js's drive.

A .d64 is the disk's sectors in order, 256 bytes each: tracks 1-17 have 21 sectors, 18-24 have
19, 25-30 have 18 and 31 on have 17, for 35 tracks (174,848 bytes) or 40 (196,608), with a byte
of error codes per sector after them in some files. A .g64 is the bits the drive's head reads:
"GCR-1541", a version, the number of half-tracks, the longest track's length, then a table of
each half-track's offset; at each offset two bytes of length and the track's bytes. A sector is
a sync (ten or more 1 bits), a header block (GCR-coded: $08, checksum, sector, track, the disk's
ID) and, after another sync, a data block ($07, 256 bytes, checksum). Only whole tracks are read,
as the 1541's DOS reads them; a copy protection that hides data between them is not.

The directory is on track 18 from sector 1, eight entries a sector: type, the file's first
track and sector, its name (16 bytes, padded with $A0) and its length in blocks. A file is a
chain of sectors, each starting with the next one's track and sector (track 0 on the last, its
sector byte the last byte used). The BAM (track 18 sector 0) marks the sectors in use: one a
game allocates and no file holds is data it reads with the drive's block commands.

  Disk(path)               .sectors {(track, sector): bytes}, .bad {(track, sector)} (a data
                           block whose checksum fails; a .d64's error byte), .name, .id
  disk.directory()         [{"name", "type", "track", "sector", "blocks"}], the names as bytes
                           decoded as Latin-1 (what C64Run's names compare with)
  disk.read(track, sector) a file's bytes from its first sector: its two-byte address first
  disk.follow(track, sector) (sectors, problem): the chain as far as it goes, and None or why it
                           stops (a link that loops or leaves the disk: a damaged file, or a
                           decoy, a directory entry whose chain is not a file); chain() and read()
                           raise ValueError on such a chain
  disk.files()             {name: bytes} of every closed PRG, SEQ and USR file whose chain ends
                           (the others are named on stderr and left out)
  disk.unowned()           the sectors the BAM marks used that no file and no directory holds

Usage:
  disk.py <image>                          the directory, and the sectors no file holds
  disk.py extract <image> <dir>            each file to <dir>/<name>, with a character a file
                                           name cannot hold ("/", "*", $00) written $hh
  disk.py pack <out.json> <image> [<image> ...] [--sectors <image>]
                                           the files of every image, and with --sectors the
                                           unowned sectors of that one, for C64Run.read:
                                           {"files": {name: base64}, "sectors": {"track,sector":
                                           base64}}. Two images that hold a file of the same name
                                           stop it: one drive serves them both.
Images, and what pack writes from them, hold the game: both stay in the game's work/ folder
(AGENTS.md, "No binaries, ever").
"""
import argparse, base64, json, os, re, sys

SPT = [0] + [21] * 17 + [19] * 7 + [18] * 6 + [17] * 12          # sectors per track, tracks 1-42
D64_SIZES = {174848: (35, False), 175531: (35, True), 196608: (40, False), 197376: (40, True)}
GCR = {0x0A: 0, 0x0B: 1, 0x12: 2, 0x13: 3, 0x0E: 4, 0x0F: 5, 0x16: 6, 0x17: 7,
       0x09: 8, 0x19: 9, 0x1A: 10, 0x1B: 11, 0x0D: 12, 0x1D: 13, 0x1E: 14, 0x15: 15}
TYPES = {1: "SEQ", 2: "PRG", 3: "USR"}


def gcr_bytes(bits, p, n):
    """n bytes GCR-decoded from the bit string bits at p, or None at a code that is not GCR."""
    out = bytearray()
    for _ in range(n):
        if p + 10 > len(bits):
            return None
        hi, lo = GCR.get(int(bits[p:p + 5], 2)), GCR.get(int(bits[p + 5:p + 10], 2))
        if hi is None or lo is None:
            return None
        out.append(hi << 4 | lo)
        p += 10
    return bytes(out)


def gcr_track(raw, track):
    """{sector: (bytes, checksum good)} of one track's bits."""
    bits = "".join(format(b, "08b") for b in raw)
    bits += bits[:2400]                                    # a sector that runs past the index hole
    found, header, p = {}, None, 0
    while True:
        p = bits.find("1111111111", p)
        if p < 0 or p >= len(raw) * 8:
            break
        while p < len(bits) and bits[p] == "1":
            p += 1
        first = gcr_bytes(bits, p, 1)
        if first == b"\x08":
            header = gcr_bytes(bits, p, 8)
        elif first == b"\x07" and header and header[3] == track:
            d = gcr_bytes(bits, p, 258)
            if d and header[2] not in found:
                ck = 0
                for b in d[1:257]:
                    ck ^= b
                found[header[2]] = (d[1:257], ck == d[257])
            header = None
    return found


class Disk:
    def __init__(self, path):
        blob = open(path, "rb").read()
        self.sectors, self.bad = {}, set()
        if blob.startswith(b"GCR-1541"):
            halves = blob[9]
            for ht in range(0, halves, 2):
                off = int.from_bytes(blob[12 + 4 * ht:16 + 4 * ht], "little")
                if not off:
                    continue
                n = int.from_bytes(blob[off:off + 2], "little")
                for s, (data, ok) in gcr_track(blob[off + 2:off + 2 + n], ht // 2 + 1).items():
                    self.sectors[(ht // 2 + 1, s)] = data
                    if not ok:
                        self.bad.add((ht // 2 + 1, s))
        elif len(blob) in D64_SIZES:
            tracks, errors = D64_SIZES[len(blob)]
            p, i, codes = 0, 0, blob[sum(SPT[1:tracks + 1]) * 256:] if errors else b""
            for t in range(1, tracks + 1):
                for s in range(SPT[t]):
                    self.sectors[(t, s)] = blob[p:p + 256]
                    if errors and codes[i] not in (0, 1):
                        self.bad.add((t, s))
                    p += 256; i += 1
        else:
            sys.exit(f"{path}: neither a .g64 nor a .d64 of a size the 1541 writes")
        if (18, 0) not in self.sectors:
            sys.exit(f"{path}: no directory track (18, 0) found")
        bam = self.sectors[(18, 0)]
        self.name = bam[0x90:0xA0].rstrip(b"\xa0").decode("latin-1")
        self.id = bam[0xA2:0xA4].decode("latin-1")

    def directory(self):
        out, t, s, seen = [], 18, 1, set()
        while t and (t, s) not in seen and (t, s) in self.sectors:
            seen.add((t, s))
            p = self.sectors[(t, s)]
            for e in range(8):
                ent = p[e * 32:e * 32 + 32]
                if ent[2] == 0:
                    continue
                out.append({"name": ent[5:21].rstrip(b"\xa0").decode("latin-1"), "type": ent[2],
                            "track": ent[3], "sector": ent[4], "blocks": ent[30] | ent[31] << 8})
            t, s = p[0], p[1]
        return out

    def follow(self, t, s):
        out, seen = [], set()
        while t:
            if (t, s) in seen or (t, s) not in self.sectors:
                return out, f"the chain from ({t}, {s}) loops or leaves the disk"
            seen.add((t, s)); out.append((t, s))
            t, s = self.sectors[(t, s)][0], self.sectors[(t, s)][1]
        return out, None

    def chain(self, t, s):
        out, problem = self.follow(t, s)
        if problem:
            raise ValueError(problem)
        return out

    def read(self, t, s):
        out = bytearray()
        for ts in self.chain(t, s):
            p = self.sectors[ts]
            out += p[2:p[1] + 1] if p[0] == 0 else p[2:]
        return bytes(out)

    def files(self):
        out = {}
        for f in self.directory():
            if f["type"] & 0x80 and f["type"] & 7 in TYPES:
                problem = self.follow(f["track"], f["sector"])[1]
                if problem:
                    print(f"{f['name']!r} left out: {problem}", file=sys.stderr)
                else:
                    out[f["name"]] = self.read(f["track"], f["sector"])
        return out

    def unowned(self):
        owned = set()
        for f in self.directory():
            if f["type"] & 7 in TYPES:
                owned.update(self.follow(f["track"], f["sector"])[0])
        bam = self.sectors[(18, 0)]
        out = []
        for t in range(1, 36):
            e = bam[4 * t:4 * t + 4]
            for s in range(SPT[t]):
                used = not (e[1 + s // 8] >> (s % 8)) & 1
                if used and t != 18 and (t, s) not in owned and (t, s) in self.sectors:
                    out.append((t, s))
        return out


def pack(images, sector_images):
    """The files of every image and the unowned sectors of sector_images, for C64Run.read."""
    files, sectors = {}, {}
    for path in images:
        for name, data in Disk(path).files().items():
            if name in files:
                sys.exit(f"{path}: a file named {name!r} is on two images, and one drive holds both")
            files[name] = base64.b64encode(data).decode()
    for path in sector_images:
        d = Disk(path)
        for t, s in d.unowned():
            sectors[f"{t},{s}"] = base64.b64encode(d.sectors[(t, s)]).decode()
    return {"files": files, "sectors": sectors}


def file_name(name):
    """A directory entry's name as a file name on any host: a control character, or one Windows
    or Unix refuses in a name, as $ and its two hex digits, and a name of nothing but dots with a
    $ in front. A commercial disk has been
    seen to name one file $00 and another "*"."""
    s = re.sub(r'[\x00-\x1f/\\<>:"|?*]', lambda m: "$%02X" % ord(m.group()), name)
    return s if s.strip(".") else "$" + s


def main(argv):
    if len(argv) >= 1 and argv[0] == "pack":
        ap = argparse.ArgumentParser(prog="disk.py pack")
        ap.add_argument("out"); ap.add_argument("images", nargs="+")
        ap.add_argument("--sectors", action="append", default=[])
        a = ap.parse_args(argv[1:])
        obj = pack(a.images, a.sectors)
        with open(a.out, "w") as f:
            json.dump(obj, f)
        print(f"{a.out}: {len(obj['files'])} files and {len(obj['sectors'])} sectors")
        return 0
    if len(argv) == 3 and argv[0] == "extract":
        d = Disk(argv[1])
        os.makedirs(argv[2], exist_ok=True)
        for name, data in d.files().items():
            open(os.path.join(argv[2], file_name(name)), "wb").write(data)
        return 0
    if len(argv) != 1 or argv[0].startswith("-"):
        print(__doc__); return 0 if argv and argv[0] in ("-h", "--help") else 2
    d = Disk(argv[0])
    print(f"{d.name!r} id {d.id!r}: {len(d.sectors)} sectors, {len(d.bad)} with a bad checksum")
    for f in d.directory():
        kind = TYPES.get(f["type"] & 7, "DEL" if f["type"] & 7 == 0 else "REL")
        chain, problem = d.follow(f["track"], f["sector"]) if f["type"] & 7 in TYPES else ([], None)
        if problem:
            print(f"  {f['name']:<16} {kind} {f['blocks']:4} blocks, not a file: {len(chain)} sector(s)"
                  f" from ({f['track']}, {f['sector']}), then {problem}")
            continue
        data = d.read(f["track"], f["sector"]) if chain else b""
        at = f" loads at ${data[0] | data[1] << 8:04X}" if len(data) > 1 else ""
        print(f"  {f['name']:<16} {kind} {f['blocks']:4} blocks, {len(data):6} bytes{at}")
    u = d.unowned()
    print(f"  {len(u)} sectors in use that no file holds" + (f", from {u[0]} to {u[-1]}" if u else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
