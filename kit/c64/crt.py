#!/usr/bin/env python3
"""Read a C64 cartridge image (.crt), and make a part of the game for each of its banks.

A .crt is the cartridge as VICE attaches it: a 64-byte header ("C64 CARTRIDGE   ", its
length, a version, the hardware type, the EXROM and GAME lines, the name), then a CHIP
packet for each chip of ROM: "CHIP", the packet's length, the chip type, the bank
number, the load address and the size, every field big-endian, then the chip's bytes.
A cartridge that switches banks holds more than the machine's 64 KB, and the game reads
some of its banks where they are, without copying them into RAM. Each bank is then a
part of the game (kit/scripts/parts.py): its listing is built from the bank's bytes,
laid over the RAM part the code runs in, and the coverage counts it once.

  info(path)                -> {"name", "type", "exrom", "game", "banks": {n: [(load, bytes)]}}
  image(path, bank=None)    -> 0x10000 bytes: the bank's chips at their load addresses,
                               $00 everywhere else. A file of one bank needs no number.

Usage:
  crt.py <file.crt>                          the header, and each bank: where its chips load,
                                             and which hold one value throughout (blank)
  crt.py parts <game dir> <file.crt> --over <id>
                                             a part for each bank the game has no part for yet,
                                             bank-00, bank-01, ..., over the RAM part <id>, and
                                             in each one's work/ a file of that bank alone,
                                             bank.crt, to start the disassembler on and build
                                             the listing from. Run it again in a new clone:
                                             it writes the work/ files the clone lacks.
"""
import contextlib, io, json, os, struct, sys

MAGIC = b"C64 CARTRIDGE   "
HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.join(os.path.dirname(HERE), "scripts")


def parse(blob, path="the file"):
    """(header bytes, {"name", "type", "exrom", "game"}, [(bank, load, data, packet bytes)])."""
    if not blob.startswith(MAGIC):
        sys.exit(f"{path}: not a cartridge image (expected {MAGIC.decode().strip()!r} at the start)")
    hlen = struct.unpack_from(">I", blob, 0x10)[0]
    if hlen < 0x40 or hlen > len(blob):
        sys.exit(f"{path}: header length {hlen} does not fit the file")
    hw, exrom, game = struct.unpack_from(">HBB", blob, 0x16)
    name = blob[0x20:0x40].split(b"\0")[0].decode("latin-1").strip()
    chips, off = [], hlen
    while off + 16 <= len(blob):
        if blob[off:off + 4] != b"CHIP":
            sys.exit(f"{path}: no CHIP packet at offset {off}")
        plen, _ctype, bank, load, size = struct.unpack_from(">IHHHH", blob, off + 4)
        if plen < 16 + size or off + plen > len(blob) or load + size > 0x10000:
            sys.exit(f"{path}: the CHIP packet at offset {off} does not fit the file or the machine")
        chips.append((bank, load, blob[off + 16:off + 16 + size], blob[off:off + plen]))
        off += plen
    if not chips:
        sys.exit(f"{path}: a cartridge image with no CHIP packet")
    return blob[:hlen], {"name": name, "type": hw, "exrom": exrom, "game": game}, chips


def info(path):
    head, out, chips = parse(open(path, "rb").read(), path)
    out["banks"] = {}
    for bank, load, data, _ in chips:
        out["banks"].setdefault(bank, []).append((load, data))
    return out


def image(path, bank=None):
    """The 64 KB the bank's chips fill at their load addresses, $00 elsewhere."""
    banks = info(path)["banks"]
    if bank is None:
        if len(banks) != 1:
            sys.exit(f"{path} holds {len(banks)} banks: say which (a bank's part names its number in "
                     "part.json), or build from the part's own work/bank.crt")
        bank = next(iter(banks))
    if bank not in banks:
        sys.exit(f"{path} has no bank {bank} (it has {', '.join(map(str, sorted(banks)))})")
    ram = bytearray(0x10000)
    for load, data in banks[bank]:
        ram[load:load + len(data)] = data
    return bytes(ram)


def blank(data):
    """The one value every byte of data holds, or None."""
    return data[0] if data and data.count(data[0]) == len(data) else None


def width(banks):
    return max(2, len(str(max(banks))))


