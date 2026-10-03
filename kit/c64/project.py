#!/usr/bin/env python3
"""Read and write the C64's regenerator2000 project file.

A `.regen2000proj` embeds the memory image, so it is never committed:
symbols_import.py rebuilds it locally from symbols.json and the
contributor's own snapshot, and symbols_export.py --project reads one
back. The block-type vocabulary is symbols.json's, shared by every
platform, so a project type is translated on the way in and out.

  read_file(path)                    -> (blocks, symbols, comments)
  write(gdir, snapshot, out=None)    -> path written

Usage:
  project.py --roundtrip <snapshot.vsf>   self-check in a temp dir
"""
import base64, gzip, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from snapshot import read  # the one .vsf reader  # noqa: E402

PROJECT_BLOCK_TYPES = {
    "Code": "Code", "DataByte": "Byte", "DataWord": "Word", "Address": "Address",
    "PetsciiText": "PETSCII", "ScreencodeText": "Screencode",
    "LoHiAddress": "Lo/Hi Address", "HiLoAddress": "Hi/Lo Address",
    "LoHiWord": "Lo/Hi Word", "HiLoWord": "Hi/Lo Word",
    "ExternalFile": "External File", "Undefined": "Undefined",
}

TO_PROJECT = {
    "Code": "Code", "Byte": "DataByte", "Word": "DataWord", "Address": "Address",
    "PETSCII": "PetsciiText", "PETSCII Text": "PetsciiText",
    "Screencode": "ScreencodeText", "Screencode Text": "ScreencodeText",
    "Lo/Hi Address": "LoHiAddress", "Hi/Lo Address": "HiLoAddress",
    "Lo/Hi Word": "LoHiWord", "Hi/Lo Word": "HiLoWord",
    "External File": "ExternalFile", "Undefined": "Undefined",
}


def project_blocks(blocks):
    """Keep declared types; gaps must neither decode as code nor gain typed-data coverage."""
    result = []
    cursor = 0
    for block in sorted(blocks, key=lambda b: b["start"]):
        start, end = block["start"], block["end"]
        if not cursor <= start <= end < 0x10000:
            raise ValueError("symbol blocks overlap or lie outside C64 RAM")
        if cursor < start:
            result.append({"start": cursor, "end": start - 1,
                           "type_": "Undefined", "collapsed": False})
        result.append({"start": start, "end": end,
                       "type_": TO_PROJECT.get(block["type"], block["type"]),
                       "collapsed": False})
        cursor = end + 1
    if cursor < 0x10000:
        result.append({"start": cursor, "end": 0xFFFF,
                       "type_": "Undefined", "collapsed": False})
    return result


def read_file(path):
    """(blocks, symbols, comments) from a .regen2000proj."""
    p = json.load(open(path))
    blocks = [{"start": b["start"], "end": b["end"], "type": PROJECT_BLOCK_TYPES.get(b["type_"], b["type_"])}
              for b in p["blocks"]]
    syms = [{"address": int(a), "name": l["name"], "type": l["label_type"], "kind": l.get("kind", "User").lower()}
            for a, ls in p["labels"].items() for l in ls]
    comments = ([{"address": int(a), "type": "line", "text": t} for a, t in p.get("user_line_comments", {}).items() if t.strip()]
                + [{"address": int(a), "type": "side", "text": t} for a, t in p.get("user_side_comments", {}).items() if t.strip()])
    return blocks, syms, comments


def write(gdir, snapshot, out=None):
    """Write a .regen2000proj from gdir's symbols.json and the snapshot. Returns the path."""
    game = json.load(open(os.path.join(gdir, "game.json")))
    if out is None:
        out = os.path.join(gdir, "work", f"{game['slug']}.regen2000proj")
    sym = json.load(open(os.path.join(gdir, "symbols.json")))
    ram = read(snapshot)
    labels = {}
    for s in sym["symbols"]:
        if s.get("kind", "user") != "user":
            continue  # the disassembler regenerates auto symbols itself
        labels.setdefault(str(s["address"]), []).append(
            {"name": s["name"], "label_type": s["type"], "kind": "User"})
    project = {
        "version": 1, "origin": 0,
        "raw_data_base64": base64.b64encode(gzip.compress(ram, mtime=0)).decode(),
        "blocks": project_blocks(sym["blocks"]),
        "labels": labels,
        "user_line_comments": {str(c["address"]): c["text"] for c in sym["comments"] if c["type"] == "line"},
        "user_side_comments": {str(c["address"]): c["text"] for c in sym["comments"] if c["type"] == "side"},
    }
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as f:
        json.dump(project, f, indent=1, sort_keys=True)
    print(f"wrote {out}: {len(project['blocks'])} blocks, {len(labels)} labelled addresses, "
          f"{len(project['user_line_comments'])} line comments")
    return out


# --- self-check -----------------------------------------------------------
def test():
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        game = os.path.join(d, "g"); os.makedirs(os.path.join(game, "work"))
        json.dump({"slug": "demo", "platform": "c64"}, open(os.path.join(game, "game.json"), "w"))
        json.dump({"blocks": [{"start": 0x8000, "end": 0x8001, "type": "Code"},
                              {"start": 0x8002, "end": 0x8003, "type": "Lo/Hi Address"}],
                   "symbols": [{"address": 0x8000, "name": "start", "type": "Subroutine", "kind": "user"}],
                   "comments": [{"address": 0x8000, "type": "line", "text": "hi"}]},
                  open(os.path.join(game, "symbols.json"), "w"))
        body = bytes(0x10000)
        head = b"VICE Snapshot File" + b" C64SC\0"
        open(os.path.join(game, "work", "s.vsf"), "wb").write(head + bytes(209 - len(head)) + body)
        out = write(game, os.path.join(game, "work", "s.vsf"))
        blocks, syms, comments = read_file(out)
        kinds = {b["start"]: b["type"] for b in blocks}
        assert kinds[0x8002] == "Lo/Hi Address", blocks
        assert kinds[0] == kinds[0x8004] == "Undefined", blocks       # the gaps project_blocks fills
        assert syms[0]["name"] == "start" and comments[0]["text"] == "hi", (syms, comments)
    print("ok - project.py self-check: block types and symbols survive a round trip, gaps are Undefined")


def main():
    argv = sys.argv[1:]
    if argv and argv[0] == "--roundtrip":
        test(); return
    print(__doc__)


if __name__ == "__main__":
    main()
