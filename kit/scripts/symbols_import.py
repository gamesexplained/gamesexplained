#!/usr/bin/env python3
"""Rebuild a regenerator2000 project from symbols.json and your own snapshot.

The project file embeds the memory image, so it is never committed; this
script recreates it locally from the two things that are allowed to exist:
the shared symbol map and the contributor's own VICE snapshot.

Usage:
  symbols_import.py <game dir> <snapshot.vsf> [out.regen2000proj]

Default output: <game dir>/work/<slug>.regen2000proj. Start the disassembler
from it: `regenerator2000 --mcp-server <that file>`.
"""
import base64, gzip, json, os, sys

VSF_RAM_OFFSET = 209
TO_PROJECT = {
    "Code": "Code", "Byte": "DataByte", "Word": "DataWord", "Address": "Address",
    "PETSCII": "PetsciiText", "PETSCII Text": "PetsciiText",
    "Screencode": "ScreencodeText", "Screencode Text": "ScreencodeText",
    "Lo/Hi Address": "LoHiAddress", "Hi/Lo Address": "HiLoAddress",
    "Lo/Hi Word": "LoHiWord", "Hi/Lo Word": "HiLoWord",
    "External File": "ExternalFile", "Undefined": "Undefined",
}


def main():
    argv = sys.argv[1:]
    if len(argv) < 2 or argv[0] in ("-h", "--help"):
        print(__doc__); return
    gdir, vsf = argv[0], argv[1]
    game = json.load(open(os.path.join(gdir, "game.json")))
    out = argv[2] if len(argv) > 2 else os.path.join(gdir, "work", f"{game['slug']}.regen2000proj")
    sym = json.load(open(os.path.join(gdir, "symbols.json")))
    ram = open(vsf, "rb").read()[VSF_RAM_OFFSET:VSF_RAM_OFFSET + 0x10000]
    assert len(ram) == 0x10000, "snapshot too short: is this a VICE .vsf?"
    labels = {}
    for s in sym["symbols"]:
        if s.get("kind", "user") != "user":
            continue  # the disassembler regenerates auto symbols itself
        labels.setdefault(str(s["address"]), []).append(
            {"name": s["name"], "label_type": s["type"], "kind": "User"})
    project = {
        "version": 1, "origin": 0,
        "raw_data_base64": base64.b64encode(gzip.compress(ram, mtime=0)).decode(),
        "blocks": [{"start": b["start"], "end": b["end"], "type_": TO_PROJECT.get(b["type"], b["type"]),
                    "collapsed": False} for b in sym["blocks"]],
        "labels": labels,
        "user_line_comments": {str(c["address"]): c["text"] for c in sym["comments"] if c["type"] == "line"},
        "user_side_comments": {str(c["address"]): c["text"] for c in sym["comments"] if c["type"] == "side"},
    }
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as f:
        json.dump(project, f, indent=1, sort_keys=True)
    print(f"wrote {out}: {len(project['blocks'])} blocks, {len(labels)} labelled addresses, "
          f"{len(project['user_line_comments'])} line comments")


if __name__ == "__main__":
    main()
