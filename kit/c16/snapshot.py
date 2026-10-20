#!/usr/bin/env python3
"""Read a Commodore 16 or Plus/4 snapshot into a flat 64 KB image.

The kit's snapshot is plus4emu's own file, which the kit's server writes (`save` in
kit/c16/plus4emu.py) and plus4emu's own program loads: 16 bytes of magic, then chunks, each a
big-endian type and length, the data, and a 4-byte checksum; type 0 ends it (plus4emu 1.2.11,
src/fileio.cpp). The TED chunk (type 0x4550800C) holds the RAM, 16 KB a segment, as many
segments as the machine has, then the ROMs, the CPU's port and TED's registers; the CPU chunk
(0x4550800B) holds PC, P, A, X, Y and S.

The server adds a chunk of its own before the end (type 0x4B495431, "KIT1": JSON), because the
file is taken at a TED cycle boundary, which can lie part way through an instruction: the stop
the file stands for (its PC, the registers and the cycle count there), the frame count, and the
bytes of RAM that the instruction before the stop had still to write at that boundary. `read`
applies those bytes, so the image is the RAM at the stop. A file saved by plus4emu's own program
has no such chunk: its RAM is read as it is, and `header` says the stop is not exact.

`read` returns 0x10000 bytes, the RAM as the program addresses it:

  16 KB (a C16)       $0000-$3FFF the RAM; $4000-$FFFF zero. The C16 sees its 16 KB four times
                      over the 64 KB, and the listing holds it once
  32 KB               $0000-$7FFF the RAM; $8000-$FFFF zero
  64 KB (a Plus/4)    all 64 KB of RAM, the RAM under the ROMs ($8000-$FFFF) and under the I/O
                      area ($FD00-$FF3F) included, whether or not the ROMs were paged in

Never the ROMs, which the file also holds: they are not the game.

  read(path) -> bytes, length 0x10000
  header(path) -> the model, the RAM's size, the registers, the cycle and frame counts, whether
                  the stop is exact, the tape and disk the server had in, TED's 32 registers
                  ($FF00-$FF1F: the screen's mode, where its memory is, its colours) and the
                  CPU's port ($00, $01)

A plus4emu file saved compressed, a VICE or MAME snapshot, and a tape, disk or program file are
refused, naming what they are: kit/skills/c16/tool-plus4emu, "Snapshots".

Usage:
  snapshot.py <file>            print the model, the registers and the first bytes

Its test is kit/c16/test_snapshot.py.
"""
import json, os, struct, sys

MAGIC = bytes.fromhex("5D12E4F4C9DAB6420133DE07D234F222")
TED_STATE, CPU_STATE = 0x4550800C, 0x4550800B
KIT_NOTES, KIT_CLEAN = 0x4B495431, 0x4B495432
SEGMENT = 0x4000
D64_SIZES = (174848, 175531, 196608, 197376)
HOW = "kit/skills/c16/tool-plus4emu, \"Snapshots\""


def chunks(path):
    """{type: data} of the file. Exits, saying what it saw, on anything but plus4emu's own file."""
    if not os.path.isfile(path):
        sys.exit(f"{path}: no such snapshot")
    with open(path, "rb") as f:
        blob = f.read()
    if blob.startswith(b"VICE Snapshot File"):
        sys.exit(f"{path}: a VICE snapshot, not the kit's. The C16's snapshot is plus4emu's: {HOW}")
    if blob.startswith(b"MAMESAVE"):
        sys.exit(f"{path}: a MAME save state, not the kit's snapshot: {HOW}")
    if blob.startswith((b"C16-TAPE-RAW", b"C64-TAPE-RAW")):
        sys.exit(f"{path}: a tape image, not a snapshot. Put it in with `tape`, then `save`: {HOW}")
    if blob.startswith(b"GCR-1541") or len(blob) in D64_SIZES:
        sys.exit(f"{path}: a disk image, not a snapshot. Put it in with `disk`, then `save`: {HOW}")
    if blob.startswith(b"PLUS4 CARTRIDGE") or blob.startswith(b"C64 CARTRIDGE"):
        sys.exit(f"{path}: a cartridge image, not a snapshot: {HOW}")
    if not blob.startswith(MAGIC):
        if blob[:2] == b"\x78\x9c" or blob[:4] == b"\x00\x00\x00\x00" and len(blob) > 64:
            sys.exit(f"{path}: not plus4emu's uncompressed file; if plus4emu's own program saved it "
                     f"compressed, load it in the kit's server and save it again: {HOW}")
        sys.exit(f"{path}: not a plus4emu snapshot ({len(blob)} bytes, starting {blob[:8].hex()}). "
                 f"A program file (.prg) goes in with `program`: {HOW}")
    out, o = {}, 16
    while o + 12 <= len(blob):
        t, n = struct.unpack_from(">II", blob, o)
        if t == 0:
            break
        out.setdefault(t, blob[o + 8:o + 8 + n])
        o += n + 12
    if TED_STATE not in out or CPU_STATE not in out:
        sys.exit(f"{path}: a plus4emu file with no machine in it (a configuration or a demo file?): {HOW}")
    return out


