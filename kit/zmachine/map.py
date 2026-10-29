#!/usr/bin/env python3
"""A story's symbol map, from the story's own structure: the symbols.json of a part whose
part.json says "kind": "virtual" and "machine": "zmachine" (kit/skills/cpu/zmachine).

The kit's other machines have a disassembler whose work symbols_export.py writes out. A
story needs none: its header says where its tables are, and its routines and strings follow
one another through high memory. This script lays all of it out as the blocks, labels and
comments of symbols.json, which listing.py reads through kit/zmachine/cpu.py:

  the header; the abbreviations' table and texts; the property defaults; every object and
  its property table; the global variables; the dictionary; and in high memory each
  routine (its header of locals, then its instructions) and each string.

Everything it writes is marked "auto": true (a symbol's "kind" is "auto"), and running it
again replaces only that. What the run adds is the run's: a label, a comment, a block typed
again (a property's word as a "Packed Routine", say). It is kept, and where it lies on what
the script would write, it wins. To change a comment the script wrote, take its "auto" out
as you edit it, or the next run puts the template's back.

Its comments are templates, written where a template says all there is to say: the header,
the abbreviations, the defaults, each object and property table, each run of dictionary
entries. What a routine does, what a global holds, what a string is printed for and what the
game's own tables are (an Infocom parser's grammar) are the run's to write.

Routines and strings are told apart as they come: a routine is a count of locals up to 15
followed by instructions that decode, whose branches land on its own instructions, and that
end where nothing jumps past them; anything else is a string. Infocom's compiler and Inform
both put every routine before the first string, so past that string a routine is read only
where something calls it, because a string that opens with an abbreviation can read as a
short routine too. After a routine that ends without returning (a quit, a restart, a throw),
instructions that end in a return are what its source said next, kept by the compiler, not a
string. A call or a print elsewhere in the story fixes what its target is, and so does every
call a trace shows running (--trace, Bocfel's, kit/zmachine/bocfel.py): a routine reached only
through a variable or a property is found that way, and the scan is run again until nothing
changes.

A file can run on past the story's end: the header of a story of version 3 on gives its
length, and a story of version 1 or 2, whose header has none, ends where the part's coverage
excludes the rest of the file (["$1F000", "$1FFFF", "past the story's end: ..."]). The script
lays out the story up to there and leaves what follows to the run, which can type it and say
what it is; the ledger does not count it.

Usage:
  map.py <part dir> <story> [--trace <file> ...]   write the part's symbols.json
  map.py <part dir> <story> --dry-run [--trace ...] say what it would write, and what in
                                                    dynamic and static memory nothing describes
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "scripts"))
import zcode  # noqa: E402
from story import Story  # noqa: E402


def hexa(a):
    return f"${a:05X}"


def quote(t):
    return "`" + t.replace("`", "'").replace("\n", "\\n") + "`"


class Map:
    """Blocks, symbols and comments, each with its address, as symbols.json holds them."""

    def __init__(self):
        self.blocks, self.symbols, self.comments = [], {}, {}

    def block(self, start, end, kind, alone=False):
        """alone: a block that joined() leaves apart from a neighbour of its type."""
        if end >= start:
            self.blocks.append({"start": start, "end": end, "type": kind, "auto": True, "alone": alone})

    def label(self, a, name, kind="Field"):
        self.symbols.setdefault(a, {"address": a, "name": name, "type": kind, "kind": "auto"})

    def comment(self, a, text, kind="line"):
        self.comments.setdefault((a, kind), {"address": a, "type": kind, "text": text, "auto": True})

    def joined(self):
        """The blocks in order, those of one type that meet made one: the ledger ends a table's
        span at its block's edge, so a table split into blocks would need a comment for each.
        A block made alone stays apart, so that a span ends at its edge."""
        out, alone = [], False
        for b in sorted(self.blocks, key=lambda b: b["start"]):
            b = dict(b)
            was, alone = alone, b.pop("alone")
            if out and out[-1]["type"] == b["type"] and out[-1]["end"] + 1 == b["start"] and not (was or alone):
                out[-1]["end"] = b["end"]
            elif out and b["start"] <= out[-1]["end"]:
                sys.exit(f"map.py: two tables overlap at {hexa(b['start'])}: {out[-1]['type']} and {b['type']}")
            else:
                out.append(b)
        return out


def unit(v):
    """The alignment of a packed address: routines and strings start on multiples of it."""
    return 2 if v <= 3 else 4 if v <= 7 else 8


def routine(s, a, end):
    """(first instruction, end, instructions) of a routine whose header is at a, or None when
    the bytes there are not one: more than 15 locals, an instruction that does not decode,
    a branch or jump outside its own instructions, or no end before `end`."""
    try:
        n, p = zcode.routine_start(s.mem, a, s.version)
    except zcode.ZError:
        return None
    first, far, ins = p, p, []
    while True:
        if p >= end:
            return None
        try:
            i = s.instruction(p)
        except (zcode.ZError, IndexError):
            return None
        ins.append(i)
        for t in ([i.branch[1]] if i.branch and not isinstance(i.branch[1], str) else []) + \
                 ([i.target] if "j" in i.flags and i.target is not None else []):
            if t < first:
                return None
            far = max(far, t)
        p = i.end
        if i.ends_flow() and p > far:
            break
    starts = {i.addr for i in ins}
    for i in ins:
        for t in ([i.branch[1]] if i.branch and not isinstance(i.branch[1], str) else []) + \
                 ([i.target] if "j" in i.flags and i.target is not None else []):
            if t not in starts:
                return None
    return first, p, ins


def tail(s, a, u):
    """The instructions after a routine's last return that the compiler kept, up to one that
    returns, with only zeros from there to the next aligned address; [] when the bytes are not
    such instructions."""
    out = []
    while len(out) < 4:
        try:
            i = s.instruction(a)
        except (zcode.ZError, IndexError):
            return []
        out.append(i); a = i.end
        if i.ends_flow() and not any(s.mem[a:a + (-a % u)]):
            return out
    return []


def string_end(s, a, end):
    """The address after the string at a, or None when it runs past end."""
    while a + 1 < end:
        w = s.word(a); a += 2
        if w & 0x8000:
            return a
    return None


def scan(s, routines=(), strings=(), end=None):
    """[(kind, start, end, extra)] for high memory up to the story's end, in order: ("routine",
    header, end, (first, instructions)), ("string", start, end, text) and ("pad", start, end,
    None) for the zeros that align the next one, and ("left", start, end, None) where neither
    reads."""
    end, u = end or len(s.mem), unit(s.version)
    a, out = s.header["high"], []
    while a < end:
        past = any(k == "string" for k, *_ in out)       # the strings follow every routine
        r = None if a in strings or (past and a not in routines) else routine(s, a, end)
        dead = out and out[-1][0] == "routine" and not r and a not in strings \
            and out[-1][3][1][-1].name in ("quit", "restart", "throw") and tail(s, a, u)
        if r:
            out.append(("routine", a, r[1], r[:1] + r[2:]))
            b = r[1]
        elif dead:          # what the source said after a quit, a restart or a throw
            k, ra, _, (first, ins) = out[-1]
            out[-1] = (k, ra, dead[-1].end, (first, ins + dead))
            b = dead[-1].end
        else:
            b = string_end(s, a, end)
            if b is None or a in routines:
                out.append(("left", a, end, None)); break
            out.append(("string", a, b, s.string(a)))
        a = b
        while a % u and a < end:    # the next starts aligned: zeros between are padding, anything else the
            nxt = min(end, a + (-a % u))        # return a compiler puts after a routine's last word
            dead = out[-1][0] == "routine" and any(s.mem[a:nxt]) and tail(s, a, u)
            if dead:            # what the source said after a return: "Failed." after a restart
                k, ra, _, (first, ins) = out[-1]
                out[-1] = (k, ra, dead[-1].end, (first, ins + dead))
                a = dead[-1].end
                continue
            out.append(("left" if any(s.mem[a:nxt]) else "pad", a, nxt, None))
            a = nxt
        if a < end and not any(s.mem[a:]):         # zeros to the end of the file
            out.append(("pad", a, end, None)); break
    return out


def trace_routines(s, paths):
    """The routines the traces show being called, whatever the call's operand was."""
    import ztrace
    out = set()
    for p in paths:
        for st in ztrace.steps(p):
            try:
                i = s.instruction(st.addr)
            except (zcode.ZError, IndexError):
                continue
            if "r" in i.flags and st.args and st.args[0]:
                out.add(s.unpack(st.args[0]))
    return out


