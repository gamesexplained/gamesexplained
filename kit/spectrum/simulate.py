#!/usr/bin/env python3
"""Run one routine from a snapshot in SkoolKit's Z80 simulator, to test what it computes.

A claim about arithmetic (a multiply, a clamp, a table lookup, what a fill
writes) is cheap to test and expensive to get wrong: run the routine on the
snapshot's own memory with the registers the claim is about, and read the
answer. No emulator is involved, so many of these can run at once, and a
port on the page can be held against the same runs.

  simulate.py <snapshot.sna> <addr> [REG=hex ...] [@addr=byte,byte...] [--max N] [--show addr:len ...]
      REG is A F B C D E H L, BC DE HL IX IY, or A' BC' DE' HL'. `@addr=` pokes
      memory first. The routine is entered as if by CALL, with the stack at
      `--sp` (default $FF40), and runs until it returns or for --max
      instructions (default 200000). Prints the registers after it, the
      flags, every byte of RAM it changed (the first 64), and each --show
      range. Exits 1 when it did not return.
  simulate.py --test
      self-check (writes only to a temp dir)

Ports read as the simulator's default and writes to them go nowhere: a
routine that reads the keyboard or times itself off the display is one for
the emulator. Interrupts are off. The return is detected by address, so a
routine that pulls its return address off the stack and jumps elsewhere
runs to --max.

Import it for a batch of cases: `run(sna, addr, regs, pokes)` returns
(registers, changed bytes, instruction count, memory).
"""
import glob, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import snapshot  # noqa: E402

RET = 0x0001            # a ROM address no game routine is at: reaching it is the return
PAIRS = {"BC": (2, 3), "DE": (4, 5), "HL": (6, 7), "IX": (8, 9), "IY": (10, 11),
         "BC'": (18, 19), "DE'": (20, 21), "HL'": (22, 23)}
SINGLE = {"A": 0, "F": 1, "B": 2, "C": 3, "D": 4, "E": 5, "H": 6, "L": 7, "A'": 16, "F'": 17}
SP, PC = 12, 24


def simulator():
    """SkoolKit's Simulator class. kit/spectrum/skoolkit.py shadows the package while HERE is
    on sys.path, so it is found the way test_z80.py finds it: tools/skoolkit first."""
    sys.modules.pop("skoolkit", None)
    path = [p for p in sys.path if os.path.abspath(p or ".") != HERE]
    for p in glob.glob(os.path.join(ROOT, "tools", "skoolkit", "lib", "python*", "site-packages")):
        path.insert(0, p)
    old, sys.path = sys.path, path
    try:
        from skoolkit.simulator import Simulator
        return Simulator
    except ImportError:
        sys.exit("SkoolKit is not installed: run `python3 kit/scripts/tools.py --platform spectrum get-skoolkit`")
    finally:
        sys.path = old


def run(sna, addr, regs=None, pokes=None, max_ins=200000, sp=0xFF40):
    mem = list(snapshot.read(sna)) if isinstance(sna, str) else list(sna)
    for a, bs in (pokes or {}).items():
        mem[a:a + len(bs)] = list(bs)
    sim = simulator()(mem, config={"fast_djnz": False, "fast_ldir": False})
    r = sim.registers
    mem[sp - 2], mem[sp - 1] = RET & 255, RET >> 8
    before = list(mem)
    r[SP] = sp - 2
    for k, v in (regs or {}).items():
        if k in PAIRS:
            r[PAIRS[k][0]], r[PAIRS[k][1]] = v >> 8 & 255, v & 255
        elif k in SINGLE:
            r[SINGLE[k]] = v & 255
        else:
            sys.exit(f"no register {k!r}: one of {' '.join(list(SINGLE) + list(PAIRS))}")
    r[PC] = addr
    n = 0
    while r[PC] != RET and n < max_ins:
        sim.run()
        n += 1
    out = {k: r[i] for k, i in SINGLE.items()}
    out.update({k: r[h] << 8 | r[l] for k, (h, l) in PAIRS.items()})
    out["SP"], out["PC"] = r[SP], r[PC]
    changed = [(a, before[a], mem[a]) for a in range(0x4000, 0x10000)
               if mem[a] != before[a] and not sp - 64 <= a < sp]
    return out, changed, n, mem


def hexarg(s):
    return int(str(s).lstrip("$").rstrip("Hh"), 16)


def test():
    import tempfile
    mem = bytearray(0x10000)
    # $8000: HL = HL * 3, then store L at ($9000); $8010: a routine that never returns
    mem[0x8000:0x800B] = bytes([0x5D, 0x54, 0x29, 0x19, 0x7D, 0x32, 0x00, 0x90, 0xC9, 0x00, 0x00])
    mem[0x8010:0x8012] = bytes([0x18, 0xFE])
    with tempfile.TemporaryDirectory() as d:
        sna = os.path.join(d, "x.sna")
        open(sna, "wb").write(bytes(snapshot.SNA_HEADER) + bytes(mem[0x4000:]))
        out, changed, n, after = run(sna, 0x8000, {"HL": 0x0123})
        assert out["HL"] == 0x0369 and out["PC"] == RET and n == 7, (out, n)
        assert changed == [(0x9000, 0x00, 0x69)], changed
        out, changed, n, after = run(sna, 0x8000, {"HL": 0x0001}, {0x8002: [0x00]})    # the poke removes the doubling
        assert out["HL"] == 0x0002, out
        out, changed, n, after = run(sna, 0x8010, max_ins=500)
        assert out["PC"] != RET and n == 500, (out, n)
    print("ok - simulate.py self-check: registers in and out, a poke, the bytes a routine changed, "
          "and a routine that does not return")


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    if argv[0] == "--test":
        test(); return
    if len(argv) < 2:
        sys.exit(__doc__)
    sna, addr = argv[0], hexarg(argv[1])
    regs, pokes, show, mx, sp = {}, {}, [], 200000, 0xFF40
    i = 2
    while i < len(argv):
        a = argv[i]
        if a == "--max":
            mx = int(argv[i + 1]); i += 1
        elif a == "--sp":
            sp = hexarg(argv[i + 1]); i += 1
        elif a == "--show":
            show.append(argv[i + 1]); i += 1
        elif a.startswith("@"):
            k, v = a[1:].split("=")
            pokes[hexarg(k)] = [hexarg(x) for x in v.split(",")]
        else:
            k, v = a.split("=")
            regs[k.upper()] = hexarg(v)
        i += 1
    out, changed, n, mem = run(sna, addr, regs, pokes, mx, sp)
    returned = out["PC"] == RET
    print(f"{n} instructions; " + ("returned" if returned else f"stopped at ${out['PC']:04X} without returning"))
    print("  " + "  ".join(f"{k}=${v:0{2 if k in SINGLE else 4}X}" for k, v in out.items() if k != "PC"))
    f = out["F"]
    print(f"  flags: S={f >> 7 & 1} Z={f >> 6 & 1} H={f >> 4 & 1} P/V={f >> 2 & 1} N={f >> 1 & 1} C={f & 1}")
    if changed:
        print(f"  RAM changed: {len(changed)} bytes")
        for a, b0, b1 in changed[:64]:
            print(f"    ${a:04X}: ${b0:02X} -> ${b1:02X}")
    for s in show:
        a, ln = s.split(":")
        a = hexarg(a)
        print(f"  ${a:04X}: " + " ".join(f"{mem[a + j]:02X}" for j in range(int(ln))))
    sys.exit(0 if returned else 1)


if __name__ == "__main__":
    main()
