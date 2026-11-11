#!/usr/bin/env python3
"""The Apple II's media reader for the media ledger (kit/scripts/media.py): every track of a disk.

  items(path) -> {"what": "disk side", "items": [item, ...]}, or for an image that cannot be
                 read {"what": ..., "items": None, "unread": why}

An Apple II game's disk often has no catalog, and a protected original no sector DOS could
read, so the unit here is the track: one item for each track image the file holds (a WOZ keeps
one for a half or quarter track too, when the disk has data there). Its bytes come from the
first of these that gives any:

  1. The track's own sectors, when it is written as DOS writes one: 16 sectors (address fields
     D5 AA 96) or 13 (D5 AA B5), whatever nibbles open a data field, read by kit/apple2/disk.py.
     Half of a track's sectors or more must read. A sector the game never asks for is listed
     with the rest, which is the point of reading the disk and not the game.
  2. The read log beside the image, <image>.reads.json (kit/apple2/readlog.py), for a track in
     a format of the game's own: the bytes the game's loader stored while the head was on the
     track, in the order it stored them, each run with the address it went to. Runs that lie
     below $0200 are left out: zero page and the stack are the loader's own.
  3. Neither: the item has no bytes and says so, and is answered by hand.

An item:

  label    "track 7", "track 2.25"
  place    {"track": 7, "read": "16 sectors"} or {"track": 7, "read": "by the game",
           "to": ["$1C00", "$A000"]} or {"track": 7, "nibbles": 6381}
  load     the address, when the game read the track as one run
  data     the bytes, the sectors in the order of their numbers or the runs in the order read
  pieces   [(address or None, bytes)]: each sector, or each run, which the ledger looks for in
           the listings one at a time, since a track's sectors need not be neighbours in memory
  raw      what the item's hash is taken of: the bytes with each sector's number or each run's
           address, so two sides of a disk that hold the same track list it once
  problem  what could not be read, or that the game read three or more different runs of bytes
           to one address
  blank    True when every byte of every sector is the same

Usage: media.py <image>        list the image's tracks
"""
import importlib.util, os, sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
OWN = 0x0200          # a run that ends below this is the loader's own: zero page and the stack
AGAIN = 3             # this many different runs to one address are worth a word in the item


def _module(name):
    """kit/apple2/<name>.py by its path: the ledger loads this file as `media` beside its own."""
    full = f"kit_apple2_{name}"
    if full not in sys.modules:
        spec = importlib.util.spec_from_file_location(full, os.path.join(HERE, name + ".py"))
        mod = importlib.util.module_from_spec(spec)
        sys.modules[full] = mod
        spec.loader.exec_module(mod)
    return sys.modules[full]


def number(q):
    """A quarter track as a track number: 28 -> 7, 9 -> 2.25."""
    return q // 4 if q % 4 == 0 else q / 4


