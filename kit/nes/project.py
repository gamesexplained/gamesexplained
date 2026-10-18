#!/usr/bin/env python3
"""Read and write an NES game's regenerator2000 project file.

The file is regenerator2000's own, the same for every machine, so the C64's code reads and
builds it (kit/c64/project.py); this adds what is the NES's:

  * the image comes from the NES's snapshot (kit/nes/snapshot.py): the CPU's 64 KB, with the
    PRG ROM the mapper had selected at $8000-$FFFF;
  * the project names its machine, "settings": {"system": "NES"}, so the disassembler
    comments each store to and load from a PPU or APU register with its name
    (`sta a_2000 ; PPUCTRL ...`). Without the setting the session is the C64's, and names
    and comments the KERNAL's entry points, which on the NES are the game's own code;
  * regenerator2000 has no ASCII text type, so text in ASCII, "ASCII" in symbols.json, is
    its PETSCII text in the project, and comes back as ASCII. Its screencode text means
    nothing on the NES, and a project block typed so is refused on the way out.

A `.regen2000proj` embeds the memory image, so it is never committed: symbols_import.py
rebuilds it locally from symbols.json and the contributor's own snapshot.

  read_file(path)                    -> (blocks, symbols, comments)
  write(gdir, snapshot, out=None)    -> path written

Its test is kit/nes/test_project.py.
"""
import importlib.util, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
SYSTEM = "NES"        # regenerator2000's name for the machine (its system-NES.toml)


def _load(name, path):
    """A module by path, under a name of its own: kit/c64/ and kit/nes/ both have a snapshot.py."""
    if name in sys.modules:
        return sys.modules[name]
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


_project = _load("c64_project_format", os.path.join(KIT, "c64", "project.py"))
_snapshot = _load("nes_snapshot", os.path.join(HERE, "snapshot.py"))


def to_project(b):
    """A symbols.json block as the C64's project code takes it."""
    return dict(b, type="PETSCII") if b["type"] == "ASCII" else b


def from_project(b, where):
    """A project's block in the NES's vocabulary: its PETSCII text is ASCII. Screencode text
    is the C64's character order, which no NES game has, so it stops the export."""
    if b["type"] in ("PETSCII", "PETSCII Text"):
        return dict(b, type="ASCII")
    if b["type"] in ("Screencode", "Screencode Text"):
        sys.exit(f"{where}: ${b['start']:04X}-${b['end']:04X} is typed screencode, the C64's character order, "
                 "which means nothing on the NES. Type ASCII text petscii, and a font of the game's own byte, "
                 "with the words in the comment (kit/skills/nes/steps, \"disassembler\")")
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
    """Write a .regen2000proj from gdir's symbols.json and the NES snapshot. Returns the path.
    gdir is a game's folder or, for a game of several loads, a part's (kit/scripts/parts.py)."""
    sys.path.insert(0, os.path.join(KIT, "scripts"))
    from parts import seed
    game, sym = seed(gdir)
    if out is None:
        out = os.path.join(gdir, "work", f"{game['slug']}.regen2000proj")
    if (game.get("part") or {}).get("bank") is not None:
        _snapshot.read(snapshot, bank=game["part"]["bank"])      # refused, saying why
    ram = _snapshot.read(snapshot)
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
