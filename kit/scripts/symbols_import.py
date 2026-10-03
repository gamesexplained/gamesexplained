#!/usr/bin/env python3
"""Rebuild a disassembler's working file from symbols.json and your own snapshot.

The file the disassembler needs embeds the memory image, so it is never
committed; this script recreates it locally from the two things that are
allowed to exist: the shared symbol map and the contributor's own
snapshot. Each platform chooses its writer under kit/<platform>/:
regenerator2000's project for the c64 (`project.py`), a SkoolKit control
file for the spectrum (`skoolkit.py`).

A part of a game that is several loads (kit/scripts/parts.py) is rebuilt
from its own folder and its own snapshot. Where it lies over other parts,
their names and comments go in too, at the addresses they own, so the code
it calls is readable: export each part from the session afterwards and
each takes back its own share.

Usage:
  symbols_import.py <game dir> <snapshot> [out file]

Default output: the platform's own name in <game dir>/work/.
"""
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from symbols_export import platform_fn, platform_of


def main():
    argv = sys.argv[1:]
    if len(argv) < 2 or argv[0] in ("-h", "--help"):
        print(__doc__); return
    gdir, snapshot = argv[0], argv[1]
    out = argv[2] if len(argv) > 2 else None
    from parts import load_game, parts
    if parts(gdir):
        sys.exit(f"{gdir} is a game of several parts: rebuild one, {os.path.join(gdir, 'parts', '<id>')}, "
                 "on that part's own snapshot")
    plat = platform_of(load_game(gdir))
    write = platform_fn(plat, "write", ("project", "skoolkit"))
    write(gdir, snapshot, out)


if __name__ == "__main__":
    main()
