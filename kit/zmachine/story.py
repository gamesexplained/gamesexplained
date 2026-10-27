#!/usr/bin/env python3
"""A Z-machine story file, in every version: its header and memory map, its text, objects,
properties and dictionary, and the encoding of a typed word. An Infocom game's story is
the same file on every machine the game was sold for; the machine's interpreter is what
differs, and the platform's own tools read that.

  s = Story.load(path)              or Story(bytes)
  s.version, s.header               the header's fields by name (HEADER)
  s.text(mem, a) -> (string, end)   a string at a byte address; s.string(a) for the story's
  s.unpack(packed, kind)            a packed address as a byte address
  s.objects() / s.object(n)         Obj(n, attrs, parent, sibling, child, props, name)
  s.properties(n)                   [(number, address of data, data)]
  s.dictionary()                    Dictionary(separators, entry_length, entries)
  s.encode(word) -> bytes           a typed word as the dictionary stores it
  s.lookup(word)                    the dictionary entry's address, or 0
  s.instruction(a)                  zcode.decode at a, with the story's text decoder

The rules are the Z-Machine Standards Document 1.1's; kit/skills/cpu/zmachine gives each
with its section and the versions it holds for. Version 1 and 2 encode a typed word with
shift locks where Infocom's compiler did, which an interpreter that always shifts once gets
wrong (kit/skills/cpu/zmachine, "Words with two characters of another alphabet").

Run as a script: story.py <story> [header|objects|dictionary|abbreviations|object N|word W]
"""
import os, sys
from dataclasses import dataclass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import zcode  # noqa: E402

# The header's fields: (name, offset, size in bytes, first version), Standard section 11
HEADER = (("version", 0x00, 1, 1), ("flags1", 0x01, 1, 1), ("release", 0x02, 2, 1),
          ("high", 0x04, 2, 1), ("pc", 0x06, 2, 1), ("dictionary", 0x08, 2, 1),
          ("objects", 0x0A, 2, 1), ("globals", 0x0C, 2, 1), ("static", 0x0E, 2, 1),
          ("flags2", 0x10, 2, 1), ("abbreviations", 0x18, 2, 2), ("length", 0x1A, 2, 3),
          ("checksum", 0x1C, 2, 3), ("routines_offset", 0x28, 2, 6), ("strings_offset", 0x2A, 2, 6),
          ("terminators", 0x2E, 2, 5), ("standard", 0x32, 2, 1), ("alphabet", 0x34, 2, 5),
          ("extension", 0x36, 2, 5))

A0 = "abcdefghijklmnopqrstuvwxyz"
A1 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
A2_V1 = " 0123456789.,!?_#'\"/\\<-:()"      # Z-character 6 is the escape, so its place is a blank
A2 = " \n0123456789.,!?_#'\"/\\-:()"      # from version 2: 6 the escape, 7 a new line

# ZSCII 155-223 by default (Standard 3.8.5.3), where no Unicode table replaces them
EXTRA = "äöüÄÖÜß»«ëïÿËÏáéíóúýÁÉÍÓÚÝàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛåÅøØãñõÃÑÕæÆçÇþðÞÐ£œŒ¡¿"


def zscii(c):
    """The character a ZSCII code prints, as text."""
    if c == 13:
        return "\n"
    if 32 <= c <= 126:
        return chr(c)
    if 155 <= c < 155 + len(EXTRA):
        return EXTRA[c - 155]
    return f"[{c}]"


@dataclass
class Obj:
    n: int
    attrs: set
    parent: int
    sibling: int
    child: int
    props: int
    name: str


@dataclass
class Dictionary:
    separators: bytes
    entry_length: int
    entries: list          # [(address, word as text, its bytes)]
    sorted: bool


