#!/usr/bin/env python3
"""Self-test of kit/scripts/port_check.py, the Python half of a page's port test.

In a temp game folder: ask() runs a page's block and a body in node and gives
back what the body returns, whole when it is far past the 64 KB a pipe takes
at once; a missing block, a block that throws and a body that throws stop the
test with node's message, naming the page; image() is the listing's 64 KB;
the script's -h prints its usage. Needs node, as every page test does: with
none it skips, or fails under KIT_REQUIRE_TOOLS. Exits 1 on any failure.

  python3 kit/scripts/test_port_check.py
"""
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import port_check  # noqa: E402

PAGE = """<!doctype html>
<script>
/* ports.js */
globalThis.Ports = (function () {
  return { add: (a, b) => (a + b) & 0xFF };
})();
</script>
<script>
const Thrower = (function () {
  throw new Error('the block threw');
})();
</script>
"""


def main():
    if not shutil.which("node"):
        if os.environ.get("KIT_REQUIRE_TOOLS"):
            sys.exit("test_port_check.py: no node, and KIT_REQUIRE_TOOLS is set")
        print("no node on PATH: test_port_check.py is skipped")
        return 0
    fails = 0

    def check(what, ok, more=""):
        """ok is True, or what went wrong instead (stops gives the message it got)."""
        nonlocal fails
        good = ok is True
        print(("ok   " if good else "FAIL ") + what + ("" if good else f" {more or ok}"))
        fails += not good

    def stops(fn, *texts):
        try:
            fn()
        except SystemExit as e:
            return all(t in str(e) for t in texts) or str(e)
        return "no error"

    with tempfile.TemporaryDirectory() as game:
        with open(os.path.join(game, "page.html"), "w") as f:
            f.write(PAGE)
        with open(os.path.join(game, "listing.json"), "w") as f:
            f.write('{"records": [{"a": 4096, "b": [7, 8]}, {"a": 4098, "t": "gap"}, {"a": 65535, "b": [255]}]}')

        got = port_check.ask(game, "page.html", "ports.js", """
            const ram = game.listing().ram;
            return request.pairs.map(([a, b]) => Ports.add(a, b) + ram[0x1000]);
        """, {"pairs": [[200, 100], [1, 2]]}, wanted=["Ports"])
        check("ask: the body's answer, with the block and the listing", got == [44 + 7, 3 + 7], got)

        n = 40000
        big = port_check.ask(game, "page.html", "ports.js",
                             "return Array.from({ length: request }, (_, i) => i * 3);", n, wanted=["Ports"])
        check("ask: an answer far past 64 KB comes back whole", len(big) == n and big[-1] == 3 * (n - 1), len(big))

        check("ask: an async body", port_check.ask(game, "page.html", "ports.js",
                                                    "await null; return 'later';", wanted=["Ports"]) == "later")
        check("ask: a missing block names the page and the name",
              stops(lambda: port_check.ask(game, "page.html", "nosuch", "return 1;"), "page.html: no block nosuch"))
        check("ask: a block that throws names its page",
              stops(lambda: port_check.ask(game, "page.html", "Thrower", "return 1;"), "the block threw",
                    os.path.join(game, "page.html") + ":10:"))
        check("ask: a body that throws says so",
              stops(lambda: port_check.ask(game, "page.html", "ports.js", "throw new Error('the body threw');",
                                           wanted=["Ports"]), "the body threw"))

        mem = port_check.image(game)
        check("image: the listing's bytes, the rest 0",
              len(mem) == 0x10000 and mem[0x1000:0x1002] == bytes([7, 8]) and mem[0x1002] == 0 and mem[0xFFFF] == 255)

    p = subprocess.run([sys.executable, os.path.join(HERE, "port_check.py"), "-h"], capture_output=True, text=True)
    check("script: -h prints its usage", p.returncode == 0 and "ask(game, page, name" in p.stdout, p.stderr)

    print(f"{fails} FAILED" if fails else "all ok")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
