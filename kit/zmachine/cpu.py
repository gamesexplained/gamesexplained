#!/usr/bin/env python3
"""The Z-machine as kit/scripts/listing.py reads a story: the interface each platform's
cpu.py gives (kit/PLATFORMS.md, "What the shared scripts load from a platform"), for a part
whose part.json says "kind": "virtual" and "machine": "zmachine" (kit/skills/core/15-parts).

The image is the story file itself, at story addresses, so every function finds the story's
version, abbreviations and tables in the image it is handed; listing.py hands the same image
to every call of one build.

  prepare(symbols)  where the routines start: each "Subroutine" label is on a routine's header,
                    its count of locals (and before version 5 their first values), which decode
                    reads as one row, .routine, at the head of the routine's code
  decode(ram, a) -> (name, instruction, size) or None   zcode.decode, with the story's text
  operand(a, m, ins, bs, names, regs, chips) -> (text, target)
                    the operands with the map's names: a routine, a string, a branch's or a
                    jump's target, a global by its word's label, an object by its entry's,
                    a constant that is a routine's or a string's packed address by its name, and
                    one that is a dictionary word's address as the word, 'then'; a je compares
                    with a word before a routine, which the two can share a value with
  TEXT_TYPES        "ZText", the story's own strings; text_items reads them a string at a time
  TEXT_EACH_RUN     the text types read one run of blocks at a time, not over their whole extent
  POINTER_TYPES     word-sized data that points: a byte address, a word address (half the byte
                    address), a packed routine or a packed string (Standard 1.2); and a table
                    word, which is a dictionary word's address, a routine's or a string's packed
                    address or a labelled table's, where it names one the map holds (in that
                    order, as the values can coincide), and a number where it names none, for the tables of strings, objects, routines and
                    numbers mixed that Infocom's games are full of
  pointer(kind, ram, a) -> the address the word at a points to, or None for a number
  WIDTH             5: story addresses are written with five hex digits, as the Standard's are
"""
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import zcode  # noqa: E402
from story import Story  # noqa: E402

WIDTH = 5
TEXT_TYPES = ("ZText",)
TEXT_EACH_RUN = ("ZText",)
POINTER_TYPES = ("Byte Address", "Word Address", "Packed Routine", "Packed String", "Table Word")
HEADERS = set()               # the routines' headers, from prepare()
STRINGS, TABLES = set(), set()  # where the map's strings and labelled tables start, for a table word

# the operands that are objects, by instruction (Standard 14): an object constant there is
# shown by the label on its entry in the object table
OBJECT_OPERANDS = {"get_sibling": (0,), "get_child": (0,), "get_parent": (0,), "remove_obj": (0,),
                   "print_obj": (0,), "jin": (0, 1), "test_attr": (0,), "set_attr": (0,),
                   "clear_attr": (0,), "insert_obj": (0, 1), "get_prop": (0,), "get_prop_addr": (0,),
                   "get_next_prop": (0,), "put_prop": (0,)}

_seen = [None, None]          # the image last read, and its Story


def story(ram):
    """The Story the image holds, read once per image."""
    if _seen[0] is not ram:
        _seen[0], _seen[1] = ram, Story(ram)
    return _seen[1]


def hexa(a):
    return f"${a:0{WIDTH}X}"


class Header:
    """A routine's header: its count of locals and, before version 5, their first values."""
    name, flags, store, branch, text, target = ".routine", "", None, None, None, None

    def __init__(self, ram, a, version):
        self.addr, self.locals = a, ram[a]
        self.values = [(ram[a + 1 + 2 * i] << 8) | ram[a + 2 + 2 * i] for i in range(self.locals)] \
            if version <= 4 else []
        self.size = 1 + 2 * len(self.values)
        self.operands = []


def prepare(sym):
    HEADERS.clear()
    HEADERS.update(x["address"] for x in sym.get("symbols", []) if x["type"] == "Subroutine")
    kinds = {}
    for b in sym.get("blocks", []):
        for a in range(b["start"], b["end"] + 1):
            kinds[a] = b["type"]
    labels = {x["address"] for x in sym.get("symbols", [])}
    STRINGS.clear(); TABLES.clear()
    STRINGS.update(a for a in labels if kinds.get(a) == "ZText")
    TABLES.update(a for a in labels if kinds.get(a) not in (None, "Code", "ZText"))


def decode(ram, a):
    s = story(ram)
    if a in HEADERS:
        if ram[a] > 15:
            return None
        h = Header(ram, a, s.version)
        return h.name, h, h.size
    try:
        ins = zcode.decode(ram, a, s.version, s.text, s.offsets)
    except (zcode.ZError, IndexError):
        return None
    return ins.name, ins, ins.size


def entry(s, n):
    """The address of object n's entry in the object table."""
    size, _, defaults, _ = s._object_format()
    return s.header["objects"] + 2 * defaults + (n - 1) * size


