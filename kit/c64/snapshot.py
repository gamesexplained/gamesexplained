#!/usr/bin/env python3
"""Read a VICE snapshot into a flat 64 KB image.

The C64's snapshot is a `.vsf`: a text header block, then the modules,
each a 22-byte header (name, version, size with the header) and its body.
The RAM image is the C64MEM module's body after four bytes of port and
cartridge lines. It sat at offset 209 in the file until vice-mcp v4.0.0
put a C64MEMHACKS module before it (23 bytes later, 232), so `read` walks
the modules and keeps 209 only for a file it cannot walk. `read` returns 0x10000 bytes of RAM
(the RAM under the I/O area and the ROMs is all here; what the CPU saw
depends on `$01` at the time, which `kit/c64/cpu.py` and listing.py's
"io" rows model).

A part that is one bank of a cartridge (kit/c64/crt.py) is read from the
cartridge image instead: the bank's chips at their load addresses, and
$00 everywhere else. A file of one bank, the part's work/bank.crt, needs
no number.

  read(path, bank=None) -> bytes, length 0x10000

Usage:
  snapshot.py <file.vsf>        print the size and the first bytes
  snapshot.py --test            self-check (writes only to a temp dir)
"""
import os, sys

RAM_SIZE = 0x10000
VSF_RAM_OFFSET = 209
MAGIC = b"VICE Snapshot File"


def read(path, bank=None):
    """The 64 KB RAM image in a .vsf, or a bank's in a .crt. Exits, saying what it saw, on anything else."""
    if not os.path.isfile(path):
        sys.exit(f"{path}: no such snapshot")
    blob = open(path, "rb").read()
    if blob.startswith(b"C64 CARTRIDGE"):
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import crt
        if bank is None and len(crt.info(path)["banks"]) > 1:
            sys.exit(f"{path} is a cartridge image, not a snapshot: a part of the game is one of its banks, "
                     "built from the bank's part (kit/c64/crt.py parts), or a snapshot of RAM")
        return crt.image(path, bank)
    if bank is not None:
        sys.exit(f"{path}: bank {bank}'s part is read from the cartridge image, its work/bank.crt, "
                 "not from a snapshot")
    if not blob.startswith(MAGIC):
        sys.exit(f"{path}: not a VICE snapshot (expected {MAGIC!r} at the start). "
                 "A .vsf is the C64's format; another machine reads its own.")
    at = ram_offset(blob)
    if len(blob) < at + RAM_SIZE:
        sys.exit(f"{path}: {len(blob)} bytes, too short for a VICE snapshot "
                 f"(needs {at + RAM_SIZE})")
    return blob[at:at + RAM_SIZE]


def ram_offset(blob):
    """Where the 64 KB of RAM starts in a .vsf: C64MEM's body plus 4, found by walking the modules;
    VSF_RAM_OFFSET for a file whose modules cannot be walked."""
    pos = 58 if blob[37:50] == b"VICE Version\x1a" else 37
    while pos + 22 <= len(blob):
        name = blob[pos:pos + 16].split(b"\0")[0]
        size = int.from_bytes(blob[pos + 18:pos + 22], "little")
        if size < 22 or pos + size > len(blob):
            break
        if name == b"C64MEM" and size >= 26 + RAM_SIZE:
            return pos + 26
        pos += size
    return VSF_RAM_OFFSET


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    if argv[0] == "--test":
        test(); return
    ram = read(argv[0])
    print(f"{argv[0]}: RAM {len(ram)} bytes, first 16: {ram[:16].hex(' ')}")


def test():
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        body = bytes((i * 31 + 7) & 0xFF for i in range(RAM_SIZE))
        p = os.path.join(d, "ok.vsf")
        hdr = MAGIC + b" C64SC\0"
        open(p, "wb").write(hdr + bytes(VSF_RAM_OFFSET - len(hdr)) + body)
        ram = read(p)
        assert len(ram) == RAM_SIZE and ram == body, "RAM must be the tail at the offset"
        def module(name, payload):
            return name.ljust(16, b"\0") + b"\0\1" + (22 + len(payload)).to_bytes(4, "little") + payload
        head = MAGIC + b"\x1a\x02\x00" + b"C64SC".ljust(16, b"\0") + b"VICE Version\x1a" + b"\0" * 8
        q = os.path.join(d, "hacks.vsf")
        open(q, "wb").write(head + module(b"MAINCPU", b"\0" * 40) + module(b"C64MEMHACKS", b"\0")
                            + module(b"C64MEM", b"\x37\x2f\0\0" + body + b"\0" * 16))
        assert read(q) == body, "RAM must be read from the C64MEM module wherever it sits"
        for name, blob in (("short.vsf", MAGIC + b"\0" * 10), ("nope.vsf", b"not a snapshot")):
            q = os.path.join(d, name)
            open(q, "wb").write(blob)
            try:
                read(q)
            except SystemExit as e:
                assert str(e).strip(), name
            else:
                raise AssertionError(f"{name}: should have been refused")
    print("ok - snapshot.py self-check: RAM in the C64MEM module and at the old offset, short and foreign files refused")


if __name__ == "__main__":
    main()
