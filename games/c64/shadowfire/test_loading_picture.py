#!/usr/bin/env python3
"""Hold the Graphics tab's loading picture to the cassette.

graphics.html carries the picture as data (the block "sf-loading-data"): the screen colours, the
colour RAM and the bitmap, as the tape holds them in its turbo blocks 2, 3 and 4. The tape is not
in the repository, so the check goes through media.json, which holds the hash of each block as
kit/c64/tap.py read it:

- the page's screen colours and colour RAM, behind the four address bytes the tape gives them,
  must have the hashes media.json holds for blocks 2 and 3;
- the page's bitmap is 8,000 of block 4's 11,264 bytes, so no hash in media.json is its own:
  it must have the hash below, taken when the page's data was made from the tape;
- media.json must answer the three blocks as data that this page shows;
- the page's own decoder (sfLoadingPicture), run on that data, must colour every pixel as a
  multicolour bitmap's four colours say, worked out here a second way.

With the tape in work/ (Shadowfire.tap), the three pieces are also compared with it byte for byte.

Usage: test_loading_picture.py
"""
import base64, hashlib, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
BITMAP_SHA = "5fc4e3d5eb88c2d15526e87a7853b887d96fc0fb47f58aa394eab33523d29bd9"
BITMAP_AT = 0x2000 - 0x1400                     # block 4 loads at $1400 and the bitmap is at $2000


def sha(b):
    return hashlib.sha256(b).hexdigest()


def main():
    page = open(os.path.join(HERE, "graphics.html"), encoding="utf-8").read()
    m = re.search(r'<script type="application/json" id="sf-loading-data">(.*?)</script>', page, re.S)
    assert m, "graphics.html has no sf-loading-data block"
    data = {k: base64.b64decode(v) for k, v in json.loads(m.group(1)).items()}
    assert (len(data["screen"]), len(data["colour"]), len(data["bitmap"])) == (1024, 1024, 8000), {k: len(v) for k, v in data.items()}

    items = {i["label"]: i for i in json.load(open(os.path.join(HERE, "media.json")))["items"]}
    address = lambda start, n: bytes([start & 255, start >> 8, (start + n) & 255, (start + n) >> 8])
    assert sha(address(0x0C00, 1024) + data["screen"]) == items["turbo block 2"]["sha256"], "the screen colours are not the tape's block 2"
    assert sha(address(0xD800, 1024) + data["colour"]) == items["turbo block 3"]["sha256"], "the colour RAM is not the tape's block 3"
    assert sha(data["bitmap"]) == BITMAP_SHA, "the bitmap is not the 8,000 bytes taken from the tape's block 4"
    for n in (2, 3, 4):
        it = items[f"turbo block {n}"]
        assert (it["answer"], it.get("page")) == ("data", "graphics.html"), (n, it["answer"], it.get("page"))

    tape = os.path.join(HERE, "work", "Shadowfire.tap")
    with_tape = os.path.isfile(tape)
    if with_tape:
        sys.path.insert(0, os.path.join(ROOT, "kit", "c64"))
        import tap
        blocks = {i["label"]: i["data"] for i in tap.read(tape)}
        assert blocks["turbo block 2"] == data["screen"] and blocks["turbo block 3"] == data["colour"]
        assert blocks["turbo block 4"][BITMAP_AT:BITMAP_AT + 8000] == data["bitmap"]

    # the page's decoder against the rule, on the page's data
    js = r"""
const fs = require('fs'), path = require('path');
const { game } = require(path.join(process.argv[1], 'kit/scripts/port_check.js'));
const g = game(process.argv[2]);
const { sfLoadingPicture } = g.run('graphics.html', 'sfLoadingPicture');
const page = fs.readFileSync(path.join(process.argv[2], 'graphics.html'), 'utf8');
const data = JSON.parse(/<script type="application\/json" id="sf-loading-data">([\s\S]*?)<\/script>/.exec(page)[1]);
const pal = Array.from({ length: 16 }, (_, i) => '#' + (i * 17).toString(16).padStart(2, '0') + '0000');
process.stdout.write(Buffer.from(sfLoadingPicture(data, pal).buffer).toString('base64'));
"""
    probe = subprocess.run(["node", "-e", js, "--", ROOT, HERE], capture_output=True, text=True)
    if probe.returncode != 0:
        sys.exit("the page's decoder did not run:\n" + probe.stderr[-2000:])
    px = base64.b64decode(probe.stdout)
    assert len(px) == 320 * 200 * 4, len(px)
    bad = 0
    for cell in range(1000):
        s, c = data["screen"][cell], data["colour"][cell] & 15
        four = (0, s >> 4, s & 15, c)
        for y in range(8):
            b = data["bitmap"][cell * 8 + y]
            for x in range(8):
                want = four[b >> (6 - (x & 6)) & 3] * 17
                o = ((cell // 40 * 8 + y) * 320 + cell % 40 * 8 + x) * 4
                bad += px[o] != want or px[o + 3] != 255
    assert bad == 0, f"{bad} pixels differ from the multicolour rule"
    used = len({px[o] for o in range(0, len(px), 4)})
    print(f"ok - shadowfire loading picture: the page's 10,048 bytes are the tape's blocks 2, 3 and 4 by media.json's hashes"
          + (", and byte for byte by the tape in work/" if with_tape else "")
          + f"; its decoder colours all 64,000 pixels by the multicolour rule, in {used} colours")
    return 0


if __name__ == "__main__":
    sys.exit(main())
