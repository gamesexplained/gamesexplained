#!/usr/bin/env python3
"""The Apple II's media reader (kit/apple2/media.py) and its read log (kit/apple2/readlog.py) on a
made-up disk.

The disk is written here as a WOZ 2, bit by bit: tracks of 16 sectors as DOS writes them, one
whose data fields open with other nibbles, one with three sectors damaged, one of zeros, one of
13 sectors, and tracks in a format no table decodes, among them a half track. The read log
beside it is made as the emulator makes one: runs of bytes, each with its track and its address,
among them a run read twice, a run in zero page, runs that carry on from one another and three
different runs to one address. Each item's label, place, bytes, pieces and problem are checked.
The same disk as a .dsk gives its sectors with no log. Then the disk goes through the ledger
(kit/scripts/media.py) for a game of two parts that share code: a track whose runs lie apart in
memory, and a track whose sectors lie in another order, must each be found in the right part.
No game's bytes are used.

Usage: test_media.py
"""
import base64, json, os, random, struct, subprocess, sys, tempfile, zlib
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
sys.path[:] = [p for p in sys.path if os.path.abspath(p) != HERE]     # media.py here shadows the ledger's
sys.path.insert(0, os.path.join(KIT, "scripts"))
import media as M  # noqa: E402

R = M.reader("apple2")
D = R._module("disk")
LOG = R._module("readlog")
BITS = [format(b, "08b") for b in range(256)]


def chain(values, table):
    out, before = bytearray(), 0
    for v in values:
        out.append(table[v ^ before])
        before = v
    out.append(table[before])
    return bytes(out)


def enc62(data):
    low = []
    for k in range(86):
        v = 0
        for j, i in enumerate((k, k + 86, k + 172)):
            if i < 256:
                v |= ((data[i] & 1) << 1 | data[i] >> 1 & 1) << 2 * j
        low.append(v)
    return chain(low + [b >> 2 for b in data], D.WRITE62)


def enc53(data):
    top, low = [0] * 256, [0] * 154
    for g in range(51):
        i, b = 50 - g, data[5 * g:5 * g + 5]
        for j in range(5):
            top[51 * j + i] = b[j] >> 3
        for j in range(3):
            low[51 * j + i] = (b[j] & 7) << 2 | (b[3] >> (2 - j) & 1) << 1 | b[4] >> (2 - j) & 1
    top[255], low[153] = data[255] >> 3, data[255] & 7
    return chain(low[::-1] + top, D.WRITE53)


def track(sectors, trk, n=16, data_mark=b"\xd5\xaa\xad", damaged=()):
    """One track's bits: each sector an address field and a data field, with sync between."""
    enc, mark = (enc62, b"\xd5\xaa\x96") if n == 16 else (enc53, b"\xd5\xaa\xb5")
    bits = ""
    for p in range(n):
        addr = b"".join(bytes([v >> 1 | 0xAA, v | 0xAA]) for v in (254, trk, p, 254 ^ trk ^ p))
        field = bytearray(enc(sectors[p]))
        if p in damaged:
            field[-1] = (D.WRITE62 if n == 16 else D.WRITE53)[0] if field[-1] != D.WRITE62[0] else D.WRITE62[1]
        for sync, nibs in ((20, mark + addr + b"\xde\xaa\xeb"), (6, data_mark + bytes(field) + b"\xde\xaa\xeb")):
            bits += "1111111100" * sync + "".join(BITS[b] for b in nibs)
    return bits


def own_format(rnd, nibbles=3000):
    """A track of nibbles that are no sector of DOS's."""
    return "1111111100" * 30 + "".join(BITS[rnd.choice(b"\xaa\xab\xae\xba\xbb\xee\xfa\xfe")] for _ in range(nibbles))


