#!/usr/bin/env python3
"""Write a game's symbols.json, the canonical, tool-independent symbol map.

Reads from the running disassembler (c64: regenerator2000 over MCP), or
from one of its own files: a .regen2000proj with --project, or a SkoolKit
control file with --ctl. Never includes the memory image.

Usage:
  symbols_export.py <game dir>                      from the live disassembler
  symbols_export.py <game dir> --project <file>     from a regenerator2000 project (c64)
  symbols_export.py <game dir> --ctl <file>         from a SkoolKit control file (spectrum)
  symbols_export.py <part dir> --from <part dir>    a part's share of the live session that was
                                                    started on another part's snapshot

Coverage regions come from game.json. The platform rule is the same for
every game: "video" names the screen base (excluded: it is output) and the
character-set base (included: authored data the video chip reads through a
register, so nothing references it by address); the stack and I/O are
always excluded. "coverage" adds per-game exclusions and extra authored
blocks on top, and "include" gives back part of a default exclusion that
the game really uses (RAM under the I/O area, in a game that banks the I/O
out to run code or keep tables there). Addresses are hex strings like
"$0400".

A part of a game that is several loads (kit/scripts/parts.py) is exported
from its own folder, and takes only what lies at the addresses it owns: one
session on a snapshot that holds a level over its engine exports twice, the
engine's folder and the level's, and each gets its share.
"""
import importlib.util, json, os, sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PLATFORM_DEFAULTS = {
    "c64": {
        "exclude": [["$0100", "$01FF", "stack"], ["$D000", "$DFFF", "I/O and colour RAM"]],
        "extra": [],
        "screen_size": 0x400,      # 1000 cells plus the sprite pointers
        "charset_size": 0x800,
        "snapshot_ext": "vsf",     # the hand-over default, work/entry.<ext> (listing.py)
        # for listing.py's check of data the ledger does not count: RAM that a default
        # exclusion covers but a game can still use, and the machine's own work area,
        # which is never reported as the game's data
        "hidden": [["$D000", "$DFFF", "the RAM under the I/O area",
                    "kit/skills/c64/c64-reference, \"RAM the CPU cannot see\""]],
        "system": [["$0000", "$03FF", "zero page, stack and the KERNAL's work area"]],
    },
    "spectrum": {
        # The 48K machine's ROM owns $0000-$3FFF: the machine's own routines, never
        # the game's. The picture (the bitmap and the attributes) is added from
        # video.screen below, so it is not repeated here. The printer buffer and the
        # system variables above it ($5B00-$5CB5) are not excluded: a game that runs
        # with the ROM's interrupt off keeps its own data there.
        "exclude": [["$0000", "$3FFF", "ROM"]],
        "extra": [],
        "screen_size": 0x1B00,     # $4000-$5AFF: the bitmap ($1800) and the attributes ($300)
        "charset_size": 0x300,     # the ROM font in $3D00-$3FFF
        "snapshot_ext": "sna",     # the hand-over default, work/entry.<ext> (listing.py)
        "hidden": [],              # I/O is port-mapped, so no address has two meanings
        "system": [["$0000", "$3FFF", "ROM and the machine's own routines"]],
    },
}


