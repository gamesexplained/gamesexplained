#!/usr/bin/env python3
"""Read a ZX Spectrum snapshot into a flat 64 KB image.

The kit's canonical snapshot is a 48K .sna: a 27-byte header followed by
49152 bytes of RAM for $4000-$FFFF, uncompressed. `read` returns a
0x10000-byte image whose first 0x4000 bytes are zero (the ROM, which is
never the game) and whose rest is that RAM.

Nothing else is read yet. A 128K .sna, a .z80, a .zsf or any other file
is refused with its size, rather than parsed as if it were the 48K form:
reading a 128K snapshot's first 49152 bytes would silently hand back one
bank as if it were the whole machine. `kit/spectrum/INSTALL.md` and
`kit/skills/spectrum/zx-spectrum-reference` say what the supported form
is; extend this reader when a game needs another one.

Usage:
  snapshot.py <file>            print size, form and a little of the header
  snapshot.py --test            run the self-check (writes only to a temp dir)
"""
import os, struct, sys

RAM_SIZE = 0x10000
ROM_END = 0x4000            # RAM starts here in a 48K machine
SNA_HEADER = 27
SNA_48K_SIZE = SNA_HEADER + (RAM_SIZE - ROM_END)          # 49179
SNA_128K_SIZE = SNA_48K_SIZE + 4 + 5 * 0x4000             # 131103

# header field -> (offset, little-endian width); names follow the .sna layout
SNA_HEADER_FIELDS = [("I", 0, 1), ("HL'", 1, 2), ("DE'", 3, 2), ("BC'", 5, 2),
                     ("AF'", 7, 2), ("HL", 9, 2), ("DE", 11, 2), ("BC", 13, 2),
                     ("IY", 15, 2), ("IX", 17, 2), ("IFF2", 19, 1), ("R", 20, 1),
                     ("AF", 21, 2), ("SP", 23, 2), ("IM", 25, 1), ("border", 26, 1)]


def header(blob):
    """The 27-byte header as a dict, or {} if this is not a 48K .sna."""
    if len(blob) < SNA_HEADER:
        return {}
    out = {}
    for name, off, width in SNA_HEADER_FIELDS:
        out[name] = blob[off] if width == 1 else struct.unpack_from("<H", blob, off)[0]
    return out


def read(path):
    """A 64 KB image (ROM zeroed, $4000-$FFFF the snapshot's RAM).

    Raises SystemExit, naming the size, for anything that is not the 48K
    .sna form.
    """
    if not os.path.isfile(path):
        sys.exit(f"{path}: no such snapshot")
    blob = open(path, "rb").read()
    n = len(blob)
    if blob[:2] == b"\x1f\x8b":
        sys.exit(f"{path}: gzip data, not a 48K .sna (perhaps a compressed .z80).")
    if n == SNA_48K_SIZE:
        ram = blob[SNA_HEADER:]
    elif n == SNA_128K_SIZE:
        sys.exit(f"{path}: a 128K .sna ({n} bytes). The kit reads the 48K form "
                 f"({SNA_48K_SIZE} bytes) only; a banked snapshot read as 48K would "
                 "return one bank as if it were the whole machine. Run the game on a "
                 "48K machine, or extend kit/spectrum/snapshot.py.")
    else:
        sys.exit(f"{path}: {n} bytes, not a 48K .sna ({SNA_48K_SIZE} bytes: "
                 f"a {SNA_HEADER}-byte header then 49152 bytes of RAM). .z80, .szx, "
                 ".zsf and 128K snapshots are not read yet.")
    img = bytearray(RAM_SIZE)
    img[ROM_END:] = ram
    return bytes(img)


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    if argv[0] == "--test":
        test(); return
    path = argv[0]
    blob = open(path, "rb").read()
    img = read(path)
    h = header(blob)
    print(f"{path}: {len(blob)} bytes, 48K .sna. RAM $4000-$FFFF ({RAM_SIZE - ROM_END} bytes).")
    if h:
        print("  header: " + "  ".join(f"{k}={v}" for k, v in h.items()))


# --- self-check -----------------------------------------------------------
def test():
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        body = bytes((i * 7 + 3) & 0xFF for i in range(RAM_SIZE - ROM_END))
        hdr = bytearray(SNA_HEADER)
        hdr[0] = 0x3F                       # I
        hdr[19] = 1                         # IFF2
        hdr[23:25] = struct.pack("<H", 0x8000)   # SP
        p = os.path.join(d, "ok.sna")
        open(p, "wb").write(bytes(hdr) + body)
        img = read(p)
        assert len(img) == RAM_SIZE, len(img)
        assert img[:ROM_END] == bytes(ROM_END), "ROM must be zeroed"
        assert img[ROM_END:] == body, "RAM must be the snapshot's tail"
        h = header(open(p, "rb").read())
        assert h["SP"] == 0x8000 and h["IFF2"] == 1 and h["I"] == 0x3F, h

        for name, data in (("128.sna", bytes(SNA_128K_SIZE)),
                           ("short.sna", bytes(100)),
                           ("maybe.z80", b"\x1f\x8b\x08\x00" + bytes(60))):
            q = os.path.join(d, name)
            open(q, "wb").write(data)
            try:
                read(q)
            except SystemExit as e:
                assert str(e).strip(), name
            else:
                raise AssertionError(f"{name}: should have been refused")
    print("ok - snapshot.py self-check: 48K read, ROM zeroed, 128K/short/gzip refused")


if __name__ == "__main__":
    main()
