#!/usr/bin/env python3
"""Refuse game binaries and anything that embeds one.

Scans the working tree (or the paths given) and fails if it finds: a file
with a game-image extension; a file whose size is a known disk-image size;
a file starting with a known snapshot magic; a JSON file carrying a
"raw_data_base64" field; a jsbeeb snapshot (the BBC Micro's), gzipped or
not; an Apple II snapshot, the kit's, Apple2TS's own or AppleWin's. A
plus4emu snapshot (the Commodore 16's and Plus/4's) is caught by its magic,
whatever its name. The kit's NES snapshot is gzipped JSON as jsbeeb's is, found
the same way. A Z-machine story (an Infocom game, whatever the machine) has no
magic, only a version byte, so it is caught by its extension. work/ folders are
skipped except their README.
Game data a page's widgets need, embedded in its HTML, is not a binary
(AGENTS.md, "No binaries, ever"), but the program is: a file in a game's
folder whose base64, hex strings and lists of numbers hold more than two
thirds of the code in the game's listings fails too.

Usage: check_binaries.py [paths...]     exit 1 on any hit
"""
import base64, glob, json, os, re, sys, zlib

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
EXT = {".d64", ".d71", ".d81", ".g64", ".prg", ".p00", ".t64", ".tap", ".crt", ".vsf",
       ".regen2000proj", ".nes", ".sfc", ".smc", ".gb", ".gbc", ".gba", ".z80", ".sna",
       ".tzx", ".adf", ".dsk", ".rom", ".bin",
       ".szx", ".zsf", ".pzx", ".scr", ".rzx", ".csw", ".trd", ".scl",
       # the BBC Micro's discs (DFS, ADFS, flux and bitstream images), tapes and other emulators' states
       ".ssd", ".dsd", ".ads", ".adm", ".adl", ".hfe", ".fsd", ".scp", ".uef", ".snp", ".uefstate",
       # the Apple II's disks (bitstream, nibble, sector and flux images, and archives of them) and
       # Apple2TS's own save state
       ".woz", ".nib", ".nb2", ".do", ".po", ".d13", ".2mg", ".2img", ".hdv", ".a2r", ".edd",
       ".shk", ".sdk", ".a2ts",
       # the Commodore 16's and Plus/4's: the kit's snapshot (plus4emu's own file), YapeSDL's,
       # and two of the formats TOSEC keeps their games in (its tapes are .tap, its disks .d64)
       ".p4emu", ".yss", ".lnx", ".z64",
       # a recording of a tape, which is the game whole (some C16 tapes are kept only as one)
       ".wav",
       # a Z-machine story, the whole of an Infocom game on any machine, and the files that wrap one
       ".z1", ".z2", ".z3", ".z4", ".z5", ".z6", ".z7", ".z8", ".zblorb", ".zlb", ".blb", ".blorb"}
SIZES = {174848: "d64", 175531: "d64 with error bytes", 196608: "d64 40-track", 349696: "d71", 819200: "d81",
         49179: "48K .sna snapshot", 131103: "128K .sna snapshot", 147487: "128K .sna snapshot with an extra bank",
         102400: "40-track .ssd", 204800: "80-track .ssd or 40-track .dsd", 409600: "80-track .dsd",
         163840: "ADFS S disc", 327680: "ADFS M disc", 655360: "ADFS L disc",
         143360: "16-sector Apple II disk", 116480: "13-sector Apple II disk",
         232960: "Apple II .nib disk", 223440: "Apple II .nb2 disk"}
MAGIC = [(b"VICE Snapshot File", "VICE snapshot"), (b"C64 CARTRIDGE", "cartridge image"),
         (b"C64File", "P00 file"), (b"C64S tape image file", "T64 image"), (b"NES\x1a", "NES ROM"),
         (b"ZXST", "SZX snapshot"), (b"ZSF", "ZEsarUX snapshot"), (b"PZXT", "PZX tape image"),
         (b"ZXTape!", "TZX tape image"), (b"BEMSNAP", "B-em or beebjit snapshot"),
         (b"UEF File!", "UEF tape or BeebEm snapshot"), (b"HXCPICFE", "HFE disc image"),
         (b"HXCHFEV3", "HFE disc image"), (b"WOZ1", "WOZ disk image"), (b"WOZ2", "WOZ disk image"),
         (b"2IMG", "2MG disk image"), (b"A2R2", "A2R flux image"), (b"A2R3", "A2R flux image"),
         (b"MAMESAVE", "MAME save state"),
         (bytes.fromhex("5D12E4F4C9DAB6420133DE07D234F222"), "plus4emu snapshot"),
         (b"C16-TAPE-RAW", "C16 tape image"), (b"C64-TAPE-RAW", "tape image"),
         (b"PLUS4 CARTRIDGE", "Plus/4 cartridge image")]
