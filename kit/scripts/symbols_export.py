#!/usr/bin/env python3
"""Write a game's symbols.json, the canonical, tool-independent symbol map.

Reads from the running regenerator2000 MCP server, or from a
.regen2000proj file with --project. Never includes the memory image.

Usage:
  symbols_export.py <game dir>                      from the live server
  symbols_export.py <game dir> --project <file>     from a project file

Coverage regions come from game.json. The platform rule is the same for
every game: "video" names the screen base (excluded: it is output) and the
character-set base (included: authored data the video chip reads through a
register, so nothing references it by address); the stack and I/O are
always excluded. "coverage" adds per-game exclusions and extra authored
blocks on top. Addresses are hex strings like "$0400".
"""
import json, os, sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PLATFORM_DEFAULTS = {
    "c64": {
        "exclude": [["$0100", "$01FF", "stack"], ["$D000", "$DFFF", "I/O and colour RAM"]],
        "extra": [],
        "screen_size": 0x400,      # 1000 cells plus the sprite pointers
        "charset_size": 0x800,
    }
}

PROJECT_BLOCK_TYPES = {
    "Code": "Code", "DataByte": "Byte", "DataWord": "Word", "Address": "Address",
    "PetsciiText": "PETSCII", "ScreencodeText": "Screencode",
    "LoHiAddress": "Lo/Hi Address", "HiLoAddress": "Hi/Lo Address",
    "LoHiWord": "Lo/Hi Word", "HiLoWord": "Hi/Lo Word",
    "ExternalFile": "External File", "Undefined": "Undefined",
}


def hexint(s):
    return int(s[1:], 16) if isinstance(s, str) and s.startswith("$") else int(s)


def regions(game):
    plat = game.get("platform", "c64")
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
    return {"exclude": exclude, "extra": extra}


def from_live(plat):
    sys.path.insert(0, os.path.join(KIT, plat))   # kit/<platform>/r2000.py, the disassembler client
    from r2000 import make_client, call
    rpc = make_client()
    blocks = json.loads(call(rpc, "r2000_get_blocks", {}))
    syms = json.loads(call(rpc, "r2000_get_symbols", {}))
    comments = json.loads(call(rpc, "r2000_get_comments", {}))
    return ([{"start": b["start_address"], "end": b["end_address"], "type": b["type"]} for b in blocks],
            [{"address": s["address"], "name": s["name"], "type": s["type"],
              "kind": s.get("kind", "user").lower()} for s in syms],
            [{"address": c["address"], "type": c["type"], "text": c["comment"]}
             for c in comments if c["comment"].strip()])


def from_project(path):
    p = json.load(open(path))
    blocks = [{"start": b["start"], "end": b["end"], "type": PROJECT_BLOCK_TYPES.get(b["type_"], b["type_"])}
              for b in p["blocks"]]
    syms = [{"address": int(a), "name": l["name"], "type": l["label_type"], "kind": l.get("kind", "User").lower()}
            for a, ls in p["labels"].items() for l in ls]
    comments = ([{"address": int(a), "type": "line", "text": t} for a, t in p.get("user_line_comments", {}).items() if t.strip()]
                + [{"address": int(a), "type": "side", "text": t} for a, t in p.get("user_side_comments", {}).items() if t.strip()])
    return blocks, syms, comments


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    gdir = argv[0]
    game = json.load(open(os.path.join(gdir, "game.json")))
    if "--project" in argv:
        blocks, syms, comments = from_project(argv[argv.index("--project") + 1])
        source = "regen2000proj"
    else:
        blocks, syms, comments = from_live(game.get("platform", "c64"))
        source = "regenerator2000 live"
    syms.sort(key=lambda s: s["address"])
    comments.sort(key=lambda c: (c["address"], c["type"]))
    out = {
        "schema": 1,
        "platform": game.get("platform"),
        "game": game.get("slug"),
        "build": game.get("build"),
        "source": source,
        "regions": regions(game),
        "blocks": sorted(blocks, key=lambda b: b["start"]),
        "symbols": syms,
        "comments": comments,
    }
    path = os.path.join(gdir, "symbols.json")
    with open(path, "w") as f:
        json.dump(out, f, indent=1)
    print(f"wrote {path}: {len(blocks)} blocks, {len(syms)} symbols "
          f"({sum(1 for s in syms if s['kind']=='user')} user), {len(comments)} comments")


if __name__ == "__main__":
    main()
