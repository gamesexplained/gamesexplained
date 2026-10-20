#!/usr/bin/env python3
"""Read an Apple II snapshot into a flat 64 KB image.

The kit's Apple II snapshot is the one the kit's server writes (`save` in kit/apple2/apple2ts.py):
JSON, {"format": "apple2ts-kit-snapshot", ...}, around Apple2TS's own save state in "state",
with what the server adds (the random number generator, the inputs held, the disk controller's
private state). Apple2TS keeps memory as pages of 256 bytes: `state.state6502.memvalid` has a "1"
for each page the file holds, in order, in `memory` (base64), and a page it leaves out was all
$FF. Pages 0-255 are main memory, 256-511 the 80-column card's 64K (aux). In each 64K Apple2TS
keeps the language card's bank 1 of $D000-$DFFF at $C000-$CFFF, and bank 2 in place.

`read` returns 0x10000 bytes as the program had them in main memory:

  $0000-$BFFF  main RAM
  $C000-$CFFF  zero: the I/O page and the cards' ROM, never the game
  $D000-$FFFF  main memory's language-card RAM, with the bank of $D000-$DFFF that the switches
               chose when the snapshot was saved (bank 2 unless BSRBANK2 was off). This is RAM
               whether or not the ROM was switched in over it: never the Monitor or Applesoft

`read(path, bank="aux")` returns the same from the auxiliary 64K. `bank` may also name one bank
of the language card, "mainlc1", "mainlc2", "auxlc1" or "auxlc2": that bank at $D000-$FFFF
($E000-$FFFF is the same in both banks of a 64K), zero elsewhere.

  read(path, bank=None) -> bytes, length 0x10000
  spaces(path)          -> {"main", "aux": 48 KB from $0000; "mainlc1" ... "auxlc2": 12 KB from $D000}
  header(path)          -> the registers, the cycle count, the switches, the disks, and what the
                           kit's server recorded

A disk image, an AppleWin or MAME state, and a save file of Apple2TS's own web page are refused,
naming what they are: kit/skills/apple2/tool-apple2ts, "Snapshots".

Usage:
  snapshot.py <file>            print the registers, the switches and the first bytes

Its test is kit/apple2/test_snapshot.py.
"""
import base64, json, os, sys

FORMAT = "apple2ts-kit-snapshot"
PAGES = 256                     # pages in a 64K
LC_SPACES = ("mainlc1", "mainlc2", "auxlc1", "auxlc2")


def load(path):
    """The snapshot as a dict. Exits, saying what it saw, on anything else."""
    if not os.path.isfile(path):
        sys.exit(f"{path}: no such snapshot")
    with open(path, "rb") as f:
        blob = f.read()
    head = blob[:16]
    json_like = head.lstrip()[:1] == b"{"
    if head.startswith((b"WOZ1", b"WOZ2", b"MOOF", b"A2R2", b"A2R3", b"2IMG")) or (
            not json_like and len(blob) in (143360, 116480, 232960)):
        sys.exit(f"{path}: a disk image, not a snapshot. Put it in a drive with `disk`, then `save`: "
                 "kit/skills/apple2/tool-apple2ts, \"Snapshots\"")
    if head.startswith(b"MAMESAVE"):
        sys.exit(f"{path}: a MAME save state, not the kit's snapshot: kit/skills/apple2/tool-apple2ts, \"Snapshots\"")
    if b"AppleWin" in blob[:4096]:
        sys.exit(f"{path}: an AppleWin save state, not the kit's snapshot: kit/skills/apple2/tool-apple2ts, \"Snapshots\"")
    try:
        snap = json.loads(blob)
    except (ValueError, UnicodeDecodeError):
        sys.exit(f"{path}: not the kit's Apple II snapshot (not JSON; {len(blob)} bytes). "
                 "The Apple II's snapshot is the kit's server's: kit/skills/apple2/tool-apple2ts, \"Snapshots\"")
    if isinstance(snap, dict) and snap.get("format") != FORMAT and "state6502" in snap:
        sys.exit(f"{path}: a save file of Apple2TS's web page, not the kit's snapshot. Boot the same disk in the "
                 "kit's server and save there: kit/skills/apple2/tool-apple2ts, \"Snapshots\"")
    if not isinstance(snap, dict) or snap.get("format") != FORMAT:
        sys.exit(f"{path}: JSON, but its format is {snap.get('format') if isinstance(snap, dict) else None!r}, "
                 f"not {FORMAT!r}")
    return snap


