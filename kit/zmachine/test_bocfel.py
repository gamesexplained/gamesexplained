#!/usr/bin/env python3
"""The kit's disassembler reads every version of the Z-machine as Bocfel runs it.

For versions 1-5, 7 and 8 (and 1 and 2 again with Infocom's shift locks in the text), the
test assembles one story with kit/zmachine/zasm.py, plays it on the kit's build of Bocfel
with three typed lines, and checks:

  - every instruction that ran decodes, in kit/zmachine/zcode.py, to the operands, the
    branch, the store and the text Bocfel's trace shows (ztrace.check finds nothing);
  - every instruction in the story ran, but the ones that print FAIL;
  - what the story printed is what the Z-machine Standard says it prints, worked out
    here by hand, and every word typed was found at the dictionary address story.py's
    lookup gives, or not found where it gives none;
  - the opcode table has, for each version, the opcodes Bocfel's own table has, by name;
  - a run with --seed repeats: the same seed gives the same random numbers.

Version 6 is left out: its screen model needs Bocfel's Glk build. The test needs the build
`python3 kit/scripts/tools.py get-bocfel` makes; without it, it skips, and with
KIT_REQUIRE_TOOLS set it fails.
"""
import os
import re
import shutil
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bocfel  # noqa: E402
import zasm  # noqa: E402
import zcode  # noqa: E402
import ztrace  # noqa: E402
from story import Story  # noqa: E402

VERSIONS = (1, 2, 3, 4, 5, 7, 8)
TYPED = ["take lamp", "LAMP,box.pdp10", "lanterns a1b 12 x-ray zzz"]
WORDS = ["take", "lamp", "box", "pdp10", "lantern", "a1b", "12", "x-ray", ",", "."]

