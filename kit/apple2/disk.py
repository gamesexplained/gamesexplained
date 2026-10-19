#!/usr/bin/env python3
"""Read an Apple II floppy disk image without an emulator: its tracks as bits and nibbles, its
sectors in the order DOS 3.3, ProDOS or a loader of its own numbers them, and the files of a
DOS 3.3 or DOS 3.2 disk. Standard library only (Python 3.9 or later).

Images, recognised by what the file holds first and by its name second:
  WOZ 1, WOZ 2  Applesauce's copy of the bits, which keeps copy protection: "WOZ1" or "WOZ2",
                FF 0A 0D 0A, a CRC-32 of the rest (checked unless it is 0), then chunks: INFO
                (disk type, creator; from WOZ 2 the boot sector format, bit timing, machines,
                RAM), TMAP (the track image each quarter track reads), TRKS (the bits, high bit
                first, and each track's bit count) and META (tab-separated keys and values).
                A track a WOZ 2.1 keeps as flux timings (FLUX) is reported and not read.
                https://applesaucefdc.com/woz/reference2/ (WOZ 1: /woz/reference/)
  .nib .nb2     35 tracks of nibbles as a disk controller read them: 6,656 bytes a track
                (232,960 in all), or for a .nb2 6,384 (223,440), as CiderPress II's
                DiskArc/Disk/Unadorned-notes.md gives them
  .dsk .do .po  35 tracks x 16 sectors x 256 bytes (143,360): .dsk and .do in DOS 3.3 order,
                .po in ProDOS order, unless --file-order says otherwise
  .d13          35 x 13 x 256 (116,480), in DOS 3.2's numbering
  .2mg .2img    "2IMG", a 64-byte header, then one of the above: the format field (+$0C) says
                DOS order (0), ProDOS order (1) or nibbles (2), the flags (+$10) a volume number
                in their low byte when bit 8 is set, and the data is at the offset (+$18) and
                length (+$1C) given. The layout is the 2IMG description archived from magnet.ch
                in 1998, as CiderPress II's DiskArc/Disk/TwoIMG-notes.md reproduces it.

From bits to sectors. The bits pass through a latch like the Disk II's data register: they
shift in, and a nibble is complete when its top bit is 1, so the zeros before a 1 are skipped;
that is how sync bytes (FF and one or two zero bits) bring the reader into step. A track is read
round, as a drive reads it: the latch starts on the end of the track, so it is in step when the
bits begin, and reads on past their end, so a field that runs over the end is read whole. On a
16-sector track (6-and-2: DOS 3.3, ProDOS) each sector is an address field, D5 AA 96, then the
volume, track, sector and the exclusive-or of the three, each as two 4-and-4 nibbles, then
DE AA (EB), and a data field, D5 AA AD, 342 nibbles, a checksum nibble, DE AA (EB). A 13-sector
track (5-and-3: DOS 3.2 and before) has D5 AA B5 and 410 data nibbles. DOS checks only the first
two nibbles of an epilogue, and so does this. Beneath Apple DOS (Worth and Lechner, 1982),
chapter 3, describes both; its figures 3.19 and 3.23 are the tables below. A sector's number is
its address field's, and so is the track reported for it, which can differ from the one the
head is on. Whether a disk has 13 or 16 sectors is read from the address marks its tracks hold.
A copy protection may change the marks: --address, --data, --address-epilogue and
--data-epilogue (hex, such as D5AA97) read such a disk, and info suggests them when most fields
end or begin otherwise. --lenient takes a sector whose checksum is wrong or whose epilogue is
missing; without it such a sector is left out. Either way it is reported.

Orders, logical sector -> physical (address field) sector on each track:
  dos       DOS33 below, DOS's own table at $BFB8 (Beneath Apple DOS, chapters 3 and 8: logical
            2 is physical 11). On a 13-sector disk, DOS 3.2's sector N is the one whose address
            field says N: DOS 3.2 spreads the sectors around the track when it formats, not in
            software (chapter 3), so there "dos" and "physical" are the same
  prodos    PRODOS below: block B is track B / 8, logical sectors 2(B % 8) and 2(B % 8) + 1
            (Beneath Apple ProDOS, chapter 3, table 3.1: block 2 is track 0, physical 8 and A)
  physical  the address field's number
  a table   16 hex digits (13 on a 13-sector disk), the physical sector of each logical one, for
            a loader with a table of its own: 048C159D26AE37BF reads logical 1 from physical 4

DOS 3.3 and 3.2 (Beneath Apple DOS, chapter 4). The VTOC is at track 17 sector 0 (--vtoc moves
it): bytes 1 and 2 give the first catalog sector, 3 the DOS release, 6 the volume, $27 the
pairs a track/sector list holds (122), $34 and $35 the tracks and sectors a track. A catalog
sector links to the next at bytes 1 and 2 and holds seven entries of 35 bytes from $0B: the
track and sector of the file's first track/sector list (track 0: never used; $FF: deleted, the
old track kept in the name's last byte), the type, the name (30 characters, high-bit ASCII,
padded with spaces) and the length in sectors. A track/sector list links to the next at bytes 1
and 2 and lists 122 data sectors from $0C; a pair with track 0 is a hole in a random-access
file, or the end. Types, plus $80 when the file is locked:
  T $00  text: up to the first zero byte (a random-access file has zeros between its records)
  I $01  Integer BASIC; A $02 Applesoft: the first two bytes are the program's length
  B $04  binary: the first two bytes are where it loads, the next two its length
  S $08, R $10 (the DOS Toolkit's relocatable code), A $20, B $40: no header is read; the file
         is returned whole
A disk with no DOS catalog (a game with its own loader, or a ProDOS disk) says so, and its
sectors still read.

API, for other kit scripts (a reader of a game's own format imports this one):
  open(path, sectors=None, address=None, data=None, address_epilogue=None,
       data_epilogue=None, lenient=False, crc=True, file_order=None)
                                    a Disk; DiskError, which ends a script with its message
                                    unless caught, when the file is not one of the above
  disk.track_bits(track, quarter=0) the bits as a str of "0" and "1", or None for no data;
                                    quarter 1, 2, 3 is track + 0.25, 0.5, 0.75
  disk.track_nibbles(track, quarter=0, revolutions=1)
                                    latched from the start of the bits (in step from the
                                    first sync bytes)
  latch(bits, start=0, stop=None)   (nibbles, the bit where each starts)
  disk.sectors(track, quarter=0, **marks)
                                    a Track: .found {number: Sector}, .fields (every address
                                    field around the track, taken or not), .missing, .rejected
                                    and .doubtful ({number: why}), .not_taken() (the same, for
                                    address fields the marks refused), .volumes, .tracks (what
                                    the address fields say), .bits, .data(n) (256 bytes, or
                                    None) and .why(n); marks as for open()
  Sector                            .number, .track and .volume from its address field, .data,
                                    .bit (where the address field starts), .problems, .taken,
                                    .explain() (the problems, with where a bad nibble is)
  disk.logical(track, sector, order="dos")      256 bytes, or None
  disk.physical(track, sector, quarter=0)        256 bytes, or None
  disk.order(order)                 the table for an order, logical -> physical
  disk.image(order="dos")           (bytes, missing): every sector in that order, a missing one
                                    as zeros, missing [(track, sector, physical, why)]
  disk.catalog(vtoc=(17, 0))        [{"name", "type", "code", "locked", "deleted", "sectors",
                                    "list", "entry"}]; NoCatalog (a DiskError) says why not
  disk.read_file(name)              {"name", "type", "address" and "length" (B), "length" (A,
                                    I), "data" (after the header), "raw" (all of its sectors),
                                    "sectors", "missing", "holes", "problems"}
  disk.info()                       a dict of what the commands below print

Usage (each command prints its options with -h):
  disk.py info <image> [-v]         the format, WOZ INFO and META, the tracks with data, and
                                    per track the sectors read, missing and rejected; -v lists
                                    every address field: where it is and what it says
  disk.py catalog <image>           the DOS catalog, or why there is none
  disk.py extract <image> <name> -o <file> [--raw]
                                    one file after its header (--raw: all of its sectors); a
                                    binary file's address and length are printed
  disk.py sectors <image> -o <file> [--order dos|prodos|physical|<table>]
                                    every sector as one flat image, and what was missing (exit
                                    status 1 when a sector is)
  disk.py read <image> <track> <sector> [count] [--physical | --order ...] [--quarter N]
                                    a hex dump of sectors
  disk.py nibbles <image> <track> [--quarter N] [--raw]
                                    one turn of a track's nibbles, the fields found marked
                                    (--raw: rows of hex)
  Every command takes --13, --16, --address, --data, --address-epilogue, --data-epilogue,
  --lenient, --file-order dos|prodos (a sector image) and --no-crc (a WOZ whose CRC fails).

A disk image, and every image or file written from one, holds the game: they stay in the
game's work/ folder (AGENTS.md, "No binaries, ever"). The test is kit/apple2/test_disk.py.
"""
import argparse, bisect, collections, io, itertools, operator, os, re, struct, sys, zlib

