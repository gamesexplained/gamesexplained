#!/usr/bin/env python3
"""Read a ZX Spectrum snapshot into a flat 64 KB image.

The kit's canonical snapshot is a .sna. The 48K form is a 27-byte header
followed by 49152 bytes of RAM for $4000-$FFFF, uncompressed. The 128K form
keeps that layout for the three banks the CPU saw (5 at $4000, 2 at $8000
and the one paged in at $C000), then adds the PC (2 bytes), the last value
written to $7FFD (1), a TR-DOS flag (1) and every other bank, in ascending
order: 131103 bytes, or 147487 when the paged bank is 2 or 5 and so appears
twice.

`read` returns a 0x10000-byte image whose first 0x4000 bytes are zero (the
ROM, which is never the game) and whose rest is the RAM as the CPU saw it.
`read(path, bank=n)` returns RAM bank n of a 128K snapshot at $C000-$FFFF
and zero elsewhere, for the part of a game that is one bank
(kit/spectrum/banks.py, kit/scripts/parts.py). `banks(path)` returns every
bank of a 128K snapshot by number, with the paging.

A .z80, a .zsf or any other file is refused with its size, rather than
parsed as if it were a .sna. `kit/spectrum/INSTALL.md` and
`kit/skills/spectrum/zx-spectrum-reference` say what the supported forms
are; extend this reader when a game needs another one.

Usage:
  snapshot.py <file>            print size, form and a little of the header
  snapshot.py --test            run the self-check (writes only to a temp dir)
"""
import os, struct, sys

RAM_SIZE = 0x10000
ROM_END = 0x4000            # RAM starts here in a 48K machine
SNA_HEADER = 27
SNA_48K_SIZE = SNA_HEADER + (RAM_SIZE - ROM_END)          # 49179
BANK = 0x4000
SNA_128K_SIZE = SNA_48K_SIZE + 4 + 5 * BANK               # 131103
SNA_128K_SIZE_6 = SNA_48K_SIZE + 4 + 6 * BANK             # 147487: the paged bank is 2 or 5

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


def _blob(path):
    if not os.path.isfile(path):
        sys.exit(f"{path}: no such snapshot")
    blob = open(path, "rb").read()
    if blob[:2] == b"\x1f\x8b":
        sys.exit(f"{path}: gzip data, not a .sna (a .z80 is never gzip: its compression is ED ED run-length).")
    return blob


def banks(path):
    """A 128K .sna as {"pc", "port", "paged", "banks": {0..7: 16384 bytes}}.

    Exits, naming the size, for anything that is not the 128K .sna form.
    """
    blob = _blob(path)
    n = len(blob)
    if n not in (SNA_128K_SIZE, SNA_128K_SIZE_6):
        sys.exit(f"{path}: {n} bytes, not a 128K .sna ({SNA_128K_SIZE} or {SNA_128K_SIZE_6} bytes)")
    tail = SNA_48K_SIZE
    pc = struct.unpack_from("<H", blob, tail)[0]
    port = blob[tail + 2]
    paged = port & 7
    got = {5: blob[SNA_HEADER:SNA_HEADER + BANK],
           2: blob[SNA_HEADER + BANK:SNA_HEADER + 2 * BANK],
           paged: blob[SNA_HEADER + 2 * BANK:SNA_48K_SIZE]}
    rest = [b for b in range(8) if b not in (2, 5, paged)]
    if (n == SNA_128K_SIZE_6) != (paged in (2, 5)):
        sys.exit(f"{path}: {n} bytes with bank {paged} paged in: the length and the paging disagree")
    off = tail + 4
    for b in ([b for b in range(8) if b not in (2, 5)] if paged in (2, 5) else rest):
        if b == paged:         # the paged bank 2 or 5 appears again; the copy at $C000 is the same RAM
            off += BANK
            continue
        got[b] = blob[off:off + BANK]
        off += BANK
    if off != n or sorted(got) != list(range(8)):
        sys.exit(f"{path}: the banks do not add up ({sorted(got)}, {off} of {n} bytes read)")
    return {"pc": pc, "port": port, "paged": paged, "banks": got}