def woz2(images):
    """A WOZ 2 of {quarter track: bits}."""
    tmap, entries, data, block = bytearray(b"\xff" * 160), bytearray(1280), b"", 3
    for i, (q, bits) in enumerate(sorted(images.items())):
        tmap[q] = i
        raw = int(bits + "0" * (-len(bits) % 8), 2).to_bytes(-(-len(bits) // 8), "big")
        count = -(-len(raw) // 512)
        struct.pack_into("<HHI", entries, 8 * i, block, count, len(bits))
        data += raw.ljust(512 * count, b"\0")
        block += count
    info = bytearray(60)
    info[0:5] = bytes([2, 1, 1, 0, 1])
    info[5:37] = b"test_media.py".ljust(32, b" ")
    info[37:40] = bytes([1, 1, 32])
    chunk = lambda name, body: name + struct.pack("<I", len(body)) + body
    body = chunk(b"INFO", bytes(info)) + chunk(b"TMAP", bytes(tmap)) + chunk(b"TRKS", bytes(entries) + data)
    return b"WOZ2\xff\x0a\x0d\x0a" + struct.pack("<I", zlib.crc32(body)) + body


def pattern(t, s):
    return bytes((t * 53 + s * 17 + i * (7 + 2 * s) + (i >> 3)) & 0xFF for i in range(256))


def run_of(track_no, address, data, pc=0x5756):
    return {"drive": 1, "track": track_no, "address": address, "length": len(data), "cycle": 0, "pc": pc,
            "data": base64.b64encode(data).decode()}


def ledger(*args):
    r = subprocess.run([sys.executable, os.path.join(KIT, "scripts", "media.py"), *map(str, args)],
                       capture_output=True, text=True)
    assert r.returncode == 0, f"media.py {' '.join(map(str, args))}\n{r.stdout}{r.stderr}"
    return r.stdout


def main():
    rnd = random.Random(1984)
    tmp = Path(tempfile.mkdtemp())
    T = {t: {s: pattern(t, s) for s in range(16)} for t in (0, 1, 2)}
    T[3] = {s: bytes(256) for s in range(16)}
    T[7] = {s: pattern(7, s) for s in range(13)}
    images = {0: track(T[0], 0), 4: track(T[1], 1, data_mark=b"\xd5\xaa\xbc"), 8: track(T[2], 2, damaged=(3, 4, 9)),
              12: track(T[3], 3), 16: own_format(rnd), 18: own_format(rnd), 20: own_format(rnd),
              24: own_format(rnd), 28: track(T[7], 7, n=13)}
    disk = tmp / "side a.woz"
    disk.write_bytes(woz2(images))

    # with no log: the sectors read, and the other tracks say what is missing
    its = {i["label"]: i for i in R.items(str(disk))["items"]}
    assert list(its) == ["track 0", "track 1", "track 2", "track 3", "track 4", "track 4.5", "track 5", "track 6",
                         "track 7"], list(its)
    assert "no read log beside it" in its["track 4"]["problem"] and its["track 4"]["data"] == b""
    assert its["track 4"]["place"] == {"track": 4, "nibbles": 3030}, its["track 4"]["place"]

    # the log, as the emulator gives its runs
    game, more, half = rnd.randbytes(768), rnd.randbytes(256), rnd.randbytes(512)
    over = [rnd.randbytes(256) for _ in range(3)]
    runs = [run_of(4, 0x1000, game[:256]), run_of(4, 0x1100, game[256:]),        # the second carries on
            run_of(4, 0x0000, bytes(256)), run_of(4, 0x00F0, bytes(200)),      # zero page, and the stack's page
            run_of(4, 0xA000, more), run_of(4, 0x1000, game[:256]),            # read again
            run_of(4.5, 0x6000, half), run_of(6, 0x4000, over[0]), run_of(6, 0x4000, over[1]),
            run_of(6, 0x4000, over[2]), run_of(9, 0x2000, bytes(64))]          # a track the image does not have
    first = LOG.add(str(disk), runs, 64)
    assert (first["runs"], first["added"]) == (10, 10), first               # the run read again is in once
    again = LOG.add(str(disk), runs[:5], 64)
    assert (again["runs"], again["added"]) == (10, 0), again
    assert Path(LOG.path_of(str(disk))).name == "side a.woz.reads.json"

    got = R.items(str(disk))
    assert got["what"] == "disk side"
    its = {i["label"]: i for i in got["items"]}
    t0 = its["track 0"]
    assert t0["place"] == {"track": 0, "read": "16 sectors"} and t0["data"] == b"".join(T[0][s] for s in range(16))
    assert t0["pieces"] == [(None, T[0][s]) for s in range(16)] and "problem" not in t0 and "blank" not in t0
    assert its["track 1"]["data"] == b"".join(T[1][s] for s in range(16)), "data fields that open D5 AA BC"
    t2 = its["track 2"]
    assert t2["problem"] == "sectors 3-4, 9 could not be read" and len(t2["data"]) == 13 * 256, t2["problem"]
    assert its["track 3"]["blank"] is True
    t4 = its["track 4"]
    assert t4["place"] == {"track": 4, "read": "by the game", "to": ["$1000", "$A000"]}, t4["place"]
    assert t4["pieces"] == [(0x1000, game), (0xA000, more)] and t4["data"] == game + more and t4["load"] is None
    h = its["track 4.5"]
    assert h["place"]["track"] == 4.5 and h["load"] == 0x6000 and h["data"] == half
    assert "the read log holds nothing from this track" in its["track 5"]["problem"]
    t6 = its["track 6"]
    assert t6["pieces"] == [(0x4000, x) for x in over] and t6["problem"].startswith(
        "the game read 3 different runs of bytes to $4000"), t6.get("problem")
    t7 = its["track 7"]
    assert t7["place"] == {"track": 7, "read": "13 sectors"} and t7["data"] == b"".join(T[7][s] for s in range(13))

    # a log made from another file is refused
    other = tmp / "changed.woz"
    other.write_bytes(disk.read_bytes())
    os.replace(LOG.path_of(str(disk)), LOG.path_of(str(other)))
    LOG.add(str(other), [], 64)
    other.write_bytes(woz2({0: images[0]}))
    try:
        R.items(str(other))
        raise AssertionError("a log made from another file was read")
    except SystemExit as e:
        assert "made from another file" in str(e), e
    LOG.add(str(disk), runs, 64)

    # a sector image: its sectors, and no log
    dsk = tmp / "plain.dsk"
    order = [0, 7, 14, 6, 13, 5, 12, 4, 11, 3, 10, 2, 9, 1, 8, 15]              # physical sector -> its place in a .dsk
    blob = bytearray(35 * 16 * 256)
    for p in range(16):
        blob[order[p] * 256:(order[p] + 1) * 256] = T[0][p]
    dsk.write_bytes(blob)
    plain = R.items(str(dsk))["items"]
    assert len(plain) == 35 and plain[0]["data"] == t0["data"] and plain[0]["raw"] == t0["raw"]
    assert all(i.get("blank") for i in plain[1:])
    assert R.items(str(tmp / "nothing.woz"))["items"] is None

    # through the ledger: two parts that share the code at $1000, and sectors in another order
    g = tmp / "game"
    for pid, recs in (("one", [{"a": 0x1000, "b": list(game)}, {"a": 0x3000, "b": list(rnd.randbytes(512))}]),
                      ("two", [{"a": 0x1000, "b": list(game)}, {"a": 0xA000, "b": list(more)}]
                       + [{"a": 0x2000 + 256 * (15 - s), "b": list(T[0][s])} for s in range(16)])):
        (g / "parts" / pid).mkdir(parents=True)
        (g / "parts" / pid / "listing.json").write_text(json.dumps({"records": recs}))
        (g / "parts" / pid / "part.json").write_text(json.dumps({"title": pid, "order": len(pid)}))
    meta = {"platform": "apple2", "tier": "silver", "created": "2099-01-01"}
    (g / "game.json").write_text(json.dumps(meta))
    ledger("scan", g, f"side-a={disk}", f"copy={dsk}")
    it = {(i["image"], i["label"]): i for i in json.loads((g / "media.json").read_text())["items"]}
    t4 = it["side-a", "track 4"]
    assert (t4["answer"], t4["part"], t4["at"], t4["matched"]) == ("part", "two", "$1000", 1024), t4
    t0 = it["side-a", "track 0"]
    assert (t0["answer"], t0["part"], t0["matched"], t0["also"]) == ("part", "two", 4096, ["copy"]), t0
    assert len(it["side-a", "track 3"]["also"]) == 34, it["side-a", "track 3"]["also"][:3]
    assert it["side-a", "track 3"]["answer"] == "unused" and it["side-a", "track 5"]["answer"] == "open"
    ledger("answer", g, "*", "data", "--why", "made for the test", "--open-only")
    assert M.problems(str(g), meta) == [], M.problems(str(g), meta)
    s = M.summary(str(g))
    assert (s["tracks"], s["files"], s["runs"], s["copies"]) == (9, 0, 0, 35), s    # the copy's 34 tracks of zeros are track 3
    import build
    row = build.media_row(str(g))
    assert ">Counting each copy once, the 2 disk sides hold 9 tracks." in row, row

    print(f"ok - apple2 media.py: {len(its)} tracks of a made-up disk read as they must, from their sectors and "
          "from a read log, and the ledger finds them in a game of two parts")
    return 0


if __name__ == "__main__":
    sys.exit(main())
