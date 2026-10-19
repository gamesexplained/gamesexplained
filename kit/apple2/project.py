#!/usr/bin/env python3
"""Read and write an Apple II game's regenerator2000 project file.

The file is regenerator2000's own, the same for every machine, so the C64's code reads and
builds it (kit/c64/project.py); this adds what is the Apple II's:

  * the image comes from the Apple II's snapshot (kit/apple2/snapshot.py): main memory, or for a
    part with "bank" in its part.json, aux memory or one bank of the language card;
  * the project names its machine, "settings": {"system": "Apple II"}, so the disassembler
    comments a call into the Monitor ROM with what it does (`JSR $FDED` gets "; $FDED OUTPUT
    CHARACTER IN ACCUMULATOR...") and the zero-page cells with the Monitor's and Applesoft's uses.
    It gives the Monitor's entry points no label; kit/apple2/monitor.py names them in the export.
    Without the setting the session names the same addresses after the C64's KERNAL, with
    nothing to say so;
  * regenerator2000 has no ASCII text type, so the Apple II's text, "ASCII" in symbols.json, is
    its PETSCII text in the project, and comes back as ASCII;
  * nor has it the text screen's codes, so text kept in them, "Screen" in symbols.json, is its
    screencode text in the project, and comes back as Screen (kit/apple2/cpu.py reads both).

A `.regen2000proj` embeds the memory image, so it is never committed: symbols_import.py
rebuilds it locally from symbols.json and the contributor's own snapshot.

  read_file(path)                    -> (blocks, symbols, comments)
  write(gdir, snapshot, out=None)    -> path written

Its test is kit/apple2/test_project.py.
"""
import importlib.util, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
SYSTEM = "Apple II"         # regenerator2000's name for the machine (its system-apple_ii.toml)


def _load(name, path):
    """A module by path, under a name of its own: kit/c64/ and kit/apple2/ both have a snapshot.py."""
    if name in sys.modules:
        return sys.modules[name]
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


_project = _load("c64_project_format", os.path.join(KIT, "c64", "project.py"))
_snapshot = _load("apple2_snapshot", os.path.join(HERE, "snapshot.py"))


def to_project(b):
    """A symbols.json block as the C64's project code takes it."""
    return dict(b, type={"ASCII": "PETSCII", "Screen": "Screencode"}.get(b["type"], b["type"]))


def from_project(b, where):
    """A project's block in the Apple II's vocabulary: its PETSCII text is ASCII, and its
    screencode text is the text screen's codes."""
    if b["type"] in ("PETSCII", "PETSCII Text"):
        return dict(b, type="ASCII")
    if b["type"] in ("Screencode", "Screencode Text"):
        return dict(b, type="Screen")
    return b


def read_file(path):
    """(blocks, symbols, comments) from a .regen2000proj."""
    with open(path) as f:
        system = (json.load(f).get("settings") or {}).get("system")
    if system != SYSTEM:
        print(f"{path}: the project's system is {system!r}, not {SYSTEM!r}: its automatic names are another "
              "machine's. Rebuild it with symbols_import.py", file=sys.stderr)
    blocks, syms, comments = _project.read_file(path)
    return [from_project(b, path) for b in blocks], syms, comments


def write(gdir, snapshot, out=None):
    """Write a .regen2000proj from gdir's symbols.json and the Apple II snapshot. Returns the path.
    gdir is a game's folder or, for a game of several loads, a part's (kit/scripts/parts.py)."""
    sys.path.insert(0, os.path.join(KIT, "scripts"))
    from parts import seed
    game, sym = seed(gdir)
    if out is None:
        out = os.path.join(gdir, "work", f"{game['slug']}.regen2000proj")
    bank = (game.get("part") or {}).get("bank")      # aux memory, or a bank of the language card
    ram = _snapshot.read(snapshot) if bank is None else _snapshot.read(snapshot, bank=bank)
    body = _project.project(dict(sym, blocks=[to_project(b) for b in sym["blocks"]]), ram, settings={"system": SYSTEM})
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with open(out, "w") as f:
        json.dump(body, f, indent=1, sort_keys=True)
    print(f"wrote {out}: {len(body['blocks'])} blocks, {len(body['labels'])} labelled addresses, "
          f"{len(body['user_line_comments'])} line comments; system {SYSTEM}")
    return out


def main():
    print(__doc__)


if __name__ == "__main__":
    main()
