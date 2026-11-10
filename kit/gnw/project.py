#!/usr/bin/env python3
"""A Game & Watch game's annotations: a control file, written and read, as on the Spectrum.

No interactive disassembler knows the Sharp SM5A, so the annotation surface is a text file in
the game's work/ folder, `work/<slug>.ctl`, that the agent edits and `symbols_export.py
<game> --project work/<slug>.ctl` reads. Its addresses are the listing's: the ROM in the order
the chip runs it, $0000-$073F (kit/cpu/sm5a.py, "logical"), and the data cells at $1000-$107F.
One directive a line, SkoolKit's letters where they mean the same:

  c $ADDR [title]      code from here
  b $ADDR [title]      bytes from here (a table the code reads by jumping into it)
  i $ADDR              nothing from here: closes a block
  @ $ADDR label=NAME   a label, on code or on a data cell ($1000 + BM * 16 + BL)
  N $ADDR text         a line comment, above the address
  C $ADDR text         a side comment, beside the instruction
  ; or #               a remark, not read

A block runs to the next directive of the first three kinds. `write` makes the file from the
committed symbols.json, so a contributor rebuilds it on another computer; the file holds no
bytes of the game and is not committed either way, as work/ is not.

  read_file(path)                    -> (blocks, symbols, comments)
  write(gdir, snapshot, out=None)    -> path written

Its test is kit/gnw/test_project.py.
"""
import os, re, sys

TOP = 0x107F          # the data cells end here; nothing above is the game's
LETTERS = {"c": "Code", "b": "Byte"}
TO_LETTER = {"Code": "c", "Byte": "b"}


def addr(s):
    s = s.strip()
    return int(s[1:], 16) if s.startswith("$") else int(s, 0)


def read_file(path):
    blocks, symbols, comments, cuts = [], [], [], []
    with open(path) as f:
        for n, raw in enumerate(f, 1):
            line = raw.rstrip("\n")
            if not line.strip() or line.lstrip()[0] in "#;":
                continue
            letter, rest = line[0], line[1:].strip()
            fields = rest.split(None, 1)
            if not fields:
                sys.exit(f"{path}:{n}: {letter} needs an address")
            try:
                a = addr(fields[0])
            except ValueError:
                sys.exit(f"{path}:{n}: {fields[0]!r} is not an address ($hex or a number)")
            text = fields[1].strip() if len(fields) > 1 else ""
            if not 0 <= a <= TOP:
                sys.exit(f"{path}:{n}: ${a:04X} is outside the ROM ($0000-$073F) and the data cells ($1000-$107F)")
            if letter in "cbi":
                cuts.append((a, letter, text))
            elif letter == "@":
                m = re.match(r"label=(\S+)$", text)
                if not m:
                    sys.exit(f"{path}:{n}: a label is written `@ $ADDR label=NAME`")
                symbols.append({"address": a, "name": m.group(1), "type": "UserDefined", "kind": "user"})
            elif letter in "NC":
                if text:
                    comments.append({"address": a, "type": "line" if letter == "N" else "side", "text": text})
            else:
                sys.exit(f"{path}:{n}: no directive {letter!r}: c, b, i, @, N and C")
    cuts.sort(key=lambda c: c[0])
    for (a, letter, title), nxt in zip(cuts, cuts[1:] + [(None, None, None)]):
        if letter == "i":
            continue
        end = (nxt[0] - 1) if nxt[0] is not None else 0x073F
        blocks.append({"start": a, "end": end, "type": LETTERS[letter]})
        if title:
            comments.append({"address": a, "type": "line", "text": title})
    symbols.sort(key=lambda s: s["address"])
    comments.sort(key=lambda c: (c["address"], c["type"]))
    return blocks, symbols, comments


def write(gdir, snapshot, out=None):
    """The control file from gdir's symbols.json. The snapshot is not read: the file holds no bytes."""
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts"))
    from parts import seed
    game, sym = seed(gdir)
    if out is None:
        out = os.path.join(gdir, "work", f"{game['slug']}.ctl")
    blocks = sorted((b for b in sym["blocks"] if b["type"] in TO_LETTER), key=lambda b: b["start"])
    starts = {b["start"] for b in blocks}
    line = {c["address"]: c["text"] for c in sym["comments"] if c["type"] == "line"}
    side = {c["address"]: c["text"] for c in sym["comments"] if c["type"] == "side"}
    named = {s["address"]: s["name"] for s in sym["symbols"] if s.get("kind", "user") == "user"}
    out_lines = [f"; {game.get('title') or game['slug']}: written by kit/gnw/project.py from symbols.json",
                 "; c code, b bytes, i nothing, @ label, N line comment, C side comment (kit/gnw/project.py)"]
    prev = -1
    for b in blocks:
        if prev + 1 < b["start"]:
            out_lines.append(f"i ${prev + 1:04X}")
        title = line.get(b["start"], "")
        out_lines.append(f"{TO_LETTER[b['type']]} ${b['start']:04X}" + (f" {title}" if title else ""))
        prev = b["end"]
    if blocks and prev < 0x073F:
        out_lines.append(f"i ${prev + 1:04X}")
    out_lines += [f"@ ${a:04X} label={named[a]}" for a in sorted(named)]
    out_lines += [f"N ${a:04X} {line[a]}" for a in sorted(line) if a not in starts]
    out_lines += [f"C ${a:04X} {side[a]}" for a in sorted(side)]
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with open(out, "w") as f:
        f.write("\n".join(out_lines) + "\n")
    print(f"wrote {out}: {len(blocks)} blocks, {len(named)} labels, {len(line)} line and {len(side)} side comments")
    return out


if __name__ == "__main__":
    print(__doc__)