TRACKS = 35
SECTOR = 256

# The nibble each 6-bit value is written as (Beneath Apple DOS, figure 3.23): a byte with its
# top bit set, at most one pair of zero bits side by side, two one bits side by side below the
# top bit, and neither D5 nor AA, which mark the fields.
WRITE62 = bytes.fromhex("96979a9b9d9e9fa6a7abacadaeafb2b3b4b5b6b7b9babbbcbdbebfcbcdcecfd3"
                        "d6d7d9dadbdcdddedfe5e6e7e9eaebecedeeeff2f3f4f5f6f7f9fafbfcfdfeff")
# The nibble each 5-bit value is written as (figure 3.19): the top bit set, no two zero bits
# side by side, neither D5 nor AA.
WRITE53 = bytes.fromhex("abadaeafb5b6b7babbbdbebfd6d7dadbdddedfeaebedeeeff5f6f7fafbfdfeff")
READ62 = {n: v for v, n in enumerate(WRITE62)}
READ53 = {n: v for v, n in enumerate(WRITE53)}

# Logical sector -> physical sector; the sources are in the docstring.
DOS33 = [0x0, 0xD, 0xB, 0x9, 0x7, 0x5, 0x3, 0x1, 0xE, 0xC, 0xA, 0x8, 0x6, 0x4, 0x2, 0xF]
PRODOS = [0x0, 0x2, 0x4, 0x6, 0x8, 0xA, 0xC, 0xE, 0x1, 0x3, 0x5, 0x7, 0x9, 0xB, 0xD, 0xF]
ORDERS16 = {"dos": DOS33, "prodos": PRODOS, "physical": list(range(16))}

ADDRESS16, ADDRESS13 = b"\xd5\xaa\x96", b"\xd5\xaa\xb5"
# The two address marks in a track's bits, with any zero bits between their nibbles: counting
# them tells a 13-sector disk from a 16-sector one without latching every track
MARK_BITS = {n: re.compile("0*".join(format(b, "08b") for b in mark)) for n, mark in ((16, ADDRESS16), (13, ADDRESS13))}
DATA, EPILOGUE = b"\xd5\xaa\xad", b"\xde\xaa"
DATA_GAP = 48                      # nibbles after an address field within which its data field starts
LEAD = 8192                        # bits latched before a turn, to come into step, and after it
DATA_NIBBLES = {16: 343, 13: 411}  # the checksum included

NIB_SIZES = {232960: 6656, 223440: 6384}
DSK_SIZE, D13_SIZE = TRACKS * 16 * SECTOR, TRACKS * 13 * SECTOR
HARDWARE = ["Apple ][", "Apple ][ Plus", "Apple //e", "Apple //c", "Apple //e Enhanced", "Apple IIgs",
            "Apple //c Plus", "Apple ///", "Apple /// Plus"]
BOOT = {0: "unknown", 1: "16-sector", 2: "13-sector", 3: "13- and 16-sector"}
META_KEYS = ["title", "subtitle", "publisher", "developer", "copyright", "version", "language",
             "requires_ram", "requires_machine", "notes", "side", "side_name", "contributor", "image_date"]
TYPE_LETTERS = "IABSRAB"           # by the lowest of the type's bits set; none set is T
TYPE_NAMES = {0x00: "text", 0x01: "Integer BASIC", 0x02: "Applesoft BASIC", 0x04: "binary", 0x08: "S type",
              0x10: "relocatable", 0x20: "A type ($20)", 0x40: "B type ($40)"}


class DiskError(SystemExit):
    """What could not be read, and why. Uncaught, it ends the script with its message."""


class NoCatalog(DiskError):
    """The disk has no DOS catalog where DOS would look for one."""


def _hex(s):
    return " ".join(f"{b:02X}" for b in s)


def _marks(text):
    """b"\\xd5\\xaa\\x97" from "D5AA97", "D5 AA 97" or bytes."""
    if text is None or isinstance(text, (bytes, bytearray)):
        return bytes(text) if text is not None else None
    try:
        b = bytes.fromhex(text.replace(" ", "").replace(",", ""))
    except ValueError:
        raise DiskError(f"{text!r} is not nibbles in hex, such as D5AA96")
    if not b:
        raise DiskError("an empty mark marks nothing")
    return b


def bits_of(raw, nbits):
    """The first nbits bits of raw, the high bit of each byte first, as a str of "0" and "1"."""
    if not raw or nbits <= 0:
        return ""
    return format(int.from_bytes(raw, "big"), f"0{len(raw) * 8}b")[:nbits]


def latch(bits, start=0, stop=None):
    """Nibbles as the Disk II's data register latches them from bits: the zeros before a 1 are
    skipped, and a 1 starts a nibble of eight bits. Returns (nibbles, the bit where each starts),
    for the nibbles that start before stop."""
    out, at = bytearray(), []
    stop = len(bits) if stop is None else min(stop, len(bits))
    find, last = bits.find, len(bits) - 8
    p = find("1", start, stop)
    while 0 <= p <= last:
        out.append(int(bits[p:p + 8], 2))
        at.append(p)
        p = find("1", p + 8, stop)
    return bytes(out), at


def decode44(a, b):
    """One byte of an address field from its two 4-and-4 nibbles."""
    return ((a << 1) | 1) & b


def _values(nibs, table, kind):
    """The running exclusive-or of the nibbles' values, and a problem when one is not in the table
    (it counts as 0)."""
    vals = list(itertools.accumulate(map(table.get, nibs, itertools.repeat(0)), operator.xor))
    return vals, ([] if table.keys() >= set(nibs) else [f"data nibbles outside the {kind} table"])


SWAP2 = (0, 2, 1, 3)                   # two bits, the other way round


def decode62(nibs):
    """256 bytes from the 343 nibbles of a 6-and-2 data field, and its problems. Each nibble's
    value is exclusive-ored with the one before; the first 86 values hold the low two bits of
    bytes k, k + 86 and k + 172, each pair reversed, the next 256 the top six bits."""
    vals, problems = _values(nibs[:342], READ62, "6-and-2")
    if READ62.get(nibs[342]) != vals[-1]:
        problems.append("data checksum")
    low = vals[:86]
    low = [SWAP2[a & 3] for a in low] + [SWAP2[a >> 2 & 3] for a in low] + [SWAP2[a >> 4 & 3] for a in low[:84]]
    return bytes([top << 2 | b for top, b in zip(vals[86:], low)]), problems


def decode53(nibs):
    """256 bytes from the 411 nibbles of a 5-and-3 data field, and its problems. The first 154
    values (written last to first) hold the low three bits, the next 256 the top five; the bytes
    go five at a time from the ends of five areas of 51, then one alone. That is the layout DOS
    3.2's prenibble routine makes (Beneath Apple DOS, figure 3.18), as CiderPress II's
    DiskArc/SectorCodec.cs decodes it."""
    vals, problems = _values(nibs[:410], READ53, "5-and-3")
    if READ53.get(nibs[410]) != vals[-1]:
        problems.append("data checksum")
    threes = vals[153::-1]
    top = [v << 3 for v in vals[154:410]]
    out = bytearray()
    for i in range(50, -1, -1):
        t1, t2, t3 = threes[i], threes[51 + i], threes[102 + i]
        out += bytes([(top[i] | t1 >> 2) & 0xFF, (top[51 + i] | t2 >> 2) & 0xFF,
                      (top[102 + i] | t3 >> 2) & 0xFF,
                      (top[153 + i] | (t1 & 2) << 1 | (t2 & 2) | (t3 & 2) >> 1) & 0xFF,
                      (top[204 + i] | (t1 & 1) << 2 | (t2 & 1) << 1 | (t3 & 1)) & 0xFF])
    out.append((top[255] | threes[153] & 7) & 0xFF)
    return bytes(out), problems


