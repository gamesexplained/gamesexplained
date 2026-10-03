#!/usr/bin/env python3
"""Rebuild a disassembler's working file from symbols.json and your own snapshot.

The file the disassembler needs embeds the memory image, so it is never
committed; this script recreates it locally from the two things that are
allowed to exist: the shared symbol map and the contributor's own
snapshot. Each platform chooses its writer under kit/<platform>/:
regenerator2000's project for the c64 (`project.py`), a SkoolKit control
file for the spectrum (`skoolkit.py`).

Usage:
  symbols_import.py <game dir> <snapshot> [out file]

Default output: the platform's own name in <game dir>/work/.
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from symbols_export import platform_fn, platform_of


def main():
    argv = sys.argv[1:]
    if len(argv) < 2 or argv[0] in ("-h", "--help"):
        print(__doc__); return
    gdir, snapshot = argv[0], argv[1]
    out = argv[2] if len(argv) > 2 else None
    game = json.load(open(os.path.join(gdir, "game.json")))
    plat = platform_of(game)
    write = platform_fn(plat, "write", ("project", "skoolkit"))
    write(gdir, snapshot, out)


if __name__ == "__main__":
    main()