class Story:
    def __init__(self, data):
        self.mem = bytes(data)
        self.version = self.mem[0]
        if self.version not in range(1, 9):
            raise ValueError(f"not a story file: version byte {self.version}")
        self.header = {}
        for name, off, size, first in HEADER:
            if self.version >= first:
                self.header[name] = self.mem[off] if size == 1 else self.word(off)
        self.header["serial"] = self.mem[0x12:0x18].decode("latin-1")
        self.offsets = (self.header.get("routines_offset", 0), self.header.get("strings_offset", 0))
        self.alphabets = self._alphabets()

    @classmethod
    def load(cls, path):
        with open(path, "rb") as f:
            return cls(f.read())

    def word(self, a, mem=None):
        mem = self.mem if mem is None else mem
        return (mem[a] << 8) | mem[a + 1]

    # --- the memory map ----------------------------------------------------
    def length(self):
        """The story's length: the header's, which counts in units of 2, 4 or 8 bytes, or the
        file's when the header has none (versions 1 and 2, and some later files)."""
        n = self.header.get("length", 0)
        scale = 2 if self.version <= 3 else 4 if self.version <= 5 else 8
        return n * scale if n else len(self.mem)

    def regions(self):
        """[(name, first, last)]: dynamic memory, static memory and high memory (Standard 1.1)."""
        end = self.length()
        return [("dynamic", 0, self.header["static"] - 1),
                ("static", self.header["static"], min(end, 0x10000) - 1),
                ("high", self.header["high"], end - 1)]

    def checksum(self):
        """The sum of the bytes from $40 to the story's end, as verify computes it."""
        return sum(self.mem[0x40:self.length()]) & 0xFFFF

    def unpack(self, packed, kind="routine"):
        return zcode.unpack(packed, self.version, kind, self.offsets)

    def start(self):
        """The first instruction's address: the header's, or in version 6 the main routine's."""
        if self.version == 6:
            return zcode.routine_start(self.mem, self.unpack(self.header["pc"]), 6)[1]
        return self.header["pc"]

    # --- text --------------------------------------------------------------
    def _alphabets(self):
        if self.version >= 5 and self.header.get("alphabet"):
            t = self.header["alphabet"]
            chars = "".join(zscii(c) for c in self.mem[t:t + 78])
            a2 = list(chars[52:78])
            a2[0], a2[1] = " ", "\n"       # 6 is still the escape and 7 a new line (3.5.5.1)
            return [chars[0:26], chars[26:52], "".join(a2)]
        return [A0, A1, A2_V1 if self.version == 1 else A2]

    def zchars(self, a, mem=None):
        """The 5-bit characters of the string at a, and the address after it."""
        mem = self.mem if mem is None else mem
        out = []
        while True:
            w = self.word(a, mem); a += 2
            out += [(w >> 10) & 31, (w >> 5) & 31, w & 31]
            if w & 0x8000:
                return out, a

    def text(self, mem, a):
        """The string at a and the address after it (zcode.decode's text hook)."""
        zc, end = self.zchars(a, mem)
        return self.decode(zc), end

    def string(self, a):
        return self.text(self.mem, a)[0]

    def abbreviation(self, i):
        """Abbreviation i: 0-31 in version 2, 0-95 from version 3."""
        return self.decode(self.zchars(2 * self.word(self.header["abbreviations"] + 2 * i))[0], True)

    def decode(self, zc, in_abbreviation=False):
        """Z-characters as text (Standard 3.2-3.5). Versions 1 and 2 shift relative to a
        locked alphabet; from version 3 a shift is always from A0."""
        v, A = self.version, self.alphabets
        out, lock, shift, i = [], 0, None, 0
        while i < len(zc):
            c = zc[i]; i += 1
            cur = lock if shift is None else shift
            shift = None
            if c == 0:
                out.append(" ")
            elif c == 1 and v == 1:
                out.append("\n")
            elif (c == 1 and v == 2) or (c in (1, 2, 3) and v >= 3):
                if i < len(zc) and not in_abbreviation:
                    out.append(self.abbreviation(32 * (c - 1) + zc[i]))
                i += 1
            elif c in (2, 3):              # versions 1 and 2: shift once, up or down
                shift = (lock + c - 1) % 3
            elif c in (4, 5) and v <= 2:   # shift lock
                lock = (lock + c - 3) % 3
            elif c in (4, 5):
                shift = c - 3
            elif cur == 2 and c == 6:      # ten-bit ZSCII
                if i + 1 < len(zc):
                    out.append(zscii((zc[i] << 5) | zc[i + 1]))
                i += 2
            elif cur == 2 and c == 7 and v >= 2:
                out.append("\n")
            else:
                out.append(A[cur][c - 6])
        return "".join(out)

    def instruction(self, a):
        return zcode.decode(self.mem, a, self.version, self.text, self.offsets)

    # --- objects -----------------------------------------------------------
    def _object_format(self):
        """(entry size, attribute bytes, defaults in words, small links)."""
        return (9, 4, 31, True) if self.version <= 3 else (14, 6, 63, False)

    def object_count(self):
        """How many objects there are: the table does not say, so count entries up to the
        lowest property table, which the compilers put straight after them."""
        size, _, defaults, _ = self._object_format()
        base = self.header["objects"] + 2 * defaults
        n, lowest = 0, None
        while lowest is None or base + size * (n + 1) <= lowest:
            o = self.object(n + 1)
            if o.props < base or o.props >= len(self.mem):
                break
            lowest = o.props if lowest is None else min(lowest, o.props)
            n += 1
        return n

    def object(self, n):
        size, abytes, defaults, small = self._object_format()
        a = self.header["objects"] + 2 * defaults + size * (n - 1)
        bits = int.from_bytes(self.mem[a:a + abytes], "big")
        attrs = {i for i in range(8 * abytes) if bits & (1 << (8 * abytes - 1 - i))}
        a += abytes
        if small:
            parent, sibling, child = self.mem[a], self.mem[a + 1], self.mem[a + 2]; a += 3
        else:
            parent, sibling, child = self.word(a), self.word(a + 2), self.word(a + 4); a += 6
        props = self.word(a)
        name = self.decode(self.zchars(props + 1)[0]) if self.mem[props] else ""
        return Obj(n, attrs, parent, sibling, child, props, name)

    def objects(self):
        return [self.object(n) for n in range(1, self.object_count() + 1)]

    def properties(self, n):
        """[(number, address of its data, its data)], in the table's order."""
        p = self.object(n).props
        p += 1 + 2 * self.mem[p]
        out = []
        while self.mem[p]:
            b = self.mem[p]
            if self.version <= 3:
                num, ln, p = b & 31, (b >> 5) + 1, p + 1
            elif b & 0x80:
                num, ln, p = b & 63, (self.mem[p + 1] & 63) or 64, p + 2
            else:
                num, ln, p = b & 63, 2 if b & 0x40 else 1, p + 1
            out.append((num, p, self.mem[p:p + ln]))
            p += ln
        return out

    def property_default(self, num):
        return self.word(self.header["objects"] + 2 * (num - 1))

    # --- the dictionary ----------------------------------------------------
    def dictionary(self, a=None):
        a = self.header["dictionary"] if a is None else a
        n = self.mem[a]
        seps = self.mem[a + 1:a + 1 + n]
        a += 1 + n
        el, count = self.mem[a], self.word(a + 1)
        count = count - 0x10000 if count & 0x8000 else count
        a += 3
        wlen = 4 if self.version <= 3 else 6
        entries = []
        for i in range(abs(count)):
            e = a + i * el
            zc = []
            for k in range(0, wlen, 2):
                w = self.word(e + k)
                zc += [(w >> 10) & 31, (w >> 5) & 31, w & 31]
            entries.append((e, self.decode(zc, True), self.mem[e:e + el]))
        return Dictionary(bytes(seps), el, entries, count > 0)

    def encode(self, word):
        """A typed word as the dictionary stores it: 6 Z-characters to version 3, 9 from 4,
        padded with 5s, the end bit on the last word (Standard 3.7). In versions 1 and 2
        a character of another alphabet followed by one of the same gets a shift lock, as
        Infocom's compiler wrote it; otherwise a single shift."""
        v, A = self.version, self.alphabets
        resolution = 6 if v <= 3 else 9
        word = word.lower()

        def where(ch):
            for k in range(3):
                i = A[k].find(ch, 1 if k == 2 else 0)    # A2's first place is the escape
                if i >= 0:
                    return k, [i + 6]
            code = next((z for z in range(256) if zscii(z) == ch), ord(ch) & 0x3FF)
            return 2, [6, code >> 5, code & 31]

        out, cur = [], 0
        for i, ch in enumerate(word):
            if len(out) >= resolution:
                break
            if ch == " ":
                out.append(0); continue
            k, body = where(ch)
            if k != (cur if v <= 2 else 0):
                if v <= 2:
                    delta = (k - cur) % 3
                    lock = i + 1 < len(word) and where(word[i + 1])[0] == k
                    out.append(1 + delta + (2 if lock else 0))
                    if lock:
                        cur = k
                else:
                    out.append(3 + k)
            out += body
        out = (out + [5] * resolution)[:resolution]
        b = bytearray()
        for j in range(0, resolution, 3):
            w = (out[j] << 10) | (out[j + 1] << 5) | out[j + 2]
            b += bytes(((w >> 8) | (0x80 if j + 3 == resolution else 0), w & 0xFF))
        return bytes(b)

    def lookup(self, word):
        enc = self.encode(word)
        for a, _, data in self.dictionary().entries:
            if data[:len(enc)] == enc:
                return a
        return 0


