#!/usr/bin/env python3
"""Refuse game binaries and anything that embeds one.

Scans the working tree (or the paths given) and fails if it finds: a file
with a game-image extension; a file whose size is a known disk-image size;
a file starting with a known snapshot magic; a JSON file carrying a
"raw_data_base64" field. work/ folders are skipped except their README.

Usage: check_binaries.py [paths...]     exit 1 on any hit
"""
import os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
EXT = {".d64", ".d71", ".d81", ".g64", ".prg", ".p00", ".t64", ".tap", ".crt", ".vsf",
       ".regen2000proj", ".nes", ".sfc", ".smc", ".gb", ".gbc", ".gba", ".z80", ".sna",
       ".tzx", ".adf", ".dsk", ".rom", ".bin"}
SIZES = {174848: "d64", 175531: "d64 with error bytes", 196608: "d64 40-track", 349696: "d71", 819200: "d81"}
MAGIC = [(b"VICE Snapshot File", "VICE snapshot"), (b"C64 CARTRIDGE", "cartridge image"),
         (b"C64File", "P00 file"), (b"C64S tape image file", "T64 image"), (b"NES\x1a", "NES ROM")]
SKIP_DIRS = {".git", "__pycache__", "node_modules"}


def check(path):
    rel = os.path.relpath(path, ROOT)
    parts = rel.split(os.sep)
    if "work" in parts and not rel.endswith("README.md"):
        return None
    ext = os.path.splitext(path)[1].lower()
    if ext in EXT:
        return f"extension {ext}"
    size = os.path.getsize(path)
    if size in SIZES:
        return f"size matches a {SIZES[size]}"
    with open(path, "rb") as f:
        head = f.read(64)
    for m, what in MAGIC:
        if head.startswith(m):
            return what
    if ext == ".json" or ext == ".regen2000proj":
        with open(path, "rb") as f:
            if b"raw_data_base64" in f.read():
                return "JSON with an embedded memory image"
    return None


def main():
    paths = sys.argv[1:] or [ROOT]
    bad = 0
    for base in paths:
        for d, dirs, files in os.walk(base):
            dirs[:] = [x for x in dirs if x not in SKIP_DIRS]
            for fn in files:
                p = os.path.join(d, fn)
                why = check(p)
                if why:
                    print(f"  x  {os.path.relpath(p, ROOT)}: {why}"); bad += 1
    if bad:
        print(f"\nFAILED - {bad} file(s) that must not be committed. Game binaries live only in work/.")
        sys.exit(1)
    print("OK - no game binaries")


if __name__ == "__main__":
    main()
