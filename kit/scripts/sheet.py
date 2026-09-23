#!/usr/bin/env python3
"""Tile screenshots into one contact sheet, so forty states are one read, not forty.

  sheet.py <out.png> <columns> <a.png> <b.png> ...      [--half]

Images go left to right, top to bottom, in the order given, each at the top
left of a cell as big as the largest; the tile-to-file list is printed.
--half halves every image first. Pure Python, no packages: 8-bit RGB, RGBA
and grey PNGs, and palette PNGs of any depth; not 16-bit or interlaced.
The sheet is a working file: write it to the game's work/.
"""
import struct, sys, zlib

GAP, GREY = 4, 0x80   # between tiles, in a colour no C64 screen is mostly made of


def unfilter(raw, h, stride, bpp):
    rows, prev, i = [], bytearray(stride), 0
    for _ in range(h):
        f = raw[i]; line = bytearray(raw[i + 1:i + 1 + stride]); i += 1 + stride
        if f == 2:
            line = bytearray((x + p) & 255 for x, p in zip(line, prev))
        elif f:
            for x in range(stride):
                a = line[x - bpp] if x >= bpp else 0
                b = prev[x]
                c = prev[x - bpp] if x >= bpp else 0
                if f == 1: line[x] = (line[x] + a) & 255
                elif f == 3: line[x] = (line[x] + ((a + b) >> 1)) & 255
                else:
                    p = a + b - c; pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                    line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(line); prev = line
    return rows


def read_png(path):
    """(width, height, rows of RGB bytes)."""
    data = open(path, "rb").read()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        sys.exit(f"{path}: not a PNG")
    pos, idat, plte, w = 8, [], b"", None
    while pos < len(data):
        ln, typ = struct.unpack(">I4s", data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + ln]
        if typ == b"IHDR":
            w, h, depth, ctype, _, _, inter = struct.unpack(">IIBBBBB", body)
        elif typ == b"PLTE":
            plte = body
        elif typ == b"IDAT":
            idat.append(body)
        pos += 12 + ln
    channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}.get(ctype)
    if w is None or inter or channels is None or depth > 8 or (depth < 8 and ctype not in (0, 3)):
        sys.exit(f"{path}: {depth}-bit colour type {ctype}{', interlaced' if inter else ''} is not handled; "
                 "save it again as an 8-bit RGB PNG")
    bits = depth * channels
    rows = unfilter(zlib.decompress(b"".join(idat)), h, (w * bits + 7) // 8, max(1, bits // 8))
    out = []
    for line in rows:
        if depth < 8:   # several pixels to a byte, first pixel in the high bits
            per, mask = 8 // depth, (1 << depth) - 1
            line = bytearray((line[x // per] >> (8 - depth * (x % per + 1))) & mask for x in range(w))
            if ctype == 0:
                line = bytearray(v * (255 // mask) for v in line)
        if ctype == 2:
            px = line
        elif ctype == 6:
            px = bytearray(line); del px[3::4]
        elif ctype == 3:
            px = bytearray(b"".join(plte[3 * i:3 * i + 3] for i in line))
        else:   # grey, and grey with alpha
            g = line[::channels]; px = bytearray(3 * w); px[0::3] = g; px[1::3] = g; px[2::3] = g
        out.append(bytes(px))
    return w, h, out


def write_png(path, w, h, rows):
    raw = b"".join(b"\x00" + bytes(r) for r in rows)
    def chunk(t, b): return struct.pack(">I", len(b)) + t + b + struct.pack(">I", zlib.crc32(t + b) & 0xFFFFFFFF)
    open(path, "wb").write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
                           + chunk(b"IDAT", zlib.compress(raw, 6)) + chunk(b"IEND", b""))


def main():
    args = [a for a in sys.argv[1:] if a != "--half"]
    if len(args) < 3 or not args[1].isdigit() or int(args[1]) < 1:
        print(__doc__); sys.exit(0 if sys.argv[1:2] in (["-h"], ["--help"]) else 1)
    out, cols, files = args[0], int(args[1]), args[2:]
    imgs = [read_png(f) for f in files]
    if "--half" in sys.argv[1:]:
        imgs = [(w // 2, h // 2, [b"".join(r[6 * i:6 * i + 3] for i in range(w // 2)) for r in rows[:h // 2 * 2:2]])
                for w, h, rows in imgs]
    cw, ch = max(i[0] for i in imgs), max(i[1] for i in imgs)
    nrows = (len(imgs) + cols - 1) // cols
    W, H = cols * cw + (cols - 1) * GAP, nrows * ch + (nrows - 1) * GAP
    canvas = [bytearray([GREY]) * (3 * W) for _ in range(H)]
    for n, (w, h, rows) in enumerate(imgs):
        ox, oy = (n % cols) * (cw + GAP), (n // cols) * (ch + GAP)
        for y in range(h):
            canvas[oy + y][3 * ox:3 * (ox + w)] = rows[y]
        print(f"  {n + 1:>3}  row {n // cols + 1}, column {n % cols + 1}:  {files[n]}")
    write_png(out, W, H, canvas)
    print(f"wrote {out}: {W} x {H}, {len(imgs)} image(s) in {nrows} row(s) of up to {cols}")


if __name__ == "__main__":
    main()