def variable(s, v, names):
    """A variable by number: the stack, a local, or a global by the label on its word."""
    if v >= 16:
        n = names.get(s.header["globals"] + 2 * (v - 16))
        if n:
            return n
    return zcode.var_name(v)


def operand(a, m, ins, bs, names, regs=None, chips=None):
    """The instruction's operands, store and branch as the listing shows them, and the one
    address it refers to: the routine it calls, the string it prints, where it jumps or
    branches."""
    s = _seen[1]
    if isinstance(ins, Header):
        if not ins.locals:
            return "no locals", None
        if not ins.values:
            return " ".join(zcode.var_name(i + 1) for i in range(ins.locals)), None
        return " ".join(f"{zcode.var_name(i + 1)}=#{v:04X}" for i, v in enumerate(ins.values)), None
    target = None
    out = []
    objects = OBJECT_OPERANDS.get(ins.name, ())
    for i, (kind, v) in enumerate(ins.operands):
        if kind == "var":
            t = variable(s, v, names)
        elif i == 0 and "v" in ins.flags:
            t = f"[{variable(s, v, names)}]"       # the variable it names, by number
        elif i == 0 and "r" in ins.flags:
            target = ins.target
            t = names.get(target) or hexa(target) if v else "#0000"   # a call to 0 returns false
            if not v:
                target = None
        elif i == 0 and "j" in ins.flags:
            target = ins.target
            t = names.get(target) or hexa(target)
        elif i == 0 and "p" in ins.flags:
            target = s.unpack(v, "string")
            t = names.get(target) or hexa(target)
        elif i in objects and v and names.get(entry(s, v)):
            t = names[entry(s, v)]
        elif kind == "large" and v in words(s) and (ins.name == "je" or s.unpack(v, "routine") not in HEADERS):
            t = "'" + word_text(s, v) + "'"     # a dictionary word: what a word of the command is compared with
        elif kind == "large" and v and s.unpack(v, "routine") in HEADERS:
            t = names.get(s.unpack(v, "routine")) or f"#{v:04X}"    # a routine handed on: QUEUE's, a property's
        elif kind == "large" and v and s.unpack(v, "string") in STRINGS:
            t = names.get(s.unpack(v, "string")) or f"#{v:04X}"     # a string handed on
        else:
            t = f"#{v:02X}" if kind == "small" else f"#{v:04X}"
        out.append(t)
    if ins.store is not None:
        out.append("-> " + variable(s, ins.store, names))
    if ins.branch is not None:
        on, t = ins.branch
        if not isinstance(t, str):
            if target is None:
                target = t
            t = names.get(t) or hexa(t)
        out.append(("?" if on else "?~") + t)
    if ins.text is not None:
        out.append('"' + ins.text.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n") + '"')
    return (" ".join(out) or None), target


def text_decode(kind, byte):
    """A byte alone means nothing in Z-text, which packs three characters to a word."""
    return ""


def text_items(kind, ram, start, end):
    """The strings from start to end, one after another: ({address: its share of the text},
    {start of each string: "string"}). A string ends at the word whose top bit is set, or at
    end, for the short name of an object whose last word lacks it."""
    if kind != "ZText":
        return None
    s = story(ram)
    texts, starts, a = {}, {}, start
    while a + 1 <= end:
        zc, b = [], a
        while b + 1 <= end:
            w = (ram[b] << 8) | ram[b + 1]; b += 2
            zc += [(w >> 10) & 31, (w >> 5) & 31, w & 31]
            if w & 0x8000:
                break
        starts[a] = "string"
        texts[a] = s.decode(zc)
        for x in range(a + 1, b):
            texts[x] = ""
        a = b
    if a == end:           # an odd byte left at the end of the run
        texts[a] = ""
    return texts, starts


def words(s):
    """The dictionary's entries, by address: {address: the word}."""
    if not hasattr(s, "_entries"):
        s._entries = {e[0]: e[1] for e in s.dictionary().entries}
    return s._entries


def word_text(s, v):
    return words(s)[v].replace("\\", "\\\\").replace("'", "\\'")


def pointer(kind, ram, a):
    """The address the word at a points to, as the kind of pointer it is."""
    s = story(ram)
    w = (ram[a] << 8) | ram[a + 1]
    if kind in ("Packed Routine", "Packed String") and not w:
        return None             # no routine: a call to 0 returns false
    if kind == "Packed Routine":
        return s.unpack(w, "routine")
    if kind == "Packed String":
        return s.unpack(w, "string")
    if kind == "Word Address":
        return 2 * w
    if kind == "Table Word":
        if w in words(s):
            return w
        if w and s.unpack(w, "routine") in HEADERS:
            return s.unpack(w, "routine")
        if w and s.unpack(w, "string") in STRINGS:
            return s.unpack(w, "string")
        if w in TABLES and w >= s.header["globals"]:
            return w
        return None
    return w


__all__ = ["TEXT_TYPES", "TEXT_EACH_RUN", "POINTER_TYPES", "WIDTH", "prepare", "decode", "operand",
           "text_decode", "text_items", "pointer"]