# A line starting {N}, {N+} or {N-M} is assembled only for those versions.
SOURCE = r'''
main:   .routine 0
        call arith -> G10
        call branches -> G10
        call calls -> G10
        call memory -> G10
        call objects -> G10
        call texts -> G10
        call parsing -> G10
        call extras -> G10
        print "end"
        new_line
        quit

arith:  .routine 3
        store [L01] #1
        store [L02] #2
        add L01 L02 -> L03
        print_num L03
        print_char #32
        sub #5 #10 -> sp
        print_num sp
        print_char #32
        mul #$0100 #3 -> sp
        print_num sp
        print_char #32
        div #-7 #2 -> sp
        print_num sp
        print_char #32
        mod #-7 #2 -> sp
        print_num sp
        print_char #32
        or #$F0F0 #$0F00 -> sp
        print_num sp
        print_char #32
        and #$F0F0 #$0FF0 -> sp
        print_num sp
        print_char #32
        not #$00FF -> sp
        print_num sp
        print_char #32
        print_num #-32768
        new_line
        rtrue

branches: .routine 2
        je #1 #2 #3 #1 ?b1              ; four operands: the variable form of a 2OP
        print_ret "FAIL"
b1:     jl #-1 #0 ?s:b2                 ; signed, and the one-byte branch
        print_ret "FAIL"
b2:     jg #-1 #0 ?b3
        print "a"
b3:     jz #0 ?~b4
        print "b"
b4:     test #$00FF #$000F ?b5
        print_ret "FAIL"
b5:     store [L01] #3
loop:   print_num L01
        dec_chk [L01] #1 ?~loop         ; a branch backwards
        inc_chk [L02] #0 ?b6
        print_ret "FAIL"
b6:     call yes -> sp
        print_num sp
        call no -> sp
        print_num sp
        jump j2
j1:     print "j"
        jump j3
j2:     jump j1
j3:     inc [L01]
        dec [L02]
        load [L01] -> sp
        print_num sp
        print_num L02
        new_line
        rtrue
yes:    .routine 0
        je #1 #1 ?rtrue
        print_ret "FAIL"
no:     .routine 0
        je #1 #2 ?~rfalse
        print_ret "FAIL"

calls:  .routine 1
        call add3 #1 #2 #3 -> sp
        print_num sp
        print_char #32
        call add3 #1 -> sp              ; the other locals start at the header's values to 4
        print_num sp
        print_char #32
        call #0 -> sp                   ; routine 0 returns false
        print_num sp
        print_char #32
        call rp -> sp
        print_num sp
{1-4}   push #5
{1-4}   pop
{4+}    print_char #32
{4+}    call_1s add3 -> sp
{4+}    print_num sp
{4+}    print_char #32
{4+}    call_2s add3 #4 -> sp
{4+}    print_num sp
{4+}    print_char #32
{4+}    call_vs2 sum7 #1 #2 #3 #4 #5 #6 #7 -> sp
{4+}    print_num sp
{5+}    print_char #32
{5+}    call_1n say
{5+}    call_2n argc #1
{5+}    call_vn argc #1 #2
{5+}    call_vn2 argc #1 #2 #3 #4 #5
{5+}    call catcher -> sp
{5+}    print_num sp
        new_line
        rtrue
add3:   .routine 3 #$000A #$0014 #$001E
        add L01 L02 -> sp
        add sp L03 -> sp
        ret_popped
rp:     .routine 0
        push #77
        ret_popped
{4+}sum7: .routine 7
{4+}    add L01 L02 -> sp
{4+}    add sp L03 -> sp
{4+}    add sp L04 -> sp
{4+}    add sp L05 -> sp
{4+}    add sp L06 -> sp
{4+}    add sp L07 -> sp
{4+}    ret_popped
{5+}say: .routine 0
{5+}    print "s"
{5+}    rtrue
{5+}argc: .routine 3
{5+}    check_arg_count #2 ?ac2
{5+}    print "1"
{5+}    rtrue
{5+}ac2: check_arg_count #3 ?ac3
{5+}    print "2"
{5+}    rtrue
{5+}ac3: print "3"
{5+}    rtrue
{5+}catcher: .routine 1
{5+}    catch -> L01
{5+}    call thrower L01 -> sp
{5+}    print_ret "FAIL"
{5+}thrower: .routine 1
{5+}    throw #9 L01
{5+}    print_ret "FAIL"

memory: .routine 1
        storew tbl #1 #$1234
        loadw tbl #1 -> sp
        print_num sp
        print_char #32
        storeb tbl #5 #$AB
        loadb tbl #5 -> sp
        print_num sp
        print_char #32
        push #5
        push #6
        pull [L01]
        print_num L01
        pull [L01]
        print_num L01
{4+}    print_char #32
{4+}    scan_table #$1234 tbl #4 -> sp ?st
{4+}    print_ret "FAIL"
{4+}st: sub sp tbl -> sp
{4+}    print_num sp
{5+}    print_char #32
{5+}    copy_table tbl tbl2 #8
{5+}    loadw tbl2 #1 -> sp
{5+}    print_num sp
{5+}    print_char #32
{5+}    print_table abc #3
{3+}    print_char #32
{3+}    output_stream #3 buf
{3+}    print "xyz"
{3+}    output_stream #-3
{3+}    loadw buf #0 -> sp
{3+}    print_num sp
        new_line
        rtrue

objects: .routine 0
        get_parent #2 -> sp
        print_num sp
        get_child #1 -> sp ?oc
        print_ret "FAIL"
oc:     print_num sp
        get_sibling #2 -> sp ?os
        print_ret "FAIL"
os:     print_num sp
        get_sibling #3 -> sp ?~os2
        print_ret "FAIL"
os2:    print_num sp
        jin #2 #1 ?oj
        print_ret "FAIL"
oj:     test_attr #2 #30 ?ot
        print_ret "FAIL"
ot:     test_attr #2 #2 ?~ot2
        print_ret "FAIL"
ot2:    set_attr #3 #5
        test_attr #3 #5 ?ot3
        print_ret "FAIL"
ot3:    clear_attr #2 #1
        test_attr #2 #1 ?~ot4
        print_ret "FAIL"
ot4:    insert_obj #4 #1
        get_child #1 -> sp ?oi
        print_ret "FAIL"
oi:     print_num sp
        remove_obj #2
        get_sibling #4 -> sp ?osib
        print_ret "FAIL"
osib:   print_num sp
        print_char #32
        print_obj #1
        print_char #32
        get_prop #1 #10 -> sp
        print_num sp
        print_char #32
        get_prop #1 #5 -> sp            ; the room has no property 5: its default
        print_num sp
        print_char #32
        get_prop #1 #7 -> sp
        print_num sp
        print_char #32
        get_prop_addr #1 #3 -> sp
        get_prop_len sp -> sp
        print_num sp
        print_char #32
        get_next_prop #1 #0 -> sp
        print_num sp
        print_char #32
        get_next_prop #1 #10 -> sp
        print_num sp
        print_char #32
        put_prop #1 #7 #9
        get_prop #1 #7 -> sp
        print_num sp
{4+}    print_char #32
{4+}    get_prop_addr #1 #40 -> sp      ; ten bytes: the two-byte size from version 4
{4+}    get_prop_len sp -> sp
{4+}    print_num sp
        new_line
        rtrue

texts:  .routine 0
        print "Hello, World! 0-9 @ ä"
        new_line
        print_paddr msg
        print_addr &msg2
        new_line
        call pr -> sp
        print_num sp
{2+}    print "{a:0}box, {a:1}."
{3+}    print " {a:40}{a:70}"
        new_line
{1}     print "a<b\nc"
{1}     new_line
        print "MiXeD 12ab34 x.y,z"
        new_line
        rtrue
pr:     .routine 0
        print_ret "done"
msg:    .string "Packed."
msg2:   .string "Byte."

parsing: .routine 1
        store [L01] #3
p1:     storeb tb #0 #60
{5+}    storeb tb #1 #0                 ; from version 5 the text already there is input too
        storeb pb #0 #10
{1-4}   sread tb pb
{5+}    aread tb pb -> sp
        call words -> sp
        dec_chk [L01] #1 ?~p1
{5+}    encode_text tb #8 #2 etbl
{5+}    loadw etbl #0 -> sp
{5+}    print_num sp
{5+}    print_char #32
{5+}    loadw etbl #1 -> sp
{5+}    print_num sp
{5+}    print_char #32
{5+}    loadw etbl #2 -> sp
{5+}    print_num sp
{5+}    new_line
        rtrue
words:  .routine 3
        loadb pb #1 -> L02
        print_num L02
w_next: jl L01 L02 ?w_one
        new_line
        rtrue
w_one:  mul L01 #2 -> L03
        add L03 #1 -> L03
        loadw pb L03 -> sp
        print_char #32
        print_num sp
        mul L01 #4 -> L03
        add L03 #4 -> L03
        loadb pb L03 -> sp
        print_char #47
        print_num sp
        add L03 #1 -> L03
        loadb pb L03 -> sp
        print_char #47
        print_num sp
        inc [L01]
        jump w_next

extras: .routine 0
        random #-1 -> sp                ; a seed: the numbers that follow are fixed
        random #1 -> sp
        print_num sp
        nop
{3+}    verify ?ev
{3+}    print_ret "FAIL"
{3+}ev: print "v"
{5+}    piracy ?ep
{5+}    print_ret "FAIL"
{5+}ep: print "p"
{5+}    log_shift #1 #4 -> sp
{5+}    print_num sp
{5+}    print_char #32
{5+}    log_shift #$8000 #-1 -> sp
{5+}    print_num sp
{5+}    print_char #32
{5+}    art_shift #-16 #-2 -> sp
{5+}    print_num sp
        new_line
        rtrue
'''


