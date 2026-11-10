#!/usr/bin/env python3
"""The read log of an Apple II disk: what the game's own loader got from each track.

A protected original has no catalog and often no sector DOS could read: the game's loader is
the only program that knows the format. So the kit lets the loader do the reading. While the
emulator's `reads` records (kit/apple2/apple2ts.py, kit/skills/apple2/tool-apple2ts, "Disks"),
it keeps every run of bytes the processor stores just after it has read the disk, with the
track the head was on and the address the run went to. This module keeps those runs beside the
image, in <image>.reads.json, and kit/apple2/media.py lists the disk's tracks from them. The
log holds the game's bytes, so it stays in work/ with the image and is never committed.

  {"format": "kit-apple2-reads", "image": {"file": "disk.woz", "sha256": "..."}, "window": 64,
   "runs": [{"track": 7.0, "address": 4096, "pc": 22345, "data": "<base64>"}, ...]}

A run that another run of the log equals (the same track, address and bytes) is kept once,
so reading a track twice, in one session or in two, adds nothing. Two runs to one address
with different bytes are both kept: a loader may read one sector over another, and a damaged
sector may read differently each time.

Usage: readlog.py <image>      what the log beside the image holds, track by track
"""
import base64, collections, hashlib, json, os, sys

FORMAT = "kit-apple2-reads"
SUFFIX = ".reads.json"


def path_of(image):
    return image + SUFFIX


def sha256(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def load(image):
    """The log beside an image: [(track, address, bytes, pc)] in the order read, or None when
    there is none. A log made from another file of the same name is refused."""
    p = path_of(image)
    if not os.path.isfile(p):
        return None
    with open(p) as f:
        log = json.load(f)
    if log.get("format") != FORMAT:
        raise SystemExit(f"{p}: not a read log ({FORMAT})")
    if log["image"]["sha256"] != sha256(image):
        raise SystemExit(f"{p}: made from another file than {image} (their SHA-256 differ); delete it and log again")
    return [(x["track"], x["address"], base64.b64decode(x["data"]), x.get("pc")) for x in log["runs"]]


def add(image, runs, window=None):
    """Add the emulator's runs ({"track", "address", "data", "pc"}) to the image's log, each
    different run once. Returns {"path", "runs", "added", "bytes"}."""
    old = load(image) or []
    seen = {(t, a, d) for t, a, d, _ in old}
    out = list(old)
    for x in runs:
        key = (x["track"], x["address"], base64.b64decode(x["data"]))
        if key not in seen:
            seen.add(key)
            out.append((*key, x.get("pc")))
    p = path_of(image)
    tmp = p + ".tmp"
    with open(tmp, "w") as f:
        json.dump({"format": FORMAT, "image": {"file": os.path.basename(image), "sha256": sha256(image)},
                   "window": window,
                   "runs": [{"track": t, "address": a, "pc": pc, "data": base64.b64encode(d).decode()}
                            for t, a, d, pc in out]}, f)
    os.replace(tmp, p)
    return {"path": p, "runs": len(out), "added": len(out) - len(old), "bytes": sum(len(d) for _, _, d, _ in out)}


def main():
    if len(sys.argv) != 2 or sys.argv[1] in ("-h", "--help"):
        print(__doc__)
        return 0
    runs = load(sys.argv[1])
    if runs is None:
        print(f"{sys.argv[1]}: no log beside it ({path_of(sys.argv[1])})")
        return 0
    by = collections.defaultdict(list)
    for t, a, d, _ in runs:
        by[t].append(f"${a:04X}+{len(d)}")
    print(f"{path_of(sys.argv[1])}: {len(runs)} runs, {sum(len(d) for _, _, d, _ in runs):,} bytes")
    for t in sorted(by):
        print(f"  track {t:g}: " + " ".join(by[t]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
