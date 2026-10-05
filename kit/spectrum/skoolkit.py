#!/usr/bin/env python3
"""SkoolKit integration: the Spectrum's annotation surface is a control file.

kit/spectrum/snapshot.py reads the .sna and kit/spectrum/z80.py decodes the
code; this module carries annotations between the shared symbols.json and a
SkoolKit control file, and renders the control file through SkoolKit to a
.skool for reading. `symbols_export.py` and `symbols_import.py` reach it by
platform through `read_file` and `write`.

  disassemble(sna, ctl, out=None, start=None, end=None)
      render the control file over the snapshot into a .skool (SkoolKit)
  ctl_from_symbols(gdir, snapshot, out=None)
      symbols.json + .sna -> control file; the shareable, committable map,
      rebuilt from the committed files alone (this is `write`)
  symbols_from_ctl(path)        (this is `read_file`)
      control file -> (blocks, symbols, comments) in symbols.json's vocabulary

Control-file vocabulary used here, from SkoolKit's own manual
(https://skoolkit.ca/docs/skoolkit/control-files.html):
  c $ADDR [title]      a code block
  b $ADDR [title]      bytes
  w $ADDR [title]      words (a pointer is a word)
  ; kit-block $ADDR T  the symbols.json type, when the letter cannot carry it (Address
                       and the lo/hi split tables), so the round trip is lossless
  t $ADDR [title]      text in the machine's alphabet
  i $ADDR              ignored from here (used to close a block exactly)
  @ $ADDR label=NAME   a label
  N $ADDR text         a line comment
Addresses are written `$XXXX`; read back as `$` hex or decimal, as SkoolKit reads them.
SkoolKit gates on import/run only where it is genuinely needed (disassemble);
the round trip itself is plain Python, so a listing never depends on it.

Usage:
  skoolkit.py --list
  skoolkit.py disassemble '{"sna": "work/x.sna", "ctl": "work/x.ctl", "out": "work/x.skool"}'
  skoolkit.py ctl-from-symbols '{"game": "games/spectrum/x", "sna": "work/x.sna"}'
  skoolkit.py symbols-from-ctl '{"ctl": "work/x.ctl"}'
  skoolkit.py --test            self-check, writes only to a temp dir
"""
import glob, json, os, re, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SKOOLKIT_DIR = os.path.join(ROOT, "tools", "skoolkit")
RAM_LO, RAM_HI = 0x4000, 0xFFFF          # a 48K machine's RAM; the ROM is not the game

# shared symbols.json block type <-> control-file directive
TO_CTL = {"Code": "c", "Byte": "b", "Word": "w", "Address": "w", "Lo/Hi Address": "w",
          "Hi/Lo Address": "w", "Lo/Hi Word": "w", "Hi/Lo Word": "w", "ZX": "t"}
FROM_CTL = {"c": "Code", "b": "Byte", "w": "Word", "t": "ZX"}
TEXT_TYPE = "ZX"


def skoolkit_bin(name):
    """A SkoolKit script under tools/skoolkit, or None when it is not installed."""
    sub = "Scripts" if sys.platform.startswith("win") else "bin"
    for p in (os.path.join(SKOOLKIT_DIR, sub, name), os.path.join(SKOOLKIT_DIR, sub, name + ".py")):
        if os.path.exists(p):
            return p
    found = glob.glob(os.path.join(SKOOLKIT_DIR, "**", name), recursive=True)
    return found[0] if found else None


def skoolkit_python():
    """The venv's python, so a script run through us finds its own package."""
    sub = "Scripts" if sys.platform.startswith("win") else "bin"
    for exe in ("python", "python3", "python.exe"):
        p = os.path.join(SKOOLKIT_DIR, sub, exe)
        if os.path.exists(p):
            return p
    return sys.executable


def need_bin(name):
    p = skoolkit_bin(name)
    if not p:
        sys.exit(f"SkoolKit is not installed: no {name} under {os.path.relpath(SKOOLKIT_DIR, ROOT)}. "
                 "Run `python3 kit/scripts/tools.py --platform spectrum get-skoolkit`.")
    return p


def addr(s):
    """A control-file address as SkoolKit reads one: `$` is hex, anything else decimal.

    `0x` is not hex there: sna2skool.py 10.1 ignores such a line ("invalid address"), so
    it raises here too, and the line is left out of symbols.json as it is of the render."""
    s = s.strip()
    if s.startswith("$"):
        return int(s[1:], 16)
    return int(s)


def _hex(a):
    return f"${a:04X}"


