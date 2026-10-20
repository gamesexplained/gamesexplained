#!/usr/bin/env python3
"""kit/apple2/disk.py on disks made here, in a temporary folder.

A DOS 3.3 disk is written as a WOZ 2, a WOZ 1, a .nib, a .do, a .dsk, a .po and three .2mg files,
and a DOS 3.2 disk as a 13-sector WOZ 2 and a .d13. The nibbles are made here: address fields in
4-and-4, data fields in 6-and-2 and 5-and-3 with tables built from the rules a Disk II's nibbles
follow (Beneath Apple DOS, chapter 3), sync bytes of ten bits, and track lengths that are not a
whole number of bytes. Each image must give back every sector in DOS 3.3 and in ProDOS order,
and its catalog and files: a locked binary with the address and length its header gives, a text
file up to its zero, an Applesoft program, a file with a hole, a deleted entry and an entry in a
second catalog sector.

Then, on copies with something wrong, each must be reported: a sector with no address field, a
data checksum that fails (taken with lenient), an address checksum that fails, a data field with
no epilogue, a nibble outside the table, address fields naming another track. A data field that
runs over the end of the track's bits must read whole; changed prologues and epilogues must read
when they are given, and info must suggest the epilogues; a WOZ whose CRC fails is refused, and so
is a file that is not a disk image. Last, each command.

  python3 kit/apple2/test_disk.py
"""
import contextlib, io, os, struct, sys, tempfile, time, zlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import disk  # noqa: E402

failed = 0
began = time.time()


def check(ok, what):
    global failed
    print(("ok   " if ok else "FAIL ") + what)
    failed += not ok


def raises(fn, words):
    """True when fn() raises DiskError with all of these words in its message."""
    try:
        fn()
    except disk.DiskError as e:
        return all(w in str(e) for w in words)
    return False


# -- the nibbles, from the rules -----------------------------------------------------------------
# A 6-and-2 nibble has its top bit set, at most one pair of zero bits side by side, and two one
# bits side by side below the top bit; a 5-and-3 nibble has its top bit set and no zero bits side
# by side. Neither may be D5 or AA, which mark the fields.
BITS = [format(b, "08b") for b in range(256)]
W62 = bytes(b for b in range(0x80, 0x100) if b not in (0xD5, 0xAA)
            and sum(BITS[b][i:i + 2] == "00" for i in range(7)) <= 1 and "11" in BITS[b][1:])
W53 = bytes(b for b in range(0x80, 0x100) if b not in (0xD5, 0xAA) and "00" not in BITS[b])
check(len(W62) == 64 and W62 == disk.WRITE62, "6-and-2: the 64 nibbles the rules allow, in order, are the reader's table")
check(len(W53) == 32 and W53 == disk.WRITE53, "5-and-3: the 32 nibbles the rules allow, in order, are the reader's table")

# Logical sector -> physical. Beneath Apple DOS, chapter 3: DOS 3.3's logical sector 2 is physical
# B. Beneath Apple ProDOS, table 3.1: block 2 is track 0, physical sectors 8 and A.
DOS = [0x0, 0xD, 0xB, 0x9, 0x7, 0x5, 0x3, 0x1, 0xE, 0xC, 0xA, 0x8, 0x6, 0x4, 0x2, 0xF]
PRODOS = [0x0, 0x2, 0x4, 0x6, 0x8, 0xA, 0xC, 0xE, 0x1, 0x3, 0x5, 0x7, 0x9, 0xB, 0xD, 0xF]
check(DOS == disk.DOS33 and PRODOS == disk.PRODOS and DOS[2] == 0xB and PRODOS[4:6] == [0x8, 0xA],
      "orders: DOS 3.3's logical 2 is physical B, ProDOS block 2 is physical 8 and A")
# DOS 3.2 writes its sectors around a track in this order when it formats a disk; the address
# field's number is the sector's own
SKEW13 = [0x0, 0xA, 0x7, 0x4, 0x1, 0xB, 0x8, 0x5, 0x2, 0xC, 0x9, 0x6, 0x3]


