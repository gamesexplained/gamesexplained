#!/usr/bin/env python3
"""kit/cpu/sm5a.py, the Sharp SM5A's disassembler, held to MAME 0.289's on four seeded random
programs (kit/gnw/check_machine.js makes them; Node gives them here): every line of the ROM in
the order the chip runs it, address, bytes, mnemonic and operand, against the hashes MAME's
own disassembly left in kit/gnw/fixtures/disassembly.json. Also checks that the order the
program counter runs in is a shift register's 63 steps, and that logical and physical
addresses convert back.

    python3 kit/gnw/test_sm5a.py
"""
import hashlib, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "cpu"))
import sm5a   # noqa: E402

fails = 0


def check(ok, what):
    global fails
    if not ok:
        fails += 1
    print(("ok   " if ok else "FAIL ") + what)


def lines(rom):
    """Each page's 63 steps, as MAME's debugger lists them page by page."""
    img = sm5a.reorder(rom)
    out = []
    for page in range(sm5a.ROM_SIZE >> 6):
        a = page << 6
        while a < (page << 6) + 63:
            d = sm5a.decode(img, a)
            n = d[2] if d else 1
            bs = img[a:a + n] if not (d and d[1] and ":p" in d[1]) else bytes([img[a], img[page << 6]])
            pc = sm5a.physical(a)
            if d and d[1] and ":p" in d[1]:
                # the 63rd step: masked as check_machine.js masks MAME's, whose disassembler shows
                # another byte than the one its CPU reads (step 0's, which this gives)
                out.append("%d:%X:%02X: %02X ~ %s ~" % (pc >> 10, pc >> 6 & 15, pc & 63, bs[0], d[0]))
                a += n
                continue
            out.append("%d:%X:%02X: %s %s" % (pc >> 10, pc >> 6 & 15, pc & 63, " ".join("%02X" % b for b in bs),
                                              " ".join(sm5a.text(img, a).split())))
            a += n
    return out


fx = json.load(open(os.path.join(HERE, "fixtures", "disassembly.json")))
for p in fx["programs"]:
    js = "process.stdout.write(Buffer.from(require(%r).program(%d)).toString('hex'))" % (os.path.join(HERE, "check_machine.js"), p["seed"])
    rom = bytes.fromhex(subprocess.run(["node", "-e", js], capture_output=True, text=True, check=True).stdout)
    got = lines(rom)
    h = [hashlib.sha1("\n".join(got[i:i + fx["chunk"]]).encode()).hexdigest()[:16] for i in range(0, len(got), fx["chunk"])]
    bad = next((i for i, (x, y) in enumerate(zip(h, p["chunks"])) if x != y), None)
    ok = len(got) == p["lines"] and bad is None and got[:3] == p["first"]
    check(ok, "program %d: %d lines as MAME disassembles them" % (p["seed"], p["lines"]) +
          ("" if ok else "; they part from line %d (node kit/gnw/check_machine.js --record shows MAME's)" % ((bad or 0) * fx["chunk"])))

seen, pl = [], 0
for i in range(63):
    seen.append(pl)
    pl = sm5a._step(pl)
check(pl == 0 and len(set(seen)) == 63 and 0x3F not in seen, "the step counter runs through 63 values and back to 0, never $3F")
check(all(sm5a.logical(sm5a.physical(a)) == a for a in range(sm5a.ROM_SIZE)), "logical and physical addresses convert back")
check(sm5a.logical(0x740) == sm5a.logical(0x700) and sm5a.logical(0x7FF) == sm5a.logical(0x73F), "pages $1D-$1F are page $1C")
print("all disassembler checks pass" if not fails else "%d FAILED" % fails)
sys.exit(1 if fails else 0)
