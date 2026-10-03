#!/usr/bin/env python3
"""Check the Z80 table against SkoolKit, over the whole opcode space.

Every byte in every prefix context — base, CB, ED, DD, FD, DD CB, FD CB —
is decoded twice: once by `z80.decode` and once by SkoolKit's own
disassembler, which is the oracle. A byte SkoolKit leaves as DEFB must be
None here; anything else must agree on the mnemonic and the length. That
is what catches a wrong entry, a wrong addressing mode or a missing
prefix rule.

SkoolKit is needed only for this test, never to build a listing. If it is
not importable it is looked for under `tools/skoolkit/` (the launcher's
`get-skoolkit`); with neither, the oracle half is skipped and the length
table is checked against its own counts. CI runs it with
`--require-skoolkit`, which turns that skip into a failure.

Usage: test_z80.py [--require-skoolkit]
"""
import glob, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import z80


def load_skoolkit():
    """Find the SkoolKit package. kit/spectrum/skoolkit.py shadows it while HERE is on
    sys.path, so that entry comes off (z80 is already imported) and any cached shim is dropped."""
    sys.path[:] = [p for p in sys.path if os.path.abspath(p) != HERE]
    sys.modules.pop("skoolkit", None)
    for p in glob.glob(os.path.join(HERE, "..", "..", "tools", "skoolkit", "lib", "python*", "site-packages")):
        if os.path.isdir(p) and p not in sys.path:
            sys.path.insert(0, p)
    try:
        from skoolkit import components  # noqa: F401   the package, not the shim
        return True
    except ImportError:
        return False


def oracle():
    """SkoolKit's disassembler, set up to decode one instruction at a time."""
    from collections import namedtuple
    from skoolkit.components import get_component

    cfg = namedtuple("DConfig", "asm_hex asm_lower defb_size defm_size defw_size handle_rst imaker opcodes wrap")

    class Instr:
        def __init__(self, address, operation, data):
            self.address, self.operation, self.data = address, operation, list(data)

    # The undocumented slots the standard set leaves out, the table decodes too,
    # so the oracle is told to as well: ED63/ED6B/ED70/ED71 and the IM/NEG/RETN/
    # XYCB groups.
    conf = cfg(False, True, 8, 8, 4, False, lambda a, o, d: Instr(a, o, d),
               "ED63,ED6B,ED70,ED71,IM,NEG,RETN,XYCB", True)
    return get_component("Disassembler", [0] * 65536, conf)


def contexts():
    """(name, sequence-builder) for every byte's worth of prefix context."""
    return [("base", lambda b: [b]),
            ("CB", lambda b: [0xCB, b]),
            ("ED", lambda b: [0xED, b]),
            ("DD", lambda b: [0xDD, b, 0, 0]),
            ("FD", lambda b: [0xFD, b, 0, 0]),
            ("DDCB", lambda b: [0xDD, 0xCB, 0, b]),
            ("FDCB", lambda b: [0xFD, 0xCB, 0, b])]


def check_lengths():
    assert len(z80.BASE) == 252, len(z80.BASE)          # 256 minus the four prefixes
    assert len(z80.CB) == 256 and len(z80.ED) == 78, (len(z80.CB), len(z80.ED))
    assert len(z80.IX) == len(z80.IY) == 85, (len(z80.IX), len(z80.IY))
    assert len(z80.IXCB) == len(z80.IYCB) == 256
    for tab in (z80.BASE, z80.CB, z80.ED, z80.IX, z80.IY, z80.IXCB, z80.IYCB):
        for mn, mode, n in tab.values():
            assert mn and 1 <= n <= 4, (mn, mode, n)
    print(f"length table: ok ({len(z80.BASE)} base, {len(z80.CB)} CB, {len(z80.ED)} ED, "
          f"{len(z80.IX)} IX/IY, {len(z80.IXCB)} DD CB)")


def one(d, seq):
    d.snapshot[0x8000:0x8004] = [0, 0, 0, 0]
    d.snapshot[0x8000:0x8000 + len(seq)] = list(seq)
    i = d.disassemble(0x8000, 0x8001, "h")[0]
    return len(i.data), i.operation


def compare():
    d = oracle()
    ram = bytearray(0x10000)
    bad = []
    for name, mk in contexts():
        for b in range(256):
            seq = mk(b)
            ram[0x8000:0x8000 + len(seq)] = seq
            got = z80.decode(ram, 0x8000)
            n, text = one(d, seq)
            if text.startswith("defb"):
                if got is not None:
                    bad.append(f"{name} {b:02X}: skoolkit leaves it as data, z80 decodes {got}")
                continue
            want_mn, want_n = text.split(" ", 1)[0], n
            if got is None:
                bad.append(f"{name} {b:02X}: skoolkit decodes {text!r}, z80 says None")
            elif got[0] != want_mn or got[2] != want_n:
                bad.append(f"{name} {b:02X}: z80 {got!r} vs skoolkit {want_mn!r}/{want_n}")
    return bad


def main():
    check_lengths()
    if not load_skoolkit():
        if "--require-skoolkit" in sys.argv:
            sys.exit("SkoolKit is required here and was not found; run "
                     "`tools.py --platform spectrum get-skoolkit`")
        print("no SkoolKit: oracle half skipped (its home is tools/skoolkit/ once get-skoolkit has run)")
        return
    bad = compare()
    if bad:
        print(f"\n{len(bad)} disagreement(s) with SkoolKit:")
        print("\n".join("  " + b for b in bad))
        sys.exit(1)
    print("ok - every byte in the base, CB, ED, DD, FD, DD CB and FD CB contexts agrees with SkoolKit")


if __name__ == "__main__":
    main()