def main(argv):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return 0
    s = Story.load(argv[0])
    what = argv[1] if len(argv) > 1 else "header"
    if what == "header":
        for k, v in s.header.items():
            print(f"{k:16} {v}" if isinstance(v, str) else f"{k:16} ${v:04X}")
        for name, first, last in s.regions():
            print(f"{name:16} ${first:05X}-${last:05X}")
        if s.header.get("length"):
            print(f"{'the file':16} {len(s.mem)} bytes, where the header says {s.length()}")
            print(f"{'the sum':16} ${s.checksum():04X}, where the header says ${s.header.get('checksum', 0):04X}")
        else:
            print(f"{'the file':16} {len(s.mem)} bytes; the header gives no length or checksum")
    elif what == "objects":
        for o in s.objects():
            print(f"{o.n:3} {o.name!r:32} parent {o.parent} sibling {o.sibling} child {o.child} "
                  f"attributes {sorted(o.attrs)}")
    elif what == "object":
        o = s.object(int(argv[2]))
        print(o)
        for num, a, data in s.properties(o.n):
            print(f"  property {num:2} at ${a:05X}: {data.hex()}")
    elif what == "dictionary":
        d = s.dictionary()
        print(f"separators {d.separators!r}, {len(d.entries)} entries of {d.entry_length} bytes")
        for a, w, data in d.entries:
            print(f"  ${a:05X} {w!r:12} {data.hex()}")
    elif what == "abbreviations":
        n = 32 if s.version == 2 else 96 if s.version >= 3 else 0
        for i in range(n):
            print(f"  {i:2} {s.abbreviation(i)!r}")
    elif what == "word":
        enc = s.encode(argv[2])
        print(f"{argv[2]!r} encodes as {enc.hex()}, dictionary entry ${s.lookup(argv[2]):05X}")
    else:
        sys.exit(f"story.py: no command {what!r}; see -h")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