def read(path, bank=None):
    """A 64 KB image (ROM zeroed, $4000-$FFFF the RAM as the CPU saw it).

    With `bank`, RAM bank `bank` of a 128K snapshot at $C000-$FFFF and zero
    elsewhere. Raises SystemExit, naming the size, for anything that is not
    a .sna.
    """
    blob = _blob(path)
    n = len(blob)
    img = bytearray(RAM_SIZE)
    if bank is not None:
        if n == SNA_48K_SIZE:
            sys.exit(f"{path}: a 48K .sna has no RAM banks; bank {bank} is a 128K snapshot's")
        b = banks(path)["banks"]
        if bank not in b:
            sys.exit(f"{path}: no RAM bank {bank} (a 128K machine has banks 0 to 7)")
        img[0xC000:] = b[bank]
        return bytes(img)
    if n in (SNA_48K_SIZE, SNA_128K_SIZE, SNA_128K_SIZE_6):
        ram = blob[SNA_HEADER:SNA_48K_SIZE]
    else:
        sys.exit(f"{path}: {n} bytes, not a .sna ({SNA_48K_SIZE} bytes for a 48K machine: "
                 f"a {SNA_HEADER}-byte header then 49152 bytes of RAM; {SNA_128K_SIZE} or "
                 f"{SNA_128K_SIZE_6} for a 128K one). .z80, .szx and .zsf are not read yet.")
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
    if len(blob) == SNA_48K_SIZE:
        print(f"{path}: {len(blob)} bytes, 48K .sna. RAM $4000-$FFFF ({RAM_SIZE - ROM_END} bytes).")
    else:
        b = banks(path)
        print(f"{path}: {len(blob)} bytes, 128K .sna. PC=${b['pc']:04X}, $7FFD=${b['port']:02X}: "
              f"bank {b['paged']} at $C000, {'ROM 1 (48K BASIC)' if b['port'] & 16 else 'ROM 0 (128K editor)'}, "
              f"{'shadow screen (bank 7)' if b['port'] & 8 else 'normal screen (bank 5)'}"
              f"{', paging locked' if b['port'] & 32 else ''}.")
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

        # a 128K .sna: bank b filled with b+1, bank 3 paged in, then bank 2 paged in (six banks after)
        for paged, size in ((3, SNA_128K_SIZE), (2, SNA_128K_SIZE_6)):
            bank = {b: bytes([b + 1]) * BANK for b in range(8)}
            port = 0x10 | paged
            body = bank[5] + bank[2] + bank[paged] + struct.pack("<HBB", 0xBEEF, port, 0)
            body += b"".join(bank[b] for b in range(8) if b not in (2, 5) and (paged in (2, 5) or b != paged))
            q = os.path.join(d, f"128-{paged}.sna")
            open(q, "wb").write(bytes(hdr) + body)
            assert len(bytes(hdr) + body) == size, (paged, len(body))
            img = read(q)
            assert img[0x4000:0x8000] == bank[5] and img[0x8000:0xC000] == bank[2], paged
            assert img[0xC000:] == bank[paged], "the paged bank at $C000"
            got = banks(q)
            assert got["pc"] == 0xBEEF and got["port"] == port and got["paged"] == paged, got
            for b in range(8):
                assert got["banks"][b] == bank[b], (paged, b)
                one = read(q, bank=b)
                assert one[0xC000:] == bank[b] and one[:0xC000] == bytes(0xC000), (paged, b)

        for name, data in (("short.sna", bytes(100)),
                           ("maybe.z80", b"\x1f\x8b\x08\x00" + bytes(60))):
            q = os.path.join(d, name)
            open(q, "wb").write(data)
            try:
                read(q)
            except SystemExit as e:
                assert str(e).strip(), name
            else:
                raise AssertionError(f"{name}: should have been refused")
        try:
            read(p, bank=0)
        except SystemExit as e:
            assert "48K" in str(e)
        else:
            raise AssertionError("a 48K .sna has no banks")
    print("ok - snapshot.py self-check: 48K read, ROM zeroed, 128K banks read, short/gzip refused")


if __name__ == "__main__":
    main()