def standard(d, q):
    """({sector number: its 256 bytes}, sectors a track) of the track image at quarter track q,
    read as DOS's 16 or 13 sectors. A sector counts when its address field and its data's
    checksum are right, whatever nibbles end the fields and whatever three open its data."""
    if d.kind == "sectors":
        tr = d.sectors(q // 4)
        return {k: tr.data(k) for k in range(d.marks.sectors) if tr.data(k) is not None}, d.marks.sectors
    seen = d._marks_read(q)
    best = ({}, 16)
    for n in (16, 13):
        if not seen[n]:
            continue
        got, tried, todo = {}, set(), [None]
        while todo:
            mark = todo.pop()
            tr = d.sectors(q // 4, q % 4, sectors=n, data=mark, lenient=True)
            for s in tr.fields:
                if s.data is not None and s.number < n and all("epilogue" in p for p in s.problems):
                    got.setdefault(s.number, s.data)
                other = s.seen.get("data")
                if s.data is None and other and len(other) == 3 and bytes(other) not in tried:
                    tried.add(bytes(other))
                    todo.append(bytes(other))
        if len(got) > len(best[0]):
            best = (got, n)
    return best


def logged(d, image):
    """{track image: [(address, bytes)]} from the read log beside the image, each different run
    once, in the order read, with a run that carries straight on from the one before joined to
    it. None when the image has no log."""
    runs = _module("readlog").load(image)
    if runs is None:
        return None
    out = {}
    for track, address, data, _ in runs:
        q = round(track * 4)
        if address + len(data) <= OWN or not 0 <= q < len(d.tmap) or d.tmap[q] == 0xFF:
            continue
        mine = out.setdefault(d.tmap[q], [])
        if (address, data) in mine:
            continue
        if mine and mine[-1][0] + len(mine[-1][1]) == address:
            mine[-1] = (mine[-1][0], mine[-1][1] + data)
        else:
            mine.append((address, data))
    return out


def ranges(nums):
    out, nums = [], sorted(nums)
    for n in nums:
        if out and n == out[-1][1] + 1:
            out[-1][1] = n
        else:
            out.append([n, n])
    return ", ".join(f"{a:X}" if a == b else f"{a:X}-{b:X}" for a, b in out)


def track_item(d, q, log):
    sectors, n = standard(d, q)
    runs = (log or {}).get(d.tmap[q], []) if d.kind != "sectors" else []
    label, t = f"track {q / 4:g}", number(q)
    if sectors and (len(sectors) * 2 >= n or not runs):
        order = sorted(sectors)
        data = b"".join(sectors[k] for k in order)
        item = {"label": label, "place": {"track": t, "read": f"{n} sectors"}, "load": None, "data": data,
                "pieces": [(None, sectors[k]) for k in order],
                "raw": bytes([n]) + b"".join(bytes([k]) + sectors[k] for k in order)}
        if len(order) < n:
            item["problem"] = f"sector{'s' if n - len(order) > 1 else ''} {ranges(set(range(n)) - set(order))} could not be read"
        elif len(set(data)) == 1:
            item["blank"] = True
        return item
    if runs:
        to = Counter(a for a, _ in runs)
        item = {"label": label, "place": {"track": t, "read": "by the game", "to": [f"${a:04X}" for a in to]},
                "load": runs[0][0] if len(runs) == 1 else None, "data": b"".join(x for _, x in runs),
                "pieces": list(runs), "raw": b"".join(a.to_bytes(2, "little") + x for a, x in runs)}
        again = [(a, k) for a, k in to.items() if k >= AGAIN]
        if again:
            item["problem"] = ("; ".join(f"the game read {k} different runs of bytes to ${a:04X}" for a, k in again)
                               + ": a sector that reads differently each time, or sectors read one over another")
        return item
    nibs = b"" if d.kind == "sectors" else (d.track_nibbles(q // 4, q % 4) or b"")
    why = ("the read log holds nothing from this track" if log is not None
           else "the image has no read log beside it (kit/apple2/readlog.py)")
    return {"label": label, "place": {"track": t, "nibbles": len(nibs)}, "load": None, "data": b"", "pieces": [],
            "raw": bytes(nibs),
            "problem": (f"{len(nibs):,} nibbles in no format the kit reads, and {why}" if nibs
                        else "no bits: the track was never written")}


def items(path):
    """What one image holds; for an image the kit cannot read, no items and "unread", why."""
    D = _module("disk")
    try:
        d = D.open(path)
    except SystemExit as e:
        return {"what": "disk side", "items": None, "unread": str(e)}
    log = logged(d, path) if d.kind != "sectors" else None
    return {"what": "disk side", "items": [track_item(d, q, log) for q in d.positions()]}


def main():
    if len(sys.argv) != 2 or sys.argv[1] in ("-h", "--help"):
        print(__doc__)
        return 0
    got = items(sys.argv[1])
    if got.get("unread"):
        print(f"{sys.argv[1]}: {got['unread']}")
        return 0
    its = got["items"]
    print(f"{sys.argv[1]}: a {got['what']}, {len(its)} tracks")
    for it in its:
        p = it["place"]
        how = p.get("read", "") + (" to " + " ".join(p["to"]) if p.get("to") else "")
        print(f"  {it['label']:<11} {len(it['data']):6} bytes  {how}"
              + ("  blank" if it.get("blank") else "") + (f"  ({it['problem']})" if it.get("problem") else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