def chain(values, table):
    """Each value exclusive-ored with the one before, as nibbles, then the last value: the checksum."""
    out, before = bytearray(), 0
    for v in values:
        out.append(table[v ^ before])
        before = v
    out.append(table[before])
    return bytes(out)


def enc62(data):
    """343 nibbles: 86 values holding the low two bits of bytes k, k + 86 and k + 172, each pair
    swapped, then the top six bits of each byte."""
    low = []
    for k in range(86):
        v = 0
        for j, i in enumerate((k, k + 86, k + 172)):
            if i < 256:
                v |= ((data[i] & 1) << 1 | data[i] >> 1 & 1) << 2 * j
        low.append(v)
    return chain(low + [b >> 2 for b in data], W62)


def enc53(data):
    """411 nibbles: 154 values of low bits, written last first, then the top five bits of each byte.
    The first 255 bytes go in 51 groups of five, the last group first: the first three bytes of a
    group give their low three bits to three values, and the other two give each value a bit."""
    top, low = [0] * 256, [0] * 154
    for g in range(51):
        i, b = 50 - g, data[5 * g:5 * g + 5]
        for j in range(5):
            top[51 * j + i] = b[j] >> 3
        for j in range(3):
            low[51 * j + i] = (b[j] & 7) << 2 | (b[3] >> (2 - j) & 1) << 1 | b[4] >> (2 - j) & 1
    top[255], low[153] = data[255] >> 3, data[255] & 7
    return chain(low[::-1] + top, W53)


some = bytes((k * 37 + 11) & 0xFF for k in range(256))
check(disk.decode62(enc62(some)) == (some, []) and disk.decode53(enc53(some)) == (some, []),
      "a sector written here in 6-and-2 and in 5-and-3 decodes to its bytes, with no problems")
check(disk.decode44(0xFF, 0xFE) == 0xFE and disk.decode44(0xAA, 0xAB) == 1, "4-and-4: FF FE is 254, AA AB is 1")
check(disk.latch("00" + "11010101" + "0" + "10101010" + "0011") == (b"\xd5\xaa", [2, 11]),
      "the latch skips the zeros before a 1, and drops a nibble cut short")


def address(vol, trk, sec, prologue=b"\xd5\xaa\x96", epilogue=b"\xde\xaa", wrong=0):
    body = b"".join(bytes([v >> 1 | 0xAA, v | 0xAA]) for v in (vol, trk, sec, vol ^ trk ^ sec ^ wrong))
    return prologue + body + epilogue + b"\xeb"


def track(sectors, trk, n=16, gap=40, vol=254, says=None, order=None, damage=None,
          A=None, D=b"\xd5\xaa\xad", AE=b"\xde\xaa", DE=b"\xde\xaa"):
    """[(sync bytes, nibbles)] for one track. sectors: {physical: 256 bytes}, written in `order`
    around the track; says: the track the address fields give; damage: {physical: what}."""
    enc, table = (enc62, W62) if n == 16 else (enc53, W53)
    A = A or (b"\xd5\xaa\x96" if n == 16 else b"\xd5\xaa\xb5")
    damage = damage or {}
    parts = []
    for k, p in enumerate(order or range(n)):
        what = damage.get(p)
        if what != "no address field":
            parts.append((gap if k == 0 else 16,
                          address(vol, trk if says is None else says, p, A, AE, what == "address checksum")))
        data = enc(sectors[p])
        if what == "data checksum":
            data = data[:-1] + bytes([table[(table.index(data[-1]) + 1) % len(table)]])
        if what == "outside":
            data = data[:100] + b"\x95" + data[101:]
        parts.append((6, D + data + (b"\xff\xff" if what == "no data epilogue" else DE) + b"\xeb"))
    return parts


def to_bits(parts):
    return "".join("1111111100" * s + "".join(BITS[b] for b in nibs) for s, nibs in parts)


def to_nib(parts, length=6656):
    raw = b"".join(b"\xff" * s + nibs for s, nibs in parts)
    return raw + b"\xff" * (length - len(raw))