class Marks:
    """How a track's sectors are written: 13 or 16 of them, the nibbles that open and close each
    field, and whether a sector with a bad checksum or no epilogue is taken."""

    def __init__(self, sectors=16, address=None, data=None, address_epilogue=None,
                 data_epilogue=None, lenient=False):
        if sectors not in (13, 16):
            raise DiskError(f"{sectors} sectors a track: this reads 13 or 16")
        self.sectors, self.lenient = sectors, bool(lenient)
        self.address = _marks(address) or (ADDRESS16 if sectors == 16 else ADDRESS13)
        self.data = _marks(data) or DATA
        self.address_epilogue = _marks(address_epilogue) or EPILOGUE
        self.data_epilogue = _marks(data_epilogue) or EPILOGUE

    def but(self, **kw):
        """These marks with some changed (None keeps one)."""
        cur = dict(sectors=self.sectors, address=self.address, data=self.data, lenient=self.lenient,
                   address_epilogue=self.address_epilogue, data_epilogue=self.data_epilogue)
        if kw.get("sectors") not in (None, self.sectors) and not kw.get("address"):
            cur["address"] = None                     # the other format's own address mark
        cur.update({k: v for k, v in kw.items() if v is not None})
        return Marks(**cur)

    def key(self):
        return (self.sectors, self.address, self.data, self.address_epilogue, self.data_epilogue,
                self.lenient)

    def describe(self):
        return (f"{self.sectors}-sector: address {_hex(self.address)} ... {_hex(self.address_epilogue)}, "
                f"data {_hex(self.data)} ... {_hex(self.data_epilogue)}" + (", lenient" if self.lenient else ""))


class Sector:
    """One sector: what its address field says, its data, where it starts and what was wrong."""

    def __init__(self, number, track=None, volume=None, data=None, bit=None, problems=()):
        self.number, self.track, self.volume = number, track, volume
        self.data, self.bit, self.problems = data, bit, list(problems)
        self.taken = True            # False: an address field the marks did not accept
        self.seen = {}               # what was where each mark should be, for info's suggestions
        self.outside = []            # (nibble, value) of each data nibble outside the table

    def explain(self):
        """The problems, with how many data nibbles are outside the table and where the first is."""
        out = []
        for p in self.problems:
            if p.startswith("data nibbles outside") and self.outside:
                k, n = self.outside[0]
                p += f" ({len(self.outside)}, the first ${n:02X} at nibble {k})"
            out.append(p)
        return ", ".join(out)

    def __repr__(self):
        return (f"Sector({self.number}, track={self.track}, volume={self.volume}, bit={self.bit}, "
                f"taken={self.taken}, problems={self.problems})")


class Track:
    """The sectors read from one track (see the module's docstring)."""

    def __init__(self, position, marks, bits=None):
        self.position, self.marks, self.bits = position, marks, bits
        self.fields, self.found = [], {}
        self.missing, self.rejected, self.doubtful = [], {}, {}
        self.volumes, self.tracks = set(), set()

    def finish(self):
        self.fields.sort(key=lambda s: s.bit if s.bit is not None else s.number)
        for s in self.fields:
            old = self.found.get(s.number)
            if s.taken and (old is None or (old.problems and not s.problems)):
                self.found[s.number] = s
        self.missing = [n for n in range(self.marks.sectors) if n not in self.found]
        for n, s in self.found.items():
            if s.volume is not None:
                self.volumes.add(s.volume)
            if s.track is not None:
                self.tracks.add(s.track)
            if s.problems:
                why = ", ".join(s.problems)
                if s.data is not None and self.marks.lenient:
                    self.doubtful[n] = why
                else:
                    self.rejected[n] = why
        return self

    def data(self, number):
        """The sector's 256 bytes, or None when it is missing or rejected."""
        s = self.found.get(number)
        if s is None or s.data is None or (s.problems and not self.marks.lenient):
            return None
        return s.data

    def not_taken(self):
        """{number: why} for the address fields the marks did not accept, when no other was."""
        out = {}
        for s in self.fields:
            if not s.taken and s.number not in self.found:
                out.setdefault(s.number, ", ".join(s.problems))
        return out

    def why(self, number):
        """Why a sector's data is not here, or None when it is."""
        if self.data(number) is not None:
            return None
        if number in self.rejected:
            return self.rejected[number]
        skipped = self.not_taken().get(number)
        if skipped:
            return "address field not taken: " + skipped
        return "no data on this track" if self.bits == 0 else "no address field"


