#!/usr/bin/env python3
"""The Z-machine's instructions, in every version: the opcode table, decoding, and the
text of an instruction. The Z-machine is the computer Infocom made up for its games; a
story file is its program, and every machine the kit covers ran it through an interpreter
of its own. This module reads the story's code; story.py reads the rest of the story.

  decode(mem, a, version, text=None) -> Instruction (or raises ZError on an unknown opcode)
  OPS                                (count, number) -> rows (first, last, name, flags)
  op(count, number, version)         -> (name, flags) or None
  unpack(packed, version, kind, offsets=(0, 0)) -> a byte address

Counts are "0OP", "1OP", "2OP", "VAR" and "EXT". Flags: s stores a result, b branches,
t is followed by its text, r calls the routine its first operand packs, j jumps by its
operand, v takes a variable's number as its first operand, p prints the string its
operand packs. The table is the Z-Machine Standards Document 1.1's, section 14, and
kit/skills/cpu/zmachine has it with the versions.

Run as a script: zcode.py <story> <address> [count], the instructions from there.
"""
import os, sys
from dataclasses import dataclass, field

# (count, number): [(first version, last version, name, flags)], from the Standard's section 14
OPS = {}
def _op(count, number, name, flags="", first=1, last=8):
    OPS.setdefault((count, number), []).append((first, last, name, flags))

for n, name, flags in ((1, "je", "b"), (2, "jl", "b"), (3, "jg", "b"), (4, "dec_chk", "bv"),
                       (5, "inc_chk", "bv"), (6, "jin", "b"), (7, "test", "b"), (8, "or", "s"),
                       (9, "and", "s"), (10, "test_attr", "b"), (11, "set_attr", ""),
                       (12, "clear_attr", ""), (13, "store", "v"), (14, "insert_obj", ""),
                       (15, "loadw", "s"), (16, "loadb", "s"), (17, "get_prop", "s"),
                       (18, "get_prop_addr", "s"), (19, "get_next_prop", "s"), (20, "add", "s"),
                       (21, "sub", "s"), (22, "mul", "s"), (23, "div", "s"), (24, "mod", "s")):
    _op("2OP", n, name, flags)
_op("2OP", 25, "call_2s", "sr", 4)
_op("2OP", 26, "call_2n", "r", 5)
_op("2OP", 27, "set_colour", "", 5)
_op("2OP", 28, "throw", "", 5)

for n, name, flags in ((0, "jz", "b"), (1, "get_sibling", "sb"), (2, "get_child", "sb"),
                       (3, "get_parent", "s"), (4, "get_prop_len", "s"), (5, "inc", "v"),
                       (6, "dec", "v"), (7, "print_addr", ""), (9, "remove_obj", ""),
                       (10, "print_obj", ""), (11, "ret", ""), (12, "jump", "j"),
                       (13, "print_paddr", "p"), (14, "load", "sv")):
    _op("1OP", n, name, flags)
_op("1OP", 8, "call_1s", "sr", 4)
_op("1OP", 15, "not", "s", 1, 4)
_op("1OP", 15, "call_1n", "r", 5)

for n, name, flags in ((0, "rtrue", ""), (1, "rfalse", ""), (2, "print", "t"), (3, "print_ret", "t"),
                       (4, "nop", ""), (7, "restart", ""), (8, "ret_popped", ""), (10, "quit", ""),
                       (11, "new_line", "")):
    _op("0OP", n, name, flags)
_op("0OP", 5, "save", "b", 1, 3)
_op("0OP", 5, "save", "s", 4, 4)
_op("0OP", 6, "restore", "b", 1, 3)
_op("0OP", 6, "restore", "s", 4, 4)
_op("0OP", 9, "pop", "", 1, 4)
_op("0OP", 9, "catch", "s", 5)
_op("0OP", 12, "show_status", "", 3, 3)
_op("0OP", 13, "verify", "b", 3)
_op("0OP", 15, "piracy", "b", 5)

_op("VAR", 0, "call", "sr", 1, 3)
_op("VAR", 0, "call_vs", "sr", 4)
for n, name, flags in ((1, "storew", ""), (2, "storeb", ""), (3, "put_prop", ""),
                       (5, "print_char", ""), (6, "print_num", ""), (7, "random", "s"), (8, "push", "")):
    _op("VAR", n, name, flags)
