#!/usr/bin/env python3
"""Hold the Discoveries tab's faded copy of the game to the cassette and to the listing.

discoveries.html carries 3,072 bytes as data (the block "sf-leftover-data"): what the tape's turbo
block 4 loads at $1400-$1FFF, below the loading picture's bitmap. The page says they are the game's
own bytes at those addresses with two bits of every byte wrecked. The tape is not in the
repository, so the check is:

- the page's bytes must have the hash below, taken when the page's data was made from the tape,
  and media.json must still list block 4 as the 11,264 bytes loaded at $1400 that they begin;
- the listing must hold every byte of $1400-$1FFF, and the page's bytes must agree with it as the
  page says: nine times in ten over bits 0-4 and 7, and no better than chance once the two are
  slid one, two, three or 256 bytes apart, so the agreement is with these addresses;
- bits 5 and 6 must be wrecked as the page says: bit 6 set in three bytes of four, where the game
  sets it in one of five; bit 5 clear at even addresses and set at odd ones;
- the page's own counting (sfLeftover) and drawing (sfFont), run in node on the page's data, must
  give the same counts and must draw each glyph's bytes as four pixels of two bits.

With the tape in work/ (Shadowfire.tap), the bytes are also compared with it byte for byte.

Usage: test_tape_leftover.py
"""
import base64, hashlib, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
SHA = "2c90cb42088dd0d0478b57f827a5c46f7dea6157e1461d1205651805186eb26d"
AT, N = 0x1400, 0xC00
KEPT = (0, 1, 2, 3, 4, 7)


def agree(tape, game, bits):
    return sum(not ((x ^ y) >> b & 1) for x, y in zip(tape, game) for b in bits) / (len(tape) * len(bits))


def main():
    page = open(os.path.join(HERE, "discoveries.html"), encoding="utf-8").read()
    m = re.search(r'<script type="application/json" id="sf-leftover-data">(.*?)</script>', page, re.S)
    assert m, "discoveries.html has no sf-leftover-data block"
    block = json.loads(m.group(1))
    tape = base64.b64decode(block["bytes"])
    assert (block["at"], len(tape)) == (AT, N), (block["at"], len(tape))
    assert hashlib.sha256(tape).hexdigest() == SHA, "the page's bytes are not the 3,072 taken from the tape's block 4"
    item = {i["label"]: i for i in json.load(open(os.path.join(HERE, "media.json")))["items"]}["turbo block 4"]
    assert (item["load"], item["bytes"]) == ("$1400", 11264), (item["load"], item["bytes"])

    path = os.path.join(HERE, "work", "Shadowfire.tap")
    with_tape = os.path.isfile(path)
    if with_tape:
        sys.path.insert(0, os.path.join(ROOT, "kit", "c64"))
        import tap
        blocks = {i["label"]: i["data"] for i in tap.read(path)}
        assert blocks["turbo block 4"][:N] == tape, "the page's bytes are not the tape's"

    ram, has = bytearray(0x10000), bytearray(0x10000)
    for r in json.load(open(os.path.join(HERE, "listing.json")))["records"]:
        for i, v in enumerate(r.get("b") or ()):
            ram[r["a"] + i], has[r["a"] + i] = v, 1
    assert all(has[AT:AT + N]), "the listing does not hold every byte of $1400-$1FFF"
    game = ram[AT:AT + N]

    here = agree(tape, game, KEPT)
    assert here > 0.90, here
    slid = max(agree(tape, ram[AT + d:AT + d + N], KEPT) for d in (-256, -3, -2, -1, 1, 2, 3, 256))
    assert slid < 0.70, slid
    six_tape = sum(x >> 6 & 1 for x in tape) / N
    six_game = sum(x >> 6 & 1 for x in game) / N
    assert six_tape > 0.75 and six_game < 0.20, (six_tape, six_game)
    five_even = sum(x >> 5 & 1 for x in tape[0::2]) / (N // 2)
    five_odd = sum(x >> 5 & 1 for x in tape[1::2]) / (N // 2)
    assert five_even < 0.10 and five_odd > 0.70, (five_even, five_odd)
    # the counters the page reads as a game that had been started: the request byte's bit 7 (a tune
    # started) and bit 0 (tune 1, the one that plays in the game), and the tune being played
    assert tape[0x1600 - AT] & 0x97 == 0x81 and tape[0x161F - AT] & 0x97 == 0x01
    assert ram[0x1600] == 0x00, "the cassette's own copy of the request byte is no longer 0"

    js = r"""
const fs = require('fs'), path = require('path');
const { game } = require(path.join(process.argv[1], 'kit/scripts/port_check.js'));
const g = game(process.argv[2]);
const { sfLeftover, sfFont } = g.run('discoveries.html', 'sf-leftover', 'sfLeftover', 'sfFont');
const page = fs.readFileSync(path.join(process.argv[2], 'discoveries.html'), 'utf8');
const data = JSON.parse(/<script type="application\/json" id="sf-leftover-data">([\s\S]*?)<\/script>/.exec(page)[1]);
const tape = Uint8Array.from(Buffer.from(data.bytes, 'base64')), L = g.listing();
const font = sfFont(tape.subarray(0, 260));
process.stdout.write(JSON.stringify({ counts: sfLeftover(tape, L.ram, data.at), w: font.w, h: font.h, px: Buffer.from(font.px.buffer).toString('base64') }));
"""
    probe = subprocess.run(["node", "-e", js, "--", ROOT, HERE], capture_output=True, text=True)
    if probe.returncode != 0:
        sys.exit("the page's code did not run:\n" + probe.stderr[-2000:])
    got = json.loads(probe.stdout)
    same = [sum(not ((x ^ y) >> b & 1) for x, y in zip(tape, game)) for b in range(8)]
    assert got["counts"]["n"] == N and got["counts"]["same"] == same, (got["counts"], same)
    for b in (5, 6):
        want = [sum(x >> b & 1 for x in tape[par::2]) for par in (0, 1)]
        assert got["counts"]["set"][str(b)] == want, (b, got["counts"]["set"], want)
    px = base64.b64decode(got["px"])
    assert (got["w"], got["h"], len(px)) == (220, 16, 220 * 16 * 4)
    ink = {0: (0, 0, 0), 3: (255, 255, 255)}
    seen, bad = set(), 0
    for c in range(43):
        for r in range(6):
            v = tape[2 + 6 * c + r]
            for k in range(4):
                two = v >> (6 - 2 * k) & 3
                for d in range(2):
                    o = ((c // 22 * 8 + 1 + r) * 220 + c % 22 * 10 + 1 + 2 * k + d) * 4
                    rgb = tuple(px[o:o + 3])
                    seen.add((two, rgb))
                    bad += two in ink and rgb != ink[two]
    assert bad == 0, f"{bad} pixels of paper or ink are drawn in another colour"
    assert len({rgb for _, rgb in seen}) == len({two for two, _ in seen}) == 4, sorted(seen)
    print(f"ok - shadowfire tape leftover: the page's 3,072 bytes are the tape's by their hash"
          + (", and byte for byte by the tape in work/" if with_tape else "")
          + f"; bits 0-4 and 7 agree with the listing at $1400-$1FFF {here:.1%} of the time and at most {slid:.1%} slid aside;"
          + f" bit 6 is set in {six_tape:.0%} (the game: {six_game:.0%}), bit 5 in {five_even:.0%} at even addresses and {five_odd:.0%} at odd;"
          + " the page's counts and its drawing of the font agree")
    return 0


if __name__ == "__main__":
    sys.exit(main())