class Disk:
    """An opened image; see the module's docstring."""

    def __init__(self, path, crc=True, file_order=None, sectors=None, **marks):
        self.path = path
        if not os.path.isfile(path):
            raise DiskError(f"{path}: no such file")
        with io.open(path, "rb") as f:
            blob = f.read()
        self.size = len(blob)
        self.kind = None             # "woz", "nib" or "sectors"
        self.description = ""
        self.woz, self.meta, self.header = {}, {}, {}
        self.tmap = None             # quarter track -> track image (WOZ, and made up for a .nib)
        self.flux = {}               # quarter track -> flux image (WOZ 2.1)
        self._raw, self._bits, self._latched, self._tracks = {}, {}, {}, {}
        self.file_order = None       # a sector image's order
        self.volume = None           # a 2IMG's volume number
        self._recognise(blob, crc, file_order)
        if self.kind == "sectors":
            if sectors not in (None, self._n):
                raise DiskError(f"{path}: a {self._n}-sector image cannot be read as {sectors} sectors")
            sectors = self._n
        self.marks = Marks(sectors or self._detect_sectors(), **marks)

    # -- recognising the file --------------------------------------------------------------------

    def _recognise(self, blob, crc, file_order):
        ext = os.path.splitext(self.path)[1].lower()
        head = blob[:8]
        if file_order not in (None, "dos", "prodos"):
            raise DiskError(f"file order {file_order!r}: dos or prodos")
        if head[:4] in (b"WOZ1", b"WOZ2"):
            return self._woz(blob, crc)
        if head[:4] == b"2IMG":
            return self._2mg(blob, file_order)
        if head[:4] == b"MOOF":
            raise DiskError(f"{self.path}: a MOOF file, Applesauce's image of a 3.5-inch Macintosh disk; "
                            "this reads 5.25-inch Apple II disks")
        if head[:3] == b"A2R":
            raise DiskError(f"{self.path}: an A2R file, Applesauce's flux capture: make a WOZ of it with "
                            "Applesauce, or find the WOZ made from it")
        if ext == ".woz":
            raise DiskError(f"{self.path}: named .woz, but it starts {_hex(head)}, not \"WOZ1\" or \"WOZ2\": "
                            "it is not a WOZ, or it was damaged in copying")
        if len(blob) in NIB_SIZES:
            return self._nib(blob, NIB_SIZES[len(blob)])
        if len(blob) == DSK_SIZE:
            return self._sectors(blob, 16, file_order or ("prodos" if ext == ".po" else "dos"),
                                 "as asked" if file_order else f"from its name, {ext or 'no extension'}")
        if len(blob) == D13_SIZE:
            return self._sectors(blob, 13, "physical", "")
        raise DiskError(f"{self.path}: {len(blob):,} bytes starting {_hex(head)}: not a disk image this reads "
                        "(a WOZ; a .nib of 232,960 bytes; a .dsk, .do or .po of 143,360; a .d13 of 116,480; "
                        "a .2mg)")

    def _woz(self, blob, crc):
        version = 1 if blob[:4] == b"WOZ1" else 2
        if blob[4:8] != b"\xff\x0a\x0d\x0a":
            raise DiskError(f"{self.path}: a WOZ {version} whose bytes 4-7 are {_hex(blob[4:8])}, not FF 0A 0D 0A: "
                            "it was changed in copying (a text-mode transfer rewrites line ends); get it again")
        stored = struct.unpack_from("<I", blob, 8)[0] if len(blob) >= 12 else 0
        if stored and crc:
            actual = zlib.crc32(blob[12:]) & 0xFFFFFFFF
            if actual != stored:
                raise DiskError(f"{self.path}: the WOZ's CRC is {actual:08X} and the file says {stored:08X}: it "
                                "was damaged or changed after it was made. Get it again, or read it anyway with "
                                "--no-crc (crc=False)")
        chunks, p = {}, 12
        while p + 8 <= len(blob):
            cid, size = blob[p:p + 4].decode("latin-1"), struct.unpack_from("<I", blob, p + 4)[0]
            chunks.setdefault(cid, (p + 8, size))
            p += 8 + size
        for need in ("INFO", "TMAP", "TRKS"):
            if need not in chunks:
                raise DiskError(f"{self.path}: a WOZ {version} with no {need} chunk (it has "
                                f"{', '.join(chunks) or 'none'}): the file is cut short or damaged")
        at, size = chunks["INFO"]
        b = blob[at:at + size]
        info = {"version": b[0], "disk_type": b[1], "write_protected": bool(b[2]), "synchronized": bool(b[3]),
                "cleaned": bool(b[4]), "creator": b[5:37].decode("utf-8", "replace").rstrip(" \0")}
        if b[0] >= 2 and len(b) >= 46:
            hw = struct.unpack_from("<H", b, 40)[0]
            info.update({"sides": b[37], "boot_sector_format": BOOT.get(b[38], str(b[38])),
                         "optimal_bit_timing": b[39],
                         "compatible_hardware": [n for k, n in enumerate(HARDWARE) if hw >> k & 1],
                         "required_ram": struct.unpack_from("<H", b, 42)[0],
                         "largest_track": struct.unpack_from("<H", b, 44)[0]})
        if b[0] >= 3 and len(b) >= 50:
            info.update({"flux_block": struct.unpack_from("<H", b, 46)[0],
                         "largest_flux_track": struct.unpack_from("<H", b, 48)[0]})
        self.woz = info
        if info["disk_type"] != 1:
            what = "3.5-inch" if info["disk_type"] == 2 else f"type {info['disk_type']}"
            raise DiskError(f"{self.path}: a WOZ of a {what} disk; this reads 5.25-inch Apple II disks")
        at, size = chunks["TMAP"]
        self.tmap = bytes(blob[at:at + min(size, 160)]).ljust(160, b"\xff")
        if "FLUX" in chunks and info.get("flux_block") and info.get("largest_flux_track"):
            at, size = chunks["FLUX"]
            self.flux = {q: i for q, i in enumerate(blob[at:at + min(size, 160)]) if i != 0xFF}
        at, size = chunks["TRKS"]
        for idx in sorted(set(i for i in self.tmap if i != 0xFF)):
            if version == 1:
                rec = at + idx * 6656
                if rec + 6656 > len(blob):
                    raise DiskError(f"{self.path}: track image {idx} runs past the end of the file")
                used, nbits = struct.unpack_from("<HH", blob, rec + 6646)
                self._raw[idx] = (blob[rec:rec + min(used, 6646)], nbits)
            else:
                if at + idx * 8 + 8 > len(blob):
                    raise DiskError(f"{self.path}: track image {idx}'s entry runs past the end of the file")
                start, count, nbits = struct.unpack_from("<HHI", blob, at + idx * 8)
                if (start + count) * 512 > len(blob):
                    raise DiskError(f"{self.path}: track image {idx} (blocks {start} to {start + count - 1}) runs "
                                    "past the end of the file")
                self._raw[idx] = (blob[start * 512:(start + count) * 512], nbits)
            raw, nbits = self._raw[idx]
            if nbits > len(raw) * 8:
                raise DiskError(f"{self.path}: track image {idx} says {nbits:,} bits but holds {len(raw) * 8:,}")
        if "META" in chunks:
            at, size = chunks["META"]
            rows = [r.split("\t", 1) for r in blob[at:at + size].decode("utf-8", "replace").split("\n") if "\t" in r]
            meta = dict(rows)
            self.meta = {k: meta[k] for k in META_KEYS if k in meta}
            self.meta.update({k: v for k, v in meta.items() if k not in self.meta})
        self.kind = "woz"
        self.description = f"WOZ {version}, " + (("CRC good" if crc else "CRC not checked") if stored else "no CRC")

    def _nib(self, blob, length, label=None):
        for t in range(TRACKS):
            self._raw[t] = (blob[t * length:(t + 1) * length], length * 8)
        self.tmap = bytes(t if q % 4 == 0 else 0xFF for t in range(TRACKS) for q in range(4)).ljust(160, b"\xff")
        self.kind = "nib"
        self.description = label or f"nibble image, {TRACKS} tracks of {length:,} nibbles"

    def _sectors(self, blob, n, order, why):
        self._blob, self._n, self.file_order, self.kind = blob, n, order, "sectors"
        self.description = (f"sector image, {TRACKS} tracks x {n} sectors, " +
                            (f"{'DOS 3.3' if order == 'dos' else 'ProDOS'} order ({why})" if n == 16
                             else "in DOS 3.2's numbering"))

    def _2mg(self, blob, file_order):
        if len(blob) < 64:
            raise DiskError(f"{self.path}: a 2IMG file of {len(blob)} bytes, shorter than its 64-byte header")
        creator, hlen, version, fmt, flags, blocks, off, length, c_off, c_len = struct.unpack_from(
            "<4sHHIIIIIII", blob, 4)
        if fmt == 1 and length == 0:
            length = blocks * 512              # some images give the blocks and leave the length 0
        self.header = {"creator": creator.decode("latin-1"), "header_length": hlen, "version": version,
                       "format": {0: "DOS order", 1: "ProDOS order", 2: "nibbles"}.get(fmt, f"format {fmt}"),
                       "flags": flags, "blocks": blocks, "data_offset": off, "data_length": length,
                       "locked": bool(flags >> 31 & 1)}
        if c_len:
            self.header["comment"] = blob[c_off:c_off + c_len].decode("latin-1").replace("\r", "\n")
        if flags & 0x100:
            self.volume = flags & 0xFF
        data = blob[off:off + length]
        if len(data) != length:
            raise DiskError(f"{self.path}: its 2IMG header puts {length:,} bytes at {off}, past the end of the file")
        if fmt == 2 and length in NIB_SIZES:
            self._nib(data, NIB_SIZES[length], f"2IMG ({self.header['creator']}) of nibbles")
        elif fmt in (0, 1) and length == DSK_SIZE:
            self._sectors(data, 16, file_order or ("dos" if fmt == 0 else "prodos"),
                          "as asked" if file_order else "the 2IMG header")
            self.description = f"2IMG ({self.header['creator']}), " + self.description
        else:
            raise DiskError(f"{self.path}: a 2IMG of {self.header['format']} with {length:,} bytes of data; this reads "
                            "5.25-inch disks: 143,360 bytes of sectors or 232,960 of nibbles")

    def _detect_sectors(self):
        """13 when the tracks' bits hold more D5 AA B5 marks than D5 AA 96, else 16."""
        count = {16: 0, 13: 0}
        for q in self.positions():
            bits = self._bits_at(q)
            turn = bits + bits[:64]                   # a mark that runs over the end of the bits
            for n, pat in MARK_BITS.items():
                count[n] += sum(1 for m in pat.finditer(turn) if m.start() < len(bits))
        return 13 if count[13] > count[16] else 16

    def _marks_read(self, q):
        """{16: D5 AA 96 marks, 13: D5 AA B5 marks} the latch finds in one turn of quarter track q."""
        nibs, at, nbits = self._latch(q)
        a, b = bisect.bisect_left(at, 0), bisect.bisect_left(at, nbits)
        turn = nibs[a:b + 2]                          # a mark that starts in the turn, whole
        return {16: turn.count(ADDRESS16), 13: turn.count(ADDRESS13)}

    # -- tracks ----------------------------------------------------------------------------------

    def positions(self):
        """A quarter track for each track image: a whole track that reads it, else a half track,
        else the first quarter that does."""
        if self.kind == "sectors":
            return [t * 4 for t in range(TRACKS)]
        groups = {}
        for q, i in enumerate(self.tmap):
            if i != 0xFF:
                groups.setdefault(i, []).append(q)
        return sorted(next((q for q in qs if q % 4 == 0), next((q for q in qs if q % 2 == 0), qs[0]))
                      for qs in groups.values())

    def quarters(self, position):
        """Every quarter track that reads the same track image as this one."""
        if self.kind == "sectors" or self.tmap[position] == 0xFF:
            return [position]
        return [q for q, i in enumerate(self.tmap) if i == self.tmap[position]]

    def _position(self, track, quarter):
        if not 0 <= quarter <= 3:
            raise DiskError(f"quarter {quarter}: a quarter track is 0, 1, 2 or 3")
        if not 0 <= track < 40:
            raise DiskError(f"track {track}: a 5.25-inch disk has tracks 0 to 39")
        return track * 4 + quarter

    def track_bits(self, track, quarter=0):
        """The bits of track + quarter / 4 as a str of "0" and "1", or None for no data there."""
        if self.kind == "sectors":
            raise DiskError(f"{self.path}: a sector image keeps the sectors' bytes, not the bits around them; "
                            "a WOZ or a .nib has those")
        return self._bits_at(self._position(track, quarter)) or None

    def _bits_at(self, q):
        idx = self.tmap[q]
        if idx == 0xFF:
            return ""
        if idx not in self._bits:
            self._bits[idx] = bits_of(*self._raw[idx])
        return self._bits[idx]

    def _latch(self, q):
        """One turn of quarter track q, latched: (the nibbles, the bit where each starts, the bits
        in a turn). The latch starts LEAD bits before the turn, on the end of the track, so it is in
        step when the turn begins, and goes on LEAD bits after it, so a field that runs over the end
        is whole: those nibbles start before bit 0 and at or after the turn's last bit."""
        idx = self.tmap[q]
        if idx not in self._latched:
            bits = self._bits_at(q)
            if not bits:
                self._latched[idx] = (b"", [], 0)
            else:
                lead = min(len(bits), LEAD)
                nibs, at = latch(bits[-lead:] + bits + bits[:lead])
                self._latched[idx] = (nibs, [p - lead for p in at], len(bits))
        return self._latched[idx]

    def track_nibbles(self, track, quarter=0, revolutions=1):
        """The nibbles of `revolutions` turns of the track, latched from the start of its bits."""
        bits = self.track_bits(track, quarter)
        return None if bits is None else latch(bits * revolutions)[0]

    # -- sectors ---------------------------------------------------------------------------------

    def sectors(self, track, quarter=0, **marks):
        """The sectors of track + quarter / 4, read with the disk's marks or these (see Marks)."""
        m = self.marks.but(**marks) if marks else self.marks
        q = self._position(track, quarter)
        key = (q, m.key())
        if key not in self._tracks:
            self._tracks[key] = self._read_track(q, m)
        return self._tracks[key]

    def _read_track(self, q, m):
        if self.kind == "sectors":
            t = Track(q, m, None if q % 4 == 0 and q // 4 < TRACKS else 0)
            if t.bits is None:
                order = ORDERS16[self.file_order] if self._n == 16 else list(range(13))
                base = (q // 4) * self._n * SECTOR
                for slot, phys in enumerate(order):
                    t.fields.append(Sector(phys, q // 4, self.volume,
                                           self._blob[base + slot * SECTOR:base + (slot + 1) * SECTOR]))
            return t.finish()
        nibs, at, nbits = self._latch(q)
        t = Track(q, m, nbits)
        A, D, AE, DE = m.address, m.data, m.address_epilogue, m.data_epilogue
        need, decode = DATA_NIBBLES[m.sectors], (decode62 if m.sectors == 16 else decode53)
        i = nibs.find(A) if nbits else -1
        while 0 <= i and at[i] < nbits:         # each field that starts in the turn, once
            here, i = i, nibs.find(A, i + 1)
            start = at[here]
            f = nibs[here + len(A):here + len(A) + 8]
            if start < 0 or len(f) < 8:
                continue
            vol, trk, sec, chk = (decode44(f[k], f[k + 1]) for k in (0, 2, 4, 6))
            s = Sector(sec, trk, vol, None, start)
            end = here + len(A) + 8
            s.seen["address_epilogue"] = nibs[end:end + len(AE)]
            if vol ^ trk ^ sec ^ chk:
                s.problems.append("address checksum")
            if nibs[end:end + len(AE)] != AE:
                s.problems.append(f"address epilogue {_hex(nibs[end:end + len(AE)])} (not {_hex(AE)})")
            if sec >= m.sectors:
                s.problems.append(f"sector number {sec} on a {m.sectors}-sector track")
            s.taken = not s.problems or (m.lenient and sec < m.sectors)
            t.fields.append(s)
            j = nibs.find(D, end, end + len(AE) + DATA_GAP)
            if j < 0:
                k = nibs.find(D[:1], end + len(AE), end + len(AE) + DATA_GAP)
                s.seen["data"] = nibs[k:k + len(D)] if k >= 0 else None
                s.problems.append("no data field")
                continue
            s.seen["data"] = D
            raw = nibs[j + len(D):j + len(D) + need + len(DE)]
            if len(raw) < need:
                s.problems.append("data field cut short")
                continue
            s.data, more = decode(raw[:need])
            s.problems += more
            if any(p.startswith("data nibbles outside") for p in more):
                table = READ62 if m.sectors == 16 else READ53
                s.outside = [(k, x) for k, x in enumerate(raw[:need - 1]) if x not in table]
            s.seen["data_epilogue"] = raw[need:]
            if raw[need:] != DE:
                s.problems.append(f"data epilogue {_hex(raw[need:])} (not {_hex(DE)})")
        return t.finish()

    def physical(self, track, sector, quarter=0):
        """The 256 bytes of the sector whose address field says `sector`, or None."""
        return self.sectors(track, quarter).data(sector)

    def order(self, order):
        """The table for an order: its name, a str of hex digits or a list of numbers."""
        n = self.marks.sectors
        if isinstance(order, str) and order in ("dos", "prodos", "physical"):
            if n == 13:
                if order == "prodos":
                    raise DiskError("ProDOS order on a 13-sector disk: DOS 3.2's numbering (dos) is its only one")
                return list(range(13))
            return ORDERS16[order]
        table = [int(c, 16) for c in order] if isinstance(order, str) and all(
            c in "0123456789abcdefABCDEF" for c in order) else order
        if not isinstance(table, (list, tuple)) or sorted(table) != list(range(n)):
            raise DiskError(f"order {order!r}: dos, prodos, physical, or {n} hex digits naming each of the "
                            f"{n} physical sectors once, the one for logical sector 0 first")
        return list(table)

    def logical(self, track, sector, order="dos"):
        """The 256 bytes of a sector numbered in `order`, or None when it was not read."""
        table = self.order(order)
        if not 0 <= sector < len(table):
            raise DiskError(f"sector {sector}: a {len(table)}-sector track has sectors 0 to {len(table) - 1}")
        return self.sectors(track).data(table[sector])

    def tracks(self):
        """35, or more when a WOZ has data on a whole track past 34."""
        return max([TRACKS] + [q // 4 + 1 for q in self.positions() if q % 4 == 0])

    def image(self, order="dos", tracks=None):
        """Every sector in `order`, and [(track, sector, physical sector, why)] for the missing."""
        table = self.order(order)
        out, missing = bytearray(), []
        for t in range(tracks or self.tracks()):
            tr = self.sectors(t)
            for s, phys in enumerate(table):
                data = tr.data(phys)
                if data is None:
                    missing.append((t, s, phys, tr.why(phys)))
                    data = bytes(SECTOR)
                out += data
        return bytes(out), missing

    # -- DOS 3.3 and 3.2 -------------------------------------------------------------------------

    def catalog(self, vtoc=(17, 0)):
        """The DOS catalog's entries; NoCatalog, saying why, when the disk has none."""
        n = self.marks.sectors
        vt, vs = vtoc
        v = self.logical(vt, vs)
        if v is None:
            tr = self.sectors(vt)
            raise NoCatalog(self._no_catalog(f"track {vt} sector {vs}, where DOS keeps its VTOC, could not be read "
                                             f"({tr.why(self.order('dos')[vs])}; {len(tr.found)} of {n} sectors "
                                             f"read on track {vt})"))
        ct, cs = v[1], v[2]
        if not any(v):
            raise NoCatalog(self._no_catalog(f"track {vt} sector {vs}, where DOS keeps its VTOC, holds only zeros"))
        if not (0 < ct < self.tracks() and cs < n) or v[0x35] not in (13, 16) or v[0x36:0x38] != b"\x00\x01":
            raise NoCatalog(self._no_catalog(f"track {vt} sector {vs} is not a DOS VTOC (read as one, it puts the "
                                             f"catalog at track {ct} sector {cs}, and says {v[0x35]} sectors a "
                                             f"track of {v[0x36] | v[0x37] << 8:,} bytes)"))
        self.vtoc = {"release": v[3], "volume": v[6], "pairs": v[0x27], "tracks": v[0x34],
                     "sectors": v[0x35], "catalog": (ct, cs), "at": (vt, vs)}
        self.catalog_problems = []
        out, seen = [], set()
        while ct:
            if (ct, cs) in seen or not (ct < self.tracks() and cs < n):
                self.catalog_problems.append(f"the catalog chain goes to track {ct} sector {cs} "
                                             + ("again" if (ct, cs) in seen else "(off the disk)"))
                break
            seen.add((ct, cs))
            sec = self.logical(ct, cs)
            if sec is None:
                self.catalog_problems.append(f"the catalog sector at track {ct} sector {cs} could not be read "
                                             f"({self.sectors(ct).why(self.order('dos')[cs])})")
                break
            for k in range(7):
                e = sec[0x0B + 35 * k:0x0B + 35 * (k + 1)]
                if e[0] == 0:
                    continue
                deleted = e[0] == 0xFF
                raw_name = e[3:32] if deleted else e[3:33]
                out.append({"name": dos_name(raw_name), "type": file_type(e[2]), "code": e[2],
                            "locked": bool(e[2] & 0x80), "deleted": deleted, "sectors": e[0x21] | e[0x22] << 8,
                            "list": (e[0x20] if deleted else e[0], e[1]), "entry": (ct, cs, k),
                            "raw_name": bytes(raw_name)})
            ct, cs = sec[1], sec[2]
        return out

    def _no_catalog(self, why):
        name = self.prodos_volume()
        return f"no DOS catalog: {why}" + (
            f". It holds a ProDOS volume, /{name}: this reads DOS catalogs only; its blocks are its sectors in "
            "ProDOS order (sectors --order prodos)" if name else "")

    def prodos_volume(self):
        """The volume's name when block 2 (track 0, ProDOS sectors 4 and 5) starts a ProDOS
        volume directory, else None."""
        if self.marks.sectors != 16:
            return None
        b = self.logical(0, 4, "prodos")
        if b is None or b[0:2] != b"\0\0" or b[4] >> 4 != 0xF or not 0 < b[4] & 15:
            return None
        name = b[5:5 + (b[4] & 15)]
        if not all(c in b"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789." for c in name) or not name[:1].isalpha():
            return None
        return name.decode("ascii")

    def find(self, name, vtoc=(17, 0)):
        """The catalog entry named `name` (as catalog() gives it, or the same ignoring case)."""
        cat = self.catalog(vtoc)
        live = [e for e in cat if not e["deleted"]]
        for pool in (live, cat):
            for same in (lambda e: e["name"] == name, lambda e: e["name"].upper() == name.upper()):
                hit = [e for e in pool if same(e)]
                if len(hit) == 1:
                    return hit[0]
                if len(hit) > 1:
                    raise DiskError(f"{self.path}: {len(hit)} files are named {name!r}")
        raise DiskError(f"{self.path}: no file named {name!r} in the catalog (it has "
                        f"{', '.join(repr(e['name']) for e in live) or 'none'})")

    def read_file(self, name, vtoc=(17, 0)):
        """A DOS file's bytes and what its header says (see the module's docstring). name is a
        name or an entry from catalog()."""
        e = name if isinstance(name, dict) else self.find(name, vtoc)
        n = self.marks.sectors
        pairs, problems, seen, lists = [], [], set(), []
        t, s = e["list"]
        while t:
            if (t, s) in seen or not (t < self.tracks() and s < n):
                problems.append(f"the track/sector lists go to track {t} sector {s} "
                                + ("again" if (t, s) in seen else "(off the disk)"))
                break
            seen.add((t, s))
            lst = self.logical(t, s)
            if lst is None:
                problems.append(f"the track/sector list at track {t} sector {s} could not be read")
                break
            lists.append((t, s))
            pairs += [(lst[0x0C + 2 * k], lst[0x0D + 2 * k]) for k in range(122)]
            t, s = lst[1], lst[2]
        while pairs and pairs[-1][0] == 0:
            pairs.pop()
        raw, missing, holes = bytearray(), [], []
        for k, (t, s) in enumerate(pairs):
            data = None
            if t == 0:
                holes.append(k)
            elif t < self.tracks() and s < n:
                data = self.logical(t, s)
                if data is None:
                    missing.append((t, s))
            else:
                problems.append(f"sector {k} of the file is listed at track {t} sector {s}, off the disk")
            raw += data or bytes(SECTOR)
        out = {"name": e["name"], "type": e["type"], "code": e["code"], "locked": e["locked"],
               "deleted": e["deleted"], "lists": lists, "sectors": pairs, "missing": missing, "holes": holes,
               "problems": problems, "raw": bytes(raw), "address": None, "length": None}
        kind = e["code"] & 0x7F
        if kind == 0x04:                                  # B: where it loads, its length
            out["data"] = b""
            if len(raw) < 4:
                problems.append("a binary file too short to hold its address and length")
            else:
                out["address"], out["length"] = raw[0] | raw[1] << 8, raw[2] | raw[3] << 8
                out["data"] = bytes(raw[4:4 + out["length"]])
        elif kind in (0x01, 0x02):                        # I, A: its length
            out["data"] = b""
            if len(raw) < 2:
                problems.append("a BASIC file too short to hold its length")
            else:
                out["length"] = raw[0] | raw[1] << 8
                out["data"] = bytes(raw[2:2 + out["length"]])
        elif kind == 0x00:                                # T: up to the first zero
            z = raw.find(0)
            out["data"] = bytes(raw if z < 0 else raw[:z])
        else:
            out["data"] = bytes(raw)
        if out["length"] is not None and len(out["data"]) < out["length"]:
            problems.append(f"its header says {out['length']:,} bytes; its sectors hold {len(out['data']):,}")
        return out

    # -- a summary ---------------------------------------------------------------------------------

    def info(self):
        """What the image is and what each track holds: the dict cmd_info prints."""
        out = {"path": self.path, "size": self.size, "format": self.description, "kind": self.kind,
               "marks": self.marks.describe(), "woz": self.woz, "meta": self.meta, "2img": self.header,
               "notes": [], "tracks": []}
        if self.kind != "sectors":
            out["address_fields"] = {16: 0, 13: 0}
            out["flux"] = sorted(self.flux)
        seen = {k: collections.Counter() for k in ("address_epilogue", "data", "data_epilogue")}
        for q in self.positions():
            tr = self.sectors(q // 4, q % 4)
            row = {"position": q / 4, "quarters": [x / 4 for x in self.quarters(q)], "bits": tr.bits,
                   "read": sorted(n for n in tr.found if tr.data(n) is not None),
                   "not_taken": tr.not_taken(), "rejected": tr.rejected, "doubtful": tr.doubtful,
                   "volumes": sorted(tr.volumes), "address_tracks": sorted(tr.tracks),
                   "order": [s.number for s in tr.fields if s.taken]}
            row["absent"] = [n for n in tr.missing if n not in row["not_taken"] and n not in tr.rejected]
            if self.kind != "sectors":
                marks = self._marks_read(q)
                row["other_fields"] = marks[13 if self.marks.sectors == 16 else 16]
                for n in marks:
                    out["address_fields"][n] += marks[n]
            for s in tr.fields:
                for k, v in s.seen.items():
                    if v:
                        seen[k][bytes(v)] += 1
            out["tracks"].append(row)
        for k, mark, option in (("address_epilogue", self.marks.address_epilogue, "--address-epilogue"),
                                ("data", self.marks.data, "--data"),
                                ("data_epilogue", self.marks.data_epilogue, "--data-epilogue")):
            if seen[k]:
                common, count = seen[k].most_common(1)[0]
                if common != mark and count * 2 > sum(seen[k].values()):
                    what = {"address_epilogue": "address fields end", "data": "data fields start",
                            "data_epilogue": "data fields end"}[k]
                    out["notes"].append(f"most {what} {_hex(common)}, not {_hex(mark)} "
                                        f"({count} of {sum(seen[k].values())}): try {option} {common.hex().upper()}")
        try:
            cat = self.catalog()
            out["catalog"] = {"files": len([e for e in cat if not e["deleted"]]), "vtoc": self.vtoc,
                              "problems": self.catalog_problems}
        except NoCatalog as e:
            out["catalog"] = {"none": str(e)}
        return out


def dos_name(raw):
    """A catalog name as text: high-bit ASCII, a control character as ^ and its letter, the
    spaces after it dropped."""
    out = []
    for b in raw:
        c = b & 0x7F
        out.append("^" + chr(c + 64) if c < 32 else "^?" if c == 127 else chr(c))
    return "".join(out).rstrip(" ")


def file_type(code):
    """The catalog's letter for a type byte: T for none of its low seven bits, else the letter
    of the lowest bit set."""
    c = code & 0x7F
    return TYPE_LETTERS[(c & -c).bit_length() - 1] if c else "T"


def open(path, sectors=None, address=None, data=None, address_epilogue=None, data_epilogue=None,
         lenient=False, crc=True, file_order=None):
    """The image at path, its sectors read with these marks (see the module's docstring)."""
    return Disk(path, crc=crc, file_order=file_order, sectors=sectors, address=address, data=data,
                address_epilogue=address_epilogue, data_epilogue=data_epilogue, lenient=lenient)


# -- the command line -------------------------------------------------------------------------------


def _ranges(nums, fmt="{:X}"):
    """[0, 1, 2, 5] -> "0-2, 5"."""
    out, run = [], []
    for n in sorted(set(nums)) + [None]:
        if run and n is not None and n == run[-1] + 1:
            run.append(n)
            continue
        if run:
            out.append(fmt.format(run[0]) + ("" if len(run) == 1 else "-" + fmt.format(run[-1])))
        run = [n]
    return ", ".join(out)


def _grouped(reasons):
    """{number: why} -> "0-3, 5: why; 4: another"."""
    by = {}
    for n, why in reasons.items():
        by.setdefault(why, []).append(n)
    return "; ".join(f"{_ranges(ns)}: {why}" for why, ns in sorted(by.items(), key=lambda x: min(x[1])))


def _pos(p):
    return f"{p:.2f}"


def _open_args(a):
    return open(a.image, sectors=13 if a.s13 else 16 if a.s16 else None, address=a.address, data=a.data,
                address_epilogue=a.address_epilogue, data_epilogue=a.data_epilogue, lenient=a.lenient,
                crc=not a.no_crc, file_order=a.file_order)


def cmd_info(a):
    d = _open_args(a)
    i = d.info()
    print(f"{d.path}: {i['format']}, {d.size:,} bytes")
    w = i["woz"]
    if w:
        bits = [f"INFO version {w['version']}", f"creator {w['creator']!r}"]
        bits += [k for k, on in (("write protected", w["write_protected"]), ("cross-track synchronized",
                                 w["synchronized"]), ("fake bits cleaned", w["cleaned"])) if on]
        if "boot_sector_format" in w:
            bits += [f"boot sector {w['boot_sector_format']}",
                     f"bit timing {w['optimal_bit_timing']} ({w['optimal_bit_timing'] / 8:g} us)",
                     "hardware " + (", ".join(w["compatible_hardware"]) or "not given"),
                     f"RAM {w['required_ram']}K" if w["required_ram"] else "RAM not given"]
        print("  " + "; ".join(bits))
    if i["meta"]:
        print("  META: " + "; ".join(f"{k} {v}" for k, v in i["meta"].items() if v))
    h = i["2img"]
    if h:
        print(f"  2IMG: creator {h['creator']!r}, {h['format']}, {h['data_length']:,} bytes at {h['data_offset']}"
              + (f", volume {d.volume}" if d.volume is not None else "") + (", locked" if h["locked"] else "")
              + (f", comment {h['comment']!r}" if h.get("comment") else ""))
    n = d.marks.sectors
    if d.kind != "sectors":
        pos = [q / 4 for q in d.positions()]
        whole, other = [int(p) for p in pos if p == int(p)], [p for p in pos if p != int(p)]
        print(f"  {len(pos)} track images" + (f": whole tracks {_ranges(whole, '{}')}" if whole else "")
              + (f"; between whole tracks {', '.join(_pos(p) for p in other)}" if other else ""))
        if i.get("flux"):
            print(f"  kept as flux timings, not read here: {', '.join(_pos(q / 4) for q in i['flux'])}")
        c = i["address_fields"]
        print(f"  address fields in one turn of each: {c[16]} 16-sector (D5 AA 96), {c[13]} 13-sector (D5 AA B5)")
    print(f"  read as {i['marks']}")
    vols = set(v for row in i["tracks"] for v in row["volumes"])
    one_volume = len(vols) == 1 and d.kind != "sectors"
    if one_volume:
        print(f"  every address field taken says volume {min(vols)}")
    reach = lambda row: tuple(round((x - row["position"]) * 4) for x in row["quarters"])
    usual = collections.Counter(reach(row) for row in i["tracks"]).most_common(1)[0][0] if i["tracks"] else ()
    if d.kind == "woz" and usual:
        lo, hi = usual[0] / 4, usual[-1] / 4
        print("  most track images are read " + ("at their own track only" if lo == hi == 0 else
                                                  f"from {lo:+.2f} to {hi:+.2f} of their track"))
    print("  track" + ("     bits" if d.kind != "sectors" else "") + "  sectors")
    for row in i["tracks"]:
        line = f"  {_pos(row['position']):>5}" + (f"  {row['bits']:>7,}" if d.kind != "sectors" else "")
        read = row["read"]
        line += f"  {len(read):>2} of {n}" + (f" ({_ranges(read)})" if read and len(read) < n else "")
        if row["volumes"] and d.kind != "sectors" and not one_volume:
            line += f", volume {', '.join(map(str, row['volumes']))}"
        if [t for t in row["address_tracks"] if t != int(row["position"])]:
            line += f", address fields say track {', '.join(map(str, row['address_tracks']))}"
        qs = row["quarters"]
        p = row["position"]
        if d.kind == "woz" and reach(row) != tuple(o for o in usual if 0 <= p * 4 + o < 160):
            line += f", read at {_pos(qs[0])} only" if len(qs) == 1 else f", read from {_pos(qs[0])} to {_pos(qs[-1])}"
        for label, reasons in (("not taken", row["not_taken"]), ("rejected", row["rejected"]),
                               ("taken despite", row["doubtful"])):
            if reasons:
                line += f"; {label} {_grouped(reasons)}"
        if row["absent"] and len(row["absent"]) < n:
            line += f"; no address field for {_ranges(row['absent'])}"
        if not read and len(row["absent"]) == n and d.kind != "sectors":
            line += f"; no {_hex(d.marks.address)} address fields"
        if row.get("other_fields"):
            line += f"; also {row['other_fields']} {'13' if n == 16 else '16'}-sector address fields"
        print(line)
        if a.verbose and d.kind != "sectors":
            for s in d.sectors(int(p), int(round(p * 4)) % 4).fields:
                print(f"         sector {s.number:X} at bit {s.bit:,}: volume {s.volume}, track {s.track}"
                      + ("" if s.taken else ", not taken") + (f": {s.explain()}" if s.problems else ""))
    for note in i["notes"]:
        print(f"  {note}")
    c = i["catalog"]
    if "none" in c:
        print(f"  {c['none']}")
    else:
        v = c["vtoc"]
        print(f"  DOS catalog: VTOC at track {v['at'][0]} sector {v['at'][1]} (release {v['release']}, volume "
              f"{v['volume']}, {v['tracks']} tracks of {v['sectors']} sectors), {c['files']} files (disk.py catalog)")
        for p in c["problems"]:
            print(f"  catalog: {p}")


def cmd_catalog(a):
    d = _open_args(a)
    cat = d.catalog(a.vtoc)
    v = d.vtoc
    print(f"{d.path}: DOS catalog, VTOC at track {v['at'][0]} sector {v['at'][1]}: release {v['release']}, "
          f"volume {v['volume']}, {v['tracks']} tracks of {v['sectors']} sectors")
    for e in cat:
        extra = ""
        if not e["deleted"] and e["code"] & 0x7F == 0x04:
            f = d.read_file(e)
            if f["address"] is not None:
                extra = f"  loads at ${f['address']:04X}, ${f['length']:04X} bytes"
            trouble = f["problems"] + ([f"{len(f['missing'])} sectors unread"] if f["missing"] else [])
            extra += f"  ({'; '.join(trouble)})" if trouble else ""
        print(f" {'*' if e['locked'] else ' '}{e['type']} {e['sectors']:03d} {e['name']:<30}  list at "
              f"{e['list'][0]},{e['list'][1]}" + ("  deleted" if e["deleted"] else "") + extra)
    for p in d.catalog_problems:
        print(f"  catalog: {p}")


def cmd_extract(a):
    d = _open_args(a)
    f = d.read_file(d.find(a.name, a.vtoc))
    body = f["raw"] if a.raw else f["data"]
    with io.open(a.output, "wb") as h:
        h.write(body)
    line = f"{f['name']}: {TYPE_NAMES.get(f['code'] & 0x7F, 'type $%02X' % (f['code'] & 0x7F))}, " \
           f"{len(f['sectors'])} data sectors"
    if f["address"] is not None:
        line += f", loads at ${f['address']:04X}, length ${f['length']:04X} ({f['length']:,} bytes)"
    elif f["length"] is not None:
        line += f", length ${f['length']:04X} ({f['length']:,} bytes)"
    print(line + f"; wrote {len(body):,} bytes" + (" (all of its sectors)" if a.raw else "") + f" to {a.output}")
    for p in f["problems"]:
        print(f"  {p}")
    if f["missing"]:
        print("  unread, written as zeros: " + ", ".join(f"track {t} sector {s}" for t, s in f["missing"]))
    if f["holes"]:
        print(f"  holes (never written), as zeros: sectors {', '.join(map(str, f['holes']))} of the file")
    return 1 if f["missing"] or f["problems"] else 0


def cmd_sectors(a):
    d = _open_args(a)
    img, missing = d.image(a.order)
    with io.open(a.output, "wb") as h:
        h.write(img)
    n = d.marks.sectors
    total = len(img) // SECTOR
    name = {"dos": "DOS 3.3" if n == 16 else "DOS 3.2", "prodos": "ProDOS", "physical": "physical"}.get(a.order)
    print(f"wrote {a.output}: {total // n} tracks x {n} sectors in " + (f"{name} order" if name else
          f"the order {a.order.upper()}") + f", {len(img):,} bytes; {total - len(missing)} of {total} sectors read")
    by = {}
    for t, s, p, why in missing:
        by.setdefault(t, {})[s] = why
    for t, rows in sorted(by.items()):
        whys = set(rows.values())
        print(f"  track {t}: " + (f"none of its {n} sectors ({whys.pop()})" if len(rows) == n and len(whys) == 1
                                  else _grouped(rows)))
    if missing:
        print(f"  the {len(missing)} missing sectors are zeros in the image")
    return 1 if missing else 0


def _dump(data):
    for k in range(0, len(data), 16):
        row = data[k:k + 16]
        text = "".join(chr(b & 0x7F) if 32 <= (b & 0x7F) < 127 else "." for b in row)
        print(f"  {k:02X}: {_hex(row):<47}  {text}")


def cmd_read(a):
    d = _open_args(a)
    order = "physical" if a.physical else a.order
    table = d.order(order)
    t, s = a.track, a.sector
    if not 0 <= s < len(table):
        raise DiskError(f"sector {s}: a {len(table)}-sector track has sectors 0 to {len(table) - 1}")
    bad = 0
    for _ in range(a.count):
        tr = d.sectors(t, a.quarter)
        phys = table[s]
        sec = tr.found.get(phys)
        label = f"track {_pos(t + a.quarter / 4) if a.quarter else t} sector {s:X}" + (
            f" (physical {phys:X})" if phys != s else "")
        if sec is not None and sec.volume is not None:
            label += f", volume {sec.volume}" + (f", address field says track {sec.track}" if sec.track != t else "")
        data = tr.data(phys)
        if data is None:
            why = sec.explain() if phys in tr.rejected else tr.why(phys)
            hint = "; --lenient shows it anyway" if sec is not None and sec.data is not None else ""
            print(f"{label}: {why}{hint}")
            bad += 1
        else:
            print(label + (f" (taken despite: {sec.explain()})" if phys in tr.doubtful else ""))
            _dump(data)
        s += 1
        if s == len(table):
            s, t = 0, t + 1
            if t >= d.tracks():
                break
    return 1 if bad else 0


def _segments(d, q, nibs, at, start, stop):
    """One turn of nibbles as (kind, first nibble, count, text): sync runs, the fields the reader
    found, and the rest."""
    tr = d.sectors(q // 4, q % 4)
    m, nbits = d.marks, tr.bits
    fields = {s.bit: s for s in tr.fields}
    is_field = lambda k: at[k] % nbits in fields and nibs[k:k + len(m.address)] == m.address
    k = next((x for x, p in enumerate(at) if p >= start), len(at))
    while k < len(at) and at[k] < stop:
        if is_field(k):
            s = fields[at[k] % nbits]
            body = k + len(m.address) + 8
            j = nibs.find(m.data, body, body + len(m.address_epilogue) + DATA_GAP)
            n = body + len(m.address_epilogue) - k if j < 0 else min(j, body + len(m.address_epilogue)) - k
            yield "field", k, n, (f"address field: volume {s.volume}, track {s.track}, sector {s.number:X}"
                                  + ("" if s.taken else " (not taken)")
                                  + (f": {s.explain()}" if s.problems else ""))
            if j >= 0:
                if j > k + n:
                    yield from _segments_plain(nibs, at, k + n, j)
                dn = len(m.data) + DATA_NIBBLES[m.sectors] + len(m.data_epilogue)
                yield "field", j, dn, f"data field of sector {s.number:X}"
                k = j + dn
            else:
                k += n
            continue
        e = k + 1
        while e < len(at) and at[e] < stop and not is_field(e):
            e += 1
        yield from _segments_plain(nibs, at, k, e)
        k = e


def _segments_plain(nibs, at, k, e):
    """Nibbles k to e as sync runs and the rest."""
    while k < e:
        x = k
        if nibs[k] == 0xFF:
            while x < e and nibs[x] == 0xFF:
                x += 1
            widths = sorted(set(at[y + 1] - at[y] for y in range(k, min(x, len(at) - 1))))
            yield "sync", k, x - k, f"FF x {x - k}" + (f" ({'/'.join(map(str, widths))} bits each)" if widths else "")
        else:
            while x < e and nibs[x] != 0xFF:
                x += 1
            yield "other", k, x - k, None
        k = x


def cmd_nibbles(a):
    d = _open_args(a)
    q = d._position(a.track, a.quarter)
    if d.track_bits(a.track, a.quarter) is None:
        print(f"{d.path}: track {_pos(q / 4)} holds no data" + (" (it is kept as flux timings)" if q in d.flux else ""))
        return 1
    nibs, at, nbits = d._latch(q)
    same = [x / 4 for x in d.quarters(q) if x != q]
    turn = [k for k, p in enumerate(at) if 0 <= p < nbits]
    print(f"{d.path}: track {_pos(q / 4)}" + (f" (the same track image as {', '.join(map(_pos, same))})" if same else "")
          + f": {nbits:,} bits, {len(turn):,} nibbles in a turn")
    if a.raw:
        row = bytes(nibs[k] for k in turn)
        for k in range(0, len(row), 32):
            print(f"  {k:04X}  {_hex(row[k:k + 32])}")
        return 0
    print("  one turn, from the start of the bits, the latch in step from the turn before; "
          "offsets count nibbles")
    first = turn[0] if turn else 0
    for kind, k, n, text in _segments(d, q, nibs, at, 0, nbits):
        if kind == "sync":
            print(f"  {k - first:04X}  {text}")
            continue
        if text:
            print(f"  {k - first:04X}  {text}")
        for r in range(0, n, 32):
            print(("        " if text else f"  {k - first + r:04X}  ") + _hex(nibs[k + r:k + min(n, r + 32)]))
    return 0


def _vtoc(text):
    try:
        t, s = (int(x, 0) for x in text.split(","))
    except ValueError:
        raise argparse.ArgumentTypeError(f"{text!r}: track,sector, such as 17,0")
    return t, s


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    common = argparse.ArgumentParser(add_help=False)
    g = common.add_argument_group("how sectors are read")
    g.add_argument("--13", dest="s13", action="store_true", help="13-sector (5-and-3) fields")
    g.add_argument("--16", dest="s16", action="store_true", help="16-sector (6-and-2) fields")
    g.add_argument("--address", metavar="HEX", help="the address field's prologue (D5AA96; D5AAB5 for 13)")
    g.add_argument("--data", metavar="HEX", help="the data field's prologue (D5AAAD)")
    g.add_argument("--address-epilogue", metavar="HEX", help="the address field's epilogue (DEAA)")
    g.add_argument("--data-epilogue", metavar="HEX", help="the data field's epilogue (DEAA)")
    g.add_argument("--lenient", action="store_true", help="take a sector with a bad checksum or no epilogue")
    g.add_argument("--file-order", choices=("dos", "prodos"), help="a 16-sector image's order (.po: prodos)")
    g.add_argument("--no-crc", action="store_true", help="read a WOZ whose CRC does not match")
    order = dict(default="dos", help="dos, prodos, physical, or hex digits: the physical sector of each logical one")
    p = argparse.ArgumentParser(prog="disk.py", description="Read an Apple II disk image; disk.py -h is the manual.")
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("info", parents=[common], help="the image and each track")
    s.add_argument("image")
    s.add_argument("-v", "--verbose", action="store_true", help="every address field: where, and what it says")
    s = sub.add_parser("catalog", parents=[common], help="the DOS catalog")
    s.add_argument("image")
    s.add_argument("--vtoc", type=_vtoc, default=(17, 0), metavar="T,S", help="where the VTOC is (17,0)")
    s = sub.add_parser("extract", parents=[common], help="one DOS file")
    s.add_argument("image")
    s.add_argument("name", help="the file's name as the catalog shows it")
    s.add_argument("-o", "--output", required=True, help="the file to write")
    s.add_argument("--raw", action="store_true", help="all of its sectors, the header too")
    s.add_argument("--vtoc", type=_vtoc, default=(17, 0), metavar="T,S", help="where the VTOC is (17,0)")
    s = sub.add_parser("sectors", parents=[common], help="every sector as one flat image")
    s.add_argument("image")
    s.add_argument("-o", "--output", required=True, help="the image to write")
    s.add_argument("--order", **order)
    s = sub.add_parser("read", parents=[common], help="a hex dump of sectors")
    s.add_argument("image")
    s.add_argument("track", type=lambda x: int(x, 0))
    s.add_argument("sector", type=lambda x: int(x, 0))
    s.add_argument("count", type=lambda x: int(x, 0), nargs="?", default=1)
    s.add_argument("--physical", action="store_true", help="the sector number is the address field's")
    s.add_argument("--order", **order)
    s.add_argument("--quarter", type=int, default=0, help="1, 2 or 3: track + 0.25, 0.5, 0.75")
    s = sub.add_parser("nibbles", parents=[common], help="one turn of a track's nibbles, the fields marked")
    s.add_argument("image")
    s.add_argument("track", type=lambda x: int(x, 0))
    s.add_argument("--quarter", type=int, default=0, help="1, 2 or 3: track + 0.25, 0.5, 0.75")
    s.add_argument("--raw", action="store_true", help="rows of hex, nothing marked")
    a = p.parse_args(argv)
    if a.s13 and a.s16:
        p.error("--13 or --16, not both")
    try:
        return {"info": cmd_info, "catalog": cmd_catalog, "extract": cmd_extract, "sectors": cmd_sectors,
                "read": cmd_read, "nibbles": cmd_nibbles}[a.cmd](a) or 0
    except BrokenPipeError:                  # the output went to a command that stopped reading, such as head
        os.dup2(os.open(os.devnull, os.O_WRONLY), sys.stdout.fileno())
        return 1
    except DiskError as e:
        msg = str(e)
        print(msg if msg.startswith(a.image) else f"{a.image}: {msg}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
