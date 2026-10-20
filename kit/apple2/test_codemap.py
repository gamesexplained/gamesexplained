#!/usr/bin/env python3
"""Test of kit/apple2/codemap.py's reading of the server's record, without the server: the
instructions at $C000 and above left out, each instruction sized as the server ran it, and two
instructions that overlap without ending together counted by their opcodes alone and named.
Exits 1 on a failure.

  python3 kit/apple2/test_codemap.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from codemap import keep, runs, sizes  # noqa: E402

failed = 0


def check(ok, what):
    global failed
    if not ok:
        failed += 1
        print("FAIL " + what)


kept, left = keep([[0x0800, 1, 1], [0x6000, 3, 9], [0xBFFF, 1, 1], [0xC100, 2, 1], [0xFB1E, 3, 70]])
check(kept == {0x0800: 1, 0x6000: 3, 0xBFFF: 1} and left == 2, f"$C000 and above left out: {kept}, {left}")

check(runs([5, 1, 2, 3, 7]) == [[1, 3], [5, 5], [7, 7]], "runs of addresses")

size, changed = sizes({0x1000: 2, 0x1002: 1, 0x1003: 1})
check(size == {0x1000: 2, 0x1002: 1, 0x1003: 1} and not changed, f"instructions sized as they ran: {size}")

size, changed = sizes({0x2000: 3, 0x2001: 2, 0x2003: 1})
check(size == {0x2000: 3, 0x2001: 2, 0x2003: 1} and not changed, f"an instruction inside another that ends with it: {size}, {changed}")

size, changed = sizes({0x3000: 3, 0x3001: 1})
check(size == {0x3000: 1, 0x3001: 1} and changed == [0x3000, 0x3001], f"two that overlap without ending together: {size}, {changed}")

print(f"{failed} failed" if failed else "codemap.py: the record kept, sized and its overlaps named: ok")
sys.exit(1 if failed else 0)