def load_by_path(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def platform_fn(plat, fname, modules):
    """The first function called fname in kit/<plat>/<module>.py, by presence."""
    for m in modules:
        path = os.path.join(KIT, plat or "", m + ".py")
        if not os.path.exists(path):
            continue
        fn = getattr(load_by_path(path, f"{plat}_{m}"), fname, None)
        if fn:
            return fn
    sys.exit(f"kit/{plat}/ has no module with {fname}() (looked for {', '.join(modules)}.py); "
             f"see kit/PLATFORMS.md")


def read_live(plat, gdir=None):
    """(blocks, symbols, comments) from a live disassembler, per platform. gdir is the game
    or part being read: a client that keeps one disassembler per part finds its own by it."""
    return platform_fn(plat, "read_live", ("r2000", "skoolkit"))(gdir)


def read_file(plat, path, kind="project"):
    """(blocks, symbols, comments) from a disassembler's project or control file.

    `kind` selects the reader: "project" for the disassembler's own project file,
    "ctl" for a SkoolKit control file. A platform without that reader says so
    rather than parsing the wrong format as the right one."""
    return platform_fn(plat, "read_file", ("skoolkit",) if kind == "ctl" else ("project",))(path)


def platform_of(game):
    """game.json's platform, which every game must name (kit/PLATFORMS.md)."""
    plat = game.get("platform")
    if not plat:
        sys.exit(f"{game.get('slug') or game.get('title') or 'game.json'} names no platform; "
                 "every game must (kit/PLATFORMS.md)")
    return plat


def hexint(s):
    return int(s[1:], 16) if isinstance(s, str) and s.startswith("$") else int(s)


def regions(game):
    plat = platform_of(game)
    d = PLATFORM_DEFAULTS.get(plat, {"exclude": [], "extra": []})
    exclude = [[hexint(a), hexint(b), n] for a, b, n in d["exclude"]]
    extra = [[hexint(a), hexint(b), n] for a, b, n in d["extra"]]
    video = game.get("video") or {}
    if video.get("screen"):
        a = hexint(video["screen"]); exclude.append([a, a + d.get("screen_size", 0x400) - 1, "screen RAM"])
    if video.get("charset"):
        a = hexint(video["charset"]); extra.append([a, a + d.get("charset_size", 0x800) - 1, "character set"])
    cov = game.get("coverage", {})
    exclude += [[hexint(a), hexint(b), n] for a, b, n in cov.get("exclude", [])]
    extra += [[hexint(a), hexint(b), n] for a, b, n in cov.get("extra", [])]
    # "include" carves ranges the game really uses back out of the exclusions, such as
    # the RAM under the C64's I/O area in a game that banks the I/O out to run code there
    for a, b in [(hexint(a), hexint(b)) for a, b, _ in cov.get("include", [])]:
        carved = []
        for lo, hi, n in exclude:
            if hi < a or lo > b:
                carved.append([lo, hi, n]); continue
            if lo < a: carved.append([lo, a - 1, n])
            if hi > b: carved.append([b + 1, hi, n])
        exclude = carved
    out = {"exclude": exclude, "extra": extra}
    # a part of a game that is several loads: the addresses another part owns are not this
    # one's to count, whatever "include" says (kit/scripts/parts.py, load_game)
    if game.get("elsewhere"):
        out["elsewhere"] = [[lo, hi, n] for lo, hi, n in game["elsewhere"]]
        out["exclude"] = exclude + out["elsewhere"]
    return out


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    gdir = argv[0]
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from parts import load_game, parts, clip, home
    if parts(gdir):
        sys.exit(f"{gdir} is a game of several parts: export one, {os.path.join(gdir, 'parts', '<id>')}")
    game = load_game(gdir)
    plat = platform_of(game)
    key = next((k for k in ("--project", "--ctl") if k in argv), None)
    if key:
        blocks, syms, comments = read_file(plat, argv[argv.index(key) + 1],
                                           "ctl" if key == "--ctl" else "project")
        source = "regen2000proj" if key == "--project" else "control file"
    else:
        blocks, syms, comments = read_live(plat, argv[argv.index("--from") + 1] if "--from" in argv else gdir)
        source = "regenerator2000 live" if plat == "c64" else "live"
    reg, left = regions(game), []
    if reg.get("elsewhere"):
        blocks, syms, comments, left = clip(blocks, syms, comments, reg["elsewhere"])
    syms.sort(key=lambda s: s["address"])
    comments.sort(key=lambda c: (c["address"], c["type"]))
    out = {"schema": 1, "platform": game.get("platform"), "game": game.get("slug")}
    if game.get("part"):
        out["part"] = game["part"]["id"]
    out.update({
        "build": game.get("build"),
        "source": source,
        "regions": reg,
        "blocks": sorted(blocks, key=lambda b: b["start"]),
        "symbols": syms,
        "comments": comments,
    })
    path = os.path.join(gdir, "symbols.json")
    with open(path, "w") as f:
        json.dump(out, f, indent=1)
    print(f"wrote {path}: {len(blocks)} blocks, {len(syms)} symbols "
          f"({sum(1 for s in syms if s['kind']=='user')} user), {len(comments)} comments")
    if left:
        # what the session holds at addresses another part owns: kept only if that part has it too
        top = home(gdir)[0]
        have = set()
        for p in parts(top):
            f = os.path.join(p["dir"], "symbols.json")
            if p["id"] != game["part"]["id"] and os.path.isfile(f):
                S = json.load(open(f))
                have |= {(x["address"], x["name"]) for x in S["symbols"]}
                have |= {(x["address"], x["type"], x["text"]) for x in S["comments"]}
        lost = [x for x in left if ((x["address"], x["name"]) if "name" in x else
                                    (x["address"], x["type"], x["text"])) not in have]
        if lost:
            print(f"\n{len(lost)} label(s) and comment(s) of yours are at addresses this part does not own and are in "
                  "no other part's symbols.json:")
            for x in lost[:8]:
                print(f"  ${x['address']:04X}  {x.get('name') or x['text'][:60]}")
            if len(lost) > 8:
                print(f"  and {len(lost) - 8} more")
            print("Export the part that owns them from this session too (its folder in place of this one), "
                  "or they are lost when the project is next rebuilt.")


if __name__ == "__main__":
    main()
