#!/usr/bin/env python3
"""Read and write a Commodore 16 or Plus/4 game's regenerator2000 project file.

The file is regenerator2000's own, the same for every machine, so the C64's code reads and
builds it (kit/c64/project.py); this adds what is the TED machines':

  * the image comes from the kit's plus4emu snapshot (kit/c16/snapshot.py): the RAM as the
    program addresses it, a C16's 16 KB once at $0000-$3FFF;
  * the project names its machine, "settings": {"system": "Commodore Plus4"}, so the
    disassembler names a call into the KERNAL's jump table (`JSR $FFD2` is `jsr KERNAL_BSOUT`,
    "; $FFD2 BSOUT  output to channel") and comments the TED's registers. regenerator2000 has no
    system of its own for the C16, which runs the Plus/4's KERNAL and BASIC. Without the setting
    the session names the same addresses after the C64's KERNAL, with nothing to say so;
  * that system's built-in file has three of the jump table's names at the wrong addresses and
    three misspelt, among the changes the header of kit/c16/system-commodore_plus4.toml lists,
    so install_system_file() puts the kit's corrected copy where a session started by `tools.py
    r2000` reads it in place of the built-in one (on Linux; kit/skills/c16/tool-regen2000, "The
    system file"). write() calls it, so every session the launcher starts on a C16 snapshot has it.

The text types are the C64's, PETSCII and screen codes, which the TED machines share, so a block's
type goes in and out unchanged.

A `.regen2000proj` embeds the memory image, so it is never committed: symbols_import.py
rebuilds it locally from symbols.json and the contributor's own snapshot.

  read_file(path)                    -> (blocks, symbols, comments)
  write(gdir, snapshot, out=None)    -> path written
  install_system_file()              -> the path of the installed copy

Its test is kit/c16/test_project.py.
"""
import filecmp, importlib.util, json, os, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
ROOT = os.path.dirname(KIT)
SYSTEM = "Commodore Plus4"     # regenerator2000's name for the machine (its system-commodore_plus4.toml)
SYSTEM_FILE = os.path.join(HERE, "system-commodore_plus4.toml")
# the launcher (kit/c64/tools.py, r2000) points XDG_CONFIG_HOME here, and the disassembler reads
# the user's own system files from <its config folder>/regenerator2000/
CONFIG = os.path.join(ROOT, "tools", "r2000-home", "config", "regenerator2000")


def _load(name, path):
    """A module by path, under a name of its own: kit/c64/ and kit/c16/ both have a snapshot.py."""
    if name in sys.modules:
        return sys.modules[name]
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


_project = _load("c64_project_format", os.path.join(KIT, "c64", "project.py"))
_snapshot = _load("c16_snapshot", os.path.join(HERE, "snapshot.py"))


def install_system_file(config=None):
    """Copy the kit's Plus/4 system file to the disassembler's config folder under tools/
    (CONFIG, unless `config` names another), unless the same file is there already. Returns the
    copy's path."""
    config = config or CONFIG
    out = os.path.join(config, os.path.basename(SYSTEM_FILE))
    if not (os.path.isfile(out) and filecmp.cmp(SYSTEM_FILE, out, shallow=False)):
        os.makedirs(config, exist_ok=True)
        shutil.copyfile(SYSTEM_FILE, out)
    return out


def read_file(path):
    """(blocks, symbols, comments) from a .regen2000proj."""
    with open(path) as f:
        system = (json.load(f).get("settings") or {}).get("system")
    if system != SYSTEM:
        print(f"{path}: the project's system is {system!r}, not {SYSTEM!r}: its automatic names are another "
              "machine's. Rebuild it with symbols_import.py", file=sys.stderr)
    return _project.read_file(path)


def write(gdir, snapshot, out=None):
    """Write a .regen2000proj from gdir's symbols.json and the C16 snapshot. Returns the path.
    gdir is a game's folder or, for a game of several loads, a part's (kit/scripts/parts.py)."""
    sys.path.insert(0, os.path.join(KIT, "scripts"))
    from parts import seed
    game, sym = seed(gdir)
    if out is None:
        out = os.path.join(gdir, "work", f"{game['slug']}.regen2000proj")
    body = _project.project(sym, _snapshot.read(snapshot), settings={"system": SYSTEM})
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with open(out, "w") as f:
        json.dump(body, f, indent=1, sort_keys=True)
    installed = install_system_file()
    print(f"wrote {out}: {len(body['blocks'])} blocks, {len(body['labels'])} labelled addresses, "
          f"{len(body['user_line_comments'])} line comments; system {SYSTEM}, its names from "
          f"{os.path.relpath(installed, ROOT)}")
    return out


def main():
    print(__doc__)


if __name__ == "__main__":
    main()