def memory(snap, path="the snapshot"):
    """Apple2TS's two 64K arrays as it stores them, {"main": ..., "aux": ...}."""
    try:
        st = snap["state"]["state6502"]
        valid = st["memvalid"]
        data = base64.b64decode(st["memory"])
    except (KeyError, TypeError, ValueError) as e:
        sys.exit(f"{path}: a kit snapshot whose memory cannot be read ({e!r})")
    flags = [c == "1" for c in valid] if isinstance(valid, str) else [bool(v) for v in valid]
    if sum(flags) * 256 != len(data):
        sys.exit(f"{path}: {sum(flags)} pages are marked as held, but the memory holds {len(data)} bytes")
    main, aux = bytearray(b"\xff" * 0x10000), bytearray(b"\xff" * 0x10000)
    k = 0
    for index, held in enumerate(flags):
        if not held:
            continue
        page = data[k * 256:(k + 1) * 256]
        k += 1
        if index < PAGES:
            main[index * 256:(index + 1) * 256] = page
        elif index < 2 * PAGES:
            aux[(index - PAGES) * 256:(index - PAGES + 1) * 256] = page
        # pages past 512 are a RamWorks card's further banks, which the kit's machine does not have
    return {"main": main, "aux": aux}


def _lc(mem, bank):
    """$D000-$FFFF of one 64K with language-card bank `bank` at $D000-$DFFF, 12 KB."""
    low = mem[0xC000:0xD000] if bank == 1 else mem[0xD000:0xE000]
    return bytes(low + mem[0xE000:0x10000])


def spaces(path):
    snap = load(path)
    mem = memory(snap, path)
    out = {"main": bytes(mem["main"][:0xC000]), "aux": bytes(mem["aux"][:0xC000])}
    for name in ("main", "aux"):
        out[name + "lc1"] = _lc(mem[name], 1)
        out[name + "lc2"] = _lc(mem[name], 2)
    return out


def read(path, bank=None):
    """The 64 KB image described above."""
    snap = load(path)
    mem = memory(snap, path)
    image = bytearray(0x10000)
    if bank in LC_SPACES:
        image[0xD000:] = _lc(mem[bank[:-3]], int(bank[-1]))
        return bytes(image)
    if bank not in (None, "main", "aux"):
        sys.exit(f"{path}: bank {bank!r}: main, aux, or one of {', '.join(LC_SPACES)}")
    which = bank or "main"
    switches = snap["state"]["state6502"].get("softSwitches") or {}
    image[0:0xC000] = mem[which][0:0xC000]
    image[0xD000:] = _lc(mem[which], 2 if switches.get("BSRBANK2", True) else 1)
    return bytes(image)


def header(path):
    snap = load(path)
    st = snap["state"]["state6502"]
    s = st.get("s6502") or {}
    sw = st.get("softSwitches") or {}
    drives = (snap["state"].get("driveState") or {}).get("driveState") or []
    return {"model": snap.get("model"), "apple2ts": snap.get("apple2ts"), "saved_by": snap.get("saved_by"),
            "pc": s.get("PC"), "a": s.get("Accum"), "x": s.get("XReg"), "y": s.get("YReg"), "s": s.get("StackPtr"),
            "p": s.get("PStatus"), "cycles": s.get("cycleCount"),
            "switches": {k: v for k, v in sorted(sw.items()) if v},
            "disks": {d.get("drive"): d.get("filename") for d in drives if isinstance(d, dict) and d.get("filename")
                      and not d.get("hardDrive")},
            "mounted": snap.get("mounted"), "held": snap.get("held")}


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    h = header(argv[0])
    print(f"{h['model']} (Apple2TS {h['apple2ts']}), PC ${h['pc']:04X} A ${h['a']:02X} X ${h['x']:02X} "
          f"Y ${h['y']:02X} S ${h['s']:02X} P ${h['p']:02X}, cycle {h['cycles']}")
    print("switches on:", ", ".join(h["switches"]) or "none")
    print("disks:", ", ".join(f"drive {d}: {n}" for d, n in sorted(h["disks"].items())) or "none")
    ram = read(argv[0])
    for a in range(0, 0x40, 16):
        print(f"{a:04X}  {ram[a:a + 16].hex(' ')}")


if __name__ == "__main__":
    main()
