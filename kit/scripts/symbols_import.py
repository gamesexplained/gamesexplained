#!/usr/bin/env python3
"""Build a regenerator2000 project from symbols.json and your own snapshot.

The project file embeds the memory image, so it is never committed; this
script recreates it locally from the two things that are allowed to exist:
the shared symbol map and the contributor's own VICE snapshot. A game with
no symbols.json yet gets a project with no annotations, which is how a run
starts: `tools.py r2000 <snapshot>` calls this when the snapshot has no
project, then starts the disassembler on the project, so that
`r2000_save_project` works from the first annotation.

Usage:
  symbols_import.py <game dir> <snapshot.vsf> [out.regen2000proj] [--force]

Default output: <game dir>/work/<snapshot name>.regen2000proj, the file
`tools.py r2000 <snapshot>` starts on. An existing project is overwritten
only with --force: the disassembler saves into it, so it can hold work
newer than symbols.json.
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
EMPTY = {"blocks": [], "symbols": [], "comments": []}


def snapshot_ram(vsf):
    ram = open(vsf, "rb").read()[VSF_RAM_OFFSET:VSF_RAM_OFFSET + 0x10000]
    assert len(ram) == 0x10000, f"{vsf} is too short: is it a VICE .vsf?"
    return ram


def project_ram(path):
    """The memory image a project file embeds."""
    return gzip.decompress(base64.b64decode(json.load(open(path))["raw_data_base64"]))


def default_project(gdir, vsf):
    return os.path.join(gdir, "work", os.path.splitext(os.path.basename(vsf))[0] + ".regen2000proj")


def symbols(gdir):
    """The game's symbols.json, or an empty map when there is none yet."""
    path = os.path.join(gdir, "symbols.json")
    return json.load(open(path)) if os.path.exists(path) else EMPTY


def project(sym, ram):
    labels = {}
    for s in sym["symbols"]:
        if s.get("kind", "user") != "user":
            continue  # the disassembler regenerates auto symbols itself
        labels.setdefault(str(s["address"]), []).append(
            {"name": s["name"], "label_type": s["type"], "kind": "User"})
    # A project marks every byte its blocks leave out as code, where a snapshot loads as
    # undefined: lay an undefined block under the whole image first, so that an empty map
    # loads the way the snapshot would.
    blocks = [{"start": 0, "end": len(ram) - 1, "type": "Undefined"}] + sym["blocks"]
    return {
        "version": 1, "origin": 0,
        "raw_data_base64": base64.b64encode(gzip.compress(ram, mtime=0)).decode(),
        "blocks": [{"start": b["start"], "end": b["end"], "type_": TO_PROJECT.get(b["type"], b["type"]),
                    "collapsed": False} for b in blocks],
        "labels": labels,
        "user_line_comments": {str(c["address"]): c["text"] for c in sym["comments"] if c["type"] == "line"},
        "user_side_comments": {str(c["address"]): c["text"] for c in sym["comments"] if c["type"] == "side"},
    }


def write(proj, out):
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with open(out, "w") as f:
        json.dump(proj, f, indent=1, sort_keys=True)


def build(gdir, vsf, out):
    sym = symbols(gdir)
    proj = project(sym, snapshot_ram(vsf))
    write(proj, out)
    return (f"wrote {out}: {len(sym['blocks'])} blocks, {len(proj['labels'])} labelled addresses, "
            f"{len(proj['user_line_comments'])} line comments")


def unsaved(gdir, path):
    """How many user labels and comments symbols.json holds that the project file does not:
    symbols.json changed after the project's last save (a merge, or an edit by hand)."""
    p, sym = json.load(open(path)), symbols(gdir)
    have = {(int(a), l["name"]) for a, ls in p.get("labels", {}).items() for l in ls}
    have |= {(int(a), "line", t) for a, t in p.get("user_line_comments", {}).items()}
    have |= {(int(a), "side", t) for a, t in p.get("user_side_comments", {}).items()}
    want = {(s["address"], s["name"]) for s in sym["symbols"] if s.get("kind", "user") == "user"}
    want |= {(c["address"], c["type"], c["text"]) for c in sym["comments"]}
    return len(want - have)


def main():
    argv = sys.argv[1:]
    force = "--force" in argv
    argv = [a for a in argv if a != "--force"]
    if len(argv) < 2 or argv[0] in ("-h", "--help"):
        print(__doc__); return
    gdir, vsf = argv[0], argv[1]
    if not os.path.exists(os.path.join(gdir, "game.json")):
        sys.exit(f"{gdir} is not a game folder: it has no game.json")
    out = argv[2] if len(argv) > 2 else default_project(gdir, vsf)
    if os.path.exists(out) and not force:
        sys.exit(f"{out} exists, and can hold work saved after symbols.json was written.\n"
                 "Start the disassembler on it instead (`tools.py r2000` on the snapshot), or pass "
                 "--force to replace it with what symbols.json holds.")
    if not os.path.exists(os.path.join(gdir, "symbols.json")):
        print("no symbols.json yet: the project starts with no annotations")
    print(build(gdir, vsf, out))


if __name__ == "__main__":
    main()