def part_id(n, banks):
    return f"bank-{n:0{width(banks)}d}"


def one_bank(path, bank):
    """The .crt's header and the CHIP packets of one bank: a file of that bank alone."""
    head, _, chips = parse(open(path, "rb").read(), path)
    return head + b"".join(p for b, _, _, p in chips if b == bank)


def make_parts(gdir, path, over):
    sys.path.insert(0, SCRIPTS)
    import parts as P
    found = P.parts(gdir)
    if not found:
        sys.exit(f"{gdir} has no parts: the banks lie over the part the game runs in RAM, so add that "
                 "first (parts.py add <game dir> <id>, with --adopt for an analysis there already is)")
    by = {p["id"]: p for p in found}
    if over not in by:
        sys.exit(f"--over {over}: no such part; the banks lie over the part the game runs in RAM")
    if by[over].get("bank") is not None:
        sys.exit(f"--over {over}: that is a bank; the banks lie over the part the game runs in RAM")
    c = info(path)
    added, wrote = [], []
    for n in sorted(c["banks"]):
        pid = part_id(n, c["banks"])
        d = os.path.join(gdir, "parts", pid)
        f = os.path.join(d, "part.json")
        if pid not in by:
            with contextlib.redirect_stdout(io.StringIO()):
                P.add(gdir, pid, title=f"Bank {n}", over=over)
            own = json.load(open(f))
            chips = c["banks"][n]
            own["ranges"] = [[f"${load:04X}", f"${load + len(data) - 1:04X}"] for load, data in chips]
            out = {"title": own["title"], "order": own["order"], "bank": n}
            out.update({k: v for k, v in own.items() if k not in out})
            for load, data in chips:      # a chip of one value throughout holds nothing to explain
                v = blank(data)
                if v is not None:
                    out["coverage"]["exclude"].append(
                        [f"${load:04X}", f"${load + len(data) - 1:04X}", f"blank: every byte is ${v:02X}"])
            with open(f, "w") as h:
                json.dump(out, h, indent=2)
            added.append(pid)
        elif json.load(open(f)).get("bank") != n:
            sys.exit(f"{os.path.relpath(f)} is not bank {n}'s part: move it, or give it \"bank\": {n}")
        work = os.path.join(d, "work")
        own_crt = os.path.join(work, "bank.crt")
        if not os.path.isfile(own_crt):
            os.makedirs(work, exist_ok=True)
            with open(own_crt, "wb") as h:
                h.write(one_bank(path, n))
            wrote.append(pid)
    rel = os.path.relpath(gdir)
    if added:
        print(f"added {len(added)} part(s), {added[0]} to {added[-1]}, over {over}")
    if wrote:
        print(f"wrote work/bank.crt in {len(wrote)} part folder(s), the bank's bytes alone")
    if not added and not wrote:
        print("every bank has its part and its work/bank.crt already")
    print(f"next, for each bank: python3 kit/scripts/tools.py r2000 {rel}/parts/<bank id>/work/bank.crt\n"
          f"and, once it is annotated: python3 kit/scripts/listing.py {rel}/parts/<bank id> "
          f"{rel}/parts/<bank id>/work/bank.crt\n"
          f'A range the game copies into RAM is another part\'s: list it in the bank\'s part.json under '
          f'coverage.exclude, naming that part (kit/skills/c64/c64-reference, "Bank-switched cartridges").')


def show(path):
    c = info(path)
    print(f"{path}: {c['name'] or '(no name)'}, hardware type {c['type']}, "
          f"EXROM {c['exrom']} and GAME {c['game']} (0 is held low), {len(c['banks'])} bank(s)")
    for n in sorted(c["banks"]):
        parts = []
        for load, data in c["banks"][n]:
            v = blank(data)
            parts.append(f"${load:04X}-${load + len(data) - 1:04X}" + (f" blank (${v:02X})" if v is not None else ""))
        print(f"  bank {n:>3}: " + ", ".join(parts))


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    if argv[0] == "parts":
        if len(argv) != 5 or argv[3] != "--over":
            sys.exit("usage: crt.py parts <game dir> <file.crt> --over <id>")
        make_parts(argv[1], argv[2], argv[4]); return
    show(argv[0])


if __name__ == "__main__":
    main()
