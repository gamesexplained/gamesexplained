#!/usr/bin/env python3
"""Check basic.py, the listing's BASIC text type, on a small program and its variables.

A program of seven lines and a variable of every kind are laid out in a
48K memory image as the ROM keeps them. Each item's text is checked against
what it must read, and, when SkoolKit is installed, the program lines and
the plain variables against SkoolKit's own BASIC lister (`snapinfo.py -b`),
the oracle for how LIST prints a line. With `KIT_REQUIRE_TOOLS` set, a
missing SkoolKit fails the test rather than skipping the oracle.

Usage: test_basic.py
"""
import glob, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import basic

PROG, NUM = 0x5CCB, 0x0E


def n5(v):
    """A small integer as the ROM stores it."""
    return [0, 0xFF if v < 0 else 0, v & 0xFF, (v >> 8) & 0xFF, 0]


def line(num, body):
    body = list(body) + [0x0D]
    return [num >> 8, num & 0xFF, len(body) & 0xFF, len(body) >> 8] + body


def t(s):
    return [ord(c) for c in s]


LINES = [
    (10, [0xEA] + t("hello"), '10 REM hello'),
    (20, [0xF1] + t("a=5") + [NUM] + n5(5), '20 LET a=5'),
    (30, [0xF5] + t('"x";a: ') + [0xEC] + t("10") + [NUM] + n5(10), '30 PRINT "x";a: GO TO 10'),
    (40, [0xFA] + t("a") + [0xC9] + t("5") + [NUM] + n5(5) + [0xCB, 0xF5, 0xA5] + t("*10") + [NUM] + n5(10),
     '40 IF a<>5 THEN PRINT RND*10'),
    (50, [0xCE] + t("f(x") + [NUM] + n5(0) + t(")=x*2") + [NUM] + n5(2), '50 DEF FN f(x)=x*2'),
    (60, [0xF1] + t("b=3") + [NUM] + n5(7), '60 LET b=3{7}'),
    (70, [0xF5, 0xD9] + t("2") + [NUM] + n5(2) + t(';"a"') + [0xC6] + t("1") + [NUM] + n5(1)
     + [0x3A, 0xF5, 0x10, 0x02] + t('"b"'), '70 PRINT INK 2;"a" AND 1: PRINT {0x1002}"b"'),
]

VARS = [
    ([0x61] + n5(5), ["a=5"]),
    ([0xA1] + t("b") + [ord("c") | 0x80] + [0x81, 0x40, 0, 0, 0], ["abc=1.5"]),
    ([0x58, 2, 0] + t("hi"), ['x$="hi"']),
    ([0x84, 1 + 2 + 15, 0, 1, 3, 0] + n5(1) + n5(2) + n5(3), ["DIM d(3)", "d(1)=1", "d(2)=2", "d(3)=3"]),
    ([0xC5, 1 + 4 + 6, 0, 2, 2, 0, 3, 0] + t("abcdef"), ["DIM e$(2,3)", 'e$(1)="abc"', 'e$(2)="def"']),
    ([0xE9] + n5(1) + n5(10) + n5(1) + [30, 0, 2],
     ["i=1 (FOR i: limit 10, step 1, loops to line 30 statement 2)"]),
    ([0x80], ["(end of the variables)"]),
]


def image():
    ram = bytearray(0x10000)
    a = PROG
    for num, body, _ in LINES:
        bs = line(num, body)
        ram[a:a + len(bs)] = bytes(bs); a += len(bs)
    vars_ = a
    for bs, _ in VARS:
        ram[a:a + len(bs)] = bytes(bs); a += len(bs)
    ram[23635:23637] = bytes([PROG & 0xFF, PROG >> 8])
    ram[23627:23629] = bytes([vars_ & 0xFF, vars_ >> 8])
    return ram, vars_, a - 1


def items(ram, start, end):
    texts, starts = basic.pieces(ram, start, end)
    order = sorted(starts)
    out = []
    for i, s in enumerate(order):
        e = order[i + 1] if i + 1 < len(order) else end + 1
        out.append(("".join(texts.get(x, "") for x in range(s, e)), starts[s]))
    return out


def skoolkit():
    for p in glob.glob(os.path.join(HERE, "..", "..", "tools", "skoolkit", "lib", "python*", "site-packages")):
        sys.path.insert(0, p)
    sys.path[:] = [p for p in sys.path if os.path.abspath(p) != HERE]   # skoolkit.py here shadows the package
    sys.modules.pop("skoolkit", None)
    try:
        from skoolkit.basic import BasicLister, VariableLister
        return BasicLister, VariableLister
    except ImportError:
        return None


def main():
    ram, vars_, end = image()
    got = items(ram, PROG, end)
    want = [(w, "routine") for _, _, w in LINES]
    for _, texts in VARS:
        want += [(x, "table" if x.startswith(("DIM d", "d(", "DIM e", "e$(")) else "variable") for x in texts]
    bad = [(g, w) for g, w in zip(got, want) if g != w]
    assert len(got) == len(want) and not bad, (len(got), len(want), bad[:3])

    # an item a label cuts in two still reads as the whole: the texts are per byte
    texts, _ = basic.pieces(ram, PROG, end)
    a30 = PROG + sum(4 + len(b) + 1 for _, b, _ in LINES[:2])
    whole = "".join(texts[x] for x in range(a30, a30 + 4 + len(LINES[2][1]) + 1))
    assert whole == LINES[2][2], whole
    assert basic.byte_text(0xEC) == "GO TO" and basic.byte_text(0x41) == "A"
    assert basic.byte_text(0x90) == "{UDG-A}" and basic.byte_text(0x01) == "{0x01}"

    lister = skoolkit()
    if lister is None:
        if os.environ.get("KIT_REQUIRE_TOOLS"):
            sys.exit("FAILED - test_basic.py: SkoolKit is not installed, so the oracle cannot run "
                     "(python3 kit/scripts/tools.py --platform spectrum get-skoolkit)")
        print(f"ok - basic.py: {len(got)} items read as they must (SkoolKit not installed: oracle skipped)")
        return
    BasicLister, VariableLister = lister
    theirs = [x.lstrip() for x in BasicLister().list_basic(list(ram)).splitlines()]
    ours = [g for g, k in got if k == "routine"]
    assert theirs == ours, list(zip(theirs, ours))
    plain = [x for x in VariableLister().list_variables(list(ram)).splitlines() if "(" not in x]
    ours = [g for g, k in got if k == "variable" and "(" not in g]
    assert plain == ours, (plain, ours)
    print(f"ok - basic.py: {len(got)} items read as they must, and {len(theirs)} lines and "
          f"{len(plain)} variables as SkoolKit's lister reads them")


if __name__ == "__main__":
    main()
