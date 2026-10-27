#!/usr/bin/env python3
"""The string sweep of kit/skills/core/40-sweep: every run of text in the image, in each of the
machine's text encodings.

For any machine with a kit/<platform>/cpu.py. Reads every byte as each of the machine's text
types (TEXT_TYPES, less those whose items run over many bytes, such as a BASIC program) and
prints each run of printable characters at least --min long that reads as text (is_text(); --all
prints every run), with its address, the encodings that read it the same, and the type of the
block it starts in. A run starts at its first character, less a few that read as letters and run
into its first word in a case text never writes (lead()). A run that two encodings read alike is printed once.

Usage:
  strings.py <game or part dir> [<snapshot>] [--min 5] [--all]

The bytes come from the snapshot when one is given, otherwise from the folder's listing.json,
less what game.json and the platform exclude; the blocks from symbols.json, when there is one.

What a byte reads as is the machine's: `sweep_runs(kind, ram)` in its cpu.py, when it has one,
gives each run of characters as (first, last, text), and may read a run whole (the C64's screen
codes are in one of two character sets, and the capitals of the second sit where the first has
graphics); otherwise each byte is text_decode(kind, byte), and the dot text_decode gives an
unprintable byte ends a run. What it cannot see: text packed or tokenised by the game's own scheme, and a
custom character set (kit/skills/core/30-text).
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "scripts"))


def default_runs(cpu, kind, ram):
    """[(first, last, text)] of each run of text_decode's characters, where its dot is a period
    only for a byte whose low seven bits are $2E."""
    out, start = [], None
    for a in range(len(ram) + 1):
        c = cpu.text_decode(kind, ram[a]) if a < len(ram) else ""
        if len(c) == 1 and c.isprintable() and (c != "." or ram[a] & 0x7F == 0x2E):
            if start is None:
                start, text = a, []
            text.append(c)
        elif start is not None:
            out.append((start, a - 1, "".join(text)))
            start = None
    return out


def sweep_kinds(cpu):
    return [k for k in cpu.TEXT_TYPES
            if not (hasattr(cpu, "text_items") and cpu.text_items(k, bytes(4), 0, 3) is not None)]


def known_runs(runs, known):
    """The runs, split where a byte is not the game's."""
    for lo, hi, s in runs:
        start = None
        for a in range(lo, hi + 2):
            if a <= hi and known[a]:
                start = a if start is None else start
            elif start is not None:
                yield start, a - 1, s[start - lo:a - lo]
                start = None


# The fifty pairs of letters most common in English text: about half of its pairs, and one in
# fifteen of a run of random letters.
PAIRS = set("""TH HE IN ER AN RE ON AT EN ND TI ES OR TE OF ED IS IT AL AR ST TO NT NG SE HA AS OU
IO LE VE CO ME DE HI RI RO IC NE EA RA CE LI CH LL BE MA SI OM UR""".split())


def is_text(s):
    """Whether a run reads as text: letters for at least two thirds of its characters, spaces
    aside, three different letters, and at least a third of the pairs of letters in its words
    among PAIRS. Code and tables read as screen codes give runs of letters too, but in pairs that
    text seldom has."""
    ink = s.replace(" ", "")
    words = re.findall(r"[A-Za-z]+", s.upper())
    pairs = [w[i:i + 2] for w in words for i in range(len(w) - 1)]
    return len(set("".join(words))) >= 3 and sum(map(len, words)) * 3 >= len(ink) * 2 and \
        len(pairs) >= 3 and sum(p in PAIRS for p in pairs) * 3 >= len(pairs)


def lead(s):
    """How many characters before a run's first letter belong to something else: a few that read
    as letters run into the first word, in a case text never writes ("kjpNumber", "sjPRating")."""
    m = re.match(r"[A-Za-z]+", s)
    if not m or m.group().isupper() or m.group().islower() or m.group().istitle():
        return 0
    w = m.group()
    return next(i for i in range(1, len(w)) if w[i:].isupper() or w[i:].islower() or w[i:].istitle())


def sweep(cpu, ram, known, least=5, every=False):
    """[(first, last, text, [kinds])] in address order."""
    found = {}
    for kind in sweep_kinds(cpu):
        machine = getattr(cpu, "sweep_runs", None)
        for lo, hi, s in known_runs(machine(kind, ram) if machine else default_runs(cpu, kind, ram), known):
            cut = lead(s)
            lo, s = lo + cut, s[cut:]
            if hi - lo + 1 >= least and (every or is_text(s)):
                found.setdefault((lo, hi, s), []).append(kind)
    return [(lo, hi, s, kinds) for (lo, hi, s), kinds in sorted(found.items())]


def block_type(blocks, a):
    return next((b["type"] for b in blocks if b["start"] <= a <= b["end"]), "-")


def report(found, blocks, source):
    lines = [f"string sweep ({source}): {len(found)} runs"]
    for lo, hi, s, kinds in found:
        lines.append(f"  ${lo:04X}  {'/'.join(kinds):18} {block_type(blocks, lo):10} {hi - lo + 1:4}  {s}")
    return lines


def image(gdir, snapshot_mod, snap):
    """The 64 KB image and a mask of the game's bytes, as kit/cpu/opcodes.py's image() reads
    them, for a machine of any processor."""
    if snap:
        ram = bytearray(snapshot_mod.read(snap))
        assert len(ram) == 0x10000, "snapshot is not a 64 KB image"
        known = bytearray(b"\x01" * 0x10000)
    else:
        path = os.path.join(gdir, "listing.json")
        if not os.path.exists(path):
            sys.exit(f"{gdir} has no listing.json: give a snapshot, or a part's folder (kit/skills/core/15-parts)")
        ram, known = bytearray(0x10000), bytearray(0x10000)
        for r in json.load(open(path))["records"]:
            for i, b in enumerate(r.get("b", [])):
                ram[r["a"] + i] = b; known[r["a"] + i] = 1
    from symbols_export import regions
    from parts import load_game
    for lo, hi, _ in regions(load_game(gdir))["exclude"]:
        known[lo:hi + 1] = bytes(hi + 1 - lo)
    return ram, known


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    from listing import platform_modules
    from parts import load_game
    from symbols_export import platform_of
    gdir = argv[0]
    snap = argv[1] if len(argv) > 1 and not argv[1].startswith("-") else None
    least = int(argv[argv.index("--min") + 1]) if "--min" in argv else 5
    cpu, snapshot_mod = platform_modules(platform_of(load_game(gdir)))
    ram, known = image(gdir, snapshot_mod, snap)
    path = os.path.join(gdir, "symbols.json")
    blocks = json.load(open(path))["blocks"] if os.path.exists(path) else []
    source = f"bytes from {'the snapshot' if snap else 'listing.json'}" + \
             (", blocks from symbols.json" if blocks else "")
    print("\n".join(report(sweep(cpu, ram, known, least, "--all" in argv), blocks, source)))


if __name__ == "__main__":
    main()
