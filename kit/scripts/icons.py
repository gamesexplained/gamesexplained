#!/usr/bin/env python3
"""Draw the site's icons into site/icons/: the favicon and the installed app's icons.

Usage: icons.py

The design is a prompt on the site's dark margin colour: "GE" in the paper colour and a
block cursor in amber, drawn on a 5x7 pixel grid of our own (not a machine's character
ROM). Change GLYPHS or the colours below and run this again; build.py copies site/icons/
to the site and the manifest names the files.

  icon.svg               the favicon: a rounded tile, the glyphs nearly filling it
  icon-192.png, -512     the manifest's "any" icons, the same tile
  icon-maskable-512.png  full bleed, the glyphs inside the central 80 % circle that
                         Android's launcher masks to (a circle, squircle or rounded square)
  apple-touch-icon.png   180 px, full bleed: iOS rounds the corners itself

No dependencies: the PNG writer is zlib and struct.
"""
import os, struct, sys, zlib

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "site", "icons")
BG, INK, CURSOR = "#23262d", "#e9e7e1", "#f08a24"   # site.css --bg and --paper; the cursor a lit amber
GLYPHS = [(INK, [".###.",
                 "#...#",
                 "#....",
                 "#.###",
                 "#...#",
                 "#...#",
                 ".###."]),
          (INK, ["#####",
                 "#....",
                 "#....",
                 "####.",
                 "#....",
                 "#....",
                 "#####"]),
          (CURSOR, ["#####"] * 7)]
GAP = 1


def cells():
    """(x, y, colour) for every lit cell, in grid units from the top left of the glyph row."""
    out, x0 = [], 0
    for colour, rows in GLYPHS:
        for y, row in enumerate(rows):
            out += [(x0 + x, y, colour) for x, c in enumerate(row) if c == "#"]
        x0 += len(rows[0]) + GAP
    return out, x0 - GAP, len(GLYPHS[0][1])


def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def layout(span):
    """The glyph row centred in a square span grid units across: (lit cells, x offset, y offset)."""
    lit, w, h = cells()
    return {(x, y): c for x, y, c in lit}, (span - w) / 2, (span - h) / 2


def png(path, px, span, radius=0.0, ss=4):
    """Render the design at px by px, the tile span grid units across with corners of radius
    units (0 for full bleed), supersampled ss x ss for smooth edges."""
    lit, ox, oy = layout(span)
    bg, rows = rgb(BG), []
    for py in range(px):
        row = bytearray([0])
        for qx in range(px):
            acc = [0, 0, 0, 0]
            for sy in range(ss):
                for sx in range(ss):
                    u = (qx + (sx + .5) / ss) * span / px
                    v = (py + (sy + .5) / ss) * span / px
                    if radius:   # outside a rounded corner: transparent
                        cx, cy = min(max(u, radius), span - radius), min(max(v, radius), span - radius)
                        if (u - cx) ** 2 + (v - cy) ** 2 > radius ** 2:
                            continue
                    c = lit.get((int(u - ox) if u >= ox else -1, int(v - oy) if v >= oy else -1))
                    r, g, b = rgb(c) if c else bg
                    acc[0] += r; acc[1] += g; acc[2] += b; acc[3] += 1
            n = ss * ss
            a = acc[3]
            row += bytes([acc[0] // a, acc[1] // a, acc[2] // a, 255 * a // n] if a else [0, 0, 0, 0])
        rows.append(bytes(row))

    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)
    data = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", px, px, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(b"".join(rows), 9)) + chunk(b"IEND", b""))
    open(path, "wb").write(data)


def svg(path, span, radius):
    lit, ox, oy = layout(span)
    rects = "".join(f'<rect x="{x + ox:g}" y="{y + oy:g}" width="1" height="1" fill="{c}"/>' for (x, y), c in sorted(lit.items()))
    open(path, "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {span} {span}">'
                          f'<rect width="{span}" height="{span}" rx="{radius}" fill="{BG}"/>'
                          f'<g shape-rendering="crispEdges">{rects}</g></svg>\n')


def main():
    if sys.argv[1:] and sys.argv[1] in ("-h", "--help"):
        print(__doc__); return
    os.makedirs(OUT, exist_ok=True)
    tile, round_ = 21, 4   # "any": the glyphs fill 17 of 21 units
    svg(os.path.join(OUT, "icon.svg"), tile, round_)
    for px in (192, 512):
        png(os.path.join(OUT, f"icon-{px}.png"), px, tile, round_)
    png(os.path.join(OUT, "icon-maskable-512.png"), 512, 26)   # corners 9.2 units from centre; the safe circle 10.4
    png(os.path.join(OUT, "apple-touch-icon.png"), 180, 24)
    print(f"wrote {len(os.listdir(OUT))} files to {os.path.relpath(OUT, ROOT)}/")


if __name__ == "__main__":
    main()