def high_memory(s, traced=(), end=None):
    """scan() again until what the routines found call and print agrees with it."""
    routines, strings = set(traced), set()
    for _ in range(8):
        items = scan(s, routines, strings, end)
        seen_r = {a for k, a, _, _ in items if k == "routine"}
        seen_s = {a for k, a, _, _ in items if k == "string"}
        want_r, want_s = set(routines), set(strings)
        for k, a, e, x in items:
            if k != "routine":
                continue
            for i in x[1]:
                if "r" in i.flags and i.target and i.operands[0][0] != "var":
                    want_r.add(i.target)
                if "p" in i.flags and i.operands[0][0] != "var":
                    want_s.add(s.unpack(i.operands[0][1], "string"))
        want_r = {a for a in want_r if a >= s.header["high"]}
        want_s = {a for a in want_s if a >= s.header["high"]} - want_r
        if want_r <= seen_r and want_s <= seen_s:
            return items, want_r, want_s
        routines, strings = want_r, want_s
    return items, routines, strings


def name_of(text, taken):
    """A label for a string, from its first words: s_there_is_a_small_mailbox."""
    words = re.findall(r"[a-z0-9]+", text.lower())[:5]
    base = "s_" + ("_".join(words) or "blank")
    name, n = base, 2
    while name in taken:
        name, n = f"{base}_{n}", n + 1
    taken.add(name)
    return name


