#!/usr/bin/env python3
"""The RAM banks of a 128K Spectrum snapshot, and a part of the game for each one.

A 128K machine has eight banks of 16 KB. The CPU sees three at a time: bank 5
at $4000, bank 2 at $8000 and, at $C000, whichever bank the last write to
$7FFD named (kit/skills/spectrum/zx-spectrum-reference, "$7FFD"). A game that
keeps code or data in the other banks holds more than one 64 KB image of the
machine shows, so each of those banks is a part of the game
(kit/scripts/parts.py): its listing is built from the bank's own bytes, laid
over the part the CPU sees, at $C000-$FFFF, and the coverage counts it once.

The part beneath (the RAM part) keeps $4000-$FFFF as the snapshot shows it,
the bank paged in at $C000 included: that bank is the RAM part's, and has no
part of its own. Banks 5 and 2 never do.

Usage:
  banks.py <file.sna>                        the paging, and each bank: where the CPU saw it,
                                             and which hold one value throughout (blank)
  banks.py parts <game dir> <file.sna> --over <id>
                                             a part for each bank the CPU did not see in this
                                             snapshot, bank-0N, titled "Bank N", over the RAM
                                             part <id>, and in each one's work/ a copy of the
                                             snapshot, entry.sna, to build the bank's listing
                                             from (listing.py reads its "bank" from part.json).
                                             Run it again in a new clone: it writes the work/
                                             files the clone lacks.
"""
import contextlib, io, json, os, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.join(os.path.dirname(HERE), "scripts")
sys.path.insert(0, HERE)
import snapshot                                                    # noqa: E402

SEEN = {5: "$4000", 2: "$8000"}


def blank(data):
    """The one value a bank holds throughout, or None."""
    return data[0] if data.count(data[0]) == len(data) else None


def unseen(b):
    """The banks the CPU did not see when the snapshot was taken, in order."""
    return [n for n in range(8) if n not in SEEN and n != b["paged"]]


def show(path):
    b = snapshot.banks(path)
    print(f"{path}: 128K .sna, PC=${b['pc']:04X}, $7FFD=${b['port']:02X}: bank {b['paged']} at $C000")
    for n in range(8):
        where = SEEN.get(n) or ("$C000" if n == b["paged"] else "not seen")
        v = blank(b["banks"][n])
        print(f"  bank {n}: {where:9s}" + (f" blank (${v:02X})" if v is not None else ""))


def make_parts(gdir, path, over):
    sys.path.insert(0, SCRIPTS)
    import parts as P
    found = P.parts(gdir)
    if not found:
        sys.exit(f"{gdir} has no parts: the banks lie over the part the CPU sees, so add that first "
                 "(parts.py add <game dir> <id>, with --adopt for an analysis there already is)")
    by = {p["id"]: p for p in found}
    if over not in by:
        sys.exit(f"--over {over}: no such part; the banks lie over the part the CPU sees")
    if by[over].get("bank") is not None:
        sys.exit(f"--over {over}: that is a bank; the banks lie over the part the CPU sees")
    b = snapshot.banks(path)
    added, wrote = [], []
    for n in unseen(b):
        pid = f"bank-{n:02d}"
        d = os.path.join(gdir, "parts", pid)
        f = os.path.join(d, "part.json")
        if pid not in by:
            with contextlib.redirect_stdout(io.StringIO()):
                P.add(gdir, pid, title=f"Bank {n}", over=over)
            own = json.load(open(f))
            own["ranges"] = [["$C000", "$FFFF"]]
            out = {"title": own["title"], "order": own["order"], "bank": n}
            out.update({k: v for k, v in own.items() if k not in out})
            v = blank(b["banks"][n])
            if v is not None:          # a bank of one value throughout holds nothing to explain
                out["coverage"]["exclude"].append(["$C000", "$FFFF", f"blank: every byte is ${v:02X}"])
            with open(f, "w") as h:
                json.dump(out, h, indent=2)
            added.append(pid)
        elif json.load(open(f)).get("bank") != n:
            sys.exit(f"{os.path.relpath(f)} is not bank {n}'s part: move it, or give it \"bank\": {n}")
        work = os.path.join(d, "work")
        own_sna = os.path.join(work, "entry.sna")
        if not os.path.isfile(own_sna):
            os.makedirs(work, exist_ok=True)
            shutil.copyfile(path, own_sna)
            wrote.append(pid)
    rel = os.path.relpath(gdir)
    if added:
        print(f"added {len(added)} part(s), {', '.join(added)}, over {over}")
    if wrote:
        print(f"copied the snapshot to work/entry.sna in {len(wrote)} part folder(s)")
    if not added and not wrote:
        print("every bank has its part and its work/entry.sna already")
    print(f"next, for each bank, once it is annotated: python3 kit/scripts/listing.py "
          f"{rel}/parts/<bank id> {rel}/parts/<bank id>/work/entry.sna\n"
          f"A range the game copies out of a bank into the RAM the CPU sees is counted where it lands: "
          f"list it in the bank's part.json under coverage.exclude, naming that part.")


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    if argv[0] == "parts":
        if len(argv) != 5 or argv[3] != "--over":
            sys.exit("usage: banks.py parts <game dir> <file.sna> --over <id>")
        make_parts(argv[1], argv[2], argv[4]); return
    show(argv[0])


if __name__ == "__main__":
    main()
