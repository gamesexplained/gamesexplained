#!/usr/bin/env python3
"""Read and write a BBC Micro game's regenerator2000 project file.

The file is regenerator2000's own, the same for every machine, so the C64's code reads and
builds it (kit/c64/project.py); this adds what is the BBC's:

  * the image comes from the BBC's snapshot (kit/bbc/snapshot.py);
  * the project names its machine, "settings": {"system": "BBC Micro"}, so the disassembler
    comments a call into the MOS with its name (`JSR $FFF4` gets "; OSBYTE - Perform actions
    in registers") and a SHEILA register with its chip ("; System VIA"). It gives the MOS's
    entry points and vectors no label; kit/bbc/mos.py names them in the export. Without the
    setting the session names the same addresses after the C64's KERNAL, with nothing to say so;
  * regenerator2000 has no ASCII text type, so the BBC's text, "ASCII" in symbols.json, is
    its PETSCII text in the project, and comes back as ASCII;
  * nor has it a BASIC type, so a program in BBC BASIC, "BASIC" in symbols.json, is its
    screencode text in the project, the C64's screen codes having no meaning on the BBC, and
    comes back as BASIC (kit/bbc/basic.py lists it).

A `.regen2000proj` embeds the memory image, so it is never committed: symbols_import.py
rebuilds it locally from symbols.json and the contributor's own snapshot.

  read_file(path)                    -> (blocks, symbols, comments)
  write(gdir, snapshot, out=None)    -> path written

Its test is kit/bbc/test_project.py.
"""
import importlib.util, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
SYSTEM = "BBC Micro"        # regenerator2000's name for the machine (its system-bbc_micro.toml)


def _load(name, path):
    """A module by path, under a name of its own: kit/c64/ and kit/bbc/ both have a snapshot.py."""
    if name in sys.modules:
        return sys.modules[name]
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


_project = _load("c64_project_format", os.path.join(KIT, "c64", "project.py"))
_snapshot = _load("bbc_snapshot", os.path.join(HERE, "snapshot.py"))


def to_project(b):
    """A symbols.json block as the C64's project code takes it."""
    return dict(b, type={"ASCII": "PETSCII", "BASIC": "Screencode"}.get(b["type"], b["type"]))


def from_project(b, where):
    """A project's block in the BBC's vocabulary: its PETSCII text is ASCII, and its screencode
    text (the C64's character codes, which mean nothing here) is a BASIC program."""
    if b["type"] in ("PETSCII", "PETSCII Text"):
        return dict(b, type="ASCII")
    if b["type"] in ("Screencode", "Screencode Text"):
        return dict(b, type="BASIC")
    return b


def read_file(path):
    """(blocks, symbols, comments) from a .regen2000proj."""
    system = (json.load(open(path)).get("settings") or {}).get("system")
    if system != SYSTEM:
        print(f"{path}: the project's system is {system!r}, not {SYSTEM!r}: its automatic names are another "
              "machine's. Rebuild it with symbols_import.py", file=sys.stderr)
    blocks, syms, comments = _project.read_file(path)
    return [from_project(b, path) for b in blocks], syms, comments


def write(gdir, snapshot, out=None):
    """Write a .regen2000proj from gdir's symbols.json and the BBC snapshot. Returns the path.
    gdir is a game's folder or, for a game of several loads, a part's (kit/scripts/parts.py)."""
    sys.path.insert(0, os.path.join(KIT, "scripts"))
    from parts import seed
    game, sym = seed(gdir)
    if out is None:
        out = os.path.join(gdir, "work", f"{game['slug']}.regen2000proj")
    bank = (game.get("part") or {}).get("bank")      # a part that is one sideways RAM bank
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