def groups(M, start, count, size, text):
    """A comment every 64 bytes over count items of size bytes from start, the reach of one:
    text(first, last) says what items first to last are."""
    per = max(1, 64 // size)
    for k in range(0, count, per):
        M.comment(start + k * size, text(k, min(k + per, count) - 1))


def build(s, traced=(), end=None):
    """The Map of a story up to its end (the file's, unless given), and the stretches of dynamic
    and static memory it leaves out."""
    M, v, h = Map(), s.version, s.header
    end = end or len(s.mem)
    taken = set()

    # the header: one table, each field named beside its bytes
    M.block(0, 63, "Byte")
    M.label(0, "header")
    fields = [(0, "version"), (1, "flags 1"), (2, "release"), (4, "high memory"), (6, "first instruction"
              if v != 6 else "main routine, packed"), (8, "dictionary"), (10, "object table"),
              (12, "global variables"), (14, "static memory"), (16, "flags 2"), (18, "serial number")]
    fields += [(0x18, "abbreviations' table")] if v >= 2 else []
    fields += [(0x1A, "length, in units of " + ("2" if v <= 3 else "4" if v <= 5 else "8")), (0x1C, "checksum")] \
        if v >= 3 else []
    for off, what in fields:
        M.comment(off, what, "side")
    hd = (f"The story's header, 64 bytes (Standard 11): version {v}, release {h['release']}, serial "
          f"number {h['serial']}. High memory, where the routines and most strings are, starts at "
          f"{hexa(h['high'])}, and static memory, which the story cannot change, at {hexa(h['static'])}. "
          f"The first instruction is at {hexa(h['pc'])}; the dictionary is at {hexa(h['dictionary'])}, the "
          f"object table at {hexa(h['objects'])} and the global variables at {hexa(h['globals'])}"
          + (f"; the abbreviations' table at {hexa(h['abbreviations'])}" if h.get("abbreviations") else "")
          + (f". The story's length is {s.length():,} bytes and its checksum ${h['checksum']:04X}"
             if h.get("length") else ". A version 1 or 2 header gives no length or checksum") + ".")
    M.comment(0, hd)

    # the abbreviations
    if v >= 2 and h.get("abbreviations"):
        n = 32 if v == 2 else 96
        t = h["abbreviations"]
        M.block(t, t + 2 * n - 1, "Word Address")
        M.label(t, "abbreviations")
        groups(M, t, n, 2, lambda i, j: (
            f"The abbreviations' table, {n} words, each the word address (half the byte address) of an "
            "abbreviation's text. A string inserts abbreviation 32 × (z - 1) + x with the z-characters z "
            "(1 to 3) and x (Standard 3.3)." if i == 0 else f"The addresses of abbreviations {i} to {j}."))
        group = None
        for i in sorted(range(n), key=lambda i: s.word(t + 2 * i)):
            a = 2 * s.word(t + 2 * i)
            e = string_end(s, a, end)
            if e is None or a < 64:
                continue
            M.block(a, e - 1, "ZText")
            M.label(a, f"abbr_{i:02d}", "Address")
            if group is None or e > group[0] + 64:
                group = [a, [i]]
            else:
                group[1].append(i)
            M.comments.pop((group[0], "line"), None)
            M.comment(group[0], (f"Abbreviation {group[1][0]}" if len(group[1]) == 1 else
                                 f"Abbreviations {', '.join(map(str, group[1][:-1]))} and {group[1][-1]}")
                      + ": " + ", ".join(quote(s.abbreviation(k)) for k in group[1]) + ".")

    # the objects: defaults, entries, property tables
    size, abytes, defaults, small = s._object_format()
    ob = h["objects"]
    M.block(ob, ob + 2 * defaults - 1, "Hi/Lo Word")
    M.label(ob, "property_defaults")
    nz = [(k + 1, s.word(ob + 2 * k)) for k in range(defaults) if s.word(ob + 2 * k)]
    groups(M, ob, defaults, 2, lambda i, j: (
        f"The property defaults, {defaults} words: the value get_prop gives for property n of an object "
        "that has none of its own (Standard 12.2). " + ("Every one is 0." if not nz else "Every one is 0 but "
        + ", ".join(f"property {k}, ${w:04X}" for k, w in nz) + ".") if i == 0 else
        f"The defaults of properties {i + 1} to {j + 1}."))
    objs = s.objects()

    def who(n):
        return "nothing" if not n else f"object {n}" + (f" ({quote(objs[n - 1].name)})"
                                                        if n <= len(objs) and objs[n - 1].name else "")
    for o in objs:
        a = ob + 2 * defaults + size * (o.n - 1)
        M.block(a, a + size - 1, "Byte")
        M.label(a, f"obj_{o.n:03d}")
        attrs = sorted(o.attrs)
        M.comment(a, f"Object {o.n}" + (f", {quote(o.name)}" if o.name else ", with no name") + f": in {who(o.parent)}; "
                     f"next sibling {who(o.sibling)}; first child {who(o.child)}; "
                     + (f"attribute{'s' if len(attrs) > 1 else ''} {', '.join(map(str, attrs))} set" if attrs
                        else "no attributes set") + f"; its properties at {hexa(o.props)}.")
        p = o.props
        ln = s.mem[p]
        M.label(p, f"props_{o.n:03d}")
        lead = f"Object {o.n}'s property table: " + (f"its short name {quote(o.name)}, a count of words and "
                                                       "then the text" if ln else "no short name")
        rest = f"Object {o.n}'s properties go on: "
        props, q, cut, said = s.properties(o.n), p + 1 + 2 * ln, p, []
        if not props:
            M.block(p, q, "Byte")
            M.comment(p, lead + ", and no properties: a 0 ends the list at once.")
            continue
        lead += "; then its properties, the highest number first, each a size byte and its data: "
        for num, da, data in props:
            if da + len(data) > cut + 64 and said:      # a long table: the next comment says the rest
                M.comment(cut, (lead if cut == p else rest) + ", ".join(said) + ".")
                cut, said = q, []
            val = f"${int.from_bytes(data, 'big'):0{2 * len(data)}X}" if len(data) <= 2 else \
                " ".join(f"{x:02X}" for x in data)
            said.append(f"{num} ({len(data)} byte{'s' if len(data) > 1 else ''}) {val}")
            q = da + len(data)
        M.block(p, q, "Byte")
        M.comment(cut, (lead if cut == p else rest) + ", ".join(said) + ". A 0 ends the list.")

    # the global variables: the table runs to the next table the header names, at most 240, and
    # stops short of a table a global points to, which compilers put straight after the globals
    g = h["globals"]
    nexts = [x for x in (h["dictionary"], h["objects"], h["static"], h.get("abbreviations", 0),
                         min(o.props for o in objs) if objs else 0) if x > g]
    count = min([240] + [(x - g) // 2 for x in nexts])
    for i in range(240):
        if i >= count:
            break
        if g < s.word(g + 2 * i) < g + 2 * count:
            count = (s.word(g + 2 * i) - g) // 2
    M.block(g, g + 2 * count - 1, "Hi/Lo Word")
    M.label(g, "globals")

    # the dictionary: its head, then the entries, each word named beside its bytes
    d = s.dictionary()
    da = h["dictionary"]
    head = 1 + len(d.separators) + 3
    M.label(da, "dictionary")
    M.comment(da, f"The dictionary's head (Standard 13): {len(d.separators)} word separator"
                  f"{'s' if len(d.separators) != 1 else ''}"
                  + (", " + " ".join(quote(chr(c)) for c in d.separators) if d.separators else "")
                  + f", which the parser makes words of their own; the length of an entry, {d.entry_length}; "
                    f"and the count of entries, {len(d.entries)}"
                  + (", sorted, so an interpreter can search them by halves." if d.sorted else ", unsorted."))
    wlen = 4 if v <= 3 else 6
    # the head is a block of its own, so that its description ends where the entries begin and
    # each run of entries is described by its own comment, whatever the run renames the head
    M.block(da, da + head - 1, "Byte", alone=True)
    if d.entries:
        M.block(da + head, d.entries[-1][0] + d.entry_length - 1, "Byte")
    for a, w, data in d.entries:
        M.comment(a, quote(w), "side")
    E = d.entries
    groups(M, E[0][0] if E else da, len(E), d.entry_length, lambda i, j: (
        f"Dictionary entries {i + 1} to {j + 1}, {quote(E[i][1])} to {quote(E[j][1])}, {d.entry_length} "
        f"bytes each: {wlen} bytes of the word's first {wlen // 2 * 3} z-characters, then "
        f"{d.entry_length - wlen} of data that the story's own parser reads." if j > i else
        f"Dictionary entry {i + 1}, {quote(E[i][1])}: {wlen} bytes of the word, then "
        f"{d.entry_length - wlen} of data that the story's own parser reads."))

    # high memory
    items, want_r, want_s = high_memory(s, trace_routines(s, traced), end)
    for k, a, e, x in items:
        if k == "routine":
            M.block(a, e - 1, "Code")
            M.label(a, f"r_{a:05X}", "Subroutine")
        elif k == "string":
            M.block(a, e - 1, "ZText")
            M.label(a, name_of(x, taken), "Address")
        elif k == "pad" and e - a < unit(v):          # not the zeros to the end of the file
            M.block(a, e - 1, "Byte")
            at = "an even address" if unit(v) == 2 else f"a multiple of {unit(v)}"
            M.comment(a, f"{'Zero' if e - a == 1 else 'Zeros'}, so that {hexa(e)} starts at {at}: a packed "
                      "address can name no other.")
    M.blocks = M.joined()
    covered = bytearray(end)
    for b in M.blocks:
        covered[b["start"]:b["end"] + 1] = b"\x01" * (b["end"] - b["start"] + 1)
    left, a = [], 0
    while a < h["high"]:
        if covered[a]:
            a += 1; continue
        b = a
        while b < h["high"] and not covered[b]:
            b += 1
        left.append((a, b - 1))
        a = b
    return M, items, left


def merge(old, M):
    """The run's own work kept, the script's replaced: symbols.json's three lists."""
    mine_b = [b for b in old.get("blocks", []) if not b.get("auto")]
    mine_s = [x for x in old.get("symbols", []) if x.get("kind") != "auto"]
    mine_c = [c for c in old.get("comments", []) if not c.get("auto")]
    taken = bytearray(max([b["end"] + 1 for b in M.blocks + mine_b] + [0]))
    for b in mine_b:
        taken[b["start"]:b["end"] + 1] = b"\x01" * (b["end"] - b["start"] + 1)
    blocks = list(mine_b)
    for b in M.blocks:              # the script's, cut where the run's own lie on them
        a = b["start"]
        while a <= b["end"]:
            if taken[a]:
                a += 1; continue
            e = a
            while e + 1 <= b["end"] and not taken[e + 1]:
                e += 1
            blocks.append(dict(b, start=a, end=e))
            a = e + 1
    have = {x["address"] for x in mine_s}
    symbols = mine_s + [x for a, x in M.symbols.items() if a not in have]
    said = {(c["address"], c["type"]) for c in mine_c}
    comments = mine_c + [c for k, c in M.comments.items() if k not in said and c["text"]]
    return (sorted(blocks, key=lambda b: b["start"]), sorted(symbols, key=lambda x: x["address"]),
            sorted(comments, key=lambda c: (c["address"], c["type"])))


def story_end(s, exclude):
    """Where the story's own bytes end: the header's length, or the start of an exclusion in the
    part's coverage that runs to the end of the file, whichever comes first."""
    tails = [lo for lo, hi, _ in exclude if hi >= len(s.mem) - 1 and s.header["high"] < lo]
    return min([s.length(), len(s.mem)] + tails)


def main(argv):
    if len(argv) < 2 or argv[0] in ("-h", "--help"):
        print(__doc__); return 0
    gdir, path = argv[0], argv[1]
    traces = [argv[i + 1] for i, x in enumerate(argv) if x == "--trace"]
    from parts import load_game
    from symbols_export import regions
    game = load_game(gdir)
    if (game.get("part") or {}).get("machine") != "zmachine":
        sys.exit(f'{gdir} is not a story: its part.json needs "kind": "virtual" and "machine": "zmachine" '
                 "(kit/skills/core/15-parts)")
    import snapshot
    s = Story(snapshot.read(path))
    M, items, left = build(s, traces, story_end(s, regions(game)["exclude"]))
    spath = os.path.join(gdir, "symbols.json")
    old = json.load(open(spath)) if os.path.isfile(spath) else {}
    blocks, symbols, comments = merge(old, M)
    covered = bytearray(len(s.mem))
    for b in blocks:            # what the run has typed itself is described too
        covered[b["start"]:b["end"] + 1] = b"\x01" * (b["end"] - b["start"] + 1)
    runs = []
    for lo, hi in left:
        a = lo
        while a <= hi:
            if covered[a]:
                a += 1; continue
            b = a
            while b + 1 <= hi and not covered[b + 1]:
                b += 1
            runs.append((a, b)); a = b + 1
    left = runs
    kinds = {}
    for k, *_ in items:
        kinds[k] = kinds.get(k, 0) + 1
    print(f"high memory: {kinds.get('routine', 0)} routines, {kinds.get('string', 0)} strings"
          + (f", {kinds['pad']} runs of padding" if kinds.get("pad") else ""))
    for k, a, e, _ in items:
        if k == "left":
            print(f"  {hexa(a)}-{hexa(e - 1)}: neither a routine nor a string reads here")
    if left:
        print(f"dynamic and static memory: {sum(b - a + 1 for a, b in left)} bytes in {len(left)} stretch(es) "
              "the header's tables do not reach; the story's own tables, for the run to type and describe:")
        for a, b in left[:40]:
            print(f"  {hexa(a)}-{hexa(b)} {b - a + 1:6} bytes")
        if len(left) > 40:
            print(f"  and {len(left) - 40} more")
    out = {"schema": 1, "platform": game.get("platform"), "game": game.get("slug"), "part": game["part"]["id"],
           "build": game.get("build"), "source": "kit/zmachine/map.py", "regions": regions(game),
           "blocks": blocks, "symbols": symbols, "comments": comments}
    if "--dry-run" in argv:
        print(f"would write {spath}: {len(blocks)} blocks, {len(symbols)} symbols, {len(comments)} comments")
        return 0
    with open(spath, "w") as f:
        json.dump(out, f, indent=1)
    users = sum(1 for x in symbols if x["kind"] != "auto")
    print(f"wrote {spath}: {len(blocks)} blocks, {len(symbols)} symbols ({users} the run's), "
          f"{len(comments)} comments ({sum(1 for c in comments if not c.get('auto'))} the run's)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