def pack(bits):
    bits += "0" * (-len(bits) % 8)
    return int(bits, 2).to_bytes(len(bits) // 8, "big") if bits else b""


def chunk(name, body):
    return name + struct.pack("<I", len(body)) + body


def standard_tmap(tracks=35):
    """Track N's image read at N - 0.25, N and N + 0.25, as Applesauce maps a plain disk."""
    t = bytearray(b"\xff" * 160)
    for n in range(tracks):
        for q in (4 * n - 1, 4 * n, 4 * n + 1):
            if q >= 0:
                t[q] = n
    return t


def woz(version, images, tmap, meta=None, boot=1, crc=True):
    """A WOZ file of these track images (each a str of bits)."""
    info = bytearray(60)
    info[0:5] = bytes([version, 1, 1, 0, 1])            # 5.25-inch, write protected, cleaned
    info[5:37] = b"test_disk.py".ljust(32, b" ")
    if version == 1:
        trks = b""
        for bits in images:
            raw = pack(bits)
            trks += raw.ljust(6646, b"\0") + struct.pack("<HHHBB", len(raw), len(bits), 0xFFFF, 0, 0) + bytes(2)
    else:
        entries, data, block = bytearray(1280), b"", 3
        for i, bits in enumerate(images):
            raw = pack(bits)
            count = -(-len(raw) // 512)
            struct.pack_into("<HHI", entries, 8 * i, block, count, len(bits))
            data += raw.ljust(512 * count, b"\0")
            block += count
        info[37:40] = bytes([1, boot, 32])               # one side, the boot sector's format, 4 us a bit
        struct.pack_into("<HHH", info, 40, 0b101, 48, max(-(-len(pack(b)) // 512) for b in images))
        trks = bytes(entries) + data
    body = chunk(b"INFO", bytes(info)) + chunk(b"TMAP", bytes(tmap)) + chunk(b"TRKS", trks)
    if meta:
        body += chunk(b"META", meta.encode())
    return (b"WOZ1" if version == 1 else b"WOZ2") + b"\xff\x0a\x0d\x0a" + \
        struct.pack("<I", zlib.crc32(body) if crc else 0) + body


def two_img(fmt, data, flags=0, blocks=0):
    return struct.pack("<4s4sHHIIIIIIIII", b"2IMG", b"TEST", 64, 1, fmt, flags, blocks, 64, len(data),
                       0, 0, 0, 0) + bytes(16) + data


# -- a DOS 3.3 disk ------------------------------------------------------------------------------
def pattern(t, s, salt=0):
    return bytes([t, s, salt]) + bytes((t * 31 + s * 17 + salt * 5 + k) & 0xFF for k in range(253))


def ts_list(pairs, link=(0, 0)):
    b = bytearray(256)
    b[1:3] = bytes(link)
    for k, (t, s) in enumerate(pairs):
        b[0x0C + 2 * k:0x0E + 2 * k] = bytes([t, s])
    return bytes(b)


def entry(t, s, code, name, sectors, deleted=False):
    e = bytearray(35)
    e[0:3] = bytes([0xFF if deleted else t, s, code])
    e[3:33] = bytes(c | 0x80 for c in name.encode().ljust(30))
    if deleted:
        e[0x20] = t                                       # the list's track, in the name's last byte
    e[0x21:0x23] = struct.pack("<H", sectors)
    return bytes(e)


L = {(t, s): pattern(t, s) for t in range(35) for s in range(16)}


def put(t, s, data):
    L[(t, s)] = bytes(data).ljust(256, b"\0")


vtoc = bytearray(256)
vtoc[1:4] = bytes([17, 15, 3])                           # the catalog at 17,15; DOS 3.3
vtoc[6], vtoc[0x27] = 254, 122
vtoc[0x34:0x38] = bytes([35, 16, 0x00, 0x01])           # 35 tracks of 16 sectors of 256 bytes
put(17, 0, vtoc)
cat = bytearray(256)
cat[1:3] = bytes([17, 14])                               # a second catalog sector
for k, e in enumerate([entry(18, 15, 0x84, "GAME", 4), entry(19, 15, 0x00, "NOTES", 3),
                       entry(20, 15, 0x02, "PROGRAM", 3), entry(21, 15, 0x04, "OLD", 2, deleted=True),
                       entry(23, 15, 0x00, "HOLES", 3)]):
    cat[0x0B + 35 * k:0x0B + 35 * (k + 1)] = e
put(17, 15, cat)
put(17, 14, bytes(0x0B) + entry(22, 15, 0x04, "SECOND", 2))
game = bytes((k * 7 + 3) & 0xFF for k in range(700))
raw = struct.pack("<HH", 0x0800, len(game)) + game
put(18, 15, ts_list([(18, 14), (18, 13), (18, 12)]))
for k, s in enumerate((14, 13, 12)):
    put(18, s, raw[256 * k:256 * (k + 1)])
notes = b"".join(bytes(c | 0x80 for c in b"THE TEST WROTE THIS") + b"\x8d" for _ in range(20))
put(19, 15, ts_list([(19, 14), (19, 13)]))
put(19, 14, notes[:256])
put(19, 13, notes[256:])                                 # the zeros after it end the file
program = bytes((k * 3) & 0xFF for k in range(300))
raw = struct.pack("<H", len(program)) + program
put(20, 15, ts_list([(20, 14), (20, 13)]))
put(20, 14, raw[:256])
put(20, 13, raw[256:])
put(22, 15, ts_list([(22, 14)]))
put(22, 14, struct.pack("<HH", 0x2000, 10) + b"0123456789")
holes = bytes(0xC1 + k % 26 for k in range(256))
put(23, 15, ts_list([(23, 14), (0, 0), (23, 13)]))       # a sector never written, then one more
put(23, 14, holes)
P = {(t, DOS[s]): data for (t, s), data in L.items()}    # by physical sector
DO = b"".join(L[(t, s)] for t in range(35) for s in range(16))
PO = b"".join(P[(t, PRODOS[s])] for t in range(35) for s in range(16))

parts = [track({p: P[(t, p)] for p in range(16)}, t, gap=40 + t) for t in range(35)]
images = [to_bits(x) for x in parts]
half = to_bits(track({p: bytes([0xA5, p]) * 128 for p in range(16)}, 5))
tmap = standard_tmap()
tmap[22] = 35                                            # track 5.50 has an image of its own
check(len(set(len(b) % 8 for b in images)) > 1, "the tracks written here are not all a whole number of bytes")

# a copy with something wrong on some tracks
damage = {3: {7: "no address field"}, 4: {2: "data checksum"}, 8: {0: "address checksum"},
          9: {5: "no data epilogue"}, 12: {9: "outside"}}
bad = [to_bits(track({p: P[(t, p)] for p in range(16)}, t, gap=40 + t, says=7 if t == 6 else None,
                     damage=damage.get(t))) for t in range(35)]
before = parts[5][:19]                                   # everything before sector 9's data field
cut = sum(10 * s + 8 * len(n) for s, n in before) + 60 + 1001
bad[5] = bad[5][cut:] + bad[5][:cut]                     # its bits start 1001 bits into that field
# a copy with the marks changed throughout
MA, MD, ME = b"\xd5\xaa\x97", b"\xd5\xaa\xae", b"\xdf\xaa"
marked = [to_bits(track({p: P[(t, p)] for p in range(16)}, t, A=MA, D=MD, AE=ME, DE=ME)) for t in range(35)]

# -- a DOS 3.2 disk ------------------------------------------------------------------------------
L13 = {(t, s): pattern(t, s, 13) for t in range(35) for s in range(13)}
vtoc13 = bytearray(256)
vtoc13[1:4] = bytes([17, 12, 2])
vtoc13[6], vtoc13[0x27] = 254, 122
vtoc13[0x34:0x38] = bytes([35, 13, 0x00, 0x01])
L13[(17, 0)] = bytes(vtoc13)
L13[(17, 12)] = (bytes(0x0B) + entry(18, 12, 0x84, "THIRTEEN", 3)).ljust(256, b"\0")
small = bytes(range(200)) * 2
raw = struct.pack("<HH", 0x0300, len(small)) + small
L13[(18, 12)] = ts_list([(18, 11), (18, 10)])
L13[(18, 11)], L13[(18, 10)] = raw[:256], raw[256:].ljust(256, b"\0")
D13 = b"".join(L13[(t, s)] for t in range(35) for s in range(13))
images13 = [to_bits(track({s: L13[(t, s)] for s in range(13)}, t, n=13, gap=40 + t, order=SKEW13)) for t in range(35)]

with tempfile.TemporaryDirectory() as tmp:
    def write(name, data):
        path = os.path.join(tmp, name)
        with open(path, "wb") as f:
            f.write(data)
        return path

    main_woz = write("disk.woz", woz(2, images + [half], tmap, meta="language\tEnglish\ntitle\tTest disk\n"))
    files = {
        "WOZ 2": main_woz,
        "WOZ 1": write("disk1.woz", woz(1, images, standard_tmap())),
        ".nib": write("disk.nib", b"".join(to_nib(x) for x in parts)),
        ".do": write("disk.do", DO),
        ".dsk": write("disk.dsk", DO),
        ".po": write("disk.po", PO),
        ".2mg in DOS order": write("dos.2mg", two_img(0, DO, flags=0x100 | 254)),
        ".2mg in ProDOS order": write("prodos.2mg", two_img(1, PO, blocks=280)),
        ".2mg of nibbles": write("nib.2mg", two_img(2, b"".join(to_nib(x) for x in parts))),
    }

    # -- every image gives back every sector, in both orders --------------------------------------
    for kind, path in files.items():
        d = disk.open(path)
        dos, missing_dos = d.image("dos")
        prodos, missing_prodos = d.image("prodos")
        check(d.marks.sectors == 16 and dos == DO and prodos == PO and not missing_dos and not missing_prodos,
              f"{kind}: all 560 sectors, in DOS 3.3 order and in ProDOS order")
    d = disk.open(files[".2mg in DOS order"])
    check(d.volume == 254 and d.sectors(0).found[0].volume == 254, ".2mg: the volume its flags give")
    d = disk.open(files[".do"], file_order="prodos")
    check(d.file_order == "prodos" and d.logical(17, 14) == L[(17, PRODOS.index(DOS[14]))],
          "--file-order: a .do taken in ProDOS order when asked (DOS's sector 14, physical 2, is the file's second)")

    d = disk.open(main_woz)
    check(d.kind == "woz" and d.woz["version"] == 2 and d.woz["compatible_hardware"] == ["Apple ][", "Apple //e"]
          and d.woz["required_ram"] == 48 and d.woz["boot_sector_format"] == "16-sector",
          "WOZ 2: its INFO chunk")
    check(list(d.meta.items()) == [("title", "Test disk"), ("language", "English")], "WOZ 2: META, in the format's order")
    check(all(d.track_bits(t) == images[t] for t in range(35)), "WOZ 2: each track's bits, to the bit count")
    check(d.positions() == sorted([4 * t for t in range(35)] + [22]) and d.quarters(20) == [19, 20, 21]
          and d.track_bits(5, 1) == images[5] and d.track_bits(5, 3) == images[6] and d.track_bits(5, 2) == half
          and d.track_bits(36) is None, "WOZ 2: quarter tracks through TMAP, track 5.50 its own image")
    t = d.sectors(5, 2)
    check(len(t.found) == 16 and all(t.data(p) == bytes([0xA5, p]) * 128 for p in range(16)),
          "WOZ 2: the sectors of track 5.50")
    check(d.track_nibbles(0)[:43] == b"\xff" * 40 + b"\xd5\xaa\x96", "track_nibbles: the sync bytes, then an address field")
    check(d.logical(0, 1, "048C159D26AE37BF") == P[(0, 4)] and d.logical(0, 1, [0, 7] + list(range(1, 7)) +
          list(range(8, 16))) == P[(0, 7)], "an order of the loader's own, as hex digits or a list")
    check(raises(lambda: d.logical(0, 0, "0123"), ["16 hex digits"]), "an order that is not a table of 16 is refused")

    # -- the catalog and the files ---------------------------------------------------------------
    for kind in ("WOZ 2", ".po"):
        d = disk.open(files[kind])
        got = [(e["name"], e["type"], e["locked"], e["deleted"], e["sectors"], e["list"]) for e in d.catalog()]
        check(got == [("GAME", "B", True, False, 4, (18, 15)), ("NOTES", "T", False, False, 3, (19, 15)),
                      ("PROGRAM", "A", False, False, 3, (20, 15)), ("OLD", "B", False, True, 2, (21, 15)),
                      ("HOLES", "T", False, False, 3, (23, 15)), ("SECOND", "B", False, False, 2, (22, 15))]
              and d.vtoc["volume"] == 254 and d.vtoc["release"] == 3 and not d.catalog_problems,
              f"{kind}: the catalog over two sectors, a locked file and a deleted one")
        f = d.read_file("GAME")
        check((f["address"], f["length"], f["data"], f["lists"]) == (0x0800, 700, game, [(18, 15)]),
              f"{kind}: a binary's address, length and bytes")
    d = disk.open(main_woz)
    check(d.read_file("notes")["data"] == notes, "a text file, up to its first zero (named in lower case)")
    f = d.read_file("PROGRAM")
    check((f["length"], f["data"]) == (300, program), "an Applesoft program, the length its header gives")
    f = d.read_file("SECOND")
    check((f["address"], f["length"], f["data"]) == (0x2000, 10, b"0123456789"), "a file listed in the second catalog sector")
    f = d.read_file("HOLES")
    check(f["holes"] == [1] and f["data"] == holes and len(f["raw"]) == 768 and not f["missing"],
          "a file with a hole: reported, and zeros")
    check(raises(lambda: d.read_file("NOTHING"), ["no file named 'NOTHING'", "'GAME'"]), "a name not in the catalog is refused")

    # -- DOS 3.2 -----------------------------------------------------------------------------------
    for kind, path in (("13-sector WOZ", write("dos32.woz", woz(2, images13, standard_tmap(), boot=2))),
                       (".d13", write("dos32.d13", D13))):
        d = disk.open(path)
        img, missing = d.image()
        f = d.read_file("THIRTEEN")
        check(d.marks.sectors == 13 and img == D13 and not missing and [e["name"] for e in d.catalog()] == ["THIRTEEN"]
              and (f["address"], f["length"], f["data"]) == (0x0300, 400, small),
              f"{kind}: 13 sectors a track, all 455 sectors, the catalog and a binary")
    check(raises(lambda: d.image("prodos"), ["13-sector"]), "ProDOS order on a 13-sector disk is refused")

    # -- what is wrong is reported -------------------------------------------------------------------
    d = disk.open(write("damaged.woz", woz(2, bad, standard_tmap())), sectors=16)
    t = d.sectors(3)
    check(t.missing == [7] and t.why(7) == "no address field" and d.logical(3, DOS.index(7)) is None,
          "a sector with no address field is missing, and says so")
    t, lenient = d.sectors(4), d.sectors(4, lenient=True)
    check(t.rejected == {2: "data checksum"} and t.data(2) is None and lenient.data(2) == P[(4, 2)]
          and lenient.doubtful == {2: "data checksum"}, "a bad data checksum: rejected, and taken with lenient")
    t = d.sectors(5)
    check(len(t.found) == 16 and all(t.data(p) == P[(5, p)] for p in range(16)) and t.found[9].bit > t.bits - 3000,
          "a data field that runs over the end of the track's bits is read whole")
    t = d.sectors(6)
    check(t.tracks == {7} and all(t.data(p) == P[(6, p)] for p in range(16)),
          "address fields on track 6 that say track 7: read, and reported")
    t = d.sectors(8)
    check(t.missing == [0] and t.not_taken() == {0: "address checksum"} and t.why(0) == "address field not taken: "
          "address checksum" and d.sectors(8, lenient=True).data(0) == P[(8, 0)],
          "a bad address checksum: not taken, and taken with lenient")
    t = d.sectors(9)
    check(t.rejected == {5: "data epilogue FF FF (not DE AA)"} and d.sectors(9, lenient=True).data(5) == P[(9, 5)],
          "a data field with no epilogue: rejected, and taken with lenient")
    t = d.sectors(12)
    check(t.rejected.get(9, "").startswith("data nibbles outside the 6-and-2 table") and t.found[9].outside == [(100, 0x95)]
          and "(1, the first $95 at nibble 100)" in t.found[9].explain(), "a data nibble outside the table, and where it is")
    img, missing = d.image()
    gone = {(3, DOS.index(7), 7), (4, DOS.index(2), 2), (8, 0, 0), (9, DOS.index(5), 5), (12, DOS.index(9), 9)}
    check({(t, s, p) for t, s, p, why in missing} == gone and len(img) == len(DO) and all(
          img[(16 * t + s) * 256:(16 * t + s + 1) * 256] == (bytes(256) if (t, s, p) in gone else L[(t, s)])
          for t in range(35) for s, p in enumerate(DOS)), "image(): every sector, the missing ones as zeros and listed")
    rows = {r["position"]: r for r in d.info()["tracks"]}
    check(rows[6.0]["address_tracks"] == [7] and rows[3.0]["absent"] == [7] and rows[4.0]["rejected"] == {2: "data checksum"},
          "info(): the tracks with something wrong")

    path = write("marked.woz", woz(2, marked, standard_tmap()))
    d = disk.open(path)
    img, missing = d.image()
    check(len(missing) == 560 and missing[0][3] == "no address field", "changed prologues: no sector read with DOS's marks")
    d = disk.open(path, address="D5AA97", data="D5 AA AE", address_epilogue="DFAA", data_epilogue=b"\xdf\xaa")
    check(d.image() == (DO, []) and d.catalog()[0]["name"] == "GAME", "changed prologues and epilogues: all read when given")
    d = disk.open(path, address="D5AA97", data="D5AAAE")
    notes_given = d.info()["notes"]
    check(d.sectors(0).not_taken()[0] == "address epilogue DF AA (not DE AA), data epilogue DF AA (not DE AA)"
          and any("try --address-epilogue DFAA" in n for n in notes_given)
          and any("try --data-epilogue DFAA" in n for n in notes_given),
          "changed epilogues: the fields not taken say why, and info suggests the marks")

    blob = bytearray(open(main_woz, "rb").read())
    blob[3000] ^= 0x10
    path = write("changed.woz", bytes(blob))
    check(raises(lambda: disk.open(path), ["CRC", "--no-crc"]) and disk.open(path, crc=False).kind == "woz",
          "a WOZ whose CRC fails is refused, and read with crc=False")
    blob[8:12] = bytes(4)
    check(disk.open(write("nocrc.woz", bytes(blob))).description == "WOZ 2, no CRC", "a WOZ with no CRC is read")
    blob = bytearray(open(main_woz, "rb").read())
    blob[4:8] = b"\xff\x0a\x0a\x00"
    check(raises(lambda: disk.open(write("text.woz", bytes(blob))), ["FF 0A 0D 0A"]),
          "a WOZ whose line-end bytes were changed is refused")
    check(raises(lambda: disk.open(write("junk.bin", bytes(range(250)) * 4)), ["1,000 bytes", "not a disk image"]),
          "a file that is not a disk image is refused, saying what it is")
    check(raises(lambda: disk.open(write("fake.woz", b"NOTAWOZ!" + bytes(100))), ["named .woz"]),
          "a .woz that is not a WOZ is refused")
    check(raises(lambda: disk.open(write("zero.do", bytes(len(DO)))).catalog(), ["no DOS catalog", "holds only zeros"]),
          "a disk with no DOS catalog says so")
    po = bytearray(len(PO))
    po[1024 + 2], po[1024 + 4], po[1029:1036] = 3, 0xF7, b"TESTVOL"
    check(raises(lambda: disk.open(write("prodos.po", bytes(po))).catalog(), ["no DOS catalog", "/TESTVOL"]),
          "a ProDOS disk: no DOS catalog, and the volume's name")

    # -- the commands ----------------------------------------------------------------------------------
    def run(*argv):
        out = io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
            try:
                code = disk.main(list(argv))
            except SystemExit as e:                       # argparse's -h and its errors
                code = e.code
        return code, out.getvalue()

    out = os.path.join(tmp, "out.bin")
    code, text = run("-h")
    check(code == 0 and "Usage" in text and "disk.py info <image>" in text, "-h prints the manual")
    check(all(run(c, "-h")[0] == 0 and f"usage: disk.py {c}" in run(c, "-h")[1]
              for c in ("info", "catalog", "extract", "sectors", "read", "nibbles")), "each command has -h")
    code, text = run("info", main_woz)
    check(code == 0 and "WOZ 2, CRC good" in text and "between whole tracks 5.50" in text and "16 of 16" in text
          and "read from -0.25 to +0.25 of their track" in text and "read at 5.50 only" in text
          and "0.00 to 0.25" not in text
          and "every address field taken says volume 254" in text and "5 files" in text, "info")
    code, text = run("info", os.path.join(tmp, "damaged.woz"), "--16")
    check(code == 0 and "rejected 2: data checksum" in text and "no address field for 7" in text
          and "address fields say track 7" in text, "info on the damaged copy")
    code, text = run("catalog", files[".do"])
    check(code == 0 and "*B 004 GAME" in text and "loads at $0800, $02BC bytes" in text and "deleted" in text, "catalog")
    code, text = run("extract", main_woz, "GAME", "-o", out)
    check(code == 0 and open(out, "rb").read() == game and "loads at $0800" in text, "extract")
    code, text = run("sectors", main_woz, "-o", out)
    check(code == 0 and open(out, "rb").read() == DO and "560 of 560" in text, "sectors")
    code, text = run("sectors", files[".do"], "-o", out, "--order", "prodos")
    check(code == 0 and open(out, "rb").read() == PO, "sectors --order prodos")
    code, text = run("read", os.path.join(tmp, "marked.woz"), "17", "0", "--address", "D5AA97", "--data",
                     "D5AAAE", "--address-epilogue", "DFAA", "--data-epilogue", "DFAA")
    check(code == 0 and "00: 00 11 0F 03" in text, "read with --address, --data and the epilogues")
    code, text = run("sectors", os.path.join(tmp, "damaged.woz"), "-o", out)
    check(code == 1 and "555 of 560" in text and f"track 3: {DOS.index(7)}: no address field" in text,
          "sectors on the damaged copy")
    code, text = run("read", main_woz, "17", "0")
    check(code == 0 and "00: 00 11 0F 03" in text, "read")
    code, text = run("read", os.path.join(tmp, "damaged.woz"), "4", str(DOS.index(2)))
    check(code == 1 and "data checksum" in text and "--lenient" in text, "read on a rejected sector")
    code, text = run("nibbles", main_woz, "0")
    check(code == 0 and "address field: volume 254, track 0, sector 0" in text and "data field of sector 0" in text,
          "nibbles")
    code, text = run("nibbles", main_woz, "5", "--quarter", "2", "--raw")
    check(code == 0 and "track 5.50" in text and "D5 AA 96" in text, "nibbles --quarter --raw")
    code, text = run("info", os.path.join(tmp, "junk.bin"))
    check(code == 1 and "not a disk image" in text, "a command on a file that is not a disk image fails, saying why")

print(f"{'all' if not failed else failed} checks {'passed' if not failed else 'failed'} in {time.time() - began:.1f} s")
sys.exit(1 if failed else 0)