def notes(ch):
    """The kit server's chunk, or {} for a file plus4emu's own program saved."""
    try:
        return json.loads(ch[KIT_NOTES]) if KIT_NOTES in ch else {}
    except ValueError:
        return {}


def ram(ch):
    """The RAM segments as the file holds them, one bytes a segment."""
    ted = ch[TED_STATE]
    n = ted[5]
    return [bytes(ted[6 + i * SEGMENT:6 + (i + 1) * SEGMENT]) for i in range(n)]


def read(path, bank=None):
    """The 64 KB image described above."""
    if bank is not None:
        sys.exit(f"{path}: the C16 and Plus/4 have no banks of RAM a part can be: read the snapshot whole")
    ch = chunks(path)
    segs = ram(ch)
    image = bytearray(0x10000)
    size = len(segs) * SEGMENT
    image[:size] = b"".join(segs)[:0x10000]
    for i, v in notes(ch).get("ram_at_stop") or []:
        if 0 <= i < size:
            image[i] = v
    return bytes(image)


def ted(ch):
    """(TED's 32 registers, $FF00-$FF1F, as the file holds them; the CPU's port, $00 and $01)."""
    t = ch[TED_STATE]
    o = 6 + t[5] * SEGMENT + bin(t[4]).count("1") * SEGMENT    # past the RAM and the ROMs
    return bytes(t[o + 2:o + 34]), [t[o], t[o + 1]]


def header(path):
    ch = chunks(path)
    cpu = ch[CPU_STATE]
    side = notes(ch)
    regs, port = ted(ch)
    out = {"model": side.get("model"), "ram_kb": len(ram(ch)) * 16, "plus4emu": side.get("plus4emu"),
           "pc": cpu[4] | cpu[5] << 8, "p": cpu[6], "a": cpu[7], "x": cpu[8], "y": cpu[9], "s": cpu[10],
           "exact": side.get("exact") if side else None, "cycles": side.get("stamp"), "frames": side.get("frames"),
           "media": side.get("media"), "kit": bool(side), "replay": bool(side.get("replay")),
           "ted": regs, "cpu_port": port}
    stop = side.get("resume") or {}
    if stop.get("pc") is not None:
        out["pc"], out["cycles"] = stop["pc"], stop.get("stamp")
    elif side.get("pc") is not None:
        out["pc"] = side["pc"]
    for k, v in (side.get("regs") or {}).items():
        if k in ("a", "x", "y", "s", "p"):
            out[k] = v
    return out


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return
    h = header(argv[0])
    print(f"{h['model'] or 'plus4emu'} ({h['ram_kb']} KB), PC ${h['pc']:04X} A ${h['a']:02X} X ${h['x']:02X} "
          f"Y ${h['y']:02X} S ${h['s']:02X} P ${h['p']:02X}, cycle {h['cycles']}, frame {h['frames']}"
          + ("" if h["kit"] else " (saved by plus4emu's own program: the stop is not exact)"))
    media = {k: v for k, v in (h["media"] or {}).items() if v}
    if media:
        print("in:", ", ".join(f"{k} {v}" for k, v in media.items()))
    image = read(argv[0])
    for a in range(0x1000, 0x1040, 16):
        print(f"{a:04X}  {image[a:a + 16].hex(' ')}")


if __name__ == "__main__":
    main()