_op("VAR", 4, "sread", "", 1, 4)
_op("VAR", 4, "aread", "s", 5)
_op("VAR", 9, "pull", "v", 1, 5)
_op("VAR", 9, "pull", "s", 6, 6)
_op("VAR", 9, "pull", "v", 7)
for n, name in ((10, "split_window"), (11, "set_window"), (19, "output_stream"),
                (20, "input_stream"), (21, "sound_effect")):
    _op("VAR", n, name, "", 3)
_op("VAR", 12, "call_vs2", "sr", 4)
for n, name in ((13, "erase_window"), (14, "erase_line"), (15, "set_cursor"),
                (16, "get_cursor"), (17, "set_text_style"), (18, "buffer_mode")):
    _op("VAR", n, name, "", 4)
_op("VAR", 22, "read_char", "s", 4)
_op("VAR", 23, "scan_table", "sb", 4)
_op("VAR", 24, "not", "s", 5)
_op("VAR", 25, "call_vn", "r", 5)
_op("VAR", 26, "call_vn2", "r", 5)
for n, name in ((27, "tokenise"), (28, "encode_text"), (29, "copy_table"), (30, "print_table")):
    _op("VAR", n, name, "", 5)
_op("VAR", 31, "check_arg_count", "b", 5)

for n, name, flags in ((0, "save", "s"), (1, "restore", "s"), (2, "log_shift", "s"),
                       (3, "art_shift", "s"), (4, "set_font", "s"), (9, "save_undo", "s"),
                       (10, "restore_undo", "s"), (11, "print_unicode", ""), (12, "check_unicode", "s"),
                       (13, "set_true_colour", "")):
    _op("EXT", n, name, flags, 5)
for n, name, flags in ((5, "draw_picture", ""), (6, "picture_data", "b"), (7, "erase_picture", ""),
                       (8, "set_margins", ""), (16, "move_window", ""), (17, "window_size", ""),
                       (18, "window_style", ""), (19, "get_wind_prop", "s"), (20, "scroll_window", ""),
                       (21, "pop_stack", ""), (22, "read_mouse", ""), (23, "mouse_window", ""),
                       (24, "push_stack", "b"), (25, "put_wind_prop", ""), (26, "print_form", ""),
                       (27, "make_menu", "b"), (28, "picture_table", ""), (29, "buffer_screen", "s")):
    _op("EXT", n, name, flags, 6, 6)

DOUBLE_TYPES = {("VAR", 12), ("VAR", 26)}   # call_vs2 and call_vn2 take a second types byte


class ZError(Exception):
    pass


def op(count, number, version):
    """(name, flags) of an opcode in a version, or None where the version has none."""
    for first, last, name, flags in OPS.get((count, number), ()):
        if first <= version <= last:
            return name, flags
    return None


def unpack(packed, version, kind="routine", offsets=(0, 0)):
    """The byte address a packed address stands for (Standard 1.2.3). offsets are the
    header's routine and string offsets, which versions 6 and 7 add."""
    if version <= 3:
        return 2 * packed
    if version <= 5:
        return 4 * packed
    if version <= 7:
        return 4 * packed + 8 * offsets[0 if kind == "routine" else 1]
    return 8 * packed


def var_name(v):
    """sp for the stack, L01-L0F for a routine's locals, G00-GEF for the globals."""
    return "sp" if v == 0 else f"L{v:02X}" if v < 16 else f"G{v - 16:02X}"


