#!/usr/bin/env python3
"""Run a page's port in node from a Python test, to hold it against the game's own code.

A test whose simulator is in Python (SkoolKit's, for the Spectrum) runs the
game's routine there and asks the page for the same cases here. The page's
half is kit/scripts/port_check.js, whose header says how a page names its
blocks: this runs it, so the block is cut, run and read the same way as in a
test written in JavaScript.

  import port_check
  page = port_check.ask(GAME, "index.html", "FW", '''
      const ram = game.listing().ram;
      return request.views.map(([cell, x, y]) => FW.viewRecords(FW.walkBoard(ram), cell, x, y));
  ''', {"views": views})
  mem = port_check.image(GAME)          # listing.json's 64 KB, the bytes the page reads

ask(game, page, name, body, request, wanted=None) runs the block called name
in page (a path from the game folder), then body, the inside of a JavaScript
function of the identifiers in wanted (by default the block's name), game
(port_check.js's game(), for game.listing() and game.json()) and request
(anything JSON holds). body may await. What body returns comes back as JSON.
A page with no such block, a block that throws and a body that throws each
stop the test with node's message, naming the page and its line.

image(game, file="listing.json") gives a bytearray of 64 KB with every byte
the listing records, the rest 0: the memory the page's own C64.load or
Spectrum.load gives it.

  port_check.py <game folder> <page> <name> [identifier ...]
      runs the block in node and says what each identifier is
  port_check.py -h
      this text

Checked by kit/scripts/test_port_check.py.
"""
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
NODE_HALF = os.path.join(HERE, "port_check.js")


def node():
    """The node to run the page with; a test cannot hold a port without one."""
    exe = shutil.which("node")
    if not exe:
        sys.exit("port_check: no node on PATH, and the page's block runs in node "
                 "(the platform's INSTALL.md, \"A JavaScript runtime\")")
    return exe


def ask(game, page, name, body, request=None, wanted=None):
    """What body returns, run in node after the page's block called name."""
    msg = {"game": os.path.abspath(game), "page": page, "name": name,
           "wanted": list(wanted or []), "body": body, "request": request}
    p = subprocess.run([node(), NODE_HALF, "--ask"], input=json.dumps(msg),
                       capture_output=True, text=True)
    if p.returncode != 0:
        sys.exit(f"the page's block {name} in {page} did not run under node:\n" + p.stderr.strip())
    return json.loads(p.stdout)


def image(game, file="listing.json"):
    """listing.json's 64 KB: every byte a record holds, the rest 0."""
    with open(os.path.join(game, file)) as f:
        L = json.load(f)
    mem = bytearray(0x10000)
    for r in L["records"]:
        for i, v in enumerate(r.get("b") or []):
            mem[r["a"] + i] = v
    return mem


def main(argv):
    if len(argv) < 3 or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0 if argv and argv[0] in ("-h", "--help") else 2
    return subprocess.run([node(), NODE_HALF] + argv).returncode


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
