#!/usr/bin/env python3
"""A story file as kit/scripts/listing.py reads a snapshot (kit/PLATFORMS.md): the whole
story, at story addresses, for a part whose part.json says "machine": "zmachine".

A story's image is its file. The platform's kit says how the file comes off the game's own
disk (on the Apple II, games/apple2/zork-i/orientation.md), and it stays in the part's
gitignored work/ like any snapshot: it is the whole game.

  read(path) -> bytes     the story; exits, naming what it saw, on a file that is not one
"""
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from story import Story  # noqa: E402


def read(path):
    data = open(path, "rb").read()
    try:
        s = Story(data)
    except ValueError as e:
        sys.exit(f"{path}: {e}")
    if len(data) < 64 or s.header["static"] > len(data) or s.header["high"] > len(data):
        sys.exit(f"{path}: {len(data)} bytes, too short for the story its header describes")
    return data


if __name__ == "__main__":
    for p in sys.argv[1:]:
        s = Story(read(p))
        print(f"{p}: version {s.version}, release {s.header['release']}, serial {s.header['serial']}, "
              f"{len(s.mem)} bytes")
