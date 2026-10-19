#!/usr/bin/env python3
"""Test of kit/c16/codemap.py's reading of the server's record, without the server: the C16's
repeats of its 16 KB folded onto $0000-$3FFF and the ROMs' half left out, each instruction sized
from the RAM, and two instructions that overlap without ending together counted by their opcodes
alone and named. Exits 1 on a failure.

  python3 kit/c16/test_codemap.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from codemap import fold, runs, sizes  # noqa: E402

failed = 0


def check(ok, what):
    global failed
    if not ok:
        failed += 1
        print("FAIL " + what)


kept, left = fold([0x1234, 0x5234, 0x3FFF, 0x7FFF, 0x9234, 0xD234], 0x4000)
check(kept == {0x1234, 0x3FFF} and left == 2, f"a C16's record folds onto $0000-$3FFF and leaves out $8000 up: {sorted(kept)}, {left}")
kept, left = fold([0x1234, 0x5234, 0x9234], 0x10000)
check(kept == {0x1234, 0x5234} and left == 1, f"a Plus/4's record keeps $4000-$7FFF as it is: {sorted(kept)}, {left}")

check(runs([5, 1, 2, 3, 7]) == [[1, 3], [5, 5], [7, 7]], "runs of addresses")

ram = bytearray(0x10000)
ram[0x1000:0x1004] = bytes([0xA9, 0x00, 0xEA, 0x60])       # LDA #$00, NOP, RTS
size, changed = sizes({0x1000, 0x1002, 0x1003}, ram)
check(size == {0x1000: 2, 0x1002: 1, 0x1003: 1} and not changed, f"instructions sized from the RAM: {size}")

ram[0x2000:0x2004] = bytes([0xAD, 0xA9, 0x00, 0x60])       # LDA $00A9, and LDA #$00 inside it, ending together
size, changed = sizes({0x2000, 0x2001, 0x2003}, ram)
check(size == {0x2000: 3, 0x2001: 2, 0x2003: 1} and not changed, f"an instruction inside another that ends with it: {size}, {changed}")

ram[0x3000:0x3004] = bytes([0xAD, 0xEA, 0x00, 0x60])       # LDA $00EA, and a NOP inside it that does not
size, changed = sizes({0x3000, 0x3001}, ram)
check(size == {0x3000: 1, 0x3001: 1} and changed == [0x3000, 0x3001], f"two that overlap without ending together: {size}, {changed}")

print(f"{failed} failed" if failed else "codemap.py: the record folded, sized and its overlaps named: ok")
sys.exit(1 if failed else 0)