@dataclass
class Instruction:
    addr: int
    size: int
    count: str                 # 0OP 1OP 2OP VAR EXT
    number: int
    name: str
    flags: str
    form: str                  # long, short, variable, extended
    operands: list = field(default_factory=list)   # [(kind, value)]: kind large, small or var
    store: int = None          # the variable a result goes to
    branch: tuple = None       # (on_true, target): target an address, or "rtrue" / "rfalse"
    text: str = None           # what print and print_ret print
    target: int = None         # where a jump goes, or the routine a call with a constant calls

    @property
    def end(self):
        return self.addr + self.size

    def ends_flow(self):
        """True when the next instruction is not reached from this one."""
        return self.name in ("rtrue", "rfalse", "ret", "ret_popped", "print_ret", "quit",
                             "restart", "jump", "throw")

    def operand_text(self):
        out = []
        for i, (kind, v) in enumerate(self.operands):
            if kind == "var":
                t = var_name(v)
            elif i == 0 and "v" in self.flags:
                t = f"[{var_name(v)}]"       # the variable it names, by number
            elif kind == "small":
                t = f"#{v:02X}"
            else:
                t = f"#{v:04X}"
            out.append(t)
        return out

    def __str__(self):
        parts = [self.name] + self.operand_text()
        if self.target is not None and ("r" in self.flags or "j" in self.flags):
            parts.append(f"({self.target:05X})")
        if self.store is not None:
            parts.append("-> " + var_name(self.store))
        if self.branch is not None:
            on, t = self.branch
            parts.append(("?" if on else "?~") + (t if isinstance(t, str) else f"{t:05X}"))
        if self.text is not None:
            parts.append('"' + self.text.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n") + '"')
        return " ".join(parts)


def _types(byte, out):
    for shift in (6, 4, 2, 0):
        t = (byte >> shift) & 3
        if t == 3:
            return False
        out.append(("large", "small", "var")[t])
    return True


def decode(mem, a, version, text=None, offsets=(0, 0)):
    """The instruction at address a. text(mem, a) -> (string, end) decodes inline text
    (story.Story.text); without it a print's text is left as None and its end is found
    by the end bit alone."""
    start = a
    b = mem[a]; a += 1
    kinds = []
    if b == 0xBE and version >= 5:
        count, number, form = "EXT", mem[a], "extended"; a += 1
        _types(mem[a], kinds); a += 1
    elif b < 0x80:
        count, number, form = "2OP", b & 0x1F, "long"
        kinds = ["var" if b & 0x40 else "small", "var" if b & 0x20 else "small"]
    elif b < 0xC0:
        number, form = b & 0x0F, "short"
        t = (b >> 4) & 3
        count = "0OP" if t == 3 else "1OP"
        if t != 3:
            kinds = [("large", "small", "var")[t]]
    else:
        count, number, form = ("VAR" if b & 0x20 else "2OP"), b & 0x1F, "variable"
        types1, a = mem[a], a + 1
        more = _types(types1, kinds)
        if (count, number) in DOUBLE_TYPES:
            types2, a = mem[a], a + 1
            if more:
                _types(types2, kinds)
    found = op(count, number, version)
    if found is None:
        raise ZError(f"no {count} opcode {number} in version {version} (byte ${b:02X} at {start:05X})")
    name, flags = found
    operands = []
    for k in kinds:
        if k == "large":
            operands.append((k, (mem[a] << 8) | mem[a + 1])); a += 2
        else:
            operands.append((k, mem[a])); a += 1
    ins = Instruction(start, 0, count, number, name, flags, form, operands)
    if "s" in flags:
        ins.store = mem[a]; a += 1
    if "b" in flags:
        b1 = mem[a]; a += 1
        if b1 & 0x40:
            off = b1 & 0x3F
        else:
            off = ((b1 & 0x3F) << 8) | mem[a]; a += 1
            if off & 0x2000:
                off -= 0x4000
        ins.branch = (bool(b1 & 0x80), "rfalse" if off == 0 else "rtrue" if off == 1 else a + off - 2)
    if "t" in flags:
        if text is not None:
            ins.text, a = text(mem, a)
        else:
            while not mem[a] & 0x80:
                a += 2
            a += 2
    if "j" in flags and operands and operands[0][0] != "var":
        off = operands[0][1]
        off = off - 0x10000 if off & 0x8000 else off
        ins.target = a + off - 2
    if "r" in flags and operands and operands[0][0] != "var":
        ins.target = unpack(operands[0][1], version, "routine", offsets)
    ins.size = a - start
    return ins


def routine_start(mem, a, version):
    """(locals, first instruction's address) of the routine whose header is at a: its count
    of locals, and in versions 1 to 4 their first values, a word each (Standard 5.2)."""
    n = mem[a]
    if n > 15:
        raise ZError(f"a routine at {a:05X} would have {n} locals")
    return n, a + 1 + (2 * n if version <= 4 else 0)


def main(argv):
    if len(argv) < 2 or argv[0] in ("-h", "--help"):
        print(__doc__); return 0
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from story import Story
    s = Story.load(argv[0])
    a, n = int(argv[1].lstrip("$"), 16), int(argv[2]) if len(argv) > 2 else 20
    for _ in range(n):
        ins = s.instruction(a)
        print(f"{a:05X}  {ins}")
        a = ins.end
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