# --- reading a control file -------------------------------------------------
def symbols_from_ctl(path):
    """(blocks, symbols, comments) from a control file, in symbols.json's vocabulary.

    Anything outside the 48K RAM image is dropped: a label on a ROM entry point or an
    RST target is not the game's, and must not become a symbol in the ledger."""
    blocks, symbols, comments = [], [], []
    directives = []                       # every block directive, to bound the ones we keep
    types = {}                            # kit-block tags: a control-file letter cannot tell
                                          # Address from Word, so ctl_from_symbols writes the
                                          # symbols.json type in a comment for those it cannot
    def ignored(n, line):
        print(f"WARNING: ignoring line {n} in {path} (invalid address): {line}", file=sys.stderr)

    with open(path) as f:
        for n, raw in enumerate(f, 1):
            line = raw.rstrip("\n")
            tag = re.match(r";\s*kit-block\s+(\S+)\s+(\S+)\s*$", line)
            if tag:
                try:
                    types[addr(tag.group(1))] = tag.group(2)
                except ValueError:
                    pass
                continue
            if not line.strip() or line[0] in "#%;":
                continue
            first, rest = line[0], line[1:].lstrip()
            if first == "@":
                fields = rest.split(None, 1)
                if len(fields) == 2 and fields[1].startswith("label="):
                    try:
                        a = addr(fields[0])
                    except ValueError:
                        ignored(n, line); continue
                    name = fields[1][len("label="):].strip()
                    if name and RAM_LO <= a <= RAM_HI:
                        symbols.append({"address": a, "name": name, "type": "UserDefined", "kind": "user"})
                continue
            if first == "N":
                fields = rest.split(None, 1)
                if not fields:
                    continue
                try:
                    a = addr(fields[0])
                except ValueError:
                    ignored(n, line); continue
                text = fields[1].strip() if len(fields) > 1 else ""
                if text and RAM_LO <= a <= RAM_HI:
                    comments.append({"address": a, "type": "line", "text": text})
                continue
            if first in "bcgistuwBCSTW":
                fields = rest.split(None, 1)
                if not fields:
                    continue
                try:
                    a = addr(fields[0].split(",")[0])
                except ValueError:
                    ignored(n, line); continue
                title = fields[1].strip() if len(fields) > 1 else ""
                directives.append((a, first, title))
    directives.sort(key=lambda d: d[0])
    for (a, letter, title), nxt in zip(directives, directives[1:] + [(None, None, None)]):
        if letter in FROM_CTL and RAM_LO <= a <= RAM_HI:
            end = min(nxt[0] - 1, RAM_HI) if nxt[0] is not None else RAM_HI
            blocks.append({"start": a, "end": end, "type": types.get(a, FROM_CTL[letter])})
            if title:
                comments.append({"address": a, "type": "line", "text": title})
    symbols.sort(key=lambda s: s["address"])
    comments.sort(key=lambda c: (c["address"], c["type"]))
    return blocks, symbols, comments


# --- writing a control file -------------------------------------------------
def ctl_from_symbols(gdir, snapshot, out=None):
    """Write the control file from gdir's symbols.json, closed exactly by `i` directives."""
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts"))
    from parts import seed     # a game's folder or, for a game of several loads, a part's
    game, sym = seed(gdir)
    if out is None:
        out = os.path.join(gdir, "work", f"{game['slug']}.ctl")
    blocks = sorted((b for b in sym["blocks"] if b["type"] in TO_CTL
                     and b["end"] >= RAM_LO and b["start"] <= RAM_HI), key=lambda b: b["start"])
    line = {}
    for c in sym["comments"]:
        if c["type"] == "line" and RAM_LO <= c["address"] <= RAM_HI:
            line.setdefault(c["address"], c["text"])
    named = {s["address"]: s["name"] for s in sym["symbols"]
             if s.get("kind", "user") == "user" and RAM_LO <= s["address"] <= RAM_HI}
    lines = [f"; {game.get('title') or game['slug']} — written by kit/spectrum/skoolkit.py",
             f"; {len(blocks)} blocks, {len(named)} labels. The .sna is read by snapshot.py."]
    prev_end = RAM_LO - 1
    for b in blocks:
        start, end = max(b["start"], RAM_LO), min(b["end"], RAM_HI)
        if prev_end + 1 < start:
            lines.append(f"i {_hex(prev_end + 1)}")
        title = line.get(start, "")
        letter = TO_CTL[b["type"]]
        if FROM_CTL[letter] != b["type"]:
            lines.append(f"; kit-block {_hex(start)} {b['type']}")
        lines.append(f"{letter} {_hex(start)}" + (f" {title}" if title else ""))
        prev_end = end
    if prev_end < RAM_HI:
        lines.append(f"i {_hex(prev_end + 1)}")
    for a in sorted(named):
        lines.append(f"@ {_hex(a)} label={named[a]}")
    for a in sorted(line):
        if a not in {b["start"] for b in blocks}:
            lines.append(f"N {_hex(a)} {line[a]}")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as f:
        f.write("\n".join(lines) + "\n")
    print(f"wrote {out}: {len(blocks)} blocks, {len(named)} labels, {len(line)} line comments")
    return out


