#!/usr/bin/env python3
"""regenerator2000, the disassembler, for a BBC Micro game.

The client is the C64's (kit/c64/r2000.py): the disassembler and its protocol are the same
for every machine, and so are the annotation log, --apply and --replay. This module is what
symbols_export.py and coverage.py load for a BBC game, and it reads a session in the BBC's
vocabulary: regenerator2000's PETSCII text is the BBC's ASCII, and its screencode text, which
means nothing on the BBC, is a BBC BASIC program (kit/bbc/basic.py). The MOS's calls and vectors that the game
refers to are named after the MOS (kit/bbc/mos.py), where the C64's client names the
KERNAL's.

Start the session with `python3 kit/scripts/tools.py r2000 games/bbc/<slug>/work/<state>.json.gz`,
which builds the project that names the machine (kit/bbc/project.py) from the snapshot and the
last export, and starts on it; kit/skills/bbc/tool-regen2000 has the rest.

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


def _client():
    name = "c64_r2000"
    if name not in sys.modules:
        spec = importlib.util.spec_from_file_location(name, os.path.join(C64, "r2000.py"))
        mod = importlib.util.module_from_spec(spec)
        sys.modules[name] = mod
        spec.loader.exec_module(mod)
    return sys.modules[name]


def _mos():
    name = "bbc_mos"
    if name not in sys.modules:
        spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, "mos.py"))
        mod = importlib.util.module_from_spec(spec)
        sys.modules[name] = mod
        spec.loader.exec_module(mod)
    return sys.modules[name]


def _project():
    name = "bbc_project"
    if name not in sys.modules:
        spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, "project.py"))
        mod = importlib.util.module_from_spec(spec)
        sys.modules[name] = mod
        spec.loader.exec_module(mod)
    return sys.modules[name]


def _answer(r, rpc, tool):
    """A read tool's result, or an exit that shows the disassembler's error."""
    out = r.call(rpc, tool, {})
    if r.failed(out):
        sys.exit(f"{tool} came back as an error, not a result:\n{out}\n"
                 "regenerator2000's crates.io release, 0.9.20, answers it (kit/skills/bbc/tool-regen2000)")
    return json.loads(out)


def read_live(gdir=None):
    """(blocks, symbols, comments) from the running disassembler, in symbols.json's vocabulary."""
    r = _client()
    rpc = r.make_client(gdir)
    blocks = _answer(r, rpc, "r2000_get_blocks")
    syms = _answer(r, rpc, "r2000_get_symbols")
    comments = _answer(r, rpc, "r2000_get_comments")
    to_bbc = _project().from_project
    mos = _mos()
    referred = [a for a, refs in r.cross_references(sorted(mos.NAMES), gdir).items() if refs]
    return ([to_bbc({"start": b["start_address"], "end": b["end_address"], "type": b["type"]}, "the live session")
             for b in blocks],
            mos.entry_points([{"address": s["address"], "name": s["name"], "type": s["type"],
                               "kind": s.get("kind", "user").lower()} for s in syms], referred),
            [{"address": c["address"], "type": c["type"], "text": c["comment"]} for c in comments if c["comment"].strip()])


def cross_references(addresses, gdir=None):
    return _client().cross_references(addresses, gdir)


if __name__ == "__main__":
    _client().main()
