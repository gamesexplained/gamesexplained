#!/usr/bin/env python3
"""What a C64 game's media hold, item by item: the reader kit/scripts/media.py asks.

  items(path) -> {"what": ..., "items": [item, ...], "missing": n}

what is "disk side", "cartridge", "program file" or "tape"; missing counts the sectors the disk's
allocation map marks as used that no file holds and that the image lacks or cannot read (a
format of the game's own). Each item is a dict:

  label    how a person names it: a file's name as the directory shows it, up to its first
           shifted space ($A0), with printable PETSCII as it is and any other byte as {hex}
           (as kit/c64/loads.py writes the names the game asks for); "track 17, sectors 3-7"
           for sectors no file holds; "bank 3" for a cartridge's bank; a tape file's name
           without the spaces that pad it, "NAME (header)" for what its header carries after
           the name, "pulses 52187-60000" for a stretch of tape the kit cannot decode
  place    where it is: {"file": label, "type": "PRG", "track": t, "sector": s},
           {"track": 17, "sectors": [3, 7]}, {"bank": 3}, {"file": label, "type": "program",
           "pulse": n} (n the first pulse of a tape file's first byte, counted from the tape's
           start) or {"pulses": [first, last]}
  load     the address it says it loads at: a file's first two bytes, a bank's lowest chip's,
           the one in a tape file's header, $033C for a header (None for sectors, a stretch
           of tape, and a SEQ, USR or data file)
  data     its bytes as they reach memory: a PRG without its two-byte address
  raw      its bytes on the medium, which the ledger hashes
  problem  why it cannot be read whole (a decoy's chain that leaves the disk), or absent
  blank    True for a bank of one value throughout

A .d64 or .g64 (kit/c64/disk.py): every directory entry whose chain starts on the disk,
scratched ones too, then each run of consecutive sectors on a track that the disk's
allocation map marks as used and that no file holds (what a game reads with the drive's block
commands). A sector the 1541's DOS cannot read is in no item: a disk the game reads in a format
of its own needs a log of what the drive reads. A .crt (kit/c64/crt.py): every bank. A .prg,
or a .p00 (a PRG behind a 26-byte header): the file. A .tap (kit/c64/tap.py): every file in
the KERNAL's own format, a header that carries more than spaces after its name as an item of its
own, and every other stretch of 32 pulses or more that is not a tone as an item of no bytes with
"problem" saying so: a loader's own fast format, to be answered by hand. A .t64 has no reader:
its image is listed with "unread" and no items.

  python3 kit/c64/media.py <image>     the items, one a line
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import disk as disk_mod   # noqa: E402
import crt as crt_mod     # noqa: E402
import tap as tap_mod     # noqa: E402

KINDS = {0: "DEL", 1: "SEQ", 2: "PRG", 3: "USR", 4: "REL"}


def petscii(raw):
    """A name as text: printable PETSCII as it is, any other byte as {hex} (kit/c64/loads.py)."""
    return "".join(chr(b) if 0x20 <= b <= 0x5F else f"{{{b:02X}}}" for b in raw)


def runs(numbers):
    """[[first, last]] of a sorted list of whole numbers, consecutive ones joined."""
    out = []
    for n in numbers:
        if out and n == out[-1][1] + 1:
            out[-1][1] = n
        else:
            out.append([n, n])
    return out


def disk_items(path):
    d = disk_mod.Disk(path)
    out, seen = [], set()
    for e in d.directory():
        if not e["track"]:
            continue                                   # a separator: an entry with no sectors
        raw_name = e["name"].encode("latin-1").split(b"\xa0")[0]
        kind = KINDS.get(e["type"] & 7, f"type {e['type']:02X}")
        sectors, problem = d.follow(e["track"], e["sector"])
        raw = bytearray()
        for ts in sectors:
            p = d.sectors[ts]
            raw += p[2:p[1] + 1] if p[0] == 0 else p[2:]
        item = {"label": petscii(raw_name), "place": {"file": petscii(raw_name), "type": kind,
                                                       "track": e["track"], "sector": e["sector"]},
                "raw": bytes(raw)}
        if kind == "PRG" and len(raw) >= 2:
            item["load"], item["data"] = raw[0] | raw[1] << 8, bytes(raw[2:])
        else:
            item["load"], item["data"] = None, bytes(raw)
        if problem:
            item["problem"] = problem
        if not e["type"] & 0x80:
            item["problem"] = (item.get("problem", "") + "; " if item.get("problem") else "") + "scratched"
        out.append(item)
        seen.update(sectors)
    by_track, missing = {}, 0
    bam = d.sectors[(18, 0)]
    for t in range(1, 36):
        for s in range(disk_mod.SPT[t]):
            used = not (bam[4 * t + 1 + s // 8] >> (s % 8)) & 1
            if not used or t == 18 or (t, s) in seen:
                continue
            if (t, s) in d.sectors and (t, s) not in d.bad:
                by_track.setdefault(t, []).append(s)
            else:
                missing += 1
    for t in sorted(by_track):
        for a, b in runs(sorted(by_track[t])):
            raw = b"".join(bytes(d.sectors[(t, s)]) for s in range(a, b + 1))
            label = f"track {t}, sector {a}" if a == b else f"track {t}, sectors {a}-{b}"
            out.append({"label": label, "place": {"track": t, "sectors": [a, b]}, "load": None,
                        "data": raw, "raw": raw})
    return {"what": "disk side", "items": out, "missing": missing}


def crt_items(path):
    info = crt_mod.info(path)
    out = []
    for n in sorted(info["banks"]):
        chips = sorted(info["banks"][n])
        raw = b"".join(data for _, data in chips)
        item = {"label": f"bank {n}", "place": {"bank": n}, "load": chips[0][0], "data": raw, "raw": raw}
        if raw and len(set(raw)) == 1:
            item["blank"] = True
        out.append(item)
    return {"what": "cartridge", "items": out}


def program_items(path):
    with open(path, "rb") as f:
        blob = f.read()
    name = os.path.basename(path)
    if path.lower().endswith(".p00"):
        if not blob.startswith(b"C64File\0") or len(blob) < 28:
            sys.exit(f"{path}: not a PC64 file (expected C64File at the start)")
        name, blob = petscii(blob[8:24].split(b"\0")[0]), blob[26:]
    if len(blob) < 2:
        sys.exit(f"{path}: too short to hold a load address")
    return {"what": "program file", "items": [{"label": name, "place": {"file": name, "type": "PRG"},
                                               "load": blob[0] | blob[1] << 8, "data": blob[2:], "raw": blob}]}


def items(path):
    """What one image holds; for an image the kit cannot read yet, no items and "unread", why."""
    low = path.lower()
    if low.endswith((".d64", ".g64")):
        return disk_items(path)
    if low.endswith(".crt"):
        return crt_items(path)
    if low.endswith((".prg", ".p00")):
        return program_items(path)
    if low.endswith(".tap"):
        return {"what": "tape", "items": tap_mod.read(path)}
    kind = "tape" if low.endswith(".t64") else "image"
    return {"what": kind, "items": None,
            "unread": f"the kit has no reader for a {os.path.splitext(low)[1] or 'file'} yet"}


def main():
    if len(sys.argv) != 2 or sys.argv[1] in ("-h", "--help"):
        print(__doc__)
        return 0
    got = items(sys.argv[1])
    if got.get("unread"):
        print(f"{sys.argv[1]}: {got['unread']}")
        return 0
    its = got["items"]
    print(f"{sys.argv[1]}: a {got['what']}, {len(its)} items"
          + (f", {got['missing']} used sectors it cannot read" if got.get("missing") else ""))
    for it in its:
        at = f" at ${it['load']:04X}" if it.get("load") is not None else ""
        print(f"  {it['label']:<24} {len(it['data']):6} bytes{at}" + (f"  ({it['problem']})" if it.get("problem") else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