# eight random numbers, from whatever seed the interpreter starts with
DICE = r'''
main:   .routine 0
        store [G10] #8
roll:   random #1000 -> sp
        print_num sp
        print_char #32
        dec_chk [G10] #1 ?~roll
        new_line
        quit
'''


def for_version(source, v):
    out = []
    for line in source.splitlines():
        m = re.match(r"^\{(\d)(\+|-(\d))?\}(.*)$", line)
        if m:
            first = int(m[1])
            last = 8 if m[2] == "+" else int(m[3]) if m[3] else first
            if not first <= v <= last:
                continue
            line = m[4]
        out.append(line)
    return "\n".join(out)


def objects(v):
    room_props = {10: b"\x12\x34", 7: b"\x56", 3: b"\x01\x02\x03\x04"}
    if v >= 4:
        room_props[40] = bytes(range(10))
    return [dict(name="room", attrs=[3], child=2, props=room_props),
            dict(name="lamp", attrs=[1, 30], parent=1, sibling=3),
            dict(name="box", parent=1),
            dict(name="key")]


def abbreviations():
    a = [""] * 96
    a[0], a[1], a[40], a[70] = "the ", "lamp", "forty", "seventy"
    return a


def build(v, locks=False):
    tables = {"tbl": 16, "tbl2": 16, "abc": b"abc", "buf": 32, "tb": 64, "pb": 2 + 4 * 10, "etbl": 6}
    return zasm.assemble(v, for_version(SOURCE, v), objects=objects(v),
                         dictionary=[(w, b"\0\0\0") for w in WORDS],
                         abbreviations=abbreviations()[:32 if v == 2 else 96] if v >= 2 else (),
                         locks=locks, globals={0: 1}, tables=tables)