JSBEEB = re.compile(rb'"format"\s*:\s*"jsbeeb-snapshot"')   # the BBC Micro's snapshot, kit/bbc/snapshot.py
# the Apple II's: the kit's (kit/apple2/snapshot.py), Apple2TS's own save state, and AppleWin's
APPLE2 = re.compile(rb'"format"\s*:\s*"apple2ts-kit-snapshot"|"state6502"\s*:|AppleWin Save State')
KIT_NES = re.compile(rb'"format"\s*:\s*"kit-nes-snapshot"')  # the NES's, kit/nes/snapshot.py
SKIP_DIRS = {".git", "__pycache__", "node_modules", "tools", "_site"}
# The bytes a page spells out: base64, a hex string, a list of numbers.
B64 = re.compile(rb"[A-Za-z0-9+/]{64,}={0,2}")
HEX = re.compile(rb"[0-9a-fA-F]{128,}")
NUMBERS = re.compile(rb"\[\s*(?:(?:0x[0-9a-fA-F]{1,2}|\d{1,3})\s*,\s*){63,}(?:0x[0-9a-fA-F]{1,2}|\d{1,3})")
TEXT = {".html", ".htm", ".js", ".mjs", ".json", ".svg", ".css", ".md", ".txt"}
WINDOW = 16           # code bytes matched at a time
# A page that carries its program does so as a whole memory image or ROM, nearly all of the code.
# The line sits above a page that needs half its game's code by design: a bank whose bytes the game
# reads as data.
PROGRAM = 2 / 3


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
    if head.startswith(b"\x1f\x8b"):     # gzip: what jsbeeb's snapshot and the NES's are, whatever the name
        with open(path, "rb") as f:
            try:
                head = zlib.decompressobj(16 + zlib.MAX_WBITS).decompress(f.read(65536), 256)
            except zlib.error:
                return None
    if JSBEEB.search(head):
        return "jsbeeb snapshot"
    if head.lstrip()[:1] == b"{" or head.startswith(b"%YAML"):   # JSON, or AppleWin's YAML
        with open(path, "rb") as f:
            if APPLE2.search(f.read(4096)):
                return "Apple II snapshot"
    if KIT_NES.search(head):
        return "NES snapshot"
    return None


def embedded(data):
    """Each run of bytes a text file spells out as base64, hex or a list of numbers."""
    for m in B64.finditer(data):
        s = m.group(0)
        try:
            yield base64.b64decode(s[:len(s) // 4 * 4])
        except ValueError:
            pass
    for m in HEX.finditer(data):
        s = m.group(0)
        yield bytes.fromhex(s[:len(s) // 2 * 2].decode())
    for m in NUMBERS.finditer(data):
        run = bytearray()
        for x in re.findall(rb"0x[0-9a-fA-F]+|\d+", m.group(0)):
            v = int(x, 16) if x.startswith(b"0x") else int(x)
            if v > 255:
                yield bytes(run)
                run = bytearray()
            else:
                run.append(v)
        yield bytes(run)


def code_runs(game):
    """The game's code, from every listing in its folder: one run for each stretch of code records."""
    runs = []
    for d, dirs, files in os.walk(game):
        dirs[:] = [x for x in dirs if x not in SKIP_DIRS and x != "work"]
        if "listing.json" not in files:
            continue
        with open(os.path.join(d, "listing.json")) as f:
            records = json.load(f)["records"]
        run, end = None, None
        for r in records:
            if r["t"] != "code":
                run = None
                continue
            if run is None or r["a"] != end:
                run = bytearray()
                runs.append(run)
            run += bytes(r.get("b", []))
            end = r["a"] + len(r.get("b", []))
    return runs


def programs(game):
    """The files in a game's folder that carry its program: (path, code bytes held, code bytes in all)."""
    files = []
    for d, dirs, names in os.walk(game):
        dirs[:] = [x for x in dirs if x not in SKIP_DIRS and x != "work"]
        for n in names:
            if os.path.splitext(n)[1].lower() in TEXT and n not in ("listing.json", "symbols.json"):
                with open(os.path.join(d, n), "rb") as f:
                    blobs = [b for b in embedded(f.read()) if len(b) >= WINDOW]
                if blobs:
                    files.append((os.path.join(d, n), blobs))
    if not files:
        return []
    runs = code_runs(game)
    total = sum(map(len, runs))
    files = [(p, blobs) for p, blobs in files if sum(map(len, blobs)) > PROGRAM * total]
    if not total or not files:
        return []
    where = {}
    for i, run in enumerate(runs):
        for o in range(len(run) - WINDOW + 1):
            w = bytes(run[o:o + WINDOW])
            if w.count(w[0]) < WINDOW:         # a run of one byte value says nothing
                where.setdefault(w, (i, o))
    out = []
    for p, blobs in files:
        held = set()
        for blob in blobs:
            for o in range(len(blob) - WINDOW + 1):
                at = where.get(blob[o:o + WINDOW])
                if at:
                    held.update((at[0], at[1] + k) for k in range(WINDOW))
        if len(held) > PROGRAM * total:
            out.append((p, len(held), total))
    return out


def games(paths):
    """The game folders the paths given are in or hold."""
    out = []
    for g in sorted(glob.glob(os.path.join(ROOT, "games", "*", "*"))):
        for base in (os.path.abspath(x).rstrip(os.sep) for x in paths):
            if os.path.isdir(g) and (g == base or g.startswith(base + os.sep) or base.startswith(g + os.sep)):
                out.append(g)
                break
    return out


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
    for g in games(paths):
        for p, held, total in programs(g):
            print(f"  x  {os.path.relpath(p, ROOT)}: holds {held} of the game's {total} code bytes "
                  f"({100 * held / total:.0f} %); a page carries the data its widgets need, never the "
                  "program: zero the code it does not read"); bad += 1
    if bad:
        print(f"\nFAILED - {bad} file(s) that must not be committed. Game binaries live only in work/.")
        sys.exit(1)
    print("OK - no game binaries")


if __name__ == "__main__":
    main()
