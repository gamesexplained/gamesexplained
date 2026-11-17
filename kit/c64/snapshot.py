#!/usr/bin/env python3
"""Read a VICE snapshot into a flat 64 KB image.

The C64's snapshot is a `.vsf`: a text header block, then the modules,
each a 22-byte header (name, version, size with the header) and its body.
The RAM is in the C64MEM module, after its four bytes of port and
cartridge lines; where that module starts depends on the build, so the
modules are walked, never a fixed offset assumed (209 on vice-mcp
v3.14.0, 232 on v4.0.0). `read` returns 0x10000 bytes of RAM
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
VSF_RAM_OFFSET = 209        # the RAM of a file with no modules: the kit's tests write these
MAGIC = b"VICE Snapshot File"


def ram_offset(blob):
    """Where the RAM starts in a snapshot: the C64MEM module's body, after its four bytes.
    VSF_RAM_OFFSET for a file with no modules at all; None for modules without C64MEM."""
    off = 58 if blob[37:50] == b"VICE Version\x1a" else 37
    found = False
    while off + 22 <= len(blob):
        name, size = blob[off:off + 16].rstrip(b"\0"), int.from_bytes(blob[off + 18:off + 22], "little")
        if size < 22 or off + size > len(blob):
            break
        found = True
        if name == b"C64MEM" and size - 22 >= 4 + RAM_SIZE:
            return off + 22 + 4
        off += size
    return None if found else VSF_RAM_OFFSET


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
    if at is None:
        sys.exit(f"{path}: a VICE snapshot with no C64MEM module, so not a C64's")
    if len(blob) < at + RAM_SIZE:
        sys.exit(f"{path}: {len(blob)} bytes, too short for a VICE snapshot "
                 f"(needs {at + RAM_SIZE})")
    return blob[at:at + RAM_SIZE]


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
        # A file laid out as VICE writes it: the version block, a CPU module, then C64MEM. Its RAM
        # is wherever C64MEM puts it (here 232, where vice-mcp v4.0.0 has it), never at 209.
        def module(name, body):
            return name.ljust(16, b"\0") + bytes((1, 0)) + (22 + len(body)).to_bytes(4, "little") + body
        head = (MAGIC + b"\x1a").ljust(21, b"\0") + b"C64SC".ljust(16, b"\0") + b"VICE Version\x1a"
        head = head.ljust(58, b"\0")
        cpu = module(b"MAINC64CPU", bytes(232 - 4 - 22 - 22 - 58))
        p = os.path.join(d, "modules.vsf")
        open(p, "wb").write(head + cpu + module(b"C64MEM", bytes((0x37, 0x2F, 1, 1)) + body + b"\x37"))
        assert ram_offset(open(p, "rb").read()) == 232, "C64MEM's RAM must be found by walking the modules"
        assert read(p) == body, "RAM must be read where C64MEM has it"
        p = os.path.join(d, "other.vsf")
        open(p, "wb").write(head + cpu + module(b"VIC20MEM", body))
        try:
            read(p)
        except SystemExit as e:
            assert "C64MEM" in str(e), "a snapshot of another machine must say why it is refused"
        else:
            raise AssertionError("other.vsf: should have been refused")
        for name, blob in (("short.vsf", MAGIC + b"\0" * 10), ("nope.vsf", b"not a snapshot")):
            q = os.path.join(d, name)
            open(q, "wb").write(blob)
            try:
                read(q)
            except SystemExit as e:
                assert str(e).strip(), name
            else:
                raise AssertionError(f"{name}: should have been refused")
    print("ok - snapshot.py self-check: RAM found in C64MEM (and at 209 with no modules), "
          "short and foreign files refused")


if __name__ == "__main__":
    main()