def signed(n):
    return n - 0x10000 if n & 0x8000 else n


def expected(v, story):
    """What the story prints in version v, by the Standard."""
    out = ["3 -5 768 -3 -1 -16 240 -256 -32768", "ab32110j10"]
    calls = ["6", "51" if v <= 4 else "1", "0", "77"]
    if v >= 4:
        calls += ["60" if v == 4 else "0", "54" if v == 4 else "4", "28"]
    if v >= 5:
        calls.append("s1239")
    out.append(" ".join(calls))
    memory = ["4660", "171", "65"] + (["2"] if v >= 4 else []) + (["4660", "abc"] if v >= 5 else [])
    out.append(" ".join(memory + (["3"] if v >= 3 else [])))
    out.append("123043 room 4660 0 86 4 " + ("10" if v <= 3 else "40") + " 7 9" + (" 10" if v >= 4 else ""))
    out += ["Hello, World! 0-9 @ ä", "Packed.Byte.", "done",
            "1" + ("the box, lamp." if v >= 2 else "") + (" fortyseventy" if v >= 3 else "")]
    if v == 1:
        out += ["a<b", "c"]
    out.append("MiXeD 12ab34 x.y,z")
    seps = story.dictionary().separators.decode()
    for line in TYPED:
        found, i, low = [], 0, line.lower()
        for m in re.finditer(r"[%s]|[^ %s]+" % (re.escape(seps), re.escape(seps)), low):
            found.append(f"{story.lookup(m[0])}/{len(m[0])}/{m.start() + (1 if v <= 4 else 2)}")
        out.append(" ".join([str(len(found))] + found))
    if v >= 5:
        enc = story.encode("lanterns")
        out.append(" ".join(str(signed(int.from_bytes(enc[k:k + 2], "big"))) for k in (0, 2, 4)))
    out.append("1" + ("v" if v >= 3 else "") + ("p16 16384 -4" if v >= 5 else ""))
    out.append("end")
    return out


def bocfel_table(src):
    """{version: {(count, number): name}} from Bocfel's own setup_opcodes(), version 6
    included, the Zoom timer extensions and the per-game version 6 hacks left out."""
    with open(src, encoding="utf-8") as f:
        text = f.read()
    body = text[text.index("void setup_opcodes()"):]
    body = body[:body.index("#ifdef ZTERP_ZOOM_OPCODES")]
    counts = {"Zero": "0OP", "One": "1OP", "Two": "2OP", "Var": "VAR", "Ext": "EXT"}
    table = {v: {} for v in range(1, 7)}
    for m in re.finditer(r"setup_single_opcode\((\d), (\d), Opcount::(\w+), (0x[0-9a-f]+), z(\w+)\);"
                         r"(?: // XXX (\w+))?", body):
        first, last, count, number, fn, xxx = int(m[1]), int(m[2]), counts[m[3]], int(m[4], 16), m[5], m[6]
        for v in range(first, last + 1):
            table[v][(count, number)] = xxx or fn
    return table