def write(gdir, snapshot, out=None):
    """symbols_import.py's entry point for the spectrum."""
    return ctl_from_symbols(gdir, snapshot, out)


def read_file(path):
    """symbols_export.py's entry point for the spectrum."""
    return symbols_from_ctl(path)


# --- rendering through SkoolKit ---------------------------------------------
def disassemble(sna, ctl, out=None, start=None, end=None):
    """The control file rendered over the snapshot into a .skool, for reading."""
    if out is None:
        out = os.path.splitext(sna)[0] + ".skool"
    cmd = [skoolkit_python(), need_bin("sna2skool.py"), "-H", "-l", "-c", ctl]
    if start is not None:
        cmd += ["-s", _hex(start)]
    if end is not None:
        cmd += ["-e", _hex(end)]
    cmd.append(sna)
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"sna2skool failed:\n{r.stderr.strip()}")
    with open(out, "w") as f:
        f.write(r.stdout)
    print(f"wrote {out}: {len(r.stdout.splitlines())} lines")
    return out


# --- self-check -------------------------------------------------------------
def test():
    import struct
    sys.path.insert(0, HERE)
    from snapshot import SNA_48K_SIZE, SNA_HEADER
    with tempfile.TemporaryDirectory() as d:
        body = bytearray(0x10000 - RAM_LO)
        body[0x8000 - RAM_LO:0x8000 - RAM_LO + 6] = bytes([0x21, 0x34, 0x12, 0x06, 0x05, 0x76])
        hdr = bytearray(SNA_HEADER)
        open(os.path.join(d, "x.sna"), "wb").write(bytes(hdr) + bytes(body))
        json.dump({"slug": "x", "title": "X", "platform": "spectrum"},
                  open(os.path.join(d, "game.json"), "w"))
        json.dump({"blocks": [{"start": 0x8000, "end": 0x8005, "type": "Code"},
                              {"start": 0x8006, "end": 0x8009, "type": "Address"},
                              {"start": 0x0000, "end": 0x0010, "type": "Code"}],
                   "symbols": [{"address": 0x8000, "name": "start", "type": "UserDefined", "kind": "user"},
                               {"address": 0x0038, "name": "rom_rst38", "type": "UserDefined", "kind": "user"}],
                   "comments": [{"address": 0x8000, "type": "line", "text": "entry point"},
                                {"address": 0x8003, "type": "line", "text": "counter"}]},
                  open(os.path.join(d, "symbols.json"), "w"))
        ctl = write(d, os.path.join(d, "x.sna"))
        blocks, symbols, comments = read_file(ctl)
        assert blocks == [{"start": 0x8000, "end": 0x8005, "type": "Code"},
                          {"start": 0x8006, "end": 0x8009, "type": "Address"}], blocks
        assert [s["name"] for s in symbols] == ["start"], symbols      # the ROM label is refused
        assert {c["address"]: c["text"] for c in comments} == {0x8000: "entry point", 0x8003: "counter"}, comments
        hand = os.path.join(d, "hand.ctl")       # SkoolKit ignores a 0x address, and so does the reader
        open(hand, "w").write(open(ctl).read() + "b 0x9000 hand-written\n@ 0x9000 label=hand\n")
        assert read_file(hand) == (blocks, symbols, comments), read_file(hand)
        if skoolkit_bin("sna2skool.py"):
            skool = disassemble(os.path.join(d, "x.sna"), ctl)
            text = open(skool).read()
            assert "start" in text and "halt" in text, text[:200]
            print("ok - skoolkit.py: control-file round trip, ROM labels refused, .skool rendered")
        else:
            print("ok - skoolkit.py: control-file round trip (SkoolKit not installed, render skipped)")


def main():
    a = sys.argv[1:]
    if not a or a[0] in ("-h", "--help"):
        print(__doc__); return
    if a[0] == "--test":
        test(); return
    if a[0] == "--list":
        print("disassemble, ctl-from-symbols, symbols-from-ctl, --test")
        return
    args = json.loads(a[1]) if len(a) > 1 else {}
    if a[0] == "disassemble":
        disassemble(args["sna"], args["ctl"], args.get("out"), args.get("start"), args.get("end"))
    elif a[0] == "ctl-from-symbols":
        write(args["game"], args["sna"], args.get("out"))
    elif a[0] == "symbols-from-ctl":
        blocks, symbols, comments = read_file(args["ctl"])
        print(json.dumps({"blocks": blocks, "symbols": symbols, "comments": comments}, indent=1))
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
