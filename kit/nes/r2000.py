#!/usr/bin/env python3
"""regenerator2000, the disassembler, for an NES game.

The client is the C64's (kit/c64/r2000.py): the disassembler and its protocol are the same
for every machine, and so are the annotation log, --apply and --replay. This module is what
symbols_export.py and coverage.py load for an NES game, and it reads a session in the NES's
vocabulary: regenerator2000's PETSCII text is ASCII (kit/nes/project.py). The NES has no
system ROM, so nothing is named after one. The names regenerator2000's NES mode gives the
PPU's and the APU's registers come through as symbols of kind "system", as the C64's KERNAL
names do; they lie in the registers' range, which coverage leaves out, and listing.py names
those operands from kit/nes/registers.py whatever the session called them.

Start the session with `python3 kit/scripts/tools.py r2000 games/nes/<slug>/work/<state>.json.gz`,
which builds the project that names the machine (kit/nes/project.py) from the snapshot and the
last export, and starts on it; kit/skills/nes/steps, "disassembler", has the rest.

  read_live(gdir=None)          -> (blocks, symbols, comments)
  cross_references(addresses, gdir=None) -> {address: [the addresses that refer to it]}

Usage: as kit/c64/r2000.py, whose command line this passes on:
  r2000.py <tool> '<json arguments>'      r2000.py --apply <file>      r2000.py --list
"""
import importlib.util, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
C64 = os.path.join(os.path.dirname(HERE), "c64")
if C64 not in sys.path:
    sys.path.append(C64)          # the C64's client imports its own siblings (ports.py, kernal.py)


def _load(name, path):
    if name not in sys.modules:
        spec = importlib.util.spec_from_file_location(name, path)
        mod = importlib.util.module_from_spec(spec)
        sys.modules[name] = mod
        spec.loader.exec_module(mod)
    return sys.modules[name]


def _client():
    return _load("c64_r2000", os.path.join(C64, "r2000.py"))


def _project():
    return _load("nes_project", os.path.join(HERE, "project.py"))


def _answer(r, rpc, tool):
    """A read tool's result, or an exit that shows the disassembler's error."""
    out = r.call(rpc, tool, {})
    if r.failed(out):
        sys.exit(f"{tool} came back as an error, not a result:\n{out}\n"
                 "regenerator2000's crates.io release, 0.9.20, answers it (kit/skills/nes/tool-regen2000)")
    return json.loads(out)


def read_live(gdir=None):
    """(blocks, symbols, comments) from the running disassembler, in symbols.json's vocabulary."""
    r = _client()
    rpc = r.make_client(gdir)
    blocks = _answer(r, rpc, "r2000_get_blocks")
    syms = _answer(r, rpc, "r2000_get_symbols")
    comments = _answer(r, rpc, "r2000_get_comments")
    to_nes = _project().from_project
    return ([to_nes({"start": b["start_address"], "end": b["end_address"], "type": b["type"]}, "the live session")
             for b in blocks],
            [{"address": s["address"], "name": s["name"], "type": s["type"], "kind": s.get("kind", "user").lower()}
             for s in syms],
            [{"address": c["address"], "type": c["type"], "text": c["comment"]} for c in comments if c["comment"].strip()])


def cross_references(addresses, gdir=None):
    return _client().cross_references(addresses, gdir)


if __name__ == "__main__":
    _client().main()