# Bocfel's handler names, where they are not the Standard's name for the opcode
HANDLER = {"call": ("call", "call_vs"), "read": ("sread", "aread"), "save5": ("save",),
           "restore5": ("restore",), "nop": ("nop", "buffer_mode")}


class Bocfel(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not bocfel.available():
            if os.environ.get("KIT_REQUIRE_TOOLS"):
                raise AssertionError(f"no Bocfel for the test ({bocfel.build_line()}), and KIT_REQUIRE_TOOLS is set")
            raise unittest.SkipTest(f"no Bocfel: {bocfel.build_line()}")
        cls.work = bocfel.scratch("test-bocfel-")

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.work, ignore_errors=True)

    def run_version(self, v, locks=False):
        asm = build(v, locks)
        path = os.path.join(self.work, f"test{'-locks' if locks else ''}.z{v}")
        with open(path, "wb") as f:
            f.write(asm.story)
        out = bocfel.run(path, "\n".join(TYPED) + "\n", trace=path + ".trace", seed=1)
        story = Story(asm.story)
        ss = ztrace.steps(path + ".trace")
        problems = [f"{s.addr:05X}: {p}" for s, p in ztrace.check(story, ss)]
        self.assertEqual(problems, [], f"version {v}: the kit and Bocfel read these differently")
        ran = {s.addr for s in ss}
        missed = [f"{a:05X} {story.instruction(a)}" for a in asm.instructions
                  if a not in ran and story.instruction(a).text != "FAIL"]
        self.assertEqual(missed, [], f"version {v}: instructions that never ran")
        got = [ln.rstrip() for ln in out.strip("\n").split("\n")]
        self.assertEqual(got, expected(v, story), f"version {v}: the story printed")
        return story

    def test_versions(self):
        for v in VERSIONS:
            with self.subTest(version=v):
                self.run_version(v)

    def test_shift_locks(self):
        """Text with Infocom's shift locks (versions 1 and 2) reads the same."""
        for v in (1, 2):
            with self.subTest(version=v):
                story = self.run_version(v, locks=True)
                self.assertNotEqual(story.mem, build(v).story, "the locks changed nothing")

    def test_seed(self):
        """--seed repeats a run: the same seed gives the same random numbers, another seed others."""
        path = os.path.join(self.work, "dice.z3")
        with open(path, "wb") as f:
            f.write(zasm.assemble(3, DICE).story)
        runs = [bocfel.run(path, seed=n) for n in (7, 7, 8)]
        self.assertRegex(runs[0], r"^(\d+ ){8}")
        self.assertEqual(runs[0], runs[1], "the same seed gave different numbers")
        self.assertNotEqual(runs[0], runs[2], "another seed gave the same numbers")

    def test_opcode_table(self):
        theirs = bocfel_table(os.path.join(bocfel.SRC, "process.cpp"))
        for v in range(1, 9):
            bv = 5 if v in (7, 8) else v           # Bocfel runs 7 and 8 as 5
            mine = {k: zcode.op(k[0], k[1], v)[0] for k in zcode.OPS if zcode.op(k[0], k[1], v)}
            bocfels = {k: n for k, n in theirs[bv].items() if k != ("0OP", 14)}   # 0OP 14 is EXT's prefix
            with self.subTest(version=v):
                self.assertEqual(sorted(set(mine) - set(bocfels)), [], "opcodes Bocfel lacks")
                self.assertEqual(sorted(set(bocfels) - set(mine)), [], "opcodes the kit lacks")
                wrong = [(k, mine[k], bocfels[k]) for k in mine
                         if mine[k] not in HANDLER.get(bocfels[k], (bocfels[k],))]
                self.assertEqual(wrong, [], "names that differ")


if __name__ == "__main__":
    unittest.main()
